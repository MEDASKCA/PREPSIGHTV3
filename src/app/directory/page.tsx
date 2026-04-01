"use client"

import Link from "next/link"
import { useState } from "react"
import {
  ArrowLeft,
  Search,
  X,
  ChevronRight,
  Hospital,
  MapPin,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Trust {
  id: string
  name: string
  location: string
  region: string
  type: "Teaching" | "District General" | "Specialist" | "Foundation"
  theatres: number
}

// ── Data ──────────────────────────────────────────────────────────────────────

const TRUSTS: Trust[] = [
  { id: "1",  name: "University College London Hospitals",    location: "London, NW1",           region: "London",     type: "Teaching",         theatres: 28 },
  { id: "2",  name: "King's College Hospital NHS FT",         location: "London, SE5",           region: "London",     type: "Teaching",         theatres: 22 },
  { id: "3",  name: "Guy's and St Thomas' NHS FT",            location: "London, SE1",           region: "London",     type: "Teaching",         theatres: 32 },
  { id: "4",  name: "Manchester University NHS FT",           location: "Manchester, M13",       region: "North West", type: "Teaching",         theatres: 36 },
  { id: "5",  name: "Salford Royal NHS FT",                   location: "Salford, M6",           region: "North West", type: "Foundation",       theatres: 14 },
  { id: "6",  name: "Leeds Teaching Hospitals NHS Trust",     location: "Leeds, LS1",            region: "Yorkshire",  type: "Teaching",         theatres: 30 },
  { id: "7",  name: "Sheffield Teaching Hospitals NHS FT",    location: "Sheffield, S10",        region: "Yorkshire",  type: "Teaching",         theatres: 24 },
  { id: "8",  name: "Brighton and Sussex University Hospitals", location: "Brighton, BN2",       region: "South East", type: "Teaching",         theatres: 16 },
  { id: "9",  name: "East Sussex Healthcare NHS Trust",       location: "Hastings, TN37",        region: "South East", type: "District General", theatres: 10 },
  { id: "10", name: "NHS Greater Glasgow and Clyde",          location: "Glasgow, G4",           region: "Scotland",   type: "Teaching",         theatres: 42 },
  { id: "11", name: "NHS Lothian",                            location: "Edinburgh, EH16",       region: "Scotland",   type: "Teaching",         theatres: 26 },
  { id: "12", name: "Cardiff and Vale University LHB",        location: "Cardiff, CF14",         region: "Wales",      type: "Teaching",         theatres: 20 },
]

const REGIONS = ["All Regions", "London", "North West", "Yorkshire", "South East", "Scotland", "Wales"]

const TYPE_COLORS: Record<Trust["type"], string> = {
  "Teaching":         "bg-[#4DA3FF]/10 text-[#4DA3FF]",
  "District General": "bg-emerald-50 text-emerald-700",
  "Specialist":       "bg-purple-50 text-purple-700",
  "Foundation":       "bg-amber-50 text-amber-700",
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function DetailPanel({ trust, onClose }: { trust: Trust; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 lg:hidden shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-[#D5DCE3]" />
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-24 h-24 rounded-2xl bg-[#F0F4F8] flex items-center justify-center">
              <Hospital size={40} className="text-[#4DA3FF]" />
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F4F7FA]">
              <X size={20} className="text-[#94A3B8]" />
            </button>
          </div>
          <h2 className="text-lg font-bold text-[#3F4752] mt-2">{trust.name}</h2>
          <div className="flex items-center gap-1 mt-1">
            <MapPin size={12} className="text-[#94A3B8]" />
            <p className="text-sm text-[#94A3B8]">{trust.location}</p>
          </div>
          <div className="mt-4 space-y-2">
            {([
              ["Region",   trust.region],
              ["Theatres", String(trust.theatres)],
            ] as [string, string][]).map(([l, v]) => (
              <div key={l} className="flex items-center justify-between border-b border-[#D5DCE3] pb-2">
                <span className="text-xs text-[#94A3B8]">{l}</span>
                <span className="text-sm text-[#3F4752] font-medium">{v}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-b border-[#D5DCE3] pb-2">
              <span className="text-xs text-[#94A3B8]">Trust Type</span>
              <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${TYPE_COLORS[trust.type]}`}>{trust.type}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DirectoryPage() {
  const [query,        setQuery]        = useState("")
  const [regionFilter, setRegionFilter] = useState("All Regions")
  const [selected,     setSelected]     = useState<Trust | null>(null)

  const q = query.toLowerCase().trim()

  const filtered = TRUSTS.filter(t => {
    if (q && !t.name.toLowerCase().includes(q) && !t.location.toLowerCase().includes(q)) return false
    if (regionFilter !== "All Regions" && t.region !== regionFilter) return false
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
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-[#10243E] lg:text-2xl leading-tight">Directory</h1>
            <p className="text-xs text-[#10243E]/70">NHS Trusts &amp; Hospitals</p>
          </div>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#10243E]/50" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search trusts…"
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
          value={regionFilter}
          onChange={e => setRegionFilter(e.target.value)}
          className="text-sm border border-[#D5DCE3] rounded-lg px-3 py-1.5 bg-white text-[#3F4752] shrink-0"
        >
          {REGIONS.map(r => <option key={r}>{r}</option>)}
        </select>
        <span className="ml-auto text-xs text-[#94A3B8] self-center whitespace-nowrap shrink-0">
          {filtered.length} trusts
        </span>
      </div>

      {/* Desktop two-col */}
      <div className="lg:flex lg:h-[calc(100vh-148px)]">
        <div className="bg-white lg:flex-1 lg:overflow-y-auto lg:border-r lg:border-[#D5DCE3]">
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Hospital size={32} className="text-[#D5DCE3] mx-auto mb-3" />
              <p className="text-sm text-[#94A3B8]">No trusts found.</p>
            </div>
          ) : (
            filtered.map(trust => (
              <button
                key={trust.id}
                onClick={() => setSelected(trust)}
                className={`w-full flex items-center gap-4 px-4 py-4 border-b border-[#D5DCE3] hover:bg-[#F4F7FA] transition-colors text-left lg:px-8 ${
                  selected?.id === trust.id ? "bg-[#F4F7FA]" : ""
                }`}
              >
                {/* Hospital icon square */}
                <div className="w-12 h-12 rounded-xl bg-[#F0F4F8] flex items-center justify-center shrink-0">
                  <Hospital size={22} className="text-[#4DA3FF]" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#3F4752] truncate">{trust.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={11} className="text-[#94A3B8] shrink-0" />
                    <p className="text-xs text-[#94A3B8] truncate">{trust.location}</p>
                  </div>
                  <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${TYPE_COLORS[trust.type]}`}>
                    {trust.type}
                  </span>
                </div>

                {/* Theatre count + chevron */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#3F4752]">{trust.theatres}</p>
                    <p className="text-[10px] text-[#94A3B8]">theatres</p>
                  </div>
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
                <div className="w-32 h-32 rounded-2xl bg-[#F0F4F8] flex items-center justify-center">
                  <Hospital size={52} className="text-[#4DA3FF]" />
                </div>
                <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-[#F4F7FA]">
                  <X size={20} className="text-[#94A3B8]" />
                </button>
              </div>
              <h2 className="text-base font-bold text-[#3F4752] leading-snug">{selected.name}</h2>
              <div className="flex items-center gap-1 mt-1">
                <MapPin size={12} className="text-[#94A3B8]" />
                <p className="text-sm text-[#94A3B8]">{selected.location}</p>
              </div>
              <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-md font-medium ${TYPE_COLORS[selected.type]}`}>
                {selected.type}
              </span>
              <div className="mt-4 space-y-2">
                {([
                  ["Region",   selected.region],
                  ["Theatres", String(selected.theatres)],
                ] as [string, string][]).map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between border-b border-[#D5DCE3] pb-2">
                    <span className="text-xs text-[#94A3B8]">{l}</span>
                    <span className="text-sm text-[#3F4752] font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#94A3B8] text-sm gap-2 p-8">
              <Hospital size={32} className="text-[#D5DCE3]" />
              <p>Select a trust to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile detail */}
      {selected && (
        <div className="lg:hidden">
          <DetailPanel trust={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  )
}
