"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Pencil,
  Search,
  X,
  ChevronRight,
  Bone,
  Package,
  Settings,
  Zap,
  Thermometer,
  LayoutGrid,
  Wrench,
  QrCode,
  MapPin,
  Phone,
  SlidersHorizontal,
} from "lucide-react"
import {
  type CatalogueProduct,
} from "@/lib/catalogue-data"
import {
  getCatalogueCategoryOptions,
  getCatalogueSupplierOptions,
  useCatalogueProducts,
} from "@/lib/catalogue-products-store"

// ── Types ─────────────────────────────────────────────────────────────────────

type ProductStatus = "In Stock" | "Low Stock" | "Out of Stock" | "Available"
type IconKey = "bone" | "package" | "settings" | "zap" | "thermometer" | "layout" | "wrench"

interface Product extends CatalogueProduct {
  status: ProductStatus
  qty: number
  icon: IconKey
  nhsStatus: "Contract" | "Off-Contract"
  sourceBadge: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function iconForProduct(p: CatalogueProduct): IconKey {
  if (p.category === "Implants") return "bone"
  if (p.subcategory === "Diathermy") return "zap"
  if (p.subcategory === "Warming") return "thermometer"
  if (p.subcategory === "Tables") return "layout"
  if (p.category === "Instruments") return "wrench"
  if (p.category === "Equipment") return "settings"
  return "package"
}

function seedQty(sku: string): number {
  const n = sku.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return (n % 9) + 1
}

// ── Data from shared catalogue ────────────────────────────────────────────────

const NHS_STATUSES = ["All", "Contract", "Off-Contract"]
const RECORD_TYPES = ["All Record Types", "Seeded Product", "Extracted System", "Extracted Component"]

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
    case "In Stock":     return "text-emerald-600"
    case "Low Stock":    return "text-amber-600"
    case "Out of Stock": return "text-red-500"
    case "Available":    return "text-[#4DA3FF]"
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

// ── Detail Panel ──────────────────────────────────────────────────────────────

function DetailContent({ product, Icon, onClose }: { product: Product; Icon: React.ElementType; onClose: () => void }) {
  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex gap-3">
          <div className="w-28 h-28 rounded-2xl bg-[#F0F4F8] flex items-center justify-center shrink-0">
            <Icon size={48} className="text-[#4DA3FF]" />
          </div>
          <div className="w-28 h-28 rounded-2xl border border-dashed border-[#D5DCE3] bg-[#F4F7FA] flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#4DA3FF] hover:bg-[#EAF3FF] transition-colors"
            title="Product ID scan — coming soon">
            <QrCode size={32} className="text-[#94A3B8]" />
            <span className="text-[9px] text-[#94A3B8] font-mono text-center px-1 leading-tight">{product.sku}</span>
            <span className="text-[9px] text-[#4DA3FF] font-medium">Product ID →</span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F4F7FA]">
          <X size={20} className="text-[#94A3B8]" />
        </button>
      </div>
      <h2 className="text-base font-bold text-[#3F4752] mt-3 leading-snug">{product.name}</h2>
      <span className="inline-block mt-1 font-mono text-xs bg-[#F0F4F8] text-[#526579] px-2 py-0.5 rounded-md">{product.sku}</span>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between border-b border-[#D5DCE3] pb-2">
          <span className="text-xs text-[#94A3B8]">Supplier</span>
          {product.supplierPhone ? (
            <a href={`tel:${product.supplierPhone}`} className="flex items-center gap-1.5 text-sm font-medium text-[#4DA3FF] hover:underline">
              <Phone size={12} />{product.supplier}
            </a>
          ) : (
            <span className="text-sm text-[#3F4752] font-medium">{product.supplier}</span>
          )}
        </div>
        <div className="flex items-center justify-between border-b border-[#D5DCE3] pb-2">
          <span className="text-xs text-[#94A3B8]">Category</span>
          <span className="text-sm text-[#3F4752] font-medium">{product.category} · {product.subcategory}</span>
        </div>
        <div className="flex items-center justify-between border-b border-[#D5DCE3] pb-2">
          <span className="text-xs text-[#94A3B8]">Record type</span>
          <span className="text-sm text-[#3F4752] font-medium">{product.sourceBadge}</span>
        </div>
        <div className="flex items-center justify-between border-b border-[#D5DCE3] pb-2">
          <span className="text-xs text-[#94A3B8]">NHS Contract</span>
          <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${product.nhsStatus === "Contract" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {product.nhsStatus}
          </span>
        </div>
        <div className="flex items-center justify-between border-b border-[#D5DCE3] pb-2">
          <span className="text-xs text-[#94A3B8]">Status</span>
          <span className={`text-sm font-medium ${statusColor(product.status)}`}>{product.status}</span>
        </div>
        <div className="flex items-center justify-between border-b border-[#D5DCE3] pb-2">
          <span className="text-xs text-[#94A3B8]">Available Qty</span>
          <span className="text-sm text-[#3F4752] font-medium">{product.qty}</span>
        </div>
        {product.location && (
          <div className="flex items-start justify-between border-b border-[#D5DCE3] pb-2 gap-4">
            <span className="text-xs text-[#94A3B8] shrink-0">Location</span>
            <span className="flex items-center gap-1 text-xs text-[#526579] text-right">
              <MapPin size={11} className="text-[#94A3B8] shrink-0" />{product.location}
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
    </div>
  )
}

function DetailPanel({ product, onClose }: { product: Product; onClose: () => void }) {
  const Icon = ICON_MAP[product.icon]
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 lg:hidden shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-[#D5DCE3]" />
        </div>
        <DetailContent product={product} Icon={Icon} onClose={onClose} />
      </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProductSearchPage() {
  const searchParams = useSearchParams()
  const catalogueProducts = useCatalogueProducts()
  const [query,          setQuery]          = useState("")
  const [catFilter,      setCatFilter]      = useState("All Categories")
  const [supplierFilter, setSupplierFilter] = useState("All Suppliers")
  const [nhsFilter,      setNhsFilter]      = useState("All")
  const [recordTypeFilter, setRecordTypeFilter] = useState("All Record Types")
  const [selected,       setSelected]       = useState<Product | null>(null)
  const [filterOpen,     setFilterOpen]     = useState(false)

  const products = useMemo(
    () =>
      catalogueProducts.map((product) => ({
        ...product,
        icon: iconForProduct(product),
        status: "In Stock" as ProductStatus,
        qty: seedQty(product.sku),
        nhsStatus: (product.nhsContract ? "Contract" : "Off-Contract") as "Contract" | "Off-Contract",
        sourceBadge: sourceBadgeForProduct(product),
      })),
    [catalogueProducts],
  )

  const CATEGORIES = useMemo(() => getCatalogueCategoryOptions(catalogueProducts), [catalogueProducts])
  const SUPPLIERS = useMemo(() => getCatalogueSupplierOptions(catalogueProducts), [catalogueProducts])

  const activeFilterCount = [
    catFilter !== "All Categories",
    supplierFilter !== "All Suppliers",
    nhsFilter !== "All",
    recordTypeFilter !== "All Record Types",
  ].filter(Boolean).length

  const q = query.toLowerCase().trim()

  const filtered = products.filter(p => {
    if (q && !p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q) && !p.supplier.toLowerCase().includes(q)) return false
    if (catFilter !== "All Categories"     && p.category  !== catFilter)      return false
    if (supplierFilter !== "All Suppliers" && p.supplier  !== supplierFilter)  return false
    if (nhsFilter !== "All"               && p.nhsStatus !== nhsFilter)       return false
    if (recordTypeFilter !== "All Record Types" && p.sourceBadge !== recordTypeFilter) return false
    return true
  })

  useEffect(() => {
    const requestedProductId = searchParams.get("product")
    if (!requestedProductId) return
    const match = products.find((product) => product.id === requestedProductId)
    if (match) setSelected(match)
  }, [products, searchParams])

  return (
    <div className="app-shell-bg min-h-screen">
      {/* Header with search input */}
      <header className="bg-[#00B4D8] px-4 py-3 lg:px-8 lg:py-4">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/catalogue" className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} className="text-[#10243E]" />
          </Link>
          <h1 className="text-lg font-bold text-[#10243E] lg:text-2xl leading-tight">Product Search</h1>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#10243E]/50" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, SKU or supplier…"
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
      <div className="bg-white border-b border-[#D5DCE3] px-4 py-2.5 flex items-center gap-2 lg:px-8">
        {/* Mobile: filter button */}
        <button
          onClick={() => setFilterOpen(true)}
          className={`lg:hidden flex items-center gap-2 border rounded-lg px-3 py-1.5 text-sm shrink-0 transition-colors ${
            activeFilterCount > 0 ? "border-[#4DA3FF] text-[#4DA3FF] bg-[#EAF3FF]" : "border-[#D5DCE3] text-[#526579]"
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
        {/* Desktop: inline */}
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
        <select value={nhsFilter} onChange={e => setNhsFilter(e.target.value)}
          className="hidden lg:block text-sm border border-[#D5DCE3] rounded-lg px-3 py-1.5 bg-white text-[#3F4752]">
          {NHS_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <span className="ml-auto text-xs text-[#94A3B8] whitespace-nowrap shrink-0">
          {filtered.length} results
        </span>
      </div>

      {/* Mobile filter sheet */}
      {filterOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setFilterOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 lg:hidden shadow-2xl">
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-[#D5DCE3]" /></div>
            <div className="px-6 pb-8">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-[#3F4752]">Filters</h3>
                <button onClick={() => { setCatFilter("All Categories"); setSupplierFilter("All Suppliers"); setNhsFilter("All"); setRecordTypeFilter("All Record Types") }}
                  className="text-sm text-[#4DA3FF]">Clear all</button>
              </div>
              <div className="space-y-4">
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
                  <label className="block text-xs text-[#94A3B8] mb-1.5 uppercase tracking-wider">NHS Contract</label>
                  <select value={nhsFilter} onChange={e => setNhsFilter(e.target.value)}
                    className="w-full text-sm border border-[#D5DCE3] rounded-xl px-3 py-2.5 bg-white text-[#3F4752]">
                    {NHS_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={() => setFilterOpen(false)}
                className="mt-6 w-full py-3 bg-[#4DA3FF] text-white font-semibold rounded-xl text-sm">
                Show {filtered.length} results
              </button>
            </div>
          </div>
        </>
      )}

      {/* Desktop two-col */}
      <div className="lg:flex lg:h-[calc(100vh-148px)]">
        <div className="bg-white lg:flex-1 lg:overflow-y-auto lg:border-r lg:border-[#D5DCE3]">
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Search size={32} className="text-[#D5DCE3] mx-auto mb-3" />
              <p className="text-sm text-[#94A3B8]">No products found.</p>
            </div>
          ) : (
            filtered.map(product => {
              const Icon = ICON_MAP[product.icon]
              return (
                <button
                  key={product.id}
                  onClick={() => setSelected(product)}
                  className={`w-full flex items-center gap-4 px-4 py-4 border-b border-[#D5DCE3] hover:bg-[#F4F7FA] transition-colors text-left lg:px-8 ${
                    selected?.id === product.id ? "bg-[#F4F7FA]" : ""
                  }`}
                >
                  <div className="w-16 h-16 rounded-xl bg-[#F0F4F8] flex items-center justify-center shrink-0">
                    <Icon size={28} className="text-[#4DA3FF]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#3F4752] truncate">{product.name}</p>
                    <p className="text-xs text-[#94A3B8] mt-0.5 font-mono">{product.sku}</p>
                    <p className="text-xs text-[#526579] mt-0.5">{product.supplier}</p>
                    <p className="text-[11px] text-[#6B7B8C] mt-1">{product.sourceBadge}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
                      product.nhsStatus === "Contract" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {product.nhsStatus === "Contract" ? "NHS" : "Off"}
                    </span>
                    <span className={`text-xs font-medium ${statusColor(product.status)}`}>
                      {product.status}
                    </span>
                    <ChevronRight size={16} className="text-[#94A3B8]" />
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Desktop right panel */}
        <div className="hidden lg:flex w-[400px] bg-white flex-col overflow-y-auto border-l border-[#D5DCE3]">
          {selected ? (
            <DetailContent
              product={selected}
              Icon={ICON_MAP[selected.icon]}
              onClose={() => setSelected(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#94A3B8] text-sm gap-2 p-8">
              <Search size={32} className="text-[#D5DCE3]" />
              <p>Search and select a product</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile detail */}
      {selected && (
        <div className="lg:hidden">
          <DetailPanel product={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  )
}
