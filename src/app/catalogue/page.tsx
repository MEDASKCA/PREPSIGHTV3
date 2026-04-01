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
  QrCode,
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

// ── Types ─────────────────────────────────────────────────────────────────────

type ProductStatus = "In Stock" | "Low Stock" | "Out of Stock" | "Available"
type IconKey = "bone" | "package" | "settings" | "zap" | "thermometer" | "layout" | "wrench"

// View type for the page — CatalogueProduct extended with runtime stock fields
interface Product extends CatalogueProduct {
  status: ProductStatus
  qty: number
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
function seedQty(sku: string): number {
  const n = sku.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return (n % 9) + 1
}

const STATUSES    = ["All Status", "In Stock", "Low Stock", "Out of Stock", "Available"]

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

function statusColor(status: ProductStatus): string {
  switch (status) {
    case "In Stock":    return "text-emerald-600"
    case "Low Stock":   return "text-amber-600"
    case "Out of Stock": return "text-red-500"
    case "Available":   return "text-[#4DA3FF]"
  }
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

function Thumbnail({ icon, size = 28 }: { icon: IconKey; size?: number }) {
  const Icon = ICON_MAP[icon]
  return (
    <div className="w-16 h-16 rounded-xl bg-[#F0F4F8] flex items-center justify-center shrink-0">
      <Icon size={size} className="text-[#4DA3FF]" />
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
          {/* QR placeholder — linked to Product ID later */}
          <div
            className="w-28 h-28 rounded-2xl border border-dashed border-[#D5DCE3] bg-[#F4F7FA] flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#4DA3FF] hover:bg-[#EAF3FF] transition-colors"
            title="Product ID scan — coming soon"
          >
            <QrCode size={32} className="text-[#94A3B8]" />
            <span className="text-[9px] text-[#94A3B8] font-mono text-center px-1 leading-tight">
              {product.sku}
            </span>
            <span className="text-[9px] text-[#4DA3FF] font-medium">Product ID →</span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F4F7FA] transition-colors">
          <X size={20} className="text-[#94A3B8]" />
        </button>
      </div>

      <h2 className="text-base font-bold text-[#3F4752] mt-3 leading-snug">{product.name}</h2>
      <span className="inline-block mt-1 font-mono text-xs bg-[#F0F4F8] text-[#526579] px-2 py-0.5 rounded-md">
        {product.sku}
      </span>

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
        <DetailRow label="Status">
          <span className={`text-sm font-medium ${statusColor(product.status)}`}>{product.status}</span>
        </DetailRow>
        <DetailRow label="Available Qty" value={String(product.qty)} />

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
  const [statusFilter,    setStatusFilter]    = useState("All Status")
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
        status: "In Stock" as ProductStatus,
        qty: seedQty(product.sku),
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
    statusFilter !== "All Status",
    specialtyFilter !== "All Specialties",
    recordTypeFilter !== "All Record Types",
  ].filter(Boolean).length

  const filtered = products.filter(p => {
    if (catFilter !== "All Categories"        && p.category !== catFilter)                                                        return false
    if (supplierFilter !== "All Suppliers"    && p.supplier !== supplierFilter)                                                    return false
    if (statusFilter !== "All Status"         && p.status !== statusFilter)                                                        return false
    if (specialtyFilter !== "All Specialties" && !p.specialty.includes(specialtyFilter) && !p.specialty.includes("All"))          return false
    if (recordTypeFilter !== "All Record Types" && p.sourceBadge !== recordTypeFilter)                                             return false
    if (query) {
      const q = query.toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q) && !p.supplier.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div className="app-shell-bg min-h-screen">
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
            placeholder="Search by name, SKU, or supplier…"
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
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="hidden lg:block text-sm border border-[#D5DCE3] rounded-lg px-3 py-1.5 bg-white text-[#3F4752]">
          {STATUSES.map(s => <option key={s}>{s}</option>)}
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
                  onClick={() => { setCatFilter("All Categories"); setSupplierFilter("All Suppliers"); setStatusFilter("All Status"); setSpecialtyFilter("All Specialties"); setRecordTypeFilter("All Record Types") }}
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
                <div>
                  <label className="block text-xs text-[#94A3B8] mb-1.5 uppercase tracking-wider">Status</label>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="w-full text-sm border border-[#D5DCE3] rounded-xl px-3 py-2.5 bg-white text-[#3F4752]">
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
                  <Thumbnail icon={product.icon} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#3F4752] truncate">{product.name}</p>
                    <p className="text-xs text-[#94A3B8] mt-0.5 font-mono">{product.sku}</p>
                    <p className="text-xs text-[#526579] mt-0.5">{product.supplier}</p>
                    <p className="text-[11px] text-[#6B7B8C] mt-1">{product.sourceBadge}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-medium ${statusColor(product.status)}`}>
                      {product.status}
                    </span>
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
                <Thumbnail icon={product.icon} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#3F4752] truncate">{product.name}</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5 font-mono">{product.sku}</p>
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
                      <div className="w-full aspect-square rounded-xl bg-[#F0F4F8] flex items-center justify-center mb-3 group-hover:bg-[#EAF3FF] transition-colors">
                        <Icon size={40} className="text-[#4DA3FF]" />
                      </div>
                      <p className="text-sm font-semibold text-[#3F4752] leading-snug line-clamp-2">{product.name}</p>
                      <p className="text-[11px] font-mono text-[#94A3B8] mt-1">{product.sku}</p>
                      <p className="text-[11px] text-[#6B7B8C] mt-1 line-clamp-1">{product.sourceBadge}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[11px] text-[#526579]">{product.supplier}</span>
                        <span className={`text-[11px] font-medium ${statusColor(product.status)}`}>{product.status}</span>
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
  )
}
