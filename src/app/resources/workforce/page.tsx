"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRightLeft, ArrowUpDown, Clock3, MessageSquare, X } from "lucide-react"
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
  theatre: string
  x: number
  y: number
} | null

// ── Status colours (font-only — no bg tint) ────────────────────────────────

const STATUS_META: Record<StaffStatus, { name: string; sub: string }> = {
  "Scrub":      { name: "text-[#38bdf8]", sub: "text-[#7dd3fc]" },
  "Relieving":  { name: "text-[#34d399]", sub: "text-[#6ee7b7]" },
  "On Break":   { name: "text-[#fbbf24]", sub: "text-[#fcd34d]" },
  "Sick":       { name: "text-[#fb7185]", sub: "text-[#fda4af]" },
  "Dispatched": { name: "text-[#c084fc]", sub: "text-[#d8b4fe]" },
}

// ── Mock data ──────────────────────────────────────────────────────────────

function makeCard(n: number): TeamCard {
  const specialty = n % 5 === 0 ? "Neurosurgery" : n % 4 === 0 ? "General Surgery" : n % 3 === 0 ? "ENT" : "Trauma and Orthopaedics"
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
      { name: `${initials[n % 7]} ${surnames[(n + 1) % 7]}`, role: "Consultant Surgeon",              specialty,              status: "Scrub",        start: s, end: e },
      { name: `Dr ${surnames[n % 7]}`,                       role: "Consultant Anaesthetist",         specialty: "Anaesthetics",   status: "Scrub",        start: s, end: e },
      { name: `${initials[(n+2)%7]} ${surnames[(n+3)%7]}`,   role: "Scrub Practitioner",              specialty: "Theatre Support",status: pool[n % 5],    start: s, end: e },
      { name: `${initials[(n+4)%7]} ${surnames[(n+5)%7]}`,   role: "Circulating Nurse",               specialty: "Nursing",        status: pool[(n+2)%5],  start: "13:00", end: e },
      { name: `${initials[(n+6)%7]} ${surnames[(n+6)%7]}`,   role: "Operating Department Practitioner",specialty: "ODP",           status: pool[(n+4)%5],  start: "13:00", end: e },
    ],
  }
}

const TEAM_CARDS: TeamCard[] = [
  {
    theatre: "Theatre 1", theatreNum: 1, area: "Main Theatres",
    specialty: "Trauma and Orthopaedics", consultantSurgeon: "Mr Walker", consultantAnaesthetist: "Dr Bennett",
    sessionTime: "07:30 - 19:30",
    staff: [
      { name: "J Smith",   role: "Consultant Surgeon",              specialty: "Trauma and Orthopaedics", status: "Scrub",      start: "07:30", end: "19:30" },
      { name: "A Bennett", role: "Consultant Anaesthetist",         specialty: "Anaesthetics",            status: "Scrub",      start: "07:30", end: "19:30" },
      { name: "S Patel",   role: "Scrub Practitioner",              specialty: "Theatre Support",         status: "Scrub",      start: "07:30", end: "19:30" },
      { name: "L Brown",   role: "Circulating Nurse",               specialty: "Nursing",                 status: "On Break",   start: "07:30", end: "19:30" },
      { name: "M Johnson", role: "Operating Department Practitioner",specialty: "ODP",                   status: "Dispatched", start: "07:30", end: "19:30" },
      { name: "R Walker",  role: "Consultant Surgeon",              specialty: "Trauma and Orthopaedics", status: "Relieving",  start: "13:00", end: "19:30" },
      { name: "D Evans",   role: "Consultant Anaesthetist",         specialty: "Anaesthetics",            status: "Sick",       start: "13:00", end: "19:30" },
      { name: "K Lee",     role: "Scrub Practitioner",              specialty: "Theatre Support",         status: "Relieving",  start: "13:00", end: "19:30" },
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

function formatWeekDate(date: Date) {
  return { key: date.toISOString().slice(0, 10) }
}

function matchesFilter(card: TeamCard, mode: FilterMode, val: string) {
  if (val === "All") return true
  if (mode === "Area") return card.area === val
  if (mode === "Specialty") return card.specialty === val
  return card.consultantSurgeon === val
}

// ── Legend ─────────────────────────────────────────────────────────────────

function StatusLegend() {
  return (
    <div className="flex items-center gap-5">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-[#666666]">Key</span>
      {(Object.entries(STATUS_META) as [StaffStatus, typeof STATUS_META[StaffStatus]][]).map(([label, c]) => (
        <span key={label} className={`text-[12px] font-semibold ${c.name}`}>{label}</span>
      ))}
    </div>
  )
}

// ── Column header button ───────────────────────────────────────────────────

function ColHeader({
  label, colKey, sortKey, sortDir, onSort,
}: {
  label: string; colKey: SortKey; sortKey: SortKey | null; sortDir: "asc" | "desc"
  onSort: (k: SortKey) => void
}) {
  const active = sortKey === colKey
  return (
    <button
      type="button"
      onClick={() => onSort(colKey)}
      className={`flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors ${active ? "text-[#0096C7]" : "text-[#888888] hover:text-[#aaaaaa]"}`}
    >
      {label}
      <ArrowUpDown size={10} className={active ? "text-[#0096C7]" : "text-[#666666]"} />
    </button>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

const COLS = "grid-cols-[52px_minmax(0,1.5fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,0.85fr)_70px_70px_118px_116px]"

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

  const selectedDateObject = useMemo(() => new Date(`${selectedDateKey}T00:00:00`), [selectedDateKey])
  const monthDays = useMemo(
    () => buildMonthCalendar(selectedDateObject).filter((d) => d.inMonth),
    [selectedDateObject],
  )

  const filterOptions = useMemo(() => {
    const vals =
      filterMode === "Area" ? Array.from(new Set(TEAM_CARDS.map((c) => c.area)))
      : filterMode === "Specialty" ? Array.from(new Set(TEAM_CARDS.map((c) => c.specialty)))
      : Array.from(new Set(TEAM_CARDS.map((c) => c.consultantSurgeon)))
    return ["All", ...vals]
  }, [filterMode])

  const filteredCards = useMemo(
    () => TEAM_CARDS.filter((c) => matchesFilter(c, filterMode, selectedFilter)),
    [filterMode, selectedFilter],
  )

  // Flat sorted rows for when a sort is active
  type FlatRow = TeamMember & { theatreNum: number; theatre: string; area: string }
  const flatSortedRows = useMemo<FlatRow[]>(() => {
    if (!sortKey) return []
    const rows: FlatRow[] = filteredCards.flatMap((card) =>
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
  }, [filteredCards, sortKey, sortDir])

  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(min-width: 1024px)")
    const sync = () => { setIsDesktopViewport(mq.matches); if (!mq.matches) router.replace("/resources") }
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [router])

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

  function openContextMenu(e: React.MouseEvent, memberName: string, theatre: string) {
    e.preventDefault()
    setContextMenu({ memberName, theatre, x: e.clientX, y: e.clientY })
  }

  function openComms() { setContextMenu(null); router.push("/comms") }

  return (
    <WorkspaceDesktopShell currentNav="workforce">
      <div className="flex h-full min-h-0 flex-col px-4 py-4">
        <div className="flex min-h-0 flex-1 flex-col gap-3">

          {/* ── Top bar ── */}
          <section className="shrink-0 space-y-3">
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
                          <span className="text-[11px] uppercase leading-none text-white/50">{wday}</span>
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
            {/* Filter + legend bar */}
            <div className="shrink-0 border-b border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2.5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-medium text-[#888888]">Filter by</span>
                  <select
                    value={filterMode}
                    onChange={(e) => { setFilterMode(e.target.value as FilterMode); setSelectedFilter("All") }}
                    className="rounded-[8px] border border-[#2d2d2d] bg-[#111111] px-3 py-1.5 text-[13px] text-white outline-none"
                  >
                    <option value="Area">Area</option>
                    <option value="Specialty">Specialty</option>
                    <option value="Consultant">Consultant</option>
                  </select>
                  <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                    className="min-w-[180px] rounded-[8px] border border-[#2d2d2d] bg-[#111111] px-3 py-1.5 text-[13px] text-white outline-none"
                  >
                    {filterOptions.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                  {sortKey && (
                    <button
                      type="button"
                      onClick={() => setSortKey(null)}
                      className="flex items-center gap-1.5 rounded-[8px] border border-[#2d2d2d] bg-[#111111] px-2.5 py-1.5 text-[12px] text-[#888888] hover:text-white"
                    >
                      <X size={12} /> Clear sort
                    </button>
                  )}
                </div>
                <StatusLegend />
              </div>
            </div>

            {/* Sticky column header row */}
            <div className={`shrink-0 grid ${COLS} items-center gap-x-3 border-b border-[#1e1e1e] bg-[#0d0d0d] px-4 py-2.5`}>
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#888888]">T#</span>
              <ColHeader label="Staff Name"  colKey="name"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <ColHeader label="Role"        colKey="role"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <ColHeader label="Specialty"   colKey="specialty" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <ColHeader label="Area"        colKey="area"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <ColHeader label="Start"       colKey="start"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#888888]">End</span>
              <ColHeader label="Status"      colKey="status"    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#888888]">Actions</span>
            </div>

            {/* Scrollable rows */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {sortKey ? (
                // ── Flat sorted view ─────────────────────────────────────
                <>
                  {flatSortedRows.map((row, i) => {
                    const c = STATUS_META[row.status]
                    return (
                      <div
                        key={`${row.theatre}-${row.name}-${i}`}
                        onContextMenu={(e) => openContextMenu(e, row.name, row.theatre)}
                        className={`group grid ${COLS} cursor-context-menu items-center gap-x-3 border-b border-[#0f0f0f] bg-black px-4 py-2.5 transition-colors hover:bg-[#080808]`}
                      >
                        <span className={`font-mono text-[17px] font-black leading-none ${c.name}`}>
                          {String(row.theatreNum).padStart(2, "0")}
                        </span>
                        <span className={`truncate text-[13px] font-semibold ${c.name}`}>{row.name}</span>
                        <span className={`truncate text-[12px] ${c.sub}`}>{row.role}</span>
                        <span className={`truncate text-[12px] ${c.sub}`}>{row.specialty}</span>
                        <span className={`truncate text-[12px] ${c.sub}`}>{row.area}</span>
                        <span className={`text-[12px] tabular-nums ${c.sub}`}>{row.start}</span>
                        <span className={`text-[12px] tabular-nums ${c.sub}`}>{row.end}</span>
                        <span className={`text-[12px] font-semibold ${c.name}`}>{row.status}</span>
                        <ActionButtons memberName={row.name} theatre={row.theatre} onComms={openComms} onDismiss={() => {}} />
                      </div>
                    )
                  })}
                </>
              ) : (
                // ── Grouped by theatre ───────────────────────────────────
                <>
                  {filteredCards.map((card) => (
                    <div key={card.theatre}>
                      {/* Theatre section header */}
                      <div className="grid grid-cols-[52px_1fr_auto] items-center gap-x-3 border-b border-[#111111] bg-[#070707] px-4 py-2">
                        <span className="font-mono text-[20px] font-black leading-none text-[#00c8dc]">
                          {String(card.theatreNum).padStart(2, "0")}
                        </span>
                        <div className="flex items-baseline gap-3 min-w-0">
                          <span className="text-[14px] font-black text-white truncate">{card.theatre}</span>
                          <span className="text-[13px] text-[#00c8dc] truncate">{card.specialty}</span>
                          <span className="text-[12px] text-[#888888] truncate">{card.area} · {card.consultantSurgeon} · {card.consultantAnaesthetist}</span>
                        </div>
                        <span className="shrink-0 text-[12px] tabular-nums text-[#888888]">{card.sessionTime}</span>
                      </div>

                      {/* Staff rows */}
                      {card.staff.map((member) => {
                        const c = STATUS_META[member.status]
                        return (
                          <div
                            key={`${card.theatre}-${member.name}`}
                            onContextMenu={(e) => openContextMenu(e, member.name, card.theatre)}
                            className={`group grid ${COLS} cursor-context-menu items-center gap-x-3 border-b border-[#0a0a0a] bg-black px-4 py-2.5 transition-colors hover:bg-[#080808]`}
                          >
                            <span className={`font-mono text-[17px] font-black leading-none ${c.name}`}>
                              {String(card.theatreNum).padStart(2, "0")}
                            </span>
                            <span className={`truncate text-[13px] font-semibold ${c.name}`}>{member.name}</span>
                            <span className={`truncate text-[12px] ${c.sub}`}>{member.role}</span>
                            <span className={`truncate text-[12px] ${c.sub}`}>{member.specialty}</span>
                            <span className={`truncate text-[12px] ${c.sub}`}>{card.area}</span>
                            <span className={`text-[12px] tabular-nums ${c.sub}`}>{member.start}</span>
                            <span className={`text-[12px] tabular-nums ${c.sub}`}>{member.end}</span>
                            <span className={`text-[12px] font-semibold ${c.name}`}>{member.status}</span>
                            <ActionButtons memberName={member.name} theatre={card.theatre} onComms={openComms} onDismiss={() => {}} />
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </>
              )}
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
              className="absolute min-w-[230px] rounded-[16px] border border-[#1e1e1e] bg-[#0f0f0f] p-2 shadow-[0_24px_56px_rgba(0,0,0,0.7)]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 border-b border-[#1a1a1a] px-3 pb-2.5 pt-1.5">
                <p className="text-[14px] font-semibold text-white">{contextMenu.memberName}</p>
                <p className="text-[12px] text-[#888888]">{contextMenu.theatre}</p>
              </div>
              <button type="button" onClick={openComms}
                className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors hover:bg-[#141414]">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0096C7]/15">
                  <MessageSquare size={13} className="text-[#38bdf8]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">Open Comms</p>
                  <p className="text-[11px] text-[#888888]">Message via PrepSight Comms</p>
                </div>
              </button>
              <button type="button" onClick={() => setContextMenu(null)}
                className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors hover:bg-[#141414]">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#34d399]/15">
                  <ArrowRightLeft size={13} className="text-[#34d399]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">Offer Swap</p>
                  <p className="text-[11px] text-[#888888]">Propose a shift or slot swap</p>
                </div>
              </button>
              <button type="button" onClick={() => setContextMenu(null)}
                className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors hover:bg-[#141414]">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fbbf24]/15">
                  <Clock3 size={13} className="text-[#fbbf24]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">Send for Break</p>
                  <p className="text-[11px] text-[#888888]">Mark as on break and notify team</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </WorkspaceDesktopShell>
  )
}

// ── Inline action buttons (shown on row hover) ─────────────────────────────

function ActionButtons({ memberName, theatre, onComms, onDismiss }: {
  memberName: string; theatre: string; onComms: () => void; onDismiss: () => void
}) {
  return (
    <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
      <button
        type="button"
        title={`Message ${memberName}`}
        onClick={(e) => { e.stopPropagation(); onComms() }}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0096C7]/10 text-[#38bdf8] transition-colors hover:bg-[#0096C7]/20"
      >
        <MessageSquare size={13} />
      </button>
      <button
        type="button"
        title="Offer swap"
        onClick={(e) => e.stopPropagation()}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-[#34d399]/10 text-[#34d399] transition-colors hover:bg-[#34d399]/20"
      >
        <ArrowRightLeft size={13} />
      </button>
      <button
        type="button"
        title="Send for break"
        onClick={(e) => e.stopPropagation()}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fbbf24]/10 text-[#fbbf24] transition-colors hover:bg-[#fbbf24]/20"
      >
        <Clock3 size={13} />
      </button>
    </div>
  )
}
