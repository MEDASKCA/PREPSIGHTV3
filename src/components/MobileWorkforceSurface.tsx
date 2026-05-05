"use client"

import dynamic from "next/dynamic"
import type { ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRightLeft,
  CalendarClock,
  Clock3,
  MoreVertical,
  Phone,
  Search,
  X,
} from "lucide-react"
import MobileSurfaceHeader from "@/components/MobileSurfaceHeader"
import TriangleIcon from "@/components/TriangleIcon"
import { getProfile, getRelevantSettings } from "@/lib/profile"
import type { WorkforceHospitalPin } from "@/components/WorkforceShiftMap"

const MobileWorkforceShiftMap = dynamic(() => import("@/components/WorkforceShiftMap"), { ssr: false })

// ── Accordion ──────────────────────────────────────────────────────────────

function MobileAccordionSection({
  label,
  summary,
  open,
  onToggle,
  children,
}: {
  label: string
  summary: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 bg-[#003d54] px-4 py-3 text-left transition-colors hover:bg-[#004a66]"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-6 text-[#e0e0e0]">{label}</span>
          <span className="mt-0.5 block text-[12px] leading-5 text-[#aaaaaa]">{summary}</span>
        </span>
        <TriangleIcon direction={open ? "up" : "down"} size={12} className="shrink-0 text-[#0096C7]" />
      </button>
      {open ? <div className="border-t border-[#1e1e1e] bg-black">{children}</div> : null}
    </section>
  )
}

// ── Labeled select ─────────────────────────────────────────────────────────

function MobileLabeledSelect<T extends string>({
  label,
  items,
  value,
  onChange,
}: {
  label: string
  items: Array<{ key: T; label: string }>
  value: T
  onChange: (key: T) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2">
      <span className="shrink-0 text-[13px] text-[#888888]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="appearance-none rounded-full border border-[#2d2d2d] bg-[#111111] px-4 py-2 text-sm text-[#e0e0e0] outline-none"
      >
        {items.map((item) => (
          <option key={item.key} value={item.key}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// ── Data ───────────────────────────────────────────────────────────────────

const ROTA_ITEMS = [
  { day: "Today", time: "07:30 - 18:00", area: "Theatre 1", specialty: "Trauma and orthopaedics", detail: "Primary knee replacement list • scrub cover", contact: "Lisa Warren", phone: "020 7794 0500" },
  { day: "Tomorrow", time: "08:00 - 16:30", area: "Recovery", specialty: "General surgery", detail: "Late list support and handover cover", contact: "Daniel Shah", phone: "020 7794 0555" },
]

const ROTA_ACTIONS = [
  { title: "Offer a shift swap", description: "Swap an assigned rota slot with another substantive member.", icon: ArrowRightLeft },
  { title: "Request leave", description: "Submit leave against the rota and staffing view.", icon: CalendarClock },
  { title: "Update availability", description: "Tell the rota team when you cannot be allocated.", icon: Clock3 },
]

const SHIFT_HOSPITALS = [
  {
    id: "royal-free-hospital",
    type: "Internal" as const,
    hospital: "Royal Free Hospital",
    distanceMiles: 2.5,
    contactNumber: "020 7794 0500",
    position: [51.5539, -0.1644] as [number, number],
    strongestFit: "strong fit" as const,
    shifts: [
      { title: "Saturday trauma list", state: "Booked", contact: "Approved by Lisa Warren", phone: "020 7794 0500" },
      { title: "Late recovery support", state: "Shift offer", contact: "Offered by Nina Clarke", phone: "020 7794 0555" },
    ],
  },
  {
    id: "barnet-hospital",
    type: "External" as const,
    hospital: "Barnet Hospital",
    distanceMiles: 8.1,
    contactNumber: "020 8216 4600",
    position: [51.6507, -0.2002] as [number, number],
    strongestFit: "good fit" as const,
    shifts: [
      { title: "Endoscopy support", state: "Awaiting confirmation", contact: "Pending with Daniel Shah", phone: "020 8216 4600" },
    ],
  },
  {
    id: "uch-hospital",
    type: "External" as const,
    hospital: "University College Hospital",
    distanceMiles: 5.6,
    contactNumber: "020 3456 7890",
    position: [51.5246, -0.134] as [number, number],
    strongestFit: "developing fit" as const,
    shifts: [
      { title: "Orthopaedic late cover", state: "Requested", contact: "Requested to rota team", phone: "020 3456 7890" },
    ],
  },
  {
    id: "whittington-hospital",
    type: "External" as const,
    hospital: "Whittington Hospital",
    distanceMiles: 4.2,
    contactNumber: "020 7272 3070",
    position: [51.5686, -0.1361] as [number, number],
    strongestFit: "none" as const,
    shifts: [],
  },
]

const SHIFT_STATUSES = [
  { state: "Booked", hospital: "Royal Free Hospital", shift: "Saturday trauma list • 08:00 - 14:00", contact: "Approved by Lisa Warren", phone: "020 7794 0500" },
  { state: "Shift offer", hospital: "Royal Free Hospital", shift: "Late recovery support • 18:00 - 22:00", contact: "Offered by Nina Clarke", phone: "020 7794 0555" },
  { state: "Awaiting confirmation", hospital: "St George's Hospital", shift: "Anaesthetics cover • 19:00 - 07:00", contact: "Waiting on Michael Reed", phone: "020 7794 0840" },
  { state: "Shift offer", hospital: "Royal Free Hospital", shift: "Weekend list support • 08:00 - 14:00", contact: "Offered by Priya Patel", phone: "020 7794 0991" },
]

const SKILLS = [
  { title: "Trauma and orthopaedics", level: "Signed off", detail: "Eligible for matched bank shifts" },
  { title: "General surgery", level: "Current", detail: "Can be booked into routine list support" },
  { title: "Vascular", level: "Supervised", detail: "Visible but requires allocation review" },
]

const TASKS = [
  { title: "Acknowledge airway card update", meta: "Requested by theatre education lead • due today" },
  { title: "Confirm weekend availability", meta: "Needed for rota planning • due 18:00" },
  { title: "Review bank shift offer", meta: "Royal London Hospital • expires tomorrow" },
]

// ── Panels ─────────────────────────────────────────────────────────────────

type AllocationFilterMode = "Area" | "Specialty" | "Consultant"

type AllocationCard = {
  theatre: string
  area: string
  specialty: string
  consultant: string
  consultantSurgeon: string
  consultantAnaesthetist: string
  sessionTime: string
  staff: Array<{ name: string; role: string; shiftTime: string }>
}

const MOBILE_ALLOCATION_CARDS: AllocationCard[] = Array.from({ length: 12 }, (_, index) => {
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
  const days: Array<{ key: string; date: Date; day: string; inMonth: boolean }> = []

  for (let cursor = new Date(gridStart); cursor <= gridEnd; cursor = addDays(cursor, 1)) {
    days.push({
      key: cursor.toISOString().slice(0, 10),
      date: new Date(cursor),
      day: cursor.toLocaleDateString("en-GB", { day: "2-digit" }),
      inMonth: cursor.getMonth() === date.getMonth(),
    })
  }

  return days
}

function matchesAllocationFilter(card: AllocationCard, filterMode: AllocationFilterMode, selectedFilter: string) {
  if (selectedFilter === "All") return true
  if (filterMode === "Area") return card.area === selectedFilter
  if (filterMode === "Specialty") return card.specialty === selectedFilter
  return card.consultant === selectedFilter
}

function MobileMonthCalendarBlock({ leadingControl }: { leadingControl?: ReactNode } = {}) {
  const [selectedDate, setSelectedDate] = useState(() => new Date("2026-02-01T00:00:00"))
  const [monthInput, setMonthInput] = useState("Feb 2026")
  const monthDays = useMemo(() => buildMonthCalendar(selectedDate).filter((day) => day.inMonth), [selectedDate])
  const selectedDateKey = selectedDate.toISOString().slice(0, 10)

  function formatMonthLabel(date: Date) {
    return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
  }

  function jumpToDate(nextDate: Date) {
    setSelectedDate(nextDate)
    setMonthInput(formatMonthLabel(nextDate))
  }

  function moveMonth(direction: -1 | 1) {
    jumpToDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + direction, 1))
  }

  function commitMonthInput() {
    const parsed = new Date(`1 ${monthInput}`)
    if (Number.isNaN(parsed.getTime())) {
      setMonthInput(formatMonthLabel(selectedDate))
      return
    }
    jumpToDate(parsed)
  }

  return (
    <div className="border-b border-black px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="w-[126px] shrink-0">{leadingControl ?? <div />}</div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
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
            className="w-[116px] min-w-0 rounded-[10px] border border-white/10 bg-[#151515] px-2 py-1.5 text-center text-[13px] text-white outline-none"
          />
          <button type="button" onClick={() => moveMonth(1)} className="text-[#67CFCF]">
            <TriangleIcon direction="right" size={12} />
          </button>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto pb-1">
        <div className="flex min-w-max items-start gap-2 px-1 py-1">
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
              <div key={day.key} className="flex w-[28px] shrink-0 flex-col items-center gap-1.5">
                <span className="text-[10px] uppercase leading-none text-white">{weekdayLabel}</span>
                <button
                  type="button"
                  onClick={() => jumpToDate(day.date)}
                  className={`w-full rounded-[11px] px-0.5 py-2.5 text-center text-[13px] leading-none transition-all ${
                    active
                      ? "scale-[1.2] bg-[#0096C7] font-semibold text-white shadow-[0_10px_24px_rgba(0,150,199,0.38)]"
                      : "bg-[#67CFCF] text-[#0F2D38]"
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
  )
}

function RotaPanel() {
  const router = useRouter()
  const [filterMode, setFilterMode] = useState<AllocationFilterMode>("Area")
  const [selectedFilter, setSelectedFilter] = useState("All")
  const [expandedCard, setExpandedCard] = useState<string | null>("Theatre 1")
  const [teamActionMember, setTeamActionMember] = useState<{ theatre: string; memberName: string } | null>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const filterOptions = useMemo(() => {
    const values =
      filterMode === "Area"
        ? Array.from(new Set(MOBILE_ALLOCATION_CARDS.map((card) => card.area)))
        : filterMode === "Specialty"
          ? Array.from(new Set(MOBILE_ALLOCATION_CARDS.map((card) => card.specialty)))
          : Array.from(new Set(MOBILE_ALLOCATION_CARDS.map((card) => card.consultant)))
    return ["All", ...values]
  }, [filterMode])
  const filteredCards = useMemo(
    () => MOBILE_ALLOCATION_CARDS.filter((card) => matchesAllocationFilter(card, filterMode, selectedFilter)),
    [filterMode, selectedFilter],
  )

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [])

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  function startLongPress(theatre: string, memberName: string) {
    clearLongPressTimer()
    longPressTimerRef.current = setTimeout(() => {
      setTeamActionMember({ theatre, memberName })
      longPressTimerRef.current = null
    }, 420)
  }

  function openCommsAction() {
    setTeamActionMember(null)
    router.push("/comms")
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-black px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[19px] text-white">Team</h2>
          <select
            value={filterMode}
            onChange={(event) => {
              setFilterMode(event.target.value as AllocationFilterMode)
              setSelectedFilter("All")
            }}
            className="w-[124px] shrink-0 rounded-[12px] border border-[#2d2d2d] bg-[#181818] px-3 py-2 text-[13px] text-white outline-none"
          >
            <option value="Area">Filter by: Area</option>
            <option value="Specialty">Filter by: Specialty</option>
            <option value="Consultant">Filter by: Consultant</option>
          </select>
          <select
            value={selectedFilter}
            onChange={(event) => setSelectedFilter(event.target.value)}
            className="min-w-0 flex-1 rounded-[12px] border border-[#2d2d2d] bg-[#181818] px-3 py-2 text-[13px] text-white outline-none"
          >
            {filterOptions.map((filter) => (
              <option key={filter} value={filter}>
                {filterMode}: {filter}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-3">
        {filteredCards.map((card) => (
          <div key={card.theatre} className="overflow-hidden border-b border-black bg-black">
            <button
              type="button"
              onClick={() => setExpandedCard((current) => (current === card.theatre ? null : card.theatre))}
              className="flex w-full items-start justify-between gap-3 bg-[#0096C7] px-4 py-3 text-left"
            >
              <div className="min-w-0">
                <p className="text-[15px] leading-[1.2] text-white">{card.theatre}</p>
                <p className="mt-0.5 text-[12px] leading-[1.25] text-white">{card.specialty}</p>
                <p className="mt-1 text-[11px] leading-[1.25] text-white">
                  {card.area} · {card.consultant}
                </p>
              </div>
              <div className="flex shrink-0 items-start gap-2">
                <p className="pt-0.5 text-[11px] leading-none text-white">{card.sessionTime}</p>
                <span className="pt-0.5 text-white">
                  <TriangleIcon direction={expandedCard === card.theatre ? "up" : "down"} size={11} />
                </span>
              </div>
            </button>

            {expandedCard === card.theatre ? (
              <div className="border-t border-black bg-[#111111] px-4 pb-3 pt-2.5">
                <div className="space-y-0.5 text-[11px] leading-[1.25] text-[#c8c8c8]">
                  <p>
                    <span className="text-[#7f7f7f]">Consultant Surgeon</span>{" "}
                    {card.consultantSurgeon}
                  </p>
                  <p>
                    <span className="text-[#7f7f7f]">Consultant Anaesthetist</span>{" "}
                    {card.consultantAnaesthetist}
                  </p>
                </div>

                <div className="mt-2 space-y-1">
                  {card.staff.map((member) => (
                    <button
                      key={`${card.theatre}-${member.name}`}
                      type="button"
                      onContextMenu={(event) => {
                        event.preventDefault()
                        setTeamActionMember({ theatre: card.theatre, memberName: member.name })
                      }}
                      onTouchStart={() => startLongPress(card.theatre, member.name)}
                      onTouchEnd={clearLongPressTimer}
                      onTouchMove={clearLongPressTimer}
                      onTouchCancel={clearLongPressTimer}
                      className="block w-full rounded-[8px] bg-[#151515] px-2 py-1.5 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[12px] leading-[1.2] text-white">{member.name}</p>
                          <p className="mt-0.5 text-[11px] leading-[1.2] text-[#8f8f8f]">{member.role}</p>
                        </div>
                        <p className="shrink-0 pt-0.5 text-[10px] leading-none text-[#b7b7b7]">{member.shiftTime}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {teamActionMember ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setTeamActionMember(null)}>
          <div
            className="w-full rounded-t-[22px] border-t border-[#1f1f1f] bg-[#111111] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+14px)] pt-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#2a2a2a]" />
            <div className="border-b border-[#232323] pb-3">
              <p className="text-[14px] text-white">{teamActionMember.memberName}</p>
              <p className="mt-1 text-[11px] text-[#8f8f8f]">{teamActionMember.theatre}</p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={openCommsAction}
                className="flex w-full items-center justify-between rounded-[12px] px-3 py-3 text-left text-[14px] text-white transition-colors hover:bg-[#1a1a1a]"
              >
                <span>Message - Comms</span>
              </button>
              <button
                type="button"
                onClick={openCommsAction}
                className="flex w-full items-center justify-between rounded-[12px] px-3 py-3 text-left text-[14px] text-white transition-colors hover:bg-[#1a1a1a]"
              >
                <span>Offer swap</span>
              </button>
              <button
                type="button"
                onClick={openCommsAction}
                className="flex w-full items-center justify-between rounded-[12px] px-3 py-3 text-left text-[14px] text-white transition-colors hover:bg-[#1a1a1a]"
              >
                <span>Send for break</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ShiftsPanel() {
  const shiftTypeFilters = ["Internal", "External"] as const
  const shiftModeFilters = ["Map", "Feed"] as const
  const [shiftType, setShiftType] = useState<(typeof shiftTypeFilters)[number]>("Internal")
  const [shiftMode, setShiftMode] = useState<(typeof shiftModeFilters)[number]>("Map")
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null)
  const [hoveredHospitalId, setHoveredHospitalId] = useState<string | null>(null)

  const visibleHospitals = SHIFT_HOSPITALS.filter((h) => h.type === shiftType)
  const selectedHospital = visibleHospitals.find((h) => h.id === selectedHospitalId) ?? null

  const pins: WorkforceHospitalPin[] = visibleHospitals.map((h) => ({
    id: h.id,
    hospital: h.hospital,
    distanceMiles: h.distanceMiles,
    contactNumber: h.contactNumber,
    shiftCount: h.shifts.length,
    strongestFit: h.strongestFit,
    position: h.position,
  }))

  return (
    <div>
      <div className="space-y-2 px-4 py-3">
        <MobileLabeledSelect
          label="Shift Type"
          items={shiftTypeFilters.map((item) => ({ key: item, label: item }))}
          value={shiftType}
          onChange={(value) => {
            setShiftType(value)
            setSelectedHospitalId(null)
            setHoveredHospitalId(null)
          }}
        />
        <MobileLabeledSelect
          label="View"
          items={shiftModeFilters.map((item) => ({ key: item, label: item }))}
          value={shiftMode}
          onChange={(value) => setShiftMode(value)}
        />
      </div>

      {shiftMode === "Map" ? (
        <div>
          <p className="px-4 pb-3 text-[12px] text-[#888888]">Start with the hospital, then open the shifts inside it.</p>
          <div className="border-y border-[#1e1e1e] [&_.leaflet-container]:h-[320px]">
            <MobileWorkforceShiftMap
              hospitals={pins}
              radiusMiles={20}
              selectedHospitalId={selectedHospitalId}
              hoveredHospitalId={hoveredHospitalId}
              center={[51.5539, -0.1644]}
              onSelectHospital={setSelectedHospitalId}
              onHoverHospital={setHoveredHospitalId}
            />
          </div>
          <div>
            {(selectedHospital ? [selectedHospital] : visibleHospitals).map((hospital) => (
              <div key={hospital.id} className="border-b border-[#1e1e1e] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[15px] text-[#e0e0e0]">{hospital.hospital}</h3>
                  <span className={`text-[12px] ${hospital.shifts.length > 0 ? "text-[#0096C7]" : "text-[#555555]"}`}>
                    {hospital.shifts.length > 0 ? `${hospital.shifts.length} shifts` : "No shifts"}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-[#888888]">{hospital.distanceMiles} miles away</p>
                <div className="mt-3 space-y-3">
                  {hospital.shifts.length > 0 ? (
                    hospital.shifts.map((shift) => (
                      <div key={`${hospital.id}-${shift.title}`} className="border-t border-[#1e1e1e] pt-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[14px] text-[#e0e0e0]">{shift.title}</p>
                          <span className="shrink-0 text-[11px] text-[#888888]">{shift.state}</span>
                        </div>
                        <p className="mt-1 text-[12px] text-[#888888]">{shift.contact}</p>
                        <div className="mt-1 flex items-center gap-2 text-[12px] text-[#888888]">
                          <Phone size={13} className="text-[#0096C7]" />
                          {shift.phone}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[13px] text-[#555555]">No available shifts here right now.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {SHIFT_STATUSES.map((item) => (
            <div key={`${item.state}-${item.hospital}`} className="border-b border-[#1e1e1e] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[15px] text-[#e0e0e0]">{item.state}</h3>
                <span className="text-[12px] text-[#888888]">{item.hospital}</span>
              </div>
              <p className="mt-1 text-[14px] text-[#e0e0e0]">{item.shift}</p>
              <p className="mt-1 text-[12px] text-[#888888]">{item.contact}</p>
              <div className="mt-1 flex items-center gap-2 text-[12px] text-[#888888]">
                <Phone size={13} className="text-[#0096C7]" />
                {item.phone}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SkillsPanel() {
  return (
    <div>
      {SKILLS.map((skill) => (
        <div key={skill.title} className="border-b border-[#1e1e1e] px-4 py-4 last:border-b-0">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[15px] text-[#e0e0e0]">{skill.title}</h3>
            <span className="text-[12px] text-[#0096C7]">{skill.level}</span>
          </div>
          <p className="mt-1 text-[13px] text-[#888888]">{skill.detail}</p>
        </div>
      ))}
    </div>
  )
}

function TasksPanel() {
  return (
    <div>
      {TASKS.map((task) => (
        <div key={task.title} className="border-b border-[#1e1e1e] px-4 py-4 last:border-b-0">
          <h3 className="text-[15px] text-[#e0e0e0]">{task.title}</h3>
          <p className="mt-1 text-[13px] text-[#888888]">{task.meta}</p>
        </div>
      ))}
    </div>
  )
}

// ── Placeholder panel ──────────────────────────────────────────────────────

function PlaceholderPanel({ body }: { body: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-[13px] leading-6 text-[#888888]">{body}</p>
    </div>
  )
}

function MobileResourcePlaceholderSurface({
  resource,
  body,
}: {
  resource: "equipment" | "supplies"
  body: string
}) {
  return (
    <div className="pb-28">
      <div className="border-y border-black bg-black">
        <MobileMonthCalendarBlock
          leadingControl={
            <div className="relative w-[126px]">
              <select
                value={resource}
                disabled
                className="w-full appearance-none rounded-[12px] border border-[#2d2d2d] bg-[#111111] px-3 py-2 pr-9 text-[13px] text-white outline-none"
              >
                <option value={resource}>{resource === "equipment" ? "Equipment" : "Supplies"}</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#0096C7]">
                <TriangleIcon direction="down" size={12} />
              </span>
            </div>
          }
        />
      </div>

      <PlaceholderPanel body={body} />
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────

type ResourceTab = "workforce" | "equipment" | "supplies"
type WorkforceTab = "allocation" | "shifts" | "skills" | "tasks"

export default function MobileResourcesSurface({ embedded = false }: { embedded?: boolean } = {}) {
  const [resourceTab, setResourceTab] = useState<ResourceTab>("workforce")
  const [activeTab, setActiveTab] = useState<WorkforceTab>("allocation")
  const [showSearch, setShowSearch] = useState(false)
  const [searchValue, setSearchValue] = useState("")

  const profile = getProfile()
  const hospitalLabel = profile?.hospital?.trim() || "Royal Free Hospital"
  const departmentLabel = (profile ? getRelevantSettings(profile) : [])[0] ?? "Operating Theatres"

  function toggleSearch() {
    if (showSearch) setSearchValue("")
    setShowSearch(v => !v)
  }

  return (
    <div className={`${embedded ? "h-full min-h-0" : "min-h-[100dvh] bg-black"}`}>
      {!embedded ? (
        <MobileSurfaceHeader
          title="Resources"
          hospital={hospitalLabel}
          department={departmentLabel}
          rightControls={(
            <>
              <button
                type="button"
                onClick={toggleSearch}
                aria-label="Toggle search"
                className={showSearch ? "text-white" : "text-white/70 hover:text-white"}
              >
                <Search size={20} />
              </button>
              <button
                type="button"
                aria-label="More"
                className="text-white/80 hover:text-white"
              >
                <MoreVertical size={22} />
              </button>
            </>
          )}
        >
          {showSearch ? (
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[#2d2d2d] bg-[#111111] px-4 py-2">
              <Search size={14} className="shrink-0 text-[#888888]" />
              <input
                autoFocus
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search Resources"
                className="flex-1 bg-transparent text-[15px] text-[#e0e0e0] placeholder-[#555555] outline-none"
              />
              {searchValue ? (
                <button onClick={() => setSearchValue("")} className="text-[#888888]">
                  <X size={14} />
                </button>
              ) : null}
            </div>
          ) : null}
        </MobileSurfaceHeader>
      ) : null}

      <div className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(["workforce", "equipment", "supplies"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => { setResourceTab(tab); setActiveTab("allocation") }}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm capitalize transition-colors ${
              resourceTab === tab
                ? "bg-[#0096C7] text-white"
                : "text-[#888888] hover:text-[#e0e0e0]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {resourceTab === "workforce" ? (
        <div className="flex h-full min-h-0 flex-col pb-28">
          <div className="flex min-h-0 flex-1 flex-col border-y border-black bg-black">
            <div className="shrink-0">
              <MobileMonthCalendarBlock
                leadingControl={
                  <div className="relative w-[126px]">
                    <select
                      value={activeTab}
                      onChange={(event) => setActiveTab(event.target.value as WorkforceTab)}
                      className="w-full appearance-none rounded-[12px] border border-[#2d2d2d] bg-[#111111] px-3 py-2 pr-9 text-[13px] text-white outline-none"
                    >
                      <option value="allocation">Allocation</option>
                      <option value="shifts">Shifts</option>
                      <option value="skills">Skills</option>
                      <option value="tasks">Tasks</option>
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#0096C7]">
                      <TriangleIcon direction="down" size={12} />
                    </span>
                  </div>
                }
              />
            </div>
            <div className="min-w-0 flex min-h-0 flex-1 flex-col bg-black">
              {activeTab === "allocation" ? <RotaPanel /> : null}
              {activeTab === "shifts" ? <ShiftsPanel /> : null}
              {activeTab === "skills" ? <SkillsPanel /> : null}
              {activeTab === "tasks" ? <TasksPanel /> : null}
            </div>
          </div>
        </div>
      ) : resourceTab === "equipment" ? (
        <MobileResourcePlaceholderSurface
          resource="equipment"
          body="Equipment is being prepared. This page will become the place for kit readiness, tray availability, and item-level prompts that matter to the individual."
        />
      ) : (
        <MobileResourcePlaceholderSurface
          resource="supplies"
          body="Supplies is being prepared. This page will become the place for stock prompts, consumable readiness, and what you need to know before or during a shift."
        />
      )}
    </div>
  )
}
