"use client"

import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  X,
  Package,
  Bone,
  Settings,
  Zap,
  Thermometer,
  LayoutGrid,
  Wrench,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
  Clock,
} from "lucide-react"
import { db } from "@/lib/firebase"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { onAuthChange } from "@/lib/auth"
import { getProfile } from "@/lib/profile"
import { SEED_ITEMS, getStockStatus, type StockItem, type StockStatus, type IconKey } from "@/lib/stockroom-data"

interface LastEdit {
  by: string
  at: string
}

// StockItem, StockStatus, IconKey imported from @/lib/stockroom-data
// Extend locally to include lastEdit UI state
interface StockItemWithEdit extends StockItem {
  lastEdit?: LastEdit
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatus(qty: number, par: number): StockStatus {
  return getStockStatus(qty, par)
}

function qtyColor(status: StockStatus): string {
  switch (status) {
    case "OK":       return "text-emerald-600"
    case "Low":      return "text-amber-600"
    case "Critical": return "text-red-500"
    case "Out":      return "text-red-600"
  }
}

function statusBadge(status: StockStatus): string {
  switch (status) {
    case "OK":       return "bg-emerald-50 text-emerald-700"
    case "Low":      return "bg-amber-50 text-amber-700"
    case "Critical": return "bg-red-50 text-red-600"
    case "Out":      return "bg-red-100 text-red-700"
  }
}

function formatName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length < 2) return parts[0]
  return `${parts[0][0]}. ${parts[parts.length - 1]}`
}

function formatTime(): string {
  const now = new Date()
  const day = now.getDate()
  const month = now.toLocaleString("en-GB", { month: "short" })
  const hh = String(now.getHours()).padStart(2, "0")
  const mm = String(now.getMinutes()).padStart(2, "0")
  return `${day} ${month} · ${hh}:${mm}`
}

function formatShortTime(): string {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, "0")
  const mm = String(now.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

// Worst status across a set of items
function worstStatus(statuses: StockStatus[]): StockStatus {
  if (statuses.includes("Out"))      return "Out"
  if (statuses.includes("Critical")) return "Critical"
  if (statuses.includes("Low"))      return "Low"
  return "OK"
}

// ── Seed data ─────────────────────────────────────────────────────────────────

// SEED_ITEMS imported from @/lib/stockroom-data

const ICON_MAP: Record<IconKey, React.ElementType> = {
  bone:        Bone,
  package:     Package,
  settings:    Settings,
  zap:         Zap,
  thermometer: Thermometer,
  layout:      LayoutGrid,
  wrench:      Wrench,
}

const STATUS_OPTS   = ["All", "OK", "Low", "Critical", "Out"]
const CATEGORY_OPTS = ["All", "Implants", "Consumables", "Equipment"]

// ── Derived group structure ───────────────────────────────────────────────────

// Returns unique group names in insertion order
function getGroups(items: StockItem[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of items) {
    if (item.group && !seen.has(item.group)) {
      seen.add(item.group)
      out.push(item.group)
    }
  }
  return out
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="shrink-0 text-center min-w-[72px]">
      <p className={`text-xl font-bold ${color ?? "text-[#3F4752]"}`}>{value}</p>
      <p className="text-xs text-[#94A3B8] mt-0.5 whitespace-nowrap">{label}</p>
    </div>
  )
}

// ── Group aggregate badge ─────────────────────────────────────────────────────

function GroupBadge({ items }: { items: StockItem[] }) {
  const statuses = items.map(i => getStatus(i.qty, i.par))
  const worst = worstStatus(statuses)
  const outCount = statuses.filter(s => s === "Out").length

  if (worst === "Out") {
    return (
      <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-red-100 text-red-700 whitespace-nowrap">
        ⚠ {outCount} out
      </span>
    )
  }
  if (worst === "Critical") {
    return (
      <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-red-50 text-red-600 whitespace-nowrap">
        ⚠ Critical
      </span>
    )
  }
  if (worst === "Low") {
    return (
      <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-amber-50 text-amber-700 whitespace-nowrap">
        Low stock
      </span>
    )
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-emerald-50 text-emerald-700 whitespace-nowrap">
      All OK
    </span>
  )
}

// ── Detail panel content ──────────────────────────────────────────────────────

interface DetailPanelProps {
  item: StockItemWithEdit
  onClose: () => void
  onAdjust: (item: StockItemWithEdit, delta: number) => void
}

function DetailPanelContent({ item, onClose, onAdjust }: DetailPanelProps) {
  const Icon = ICON_MAP[item.icon]
  const st = getStatus(item.qty, item.par)
  return (
    <>
      <div className="flex items-start justify-between mb-4">
        <div className="w-28 h-28 rounded-2xl bg-[#F0F4F8] flex items-center justify-center lg:w-32 lg:h-32">
          <Icon size={48} className="text-[#4DA3FF] lg:hidden" />
          <Icon size={52} className="text-[#4DA3FF] hidden lg:block" />
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F4F7FA] transition-colors">
          <X size={20} className="text-[#94A3B8]" />
        </button>
      </div>
      <h2 className="text-lg font-bold text-[#3F4752]">
        {item.group ? `${item.group} — ${item.name}` : item.name}
      </h2>
      <span className="inline-block mt-1 font-mono text-xs bg-[#F0F4F8] text-[#526579] px-2 py-0.5 rounded-md">
        {item.sku}
      </span>
      <div className="mt-4 space-y-2">
        {([
          ["Category",  item.category],
          ["Location",  item.location],
          ["Par Level", String(item.par)],
        ] as [string, string][]).map(([l, v]) => (
          <div key={l} className="flex items-center justify-between border-b border-[#D5DCE3] pb-2">
            <span className="text-xs text-[#94A3B8]">{l}</span>
            <span className="text-sm text-[#3F4752] font-medium">{v}</span>
          </div>
        ))}
        <div className="flex items-center justify-between border-b border-[#D5DCE3] pb-2">
          <span className="text-xs text-[#94A3B8]">Current Qty</span>
          <span className={`text-2xl font-bold ${qtyColor(st)}`}>{item.qty}</span>
        </div>
        <div className="flex items-center justify-between border-b border-[#D5DCE3] pb-2">
          <span className="text-xs text-[#94A3B8]">Status</span>
          <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${statusBadge(st)}`}>{st}</span>
        </div>
        {item.lastEdit && (
          <div className="flex items-center justify-between border-b border-[#D5DCE3] pb-2">
            <span className="text-xs text-[#94A3B8]">Last modified</span>
            <span className="text-xs text-[#526579]">{item.lastEdit.by} · {item.lastEdit.at}</span>
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-6">
        <button
          onClick={() => onAdjust(item, -1)}
          disabled={item.qty === 0}
          className="flex-1 py-3 rounded-xl border border-[#D5DCE3] text-sm font-medium text-[#3F4752] hover:bg-[#F4F7FA] disabled:opacity-40 transition-colors flex items-center justify-center gap-1"
        >
          <Minus size={14} /> Remove
        </button>
        <button
          onClick={() => onAdjust(item, 1)}
          className="flex-1 py-3 rounded-xl bg-[#4DA3FF] text-white text-sm font-medium hover:bg-[#2F8EF7] transition-colors flex items-center justify-center gap-1"
        >
          <Plus size={14} /> Add
        </button>
      </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StockroomPage() {
  const searchParams = useSearchParams()
  const [items,         setItems]         = useState<StockItemWithEdit[]>(SEED_ITEMS)
  const [catFilter,     setCatFilter]     = useState("All")
  const [statusFilter,  setStatusFilter]  = useState("All")
  const [query,         setQuery]         = useState(() => searchParams.get("system") ?? "")
  const [selected,      setSelected]      = useState<StockItemWithEdit | null>(null)
  const [collapsed,     setCollapsed]     = useState<Set<string>>(new Set())
  const [filterOpen,    setFilterOpen]    = useState(false)
  const [uid,           setUid]           = useState<string | null>(null)

  // Auth listener
  useEffect(() => onAuthChange((user) => setUid(user?.uid ?? null)), [])

  // Toggle group collapse
  function toggleGroup(group: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  // Firestore audit + optimistic update
  const adjustQty = useCallback(
    async (item: StockItemWithEdit, delta: number) => {
      const profile = getProfile()
      const by = profile?.name ? formatName(profile.name) : "Staff"
      const at = formatTime()

      // 1. Optimistic local update
      setItems(prev =>
        prev.map(i => {
          if (i.id !== item.id) return i
          const newQty = Math.max(0, i.qty + delta)
          return { ...i, qty: newQty, lastEdit: { by, at } }
        })
      )
      // Update selected panel if open
      setSelected(prev =>
        prev?.id === item.id
          ? { ...prev, qty: Math.max(0, prev.qty + delta), lastEdit: { by, at } }
          : prev
      )

      // 2. Firestore write (fire-and-forget)
      if (!db || !uid) return
      try {
        await setDoc(
          doc(db, "stockroom_items", item.sku),
          {
            qty: Math.max(0, item.qty + delta),
            lastEdit: { by, uid, at: serverTimestamp() },
          },
          { merge: true }
        )
      } catch {
        // revert on failure
        setItems(prev =>
          prev.map(i => i.id === item.id ? { ...i, qty: item.qty, lastEdit: item.lastEdit } : i)
        )
        setSelected(prev =>
          prev?.id === item.id ? { ...prev, qty: item.qty, lastEdit: item.lastEdit } : prev
        )
      }
    },
    [uid]
  )

  // ── Derived filtered data ─────────────────────────────────────────────────

  const q = query.trim().toLowerCase()

  // For each item compute its status
  const itemsWithStatus = items.map(i => ({ ...i, _status: getStatus(i.qty, i.par) }))

  // Apply category + status filters
  const afterFilters = itemsWithStatus.filter(i => {
    if (catFilter !== "All" && i.category !== catFilter) return false
    if (statusFilter !== "All" && i._status !== statusFilter) return false
    return true
  })

  // Apply search — for grouped items: include group if query matches group name OR any variant
  const groupedItemIds = new Set<string>()
  if (q) {
    const groups = getGroups(afterFilters)
    groups.forEach(group => {
      const groupItems = afterFilters.filter(i => i.group === group)
      const groupMatches = group.toLowerCase().includes(q)
      const anyVariantMatches = groupItems.some(
        i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)
      )
      if (groupMatches || anyVariantMatches) {
        groupItems.forEach(i => groupedItemIds.add(i.id))
      }
    })
  }

  const filteredItems = q
    ? afterFilters.filter(i => {
        if (i.group) return groupedItemIds.has(i.id)
        return (
          i.name.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q)
        )
      })
    : afterFilters

  // KPI — count ALL seed items (all size variants) regardless of filter
  const allWithStatus = items.map(i => ({ ...i, _status: getStatus(i.qty, i.par) }))
  const kpi = {
    total:    allWithStatus.length,
    ok:       allWithStatus.filter(i => i._status === "OK").length,
    low:      allWithStatus.filter(i => i._status === "Low").length,
    critical: allWithStatus.filter(i => i._status === "Critical").length,
    out:      allWithStatus.filter(i => i._status === "Out").length,
  }

  const activeFilterCount = [catFilter !== "All", statusFilter !== "All"].filter(Boolean).length

  // Build render list: groups first (Implants), then flat items
  const groups = getGroups(filteredItems)
  const flatItems = filteredItems.filter(i => !i.group)

  // ── Render ───────────────────────────────────────────────────────────────

  function renderGroupBlock(group: string) {
    const groupItems = filteredItems.filter(i => i.group === group)
    if (groupItems.length === 0) return null
    const first = groupItems[0]
    const isExpanded = !collapsed.has(group)
    const statuses = groupItems.map(i => getStatus(i.qty, i.par))
    const worst = worstStatus(statuses)

    return (
      <div key={group}>
        {/* Group header row */}
        <button
          onClick={() => toggleGroup(group)}
          className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-[#D5DCE3] hover:bg-[#F4F7FA] transition-colors lg:px-8"
        >
          {isExpanded
            ? <ChevronDown size={16} className="text-[#94A3B8] shrink-0" />
            : <ChevronRight size={16} className="text-[#94A3B8] shrink-0" />}
          <Bone size={18} className="text-[#4DA3FF] shrink-0" />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-bold text-[#3F4752] truncate">{group}</p>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              {first.supplier} · {first.subcategory}
            </p>
          </div>
          <GroupBadge items={groupItems} />
        </button>

        {/* Size sub-rows */}
        {isExpanded && groupItems.map((item, idx) => {
          const st = getStatus(item.qty, item.par)
          const isSelected = selected?.id === item.id
          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 pl-14 pr-4 py-3 border-b border-[#D5DCE3]/60 hover:bg-[#F4F7FA] transition-colors lg:pl-20 lg:pr-8 ${
                isSelected ? "bg-[#F4F7FA]" : ""
              } ${idx === groupItems.length - 1 ? "border-[#D5DCE3]" : ""}`}
            >
              {/* Item info — clickable for detail panel */}
              <button
                className="flex-1 min-w-0 text-left"
                onClick={() => setSelected(isSelected ? null : items.find(i => i.id === item.id) ?? null)}
              >
                <p className="text-sm font-medium text-[#3F4752]">{item.name}</p>
                <p className="text-[11px] text-[#94A3B8] font-mono mt-0.5">{item.sku}</p>
                {item.lastEdit && (
                  <span className="flex items-center gap-1 mt-0.5">
                    <Clock size={9} className="text-[#94A3B8]" />
                    <span className="text-[10px] text-[#94A3B8]">
                      {item.lastEdit.by} · {formatShortTime()}
                    </span>
                  </span>
                )}
              </button>

              {/* Qty + controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => adjustQty(item, -1)}
                  disabled={item.qty === 0}
                  className="w-7 h-7 rounded-lg border border-[#D5DCE3] flex items-center justify-center hover:bg-[#F4F7FA] disabled:opacity-40 transition-colors"
                >
                  <Minus size={11} />
                </button>
                <span className={`text-base font-bold w-7 text-center tabular-nums ${qtyColor(st)}`}>
                  {item.qty}
                </span>
                <button
                  onClick={() => adjustQty(item, 1)}
                  className="w-7 h-7 rounded-lg border border-[#D5DCE3] flex items-center justify-center hover:bg-[#F4F7FA] transition-colors"
                >
                  <Plus size={11} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  function renderFlatItem(item: StockItemWithEdit & { _status: StockStatus }) {
    const Icon = ICON_MAP[item.icon]
    const isSelected = selected?.id === item.id
    return (
      <div
        key={item.id}
        className={`flex items-center gap-3 px-4 py-4 border-b border-[#D5DCE3] hover:bg-[#F4F7FA] transition-colors lg:px-8 ${
          isSelected ? "bg-[#F4F7FA]" : ""
        }`}
      >
        <div className="w-14 h-14 rounded-xl bg-[#F0F4F8] flex items-center justify-center shrink-0">
          <Icon size={24} className="text-[#4DA3FF]" />
        </div>

        <button
          className="flex-1 min-w-0 text-left"
          onClick={() => setSelected(isSelected ? null : items.find(i => i.id === item.id) ?? null)}
        >
          <p className="text-sm font-semibold text-[#3F4752] truncate">{item.name}</p>
          <p className="text-xs text-[#94A3B8] mt-0.5 font-mono">{item.sku}</p>
          <p className="text-xs text-[#526579] mt-0.5">Par: {item.par} · {item.location}</p>
          {item.lastEdit && (
            <span className="flex items-center gap-1 mt-0.5">
              <Clock size={9} className="text-[#94A3B8]" />
              <span className="text-[10px] text-[#94A3B8]">
                {item.lastEdit.by} · {item.lastEdit.at}
              </span>
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => adjustQty(item, -1)}
              disabled={item.qty === 0}
              className="w-7 h-7 rounded-lg border border-[#D5DCE3] flex items-center justify-center hover:bg-[#F4F7FA] disabled:opacity-40 transition-colors"
            >
              <Minus size={11} />
            </button>
            <span className={`text-lg font-bold w-8 text-center tabular-nums ${qtyColor(item._status)}`}>
              {item.qty}
            </span>
            <button
              onClick={() => adjustQty(item, 1)}
              className="w-7 h-7 rounded-lg border border-[#D5DCE3] flex items-center justify-center hover:bg-[#F4F7FA] transition-colors"
            >
              <Plus size={11} />
            </button>
          </div>
          <ChevronRight size={16} className="text-[#94A3B8]" />
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell-bg min-h-screen">
      {/* Header */}
      <header className="bg-[#00B4D8] px-4 py-3 lg:px-8 lg:py-4 flex items-center gap-3">
        <Link href="/catalogue" className="p-2 rounded-xl hover:bg-white/10 transition-colors">
          <ArrowLeft size={20} className="text-[#10243E]" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-[#10243E] lg:text-2xl leading-tight">Stockroom</h1>
          <p className="text-xs text-[#10243E]/70">Theatre Store A &amp; B</p>
        </div>
        <button className="p-2 rounded-xl hover:bg-white/10 transition-colors">
          <RefreshCw size={18} className="text-[#10243E]" />
        </button>
      </header>

      {/* KPI strip */}
      <div className="bg-white border-b border-[#D5DCE3] px-4 py-3 flex gap-6 overflow-x-auto lg:px-8">
        <KpiCard label="Total Lines" value={kpi.total} />
        <div className="w-px bg-[#D5DCE3] shrink-0" />
        <KpiCard label="OK"       value={kpi.ok}       color="text-emerald-600" />
        <KpiCard label="Low"      value={kpi.low}      color="text-amber-600" />
        <KpiCard label="Critical" value={kpi.critical} color="text-red-500" />
        <KpiCard label="Out"      value={kpi.out}      color="text-red-700" />
      </div>

      {/* Search bar */}
      <div className="bg-white border-b border-[#D5DCE3] px-4 py-2.5 lg:px-8">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search by name, SKU, or system…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-[#D5DCE3] rounded-xl bg-[#F4F7FA] text-[#3F4752] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#4DA3FF] focus:bg-white transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#526579]"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white border-b border-[#D5DCE3] px-4 py-2.5 flex items-center gap-2 lg:px-8">
        {/* Mobile: single Filters button */}
        <button
          onClick={() => setFilterOpen(true)}
          className={`lg:hidden flex items-center gap-2 border rounded-lg px-3 py-1.5 text-sm shrink-0 transition-colors ${
            activeFilterCount > 0
              ? "border-[#4DA3FF] text-[#4DA3FF] bg-[#EAF3FF]"
              : "border-[#D5DCE3] text-[#526579]"
          }`}
        >
          <SlidersHorizontal size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#4DA3FF] text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Desktop: inline dropdowns */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="hidden lg:block text-sm border border-[#D5DCE3] rounded-lg px-3 py-1.5 bg-white text-[#3F4752]"
        >
          {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="hidden lg:block text-sm border border-[#D5DCE3] rounded-lg px-3 py-1.5 bg-white text-[#3F4752]"
        >
          {CATEGORY_OPTS.map(c => <option key={c}>{c}</option>)}
        </select>

        <span className="ml-auto text-xs text-[#94A3B8] self-center whitespace-nowrap shrink-0">
          {filteredItems.length} items
        </span>
      </div>

      {/* Mobile filter sheet */}
      {filterOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setFilterOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 lg:hidden shadow-2xl">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#D5DCE3]" />
            </div>
            <div className="px-6 pb-8">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-[#3F4752]">Filters</h3>
                <button
                  onClick={() => { setStatusFilter("All"); setCatFilter("All") }}
                  className="text-sm text-[#4DA3FF]"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1.5 uppercase tracking-wider">Status</label>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="w-full text-sm border border-[#D5DCE3] rounded-xl px-3 py-2.5 bg-white text-[#3F4752]">
                    {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1.5 uppercase tracking-wider">Category</label>
                  <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                    className="w-full text-sm border border-[#D5DCE3] rounded-xl px-3 py-2.5 bg-white text-[#3F4752]">
                    {CATEGORY_OPTS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <button
                onClick={() => setFilterOpen(false)}
                className="mt-6 w-full py-3 bg-[#4DA3FF] text-white font-semibold rounded-xl text-sm"
              >
                Show {filteredItems.length} results
              </button>
            </div>
          </div>
        </>
      )}

      {/* Desktop two-col */}
      <div className="lg:flex lg:h-[calc(100vh-192px)]">

        {/* Left: scrollable list */}
        <div className="bg-white lg:flex-1 lg:overflow-y-auto lg:border-r lg:border-[#D5DCE3]">
          {groups.map(group => renderGroupBlock(group))}
          {flatItems.map(item => renderFlatItem(item as StockItemWithEdit & { _status: StockStatus }))}
          {filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8] gap-2">
              <Package size={32} className="text-[#D5DCE3]" />
              <p className="text-sm">No items match your search</p>
            </div>
          )}
        </div>

        {/* Desktop right panel */}
        <div className="hidden lg:flex w-[400px] bg-white flex-col overflow-y-auto">
          {selected ? (
            <div className="p-6">
              <DetailPanelContent
                item={selected}
                onClose={() => setSelected(null)}
                onAdjust={adjustQty}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#94A3B8] text-sm gap-2 p-8">
              <Package size={32} className="text-[#D5DCE3]" />
              <p>Select an item to view stock details</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile detail sheet */}
      {selected && (
        <div className="lg:hidden">
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelected(null)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-[#D5DCE3]" />
            </div>
            <div className="p-6">
              <DetailPanelContent
                item={selected}
                onClose={() => setSelected(null)}
                onAdjust={adjustQty}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
