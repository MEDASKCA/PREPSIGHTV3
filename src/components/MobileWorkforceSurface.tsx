"use client"

import dynamic from "next/dynamic"
import type { ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRightLeft,
  ArrowUpDown,
  Bell,
  Calendar,
  CalendarClock,
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  Crown,
  MessageSquare,
  MoreVertical,
  Navigation,
  Pencil,
  Phone,
  Search,
  SlidersHorizontal,
  Star,
  Users,
  X,
} from "lucide-react"
import { arrayRemove, arrayUnion, collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { requestFoldOpenDm } from "@/lib/fold-open-dm"
import MobileSurfaceHeader from "@/components/MobileSurfaceHeader"
import TriangleIcon from "@/components/TriangleIcon"
import { getProfile, getRelevantSettings } from "@/lib/profile"
import type { CommsUser } from "@/lib/comms-types"
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
          <span className="mt-0.5 block text-[12px] leading-5 text-white">{summary}</span>
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
      <span className="shrink-0 text-[13px] text-white">{label}</span>
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
      { name: `${fmNames[idx % 7]} ${surnames[(idx + 1) % 7]}`, role: "Consultant Surgeon",      specialty,              shift: "AM", start: s,       end: e, status: "Scrub"     },
      { name: `Dr ${surnames[idx % 7]}`,                         role: "Consultant Anaesthetist", specialty: "Anaesthetics", shift: "AM", start: s,       end: e, status: "Scrub"     },
      { name: `${fmNames[(idx + 2) % 7]} ${surnames[(idx + 3) % 7]}`, role: "Scrub RN",           specialty: "Theatre Support", shift: "AM", start: s,    end: e, status: "Scrub"     },
      { name: `${fmNames[(idx + 4) % 7]} ${surnames[(idx + 5) % 7]}`, role: "Anaes ODP",          specialty: "ODP",          shift: "PM", start: "13:00", end: e, status: "Relieving" },
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
      { name: "S Patel",    role: "Scrub RN",                specialty: "Theatre Support", shift: "AM", start: "07:30", end: "19:30", status: "Scrub"      },
      { name: "L Brown",    role: "HCA",                     specialty: "Nursing",         shift: "AM", start: "07:30", end: "19:30", status: "On Break"   },
      { name: "M Johnson",  role: "Anaes ODP",               specialty: "ODP",             shift: "AM", start: "07:30", end: "19:30", status: "Dispatched" },
      { name: "R Walker",   role: "Consultant Surgeon",      specialty: "Trauma & Ortho",  shift: "PM", start: "13:00", end: "19:30", status: "Relieving"  },
      { name: "D Evans",    role: "Consultant Anaesthetist", specialty: "Anaesthetics",    shift: "PM", start: "13:00", end: "19:30", status: "Sick"       },
      { name: "K Lee",      role: "Scrub RN",                specialty: "Theatre Support", shift: "PM", start: "13:00", end: "19:30", status: "Relieving"  },
      { name: "H Davies",   role: "HCA",                     specialty: "Nursing",         shift: "PM", start: "13:00", end: "19:30", status: "Scrub"      },
      { name: "T Green",    role: "Anaes ODP",               specialty: "ODP",             shift: "PM", start: "13:00", end: "19:30", status: "On Break"   },
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
  "Consultant Surgeon":    "Surgeon",
  "Consultant Anaesthetist": "Anaesthetist",
  "Scrub RN":              "Scrub RN",
  "Anaes ODP":             "Anaes ODP",
  "HCA":                   "HCA",
  // legacy aliases
  "Scrub Practitioner":    "Scrub RN",
  "Circulating Nurse":     "HCA",
  "ODP":                   "Anaes ODP",
}
function shortenRole(role: string) { return ROLE_SHORT[role] ?? role }
function isConsultantRole(role: string) { return role.startsWith("Consultant ") }
function isLeadRole(role: string) { return role === "Scrub RN" || role === "Scrub Practitioner" }
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


type ActiveModal =
  | { kind: "ping";          memberName: string; theatre: string }
  | { kind: "call";          memberName: string }
  | { kind: "break";         memberName: string; theatre: string }
  | { kind: "dispatch";      memberName: string; theatre: string }
  | { kind: "shift_request"; memberName: string; theatre: string }
  | { kind: "toast";         message: string }
  | null

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
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [sortKey, setSortKey] = useState<"name" | "role" | "start" | null>(null)
  const SORT_CYCLE = [null, "name", "role", "start"] as const
  const [teamActionMember, setTeamActionMember] = useState<{ theatre: string; memberName: string } | null>(null)
  const [sheetView, setSheetView] = useState<"actions" | "relief_select">("actions")
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [dispatchDest, setDispatchDest] = useState("")

  const monthDays = useMemo(() => buildMonthCalendar(selectedDate).filter((d) => d.inMonth), [selectedDate])
  const selectedDateKey = selectedDate.toISOString().slice(0, 10)
  const [cards, setCards] = useState<AllocationCard[]>(MOBILE_ALLOCATION_CARDS)

  useEffect(() => {
    if (!db) return
    const q = query(collection(db, "theatre_sessions"), where("date", "==", selectedDateKey))
    getDocs(q)
      .then((snap) => {
        if (snap.empty) { setCards(MOBILE_ALLOCATION_CARDS); return }
        const live: AllocationCard[] = snap.docs.map((d) => {
          const s = d.data()
          return {
            theatre: s.theatre,
            area: s.area,
            specialty: s.specialty,
            consultant: s.consultantSurgeon,
            consultantSurgeon: s.consultantSurgeon,
            consultantAnaesthetist: s.consultantAnaesthetist,
            sessionTime: s.sessionTime,
            staff: (s.staff ?? []).map((m: Record<string, string>) => ({
              name: m.name,
              role: m.role,
              specialty: m.specialty,
              shift: m.start < "12:00" ? "AM" : "PM" as "AM" | "PM",
              start: m.start,
              end: m.end,
              status: m.status as StaffRow["status"],
            })),
          }
        })
        const liveTheatres = new Set(live.map((c) => c.theatre))
        const merged = [
          ...live,
          ...MOBILE_ALLOCATION_CARDS.filter((c) => !liveTheatres.has(c.theatre)),
        ].sort((a, b) => a.theatre.localeCompare(b.theatre))
        setCards(merged)
      })
      .catch((err) => { console.error("[MobileWorkforce] fetch failed:", err); setCards(MOBILE_ALLOCATION_CARDS) })
  }, [selectedDateKey])

  const filterOptions = useMemo(() => {
    const values =
      filterMode === "Area"
        ? Array.from(new Set(cards.map((c) => c.area)))
        : filterMode === "Specialty"
          ? Array.from(new Set(cards.map((c) => c.specialty)))
          : Array.from(new Set(cards.map((c) => c.consultant)))
    return ["All", ...values]
  }, [filterMode, cards])

  const filteredCards = useMemo(
    () => cards.filter((c) => matchesAllocationFilter(c, filterMode, selectedFilter)),
    [cards, filterMode, selectedFilter],
  )

  // total slides = "All" + one per theatre
  const totalSlides = filteredCards.length + 1

  useEffect(() => {
    setCurrentCardIndex((i) => Math.min(i, filteredCards.length))
  }, [filteredCards.length])

  useEffect(() => {
    if (activeModal?.kind === "toast") {
      const t = setTimeout(() => setActiveModal(null), 2800)
      return () => clearTimeout(t)
    }
  }, [activeModal])

  function closeSheet() { setTeamActionMember(null); setSheetView("actions") }

  function openCommsAction() {
    const name = teamActionMember?.memberName
    closeSheet()
    const inFoldableSplit = paneBoundsLeft !== "0" || paneBoundsRight !== "0"
    if (inFoldableSplit && name) {
      requestFoldOpenDm(name)
    } else {
      router.push(name ? `/comms?dmWith=${encodeURIComponent(name)}` : "/comms")
    }
  }

  function openSheetAction(kind: "ping" | "call" | "break" | "relief_select" | "dispatch" | "shift_request") {
    const { memberName, theatre } = teamActionMember!
    if (kind === "relief_select") { setSheetView("relief_select"); return }
    closeSheet()
    if (kind === "call")          setActiveModal({ kind: "call",          memberName })
    else if (kind === "ping")     { setActiveModal({ kind: "ping",          memberName, theatre }) }
    else if (kind === "break")    setActiveModal({ kind: "break",         memberName, theatre })
    else if (kind === "dispatch") { setDispatchDest(""); setActiveModal({ kind: "dispatch", memberName, theatre }) }
    else if (kind === "shift_request") setActiveModal({ kind: "shift_request", memberName, theatre })
  }

  function confirmAction(message: string) { setActiveModal({ kind: "toast", message }) }

  const COLS = "grid-cols-[26px_minmax(0,1.3fr)_minmax(0,0.95fr)_minmax(0,0.75fr)_38px_38px]"
  const isSplitPane = paneBoundsLeft !== "0" || paneBoundsRight !== "0"
  const legendOffsetBottom = isSplitPane ? "0px" : "calc(env(safe-area-inset-bottom, 0px) + 64px)"
  const legendReserve = isSplitPane ? "64px" : "124px"

  return (
    <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden">
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
                  <span className={`text-[12px] font-medium leading-none ${isSelected ? "text-white" : "text-white"}`}>{wday}</span>
                  <span className={`mt-1 font-mono text-[16px] font-black tracking-tighter leading-none ${
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
              <option value="teams">Teams</option>
            </select>
            <TriangleIcon direction="down" size={9} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-white" />
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
            <TriangleIcon direction="down" size={9} className="pointer-events-none absolute right-1.5 text-white" />
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
            <TriangleIcon direction="down" size={9} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-white" />
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
              </div>
              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-black uppercase tracking-[0.05em] leading-tight text-white">
                  {isAll ? "All Theatres" : card?.theatre}
                </p>
                <p className="text-[14px] font-medium leading-snug text-[#00c8dc]">
                  {isAll ? `${filteredCards.length} theatres` : card?.specialty}
                </p>
                <p className="text-[13px] leading-snug text-white">
                  {isAll ? "Swipe or tap to browse" : `Main Theatres · ${card?.consultantSurgeon}`}
                </p>
              </div>
              {/* Time + sort */}
              <div className="flex shrink-0 flex-col items-end justify-between">
                {!isAll && times.length === 2 ? (
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-white">Time</p>
                    <p className="text-[15px] font-bold tabular-nums leading-tight text-white">{times[0]}</p>
                    <p className="text-[15px] font-bold tabular-nums leading-tight text-white">{times[1]}</p>
                  </div>
                ) : <div />}
                <button
                  type="button"
                  onClick={() => setSortKey((k) => { const i = SORT_CYCLE.indexOf(k); return SORT_CYCLE[(i + 1) % SORT_CYCLE.length] })}
                  className="flex items-center gap-1.5 rounded-[8px] border border-[#2d2d2d] bg-[#111111] px-2.5 py-2"
                >
                  <ArrowUpDown size={14} className={sortKey ? "text-[#0096C7]" : "text-white"} />
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
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        style={{
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
          paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${legendReserve})`,
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
          const visibleRows = sortedCards.flatMap((card) =>
            card.staff.map((member) => ({ card, member })),
          )

          return (
            <>
              {visibleRows.map(({ card, member }) => (
                <div
                  key={`${card.theatre}-${member.name}-${member.start}-${member.end}`}
                  onContextMenu={(e) => { e.preventDefault(); setTeamActionMember({ theatre: card.theatre, memberName: member.name }) }}
                  className={`grid w-full ${COLS} items-center gap-x-2 border-b border-[#141414] py-2 pl-2 pr-3 text-left ${STATUS_COLORS[member.status as StaffStatus]?.bg ?? "bg-[#0a0a0a]"}`}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <span className={`font-mono text-[18px] font-black leading-none ${STATUS_COLORS[member.status as StaffStatus]?.name ?? "text-white"}`}>
                    {theatreNum(card.theatre)}
                  </span>
                  <span className={`truncate text-[12px] font-semibold leading-snug ${STATUS_COLORS[member.status as StaffStatus]?.name ?? "text-white"}`}>{member.name}</span>
                  <span className="flex min-w-0 items-center gap-1">
                    {isConsultantRole(member.role) && (
                      <span className="shrink-0 text-[14px] leading-none" style={{ color: "#FFD700" }}>★</span>
                    )}
                    {isLeadRole(member.role) && (
                      <Crown size={11} className="shrink-0" style={{ color: "#FFD700" }} />
                    )}
                    <span className={`truncate text-[11px] leading-snug ${STATUS_COLORS[member.status as StaffStatus]?.sub ?? "text-white"}`}>{shortenRole(member.role)}</span>
                  </span>
                  <span className={`truncate text-[11px] ${STATUS_COLORS[member.status as StaffStatus]?.sub ?? "text-white"}`}>{shortenSpec(member.specialty)}</span>
                  <span className={`text-[11px] tabular-nums ${STATUS_COLORS[member.status as StaffStatus]?.sub ?? "text-white"}`}>{noColon(member.start)}</span>
                  <span className={`text-[11px] tabular-nums ${STATUS_COLORS[member.status as StaffStatus]?.sub ?? "text-white"}`}>{noColon(member.end)}</span>
                </div>
              ))}
            </>
          )
        })()}
      </div>

      {/* ── Status legend ── */}
      <div
        className="pointer-events-none fixed z-40 border-t border-[#1e1e1e] bg-[#0a0a0a]/96 px-3 py-2.5 shadow-[0_-10px_24px_rgba(0,0,0,0.42)] backdrop-blur-sm"
        style={{
          left: paneBoundsLeft,
          right: paneBoundsRight,
          bottom: legendOffsetBottom,
        }}
      >
        <div className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-x-3">
          <span className="pt-[1px] text-[10px] font-semibold uppercase tracking-[0.16em] text-white">Key</span>
          <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
            {(Object.entries(STATUS_COLORS) as [StaffStatus, typeof STATUS_COLORS[StaffStatus]][]).map(([label, c]) => (
              <span key={label} className={`text-[12px] font-semibold leading-4 ${c.name}`}>{label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Team action sheet ── */}
      {teamActionMember ? (
        <div
          className="fixed z-50 flex items-end bg-black/60 backdrop-blur-sm"
          style={{ top: 0, bottom: 0, left: paneBoundsLeft, right: paneBoundsRight }}
          onClick={closeSheet}
        >
          <div
            className="w-full rounded-t-[28px] border-t border-[#222222] bg-[#0f0f0f] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] pt-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#2a2a2a]" />

            {/* Member header */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0096C7]/20">
                <span className="text-[15px] font-bold text-[#0096C7]">
                  {teamActionMember.memberName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[17px] font-semibold leading-tight text-white">{teamActionMember.memberName}</p>
                <p className="mt-0.5 text-[13px] text-white">{teamActionMember.theatre}</p>
              </div>
              <button type="button" onClick={closeSheet}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] text-white">
                <X size={15} />
              </button>
            </div>

            {/* ── Actions list ── */}
            {sheetView === "actions" && (
              <div className="space-y-2">
                <SheetAction icon={<MessageSquare size={17} className="text-[#38bdf8]" />} iconBg="bg-[#0096C7]/15"
                  label="Chat" sub="Open direct message thread" onClick={openCommsAction} />
                <SheetAction icon={<Bell size={17} className="text-[#fbbf24]" />} iconBg="bg-[#fbbf24]/15"
                  label="Ping" sub="Send a quick ping via Comms"
                  onClick={() => openSheetAction("ping")} />
                <div className="my-1 border-t border-[#1e1e1e]" />
                <SheetAction icon={<Phone size={17} className="text-[#34d399]" />} iconBg="bg-[#34d399]/15"
                  label="Call Extension" sub="View extension number"
                  onClick={() => openSheetAction("call")} />
                <SheetAction icon={<Coffee size={17} className="text-[#fb923c]" />} iconBg="bg-[#fb923c]/15"
                  label="Send for Break" sub="Notify team and send to break"
                  onClick={() => openSheetAction("break")} />
                <SheetAction icon={<Users size={17} className="text-[#a78bfa]" />} iconBg="bg-[#a78bfa]/15"
                  label="Ask for Relief" sub="Select a relief from this theatre"
                  onClick={() => openSheetAction("relief_select")} />
                <SheetAction icon={<Navigation size={17} className="text-[#22d3ee]" />} iconBg="bg-[#22d3ee]/15"
                  label="Dispatch" sub="Send to another location or task"
                  onClick={() => openSheetAction("dispatch")} />
                <div className="my-1 border-t border-[#1e1e1e]" />
                {(() => {
                  const isFuture = selectedDateKey > new Date().toISOString().slice(0, 10)
                  return (
                    <SheetAction icon={<ArrowRightLeft size={17} className={isFuture ? "text-[#34d399]" : "text-white"} />}
                      iconBg={isFuture ? "bg-[#34d399]/15" : "bg-[#1a1a1a]"}
                      label="Offer Swap" sub={isFuture ? "Propose a shift or slot swap" : "Only available on future dates"}
                      onClick={isFuture ? closeSheet : undefined} disabled={!isFuture} />
                  )
                })()}
                <SheetAction icon={<CalendarPlus size={17} className="text-[#38bdf8]" />} iconBg="bg-[#38bdf8]/15"
                  label="Shift Request" sub="Ask about availability for a shift"
                  onClick={() => openSheetAction("shift_request")} />
              </div>
            )}

            {/* ── Relief: select person ── */}
            {sheetView === "relief_select" && (
              <>
                <div className="mb-3 flex items-center gap-2">
                  <button type="button" onClick={() => setSheetView("actions")}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a1a1a] text-white">
                    <ChevronLeft size={15} />
                  </button>
                  <p className="text-[14px] font-semibold text-white">Select relief for {teamActionMember.memberName}</p>
                </div>
                <div className="max-h-[260px] overflow-y-auto space-y-2 pb-1">
                  {(cards.find(c => c.theatre === teamActionMember.theatre)?.staff ?? [])
                    .filter(m => m.name !== teamActionMember.memberName)
                    .map(m => (
                      <button key={m.name} type="button"
                        onClick={() => {
                          confirmAction(`${m.name} asked to relieve ${teamActionMember.memberName}`)
                          closeSheet()
                        }}
                        className="flex w-full items-center gap-3 rounded-[14px] bg-[#141414] px-4 py-3 text-left active:bg-[#1c1c1c]">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#a78bfa]/20 text-[11px] font-bold text-[#a78bfa]">
                          {m.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-white">{m.name}</p>
                          <p className="text-[12px] text-white">{m.role}</p>
                        </div>
                      </button>
                    ))
                  }
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {/* ── Action modals ── */}
      {activeModal && activeModal.kind !== "toast" && (
        <div className="fixed z-50 flex items-end bg-black/70 backdrop-blur-sm"
             style={{ top: 0, bottom: 0, left: paneBoundsLeft, right: paneBoundsRight }}
             onClick={() => setActiveModal(null)}>
          <div className="w-full rounded-t-[28px] border-t border-[#222222] bg-[#0f0f0f] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] pt-5"
               onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#2a2a2a]" />

            {activeModal.kind === "ping" && (
              <>
                <MobileModalHeader icon={<Bell size={22} className="text-[#fbbf24]" />} bg="bg-[#fbbf24]/15"
                  title={`Ping ${activeModal.memberName}`} sub={activeModal.theatre} />
                <p className="mb-6 text-[14px] text-white">A ping will be sent to {activeModal.memberName} and logged in Comms.</p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setActiveModal(null)}
                    className="flex-1 rounded-[14px] border border-[#2a2a2a] py-4 text-[14px] font-semibold text-white active:bg-[#141414]">No, Cancel</button>
                  <button type="button"
                    onClick={() => confirmAction(`Ping sent to ${activeModal.memberName}`)}
                    className="flex-1 rounded-[14px] bg-[#fbbf24] py-4 text-[14px] font-bold text-black active:bg-[#f59e0b]">Yes, Send Ping</button>
                </div>
              </>
            )}

            {activeModal.kind === "call" && (
              <>
                <MobileModalHeader icon={<Phone size={22} className="text-[#34d399]" />} bg="bg-[#34d399]/15"
                  title={`Call ${activeModal.memberName}`} sub="Extension number" />
                <div className="mb-5 rounded-[14px] bg-[#141414] px-4 py-4 text-center">
                  <p className="text-[11px] uppercase tracking-widest text-white">Extension</p>
                  <p className="mt-1.5 text-[32px] font-black text-white">— —</p>
                  <p className="mt-1 text-[12px] text-white">Available when hospital directory is connected</p>
                </div>
                <button type="button" onClick={() => setActiveModal(null)}
                  className="w-full rounded-[14px] border border-[#2a2a2a] py-4 text-[14px] font-semibold text-white active:bg-[#141414]">Close</button>
              </>
            )}

            {activeModal.kind === "break" && (
              <>
                <MobileModalHeader icon={<Coffee size={22} className="text-[#fb923c]" />} bg="bg-[#fb923c]/15"
                  title={`Send ${activeModal.memberName} for break?`} sub={activeModal.theatre} />
                <p className="mb-6 text-[14px] text-white">A break notification will be sent and visible to the team via Comms.</p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setActiveModal(null)}
                    className="flex-1 rounded-[14px] border border-[#2a2a2a] py-4 text-[14px] font-semibold text-white active:bg-[#141414]">Cancel</button>
                  <button type="button"
                    onClick={() => confirmAction(`Break notification sent to ${activeModal.memberName}`)}
                    className="flex-1 rounded-[14px] bg-[#fb923c] py-4 text-[14px] font-bold text-black active:bg-[#f97316]">Send for Break</button>
                </div>
              </>
            )}

            {activeModal.kind === "dispatch" && (
              <>
                <MobileModalHeader icon={<Navigation size={22} className="text-[#22d3ee]" />} bg="bg-[#22d3ee]/15"
                  title={`Dispatch ${activeModal.memberName}`} sub={activeModal.theatre} />
                <label className="mb-2 block text-[13px] text-white">Destination</label>
                <input type="text" value={dispatchDest} onChange={(e) => setDispatchDest(e.target.value)}
                  placeholder="e.g. Recovery Room, Theatre 3, ICU…"
                  className="mb-5 w-full rounded-[14px] border border-[#2a2a2a] bg-[#141414] px-4 py-4 text-[14px] text-white placeholder-[#444444] outline-none focus:border-[#22d3ee]/50" />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setActiveModal(null)}
                    className="flex-1 rounded-[14px] border border-[#2a2a2a] py-4 text-[14px] font-semibold text-white active:bg-[#141414]">Cancel</button>
                  <button type="button" disabled={!dispatchDest.trim()}
                    onClick={() => confirmAction(`${activeModal.memberName} dispatched to ${dispatchDest.trim()}`)}
                    className="flex-1 rounded-[14px] bg-[#22d3ee] py-4 text-[14px] font-bold text-black active:bg-[#06b6d4] disabled:opacity-40">Dispatch</button>
                </div>
              </>
            )}

            {activeModal.kind === "shift_request" && (
              <>
                <MobileModalHeader icon={<CalendarPlus size={22} className="text-[#38bdf8]" />} bg="bg-[#38bdf8]/15"
                  title="Shift Request" sub={`${activeModal.memberName} · ${activeModal.theatre}`} />
                <p className="mb-2 text-[14px] text-white">Send an availability request to {activeModal.memberName} for:</p>
                <div className="mb-5 rounded-[14px] bg-[#141414] px-4 py-3 text-center">
                  <p className="text-[16px] font-semibold text-white">{selectedDateKey}</p>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setActiveModal(null)}
                    className="flex-1 rounded-[14px] border border-[#2a2a2a] py-4 text-[14px] font-semibold text-white active:bg-[#141414]">Cancel</button>
                  <button type="button"
                    onClick={() => confirmAction(`Shift request sent to ${activeModal.memberName}`)}
                    className="flex-1 rounded-[14px] bg-[#38bdf8] py-4 text-[14px] font-bold text-black active:bg-[#0ea5e9]">Send Request</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {activeModal?.kind === "toast" && (
        <div className="pointer-events-none fixed top-16 z-50 flex justify-center"
             style={{ left: paneBoundsLeft, right: paneBoundsRight }}>
          <div className="rounded-full border border-[#2a2a2a] bg-[#141414] px-5 py-3 text-[13px] font-semibold text-white shadow-2xl">
            {activeModal.message}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Bottom sheet action row ────────────────────────────────────────────────

function SheetAction({ icon, iconBg, label, sub, onClick, disabled }: {
  icon: ReactNode; iconBg: string; label: string; sub: string
  onClick?: () => void; disabled?: boolean
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`flex w-full items-center gap-4 rounded-[16px] bg-[#141414] px-4 py-3.5 text-left ${disabled ? "opacity-35" : "active:bg-[#1c1c1c]"}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-white">{label}</p>
        <p className="text-[12px] text-white">{sub}</p>
      </div>
    </button>
  )
}

function MobileModalHeader({ icon, bg, title, sub }: { icon: ReactNode; bg: string; title: string; sub: string }) {
  return (
    <div className="mb-5 flex items-center gap-4">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${bg}`}>{icon}</div>
      <div>
        <p className="text-[17px] font-bold text-white">{title}</p>
        <p className="text-[13px] text-white">{sub}</p>
      </div>
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
            <TriangleIcon direction="down" size={9} className="pointer-events-none absolute right-1.5 text-white" />
          </div>
          <div className="relative min-w-0 flex-1">
            <select value={selectedFilter} onChange={(e) => setSelectedFilter(e.target.value)}
              className="w-full appearance-none rounded-[8px] border border-[#2d2d2d] bg-[#111111] py-2 pl-2.5 pr-6 text-[13px] text-white outline-none">
              {filterOptions.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <TriangleIcon direction="down" size={9} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-white" />
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
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-black uppercase tracking-[0.05em] leading-tight text-white">
                  {isAll ? "All Storage" : card?.storage}
                </p>
                <p className="text-[14px] font-medium leading-snug text-[#00c8dc]">
                  {isAll ? `${filteredCards.length} locations` : card?.category}
                </p>
                <p className="text-[13px] leading-snug text-white">
                  {isAll ? "Swipe or tap to browse" : card?.area}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end justify-end">
                <button type="button"
                  onClick={() => setSortKey((k) => { const i = SORT_CYCLE.indexOf(k); return SORT_CYCLE[(i + 1) % SORT_CYCLE.length] })}
                  className="flex items-center gap-1.5 rounded-[8px] border border-[#2d2d2d] bg-[#111111] px-2.5 py-2">
                  <ArrowUpDown size={14} className={sortKey ? "text-[#0096C7]" : "text-white"} />
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
                      <span className={`truncate text-[11px] leading-snug ${EQUIPMENT_STATUS_COLORS[item.status]?.sub ?? "text-white"}`}>{item.type}</span>
                      <span className={`text-[11px] tabular-nums text-right ${EQUIPMENT_STATUS_COLORS[item.status]?.sub ?? "text-white"}`}>{item.checked}</span>
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
          <span className="text-[11px] font-semibold uppercase tracking-widest text-white">Key</span>
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
            <TriangleIcon direction="down" size={9} className="pointer-events-none absolute right-1.5 text-white" />
          </div>
          <div className="relative min-w-0 flex-1">
            <select value={selectedFilter} onChange={(e) => setSelectedFilter(e.target.value)}
              className="w-full appearance-none rounded-[8px] border border-[#2d2d2d] bg-[#111111] py-2 pl-2.5 pr-6 text-[13px] text-white outline-none">
              {filterOptions.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <TriangleIcon direction="down" size={9} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-white" />
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
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-black uppercase tracking-[0.05em] leading-tight text-white">
                  {isAll ? "All Bays" : card?.storage}
                </p>
                <p className="text-[14px] font-medium leading-snug text-[#00c8dc]">
                  {isAll ? `${filteredCards.length} bays` : card?.category}
                </p>
                <p className="text-[13px] leading-snug text-white">
                  {isAll ? "Swipe or tap to browse" : card?.area}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end justify-end">
                <button type="button"
                  onClick={() => setSortKey((k) => { const i = SORT_CYCLE.indexOf(k); return SORT_CYCLE[(i + 1) % SORT_CYCLE.length] })}
                  className="flex items-center gap-1.5 rounded-[8px] border border-[#2d2d2d] bg-[#111111] px-2.5 py-2">
                  <ArrowUpDown size={14} className={sortKey ? "text-[#0096C7]" : "text-white"} />
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
                      <span className={`truncate text-[11px] ${SUPPLY_STATUS_COLORS[item.status]?.sub ?? "text-white"}`}>{item.unit}</span>
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
          <span className="text-[11px] font-semibold uppercase tracking-widest text-white">Key</span>
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
          <p className="px-4 pb-3 text-[12px] text-white">Start with the hospital, then open the shifts inside it.</p>
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
                  <span className={`text-[12px] ${hospital.shifts.length > 0 ? "text-[#0096C7]" : "text-white"}`}>
                    {hospital.shifts.length > 0 ? `${hospital.shifts.length} shifts` : "No shifts"}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-white">{hospital.distanceMiles} miles away</p>
                <div className="mt-3 space-y-3">
                  {hospital.shifts.length > 0 ? (
                    hospital.shifts.map((shift) => (
                      <div key={`${hospital.id}-${shift.title}`} className="border-t border-[#1e1e1e] pt-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[14px] text-[#e0e0e0]">{shift.title}</p>
                          <span className="shrink-0 text-[11px] text-white">{shift.state}</span>
                        </div>
                        <p className="mt-1 text-[12px] text-white">{shift.contact}</p>
                        <div className="mt-1 flex items-center gap-2 text-[12px] text-white">
                          <Phone size={13} className="text-[#0096C7]" />
                          {shift.phone}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[13px] text-white">No available shifts here right now.</p>
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
                <span className="text-[12px] text-white">{item.hospital}</span>
              </div>
              <p className="mt-1 text-[14px] text-[#e0e0e0]">{item.shift}</p>
              <p className="mt-1 text-[12px] text-white">{item.contact}</p>
              <div className="mt-1 flex items-center gap-2 text-[12px] text-white">
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
          <p className="mt-1 text-[13px] text-white">{skill.detail}</p>
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
          <p className="mt-1 text-[13px] text-white">{task.meta}</p>
        </div>
      ))}
    </div>
  )
}

// ── Teams panel ─────────────────────────────────────────────────────────────

type MobileOrgTeam = {
  id: string
  orgId: string
  name: string
  type: "theatre" | "specialty"
  memberUids: string[]
}
type MobileStaffRow = CommsUser & { specialtyTeams: string[] }

const MOB_AVATAR_COLORS = ["bg-sky-700", "bg-violet-700", "bg-emerald-700", "bg-amber-700", "bg-rose-700"]
function mobAvatarColor(uid: string) {
  let n = 0
  for (let i = 0; i < uid.length; i++) n += uid.charCodeAt(i)
  return MOB_AVATAR_COLORS[n % MOB_AVATAR_COLORS.length]
}
function mobInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?"
  return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase()
}

// Premium bottom-sheet, constrained to the current split-view pane
function StaffBottomSheet({
  staff,
  specialtyTeams,
  paneBoundsLeft,
  paneBoundsRight,
  onClose,
  onSave,
}: {
  staff: MobileStaffRow
  specialtyTeams: MobileOrgTeam[]
  paneBoundsLeft: string
  paneBoundsRight: string
  onClose: () => void
  onSave: (uid: string, patch: Partial<CommsUser>, teamIds: string[]) => Promise<void>
}) {
  const [visible, setVisible] = useState(false)
  const [name, setName] = useState(staff.displayName)
  const [role, setRole] = useState(staff.clinicalRole ?? "")
  const [department, setDepartment] = useState(staff.department ?? "")
  const [band, setBand] = useState(staff.band ?? "")
  const [staffType, setStaffType] = useState<"permanent" | "bank" | "agency">(staff.staffType ?? "permanent")
  const [isTeamLeader, setIsTeamLeader] = useState(staff.isTeamLeader ?? false)

  // Specialty checkboxes — derive available list from org teams + user's existing ones
  const availableSpecialties = [...new Set([
    ...specialtyTeams.map(t => t.name),
    ...(staff.specialties ?? []),
  ])].sort()
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(staff.specialties ?? [])
  const [primarySpecialty, setPrimarySpecialty] = useState(
    staff.primarySpecialty ?? staff.specialties?.[0] ?? "",
  )

  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(
    specialtyTeams.filter(t => t.memberUids.includes(staff.uid)).map(t => t.id),
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    return () => cancelAnimationFrame(id)
  }, [])

  function dismiss() {
    setVisible(false)
    setTimeout(onClose, 420)
  }

  function toggleSpecialty(s: string) {
    setSelectedSpecialties(prev => {
      const next = prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
      // if removing the primary, clear primary or pick first remaining
      if (primarySpecialty === s && !next.includes(s)) {
        setPrimarySpecialty(next[0] ?? "")
      }
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    const eff = selectedSpecialties.filter(Boolean)
    const primary = primarySpecialty && eff.includes(primarySpecialty) ? primarySpecialty : eff[0] ?? ""
    await onSave(
      staff.uid,
      {
        displayName: name.trim(),
        clinicalRole: role.trim(),
        department: department.trim(),
        band: band.trim(),
        staffType,
        isTeamLeader,
        specialties: eff,
        primarySpecialty: primary,
      },
      selectedTeamIds,
    )
    setSaving(false)
    dismiss()
  }

  const inputCls =
    "w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[15px] text-white outline-none placeholder:text-white/30 transition-colors focus:border-[#0096C7]/50 focus:bg-white/[0.08]"

  return (
    <div
      className="fixed z-[600]"
      style={{ top: 0, bottom: 0, left: paneBoundsLeft, right: paneBoundsRight }}
    >
      <div
        className="absolute inset-0"
        onClick={dismiss}
        style={{
          backgroundColor: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          transition: "opacity 350ms ease",
          opacity: visible ? 1 : 0,
        }}
      />

      <div
        className="absolute bottom-0 left-0 right-0 flex flex-col overflow-hidden"
        style={{
          maxHeight: "88%",
          borderRadius: "28px 28px 0 0",
          background: "linear-gradient(180deg, #1a1a1a 0%, #111111 100%)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 -24px 80px rgba(0,0,0,0.8), 0 -2px 0 rgba(255,255,255,0.04)",
          transition: "transform 420ms cubic-bezier(0.32, 0.72, 0, 1)",
          transform: visible ? "translateY(0)" : "translateY(100%)",
        }}
      >
        {/* Drag pill */}
        <div className="flex shrink-0 justify-center pt-3 pb-1">
          <div className="h-[5px] w-9 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-5 pb-4 pt-2">
          <button type="button" onClick={dismiss} className="rounded-full px-3 py-1.5 text-[14px] text-white/50 active:bg-white/8">
            Cancel
          </button>
          <div className="flex min-w-0 items-center gap-2.5">
            <div className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${mobAvatarColor(staff.uid)}`}>
              {mobInitials(name || "?")}
              {isTeamLeader && (
                <div className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 shadow">
                  <Crown size={7} className="text-black" strokeWidth={2.5} />
                </div>
              )}
            </div>
            <span className="max-w-[130px] truncate text-[15px] font-semibold text-white">{name || staff.displayName}</span>
          </div>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-full bg-[#0096C7] px-4 py-1.5 text-[14px] font-semibold text-white transition-all disabled:opacity-50 active:scale-95 active:bg-[#0085b3]"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        <div className="mx-5 shrink-0 h-px bg-white/[0.07]" />

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-5 pb-12">
          <SheetField label="Display Name">
            <input value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          </SheetField>

          <SheetField label="Clinical Role">
            <input value={role} onChange={e => setRole(e.target.value)} className={inputCls} />
          </SheetField>

          <SheetField label="Department">
            <input value={department} onChange={e => setDepartment(e.target.value)} className={inputCls} />
          </SheetField>

          {/* Staff Classification */}
          <SheetField label="Classification">
            <div className="flex gap-2">
              {(["permanent", "bank", "agency"] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setStaffType(t)}
                  className={`flex-1 rounded-2xl border py-2.5 text-[13px] font-medium capitalize transition-all ${
                    staffType === t
                      ? t === "permanent" ? "border-[#0096C7]/50 bg-[#0096C7]/15 text-[#67CFCF]"
                        : t === "bank" ? "border-indigo-400/50 bg-indigo-400/12 text-indigo-300"
                        : "border-violet-400/50 bg-violet-400/12 text-violet-300"
                      : "border-white/8 bg-white/[0.03] text-white/35"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </SheetField>

          {/* Band + Team Leader on one row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <SheetField label="Band / Grade">
                <input
                  value={band}
                  onChange={e => setBand(e.target.value)}
                  placeholder="e.g. 6"
                  className={inputCls}
                />
              </SheetField>
            </div>
            <div className="shrink-0">
              <SheetField label="Team Leader">
                <button
                  type="button"
                  onClick={() => setIsTeamLeader(v => !v)}
                  className={`flex h-[50px] w-[50px] items-center justify-center rounded-2xl border-2 transition-all ${
                    isTeamLeader
                      ? "border-amber-400/60 bg-amber-400/15"
                      : "border-white/10 bg-white/[0.04]"
                  }`}
                  aria-pressed={isTeamLeader}
                >
                  <Crown size={18} className={isTeamLeader ? "text-amber-400" : "text-white/30"} />
                </button>
              </SheetField>
            </div>
          </div>

          {/* Specialties — checkbox list */}
          {availableSpecialties.length > 0 && (
            <SheetField label="Specialties">
              <div className="space-y-1.5">
                {availableSpecialties.map(s => {
                  const checked = selectedSpecialties.includes(s)
                  const isPrimary = primarySpecialty === s
                  return (
                    <div
                      key={s}
                      className={`flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 transition-colors ${
                        checked ? "border-[#0096C7]/30 bg-[#0096C7]/8" : "border-white/8 bg-white/[0.03]"
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleSpecialty(s)}
                        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                          checked ? "border-[#0096C7] bg-[#0096C7]" : "border-white/20"
                        }`}
                      >
                        {checked && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                      {/* Label */}
                      <span className={`flex-1 text-[13px] ${checked ? "text-white" : "text-white/50"}`}>{s}</span>
                      {/* Star = set as primary */}
                      {checked && (
                        <button
                          type="button"
                          onClick={() => setPrimarySpecialty(isPrimary ? "" : s)}
                          className="shrink-0 transition-colors"
                          title={isPrimary ? "Primary specialty" : "Set as primary"}
                        >
                          <Star
                            size={14}
                            className={isPrimary ? "text-amber-400" : "text-white/25"}
                            fill={isPrimary ? "currentColor" : "none"}
                          />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="mt-2 text-[11px] text-white/35">Tap ★ to set a specialty as the primary one shown on your profile</p>
            </SheetField>
          )}

          {/* Team assignment */}
          {specialtyTeams.length > 0 && (
            <SheetField label="Specialty Team">
              <div className="space-y-1.5">
                {specialtyTeams.map(team => {
                  const checked = selectedTeamIds.includes(team.id)
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => setSelectedTeamIds(prev => prev.includes(team.id) ? prev.filter(x => x !== team.id) : [...prev, team.id])}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                        checked ? "border-[#0096C7]/40 bg-[#0096C7]/10" : "border-white/8 bg-white/[0.04] active:border-white/15"
                      }`}
                    >
                      <span className="text-[14px] text-white">{team.name}</span>
                      <div className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 transition-all ${checked ? "border-[#0096C7] bg-[#0096C7]" : "border-white/20"}`}>
                        {checked && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </SheetField>
          )}
        </div>
      </div>
    </div>
  )
}

function SheetField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">{label}</p>
      {children}
    </div>
  )
}

function TeamsPanel({ paneBoundsLeft = "0", paneBoundsRight = "0" }: { paneBoundsLeft?: string; paneBoundsRight?: string }) {
  const profile = getProfile()
  const canEdit = profile?.role === "manager" || profile?.role === "senior_manager"

  const [orgId, setOrgId] = useState<string | null>(null)
  const [staff, setStaff] = useState<MobileStaffRow[]>([])
  const [orgTeams, setOrgTeams] = useState<MobileOrgTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState("")
  const [expandedUid, setExpandedUid] = useState<string | null>(null)
  const [editingStaff, setEditingStaff] = useState<MobileStaffRow | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const uid = auth?.currentUser?.uid
    if (!uid || !db) { setLoading(false); return }
    getDocs(query(collection(db, "comms_v5_memberships"), where("uid", "==", uid), where("status", "==", "active")))
      .then(snap => {
        if (!snap.empty) setOrgId(snap.docs[0].data().orgId as string)
        else setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!orgId || !db) return
    return onSnapshot(
      query(collection(db, "org_teams"), where("orgId", "==", orgId)),
      snap => setOrgTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }) as MobileOrgTeam)),
      () => {},
    )
  }, [orgId])

  useEffect(() => {
    if (!orgId || !db) return
    const firestore = db
    const unsub = onSnapshot(
      query(collection(firestore, "comms_v5_memberships"), where("orgId", "==", orgId), where("status", "==", "active")),
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

  const specialtyTeams = orgTeams.filter(t => t.type === "specialty")
  const staffWithTeams: MobileStaffRow[] = staff.map(m => ({
    ...m,
    specialtyTeams: specialtyTeams.filter(t => t.memberUids.includes(m.uid)).map(t => t.name),
  }))

  const q = searchQ.trim().toLowerCase()
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
      if (shouldBeIn && !isIn) await updateDoc(doc(firestore, "org_teams", team.id), { memberUids: arrayUnion(uid) })
      else if (!shouldBeIn && isIn) await updateDoc(doc(firestore, "org_teams", team.id), { memberUids: arrayRemove(uid) })
    }
    showToast("Saved")
  }

  if (loading) {
    return (
      <div className="space-y-1.5 px-4 pt-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-[52px] animate-pulse rounded-2xl bg-white/[0.05]" />
        ))}
      </div>
    )
  }

  return (
    <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden">
      {/* Search */}
      <div className="shrink-0 px-4 pt-3 pb-2">
        <label className="flex items-center gap-2.5 rounded-2xl border border-white/8 bg-white/[0.05] px-3.5 py-2.5">
          <Search size={13} className="shrink-0 text-white/35" />
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Name, role, specialty…"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/30"
          />
          {searchQ && (
            <button type="button" onClick={() => setSearchQ("")} className="text-white/35">
              <X size={13} />
            </button>
          )}
        </label>
      </div>

      <p className="shrink-0 px-4 pb-2 text-[11px] text-white/35">
        {filtered.length} member{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Scrollable list */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-10">
        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-[14px] text-white">{searchQ ? "No results" : "No staff members yet."}</p>
            {searchQ && <p className="mt-1 text-[12px] text-white/40">Try a different search</p>}
          </div>
        ) : (
          <div className="space-y-1.5 px-4">
            {filtered.map(member => {
              const isExpanded = expandedUid === member.uid
              return (
                <div
                  key={member.uid}
                  className={`overflow-hidden rounded-2xl border transition-colors duration-200 ${
                    isExpanded ? "border-white/10 bg-white/[0.06]" : "border-transparent bg-white/[0.04]"
                  }`}
                >
                  {/* One-liner row */}
                  <button
                    type="button"
                    onClick={() => setExpandedUid(isExpanded ? null : member.uid)}
                    className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
                  >
                    {/* Avatar + optional crown */}
                    <div className="relative shrink-0">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white ${mobAvatarColor(member.uid)}`}>
                        {mobInitials(member.displayName)}
                      </div>
                      {member.isTeamLeader && (
                        <div className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 shadow-sm">
                          <Crown size={7} className="text-black" strokeWidth={2.5} />
                        </div>
                      )}
                    </div>

                    {/* Name + primary specialty or role */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-white leading-tight">{member.displayName || "—"}</p>
                      {(member.primarySpecialty || member.clinicalRole) && (
                        <p className="truncate text-[12px] text-white/50 leading-tight">
                          {member.primarySpecialty || member.clinicalRole}
                        </p>
                      )}
                    </div>

                    {/* Right badges */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      {member.specialtyTeams[0] && (
                        <span className="max-w-[80px] truncate rounded-full bg-[#0096C7]/20 px-2 py-0.5 text-[10px] font-medium text-[#67CFCF]">
                          {member.specialtyTeams[0]}
                        </span>
                      )}
                      {member.staffType === "bank" && (
                        <span className="rounded-md border border-indigo-400/35 bg-indigo-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">Bank</span>
                      )}
                      {member.staffType === "agency" && (
                        <span className="rounded-md border border-violet-400/35 bg-violet-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-violet-300">Agency</span>
                      )}
                      {member.band && (
                        <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                          Bd {member.band}
                        </span>
                      )}
                      <ChevronDown
                        size={14}
                        className="text-white/30 transition-transform duration-300"
                        style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                      />
                    </div>
                  </button>

                  {/* Expandable detail */}
                  <div
                    className="overflow-hidden"
                    style={{
                      maxHeight: isExpanded ? "500px" : "0px",
                      transition: "max-height 320ms cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    <div className="space-y-3 px-3.5 pb-4">
                      <div className="h-px bg-white/[0.07]" />

                      {/* Role + dept + email */}
                      <div className="space-y-2">
                        {member.clinicalRole && (
                          <div className="flex gap-2">
                            <span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/35 pt-[1px]">Role</span>
                            <span className="text-[13px] text-white">{member.clinicalRole}</span>
                          </div>
                        )}
                        {member.department && (
                          <div className="flex gap-2">
                            <span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/35 pt-[1px]">Dept</span>
                            <span className="text-[13px] text-white">{member.department}</span>
                          </div>
                        )}
                        {member.email && (
                          <div className="flex gap-2">
                            <span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/35 pt-[1px]">Email</span>
                            <span className="min-w-0 truncate text-[12px] text-white/60">{member.email}</span>
                          </div>
                        )}
                        {(member.staffType === "bank" || member.staffType === "agency" || member.band) && (
                          <div className="flex gap-2">
                            <span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/35 pt-[1px]">Grade</span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {member.staffType === "bank" && <span className="rounded-md border border-indigo-400/35 bg-indigo-400/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-300">Bank</span>}
                              {member.staffType === "agency" && <span className="rounded-md border border-violet-400/35 bg-violet-400/10 px-2 py-0.5 text-[11px] font-semibold text-violet-300">Agency</span>}
                              {member.band && <span className="text-[13px] text-amber-300">Band {member.band}</span>}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Specialties — clean vertical list */}
                      {(member.specialties ?? []).length > 0 && (
                        <div>
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/35">Specialties</p>
                          <div className="space-y-1">
                            {member.specialties!.map(s => (
                              <div key={s} className="flex items-center gap-2">
                                {member.primarySpecialty === s && (
                                  <Star size={10} className="shrink-0 text-amber-400" fill="currentColor" />
                                )}
                                {member.primarySpecialty !== s && (
                                  <div className="h-1 w-1 shrink-0 rounded-full bg-white/25" />
                                )}
                                <span className={`text-[13px] ${member.primarySpecialty === s ? "font-medium text-white" : "text-white/70"}`}>{s}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Teams */}
                      {member.specialtyTeams.length > 0 && (
                        <div>
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/35">Teams</p>
                          <div className="flex flex-wrap gap-1.5">
                            {member.specialtyTeams.map(t => (
                              <span key={t} className="rounded-full bg-[#0096C7]/15 px-2.5 py-1 text-[11px] font-medium text-[#67CFCF]">{t}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setEditingStaff(member)}
                          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2 text-[13px] font-medium text-white transition-colors active:bg-white/10"
                        >
                          <Pencil size={12} />
                          Edit member
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom sheet */}
      {editingStaff && canEdit && (
        <StaffBottomSheet
          staff={editingStaff}
          specialtyTeams={specialtyTeams}
          paneBoundsLeft={paneBoundsLeft}
          paneBoundsRight={paneBoundsRight}
          onClose={() => setEditingStaff(null)}
          onSave={handleSave}
        />
      )}

      {/* Toast — anchored to pane centre */}
      {toast && (
        <div
          className="pointer-events-none fixed z-[700] -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-[13px] text-white shadow-lg backdrop-blur"
          style={{ bottom: "96px", left: `calc((${paneBoundsLeft} + (100% - ${paneBoundsRight})) / 2)` }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}

// ── Placeholder panel ──────────────────────────────────────────────────────

function PlaceholderPanel({ body }: { body: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-[13px] leading-6 text-white">{body}</p>
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
type WorkforceTab = "allocation" | "shifts" | "skills" | "tasks" | "teams"

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
    <div className={`flex flex-col ${embedded ? "flex-1 min-h-0 overflow-hidden" : "h-[100svh] min-h-0 overflow-hidden bg-black"}`}>
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
                className={showSearch ? "text-white" : "text-white hover:text-white"}
              >
                <Search size={20} />
              </button>
              <button
                type="button"
                aria-label="More"
                className="text-white hover:text-white"
              >
                <MoreVertical size={22} />
              </button>
            </>
          )}
        >
          {showSearch ? (
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[#2d2d2d] bg-[#111111] px-4 py-2">
              <Search size={14} className="shrink-0 text-white" />
              <input
                autoFocus
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search Resources"
                className="flex-1 bg-transparent text-[15px] text-[#e0e0e0] placeholder-[#555555] outline-none"
              />
              {searchValue ? (
                <button onClick={() => setSearchValue("")} className="text-white">
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
                : "text-white hover:text-[#e0e0e0]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {resourceTab === "workforce" ? (
        <div className={`flex flex-1 min-h-0 flex-col ${embedded ? "" : "pb-28"}`}>
          <div className="flex min-h-0 flex-1 flex-col border-y border-black bg-black">
            <div className="shrink-0">
              {activeTab === "teams" ? (
                <div className="flex items-center px-3 py-2.5 border-b border-[#1a1a1a]">
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
                      <option value="teams">Teams</option>
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#0096C7]">
                      <TriangleIcon direction="down" size={12} />
                    </span>
                  </div>
                </div>
              ) : activeTab !== "allocation" ? (
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
                        <option value="teams">Teams</option>
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#0096C7]">
                        <TriangleIcon direction="down" size={12} />
                      </span>
                    </div>
                  }
                />
              ) : null}
            </div>
            <div className="min-w-0 flex min-h-0 flex-1 flex-col bg-black">
              {activeTab === "allocation" ? <RotaPanel paneBoundsLeft={paneBoundsLeft} paneBoundsRight={paneBoundsRight} activeTab={activeTab} setActiveTab={setActiveTab} /> : null}
              {activeTab === "shifts" ? <ShiftsPanel /> : null}
              {activeTab === "skills" ? <SkillsPanel /> : null}
              {activeTab === "tasks" ? <TasksPanel /> : null}
              {activeTab === "teams" ? <TeamsPanel paneBoundsLeft={paneBoundsLeft} paneBoundsRight={paneBoundsRight} /> : null}
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
