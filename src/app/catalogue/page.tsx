"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  ArrowLeft,
  Plus,
  Pencil,
  SlidersHorizontal,
  ChevronRight,
  X,
  Bone,
  Package,
  Settings,
  Zap,
  Thermometer,
  LayoutGrid,
  List,
  Wrench,
  Search,
  MapPin,
  Phone,
} from "lucide-react"
import {
  type CatalogueProduct,
} from "@/lib/catalogue-data"
import {
  getCatalogueCategoryOptions,
  getCatalogueSpecialtyOptions,
  getCatalogueSupplierOptions,
  useCatalogueProducts,
} from "@/lib/catalogue-products-store"
import WorkspaceDesktopShell from "@/components/WorkspaceDesktopShell"

// ── Types ─────────────────────────────────────────────────────────────────────

type IconKey = "bone" | "package" | "settings" | "zap" | "thermometer" | "layout" | "wrench"

// View type for the page — CatalogueProduct extended with runtime stock fields
interface Product extends CatalogueProduct {
  icon: IconKey
  sourceBadge: string
}

// ── Derive icon from category/subcategory ────────────────────────────────────

function iconForProduct(p: CatalogueProduct): IconKey {
  if (p.category === "Implants") return "bone"
  if (p.subcategory === "Diathermy") return "zap"
  if (p.subcategory === "Warming") return "thermometer"
  if (p.subcategory === "Tables") return "layout"
  if (p.category === "Instruments") return "wrench"
  if (p.category === "Equipment") return "settings"
  return "package"
}

// ── Map catalogue to display products (placeholder stock until Firestore) ────

// Stable placeholder qty — seeded from SKU so consistent across renders.
// Replace with live Firestore stock data when inventory module is connected.
// ── Helpers ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<IconKey, React.ElementType> = {
  bone:        Bone,
  package:     Package,
  settings:    Settings,
  zap:         Zap,
  thermometer: Thermometer,
  layout:      LayoutGrid,
  wrench:      Wrench,
}

function sourceBadgeForProduct(product: CatalogueProduct): string {
  switch (product.sourceModel) {
    case "extracted_system":
      return "Extracted System"
    case "extracted_component":
      return "Extracted Component"
    default:
      return "Seeded Product"
  }
}

// ── Thumbnail ─────────────────────────────────────────────────────────────────

function Thumbnail({ icon, imageUrl, size = 28 }: { icon: IconKey; imageUrl?: string; size?: number }) {
  const Icon = ICON_MAP[icon]
  return (
    <div className="w-16 h-16 rounded-xl bg-[#F0F4F8] flex items-center justify-center shrink-0">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-full w-full rounded-xl object-cover" />
      ) : (
        <Icon size={size} className="text-[#4DA3FF]" />
      )}
    </div>
  )
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function DetailPanel({ product, onClose }: { product: Product; onClose: () => void }) {
  const Icon = ICON_MAP[product.icon]
  return (
    <>
      {/* Backdrop (mobile) */}
      <div
        className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Mobile bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 lg:hidden shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#D5DCE3]" />
        </div>
        <DetailContent product={product} Icon={Icon} onClose={onClose} />
      </div>

      {/* Desktop right panel */}
      <div className="hidden lg:flex fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-50 flex-col border-l border-[#D5DCE3] overflow-y-auto">
        <DetailContent product={product} Icon={Icon} onClose={onClose} />
      </div>
    </>
  )
}

function DetailContent({ product, Icon, onClose }: { product: Product; Icon: React.ElementType; onClose: () => void }) {
  return (
    <div className="p-6">
      {/* Close + header row */}
      <div className="flex items-start justify-between mb-4">
        {/* Thumbnail + QR side by side */}
        <div className="flex gap-3">
          <div className="w-28 h-28 rounded-2xl bg-[#F0F4F8] flex items-center justify-center shrink-0">
            <Icon size={52} className="text-[#4DA3FF]" />
          </div>
          <div className="w-28 h-28 rounded-2xl border border-dashed border-[#D5DCE3] bg-[#F4F7FA] flex items-center justify-center overflow-hidden">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <Icon size={32} className="text-[#94A3B8]" />
            )}
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F4F7FA] transition-colors">
          <X size={20} className="text-[#94A3B8]" />
        </button>
      </div>

      <h2 className="text-base font-bold text-[#3F4752] mt-3 leading-snug">{product.name}</h2>
      <div className="mt-4 space-y-2">
        {/* Supplier — tappable, links to Directory */}
        <div className="flex items-center justify-between border-b border-[#D5DCE3] pb-2">
          <span className="text-xs text-[#94A3B8]">Supplier</span>
          <div className="flex items-center gap-2">
            {product.supplierPhone ? (
              <a
                href={`tel:${product.supplierPhone}`}
                className="flex items-center gap-1.5 text-sm font-medium text-[#4DA3FF] hover:underline"
                title="Tap to call · Linked to Directory"
              >
                <Phone size={12} />
                {product.supplier}
              </a>
            ) : (
              <span className="text-sm text-[#3F4752] font-medium">{product.supplier}</span>
            )}
          </div>
        </div>

        <DetailRow label="Category" value={`${product.category} · ${product.subcategory}`} />
        <DetailRow label="Record type" value={product.sourceBadge} />

        {/* Location — links to Stockroom later */}
        {product.location && (
          <div className="flex items-start justify-between border-b border-[#D5DCE3] pb-2 gap-4">
            <span className="text-xs text-[#94A3B8] shrink-0">Location</span>
            <span className="flex items-center gap-1 text-xs text-[#526579] text-right">
              <MapPin size={11} className="text-[#94A3B8] shrink-0" />
              {product.location}
            </span>
          </div>
        )}
      </div>

      {product.description && (
        <p className="mt-4 text-sm text-[#526579] leading-relaxed">{product.description}</p>
      )}

      <div className="mt-5">
        <Link
          href={`/catalogue/add-product?id=${encodeURIComponent(product.id)}&source=library`}
          className="inline-flex items-center gap-2 rounded-xl border border-[#D5DCE3] bg-[#F8FBFF] px-3 py-2 text-sm font-semibold text-[#1D4ED8] transition-colors hover:bg-[#EAF3FF]"
        >
          <Pencil size={14} />
          Edit product
        </Link>
      </div>

      {product.category === "Implants" && (
        <Link
          href="/catalogue/implants"
          className="mt-6 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#4DA3FF] text-white text-sm font-semibold"
        >
          View Rack
          <ChevronRight size={16} />
        </Link>
      )}
    </div>
  )
}

function DetailRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[#D5DCE3] pb-2">
      <span className="text-xs text-[#94A3B8]">{label}</span>
      {children ?? <span className="text-sm text-[#3F4752] font-medium">{value}</span>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type ViewMode = "list" | "grid"
const RECORD_TYPES = ["All Record Types", "Seeded Product", "Extracted System", "Extracted Component"]

export default function CataloguePage() {
  const catalogueProducts = useCatalogueProducts()
  const [catFilter,       setCatFilter]       = useState("All Categories")
  const [supplierFilter,  setSupplierFilter]  = useState("All Suppliers")
  const [specialtyFilter, setSpecialtyFilter] = useState("All Specialties")
  const [recordTypeFilter, setRecordTypeFilter] = useState("All Record Types")
  const [selected,        setSelected]        = useState<Product | null>(null)
  const [view,            setView]            = useState<ViewMode>("list")
  const [query,           setQuery]           = useState("")
  const [filterOpen,      setFilterOpen]      = useState(false)

  const products = useMemo(
    () =>
      catalogueProducts.map((product) => ({
        ...product,
        icon: iconForProduct(product),
        sourceBadge: sourceBadgeForProduct(product),
      })),
    [catalogueProducts],
  )

  const CATEGORIES = useMemo(() => getCatalogueCategoryOptions(catalogueProducts), [catalogueProducts])
  const SUPPLIERS = useMemo(() => getCatalogueSupplierOptions(catalogueProducts), [catalogueProducts])
  const SPECIALTIES = useMemo(() => ["All Specialties", ...getCatalogueSpecialtyOptions(catalogueProducts)], [catalogueProducts])

  const activeFilterCount = [
    catFilter !== "All Categories",
    supplierFilter !== "All Suppliers",
    specialtyFilter !== "All Specialties",
    recordTypeFilter !== "All Record Types",
  ].filter(Boolean).length

  const filtered = products.filter(p => {
    if (catFilter !== "All Categories"        && p.category !== catFilter)                                                        return false
    if (supplierFilter !== "All Suppliers"    && p.supplier !== supplierFilter)                                                    return false
    if (specialtyFilter !== "All Specialties" && !p.specialty.includes(specialtyFilter) && !p.specialty.includes("All"))          return false
    if (recordTypeFilter !== "All Record Types" && p.sourceBadge !== recordTypeFilter)                                             return false
    if (query) {
      const q = query.toLowerCase()
      if (
        !p.name.toLowerCase().includes(q) &&
        !p.supplier.toLowerCase().includes(q) &&
        !(p.description ?? "").toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  return (
    <>
      <div className="app-shell-bg min-h-screen lg:hidden">
      {/* Header */}
      <header className="bg-[#00B4D8] px-4 py-3 lg:px-8 lg:py-4 flex items-center gap-3">
        <Link href="/" className="p-2 rounded-xl hover:bg-white/10 transition-colors">
          <ArrowLeft size={20} className="text-[#10243E]" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-[#10243E] lg:text-2xl leading-tight">Catalogue</h1>
          <p className="text-xs text-[#10243E]/70">NHS Supply Chain · 50,000+ products</p>
        </div>
        <Link
          href="/catalogue/add-product?source=library"
          className="inline-flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-[#10243E] transition-colors hover:bg-white"
        >
          <Plus size={16} />
          Add product
        </Link>
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
            placeholder="Search by name, supplier, or description…"
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
        <select value={specialtyFilter} onChange={e => setSpecialtyFilter(e.target.value)}
          className="hidden lg:block text-sm border border-[#D5DCE3] rounded-lg px-3 py-1.5 bg-white text-[#3F4752]">
          {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="hidden lg:block text-sm border border-[#D5DCE3] rounded-lg px-3 py-1.5 bg-white text-[#3F4752]">
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}
          className="hidden lg:block text-sm border border-[#D5DCE3] rounded-lg px-3 py-1.5 bg-white text-[#3F4752]">
          {SUPPLIERS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={recordTypeFilter} onChange={e => setRecordTypeFilter(e.target.value)}
          className="hidden lg:block text-sm border border-[#D5DCE3] rounded-lg px-3 py-1.5 bg-white text-[#3F4752]">
          {RECORD_TYPES.map(type => <option key={type}>{type}</option>)}
        </select>
        <span className="ml-auto text-xs text-[#94A3B8] whitespace-nowrap shrink-0">
          {filtered.length} items
        </span>

        {/* Desktop-only view toggle */}
        <div className="hidden lg:flex items-center gap-0.5 border border-[#D5DCE3] rounded-lg p-0.5 shrink-0">
          <button onClick={() => setView("list")}
            className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-[#4DA3FF] text-white" : "text-[#94A3B8] hover:text-[#526579]"}`}
            title="List view">
            <List size={15} />
          </button>
          <button onClick={() => setView("grid")}
            className={`p-1.5 rounded-md transition-colors ${view === "grid" ? "bg-[#4DA3FF] text-white" : "text-[#94A3B8] hover:text-[#526579]"}`}
            title="Grid view">
            <LayoutGrid size={15} />
          </button>
        </div>
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
                  onClick={() => { setCatFilter("All Categories"); setSupplierFilter("All Suppliers"); setSpecialtyFilter("All Specialties"); setRecordTypeFilter("All Record Types") }}
                  className="text-sm text-[#4DA3FF]"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1.5 uppercase tracking-wider">Specialty</label>
                  <select value={specialtyFilter} onChange={e => setSpecialtyFilter(e.target.value)}
                    className="w-full text-sm border border-[#D5DCE3] rounded-xl px-3 py-2.5 bg-white text-[#3F4752]">
                    {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1.5 uppercase tracking-wider">Category</label>
                  <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                    className="w-full text-sm border border-[#D5DCE3] rounded-xl px-3 py-2.5 bg-white text-[#3F4752]">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1.5 uppercase tracking-wider">Supplier</label>
                  <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}
                    className="w-full text-sm border border-[#D5DCE3] rounded-xl px-3 py-2.5 bg-white text-[#3F4752]">
                    {SUPPLIERS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1.5 uppercase tracking-wider">Record type</label>
                  <select value={recordTypeFilter} onChange={e => setRecordTypeFilter(e.target.value)}
                    className="w-full text-sm border border-[#D5DCE3] rounded-xl px-3 py-2.5 bg-white text-[#3F4752]">
                    {RECORD_TYPES.map(type => <option key={type}>{type}</option>)}
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

      {/* Desktop two-col layout — list view */}
      {view === "list" && (
        <div className="lg:flex lg:h-[calc(100vh-120px)]">
          {/* Product list */}
          <div className="bg-white lg:flex-1 lg:overflow-y-auto lg:border-r lg:border-[#D5DCE3]">
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-[#94A3B8]">No products match the selected filters.</p>
                <Link
                  href="/catalogue/add-product?source=library"
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#8ADFF0] bg-[#AEEAF7] px-4 py-2.5 text-sm font-semibold text-[#10243E] transition-colors hover:bg-[#9BE4F4]"
                >
                  <Plus size={16} />
                  Add product
                </Link>
              </div>
            ) : (
              filtered.map(product => (
                <button
                  key={product.id}
                  onClick={() => setSelected(product)}
                  className={`w-full flex items-center gap-4 px-4 py-4 border-b border-[#D5DCE3] hover:bg-[#F4F7FA] transition-colors text-left lg:px-8 ${
                    selected?.id === product.id ? "bg-[#F4F7FA]" : ""
                  }`}
                >
                  <Thumbnail icon={product.icon} imageUrl={product.imageUrl} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#3F4752] truncate">{product.name}</p>
                    <p className="text-xs text-[#526579] mt-0.5">{product.supplier}</p>
                    <p className="text-[11px] text-[#6B7B8C] mt-1">{product.sourceBadge}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <ChevronRight size={16} className="text-[#94A3B8]" />
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Desktop inline right panel */}
          <div className="hidden lg:block w-[400px] bg-white overflow-y-auto border-l border-[#D5DCE3]">
            {selected ? (
              <DetailContent
                product={selected}
                Icon={ICON_MAP[selected.icon]}
                onClose={() => setSelected(null)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[#94A3B8] text-sm gap-2 p-8">
                <Package size={32} className="text-[#D5DCE3]" />
                <p>Select a product to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Desktop grid view (desktop only — mobile always uses list) */}
      {view === "grid" && (
        <>
          {/* Mobile: render as list (ignore grid toggle) */}
          <div className="lg:hidden bg-white">
            {filtered.map(product => (
              <button
                key={product.id}
                onClick={() => setSelected(product)}
                className="w-full flex items-center gap-4 px-4 py-4 border-b border-[#D5DCE3] hover:bg-[#F4F7FA] transition-colors text-left"
              >
                <Thumbnail icon={product.icon} imageUrl={product.imageUrl} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#3F4752] truncate">{product.name}</p>
                  <p className="text-xs text-[#526579] mt-0.5">{product.supplier}</p>
                </div>
                <ChevronRight size={16} className="text-[#94A3B8] shrink-0" />
              </button>
            ))}
          </div>

          {/* Desktop: grid of tiles */}
          <div className="hidden lg:block bg-[#F4F7FA] px-8 py-6">
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-[#94A3B8]">No products match the selected filters.</p>
                <Link
                  href="/catalogue/add-product?source=library"
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#8ADFF0] bg-[#AEEAF7] px-4 py-2.5 text-sm font-semibold text-[#10243E] transition-colors hover:bg-[#9BE4F4]"
                >
                  <Plus size={16} />
                  Add product
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map(product => {
                  const Icon = ICON_MAP[product.icon]
                  return (
                    <button
                      key={product.id}
                      onClick={() => setSelected(product)}
                      className={`bg-white rounded-2xl border border-[#D5DCE3] p-4 text-left hover:shadow-md hover:border-[#4DA3FF]/40 transition-all group ${
                        selected?.id === product.id ? "border-[#4DA3FF] shadow-md" : ""
                      }`}
                    >
                      <div className="w-full aspect-square rounded-xl bg-[#F0F4F8] flex items-center justify-center mb-3 overflow-hidden group-hover:bg-[#EAF3FF] transition-colors">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <Icon size={40} className="text-[#4DA3FF]" />
                        )}
                      </div>
                      <p className="text-sm font-semibold text-[#3F4752] leading-snug line-clamp-2">{product.name}</p>
                      <p className="text-[11px] text-[#6B7B8C] mt-1 line-clamp-1">{product.sourceBadge}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[11px] text-[#526579]">{product.supplier}</span>
                        <span className="text-[11px] text-[#94A3B8]">{product.category}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Mobile detail panel (always) */}
      {selected && (
        <div className="lg:hidden">
          <DetailPanel product={selected} onClose={() => setSelected(null)} />
        </div>
      )}

      {/* Desktop overlay panel — grid view only */}
      {view === "grid" && selected && (
        <div className="hidden lg:flex fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-50 flex-col border-l border-[#D5DCE3] overflow-y-auto">
          <DetailContent
            product={selected}
            Icon={ICON_MAP[selected.icon]}
            onClose={() => setSelected(null)}
          />
        </div>
      )}
      </div>

      <WorkspaceDesktopShell
        currentNav="catalogue"
        sectionLabel="Library Catalogue"
        rightRail={
          selected ? (
            <section className="overflow-hidden rounded-[12px] border border-[#DCEAF0] bg-white shadow-[0_12px_30px_-26px_rgba(16,36,62,0.28)]">
              <DetailContent
                product={selected}
                Icon={ICON_MAP[selected.icon]}
                onClose={() => setSelected(null)}
              />
            </section>
          ) : (
            <div className="space-y-3">
              <section className="rounded-[12px] border border-[#DCEAF0] bg-white px-3 py-3 shadow-[0_12px_30px_-26px_rgba(16,36,62,0.28)]">
                <p className="text-[15px] font-medium text-[#10243E]">Catalogue</p>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between text-[13px] text-[#5B7286]">
                    <span>Total items</span>
                    <span className="text-[18px] text-[#10243E]">{products.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px] text-[#5B7286]">
                    <span>Filtered</span>
                    <span className="text-[18px] text-[#0F4C5C]">{filtered.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px] text-[#5B7286]">
                    <span>Active filters</span>
                    <span className="text-[18px] text-[#C2410C]">{activeFilterCount}</span>
                  </div>
                </div>
              </section>

              <section className="rounded-[12px] border border-[#DCEAF0] bg-white px-3 py-3 shadow-[0_12px_30px_-26px_rgba(16,36,62,0.28)]">
                <p className="text-[15px] font-medium text-[#10243E]">Data source</p>
                <p className="mt-3 text-[13px] leading-5 text-[#61758B]">
                  This catalogue is still running from seeded product data plus local overrides, not a shared Firebase catalogue yet.
                </p>
              </section>

              <section className="rounded-[12px] border border-[#DCEAF0] bg-white px-3 py-3 shadow-[0_12px_30px_-26px_rgba(16,36,62,0.28)]">
                <p className="text-[15px] font-medium text-[#10243E]">Selection</p>
                <p className="mt-3 text-[13px] leading-5 text-[#61758B]">
                  Select a product to inspect supplier details, description, saved imagery, and linked edit actions.
                </p>
              </section>
            </div>
          )
        }
      >
        <div className="space-y-4">
          <section className="px-1">
            <p className="text-[13px] text-[#5B7A8A] lg:hidden">Catalogue</p>
            <h1 className="mt-1 text-[32px] tracking-[-0.04em] text-[#10243E] lg:hidden">Products and stock</h1>
            <p className="mt-2 text-[14px] text-[#61758B]">
              Search supplier-fixed systems, trays, implants, consumables, and equipment.
            </p>
          </section>

          <section className="rounded-[18px] border border-[#D8E3EE] bg-white p-3 shadow-[0_12px_30px_-26px_rgba(16,36,62,0.28)]">
            <div className="flex items-center gap-3">
              <div className="relative min-w-0 flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Search by name, supplier, or description..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full rounded-xl border border-[#D5DCE3] bg-[#F4F7FA] py-2.5 pl-9 pr-4 text-sm text-[#3F4752] placeholder:text-[#94A3B8] transition-colors focus:border-[#4DA3FF] focus:bg-white focus:outline-none"
                />
                {query ? (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#526579]"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>

              <Link
                href="/catalogue/add-product?source=library"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#10243E] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#163250]"
              >
                <Plus size={16} />
                Add product
              </Link>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select value={specialtyFilter} onChange={(event) => setSpecialtyFilter(event.target.value)} className="text-sm border border-[#D5DCE3] rounded-lg px-3 py-1.5 bg-white text-[#3F4752]">
                {SPECIALTIES.map((specialty) => <option key={specialty}>{specialty}</option>)}
              </select>
              <select value={catFilter} onChange={(event) => setCatFilter(event.target.value)} className="text-sm border border-[#D5DCE3] rounded-lg px-3 py-1.5 bg-white text-[#3F4752]">
                {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
              <select value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)} className="text-sm border border-[#D5DCE3] rounded-lg px-3 py-1.5 bg-white text-[#3F4752]">
                {SUPPLIERS.map((supplier) => <option key={supplier}>{supplier}</option>)}
              </select>
              <select value={recordTypeFilter} onChange={(event) => setRecordTypeFilter(event.target.value)} className="text-sm border border-[#D5DCE3] rounded-lg px-3 py-1.5 bg-white text-[#3F4752]">
                {RECORD_TYPES.map((type) => <option key={type}>{type}</option>)}
              </select>
              <span className="ml-auto text-xs text-[#94A3B8]">{filtered.length} items</span>

              <div className="flex items-center gap-0.5 rounded-lg border border-[#D5DCE3] p-0.5">
                <button
                  onClick={() => setView("list")}
                  className={`rounded-md p-1.5 transition-colors ${view === "list" ? "bg-[#4DA3FF] text-white" : "text-[#94A3B8] hover:text-[#526579]"}`}
                  title="List view"
                >
                  <List size={15} />
                </button>
                <button
                  onClick={() => setView("grid")}
                  className={`rounded-md p-1.5 transition-colors ${view === "grid" ? "bg-[#4DA3FF] text-white" : "text-[#94A3B8] hover:text-[#526579]"}`}
                  title="Grid view"
                >
                  <LayoutGrid size={15} />
                </button>
              </div>
            </div>
          </section>

          {view === "list" ? (
            <section className="overflow-hidden rounded-[18px] border border-[#D8E3EE] bg-white shadow-[0_12px_30px_-26px_rgba(16,36,62,0.28)]">
              {filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-[#94A3B8]">No products match the selected filters.</p>
                </div>
              ) : (
                filtered.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => setSelected(product)}
                    className={`flex w-full items-center gap-4 border-b border-[#D5DCE3] px-4 py-4 text-left transition-colors hover:bg-[#F4F7FA] last:border-b-0 ${
                      selected?.id === product.id ? "bg-[#F4F7FA]" : ""
                    }`}
                  >
                    <Thumbnail icon={product.icon} imageUrl={product.imageUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#3F4752]">{product.name}</p>
                      <p className="mt-0.5 text-xs text-[#526579]">{product.supplier}</p>
                      <p className="mt-1 text-[11px] text-[#6B7B8C]">{product.sourceBadge}</p>
                    </div>
                    <div className="shrink-0 text-right text-[11px] text-[#94A3B8]">{product.category}</div>
                  </button>
                ))
              )}
            </section>
          ) : (
            <section className="rounded-[18px] border border-[#D8E3EE] bg-[#F4F7FA] p-4 shadow-[0_12px_30px_-26px_rgba(16,36,62,0.28)]">
              {filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-[#94A3B8]">No products match the selected filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4 xl:grid-cols-4">
                  {filtered.map((product) => {
                    const Icon = ICON_MAP[product.icon]
                    return (
                      <button
                        key={product.id}
                        onClick={() => setSelected(product)}
                        className={`rounded-2xl border border-[#D5DCE3] bg-white p-4 text-left transition-all hover:border-[#4DA3FF]/40 hover:shadow-md ${
                          selected?.id === product.id ? "border-[#4DA3FF] shadow-md" : ""
                        }`}
                      >
                        <div className="mb-3 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-[#F0F4F8]">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <Icon size={40} className="text-[#4DA3FF]" />
                          )}
                        </div>
                        <p className="line-clamp-2 text-sm font-semibold leading-snug text-[#3F4752]">{product.name}</p>
                        <p className="mt-1 line-clamp-1 text-[11px] text-[#6B7B8C]">{product.sourceBadge}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[11px] text-[#526579]">{product.supplier}</span>
                          <span className="text-[11px] text-[#94A3B8]">{product.category}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </WorkspaceDesktopShell>
    </>
  )
}
