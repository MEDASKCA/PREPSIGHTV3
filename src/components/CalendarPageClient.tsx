"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, House, Plus, Search, X, Clock, User,
  Scissors, Trash2, CheckCircle2, Circle, AlertTriangle,
  ChevronRight, CalendarDays,
} from "lucide-react"
import Fuse from "fuse.js"
import { procedures, SEED_SUPERSEDES } from "@/lib/data"
import { hasVariantsForProcedure } from "@/lib/variants"
import { db } from "@/lib/firebase"
import {
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore"
import { onAuthChange } from "@/lib/auth"

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlannedCase {
  id: string
  procedureId: string
  procedureName: string
  date: string        // "YYYY-MM-DD"
  time?: string       // "08:00"
  surgeonName?: string
  theatre?: string
  notes?: string
  uid?: string
}

type Tab = "upcoming" | "prepare" | "insights"

// ── Helpers ───────────────────────────────────────────────────────────────────

function today(): string {
  return formatDate(new Date())
}

function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = `${d.getMonth() + 1}`.padStart(2, "0")
  const day = `${d.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, day] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, day)
}

function getDayLabel(dateStr: string): { dayNum: string; dayName: string; monthLabel: string | null } {
  const d = parseLocalDate(dateStr)
  const dayNum = d.getDate().toString()
  const dayName = d.toLocaleDateString("en-GB", { weekday: "short" })
  const monthLabel = d.getDate() === 1
    ? d.toLocaleDateString("en-GB", { month: "short" })
    : null
  return { dayNum, dayName, monthLabel }
}

function friendlyDate(dateStr: string): string {
  const d = parseLocalDate(dateStr)
  const t = today()
  const tom = formatDate(new Date(parseLocalDate(t).getTime() + 86400000))
  if (dateStr === t) return "Today"
  if (dateStr === tom) return "Tomorrow"
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })
}

function buildDateRange(): string[] {
  const dates: string[] = []
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  for (let i = -3; i <= 90; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    dates.push(formatDate(d))
  }
  return dates
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CaseCard({
  planned,
  onDelete,
  showDate = false,
}: {
  planned: PlannedCase
  onDelete: (id: string) => void
  showDate?: boolean
}) {
  const procedure = useMemo(
    () => procedures.find((p) => p.id === planned.procedureId),
    [planned.procedureId],
  )
  const hasCard = (procedure?.sections?.length ?? 0) > 0 || hasVariantsForProcedure(planned.procedureId)
  const href = hasCard ? `/procedures/${planned.procedureId}` : null

  return (
    <div className="app-card-bg app-card-border rounded-2xl border px-4 py-3.5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {showDate && (
            <p className="text-[11px] font-semibold text-[#4DA3FF] mb-0.5 uppercase tracking-wide">
              {friendlyDate(planned.date)}
            </p>
          )}
          <p className="app-text-strong text-[15px] font-semibold leading-snug">{planned.procedureName}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {planned.time && (
              <span className="flex items-center gap-1 text-[12px] text-[#64748b]">
                <Clock size={11} /> {planned.time}
              </span>
            )}
            {planned.surgeonName && (
              <span className="flex items-center gap-1 text-[12px] text-[#64748b]">
                <User size={11} /> {planned.surgeonName}
              </span>
            )}
            {planned.theatre && (
              <span className="flex items-center gap-1 text-[12px] text-[#64748b]">
                <Scissors size={11} /> {planned.theatre}
              </span>
            )}
          </div>
          {planned.notes && (
            <p className="mt-1 text-[12px] text-[#94a3b8] line-clamp-1">{planned.notes}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {href && (
            <Link
              href={href}
              className="flex items-center gap-0.5 text-[12px] font-semibold text-[#4DA3FF]"
            >
              Card <ChevronRight size={12} />
            </Link>
          )}
          <button
            onClick={() => onDelete(planned.id)}
            className="rounded-lg p-1.5 text-[#cbd5e1] transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Case Sheet ────────────────────────────────────────────────────────────

function AddCaseSheet({
  initialDate,
  onClose,
  onSave,
}: {
  initialDate: string
  onClose: () => void
  onSave: (data: Omit<PlannedCase, "id">) => void
}) {
  const [date, setDate]               = useState(initialDate)
  const [query, setQuery]             = useState("")
  const [selectedProc, setSelectedProc] = useState<{ id: string; name: string } | null>(null)
  const [time, setTime]               = useState("")
  const [surgeon, setSurgeon]         = useState("")
  const [theatre, setTheatre]         = useState("")
  const [notes, setNotes]             = useState("")

  const searchableProcedures = useMemo(
    () => procedures.filter((p) => !(p.id in SEED_SUPERSEDES) && (p.sections.length > 0 || hasVariantsForProcedure(p.id))),
    [],
  )

  const fuse = useMemo(
    () => new Fuse(searchableProcedures, { keys: ["name"], threshold: 0.4, minMatchCharLength: 2 }),
    [searchableProcedures],
  )

  const matches = useMemo(() => {
    if (query.trim().length < 2) return []
    return fuse.search(query.trim()).slice(0, 6)
  }, [query, fuse])

  const canSave = !!selectedProc && !!date

  function handleSave() {
    if (!canSave) return
    onSave({
      procedureId: selectedProc!.id,
      procedureName: selectedProc!.name,
      date,
      time: time || undefined,
      surgeonName: surgeon || undefined,
      theatre: theatre || undefined,
      notes: notes || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-lg rounded-t-[28px] bg-white pb-safe-area-inset-bottom lg:rounded-[28px] lg:mb-0">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="h-1 w-10 rounded-full bg-[#D5DCE3]" />
        </div>

        <div className="px-5 pb-6 pt-3">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-[18px] font-bold text-[#1E293B]">Add to planner</p>
            <button onClick={onClose} className="rounded-xl p-2 text-[#94a3b8] hover:bg-[#F4F7FA]">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Date */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-[#D5DCE3] bg-white px-3 py-3 text-[15px] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#4DA3FF]"
              />
            </div>

            {/* Procedure search */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                Procedure
              </label>
              {selectedProc ? (
                <div className="flex items-center justify-between rounded-xl border border-[#4DA3FF] bg-[#EFF8FF] px-3 py-3">
                  <p className="text-[15px] font-semibold text-[#1E293B]">{selectedProc.name}</p>
                  <button onClick={() => { setSelectedProc(null); setQuery("") }} className="text-[#94a3b8] hover:text-[#475569]">
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search procedures…"
                    autoFocus
                    className="w-full rounded-xl border border-[#D5DCE3] bg-white py-3 pl-9 pr-3 text-[15px] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#4DA3FF]"
                  />
                  {matches.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-[#D5DCE3] bg-white shadow-lg">
                      {matches.map(({ item }) => (
                        <button
                          key={item.id}
                          onClick={() => { setSelectedProc({ id: item.id, name: item.name }); setQuery("") }}
                          className="flex w-full items-center justify-between border-b border-[#F0F4F8] px-4 py-3 text-left last:border-0 hover:bg-[#F8FAFC]"
                        >
                          <span className="text-[14px] font-medium text-[#1E293B]">{item.name}</span>
                          <span className="text-[11px] text-[#94a3b8]">{item.specialty}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Optional fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                  Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl border border-[#D5DCE3] bg-white px-3 py-3 text-[15px] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#4DA3FF]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                  Theatre / Room
                </label>
                <input
                  type="text"
                  value={theatre}
                  onChange={(e) => setTheatre(e.target.value)}
                  placeholder="e.g. Theatre 4"
                  className="w-full rounded-xl border border-[#D5DCE3] bg-white px-3 py-3 text-[15px] placeholder:text-[#cbd5e1] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#4DA3FF]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                Surgeon
              </label>
              <input
                type="text"
                value={surgeon}
                onChange={(e) => setSurgeon(e.target.value)}
                placeholder="e.g. Mr J Wilson"
                className="w-full rounded-xl border border-[#D5DCE3] bg-white px-3 py-3 text-[15px] placeholder:text-[#cbd5e1] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#4DA3FF]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any prep notes…"
                rows={2}
                className="w-full resize-none rounded-xl border border-[#D5DCE3] bg-white px-3 py-3 text-[15px] placeholder:text-[#cbd5e1] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#4DA3FF]"
              />
            </div>
          </div>

          <button
            disabled={!canSave}
            onClick={handleSave}
            className="mt-5 w-full rounded-xl bg-[#4DA3FF] py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#2F8EF7] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save to planner
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CalendarPageClient() {
  const router = useRouter()
  const stripRef = useRef<HTMLDivElement>(null)

  const [uid, setUid]               = useState<string | null>(null)
  const [cases, setCases]           = useState<PlannedCase[]>([])
  const [firestoreUnavailable, setFirestoreUnavailable] = useState(false)
  const [selectedDate, setSelectedDate] = useState(today())
  const [tab, setTab]               = useState<Tab>("upcoming")
  const [showAdd, setShowAdd]       = useState(false)

  const dateRange = useMemo(() => buildDateRange(), [])

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => onAuthChange((u) => setUid(u?.uid ?? null)), [])

  // ── Firestore listener ────────────────────────────────────────────────────
  useEffect(() => {
    if (!db || !uid) {
      setFirestoreUnavailable(false)
      return
    }
    const q = query(
      collection(db, "planned_cases"),
      where("uid", "==", uid),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setFirestoreUnavailable(false)
        const rows: PlannedCase[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PlannedCase))
        setCases(rows.sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? ""))))
      },
      (err) => {
        console.warn("[PrepSight] planned_cases listener failed", err)
        setFirestoreUnavailable(true)
      },
    )
    return () => unsub()
  }, [uid])

  // ── Scroll strip to today on mount ────────────────────────────────────────
  useEffect(() => {
    const todayIdx = dateRange.indexOf(today())
    if (!stripRef.current || todayIdx < 0) return
    const cell = stripRef.current.children[todayIdx] as HTMLElement | undefined
    if (cell) cell.scrollIntoView({ inline: "center", behavior: "instant" })
  }, [dateRange])

  // ── Case counts per date ──────────────────────────────────────────────────
  const casesByDate = useMemo(() => {
    const map = new Map<string, PlannedCase[]>()
    for (const c of cases) {
      const list = map.get(c.date) ?? []
      list.push(c)
      map.set(c.date, list)
    }
    return map
  }, [cases])

  const selectedCases = casesByDate.get(selectedDate) ?? []

  const upcomingCases = useMemo(() => {
    const t = today()
    return cases.filter((c) => c.date >= t)
  }, [cases])

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave(data: Omit<PlannedCase, "id">) {
    if (!db || !uid) {
      // Optimistic local state (not persisted)
      const local: PlannedCase = { ...data, id: `local-${Date.now()}` }
      setCases((prev) => [...prev, local].sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? ""))))
      return
    }
    try {
      await addDoc(collection(db, "planned_cases"), {
        ...data,
        uid,
        createdAt: serverTimestamp(),
      })
    } catch (err) {
      console.warn("[PrepSight] planned_cases save failed", err)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (id.startsWith("local-")) {
      setCases((prev) => prev.filter((c) => c.id !== id))
      return
    }
    if (!db) return
    try {
      await deleteDoc(doc(db, "planned_cases", id))
    } catch (err) {
      console.warn("[PrepSight] planned_cases delete failed", err)
    }
  }

  // ── Prepare tab data ──────────────────────────────────────────────────────
  const prepCases = useMemo(() => {
    const t = today()
    const cutoff = formatDate(new Date(parseLocalDate(t).getTime() + 7 * 86400000))
    return upcomingCases
      .filter((c) => c.date <= cutoff)
      .map((c) => {
        const proc = procedures.find((p) => p.id === c.procedureId)
        const hasCard = (proc?.sections?.length ?? 0) > 0 || hasVariantsForProcedure(c.procedureId)
        const hasSurgeon = !!c.surgeonName
        const readiness = hasCard && hasSurgeon ? "green" : hasCard ? "amber" : "red"
        return { ...c, hasCard, hasSurgeon, readiness }
      })
  }, [upcomingCases])

  // ── Insights ──────────────────────────────────────────────────────────────
  const noCardCount = upcomingCases.filter((c) => {
    const proc = procedures.find((p) => p.id === c.procedureId)
    return !((proc?.sections?.length ?? 0) > 0 || hasVariantsForProcedure(c.procedureId))
  }).length

  const imminentCount = useMemo(() => {
    const t = today()
    const cutoff = formatDate(new Date(parseLocalDate(t).getTime() + 3 * 86400000))
    return upcomingCases.filter((c) => c.date <= cutoff).length
  }, [upcomingCases])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app-shell-bg min-h-screen">

      {/* Header */}
      <header className="app-header-bg app-card-border sticky top-0 z-30 border-b">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+8px)] lg:pt-3">
          <button
            onClick={() => router.back()}
            className="app-header-muted shrink-0 transition-colors hover:opacity-80"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="app-header-text flex-1 text-[18px] font-medium lg:text-base">Planner</h1>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#4DA3FF] px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2F8EF7]"
          >
            <Plus size={14} /> Add case
          </button>
          <Link href="/" className="app-header-muted shrink-0 rounded-lg p-2 transition-colors hover:opacity-80" aria-label="Home">
            <House size={18} />
          </Link>
        </div>
      </header>

      {/* Date strip */}
      <div className="app-header-bg app-card-border border-b">
        <div
          ref={stripRef}
          className="flex gap-1 overflow-x-auto px-3 py-3 scrollbar-hide"
          style={{ scrollbarWidth: "none" }}
        >
          {dateRange.map((dateStr) => {
            const { dayNum, dayName, monthLabel } = getDayLabel(dateStr)
            const isToday = dateStr === today()
            const isSelected = dateStr === selectedDate
            const count = casesByDate.get(dateStr)?.length ?? 0

            return (
              <button
                key={dateStr}
                onClick={() => { setSelectedDate(dateStr); setTab("upcoming") }}
                className={`flex shrink-0 flex-col items-center rounded-2xl px-3 py-2 transition-all ${
                  isSelected
                    ? "bg-[#4DA3FF] text-white shadow-md"
                    : isToday
                      ? "bg-[#EFF8FF] text-[#4DA3FF]"
                      : "text-[#475569] hover:bg-[#F4F7FA]"
                }`}
              >
                {monthLabel && (
                  <span className={`mb-0.5 text-[9px] font-bold uppercase tracking-widest ${isSelected ? "text-white/70" : "text-[#94a3b8]"}`}>
                    {monthLabel}
                  </span>
                )}
                <span className={`text-[11px] font-medium ${isSelected ? "text-white/80" : isToday ? "text-[#4DA3FF]" : "text-[#94a3b8]"}`}>
                  {dayName}
                </span>
                <span className="text-[17px] font-bold leading-tight">{dayNum}</span>
                <div className={`mt-1 h-1.5 w-1.5 rounded-full transition-all ${count > 0 ? (isSelected ? "bg-white" : "bg-[#4DA3FF]") : "opacity-0"}`} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab bar */}
      <div className="app-header-bg app-card-border border-b">
        <div className="max-w-2xl mx-auto flex gap-1 px-4 py-2">
          {(["upcoming", "prepare", "insights"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-1.5 text-[13px] font-semibold capitalize transition-all ${
                tab === t ? "bg-[#4DA3FF] text-white" : "text-[#64748b] hover:bg-[#F4F7FA]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-5">

        {/* ── Upcoming ─────────────────────────────────────────────────────── */}
        {tab === "upcoming" && (
          <div>
            {firestoreUnavailable ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
                Planner sync is unavailable for this account. Cases added here will remain local on this device until Firestore access is available.
              </div>
            ) : null}

            <div className="mb-3 flex items-center justify-between">
              <p className="app-text-strong text-[15px] font-semibold">
                {friendlyDate(selectedDate)}
              </p>
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1 text-[13px] font-semibold text-[#4DA3FF]"
              >
                <Plus size={13} /> Add
              </button>
            </div>

            {selectedCases.length === 0 ? (
              <div className="app-card-bg app-card-border rounded-2xl border border-dashed px-5 py-10 text-center">
                <CalendarDays size={28} className="mx-auto mb-3 text-[#CBD5E1]" />
                <p className="app-text-muted text-[14px]">No cases planned for this day</p>
                <button
                  onClick={() => setShowAdd(true)}
                  className="mt-3 text-[13px] font-semibold text-[#4DA3FF] hover:underline"
                >
                  Add a case
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedCases.map((c) => (
                  <CaseCard key={c.id} planned={c} onDelete={handleDelete} />
                ))}
              </div>
            )}

            {/* All upcoming section */}
            {upcomingCases.length > 0 && (
              <div className="mt-8">
                <p className="app-text-muted mb-3 text-[11px] font-semibold uppercase tracking-wide">
                  All upcoming ({upcomingCases.length})
                </p>
                <div className="space-y-3">
                  {upcomingCases
                    .filter((c) => c.date !== selectedDate)
                    .map((c) => (
                      <CaseCard key={c.id} planned={c} onDelete={handleDelete} showDate />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Prepare ──────────────────────────────────────────────────────── */}
        {tab === "prepare" && (
          <div>
            <p className="app-text-muted mb-4 text-[13px]">
              Next 7 days — readiness check for each planned case.
            </p>

            {prepCases.length === 0 ? (
              <div className="app-card-bg app-card-border rounded-2xl border border-dashed px-5 py-10 text-center">
                <p className="app-text-muted text-[14px]">No cases in the next 7 days</p>
              </div>
            ) : (
              <div className="space-y-3">
                {prepCases.map((c) => (
                  <div key={c.id} className="app-card-bg app-card-border rounded-2xl border px-4 py-3.5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                          c.readiness === "green" ? "bg-emerald-400" :
                          c.readiness === "amber" ? "bg-amber-400" : "bg-red-400"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="app-text-strong text-[14px] font-semibold">{c.procedureName}</p>
                        <p className="text-[11px] font-semibold text-[#4DA3FF] mt-0.5">{friendlyDate(c.date)}{c.time ? ` · ${c.time}` : ""}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${c.hasCard ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                            {c.hasCard ? <CheckCircle2 size={11} /> : <Circle size={11} />}
                            Kardex card
                          </span>
                          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${c.hasSurgeon ? "bg-emerald-50 text-emerald-700" : "bg-[#F4F7FA] text-[#94a3b8]"}`}>
                            {c.hasSurgeon ? <CheckCircle2 size={11} /> : <Circle size={11} />}
                            Surgeon noted
                          </span>
                        </div>
                      </div>
                      <button onClick={() => handleDelete(c.id)} className="shrink-0 rounded-lg p-1.5 text-[#cbd5e1] hover:bg-red-50 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Insights ─────────────────────────────────────────────────────── */}
        {tab === "insights" && (
          <div className="space-y-3">
            {upcomingCases.length === 0 ? (
              <div className="app-card-bg app-card-border rounded-2xl border border-dashed px-5 py-10 text-center">
                <p className="app-text-muted text-[14px]">Add cases to your planner to see insights</p>
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className="app-card-bg app-card-border rounded-2xl border px-4 py-4 shadow-sm">
                  <p className="app-text-strong text-[14px] font-bold mb-3">Overview</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-[22px] font-bold text-[#1E293B]">{upcomingCases.length}</p>
                      <p className="text-[11px] text-[#94a3b8]">Upcoming</p>
                    </div>
                    <div>
                      <p className="text-[22px] font-bold text-[#1E293B]">{imminentCount}</p>
                      <p className="text-[11px] text-[#94a3b8]">Next 3 days</p>
                    </div>
                    <div>
                      <p className={`text-[22px] font-bold ${noCardCount > 0 ? "text-amber-500" : "text-emerald-500"}`}>{noCardCount}</p>
                      <p className="text-[11px] text-[#94a3b8]">No card</p>
                    </div>
                  </div>
                </div>

                {/* Flags */}
                {noCardCount > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
                      <div>
                        <p className="text-[13px] font-semibold text-amber-800">
                          {noCardCount} case{noCardCount !== 1 ? "s" : ""} without a Kardex card
                        </p>
                        <p className="mt-0.5 text-[12px] text-amber-700">
                          No reference card or variant data available. Verify preparation manually.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {imminentCount > 0 && (
                  <div className="rounded-2xl border border-[#B8DBFF] bg-[#EFF8FF] px-4 py-3.5">
                    <div className="flex items-start gap-2.5">
                      <CalendarDays size={15} className="mt-0.5 shrink-0 text-[#4DA3FF]" />
                      <div>
                        <p className="text-[13px] font-semibold text-[#1E4E8C]">
                          {imminentCount} case{imminentCount !== 1 ? "s" : ""} in the next 3 days
                        </p>
                        <p className="mt-0.5 text-[12px] text-[#2563EB]">
                          Check the Prepare tab to confirm readiness.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {noCardCount === 0 && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
                      <p className="text-[13px] font-semibold text-emerald-800">
                        All planned cases have reference cards
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Add case sheet */}
      {showAdd && (
        <AddCaseSheet
          initialDate={selectedDate}
          onClose={() => setShowAdd(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
