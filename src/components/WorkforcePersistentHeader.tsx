"use client"

import { useMemo, useState } from "react"
import TriangleIcon from "@/components/TriangleIcon"
import WorkforceSectionNav from "@/components/WorkforceSectionNav"

type WorkforceHeaderTab = "builder" | "overview" | "shifts" | "skills" | "tasks" | "teams"

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
  }> = []

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

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export default function WorkforcePersistentHeader({
  current,
  hideCalendar = false,
}: {
  current: WorkforceHeaderTab
  hideCalendar?: boolean
}) {
  const [selectedDate, setSelectedDate] = useState(() => new Date("2026-02-01T00:00:00"))
  const [monthInput, setMonthInput] = useState("February 2026")
  const monthDays = useMemo(
    () => buildMonthCalendar(selectedDate).filter((day) => day.inMonth),
    [selectedDate],
  )
  const selectedDateKey = formatDateKey(selectedDate)

  function jumpToDate(nextDate: Date) {
    setSelectedDate(nextDate)
    setMonthInput(nextDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" }))
  }

  function moveMonth(direction: -1 | 1) {
    jumpToDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + direction, 1))
  }

  function commitMonthInput() {
    const parsed = new Date(`1 ${monthInput}`)
    if (Number.isNaN(parsed.getTime())) {
      setMonthInput(selectedDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" }))
      return
    }
    jumpToDate(parsed)
  }

  return (
    <section className="shrink-0 space-y-3">
      <div className="space-y-4">
        <h1 className="hidden text-[21px] font-medium tracking-[-0.03em] text-white lg:block">Workforce</h1>
        <WorkforceSectionNav current={current} />
      </div>

      {!hideCalendar && (
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
                      <span className="text-[11px] uppercase leading-none text-white/60">{weekdayLabel}</span>
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
      )}
    </section>
  )
}
