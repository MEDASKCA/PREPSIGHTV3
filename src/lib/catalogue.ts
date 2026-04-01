import { procedures } from "./data"
import { getFixedDataLibraryImplants } from "./fixed-data-entities"
import type {
  CatalogueItemRecord,
  Item,
  Section,
  SectionType,
  Supplier,
} from "./types"

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

export function buildCatalogueItemId(
  sectionType: SectionType | "implant_system" | "positioning_equipment",
  itemName: string,
  supplierName?: string,
): string {
  const supplierPart = supplierName ? `-${slug(supplierName)}` : ""
  return `catalogue-${slug(sectionType)}-${slug(itemName)}${supplierPart}`
}

export function toCatalogueRecord(
  item: Item,
  sectionType: SectionType,
  sourceType: CatalogueItemRecord["sourceType"] = "catalogue",
  isFixed = false,
): CatalogueItemRecord {
  const supplierName = item.supplier?.name
  return {
    id:
      item.catalogueItemId ??
      buildCatalogueItemId(sectionType, item.name, supplierName),
    name: item.name,
    sku: item.sku,
    product: item.product,
    description: item.description,
    supplier: item.supplier,
    manufacturer: supplierName,
    category: sectionType,
    aliases: item.product ? [item.product] : [],
    sourceType,
    isFixed,
  }
}

function catalogueItemsFromProcedures(): CatalogueItemRecord[] {
  const records: CatalogueItemRecord[] = []

  for (const procedure of procedures) {
    for (const section of procedure.sections) {
      const sourceType = section.sourceType ?? "catalogue"
      const isFixed = section.contentMode === "fixed"

      for (const item of section.items) {
        records.push(
          toCatalogueRecord(
            {
              ...item,
              catalogueItemId:
                item.catalogueItemId ??
                buildCatalogueItemId(
                  section.sectionType,
                  item.name,
                  item.supplier?.name,
                ),
            },
            section.sectionType,
            sourceType,
            isFixed || item.isFixed === true,
          ),
        )
      }
    }
  }

  return records
}

function catalogueItemsFromSystems(): CatalogueItemRecord[] {
  return getFixedDataLibraryImplants().map((implant) => ({
    id: buildCatalogueItemId("implant_system", implant.name, implant.supplier),
    name: implant.name,
    sku: implant.sku,
    description: implant.description,
    manufacturer: implant.supplier,
    category: "implant_system" as const,
    aliases: [implant.subcategory, implant.context].filter(Boolean) as string[],
    sourceType: "supplier" as const,
    isFixed: true,
  }))
}

function sizedConsumableSeed(): CatalogueItemRecord[] {
  const entries: Array<{
    base: string
    sizes: string[]
    category: CatalogueItemRecord["category"]
    supplier?: string
    description: string
    skuPrefix?: string
    product?: string
  }> = [
    {
      base: "Surgical gown",
      sizes: ["XS", "S", "M", "L", "XL", "XXL"],
      category: "ppe",
      description: "Sterile surgical gown size variant for scrubbed staff.",
      product: "Proxima OR",
      skuPrefix: "PROX-OR",
    },
    {
      base: "Surgical gloves",
      sizes: ["5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9"],
      category: "ppe",
      description: "Sterile surgical glove size variant for scrubbed staff.",
      product: "Biogel Eclipse",
      skuPrefix: "BIO-ECL",
    },
    {
      base: "Gauze swab",
      sizes: ["10 x 10", "30 x 30", "45 x 45"],
      category: "consumables_supplies",
      description: "Radiopaque gauze swab size variant for operative field use.",
      skuPrefix: "GAUZE",
    },
    {
      base: "Orthopaedic drape set",
      sizes: ["Standard", "Large", "X-Large"],
      category: "sterile_field_draping",
      description: "Procedure drape set variant sized for operative exposure.",
      product: "Barrier Hip Set",
      skuPrefix: "DRP-ORTHO",
    },
    {
      base: "Extremity drape set",
      sizes: ["Small", "Medium", "Large"],
      category: "sterile_field_draping",
      description: "Extremity drape set size variant for upper or lower limb procedures.",
      skuPrefix: "DRP-EXT",
    },
    {
      base: "Adhesive incise drape",
      sizes: ["Small", "Medium", "Large"],
      category: "sterile_field_draping",
      description: "Antimicrobial adhesive incise drape size variant.",
      product: "Ioban 2",
      skuPrefix: "IOBAN",
    },
    {
      base: "Waterproof dressing",
      sizes: ["7 x 9 cm", "9 x 15 cm", "10 x 20 cm"],
      category: "post_procedure_care",
      description: "Post-procedure dressing size variant for wound coverage.",
      product: "Aquacel Ag+",
      skuPrefix: "AQUA",
    },
    {
      base: "Suction tubing",
      sizes: ["Standard", "Large bore"],
      category: "consumables_supplies",
      description: "Disposable suction tubing variant for theatre suction setup.",
      skuPrefix: "SUCT",
    },
    {
      base: "Pulse lavage set",
      sizes: ["Standard", "Long nozzle"],
      category: "consumables_supplies",
      description: "Pulse lavage disposable set variant for orthopaedic washout.",
      product: "Interpulse",
      skuPrefix: "LAV",
    },
    {
      base: "Compression stockings",
      sizes: ["Small", "Medium", "Large", "X-Large"],
      category: "medications_fluids",
      description: "Anti-embolism stocking size variant for thromboprophylaxis.",
      product: "TED Stockings",
      skuPrefix: "TED",
    },
  ]

  return entries.flatMap((entry) =>
    entry.sizes.map((size) => ({
      id: buildCatalogueItemId(entry.category, `${entry.base} ${size}`),
      name: `${entry.base} ${size}`,
      sku: entry.skuPrefix ? `${entry.skuPrefix}-${slug(size).toUpperCase()}` : undefined,
      product: entry.product,
      description: entry.description,
      manufacturer: entry.supplier,
      category: entry.category,
      aliases: [entry.base, size],
      sourceType: "catalogue" as const,
      isFixed: false,
      variantGroupId: slug(entry.base),
      sizeLabel: size,
    })),
  )
}

const catalogueItems = dedupeById([
  ...catalogueItemsFromProcedures(),
  ...catalogueItemsFromSystems(),
  ...sizedConsumableSeed(),
])

export function getCatalogueItems(): CatalogueItemRecord[] {
  return catalogueItems
}

export function searchCatalogueItems(query: string): CatalogueItemRecord[] {
  const q = query.trim().toLowerCase()
  if (!q) return catalogueItems

  return catalogueItems.filter((item) =>
    [
      item.name,
      item.sku,
      item.product,
      item.description,
      item.manufacturer,
      item.supplier?.name,
      ...(item.aliases ?? []),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q)),
  )
}

export function getCatalogueItemsByCategory(
  category: CatalogueItemRecord["category"],
): CatalogueItemRecord[] {
  return catalogueItems.filter((item) => item.category === category)
}

export function getCatalogueItemById(
  catalogueItemId: string,
): CatalogueItemRecord | null {
  return (
    catalogueItems.find((item) => item.id === catalogueItemId) ?? null
  )
}

export function supplierForName(name?: string): Supplier | undefined {
  if (!name) return undefined
  return { name }
}

const FIXED_SECTION_TYPES = new Set<SectionType>([
  "instrument_sets_trays",
  "implants_prosthetics",
  "procedure_reference",
])

const EDITABLE_SECTION_TYPES = new Set<SectionType>([
  "ppe",
  "patient_preparation",
  "anaesthesia",
  "patient_positioning",
  "sterile_field_draping",
  "equipment_devices",
  "consumables_supplies",
  "medications_fluids",
  "nurse_prep_notes",
  "post_procedure_care",
])

export function decorateCardSections(sections: Section[]): Section[] {
  return sections.map((section) => {
    const isFixedSection = FIXED_SECTION_TYPES.has(section.sectionType)
    const contentMode = isFixedSection
      ? "fixed"
      : EDITABLE_SECTION_TYPES.has(section.sectionType)
        ? "editable"
        : "mixed"
    const sourceType = isFixedSection ? "supplier" : "hospital"

    return {
      ...section,
      contentMode,
      sourceType,
      items: section.items.map((item) => ({
        ...item,
        isFixed: item.isFixed ?? isFixedSection,
        sourceType: item.sourceType ?? sourceType,
        catalogueItemId:
          item.catalogueItemId ??
          buildCatalogueItemId(
            section.sectionType,
            item.name,
            item.supplier?.name,
          ),
      })),
    }
  })
}
