import dataset from "../../data/catalogue/fixed_data_dataset_batch668.json"
import inventory from "../../data/catalogue/fixed_data_entity_inventory.json"

export type FixedDataEntityKind = "system" | "component"

export type FixedDataEntityDefinition = {
  label: string
  kind: FixedDataEntityKind
  description: string
  supplierName?: string
  systemName?: string
}

type FixedDataSystemRow = {
  "System ID": string
  "System Name": string
  "Supplier Name": string
  "System Category": string
  "System Notes": string
}

type FixedDataComponentRow = {
  "Component ID": string
  "Component Name": string
  "Component Role": string
  "Implant Category": string
  "System ID": string
  "System Name": string
  "Supplier Name": string
  "Component Notes": string
}

type FixedDataProcedureRow = {
  "Procedure ID": string
  Procedure: string
  "Procedure Variant": string
  Specialty: string
}

type FixedDataMappingRow = {
  "Procedure ID": string
  "System ID": string
  "Mapping Status": string
}

type NormalizedSystem = {
  id: string
  label: string
  normalizedLabel: string
  supplierName: string
  category: string
  description: string
  aliases: string[]
  isBundle: boolean
  procedureContexts: string[]
}

type ComponentFamily = {
  normalizedLabel: string
  label: string
  aliases: string[]
  role: string
  implantCategory: string
  description: string
  supplierNames: string[]
  systems: string[]
}

type SearchCandidate = {
  label: string
  kind: FixedDataEntityKind
  supplierName?: string
  systemName?: string
  description: string
  score: number
  matchedTerms: number
  isBundle?: boolean
}

export type FixedDataComponentMatch = {
  label: string
  role: string
  implantCategory: string
  systemName: string
  supplierName: string
  description: string
}

export type FixedDataSystemMatch = {
  label: string
  supplierName: string
  category: string
  description: string
  procedureContexts: string[]
}

export type FixedDataLibraryImplant = {
  id: string
  name: string
  sku: string
  supplier: string
  subcategory: string
  entityKind: FixedDataEntityKind
  status: "Available"
  qty: number
  description?: string
  context?: string
}

const QUERY_STOP_WORDS = new Set([
  "do",
  "you",
  "know",
  "does",
  "what",
  "is",
  "about",
  "the",
  "a",
  "an",
  "called",
  "mean",
  "other",
  "related",
  "show",
  "tell",
  "me",
])

const NAME_SUFFIXES = [
  "shoulder system",
  "reverse shoulder system",
  "total hip system",
  "revision hip system",
  "hip system",
  "knee system",
  "femoral component",
  "glenoid component",
  "humeral component",
  "acetabular component",
  "acetabular shell",
  "acetabular cup",
  "acetabular liner",
  "femoral stem",
  "femoral head",
  "humeral stem",
  "humeral head",
  "humeral liner",
  "glenosphere",
  "baseplate",
  "liner",
  "insert",
  "component",
  "system",
]

const rawSystemRows = inventory.system_entities as FixedDataSystemRow[]
const rawComponentRows = inventory.component_entities as FixedDataComponentRow[]
const procedureRows = (dataset.PROCEDURES.rows as FixedDataProcedureRow[])
const mappingRows = (dataset.SYSTEM_MAPPINGS.rows as FixedDataMappingRow[])

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s/]/g, " ")
    .replace(/\s+/g, " ")
}

function normalizeQuery(value: string): string {
  return normalize(value)
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !QUERY_STOP_WORDS.has(token))
    .join(" ")
}

function tokenize(value: string): string[] {
  return normalizeQuery(value)
    .split(/\s+/)
    .filter((token) => token.length >= 2)
}

function uniq(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function prettify(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
}

function stripKnownSuffixesPreserveCase(value: string): string {
  let current = prettify(value)
  let changed = true

  while (changed) {
    changed = false
    for (const suffix of NAME_SUFFIXES.sort((left, right) => right.length - left.length)) {
      const regex = new RegExp(`\\s+${suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")
      if (regex.test(current)) {
        current = current.replace(regex, "").trim()
        changed = true
      }
    }
  }

  return current.trim()
}

function chooseBestText(values: string[]): string {
  return uniq(values)
    .sort((left, right) => {
      if (right.length !== left.length) return right.length - left.length
      return left.localeCompare(right)
    })[0] ?? ""
}

function stripKnownSuffixes(value: string): string {
  let current = normalize(value)
  let changed = true

  while (changed) {
    changed = false
    for (const suffix of NAME_SUFFIXES.sort((left, right) => right.length - left.length)) {
      if (current.endsWith(` ${suffix}`)) {
        current = current.slice(0, -(` ${suffix}`.length)).trim()
        changed = true
      } else if (current === suffix) {
        current = ""
        changed = true
      }
    }
  }

  return current.trim()
}

function deriveAliases(label: string): string[] {
  const aliases = new Set<string>()
  const normalized = normalize(label)
  if (normalized) aliases.add(normalized)

  for (const part of normalized.split("/").map((value) => value.trim()).filter(Boolean)) {
    aliases.add(part)
    const stripped = stripKnownSuffixes(part)
    if (stripped) aliases.add(stripped)
  }

  const strippedWhole = stripKnownSuffixes(normalized)
  if (strippedWhole) aliases.add(strippedWhole)

  return [...aliases].filter(Boolean)
}

function buildProcedureContextMap() {
  const procedureById = new Map<string, FixedDataProcedureRow>(
    procedureRows.map((row) => [row["Procedure ID"], row]),
  )

  const contexts = new Map<string, string[]>()

  for (const mapping of mappingRows) {
    const procedure = procedureById.get(mapping["Procedure ID"])
    if (!procedure) continue
    const label = [
      procedure.Procedure,
      procedure["Procedure Variant"],
    ].filter(Boolean).join(" · ")

    const existing = contexts.get(mapping["System ID"]) ?? []
    existing.push(label)
    contexts.set(mapping["System ID"], existing)
  }

  return contexts
}

const procedureContextMap = buildProcedureContextMap()

function cleanDefinitionLeadIn(description: string): string {
  return description
    .replace(/^official\s+[^.]*?\s+describe(?:s|d)?\s+/i, "")
    .replace(/^official\s+materials\s+describe(?:s|d)?\s+/i, "")
    .replace(/^official\s+product\s+materials\s+describe(?:s|d)?\s+/i, "")
    .replace(/^depuy\s+hip\s+portfolio\s+materials\s+pair\s+the\s+platform\s+with\s+/i, "")
    .replace(/^core\s+/i, "")
    .trim()
}

function buildDefinitionText(label: string, description: string): string {
  const cleaned = cleanDefinitionLeadIn(description).replace(/\.$/, "").trim()
  if (!cleaned) return ""

  const normalizedLabel = normalize(label)
  const normalizedCleaned = normalize(cleaned)

  if (normalizedCleaned.startsWith(normalizedLabel)) {
    return cleaned
  }

  const asMatch = cleaned.match(/\bas\s+(.+)$/i)
  if (asMatch?.[1]) return asMatch[1].trim()

  return cleaned
}

function buildSystemDescription(system: FixedDataSystemRow, contexts: string[]): string {
  const description = buildDefinitionText(system["System Name"], system["System Notes"].trim())
  if (description) return description
  if (contexts[0]) return `${system["System Name"]} is used in ${contexts[0].toLowerCase()}.`
  return `${system["System Category"].toLowerCase()} from ${system["Supplier Name"]}.`
}

function buildComponentDescription(component: FixedDataComponentRow): string {
  const description = buildDefinitionText(component["Component Name"], component["Component Notes"].trim())
  if (description) return description
  return `${component["Component Role"].toLowerCase()} in the ${component["System Name"]} construct.`
}

function pickPreferredSystem(rows: FixedDataSystemRow[]): FixedDataSystemRow {
  return [...rows].sort((left, right) => {
    const leftUnassigned = /(^|_)UNASSIGNED(_|$)/.test(left["System ID"])
    const rightUnassigned = /(^|_)UNASSIGNED(_|$)/.test(right["System ID"])
    if (leftUnassigned !== rightUnassigned) return Number(leftUnassigned) - Number(rightUnassigned)
    if (left["System Notes"].length !== right["System Notes"].length) {
      return right["System Notes"].length - left["System Notes"].length
    }
    return left["System ID"].localeCompare(right["System ID"])
  })[0]!
}

function buildNormalizedSystems(): NormalizedSystem[] {
  const groups = new Map<string, FixedDataSystemRow[]>()

  for (const row of rawSystemRows) {
    const key = normalize(row["System Name"])
    const bucket = groups.get(key) ?? []
    bucket.push(row)
    groups.set(key, bucket)
  }

  return [...groups.entries()].map(([normalizedLabel, rows]) => {
    const preferred = pickPreferredSystem(rows)
    const supplierName = chooseBestText(rows.map((row) => row["Supplier Name"]))
    const category = chooseBestText(rows.map((row) => row["System Category"]))
    const procedureContexts = uniq(rows.flatMap((row) => procedureContextMap.get(row["System ID"]) ?? []))
    return {
      id: preferred["System ID"],
      label: preferred["System Name"],
      normalizedLabel,
      supplierName,
      category,
      description: buildSystemDescription(preferred, procedureContexts),
      aliases: uniq(rows.flatMap((row) => deriveAliases(row["System Name"]))),
      isBundle: preferred["System Name"].includes("/"),
      procedureContexts,
    }
  })
}

function pickPreferredComponent(rows: FixedDataComponentRow[]): FixedDataComponentRow {
  return [...rows].sort((left, right) => {
    if (left["Component Notes"].length !== right["Component Notes"].length) {
      return right["Component Notes"].length - left["Component Notes"].length
    }
    return left["Component ID"].localeCompare(right["Component ID"])
  })[0]!
}

function buildComponentFamilies(): ComponentFamily[] {
  const groups = new Map<string, FixedDataComponentRow[]>()

  for (const row of rawComponentRows) {
    const key = normalize(row["Component Name"])
    const bucket = groups.get(key) ?? []
    bucket.push(row)
    groups.set(key, bucket)
  }

  return [...groups.entries()].map(([normalizedLabel, rows]) => {
    const preferred = pickPreferredComponent(rows)
    const familyLabel = stripKnownSuffixesPreserveCase(preferred["Component Name"])
    const canonicalLabel = familyLabel && normalize(familyLabel) !== normalizedLabel
      ? familyLabel
      : preferred["Component Name"]
    return {
      normalizedLabel,
      label: canonicalLabel,
      aliases: uniq([
        ...rows.flatMap((row) => deriveAliases(row["Component Name"])),
        ...deriveAliases(canonicalLabel),
      ]),
      role: chooseBestText(rows.map((row) => row["Component Role"])),
      implantCategory: chooseBestText(rows.map((row) => row["Implant Category"])),
      description: buildComponentDescription(preferred),
      supplierNames: uniq(rows.map((row) => row["Supplier Name"])),
      systems: uniq(rows.map((row) => row["System Name"])),
    }
  })
}

const normalizedSystems = buildNormalizedSystems()
const componentFamilies = buildComponentFamilies()
const normalizedSystemByLabel = new Map(normalizedSystems.map((system) => [system.normalizedLabel, system]))
const componentFamilyByLabel = new Map(componentFamilies.map((family) => [family.normalizedLabel, family]))

function scoreCandidate(
  prompt: string,
  aliases: string[],
  kind: FixedDataEntityKind,
  bundlePenalty = false,
): { score: number; matchedTerms: number } {
  const normalizedPrompt = normalizeQuery(prompt)
  const tokens = tokenize(prompt)
  if (!normalizedPrompt || tokens.length === 0) return { score: 0, matchedTerms: 0 }

  let score = 0
  let matchedTerms = 0

  for (const alias of aliases) {
    if (alias === normalizedPrompt) score += 56
    else if (alias.startsWith(`${normalizedPrompt} `) || alias.startsWith(normalizedPrompt)) score += 24
    else if (alias.includes(normalizedPrompt)) score += 16

    for (const token of tokens) {
      if (alias.includes(token)) {
        matchedTerms += 1
        score += 6
      }
    }
  }

  if (kind === "system" && bundlePenalty && tokens.length <= 2) score -= 12

  return { score, matchedTerms }
}

function buildCandidates(prompt: string): SearchCandidate[] {
  const normalizedPrompt = normalizeQuery(prompt)
  const tokens = tokenize(prompt)
  const candidates: SearchCandidate[] = []

  for (const system of normalizedSystems) {
    const { score, matchedTerms } = scoreCandidate(prompt, system.aliases, "system", system.isBundle)
    if (score > 0 && matchedTerms > 0) {
      candidates.push({
        label: system.label,
        kind: "system",
        supplierName: system.supplierName,
        description: system.description,
        score,
        matchedTerms,
        isBundle: system.isBundle,
      })
    }
  }

  for (const family of componentFamilies) {
    const { score, matchedTerms } = scoreCandidate(prompt, family.aliases, "component")
    if (score > 0 && matchedTerms > 0) {
      candidates.push({
        label: family.label,
        kind: "component",
        supplierName: family.supplierNames.join(" | "),
        systemName: family.systems[0],
        description: family.description,
        score,
        matchedTerms,
      })
    }
  }

  const exactSystem = normalizedSystems.find((system) => system.aliases.includes(normalizedPrompt) && !system.isBundle)
  const exactBundleSystem = normalizedSystems.find((system) => system.aliases.includes(normalizedPrompt) && system.isBundle)
  const exactComponent = componentFamilies.find((family) => family.aliases.includes(normalizedPrompt))

  if (tokens.length <= 2) {
    for (const candidate of candidates) {
      if (candidate.kind === "system" && exactSystem && candidate.label === exactSystem.label) {
        candidate.score += 24
      }
      if (candidate.kind === "component" && exactComponent && candidate.label === exactComponent.label && !exactSystem) {
        candidate.score += 22
      }
      if (candidate.kind === "system" && exactBundleSystem && candidate.label === exactBundleSystem.label && exactComponent && !exactSystem) {
        candidate.score -= 18
      }
    }
  }

  candidates.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score
    if (right.matchedTerms !== left.matchedTerms) return right.matchedTerms - left.matchedTerms
    if (left.kind !== right.kind) return left.kind === "system" ? -1 : 1
    return left.label.localeCompare(right.label)
  })

  return candidates
}

function getComponentFamilyForPrompt(prompt: string): ComponentFamily | undefined {
  const normalizedPrompt = normalizeQuery(prompt)
  if (!normalizedPrompt) return undefined

  return componentFamilies.find((family) => family.aliases.includes(normalizedPrompt))
}

function getSystemForPrompt(prompt: string): NormalizedSystem | undefined {
  const normalizedPrompt = normalizeQuery(prompt)
  if (!normalizedPrompt) return undefined

  return normalizedSystems.find((system) => system.aliases.includes(normalizedPrompt))
}

export function resolveFixedDataEntityDefinition(prompt: string): FixedDataEntityDefinition | null {
  const best = buildCandidates(prompt)[0]
  if (!best || best.score < 16) return null

  return {
    label: best.label,
    kind: best.kind,
    description: best.description,
    supplierName: best.supplierName,
    systemName: best.systemName,
  }
}

export function getFixedDataComponentsForSystem(systemName: string, limit = 8): FixedDataComponentMatch[] {
  const normalizedSystemName = normalize(systemName)
  if (!normalizedSystemName) return []

  return rawComponentRows
    .filter((component) => normalize(component["System Name"]) === normalizedSystemName)
    .slice(0, limit)
    .map((component) => ({
      label: component["Component Name"],
      role: component["Component Role"],
      implantCategory: component["Implant Category"],
      systemName: component["System Name"],
      supplierName: component["Supplier Name"],
      description: buildComponentDescription(component),
    }))
}

export function resolveFixedDataComponentMatches(prompt: string, limit = 8): FixedDataComponentMatch[] {
  const family = getComponentFamilyForPrompt(prompt)
  if (family) {
    return rawComponentRows
      .filter((component) => normalize(component["Component Name"]) === family.normalizedLabel)
      .slice(0, limit)
      .map((component) => ({
        label: component["Component Name"],
        role: component["Component Role"],
        implantCategory: component["Implant Category"],
        systemName: component["System Name"],
        supplierName: component["Supplier Name"],
        description: buildComponentDescription(component),
      }))
  }

  const normalizedPrompt = normalizeQuery(prompt)
  const tokens = tokenize(prompt)
  if (!normalizedPrompt || tokens.length === 0) return []

  return rawComponentRows
    .map((component) => {
      const aliases = deriveAliases(component["Component Name"])
      const { score, matchedTerms } = scoreCandidate(prompt, aliases, "component")
      return { component, score, matchedTerms }
    })
    .filter((entry) => entry.score >= 14 && entry.matchedTerms > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      return right.matchedTerms - left.matchedTerms
    })
    .slice(0, limit)
    .map(({ component }) => ({
      label: component["Component Name"],
      role: component["Component Role"],
      implantCategory: component["Implant Category"],
      systemName: component["System Name"],
      supplierName: component["Supplier Name"],
      description: buildComponentDescription(component),
    }))
}

export function getFixedDataRelatedSystems(
  entityLabel: string,
  entityKind: FixedDataEntityKind,
  limit = 8,
): FixedDataSystemMatch[] {
  const normalizedEntityLabel = normalizeQuery(entityLabel)
  if (!normalizedEntityLabel) return []

  let systems: NormalizedSystem[] = []

  if (entityKind === "component") {
    const family = componentFamilyByLabel.get(normalizedEntityLabel)
      ?? componentFamilies.find((item) => item.aliases.includes(normalizedEntityLabel))
    if (!family) return []
    systems = family.systems
      .map((systemName) => normalizedSystemByLabel.get(normalize(systemName)))
      .filter((system): system is NormalizedSystem => Boolean(system))
  } else {
    const system = getSystemForPrompt(entityLabel)
    if (!system) return []

    const relatedAliases = new Set(
      system.aliases.filter((alias) => alias !== system.normalizedLabel && alias.length >= 3),
    )

    systems = normalizedSystems.filter((candidate) => {
      if (candidate.id === system.id) return false
      return candidate.aliases.some((alias) => relatedAliases.has(alias))
    })
  }

  return systems
    .slice(0, limit)
    .map((system) => ({
      label: system.label,
      supplierName: system.supplierName,
      category: system.category,
      description: system.description,
      procedureContexts: system.procedureContexts,
    }))
}

export function getFixedDataLibraryImplants(limit = 400): FixedDataLibraryImplant[] {
  const systemEntries = normalizedSystems.map((system, index) => ({
    id: `system-${system.id}`,
    name: system.label,
    sku: system.id,
    supplier: system.supplierName || "Unknown supplier",
    subcategory: system.category || "System",
    entityKind: "system" as const,
    status: "Available" as const,
    qty: (index % 9) + 1,
    description: system.description,
    context: system.procedureContexts[0],
  }))

  const componentEntries = componentFamilies.map((family, index) => ({
    id: `component-${family.normalizedLabel.replace(/[^a-z0-9]+/g, "-")}`,
    name: family.label,
    sku: `COMP-${family.normalizedLabel.replace(/[^a-z0-9]+/g, "-").toUpperCase()}`,
    supplier: family.supplierNames[0] || "Unknown supplier",
    subcategory: family.implantCategory || family.role || "Component",
    entityKind: "component" as const,
    status: "Available" as const,
    qty: ((index + 3) % 9) + 1,
    description: family.description,
    context: family.systems[0],
  }))

  return [...systemEntries, ...componentEntries]
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(0, limit)
}

export function getFixedDataSupplierOptions(): string[] {
  return [
    "All Suppliers",
    ...uniq(
      getFixedDataLibraryImplants()
        .map((item) => item.supplier)
        .filter(Boolean),
    ).sort(),
  ]
}

export function getFixedDataImplantCategoryOptions(): string[] {
  return [
    "All",
    ...uniq(
      getFixedDataLibraryImplants()
        .map((item) => item.subcategory)
        .filter(Boolean),
    ).sort(),
  ]
}
