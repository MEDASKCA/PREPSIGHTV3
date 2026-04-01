"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, House, Search } from "lucide-react"
import type { CatalogueItemRecord } from "@/lib/types"

interface Props {
  items: CatalogueItemRecord[]
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "implant_system", label: "Implants" },
  { id: "instrument_sets_trays", label: "Trays" },
  { id: "equipment_devices", label: "Equipment" },
  { id: "consumables_supplies", label: "Consumables" },
  { id: "ppe", label: "PPE" },
] as const

export default function CatalogueClient({ items }: Props) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((item) => {
      const categoryOk = filter === "all" || item.category === filter
      if (!categoryOk) return false
      if (!q) return true
      return [
        item.name,
        item.sku,
        item.product,
        item.description,
        item.manufacturer,
        item.supplier?.name,
        ...(item.aliases ?? []),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    })
  }, [filter, items, query])

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <header data-dev-trigger className="sticky top-0 z-30 border-b border-white/10 bg-[#00B4D8]">
        <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+8px)] lg:pt-3">
          <Link
            href="/"
            className="mt-0.5 shrink-0 text-[#10243E]/70 transition-colors hover:text-[#10243E]"
          >
            <ArrowLeft size={20} />
          </Link>

          <div className="min-w-0 flex-1">
            <h1 className="text-[18px] font-medium leading-snug text-[#10243E] lg:text-base">Catalogue</h1>
            <p className="mt-0.5 text-[15px] text-[#10243E]/68 lg:text-sm">
              Search supplier-fixed systems, trays, and reusable theatre products.
            </p>
          </div>

          <Link
            href="/"
            className="mt-0.5 shrink-0 rounded-lg p-2 text-[#10243E]/70 transition-colors hover:bg-[#10243E]/8 hover:text-[#10243E]"
            aria-label="Home"
          >
            <House size={18} />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4">
        <div className="rounded-2xl border border-[#D5DCE3] bg-white p-4">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by product name, SKU, supplier, alias..."
              className="w-full rounded-xl border border-[#D5DCE3] bg-[#F8FAFC] py-3 pl-10 pr-3 text-[15px] text-slate-700 outline-none ring-0 transition-colors focus:border-[#4DA3FF] lg:text-sm"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {FILTERS.map((option) => (
              <button
                key={option.id}
                onClick={() => setFilter(option.id)}
                className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors lg:text-xs ${
                  filter === option.id
                    ? "bg-[#4DA3FF] text-white"
                    : "bg-[#E6EEF6] text-slate-600 hover:bg-[#D8E6F3]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[13px] text-slate-500 lg:text-xs">
          <p>{filtered.length} items</p>
          <p>Supplier-fixed items stay locked in cards</p>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-[#D5DCE3] bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-[15px] font-bold text-slate-800 lg:text-sm">
                    {item.name}
                  </h2>
                  <p className="mt-1 text-[13px] text-slate-500 lg:text-xs">
                    {item.supplier?.name ?? item.manufacturer ?? "PrepSight catalogue"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide lg:text-[10px] ${
                    item.isFixed
                      ? "bg-slate-100 text-slate-700"
                      : "bg-teal-100 text-teal-700"
                  }`}
                >
                  {item.isFixed ? "Fixed" : "Editable"}
                </span>
              </div>

              <div className="mt-3 space-y-2 text-[13px] text-slate-600 lg:text-xs">
                <p>
                  <span className="font-semibold text-slate-700">Category:</span>{" "}
                  {item.category}
                </p>
                {item.sku && (
                  <p>
                    <span className="font-semibold text-slate-700">SKU:</span>{" "}
                    {item.sku}
                  </p>
                )}
                {item.product && (
                  <p>
                    <span className="font-semibold text-slate-700">Product:</span>{" "}
                    {item.product}
                  </p>
                )}
                {item.description && (
                  <p className="line-clamp-4">{item.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
