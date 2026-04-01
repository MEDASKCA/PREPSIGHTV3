import {
  referenceProcedureSystemCards,
  referenceProcedures,
  referenceSuppliers,
  referenceSystems,
  referenceVariants,
} from "./reference-data"
import type {
  ReferenceProcedureSystemMapRow,
  ReferenceSupplier,
  ReferenceSystem,
  ReferenceVariant,
} from "./reference-schema"

export type ProcedureVariant = ReferenceVariant
export type ProcedureVariantSystemMapRow = ReferenceProcedureSystemMapRow
export type System = ReferenceSystem
export type Supplier = ReferenceSupplier

export type SystemWithSupplier = System & {
  supplier: Supplier | null
  is_default: boolean
}

export type VariantWithSystems = ProcedureVariant & {
  systems: SystemWithSupplier[]
}

const procedureVariants: ProcedureVariant[] = referenceVariants.filter(
  (variant) => variant.status !== "inactive",
)

const variantSystemMap: ProcedureVariantSystemMapRow[] = referenceProcedureSystemCards.filter(
  (row) => row.status !== "inactive",
)

const systems: System[] = referenceSystems.filter((system) => system.status !== "inactive")
const suppliers: Supplier[] = referenceSuppliers.filter((supplier) => supplier.status !== "inactive")

const procedureVariantById = new Map<string, ProcedureVariant>(
  procedureVariants.map((variant) => [variant.id, variant]),
)

const systemById = new Map<string, System>(systems.map((system) => [system.id, system]))
const supplierById = new Map<string, Supplier>(suppliers.map((supplier) => [supplier.id, supplier]))

function sortByOrderThenName<T extends { sort_order?: number; name?: string }>(a: T, b: T): number {
  const aOrder = a.sort_order ?? Number.MAX_SAFE_INTEGER
  const bOrder = b.sort_order ?? Number.MAX_SAFE_INTEGER

  if (aOrder !== bOrder) return aOrder - bOrder
  return (a.name ?? "").localeCompare(b.name ?? "")
}

function normalizeKey(value?: string): string {
  return (value ?? "").trim().toLowerCase()
}

function dedupeSystemsByName(systemsList: SystemWithSupplier[]): SystemWithSupplier[] {
  const grouped = new Map<string, SystemWithSupplier[]>()

  for (const system of systemsList) {
    const key = normalizeKey(system.name)
    const list = grouped.get(key) ?? []
    list.push(system)
    grouped.set(key, list)
  }

  return Array.from(grouped.values())
    .map((candidates) => {
      const preferredDefault = candidates.find((system) => system.is_default)
      return preferredDefault ?? candidates[0]
    })
    .sort((a, b) => {
      if ((a.is_default ?? false) !== (b.is_default ?? false)) {
        return a.is_default ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
}

export function getAllProcedureVariants(): ProcedureVariant[] {
  return [...procedureVariants].sort(sortByOrderThenName)
}

export function getProcedureVariantById(variantId: string): ProcedureVariant | null {
  return procedureVariantById.get(variantId) ?? null
}

export function getVariantsByProcedure(procedureId: string): ProcedureVariant[] {
  return procedureVariants
    .filter((variant) => variant.procedure_id === procedureId && variant.status !== "inactive")
    .sort(sortByOrderThenName)
}

export function getActiveVariantSystemMapByVariant(variantId: string): ProcedureVariantSystemMapRow[] {
  return variantSystemMap.filter(
    (row) => row.procedure_variant_id === variantId && row.status !== "inactive",
  )
}

export function getSystemsByVariant(variantId: string): System[] {
  const linkedSystemIds = getActiveVariantSystemMapByVariant(variantId).map((row) => row.system_id)
  const uniqueSystemIds = [...new Set(linkedSystemIds)]

  return uniqueSystemIds
    .map((systemId) => systemById.get(systemId))
    .filter((system): system is System => Boolean(system))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function getSystemsWithSuppliers(variantId: string): SystemWithSupplier[] {
  const rows = getActiveVariantSystemMapByVariant(variantId)

  const mapped = rows
    .map((row) => {
      const system = systemById.get(row.system_id)
      if (!system) return null

      return {
        ...system,
        supplier: system.supplier_id ? supplierById.get(system.supplier_id) ?? null : null,
        is_default: row.is_default ?? false,
      }
    })
    .filter((item): item is SystemWithSupplier => item !== null)

  return dedupeSystemsByName(mapped)
}

export function getVariantsForProcedureWithSystems(procedureId: string): VariantWithSystems[] {
  return getVariantsByProcedure(procedureId)
    .map((variant) => ({
      ...variant,
      systems: getSystemsWithSuppliers(variant.id),
    }))
    .sort(sortByOrderThenName)
}

export function hasOnlySyntheticBranching(
  _procedureId?: string,
  _procedureName?: string,
): boolean {
  return false
}

export function getCuratedVariantsForProcedureWithSystems(
  procedureId: string,
  _procedureName: string,
): VariantWithSystems[] {
  return getVariantsForProcedureWithSystems(procedureId)
}

export function hasVariantsForProcedure(procedureId: string): boolean {
  return procedureVariants.some(
    (variant) => variant.procedure_id === procedureId && variant.status !== "inactive",
  )
}

export function hasSystemsForVariant(variantId: string): boolean {
  return variantSystemMap.some(
    (row) => row.procedure_variant_id === variantId && row.status !== "inactive",
  )
}

export function getDefaultSystemForVariant(variantId: string): SystemWithSupplier | null {
  return getSystemsWithSuppliers(variantId).find((system) => system.is_default) ?? null
}

export function getProcedureVariantsBySetting(setting: string): ProcedureVariant[] {
  return procedureVariants
    .filter((variant) => variant.setting === setting && variant.status !== "inactive")
    .sort(sortByOrderThenName)
}

export function getProcedureVariantsBySpecialty(specialtyId: string): ProcedureVariant[] {
  return procedureVariants
    .filter((variant) => variant.specialty_id === specialtyId && variant.status !== "inactive")
    .sort(sortByOrderThenName)
}

export function getProcedureVariantsByServiceLine(serviceLineId: string): ProcedureVariant[] {
  return procedureVariants
    .filter((variant) => variant.service_line_id === serviceLineId && variant.status !== "inactive")
    .sort(sortByOrderThenName)
}

export function getProcedureVariantsByAnatomy(anatomyId: string): ProcedureVariant[] {
  return procedureVariants
    .filter((variant) => variant.anatomy_id === anatomyId && variant.status !== "inactive")
    .sort(sortByOrderThenName)
}

export function getSystemById(systemId: string): System | null {
  return systemById.get(systemId) ?? null
}

export function getProcedureSystemCard(
  variantId: string,
  systemId: string,
) {
  return referenceProcedureSystemCards.find(
    (card) => card.procedure_variant_id === variantId && card.system_id === systemId,
  ) ?? null
}

export function getWorkflowStepsForProcedure(
  procedureId: string,
  variantId?: string,
  systemId?: string,
) {
  if (variantId && systemId) {
    const card = getProcedureSystemCard(variantId, systemId)
    if (card?.workflowSteps?.length) return card.workflowSteps
  }

  return referenceProcedures.find((procedure) => procedure.id === procedureId)?.workflowSteps ?? []
}
