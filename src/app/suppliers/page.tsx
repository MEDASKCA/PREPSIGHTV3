"use client"

import Link from "next/link"
import { useState } from "react"
import {
  ArrowLeft,
  Search,
  X,
  ChevronRight,
  Building2,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Supplier {
  id: string
  name: string
  location: string
  categories: string[]
  productCount: number
  initials: string
  color: string
}

// ── Data ──────────────────────────────────────────────────────────────────────

const SUPPLIERS: Supplier[] = [
  { id: "1",  name: "Stryker",             location: "Kalamazoo, MI, USA",   categories: ["Implants", "Equipment", "Instruments"], productCount: 1240, initials: "STR", color: "#4DA3FF" },
  { id: "2",  name: "Zimmer Biomet",       location: "Warsaw, IN, USA",      categories: ["Implants", "Consumables"],               productCount: 890,  initials: "ZB",  color: "#8B5CF6" },
  { id: "3",  name: "DePuy Synthes",       location: "Raynham, MA, USA",     categories: ["Implants", "Instruments"],               productCount: 720,  initials: "DS",  color: "#EC4899" },
  { id: "4",  name: "Mölnlycke",           location: "Gothenburg, Sweden",   categories: ["Consumables", "Drapes"],                 productCount: 340,  initials: "ML",  color: "#10B981" },
  { id: "5",  name: "Solventum/3M",        location: "Saint Paul, MN, USA",  categories: ["Consumables", "Equipment"],              productCount: 580,  initials: "3M",  color: "#F59E0B" },
  { id: "6",  name: "Ethicon",             location: "Somerville, NJ, USA",  categories: ["Consumables", "Sutures"],                productCount: 460,  initials: "ETH", color: "#06B6D4" },
  { id: "7",  name: "Erbe",               location: "Tübingen, Germany",    categories: ["Equipment", "Electrosurgery"],           productCount: 120,  initials: "ERB", color: "#EF4444" },
  { id: "8",  name: "Getinge",             location: "Gothenburg, Sweden",   categories: ["Equipment", "Sterilisation"],            productCount: 280,  initials: "GET", color: "#64748B" },
  { id: "9",  name: "Mizuho OSI",          location: "Union City, CA, USA",  categories: ["Instruments", "Positioning"],            productCount: 190,  initials: "MIZ", color: "#F97316" },
  { id: "10", name: "Smith+Nephew",        location: "Watford, UK",          categories: ["Implants", "Wound Care"],                productCount: 670,  initials: "SN",  color: "#14B8A6" },
  { id: "11", name: "Arthrex",             location: "Naples, FL, USA",      categories: ["Implants", "Instruments"],               productCount: 430,  initials: "ART", color: "#7C3AED" },
  { id: "12", name: "B. Braun",            location: "Melsungen, Germany",   categories: ["Consumables", "Equipment"],              productCount: 380,  initials: "BB",  color: "#0EA5E9" },
  { id: "13", name: "Johnson & Johnson",   location: "New Brunswick, NJ",    categories: ["Consumables", "Implants"],               productCount: 920,  initials: "J&J", color: "#DC2626" },
  { id: "14", name: "Baxter",             location: "Deerfield, IL, USA",   categories: ["Consumables", "Pharmacy"],               productCount: 290,  initials: "BAX", color: "#059669" },
  { id: "15", name: "Olympus",             location: "Tokyo, Japan",         categories: ["Equipment", "Instruments"],              productCount: 510,  initials: "OLY", color: "#2563EB" },
]

const CATEGORY_FILTERS = ["All", "Implants", "Consumables", "Equipment", "Instruments", "Diagnostics", "Sterilisation"]

// ── Detail Panel ──────────────────────────────────────────────────────────────

function DetailPanel({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 lg:hidden shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-[#D5DCE3]" />
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${supplier.color}18` }}
            >
              <span className="text-xl font-black" style={{ color: supplier.color }}>{supplier.initials}</span>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F4F7FA]">
              <X size={20} className="text-[#94A3B8]" />
            </button>
          </div>
          <h2 className="text-lg font-bold text-[#3F4752]">{supplier.name}</h2>
          <p className="text-sm text-[#94A3B8] mt-1">{supplier.location}</p>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between border-b border-[#D5DCE3] pb-2">
              <span className="text-xs text-[#94A3B8]">Products</span>
              <span className="text-sm text-[#3F4752] font-medium">{supplier.productCount.toLocaleString()}</span>
            </div>
            <div className="border-b border-[#D5DCE3] pb-2">
              <span className="text-xs text-[#94A3B8] block mb-2">Categories</span>
              <div className="flex flex-wrap gap-1.5">
                {supplier.categories.map(cat => (
                  <span key={cat} className="text-xs bg-[#F0F4F8] text-[#526579] px-2 py-0.5 rounded-md">{cat}</span>
                ))}
              </div>
            </div>
          </div>
          <Link
            href="/catalogue"
            className="mt-6 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#4DA3FF] text-white text-sm font-semibold"
          >
            View Products <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const [query,      setQuery]      = useState("")
  const [catFilter,  setCatFilter]  = useState("All")
  const [selected,   setSelected]   = useState<Supplier | null>(null)

  const q = query.toLowerCase().trim()

  const filtered = SUPPLIERS.filter(s => {
    if (q && !s.name.toLowerCase().includes(q) && !s.location.toLowerCase().includes(q)) return false
    if (catFilter !== "All" && !s.categories.some(c => c === catFilter)) return false
    return true
  })

  return (
    <div className="app-shell-bg min-h-screen">
      {/* Header */}
      <header className="bg-[#00B4D8] px-4 py-3 lg:px-8 lg:py-4">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/" className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} className="text-[#10243E]" />
          </Link>
          <h1 className="text-lg font-bold text-[#10243E] lg:text-2xl leading-tight">Suppliers</h1>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#10243E]/50" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search suppliers…"
            className="w-full bg-white/90 border-0 rounded-xl pl-9 pr-9 py-2.5 text-sm text-[#3F4752] placeholder:text-[#94A3B8] focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={14} className="text-[#94A3B8]" />
            </button>
          )}
        </div>
      </header>

      {/* Filter bar */}
      <div className="bg-white border-b border-[#D5DCE3] px-4 py-2.5 flex gap-2 overflow-x-auto lg:px-8">
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="text-sm border border-[#D5DCE3] rounded-lg px-3 py-1.5 bg-white text-[#3F4752] shrink-0"
        >
          {CATEGORY_FILTERS.map(c => <option key={c}>{c}</option>)}
        </select>
        <span className="ml-auto text-xs text-[#94A3B8] self-center whitespace-nowrap shrink-0">
          {filtered.length} suppliers
        </span>
      </div>

      {/* Desktop two-col */}
      <div className="lg:flex lg:h-[calc(100vh-148px)]">
        <div className="bg-white lg:flex-1 lg:overflow-y-auto lg:border-r lg:border-[#D5DCE3]">
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Building2 size={32} className="text-[#D5DCE3] mx-auto mb-3" />
              <p className="text-sm text-[#94A3B8]">No suppliers found.</p>
            </div>
          ) : (
            filtered.map(supplier => (
              <button
                key={supplier.id}
                onClick={() => setSelected(supplier)}
                className={`w-full flex items-center gap-4 px-4 py-4 border-b border-[#D5DCE3] hover:bg-[#F4F7FA] transition-colors text-left lg:px-8 ${
                  selected?.id === supplier.id ? "bg-[#F4F7FA]" : ""
                }`}
              >
                {/* Colored initials circle */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${supplier.color}18` }}
                >
                  <span className="text-xs font-black" style={{ color: supplier.color }}>{supplier.initials}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#3F4752] truncate">{supplier.name}</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">{supplier.location}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {supplier.categories.slice(0, 3).map(cat => (
                      <span key={cat} className="text-[10px] bg-[#F0F4F8] text-[#526579] px-1.5 py-0.5 rounded-md">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Product count + chevron */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-[#3F4752]">{supplier.productCount.toLocaleString()}</span>
                  <ChevronRight size={16} className="text-[#94A3B8]" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Desktop right panel */}
        <div className="hidden lg:flex w-96 bg-white flex-col overflow-y-auto">
          {selected ? (
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-32 h-32 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${selected.color}18` }}
                >
                  <span className="text-2xl font-black" style={{ color: selected.color }}>{selected.initials}</span>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-[#F4F7FA]">
                  <X size={20} className="text-[#94A3B8]" />
                </button>
              </div>
              <h2 className="text-lg font-bold text-[#3F4752]">{selected.name}</h2>
              <p className="text-sm text-[#94A3B8] mt-1">{selected.location}</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#D5DCE3] pb-2">
                  <span className="text-xs text-[#94A3B8]">Products on Catalogue</span>
                  <span className="text-sm text-[#3F4752] font-bold">{selected.productCount.toLocaleString()}</span>
                </div>
                <div className="border-b border-[#D5DCE3] pb-3">
                  <span className="text-xs text-[#94A3B8] block mb-2">Product Categories</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.categories.map(cat => (
                      <span key={cat} className="text-xs bg-[#F0F4F8] text-[#526579] px-2 py-0.5 rounded-md">{cat}</span>
                    ))}
                  </div>
                </div>
              </div>
              <Link
                href="/catalogue"
                className="mt-6 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#4DA3FF] text-white text-sm font-semibold"
              >
                View Products <ChevronRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#94A3B8] text-sm gap-2 p-8">
              <Building2 size={32} className="text-[#D5DCE3]" />
              <p>Select a supplier to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile detail */}
      {selected && (
        <div className="lg:hidden">
          <DetailPanel supplier={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  )
}
