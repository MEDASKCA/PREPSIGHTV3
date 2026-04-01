"use client"

import { useState, useMemo } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Search, Package } from "lucide-react"
import { procedures, getProcedureById } from "@/lib/data"
import { surgeons as surgeonList, getSurgeonLibrary } from "@/lib/surgeons"
import { CLINICAL_SETTINGS, SETTING_SPECIALTIES } from "@/lib/settings"
import { ClinicalSetting, Procedure } from "@/lib/types"
import { getProfile, getRelevantSettings } from "@/lib/profile"
import { canonicalSpecialtyName } from "@/lib/specialty-normalization"

interface Props {
  onNavigate?: () => void
}

type ViewMode = "setting" | "surgeon" | "supplier"

const TAB_ACTIVE = "bg-[#4DA3FF] text-white"
const TAB_IDLE   = "text-[#64748b] hover:bg-[#F4F7FA]"

export default function SidebarNavTree({ onNavigate }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeSetting   = searchParams.get("setting")

  const [query, setQuery]                                 = useState("")
  const [viewMode, setViewMode]                           = useState<ViewMode>("setting")
  const [expandedSurgeons, setExpandedSurgeons]           = useState<Set<string>>(new Set())
  const [showAllAreas, setShowAllAreas]                   = useState(false)

  const profile          = useMemo(() => getProfile(), [])
  const relevantSettings = useMemo(() =>
    profile ? getRelevantSettings(profile) : [],
  [profile])

  // ── Setting tree ─────────────────────────────────────────────────────────────
  const tree = useMemo(() => {
    const map = new Map<ClinicalSetting, Map<string, typeof procedures>>()
    for (const setting of CLINICAL_SETTINGS) {
      const specMap = new Map<string, typeof procedures>()
      for (const specialty of SETTING_SPECIALTIES[setting] ?? []) {
        specMap.set(specialty, [])
      }
      map.set(setting, specMap)
    }
    for (const p of procedures) {
      const specMap = map.get(p.setting)
      if (!specMap) continue
      const specialty = canonicalSpecialtyName(p.setting, p.specialty)
      const list = specMap.get(specialty) ?? []
      list.push(p)
      specMap.set(specialty, list)
    }
    return map
  }, [])

  const filteredTree = useMemo(() => {
    if (!query.trim()) return tree
    const q = query.toLowerCase()
    const result = new Map<ClinicalSetting, Map<string, typeof procedures>>()
    for (const [setting, specMap] of tree.entries()) {
      const settingMatch = setting.toLowerCase().includes(q)
      const filteredSpecs = new Map<string, typeof procedures>()
      for (const [spec, procs] of specMap.entries()) {
        const specMatch = spec.toLowerCase().includes(q)
        const filteredProcs = procs.filter(
          (p) => settingMatch || specMatch || p.name.toLowerCase().includes(q)
        )
        if (filteredProcs.length > 0 || settingMatch || specMatch) {
          filteredSpecs.set(spec, filteredProcs)
        }
      }
      if (filteredSpecs.size > 0) result.set(setting, filteredSpecs)
    }
    return result
  }, [tree, query])

  const relevantEntries = Array.from(filteredTree.entries()).filter(([s]) => relevantSettings.includes(s))
  const otherEntries    = Array.from(filteredTree.entries()).filter(([s]) => !relevantSettings.includes(s))
  const hasRelevant     = relevantEntries.length > 0 && !query.trim()

  // ── Surgeon tree ─────────────────────────────────────────────────────────────
  const surgeonTree = useMemo(() => {
    const map = new Map<string, Procedure[]>()
    for (const surgeon of surgeonList) {
      const library = getSurgeonLibrary(surgeon.id)
      const procs = library
        .map((sp) => getProcedureById(sp.procedureId))
        .filter((p): p is Procedure => p !== undefined)
      if (procs.length > 0) map.set(surgeon.name, procs)
    }
    return map
  }, [])

  const filteredSurgeonTree = useMemo(() => {
    if (!query.trim()) return surgeonTree
    const q = query.toLowerCase()
    const result = new Map<string, Procedure[]>()
    for (const [surgeon, procs] of surgeonTree.entries()) {
      const surgeonMatch = surgeon.toLowerCase().includes(q)
      const filteredProcs = procs.filter(
        (p) => surgeonMatch || p.name.toLowerCase().includes(q)
      )
      if (filteredProcs.length > 0) result.set(surgeon, filteredProcs)
    }
    return result
  }, [surgeonTree, query])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function toggleSurgeon(name: string) {
    setExpandedSurgeons((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  // ── Section card renderer ─────────────────────────────────────────────────────
  function renderSettingCards(entries: [ClinicalSetting, Map<string, typeof procedures>][]) {
    return entries.map(([setting, specMap]) => {
      return (
        <Link
          key={setting}
          href={`/?setting=${encodeURIComponent(setting)}`}
          onClick={onNavigate}
          className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition-all ${
            activeSetting === setting
              ? "border-[#7CC6FF] bg-gradient-to-br from-[#EFF8FF] via-white to-[#E8F7FF] shadow-sm"
              : "border-[#D5DCE3] bg-white hover:border-[#B8DBFF] hover:bg-[#F8FAFC]"
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug text-[#1E293B]">{setting}</p>
            <p className="mt-1 text-xs text-[#64748b]">
              {specMap.size} {specMap.size === 1 ? "specialty" : "specialties"}
            </p>
          </div>
          <ChevronRight size={14} className="mt-1 shrink-0 text-[#94a3b8]" />
        </Link>
      )
    })
  }

  return (
    <div className="flex flex-col h-full">

      {/* Search */}
      <div className="px-3 py-3 border-b border-[#D5DCE3]">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#D5DCE3] rounded-lg bg-[#F4F7FA] focus:outline-none focus:ring-2 focus:ring-[#4DA3FF] focus:border-transparent"
          />
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex px-3 py-2 gap-1 border-b border-[#D5DCE3]">
        <button
          onClick={() => setViewMode("setting")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === "setting" ? TAB_ACTIVE : TAB_IDLE}`}
        >
          Setting
        </button>
        <button
          onClick={() => setViewMode("surgeon")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === "surgeon" ? TAB_ACTIVE : TAB_IDLE}`}
        >
          Surgeon
        </button>
        <button
          onClick={() => setViewMode("supplier")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === "supplier" ? TAB_ACTIVE : TAB_IDLE}`}
        >
          Supplier
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Setting view ──────────────────────────────────────────────────── */}
        {viewMode === "setting" && (
          <>
            {hasRelevant ? (
              <>
                <p className="px-4 pt-3 pb-1.5 text-xs font-semibold text-[#94a3b8] uppercase tracking-wide">
                  Your areas
                </p>
                <div className="px-3 space-y-2 pb-2">
                  {renderSettingCards(relevantEntries)}
                </div>
                {otherEntries.length > 0 && (
                  <>
                    <button
                      onClick={() => setShowAllAreas((v) => !v)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-[#94a3b8] hover:text-[#64748b] transition-colors"
                    >
                      <div className="flex-1 h-px bg-[#E2E8F0]" />
                      <span className="font-medium shrink-0">
                        {showAllAreas ? "Hide other areas" : "Show all areas"}
                      </span>
                      <div className="flex-1 h-px bg-[#E2E8F0]" />
                    </button>
                    {showAllAreas && (
                      <div className="px-3 space-y-2 pb-3">
                        {renderSettingCards(otherEntries)}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="px-3 py-3 space-y-2">
                {renderSettingCards(Array.from(filteredTree.entries()))}
              </div>
            )}
          </>
        )}

        {/* ── Surgeon view ──────────────────────────────────────────────────── */}
        {viewMode === "surgeon" && (
          <div className="px-3 py-3 space-y-2">
            {Array.from(filteredSurgeonTree.entries()).map(([surgeon, procs]) => {
              const expanded = expandedSurgeons.has(surgeon)
              return (
                <div key={surgeon} className="rounded-xl overflow-hidden border border-[#D5DCE3] shadow-sm">
                  <button
                    onClick={() => toggleSurgeon(surgeon)}
                    className={`w-full flex items-center gap-2 px-4 h-12 text-left transition-colors ${
                      expanded ? "bg-[#2F8EF7]" : "bg-[#4DA3FF] hover:bg-[#2F8EF7]"
                    }`}
                  >
                    <span className="flex-1 text-sm font-semibold text-white">{surgeon}</span>
                    <span className="text-xs text-white/60 tabular-nums shrink-0">{procs.length}</span>
                    <ChevronRight
                      size={14}
                      className={`shrink-0 text-white/60 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
                    />
                  </button>
                  {expanded && (
                    <div className="border-t border-[#F0F4F8]">
                      {procs.map((p) => {
                        const isActive = pathname === `/procedures/${p.id}`
                        return (
                          <Link
                            key={p.id}
                            href={`/procedures/${p.id}`}
                            onClick={onNavigate}
                            className={`flex items-center px-4 h-10 text-sm border-b border-[#F0F4F8] last:border-b-0 transition-colors ${
                              isActive
                                ? "bg-[#EFF8FF] text-[#2F8EF7] font-semibold"
                                : "bg-[#F8FAFC] text-[#475569] hover:bg-[#EFF8FF] hover:text-[#2F8EF7]"
                            }`}
                          >
                            {p.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
            {filteredSurgeonTree.size === 0 && (
              <p className="px-2 py-4 text-sm text-[#94a3b8]">Surgeons will appear here once added to procedure cards.</p>
            )}
          </div>
        )}

        {/* ── Supplier view ─────────────────────────────────────────────────── */}
        {viewMode === "supplier" && (
          <div className="px-3 py-3 space-y-3">
            <Link
              href="/catalogue"
              onClick={onNavigate}
              className={`block rounded-2xl border px-4 py-4 transition-all ${
                pathname === "/catalogue"
                  ? "border-[#7CC6FF] bg-gradient-to-br from-[#EAF7FF] via-white to-[#E9FBFF] shadow-sm"
                  : "border-[#D5DCE3] bg-white hover:border-[#B8DBFF] hover:bg-[#F8FAFC]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#A7D8FF] bg-[#DFF2FF] text-[#1596AE]">
                  <Package size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#1E293B]">Catalogue</p>
                  <p className="mt-1 text-xs leading-5 text-[#64748b]">
                    Supplier products, implants, trays, consumables, equipment, and sizing.
                  </p>
                </div>
                <ChevronRight size={14} className="mt-1 shrink-0 text-[#94a3b8]" />
              </div>
            </Link>

            <div className="rounded-2xl border border-[#D5DCE3] bg-[#F8FAFC] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
                Supplier View
              </p>
              <p className="mt-2 text-sm leading-6 text-[#475569]">
                This tab is now the catalogue home. Fixed supplier trays, implants, and product banks live there.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
