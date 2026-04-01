import { procedures as seedProcedures } from "./data"
import { canonicalSpecialtyName } from "./specialty-normalization"
import { CLINICAL_SETTINGS, DEFAULT_SECTIONS_BY_SETTING, SECTION_TYPE_CATALOGUE } from "./settings"
import type { ClinicalSetting, Procedure, Section } from "./types"

const STORAGE_KEY = "prepsight_procedure_library"
const EVENT_NAME = "prepsight:procedure-library"
let cachedStoredRaw: string | null | undefined
let cachedStoredProcedures: Procedure[] = []
let cachedLibraryRaw: string | null | undefined
let cachedLibrarySnapshot: Procedure[] = seedProcedures.map(normalizeProcedure)

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function sectionTitleForType(sectionType: Section["sectionType"]): string {
  return SECTION_TYPE_CATALOGUE.find((entry) => entry.type === sectionType)?.label ?? sectionType
}

export function buildDraftSection(sectionType: Section["sectionType"], idPrefix: string, index: number): Section {
  return {
    id: `${idPrefix}__section_${index + 1}`,
    title: sectionTitleForType(sectionType),
    sectionType,
    items: [],
    contentMode: "editable" as const,
    sourceType: "hospital" as const,
  }
}

export function buildDraftSectionsForSetting(
  setting: ClinicalSetting,
  idPrefix: string,
  sectionTypes?: Section["sectionType"][],
): Section[] {
  const types = sectionTypes && sectionTypes.length > 0
    ? sectionTypes
    : (DEFAULT_SECTIONS_BY_SETTING[setting] ?? [])

  return types.map((sectionType, index) => buildDraftSection(sectionType, idPrefix, index))
}

function normalizeSections(sections: Section[]): Section[] {
  return sections.map((section, index) => ({
    ...section,
    id: section.id || `section-${index + 1}`,
    title: section.title || sectionTitleForType(section.sectionType),
    items: Array.isArray(section.items) ? section.items : [],
  }))
}

function normalizeProcedure(procedure: Procedure): Procedure {
  return {
    ...procedure,
    specialty: canonicalSpecialtyName(procedure.setting, procedure.specialty),
    sections: normalizeSections(Array.isArray(procedure.sections) ? procedure.sections : []),
    workflowSteps: Array.isArray(procedure.workflowSteps) ? procedure.workflowSteps : [],
  }
}

function readStoredProcedures(): Procedure[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === cachedStoredRaw) return cachedStoredProcedures
    if (!raw) {
      cachedStoredRaw = raw
      cachedStoredProcedures = []
      return cachedStoredProcedures
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    cachedStoredRaw = raw
    cachedStoredProcedures = parsed
      .filter((entry): entry is Procedure => Boolean(entry) && typeof entry === "object" && typeof entry.id === "string")
      .map(normalizeProcedure)
    return cachedStoredProcedures
  } catch {
    return []
  }
}

function writeStoredProcedures(procedures: Procedure[]): void {
  if (typeof window === "undefined") return
  const raw = JSON.stringify(procedures)
  cachedStoredRaw = raw
  cachedStoredProcedures = procedures.map(normalizeProcedure)
  cachedLibraryRaw = undefined
  window.localStorage.setItem(STORAGE_KEY, raw)
  window.dispatchEvent(new Event(EVENT_NAME))
}

function mergeProcedures(base: Procedure[], additions: Procedure[]): Procedure[] {
  const merged = new Map<string, Procedure>()

  for (const procedure of base) {
    merged.set(procedure.id, normalizeProcedure(procedure))
  }

  for (const procedure of additions) {
    merged.set(procedure.id, normalizeProcedure(procedure))
  }

  return Array.from(merged.values())
}

export function subscribeProcedureLibrary(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined

  const handler = () => listener()
  window.addEventListener(EVENT_NAME, handler)
  window.addEventListener("storage", handler)

  return () => {
    window.removeEventListener(EVENT_NAME, handler)
    window.removeEventListener("storage", handler)
  }
}

export function getProcedureLibrarySnapshot(): Procedure[] {
  if (typeof window === "undefined") return cachedLibrarySnapshot

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw === cachedLibraryRaw) return cachedLibrarySnapshot

  cachedLibraryRaw = raw
  cachedLibrarySnapshot = mergeProcedures(seedProcedures, readStoredProcedures())
  return cachedLibrarySnapshot
}

export function getStoredProcedureLibrarySnapshot(): Procedure[] {
  return readStoredProcedures()
}

export function getProcedureByIdSnapshot(id: string): Procedure | undefined {
  const target = id.trim().toLowerCase()
  return getProcedureLibrarySnapshot().find((procedure) => procedure.id.trim().toLowerCase() === target)
}

export function getProceduresBySpecialtySnapshot(setting: ClinicalSetting, specialty: string): Procedure[] {
  const requestedSpecialty = canonicalSpecialtyName(setting, specialty)
  return getProcedureLibrarySnapshot().filter(
    (procedure) =>
      procedure.setting === setting &&
      canonicalSpecialtyName(procedure.setting, procedure.specialty) === requestedSpecialty,
  )
}

export function buildBlankProcedureDraft(input: {
  name: string
  setting: ClinicalSetting
  specialty: string
  sectionTypes?: Section["sectionType"][]
}): Procedure {
  const normalizedName = input.name.trim()
  const normalizedSetting = CLINICAL_SETTINGS.includes(input.setting) ? input.setting : "Operating Theatre"
  const normalizedSpecialty = canonicalSpecialtyName(normalizedSetting, input.specialty.trim())
  const idBase = slugify(normalizedName) || "procedure"
  const existingIds = new Set(getProcedureLibrarySnapshot().map((procedure) => procedure.id))

  let id = idBase
  let suffix = 2
  while (existingIds.has(id)) {
    id = `${idBase}-${suffix}`
    suffix += 1
  }

  const sections = buildDraftSectionsForSetting(normalizedSetting, id, input.sectionTypes)

  return normalizeProcedure({
    id,
    familyId: id,
    name: normalizedName,
    cardScope: "local",
    setting: normalizedSetting,
    specialty: normalizedSpecialty,
    description: `Local draft card for ${normalizedName}.`,
    status: "draft",
    sections,
    workflowSteps: [],
    aliases: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

export function saveProcedureDraftLocal(procedure: Procedure): Procedure {
  const normalized = normalizeProcedure(procedure)
  const current = readStoredProcedures()
  const next = current.filter((entry) => entry.id !== normalized.id)
  next.push(normalized)
  next.sort((left, right) => left.name.localeCompare(right.name))
  writeStoredProcedures(next)
  return normalized
}

export function clearStoredProcedureLibrary(): void {
  if (typeof window === "undefined") return
  cachedStoredRaw = null
  cachedStoredProcedures = []
  cachedLibraryRaw = null
  cachedLibrarySnapshot = seedProcedures.map(normalizeProcedure)
  window.localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event(EVENT_NAME))
}
