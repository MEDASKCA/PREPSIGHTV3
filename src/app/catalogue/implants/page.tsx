"use client"

import Link from "next/link"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ArrowLeft,
  SlidersHorizontal,
  ChevronRight,
  X,
  Bone,
  Minus,
  Plus,
  Search,
  Clock,
} from "lucide-react"
import { db } from "@/lib/firebase"
import {
  doc,
  onSnapshot,
  updateDoc,
  increment,
  setDoc,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore"
import { onAuthChange } from "@/lib/auth"
import { getProfile } from "@/lib/profile"
import {
  getFixedDataImplantCategoryOptions,
  getFixedDataLibraryImplants,
  getFixedDataSupplierOptions,
} from "@/lib/fixed-data-entities"

// ── Types ─────────────────────────────────────────────────────────────────────

type ImplantStatus = "In Stock" | "Low Stock" | "Out of Stock"

interface Implant {
  id: string
  name: string
  sku: string
  supplier: string
  subcategory: string
  entityKind: "system" | "component"
  status: ImplantStatus
  qty: number
  location?: string
  supplierPhone?: string
}

interface LastEdit {
  by: string
  at: string
}

interface RackItem {
  id: string
  name: string
  catNo: string
  total: number
  available: number
  theatre: string
  lastEdit?: LastEdit
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const SEED_RACK: RackItem[] = [
  { id: "r1", name: "Triathlon CR Femoral — Size 4",  catNo: "715-740-004", total: 2, available: 2, theatre: "TH-1" },
  { id: "r2", name: "Triathlon CR Femoral — Size 5",  catNo: "715-740-005", total: 3, available: 1, theatre: "TH-1" },
  { id: "r3", name: "Triathlon CR Femoral — Size 6",  catNo: "715-740-006", total: 2, available: 0, theatre: "TH-2" },
  { id: "r4", name: "Triathlon PS Tibial — Size 4",   catNo: "715-741-004", total: 2, available: 2, theatre: "TH-1" },
  { id: "r5", name: "Triathlon PS Tibial — Size 5",   catNo: "715-741-005", total: 4, available: 3, theatre: "TH-3" },
  { id: "r6", name: "Triathlon Poly Insert 10mm",     catNo: "715-742-010", total: 6, available: 4, theatre: "TH-1" },
  { id: "r7", name: "Triathlon Poly Insert 12mm",     catNo: "715-742-012", total: 3, available: 1, theatre: "TH-2" },
]

const STATUSES  = ["All Status", "In Stock", "Low Stock", "Out of Stock"]

// ── Status helpers ─────────────────────────────────────────────────────────────

function statusColor(status: string): string {
  switch (status) {
    case "In Stock":     return "text-emerald-600"
    case "Low Stock":    return "text-amber-600"
    case "Out of Stock": return "text-red-500"
    default:             return "text-[#94A3B8]"
  }
}

function availableColor(n: number): string {
  if (n === 0) return "text-red-500"
  if (n === 1) return "text-amber-600"
  return "text-emerald-600"
}

// ── Detail sheet (mobile) ──────────────────────────────────────────────────────

function DetailSheet({ implant, onClose }: { implant: Implant; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 lg:hidden shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-[#D5DCE3]" />
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-36 h-36 rounded-2xl bg-[#F0F4F8] flex items-center justify-center">
              <Bone size={56} className="text-[#4DA3FF]" />
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F4F7FA] transition-colors">
              <X size={20} className="text-[#94A3B8]" />
            </button>
          </div>
          <h2 className="text-lg font-bold text-[#3F4752] mt-2">{implant.name}</h2>
          <span className="inline-block mt-1 font-mono text-xs bg-[#F0F4F8] text-[#526579] px-2 py-0.5 rounded-md">
            {implant.sku}
          </span>
          <div className="mt-4 space-y-2">
            {[
              ["Supplier",      implant.supplier],
              ["Type",          implant.entityKind === "system" ? "System" : "Component"],
              ["Category",      implant.subcategory],
              ["Available Qty", String(implant.qty)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-[#D5DCE3] pb-2">
                <span className="text-xs text-[#94A3B8]">{label}</span>
                <span className="text-sm text-[#3F4752] font-medium">{value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-b border-[#D5DCE3] pb-2">
              <span className="text-xs text-[#94A3B8]">Status</span>
              <span className={`text-sm font-medium ${statusColor(implant.status)}`}>{implant.status}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ImplantsPage() {
  const [subFilter,      setSubFilter]      = useState("All")
  const [supplierFilter, setSupplierFilter] = useState("All Suppliers")
  const [statusFilter,   setStatusFilter]   = useState("All Status")
  const [selected,       setSelected]       = useState<Implant | null>(null)
  const [rackItems,      setRackItems]      = useState<RackItem[]>(SEED_RACK)
  const [rackConnected,  setRackConnected]  = useState(false)
  const [query,          setQuery]          = useState("")
  const [filterOpen,     setFilterOpen]     = useState(false)
  const [uid,            setUid]            = useState<string | null>(null)

  const implants = useMemo<Implant[]>(
    () =>
      getFixedDataLibraryImplants().map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        supplier: item.supplier,
        subcategory: item.subcategory,
        entityKind: item.entityKind,
        status: "In Stock",
        qty: item.qty,
        location: item.context,
      })),
    [],
  )

  const subcategories = useMemo(() => getFixedDataImplantCategoryOptions(), [])
  const suppliers = useMemo(() => getFixedDataSupplierOptions(), [])

  // Auth listener
  useEffect(() => onAuthChange((user) => setUid(user?.uid ?? null)), [])

  const activeFilterCount = [
    subFilter !== "All",
    supplierFilter !== "All Suppliers",
    statusFilter !== "All Status",
  ].filter(Boolean).length

  // Firestore real-time rack listener
  useEffect(() => {
    if (!db) return
    const ref = doc(db, "implant_racks", "stryker-triathlon-cr")
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as DocumentData
          if (Array.isArray(data.items)) {
            setRackItems(data.items as RackItem[])
          }
        }
        setRackConnected(true)
      },
      () => setRackConnected(false)
    )
    return () => unsub()
  }, [])

  const adjustQty = useCallback(
    async (itemId: string, delta: number) => {
      const profile = getProfile()
      const by = profile?.name ? formatName(profile.name) : "Staff"
      const at = formatTime()

      // 1. Optimistic local update with lastEdit attribution
      let prevAvailable = 0
      setRackItems(prev =>
        prev.map(r => {
          if (r.id !== itemId) return r
          prevAvailable = r.available
          return { ...r, available: Math.max(0, r.available + delta), lastEdit: { by, at } }
        })
      )

      if (!db) return

      try {
        // 2. Update the rack document (available count)
        await updateDoc(doc(db, "implant_racks", "stryker-triathlon-cr"), {
          [`items.${itemId}.available`]: increment(delta),
        })

        // 3. Write audit log entry to sub-collection (only when signed in)
        if (uid) {
          const auditRef = doc(
            db,
            "implant_racks",
            "stryker-triathlon-cr",
            "audit_log",
            Date.now().toString()
          )
          await setDoc(auditRef, {
            itemId,
            delta,
            newQty: Math.max(0, prevAvailable + delta),
            by,
            uid,
            at: serverTimestamp(),
          })
        }
      } catch {
        // Revert on failure
        setRackItems(prev =>
          prev.map(r =>
            r.id === itemId
              ? { ...r, available: prevAvailable, lastEdit: undefined }
              : r
          )
        )
      }
    },
    [uid]
  )

  const filtered = implants.filter(i => {
    if (subFilter !== "All"                && i.subcategory !== subFilter)      return false
    if (supplierFilter !== "All Suppliers" && i.supplier    !== supplierFilter) return false
    if (statusFilter !== "All Status"      && i.status      !== statusFilter)   return false
    if (query) {
      const q = query.toLowerCase()
      if (
        !i.name.toLowerCase().includes(q) &&
        !i.sku.toLowerCase().includes(q) &&
        !i.supplier.toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  return (
    <div className="app-shell-bg min-h-screen">
      {/* Header */}
      <header className="bg-[#00B4D8] px-4 py-3 lg:px-8 lg:py-4 flex items-center gap-3">
        <Link href="/catalogue" className="p-2 rounded-xl hover:bg-white/10 transition-colors">
          <ArrowLeft size={20} className="text-[#10243E]" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-[#10243E] lg:text-2xl leading-tight">Implants</h1>
          <p className="text-xs text-[#10243E]/70">From extracted systems, families, and supplier mappings</p>
        </div>
        <button className="p-2 rounded-xl hover:bg-white/10 transition-colors">
          <SlidersHorizontal size={18} className="text-[#10243E]" />
        </button>
      </header>

      {/* Search bar */}
      <div className="bg-white border-b border-[#D5DCE3] px-4 py-2.5 lg:px-8">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search implant families, systems, or suppliers…"
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

        {/* Mobile: single Filter button */}
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
          value={subFilter}
          onChange={e => setSubFilter(e.target.value)}
          className="hidden lg:block text-sm border border-[#D5DCE3] rounded-lg px-3 py-1.5 bg-white text-[#3F4752]"
        >
          {subcategories.map(c => <option key={c}>{c}</option>)}
        </select>
        <select
          value={supplierFilter}
          onChange={e => setSupplierFilter(e.target.value)}
          className="hidden lg:block text-sm border border-[#D5DCE3] rounded-lg px-3 py-1.5 bg-white text-[#3F4752]"
        >
          {suppliers.map(s => <option key={s}>{s}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="hidden lg:block text-sm border border-[#D5DCE3] rounded-lg px-3 py-1.5 bg-white text-[#3F4752]"
        >
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>

        <span className="ml-auto text-xs text-[#94A3B8] whitespace-nowrap shrink-0">
          {filtered.length} items
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
                  onClick={() => {
                    setSubFilter("All")
                    setSupplierFilter("All Suppliers")
                    setStatusFilter("All Status")
                  }}
                  className="text-sm text-[#4DA3FF]"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1.5 uppercase tracking-wider">Category</label>
                  <select
                    value={subFilter}
                    onChange={e => setSubFilter(e.target.value)}
                    className="w-full text-sm border border-[#D5DCE3] rounded-xl px-3 py-2.5 bg-white text-[#3F4752]"
                  >
                    {subcategories.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1.5 uppercase tracking-wider">Supplier</label>
                  <select
                    value={supplierFilter}
                    onChange={e => setSupplierFilter(e.target.value)}
                    className="w-full text-sm border border-[#D5DCE3] rounded-xl px-3 py-2.5 bg-white text-[#3F4752]"
                  >
                    {suppliers.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1.5 uppercase tracking-wider">Status</label>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="w-full text-sm border border-[#D5DCE3] rounded-xl px-3 py-2.5 bg-white text-[#3F4752]"
                  >
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <button
                onClick={() => setFilterOpen(false)}
                className="mt-6 w-full py-3 bg-[#4DA3FF] text-white font-semibold rounded-xl text-sm"
              >
                Show {filtered.length} results
              </button>
            </div>
          </div>
        </>
      )}

      {/* Desktop two-col */}
      <div className="lg:flex lg:h-[calc(100vh-160px)]">

        {/* Left: implant list + rack tracker */}
        <div className="lg:flex-1 lg:overflow-y-auto lg:border-r lg:border-[#D5DCE3]">

          {/* Product list */}
          <div className="bg-white">
            {filtered.map(implant => (
              <button
                key={implant.id}
                onClick={() => setSelected(implant)}
                className={`w-full flex items-center gap-4 px-4 py-4 border-b border-[#D5DCE3] hover:bg-[#F4F7FA] transition-colors text-left lg:px-8 ${
                  selected?.id === implant.id ? "bg-[#F4F7FA]" : ""
                }`}
              >
                <div className="w-16 h-16 rounded-xl bg-[#F0F4F8] flex items-center justify-center shrink-0">
                  <Bone size={28} className="text-[#4DA3FF]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#3F4752] truncate">{implant.name}</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5 font-mono">{implant.sku}</p>
                  <p className="text-xs text-[#526579] mt-0.5">
                    {implant.supplier} · {implant.entityKind === "system" ? "System" : "Component"} · {implant.subcategory}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-medium ${statusColor(implant.status)}`}>
                    {implant.status}
                  </span>
                  <ChevronRight size={16} className="text-[#94A3B8]" />
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-[#94A3B8] gap-2">
                <Bone size={32} className="text-[#D5DCE3]" />
                <p className="text-sm">No implants match your search</p>
              </div>
            )}
          </div>

          {/* Live Rack Tracker */}
          <div className="mt-4 mb-8 mx-4 lg:mx-8 bg-white border border-[#D5DCE3] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#D5DCE3] flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  rackConnected ? "bg-emerald-500 animate-pulse" : "bg-[#94A3B8]"
                }`}
              />
              <span className="text-sm font-semibold text-[#3F4752]">Live Rack Tracker</span>
              <span className="text-xs text-[#94A3B8] ml-1">Stryker Triathlon CR</span>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-4 py-2 bg-[#F4F7FA] border-b border-[#D5DCE3] text-xs text-[#94A3B8] font-medium">
              <span>Item</span>
              <span className="text-right">Total</span>
              <span className="text-right">Avail.</span>
              <span className="text-right">Theatre</span>
              <span />
            </div>

            {rackItems.map(item => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center px-4 py-3 border-b border-[#D5DCE3] last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#3F4752] truncate">{item.name}</p>
                  <p className="text-xs text-[#94A3B8] font-mono">{item.catNo}</p>
                  {item.lastEdit && (
                    <span className="flex items-center gap-1 mt-0.5">
                      <Clock size={9} className="text-[#94A3B8]" />
                      <span className="text-[10px] text-[#94A3B8]">
                        {item.lastEdit.by} · {item.lastEdit.at}
                      </span>
                    </span>
                  )}
                </div>
                <span className="text-sm text-[#526579] text-right">{item.total}</span>
                <span className={`text-sm font-bold text-right ${availableColor(item.available)}`}>
                  {item.available}
                </span>
                <span className="text-xs text-[#94A3B8] text-right">{item.theatre}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => adjustQty(item.id, -1)}
                    disabled={item.available === 0}
                    className="w-7 h-7 rounded-lg border border-[#D5DCE3] flex items-center justify-center hover:bg-[#F4F7FA] disabled:opacity-40 transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <button
                    onClick={() => adjustQty(item.id, 1)}
                    className="w-7 h-7 rounded-lg border border-[#D5DCE3] flex items-center justify-center hover:bg-[#F4F7FA] transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop right panel */}
        <div className="hidden lg:flex w-[400px] bg-white flex-col overflow-y-auto">
          {selected ? (
            <div className="p-6">
              <div className="w-full h-40 rounded-2xl bg-[#F0F4F8] flex items-center justify-center mb-4">
                <Bone size={64} className="text-[#4DA3FF]" />
              </div>
              <h2 className="text-lg font-bold text-[#3F4752]">{selected.name}</h2>
              <span className="inline-block mt-1 font-mono text-xs bg-[#F0F4F8] text-[#526579] px-2 py-0.5 rounded-md">
                {selected.sku}
              </span>
              <div className="mt-4 space-y-2">
                {[
                  ["Supplier", selected.supplier],
                  ["Type",     selected.entityKind === "system" ? "System" : "Component"],
                  ["Category", selected.subcategory],
                  ["Qty",      String(selected.qty)],
                ].map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between border-b border-[#D5DCE3] pb-2">
                    <span className="text-xs text-[#94A3B8]">{l}</span>
                    <span className="text-sm text-[#3F4752] font-medium">{v}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-b border-[#D5DCE3] pb-2">
                  <span className="text-xs text-[#94A3B8]">Status</span>
                  <span className={`text-sm font-medium ${statusColor(selected.status)}`}>
                    {selected.status}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#94A3B8] text-sm gap-2 p-8">
              <Bone size={32} className="text-[#D5DCE3]" />
              <p>Select an implant to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile detail sheet */}
      {selected && (
        <div className="lg:hidden">
          <DetailSheet implant={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  )
}
