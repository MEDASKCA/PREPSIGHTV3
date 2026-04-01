"use client"

import { useMemo, useState } from "react"
import { Search, X } from "lucide-react"
import { getCatalogueItemsByCategory } from "@/lib/catalogue"
import type { Item, SectionType } from "@/lib/types"

interface Props {
  sectionType: SectionType
  onClose: () => void
  onSelect: (item: Item) => void
}

export default function CataloguePickerModal({
  sectionType,
  onClose,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("")
  const items = getCatalogueItemsByCategory(sectionType)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) =>
      [
        item.name,
        item.sku,
        item.product,
        item.description,
        item.manufacturer,
        item.supplier?.name,
        ...(item.aliases ?? []),
        item.sizeLabel,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    )
  }, [items, query])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Catalogue
            </p>
            <h3 className="text-lg font-bold text-slate-800">
              Add items to {sectionType.replaceAll("_", " ")}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        <div className="relative mb-4">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, size, supplier, SKU..."
            className="w-full rounded-xl border border-[#D5DCE3] bg-[#F8FAFC] py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-[#4DA3FF]"
          />
        </div>

        <div className="space-y-2">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() =>
                onSelect({
                  id: item.id,
                  name: item.name,
                  sku: item.sku,
                  product: item.product,
                  description: item.description,
                  supplier: item.supplier,
                  catalogueItemId: item.id,
                  sourceType: item.sourceType,
                  isFixed: false,
                  defaultQty: 1,
                })
              }
              className="block w-full rounded-xl border border-[#D5DCE3] bg-white px-4 py-3 text-left transition-colors hover:border-[#4DA3FF] hover:bg-[#F8FBFF]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {item.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.supplier?.name ?? item.manufacturer ?? "PrepSight catalogue"}
                  </p>
                  {item.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {item.description}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right text-[11px] text-slate-400">
                  {item.sizeLabel && <p>{item.sizeLabel}</p>}
                  {item.sku && <p>{item.sku}</p>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
