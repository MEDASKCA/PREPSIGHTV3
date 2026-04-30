"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  Bone,
  ChevronRight,
  LayoutGrid,
  List,
  MapPin,
  Package,
  Pencil,
  Phone,
  Plus,
  Search,
  Settings,
  Thermometer,
  Wrench,
  X,
  Zap,
} from "lucide-react"
import type { CatalogueProduct } from "@/lib/catalogue-data"
import {
  getCatalogueCategoryOptions,
  getCatalogueSpecialtyOptions,
  getCatalogueSupplierOptions,
  useCatalogueProducts,
} from "@/lib/catalogue-products-store"
import WorkspaceDesktopShell from "@/components/WorkspaceDesktopShell"

type IconKey = "bone" | "package" | "settings" | "zap" | "thermometer" | "layout" | "wrench"
type ViewMode = "list" | "grid"

interface Product extends CatalogueProduct {
  icon: IconKey
  sourceBadge: string
}

const ICON_MAP: Record<IconKey, React.ElementType> = {
  bone: Bone,
  package: Package,
  settings: Settings,
  zap: Zap,
  thermometer: Thermometer,
  layout: LayoutGrid,
  wrench: Wrench,
}

const RECORD_TYPES = ["All record types", "Seeded product", "Extracted system", "Extracted component"]

function iconForProduct(product: CatalogueProduct): IconKey {
  if (product.category === "Implants") return "bone"
  if (product.subcategory === "Diathermy") return "zap"
  if (product.subcategory === "Warming") return "thermometer"
  if (product.subcategory === "Tables") return "layout"
  if (product.category === "Instruments") return "wrench"
  if (product.category === "Equipment") return "settings"
  return "package"
}

function sourceBadgeForProduct(product: CatalogueProduct): string {
  switch (product.sourceModel) {
    case "extracted_system":
      return "Extracted system"
    case "extracted_component":
      return "Extracted component"
    default:
      return "Seeded product"
  }
}

function Thumbnail({ icon, imageUrl, size = 28 }: { icon: IconKey; imageUrl?: string; size?: number }) {
  const Icon = ICON_MAP[icon]
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] border border-[#2d2d2d] bg-[#202020]">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-full w-full rounded-[10px] object-cover" />
      ) : (
        <Icon size={size} className="text-white" />
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="border-b border-[#252525] pb-3 last:border-b-0">
      <p className="text-[12px] text-[#7f7f7f]">{label}</p>
      <p className="mt-1 text-[14px] text-white">{value || "not set"}</p>
    </div>
  )
}

function DetailContent({ product, onClose }: { product: Product; onClose: () => void }) {
  const Icon = ICON_MAP[product.icon]

  return (
    <div className="space-y-5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-[12px] border border-[#2d2d2d] bg-[#202020]">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="h-full w-full rounded-[12px] object-cover" />
            ) : (
              <Icon size={28} className="text-white" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-[18px] leading-6 text-white">{product.name}</h2>
            <p className="mt-1 text-[13px] text-[#8f8f8f]">{product.sourceBadge}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[10px] border border-[#2d2d2d] bg-[#202020] p-2 text-[#8f8f8f] hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-3">
        <DetailRow label="supplier" value={product.supplier} />
        <DetailRow label="category" value={`${product.category} / ${product.subcategory}`} />
        <DetailRow label="record type" value={product.sourceBadge} />
        <DetailRow label="location" value={product.location || "not assigned"} />
      </div>

      {product.description ? (
        <p className="text-[14px] leading-6 text-[#9a9a9a]">{product.description}</p>
      ) : null}

      <div className="space-y-3 border-t border-[#252525] pt-4 text-[13px] text-[#8f8f8f]">
        {product.supplierPhone ? (
          <a href={`tel:${product.supplierPhone}`} className="flex items-center gap-2 hover:text-white">
            <Phone size={14} />
            {product.supplierPhone}
          </a>
        ) : null}
        {product.location ? (
          <div className="flex items-center gap-2">
            <MapPin size={14} />
            {product.location}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/catalogue/add-product?id=${encodeURIComponent(product.id)}&source=library`}
          className="inline-flex items-center gap-2 rounded-full border border-white bg-white px-4 py-2 text-[13px] text-black hover:bg-[#e8e8e8]"
        >
          <Pencil size={14} />
          edit product
        </Link>
        {product.category === "Implants" ? (
          <Link
            href="/catalogue/implants"
            className="inline-flex items-center gap-2 rounded-full border border-[#2d2d2d] bg-[#202020] px-4 py-2 text-[13px] text-white hover:bg-[#252525]"
          >
            view rack
            <ChevronRight size={14} />
          </Link>
        ) : null}
      </div>
    </div>
  )
}

function DetailPanel({ product, onClose }: { product: Product; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-[16px] border border-[#2d2d2d] bg-[#111111] lg:hidden">
        <DetailContent product={product} onClose={onClose} />
      </div>
    </>
  )
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-full border border-[#2d2d2d] bg-[#202020] px-3 py-2 text-[13px] text-white outline-none"
    >
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  )
}

export default function CataloguePage() {
  const catalogueProducts = useCatalogueProducts()
  const [catFilter, setCatFilter] = useState("All Categories")
  const [supplierFilter, setSupplierFilter] = useState("All Suppliers")
  const [specialtyFilter, setSpecialtyFilter] = useState("All Specialties")
  const [recordTypeFilter, setRecordTypeFilter] = useState("All record types")
  const [selected, setSelected] = useState<Product | null>(null)
  const [view, setView] = useState<ViewMode>("list")
  const [query, setQuery] = useState("")

  const products = useMemo(
    () =>
      catalogueProducts.map((product) => ({
        ...product,
        icon: iconForProduct(product),
        sourceBadge: sourceBadgeForProduct(product),
      })),
    [catalogueProducts],
  )

  const categoryOptions = useMemo(() => getCatalogueCategoryOptions(catalogueProducts), [catalogueProducts])
  const supplierOptions = useMemo(() => getCatalogueSupplierOptions(catalogueProducts), [catalogueProducts])
  const specialtyOptions = useMemo(
    () => ["All Specialties", ...getCatalogueSpecialtyOptions(catalogueProducts)],
    [catalogueProducts],
  )

  const activeFilterCount = [
    catFilter !== "All Categories",
    supplierFilter !== "All Suppliers",
    specialtyFilter !== "All Specialties",
    recordTypeFilter !== "All record types",
  ].filter(Boolean).length

  const filtered = useMemo(() => {
    return products.filter((product) => {
      if (catFilter !== "All Categories" && product.category !== catFilter) return false
      if (supplierFilter !== "All Suppliers" && product.supplier !== supplierFilter) return false
      if (specialtyFilter !== "All Specialties" && !product.specialty.includes(specialtyFilter) && !product.specialty.includes("All")) return false
      if (recordTypeFilter !== "All record types" && product.sourceBadge !== recordTypeFilter) return false
      if (!query.trim()) return true

      const text = `${product.name} ${product.supplier} ${product.description ?? ""}`.toLowerCase()
      return text.includes(query.trim().toLowerCase())
    })
  }, [catFilter, products, query, recordTypeFilter, specialtyFilter, supplierFilter])

  const stats = (
    <section className="rounded-[12px] border border-[#2d2d2d] bg-[#161616] px-4 py-4">
      <p className="text-[15px] text-white">catalogue</p>
      <div className="mt-4 space-y-3 text-[13px] text-[#8f8f8f]">
        <div className="flex items-center justify-between">
          <span>total items</span>
          <span className="text-[18px] text-white">{products.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>filtered</span>
          <span className="text-[18px] text-white">{filtered.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>active filters</span>
          <span className="text-[18px] text-white">{activeFilterCount}</span>
        </div>
      </div>
    </section>
  )

  const catalogueBody = (
    <div className="space-y-5">
      <section>
        <h1 className="text-[32px] tracking-[-0.04em] text-white">catalogue</h1>
        <p className="mt-2 max-w-[760px] text-[15px] leading-7 text-[#9a9a9a]">
          Search supplier-fixed systems, trays, implants, consumables, and equipment in one minimal surface.
        </p>
      </section>

      <section className="rounded-[12px] border border-[#2d2d2d] bg-[#161616] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7f7f]" />
            <input
              type="text"
              placeholder="search by name, supplier, or description"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-full border border-[#2d2d2d] bg-[#202020] py-2.5 pl-9 pr-10 text-[14px] text-white outline-none placeholder:text-[#6f6f6f]"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7f7f7f] hover:text-white"
              >
                <X size={14} />
              </button>
            ) : null}
          </label>

          <Link
            href="/catalogue/add-product?source=library"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-white bg-white px-4 py-2.5 text-[13px] text-black hover:bg-[#e8e8e8]"
          >
            <Plus size={15} />
            add product
          </Link>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <FilterSelect value={specialtyFilter} onChange={setSpecialtyFilter} options={specialtyOptions} />
          <FilterSelect value={catFilter} onChange={setCatFilter} options={categoryOptions} />
          <FilterSelect value={supplierFilter} onChange={setSupplierFilter} options={supplierOptions} />
          <FilterSelect value={recordTypeFilter} onChange={setRecordTypeFilter} options={RECORD_TYPES} />

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[13px] text-[#8f8f8f]">{filtered.length} items</span>
            <div className="flex items-center gap-1 rounded-full border border-[#2d2d2d] bg-[#202020] p-1">
              <button
                type="button"
                onClick={() => setView("list")}
                className={`rounded-full p-2 ${view === "list" ? "bg-white text-black" : "text-[#8f8f8f] hover:text-white"}`}
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => setView("grid")}
                className={`rounded-full p-2 ${view === "grid" ? "bg-white text-black" : "text-[#8f8f8f] hover:text-white"}`}
              >
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {view === "list" ? (
        <section className="overflow-hidden rounded-[12px] border border-[#2d2d2d] bg-[#161616]">
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-[16px] text-white">no products match this view</p>
              <p className="mt-1 text-[14px] text-[#8f8f8f]">try another search or filter combination</p>
            </div>
          ) : (
            filtered.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => setSelected(product)}
                className={`flex w-full items-center gap-4 border-b border-[#252525] px-4 py-4 text-left last:border-b-0 hover:bg-[#1d1d1d] ${
                  selected?.id === product.id ? "bg-[#1d1d1d]" : ""
                }`}
              >
                <Thumbnail icon={product.icon} imageUrl={product.imageUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] text-white">{product.name}</p>
                  <p className="mt-1 text-[13px] text-[#8f8f8f]">{product.supplier}</p>
                  <p className="mt-1 text-[12px] text-[#6f6f6f]">{product.sourceBadge}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[12px] text-[#8f8f8f]">{product.category}</p>
                  <ChevronRight size={14} className="ml-auto mt-2 text-[#6f6f6f]" />
                </div>
              </button>
            ))
          )}
        </section>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.length === 0 ? (
            <div className="rounded-[12px] border border-[#2d2d2d] bg-[#161616] px-4 py-12 text-center sm:col-span-2 xl:col-span-3">
              <p className="text-[16px] text-white">no products match this view</p>
              <p className="mt-1 text-[14px] text-[#8f8f8f]">try another search or filter combination</p>
            </div>
          ) : (
            filtered.map((product) => {
              const Icon = ICON_MAP[product.icon]

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSelected(product)}
                  className={`rounded-[12px] border px-4 py-4 text-left transition-colors ${
                    selected?.id === product.id
                      ? "border-[#3a3a3a] bg-[#1d1d1d]"
                      : "border-[#2d2d2d] bg-[#161616] hover:border-[#3a3a3a] hover:bg-[#1d1d1d]"
                  }`}
                >
                  <div className="mb-4 flex aspect-square w-full items-center justify-center rounded-[10px] border border-[#2d2d2d] bg-[#202020]">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full rounded-[10px] object-cover" />
                    ) : (
                      <Icon size={36} className="text-white" />
                    )}
                  </div>
                  <p className="line-clamp-2 text-[15px] leading-6 text-white">{product.name}</p>
                  <p className="mt-1 text-[13px] text-[#8f8f8f]">{product.supplier}</p>
                  <p className="mt-1 text-[12px] text-[#6f6f6f]">{product.sourceBadge}</p>
                </button>
              )
            })
          )}
        </section>
      )}
    </div>
  )

  return (
    <>
      <div className="min-h-screen bg-black px-4 py-4 text-white lg:hidden">
        {catalogueBody}
        {selected ? <DetailPanel product={selected} onClose={() => setSelected(null)} /> : null}
      </div>

      <WorkspaceDesktopShell
        currentNav="catalogue"
        sectionLabel="library catalogue"
        rightRail={
          selected ? (
            <section className="h-full overflow-y-auto border-l border-[#252525] bg-[#111111]">
              <DetailContent product={selected} onClose={() => setSelected(null)} />
            </section>
          ) : (
            stats
          )
        }
      >
        {catalogueBody}
      </WorkspaceDesktopShell>
    </>
  )
}
