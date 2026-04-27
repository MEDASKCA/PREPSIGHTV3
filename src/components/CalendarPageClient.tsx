"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import WorkspaceDesktopShell from "@/components/WorkspaceDesktopShell"

// ─── Types ────────────────────────────────────────────────────────────────────

type CalendarView = "day" | "week" | "month"
type CalendarSource = "library" | "resources" | "insights"
type CalendarItemType = "shift" | "task" | "review" | "milestone" | "booking"

type CalendarItem = {
  id: string
  source: CalendarSource
  type: CalendarItemType
  title: string
  detail: string
  date: string
  start?: string
  end?: string
  allDay?: boolean
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const TEAL       = "#0f4c5c"   // dark teal — all body text
const TEAL_MID   = "#0096c7"   // medium teal — today highlight, active
const BORDER     = "#b0dce6"   // border colour throughout
const HOVER_BG   = "#d6f3f9"   // sky-blue hover (onboarding palette)
const PANEL_BG   = "#f0f9fc"   // left panel background

// ─── Source metadata ──────────────────────────────────────────────────────────

const SOURCE_META: Record<CalendarSource, { label: string; color: string }> = {
  library:   { label: "Library",   color: "#1497c8" },
  resources: { label: "Resources", color: "#1eb89b" },
  insights:  { label: "Insights",  color: "#e2a020" },
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const CALENDAR_ITEMS: CalendarItem[] = [
  { id: "1",  source: "resources", type: "shift",     title: "Morning shift — Theatres T&O",      detail: "Royal Free Hospital",                      date: "2026-04-25", start: "07:30", end: "16:00" },
  { id: "2",  source: "library",   type: "review",    title: "TKR instrumentation card review",   detail: "Community refresh requested by scrub lead", date: "2026-04-25", start: "11:00", end: "11:30" },
  { id: "3",  source: "insights",  type: "milestone", title: "Readiness checkpoint — Case 4",     detail: "Turnaround review",                         date: "2026-04-25", start: "13:30", end: "14:00" },
  { id: "4",  source: "resources", type: "task",      title: "Confirm weekend availability",      detail: "Offer window closes at 18:00",               date: "2026-04-26", start: "09:15", end: "09:45" },
  { id: "5",  source: "resources", type: "booking",   title: "Loan kit delivery — Theatre 3",     detail: "Zimmer revision set",                       date: "2026-04-27", start: "08:00", end: "10:00" },
  { id: "6",  source: "library",   type: "task",      title: "Airway card acknowledgement",       detail: "New card published — action required",      date: "2026-04-28", start: "12:00", end: "12:15" },
  { id: "7",  source: "resources", type: "shift",     title: "External shift — St George's",      detail: "Anaesthetics support",                      date: "2026-04-29", start: "19:00", end: "23:00" },
  { id: "8",  source: "insights",  type: "review",    title: "Monthly readiness huddle",          detail: "Staffing, equipment, pathway pinch points", date: "2026-05-02", start: "08:30", end: "09:15" },
  { id: "9",  source: "resources", type: "shift",     title: "Morning shift — General Surgery",   detail: "Royal Free Hospital",                      date: "2026-05-05", start: "07:30", end: "15:30" },
  { id: "10", source: "library",   type: "review",    title: "Hip arthroplasty card update",      detail: "Implant system change",                     date: "2026-05-08", start: "10:00", end: "10:30" },
  { id: "11", source: "insights",  type: "task",      title: "Theatre utilisation report",        detail: "April figures due",                         date: "2026-05-09", start: "09:00", end: "10:00" },
  { id: "12", source: "library",   type: "milestone", title: "Quarterly content freeze",          detail: "Escalation pack locked for review week",    date: "2026-05-14", allDay: true },
  { id: "13", source: "resources", type: "task",      title: "CPD hours submission",              detail: "Mandatory by month end",                    date: "2026-05-31", allDay: true },
  { id: "14", source: "resources", type: "shift",     title: "Bank shift — Vascular",             detail: "Royal London Hospital",                     date: "2026-06-06", start: "07:00", end: "15:30" },
  { id: "15", source: "insights",  type: "milestone", title: "Q2 capacity planning review",       detail: "Service readiness and headcount",            date: "2026-06-18", allDay: true },
]

// ─── Date utilities ───────────────────────────────────────────────────────────

const TODAY = new Date(2026, 3, 25)

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function isToday(d: Date) { return isSameDay(d, TODAY) }

function dateToString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  let startDay = firstDay.getDay()
  if (startDay === 0) startDay = 7
  const start = new Date(firstDay)
  start.setDate(firstDay.getDate() - (startDay - 1))
  return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
}

function getWeekDates(date: Date): Date[] {
  const day = date.getDay()
  const offset = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + offset)
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d })
}

function getItemsForDate(items: CalendarItem[], date: Date) {
  return items.filter((item) => item.date === dateToString(date))
}

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

// ─── Time grid constants ──────────────────────────────────────────────────────

const HOUR_HEIGHT = 48           // px per hour
const START_HOUR  = 0            // midnight
const END_HOUR    = 24           // midnight next day
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

function eventTop(start: string): number {
  return ((parseTimeToMinutes(start) - START_HOUR * 60) / 60) * HOUR_HEIGHT
}
function eventHeight(start: string, end: string): number {
  return Math.max(((parseTimeToMinutes(end) - parseTimeToMinutes(start)) / 60) * HOUR_HEIGHT, 20)
}
function hourLabel(h: number): string {
  if (h === 0)  return "12am"
  if (h === 12) return "12pm"
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatMonthYear(d: Date) {
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}
function formatWeekRange(dates: Date[]) {
  const a = dates[0], b = dates[6]
  if (a.getMonth() === b.getMonth()) return `${a.getDate()} – ${b.getDate()} ${a.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`
  return `${a.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${b.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
}
function formatDayLong(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

// ─── Source Filters ───────────────────────────────────────────────────────────

function SourceFilters({ sources, onToggle }: { sources: Record<CalendarSource, boolean>; onToggle: (s: CalendarSource) => void }) {
  return (
    <div>
      <p className="text-[11px] font-semibold mb-2 px-1" style={{ color: TEAL }}>My calendars</p>
      <div className="space-y-0.5">
        {(Object.keys(SOURCE_META) as CalendarSource[]).map((source) => {
          const { label, color } = SOURCE_META[source]
          const on = sources[source]
          return (
            <button
              key={source}
              type="button"
              onClick={() => onToggle(source)}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition"
              style={{ color: TEAL }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = HOVER_BG)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <span
                className="w-3.5 h-3.5 rounded-sm flex-shrink-0 flex items-center justify-center border-2 transition"
                style={{ backgroundColor: on ? color : "transparent", borderColor: color }}
              >
                {on && (
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                    <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="text-[13px] font-medium" style={{ color: on ? TEAL : "#7aa1b2" }}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Schedule (left panel list) ───────────────────────────────────────────────

function ScheduleView({ items, fromDate }: { items: CalendarItem[]; fromDate: Date }) {
  const fromStr = dateToString(fromDate)
  const sorted = [...items]
    .filter((it) => it.date >= fromStr)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return (a.start ?? "00:00").localeCompare(b.start ?? "00:00")
    })

  const grouped: Array<{ date: string; items: CalendarItem[] }> = []
  for (const item of sorted) {
    const last = grouped[grouped.length - 1]
    if (last && last.date === item.date) last.items.push(item)
    else grouped.push({ date: item.date, items: [item] })
  }

  if (grouped.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-[12px]" style={{ color: TEAL }}>
        Nothing on this date
      </div>
    )
  }

  return (
    <div className="py-1">
      {grouped.map(({ date, items: di }) => {
        const d = new Date(`${date}T00:00:00`)
        const todayDate = isToday(d)
        return (
          <div key={date} className="border-b last:border-0" style={{ borderColor: BORDER }}>
            {/* Date header */}
            <div className="flex items-baseline gap-2 px-3 pt-3 pb-1">
              <span
                className="text-[18px] font-semibold leading-none"
                style={{ color: todayDate ? TEAL_MID : TEAL }}
              >
                {d.getDate()}
              </span>
              <span className="text-[12px] font-medium" style={{ color: todayDate ? TEAL_MID : TEAL }}>
                {d.toLocaleDateString("en-GB", { weekday: "short", month: "short" })}
                {todayDate ? " · Today" : ""}
              </span>
            </div>

            {/* Events */}
            <div className="pb-2">
              {di.map((it) => {
                const { color, label } = SOURCE_META[it.source]
                return (
                  <button
                    key={it.id}
                    type="button"
                    className="w-full text-left flex items-start gap-2 px-3 py-1.5 transition"
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = HOVER_BG)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <span className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold truncate" style={{ color: TEAL }}>{it.title}</p>
                      <p className="text-[11px] truncate" style={{ color: TEAL }}>
                        {it.allDay ? "All day" : `${it.start}${it.end ? ` – ${it.end}` : ""}`}
                        {" · "}{label}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function CalendarToolbar({ view, onChangeView, title, onPrev, onNext, onToday }: {
  view: CalendarView; onChangeView: (v: CalendarView) => void
  title: string; onPrev: () => void; onNext: () => void; onToday: () => void
}) {
  const views: Array<{ key: CalendarView; label: string }> = [
    { key: "day",   label: "Day"   },
    { key: "week",  label: "Week"  },
    { key: "month", label: "Month" },
  ]

  return (
    <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0 border-b" style={{ borderColor: BORDER, backgroundColor: "white" }}>
      <div className="flex items-center gap-2">
        <button
          onClick={onToday}
          className="px-3 py-1.5 rounded-lg border text-[12px] font-semibold transition"
          style={{ borderColor: BORDER, color: TEAL }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = HOVER_BG)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          Today
        </button>
        <div className="flex items-center">
          <button
            onClick={onPrev}
            className="w-7 h-7 flex items-center justify-center rounded-full transition"
            style={{ color: TEAL }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = HOVER_BG)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={onNext}
            className="w-7 h-7 flex items-center justify-center rounded-full transition"
            style={{ color: TEAL }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = HOVER_BG)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <span className="text-[17px] font-semibold tracking-[-0.02em]" style={{ color: TEAL }}>{title}</span>
      </div>

      <div className="inline-flex rounded-lg border p-0.5" style={{ borderColor: BORDER, backgroundColor: "#f0f9fc" }}>
        {views.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => onChangeView(v.key)}
            className="px-3 py-1.5 rounded-md text-[12px] font-semibold transition"
            style={view === v.key
              ? { backgroundColor: TEAL_MID, color: "white" }
              : { color: TEAL, backgroundColor: "transparent" }
            }
            onMouseEnter={(e) => { if (view !== v.key) e.currentTarget.style.backgroundColor = HOVER_BG }}
            onMouseLeave={(e) => { if (view !== v.key) e.currentTarget.style.backgroundColor = "transparent" }}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Event pill (month grid) ──────────────────────────────────────────────────

function EventPill({ item }: { item: CalendarItem }) {
  const { color } = SOURCE_META[item.source]
  return (
    <div className="truncate text-[11px] font-medium text-white rounded px-1.5 leading-5" style={{ backgroundColor: color }}>
      {!item.allDay && item.start ? `${item.start} ` : ""}{item.title}
    </div>
  )
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({ date, items, onSelectDate }: {
  date: Date; items: CalendarItem[]; onSelectDate: (d: Date, switchView?: boolean) => void
}) {
  const grid = getMonthGrid(date.getFullYear(), date.getMonth())
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-7 flex-shrink-0 border-b" style={{ borderColor: BORDER, backgroundColor: "white" }}>
        {DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold" style={{ color: TEAL }}>
            {d}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 grid-rows-6 border-l overflow-hidden" style={{ borderColor: BORDER }}>
        {grid.map((d, i) => {
          const inMonth = d.getMonth() === date.getMonth()
          const todayDate = isToday(d)
          const dayItems = getItemsForDate(items, d)
          const visible = dayItems.slice(0, 3)
          const overflow = dayItems.length - visible.length

          return (
            <div
              key={i}
              onClick={() => onSelectDate(d, false)}
              className="border-r border-b p-1.5 cursor-pointer transition"
              style={{ borderColor: BORDER, backgroundColor: inMonth ? "white" : "#f4fafb" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = HOVER_BG)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = inMonth ? "white" : "#f4fafb")}
            >
              <div className="flex justify-center mb-1">
                <span
                  className="w-7 h-7 flex items-center justify-center rounded-full text-[13px] font-semibold leading-none transition"
                  style={todayDate
                    ? { backgroundColor: TEAL_MID, color: "white" }
                    : { color: inMonth ? TEAL : "#b0ccd4" }
                  }
                >
                  {d.getDate()}
                </span>
              </div>
              <div className="space-y-0.5">
                {visible.map((item) => <EventPill key={item.id} item={item} />)}
                {overflow > 0 && (
                  <div className="text-[10px] font-semibold px-1.5 leading-5" style={{ color: TEAL }}>+{overflow} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Timed event block ────────────────────────────────────────────────────────

function TimeBlock({ item }: { item: CalendarItem }) {
  const { color } = SOURCE_META[item.source]
  if (!item.start || !item.end) return null
  const top    = eventTop(item.start)
  const height = eventHeight(item.start, item.end)

  return (
    <div
      className="absolute left-1 right-1 rounded-md px-1.5 py-0.5 overflow-hidden cursor-pointer transition hover:brightness-95"
      style={{ top, height, backgroundColor: color + "28", borderLeft: `3px solid ${color}` }}
    >
      <p className="text-[11px] font-semibold leading-tight truncate" style={{ color }}>
        {item.start} {item.title}
      </p>
      {height > 36 && (
        <p className="text-[10px] leading-tight mt-0.5 truncate" style={{ color: color + "bb" }}>
          {item.detail}
        </p>
      )}
    </div>
  )
}

// ─── Shared time grid helpers ─────────────────────────────────────────────────

// CSS background that draws one clean 1px horizontal line per hour — no DOM elements needed
const hourLinesBg = `repeating-linear-gradient(to bottom, ${BORDER}88 0px, ${BORDER}88 1px, transparent 1px, transparent ${HOUR_HEIGHT}px)`
const GRID_TOTAL_H = HOURS.length * HOUR_HEIGHT  // total scrollable height

// Gutter column — shared between WeekView and DayView
function TimeGutter() {
  return (
    <div
      className="flex-shrink-0 border-r"
      style={{ width: 64, borderColor: BORDER }}
    >
      {HOURS.map((h) => (
        <div key={h} style={{ height: HOUR_HEIGHT, position: "relative" }}>
          {/* Label straddles the top edge of each row; first label goes below so it's never clipped */}
          <span
            style={{
              position: "absolute",
              top: h === 0 ? 3 : -8,
              right: 10,
              fontSize: 10,
              fontWeight: 500,
              color: TEAL,
              whiteSpace: "nowrap",
            }}
          >
            {hourLabel(h)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ date, items, onSelectDate }: { date: Date; items: CalendarItem[]; onSelectDate: (d: Date) => void }) {
  const weekDates = getWeekDates(date)
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  return (
    <div className="flex flex-col h-full">

      {/* Fixed header row — gutter placeholder + day columns */}
      <div
        className="flex flex-shrink-0 border-b"
        style={{ borderColor: BORDER, backgroundColor: "white", paddingRight: "17px" /* matches scrollbar-gutter:stable reservation */ }}
      >
        <div style={{ width: 64, flexShrink: 0, borderRight: `1px solid ${BORDER}` }} />
        {weekDates.map((d, i) => {
          const todayDate = isToday(d)
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDate(d)}
              className="flex-1 py-2 text-center transition"
              style={{ borderRight: i < 6 ? `1px solid ${BORDER}` : "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = HOVER_BG)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <p className="text-[11px] font-semibold" style={{ color: todayDate ? TEAL_MID : TEAL }}>{DAYS[i]}</p>
              <span
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[16px] font-semibold mt-0.5"
                style={todayDate ? { backgroundColor: TEAL_MID, color: "white" } : { color: TEAL }}
              >
                {d.getDate()}
              </span>
            </button>
          )
        })}
      </div>

      {/* All-day strip */}
      <div
        className="flex flex-shrink-0 border-b"
        style={{ borderColor: BORDER, minHeight: 32, backgroundColor: "#f8fcfd", paddingRight: "17px" }}
      >
        <div style={{ width: 64, flexShrink: 0, borderRight: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: TEAL }}>all-day</span>
        </div>
        {weekDates.map((d, i) => {
          const allDay = getItemsForDate(items, d).filter((it) => it.allDay)
          return (
            <div
              key={i}
              className="flex-1 px-0.5 py-0.5 space-y-0.5"
              style={{ borderRight: i < 6 ? `1px solid ${BORDER}` : "none" }}
            >
              {allDay.map((it) => (
                <div key={it.id} className="truncate text-[10px] font-medium text-white rounded px-1 leading-4" style={{ backgroundColor: SOURCE_META[it.source].color }}>
                  {it.title}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Scrollable time grid — gutter + columns scroll together, scrollbar-gutter keeps header aligned */}
      <div
        className="flex flex-1"
        style={{ overflowY: "scroll", scrollbarGutter: "stable" }}
      >
        <TimeGutter />

        {/* Day columns on top of shared horizontal grid lines */}
        <div
          className="flex flex-1 relative"
          style={{ height: GRID_TOTAL_H, backgroundImage: hourLinesBg }}
        >
          {weekDates.map((d, i) => {
            const timed = getItemsForDate(items, d).filter((it) => !it.allDay && it.start)
            const todayDate = isToday(d)
            return (
              <div
                key={i}
                className="flex-1 relative cursor-pointer group"
                style={{
                  height: "100%",
                  borderRight: i < 6 ? `1px solid ${BORDER}` : "none",
                  backgroundColor: todayDate ? "#eaf8fc" : "transparent",
                }}
                onClick={() => onSelectDate(d)}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: HOVER_BG + "55", pointerEvents: "none" }}
                />
                {timed.map((it) => <TimeBlock key={it.id} item={it} />)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({ date, items }: { date: Date; items: CalendarItem[] }) {
  const dayItems = getItemsForDate(items, date)
  const timed    = dayItems.filter((it) => !it.allDay && it.start)
  const allDay   = dayItems.filter((it) => it.allDay)

  return (
    <div className="flex flex-col h-full">

      {/* Fixed header */}
      <div
        className="flex flex-shrink-0 border-b"
        style={{ borderColor: BORDER, backgroundColor: "white", paddingRight: "17px" }}
      >
        <div style={{ width: 64, flexShrink: 0, borderRight: `1px solid ${BORDER}` }} />
        <div className="flex-1 px-4 py-2.5">
          <p className="text-[11px] font-semibold" style={{ color: isToday(date) ? TEAL_MID : TEAL }}>
            {date.toLocaleDateString("en-GB", { weekday: "long" })}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[20px] font-semibold"
              style={isToday(date) ? { backgroundColor: TEAL_MID, color: "white" } : { color: TEAL }}
            >
              {date.getDate()}
            </span>
            <span className="text-[13px]" style={{ color: TEAL }}>
              {date.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </span>
          </div>
        </div>
      </div>

      {/* All-day strip */}
      {allDay.length > 0 && (
        <div
          className="flex flex-shrink-0 border-b"
          style={{ borderColor: BORDER, backgroundColor: "#f8fcfd", paddingRight: "17px" }}
        >
          <div style={{ width: 64, flexShrink: 0, borderRight: `1px solid ${BORDER}`, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingTop: 8, paddingRight: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: TEAL }}>all-day</span>
          </div>
          <div className="flex-1 px-2 py-1.5 space-y-1">
            {allDay.map((it) => (
              <div key={it.id} className="text-[12px] font-medium text-white rounded-md px-2 py-0.5 leading-5" style={{ backgroundColor: SOURCE_META[it.source].color }}>
                {it.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scrollable time grid */}
      <div
        className="flex flex-1"
        style={{ overflowY: "scroll", scrollbarGutter: "stable" }}
      >
        <TimeGutter />

        <div
          className="flex-1 relative cursor-pointer group"
          style={{ height: GRID_TOTAL_H, backgroundImage: hourLinesBg }}
        >
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: HOVER_BG + "33", pointerEvents: "none" }}
          />
          {timed.map((it) => <TimeBlock key={it.id} item={it} />)}
          {timed.length === 0 && (
            <div className="flex items-center justify-center pt-32 text-[13px]" style={{ color: TEAL }}>
              Nothing scheduled — click to add
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function CalendarPageClient() {
  const [view, setView]               = useState<CalendarView>("week")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(TODAY))
  const [sources, setSources]         = useState<Record<CalendarSource, boolean>>({ library: true, resources: true, insights: true })

  const visibleItems = useMemo(() => CALENDAR_ITEMS.filter((it) => sources[it.source]), [sources])

  const toggleSource = (source: CalendarSource) => setSources((prev) => ({ ...prev, [source]: !prev[source] }))

  const handleSelectDate = (d: Date, switchToDay = false) => {
    setSelectedDate(d)
    if (switchToDay) setView("day")
  }

  const toolbarTitle = useMemo(() => {
    if (view === "month") return formatMonthYear(selectedDate)
    if (view === "week")  return formatWeekRange(getWeekDates(selectedDate))
    return formatDayLong(selectedDate)
  }, [view, selectedDate])

  const navigate = (dir: -1 | 1) => {
    const d = new Date(selectedDate)
    if (view === "month") { d.setDate(1); d.setMonth(d.getMonth() + dir) }
    else if (view === "week") { d.setDate(d.getDate() + dir * 7) }
    else { d.setDate(d.getDate() + dir) }
    setSelectedDate(d)
  }

  return (
    <>
      {/* ── Desktop ────────────────────────────────────────────────────────── */}
      <WorkspaceDesktopShell currentNav="calendar" sectionLabel="Calendar">
        <div className="flex overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>

          {/* Left panel: filters + schedule */}
          <div className="w-[270px] flex-shrink-0 border-r flex flex-col overflow-hidden" style={{ borderColor: BORDER, backgroundColor: PANEL_BG }}>
            <div className="p-3 flex-shrink-0">
              <SourceFilters sources={sources} onToggle={toggleSource} />
            </div>
            <div className="flex-shrink-0 border-t" style={{ borderColor: BORDER }} />
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <ScheduleView items={visibleItems} fromDate={selectedDate} />
            </div>
          </div>

          {/* Right panel: Day / Week / Month */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: "white" }}>
            <CalendarToolbar
              view={view}
              onChangeView={setView}
              title={toolbarTitle}
              onPrev={() => navigate(-1)}
              onNext={() => navigate(1)}
              onToday={() => setSelectedDate(new Date(TODAY))}
            />
            <div className="flex-1 overflow-hidden flex flex-col">
              {view === "month" && <MonthView date={selectedDate} items={visibleItems} onSelectDate={handleSelectDate} />}
              {view === "week"  && <WeekView  date={selectedDate} items={visibleItems} onSelectDate={(d) => handleSelectDate(d)} />}
              {view === "day"   && <DayView   date={selectedDate} items={visibleItems} />}
            </div>
          </div>
        </div>
      </WorkspaceDesktopShell>

      {/* ── Mobile ─────────────────────────────────────────────────────────── */}
      <div className="lg:hidden min-h-screen pb-24" style={{ background: "linear-gradient(180deg,#E5F5F8 0%,#F3F9FB 100%)" }}>
        <div className="px-4 pt-5 pb-3">
          <h1 className="text-[22px] font-semibold tracking-[-0.03em]" style={{ color: TEAL }}>What&apos;s coming up</h1>
        </div>

        <div className="px-4 flex gap-2 flex-wrap mb-3">
          {(Object.keys(SOURCE_META) as CalendarSource[]).map((source) => {
            const { label, color } = SOURCE_META[source]
            const on = sources[source]
            return (
              <button
                key={source}
                onClick={() => toggleSource(source)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold border transition"
                style={{ backgroundColor: on ? color + "18" : "white", borderColor: on ? color : BORDER, color: on ? color : TEAL }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </button>
            )
          })}
        </div>

        <div className="mx-4 rounded-2xl border overflow-hidden" style={{ borderColor: BORDER, backgroundColor: "white" }}>
          <ScheduleView items={visibleItems} fromDate={selectedDate} />
        </div>
      </div>
    </>
  )
}
