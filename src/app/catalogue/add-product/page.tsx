"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, MessageSquareText, PackagePlus, Save, ScanLine } from "lucide-react"
import {
  BASE_CATALOGUE_CATEGORY_OPTIONS,
  BASE_CATALOGUE_SUPPLIER_OPTIONS,
  DEFAULT_PRODUCT_DRAFT,
  getCatalogueProductDraftById,
  saveCatalogueProduct,
  type CatalogueProductDraft,
} from "@/lib/catalogue-products-store"
import { SETTING_SPECIALTIES } from "@/lib/settings"

const CATEGORY_OPTIONS = BASE_CATALOGUE_CATEGORY_OPTIONS.filter((value) => value !== "All Categories")
const SPECIALTY_OPTIONS = SETTING_SPECIALTIES["Operating Theatre"]

function mergeDraft(base: CatalogueProductDraft, partial: Partial<CatalogueProductDraft>): CatalogueProductDraft {
  const next = { ...base }

  for (const [key, value] of Object.entries(partial) as Array<[keyof CatalogueProductDraft, CatalogueProductDraft[keyof CatalogueProductDraft] | undefined]>) {
    if (value !== undefined) {
      next[key] = value as never
    }
  }

  return next
}

export default function AddProductPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = searchParams.get("id")
  const source = searchParams.get("source") === "chat" ? "chat" : "library"

  const resolvedDraft = useMemo(() => {
    const fromExisting = productId ? getCatalogueProductDraftById(productId) : null
    const fromQuery: Partial<CatalogueProductDraft> = {
      name: searchParams.get("name") ?? undefined,
      sku: searchParams.get("sku") ?? undefined,
      supplier: searchParams.get("supplier") ?? undefined,
      subcategory: searchParams.get("subcategory") ?? undefined,
    }

    return mergeDraft(fromExisting ?? DEFAULT_PRODUCT_DRAFT, fromQuery)
  }, [productId, searchParams])

  const [draft, setDraft] = useState<CatalogueProductDraft>(DEFAULT_PRODUCT_DRAFT)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const isEditing = Boolean(productId)
  const backHref = source === "chat" ? "/" : "/catalogue"

  useEffect(() => {
    setDraft(resolvedDraft)
  }, [resolvedDraft])

  function updateDraft<K extends keyof CatalogueProductDraft>(key: K, value: CatalogueProductDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    if (error) setError("")
  }

  function updateSpecialty(value: string) {
    setDraft((current) => ({
      ...current,
      specialty: [value],
    }))
    if (error) setError("")
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)

    const result = saveCatalogueProduct(draft, productId ?? undefined)
    if (!result.ok) {
      setError(result.error)
      setSaving(false)
      return
    }

    router.push(`/catalogue/products?product=${encodeURIComponent(result.product.id)}`)
  }

  return (
    <div className="app-shell-bg min-h-screen">
      <header className="flex items-center gap-3 bg-[#00B4D8] px-4 py-3 lg:px-8 lg:py-4">
        <Link href={backHref} className="rounded-xl p-2 transition-colors hover:bg-white/10">
          <ArrowLeft size={20} className="text-[#10243E]" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold leading-tight text-[#10243E] lg:text-2xl">
            {isEditing ? "Edit product" : "Add product"}
          </h1>
          <p className="text-xs text-[#10243E]/70">
            {source === "chat"
              ? "Opened from Chat mode. Save here and the same record will appear in Library mode."
              : "Opened from Library mode. The same editor can also be launched from Chat mode."}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-8">
        <form
          onSubmit={handleSubmit}
          className="rounded-[28px] border border-[#D5E3EF] bg-white p-5 shadow-[0_24px_70px_rgba(16,36,62,0.08)] lg:p-7"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#AEEAF7] text-[#10243E]">
              {source === "chat" ? <MessageSquareText size={28} /> : <PackagePlus size={28} />}
            </div>
            <div className="min-w-0">
              <h2 className="text-[19px] font-semibold tracking-[-0.03em] text-[#10243E]">
                {isEditing ? "Update the shared catalogue record" : "Create the shared catalogue record"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#526579]">
                This form is the shared create/edit path for both Chat and Library. Keep the first pass factual so search and retrieval stay reliable.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-[#10243E]">Product name</span>
              <input
                value={draft.name ?? ""}
                onChange={(event) => updateDraft("name", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#D5E3EF] bg-[#F8FBFF] px-4 py-3 text-sm text-[#10243E] outline-none transition-colors focus:border-[#4DA3FF]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#10243E]">Product code / SKU</span>
              <input
                value={draft.sku ?? ""}
                onChange={(event) => updateDraft("sku", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#D5E3EF] bg-[#F8FBFF] px-4 py-3 font-mono text-sm text-[#10243E] outline-none transition-colors focus:border-[#4DA3FF]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#10243E]">Supplier</span>
              <input
                list="supplier-options"
                value={draft.supplier ?? ""}
                onChange={(event) => updateDraft("supplier", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#D5E3EF] bg-[#F8FBFF] px-4 py-3 text-sm text-[#10243E] outline-none transition-colors focus:border-[#4DA3FF]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#10243E]">Category</span>
              <select
                value={draft.category ?? DEFAULT_PRODUCT_DRAFT.category}
                onChange={(event) => updateDraft("category", event.target.value as CatalogueProductDraft["category"])}
                className="mt-2 w-full rounded-2xl border border-[#D5E3EF] bg-[#F8FBFF] px-4 py-3 text-sm text-[#10243E] outline-none transition-colors focus:border-[#4DA3FF]"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#10243E]">Subcategory</span>
              <input
                value={draft.subcategory ?? ""}
                onChange={(event) => updateDraft("subcategory", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#D5E3EF] bg-[#F8FBFF] px-4 py-3 text-sm text-[#10243E] outline-none transition-colors focus:border-[#4DA3FF]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#10243E]">Unit of issue</span>
              <input
                value={draft.unitOfIssue ?? ""}
                onChange={(event) => updateDraft("unitOfIssue", event.target.value)}
                placeholder="ea, box/10, pack/50"
                className="mt-2 w-full rounded-2xl border border-[#D5E3EF] bg-[#F8FBFF] px-4 py-3 text-sm text-[#10243E] outline-none transition-colors focus:border-[#4DA3FF]"
              />
            </label>
          </div>

          <label className="mt-5 block">
            <span className="text-sm font-semibold text-[#10243E]">Specialty applicability</span>
            <select
              value={draft.specialty[0] ?? "All"}
              onChange={(event) => updateSpecialty(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#D5E3EF] bg-[#F8FBFF] px-4 py-3 text-sm text-[#10243E] outline-none transition-colors focus:border-[#4DA3FF]"
            >
              <option value="All">All specialties in workspace</option>
              {SPECIALTY_OPTIONS.filter((option) => option !== "All").map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-[#10243E]">Storage location</span>
              <input
                value={draft.location ?? ""}
                onChange={(event) => updateDraft("location", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#D5E3EF] bg-[#F8FBFF] px-4 py-3 text-sm text-[#10243E] outline-none transition-colors focus:border-[#4DA3FF]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#10243E]">Supplier phone</span>
              <input
                value={draft.supplierPhone ?? ""}
                onChange={(event) => updateDraft("supplierPhone", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#D5E3EF] bg-[#F8FBFF] px-4 py-3 text-sm text-[#10243E] outline-none transition-colors focus:border-[#4DA3FF]"
              />
            </label>
          </div>

          <label className="mt-5 block">
            <span className="text-sm font-semibold text-[#10243E]">Description</span>
            <textarea
              rows={5}
              value={draft.description ?? ""}
              onChange={(event) => updateDraft("description", event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#D5E3EF] bg-[#F8FBFF] px-4 py-3 text-sm leading-6 text-[#10243E] outline-none transition-colors focus:border-[#4DA3FF]"
            />
          </label>

          <label className="mt-5 flex items-center gap-3 rounded-2xl border border-dashed border-[#8ADFF0] bg-[#F2FCFF] px-4 py-3">
            <input
              type="checkbox"
              checked={Boolean(draft.nhsContract)}
              onChange={(event) => updateDraft("nhsContract", event.target.checked)}
              className="h-4 w-4 rounded border-[#8ADFF0] text-[#4DA3FF]"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#10243E]">NHS contract item</p>
              <p className="text-xs leading-5 text-[#5A7184]">Keep this enabled for framework / contracted supply lines.</p>
            </div>
            <ScanLine size={16} className="ml-auto shrink-0 text-[#4DA3FF]" />
          </label>

          {error ? (
            <div className="mt-5 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
              {error}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#4DA3FF] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2F8EF7] disabled:opacity-60"
            >
              <Save size={16} />
              {isEditing ? "Save product" : "Create product"}
            </button>
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#D5E3EF] bg-white px-4 py-3 text-sm font-semibold text-[#526579] transition-colors hover:bg-[#F8FBFF]"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>

      <datalist id="supplier-options">
        {BASE_CATALOGUE_SUPPLIER_OPTIONS.filter((value) => value !== "All Suppliers").map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </div>
  )
}
