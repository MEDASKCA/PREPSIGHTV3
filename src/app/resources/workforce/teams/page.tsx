"use client"

import { useEffect, useRef, useState } from "react"
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query as fsQuery,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { getProfile } from "@/lib/profile"
import WorkspaceDesktopShell from "@/components/WorkspaceDesktopShell"
import WorkforcePersistentHeader from "@/components/WorkforcePersistentHeader"
import { Crown, Lock, Pencil, Search, Star, X } from "lucide-react"
import type { CommsUser } from "@/lib/comms-types"

// ─── Types ────────────────────────────────────────────────────────────────────

type OrgTeam = {
  id: string
  organizationId: string
  name: string
  teamType: "theatre" | "specialty"
  memberUids: string[]
}

type StaffRow = CommsUser & {
  specialtyTeams: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-sky-700",
  "bg-violet-700",
  "bg-emerald-700",
  "bg-amber-700",
  "bg-rose-700",
]

function avatarColor(uid: string) {
  let n = 0
  for (let i = 0; i < uid.length; i++) n += uid.charCodeAt(i)
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?"
  return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase()
}

// ─── Edit Drawer ──────────────────────────────────────────────────────────────

function EditDrawer({
  staff,
  specialtyTeams,
  onClose,
  onSave,
}: {
  staff: StaffRow
  specialtyTeams: OrgTeam[]
  onClose: () => void
  onSave: (uid: string, patch: Partial<CommsUser>, teamIds: string[]) => Promise<void>
}) {
  const [name, setName] = useState(staff.displayName)
  const [role, setRole] = useState(staff.clinicalRole ?? "")
  const [department, setDepartment] = useState(staff.department ?? "")
  const [band, setBand] = useState(staff.band ?? "")
  const [staffType, setStaffType] = useState<"permanent" | "bank" | "agency">(staff.staffType ?? "permanent")
  const [isTeamLeader, setIsTeamLeader] = useState(staff.isTeamLeader ?? false)

  const availableSpecialties = [...new Set([
    ...specialtyTeams.map(t => t.name),
    ...(staff.specialties ?? []),
  ])].sort()
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(staff.specialties ?? [])
  const [primarySpecialty, setPrimarySpecialty] = useState(
    staff.primarySpecialty ?? staff.specialties?.[0] ?? ""
  )

  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(
    specialtyTeams.filter(t => t.memberUids.includes(staff.uid)).map(t => t.id)
  )
  const [saving, setSaving] = useState(false)

  function toggleSpecialty(s: string) {
    setSelectedSpecialties(prev => {
      const next = prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
      if (primarySpecialty === s && !next.includes(s)) setPrimarySpecialty(next[0] ?? "")
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    const eff = selectedSpecialties.filter(Boolean)
    const primary = primarySpecialty && eff.includes(primarySpecialty) ? primarySpecialty : eff[0] ?? ""
    await onSave(staff.uid, {
      displayName: name.trim(),
      clinicalRole: role.trim(),
      department: department.trim(),
      band: band.trim(),
      staffType,
      isTeamLeader,
      specialties: eff,
      primarySpecialty: primary,
    }, selectedTeamIds)
    setSaving(false)
    onClose()
  }

  const inputCls = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white outline-none placeholder:text-white/60 focus:border-[#0096C7]/60"

  return (
    <div className="fixed inset-0 z-[600] flex">
      <button type="button" className="flex-1 bg-black/60" onClick={onClose} aria-label="Close" />
      <div className="flex h-full w-full max-w-sm flex-col border-l border-white/10 bg-[#0a0a0a] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white ${avatarColor(staff.uid)}`}>
              {initials(name || "?")}
              {isTeamLeader && (
                <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 shadow">
                  <Crown size={8} className="text-black" strokeWidth={2.5} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-white">{name || staff.displayName}</p>
              <p className="text-[11px] text-white/60">{staff.email || "—"}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-white/60 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 px-5 py-5">
          <Field label="Display Name">
            <input value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Clinical Role / Job Title">
            <input value={role} onChange={e => setRole(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Department">
            <input value={department} onChange={e => setDepartment(e.target.value)} className={inputCls} />
          </Field>

          {/* Staff Classification */}
          <Field label="Classification">
            <div className="flex gap-1.5">
              {(["permanent", "bank", "agency"] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setStaffType(t)}
                  className={`flex-1 rounded-xl border py-2 text-[12px] font-medium capitalize transition-all ${
                    staffType === t
                      ? t === "permanent" ? "border-[#0096C7]/50 bg-[#0096C7]/15 text-[#67CFCF]"
                        : t === "bank" ? "border-indigo-400/50 bg-indigo-400/12 text-indigo-300"
                        : "border-violet-400/50 bg-violet-400/12 text-violet-300"
                      : "border-white/8 bg-white/[0.03] text-white/40 hover:border-white/15"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </Field>

          {/* Band + Team Leader */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Field label="Band / Grade">
                <input value={band} onChange={e => setBand(e.target.value)} placeholder="e.g. 6" className={inputCls} />
              </Field>
            </div>
            <div className="shrink-0">
              <Field label="Team Leader">
                <button
                  type="button"
                  onClick={() => setIsTeamLeader(v => !v)}
                  className={`flex h-[34px] w-[48px] items-center justify-center rounded-xl border-2 transition-all ${
                    isTeamLeader ? "border-amber-400/60 bg-amber-400/15" : "border-white/10 bg-white/5"
                  }`}
                  aria-pressed={isTeamLeader}
                >
                  <Crown size={14} className={isTeamLeader ? "text-amber-400" : "text-white/30"} />
                </button>
              </Field>
            </div>
          </div>

          {/* Specialties — checkbox list */}
          {availableSpecialties.length > 0 && (
            <Field label="Specialties">
              <div className="space-y-1">
                {availableSpecialties.map(s => {
                  const checked = selectedSpecialties.includes(s)
                  const isPrimary = primarySpecialty === s
                  return (
                    <div
                      key={s}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors ${
                        checked ? "border-[#0096C7]/25 bg-[#0096C7]/6" : "border-white/6 bg-white/[0.02]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSpecialty(s)}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                          checked ? "border-[#0096C7] bg-[#0096C7]" : "border-white/20"
                        }`}
                      >
                        {checked && (
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5L3 5.5L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                      <span className={`flex-1 text-[12px] ${checked ? "text-white" : "text-white/45"}`}>{s}</span>
                      {checked && (
                        <button
                          type="button"
                          onClick={() => setPrimarySpecialty(isPrimary ? "" : s)}
                          title={isPrimary ? "Primary specialty" : "Set as primary"}
                          className="shrink-0"
                        >
                          <Star size={12} className={isPrimary ? "text-amber-400" : "text-white/20"} fill={isPrimary ? "currentColor" : "none"} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="mt-1.5 text-[10px] text-white/35">★ marks the primary specialty shown on the profile</p>
            </Field>
          )}

          {/* Team assignment */}
          {specialtyTeams.length > 0 && (
            <Field label="Specialty Team">
              <div className="space-y-1.5">
                {specialtyTeams.map(team => (
                  <label key={team.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 hover:border-white/15">
                    <input
                      type="checkbox"
                      checked={selectedTeamIds.includes(team.id)}
                      onChange={() => setSelectedTeamIds(prev => prev.includes(team.id) ? prev.filter(x => x !== team.id) : [...prev, team.id])}
                      className="accent-[#0096C7]"
                    />
                    <span className="text-[13px] text-white">{team.name}</span>
                  </label>
                ))}
              </div>
            </Field>
          )}
        </div>

        <div className="border-t border-white/8 px-5 py-4">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="w-full rounded-xl bg-[#0096C7] py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#0085b3] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-medium uppercase tracking-wide text-white/60">{label}</label>
      {children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkforceTeamsPage() {
  const [canEdit, setCanEdit] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [orgTeams, setOrgTeams] = useState<OrgTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [editingStaff, setEditingStaff] = useState<StaffRow | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    if (toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const profile = getProfile()
    setCanEdit(profile?.role === "manager" || profile?.role === "senior_manager")

    const uid = auth?.currentUser?.uid
    if (!uid || !db) { setLoading(false); return }

    getDocs(fsQuery(
      collection(db, "comms_v5_memberships"),
      where("uid", "==", uid),
      where("status", "==", "active"),
    )).then(snap => {
      if (snap.empty) { setLoading(false); return }
      setOrgId(snap.docs[0].data().orgId as string)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!orgId || !db) return
    return onSnapshot(
      fsQuery(collection(db, "comms_v5_threads"), where("organizationId", "==", orgId), where("teamType", "==", "specialty")),
      snap => setOrgTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }) as OrgTeam)),
      () => {},
    )
  }, [orgId])

  useEffect(() => {
    if (!orgId || !db) return
    const firestore = db
    const unsub = onSnapshot(
      fsQuery(collection(firestore, "comms_v5_memberships"), where("orgId", "==", orgId), where("status", "==", "active")),
      async snap => {
        const uids = [...new Set(snap.docs.map(d => d.data().uid as string).filter(Boolean))]
        const users: CommsUser[] = []
        for (const uid of uids) {
          const ud = await getDoc(doc(firestore, "comms_v5_users", uid))
          if (ud.exists()) users.push({ uid, ...ud.data() } as CommsUser)
        }
        setStaff(users.map(u => ({ ...u, specialtyTeams: [] })))
        setLoading(false)
      },
      () => setLoading(false),
    )
    return unsub
  }, [orgId])

  const specialtyTeams = orgTeams
  const staffWithTeams: StaffRow[] = staff.map(member => ({
    ...member,
    specialtyTeams: specialtyTeams.filter(t => t.memberUids.includes(member.uid)).map(t => t.name),
  }))

  const q = query.trim().toLowerCase()
  const filtered = q
    ? staffWithTeams.filter(m =>
        (m.displayName ?? "").toLowerCase().includes(q) ||
        (m.email ?? "").toLowerCase().includes(q) ||
        (m.clinicalRole ?? "").toLowerCase().includes(q) ||
        (m.department ?? "").toLowerCase().includes(q) ||
        (m.specialties ?? []).some(s => s.toLowerCase().includes(q)) ||
        m.specialtyTeams.some(t => t.toLowerCase().includes(q))
      )
    : staffWithTeams

  async function handleSave(uid: string, patch: Partial<CommsUser>, selectedTeamIds: string[]) {
    if (!db) return
    const firestore = db
    await setDoc(doc(firestore, "comms_v5_users", uid), { ...patch, updatedAt: Date.now() }, { merge: true })
    for (const team of specialtyTeams) {
      const shouldBeIn = selectedTeamIds.includes(team.id)
      const isIn = team.memberUids.includes(uid)
      if (shouldBeIn && !isIn) await updateDoc(doc(firestore, "comms_v5_threads", team.id), { memberUids: arrayUnion(uid) })
      else if (!shouldBeIn && isIn) await updateDoc(doc(firestore, "comms_v5_threads", team.id), { memberUids: arrayRemove(uid) })
    }
    setStaff(prev => prev.map(s => s.uid === uid ? { ...s, ...patch } : s))
    setOrgTeams(prev => prev.map(t => {
      const shouldBeIn = selectedTeamIds.includes(t.id)
      const isIn = t.memberUids.includes(uid)
      if (shouldBeIn && !isIn) return { ...t, memberUids: [...t.memberUids, uid] }
      if (!shouldBeIn && isIn) return { ...t, memberUids: t.memberUids.filter(id => id !== uid) }
      return t
    }))
    showToast("Saved")
  }

  return (
    <WorkspaceDesktopShell currentNav="workforce">
      <WorkforcePersistentHeader current="teams" hideCalendar />

      <div className="flex-1 overflow-y-auto">
        {/* Page header */}
        <div className="border-b border-white/8 px-6 py-5 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-[20px] font-semibold text-white">Teams</h1>
              <p className="mt-0.5 text-[13px] text-white/60">
                {loading ? "Loading…" : `${staffWithTeams.length} member${staffWithTeams.length !== 1 ? "s" : ""}`}
                {!canEdit && (
                  <span className="ml-2 inline-flex items-center gap-1">
                    <Lock size={10} />view only
                  </span>
                )}
              </p>
            </div>
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-3 py-2 sm:w-72">
              <Search size={14} className="shrink-0 text-white" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Name, role, specialty, team…"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/60"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="text-white hover:text-white">
                  <X size={13} />
                </button>
              )}
            </label>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-px px-6 pt-4 lg:px-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-[58px] animate-pulse rounded-xl bg-white/4" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
            <p className="text-[15px] font-medium text-white">
              {query ? "No results" : "No staff members yet"}
            </p>
            <p className="text-[13px] text-white">
              {query ? "Try a different search" : "Staff will appear here once they join the workspace."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Column headers */}
            <div className="grid min-w-[820px] grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_40px] gap-4 border-b border-white/8 px-6 py-2.5 lg:px-8">
              {["Name", "Email", "Role", "Band", "Department", "Specialties", "Team"].map((col, i) => (
                <span key={i} className="text-[11px] font-semibold uppercase tracking-wide text-white/60">{col}</span>
              ))}
            </div>

            <div className="divide-y divide-white/5">
              {filtered.map(member => (
                <StaffRowItem
                  key={member.uid}
                  member={member}
                  canEdit={canEdit}
                  onEdit={() => setEditingStaff(member)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {editingStaff && canEdit && (
        <EditDrawer
          staff={editingStaff}
          specialtyTeams={specialtyTeams}
          onClose={() => setEditingStaff(null)}
          onSave={handleSave}
        />
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-[13px] text-white shadow-lg backdrop-blur">
          {toast}
        </div>
      )}
    </WorkspaceDesktopShell>
  )
}

// ─── StaffRowItem ──────────────────────────────────────────────────────────────

function StaffRowItem({ member, canEdit, onEdit }: { member: StaffRow; canEdit: boolean; onEdit: () => void }) {
  return (
    <div className="grid min-w-[820px] grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_40px] items-center gap-4 px-6 py-3 transition-colors hover:bg-white/3 lg:px-8">

      {/* Name + primary specialty */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative shrink-0">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white ${avatarColor(member.uid)}`}>
            {initials(member.displayName)}
          </div>
          {member.isTeamLeader && (
            <div className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 shadow">
              <Crown size={7} className="text-black" strokeWidth={2.5} />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-white leading-tight">{member.displayName || "—"}</p>
          {(member.primarySpecialty || (member.specialties ?? []).length > 0) && (
            <p className="truncate text-[11px] text-white/50 leading-tight">
              {member.primarySpecialty || member.specialties![0]}
            </p>
          )}
        </div>
      </div>

      {/* Email */}
      <span className="min-w-0 truncate text-[12px] text-white">{member.email || <Dim />}</span>

      {/* Role */}
      <span className="min-w-0 truncate text-[13px] text-white">{member.clinicalRole || <Dim />}</span>

      {/* Band + staffType */}
      <div className="flex flex-wrap items-center gap-1">
        {member.staffType === "bank" && (
          <span className="rounded-md border border-indigo-400/35 bg-indigo-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">Bank</span>
        )}
        {member.staffType === "agency" && (
          <span className="rounded-md border border-violet-400/35 bg-violet-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-violet-300">Agency</span>
        )}
        {member.band ? (
          <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">Band {member.band}</span>
        ) : (!member.staffType || member.staffType === "permanent") ? <Dim /> : null}
      </div>

      {/* Department */}
      <span className="min-w-0 truncate text-[13px] text-white">{member.department || <Dim />}</span>

      {/* Specialties — primary first, then count */}
      <div className="min-w-0">
        {(member.specialties ?? []).length === 0 ? <Dim /> : (
          <div className="flex flex-col gap-0.5">
            <span className="truncate text-[12px] font-medium text-white">
              {member.primarySpecialty || member.specialties![0]}
            </span>
            {member.specialties!.length > 1 && (
              <span className="text-[11px] text-white/40">+{member.specialties!.length - 1} more</span>
            )}
          </div>
        )}
      </div>

      {/* Team + edit */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap gap-1">
          {member.specialtyTeams.length === 0 ? <Dim /> : (
            <>
              {member.specialtyTeams.slice(0, 1).map(t => (
                <span key={t} className="rounded-full bg-[#0096C7]/25 px-2 py-0.5 text-[10px] font-medium text-[#67CFCF]">{t}</span>
              ))}
              {member.specialtyTeams.length > 1 && (
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white">+{member.specialtyTeams.length - 1}</span>
              )}
            </>
          )}
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/8 hover:text-[#0096C7]"
            aria-label="Edit"
          >
            <Pencil size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

function Dim() {
  return <span className="text-white">—</span>
}