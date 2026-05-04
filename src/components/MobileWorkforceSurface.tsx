"use client"

import dynamic from "next/dynamic"
import type { ReactNode } from "react"
import { useState } from "react"
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

function RotaPanel() {
  return (
    <div>
      {ROTA_ITEMS.map((item) => (
        <div key={`${item.day}-${item.area}`} className="border-b border-[#1e1e1e] px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[16px] tracking-[-0.03em] text-[#e0e0e0]">{item.day}</h3>
            <span className="text-[12px] text-[#888888]">{item.time}</span>
          </div>
          <p className="mt-2 text-[15px] text-[#e0e0e0]">{item.area}</p>
          <p className="mt-1 text-[13px] text-[#888888]">{item.specialty}</p>
          <p className="mt-2 text-[13px] text-[#888888]">{item.detail}</p>
          <div className="mt-3 border-t border-[#1e1e1e] pt-3">
            <p className="text-[12px] text-[#555555]">Allocation contact</p>
            <p className="mt-1 text-[14px] text-[#e0e0e0]">{item.contact}</p>
            <div className="mt-1 flex items-center gap-2 text-[12px] text-[#888888]">
              <Phone size={13} className="text-[#0096C7]" />
              {item.phone}
            </div>
          </div>
        </div>
      ))}
      <div className="px-4 py-3">
        <p className="mb-2 text-[11px] uppercase tracking-widest text-[#555555]">Rota actions</p>
        {ROTA_ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <button key={action.title} className="flex w-full items-center gap-3 border-b border-[#1e1e1e] py-3 text-left last:border-b-0">
              <Icon size={16} className="shrink-0 text-[#0096C7]" />
              <span>
                <span className="block text-[14px] text-[#e0e0e0]">{action.title}</span>
                <span className="mt-0.5 block text-[12px] text-[#888888]">{action.description}</span>
              </span>
            </button>
          )
        })}
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

function PlaceholderPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-[15px] font-medium text-[#e0e0e0]">{title}</p>
      <p className="mt-2 text-[13px] leading-6 text-[#888888]">{body}</p>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────

type ResourceTab = "workforce" | "equipment" | "supplies"
type WorkforceTab = "rota" | "shifts" | "skills" | "tasks"

export default function MobileResourcesSurface({ embedded = false }: { embedded?: boolean } = {}) {
  const [resourceTab, setResourceTab] = useState<ResourceTab>("workforce")
  const [activeTab, setActiveTab] = useState<WorkforceTab | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchValue, setSearchValue] = useState("")

  const profile = getProfile()
  const hospitalLabel = profile?.hospital?.trim() || "Royal Free Hospital"
  const departmentLabel = (profile ? getRelevantSettings(profile) : [])[0] ?? "Operating Theatres"

  function toggle(tab: WorkforceTab) {
    setActiveTab((current) => (current === tab ? null : tab))
  }

  function toggleSearch() {
    if (showSearch) setSearchValue("")
    setShowSearch(v => !v)
  }

  return (
    <div className={embedded ? "" : "min-h-[100dvh] bg-black"}>
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
            onClick={() => { setResourceTab(tab); setActiveTab(null) }}
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

      <div className="px-4 pt-1 pb-2">
        <h1 className="text-[28px] font-semibold capitalize tracking-[-0.03em] text-white">
          {resourceTab}
        </h1>
      </div>

      {resourceTab === "workforce" ? (
        <div className="space-y-0.5 pb-28">
          <MobileAccordionSection
            label="Rota"
            summary="Department allocation, assigned sessions, and rota actions."
            open={activeTab === "rota"}
            onToggle={() => toggle("rota")}
          >
            <RotaPanel />
          </MobileAccordionSection>

          <MobileAccordionSection
            label="Shifts"
            summary="Internal and external opportunities, maps, and live shift status."
            open={activeTab === "shifts"}
            onToggle={() => toggle("shifts")}
          >
            <ShiftsPanel />
          </MobileAccordionSection>

          <MobileAccordionSection
            label="Skills"
            summary="Current sign-off status, passport view, and eligibility."
            open={activeTab === "skills"}
            onToggle={() => toggle("skills")}
          >
            <SkillsPanel />
          </MobileAccordionSection>

          <MobileAccordionSection
            label="Tasks"
            summary="Short actions tied to my shift, role, and access needs."
            open={activeTab === "tasks"}
            onToggle={() => toggle("tasks")}
          >
            <TasksPanel />
          </MobileAccordionSection>
        </div>
      ) : resourceTab === "equipment" ? (
        <div className="pb-28">
          <PlaceholderPanel
            title="Equipment"
            body="Equipment is being prepared. This page will become the place for kit readiness, tray availability, and item-level prompts that matter to the individual."
          />
        </div>
      ) : (
        <div className="pb-28">
          <PlaceholderPanel
            title="Supplies"
            body="Supplies is being prepared. This page will become the place for stock prompts, consumable readiness, and what you need to know before or during a shift."
          />
        </div>
      )}
    </div>
  )
}
