"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore"
import { ArrowUpDown, Bell, ChevronLeft, ChevronRight, Crown, MessageSquare, Settings2, X } from "lucide-react"
import { auth, db } from "@/lib/firebase"
import {
  createDirectPing,
  DEFAULT_PING_SHORTCUTS,
  findActiveDuplicatePing,
  getEffectivePingStatus,
  getPingRoleFromClinicalRole,
  getPingStatusLabel,
  isPingActive,
  loadPingShortcutSets,
  readCachedPingShortcutSets,
  resolveCommsRecipientByDisplayName,
  savePingShortcutSets,
  subscribeOrganizationPings,
  subscribePingShortcutSets,
} from "@/lib/comms-pings"
import type { CommsPing, CommsUser, PingShortcutSets } from "@/lib/comms-types"
import { getProfile } from "@/lib/profile"
import { canonicalSpecialtyName } from "@/lib/specialty-normalization"
import RootEntry from "@/components/RootEntry"
import TriangleIcon from "@/components/TriangleIcon"
import WorkforceSectionNav from "@/components/WorkforceSectionNav"
import WorkspaceDesktopShell from "@/components/WorkspaceDesktopShell"

// ── Types ──────────────────────────────────────────────────────────────────

type StaffStatus = "Scrub" | "Relieving" | "On Break" | "Sick" | "Dispatched"
type FilterMode = "Area" | "Specialty" | "Consultant"
type SortKey = "name" | "role" | "specialty" | "area" | "start" | "status"

type TeamMember = {
  name: string
  role: string
  band?: string
  specialty: string
  status: StaffStatus
  start: string
  end: string
}

type TeamCard = {
  theatre: string
  theatreNum: number
  area: string
  specialty: string
  consultantSurgeon: string
  consultantAnaesthetist: string
  sessionTime: string
  staff: TeamMember[]
}

type ContextMenu = {
  memberName: string
  memberRole: string
  theatre: string
  x: number
  y: number
} | null

type PingRole = keyof typeof DEFAULT_PING_SHORTCUTS

type ActiveModal =
  | { kind: "toast"; message: string }
  | null

type PingConfigDrawer =
  | {
      memberName: string
      memberRole: string
      pingRole: PingRole
    }
  | null

type WiringDiagnostic = {
  organizationId: string
  membershipCount: number
  commsUserCount: number
  sessionCount: number
  sessionStaffCount: number
  activeMembers: Array<{
    uid: string
    displayName: string
    email: string
    clinicalRole: string
    primarySpecialty: string
  }>
  missingCommsUsers: Array<{
    uid: string
    displayName: string
  }>
  allocatedNames: string[]
}

// ── Status colours (font-only — no bg tint) ────────────────────────────────

const STATUS_META: Record<StaffStatus, { name: string; sub: string }> = {
  "Scrub":      { name: "text-[#38bdf8]", sub: "text-[#7dd3fc]" },
  "Relieving":  { name: "text-[#34d399]", sub: "text-[#6ee7b7]" },
  "On Break":   { name: "text-[#fbbf24]", sub: "text-[#fcd34d]" },
  "Sick":       { name: "text-[#fb7185]", sub: "text-[#fda4af]" },
  "Dispatched": { name: "text-[#c084fc]", sub: "text-[#d8b4fe]" },
}

function isConsultantRole(member: Pick<TeamMember, "role" | "band">) {
  return getClassificationLabel(member).toLowerCase() === "consultant"
}
function isLeadRole(member: Pick<TeamMember, "role" | "band">) {
  const classification = getClassificationLabel(member).toLowerCase()
  return member.role === "Nurse" && (classification === "band 7" || classification === "band 8a")
}
function getGenericRole(role: string) {
  const lower = role.trim().toLowerCase()
  if (lower.includes("surgical assistant") || lower.includes("assistant surgeon")) return "Surgical Assistant"
  if (lower.includes("surgeon")) return "Surgeon"
  if (lower.includes("anaesth")) return "Anaesthetist"
  if (lower.includes("odp") || lower.includes("practitioner")) return "Practitioner"
  if (lower.includes("hca") || lower.includes("support")) return "Support Worker"
  return "Nurse"
}
function getClassificationLabel(member: Pick<TeamMember, "band" | "role">) {
  if (member.band?.trim()) return member.band.trim()
  if (member.role === "Surgeon") return "Consultant"
  if (member.role === "Anaesthetist") return "Consultant"
  if (member.role === "Surgical Assistant") return "Registrar"
  if (member.role === "Nurse") return "Band 6"
  if (member.role === "Practitioner") return "Band 6"
  if (member.role === "Support Worker") return "Band 3"
  return "—"
}
function getBandLabel(member: Pick<TeamMember, "band" | "role">) {
  return getClassificationLabel(member)
}

type ActiveMembership = {
  uid: string
  orgId: string
  status?: string
  displayName?: string
}

// ── Mock data ──────────────────────────────────────────────────────────────

function makeCard(n: number): TeamCard {
  const specialty = canonicalSpecialtyName("Operating Theatre", n % 5 === 0 ? "Neurosurgery" : n % 4 === 0 ? "General Surgery" : n % 3 === 0 ? "Gynaecology" : "Trauma and Orthopaedics")
  const area = n % 3 === 0 ? "Day Surgery" : n % 2 === 0 ? "DSU" : "Main Theatres"
  const session = n % 4 === 0 ? "10:00 - 22:00" : n % 3 === 0 ? "09:00 - 21:00" : n % 2 === 0 ? "08:00 - 20:00" : "07:30 - 19:30"
  const [s, e] = session.split(" - ")
  const surgeon = specialty === "Neurosurgery" ? "Ms Clarke" : specialty === "General Surgery" ? "Mr Shah" : specialty === "ENT" ? "Mr Patel" : "Mr Walker"
  const anaes = specialty === "Neurosurgery" ? "Dr Ahmed" : specialty === "General Surgery" ? "Dr Collins" : specialty === "ENT" ? "Dr Farah" : "Dr Bennett"
  const surnames = ["Murray", "Singh", "Thomas", "Reid", "Costa", "Ali", "Khan"]
  const initials = ["A", "B", "C", "D", "E", "F", "G"]
  const pool: StaffStatus[] = ["Scrub", "Scrub", "Relieving", "On Break", "Dispatched"]
  return {
    theatre: `Theatre ${n}`, theatreNum: n, area, specialty,
    consultantSurgeon: surgeon, consultantAnaesthetist: anaes, sessionTime: session,
    staff: [
      { name: `${initials[n % 7]} ${surnames[(n + 1) % 7]}`, role: "Surgeon",       band: "Consultant", specialty, status: "Scrub",        start: s,       end: e },
      { name: `Dr ${surnames[n % 7]}`,                       role: "Anaesthetist", band: "Consultant", specialty, status: "Scrub",        start: s,       end: e },
      { name: `${initials[(n+2)%7]} ${surnames[(n+3)%7]}`,   role: "Nurse",             band: "Band 6",    specialty, status: pool[n % 5],  start: s,       end: e },
      { name: `${initials[(n+4)%7]} ${surnames[(n+5)%7]}`,   role: "Support Worker",    band: "Band 3",    specialty, status: pool[(n+2)%5],  start: "13:00", end: e },
      { name: `${initials[(n+6)%7]} ${surnames[(n+6)%7]}`,   role: "Practitioner", band: "Band 6",     specialty, status: pool[(n+4)%5],  start: "13:00", end: e },
    ],
  }
}

const TEAM_CARDS: TeamCard[] = [
  {
    theatre: "Theatre 1", theatreNum: 1, area: "Main Theatres",
    specialty: "Trauma and Orthopaedics", consultantSurgeon: "Mr Walker", consultantAnaesthetist: "Dr Bennett",
    sessionTime: "07:30 - 19:30",
    staff: [
      { name: "J Smith",   role: "Surgeon",       band: "Consultant", specialty: "Trauma and Orthopaedics", status: "Scrub",      start: "07:30", end: "19:30" },
      { name: "A Bennett", role: "Anaesthetist", band: "Consultant", specialty: "Trauma and Orthopaedics", status: "Scrub",      start: "07:30", end: "19:30" },
      { name: "S Patel",   role: "Nurse",          band: "Band 6",    specialty: "Trauma and Orthopaedics", status: "Scrub",      start: "07:30", end: "19:30" },
      { name: "L Brown",   role: "Support Worker", band: "Band 3",    specialty: "Trauma and Orthopaedics", status: "On Break",   start: "07:30", end: "19:30" },
      { name: "M Johnson", role: "Practitioner", band: "Band 6",     specialty: "Trauma and Orthopaedics", status: "Dispatched", start: "07:30", end: "19:30" },
      { name: "R Walker",  role: "Surgical Assistant", band: "Registrar",  specialty: "Trauma and Orthopaedics", status: "Relieving",  start: "13:00", end: "19:30" },
      { name: "D Evans",   role: "Anaesthetist", band: "Registrar",  specialty: "Trauma and Orthopaedics", status: "Sick",       start: "13:00", end: "19:30" },
      { name: "K Lee",     role: "Nurse",        band: "Band 6",     specialty: "Trauma and Orthopaedics", status: "Relieving",  start: "13:00", end: "19:30" },
    ],
  },
  ...Array.from({ length: 11 }, (_, i) => makeCard(i + 2)),
]

// ── Date helpers ───────────────────────────────────────────────────────────

function startOfWeek(date: Date) {
  const next = new Date(date)
  const day = next.getDay()
  next.setDate(next.getDate() + (day === 0 ? -6 : 1 - day))
  next.setHours(0, 0, 0, 0)
  return next
}
function addDays(date: Date, days: number) {
  const next = new Date(date); next.setDate(next.getDate() + days); return next
}
function startOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1) }
function endOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth() + 1, 0) }
function endOfWeek(date: Date) { return addDays(startOfWeek(date), 6) }

function buildMonthCalendar(date: Date) {
  const gridStart = startOfWeek(startOfMonth(date))
  const gridEnd = endOfWeek(endOfMonth(date))
  const days: Array<{ key: string; date: Date; day: string; inMonth: boolean; isToday: boolean }> = []
  const todayKey = new Date().toISOString().slice(0, 10)
  for (let cur = new Date(gridStart); cur <= gridEnd; cur = addDays(cur, 1)) {
    days.push({
      key: cur.toISOString().slice(0, 10),
      date: new Date(cur),
      day: cur.toLocaleDateString("en-GB", { day: "2-digit" }),
      inMonth: cur.getMonth() === date.getMonth(),
      isToday: cur.toISOString().slice(0, 10) === todayKey,
    })
  }
  return days
}

function matchesFilter(card: TeamCard, mode: FilterMode, val: string) {
  if (val === "All") return true
  if (mode === "Area") return card.area === val
  if (mode === "Specialty") return card.specialty === val
  return card.consultantSurgeon === val
}

// ── Column header button ───────────────────────────────────────────────────

function ColHeader({
  label, colKey, sortKey, onSort,
}: {
  label: string; colKey: SortKey; sortKey: SortKey | null
  onSort: (k: SortKey) => void
}) {
  const active = sortKey === colKey
  return (
    <button
      type="button"
      onClick={() => onSort(colKey)}
      className={`flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors ${active ? "text-[#0096C7]" : "text-white hover:text-[#0096C7]"}`}
    >
      {label}
      <ArrowUpDown size={10} className={active ? "text-[#0096C7]" : "text-white"} />
    </button>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

const COLS = "grid-cols-[56px_minmax(140px,1.55fr)_minmax(132px,1.1fr)_minmax(92px,0.8fr)_minmax(176px,1.25fr)_minmax(128px,0.95fr)_76px_76px_minmax(160px,1.15fr)]"
const PING_MENU_WIDTH = 296
const PING_MENU_MAX_HEIGHT = 560

export default function WorkforcePage() {
  const router = useRouter()
  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean | null>(null)
  const [selectedDateKey, setSelectedDateKey] = useState(() => new Date().toISOString().slice(0, 10))
  const [monthInput, setMonthInput] = useState(() =>
    new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
  )
  const [filterMode, setFilterMode] = useState<FilterMode>("Area")
  const [selectedFilter, setSelectedFilter] = useState("All")
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [pingConfigDrawer, setPingConfigDrawer] = useState<PingConfigDrawer>(null)
  const [pingShortcutSets, setPingShortcutSets] = useState<PingShortcutSets>(() => readCachedPingShortcutSets())
  const [activePingsByMember, setActivePingsByMember] = useState<Record<string, CommsPing>>({})
  const [seedVersion, setSeedVersion] = useState(0)
  const [isSeedingSession, setIsSeedingSession] = useState(false)
  const [isInspectingWiring, setIsInspectingWiring] = useState(false)
  const [wiringDiagnostic, setWiringDiagnostic] = useState<WiringDiagnostic | null>(null)
  const [selectedTheatre, setSelectedTheatre] = useState<number | null>(null)
  const [cards, setCards] = useState<TeamCard[]>(TEAM_CARDS)

  const contextMenuStyle = useMemo(() => {
    if (!contextMenu) return null
    if (typeof window === "undefined") {
      return { left: contextMenu.x, top: contextMenu.y, maxHeight: PING_MENU_MAX_HEIGHT }
    }
    const viewportPadding = 16
    const availableHeight = window.innerHeight - viewportPadding * 2
    const maxHeight = Math.min(PING_MENU_MAX_HEIGHT, availableHeight)
    const left = Math.max(
      viewportPadding,
      Math.min(contextMenu.x, window.innerWidth - PING_MENU_WIDTH - viewportPadding),
    )
    const top = Math.max(
      viewportPadding,
      Math.min(contextMenu.y, window.innerHeight - maxHeight - viewportPadding),
    )
    return { left, top, maxHeight }
  }, [contextMenu])

  // Live fetch: pull theatre_sessions for the selected date, overlay on top of mock cards
  useEffect(() => {
    if (!db) return
    const q = query(collection(db, "theatre_sessions"), where("date", "==", selectedDateKey))
    getDocs(q)
      .then((snap) => {
        if (snap.empty) { console.warn("[Workforce] No sessions for", selectedDateKey); setCards(TEAM_CARDS); return }
        console.log("[Workforce] Loaded", snap.size, "sessions for", selectedDateKey)
        const live: TeamCard[] = snap.docs.map((d) => {
          const s = d.data()
          return {
            theatre: s.theatre,
            theatreNum: Number(s.theatreNum),
            area: s.area,
            specialty: canonicalSpecialtyName("Operating Theatre", s.specialty || "Trauma and Orthopaedics"),
            consultantSurgeon: s.consultantSurgeon,
            consultantAnaesthetist: s.consultantAnaesthetist,
            sessionTime: s.sessionTime,
            staff: (s.staff ?? []).map((m: Record<string, string>) => ({
              name: m.name,
              role: getGenericRole(m.role || ""),
              band: m.band?.trim() || undefined,
              specialty: canonicalSpecialtyName("Operating Theatre", m.specialty || s.specialty || "Trauma and Orthopaedics"),
              status: m.status as StaffStatus, start: m.start, end: m.end,
            })),
          }
        })
        const liveNums = new Set(live.map((c) => c.theatreNum))
        const merged = [
          ...live,
          ...TEAM_CARDS.filter((c) => !liveNums.has(c.theatreNum)),
        ].sort((a, b) => a.theatreNum - b.theatreNum)
        setCards(merged)
      })
      .catch((err) => { console.error("[Workforce] theatre_sessions fetch failed:", err); setCards(TEAM_CARDS) })
  }, [selectedDateKey, seedVersion])

  const selectedDateObject = useMemo(() => new Date(`${selectedDateKey}T00:00:00`), [selectedDateKey])
  const monthDays = useMemo(
    () => buildMonthCalendar(selectedDateObject).filter((d) => d.inMonth),
    [selectedDateObject],
  )

  const filterOptions = useMemo(() => {
    const vals =
      filterMode === "Area" ? Array.from(new Set(cards.map((c) => c.area)))
      : filterMode === "Specialty" ? Array.from(new Set(cards.map((c) => c.specialty)))
      : Array.from(new Set(cards.map((c) => c.consultantSurgeon)))
    return ["All", ...vals]
  }, [filterMode, cards])

  const filteredCards = useMemo(
    () => cards.filter((c) => matchesFilter(c, filterMode, selectedFilter)),
    [cards, filterMode, selectedFilter],
  )

  const displayCards = useMemo(
    () => selectedTheatre === null ? filteredCards : filteredCards.filter((c) => c.theatreNum === selectedTheatre),
    [filteredCards, selectedTheatre],
  )

  // Flat sorted rows for when a sort is active
  type FlatRow = TeamMember & { theatreNum: number; theatre: string; area: string }
  const flatSortedRows = useMemo<FlatRow[]>(() => {
    if (!sortKey) return []
    const rows: FlatRow[] = displayCards.flatMap((card) =>
      card.staff.map((m) => ({ ...m, theatreNum: card.theatreNum, theatre: card.theatre, area: card.area })),
    )
    rows.sort((a, b) => {
      let cmp = 0
      if (sortKey === "name")      cmp = a.name.localeCompare(b.name)
      else if (sortKey === "role") cmp = a.role.localeCompare(b.role)
      else if (sortKey === "specialty") cmp = a.specialty.localeCompare(b.specialty)
      else if (sortKey === "area") cmp = a.area.localeCompare(b.area)
      else if (sortKey === "start") cmp = a.start.localeCompare(b.start)
      else if (sortKey === "status") cmp = a.status.localeCompare(b.status)
      return sortDir === "asc" ? cmp : -cmp
    })
    return rows
  }, [displayCards, sortKey, sortDir])

  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(min-width: 1024px)")
    const sync = () => { setIsDesktopViewport(mq.matches); if (!mq.matches) router.replace("/resources") }
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [router])

  useEffect(() => {
    if (activeModal?.kind === "toast") {
      const t = setTimeout(() => setActiveModal(null), 2800)
      return () => clearTimeout(t)
    }
  }, [activeModal])

  useEffect(() => subscribePingShortcutSets(setPingShortcutSets), [])

  useEffect(() => {
    if (!db) return
    const uid = auth?.currentUser?.uid
    if (!uid) return
    loadPingShortcutSets(db, uid)
      .then((sets) => setPingShortcutSets(sets))
      .catch(() => {})
  }, [])

  function mapClinicalRoleToWorkforceRole(member: CommsUser, index: number) {
    const role = member.clinicalRole?.trim() ?? ""
    const lower = role.toLowerCase()
    if (lower.includes("surgical assistant") || lower.includes("assistant surgeon") || lower.includes("fellow") || lower.includes("registrar")) return "Surgical Assistant"
    if (lower.includes("surgeon")) return "Surgeon"
    if (lower.includes("anaesthet")) return "Anaesthetist"
    if (lower.includes("odp") || lower.includes("practitioner")) return "Practitioner"
    if (lower.includes("hca") || lower.includes("support")) return "Support Worker"
    if (lower.includes("scrub") || lower.includes("nurse") || lower.includes("rn")) return "Nurse"
    return index % 2 === 0 ? "Nurse" : "Support Worker"
  }

  async function resolveActiveOrganizationId() {
    if (!db || !auth?.currentUser) return null
    const firestore = db

    const preferredOrgId = getProfile()?.activeOrganizationId?.trim()
    const ownMembershipSnap = await getDocs(
      query(
        collection(firestore, "comms_v5_memberships"),
        where("uid", "==", auth.currentUser.uid),
        where("status", "==", "active"),
      ),
    )
    const ownMemberships = ownMembershipSnap.docs.map((entry) => entry.data() as ActiveMembership)

    if (preferredOrgId) {
      const preferredMemberSnap = await getDocs(
        query(
          collection(firestore, "comms_v5_memberships"),
          where("orgId", "==", preferredOrgId),
          where("status", "==", "active"),
        ),
      )
      if (!preferredMemberSnap.empty) {
        return {
          organizationId: preferredOrgId,
          membershipCount: preferredMemberSnap.size,
          source: "profile" as const,
        }
      }
    }

    if (ownMemberships.length === 0) return null

    const candidateCounts = await Promise.all(
      ownMemberships.map(async (membership) => {
        const orgMemberSnap = await getDocs(
          query(
            collection(firestore, "comms_v5_memberships"),
            where("orgId", "==", membership.orgId),
            where("status", "==", "active"),
          ),
        )
        return {
          organizationId: membership.orgId,
          membershipCount: orgMemberSnap.size,
        }
      }),
    )

    candidateCounts.sort((left, right) => right.membershipCount - left.membershipCount)
    const best = candidateCounts[0]
    return best ? { ...best, source: "membership" as const } : null
  }

  async function seedSelectedDateFromOrgMembers() {
    if (!db || !auth?.currentUser) {
      setActiveModal({ kind: "toast", message: "Sign in is required before seeding the workforce board." })
      return
    }
    const firestore = db
    const resolvedOrg = await resolveActiveOrganizationId()
    if (!resolvedOrg?.organizationId) {
      setActiveModal({ kind: "toast", message: "No active organization found." })
      return
    }
    const organizationId = resolvedOrg.organizationId

    setIsSeedingSession(true)
    try {
      const membershipSnap = await getDocs(
        query(
          collection(firestore, "comms_v5_memberships"),
          where("orgId", "==", organizationId),
          where("status", "==", "active"),
        ),
      )
      const userRecords = await Promise.all(
        membershipSnap.docs.map(async (membershipDoc) => {
          const membership = membershipDoc.data() as { uid: string; displayName?: string }
          const userSnap = await getDoc(doc(firestore, "comms_v5_users", membership.uid))
          if (!userSnap.exists()) return null
          return { uid: membership.uid, ...userSnap.data() } as CommsUser
        }),
      )

      const members = userRecords.filter((member): member is CommsUser => Boolean(member))
      if (members.length === 0) {
        setActiveModal({ kind: "toast", message: `No active Comms members found for org ${organizationId}.` })
        return
      }

      const sortedMembers = [...members].sort((left, right) => (left.displayName || "").localeCompare(right.displayName || ""))
      const surgeon = sortedMembers.find((member) => mapClinicalRoleToWorkforceRole(member, 0) === "Surgeon") ?? sortedMembers[0]
      const anaesthetist = sortedMembers.find((member) => mapClinicalRoleToWorkforceRole(member, 0) === "Anaesthetist") ?? sortedMembers.find((member) => member.uid !== surgeon.uid) ?? sortedMembers[0]
      const specialty = canonicalSpecialtyName(
        "Operating Theatre",
        surgeon.primarySpecialty?.trim() || surgeon.specialties?.[0]?.trim() || "Trauma and Orthopaedics",
      )

      const staff = sortedMembers.map((member, index) => ({
        name: member.displayName || member.email || `Staff ${index + 1}`,
        role: mapClinicalRoleToWorkforceRole(member, index),
        band: member.band?.trim() || (mapClinicalRoleToWorkforceRole(member, index) === "Surgeon" ? "Consultant" : mapClinicalRoleToWorkforceRole(member, index) === "Anaesthetist" ? "Consultant" : mapClinicalRoleToWorkforceRole(member, index) === "Surgical Assistant" ? "Registrar" : undefined),
        specialty:
          canonicalSpecialtyName("Operating Theatre", member.primarySpecialty?.trim() || member.specialties?.[0]?.trim() || specialty),
        status: "Scrub" as const,
        start: "07:30",
        end: "19:30",
      }))

      await setDoc(
        doc(firestore, "theatre_sessions", `${selectedDateKey}__theatre_1`),
        {
          organizationId,
          date: selectedDateKey,
          theatre: "Theatre 1",
          theatreNum: 1,
          area: "Main Theatres",
          specialty,
          consultantSurgeon: surgeon.displayName || "Consultant Surgeon",
          consultantAnaesthetist: anaesthetist.displayName || "Consultant Anaesthetist",
          sessionTime: "07:30 - 19:30",
          staff,
          updatedAt: Date.now(),
          seededFromComms: true,
        },
        { merge: true },
      )

      setSeedVersion((value) => value + 1)
      setSelectedTheatre(1)
      setActiveModal({
        kind: "toast",
        message: `Loaded ${members.length} active members into Theatre 1 for ${selectedDateKey}${resolvedOrg.source === "membership" ? " using live Comms org" : ""}.`,
      })
    } catch {
      setActiveModal({ kind: "toast", message: "Unable to seed the workforce session right now." })
    } finally {
      setIsSeedingSession(false)
    }
  }

  async function inspectOrgWiring() {
    if (!db || !auth?.currentUser) {
      setActiveModal({ kind: "toast", message: "Sign in is required before checking workforce wiring." })
      return
    }
    const firestore = db
    const resolvedOrg = await resolveActiveOrganizationId()
    if (!resolvedOrg?.organizationId) {
      setActiveModal({ kind: "toast", message: "No active organization found." })
      return
    }
    const organizationId = resolvedOrg.organizationId

    setIsInspectingWiring(true)
    try {
      const membershipSnap = await getDocs(
        query(
          collection(firestore, "comms_v5_memberships"),
          where("orgId", "==", organizationId),
          where("status", "==", "active"),
        ),
      )

      const membershipRows = membershipSnap.docs.map((entry) => entry.data() as { uid: string; displayName?: string })
      const userRecords = await Promise.all(
        membershipRows.map(async (membership) => {
          const userSnap = await getDoc(doc(firestore, "comms_v5_users", membership.uid))
          if (!userSnap.exists()) {
            return {
              uid: membership.uid,
              displayName: membership.displayName?.trim() || membership.uid,
              missing: true as const,
            }
          }
          const user = userSnap.data() as CommsUser
          return {
            uid: membership.uid,
            displayName: user.displayName?.trim() || membership.displayName?.trim() || user.email?.trim() || membership.uid,
            email: user.email?.trim() || "",
            clinicalRole: user.clinicalRole?.trim() || "",
            primarySpecialty: user.primarySpecialty?.trim() || user.specialties?.[0]?.trim() || "",
            missing: false as const,
          }
        }),
      )

      const sessionsSnap = await getDocs(query(collection(firestore, "theatre_sessions"), where("date", "==", selectedDateKey)))
      const sessions = sessionsSnap.docs.map((entry) => entry.data() as {
        organizationId?: string
        staff?: Array<{ name?: string }>
      })
      const relevantSessions = sessions.filter((session) => !session.organizationId || session.organizationId === organizationId)
      const allocatedNames = relevantSessions.flatMap((session) => (session.staff ?? []).map((member) => member.name?.trim() || "")).filter(Boolean)

      setWiringDiagnostic({
        organizationId,
        membershipCount: membershipRows.length,
        commsUserCount: userRecords.filter((record) => !record.missing).length,
        sessionCount: relevantSessions.length,
        sessionStaffCount: allocatedNames.length,
        activeMembers: userRecords
          .filter((record): record is Extract<typeof record, { missing: false }> => !record.missing)
          .sort((left, right) => left.displayName.localeCompare(right.displayName))
          .map((record) => ({
            uid: record.uid,
            displayName: record.displayName,
            email: record.email,
            clinicalRole: record.clinicalRole,
            primarySpecialty: record.primarySpecialty,
          })),
        missingCommsUsers: userRecords
          .filter((record): record is Extract<typeof record, { missing: true }> => record.missing)
          .map((record) => ({ uid: record.uid, displayName: record.displayName })),
        allocatedNames,
      })
    } catch {
      setActiveModal({ kind: "toast", message: "Unable to inspect the workforce wiring right now." })
    } finally {
      setIsInspectingWiring(false)
    }
  }

  useEffect(() => {
    if (!db) return
    const organizationId = getProfile()?.activeOrganizationId?.trim()
    if (!organizationId) return
    return subscribeOrganizationPings(
      db,
      organizationId,
      (pings) => {
        const now = Date.now()
        const next: Record<string, CommsPing> = {}
        pings
          .filter((ping) => Boolean(ping.recipientDisplayName))
          .filter((ping) => {
            const status = getEffectivePingStatus(ping, now)
            if (status === "completed") return Boolean(ping.completedAt && now - ping.completedAt < 10 * 60_000)
            if (status === "declined") return Boolean(ping.declinedAt && now - ping.declinedAt < 10 * 60_000)
            return isPingActive(ping, now)
          })
          .sort((a, b) => b.createdAt - a.createdAt)
          .forEach((ping) => {
            const key = ping.recipientDisplayName!.trim().toLowerCase()
            if (!next[key]) next[key] = { ...ping, status: getEffectivePingStatus(ping, now) }
          })
        setActivePingsByMember(next)
      },
      () => {},
    )
  }, [])

  if (isDesktopViewport === false) return <RootEntry initialSurface="resources" />

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      if (sortDir === "desc") { setSortKey(null); return }
      setSortDir("desc")
    } else {
      setSortKey(key); setSortDir("asc")
    }
  }

  function jumpToDate(next: Date) {
    setSelectedDateKey(next.toISOString().slice(0, 10))
    setMonthInput(next.toLocaleDateString("en-GB", { month: "long", year: "numeric" }))
  }

  function moveMonth(dir: -1 | 1) {
    jumpToDate(new Date(selectedDateObject.getFullYear(), selectedDateObject.getMonth() + dir, 1))
  }

  function commitMonthInput() {
    const parsed = new Date(`1 ${monthInput}`)
    if (Number.isNaN(parsed.getTime())) { setMonthInput(new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })); return }
    jumpToDate(parsed)
  }

  function openContextMenu(e: React.MouseEvent, memberName: string, memberRole: string, theatre: string) {
    e.preventDefault()
    const menuW = 296, menuH = 420
    const x = Math.min(e.clientX, window.innerWidth - menuW - 8)
    const y = Math.min(e.clientY, window.innerHeight - menuH - 8)
    setContextMenu({ memberName, memberRole, theatre, x, y })
  }

  function openComms(memberName?: string) {
    setContextMenu(null)
    router.push(memberName ? `/comms?dmWith=${encodeURIComponent(memberName)}` : "/comms")
  }

  function getMemberActivePing(memberName: string) {
    return activePingsByMember[memberName.trim().toLowerCase()] ?? null
  }

  async function sendPing(memberName: string, memberRole: string, message: string) {
    setContextMenu(null)
    if (!db || !auth?.currentUser) {
      setActiveModal({ kind: "toast", message: "Comms is not available right now." })
      return
    }

    const organizationId = getProfile()?.activeOrganizationId?.trim()
    if (!organizationId) {
      setActiveModal({ kind: "toast", message: "No active organization found for Comms." })
      return
    }

    try {
      const recipient = await resolveCommsRecipientByDisplayName(db, organizationId, memberName)
      if (!recipient) {
        setActiveModal({ kind: "toast", message: `Could not find ${memberName} in Comms.` })
        return
      }

      const duplicate = await findActiveDuplicatePing(db, organizationId, recipient.uid, message)
      if (duplicate) {
        setActiveModal({ kind: "toast", message: `${memberName} already has this ping: ${getPingStatusLabel(duplicate)}` })
        return
      }

      await createDirectPing(db, {
        organizationId,
        senderUid: auth.currentUser.uid,
        senderDisplayName: auth.currentUser.displayName || auth.currentUser.email || "User",
        recipientUid: recipient.uid,
        recipientDisplayName: recipient.displayName || memberName,
        pingRole: getPingRoleFromClinicalRole(memberRole),
        text: message,
      })
      setActiveModal({ kind: "toast", message: `Ping sent to ${memberName}: ${message}` })
    } catch {
      setActiveModal({ kind: "toast", message: `Unable to send ping to ${memberName} right now.` })
    }
  }

  return (
    <WorkspaceDesktopShell currentNav="workforce">
      <div className="relative flex h-full min-h-0 flex-col py-4">
        <div className="flex min-h-0 flex-1 flex-col gap-3">

          {/* ── Top bar ── */}
          <section className="shrink-0 space-y-3 px-4">
            <div className="space-y-4">
              <h1 className="hidden text-[21px] font-medium tracking-[-0.03em] text-white lg:block">Workforce</h1>
              <WorkforceSectionNav current="overview" />
            </div>

            {/* Date strip */}
            <div className="border-b border-[#2d2d2d] pb-1">
              <div className="px-1 py-1.5">
                <div className="flex items-center justify-center gap-3">
                  <button type="button" onClick={() => moveMonth(-1)} className="text-[#67CFCF]">
                    <TriangleIcon direction="left" size={12} />
                  </button>
                  <input
                    value={monthInput}
                    onChange={(e) => setMonthInput(e.target.value)}
                    onBlur={commitMonthInput}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitMonthInput() } }}
                    aria-label="Edit month and year"
                    className="min-w-[160px] rounded-[10px] border border-white/10 bg-[#151515] px-3 py-1.5 text-center text-[14px] text-white outline-none transition-colors hover:border-white/20 focus:border-[#0096C7] focus:ring-1 focus:ring-[#0096C7]/40 cursor-text"
                  />
                  <button type="button" onClick={() => moveMonth(1)} className="text-[#67CFCF]">
                    <TriangleIcon direction="right" size={12} />
                  </button>
                </div>
                <div className="mt-2 overflow-x-auto pb-1">
                  <div className="flex min-w-max items-start gap-2 px-2 py-1.5">
                    {monthDays.map((day) => {
                      const active = day.key === selectedDateKey
                      const wday = day.date.toLocaleDateString("en-GB", { weekday: "short" })
                        .replace("Mon","M").replace("Tue","T").replace("Wed","W")
                        .replace("Thu","TH").replace("Fri","F").replace("Sat","Sa").replace("Sun","Su")
                      return (
                        <div key={day.key} className="flex w-[30px] shrink-0 flex-col items-center gap-1.5">
                          <span className="text-[11px] uppercase leading-none text-white">{wday}</span>
                          <button
                            type="button"
                            onClick={() => jumpToDate(day.date)}
                            className={`w-full rounded-[12px] px-0.5 py-3 text-center font-mono text-[14px] font-black tracking-tighter leading-none transition-all ${
                              active
                                ? "scale-[1.3] bg-[#0096C7] text-white shadow-[0_14px_30px_rgba(0,150,199,0.42)]"
                                : day.isToday
                                  ? "bg-[#67CFCF]/20 text-[#67CFCF] hover:bg-[#67CFCF]/30"
                                  : "bg-[#67CFCF]/10 text-[#d0d0d0] hover:bg-[#67CFCF]/20"
                            }`}
                          >
                            {day.day}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Table section ── */}
          <section className="flex min-h-0 flex-1 flex-col bg-black">
            {/* Filter + carousel + legend — single row */}
            {(() => {
              const isAll = selectedTheatre === null
              const card = isAll ? null : filteredCards.find((c) => c.theatreNum === selectedTheatre) ?? null
              const carouselIdx = isAll ? 0 : filteredCards.findIndex((c) => c.theatreNum === selectedTheatre) + 1
              const totalSlides = filteredCards.length + 1
              const CAROUSEL_SORT_CYCLE = [null, "name", "role", "start"] as const

              function prevSlide() {
                if (isAll) return
                const idx = filteredCards.findIndex((c) => c.theatreNum === selectedTheatre)
                setSelectedTheatre(idx === 0 ? null : filteredCards[idx - 1].theatreNum)
              }
              function nextSlide() {
                if (isAll) {
                  if (filteredCards.length > 0) setSelectedTheatre(filteredCards[0].theatreNum)
                } else {
                  const idx = filteredCards.findIndex((c) => c.theatreNum === selectedTheatre)
                  setSelectedTheatre(idx < filteredCards.length - 1 ? filteredCards[idx + 1].theatreNum : null)
                }
              }

              return (
                <div className="shrink-0 border-b border-black bg-[#0a0a0a] px-4 py-2">
                  <div className="flex items-center gap-3">

                    {/* Filter controls */}
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[13px] font-medium text-white">Filter by</span>
                      <select
                        value={filterMode}
                        onChange={(e) => {
                          setFilterMode(e.target.value as FilterMode)
                          setSelectedFilter("All")
                          setSelectedTheatre(null)
                        }}
                        className="rounded-[8px] border border-[#2d2d2d] bg-[#111111] px-2.5 py-1.5 text-[13px] text-white outline-none"
                      >
                        <option value="Area">Area</option>
                        <option value="Specialty">Specialty</option>
                        <option value="Consultant">Consultant</option>
                      </select>
                      <select
                        value={selectedFilter}
                        onChange={(e) => {
                          setSelectedFilter(e.target.value)
                          setSelectedTheatre(null)
                        }}
                        className="min-w-[140px] rounded-[8px] border border-[#2d2d2d] bg-[#111111] px-2.5 py-1.5 text-[13px] text-white outline-none"
                      >
                        {filterOptions.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                      {sortKey && (
                        <button
                          type="button"
                          onClick={() => setSortKey(null)}
                          className="flex items-center gap-1 rounded-[8px] border border-[#2d2d2d] bg-[#111111] px-2 py-1.5 text-[12px] text-white hover:text-white"
                        >
                          <X size={11} /> Clear sort
                        </button>
                      )}
                    </div>

                    <div className="h-5 w-px shrink-0 bg-[#2d2d2d]" />

                    {/* Carousel — compact, same row */}
                    <div className="flex flex-1 items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={prevSlide}
                        disabled={isAll}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full disabled:opacity-20 hover:bg-white/10"
                      >
                        <ChevronLeft size={15} className="text-[#0096C7]" />
                      </button>

                      {/* Number + info inline */}
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[28px] font-black leading-none tracking-tighter text-[#00c8dc]">
                          {isAll ? "ALL" : String(selectedTheatre).padStart(2, "0")}
                        </span>
                        <div className="flex flex-col justify-center">
                          <span className="text-[12px] font-black uppercase tracking-[0.04em] leading-tight text-white">
                            {isAll ? "All Theatres" : card?.theatre}
                          </span>
                          <span className="text-[11px] leading-tight text-[#00c8dc]">
                            {isAll ? `${filteredCards.length} theatres` : card?.specialty}
                          </span>
                          <span className="text-[10px] leading-tight text-white">
                            {isAll ? "Use arrows to browse" : `${card?.area} · ${card?.consultantSurgeon} · ${card?.consultantAnaesthetist} · ${card?.sessionTime}`}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={nextSlide}
                        disabled={carouselIdx === totalSlides - 1}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full disabled:opacity-20 hover:bg-white/10"
                      >
                        <ChevronRight size={15} className="text-[#0096C7]" />
                      </button>
                    </div>

                    <div className="h-5 w-px shrink-0 bg-[#2d2d2d]" />

                    {/* Sort cycle */}
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { void seedSelectedDateFromOrgMembers() }}
                        disabled={isSeedingSession}
                        className="flex items-center gap-1.5 rounded-[8px] border border-[#2d2d2d] bg-[#111111] px-2.5 py-1.5 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Bell size={13} className="text-[#67CFCF]" />
                        <span className="text-[12px] text-white">{isSeedingSession ? "Loading team..." : "Restore org team"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { void inspectOrgWiring() }}
                        disabled={isInspectingWiring}
                        className="flex items-center gap-1.5 rounded-[8px] border border-[#2d2d2d] bg-[#111111] px-2.5 py-1.5 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Settings2 size={13} className="text-[#67CFCF]" />
                        <span className="text-[12px] text-white">{isInspectingWiring ? "Checking..." : "Check wiring"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSortKey((k) => { const i = CAROUSEL_SORT_CYCLE.indexOf(k as typeof CAROUSEL_SORT_CYCLE[number]); return CAROUSEL_SORT_CYCLE[(i + 1) % CAROUSEL_SORT_CYCLE.length] as SortKey | null })}
                        className="flex shrink-0 items-center gap-1.5 rounded-[8px] border border-[#2d2d2d] bg-[#111111] px-2.5 py-1.5"
                      >
                        <ArrowUpDown size={13} className={sortKey ? "text-[#0096C7]" : "text-white"} />
                        <span className="text-[12px] text-white">{sortKey ?? "Sort"}</span>
                      </button>
                    </div>

                  </div>
                </div>
              )
            })()}

            {/* Scrollable area — horizontal + vertical */}
            <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
              {/* Column header — sticky vertically, scrolls horizontally with rows */}
              <div className={`sticky top-0 z-10 grid ${COLS} min-w-[1180px] items-center gap-x-5 border-b border-black bg-[#0d0d0d] px-5 py-2.5`}>
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white">Theatre</span>
                <ColHeader label="Staff Name"  colKey="name"      sortKey={sortKey} onSort={handleSort} />
                <ColHeader label="Role"        colKey="role"      sortKey={sortKey} onSort={handleSort} />
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white">Band / Grade</span>
                <ColHeader label="Specialty"   colKey="specialty" sortKey={sortKey} onSort={handleSort} />
                <ColHeader label="Area"        colKey="area"      sortKey={sortKey} onSort={handleSort} />
                <ColHeader label="Start"       colKey="start"     sortKey={sortKey} onSort={handleSort} />
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white">End</span>
                <ColHeader label="Status"      colKey="status"    sortKey={sortKey} onSort={handleSort} />
              </div>

              {/* Rows */}
              <div className="min-w-[1180px]">
              {sortKey ? (
                // ── Flat sorted view ─────────────────────────────────────
                <>
                  {flatSortedRows.map((row, i) => {
                    const c = STATUS_META[row.status]
                    return (
                      <div
                        key={`${row.theatre}-${row.name}-${i}`}
                        onContextMenu={(e) => openContextMenu(e, row.name, row.role, row.theatre)}
                        className={`group grid ${COLS} cursor-context-menu items-center gap-x-5 border-b border-black bg-black px-5 py-2.5 transition-colors hover:bg-[#141414]`}
                      >
                        <span className={`font-mono text-[17px] font-black leading-none ${c.name}`}>
                          {String(row.theatreNum).padStart(2, "0")}
                        </span>
                        <span className={`truncate text-[13px] font-semibold ${c.name}`}>{row.name}</span>
                        <span className="flex min-w-0 items-center gap-1.5">
                          {isConsultantRole(row) && <span className="shrink-0 text-[13px] leading-none" style={{ color: "#FFD700" }}>★</span>}
                          {isLeadRole(row) && <Crown size={12} className="shrink-0" style={{ color: "#FFD700" }} />}
                          <span className={`truncate text-[12px] ${c.sub}`}>{row.role}</span>
                        </span>
                        <span className={`text-[12px] font-semibold ${c.sub}`}>{getBandLabel(row)}</span>
                        <span className={`truncate text-[12px] ${c.sub}`}>{row.specialty}</span>
                        <span className={`truncate text-[12px] ${c.sub}`}>{row.area}</span>
                        <span className={`text-[12px] tabular-nums ${c.sub}`}>{row.start}</span>
                        <span className={`text-[12px] tabular-nums ${c.sub}`}>{row.end}</span>
                        <div className="flex min-w-0 items-center gap-2">
                          <span className={`shrink-0 text-[12px] font-semibold ${c.name}`}>{row.status}</span>
                          <InlinePingState livePing={getMemberActivePing(row.name)} />
                        </div>
                      </div>
                    )
                  })}
                </>
              ) : (
                // ── Grouped by theatre ───────────────────────────────────
                <>
                  {displayCards.map((card) => (
                    <div key={card.theatre}>
                      {/* Staff rows */}
                      {card.staff.map((member, memberIndex) => {
                        const c = STATUS_META[member.status]
                        return (
                          <div
                            key={`${card.theatre}-${member.name}-${member.role}-${member.start}-${memberIndex}`}
                            onContextMenu={(e) => openContextMenu(e, member.name, member.role, card.theatre)}
                            className={`group grid ${COLS} cursor-context-menu items-center gap-x-5 border-b border-black bg-black px-5 py-2.5 transition-colors hover:bg-[#141414]`}
                          >
                            <span className={`font-mono text-[17px] font-black leading-none ${c.name}`}>
                              {String(card.theatreNum).padStart(2, "0")}
                            </span>
                            <span className={`truncate text-[13px] font-semibold ${c.name}`}>{member.name}</span>
                            <span className="flex min-w-0 items-center gap-1.5">
                              {isConsultantRole(member) && <span className="shrink-0 text-[13px] leading-none" style={{ color: "#FFD700" }}>★</span>}
                              {isLeadRole(member) && <Crown size={12} className="shrink-0" style={{ color: "#FFD700" }} />}
                              <span className={`truncate text-[12px] ${c.sub}`}>{member.role}</span>
                            </span>
                            <span className={`text-[12px] font-semibold ${c.sub}`}>{getBandLabel(member)}</span>
                            <span className={`truncate text-[12px] ${c.sub}`}>{member.specialty}</span>
                            <span className={`truncate text-[12px] ${c.sub}`}>{card.area}</span>
                            <span className={`text-[12px] tabular-nums ${c.sub}`}>{member.start}</span>
                            <span className={`text-[12px] tabular-nums ${c.sub}`}>{member.end}</span>
                            <div className="flex min-w-0 items-center gap-2">
                              <span className={`shrink-0 text-[12px] font-semibold ${c.name}`}>{member.status}</span>
                              <InlinePingState livePing={getMemberActivePing(member.name)} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </>
              )}
              </div>
            </div>

            <div className="shrink-0 border-t border-black bg-black px-4 py-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] leading-none text-white">
                <span className="text-white/55">Key</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#38bdf8]" />Scrub</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#34d399]" />Relief</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#fbbf24]" />Break</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#fb7185]" />Sick</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#c084fc]" />Dispatch</span>
              </div>
            </div>

          </section>
        </div>

        {/* ── Context menu ── */}
        {contextMenu && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null) }}
          >
            <div
              className="absolute flex w-[296px] flex-col rounded-[18px] border border-[#1e1e1e] bg-[#0f0f0f] p-2 shadow-[0_24px_56px_rgba(0,0,0,0.8)]"
              style={contextMenuStyle ?? { left: contextMenu.x, top: contextMenu.y, maxHeight: PING_MENU_MAX_HEIGHT }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 border-b border-[#1a1a1a] px-3 pb-3 pt-2">
                <p className="text-[14px] font-semibold text-white">{contextMenu.memberName}</p>
                <p className="text-[12px] text-white">{getPingRoleFromClinicalRole(contextMenu.memberRole)} · {contextMenu.theatre}</p>
              </div>

              <div className="px-3 pb-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#67CFCF]">Ping shortcuts</p>
                <p className="mt-1 text-[11px] text-white/70">Quick-send shortcuts tailored to this role.</p>
              </div>

              <div className="space-y-1 overflow-y-auto px-1 pb-1">
                {[...DEFAULT_PING_SHORTCUTS[getPingRoleFromClinicalRole(contextMenu.memberRole)], ...pingShortcutSets[getPingRoleFromClinicalRole(contextMenu.memberRole)]].map((ping) => (
                  <button
                    key={ping}
                    type="button"
                    onClick={() => { void sendPing(contextMenu.memberName, contextMenu.memberRole, ping) }}
                    className="flex w-full items-center gap-3 rounded-[12px] border border-[#232323] bg-[#141414] px-3 py-3 text-left transition-colors hover:border-[#2f4d56] hover:bg-[#191c1d]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fbbf24]/15">
                      <Bell size={14} className="text-[#fbbf24]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-white">{ping}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="my-1.5 border-t border-[#1a1a1a]" />

              <div className="grid grid-cols-2 gap-2 px-2 pb-2">
                <button
                  type="button"
                  onClick={() => openComms(contextMenu.memberName)}
                  className="flex items-center justify-center gap-2 rounded-[12px] border border-[#232323] bg-[#141414] px-3 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#191919]"
                >
                  <MessageSquare size={13} className="text-[#38bdf8]" />
                  Open chat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPingConfigDrawer({
                      memberName: contextMenu.memberName,
                      memberRole: contextMenu.memberRole,
                      pingRole: getPingRoleFromClinicalRole(contextMenu.memberRole),
                    })
                    setContextMenu(null)
                  }}
                  className="flex items-center justify-center gap-2 rounded-[12px] border border-[#232323] bg-[#141414] px-3 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#191919]"
                >
                  <Settings2 size={13} className="text-[#67CFCF]" />
                  Manage pings
                </button>
              </div>
            </div>
          </div>
        )}

        {pingConfigDrawer && (
          <PingConfigPanel
            pingRole={pingConfigDrawer.pingRole}
            memberName={pingConfigDrawer.memberName}
            customPings={pingShortcutSets[pingConfigDrawer.pingRole]}
            onClose={() => setPingConfigDrawer(null)}
            onSave={(next) => {
              const updatedSets = { ...pingShortcutSets, [pingConfigDrawer.pingRole]: next }
              setPingShortcutSets(updatedSets)
              if (db && auth?.currentUser?.uid) {
                void savePingShortcutSets(db, auth.currentUser.uid, updatedSets)
              }
            }}
          />
        )}

        {wiringDiagnostic && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6" onClick={() => setWiringDiagnostic(null)}>
            <div
              className="max-h-[80vh] w-full max-w-[760px] overflow-y-auto rounded-[20px] border border-[#1f1f1f] bg-[#0c0c0c] p-5 shadow-[0_28px_72px_rgba(0,0,0,0.82)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-4">
                <div>
                  <p className="text-[18px] font-semibold text-white">Workforce wiring check</p>
                  <p className="mt-1 text-[12px] text-white/65">Selected date: {selectedDateKey} · Org: {wiringDiagnostic.organizationId}</p>
                </div>
                <button type="button" onClick={() => setWiringDiagnostic(null)} className="text-white/55 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <div className="rounded-[14px] border border-[#1f1f1f] bg-[#121212] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-white/50">Memberships</p>
                  <p className="mt-2 text-[20px] font-semibold text-white">{wiringDiagnostic.membershipCount}</p>
                </div>
                <div className="rounded-[14px] border border-[#1f1f1f] bg-[#121212] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-white/50">Comms users</p>
                  <p className="mt-2 text-[20px] font-semibold text-white">{wiringDiagnostic.commsUserCount}</p>
                </div>
                <div className="rounded-[14px] border border-[#1f1f1f] bg-[#121212] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-white/50">Sessions</p>
                  <p className="mt-2 text-[20px] font-semibold text-white">{wiringDiagnostic.sessionCount}</p>
                </div>
                <div className="rounded-[14px] border border-[#1f1f1f] bg-[#121212] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-white/50">Allocated staff</p>
                  <p className="mt-2 text-[20px] font-semibold text-white">{wiringDiagnostic.sessionStaffCount}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <section>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#67CFCF]">Active org members</p>
                  <div className="mt-3 space-y-2">
                    {wiringDiagnostic.activeMembers.length === 0 ? (
                      <div className="rounded-[14px] border border-dashed border-white/10 bg-[#101010] px-4 py-3 text-[13px] text-white/60">
                        No `comms_v5_users` matched the active memberships for this organization.
                      </div>
                    ) : (
                      wiringDiagnostic.activeMembers.map((member) => {
                        const allocated = wiringDiagnostic.allocatedNames.some((name) => name.toLowerCase() === member.displayName.toLowerCase())
                        return (
                          <div key={member.uid} className="rounded-[14px] border border-[#1f1f1f] bg-[#121212] px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[14px] font-semibold text-white">{member.displayName}</p>
                              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${allocated ? "bg-emerald-500/12 text-emerald-300" : "bg-amber-500/12 text-amber-300"}`}>
                                {allocated ? "Allocated" : "Not allocated"}
                              </span>
                            </div>
                            <p className="mt-1 text-[12px] text-white/70">{member.email || "No email stored"}</p>
                            <p className="mt-1 text-[12px] text-white/55">
                              {member.clinicalRole || "No clinical role"} · {member.primarySpecialty || "No specialty"}
                            </p>
                          </div>
                        )
                      })
                    )}
                  </div>
                </section>

                <section className="space-y-5">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#67CFCF]">Missing Comms users</p>
                    <div className="mt-3 space-y-2">
                      {wiringDiagnostic.missingCommsUsers.length === 0 ? (
                        <div className="rounded-[14px] border border-[#1f1f1f] bg-[#121212] px-4 py-3 text-[13px] text-emerald-300">
                          Every active membership has a matching `comms_v5_users` record.
                        </div>
                      ) : (
                        wiringDiagnostic.missingCommsUsers.map((member) => (
                          <div key={member.uid} className="rounded-[14px] border border-[#3a2513] bg-[#18110b] px-4 py-3 text-[13px] text-amber-200">
                            {member.displayName} · {member.uid}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#67CFCF]">Allocated names</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {wiringDiagnostic.allocatedNames.length === 0 ? (
                        <div className="rounded-[14px] border border-dashed border-white/10 bg-[#101010] px-4 py-3 text-[13px] text-white/60">
                          No staff are allocated in `theatre_sessions` for this date.
                        </div>
                      ) : (
                        wiringDiagnostic.allocatedNames.map((name, index) => (
                          <span key={`${name}-${index}`} className="rounded-full border border-[#1f1f1f] bg-[#121212] px-3 py-1.5 text-[12px] text-white">
                            {name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* ── Toast ── */}
        {activeModal?.kind === "toast" && (
          <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
            <div className="rounded-full border border-[#2a2a2a] bg-[#141414] px-5 py-3 text-[13px] font-semibold text-white shadow-2xl">
              {activeModal.message}
            </div>
          </div>
        )}
      </div>
    </WorkspaceDesktopShell>
  )
}

// ── Inline ping state ───────────────────────────────────────────────────────

function InlinePingState({ livePing }: { livePing: CommsPing | null }) {
  const pingLabel = livePing ? getPingStatusLabel(livePing) : null
  const pingTone =
    !livePing ? ""
    : pingLabel === "Done" ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
    : pingLabel === "Escalated" ? "border-rose-500/35 bg-rose-500/10 text-rose-300"
    : pingLabel === "On it" ? "border-sky-500/35 bg-sky-500/10 text-sky-300"
    : pingLabel === "Seen" ? "border-amber-500/35 bg-amber-500/10 text-amber-300"
    : "border-[#2b5d69] bg-[#0f2025] text-[#67CFCF]"

  return (
    livePing ? (
      <span
        className={`min-w-0 max-w-[120px] truncate rounded-full border px-2 py-1 text-[10px] font-semibold leading-none ${pingTone}`}
        title={`${pingLabel}: ${livePing.text}`}
      >
        {pingLabel}
      </span>
    ) : null
  )
}

function PingConfigPanel({
  pingRole,
  memberName,
  customPings,
  onClose,
  onSave,
}: {
  pingRole: PingRole
  memberName: string
  customPings: string[]
  onClose: () => void
  onSave: (next: string[]) => void
}) {
  const [draft, setDraft] = useState<string[]>(customPings)
  const [newPing, setNewPing] = useState("")

  return (
    <div className="absolute inset-0 z-30 flex">
      <button type="button" className="flex-1 bg-black/55" onClick={onClose} aria-label="Close ping config" />
      <div className="flex h-full w-[min(28rem,46%)] min-w-[22rem] max-w-full flex-col border-l border-white/10 bg-[#0a0a0a] shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/8 px-5 py-4">
          <div>
            <p className="text-[16px] font-semibold text-white">Ping shortcuts</p>
            <p className="mt-1 text-[12px] text-white/70">{pingRole} shortcuts for {memberName}</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/60 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#67CFCF]">Role defaults</p>
            <div className="mt-3 space-y-2">
              {DEFAULT_PING_SHORTCUTS[pingRole].map((ping) => (
                <div key={ping} className="rounded-[12px] border border-[#1f1f1f] bg-[#121212] px-3 py-2.5 text-[13px] text-white">
                  {ping}
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#67CFCF]">Custom pings</p>
              <button
                type="button"
                onClick={() => setDraft([])}
                className="text-[11px] font-semibold text-white/60 hover:text-white"
              >
                Clear all
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {draft.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-white/10 bg-[#101010] px-3 py-3 text-[12px] text-white/55">
                  No custom pings yet. Add role-specific shortcuts here. Full management can later live in Comms.
                </div>
              ) : (
                draft.map((ping, index) => (
                  <div key={`${ping}-${index}`} className="flex items-center gap-2 rounded-[12px] border border-[#1f1f1f] bg-[#121212] px-3 py-2.5">
                    <input
                      value={ping}
                      onChange={(e) => setDraft((prev) => prev.map((item, i) => i === index ? e.target.value : item))}
                      className="flex-1 bg-transparent text-[13px] text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setDraft((prev) => prev.filter((_, i) => i !== index))}
                      className="text-[11px] font-semibold text-[#f87171] hover:text-[#fb7185]"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#67CFCF]">Add new ping</p>
            <div className="mt-3 flex gap-2">
              <input
                value={newPing}
                onChange={(e) => setNewPing(e.target.value)}
                placeholder={`Add a ${pingRole.toLowerCase()} shortcut`}
                className="flex-1 rounded-[12px] border border-[#2a2a2a] bg-[#141414] px-4 py-3 text-[13px] text-white placeholder:text-white/35 outline-none focus:border-[#0096C7]/50"
              />
              <button
                type="button"
                disabled={!newPing.trim()}
                onClick={() => {
                  setDraft((prev) => [...prev, newPing.trim()])
                  setNewPing("")
                }}
                className="rounded-[12px] bg-[#0096C7] px-4 py-3 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                Add
              </button>
            </div>
          </section>
        </div>

        <div className="border-t border-white/8 px-5 py-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[12px] border border-[#2a2a2a] py-3 text-[13px] font-semibold text-white hover:bg-[#141414]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(draft.filter((item) => item.trim()))
                onClose()
              }}
              className="flex-1 rounded-[12px] bg-[#0096C7] py-3 text-[13px] font-semibold text-white hover:bg-[#0087b3]"
            >
              Save pings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
