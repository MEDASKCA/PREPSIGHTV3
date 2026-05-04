"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import TriangleIcon from "@/components/TriangleIcon"
import WorkforceSectionNav from "@/components/WorkforceSectionNav"
import WorkspaceDesktopShell from "@/components/WorkspaceDesktopShell"

type TeamMember = {
  name: string
  role: string
  shiftTime: string
}

type FilterMode = "Area" | "Specialty" | "Consultant"

type AllocationTemplate = {
  rowKey: string
  shiftTime: string
  area: string
  specialty: string
  assignment: string
  consultant: string
  contact: string
  phone: string
  team: TeamMember[]
}

type TeamCard = {
  theatre: string
  area: string
  specialty: string
  consultant: string
  consultantSurgeon: string
  consultantAnaesthetist: string
  sessionTime: string
  staff: TeamMember[]
}

type TeamContextMenuState = {
  memberName: string
  x: number
  y: number
} | null

const allocationTemplates: AllocationTemplate[] = [
  {
    rowKey: "theatre-1",
    shiftTime: "07:30 - 18:00",
    area: "Main Theatres",
    specialty: "Trauma and Orthopaedics",
    assignment: "Theatre 1",
    consultant: "Mr Walker",
    contact: "Specialty Manager",
    phone: "020 7794 0500",
    team: [
      { name: "Skye Porter", role: "Senior Scrub Practitioner", shiftTime: "07:30 - 18:00" },
      { name: "Arjun Mehta", role: "Operating Department Practitioner", shiftTime: "08:00 - 20:00" },
      { name: "Lisa Warren", role: "Specialty Manager", shiftTime: "07:30 - 16:00" },
    ],
  },
  {
    rowKey: "theatre-2",
    shiftTime: "08:00 - 16:30",
    area: "DSU",
    specialty: "General Surgery",
    assignment: "Theatre 2",
    consultant: "Mr Shah",
    contact: "Duty Coordinator",
    phone: "020 7794 0555",
    team: [
      { name: "Daniel Shah", role: "Recovery Practitioner", shiftTime: "08:00 - 16:30" },
      { name: "Maya Lewis", role: "Circulating Nurse", shiftTime: "10:00 - 18:00" },
      { name: "Tom Barrett", role: "Duty Coordinator", shiftTime: "08:00 - 17:00" },
    ],
  },
  {
    rowKey: "theatre-3",
    shiftTime: "09:00 - 17:30",
    area: "Day Surgery",
    specialty: "Neurosurgery",
    assignment: "Theatre 3",
    consultant: "Ms Clarke",
    contact: "Specialty Manager",
    phone: "020 7794 0441",
    team: [
      { name: "Nina Clarke", role: "Neurosurgery Scrub Nurse", shiftTime: "09:00 - 17:30" },
      { name: "Cali James", role: "Theatre Coordinator", shiftTime: "09:00 - 18:00" },
      { name: "Imran Qureshi", role: "Anaesthetic Practitioner", shiftTime: "08:30 - 17:00" },
    ],
  },
]

const MOCK_TEAM_CARDS: TeamCard[] = Array.from({ length: 30 }, (_, index) => {
  const theatreNumber = index + 1
  const area = theatreNumber % 3 === 0 ? "Day Surgery" : theatreNumber % 2 === 0 ? "DSU" : "Main Theatres"
  const specialty =
    theatreNumber % 5 === 0
      ? "Neurosurgery"
      : theatreNumber % 4 === 0
        ? "General Surgery"
        : theatreNumber % 3 === 0
          ? "ENT"
          : "Trauma and Orthopaedics"
  const consultant =
    specialty === "Neurosurgery"
      ? "Ms Clarke"
      : specialty === "General Surgery"
        ? "Mr Shah"
        : specialty === "ENT"
          ? "Mr Patel"
          : "Mr Walker"
  const sessionTime =
    theatreNumber % 4 === 0
      ? "10:00 - 22:00"
      : theatreNumber % 3 === 0
        ? "09:00 - 21:00"
        : theatreNumber % 2 === 0
          ? "08:00 - 20:00"
          : "07:30 - 19:30"

  return {
    theatre: `Theatre ${theatreNumber}`,
    area,
    specialty,
    consultant,
    consultantSurgeon: consultant,
    consultantAnaesthetist:
      specialty === "Neurosurgery"
        ? "Dr Ahmed"
        : specialty === "General Surgery"
          ? "Dr Collins"
          : specialty === "ENT"
            ? "Dr Farah"
            : "Dr Bennett",
    sessionTime,
    staff: [
      {
        name: theatreNumber === 1 ? "Skye and Cali" : `Staff ${theatreNumber}A`,
        role: specialty === "Trauma and Orthopaedics" ? "Scrub Practitioner" : "Senior Scrub Nurse",
        shiftTime: sessionTime,
      },
      {
        name: `Staff ${theatreNumber}B`,
        role: "Circulating Nurse",
        shiftTime: theatreNumber % 2 === 0 ? "08:00 - 16:00" : "12:00 - 20:00",
      },
      {
        name: `Staff ${theatreNumber}C`,
        role: theatreNumber % 2 === 0 ? "Specialty Manager" : "Operating Department Practitioner",
        shiftTime: theatreNumber % 5 === 0 ? "07:30 - 15:30" : "10:00 - 18:00",
      },
    ],
  }
})

function startOfWeek(date: Date) {
  const next = new Date(date)
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + diff)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function endOfWeek(date: Date) {
  return addDays(startOfWeek(date), 6)
}

function buildMonthCalendar(date: Date) {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)
  const days: Array<{
    key: string
    date: Date
    day: string
    inMonth: boolean
    isToday: boolean
  }> = []

  for (let cursor = new Date(gridStart); cursor <= gridEnd; cursor = addDays(cursor, 1)) {
    days.push({
      key: cursor.toISOString().slice(0, 10),
      date: new Date(cursor),
      day: cursor.toLocaleDateString("en-GB", { day: "2-digit" }),
      inMonth: cursor.getMonth() === date.getMonth(),
      isToday: cursor.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10),
    })
  }

  return days
}

function formatWeekDate(date: Date) {
  return {
    key: date.toISOString().slice(0, 10),
    label: date.toLocaleDateString("en-GB", { weekday: "short" }),
    day: date.toLocaleDateString("en-GB", { day: "2-digit" }),
    month: date.toLocaleDateString("en-GB", { month: "short" }),
  }
}

function getFinancialYearStart(date: Date) {
  const year = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1
  return new Date(year, 3, 1)
}

function getFinancialWeekNumber(weekStart: Date) {
  const fyStartWeek = startOfWeek(getFinancialYearStart(weekStart))
  const diffMs = weekStart.getTime() - fyStartWeek.getTime()
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1
}

type CoordinatorRow = {
  area: string
  specialty: string
  consultant: string
  contact: string
  assignments: number
}

type AllocationRow = AllocationTemplate
type AllocationSortKey = "area" | "specialty" | "consultant" | "contact" | "assignments"

function buildAllocationRows(dateKey: string): AllocationRow[] {
  const date = new Date(`${dateKey}T00:00:00`)
  const dayIndex = date.getDay()

  if (dayIndex === 0) {
    return [
      {
        rowKey: "standby",
        shiftTime: "ON CALL",
        area: "Main Theatres",
        specialty: "Weekend Cover",
        assignment: "Standby",
        consultant: "Duty Cover",
        contact: "Duty Coordinator",
        phone: "020 7794 0000",
        team: [
          { name: "Reserve Cover", role: "Escalation Reserve", shiftTime: "07:30 - 19:30" },
          { name: "Duty Coordinator", role: "Duty Coordinator", shiftTime: "08:00 - 20:00" },
        ],
      },
    ]
  }

  return allocationTemplates.slice(0, dayIndex >= 5 ? 2 : 3)
}

function matchesFilter(
  item: { area: string; specialty: string; consultant: string },
  filterMode: FilterMode,
  selectedFilter: string,
) {
  if (selectedFilter === "All") return true
  if (filterMode === "Area") return item.area === selectedFilter
  if (filterMode === "Specialty") return item.specialty === selectedFilter
  return item.consultant === selectedFilter
}

export default function WorkforcePage() {
  const router = useRouter()
  const [weekOffset, setWeekOffset] = useState(0)
  const [sortKey, setSortKey] = useState<AllocationSortKey>("area")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [filterMode, setFilterMode] = useState<FilterMode>("Area")
  const [selectedFilter, setSelectedFilter] = useState("All")
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatWeekDate(new Date()).key)
  const [enteredDate, setEnteredDate] = useState("")
  const [monthInput, setMonthInput] = useState(() =>
    new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
  )
  const [teamContextMenu, setTeamContextMenu] = useState<TeamContextMenuState>(null)

  const currentWeekStart = useMemo(() => startOfWeek(new Date()), [])
  const activeWeekStart = useMemo(() => addDays(currentWeekStart, weekOffset * 7), [currentWeekStart, weekOffset])
  const activeWeekDates = useMemo(
    () => Array.from({ length: 28 }, (_, index) => formatWeekDate(addDays(activeWeekStart, index))),
    [activeWeekStart],
  )
  const activeWeekLabel = useMemo(() => {
    const first = getFinancialWeekNumber(activeWeekStart)
    const last = getFinancialWeekNumber(addDays(activeWeekStart, 21))
    return first === last ? `Week ${first}` : `Weeks ${first} - ${last}`
  }, [activeWeekStart])
  const selectedDateObject = useMemo(() => new Date(`${selectedDateKey}T00:00:00`), [selectedDateKey])
  const selectedDate = useMemo(
    () => activeWeekDates.find((option) => option.key === selectedDateKey) ?? activeWeekDates[0],
    [activeWeekDates, selectedDateKey],
  )
  const monthPickerDays = useMemo(() => buildMonthCalendar(selectedDateObject), [selectedDateObject])
  const monthDays = useMemo(() => monthPickerDays.filter((day) => day.inMonth), [monthPickerDays])
  const monthPickerLabel = useMemo(
    () => selectedDateObject.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    [selectedDateObject],
  )
  const isCurrentDaySelected = useMemo(() => selectedDateKey === formatWeekDate(new Date()).key, [selectedDateKey])
  const allocationRows = useMemo(() => buildAllocationRows(selectedDateKey), [selectedDateKey])
  const filterOptions = useMemo(() => {
    const values =
      filterMode === "Area"
        ? Array.from(new Set(MOCK_TEAM_CARDS.map((card) => card.area)))
        : filterMode === "Specialty"
          ? Array.from(new Set(MOCK_TEAM_CARDS.map((card) => card.specialty)))
          : Array.from(new Set(MOCK_TEAM_CARDS.map((card) => card.consultant)))
    return ["All", ...values]
  }, [filterMode])
  const filteredTeamCards = useMemo(
    () => MOCK_TEAM_CARDS.filter((card) => matchesFilter(card, filterMode, selectedFilter)),
    [filterMode, selectedFilter],
  )
  const coordinatorRows = useMemo<CoordinatorRow[]>(() => {
    if (new Date(`${selectedDateKey}T00:00:00`).getDay() === 0) {
      return [
        {
          area: "Main Theatres",
          specialty: "Weekend Cover",
          consultant: "Duty Cover",
          contact: "Duty Coordinator",
          assignments: 1,
        },
      ]
    }

    return [
      {
        area: "Main Theatres",
        specialty: "Trauma and Orthopaedics",
        consultant: "Mr Walker",
        contact: "Duty Coordinator",
        assignments: MOCK_TEAM_CARDS.filter((card) => card.area === "Main Theatres").length,
      },
      {
        area: "DSU",
        specialty: "General Surgery",
        consultant: "Mr Shah",
        contact: "Duty Coordinator",
        assignments: MOCK_TEAM_CARDS.filter((card) => card.area === "DSU").length,
      },
      {
        area: "Day Surgery",
        specialty: "Neurosurgery",
        consultant: "Ms Clarke",
        contact: "Specialty Manager",
        assignments: MOCK_TEAM_CARDS.filter((card) => card.area === "Day Surgery").length,
      },
    ]
  }, [selectedDateKey])
  const sortedCoordinatorRows = useMemo(() => {
    const rows = coordinatorRows.filter((row) => matchesFilter(row, filterMode, selectedFilter))
    rows.sort((left, right) => {
      const comparison = String(left[sortKey]).localeCompare(String(right[sortKey]), undefined, {
        numeric: true,
        sensitivity: "base",
      })
      return sortDirection === "asc" ? comparison : -comparison
    })
    return rows
  }, [coordinatorRows, filterMode, selectedFilter, sortDirection, sortKey])

  function toggleSort(nextKey: AllocationSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(nextKey)
    setSortDirection("asc")
  }

  function moveWeek(direction: -1 | 1) {
    const nextWeekStart = addDays(activeWeekStart, direction * 28)
    setWeekOffset((current) => current + direction * 4)
    setSelectedDateKey(formatWeekDate(nextWeekStart).key)
  }

  function handleEnteredDateChange(value: string) {
    setEnteredDate(value)
    if (!value) return
    const nextDate = new Date(`${value}T00:00:00`)
    jumpToDate(nextDate)
  }

  function handleFilterModeChange(value: FilterMode) {
    setFilterMode(value)
    setSelectedFilter("All")
  }

  function openCommsAction() {
    setTeamContextMenu(null)
    router.push("/comms")
  }

  function openTeamContextMenu(event: React.MouseEvent<HTMLDivElement>, memberName: string) {
    event.preventDefault()
    setTeamContextMenu({
      memberName,
      x: event.clientX,
      y: event.clientY,
    })
  }

  function jumpToDate(nextDate: Date) {
    const nextWeekStart = startOfWeek(nextDate)
    const diffWeeks = Math.round((nextWeekStart.getTime() - currentWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
    setWeekOffset(diffWeeks)
    setSelectedDateKey(formatWeekDate(nextDate).key)
    setEnteredDate(nextDate.toISOString().slice(0, 10))
    setMonthInput(nextDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" }))
  }

  function moveMonth(direction: -1 | 1) {
    const base = new Date(selectedDateObject.getFullYear(), selectedDateObject.getMonth() + direction, 1)
    jumpToDate(base)
  }

  function commitMonthInput() {
    const parsed = new Date(`1 ${monthInput}`)
    if (Number.isNaN(parsed.getTime())) {
      setMonthInput(monthPickerLabel)
      return
    }
    jumpToDate(parsed)
  }

  return (
    <WorkspaceDesktopShell currentNav="workforce">
      <div className="flex h-full min-h-0 flex-col px-2 py-2 lg:px-4 lg:py-4">
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <section className="shrink-0 space-y-3">
            <div className="space-y-4">
              <h1 className="hidden text-[22px] font-medium tracking-[-0.03em] text-white lg:block">Workforce</h1>
              <WorkforceSectionNav current="overview" />
            </div>

            <div className="border-b border-[#2d2d2d] pb-1">
              <div className="px-1 py-1.5">
                <div className="flex items-center justify-center gap-3">
                  <button type="button" onClick={() => moveMonth(-1)} className="text-[#67CFCF]">
                    <TriangleIcon direction="left" size={12} />
                  </button>
                  <input
                    value={monthInput}
                    onChange={(event) => setMonthInput(event.target.value)}
                    onBlur={commitMonthInput}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        commitMonthInput()
                      }
                    }}
                    aria-label="Edit month and year"
                    title="Edit month and year"
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
                      const weekdayLabel = day.date.toLocaleDateString("en-GB", { weekday: "short" })
                        .replace("Tue", "T")
                        .replace("Wed", "W")
                        .replace("Thu", "TH")
                        .replace("Mon", "M")
                        .replace("Fri", "F")
                        .replace("Sat", "Sa")
                        .replace("Sun", "Sun")
                      return (
                        <div key={day.key} className="flex w-[30px] shrink-0 flex-col items-center gap-1.5">
                          <span className="text-[11px] uppercase leading-none text-white">{weekdayLabel}</span>
                          <button
                            type="button"
                            onClick={() => jumpToDate(day.date)}
                            className={`w-full rounded-[12px] px-0.5 py-3 text-center text-[14px] leading-none transition-all ${
                              active
                                ? "scale-[1.3] bg-[#0096C7] font-semibold text-white shadow-[0_14px_30px_rgba(0,150,199,0.42)] ring-1 ring-white/10"
                                : "bg-[#67CFCF] text-[#0F2D38] hover:bg-[#56c4cf]"
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

          <section className="flex min-h-0 flex-1 flex-col bg-black">
            <div className="shrink-0 border-b border-[#2d2d2d] pb-2">
              <div className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-5">
                  <h2 className="text-[22px] tracking-[-0.04em] text-white">Team</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] text-[#b7b7b7]">Filter by</span>
                    <select
                      value={filterMode}
                      onChange={(event) => handleFilterModeChange(event.target.value as FilterMode)}
                      className="rounded-[12px] border border-[#2d2d2d] bg-[#181818] px-3 py-2 text-[13px] text-white outline-none"
                    >
                      <option value="Area">Area</option>
                      <option value="Specialty">Specialty</option>
                      <option value="Consultant">Consultant</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[13px] text-[#b7b7b7]">{filterMode}</span>
                  <select
                    value={selectedFilter}
                    onChange={(event) => setSelectedFilter(event.target.value)}
                    className="min-w-[180px] rounded-[12px] border border-[#2d2d2d] bg-[#181818] px-3 py-2 text-[13px] text-white outline-none"
                  >
                    {filterOptions.map((filter) => (
                      <option key={filter} value={filter}>
                        {filter}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid gap-3 pb-2 xl:grid-cols-4 lg:grid-cols-3 sm:grid-cols-2">
                {filteredTeamCards.map((card) => (
                <div
                  key={card.theatre}
                  className="rounded-[12px] border border-[#2d2d2d] bg-[#111111] px-3.5 py-2.5"
                >
                  <div className="border-b border-[#252525] pb-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[16px] leading-[1.2] text-white">{card.theatre}</p>
                        <p className="mt-0.5 text-[13px] leading-[1.25] text-[#d2d2d2]">{card.specialty}</p>
                      </div>
                      <p className="shrink-0 pt-0.5 text-[12px] leading-none text-[#67CFCF]">{card.sessionTime}</p>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-[1.25] text-[#8f8f8f]">
                      {card.area} · {card.consultant}
                    </p>
                    <div className="mt-1.5 space-y-0.5 text-[11px] leading-[1.25] text-[#c8c8c8]">
                      <p>
                        <span className="text-[#7f7f7f]">Consultant Surgeon</span>
                        {" "}
                        {card.consultantSurgeon}
                      </p>
                      <p>
                        <span className="text-[#7f7f7f]">Consultant Anaesthetist</span>
                        {" "}
                        {card.consultantAnaesthetist}
                      </p>
                    </div>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    {card.staff.map((member) => (
                      <div
                        key={`${card.theatre}-${member.name}`}
                        onContextMenu={(event) => openTeamContextMenu(event, member.name)}
                        className="cursor-context-menu rounded-[8px] px-1 py-1 text-left transition-colors hover:bg-[#151515]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[13px] leading-[1.2] text-white">{member.name}</p>
                            <p className="mt-0.5 text-[12px] leading-[1.2] text-[#8f8f8f]">{member.role}</p>
                          </div>
                          <p className="shrink-0 pt-0.5 text-[11px] leading-none text-[#b7b7b7]">{member.shiftTime}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                ))}
              </div>
            </div>
          </section>
        </div>
        {teamContextMenu ? (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setTeamContextMenu(null)}
            onContextMenu={(event) => {
              event.preventDefault()
              setTeamContextMenu(null)
            }}
          >
            <div
              className="absolute min-w-[180px] rounded-[12px] border border-[#2d2d2d] bg-[#111111] p-1 shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
              style={{ left: teamContextMenu.x, top: teamContextMenu.y }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-[#232323] px-3 py-2 text-[11px] text-[#8f8f8f]">
                {teamContextMenu.memberName}
              </div>
              <button
                type="button"
                onClick={openCommsAction}
                className="flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left text-[12px] text-white transition-colors hover:bg-[#1a1a1a]"
              >
                <span>Message - Comms</span>
              </button>
              <button
                type="button"
                onClick={openCommsAction}
                className="flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left text-[12px] text-white transition-colors hover:bg-[#1a1a1a]"
              >
                <span>Offer swap</span>
              </button>
              {isCurrentDaySelected ? (
                <button
                  type="button"
                  onClick={openCommsAction}
                  className="flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left text-[12px] text-white transition-colors hover:bg-[#1a1a1a]"
                >
                  <span>Send for break</span>
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </WorkspaceDesktopShell>
  )
}
