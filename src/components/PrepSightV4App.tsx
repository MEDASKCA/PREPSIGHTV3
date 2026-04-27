"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react"
import { ArrowLeft, ArrowRightLeft, CalendarClock, ChevronDown, Clock3, Link2, LogOut, MapPinned, MoreVertical, Moon, Phone, Search, Settings, ShieldCheck, Sun, Wrench, X } from "lucide-react"
import AppMenuContent from "@/components/AppMenuContent"
import MobileCommsShell from "@/components/MobileCommsShell"
import { MobileThemeProvider, useMobileTheme } from "@/lib/mobile-theme"
import AppTopBar from "@/components/AppTopBar"
import {
  BookmarkList,
  EmbeddedLibrariesDashboardMobile,
  LibraryTree,
} from "@/components/LibrariesDashboard"
import LibraryPageClient from "@/components/LibraryPageClient"
import V5CommsDesktopRail from "@/components/V5CommsDesktopRail"
import WorkspaceNavRail from "@/components/WorkspaceNavRail"
import type { WorkforceHospitalPin } from "@/components/WorkforceShiftMap"
import { getBookmarksSnapshot, subscribeBookmarks } from "@/lib/bookmarks"
import { getDesktopCommsPreference, getDesktopCommsWidth, getDesktopCommsWidthBounds, setDesktopCommsWidth, subscribeDesktopCommsPreference } from "@/lib/desktop-comms"
import { getLibrariesSnapshot, getLibraryCardsSnapshot, subscribeLibraries } from "@/lib/libraries"
import { clearProfile, getProfile, getRelevantSettings } from "@/lib/profile"
import { clearDemoSession } from "@/lib/demo-access"
import { subscribeTeams } from "@/lib/team-workspaces"
import { LOGISTICS_SECTIONS, TAB_ITEMS, UPDATES } from "@/v4/data"
import type { LogisticsKey, TabKey, UpdateKey } from "@/v4/types"
import { onAuthChange, signOut, type User } from "@/lib/auth"

type MobileResourcesTab = "workforce" | "equipment" | "supplies"
type MobileWorkforceTab = "rota" | "shifts" | "skills" | "tasks"
type MobileUtilityPage = "calendar" | "connectors" | null
type MobileCalendarView = "daily" | "weekly" | "monthly" | "quarterly"
type MobileCalendarSource = "all" | "library" | "resources" | "insights"
type MobileConnectorFilter = "connected" | "available"

const MOBILE_SOFT_SURFACE = "rounded-[20px] border border-[var(--mob-border,#BFE3EE)] bg-[var(--mob-surface,#D4EEF8)] shadow-[0_10px_24px_rgba(16,36,62,0.05)]"
const MobileWorkforceShiftMap = dynamic(() => import("@/components/WorkforceShiftMap"), { ssr: false })

function CommsFilledIcon({ size = 23 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5.003L2.5 21.5l4.497-.838A9.954 9.954 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2Z" />
    </svg>
  )
}

function LibraryFilledIcon({ size = 23 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="2" y="3" width="6" height="18" rx="1.5" />
      <rect x="10" y="3" width="3.5" height="18" rx="1" />
      <path d="M16 4.8 21.2 6.5 17.8 18.2 12.6 16.5z" />
    </svg>
  )
}

function MobileAvatar({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Profile"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2d7c97] bg-[#0b8ec0] text-sm font-medium text-white shadow-[0_10px_22px_rgba(11,142,192,0.18)]"
    >
      {label.charAt(0).toUpperCase()}
    </button>
  )
}

const MOBILE_AVATAR_COLORS = [
  "from-sky-400 to-blue-500",
  "from-purple-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
]

function SharedMobileAvatar({
  label,
  uid,
  photoURL,
  size = 40,
  onClick,
}: {
  label: string
  uid?: string
  photoURL?: string | null
  size?: number
  onClick?: () => void
}) {
  const idx = uid ? uid.charCodeAt(0) % MOBILE_AVATAR_COLORS.length : 0

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Profile"
      className="flex items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(180deg,#E5F5F8_0%,#F3F9FB_42%,#F4F7FA_100%)]"
      style={{ width: size, height: size }}
    >
      {photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoURL}
          alt={label}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${MOBILE_AVATAR_COLORS[idx]} text-sm font-medium text-white`}
        >
          {label.charAt(0).toUpperCase()}
        </div>
      )}
    </button>
  )
}

function MobileSectionHeader({
  title,
  hospital,
  department,
  onOpenProfile,
  searchValue,
  onSearchChange,
  searchPlaceholder,
}: {
  title: string
  hospital: string
  department: string
  onOpenProfile: () => void
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
}) {
  const [showSearch, setShowSearch] = useState(false)

  function toggleSearch() {
    if (showSearch) {
      onSearchChange("")
    }
    setShowSearch(v => !v)
  }

  return (
    <div className="shrink-0 bg-black px-5 pb-3" style={{ paddingTop: "calc(env(safe-area-inset-top) + 18px)" }}>
      <div className="mb-0.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-2xl tracking-tight">
          <img src="/PrepSight%20logo.png" alt="" aria-hidden="true" className="h-[54px] w-auto" />
          <span className="text-[var(--mob-accent)]">PrepSight{" "}
            <em
              className="text-[0.9em] leading-none tracking-[-0.05em] text-[var(--mob-text)]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontWeight: 500 }}
            >{title}</em>
          </span>
        </span>
        <div className="flex items-center gap-3">
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
            onClick={onOpenProfile}
            aria-label="More"
            className="text-white/80 hover:text-white"
          >
            <MoreVertical size={22} />
          </button>
        </div>
      </div>
      <div className="mt-1 flex items-center gap-2 text-[13px] text-[#888888]">
        <span>{hospital}</span>
        <span className="text-[#2d2d2d]">|</span>
        <span>{department}</span>
      </div>
      {showSearch && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[#2d2d2d] bg-[#111111] px-4 py-2">
          <Search size={14} className="shrink-0 text-[#888888]" />
          <input
            autoFocus
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="flex-1 bg-transparent text-[15px] text-[#e0e0e0] placeholder-[#555555] outline-none"
          />
          {searchValue ? (
            <button onClick={() => onSearchChange("")} className="text-[#888888]">
              <X size={14} />
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}

function MobileSubpagePills<T extends string>({
  items,
  active,
  onChange,
}: {
  items: Array<{ key: T; label: string }>
  active: T
  onChange: (key: T) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors ${
            active === item.key ? "bg-[var(--mob-accent)] text-white" : "text-[var(--mob-text-2)] hover:text-[var(--mob-text)]"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function MobileLabeledPills<T extends string>({
  label,
  items,
  active,
  onChange,
}: {
  label: string
  items: Array<{ key: T; label: string }>
  active: T
  onChange: (key: T) => void
}) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto px-5 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <span className="shrink-0 text-[13px] text-[var(--mob-text-2)]">{label}</span>
      <div className="flex gap-2">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors ${
              active === item.key ? "bg-[var(--mob-accent)] text-white" : "text-[var(--mob-text-2)] hover:text-[var(--mob-text)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

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
    <div className="flex items-center justify-between gap-3 px-5 py-1">
      <span className="shrink-0 text-[13px] text-[var(--mob-text-2)]">{label}</span>
      <div className="relative min-w-[160px]">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          className="w-full appearance-none rounded-full border border-[var(--mob-border)] bg-[var(--mob-surface)] px-4 py-2 pr-10 text-sm text-[var(--mob-text)] outline-none"
        >
          {items.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6C8A99]" />
      </div>
    </div>
  )
}

function MobileWorkforcePanel() {
  const rotaItems = [
    {
      day: "Today",
      time: "07:30 - 18:00",
      area: "Theatre 1",
      specialty: "Trauma and orthopaedics",
      detail: "Primary knee replacement list • scrub cover",
      contact: "Lisa Warren",
      phone: "020 7794 0500",
    },
    {
      day: "Tomorrow",
      time: "08:00 - 16:30",
      area: "Recovery",
      specialty: "General surgery",
      detail: "Late list support and handover cover",
      contact: "Daniel Shah",
      phone: "020 7794 0555",
    },
  ]

  const rotaActions = [
    { title: "Offer a shift swap", description: "Swap an assigned rota slot with another substantive member.", icon: ArrowRightLeft },
    { title: "Request leave", description: "Submit leave against the rota and staffing view.", icon: CalendarClock },
    { title: "Update availability", description: "Tell the rota team when you cannot be allocated.", icon: Clock3 },
  ]

  return (
    <div className="space-y-4 px-4 pb-4">
      <section className="rounded-[22px] border border-[#D6E7EE] bg-white/92 p-5 shadow-[0_16px_34px_rgba(16,36,62,0.08)]">
        <p className="text-[14px] text-[#5B7A8A]">Resources</p>
        <h2 className="mt-1 text-[28px] tracking-[-0.04em] text-[#10243E]">Workforce</h2>
        <p className="mt-3 text-[14px] leading-7 text-[#61758B]">
          See where you are working, who allocated you, and what can be changed in your rota.
        </p>
      </section>

      <div className="space-y-3">
        {rotaItems.map((item) => (
          <div key={`${item.day}-${item.area}`} className="rounded-[22px] border border-[#D6E7EE] bg-white/92 p-4 shadow-[0_16px_34px_rgba(16,36,62,0.08)]">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[20px] tracking-[-0.04em] text-[#10243E]">{item.day}</h3>
              <span className="rounded-full bg-[#EEF8FF] px-3 py-1.5 text-[12px] text-[#1B86AE]">{item.time}</span>
            </div>
            <p className="mt-3 text-[17px] text-[#15364D]">{item.area}</p>
            <p className="mt-1 text-[14px] text-[#61758B]">{item.specialty}</p>
            <p className="mt-3 text-[14px] leading-7 text-[#486579]">{item.detail}</p>
            <div className="mt-4 rounded-[18px] border border-[#E8F0F4] bg-[#FBFDFF] p-4">
              <div className="flex items-center gap-2">
                <MapPinned size={15} className="text-[#1b86ae]" />
                <p className="text-[13px] text-[#7A98AA]">Allocation contact</p>
              </div>
              <p className="mt-3 text-[15px] text-[#15364D]">{item.contact}</p>
              <div className="mt-2 flex items-center gap-2 text-[13px] text-[#61758B]">
                <Phone size={14} className="text-[#1b86ae]" />
                {item.phone}
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-[22px] border border-[#D6E7EE] bg-white/92 p-4 shadow-[0_16px_34px_rgba(16,36,62,0.08)]">
        <h3 className="text-[20px] tracking-[-0.04em] text-[#10243E]">Rota actions</h3>
        <div className="mt-4 space-y-3">
          {rotaActions.map((action) => {
            const Icon = action.icon
            return (
              <button key={action.title} className="flex w-full items-start gap-3 rounded-[18px] border border-[#E8F0F4] bg-[#FBFDFF] px-4 py-4 text-left">
                <span className="mt-0.5 rounded-full bg-[#EEF8FF] p-2 text-[#1b86ae]">
                  <Icon size={16} />
                </span>
                <span>
                  <span className="block text-[15px] text-[#15364D]">{action.title}</span>
                  <span className="mt-1 block text-[13px] leading-6 text-[#61758B]">{action.description}</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function MobileWorkforceRotaPanel() {
  const rotaItems = [
    {
      day: "Today",
      time: "07:30 - 18:00",
      area: "Theatre 1",
      specialty: "Trauma and orthopaedics",
      detail: "Primary knee replacement list • scrub cover",
      contact: "Lisa Warren",
      phone: "020 7794 0500",
    },
    {
      day: "Tomorrow",
      time: "08:00 - 16:30",
      area: "Recovery",
      specialty: "General surgery",
      detail: "Late list support and handover cover",
      contact: "Daniel Shah",
      phone: "020 7794 0555",
    },
  ]

  const rotaActions = [
    { title: "Offer a shift swap", description: "Swap an assigned rota slot with another substantive member.", icon: ArrowRightLeft },
    { title: "Request leave", description: "Submit leave against the rota and staffing view.", icon: CalendarClock },
    { title: "Update availability", description: "Tell the rota team when you cannot be allocated.", icon: Clock3 },
  ]

  return (
    <div className="space-y-4">
      <section className={`${MOBILE_SOFT_SURFACE} p-4`}>
        <h2 className="text-[24px] tracking-[-0.04em] text-[#10243E]">Rota</h2>
      </section>

      <div className="space-y-3">
        {rotaItems.map((item) => (
          <div key={`${item.day}-${item.area}`} className={`${MOBILE_SOFT_SURFACE} p-4`}>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[18px] tracking-[-0.04em] text-[#10243E]">{item.day}</h3>
              <span className="rounded-full bg-[#EEF8FF] px-3 py-1.5 text-[12px] text-[#1B86AE]">{item.time}</span>
            </div>
            <p className="mt-2 text-[16px] text-[#15364D]">{item.area}</p>
            <p className="mt-1 text-[13px] text-[#61758B]">{item.specialty}</p>
            <p className="mt-2 text-[13px] leading-6 text-[#486579]">{item.detail}</p>
            <div className="mt-3 rounded-[16px] border border-[#BFE3EE] bg-[#E3F4FB] p-3">
              <div className="flex items-center gap-2">
                <MapPinned size={15} className="text-[#1b86ae]" />
                <p className="text-[13px] text-[#7A98AA]">Allocation contact</p>
              </div>
              <p className="mt-3 text-[15px] text-[#15364D]">{item.contact}</p>
              <div className="mt-2 flex items-center gap-2 text-[13px] text-[#61758B]">
                <Phone size={14} className="text-[#1b86ae]" />
                {item.phone}
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className={`${MOBILE_SOFT_SURFACE} p-4`}>
        <h3 className="text-[18px] tracking-[-0.04em] text-[#10243E]">Rota actions</h3>
        <div className="mt-3 space-y-2">
          {rotaActions.map((action) => {
            const Icon = action.icon
            return (
              <button key={action.title} className="flex w-full items-start gap-3 rounded-[16px] border border-[#BFE3EE] bg-[#E3F4FB] px-3 py-3 text-left">
                <span className="mt-0.5 rounded-full bg-[#EEF8FF] p-2 text-[#1b86ae]">
                  <Icon size={16} />
                </span>
                <span>
                  <span className="block text-[15px] text-[#15364D]">{action.title}</span>
                  <span className="mt-1 block text-[12px] leading-5 text-[#61758B]">{action.description}</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function MobileWorkforceShiftsPanel() {
  const shiftTypeFilters = ["Internal", "External"] as const
  const shiftModeFilters = ["Map", "Feed"] as const
  const [shiftType, setShiftType] = useState<(typeof shiftTypeFilters)[number]>("Internal")
  const [shiftMode, setShiftMode] = useState<(typeof shiftModeFilters)[number]>("Map")
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null)
  const [hoveredHospitalId, setHoveredHospitalId] = useState<string | null>(null)

  const shiftHospitals = [
    {
      id: "royal-free-hospital",
      type: "Internal" as const,
      hospital: "Royal Free Hospital",
      distanceMiles: 2.5,
      contactNumber: "020 7794 0500",
      position: [51.5539, -0.1644] as [number, number],
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
      shifts: [],
    },
  ]

  const visibleHospitals = shiftHospitals.filter((hospital) => hospital.type === shiftType)
  const pins: WorkforceHospitalPin[] = visibleHospitals.map((hospital) => ({
    id: hospital.id,
    hospital: hospital.hospital,
    distanceMiles: hospital.distanceMiles,
    contactNumber: hospital.contactNumber,
    shiftCount: hospital.shifts.length,
    strongestFit:
      hospital.shifts.length === 0
        ? "none"
        : hospital.type === "Internal"
          ? "strong fit"
          : "good fit",
    position: hospital.position,
  }))
  const selectedHospital = selectedHospitalId
    ? visibleHospitals.find((hospital) => hospital.id === selectedHospitalId) ?? null
    : null
  const statuses = [
    {
      state: "Booked",
      hospital: "Royal London Hospital",
      shift: "Bank theatre support • 07:00 - 15:30",
      contact: "Approved by Farah Khan",
      phone: "020 7794 0612",
    },
    {
      state: "Awaiting confirmation",
      hospital: "St George's Hospital",
      shift: "Anaesthetics cover • 19:00 - 07:00",
      contact: "Waiting on Michael Reed",
      phone: "020 7794 0840",
    },
    {
      state: "Shift offer",
      hospital: "Royal Free Hospital",
      shift: "Weekend list support • 08:00 - 14:00",
      contact: "Offered by Priya Patel",
      phone: "020 7794 0991",
    },
  ]

  return (
    <div className="space-y-4">
      <div className="space-y-0">
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
        <div className="space-y-3">
          <section className={`${MOBILE_SOFT_SURFACE} overflow-hidden p-0`}>
            <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
              <div>
                <h3 className="text-[18px] tracking-[-0.03em] text-[#10243E]">Hospital map</h3>
                <p className="mt-1 text-[12px] text-[#61758B]">Start with the hospital. Then open the shifts inside it.</p>
              </div>
              <span className="shrink-0 rounded-full bg-[#EEF8FF] px-3 py-1.5 text-[12px] text-[#1B86AE]">
                {visibleHospitals.length} {visibleHospitals.length === 1 ? "hospital" : "hospitals"}
              </span>
            </div>
            <div className="border-t border-[#BFE3EE] [&_.leaflet-container]:h-[380px]">
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
          </section>

          <div className="space-y-2">
            {(selectedHospital ? [selectedHospital] : visibleHospitals).map((hospital) => (
              <div key={hospital.id} className={`${MOBILE_SOFT_SURFACE} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[16px] text-[#15364D]">{hospital.hospital}</h3>
                    <p className="mt-1 text-[12px] text-[#61758B]">{hospital.distanceMiles} miles away</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] ${
                      hospital.shifts.length > 0 ? "bg-[#E8FBF6] text-[#138a73]" : "bg-[#EFF3F6] text-[#6E7E8B]"
                    }`}
                  >
                    {hospital.shifts.length > 0 ? `${hospital.shifts.length} shifts` : "No shifts"}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {hospital.shifts.length > 0 ? (
                    hospital.shifts.map((shift) => (
                      <div key={`${hospital.id}-${shift.title}`} className="rounded-[16px] border border-[#BFE3EE] bg-[#E3F4FB] px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[14px] text-[#15364D]">{shift.title}</p>
                            <p className="mt-1 text-[12px] text-[#61758B]">{shift.contact}</p>
                          </div>
                          <span className="shrink-0 text-[11px] text-[#7A98AA]">{shift.state}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[12px] text-[#61758B]">
                          <Phone size={13} className="text-[#1b86ae]" />
                          {shift.phone}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[16px] border border-dashed border-[#BFE3EE] px-3 py-3 text-[13px] text-[#6E7E8B]">
                      No available shifts here right now.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className={`space-y-3 ${shiftMode === "Feed" ? "" : "hidden"}`}>
        {statuses.map((item) => (
          <div key={`${item.state}-${item.hospital}`} className={`${MOBILE_SOFT_SURFACE} p-4`}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[16px] tracking-[-0.03em] text-[#10243E]">{item.state}</h3>
              <span className="rounded-full bg-[#EEF8FF] px-3 py-1.5 text-[12px] text-[#1B86AE]">{item.hospital}</span>
            </div>
            <p className="mt-2 text-[14px] text-[#15364D]">{item.shift}</p>
            <p className="mt-1 text-[12px] text-[#61758B]">{item.contact}</p>
            <div className="mt-2 flex items-center gap-2 text-[13px] text-[#61758B]">
              <Phone size={14} className="text-[#1b86ae]" />
              {item.phone}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MobileWorkforceSkillsPanel() {
  const skills = [
    { title: "Trauma and orthopaedics", level: "Signed off", detail: "Eligible for matched bank shifts" },
    { title: "General surgery", level: "Current", detail: "Can be booked into routine list support" },
    { title: "Vascular", level: "Supervised", detail: "Visible but requires allocation review" },
  ]

  return (
    <div className="space-y-4">
      <section className={`${MOBILE_SOFT_SURFACE} p-4`}>
        <h2 className="text-[24px] tracking-[-0.04em] text-[#10243E]">Skills</h2>
      </section>

      <div className="space-y-3">
        {skills.map((skill) => (
          <div key={skill.title} className={`${MOBILE_SOFT_SURFACE} p-4`}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[16px] tracking-[-0.03em] text-[#10243E]">{skill.title}</h3>
              <span className="rounded-full bg-[#EEF8FF] px-3 py-1.5 text-[12px] text-[#1B86AE]">{skill.level}</span>
            </div>
            <p className="mt-2 text-[13px] leading-6 text-[#61758B]">{skill.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function MobileWorkforceTasksPanel() {
  const tasks = [
    { title: "Acknowledge airway card update", meta: "Requested by theatre education lead • due today" },
    { title: "Confirm weekend availability", meta: "Needed for rota planning • due 18:00" },
    { title: "Review bank shift offer", meta: "Royal London Hospital • expires tomorrow" },
  ]

  return (
    <div className="space-y-4">
      <section className={`${MOBILE_SOFT_SURFACE} p-4`}>
        <h2 className="text-[24px] tracking-[-0.04em] text-[#10243E]">Tasks</h2>
      </section>

      <div className="space-y-3">
        {tasks.map((task) => (
          <div key={task.title} className={`${MOBILE_SOFT_SURFACE} p-4`}>
            <h3 className="text-[16px] tracking-[-0.03em] text-[#10243E]">{task.title}</h3>
            <p className="mt-2 text-[13px] leading-6 text-[#61758B]">{task.meta}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function MobilePreparedPanel({
  title,
  body,
  icon,
}: {
  title: string
  body: string
  icon: "equipment" | "supplies"
}) {
  const Icon = icon === "equipment" ? Wrench : ShieldCheck
  return (
    <div className="space-y-4 px-4 pb-4">
      <section className="rounded-[22px] border border-[#D6E7EE] bg-white/92 p-5 shadow-[0_16px_34px_rgba(16,36,62,0.08)]">
        <div className="flex items-center gap-2">
          <Icon size={17} className="text-[#1b86ae]" />
          <p className="text-[14px] text-[#5B7A8A]">Resources</p>
        </div>
        <h2 className="mt-2 text-[28px] tracking-[-0.04em] text-[#10243E]">{title}</h2>
      </section>
    </div>
  )
}

const MOBILE_CALENDAR_EVENTS = [
  { id: "cal-1", title: "Morning shift", meta: "Royal Free Hospital • 07:30 - 16:00", day: "25", month: "Apr", source: "resources" as const },
  { id: "cal-2", title: "TKR card review", meta: "Library review • 11:00 - 11:30", day: "25", month: "Apr", source: "library" as const },
  { id: "cal-3", title: "Readiness checkpoint", meta: "Insights • 13:30 - 14:00", day: "25", month: "Apr", source: "insights" as const },
  { id: "cal-4", title: "Weekend availability", meta: "Resources • due 18:00", day: "26", month: "Apr", source: "resources" as const },
  { id: "cal-5", title: "Loan kit delivery", meta: "Resources • Theatre 3", day: "27", month: "Apr", source: "resources" as const },
  { id: "cal-6", title: "Quarter content freeze", meta: "Library • all day", day: "14", month: "May", source: "library" as const },
]

function MobileCalendarSurface({
  view,
  onChangeView,
}: {
  view: MobileCalendarView
  onChangeView: (view: MobileCalendarView) => void
}) {
  const [source, setSource] = useState<MobileCalendarSource>("all")
  const [selectedDay, setSelectedDay] = useState("25 Apr")
  const pills: Array<{ key: MobileCalendarView; label: string }> = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
    { key: "quarterly", label: "Quarterly" },
  ]

  const sourceColors: Record<Exclude<MobileCalendarSource, "all">, string> = {
    library: "bg-[#25a8d8]",
    resources: "bg-[#1eb89b]",
    insights: "bg-[#e2b738]",
  }

  const sourceLabels: Record<Exclude<MobileCalendarSource, "all">, string> = {
    library: "Library",
    resources: "Resources",
    insights: "Insights",
  }

  const visibleEvents = MOBILE_CALENDAR_EVENTS.filter((event) => {
    if (source === "all") return true
    return event.source === source
  })

  const dayEvents = visibleEvents.filter((event) => `${event.day} ${event.month}` === selectedDay)
  const weeklyDays = ["25 Apr", "26 Apr", "27 Apr", "28 Apr", "29 Apr"]
  const monthlyHighlights = [
    { day: 5, count: 1, source: "resources" as const },
    { day: 6, count: 2, source: "insights" as const },
    { day: 12, count: 1, source: "library" as const },
    { day: 14, count: 1, source: "library" as const },
    { day: 21, count: 2, source: "resources" as const },
    { day: 25, count: 1, source: "resources" as const },
  ]

  return (
    <div className="space-y-4">
      <MobileSubpagePills items={pills} active={view} onChange={onChangeView} />
      <MobileSubpagePills
        items={[
          { key: "all", label: "All" },
          { key: "library", label: "Library" },
          { key: "resources", label: "Resources" },
          { key: "insights", label: "Insights" },
        ]}
        active={source}
        onChange={setSource}
      />

      <div className="px-4 pb-4">
        {view === "daily" ? (
          <div className="space-y-3">
            <div className="overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex gap-2">
                {weeklyDays.map((dayLabel) => {
                  const isActive = dayLabel === selectedDay
                  const [day, month] = dayLabel.split(" ")
                  const count = visibleEvents.filter((event) => event.day === day && event.month === month).length

                  return (
                    <button
                      key={dayLabel}
                      type="button"
                      onClick={() => setSelectedDay(dayLabel)}
                      className={`min-w-[72px] rounded-[18px] px-3 py-3 text-left transition ${
                        isActive ? "bg-[#1497c8] text-white" : "bg-white/92 text-[#15364D]"
                      }`}
                    >
                      <p className="text-[12px]">{month}</p>
                      <p className="mt-1 text-[22px] leading-none">{day}</p>
                      <p className={`mt-2 text-[11px] ${isActive ? "text-white/80" : "text-[#7A98AA]"}`}>
                        {count === 0 ? "No items" : `${count} items`}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="rounded-[22px] border border-[#D6E7EE] bg-white/92 p-4 shadow-[0_16px_34px_rgba(16,36,62,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] text-[#5B7A8A]">Selected day</p>
                  <h3 className="mt-1 text-[24px] tracking-[-0.04em] text-[#10243E]">{selectedDay}</h3>
                </div>
                <span className="rounded-full bg-[#EEF8FF] px-3 py-1.5 text-[12px] text-[#1B86AE]">
                  {dayEvents.length === 0 ? "No items" : `${dayEvents.length} items`}
                </span>
              </div>
            </div>

            {dayEvents.length > 0 ? (
              dayEvents.map((event) => (
                <div key={event.id} className="rounded-[20px] border border-[#D6E7EE] bg-white/92 px-4 py-3 shadow-[0_14px_28px_rgba(16,36,62,0.07)]">
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 h-2.5 w-2.5 rounded-full ${sourceColors[event.source]}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[17px] tracking-[-0.03em] text-[#10243E]">{event.title}</h3>
                        <span className="shrink-0 text-[11px] text-[#7A98AA]">{sourceLabels[event.source]}</span>
                      </div>
                      <p className="mt-1 text-[14px] text-[#61758B]">{event.meta}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-dashed border-[#C9E3EC] px-4 py-5 text-[14px] text-[#6B8797]">
                Nothing is scheduled here yet.
              </div>
            )}
          </div>
        ) : view === "weekly" ? (
          <div className="space-y-3">
            <div className="overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex gap-2">
                {["Fri 25", "Sat 26", "Sun 27", "Mon 28", "Tue 29"].map((label, index) => (
                  <div
                    key={label}
                    className={`min-w-[78px] rounded-[18px] border px-3 py-3 text-center ${
                      index === 0 ? "border-[#1497c8] bg-[#1497c8] text-white" : "border-[#D6E7EE] bg-white/92 text-[#15364D]"
                    }`}
                  >
                    <p className="text-[13px]">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {visibleEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="rounded-[20px] border border-[#D6E7EE] bg-white/92 px-4 py-3 shadow-[0_14px_28px_rgba(16,36,62,0.07)]">
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 h-2.5 w-2.5 rounded-full ${sourceColors[event.source]}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-[16px] tracking-[-0.03em] text-[#10243E]">{event.title}</h3>
                        <span className="text-[11px] text-[#7A98AA]">{event.day} {event.month}</span>
                      </div>
                      <p className="mt-1 text-[14px] text-[#61758B]">{event.meta}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : view === "monthly" ? (
          <div className="rounded-[22px] border border-[#D6E7EE] bg-white/92 p-4 shadow-[0_16px_34px_rgba(16,36,62,0.08)]">
            <div className="mb-4 flex items-center justify-between">
              <button className="rounded-full border border-[#D6E7EE] bg-[#F8FCFD] p-2 text-[#5B7A8A]">
                <ArrowLeft size={16} />
              </button>
              <h3 className="text-[22px] tracking-[-0.04em] text-[#10243E]">May 2026</h3>
              <button className="rounded-full border border-[#D6E7EE] bg-[#F8FCFD] p-2 text-[#5B7A8A]">
                <ArrowLeft size={16} className="rotate-180" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-[11px] text-[#7A98AA]">
              {["M","T","W","T","F","S","S"].map((day) => <div key={day}>{day}</div>)}
            </div>
            <div className="mt-3 grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }, (_, index) => index + 1).map((day) => (
                <div key={day} className={`min-h-[44px] rounded-[14px] border px-2 py-2 text-[12px] ${day === 14 ? "border-[#1497c8] bg-[#EEF8FF] text-[#1497c8]" : "border-[#E8F0F4] bg-white text-[#15364D]"}`}>
                  <div className="flex items-start justify-between">
                    <span>{day}</span>
                    {monthlyHighlights.find((entry) => entry.day === day) ? (
                      <span className={`h-2 w-2 rounded-full ${sourceColors[monthlyHighlights.find((entry) => entry.day === day)!.source]}`} />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {monthlyHighlights.slice(0, 3).map((entry) => (
                <div key={entry.day} className="flex items-center justify-between rounded-[16px] bg-[#F7FBFD] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${sourceColors[entry.source]}`} />
                    <span className="text-[14px] text-[#15364D]">{entry.day} May</span>
                  </div>
                  <span className="text-[12px] text-[#7A98AA]">{entry.count} scheduled</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { month: "April", detail: "3 scheduled markers", note: "Shifts, reviews, and one readiness checkpoint" },
              { month: "May", detail: "2 key review points", note: "Quarter content freeze and service review" },
              { month: "June", detail: "1 planning milestone", note: "Capacity planning review in week 3" },
            ].map((month) => (
              <div key={month.month} className="rounded-[20px] border border-[#D6E7EE] bg-white/92 px-4 py-4 shadow-[0_14px_28px_rgba(16,36,62,0.07)]">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[20px] tracking-[-0.04em] text-[#10243E]">{month.month}</h3>
                  <span className="rounded-full bg-[#EEF8FF] px-3 py-1.5 text-[12px] text-[#1B86AE]">{month.detail}</span>
                </div>
                <p className="mt-2 text-[14px] text-[#61758B]">{month.note}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MobileConnectorsSurface() {
  const [filter, setFilter] = useState<MobileConnectorFilter>("connected")
  const connectors = [
    { title: "ESR / Workforce", detail: "Sync staff records, shifts, and assignment context.", state: "connected", note: "Last sync 14 min ago" },
    { title: "Rostering systems", detail: "Import rota data and confirm staffing allocations.", state: "available", note: "Ready to connect" },
    { title: "Procurement / stock", detail: "Link supplies and equipment availability into Resources.", state: "available", note: "Ready to connect" },
    { title: "Outlook calendar", detail: "Pull personal and team events into your PrepSight calendar.", state: "connected", note: "Two calendars visible" },
  ]

  const visibleConnectors = connectors.filter((connector) => connector.state === filter)

  return (
    <div className="space-y-4">
      <MobileSubpagePills
        items={[
          { key: "connected", label: "Connected" },
          { key: "available", label: "Available" },
        ]}
        active={filter}
        onChange={setFilter}
      />
      <div className="space-y-2 px-4 pb-4">
        {visibleConnectors.map((connector) => (
          <button
            key={connector.title}
            type="button"
            className="flex w-full items-start gap-3 rounded-[20px] border border-[#D6E7EE] bg-white/92 px-4 py-4 text-left shadow-[0_14px_28px_rgba(16,36,62,0.07)]"
          >
            <span className="mt-0.5 rounded-full bg-[#EEF8FF] p-2 text-[#1b86ae]">
              <Link2 size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-3">
                <span className="text-[17px] tracking-[-0.03em] text-[#10243E]">{connector.title}</span>
                <span className={`rounded-full px-3 py-1 text-[11px] ${connector.state === "connected" ? "bg-[#E8FBF6] text-[#138a73]" : "bg-[#EEF8FF] text-[#1B86AE]"}`}>
                  {connector.state}
                </span>
              </span>
              <span className="mt-1 block text-[14px] text-[#61758B]">{connector.detail}</span>
              <span className="mt-2 block text-[12px] text-[#8AA3B2]">{connector.note}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function MobileSharedProfileDrawer({
  open,
  onClose,
  profileInitial,
  displayName,
  roleLabel,
  email,
  photoURL,
  hospital,
  department,
  onSignOut,
  onOpenCalendar,
  onOpenConnectors,
  onSwitchWorkspace,
}: {
  open: boolean
  onClose: () => void
  profileInitial: string
  displayName: string
  roleLabel: string
  email: string
  photoURL?: string | null
  hospital: string
  department: string
  onSignOut: () => Promise<void>
  onOpenCalendar: () => void
  onOpenConnectors: () => void
  onSwitchWorkspace: () => void
}) {
  const { theme, toggle } = useMobileTheme()
  if (!open) return null

  return (
    <div className="absolute inset-0 z-30 lg:hidden">
      <div className="absolute inset-0 bg-[rgba(145,182,196,0.22)]" onClick={onClose} />
      <div
        className="fixed inset-y-0 right-0 z-30 flex h-[100dvh] w-72 flex-col rounded-l-[34px] rounded-r-none border-l border-[rgba(126,196,214,0.78)] bg-[linear-gradient(180deg,rgba(188,228,239,0.98)_0%,rgba(207,236,245,0.96)_46%,rgba(196,231,241,0.99)_100%)] shadow-[-12px_0_28px_rgba(23,109,140,0.12)] backdrop-blur-[12px]"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="border-b border-[rgba(137,193,210,0.34)] px-5 pt-12 pb-6">
          <div className="mb-6 flex items-center justify-between">
            <span className="text-[#176d8c]">Profile</span>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#0085B2] bg-[#0096C7] text-white shadow-[0_10px_24px_rgba(0,150,199,0.24)] transition-colors hover:bg-[#0085B2]"
              aria-label="Close profile"
            >
              <X size={22} strokeWidth={2.2} />
            </button>
          </div>
          <div className="flex flex-col items-center">
            <SharedMobileAvatar label={profileInitial} photoURL={photoURL} size={70} />
            <p className="mt-3 text-[15px] text-[#154b5f]">{displayName}</p>
            <p className="mt-1 text-sm text-[#1b86ae]">{roleLabel}</p>
            <p className="mt-1 text-sm text-[#7a9aa8]">{email}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-sm text-emerald-400">Online</span>
            </div>
          </div>
        </div>
        <div className="border-b border-[rgba(137,193,210,0.34)] px-5 py-4">
          <p className="mb-3 text-xs tracking-widest text-[#7fa9b8]">workspace</p>
          <p className="text-[15px] text-[#154b5f]">{hospital}</p>
          <p className="mt-1 text-sm text-[#5d8797]">{department}</p>
        </div>
        <div className="flex flex-1 flex-col gap-1 px-5 py-4">
          <button onClick={onOpenCalendar} className="flex items-center gap-3 py-3.5 text-[15px] text-[#527786]">
            <CalendarClock size={18} /> Calendar
          </button>
          <button onClick={onOpenConnectors} className="flex items-center gap-3 py-3.5 text-[15px] text-[#527786]">
            <Link2 size={18} /> Connectors
          </button>
          <button className="flex items-center gap-3 py-3.5 text-[15px] text-[#527786]">
            <Settings size={18} /> Settings
          </button>
          <button type="button" onClick={toggle} className="flex items-center gap-3 py-3.5 text-[15px] text-[#527786]">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button type="button" onClick={onSwitchWorkspace} className="flex items-center gap-3 py-3.5 text-[15px] text-[#527786]">
            <ChevronDown size={18} /> Switch workspace
          </button>
          <button onClick={() => void onSignOut()} className="mt-2 flex items-center gap-3 py-3.5 text-[15px] text-red-400">
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

function formatLibraryTypeLabel(library: { libraryType: "shared" | "local"; ownerName: string }) {
  return library.libraryType === "shared" ? "PrepSight library" : `${library.ownerName} library`
}

function formatLibraryOwnerLabel(library: {
  libraryType: "shared" | "local"
  ownerName: string
  ownerPublicAlias?: string
}) {
  return library.libraryType === "shared"
    ? library.ownerPublicAlias?.trim() || library.ownerName
    : library.ownerName
}

function ResourcesPanel({
  activeKey,
  onSelect,
}: {
  activeKey: LogisticsKey | null
  onSelect: (key: LogisticsKey) => void
}) {
  const activeSection = LOGISTICS_SECTIONS.find((section) => section.key === activeKey) ?? LOGISTICS_SECTIONS[0]

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className="rounded-[20px] border border-[#D6E7EE] bg-white p-4 shadow-[0_16px_34px_rgba(16,36,62,0.08)]">
        <p className="text-[14px] text-[#5B7A8A]">Resources</p>
        <h2 className="mt-1 text-[28px] tracking-[-0.04em] text-[#10243E]">Operational workspace</h2>
        <div className="mt-4 space-y-3">
          {LOGISTICS_SECTIONS.map((section) => {
            const selected = section.key === activeSection.key
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => onSelect(section.key)}
                className={`w-full rounded-[18px] border px-4 py-4 text-left transition-colors ${
                  selected
                    ? "border-[#8BCBE5] bg-[#F2FBFE]"
                    : "border-[#E3EDF2] bg-[#FBFDFF] hover:bg-[#F5FAFC]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[17px] font-medium tracking-[-0.02em] text-[#10243E]">{section.title}</p>
                    <p className="mt-1 text-[14px] text-[#61758B]">{section.detail}</p>
                  </div>
                  {selected ? (
                    <span className="rounded-full bg-[#0096C7] px-2.5 py-1 text-[11px] font-medium text-white">
                      Open
                    </span>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-[20px] border border-[#D6E7EE] bg-white p-4 shadow-[0_16px_34px_rgba(16,36,62,0.08)]">
        <div
          className="rounded-[18px] px-4 py-4"
          style={{ background: `linear-gradient(180deg, ${activeSection.tone} 0%, #F7FCFE 100%)` }}
        >
          <p className="text-[13px] uppercase tracking-[0.16em] text-[#4F6980]">Current focus</p>
          <h3 className="mt-2 text-[24px] tracking-[-0.04em] text-[#10243E]">{activeSection.title}</h3>
          <p className="mt-2 text-[15px] leading-6 text-[#35516A]">{activeSection.detail}</p>
        </div>

        <div className="mt-4 space-y-3">
          {activeSection.rows.map((row) => (
            <div
              key={row.title}
              className="rounded-[18px] border border-[#E3EDF2] bg-[#FBFDFF] px-4 py-4"
            >
              <p className="text-[16px] font-medium text-[#10243E]">{row.title}</p>
              <p className="mt-1 text-[14px] leading-6 text-[#61758B]">{row.meta}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function UpdatesPanel({
  activeKey,
  onSelect,
  surfaceLabel = "Updates",
}: {
  activeKey: UpdateKey | null
  onSelect: (key: UpdateKey) => void
  surfaceLabel?: string
}) {
  const activeUpdate = UPDATES.find((update) => update.key === activeKey) ?? UPDATES[0]

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className="rounded-[20px] border border-[#D6E7EE] bg-white p-4 shadow-[0_16px_34px_rgba(16,36,62,0.08)]">
        <p className="text-[14px] text-[#5B7A8A]">{surfaceLabel}</p>
        <h2 className="mt-1 text-[28px] tracking-[-0.04em] text-[#10243E]">Latest changes</h2>
        <div className="mt-4 space-y-3">
          {UPDATES.map((update) => {
            const selected = update.key === activeUpdate.key
            return (
              <button
                key={update.key}
                type="button"
                onClick={() => onSelect(update.key)}
                className={`w-full rounded-[18px] border px-4 py-4 text-left transition-colors ${
                  selected
                    ? "border-[#8BCBE5] bg-[#F2FBFE]"
                    : "border-[#E3EDF2] bg-[#FBFDFF] hover:bg-[#F5FAFC]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[17px] font-medium tracking-[-0.02em] text-[#10243E]">{update.title}</p>
                    <p className="mt-1 text-[14px] text-[#61758B]">{update.detail}</p>
                  </div>
                  <span className="text-[12px] text-[#7A90A4]">{update.time}</span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-[20px] border border-[#D6E7EE] bg-white p-4 shadow-[0_16px_34px_rgba(16,36,62,0.08)]">
        <p className="text-[13px] uppercase tracking-[0.16em] text-[#4F6980]">Selected update</p>
        <h3 className="mt-2 text-[24px] tracking-[-0.04em] text-[#10243E]">{activeUpdate.title}</h3>
        <p className="mt-2 text-[14px] text-[#61758B]">{activeUpdate.detail}</p>
        <div className="mt-4 rounded-[18px] border border-[#E3EDF2] bg-[#FBFDFF] px-4 py-4">
          <p className="text-[15px] leading-7 text-[#35516A]">{activeUpdate.body}</p>
        </div>
      </section>
    </div>
  )
}

function LibraryOverview({
  query,
  selectedLibraryId,
  onSelectLibrary,
  onBackToCollections,
}: {
  query: string
  selectedLibraryId: string | null
  onSelectLibrary: (libraryId: string) => void
  onBackToCollections: () => void
}) {
  const libraries = useSyncExternalStore(
    subscribeLibraries,
    getLibrariesSnapshot,
    getLibrariesSnapshot,
  )
  const bookmarks = useSyncExternalStore(
    subscribeBookmarks,
    getBookmarksSnapshot,
    getBookmarksSnapshot,
  )
  useSyncExternalStore(subscribeTeams, () => 0, () => 0)

  const profile = getProfile()
  const workspaceLabel = useMemo(() => {
    const settings = profile ? getRelevantSettings(profile) : []
    return settings[0] ?? "Operating Theatre"
  }, [profile])

  const [globalOpen, setGlobalOpen] = useState(true)
  const [localOpen, setLocalOpen] = useState(true)

  const { filteredLibraries, totalCards } = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const orderedLibraries = [...libraries].sort((left, right) => {
      if (left.libraryType !== right.libraryType) {
        return left.libraryType === "shared" ? -1 : 1
      }

      return left.name.localeCompare(right.name)
    })

    const filtered = normalizedQuery
      ? orderedLibraries.filter((library) =>
          `${library.name} ${formatLibraryOwnerLabel(library)} ${library.description ?? ""}`
            .toLowerCase()
            .includes(normalizedQuery),
        )
      : orderedLibraries

    return {
      filteredLibraries: filtered,
      totalCards: libraries.reduce((sum, library) => sum + getLibraryCardsSnapshot(library.id).length, 0),
    }
  }, [libraries, query])

  const filteredGlobalLibraries = filteredLibraries.filter(
    (library) => library.libraryType === "shared" && library.name === workspaceLabel,
  )
  const filteredLocalLibraries = filteredLibraries.filter((library) => library.libraryType === "local")
  const localCollectionsTitle = filteredLocalLibraries.length === 1 ? "My Group" : "My Groups"

  if (selectedLibraryId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToCollections}
            className="rounded-[12px] border border-[#2d2d2d] bg-[#202020] px-3 py-2 text-[14px] text-[#e0e0e0]"
          >
            Back to collections
          </button>
          <p className="text-[14px] text-[#888888]">Library detail</p>
        </div>
        <LibraryPageClient libraryId={selectedLibraryId} embedded />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="p-4">
        <p className="text-[11px] text-[#888888]">Workspace</p>
        <h1 className="mt-1 text-[20px] tracking-[-0.03em] text-white">{workspaceLabel}</h1>
        <p className="mt-1 text-[13px] text-[#888888]">
          {libraries.length} collections · {totalCards} procedure cards
        </p>
      </section>

      <section className="p-4">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-[16px] font-medium tracking-[-0.02em] text-white">Collections</h2>
          <Link href="/" className="text-[14px] text-[#0096C7]">
            Request access
          </Link>
        </div>

        <LibraryTree
          title="Community"
          tone="global"
          open={globalOpen}
          onToggle={() => setGlobalOpen((value) => !value)}
          description="Shared collections for this workspace."
          libraries={filteredGlobalLibraries.slice(0, 8)}
          emptyMessage={`No shared collections are available yet for ${workspaceLabel}.`}
          onLibrarySelect={onSelectLibrary}
        />

        <div className="mt-4">
          <LibraryTree
            title={localCollectionsTitle}
            tone="local"
            open={localOpen}
            onToggle={() => setLocalOpen((value) => !value)}
            description="Collections specific to your organisation or access scope."
            libraries={filteredLocalLibraries.slice(0, 8)}
            emptyMessage="No My Group collections are available yet."
            onLibrarySelect={onSelectLibrary}
          />
        </div>
      </section>

      <section className="p-4">
        <BookmarkList bookmarks={bookmarks} />
      </section>
    </div>
  )
}

export default function PrepSightV4App() {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [desktopNavOpen, setDesktopNavOpen] = useState(true)
  const [searchValue, setSearchValue] = useState("")
  const [mobileUser, setMobileUser] = useState<User | null>(null)
  const [showMobileProfile, setShowMobileProfile] = useState(false)
  const [mobileResourcesTab, setMobileResourcesTab] = useState<MobileResourcesTab>("workforce")
  const [mobileWorkforceTab, setMobileWorkforceTab] = useState<MobileWorkforceTab>("rota")
  const [mobileUtilityPage, setMobileUtilityPage] = useState<MobileUtilityPage>(null)
  const [mobileCalendarView, setMobileCalendarView] = useState<MobileCalendarView>("monthly")
  const [activeTab, setActiveTab] = useState<TabKey>("library")
  const [mobileTab, setMobileTab] = useState<TabKey>("comms")
  const [activeResourceKey, setActiveResourceKey] = useState<LogisticsKey | null>(LOGISTICS_SECTIONS[0]?.key ?? null)
  const [activeUpdateKey, setActiveUpdateKey] = useState<UpdateKey | null>(UPDATES[0]?.key ?? null)
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null)
  const commsRailOpen = useSyncExternalStore(
    subscribeDesktopCommsPreference,
    getDesktopCommsPreference,
    getDesktopCommsPreference,
  )
  const commsRailWidth = useSyncExternalStore(
    subscribeDesktopCommsPreference,
    getDesktopCommsWidth,
    getDesktopCommsWidth,
  )
  const { min: minCommsWidth, max: maxCommsWidth } = getDesktopCommsWidthBounds()
  const mobileProfile = getProfile()
  const mobileSettings = useMemo(() => (mobileProfile ? getRelevantSettings(mobileProfile) : []), [mobileProfile])
  const mobileHospitalLabel = mobileProfile?.hospital?.trim() || "Royal Free Hospital"
  const mobileDepartmentLabel = mobileSettings[0] ?? "Operating Theatres"
  const mobileDisplayName = mobileProfile?.name?.trim() || mobileUser?.displayName || mobileUser?.email?.split("@")[0] || "PrepSight user"
  const mobileRoleLabel = mobileProfile?.jobTitle?.trim() || mobileProfile?.role?.replace(/_/g, " ") || "Clinical role not set"
  const mobileProfileInitial = mobileDisplayName.charAt(0).toUpperCase()
  const mobileEmail = mobileUser?.email || ""
  const mobilePhotoURL = mobileUser?.photoURL || null

  const mobileSurfaceTitle =
    mobileUtilityPage === "calendar"
      ? "Calendar"
      : mobileUtilityPage === "connectors"
        ? "Connectors"
        :
    mobileTab === "comms"
      ? "Comms"
      : mobileTab === "library"
        ? "Library"
        : mobileTab === "logistics"
          ? "Resources"
          : "Insights"

  const mobileSearchPlaceholder =
    mobileUtilityPage === "calendar"
      ? "Search Calendar"
      : mobileUtilityPage === "connectors"
        ? "Search Connectors"
        :
    mobileTab === "comms"
      ? "Search Comms"
      : mobileTab === "library"
        ? "Search Library"
        : mobileTab === "logistics"
          ? "Search Resources"
          : "Search Insights"

  useEffect(() => {
    if (!commsRailOpen) return

    const handleMouseUp = () => {
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }

    const handleMouseMove = (event: MouseEvent) => {
      setDesktopCommsWidth(window.innerWidth - event.clientX)
    }

    const handleResizeStart = (event: MouseEvent) => {
      event.preventDefault()
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    }

    ;(window as Window & { __prepsightStartCommsResize?: (event: MouseEvent) => void }).__prepsightStartCommsResize = handleResizeStart

    return () => {
      handleMouseUp()
      delete (window as Window & { __prepsightStartCommsResize?: (event: MouseEvent) => void }).__prepsightStartCommsResize
    }
  }, [commsRailOpen])

  useEffect(() => onAuthChange((nextUser) => setMobileUser(nextUser)), [])

  const desktopGridStyle: CSSProperties | undefined = commsRailOpen
    ? { gridTemplateColumns: `${desktopNavOpen ? 210 : 80}px minmax(0,1fr) ${commsRailWidth}px` }
    : undefined

  function openTab(tab: TabKey) {
    setActiveTab(tab)
    setSelectedLibraryId(null)
  }

  function openMobileUtilityPage(page: Exclude<MobileUtilityPage, null>) {
    setMobileUtilityPage(page)
    setShowMobileProfile(false)
  }

  async function handleMobileSignOut() {
    clearProfile()
    clearDemoSession()
    await signOut().catch(() => undefined)
    setShowMobileProfile(false)
  }

  function handleMobileSwitchWorkspace() {
    setShowMobileProfile(false)
    setMobileUtilityPage(null)
    router.push("/onboarding")
  }

  return (
<div className="min-h-screen bg-black">

      <MobileThemeProvider>
<div id="mobile-app-root" data-mobile-theme="dark" className="lg:hidden min-h-[100dvh] bg-[var(--mob-bg,#000000)]">        <MobileSharedProfileDrawer
          open={showMobileProfile}
          onClose={() => setShowMobileProfile(false)}
          profileInitial={mobileProfileInitial}
          displayName={mobileDisplayName}
          roleLabel={mobileRoleLabel}
          email={mobileEmail}
          photoURL={mobilePhotoURL}
          hospital={mobileHospitalLabel}
          department={mobileDepartmentLabel}
          onSignOut={handleMobileSignOut}
          onOpenCalendar={() => openMobileUtilityPage("calendar")}
          onOpenConnectors={() => openMobileUtilityPage("connectors")}
          onSwitchWorkspace={handleMobileSwitchWorkspace}
        />
        <main className={`bg-black ${mobileTab === "comms" ? "h-[calc(100dvh-56px)] overflow-hidden" : "min-h-screen pb-28"}`}>
          {mobileUtilityPage === "calendar" ? (
            <div className="space-y-4">
              <MobileSectionHeader
                title={mobileSurfaceTitle}
                hospital={mobileHospitalLabel}
                department={mobileDepartmentLabel}
                onOpenProfile={() => setShowMobileProfile(true)}
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                searchPlaceholder={mobileSearchPlaceholder}
              />
              <MobileCalendarSurface view={mobileCalendarView} onChangeView={setMobileCalendarView} />
            </div>
          ) : mobileUtilityPage === "connectors" ? (
            <div className="space-y-4">
              <MobileSectionHeader
                title={mobileSurfaceTitle}
                hospital={mobileHospitalLabel}
                department={mobileDepartmentLabel}
                onOpenProfile={() => setShowMobileProfile(true)}
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                searchPlaceholder={mobileSearchPlaceholder}
              />
              <MobileConnectorsSurface />
            </div>
          ) : mobileTab === "comms" ? (
            <MobileCommsShell />
          ) : mobileTab === "library" ? (
            <div className="space-y-4">
              <MobileSectionHeader
                title={mobileSurfaceTitle}
                hospital={mobileHospitalLabel}
                department={mobileDepartmentLabel}
                onOpenProfile={() => setShowMobileProfile(true)}
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                searchPlaceholder={mobileSearchPlaceholder}
              />
              <div className="space-y-4 bg-black px-4 pb-4">
                {selectedLibraryId ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedLibraryId(null)}
                      className="rounded-[12px] border border-[#2d2d2d] bg-black px-3 py-2 text-[14px] text-[#0096C7]"
                    >
                      Back to collections
                    </button>
                    <LibraryPageClient libraryId={selectedLibraryId} embedded />
                  </>
                ) : (
                  <EmbeddedLibrariesDashboardMobile query={searchValue} onSelectLibrary={setSelectedLibraryId} />
                )}
              </div>
            </div>
          ) : mobileTab === "logistics" ? (
            <div className="space-y-4">
              <MobileSectionHeader
                title={mobileSurfaceTitle}
                hospital={mobileHospitalLabel}
                department={mobileDepartmentLabel}
                onOpenProfile={() => setShowMobileProfile(true)}
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                searchPlaceholder={mobileSearchPlaceholder}
              />
              <MobileSubpagePills
                items={[
                  { key: "workforce", label: "Workforce" },
                  { key: "equipment", label: "Equipment" },
                  { key: "supplies", label: "Supplies" },
                ]}
                active={mobileResourcesTab}
                onChange={setMobileResourcesTab}
              />
              {mobileResourcesTab === "workforce" ? (
                <>
                  <MobileSubpagePills
                    items={[
                      { key: "rota", label: "Rota" },
                      { key: "shifts", label: "Shifts" },
                      { key: "skills", label: "Skills" },
                      { key: "tasks", label: "Tasks" },
                    ]}
                    active={mobileWorkforceTab}
                    onChange={setMobileWorkforceTab}
                  />
                  <div className="px-4 pb-8">
                    {mobileWorkforceTab === "rota" ? (
                      <MobileWorkforceRotaPanel />
                    ) : mobileWorkforceTab === "shifts" ? (
                      <MobileWorkforceShiftsPanel />
                    ) : mobileWorkforceTab === "skills" ? (
                      <MobileWorkforceSkillsPanel />
                    ) : (
                      <MobileWorkforceTasksPanel />
                    )}
                  </div>
                </>
              ) : mobileResourcesTab === "equipment" ? (
                <MobilePreparedPanel
                  title="Equipment"
                  body="Equipment is being prepared. This mobile page will become the user-facing place for kit readiness, tray availability, and item-level prompts that matter to the individual."
                  icon="equipment"
                />
              ) : (
                <MobilePreparedPanel
                  title="Supplies"
                  body="Supplies is being prepared. This mobile page will become the user-facing place for stock prompts, consumable readiness, and what the user actually needs to know before or during a shift."
                  icon="supplies"
                />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <MobileSectionHeader
                title={mobileSurfaceTitle}
                hospital={mobileHospitalLabel}
                department={mobileDepartmentLabel}
                onOpenProfile={() => setShowMobileProfile(true)}
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                searchPlaceholder={mobileSearchPlaceholder}
              />
              <div className="px-4 pb-4">
                <UpdatesPanel activeKey={activeUpdateKey} onSelect={setActiveUpdateKey} surfaceLabel="Insights" />
              </div>
            </div>
          )}
        </main>

        <div className="fixed inset-x-0 bottom-0 z-50">
          <div className="bg-black border-t border-black px-3 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)]">
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${TAB_ITEMS.length}, minmax(0, 1fr))` }}
            >
              {TAB_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = item.key === mobileTab

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setMobileUtilityPage(null)
                      setMobileTab(item.key)
                      if (item.key !== "comms") setSelectedLibraryId(null)
                    }}
                    className={`flex flex-col items-center justify-center rounded-[16px] px-2 py-2.5 transition-all ${
                      isActive ? "bg-[var(--mob-dock-active-bg)] text-[var(--mob-dock-active)]" : "text-[var(--mob-dock-inactive)]"
                    }`}
                  >
                    <div className="relative flex h-7 w-7 items-center justify-center">
                      {item.key === "comms" ? (
                        <CommsFilledIcon size={23} />
                      ) : item.key === "library" ? (
                        <LibraryFilledIcon size={23} />
                      ) : (
                        <Icon size={23} strokeWidth={isActive ? 2.2 : 1.7} />
                      )}
                    </div>
                    <span className="mt-1 text-[11px] font-medium tracking-wide">
                      {item.key === "updates" ? "Insights" : item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      </MobileThemeProvider>

      <div
        className={`hidden lg:grid lg:min-h-screen ${desktopNavOpen ? "lg:grid-cols-[240px_minmax(0,1fr)]" : "lg:grid-cols-[80px_minmax(0,1fr)]"}`}
      >
        <WorkspaceNavRail currentNav="collections" collapsed={!desktopNavOpen} onToggleCollapsed={() => setDesktopNavOpen((value) => !value)} />

        <div className="flex min-w-0 flex-col">
          <AppTopBar
            menuOpen={menuOpen}
            onToggleMenu={() => setMenuOpen((value) => !value)}
            menuContent={<AppMenuContent />}
            mobileMenuOnly
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder="Search anywhere..."
            sectionLabel="Library Collections"
          />
          <div className="flex flex-1 min-h-0">
            <main className="flex-1 min-w-0 px-6 pt-4 pb-5">
              {activeTab === "library" ? (
                <LibraryOverview
                  query={searchValue}
                  selectedLibraryId={selectedLibraryId}
                  onSelectLibrary={setSelectedLibraryId}
                  onBackToCollections={() => setSelectedLibraryId(null)}
                />
              ) : activeTab === "logistics" ? (
                <ResourcesPanel activeKey={activeResourceKey} onSelect={setActiveResourceKey} />
              ) : (
                <UpdatesPanel activeKey={activeUpdateKey} onSelect={setActiveUpdateKey} />
              )}
            </main>
            {commsRailOpen ? (
              <aside
                className="relative flex-shrink-0 border-l border-black"
                style={{ width: commsRailWidth }}
              >
                <button
                  type="button"
                  onMouseDown={(event) => {
                    ;(window as Window & { __prepsightStartCommsResize?: (nextEvent: MouseEvent) => void }).__prepsightStartCommsResize?.(event.nativeEvent)
                  }}
                  className="group absolute left-0 top-0 z-20 hidden h-full w-5 -translate-x-1/2 cursor-col-resize lg:block"
                  aria-label="Resize PrepSight Comms panel"
                  title={`Resize Comms panel (${minCommsWidth}-${maxCommsWidth}px)`}
                >
                  <span className="absolute left-1/2 top-0 h-full w-[4px] -translate-x-1/2 bg-[#333333] transition-colors group-hover:bg-[#555555]" />
                  <span className="absolute left-1/2 top-1/2 h-24 w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#404040] shadow-[0_8px_24px_rgba(0,0,0,0.4)] ring-1 ring-[#444444] transition-all group-hover:h-28 group-hover:bg-[#505050] group-hover:ring-[#666666]" />
                </button>
                <V5CommsDesktopRail />
              </aside>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
