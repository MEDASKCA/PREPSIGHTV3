"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Search, Shield, ShieldCheck, User } from "lucide-react"
import { getAuthenticatedUser } from "@/lib/auth"
import { getUsersByHospital, saveUserProfile } from "@/lib/firestore"
import { getProfile } from "@/lib/profile"
import { USER_ROLE_TO_PLATFORM_ROLE, type PrepSightProfile, type UserRole } from "@/lib/types"
import LibraryAppShell from "@/components/LibraryAppShell"

type OrgUser = PrepSightProfile & { uid: string }

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

export default function UserAccountsPageClient() {
  const router = useRouter()
  const profile = getProfile()
  const userRole = profile?.role ?? "viewer"
  const canManage = userRole === "manager" || userRole === "senior_manager"

  const [users, setUsers] = useState<OrgUser[]>([])
  const [query, setQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("All")
  const [loading, setLoading] = useState(true)
  const [expandedRegs, setExpandedRegs] = useState<Record<string, boolean>>({})
  const [currentUid, setCurrentUid] = useState<string | null>(null)
  const [saveError, setSaveError] = useState("")
  const [savingUid, setSavingUid] = useState<string | null>(null)

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

    if (!profile?.hospital) {
      setLoading(false)
      return () => {
        cancelled = true
      }
    }

    setLoading(true)
    setSaveError("")

    void getUsersByHospital(profile.hospital)
      .then((results) => {
        if (!cancelled) {
          setUsers(results)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSaveError("Unable to load users right now.")
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
  }, [canManage, profile?.hospital, router])

  const departments = ["All", ...Array.from(new Set(users.map((u) => u.departments?.[0] ?? "").filter(Boolean)))]

  const filtered = users.filter((u) => {
    const dept = u.departments?.[0] ?? ""
    const matchesDept = departmentFilter === "All" || dept === departmentFilter
    const matchesQuery = !query.trim() || [u.name, u.jobTitle, u.email, dept].some((value) =>
      value?.toLowerCase().includes(query.toLowerCase()),
    )
    return matchesDept && matchesQuery
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

  function toggleRegs(uid: string) {
    setExpandedRegs((prev) => ({ ...prev, [uid]: !prev[uid] }))
  }

  if (!canManage) return null

  return (
    <LibraryAppShell currentNav="user_accounts" sectionLabel="Management" searchPlaceholder="Search anywhere...">
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

        <div className="overflow-hidden rounded-[14px] border border-[#2d2d2d]">
          <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#2d2d2d] bg-[#111111] px-4 py-2.5 lg:grid-cols-[2fr_1fr_1.5fr_1fr_auto]">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-white/30">Name</span>
            <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-white/30 lg:block">Department</span>
            <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-white/30 lg:block">Registrations</span>
            <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-white/30 lg:block">Role</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-white/30">Access</span>
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
              const isExpanded = !!expandedRegs[user.uid]
              const joinedDate = user.completedAt ? formatDate(user.completedAt) : "-"

              return (
                <div
                  key={user.uid}
                  className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#2d2d2d] px-4 py-3.5 last:border-0 hover:bg-white/[0.02] lg:grid-cols-[2fr_1fr_1.5fr_1fr_auto]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-white">{user.name ?? "-"}</p>
                    <p className="truncate text-[12px] text-white/40">{user.email ?? "-"}</p>
                  </div>

                  <div className="hidden items-center lg:flex">
                    <span className="text-[13px] text-white/40">{departmentsForUser[0] ?? "-"}</span>
                  </div>

                  <div className="hidden items-start lg:flex">
                    {departmentsForUser.length === 0 ? (
                      <span className="text-[13px] text-white/30">-</span>
                    ) : departmentsForUser.length === 1 ? (
                      <span className="text-[13px] text-white/40">
                        {departmentsForUser[0]}{" "}
                        <span className="text-white/25">(joined {joinedDate})</span>
                      </span>
                    ) : (
                      <div className="w-full">
                        <button
                          type="button"
                          onClick={() => toggleRegs(user.uid)}
                          className="flex items-center gap-1 text-[13px] text-white/40 hover:text-white/60"
                        >
                          <span>{departmentsForUser.length} departments</span>
                          <ChevronDown
                            size={12}
                            className={`transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </button>
                        {isExpanded ? (
                          <div className="mt-1.5 space-y-1">
                            {departmentsForUser.map((department) => (
                              <p key={department} className="text-[12px] text-white/40">
                                {department} <span className="text-white/25">(joined {joinedDate})</span>
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="hidden items-center lg:flex">
                    <span className="truncate text-[13px] text-white/40">{user.jobTitle ?? "-"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                    {canChangeRole(user) ? (
                      <div className="relative group">
                        <button
                          type="button"
                          disabled={savingUid === user.uid}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-white/30 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Shield size={13} />
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
              )
            })
          )}
        </div>
      </div>
    </LibraryAppShell>
  )
}
