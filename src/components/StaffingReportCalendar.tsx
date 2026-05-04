"use client"

import { useEffect, useMemo, useState } from "react"
import TriangleIcon from "@/components/TriangleIcon"
import { getStaffingReportsByOrganization } from "@/lib/firestore"
import type { StaffingReportRecord } from "@/lib/types"

type StaffingReportCalendarProps = {
  organizationId?: string
  title: string
  description: string
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

function normalizeReportDateKey(value?: string, fallbackIso?: string) {
  const trimmed = value?.trim()
  if (trimmed) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (slashMatch) {
      const [, day, month, year] = slashMatch
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }
    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10)
    }
  }

  return fallbackIso ? fallbackIso.slice(0, 10) : undefined
}

export default function StaffingReportCalendar({
  organizationId,
  title,
  description,
}: StaffingReportCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatWeekDate(new Date()).key)
  const [reports, setReports] = useState<StaffingReportRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    if (!organizationId) {
      setReports([])
      return () => {
        cancelled = true
      }
    }

    setLoading(true)
    setError("")

    void getStaffingReportsByOrganization(organizationId)
      .then((nextReports) => {
        if (!cancelled) {
          setReports(nextReports)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load staffing reports.")
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [organizationId])

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
  const reportsByDate = useMemo(() => {
    const grouped = new Map<string, StaffingReportRecord[]>()
    reports.forEach((report) => {
      const key = normalizeReportDateKey(report.reportDate, report.uploadedAt)
      if (!key) return
      grouped.set(key, [...(grouped.get(key) ?? []), report])
    })
    return grouped
  }, [reports])
  const selectedDate = useMemo(
    () => activeWeekDates.find((option) => option.key === selectedDateKey) ?? activeWeekDates[0],
    [activeWeekDates, selectedDateKey],
  )
  const selectedReports = reportsByDate.get(selectedDate.key) ?? []

  function moveWeek(direction: -1 | 1) {
    const nextWeekStart = addDays(activeWeekStart, direction * 28)
    setWeekOffset((current) => current + direction * 4)
    setSelectedDateKey(formatWeekDate(nextWeekStart).key)
  }

  return (
    <section className="rounded-[18px] border border-[#2d2d2d] bg-[#101010] px-4 py-4 lg:px-5 lg:py-5">
      <div className="border-b border-[#2d2d2d] pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[22px] tracking-[-0.04em] text-white lg:text-[25px]">{title}</h2>
            <p className="mt-2 max-w-[760px] text-[13px] leading-6 text-[#9a9a9a]">{description}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[12px] text-[#8f8f8f]">Reports loaded</p>
            <p className="mt-1 text-[18px] text-white">{reports.length}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between rounded-[10px] bg-[#1b1b1d] px-3 py-1.5">
            <button type="button" onClick={() => moveWeek(-1)} className="text-[#67CFCF]">
              <TriangleIcon direction="left" size={12} />
            </button>
            <span className="text-[14px] text-white">{activeWeekLabel}</span>
            <button type="button" onClick={() => moveWeek(1)} className="text-[#67CFCF]">
              <TriangleIcon direction="right" size={12} />
            </button>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max gap-1">
              {activeWeekDates.map((option) => {
                const active = option.key === selectedDateKey
                const count = reportsByDate.get(option.key)?.length ?? 0
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSelectedDateKey(option.key)}
                    className={`relative w-[52px] shrink-0 rounded-[10px] px-1.5 py-1.5 text-center transition-colors ${
                      active ? "bg-[#0096C7] text-white" : "bg-[#67CFCF] text-[#0F2D38]"
                    }`}
                  >
                    <span className="block text-[9px] leading-none">{option.label}</span>
                    <span className="mt-1 block text-[15px] leading-none">{option.day}</span>
                    <span className="mt-1 block text-[9px] leading-none">{option.month}</span>
                    {count > 0 ? (
                      <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-black/70 px-1 text-[9px] text-white">
                        {count}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-[12px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-4 rounded-[12px] border border-[#232323] bg-black px-4 py-4">
        <div className="flex items-center justify-between gap-3 border-b border-[#232323] pb-3">
          <div>
            <p className="text-[16px] text-white">
              {selectedDate.label} {selectedDate.day} {selectedDate.month}
            </p>
            <p className="mt-1 text-[12px] text-[#8f8f8f]">
              {selectedReports.length > 0
                ? `${selectedReports.length} roster upload${selectedReports.length === 1 ? "" : "s"}`
                : "No roster upload saved for this date"}
            </p>
          </div>
          {loading ? <span className="text-[12px] text-[#8f8f8f]">Loading...</span> : null}
        </div>

        <div className="mt-3 space-y-2">
          {selectedReports.length === 0 ? (
            <p className="text-[13px] text-white/35">Upload a staffing report and it will appear on its report date here.</p>
          ) : (
            selectedReports.map((report) => (
              <div
                key={report.id}
                className="grid gap-1 rounded-[12px] border border-[#202020] bg-[#101010] px-3 py-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-white">{report.fileName}</p>
                  <p className="mt-1 truncate text-[12px] text-white/35">{report.source || "Source not set"}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[12px] text-white/65">{report.fulfilmentType || "Fulfilment not set"}</p>
                  <p className="mt-1 truncate text-[12px] text-white/35">{report.weekLabel || "Week not set"}</p>
                </div>
                <div className="text-left lg:text-right">
                  <p className="text-[12px] text-[#67CFCF]">{report.rowCount} rows</p>
                  <p className="mt-1 text-[11px] text-white/35">
                    Uploaded {new Date(report.uploadedAt).toLocaleDateString("en-GB")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
