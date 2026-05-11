"use client"

import dynamic from "next/dynamic"
import type { ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRightLeft,
  ArrowUpDown,
  Calendar,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MessageSquare,
  MoreVertical,
  Phone,
  Search,
  SlidersHorizontal,
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

type StaffRow = {
  name: string
  role: string
  specialty: string
  shift: "AM" | "PM"
  start: string
  end: string
  status: "Scrub" | "Relieving" | "On Break" | "Sick" | "Dispatched"
}

type AllocationCard = {
  theatre: string
  area: string
  specialty: string
  consultant: string
  consultantSurgeon: string
  consultantAnaesthetist: string
  sessionTime: string
  staff: StaffRow[]
}

function makeTheatreCard(idx: number): AllocationCard {
  const specialty =
    idx % 5 === 0 ? "Neurosurgery"
    : idx % 4 === 0 ? "General Surgery"
    : idx % 3 === 0 ? "ENT"
    : "Trauma and Orthopaedics"
  const sessionTime =
    idx % 4 === 0 ? "10:00 - 22:00"
    : idx % 3 === 0 ? "09:00 - 21:00"
    : idx % 2 === 0 ? "08:00 - 20:00"
    : "07:30 - 19:30"
  const [s, e] = sessionTime.split(" - ")
  const area = idx % 3 === 0 ? "Day Surgery" : idx % 2 === 0 ? "DSU" : "Main Theatres"
  const consultant =
    specialty === "Neurosurgery" ? "Ms Clarke"
    : specialty === "General Surgery" ? "Mr Shah"
    : specialty === "ENT" ? "Mr Patel"
    : "Mr Walker"
  const anaes =
    specialty === "Neurosurgery" ? "Dr Ahmed"
    : specialty === "General Surgery" ? "Dr Collins"
    : specialty === "ENT" ? "Dr Farah"
    : "Dr Bennett"
  const surnames = ["Murray","Singh","Thomas","Reid","Costa","Ali","Khan"]
  const fmNames = ["A","B","C","D","E","F","G"]
  return {
    theatre: `Theatre ${idx}`,
    area,
    specialty,
    consultant,
    consultantSurgeon: consultant,
    consultantAnaesthetist: anaes,
    sessionTime,
    staff: [
      { name: `${fmNames[idx % 7]} ${surnames[(idx + 1) % 7]}`, role: "Consultant Surgeon", specialty, shift: "AM", start: s, end: e, status: "Scrub" },
      { name: `Dr ${surnames[idx % 7]}`, role: "Consultant Anaesthetist", specialty: "Anaesthetics", shift: "AM", start: s, end: e, status: "Scrub" },
      { name: `${fmNames[(idx + 2) % 7]} ${surnames[(idx + 3) % 7]}`, role: "Scrub Practitioner", specialty: "Theatre Support", shift: "AM", start: s, end: e, status: "Scrub" },
      { name: `${fmNames[(idx + 4) % 7]} ${surnames[(idx + 5) % 7]}`, role: "ODP", specialty: "ODP", shift: "PM", start: "13:00", end: e, status: "Relieving" },
    ],
  }
}

const MOBILE_ALLOCATION_CARDS: AllocationCard[] = [
  {
    theatre: "Theatre 1",
    area: "Main Theatres",
    specialty: "Trauma and Orthopaedics",
    consultant: "Mr Walker",
    consultantSurgeon: "Mr Walker",
    consultantAnaesthetist: "Dr Bennett",
    sessionTime: "07:30 - 19:30",
    staff: [
      { name: "J Smith",    role: "Consultant Surgeon",      specialty: "Trauma & Ortho",  shift: "AM", start: "07:30", end: "19:30", status: "Scrub"      },
      { name: "A Bennett",  role: "Consultant Anaesthetist", specialty: "Anaesthetics",    shift: "AM", start: "07:30", end: "19:30", status: "Scrub"      },
      { name: "S Patel",    role: "Scrub Practitioner",      specialty: "Theatre Support", shift: "AM", start: "07:30", end: "19:30", status: "Scrub"      },
      { name: "L Brown",    role: "Circulating Nurse",        specialty: "Nursing",         shift: "AM", start: "07:30", end: "19:30", status: "On Break"   },
      { name: "M Johnson",  role: "ODP",                     specialty: "ODP",             shift: "AM", start: "07:30", end: "19:30", status: "Dispatched" },
      { name: "R Walker",   role: "Consultant Surgeon",      specialty: "Trauma & Ortho",  shift: "PM", start: "13:00", end: "19:30", status: "Relieving"  },
      { name: "D Evans",    role: "Consultant Anaesthetist", specialty: "Anaesthetics",    shift: "PM", start: "13:00", end: "19:30", status: "Sick"       },
      { name: "K Lee",      role: "Scrub Practitioner",      specialty: "Theatre Support", shift: "PM", start: "13:00", end: "19:30", status: "Relieving"  },
      { name: "H Davies",   role: "Circulating Nurse",        specialty: "Nursing",         shift: "PM", start: "13:00", end: "19:30", status: "Scrub"      },
      { name: "T Green",    role: "ODP",                     specialty: "ODP",             shift: "PM", start: "13:00", end: "19:30", status: "On Break"   },
    ],
  },
  ...Array.from({ length: 11 }, (_, i) => makeTheatreCard(i + 2)),
]

// ── Equipment data ─────────────────────────────────────────────────────────

type EquipmentStatus = "In Use" | "Available" | "For Repair" | "Reserved" | "Decommissioned"
type EquipmentFilterMode = "Area" | "Category" | "Type"

type EquipmentRow = { name: string; type: string; status: EquipmentStatus; checked: string }
type EquipmentCard = { storage: string; category: string; area: string; items: EquipmentRow[] }

const EQUIPMENT_STATUS_COLORS: Record<EquipmentStatus, { bg: string; name: string; sub: string }> = {
  "In Use":         { bg: "bg-black", name: "text-[#38bdf8]", sub: "text-[#7dd3fc]" },
  "Available":      { bg: "bg-black", name: "text-[#34d399]", sub: "text-[#6ee7b7]" },
  "For Repair":     { bg: "bg-black", name: "text-[#fbbf24]", sub: "text-[#fcd34d]" },
  "Reserved":       { bg: "bg-black", name: "text-[#c084fc]", sub: "text-[#d8b4fe]" },
  "Decommissioned": { bg: "bg-black", name: "text-[#fb7185]", sub: "text-[#fda4af]" },
}

const EQUIPMENT_CARDS: EquipmentCard[] = [
  {
    storage: "Storage 1", category: "Surgical Equipment", area: "Theatre 1",
    items: [
      { name: "Laparoscopic Stack",   type: "Laparoscopic",     status: "In Use",         checked: "07:30" },
      { name: "Diathermy Unit",       type: "Electrosurgical",  status: "In Use",         checked: "07:30" },
      { name: "Anaesthetic Machine",  type: "Anaesthetics",     status: "Available",      checked: "06:00" },
      { name: "Patient Warmer",       type: "Thermal",          status: "In Use",         checked: "07:30" },
      { name: "Tourniquet",           type: "Orthopaedic",      status: "For Repair",     checked: "Yesterday" },
    ],
  },
  {
    storage: "Storage 2", category: "Imaging Equipment", area: "Theatre 2",
    items: [
      { name: "C-Arm Fluoroscope",    type: "Imaging",          status: "In Use",         checked: "08:00" },
      { name: "Ultrasound Unit",      type: "Imaging",          status: "Available",      checked: "06:30" },
      { name: "Suction Unit",         type: "General",          status: "In Use",         checked: "08:00" },
      { name: "Cell Saver",           type: "Haematology",      status: "Reserved",       checked: "08:00" },
    ],
  },
  {
    storage: "Storage 3", category: "Recovery Equipment", area: "Recovery",
    items: [
      { name: "Ventilator",           type: "Respiratory",      status: "In Use",         checked: "09:00" },
      { name: "Defibrillator",        type: "Cardiac",          status: "Available",      checked: "07:00" },
      { name: "Infusion Pump x2",     type: "IV Therapy",       status: "In Use",         checked: "09:00" },
      { name: "ECG Monitor",          type: "Monitoring",       status: "For Repair",     checked: "Yesterday" },
      { name: "Patient Hoist",        type: "Moving & Handling",status: "Decommissioned", checked: "Last week" },
    ],
  },
  {
    storage: "Main Store", category: "General Equipment", area: "Central Store",
    items: [
      { name: "Sterile Drape Frame",  type: "Sterile Field",    status: "Available",      checked: "07:00" },
      { name: "Instrument Tray x5",   type: "Instruments",      status: "Available",      checked: "07:00" },
      { name: "Knee Arthroscopy Set", type: "Orthopaedic",      status: "Reserved",       checked: "07:30" },
      { name: "Spinal Set",           type: "Neurosurgery",     status: "Available",      checked: "07:00" },
    ],
  },
]

function storageLabel(s: string) { return s.match(/\d+/)?.[0] ?? s.slice(0, 2).toUpperCase() }

function matchesEquipmentFilter(card: EquipmentCard, mode: EquipmentFilterMode, val: string) {
  if (val === "All") return true
  if (mode === "Area") return card.area === val
  if (mode === "Category") return card.category === val
  return card.items.some((i) => i.type === val)
}

// ── Supplies data ──────────────────────────────────────────────────────────

type SupplyStatus = "In Stock" | "Low Stock" | "Ordered" | "Out of Stock" | "Recalled"
type SupplyFilterMode = "Category" | "Area" | "Status"

type SupplyRow = { name: string; category: string; qty: number; unit: string; status: SupplyStatus }
type SupplyCard = { storage: string; category: string; area: string; items: SupplyRow[] }

const SUPPLY_STATUS_COLORS: Record<SupplyStatus, { bg: string; name: string; sub: string }> = {
  "In Stock":    { bg: "bg-black", name: "text-[#34d399]", sub: "text-[#6ee7b7]" },
  "Low Stock":   { bg: "bg-black", name: "text-[#fbbf24]", sub: "text-[#fcd34d]" },
  "Ordered":     { bg: "bg-black", name: "text-[#38bdf8]", sub: "text-[#7dd3fc]" },
  "Out of Stock":{ bg: "bg-black", name: "text-[#fb7185]", sub: "text-[#fda4af]" },
  "Recalled":    { bg: "bg-black", name: "text-[#c084fc]", sub: "text-[#d8b4fe]" },
}

const SUPPLY_CARDS: SupplyCard[] = [
  {
    storage: "Bay 1", category: "Orthopaedic", area: "Theatre 1 Store",
    items: [
      { name: "Sterile Gloves M",    category: "PPE",          qty: 48, unit: "pairs", status: "In Stock"    },
      { name: "Sterile Gloves L",    category: "PPE",          qty: 6,  unit: "pairs", status: "Low Stock"   },
      { name: "Knee Prosthesis",     category: "Implants",     qty: 3,  unit: "units", status: "In Stock"    },
      { name: "Tourniquet Cuff",     category: "Ortho",        qty: 0,  unit: "units", status: "Out of Stock"},
      { name: "Bone Cement",         category: "Ortho",        qty: 12, unit: "packs", status: "Ordered"     },
    ],
  },
  {
    storage: "Bay 2", category: "Anaesthetic", area: "Anaesthetic Store",
    items: [
      { name: "IV Cannula 18G",      category: "IV Access",    qty: 120,unit: "units", status: "In Stock"    },
      { name: "IV Cannula 22G",      category: "IV Access",    qty: 8,  unit: "units", status: "Low Stock"   },
      { name: "Propofol 200mg",      category: "Anaesthetic",  qty: 24, unit: "vials", status: "In Stock"    },
      { name: "Suxamethonium",       category: "Muscle Relx",  qty: 4,  unit: "vials", status: "Low Stock"   },
      { name: "Epidural Kit",        category: "Regional",     qty: 10, unit: "kits",  status: "Ordered"     },
    ],
  },
  {
    storage: "Bay 3", category: "General", area: "Central Consumables",
    items: [
      { name: "Sutures 2/0",         category: "Sutures",      qty: 30, unit: "boxes", status: "In Stock"    },
      { name: "Sutures 0",           category: "Sutures",      qty: 2,  unit: "boxes", status: "Low Stock"   },
      { name: "Sterile Drape Pack",  category: "Draping",      qty: 15, unit: "packs", status: "In Stock"    },
      { name: "Diathermy Pencil",    category: "Electrosurg",  qty: 20, unit: "units", status: "In Stock"    },
      { name: "Latex-free Gloves M", category: "PPE",          qty: 0,  unit: "boxes", status: "Recalled"    },
    ],
  },
  {
    storage: "Bay 4", category: "IV & Fluids", area: "IV Store",
    items: [
      { name: "Normal Saline 1L",    category: "IV Fluids",    qty: 40, unit: "bags",  status: "In Stock"    },
      { name: "Hartmann's 1L",       category: "IV Fluids",    qty: 5,  unit: "bags",  status: "Low Stock"   },
      { name: "Gelofusine 500ml",    category: "Colloid",      qty: 8,  unit: "bags",  status: "Ordered"     },
      { name: "Glucose 5% 500ml",    category: "IV Fluids",    qty: 20, unit: "bags",  status: "In Stock"    },
    ],
  },
]

function matchesSupplyFilter(card: SupplyCard, mode: SupplyFilterMode, val: string) {
  if (val === "All") return true
  if (mode === "Category") return card.category === val
  if (mode === "Area") return card.area === val
  return card.items.some((i) => i.status === val)
}

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

function triggerHapticPulse(duration = 12) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return
  navigator.vibrate(duration)
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

const ROLE_SHORT: Record<string, string> = {
  "Consultant Surgeon": "Surgeon",
  "Consultant Anaesthetist": "Anaesthetist",
  "Scrub Practitioner": "Scrub ODP",
  "Circulating Nurse": "Scout RN",
  "ODP": "Anaes ODP",
}
function shortenRole(role: string) { return ROLE_SHORT[role] ?? role }
function noColon(t: string) { return t.replace(":", "") }

const SPEC_SHORT: Record<string, string> = {
  "Trauma & Ortho": "T&O",
  "Trauma and Orthopaedics": "T&O",
  "Anaesthetics": "Anaes",
  "Theatre Support": "Thtr",
  "Nursing": "Nurs",
  "ODP": "ODP",
  "Cardiothoracic": "Card",
  "General Surgery": "Gen",
  "Vascular": "Vasc",
  "Neurosurgery": "Neuro",
  "Urology": "Urol",
  "Plastics": "Plas",
  "ENT": "ENT",
  "Gynaecology": "Gynae",
  "Ophthalmology": "Ophth",
}
function shortenSpec(s: string) { return SPEC_SHORT[s] ?? s.slice(0, 5) }
function theatreNum(t: string) { return t.match(/\d+/)?.[0] ?? t }

type StaffStatus = "Scrub" | "Relieving" | "On Break" | "Sick" | "Dispatched"

const STATUS_COLORS: Record<StaffStatus, { bg: string; name: string; sub: string; badge: string }> = {
  "Scrub":      { bg: "bg-black", name: "text-[#38bdf8]", sub: "text-[#7dd3fc]", badge: "border-[#0096C7]/40 bg-[#0096C7]/10 text-[#38bdf8]" },
  "Relieving":  { bg: "bg-black", name: "text-[#34d399]", sub: "text-[#6ee7b7]", badge: "border-[#059669]/40 bg-[#059669]/10 text-[#34d399]" },
  "On Break":   { bg: "bg-black", name: "text-[#fbbf24]", sub: "text-[#fcd34d]", badge: "border-[#d97706]/40 bg-[#d97706]/10 text-[#fbbf24]" },
  "Sick":       { bg: "bg-black", name: "text-[#fb7185]", sub: "text-[#fda4af]", badge: "border-[#e11d48]/40 bg-[#e11d48]/10 text-[#fb7185]" },
  "Dispatched": { bg: "bg-black", name: "text-[#c084fc]", sub: "text-[#d8b4fe]", badge: "border-[#9333ea]/40 bg-[#9333ea]/10 text-[#c084fc]" },
}


function RotaPanel({
  paneBoundsLeft = "0",
  paneBoundsRight = "0",
  activeTab,
  setActiveTab,
}: {
  paneBoundsLeft?: string
  paneBoundsRight?: string
  activeTab: WorkforceTab
  setActiveTab: (tab: WorkforceTab) => void
}) {
  const router = useRouter()
  const [filterMode, setFilterMode] = useState<AllocationFilterMode>("Area")
  const [selectedFilter, setSelectedFilter] = useState("All")
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [selectedDate, setSelectedDate] = useState(() => new Date(2025, 4, 1))
  const [sortKey, setSortKey] = useState<"name" | "role" | "start" | null>(null)
  const SORT_CYCLE = [null, "name", "role", "start"] as const
  const [teamActionMember, setTeamActionMember] = useState<{ theatre: string; memberName: string } | null>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const swipeStartX = useRef<number | null>(null)

  const monthDays = useMemo(() => buildMonthCalendar(selectedDate).filter((d) => d.inMonth), [selectedDate])
  const selectedDateKey = selectedDate.toISOString().slice(0, 10)

  const filterOptions = useMemo(() => {
    const values =
      filterMode === "Area"
        ? Array.from(new Set(MOBILE_ALLOCATION_CARDS.map((c) => c.area)))
        : filterMode === "Specialty"
          ? Array.from(new Set(MOBILE_ALLOCATION_CARDS.map((c) => c.specialty)))
          : Array.from(new Set(MOBILE_ALLOCATION_CARDS.map((c) => c.consultant)))
    return ["All", ...values]
  }, [filterMode])

  const filteredCards = useMemo(
    () => MOBILE_ALLOCATION_CARDS.filter((c) => matchesAllocationFilter(c, filterMode, selectedFilter)),
    [filterMode, selectedFilter],
  )

  // total slides = "All" + one per theatre
  const totalSlides = filteredCards.length + 1

  useEffect(() => {
    setCurrentCardIndex((i) => Math.min(i, filteredCards.length))
  }, [filteredCards.length])

  useEffect(() => {
    return () => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current) }
  }, [])

  function clearLongPressTimer() {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null }
  }

  function startLongPress(theatre: string, memberName: string) {
    clearLongPressTimer()
    longPressTimerRef.current = setTimeout(() => {
      triggerHapticPulse()
      setTeamActionMember({ theatre, memberName })
      longPressTimerRef.current = null
    }, 420)
  }

  function openCommsAction() {
    setTeamActionMember(null)
    router.push("/comms")
  }

  const COLS = "grid-cols-[26px_minmax(0,1.3fr)_minmax(0,0.95fr)_minmax(0,0.75fr)_38px_38px]"

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      {/* ── Premium date strip ── */}
      <div className="shrink-0 border-b border-[#222222] bg-[#111111]">
        <div className="flex items-stretch">
          {/* Month + year anchor */}
          <div className="flex shrink-0 flex-col items-center justify-center gap-0.5 border-r border-[#222222] px-4 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0096C7]">
              {selectedDate.toLocaleDateString("en-GB", { month: "short" }).toUpperCase()}
            </span>
            <span className="text-[17px] font-bold leading-none text-white">
              {selectedDate.getFullYear()}
            </span>
          </div>
          {/* Scrollable days */}
          <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {monthDays.map((day) => {
              const dayNum = day.date.getDate()
              const isSelected = day.key === selectedDateKey
              const isToday = day.key === new Date().toISOString().slice(0, 10)
              const wday = day.date.toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 1).toUpperCase()
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  className={`flex shrink-0 flex-col items-center rounded-[10px] px-2.5 py-1.5 transition-all duration-150 ${
                    isSelected
                      ? "bg-[#0096C7] shadow-[0_0_10px_rgba(0,150,199,0.45)]"
                      : "active:bg-[#1e1e1e]"
                  }`}
                >
                  <span className={`text-[12px] font-medium leading-none ${isSelected ? "text-white/70" : "text-white/50"}`}>{wday}</span>
                  <span className={`mt-1 text-[15px] font-bold leading-none ${
                    isSelected ? "text-white" : isToday ? "text-[#0096C7]" : "text-[#d0d0d0]"
                  }`}>{dayNum}</span>
                  {isToday && !isSelected && (
                    <div className="mt-1 h-[3px] w-[3px] rounded-full bg-[#0096C7]" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Filter bar — page · filter mode · filter value ── */}
      <div className="shrink-0 border-b border-[#1e1e1e] bg-[#0d0d0d] px-2 py-2">
        <div className="flex items-center gap-1.5">
          {/* Page / tab */}
          <div className="relative shrink-0">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as WorkforceTab)}
              className="appearance-none rounded-[8px] border border-[#2d2d2d] bg-[#111111] py-2 pl-2.5 pr-6 text-[13px] text-white outline-none"
            >
              <option value="allocation">Allocation</option>
              <option value="shifts">Shifts</option>
              <option value="skills">Skills</option>
              <option value="tasks">Tasks</option>
            </select>
            <TriangleIcon direction="down" size={9} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[#666666]" />
          </div>
          {/* Filter mode */}
          <div className="relative shrink-0 flex items-center">
            <SlidersHorizontal size={11} className="pointer-events-none absolute left-2 text-[#0096C7]" />
            <select
              value={filterMode}
              onChange={(e) => { setFilterMode(e.target.value as AllocationFilterMode); setSelectedFilter("All") }}
              className="appearance-none rounded-[8px] border border-[#2d2d2d] bg-[#111111] py-2 pl-[22px] pr-6 text-[13px] text-white outline-none"
            >
              <option value="Area">Area</option>
              <option value="Specialty">Specialty</option>
              <option value="Consultant">Consultant</option>
            </select>
            <TriangleIcon direction="down" size={9} className="pointer-events-none absolute right-1.5 text-[#666666]" />
          </div>
          {/* Filter value */}
          <div className="relative min-w-0 flex-1">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="w-full appearance-none rounded-[8px] border border-[#2d2d2d] bg-[#111111] py-2 pl-2.5 pr-6 text-[13px] text-white outline-none"
            >
              {filterOptions.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <TriangleIcon direction="down" size={9} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[#666666]" />
          </div>
        </div>
      </div>

      {/* ── Carousel card header ── */}
      {(() => {
        const isAll = currentCardIndex === 0
        const card = isAll ? null : filteredCards[currentCardIndex - 1]
        const times = card?.sessionTime?.split(" - ") ?? []
        return (
          <div className="shrink-0 border-b border-[#1e1e1e] bg-[#0a0a0a]">
            {/* Card row */}
            <div className="flex items-stretch gap-3 px-3 pt-3 pb-2">
              {/* Theatre number */}
              <div className="flex shrink-0 flex-col items-center justify-center rounded-[10px] border border-[#1e1e1e] bg-[#111111] px-3 py-2">
                <span className="font-mono text-[36px] font-black leading-none tracking-tighter text-[#00c8dc]">
                  {isAll ? "ALL" : theatreNum(card?.theatre ?? "").padStart(2, "0")}
                </span>
                <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#333333]">
                  {isAll ? "theatres" : "theatre"}
                </span>
              </div>
              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-black uppercase tracking-[0.05em] leading-tight text-white">
                  {isAll ? "All Theatres" : card?.theatre}
                </p>
                <p className="text-[14px] font-medium leading-snug text-[#00c8dc]">
                  {isAll ? `${filteredCards.length} theatres` : card?.specialty}
                </p>
                <p className="text-[13px] leading-snug text-[#555555]">
                  {isAll ? "Swipe or tap to browse" : `Main Theatres · ${card?.consultantSurgeon}`}
                </p>
              </div>
              {/* Time + sort */}
              <div className="flex shrink-0 flex-col items-end justify-between">
                {!isAll && times.length === 2 ? (
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-[#555555]">Time</p>
                    <p className="text-[15px] font-bold tabular-nums leading-tight text-white">{times[0]}</p>
                    <p className="text-[15px] font-bold tabular-nums leading-tight text-white">{times[1]}</p>
                  </div>
                ) : <div />}
                <button
                  type="button"
                  onClick={() => setSortKey((k) => { const i = SORT_CYCLE.indexOf(k); return SORT_CYCLE[(i + 1) % SORT_CYCLE.length] })}
                  className="flex items-center gap-1.5 rounded-[8px] border border-[#2d2d2d] bg-[#111111] px-2.5 py-2"
                >
                  <ArrowUpDown size={14} className={sortKey ? "text-[#0096C7]" : "text-[#666666]"} />
                  <span className="text-[13px] text-white">{sortKey ?? "sort"}</span>
                </button>
              </div>
            </div>
            {/* Nav + pips row */}
            <div className="flex items-center gap-1 px-2 pb-2.5">
              <button
                type="button"
                onClick={() => setCurrentCardIndex((i) => Math.max(0, i - 1))}
                disabled={currentCardIndex === 0}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full disabled:opacity-20 active:bg-white/10"
              >
                <ChevronLeft size={18} className="text-[#0096C7]" />
              </button>
              <div className="flex flex-1 items-center justify-center gap-1.5">
                {Array.from({ length: totalSlides }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentCardIndex(i)}
                    className={`rounded-full transition-all duration-200 ${
                      i === currentCardIndex
                        ? "h-[4px] w-5 bg-[#0096C7]"
                        : "h-[4px] w-[4px] bg-[#2a2a2a]"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setCurrentCardIndex((i) => Math.min(totalSlides - 1, i + 1))}
                disabled={currentCardIndex === totalSlides - 1}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full disabled:opacity-20 active:bg-white/10"
              >
                <ChevronRight size={18} className="text-[#0096C7]" />
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── Carousel body ── */}
      <div
        className="min-h-0 flex-1 overflow-y-auto"
        onTouchStart={(e) => { swipeStartX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          if (swipeStartX.current === null) return
          const delta = swipeStartX.current - e.changedTouches[0].clientX
          if (Math.abs(delta) > 48) {
            if (delta > 0) setCurrentCardIndex((i) => Math.min(totalSlides - 1, i + 1))
            else setCurrentCardIndex((i) => Math.max(0, i - 1))
          }
          swipeStartX.current = null
        }}
      >
        {(() => {
          const isAll = currentCardIndex === 0
          const cards = isAll ? filteredCards : filteredCards[currentCardIndex - 1] ? [filteredCards[currentCardIndex - 1]] : []

          const sortedCards = cards.map((card) => ({
            ...card,
            staff: sortKey
              ? [...card.staff].sort((a, b) => {
                  if (sortKey === "name") return a.name.localeCompare(b.name)
                  if (sortKey === "role") return a.role.localeCompare(b.role)
                  if (sortKey === "start") return a.start.localeCompare(b.start)
                  return 0
                })
              : card.staff,
          }))

          return (
            <>
              {sortedCards.map((card) => (
                <div key={card.theatre}>
                  {/* Staff rows */}
                  {card.staff.map((member) => (
                    <button
                      key={`${card.theatre}-${member.name}`}
                      type="button"
                      onContextMenu={(e) => { e.preventDefault(); setTeamActionMember({ theatre: card.theatre, memberName: member.name }) }}
                      onTouchStart={() => startLongPress(card.theatre, member.name)}
                      onTouchEnd={clearLongPressTimer}
                      onTouchMove={clearLongPressTimer}
                      onTouchCancel={clearLongPressTimer}
                      className={`grid w-full ${COLS} items-center gap-x-2 border-b border-[#141414] py-2 pl-2 pr-3 text-left ${STATUS_COLORS[member.status as StaffStatus]?.bg ?? "bg-[#0a0a0a]"}`}
                    >
                      {/* Theatre number */}
                      <span className={`font-mono text-[18px] font-black leading-none ${STATUS_COLORS[member.status as StaffStatus]?.name ?? "text-white"}`}>
                        {theatreNum(card.theatre)}
                      </span>
                      <span className={`truncate text-[12px] font-semibold leading-snug ${STATUS_COLORS[member.status as StaffStatus]?.name ?? "text-white"}`}>{member.name}</span>
                      <span className={`truncate text-[11px] leading-snug ${STATUS_COLORS[member.status as StaffStatus]?.sub ?? "text-[#aaaaaa]"}`}>{shortenRole(member.role)}</span>
                      <span className={`truncate text-[11px] ${STATUS_COLORS[member.status as StaffStatus]?.sub ?? "text-[#aaaaaa]"}`}>{shortenSpec(member.specialty)}</span>
                      <span className={`text-[11px] tabular-nums ${STATUS_COLORS[member.status as StaffStatus]?.sub ?? "text-[#aaaaaa]"}`}>{noColon(member.start)}</span>
                      <span className={`text-[11px] tabular-nums ${STATUS_COLORS[member.status as StaffStatus]?.sub ?? "text-[#aaaaaa]"}`}>{noColon(member.end)}</span>
                    </button>
                  ))}
                </div>
              ))}
            </>
          )
        })()}
      </div>

      {/* ── Status legend ── */}
      <div className="shrink-0 border-t border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#444444]">Key</span>
          {(Object.entries(STATUS_COLORS) as [StaffStatus, typeof STATUS_COLORS[StaffStatus]][]).map(([label, c]) => (
            <span key={label} className={`text-[13px] font-semibold ${c.name}`}>{label}</span>
          ))}
        </div>
      </div>

      {/* ── Team action sheet ── */}
      {teamActionMember ? (
        <div
          className="fixed z-50 flex items-end bg-black/60 backdrop-blur-sm"
          style={{ top: 0, bottom: 0, left: paneBoundsLeft, right: paneBoundsRight }}
          onClick={() => setTeamActionMember(null)}
        >
          <div
            className="w-full rounded-t-[28px] border-t border-[#222222] bg-[#0f0f0f] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] pt-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#2a2a2a]" />

            {/* Member header */}
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0096C7]/20">
                <span className="text-[15px] font-bold text-[#0096C7]">
                  {teamActionMember.memberName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[17px] font-semibold leading-tight text-white">{teamActionMember.memberName}</p>
                <p className="mt-0.5 text-[13px] text-[#555555]">{teamActionMember.theatre}</p>
              </div>
              <button type="button" onClick={() => setTeamActionMember(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] text-[#666666]">
                <X size={15} />
              </button>
            </div>

            {/* Actions */}
            <div className="space-y-2.5">
              <button type="button" onClick={openCommsAction}
                className="flex w-full items-center gap-4 rounded-[16px] bg-[#141414] px-4 py-4 text-left active:bg-[#1c1c1c]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0096C7]/15">
                  <MessageSquare size={17} className="text-[#38bdf8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-white">Open Comms</p>
                  <p className="text-[12px] text-[#555555]">Message via PrepSight Comms</p>
                </div>
              </button>
              <button type="button" onClick={() => setTeamActionMember(null)}
                className="flex w-full items-center gap-4 rounded-[16px] bg-[#141414] px-4 py-4 text-left active:bg-[#1c1c1c]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#34d399]/15">
                  <ArrowRightLeft size={17} className="text-[#34d399]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-white">Offer Swap</p>
                  <p className="text-[12px] text-[#555555]">Propose a shift or slot swap</p>
                </div>
              </button>
              <button type="button" onClick={() => setTeamActionMember(null)}
                className="flex w-full items-center gap-4 rounded-[16px] bg-[#141414] px-4 py-4 text-left active:bg-[#1c1c1c]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fbbf24]/15">
                  <Clock3 size={17} className="text-[#fbbf24]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-white">Send for Break</p>
                  <p className="text-[12px] text-[#555555]">Mark as on break and notify team</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function EquipmentPanel() {
  const [filterMode, setFilterMode] = useState<EquipmentFilterMode>("Area")
  const [selectedFilter, setSelectedFilter] = useState("All")
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [sortKey, setSortKey] = useState<"name" | "type" | "status" | null>(null)
  const SORT_CYCLE = [null, "name", "type", "status"] as const
  const swipeStartX = useRef<number | null>(null)

  const filterOptions = useMemo(() => {
    const values =
      filterMode === "Area" ? Array.from(new Set(EQUIPMENT_CARDS.map((c) => c.area)))
      : filterMode === "Category" ? Array.from(new Set(EQUIPMENT_CARDS.map((c) => c.category)))
      : Array.from(new Set(EQUIPMENT_CARDS.flatMap((c) => c.items.map((i) => i.type))))
    return ["All", ...values]
  }, [filterMode])

  const filteredCards = useMemo(
    () => EQUIPMENT_CARDS.filter((c) => matchesEquipmentFilter(c, filterMode, selectedFilter)),
    [filterMode, selectedFilter],
  )

  const totalSlides = filteredCards.length + 1

  useEffect(() => { setCurrentCardIndex((i) => Math.min(i, filteredCards.length)) }, [filteredCards.length])

  const ECOLS = "grid-cols-[26px_minmax(0,1.5fr)_minmax(0,0.9fr)_48px]"

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[#1e1e1e] bg-[#0d0d0d] px-2 py-2">
        <div className="flex items-center gap-1.5">
          <div className="relative shrink-0 flex items-center">
            <SlidersHorizontal size={11} className="pointer-events-none absolute left-2 text-[#0096C7]" />
            <select value={filterMode} onChange={(e) => { setFilterMode(e.target.value as EquipmentFilterMode); setSelectedFilter("All") }}
              className="appearance-none rounded-[8px] border border-[#2d2d2d] bg-[#111111] py-2 pl-[22px] pr-6 text-[13px] text-white outline-none">
              <option value="Area">Area</option>
              <option value="Category">Category</option>
              <option value="Type">Type</option>
            </select>
            <TriangleIcon direction="down" size={9} className="pointer-events-none absolute right-1.5 text-[#666666]" />
          </div>
          <div className="relative min-w-0 flex-1">
            <select value={selectedFilter} onChange={(e) => setSelectedFilter(e.target.value)}
              className="w-full appearance-none rounded-[8px] border border-[#2d2d2d] bg-[#111111] py-2 pl-2.5 pr-6 text-[13px] text-white outline-none">
              {filterOptions.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <TriangleIcon direction="down" size={9} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[#666666]" />
          </div>
        </div>
      </div>

      {(() => {
        const isAll = currentCardIndex === 0
        const card = isAll ? null : filteredCards[currentCardIndex - 1]
        return (
          <div className="shrink-0 border-b border-[#1e1e1e] bg-[#0a0a0a]">
            <div className="flex items-stretch gap-3 px-3 pt-3 pb-2">
              <div className="flex shrink-0 flex-col items-center justify-center rounded-[10px] border border-[#1e1e1e] bg-[#111111] px-3 py-2">
                <span className="font-mono text-[36px] font-black leading-none tracking-tighter text-[#00c8dc]">
                  {isAll ? "ALL" : storageLabel(card?.storage ?? "").padStart(2, "0")}
                </span>
                <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#333333]">
                  {isAll ? "stores" : "store"}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-black uppercase tracking-[0.05em] leading-tight text-white">
                  {isAll ? "All Storage" : card?.storage}
                </p>
                <p className="text-[14px] font-medium leading-snug text-[#00c8dc]">
                  {isAll ? `${filteredCards.length} locations` : card?.category}
                </p>
                <p className="text-[13px] leading-snug text-[#555555]">
                  {isAll ? "Swipe or tap to browse" : card?.area}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end justify-end">
                <button type="button"
                  onClick={() => setSortKey((k) => { const i = SORT_CYCLE.indexOf(k); return SORT_CYCLE[(i + 1) % SORT_CYCLE.length] })}
                  className="flex items-center gap-1.5 rounded-[8px] border border-[#2d2d2d] bg-[#111111] px-2.5 py-2">
                  <ArrowUpDown size={14} className={sortKey ? "text-[#0096C7]" : "text-[#666666]"} />
                  <span className="text-[13px] text-white">{sortKey ?? "sort"}</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1 px-2 pb-2.5">
              <button type="button" onClick={() => setCurrentCardIndex((i) => Math.max(0, i - 1))} disabled={currentCardIndex === 0}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full disabled:opacity-20 active:bg-white/10">
                <ChevronLeft size={18} className="text-[#0096C7]" />
              </button>
              <div className="flex flex-1 items-center justify-center gap-1.5">
                {Array.from({ length: totalSlides }).map((_, i) => (
                  <button key={i} type="button" onClick={() => setCurrentCardIndex(i)}
                    className={`rounded-full transition-all duration-200 ${i === currentCardIndex ? "h-[4px] w-5 bg-[#0096C7]" : "h-[4px] w-[4px] bg-[#2a2a2a]"}`} />
                ))}
              </div>
              <button type="button" onClick={() => setCurrentCardIndex((i) => Math.min(totalSlides - 1, i + 1))} disabled={currentCardIndex === totalSlides - 1}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full disabled:opacity-20 active:bg-white/10">
                <ChevronRight size={18} className="text-[#0096C7]" />
              </button>
            </div>
          </div>
        )
      })()}

      <div className="min-h-0 flex-1 overflow-y-auto"
        onTouchStart={(e) => { swipeStartX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          if (swipeStartX.current === null) return
          const delta = swipeStartX.current - e.changedTouches[0].clientX
          if (Math.abs(delta) > 48) {
            if (delta > 0) setCurrentCardIndex((i) => Math.min(totalSlides - 1, i + 1))
            else setCurrentCardIndex((i) => Math.max(0, i - 1))
          }
          swipeStartX.current = null
        }}
      >
        {(() => {
          const isAll = currentCardIndex === 0
          const cards = isAll ? filteredCards : filteredCards[currentCardIndex - 1] ? [filteredCards[currentCardIndex - 1]] : []
          const sorted = cards.map((card) => ({
            ...card,
            items: sortKey ? [...card.items].sort((a, b) => {
              if (sortKey === "name") return a.name.localeCompare(b.name)
              if (sortKey === "type") return a.type.localeCompare(b.type)
              if (sortKey === "status") return a.status.localeCompare(b.status)
              return 0
            }) : card.items,
          }))
          return (
            <>
              {sorted.map((card) => (
                <div key={card.storage}>
                  {card.items.map((item) => (
                    <div key={`${card.storage}-${item.name}`}
                      className={`grid w-full ${ECOLS} items-center gap-x-2 border-b border-[#141414] py-2 pl-2 pr-3 ${EQUIPMENT_STATUS_COLORS[item.status]?.bg ?? "bg-[#0a0a0a]"}`}>
                      <span className={`font-mono text-[18px] font-black leading-none ${EQUIPMENT_STATUS_COLORS[item.status]?.name ?? "text-white"}`}>
                        {storageLabel(card.storage)}
                      </span>
                      <span className={`truncate text-[12px] font-semibold leading-snug ${EQUIPMENT_STATUS_COLORS[item.status]?.name ?? "text-white"}`}>{item.name}</span>
                      <span className={`truncate text-[11px] leading-snug ${EQUIPMENT_STATUS_COLORS[item.status]?.sub ?? "text-[#aaaaaa]"}`}>{item.type}</span>
                      <span className={`text-[11px] tabular-nums text-right ${EQUIPMENT_STATUS_COLORS[item.status]?.sub ?? "text-[#aaaaaa]"}`}>{item.checked}</span>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )
        })()}
      </div>

      <div className="shrink-0 border-t border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#444444]">Key</span>
          {(Object.entries(EQUIPMENT_STATUS_COLORS) as [EquipmentStatus, typeof EQUIPMENT_STATUS_COLORS[EquipmentStatus]][]).map(([label, c]) => (
            <span key={label} className={`text-[13px] font-semibold ${c.name}`}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function SuppliesPanel() {
  const [filterMode, setFilterMode] = useState<SupplyFilterMode>("Category")
  const [selectedFilter, setSelectedFilter] = useState("All")
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [sortKey, setSortKey] = useState<"name" | "qty" | "status" | null>(null)
  const SORT_CYCLE = [null, "name", "qty", "status"] as const
  const swipeStartX = useRef<number | null>(null)

  const filterOptions = useMemo(() => {
    const values =
      filterMode === "Category" ? Array.from(new Set(SUPPLY_CARDS.map((c) => c.category)))
      : filterMode === "Area" ? Array.from(new Set(SUPPLY_CARDS.map((c) => c.area)))
      : Array.from(new Set(SUPPLY_CARDS.flatMap((c) => c.items.map((i) => i.status))))
    return ["All", ...values]
  }, [filterMode])

  const filteredCards = useMemo(
    () => SUPPLY_CARDS.filter((c) => matchesSupplyFilter(c, filterMode, selectedFilter)),
    [filterMode, selectedFilter],
  )

  const totalSlides = filteredCards.length + 1

  useEffect(() => { setCurrentCardIndex((i) => Math.min(i, filteredCards.length)) }, [filteredCards.length])

  const SCOLS = "grid-cols-[26px_minmax(0,1.5fr)_44px_minmax(0,0.7fr)]"

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[#1e1e1e] bg-[#0d0d0d] px-2 py-2">
        <div className="flex items-center gap-1.5">
          <div className="relative shrink-0 flex items-center">
            <SlidersHorizontal size={11} className="pointer-events-none absolute left-2 text-[#0096C7]" />
            <select value={filterMode} onChange={(e) => { setFilterMode(e.target.value as SupplyFilterMode); setSelectedFilter("All") }}
              className="appearance-none rounded-[8px] border border-[#2d2d2d] bg-[#111111] py-2 pl-[22px] pr-6 text-[13px] text-white outline-none">
              <option value="Category">Category</option>
              <option value="Area">Area</option>
              <option value="Status">Status</option>
            </select>
            <TriangleIcon direction="down" size={9} className="pointer-events-none absolute right-1.5 text-[#666666]" />
          </div>
          <div className="relative min-w-0 flex-1">
            <select value={selectedFilter} onChange={(e) => setSelectedFilter(e.target.value)}
              className="w-full appearance-none rounded-[8px] border border-[#2d2d2d] bg-[#111111] py-2 pl-2.5 pr-6 text-[13px] text-white outline-none">
              {filterOptions.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <TriangleIcon direction="down" size={9} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[#666666]" />
          </div>
        </div>
      </div>

      {(() => {
        const isAll = currentCardIndex === 0
        const card = isAll ? null : filteredCards[currentCardIndex - 1]
        return (
          <div className="shrink-0 border-b border-[#1e1e1e] bg-[#0a0a0a]">
            <div className="flex items-stretch gap-3 px-3 pt-3 pb-2">
              <div className="flex shrink-0 flex-col items-center justify-center rounded-[10px] border border-[#1e1e1e] bg-[#111111] px-3 py-2">
                <span className="font-mono text-[36px] font-black leading-none tracking-tighter text-[#00c8dc]">
                  {isAll ? "ALL" : storageLabel(card?.storage ?? "").padStart(2, "0")}
                </span>
                <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#333333]">
                  {isAll ? "bays" : "bay"}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-black uppercase tracking-[0.05em] leading-tight text-white">
                  {isAll ? "All Bays" : card?.storage}
                </p>
                <p className="text-[14px] font-medium leading-snug text-[#00c8dc]">
                  {isAll ? `${filteredCards.length} bays` : card?.category}
                </p>
                <p className="text-[13px] leading-snug text-[#555555]">
                  {isAll ? "Swipe or tap to browse" : card?.area}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end justify-end">
                <button type="button"
                  onClick={() => setSortKey((k) => { const i = SORT_CYCLE.indexOf(k); return SORT_CYCLE[(i + 1) % SORT_CYCLE.length] })}
                  className="flex items-center gap-1.5 rounded-[8px] border border-[#2d2d2d] bg-[#111111] px-2.5 py-2">
                  <ArrowUpDown size={14} className={sortKey ? "text-[#0096C7]" : "text-[#666666]"} />
                  <span className="text-[13px] text-white">{sortKey ?? "sort"}</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1 px-2 pb-2.5">
              <button type="button" onClick={() => setCurrentCardIndex((i) => Math.max(0, i - 1))} disabled={currentCardIndex === 0}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full disabled:opacity-20 active:bg-white/10">
                <ChevronLeft size={18} className="text-[#0096C7]" />
              </button>
              <div className="flex flex-1 items-center justify-center gap-1.5">
                {Array.from({ length: totalSlides }).map((_, i) => (
                  <button key={i} type="button" onClick={() => setCurrentCardIndex(i)}
                    className={`rounded-full transition-all duration-200 ${i === currentCardIndex ? "h-[4px] w-5 bg-[#0096C7]" : "h-[4px] w-[4px] bg-[#2a2a2a]"}`} />
                ))}
              </div>
              <button type="button" onClick={() => setCurrentCardIndex((i) => Math.min(totalSlides - 1, i + 1))} disabled={currentCardIndex === totalSlides - 1}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full disabled:opacity-20 active:bg-white/10">
                <ChevronRight size={18} className="text-[#0096C7]" />
              </button>
            </div>
          </div>
        )
      })()}

      <div className="min-h-0 flex-1 overflow-y-auto"
        onTouchStart={(e) => { swipeStartX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          if (swipeStartX.current === null) return
          const delta = swipeStartX.current - e.changedTouches[0].clientX
          if (Math.abs(delta) > 48) {
            if (delta > 0) setCurrentCardIndex((i) => Math.min(totalSlides - 1, i + 1))
            else setCurrentCardIndex((i) => Math.max(0, i - 1))
          }
          swipeStartX.current = null
        }}
      >
        {(() => {
          const isAll = currentCardIndex === 0
          const cards = isAll ? filteredCards : filteredCards[currentCardIndex - 1] ? [filteredCards[currentCardIndex - 1]] : []
          const sorted = cards.map((card) => ({
            ...card,
            items: sortKey ? [...card.items].sort((a, b) => {
              if (sortKey === "name") return a.name.localeCompare(b.name)
              if (sortKey === "qty") return b.qty - a.qty
              if (sortKey === "status") return a.status.localeCompare(b.status)
              return 0
            }) : card.items,
          }))
          return (
            <>
              {sorted.map((card) => (
                <div key={card.storage}>
                  {card.items.map((item) => (
                    <div key={`${card.storage}-${item.name}`}
                      className={`grid w-full ${SCOLS} items-center gap-x-2 border-b border-[#141414] py-2 pl-2 pr-3 ${SUPPLY_STATUS_COLORS[item.status]?.bg ?? "bg-[#0a0a0a]"}`}>
                      <span className={`font-mono text-[18px] font-black leading-none ${SUPPLY_STATUS_COLORS[item.status]?.name ?? "text-white"}`}>
                        {storageLabel(card.storage)}
                      </span>
                      <span className={`truncate text-[12px] font-semibold leading-snug ${SUPPLY_STATUS_COLORS[item.status]?.name ?? "text-white"}`}>{item.name}</span>
                      <span className={`text-[13px] font-bold tabular-nums text-right ${SUPPLY_STATUS_COLORS[item.status]?.name ?? "text-white"}`}>{item.qty}</span>
                      <span className={`truncate text-[11px] ${SUPPLY_STATUS_COLORS[item.status]?.sub ?? "text-[#aaaaaa]"}`}>{item.unit}</span>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )
        })()}
      </div>

      <div className="shrink-0 border-t border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#444444]">Key</span>
          {(Object.entries(SUPPLY_STATUS_COLORS) as [SupplyStatus, typeof SUPPLY_STATUS_COLORS[SupplyStatus]][]).map(([label, c]) => (
            <span key={label} className={`text-[13px] font-semibold ${c.name}`}>{label}</span>
          ))}
        </div>
      </div>
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
  embedded = false,
}: {
  resource: "equipment" | "supplies"
  body: string
  embedded?: boolean
}) {
  return (
    <div className={embedded ? "" : "pb-28"}>
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

export default function MobileResourcesSurface({
  embedded = false,
  paneBoundsLeft = "0",
  paneBoundsRight = "0",
  initialResourceTab = "workforce",
  initialWorkforceTab = "allocation",
}: {
  embedded?: boolean
  paneBoundsLeft?: string
  paneBoundsRight?: string
  initialResourceTab?: ResourceTab
  initialWorkforceTab?: WorkforceTab
} = {}) {
  const [resourceTab, setResourceTab] = useState<ResourceTab>(initialResourceTab)
  const [activeTab, setActiveTab] = useState<WorkforceTab>(initialWorkforceTab)
  const [showSearch, setShowSearch] = useState(false)
  const [searchValue, setSearchValue] = useState("")

  const profile = getProfile()
  const hospitalLabel = profile?.hospital?.trim() || "Royal Free Hospital"
  const departmentLabel = (profile ? getRelevantSettings(profile) : [])[0] ?? "Operating Theatres"

  function toggleSearch() {
    if (showSearch) setSearchValue("")
    setShowSearch(v => !v)
  }

  useEffect(() => {
    setResourceTab(initialResourceTab)
  }, [initialResourceTab])

  useEffect(() => {
    setActiveTab(initialResourceTab === "workforce" ? initialWorkforceTab : "allocation")
  }, [initialResourceTab, initialWorkforceTab])

  return (
    <div className={`flex flex-col ${embedded ? "flex-1 min-h-0 overflow-hidden" : "h-[100dvh] bg-black"}`}>
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

      <div className="shrink-0 flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
        <div className={`flex flex-1 min-h-0 flex-col overflow-hidden ${embedded ? "" : "pb-28"}`}>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-y border-black bg-black">
            <div className="shrink-0">
              {activeTab !== "allocation" ? (
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
              ) : null}
            </div>
            <div className="min-w-0 flex min-h-0 flex-1 flex-col overflow-hidden bg-black">
              {activeTab === "allocation" ? <RotaPanel paneBoundsLeft={paneBoundsLeft} paneBoundsRight={paneBoundsRight} activeTab={activeTab} setActiveTab={setActiveTab} /> : null}
              {activeTab === "shifts" ? <ShiftsPanel /> : null}
              {activeTab === "skills" ? <SkillsPanel /> : null}
              {activeTab === "tasks" ? <TasksPanel /> : null}
            </div>
          </div>
        </div>
      ) : resourceTab === "equipment" ? (
        <div className={`flex flex-1 min-h-0 flex-col overflow-hidden ${embedded ? "" : "pb-28"}`}>
          <EquipmentPanel />
        </div>
      ) : (
        <div className={`flex flex-1 min-h-0 flex-col overflow-hidden ${embedded ? "" : "pb-28"}`}>
          <SuppliesPanel />
        </div>
      )}
    </div>
  )
}
