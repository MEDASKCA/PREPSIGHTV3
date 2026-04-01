"use client"

import { getCatalogueProducts } from "./catalogue-products-store"
import type { CatalogueProduct } from "./catalogue-data"
import { getProcedureLibrarySnapshot, subscribeProcedureLibrary } from "./procedure-library"
import {
  getCuratedVariantsForProcedureWithSystems,
  type SystemWithSupplier,
  type VariantWithSystems,
} from "./variants"
import { resolveFixedDataEntityDefinition } from "./fixed-data-entities"
import type { Procedure } from "./types"

type ResolverContext = {
  setting?: string
  specialty?: string
}

export type ProcedureResolution = {
  procedure: Procedure
  score: number
  matchedTerms: number
}

export type ProductResolution = {
  product: CatalogueProduct
  score: number
  matchedTerms: number
}

export type SystemResolution = {
  procedure: Procedure
  variant: VariantWithSystems
  system: SystemWithSupplier
  score: number
  matchedTerms: number
}

export type EntityDefinition = {
  label: string
  kind: "system" | "component" | "product" | "procedure"
  description: string
}

type ProcedureSearchDocument = {
  procedure: Procedure
  aliases: string[]
  haystack: string
  exactTerms: string[]
  tokens: string[]
}

type ProductSearchDocument = {
  product: CatalogueProduct
  haystack: string
  exactTerms: string[]
  tokens: string[]
}

type SystemSearchDocument = {
  procedure: Procedure
  variant: VariantWithSystems
  system: SystemWithSupplier
  haystack: string
  exactTerms: string[]
  tokens: string[]
}

const PROCEDURE_MATCH_STOP_WORDS = new Set([
  "a",
  "about",
  "an",
  "and",
  "any",
  "anything",
  "approach",
  "are",
  "available",
  "be",
  "browse",
  "can",
  "called",
  "card",
  "cards",
  "case",
  "catalog",
  "catalogue",
  "check",
  "compare",
  "component",
  "components",
  "consumable",
  "consumables",
  "could",
  "define",
  "details",
  "do",
  "does",
  "explain",
  "find",
  "for",
  "from",
  "get",
  "give",
  "guide",
  "guides",
  "help",
  "how",
  "i",
  "implant",
  "implants",
  "in",
  "is",
  "item",
  "items",
  "know",
  "list",
  "mean",
  "me",
  "my",
  "need",
  "note",
  "notes",
  "of",
  "on",
  "open",
  "please",
  "prep",
  "prepare",
  "procedure",
  "procedures",
  "product",
  "products",
  "quick",
  "read",
  "reference",
  "references",
  "search",
  "see",
  "show",
  "size",
  "sizes",
  "something",
  "summarise",
  "summarize",
  "summary",
  "supplier",
  "suppliers",
  "support",
  "supplies",
  "supply",
  "system",
  "systems",
  "table",
  "tell",
  "the",
  "their",
  "there",
  "this",
  "today",
  "todays",
  "tray",
  "trays",
  "using",
  "variant",
  "variants",
  "video",
  "videos",
  "walkthrough",
  "walkthroughs",
  "want",
  "what",
  "which",
  "with",
  "would",
  "you",
])

const productDocumentCache = new Map<string, ProductSearchDocument>()
const procedureDocumentCache = new Map<string, ProcedureSearchDocument>()
const systemDocumentCache = new Map<string, SystemSearchDocument>()

if (typeof window !== "undefined") {
  subscribeProcedureLibrary(() => {
    procedureDocumentCache.clear()
    systemDocumentCache.clear()
  })
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s/+&-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeForIntent(value: string): string {
  return normalize(value)
    .replace(
      /\b(can you|could you|would you|please|show me|tell me|let me|i want|i need|help me|find me|open up|take me to|bring up)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeContextValue(value?: string): string {
  return normalize(value ?? "")
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function tokenize(value: string): string[] {
  return unique(
    normalizeForIntent(value)
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2 && !PROCEDURE_MATCH_STOP_WORDS.has(token)),
  )
}

function extractTokens(value: string): string[] {
  return tokenize(value)
}

function addAlias(target: Set<string>, value?: string) {
  if (!value) return
  const trimmed = value.trim()
  if (!trimmed) return
  target.add(trimmed)
}

function addProcedureWordExpansions(target: Set<string>, procedure: Procedure) {
  const normalizedName = normalize(procedure.name)
  const normalizedId = normalize(procedure.id)
  const normalizedFamily = normalize(procedure.familyId ?? "")
  const normalizedVariant = normalize(procedure.variantLabel ?? "")
  const normalizedSystem = normalize(procedure.implantSystem ?? "")

  const isPrimaryHipReplacement =
    normalizedId === "proc_primary_total_hip_replacement" ||
    normalizedName === "primary total hip replacement"

  const isPrimaryKneeReplacement =
    normalizedId === "proc_primary_total_knee_replacement" ||
    normalizedName === "primary total knee replacement"

  const isPrimaryShoulderReplacement =
    normalizedId === "proc_primary_total_shoulder_replacement" ||
    normalizedName === "primary total shoulder replacement"

  if (normalizedId === "dhs" || normalizedName.includes("dynamic hip screw")) {
    addAlias(target, "dhs")
    addAlias(target, "dynamic hip screw")
    addAlias(target, "hip screw")
  }

  if (normalizedId === "ukr" || normalizedName.includes("unicompartmental knee replacement")) {
    addAlias(target, "ukr")
    addAlias(target, "uni knee replacement")
    addAlias(target, "unicompartmental knee")
    addAlias(target, "partial knee replacement")
    addAlias(target, "partial knee")
  }

  if (isPrimaryKneeReplacement) {
    addAlias(target, "tkr")
    addAlias(target, "tka")
    addAlias(target, "total knee replacement")
    addAlias(target, "total knee arthroplasty")
    addAlias(target, "knee replacement")
    addAlias(target, "knee arthroplasty")
  }

  if (isPrimaryHipReplacement) {
    addAlias(target, "thr")
    addAlias(target, "tha")
    addAlias(target, "total hip replacement")
    addAlias(target, "total hip arthroplasty")
    addAlias(target, "hip replacement")
    addAlias(target, "hip arthroplasty")
  }

  if (normalizedName.includes("hemiarthroplasty")) {
    addAlias(target, "hemi")
    addAlias(target, "hip hemi")
    addAlias(target, "hemiarthroplasty")
    addAlias(target, "hip hemiarthroplasty")
    addAlias(target, "partial hip replacement")
  }

  if (normalizedId === "im-nail-femur" || normalizedName.includes("im nail")) {
    addAlias(target, "im nail")
    addAlias(target, "imn")
    addAlias(target, "femoral nail")
    addAlias(target, "femur nail")
    addAlias(target, "intramedullary nail")
  }

  if (
    normalizedName.includes("pfna") ||
    normalizedVariant.includes("pfna") ||
    normalizedSystem.includes("pfna")
  ) {
    addAlias(target, "pfna")
    addAlias(target, "proximal femoral nail")
    addAlias(target, "proximal femoral nail antirotation")
  }

  if (normalizedName.includes("distal radius")) {
    addAlias(target, "drrf")
    addAlias(target, "distal radius fixation")
    addAlias(target, "distal radius orif")
    addAlias(target, "radius orif")
    addAlias(target, "wrist fixation")
  }

  if (isPrimaryShoulderReplacement) {
    addAlias(target, "tsa")
    addAlias(target, "total shoulder arthroplasty")
    addAlias(target, "shoulder replacement")
  }

  if (normalizedName.includes("reverse shoulder")) {
    addAlias(target, "rtsa")
    addAlias(target, "reverse total shoulder")
    addAlias(target, "reverse shoulder arthroplasty")
  }

  if (normalizedName.includes("acl") || normalizedName.includes("anterior cruciate")) {
    addAlias(target, "acl")
    addAlias(target, "acl reconstruction")
    addAlias(target, "anterior cruciate ligament")
  }

  if (normalizedName.includes("orif")) {
    addAlias(target, "open reduction internal fixation")
  }

  if (normalizedFamily.includes("arthroplasty")) {
    addAlias(target, "arthroplasty")
  }
}

function buildProcedureDocument(procedure: Procedure): ProcedureSearchDocument {
  const cached = procedureDocumentCache.get(procedure.id)
  if (cached) return cached

  const aliases = new Set<string>()

  addAlias(aliases, procedure.id)
  addAlias(aliases, procedure.familyId)
  addAlias(aliases, procedure.name)
  addAlias(aliases, procedure.approach)
  addAlias(aliases, procedure.variantLabel)
  addAlias(aliases, procedure.implantSystem)
  addAlias(aliases, procedure.specialty)
  addAlias(aliases, procedure.setting)

  for (const alias of procedure.aliases ?? []) addAlias(aliases, alias)
  addProcedureWordExpansions(aliases, procedure)

  const variants = getCuratedVariantsForProcedureWithSystems(procedure.id, procedure.name)
  for (const variant of variants) {
    addAlias(aliases, variant.id)
    addAlias(aliases, variant.name)
    addAlias(aliases, variant.approach)
    addAlias(aliases, variant.description)

    for (const system of variant.systems) {
      addAlias(aliases, system.id)
      addAlias(aliases, system.name)
      addAlias(aliases, system.description)
      addAlias(aliases, system.category)
      addAlias(aliases, system.system_type)
      addAlias(aliases, system.supplier?.name)
      for (const alias of system.aliases ?? []) addAlias(aliases, alias)
    }
  }

  const aliasList = unique([...aliases].map((item) => item.trim()).filter(Boolean))
  const exactTerms = aliasList.map(normalize).filter(Boolean)

  const document: ProcedureSearchDocument = {
    procedure,
    aliases: aliasList,
    haystack: exactTerms.join(" "),
    exactTerms,
    tokens: unique(exactTerms.flatMap((term) => tokenize(term))),
  }

  procedureDocumentCache.set(procedure.id, document)
  return document
}

function buildProductDocument(product: CatalogueProduct): ProductSearchDocument {
  const cacheKey = `${product.id}:${product.name}:${product.sku}:${product.supplier}`
  const cached = productDocumentCache.get(cacheKey)
  if (cached) return cached

  const rawTerms = [
    product.id,
    product.name,
    product.sku,
    product.supplier,
    product.category,
    product.subcategory,
    product.description,
    product.location,
    ...(product.specialty ?? []),
  ]
    .filter(Boolean)
    .map((value) => String(value))

  const exactTerms = unique(rawTerms.map(normalize).filter(Boolean))

  const document: ProductSearchDocument = {
    product,
    haystack: exactTerms.join(" "),
    exactTerms,
    tokens: unique(exactTerms.flatMap((term) => tokenize(term))),
  }

  productDocumentCache.set(cacheKey, document)
  return document
}

function buildSystemDocument(
  procedure: Procedure,
  variant: VariantWithSystems,
  system: SystemWithSupplier,
): SystemSearchDocument {
  const cacheKey = `${procedure.id}:${variant.id}:${system.id}`
  const cached = systemDocumentCache.get(cacheKey)
  if (cached) return cached

  const rawTerms = [
    procedure.id,
    procedure.name,
    procedure.specialty,
    procedure.setting,
    procedure.approach,
    procedure.variantLabel,
    variant.id,
    variant.name,
    variant.approach,
    variant.description,
    system.id,
    system.name,
    system.category,
    system.system_type,
    system.description,
    system.supplier?.name,
    ...(system.aliases ?? []),
  ]
    .filter(Boolean)
    .map((value) => String(value))

  const exactTerms = unique(rawTerms.map(normalize).filter(Boolean))

  const document: SystemSearchDocument = {
    procedure,
    variant,
    system,
    haystack: exactTerms.join(" "),
    exactTerms,
    tokens: unique(exactTerms.flatMap((term) => tokenize(term))),
  }

  systemDocumentCache.set(cacheKey, document)
  return document
}

function containsWholeTerm(haystack: string, needle: string): boolean {
  if (!needle) return false
  if (needle.length <= 2) {
    return new RegExp(`\\b${escapeRegExp(needle)}\\b`).test(haystack)
  }
  return haystack.includes(needle)
}

function countTokenMatches(tokens: string[], haystack: string, tokenUniverse: string[]): number {
  let matches = 0

  for (const token of tokens) {
    if (containsWholeTerm(haystack, token) || tokenUniverse.includes(token)) {
      matches += 1
    }
  }

  return matches
}

function countExactPhraseHits(query: string, exactTerms: string[]): number {
  let hits = 0

  for (const term of exactTerms) {
    if (!term) continue
    if (query === term) hits += 4
    else if (query.includes(term)) hits += term.length >= 6 ? 3 : 2
    else if (term.includes(query) && query.length >= 4) hits += 1
  }

  return hits
}

function scoreDocument(
  query: string,
  tokens: string[],
  haystack: string,
  exactTerms: string[],
  tokenUniverse: string[],
): { score: number; matchedTerms: number } {
  const matchedTerms = countTokenMatches(tokens, haystack, tokenUniverse)
  if (matchedTerms === 0) return { score: 0, matchedTerms: 0 }

  let score = 0

  const phraseHits = countExactPhraseHits(query, exactTerms)
  score += phraseHits * 18
  score += matchedTerms * 10

  const coverage = tokens.length > 0 ? matchedTerms / tokens.length : 0
  score += Math.round(coverage * 25)

  if (haystack.startsWith(query)) score += 8
  if (query.length >= 4 && haystack.includes(query)) score += 10

  return { score, matchedTerms }
}

function applyContextBonus(
  baseScore: number,
  candidate: { setting?: string; specialty?: string },
  context: ResolverContext,
): number {
  let score = baseScore

  const contextSetting = normalizeContextValue(context.setting)
  const contextSpecialty = normalizeContextValue(context.specialty)

  if (contextSetting && normalizeContextValue(candidate.setting) === contextSetting) {
    score += 10
  }

  if (contextSpecialty && normalizeContextValue(candidate.specialty) === contextSpecialty) {
    score += 14
  }

  return score
}

function cleanProcedurePrompt(prompt: string): string {
  return normalizeForIntent(prompt)
    .replace(
      /\b(for|the|a|an|case|procedure|procedures|card|cards|today|todays|about|on|of|with|using)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim()
}

function cleanProductPrompt(prompt: string): string {
  return normalizeForIntent(prompt)
    .replace(
      /\b(edit|update|change|mark|set|show|find|search|open|product|products|catalogue|catalog|sku|code|codes|item|items)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim()
}

function cleanSystemPrompt(prompt: string): string {
  return normalizeForIntent(prompt)
    .replace(
      /\b(show|which|what|system|systems|implant|implants|for|the|a|an|used|use|available|mapped|linked|supported)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim()
}

function sortByScoreThenMatches<T extends { score: number; matchedTerms: number }>(a: T, b: T): number {
  if (b.score !== a.score) return b.score - a.score
  return b.matchedTerms - a.matchedTerms
}

function hasStrongDirectProcedureAliasMatch(query: string, document: ProcedureSearchDocument): boolean {
  return document.exactTerms.some((term) => term === query)
}

function hasStrongDirectProductAliasMatch(query: string, document: ProductSearchDocument): boolean {
  return document.exactTerms.some((term) => term === query)
}

function hasStrongDirectSystemAliasMatch(query: string, document: SystemSearchDocument): boolean {
  return document.exactTerms.some((term) => term === query)
}

export function resolveProcedureMatches(
  prompt: string,
  context: ResolverContext = {},
  limit = 5,
): ProcedureResolution[] {
  const query = cleanProcedurePrompt(prompt)
  if (!query) return []

  const tokens = extractTokens(query)
  if (tokens.length === 0) return []

  const results = getProcedureLibrarySnapshot()
    .map((procedure) => {
      const document = buildProcedureDocument(procedure)
      const base = scoreDocument(query, tokens, document.haystack, document.exactTerms, document.tokens)

      let score = applyContextBonus(base.score, procedure, context)

      if (hasStrongDirectProcedureAliasMatch(query, document)) score += 26
      if (normalize(procedure.name) === query) score += 18
      if (normalize(procedure.id) === query) score += 22

      const variants = getCuratedVariantsForProcedureWithSystems(procedure.id, procedure.name)
      if (variants.length > 0) score += 4
      if (variants.some((variant) => normalize(variant.name) === query)) score += 12
      if (variants.some((variant) => normalize(variant.approach ?? "") === query)) score += 10

      return {
        procedure,
        score,
        matchedTerms: base.matchedTerms,
      }
    })
    .filter((result) => result.matchedTerms > 0 && result.score >= 10)
    .sort(sortByScoreThenMatches)
    .slice(0, limit)

  return results
}

export function resolveBestProcedure(prompt: string, context: ResolverContext = {}): Procedure | null {
  const matches = resolveProcedureMatches(prompt, context, 3)
  const best = matches[0]
  const next = matches[1]

  if (!best) return null
  if (best.score < 20) return null

  if (next) {
    const scoreGap = best.score - next.score
    const matchGap = best.matchedTerms - next.matchedTerms

    if (scoreGap <= 2 && matchGap <= 0) return null
    if (scoreGap <= 4 && next.matchedTerms >= best.matchedTerms) return null
  }

  return best.procedure
}

export function resolveProductMatches(prompt: string, limit = 5): ProductResolution[] {
  const query = cleanProductPrompt(prompt)
  if (!query) return []

  const tokens = extractTokens(query)
  if (tokens.length === 0) return []

  return getCatalogueProducts()
    .map((product) => {
      const document = buildProductDocument(product)
      const base = scoreDocument(query, tokens, document.haystack, document.exactTerms, document.tokens)

      let score = base.score

      if (hasStrongDirectProductAliasMatch(query, document)) score += 18
      if (normalize(product.sku) === query) score += 30
      if (normalize(product.name) === query) score += 20
      if (normalize(product.id) === query) score += 18

      return {
        product,
        score,
        matchedTerms: base.matchedTerms,
      }
    })
    .filter((result) => result.matchedTerms > 0 && result.score >= 10)
    .sort(sortByScoreThenMatches)
    .slice(0, limit)
}

export function hasResolvableCatalogueProduct(prompt: string): boolean {
  return resolveProductMatches(prompt, 1).length > 0
}

export function resolveSystemMatches(
  prompt: string,
  context: ResolverContext = {},
  limit = 5,
): SystemResolution[] {
  const rawQuery = cleanSystemPrompt(prompt) || normalizeForIntent(prompt)
  if (!rawQuery) return []

  const tokens = extractTokens(rawQuery)
  if (tokens.length === 0) return []

  const resolvedProcedure = resolveBestProcedure(prompt, context)
  const candidateProcedures = resolvedProcedure
    ? [resolvedProcedure]
    : resolveProcedureMatches(prompt, context, 8).map((match) => match.procedure)
  const allProcedures = getProcedureLibrarySnapshot()

  const uniqueProcedures = unique(candidateProcedures.map((procedure) => procedure.id))
    .map((procedureId) => allProcedures.find((procedure) => procedure.id === procedureId))
    .filter((procedure): procedure is Procedure => Boolean(procedure))

  const procedurePool =
    uniqueProcedures.length > 0 ? uniqueProcedures : allProcedures.slice()

  const results: SystemResolution[] = []

  for (const procedure of procedurePool) {
    const variants = getCuratedVariantsForProcedureWithSystems(procedure.id, procedure.name)
    for (const variant of variants) {
      for (const system of variant.systems) {
        const document = buildSystemDocument(procedure, variant, system)
        const base = scoreDocument(rawQuery, tokens, document.haystack, document.exactTerms, document.tokens)

        let score = applyContextBonus(base.score, procedure, context)

        if (hasStrongDirectSystemAliasMatch(rawQuery, document)) score += 22
        if (normalize(system.name) === rawQuery) score += 18
        if (normalize(system.id) === rawQuery) score += 20
        if (normalize(variant.name) === rawQuery) score += 10
        if (normalize(variant.approach ?? "") === rawQuery) score += 8

        if (resolvedProcedure && procedure.id === resolvedProcedure.id) score += 20
        if (system.is_default) score += 8

        const supplierName = normalize(system.supplier?.name ?? "")
        if (supplierName && rawQuery.includes(supplierName)) score += 8

        results.push({
          procedure,
          variant,
          system,
          score,
          matchedTerms: base.matchedTerms,
        })
      }
    }
  }

  return results
    .filter((result) => result.matchedTerms > 0 && result.score >= 10)
    .sort(sortByScoreThenMatches)
    .slice(0, limit)
}

function buildProcedureDescription(procedure: Procedure): string {
  if (typeof (procedure as { description?: string }).description === "string") {
    const description = (procedure as { description?: string }).description?.trim()
    if (description) return description
  }

  const specialty = procedure.specialty?.toLowerCase() ?? "clinical"
  const setting = procedure.setting ?? "this setting"
  const approach = procedure.approach ? ` using the ${procedure.approach.toLowerCase()} approach` : ""

  return `${procedure.name} is a ${specialty} procedure in ${setting}${approach}.`
}

function buildSystemDescription(match: SystemResolution): string {
  const explicit = match.system.description?.trim()
  if (explicit) return explicit

  const supplier = match.system.supplier?.name
  const supplierText = supplier ? ` from ${supplier}` : ""
  const procedureText = match.procedure.name ? ` used with ${match.procedure.name.toLowerCase()}` : ""
  const typeText = match.system.category ? `${match.system.category}. ` : ""

  return `${typeText}${match.system.name} is an implant system${supplierText}${procedureText}.`.trim()
}

function buildProductDescription(match: ProductResolution): string {
  const explicit = match.product.description?.trim()
  if (explicit) return explicit

  const category = match.product.category?.toLowerCase() ?? "catalogue"
  const supplier = match.product.supplier ? ` from ${match.product.supplier}` : ""
  return `${match.product.name} is a ${category} item${supplier}.`
}

export function resolveEntityDefinition(
  prompt: string,
  context: ResolverContext = {},
): EntityDefinition | null {
  const normalizedPrompt = normalizeForIntent(prompt)
  const promptWords = normalizedPrompt.split(/\s+/).filter(Boolean)
  const promptTokens = extractTokens(prompt)

  const fixedDataEntity = resolveFixedDataEntityDefinition(prompt)
  if (fixedDataEntity && promptTokens.length > 0 && promptTokens.length <= 3) {
    return {
      label: fixedDataEntity.label,
      kind: fixedDataEntity.kind,
      description: fixedDataEntity.description,
    }
  }

  const bestSystem = resolveSystemMatches(prompt, context, 1)[0]
  const bestProduct = resolveProductMatches(prompt, 1)[0]
  const bestProcedure = resolveProcedureMatches(prompt, context, 1)[0]

  const candidates: Array<{ score: number; entity: EntityDefinition }> = []

  if (fixedDataEntity) {
    const score =
      34 +
      (promptWords.length <= 3 ? 12 : 0) +
      (normalize(fixedDataEntity.label).includes(normalizedPrompt) ? 10 : 0)

    candidates.push({
      score,
      entity: {
        label: fixedDataEntity.label,
        kind: fixedDataEntity.kind,
        description: fixedDataEntity.description,
      },
    })
  }

  if (bestSystem) {
    let score = bestSystem.score + 10
    if (promptWords.length <= 3 && normalize(bestSystem.system.name).includes(normalizedPrompt)) {
      score += 16
    }

    candidates.push({
      score,
      entity: {
        label: bestSystem.system.name,
        kind: "system",
        description: buildSystemDescription(bestSystem),
      },
    })
  }

  if (bestProduct) {
    let score = bestProduct.score - 2
    if (normalize(bestProduct.product.name) === normalizedPrompt) score += 10
    if (normalize(bestProduct.product.sku) === normalizedPrompt) score += 12

    candidates.push({
      score,
      entity: {
        label: bestProduct.product.name,
        kind: "product",
        description: buildProductDescription(bestProduct),
      },
    })
  }

  if (bestProcedure) {
    let score = bestProcedure.score + 2
    if (normalize(bestProcedure.procedure.name) === normalizedPrompt) score += 12

    candidates.push({
      score,
      entity: {
        label: bestProcedure.procedure.name,
        kind: "procedure",
        description: buildProcedureDescription(bestProcedure.procedure),
      },
    })
  }

  candidates.sort((a, b) => b.score - a.score)
  return candidates[0]?.entity ?? null
}
