"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react"
import { ArrowLeft, CalendarClock, ChevronDown, Link2, LogOut, Maximize2, Mic, MicOff, MoreVertical, Moon, Phone, PhoneIncoming, PhoneOff, Search, Settings, Sun, Video, X } from "lucide-react"
import AppMenuContent from "@/components/AppMenuContent"
import MobileCommsShell from "@/components/MobileCommsShell"
import MobileGlobalSearchOverlay from "@/components/MobileGlobalSearchOverlay"
import MobileResourcesSurface from "@/components/MobileWorkforceSurface"
import MobileSurfaceHeader from "@/components/MobileSurfaceHeader"
import { MobileThemeProvider, useMobileTheme } from "@/lib/mobile-theme"
import AppTopBar from "@/components/AppTopBar"
import {
  BookmarkList,
  EmbeddedLibrariesDashboardMobile,
  LibraryTree,
} from "@/components/LibrariesDashboard"
import LibraryPageClient from "@/components/LibraryPageClient"
import WorkspaceNavRail from "@/components/WorkspaceNavRail"
import { getBookmarksSnapshot, subscribeBookmarks } from "@/lib/bookmarks"
import { getDesktopCommsPreference, getDesktopCommsWidth, getDesktopCommsWidthBounds, setDesktopCommsWidth, subscribeDesktopCommsPreference } from "@/lib/desktop-comms"
import { isFoldableMobileViewport as detectFoldableMobileViewport } from "@/lib/foldable"
import { getLibrariesSnapshot, getLibraryCardsSnapshot, subscribeLibraries } from "@/lib/libraries"
import { clearProfile, getProfile, getRelevantSettings } from "@/lib/profile"
import { subscribeTeams } from "@/lib/team-workspaces"
import { TAB_ITEMS, UPDATES } from "@/v4/data"
import type { TabKey, UpdateKey } from "@/v4/types"
import { onAuthChange, signOut, type User } from "@/lib/auth"
import { useCallStatus } from "@/lib/call-state"

type MobileUtilityPage = "calendar" | "connectors" | null
type MobileCalendarView = "daily" | "weekly" | "monthly" | "quarterly"
type MobileCalendarSource = "all" | "library" | "resources" | "insights"
type MobileConnectorFilter = "connected" | "available"

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
  onSearchButtonClick,
  inlineSearchEnabled = true,
}: {
  title: string
  hospital: string
  department: string
  onOpenProfile: () => void
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  onSearchButtonClick?: () => void
  inlineSearchEnabled?: boolean
}) {
  const [showSearch, setShowSearch] = useState(false)

  function toggleSearch() {
    if (onSearchButtonClick) {
      onSearchButtonClick()
      return
    }
    if (showSearch) {
      onSearchChange("")
    }
    setShowSearch(v => !v)
  }

  return (
    <MobileSurfaceHeader
      title={title}
      hospital={hospital}
      department={department}
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
            onClick={onOpenProfile}
            aria-label="More"
            className="text-white/80 hover:text-white"
          >
            <MoreVertical size={22} />
          </button>
        </>
      )}
    >
      {inlineSearchEnabled && showSearch ? (
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
      ) : null}
    </MobileSurfaceHeader>
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
      <div className="absolute inset-0 bg-black/58" onClick={onClose} />
      <div
        className="fixed inset-y-0 right-0 z-30 flex h-[100dvh] w-[min(88vw,29rem)] flex-col rounded-l-[32px] rounded-r-none border-l border-t border-[#3a3a3d] bg-[linear-gradient(180deg,#262628_0%,#1d1d1f_100%)] text-white shadow-[-18px_0_44px_rgba(0,0,0,0.5)]"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="border-b border-[#343437] px-5 pt-6 pb-6">
          <div className="mb-6 flex items-start justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#d8d8d8] transition-colors hover:bg-[#2e2e31] hover:text-white"
              aria-label="Close profile"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex flex-col items-center">
            <SharedMobileAvatar label={profileInitial} photoURL={photoURL} size={70} />
            <p className="mt-3 text-[15px] text-white">{displayName}</p>
            <p className="mt-1 text-sm text-[#67CFCF]">{roleLabel}</p>
            <p className="mt-1 text-sm text-[#8f8f8f]">{email}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-sm text-emerald-400">Online</span>
            </div>
          </div>
        </div>
        <div className="border-b border-[#343437] px-5 py-4">
          <p className="mb-3 text-xs tracking-widest text-[#6f6f6f]">workspace</p>
          <p className="text-[15px] text-white">{hospital}</p>
          <p className="mt-1 text-sm text-[#8f8f8f]">{department}</p>
        </div>
        <div className="flex flex-1 flex-col gap-1 px-5 py-4">
          <button onClick={onOpenCalendar} className="flex items-center gap-3 py-3.5 text-[15px] text-[#d8d8d8]">
            <CalendarClock size={18} /> Calendar
          </button>
          <button onClick={onOpenConnectors} className="flex items-center gap-3 py-3.5 text-[15px] text-[#d8d8d8]">
            <Link2 size={18} /> Connectors
          </button>
          <button className="flex items-center gap-3 py-3.5 text-[15px] text-[#d8d8d8]">
            <Settings size={18} /> Settings
          </button>
          <button type="button" onClick={toggle} className="flex items-center gap-3 py-3.5 text-[15px] text-[#d8d8d8]">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button type="button" onClick={onSwitchWorkspace} className="flex items-center gap-3 py-3.5 text-[15px] text-[#d8d8d8]">
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
  const [isDesktopViewport, setIsDesktopViewport] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const mediaQuery = window.matchMedia("(min-width: 1024px)")
    const syncViewport = () => setIsDesktopViewport(mediaQuery.matches)
    syncViewport()
    mediaQuery.addEventListener("change", syncViewport)
    return () => mediaQuery.removeEventListener("change", syncViewport)
  }, [])

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
      {false ? (
        <section className="p-4">
        <p className="text-[11px] text-[#888888]">Workspace</p>
        <h1 className="mt-1 text-[20px] tracking-[-0.03em] text-white">{workspaceLabel}</h1>
        <p className="mt-1 text-[13px] text-[#888888]">
          {libraries.length} collections Â· {totalCards} procedure cards
        </p>
        </section>
      ) : null}

      <section className="p-4">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-[22px] font-medium tracking-[-0.03em] text-white">Collections</h2>
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

export default function PrepSightV4App({ initialSurface = "library" }: { initialSurface?: TabKey }) {
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [desktopNavOpen, setDesktopNavOpen] = useState(true)
  const [searchValue, setSearchValue] = useState("")
  const [showMobileGlobalSearch, setShowMobileGlobalSearch] = useState(false)
  const [mobileUser, setMobileUser] = useState<User | null>(null)
  const [showMobileProfile, setShowMobileProfile] = useState(false)
  const [mobileUtilityPage, setMobileUtilityPage] = useState<MobileUtilityPage>(null)
  const [mobileCalendarView, setMobileCalendarView] = useState<MobileCalendarView>("monthly")
  const [activeTab, setActiveTab] = useState<TabKey>(initialSurface === "updates" ? "updates" : "library")
  const [mobileTab, setMobileTab] = useState<TabKey>(initialSurface)
  const [isFoldableMobileViewport, setIsFoldableMobileViewport] = useState(false)
  const [isMixedSplitDirectThreadActive, setIsMixedSplitDirectThreadActive] = useState(false)
  const callStatus = useCallStatus()
  const pipVideoRef = useRef<HTMLVideoElement>(null)
  const desktopPipVideoRef = useRef<HTMLVideoElement>(null)
  const mobilePipRef = useRef<HTMLDivElement>(null)
  const [desktopPipPos, setDesktopPipPos] = useState({ x: -1, y: -1 }) // -1 = not yet positioned
  const [mobilePipPos, setMobilePipPos] = useState<{ x: number; y: number } | null>(null)
  const [isMobilePipDragging, setIsMobilePipDragging] = useState(false)
  const desktopPipDragOrigin = useRef({ clientX: 0, clientY: 0, x: 0, y: 0 })
  const mobilePipDragOrigin = useRef({ clientX: 0, clientY: 0, x: 0, y: 0 })
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

  useEffect(() => {
    if (typeof window === "undefined") return
    const syncFoldableViewport = () => {
      setIsFoldableMobileViewport(detectFoldableMobileViewport())
    }

    syncFoldableViewport()
    window.addEventListener("resize", syncFoldableViewport)
    return () => window.removeEventListener("resize", syncFoldableViewport)
  }, [])

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
        : mobileTab === "resources"
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
        : mobileTab === "resources"
          ? "Search Resources"
          : "Search Insights"

  const dockPinnedToCommsPane = isFoldableMobileViewport
  const shiftMixedSplitChromeToRight = isFoldableMobileViewport && mobileTab !== "comms" && isMixedSplitDirectThreadActive

  useEffect(() => {
    const routeSurface =
      pathname === "/comms"
        ? "comms"
        : pathname === "/insights"
          ? "updates"
          : pathname === "/resources"
            ? "resources"
            : "library"

    setMobileUtilityPage(null)
    setMobileTab(routeSurface)
    setIsMixedSplitDirectThreadActive(false)
    setActiveTab(routeSurface === "updates" ? "updates" : "library")
    if (routeSurface !== "library") setSelectedLibraryId(null)
  }, [pathname])

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

  // ── Sync remote stream to floating video pip elements ──
  useEffect(() => {
    if (pipVideoRef.current) {
      if (callStatus.remoteStream) {
        pipVideoRef.current.srcObject = callStatus.remoteStream
        pipVideoRef.current.play().catch(() => {})
      } else {
        pipVideoRef.current.srcObject = null
      }
    }
  }, [callStatus.remoteStream, callStatus.minimized])

  useEffect(() => {
    if (desktopPipVideoRef.current) {
      if (callStatus.remoteStream) {
        desktopPipVideoRef.current.srcObject = callStatus.remoteStream
        desktopPipVideoRef.current.play().catch(() => {})
      } else {
        desktopPipVideoRef.current.srcObject = null
      }
    }
  }, [callStatus.remoteStream, callStatus.minimized])

  // ── Reset desktop pip position when a new call starts ──
  useEffect(() => {
    if (callStatus.state === "idle") setDesktopPipPos({ x: -1, y: -1 })
  }, [callStatus.state])

  useEffect(() => {
    if (callStatus.state === "idle") setMobilePipPos(null)
  }, [callStatus.state])

  function fmtDur(s: number) {
    const m = Math.floor(s / 60)
    const ss = s % 60
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
  }

  function onDesktopPipPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    desktopPipDragOrigin.current = { clientX: e.clientX, clientY: e.clientY, x: desktopPipPos.x, y: desktopPipPos.y }
  }

  function onDesktopPipPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!(e.buttons & 1)) return
    const nx = Math.max(8, Math.min(window.innerWidth - 160, desktopPipDragOrigin.current.x + e.clientX - desktopPipDragOrigin.current.clientX))
    const ny = Math.max(8, Math.min(window.innerHeight - 220, desktopPipDragOrigin.current.y + e.clientY - desktopPipDragOrigin.current.clientY))
    setDesktopPipPos({ x: nx, y: ny })
  }

  function onMobilePipPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsMobilePipDragging(true)
    mobilePipDragOrigin.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      x: mobilePipPos?.x ?? rect.left,
      y: mobilePipPos?.y ?? rect.top,
    }
  }

  function onMobilePipPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isMobilePipDragging) return
    const pipWidth = 128
    const pipHeight = 210
    const nx = Math.max(8, Math.min(window.innerWidth - pipWidth - 8, mobilePipDragOrigin.current.x + e.clientX - mobilePipDragOrigin.current.clientX))
    const ny = Math.max(8, Math.min(window.innerHeight - pipHeight - 8, mobilePipDragOrigin.current.y + e.clientY - mobilePipDragOrigin.current.clientY))
    setMobilePipPos({ x: nx, y: ny })
  }

  function onMobilePipPointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    setIsMobilePipDragging(false)
  }

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
    await signOut().catch(() => undefined)
    setShowMobileProfile(false)
  }

  function handleMobileSwitchWorkspace() {
    setShowMobileProfile(false)
    setMobileUtilityPage(null)
    router.push("/onboarding")
  }

  function renderFoldRightPaneContent() {
    if (mobileUtilityPage === "calendar") {
      return (
        <div className="min-h-0 flex-1 overflow-y-auto bg-black">
          <MobileCalendarSurface view={mobileCalendarView} onChangeView={setMobileCalendarView} />
        </div>
      )
    }

    if (mobileUtilityPage === "connectors") {
      return (
        <div className="min-h-0 flex-1 overflow-y-auto bg-black">
          <MobileConnectorsSurface />
        </div>
      )
    }

    if (mobileTab === "library") {
      return (
        <div className="min-h-0 flex-1 overflow-hidden bg-black px-4 pb-4">
          {selectedLibraryId ? (
            <div className="flex h-full min-h-0 flex-col space-y-4">
              <button
                type="button"
                onClick={() => setSelectedLibraryId(null)}
                className="shrink-0 self-start rounded-[12px] border border-[#2d2d2d] bg-black px-3 py-2 text-[14px] text-[#0096C7]"
              >
                Back to collections
              </button>
              <div className="min-h-0 flex-1 overflow-hidden">
                <LibraryPageClient libraryId={selectedLibraryId} embedded />
              </div>
            </div>
          ) : (
            <EmbeddedLibrariesDashboardMobile query={searchValue} onSelectLibrary={setSelectedLibraryId} />
          )}
        </div>
      )
    }

    if (mobileTab === "resources") {
      return (
        <div className="min-h-0 flex-1 overflow-hidden bg-black">
          <MobileResourcesSurface embedded />
        </div>
      )
    }

    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <UpdatesPanel activeKey={activeUpdateKey} onSelect={setActiveUpdateKey} surfaceLabel="Insights" />
      </div>
    )
  }

  return (
<div className="min-h-screen bg-black">

      <MobileThemeProvider>
<div id="mobile-app-root" data-mobile-theme="dark" className="relative lg:hidden flex h-[100dvh] flex-col overflow-hidden bg-[var(--mob-bg,#000000)]">        <MobileSharedProfileDrawer
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
        {isFoldableMobileViewport ? (
          mobileTab === "comms" ? (
            <div className="pointer-events-none fixed inset-y-0 left-1/2 z-[60] w-px -translate-x-1/2 bg-[rgba(255,255,255,0.12)] lg:hidden" />
          ) : (
            <div
              className="pointer-events-none fixed bottom-0 left-1/2 z-[60] w-px -translate-x-1/2 bg-[rgba(255,255,255,0.12)] lg:hidden"
              style={{ top: "calc(env(safe-area-inset-top) + 74px)" }}
            />
          )
        ) : null}
        {isFoldableMobileViewport && mobileTab !== "comms" ? (
          <>
            {!shiftMixedSplitChromeToRight ? (
              <div
                className="shrink-0 border-b border-black bg-black px-4 pb-3"
                style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
              >
                <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-start gap-4">
                  <div />
                  <div className="min-w-0 justify-self-center text-center">
                    <div className="inline-flex items-center gap-1 text-[22px] tracking-tight">
                      <img src="/PrepSight%20logo.png" alt="" aria-hidden="true" className="h-[42px] w-auto" />
                      <span className="app-display-font tracking-[-0.05em] text-[#0096C7]">PrepSight</span>
                    </div>
                    <div className="mt-[-2px] flex items-center justify-center gap-2 overflow-hidden text-[14px] text-white">
                      <span className="min-w-0 truncate whitespace-nowrap">{mobileHospitalLabel}</span>
                      <span className="shrink-0 text-[#5f5f5f]">|</span>
                      <span className="min-w-0 truncate whitespace-nowrap">{mobileDepartmentLabel}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowMobileGlobalSearch(true)}
                      aria-label="Open search"
                      className="text-white/70 hover:text-white"
                    >
                      <Search size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMobileProfile(true)}
                      aria-label="Open menu"
                      className="text-white/80 hover:text-white"
                    >
                      <MoreVertical size={22} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 items-center gap-4">
                  <div
                    className="app-display-font text-center text-[24px] leading-none tracking-[-0.05em] text-[#67CFCF]"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontWeight: 500 }}
                  >
                    Comms
                  </div>
                  <div
                    className="app-display-font text-center text-[24px] leading-none tracking-[-0.05em] text-[#67CFCF]"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontWeight: 500 }}
                  >
                    {mobileSurfaceTitle}
                  </div>
                </div>
              </div>
            ) : null}
            <main className="relative min-h-0 flex-1 overflow-hidden bg-black">
              {!shiftMixedSplitChromeToRight ? (
                <div className="grid h-full min-h-0 grid-cols-2">
                  <div className="min-h-0 pb-28">
                    <MobileCommsShell
                      visible
                      hideHeader
                      allowFoldableSplitView={false}
                      onDirectThreadActiveChange={setIsMixedSplitDirectThreadActive}
                    />
                  </div>
                  <div className="min-h-0 overflow-hidden bg-black">{renderFoldRightPaneContent()}</div>
                </div>
              ) : (
                <div className="grid h-full min-h-0 grid-cols-2">
                  <div className="min-h-0">
                    <MobileCommsShell
                      visible
                      hideHeader
                      allowFoldableSplitView={false}
                      onDirectThreadActiveChange={setIsMixedSplitDirectThreadActive}
                    />
                  </div>
                  <div className="flex min-h-0 flex-col overflow-hidden bg-black pb-28">
                    <div
                      className="shrink-0 border-b border-black bg-black px-4 pb-3"
                      style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
                    >
                      <div className="grid grid-cols-[minmax(0,1fr)_40px] items-start gap-4">
                        <div className="min-w-0 text-center">
                          <div className="inline-flex items-center gap-1 text-[22px] tracking-tight">
                            <img src="/PrepSight%20logo.png" alt="" aria-hidden="true" className="h-[42px] w-auto" />
                            <span className="app-display-font tracking-[-0.05em] text-[#0096C7]">PrepSight</span>
                          </div>
                          <div className="mt-[-2px] flex items-center justify-center gap-2 overflow-hidden text-[14px] text-white">
                            <span className="min-w-0 truncate whitespace-nowrap">{mobileHospitalLabel}</span>
                            <span className="shrink-0 text-[#5f5f5f]">|</span>
                            <span className="min-w-0 truncate whitespace-nowrap">{mobileDepartmentLabel}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowMobileGlobalSearch(true)}
                            aria-label="Open search"
                            className="text-white/70 hover:text-white"
                          >
                            <Search size={20} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowMobileProfile(true)}
                            aria-label="Open menu"
                            className="text-white/80 hover:text-white"
                          >
                            <MoreVertical size={22} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div
                          className="app-display-font text-center text-[24px] leading-none tracking-[-0.05em] text-[#67CFCF]"
                          style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontWeight: 500 }}
                        >
                          {mobileSurfaceTitle}
                        </div>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-hidden bg-black">
                      {renderFoldRightPaneContent()}
                    </div>
                  </div>
                </div>
              )}
            </main>
          </>
        ) : null}
        {/* Comms shell — always mounted so the call listener survives page switches.
            When not on comms tab it collapses to 0×0. The call UI inside uses
            position:fixed z-[200] so it floats above everything including the nav. */}
        {!(isFoldableMobileViewport && mobileTab !== "comms") ? (
        <main
          className={`min-h-0 flex-1 bg-black overflow-hidden ${
            mobileTab === "comms" ? "pb-0" : "pb-28"
          }`}
        >
          {mobileUtilityPage === "calendar" ? (
            <div className="flex h-full min-h-0 flex-col">
              <MobileSectionHeader
                title={mobileSurfaceTitle}
                hospital={mobileHospitalLabel}
                department={mobileDepartmentLabel}
                onOpenProfile={() => setShowMobileProfile(true)}
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                searchPlaceholder={mobileSearchPlaceholder}
                inlineSearchEnabled={false}
                onSearchButtonClick={() => setShowMobileGlobalSearch(true)}
              />
              <div className="min-h-0 flex-1 overflow-y-auto">
                <MobileCalendarSurface view={mobileCalendarView} onChangeView={setMobileCalendarView} />
              </div>
            </div>
          ) : mobileUtilityPage === "connectors" ? (
            <div className="flex h-full min-h-0 flex-col">
              <MobileSectionHeader
                title={mobileSurfaceTitle}
                hospital={mobileHospitalLabel}
                department={mobileDepartmentLabel}
                onOpenProfile={() => setShowMobileProfile(true)}
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                searchPlaceholder={mobileSearchPlaceholder}
                inlineSearchEnabled={false}
                onSearchButtonClick={() => setShowMobileGlobalSearch(true)}
              />
              <div className="min-h-0 flex-1 overflow-y-auto">
                <MobileConnectorsSurface />
              </div>
            </div>
          ) : mobileTab === "comms" ? (
            <div className="h-full min-h-0 flex-1 overflow-hidden">
              <MobileCommsShell visible />
            </div>
          )
          : mobileTab === "library" ? (
            <div className="flex h-full min-h-0 flex-col">
              <MobileSectionHeader
                title={mobileSurfaceTitle}
                hospital={mobileHospitalLabel}
                department={mobileDepartmentLabel}
                onOpenProfile={() => setShowMobileProfile(true)}
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                searchPlaceholder={mobileSearchPlaceholder}
                inlineSearchEnabled={false}
                onSearchButtonClick={() => setShowMobileGlobalSearch(true)}
              />
              <div className="min-h-0 flex-1 overflow-hidden bg-black px-4 pb-4">
                {selectedLibraryId ? (
                  <div className="flex h-full min-h-0 flex-col space-y-4">
                    <button
                      type="button"
                      onClick={() => setSelectedLibraryId(null)}
                      className="shrink-0 self-start rounded-[12px] border border-[#2d2d2d] bg-black px-3 py-2 text-[14px] text-[#0096C7]"
                    >
                      Back to collections
                    </button>
                    <div className="min-h-0 flex-1 overflow-hidden">
                      <LibraryPageClient libraryId={selectedLibraryId} embedded />
                    </div>
                  </div>
                ) : (
                  <EmbeddedLibrariesDashboardMobile query={searchValue} onSelectLibrary={setSelectedLibraryId} />
                )}
              </div>
            </div>
          ) : mobileTab === "resources" ? (
            <div className="flex h-full min-h-0 flex-col">
              <MobileSectionHeader
                title={mobileSurfaceTitle}
                hospital={mobileHospitalLabel}
                department={mobileDepartmentLabel}
                onOpenProfile={() => setShowMobileProfile(true)}
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                searchPlaceholder={mobileSearchPlaceholder}
                inlineSearchEnabled={false}
                onSearchButtonClick={() => setShowMobileGlobalSearch(true)}
              />
              <div className="min-h-0 flex-1 overflow-hidden bg-black">
                <MobileResourcesSurface embedded />
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              <MobileSectionHeader
                title={mobileSurfaceTitle}
                hospital={mobileHospitalLabel}
                department={mobileDepartmentLabel}
                onOpenProfile={() => setShowMobileProfile(true)}
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                searchPlaceholder={mobileSearchPlaceholder}
                inlineSearchEnabled={false}
                onSearchButtonClick={() => setShowMobileGlobalSearch(true)}
              />
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                <UpdatesPanel activeKey={activeUpdateKey} onSelect={setActiveUpdateKey} surfaceLabel="Insights" />
              </div>
            </div>
          )}
        </main>
        ) : null}
        <MobileGlobalSearchOverlay
          open={showMobileGlobalSearch}
          onClose={() => setShowMobileGlobalSearch(false)}
        />

        <div className={`fixed bottom-0 z-50 ${dockPinnedToCommsPane ? (shiftMixedSplitChromeToRight ? "right-0 w-1/2 max-w-full" : "left-0 w-1/2 max-w-full") : "inset-x-0"}`}>
          <div className="bg-black border-t border-black px-3 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)]">
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${TAB_ITEMS.length}, minmax(0, 1fr))` }}
            >
              {TAB_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = isFoldableMobileViewport
                  ? item.key === mobileTab
                  : item.href
                    ? pathname.startsWith(item.href)
                    : item.key === mobileTab

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      if (isFoldableMobileViewport) {
                        setMobileUtilityPage(null)
                        setMobileTab(item.key)
                        if (item.key !== "library") setSelectedLibraryId(null)
                        return
                      }
                      if (item.href) {
                        setMobileUtilityPage(null)
                        if (item.key !== "library") setSelectedLibraryId(null)
                        router.push(item.href)
                        return
                      }
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
              </aside>
            ) : null}
          </div>
        </div>
      </div>

      {/* ═══ GLOBAL CALL OVERLAYS — fixed, pointer-events always on ═══ */}

      {/* ── Mobile: floating video pip — only for ACTIVE video calls (remote stream is flowing) ── */}
      {callStatus.state === "active" && callStatus.minimized && callStatus.mediaMode === "video" && (
        <div
          ref={mobilePipRef}
          className={`fixed z-[200] overflow-hidden rounded-[18px] select-none lg:hidden ${isMobilePipDragging ? "scale-[1.02]" : ""}`}
          style={{
            ...(mobilePipPos
              ? { left: mobilePipPos.x, top: mobilePipPos.y, right: "auto", bottom: "auto" }
              : { bottom: 76, right: 12 }),
            width: 128, height: 210,
            background: "#000",
            boxShadow: isMobilePipDragging
              ? "0 14px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.16)"
              : "0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)",
            pointerEvents: "auto",
            touchAction: "none",
            cursor: isMobilePipDragging ? "grabbing" : "grab",
            transition: isMobilePipDragging ? "none" : "transform 160ms ease, box-shadow 160ms ease",
          }}
          onPointerDown={onMobilePipPointerDown}
          onPointerMove={onMobilePipPointerMove}
          onPointerUp={onMobilePipPointerEnd}
          onPointerCancel={onMobilePipPointerEnd}
        >
          <video ref={pipVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
          <div className="absolute left-2 right-2 top-2 flex items-center justify-between">
            <button onClick={() => callStatus.end?.()}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500"
              style={{ boxShadow: "0 2px 8px rgba(239,68,68,0.5)" }}>
              <PhoneOff size={12} className="text-white" />
            </button>
            <button onClick={() => { callStatus.expand?.(); setMobileTab("comms") }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 hover:bg-white/30">
              <Maximize2 size={12} className="text-white" />
            </button>
          </div>
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <button onClick={() => callStatus.toggleMute?.()}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50">
              {callStatus.muted ? <MicOff size={12} className="text-red-400" /> : <Mic size={12} className="text-white/80" />}
            </button>
            <span className="font-mono text-[10px] text-white/70">{fmtDur(callStatus.elapsed)}</span>
          </div>
        </div>
      )}

      {/* ── Mobile: slim pill — incoming/outgoing/active-audio, AND incoming video (no stream yet) ──
          Answer button icon: Video for incoming video call, PhoneIncoming for audio call. */}
      {callStatus.state !== "idle" && callStatus.minimized &&
        !(callStatus.state === "active" && callStatus.mediaMode === "video") && (
        <div
          className="fixed right-0 z-[200] flex items-center gap-1.5 pl-3 pr-2 lg:hidden select-none"
          style={{
            top: "env(safe-area-inset-top, 0px)",
            height: 48,
            background: "rgba(6,6,6,0.96)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderLeft: "1px solid rgba(255,255,255,0.09)",
            borderBottom: "1px solid rgba(255,255,255,0.09)",
            borderBottomLeftRadius: 26,
            pointerEvents: "auto",
          }}
        >
          <div className="mr-1.5 min-w-0 shrink" style={{ maxWidth: 96 }}>
            <p className="truncate text-[11.5px] font-semibold leading-tight text-white">
              {callStatus.state === "incoming" ? callStatus.callerName || "Incoming" : callStatus.calleeName || "Call"}
            </p>
            <p className="truncate text-[10px] leading-tight text-[#0096C7]/75">
              {callStatus.state === "incoming"
                ? (callStatus.mediaMode === "video" ? "Incoming video call" : "Incoming call")
                : callStatus.state === "outgoing"
                ? (callStatus.mediaMode === "video" ? "Video calling…" : "Calling…")
                : fmtDur(callStatus.elapsed)}
            </p>
          </div>
          {callStatus.state === "active" && (
            <button onClick={() => callStatus.toggleMute?.()}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.08] hover:bg-white/[0.15]">
              {callStatus.muted ? <MicOff size={12} className="text-red-400" /> : <Mic size={12} className="text-white/60" />}
            </button>
          )}
          {callStatus.state === "incoming" && (
            <button onClick={() => callStatus.answer?.()}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500"
              style={{ boxShadow: "0 2px 8px rgba(16,185,129,0.5)" }}>
              {callStatus.mediaMode === "video"
                ? <Video size={12} className="text-white" />
                : <PhoneIncoming size={12} className="text-white" />}
            </button>
          )}
          <button
            onClick={() => callStatus.state === "incoming" ? callStatus.decline?.() : callStatus.end?.()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500"
            style={{ boxShadow: "0 2px 8px rgba(239,68,68,0.4)" }}>
            <PhoneOff size={12} className="text-white" />
          </button>
          <button onClick={() => { callStatus.expand?.(); setMobileTab("comms") }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/50 hover:bg-white/20 hover:text-white">
            <Maximize2 size={10} />
          </button>
        </div>
      )}

      {/* ── Desktop: draggable floating pip (call minimized within open comms panel) ── */}
      {callStatus.state !== "idle" && callStatus.minimized && (
        <div
          className="fixed z-[200] hidden select-none lg:block"
          style={{
            right: desktopPipPos.x < 0 ? 24 : undefined,
            bottom: desktopPipPos.x < 0 ? 32 : undefined,
            left: desktopPipPos.x >= 0 ? desktopPipPos.x : undefined,
            top: desktopPipPos.y >= 0 ? desktopPipPos.y : undefined,
            width: 200,
            pointerEvents: "auto",
            touchAction: "none",
          }}
          onPointerDown={onDesktopPipPointerDown}
          onPointerMove={onDesktopPipPointerMove}
        >
          <div className="overflow-hidden rounded-[16px]" style={{
            background: "#0a0a0a",
            boxShadow: "0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07)",
          }}>
            {callStatus.mediaMode === "video" && callStatus.state === "active" && (
              <div className="relative" style={{ height: 160 }}>
                <video ref={desktopPipVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-2.5 cursor-grab active:cursor-grabbing">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-white">
                  {callStatus.state === "incoming" ? callStatus.callerName || "Incoming" : callStatus.calleeName || "Call"}
                </p>
                <p className="text-[10px] text-[#0096C7]/80">
                  {callStatus.state === "incoming" ? (callStatus.mediaMode === "video" ? "Incoming video" : "Incoming call")
                    : callStatus.state === "outgoing" ? "Calling…"
                    : callStatus.mediaMode === "video" ? `📹 ${fmtDur(callStatus.elapsed)}`
                    : `🎙 ${fmtDur(callStatus.elapsed)}`}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.06] px-3 py-2">
              <div className="flex items-center gap-1.5">
                {callStatus.state === "active" && (
                  <button onClick={() => callStatus.toggleMute?.()}
                    onPointerDown={e => e.stopPropagation()}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] hover:bg-white/[0.14]">
                    {callStatus.muted ? <MicOff size={12} className="text-red-400" /> : <Mic size={12} className="text-white/60" />}
                  </button>
                )}
                {callStatus.state === "active" && callStatus.mediaMode === "video" && (
                  <button onClick={() => callStatus.switchToAudio?.()}
                    onPointerDown={e => e.stopPropagation()}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] hover:bg-white/[0.14]"
                    title="Switch to audio only">
                    <Video size={12} className="text-[#0096C7]" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {callStatus.state === "incoming" && (
                  <button onClick={() => callStatus.answer?.()}
                    onPointerDown={e => e.stopPropagation()}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500"
                    style={{ boxShadow: "0 2px 8px rgba(16,185,129,0.45)" }}>
                    {callStatus.mediaMode === "video"
                      ? <Video size={12} className="text-white" />
                      : <PhoneIncoming size={12} className="text-white" />}
                  </button>
                )}
                <button
                  onClick={() => callStatus.state === "incoming" ? callStatus.decline?.() : callStatus.end?.()}
                  onPointerDown={e => e.stopPropagation()}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500"
                  style={{ boxShadow: "0 2px 8px rgba(239,68,68,0.4)" }}>
                  <PhoneOff size={12} className="text-white" />
                </button>
                <button onClick={() => callStatus.expand?.()}
                  onPointerDown={e => e.stopPropagation()}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] hover:bg-white/[0.14]"
                  title="Return to full call">
                  <Maximize2 size={12} className="text-white/60" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
