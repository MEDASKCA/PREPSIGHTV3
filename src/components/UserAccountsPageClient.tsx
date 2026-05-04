"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Search, Shield, ShieldCheck, Upload, User } from "lucide-react"
import * as XLSX from "xlsx"
import { getAuthenticatedUser } from "@/lib/auth"
import {
  getPortalMembershipsByOrganization,
  getPortalUsersByOrganization,
  getStaffingReportsByOrganization,
  getStaffingStaffPoolByOrganization,
  saveStaffingReport,
  saveUserProfile,
} from "@/lib/firestore"
import { getProfile } from "@/lib/profile"
import {
  USER_ROLE_TO_PLATFORM_ROLE,
  type PortalMembershipRecord,
  type PrepSightProfile,
  type StaffingReportRowRecord,
  type StaffingStaffPoolRecord,
  type UserRole,
} from "@/lib/types"
import LibraryAppShell from "@/components/LibraryAppShell"
import StaffingReportCalendar from "@/components/StaffingReportCalendar"

type OrgUser = PrepSightProfile & { uid: string }

type ParsedStaffingReport = {
  reportDate?: string
  weekLabel?: string
  source?: string
  fulfilmentType?: string
  rows: StaffingReportRowRecord[]
}

const ACCESS_BADGE: Record<UserRole, { label: string; className: string }> = {
  viewer: { label: "User", className: "bg-white/10 text-white/50" },
  editor: { label: "Content Mgr", className: "bg-blue-500/20 text-blue-300" },
  clinical_author: { label: "Clinical Author", className: "bg-purple-500/20 text-purple-300" },
  manager: { label: "Manager", className: "bg-[#0096C7]/30 text-[#29b6d8]" },
  senior_manager: { label: "Senior Manager/Lead", className: "bg-amber-500/20 text-amber-300" },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function slugifyOrganization(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()
}

function normalizeStaffingKey(name: string, classification: string) {
  return `${normalizeName(name)}|${normalizeName(classification)}`
}

function firstMeaningfulValue(row: unknown[], startIndex: number) {
  for (let index = startIndex; index < row.length; index += 1) {
    const value = String(row[index] ?? "").trim()
    if (value) return value
  }
  return ""
}

function extractLabelValue(rows: string[][], label: string) {
  const normalizedLabel = label.trim().toLowerCase()
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]
    const cellIndex = row.findIndex((cell) => cell.trim().toLowerCase() === normalizedLabel)
    if (cellIndex === -1) continue
    const sameRow = firstMeaningfulValue(row, cellIndex + 1)
    if (sameRow) return sameRow
    const nextRow = rows[rowIndex + 1]
    if (nextRow) {
      const nextValue = firstMeaningfulValue(nextRow, 0)
      if (nextValue) return nextValue
    }
  }
  return undefined
}

function parseStaffingWorkbook(file: File, rows: string[][]): ParsedStaffingReport {
  const headerRowIndex = rows.findIndex(
    (row) => row.includes("Shift Time") && row.includes("Classification") && row.includes("Name"),
  )
  if (headerRowIndex === -1) {
    throw new Error("Could not find the staffing table in this workbook.")
  }

  const headerRow = rows[headerRowIndex]
  const shiftIndex = headerRow.indexOf("Shift Time")
  const classificationIndex = headerRow.indexOf("Classification")
  const nameIndex = headerRow.indexOf("Name")

  let currentShiftTime = ""
  const parsedRows: StaffingReportRowRecord[] = []

  for (let index = headerRowIndex + 1; index < rows.length; index += 1) {
    const row = rows[index]
    if (row.some((cell) => cell.includes("Unit Manager Signature"))) break

    const shiftValue = String(row[shiftIndex] ?? "").trim()
    const classification = String(row[classificationIndex] ?? "").trim()
    const name = String(row[nameIndex] ?? "").trim()

    if (shiftValue) currentShiftTime = shiftValue
    if (!name || !classification || name === "Name" || classification === "Classification") continue

    parsedRows.push({
      sourceMatchKey: normalizeStaffingKey(name, classification),
      name,
      classification,
      shiftTime: currentShiftTime || undefined,
    })
  }

  return {
    reportDate: extractLabelValue(rows, "Day and Date:"),
    weekLabel: extractLabelValue(rows, "Week:"),
    source: extractLabelValue(rows, "Unit:"),
    fulfilmentType: extractLabelValue(rows, "Fulfilment Type:"),
    rows: parsedRows,
  }
}

export default function UserAccountsPageClient() {
  const router = useRouter()
  const profile = getProfile()
  const userRole = profile?.role ?? "viewer"
  const canManage = userRole === "manager" || userRole === "senior_manager"
  const organizationScope =
    profile?.activeOrganizationId ??
    profile?.organizationIds?.find((value) => value.trim()) ??
    (profile?.hospital ? slugifyOrganization(profile.hospital) : undefined)

  const [users, setUsers] = useState<OrgUser[]>([])
  const [query, setQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("All")
  const [loading, setLoading] = useState(true)
  const [currentUid, setCurrentUid] = useState<string | null | undefined>(undefined)
  const [saveError, setSaveError] = useState("")
  const [savingUid, setSavingUid] = useState<string | null>(null)
  const [membershipsByUid, setMembershipsByUid] = useState<Record<string, PortalMembershipRecord[]>>({})
  const [expandedMobileUid, setExpandedMobileUid] = useState<string | null>(null)
  const [staffingPool, setStaffingPool] = useState<StaffingStaffPoolRecord[]>([])
  const [uploadingReport, setUploadingReport] = useState(false)
  const [latestReportMeta, setLatestReportMeta] = useState<{ fileName: string; reportDate?: string; source?: string } | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!canManage) {
      router.replace("/")
      return
    }

    void getAuthenticatedUser().then((user) => {
      if (!cancelled) {
        setCurrentUid(user?.uid ?? null)
      }
    })

    if (currentUid === undefined) {
      setLoading(true)
      return () => {
        cancelled = true
      }
    }

    if (!currentUid) {
      setLoading(false)
      setSaveError("You need to be signed in to load organization members.")
      return () => {
        cancelled = true
      }
    }

    if (!organizationScope) {
      setLoading(false)
      return () => {
        cancelled = true
      }
    }

    setLoading(true)
    setSaveError("")

    void Promise.all([
      getPortalUsersByOrganization(organizationScope, profile?.hospital, { strict: true }),
      getPortalMembershipsByOrganization(organizationScope, { strict: true }),
      getStaffingStaffPoolByOrganization(organizationScope),
    ])
      .then(([results, memberships, pool]) => {
        const organizationUsers = results
        if (!cancelled) {
          setUsers(organizationUsers)
          setStaffingPool(pool)
          setMembershipsByUid(
            memberships.reduce<Record<string, PortalMembershipRecord[]>>((acc, membership) => {
              acc[membership.uid] = [...(acc[membership.uid] ?? []), membership]
              return acc
            }, {}),
          )
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const detail =
            error instanceof Error
              ? `${error.name}: ${error.message}`
              : typeof error === "string"
                ? error
                : JSON.stringify(error)
          setSaveError(`Unable to load users right now. ${detail}`)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [canManage, currentUid, organizationScope, router])

  const departments = ["All", ...Array.from(new Set(users.map((u) => u.departments?.[0] ?? "").filter(Boolean)))]

  const filtered = users.filter((u) => {
    const dept = u.departments?.[0] ?? ""
    const matchesDept = departmentFilter === "All" || dept === departmentFilter
    const matchesQuery = !query.trim() || [u.name, u.jobTitle, u.email, dept].some((value) =>
      value?.toLowerCase().includes(query.toLowerCase()),
    )
    return matchesDept && matchesQuery
  })

  const staffingRows = staffingPool.map((entry) => {
    const matchedUser =
      users.find((user) => user.name && normalizeName(user.name) === normalizeName(entry.sourceName)) ?? null
    return {
      name: entry.sourceName,
      classification: entry.sourceClassification,
      sourceTitle: entry.sourceTitle,
      sourceBand: entry.sourceBand,
      latestShiftTime: entry.latestShiftTime,
      lastReportDate: entry.lastReportDate,
      matchedUser,
    }
  })

  function canChangeRole(target: OrgUser): boolean {
    if (target.uid === currentUid) return false
    if (userRole === "senior_manager") return target.role !== "senior_manager"
    if (userRole === "manager") return target.role === "viewer"
    return false
  }

  async function updateRole(uid: string, newRole: UserRole) {
    const target = users.find((u) => u.uid === uid)
    if (!target) return

    const previousUsers = users
    const nextUsers = users.map((u) =>
      u.uid === uid
        ? { ...u, role: newRole, platformRole: USER_ROLE_TO_PLATFORM_ROLE[newRole] }
        : u,
    )

    setSaveError("")
    setSavingUid(uid)
    setUsers(nextUsers)

    try {
      await saveUserProfile(uid, {
        ...target,
        role: newRole,
        platformRole: USER_ROLE_TO_PLATFORM_ROLE[newRole],
      })
    } catch {
      setUsers(previousUsers)
      setSaveError("Role update failed. Try again.")
    } finally {
      setSavingUid(null)
    }
  }

  async function handleStaffingReportUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || !organizationScope || !currentUid) return

    setUploadingReport(true)
    setSaveError("")

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rawRows = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(sheet, {
        header: 1,
        blankrows: false,
        defval: "",
      })
      const rows = rawRows.map((row) => row.map((cell) => String(cell ?? "").trim()))
      const parsed = parseStaffingWorkbook(file, rows)

      const savedReport = await saveStaffingReport({
        organizationId: organizationScope,
        sourceSystem: "optima",
        fileName: file.name,
        reportDate: parsed.reportDate,
        weekLabel: parsed.weekLabel,
        source: parsed.source,
        fulfilmentType: parsed.fulfilmentType,
        rowCount: parsed.rows.length,
        rows: parsed.rows,
        uploadedBy: currentUid,
      })

      if (!savedReport) {
        throw new Error("Failed to save the staffing report.")
      }

      const pool = await getStaffingStaffPoolByOrganization(organizationScope)
      setStaffingPool(pool)
      const latestReports = await getStaffingReportsByOrganization(organizationScope)
      const latestReport = latestReports[0]
      setLatestReportMeta(
        latestReport
          ? {
              fileName: latestReport.fileName,
              reportDate: latestReport.reportDate,
              source: latestReport.source,
            }
          : {
              fileName: file.name,
              reportDate: parsed.reportDate,
              source: parsed.source,
            },
      )
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to parse the staffing report.")
    } finally {
      setUploadingReport(false)
    }
  }

  if (!canManage) return null

  return (
    <LibraryAppShell currentNav="user_accounts" searchPlaceholder="Search anywhere...">
      <div className="min-h-screen bg-black px-4 py-6 lg:px-8 lg:py-8">
        <div className="mb-6">
          <h1 className="text-[22px] font-bold text-white lg:text-[28px]">User Accounts</h1>
          <p className="mt-1 text-[14px] text-white/40">
            {profile?.hospital} · {users.length} {users.length === 1 ? "member" : "members"}
          </p>
        </div>

        {saveError ? (
          <div className="mb-4 rounded-[12px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">
            {saveError}
          </div>
        ) : null}

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex flex-1 items-center gap-2 rounded-[10px] border border-[#2d2d2d] bg-[#111111] px-3 py-2.5">
            <Search size={15} className="shrink-0 text-white/30" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, email or department..."
              className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/25"
            />
          </label>
          {departments.length > 1 ? (
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="rounded-[10px] border border-[#2d2d2d] bg-[#111111] px-3 py-2.5 text-[14px] text-white outline-none"
            >
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        <div className="bg-black">
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,auto)] gap-4 bg-black px-4 py-2 lg:px-3">
            <span className="text-[12px] font-medium text-white/40">Name</span>
            <span className="hidden text-[12px] font-medium text-white/40 lg:block">Department</span>
            <span className="hidden text-[12px] font-medium text-white/40 lg:block">Registrations</span>
            <span className="hidden text-[12px] font-medium text-white/40 lg:block">Role</span>
            <span className="hidden text-[12px] font-medium text-white/40 lg:block">Access</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0096C7] border-t-transparent" />
              <span className="text-[14px] text-white/30">Loading users...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-[15px] font-medium text-white/30">No users yet</p>
              <p className="mt-1 text-[13px] text-white/20">
                Users will appear here once they join your hospital workspace.
              </p>
            </div>
          ) : (
            filtered.map((user) => {
              const badge = ACCESS_BADGE[user.role]
              const departmentsForUser = user.departments ?? []
              const memberships = membershipsByUid[user.uid] ?? []
              const primaryMembership = memberships[0]
              const registrationStatus =
                primaryMembership?.status === "active"
                  ? "Active"
                  : primaryMembership?.status === "pending_approval"
                    ? "Pending"
                    : primaryMembership?.status === "suspended"
                      ? "Suspended"
                      : "-"
              const registrationDate = primaryMembership?.approvedAt ?? primaryMembership?.requestedAt
              const mobileExpanded = expandedMobileUid === user.uid
              const roleLabel = primaryMembership?.jobTitle?.trim() || user.jobTitle?.trim() || "-"

              return (
                <div key={user.uid} className="bg-black">
                  <button
                    type="button"
                    onClick={() => setExpandedMobileUid((current) => (current === user.uid ? null : user.uid))}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-black px-4 py-2.5 text-left hover:bg-white/[0.02] lg:hidden"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-white">{user.name ?? "-"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                      <ChevronDown
                        size={14}
                        className={`text-white/35 transition-transform ${mobileExpanded ? "rotate-180" : ""}`}
                      />
                    </div>
                  </button>

                  {mobileExpanded ? (
                    <div className="grid gap-2 px-4 pb-3 lg:hidden">
                      <div className="grid grid-cols-[92px_1fr] gap-3 text-[12px]">
                        <span className="text-white/35">Department</span>
                        <span className="text-white/70">{departmentsForUser[0] ?? "-"}</span>
                      </div>
                      <div className="grid grid-cols-[92px_1fr] gap-3 text-[12px]">
                        <span className="text-white/35">Registrations</span>
                        <span className="text-white/70">
                          {!primaryMembership
                            ? "-"
                            : `${registrationStatus} (${primaryMembership?.approvedAt ? "approved" : "requested"} ${registrationDate ? formatDate(registrationDate) : "-"})`}
                        </span>
                      </div>
                      <div className="grid grid-cols-[92px_1fr] gap-3 text-[12px]">
                        <span className="text-white/35">Role</span>
                        <span className="text-white/70">{roleLabel}</span>
                      </div>
                      <div className="grid grid-cols-[92px_1fr] gap-3 text-[12px]">
                        <span className="text-white/35">Access</span>
                        <span className="text-white/70">{badge.label}</span>
                      </div>
                    </div>
                  ) : null}

                  <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,auto)] items-center gap-4 bg-black px-3 py-2.5 hover:bg-white/[0.02] lg:grid">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-white">{user.name ?? "-"}</p>
                    </div>

                    <div className="min-w-0">
                      <span className="truncate text-[13px] text-white/70">{departmentsForUser[0] ?? "-"}</span>
                    </div>

                    <div className="min-w-0">
                      {!primaryMembership ? (
                        <span className="text-[13px] text-white/35">-</span>
                      ) : (
                        <span className="text-[13px] text-white/70">
                          {registrationStatus}{" "}
                          <span className="text-white/35">
                            ({primaryMembership?.approvedAt ? "approved" : "requested"} {registrationDate ? formatDate(registrationDate) : "-"})
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <span className="truncate text-[13px] text-white/70">{roleLabel}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                      {canChangeRole(user) ? (
                        <div className="relative group">
                          <button
                            type="button"
                            disabled={savingUid === user.uid}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] text-white/30 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Shield size={12} />
                          </button>
                          <div className="absolute right-0 top-full z-50 mt-1 hidden w-[200px] overflow-hidden rounded-[10px] border border-[#2d2d2d] bg-[#111111] shadow-xl group-focus-within:block group-hover:block">
                            {user.role === "viewer" ? (
                              <button
                                type="button"
                                onClick={() => void updateRole(user.uid, "manager")}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-white/60 hover:bg-white/[0.06] hover:text-white"
                              >
                                <Shield size={13} className="text-[#0096C7]" />
                                Promote to Manager
                              </button>
                            ) : null}
                            {user.role === "manager" && userRole === "senior_manager" ? (
                              <button
                                type="button"
                                onClick={() => void updateRole(user.uid, "senior_manager")}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-white/60 hover:bg-white/[0.06] hover:text-white"
                              >
                                <ShieldCheck size={13} className="text-amber-400" />
                                Promote to Senior Manager/Lead
                              </button>
                            ) : null}
                            {user.role !== "viewer" ? (
                              <button
                                type="button"
                                onClick={() => void updateRole(user.uid, "viewer")}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-red-400 hover:bg-white/[0.06]"
                              >
                                <User size={13} />
                                Revoke - set to User
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="mt-10">
          <StaffingReportCalendar
            organizationId={organizationScope}
            title="Roster Upload Calendar"
            description="Use the same allocation-style date strip here to see which days already have staffing reports saved for this organization."
          />
        </div>

        <div className="mt-10 bg-black">
          <div className="mb-4">
            <h2 className="text-[18px] font-medium text-white">Staffing Report Links</h2>
            <p className="mt-1 text-[13px] text-white/35">
              Imported names from the latest Optima staffing report, ready for manager linking to PrepSight users.
            </p>
          </div>

          <div className="mb-5 flex flex-col gap-3 rounded-[12px] border border-[#2d2d2d] bg-[#101010] px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[14px] text-white">Upload Staffing Report</p>
              <p className="mt-1 text-[12px] text-white/35">
                Parse Optima daily staffing reports, store report metadata, and merge staff into the pool without duplication.
              </p>
              {latestReportMeta ? (
                <p className="mt-2 text-[12px] text-[#67CFCF]">
                  Latest upload: {latestReportMeta.fileName}
                  {latestReportMeta.reportDate ? ` · ${latestReportMeta.reportDate}` : ""}
                  {latestReportMeta.source ? ` · ${latestReportMeta.source}` : ""}
                </p>
              ) : null}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#2d2d2d] bg-[#161616] px-4 py-2 text-[13px] text-white transition-colors hover:border-[#3a3a3a] hover:bg-[#1d1d1d]">
              <Upload size={14} className="text-[#67CFCF]" />
              {uploadingReport ? "Uploading..." : "Upload report"}
              <input
                type="file"
                accept=".xlsx"
                onChange={handleStaffingReportUpload}
                disabled={uploadingReport}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,1.4fr)] gap-4 bg-black px-4 py-2 lg:px-3">
            <span className="text-[12px] font-medium text-white/40">Imported Name</span>
            <span className="text-[12px] font-medium text-white/40">Title</span>
            <span className="text-[12px] font-medium text-white/40">Band</span>
            <span className="text-[12px] font-medium text-white/40">Matched User</span>
            <span className="text-[12px] font-medium text-white/40">Email</span>
          </div>

          {staffingRows.map((row) => (
            <div
              key={`${row.name}-${row.classification}`}
              className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,1.4fr)] items-center gap-4 bg-black px-4 py-2.5 hover:bg-white/[0.02] lg:px-3"
            >
              <span className="truncate text-[13px] text-white">{row.name}</span>
              <span className="truncate text-[13px] text-white/70">{row.sourceTitle ?? "-"}</span>
              <span className="truncate text-[13px] text-white/70">{row.sourceBand ?? "-"}</span>
              <span className="truncate text-[13px] text-white/70">{row.matchedUser?.name ?? "-"}</span>
              <span className="truncate text-[13px] text-white/45">{row.matchedUser?.email ?? "Needs link"}</span>
            </div>
          ))}
        </div>
      </div>
    </LibraryAppShell>
  )
}
