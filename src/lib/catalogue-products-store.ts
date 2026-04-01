"use client"

import { useSyncExternalStore } from "react"
import {
  CATALOGUE,
  CATALOGUE_CATEGORIES,
  type CatalogueProduct,
  type ProductCategory,
} from "./catalogue-data"
import { getFixedDataLibraryImplants } from "./fixed-data-entities"

const STORAGE_KEY = "prepsight_catalogue_product_overrides_v1"
const STORAGE_EVENT = "prepsight:catalogue-products-changed"

const CONTRACT_SUPPLIERS = new Set([
  "Stryker",
  "DePuy Synthes",
  "Synthes",
  "Zimmer Biomet",
  "Ethicon",
  "Mölnlycke",
  "Solventum/3M",
  "Erbe",
  "Getinge",
  "ConvaTec",
  "Synectics Medical",
  "Ansell Healthcare",
])

function inferSpecialtyTags(input: string): string[] {
  const normalized = input.toLowerCase()

  if (/(hip|knee|shoulder|arthroplasty|arthro|orthopaedic|orthopedic|trauma|femoral|acetabular|glenoid|humeral|spine)/.test(normalized)) {
    return ["T&O"]
  }

  if (/(cardio|aortic|mitral|thoracic|sapien|valve)/.test(normalized)) {
    return ["Cardiothoracic"]
  }

  if (/(urology|renal|bladder|ureter|urologic)/.test(normalized)) {
    return ["Urology"]
  }

  if (/(gynae|gynae|obstetric|obstetrics|uterine|pelvic|gynae)/.test(normalized)) {
    return ["Obstetrics & Gynaecology"]
  }

  return ["All"]
}

export interface CatalogueProductDraft {
  name: string
  sku: string
  supplier: string
  category: ProductCategory
  subcategory: string
  specialty: string[]
  nhsContract: boolean
  description: string
  unitOfIssue: string
  location: string
  supplierPhone: string
}

export interface StoredCatalogueProduct extends CatalogueProduct {
  createdAt: string
  updatedAt: string
}

interface CatalogueOverridesPayload {
  products: StoredCatalogueProduct[]
}

const EMPTY_PAYLOAD: CatalogueOverridesPayload = { products: [] }
const emptySubscribe = () => () => undefined
const EXTRACTED_CATALOGUE_PRODUCTS: CatalogueProduct[] = getFixedDataLibraryImplants().map((item) => ({
  id: item.id,
  name: item.name,
  sku: item.sku,
  supplier: item.supplier,
  category: "Implants",
  subcategory:
    item.entityKind === "system"
      ? `${item.subcategory || "Implant"} · System`
      : `${item.subcategory || "Implant"} · Component`,
  specialty: inferSpecialtyTags([item.name, item.subcategory, item.context].filter(Boolean).join(" ")),
  nhsContract: CONTRACT_SUPPLIERS.has(item.supplier),
  description: item.description,
  location: item.context,
}))

const BASE_CATALOGUE_PRODUCTS = [...CATALOGUE, ...EXTRACTED_CATALOGUE_PRODUCTS].reduce<CatalogueProduct[]>(
  (acc, product) => {
    const existingIndex = acc.findIndex((entry) => entry.sku === product.sku)
    if (existingIndex >= 0) {
      acc[existingIndex] = { ...acc[existingIndex], ...product }
    } else {
      acc.push(product)
    }
    return acc
  },
  [],
)

const BASE_CATALOGUE_SNAPSHOT = BASE_CATALOGUE_PRODUCTS.slice().sort((left, right) =>
  left.name.localeCompare(right.name) || left.sku.localeCompare(right.sku),
)

let cachedPayloadKey = ""
let cachedProductsSnapshot: CatalogueProduct[] = BASE_CATALOGUE_SNAPSHOT

export const DEFAULT_PRODUCT_DRAFT: CatalogueProductDraft = {
  name: "",
  sku: "",
  supplier: "",
  category: "Consumables",
  subcategory: "",
  specialty: ["All"],
  nhsContract: true,
  description: "",
  unitOfIssue: "",
  location: "",
  supplierPhone: "",
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function normalizeDraft(draft: CatalogueProductDraft): CatalogueProductDraft {
  const specialty = Array.from(
    new Set(
      draft.specialty
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  )

  return {
    name: draft.name.trim(),
    sku: draft.sku.trim(),
    supplier: draft.supplier.trim(),
    category: draft.category,
    subcategory: draft.subcategory.trim(),
    specialty: specialty.length > 0 ? specialty : ["All"],
    nhsContract: draft.nhsContract,
    description: draft.description.trim(),
    unitOfIssue: draft.unitOfIssue.trim(),
    location: draft.location.trim(),
    supplierPhone: draft.supplierPhone.trim(),
  }
}

function toDraft(product: CatalogueProduct): CatalogueProductDraft {
  return {
    name: product.name,
    sku: product.sku,
    supplier: product.supplier,
    category: product.category,
    subcategory: product.subcategory,
    specialty: product.specialty,
    nhsContract: product.nhsContract ?? true,
    description: product.description ?? "",
    unitOfIssue: product.unitOfIssue ?? "",
    location: product.location ?? "",
    supplierPhone: product.supplierPhone ?? "",
  }
}

function readPayload(): CatalogueOverridesPayload {
  if (typeof window === "undefined") return EMPTY_PAYLOAD

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_PAYLOAD
    const parsed = JSON.parse(raw) as Partial<CatalogueOverridesPayload>
    if (!Array.isArray(parsed.products)) return EMPTY_PAYLOAD

    return {
      products: parsed.products.filter(isStoredCatalogueProduct),
    }
  } catch {
    return EMPTY_PAYLOAD
  }
}

function writePayload(payload: CatalogueOverridesPayload): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  window.dispatchEvent(new Event(STORAGE_EVENT))
}

function buildPayloadKey(payload: CatalogueOverridesPayload): string {
  return JSON.stringify(
    payload.products.map((product) => ({
      id: product.id,
      updatedAt: product.updatedAt,
    })),
  )
}

function isProductCategory(value: unknown): value is ProductCategory {
  return (
    value === "Implants" ||
    value === "Consumables" ||
    value === "Equipment" ||
    value === "Instruments" ||
    value === "Sterilisation"
  )
}

function isStoredCatalogueProduct(value: unknown): value is StoredCatalogueProduct {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<StoredCatalogueProduct>
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.sku === "string" &&
    typeof candidate.supplier === "string" &&
    isProductCategory(candidate.category) &&
    typeof candidate.subcategory === "string" &&
    Array.isArray(candidate.specialty) &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string"
  )
}

function buildStoredProduct(
  draft: CatalogueProductDraft,
  existing: CatalogueProduct | undefined,
  existingStored: StoredCatalogueProduct | undefined,
): StoredCatalogueProduct {
  const normalized = normalizeDraft(draft)
  const now = new Date().toISOString()

  return {
    id: existing?.id ?? slugify(normalized.sku),
    name: normalized.name,
    sku: normalized.sku,
    supplier: normalized.supplier,
    category: normalized.category,
    subcategory: normalized.subcategory,
    specialty: normalized.specialty,
    nhsContract: normalized.nhsContract,
    description: normalized.description || undefined,
    unitOfIssue: normalized.unitOfIssue || undefined,
    location: normalized.location || undefined,
    supplierPhone: normalized.supplierPhone || undefined,
    sourceModel: existingStored?.sourceModel ?? existing?.sourceModel ?? "seeded_product",
    entityKind: existingStored?.entityKind ?? existing?.entityKind ?? "product",
    createdAt: existingStored?.createdAt ?? now,
    updatedAt: now,
  }
}

export function getCatalogueProducts(): CatalogueProduct[] {
  const payload = readPayload()
  const payloadKey = buildPayloadKey(payload)
  if (payloadKey === cachedPayloadKey) return cachedProductsSnapshot

  const byId = new Map<string, CatalogueProduct>(BASE_CATALOGUE_PRODUCTS.map((product) => [product.id, product]))

  for (const product of payload.products) {
    byId.set(product.id, product)
  }

  cachedPayloadKey = payloadKey
  cachedProductsSnapshot = Array.from(byId.values()).sort((left, right) =>
    left.name.localeCompare(right.name) || left.sku.localeCompare(right.sku),
  )
  return cachedProductsSnapshot
}

export function getCatalogueProductById(id: string): CatalogueProduct | undefined {
  return getCatalogueProducts().find((product) => product.id === id)
}

export function getCatalogueProductDraftById(id: string): CatalogueProductDraft | null {
  const product = getCatalogueProductById(id)
  return product ? toDraft(product) : null
}

export function getCatalogueCategoryOptions(products = getCatalogueProducts()): string[] {
  return [
    "All Categories",
    ...Array.from(new Set(products.map((product) => product.category))).sort(),
  ]
}

export function getCatalogueSupplierOptions(products = getCatalogueProducts()): string[] {
  return [
    "All Suppliers",
    ...Array.from(new Set(products.map((product) => product.supplier))).sort(),
  ]
}

export function getCatalogueSpecialtyOptions(products = getCatalogueProducts()): string[] {
  return [
    ...Array.from(new Set(products.flatMap((product) => product.specialty))).filter((value) => value !== "All").sort(),
    "All",
  ]
}

export function useCatalogueProducts(): CatalogueProduct[] {
  return useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined") return emptySubscribe()
      const listener = () => callback()
      window.addEventListener(STORAGE_EVENT, listener)
      window.addEventListener("storage", listener)
      return () => {
        window.removeEventListener(STORAGE_EVENT, listener)
        window.removeEventListener("storage", listener)
      }
    },
    getCatalogueProducts,
    () => BASE_CATALOGUE_SNAPSHOT,
  )
}

export function saveCatalogueProduct(
  draft: CatalogueProductDraft,
  existingId?: string,
): { ok: true; product: StoredCatalogueProduct } | { ok: false; error: string } {
  const normalized = normalizeDraft(draft)

  if (!normalized.name) return { ok: false, error: "Product name is required." }
  if (!normalized.sku) return { ok: false, error: "Product code / SKU is required." }
  if (!normalized.supplier) return { ok: false, error: "Supplier is required." }
  if (!normalized.subcategory) return { ok: false, error: "Subcategory is required." }

  const allProducts = getCatalogueProducts()
  const existing = existingId ? allProducts.find((product) => product.id === existingId) : undefined
  const duplicateSku = allProducts.find(
    (product) =>
      product.id !== existingId &&
      product.sku.localeCompare(normalized.sku, undefined, { sensitivity: "accent" }) === 0,
  )

  if (duplicateSku) {
    return { ok: false, error: `Product code / SKU "${normalized.sku}" already exists.` }
  }

  const payload = readPayload()
  const existingStored = payload.products.find((product) => product.id === existingId)
  const nextProduct = buildStoredProduct(normalized, existing, existingStored)
  const nextProducts = payload.products.filter((product) => product.id !== nextProduct.id)
  nextProducts.push(nextProduct)
  writePayload({ products: nextProducts.sort((left, right) => left.name.localeCompare(right.name)) })

  return { ok: true, product: nextProduct }
}

export const BASE_CATALOGUE_CATEGORY_OPTIONS = CATALOGUE_CATEGORIES
export const BASE_CATALOGUE_SUPPLIER_OPTIONS = [
  "All Suppliers",
  ...Array.from(new Set(BASE_CATALOGUE_PRODUCTS.map((product) => product.supplier))).sort(),
]
export const BASE_CATALOGUE_SPECIALTY_OPTIONS = [
  ...Array.from(new Set(BASE_CATALOGUE_PRODUCTS.flatMap((product) => product.specialty))).filter((value) => value !== "All").sort(),
  "All",
]
