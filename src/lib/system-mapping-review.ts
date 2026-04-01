import reviewSeedData from "../../data/systems/arthroplasty_system_mapping_review_seed.json"
import systemsData from "../../data/systems/systems.json"
import suppliersData from "../../data/suppliers/suppliers.json"
import { getProfile } from "./profile"
import type { PlatformRole, PrepSightProfile } from "./types"
import type { ProcedureVariant, SystemWithSupplier } from "./variants"

export type MappingStatus = "confirmed" | "review_required" | "rejected"
export type ReviewerStatus = "active" | "restricted" | "banned"
export type ReviewableSectionKey = "systems" | "trays" | "skus"
export type SectionVote = "correct" | "incorrect" | "not_sure"
export type SectionIssueType = "procedure_mapping" | "implant_type" | "missing_information" | "other"
export type ProposalActionType = "flag_only" | "suggest_correction" | "add_missing_data"
export type ProposalStatus = "pending" | "approved" | "rejected"
export const FIXATION_LABELS = [
  "cemented",
  "cementless",
  "hybrid",
  "mobile_bearing",
  "fixed_bearing",
  "stemmed",
  "stemless",
  "linked",
  "unlinked",
  "reverse",
  "hemi",
  "resurfacing",
  "tumour",
  "salvage",
  "custom",
  "unknown",
] as const

export type FixationLabel = (typeof FIXATION_LABELS)[number]

type SeedRecord = {
  id: string
  specialty: string
  subspecialty: string
  anatomy: string
  subanatomy_group: string
  procedure_id: string
  procedure_name: string
  variant_id: string
  variant_name: string
  system_id: string
  system_name: string
  supplier_name: string
  category: string
  description: string
  is_default: boolean
  mapping_status: MappingStatus
  review_notes: string
  suggested_by_users: string[]
  upvotes: number
  downvotes: number
  evidence_links: string[]
  last_reviewed_at: string
  approved_by_admin: boolean
  fixation_label: FixationLabel
  seed_source: string
}

type StoredReviewRecord = Partial<Omit<SeedRecord, "last_reviewed_at">> & {
  id: string
  source?: "seed" | "catalog_candidate" | "community"
  last_reviewed_at?: string | null
  user_votes?: Record<string, "up" | "down">
  vote_reasons?: Record<string, string>
  vote_history?: VoteHistoryEntry[]
  review_history?: ReviewHistoryEntry[]
  revision_history?: RevisionHistoryEntry[]
  section_validations?: Partial<Record<ReviewableSectionKey, SectionValidationRecord[]>>
  accepted_section_data?: Partial<Record<ReviewableSectionKey, AcceptedSectionData>>
  proposals?: SectionProposalRecord[]
}

export type VoteHistoryEntry = {
  actor: string
  direction: "up" | "down"
  reason?: string
  voted_at: string
}

export type ReviewHistoryEntry = {
  actor: string
  outcome: MappingStatus
  notes?: string
  reviewed_at: string
  approved_by_admin: boolean
}

export type RevisionHistoryEntry = {
  actor: string
  change_type:
    | "fixation"
    | "review_notes"
    | "mapping_status"
    | "suggestion"
    | "proposal_approved"
    | "proposal_rejected"
    | "accepted_data_updated"
  summary: string
  revised_at: string
}

export type AcceptedSectionData = {
  items: Array<{ label: string; value: string }>
  empty_state?: string
}

export type SectionValidationRecord = {
  id: string
  section: ReviewableSectionKey
  vote: SectionVote
  issue_type?: SectionIssueType
  note?: string
  user: string
  timestamp: string
}

export type SectionProposalRecord = {
  id: string
  record_id: string
  section: ReviewableSectionKey
  action_type: ProposalActionType
  issue_type?: SectionIssueType
  current_value_snapshot: AcceptedSectionData
  proposed_value?: AcceptedSectionData
  note?: string
  submitted_by: string
  submitted_at: string
  status: ProposalStatus
  reviewed_by?: string
  reviewed_at?: string
  review_note?: string
}

export type ModerationQueueItem = {
  proposal: SectionProposalRecord
  record_title: string
  supplier_name: string
  mapping_id: string
}

export type FlaggedQueueItem = {
  mapping_id: string
  record_title: string
  supplier_name: string
  section: ReviewableSectionKey
  latest_validation: SectionValidationRecord
}

type CatalogSystem = {
  id: string
  name: string
  supplier_id?: string
  specialty_id?: string
  service_line_ids?: string[]
  anatomy_ids?: string[]
  system_type?: string
  category?: string
  aliases?: string[]
  description?: string
  status?: string
}

type SupplierRecord = {
  id: string
  name: string
  status?: string
}

export type ReviewableSystemMapping = SystemWithSupplier & {
  mapping_id: string
  mapping_status: MappingStatus
  review_notes: string
  suggested_by_users: string[]
  upvotes: number
  downvotes: number
  evidence_links: string[]
  last_reviewed_at: string | null
  approved_by_admin: boolean
  fixation_label: FixationLabel
  source: "seed" | "catalog_candidate" | "community"
}

export type SuggestSystemInput = {
  specialty: string
  subspecialty: string
  anatomy: string
  subanatomy_group: string
  procedure_id: string
  procedure_name: string
  variant_id: string
  variant_name: string
  system_id: string
  fixation_label: FixationLabel
  review_notes?: string
  evidence_links?: string[]
}

const REVIEW_STORAGE_KEY = "prepsight_system_mapping_reviews"
const REVIEWER_STATUS_STORAGE_KEY = "prepsight_reviewer_statuses"
const REVIEW_EVENT_NAME = "prepsight:system-mapping-review-changed"

const ARTHROPLASTY_SERVICE_LINE_ID = "SL_ARTHROPLASTY"
const FOCUS_ANATOMY_IDS = new Set([
  "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_HIP",
  "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_KNEE",
  "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_SHOULDER",
  "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_ELBOW",
  "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_ANKLE",
])

const reviewSeed = (reviewSeedData as SeedRecord[]) || []
const systems = ((systemsData as CatalogSystem[]) || []).filter(
  (system) => system.status !== "inactive",
)
const suppliers = ((suppliersData as SupplierRecord[]) || []).filter(
  (supplier) => supplier.status !== "inactive",
)

const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier]))
const systemById = new Map(systems.map((system) => [system.id, system]))
const seedByVariantId = new Map<string, SeedRecord[]>()

for (const record of reviewSeed) {
  const list = seedByVariantId.get(record.variant_id) ?? []
  list.push(record)
  seedByVariantId.set(record.variant_id, list)
}

let cachedReviewSnapshot: Record<string, StoredReviewRecord> = {}
let hasLoadedStoredSnapshot = false
let cachedReviewerStatuses: Record<string, ReviewerStatus> = {}
let hasLoadedReviewerStatuses = false
const listeners = new Set<() => void>()

function normalizeText(value?: string): string {
  return (value ?? "").trim().toLowerCase()
}

function parseEvidenceLinks(raw?: string): string[] {
  return (raw ?? "")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildEntryId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}

function cloneAcceptedSectionData(value?: AcceptedSectionData): AcceptedSectionData {
  return {
    items: [...(value?.items ?? [])].map((item) => ({ ...item })),
    ...(value?.empty_state ? { empty_state: value.empty_state } : {}),
  }
}

const MUTABLE_SECTION_LABELS: Record<ReviewableSectionKey, string[]> = {
  systems: ["Procedure variant", "Implant type", "Source / rationale", "Note / source context"],
  trays: ["Tray name", "Tray type / category", "Supplier", "Note"],
  skus: ["SKU / product code", "Product name", "Category", "Note"],
}

function sanitizeSectionProposalValue(
  section: ReviewableSectionKey,
  proposedValue?: AcceptedSectionData,
): AcceptedSectionData | undefined {
  if (!proposedValue) return undefined
  const allowedLabels = new Set(MUTABLE_SECTION_LABELS[section])
  const sanitizedItems = (proposedValue.items ?? [])
    .filter((item) => allowedLabels.has(item.label))
    .map((item) => ({
      label: item.label,
      value: item.value.trim(),
    }))
    .filter((item) => item.value.length > 0)

  return {
    items: sanitizedItems,
    ...(proposedValue.empty_state ? { empty_state: proposedValue.empty_state } : {}),
  }
}

function mergeApprovedSectionData(
  section: ReviewableSectionKey,
  currentValue: AcceptedSectionData,
  proposedValue?: AcceptedSectionData,
): AcceptedSectionData {
  const current = cloneAcceptedSectionData(currentValue)
  const proposed = sanitizeSectionProposalValue(section, proposedValue)
  if (!proposed) return current

  if (section === "systems") {
    const mutable = new Map(proposed.items.map((item) => [item.label, item.value]))
    const nextItems = current.items.map((item) =>
      mutable.has(item.label)
        ? { ...item, value: mutable.get(item.label) ?? item.value }
        : item,
    )

    for (const item of proposed.items) {
      if (!nextItems.find((entry) => entry.label === item.label)) {
        nextItems.push(item)
      }
    }

    return {
      items: nextItems,
      ...(current.empty_state ? { empty_state: current.empty_state } : {}),
    }
  }

  return {
    items: proposed.items,
    ...(proposed.items.length === 0
      ? { empty_state: current.empty_state || proposed.empty_state }
      : {}),
  }
}

export function buildSystemMappingId(variantId: string, systemId: string): string {
  return `SMR_${variantId}_${systemId}`
}

export type EnsureSystemMappingRecordInput = {
  mapping_id: string
  specialty: string
  subspecialty: string
  anatomy: string
  subanatomy_group: string
  procedure_id: string
  procedure_name: string
  variant_id: string
  variant_name: string
  system_id: string
  system_name: string
  supplier_name: string
  fixation_label?: FixationLabel
  review_notes?: string
}

function buildDefaultAcceptedSectionData(
  input: EnsureSystemMappingRecordInput,
): Record<ReviewableSectionKey, AcceptedSectionData> {
  return {
    systems: {
      items: [
        { label: "Supplier", value: input.supplier_name || "Not recorded" },
        { label: "Portfolio / item name", value: input.system_name || "Not recorded" },
        { label: "Procedure variant", value: input.variant_name || "Not recorded" },
        {
          label: "Implant type",
          value: input.fixation_label ? input.fixation_label.replaceAll("_", " ") : "Not recorded",
        },
        ...(input.review_notes?.trim()
          ? [{ label: "Note / source context", value: input.review_notes.trim() }]
          : []),
      ],
    },
    trays: {
      items: [],
      empty_state: "No linked tray data currently held",
    },
    skus: {
      items: [],
      empty_state: "No linked SKU data currently held",
    },
  }
}

export function ensureSystemMappingReviewRecord(input: EnsureSystemMappingRecordInput): void {
  ensureLoadedReviewSnapshot()
  const existing = cachedReviewSnapshot[input.mapping_id]
  if (existing) return

  cachedReviewSnapshot = {
    ...cachedReviewSnapshot,
    [input.mapping_id]: {
      id: input.mapping_id,
      specialty: input.specialty,
      subspecialty: input.subspecialty,
      anatomy: input.anatomy,
      subanatomy_group: input.subanatomy_group,
      procedure_id: input.procedure_id,
      procedure_name: input.procedure_name,
      variant_id: input.variant_id,
      variant_name: input.variant_name,
      system_id: input.system_id,
      system_name: input.system_name,
      supplier_name: input.supplier_name,
      mapping_status: "review_required",
      review_notes: input.review_notes?.trim() ?? "",
      suggested_by_users: [],
      upvotes: 0,
      downvotes: 0,
      evidence_links: [],
      last_reviewed_at: null,
      approved_by_admin: false,
      fixation_label: input.fixation_label ?? "unknown",
      source: "community",
      section_validations: {},
      accepted_section_data: buildDefaultAcceptedSectionData(input),
      proposals: [],
    },
  }

  persistReviewSnapshot()
}

function inferFixationLabel(text: string): FixationLabel {
  const value = normalizeText(text)
  if (value.includes("mobile bearing")) return "mobile_bearing"
  if (value.includes("fixed bearing")) return "fixed_bearing"
  if (value.includes("cementless") || value.includes("uncemented")) return "cementless"
  if (value.includes("cemented")) return "cemented"
  if (value.includes("hybrid")) return "hybrid"
  if (value.includes("stemless")) return "stemless"
  if (value.includes("stemmed")) return "stemmed"
  if (value.includes("unlinked")) return "unlinked"
  if (value.includes("linked")) return "linked"
  if (value.includes("reverse")) return "reverse"
  if (value.includes("resurfacing")) return "resurfacing"
  if (value.includes("hemi") || value.includes("bipolar")) return "hemi"
  if (value.includes("tumour") || value.includes("tumor")) return "tumour"
  if (value.includes("salvage")) return "salvage"
  if (value.includes("custom")) return "custom"
  return "unknown"
}

function ensureLoadedReviewSnapshot(): void {
  if (hasLoadedStoredSnapshot || typeof window === "undefined") return
  hasLoadedStoredSnapshot = true

  try {
    const raw = window.localStorage.getItem(REVIEW_STORAGE_KEY)
    cachedReviewSnapshot = raw
      ? (JSON.parse(raw) as Record<string, StoredReviewRecord>)
      : {}
  } catch {
    cachedReviewSnapshot = {}
  }
}

function persistReviewSnapshot(): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(cachedReviewSnapshot))
  window.dispatchEvent(new Event(REVIEW_EVENT_NAME))
  listeners.forEach((listener) => listener())
}

function ensureLoadedReviewerStatuses(): void {
  if (hasLoadedReviewerStatuses || typeof window === "undefined") return
  hasLoadedReviewerStatuses = true

  try {
    const raw = window.localStorage.getItem(REVIEWER_STATUS_STORAGE_KEY)
    cachedReviewerStatuses = raw
      ? (JSON.parse(raw) as Record<string, ReviewerStatus>)
      : {}
  } catch {
    cachedReviewerStatuses = {}
  }
}

function persistReviewerStatuses(): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(REVIEWER_STATUS_STORAGE_KEY, JSON.stringify(cachedReviewerStatuses))
  window.dispatchEvent(new Event(REVIEW_EVENT_NAME))
  listeners.forEach((listener) => listener())
}

export function subscribeToSystemMappingReviews(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getReviewAccessRole(profile?: PrepSightProfile | null): PlatformRole {
  const resolvedProfile = profile ?? getProfile()
  return resolvedProfile?.platformRole ?? "user"
}

export function isTrustedReviewer(profile: PrepSightProfile | null): boolean {
  const role = getReviewAccessRole(profile)
  return role === "moderator" || role === "admin"
}

export function canModerateReviews(profile?: PrepSightProfile | null): boolean {
  const role = getReviewAccessRole(profile)
  return role === "moderator" || role === "admin"
}

export function getAcceptedSectionData(
  mappingId: string,
  section: ReviewableSectionKey,
): AcceptedSectionData {
  ensureLoadedReviewSnapshot()
  const record = cachedReviewSnapshot[mappingId]
  return cloneAcceptedSectionData(record?.accepted_section_data?.[section])
}

export function getSectionValidationHistory(
  mappingId: string,
  section: ReviewableSectionKey,
): SectionValidationRecord[] {
  ensureLoadedReviewSnapshot()
  return [...(cachedReviewSnapshot[mappingId]?.section_validations?.[section] ?? [])]
}

export function getSectionProposals(
  mappingId: string,
  section?: ReviewableSectionKey,
): SectionProposalRecord[] {
  ensureLoadedReviewSnapshot()
  const proposals = [...(cachedReviewSnapshot[mappingId]?.proposals ?? [])]
  return section ? proposals.filter((proposal) => proposal.section === section) : proposals
}

export function getReviewActor(profile?: PrepSightProfile | null): string {
  const resolvedProfile = profile ?? getProfile()
  if (resolvedProfile?.name?.trim()) return resolvedProfile.name.trim()
  if (resolvedProfile?.hospital?.trim()) return resolvedProfile.hospital.trim()

  if (typeof window !== "undefined") {
    const key = "prepsight_review_actor"
    const existing = window.localStorage.getItem(key)
    if (existing) return existing
    const generated = `User-${Math.random().toString(36).slice(2, 8)}`
    window.localStorage.setItem(key, generated)
    return generated
  }

  return "User"
}

export function getReviewerStatus(actor?: string): ReviewerStatus {
  ensureLoadedReviewerStatuses()
  const resolvedActor = actor || getReviewActor()
  return cachedReviewerStatuses[resolvedActor] ?? "active"
}

export function setReviewerStatus(
  actor: string,
  status: ReviewerStatus,
): void {
  ensureLoadedReviewerStatuses()
  cachedReviewerStatuses = {
    ...cachedReviewerStatuses,
    [actor]: status,
  }
  persistReviewerStatuses()
}

export function isPriorityReviewBranch(variant: ProcedureVariant): boolean {
  return (
    variant.service_line_id === ARTHROPLASTY_SERVICE_LINE_ID &&
    Boolean(variant.anatomy_id && FOCUS_ANATOMY_IDS.has(variant.anatomy_id))
  )
}

function getSystemWithSupplier(systemId: string): SystemWithSupplier | null {
  const system = systemById.get(systemId)
  if (!system) return null
  return {
    ...system,
    supplier: system.supplier_id ? supplierById.get(system.supplier_id) ?? null : null,
    is_default: false,
  }
}

function looksCompatibleWithProcedure(
  procedureName: string,
  variantName: string,
  system: CatalogSystem,
): boolean {
  const branchText = `${procedureName} ${variantName}`.toLowerCase()
  const systemText = `${system.name} ${system.category ?? ""} ${system.description ?? ""}`.toLowerCase()

  const wantsRevision = branchText.includes("revision")
  const wantsResurfacing = branchText.includes("resurfacing")
  const wantsHemi = branchText.includes("hemi")
  const wantsReverse = branchText.includes("reverse")
  const wantsPartial = branchText.includes("unicompartmental") || branchText.includes("partial")
  const wantsPatellofemoral = branchText.includes("patellofemoral")

  if (!wantsRevision && /(revision|augment|modular revision)/.test(systemText)) return false
  if (!wantsResurfacing && /(resurfacing|bhr|conserve plus)/.test(systemText)) return false
  if (!wantsHemi && /(bipolar|hemi)/.test(systemText)) return false
  if (!wantsReverse && /reverse/.test(systemText)) return false
  if (!wantsPartial && /(partial knee|unicompartmental|uni knee)/.test(systemText)) return false
  if (!wantsPatellofemoral && /patellofemoral/.test(systemText)) return false

  if (branchText.includes("primary total hip replacement")) {
    return !/(fracture|nail|fixation|portfolio|oncology)/.test(systemText)
  }

  if (branchText.includes("primary total knee replacement")) {
    return !/(fracture|nail|fixation|oncology)/.test(systemText)
  }

  if (branchText.includes("shoulder")) {
    return !/(radial head|elbow)/.test(systemText)
  }

  if (branchText.includes("elbow")) {
    return !/(shoulder|glenoid)/.test(systemText)
  }

  if (branchText.includes("ankle")) {
    return !/(hindfoot fusion|fracture|plate|nail)/.test(systemText)
  }

  return true
}

function buildCandidateMappings(
  procedureId: string,
  procedureName: string,
  subspecialty: string,
  anatomy: string,
  subanatomyGroup: string,
  variant: ProcedureVariant,
  existingSystemIds: Set<string>,
): ReviewableSystemMapping[] {
  if (!isPriorityReviewBranch(variant)) return []

  return systems
    .filter((system) => (system.service_line_ids ?? []).includes(ARTHROPLASTY_SERVICE_LINE_ID))
    .filter((system) => variant.anatomy_id && (system.anatomy_ids ?? []).includes(variant.anatomy_id))
    .filter((system) => !existingSystemIds.has(system.id))
    .filter((system) => looksCompatibleWithProcedure(procedureName, variant.name, system))
    .map((system) => ({
      ...(getSystemWithSupplier(system.id) as SystemWithSupplier),
      is_default: false,
      mapping_id: buildSystemMappingId(variant.id, system.id),
      mapping_status: "review_required" as const,
      review_notes: "Catalog-compatible candidate pending community review.",
      suggested_by_users: [],
      upvotes: 0,
      downvotes: 0,
      evidence_links: [],
      last_reviewed_at: null,
      approved_by_admin: false,
      fixation_label: inferFixationLabel(
        `${system.category ?? ""} ${system.description ?? ""} ${procedureName} ${variant.name}`,
      ),
      source: "catalog_candidate" as const,
    }))
}

function mergeStoredRecord(
  base: ReviewableSystemMapping,
  stored?: StoredReviewRecord,
): ReviewableSystemMapping {
  if (!stored) return base
  return {
    ...base,
    ...stored,
    mapping_status: (stored.mapping_status as MappingStatus | undefined) ?? base.mapping_status,
    review_notes: stored.review_notes ?? base.review_notes,
    suggested_by_users: stored.suggested_by_users ?? base.suggested_by_users,
    upvotes: stored.upvotes ?? base.upvotes,
    downvotes: stored.downvotes ?? base.downvotes,
    evidence_links: stored.evidence_links ?? base.evidence_links,
    last_reviewed_at: stored.last_reviewed_at ?? base.last_reviewed_at,
    approved_by_admin: stored.approved_by_admin ?? base.approved_by_admin,
    fixation_label: (stored.fixation_label as FixationLabel | undefined) ?? base.fixation_label,
    is_default: stored.is_default ?? base.is_default,
    source: stored.source ?? base.source,
  }
}

function sortMappings(a: ReviewableSystemMapping, b: ReviewableSystemMapping): number {
  const statusRank: Record<MappingStatus, number> = {
    confirmed: 0,
    review_required: 1,
    rejected: 2,
  }

  if (statusRank[a.mapping_status] !== statusRank[b.mapping_status]) {
    return statusRank[a.mapping_status] - statusRank[b.mapping_status]
  }

  if ((a.is_default ?? false) !== (b.is_default ?? false)) {
    return a.is_default ? -1 : 1
  }

  const voteDelta = (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes)
  if (voteDelta !== 0) return voteDelta

  return a.name.localeCompare(b.name)
}

export function getReviewedMappingsForVariant({
  procedure,
  variant,
  currentSystems,
  specialty,
  subspecialty,
  anatomy,
  subanatomyGroup,
  includeReviewRequired,
}: {
  procedure: { id: string; name: string }
  variant: ProcedureVariant
  currentSystems: SystemWithSupplier[]
  specialty: string
  subspecialty: string
  anatomy: string
  subanatomyGroup: string
  includeReviewRequired: boolean
}): ReviewableSystemMapping[] {
  ensureLoadedReviewSnapshot()

  const records = new Map<string, ReviewableSystemMapping>()

  for (const seedRecord of seedByVariantId.get(variant.id) ?? []) {
    const system = getSystemWithSupplier(seedRecord.system_id)
    if (!system) continue
    records.set(seedRecord.system_id, {
      ...system,
      name: seedRecord.system_name,
      category: seedRecord.category,
      description: seedRecord.description,
      is_default: seedRecord.is_default,
      mapping_id: seedRecord.id,
      mapping_status: seedRecord.mapping_status,
      review_notes: seedRecord.review_notes,
      suggested_by_users: seedRecord.suggested_by_users,
      upvotes: seedRecord.upvotes,
      downvotes: seedRecord.downvotes,
      evidence_links: seedRecord.evidence_links,
      last_reviewed_at: seedRecord.last_reviewed_at,
      approved_by_admin: seedRecord.approved_by_admin,
      fixation_label: seedRecord.fixation_label,
      source: "seed",
    })
  }

  for (const system of currentSystems) {
    records.set(system.id, {
      ...system,
      mapping_id: buildSystemMappingId(variant.id, system.id),
      mapping_status: "confirmed",
      review_notes: "",
      suggested_by_users: [],
      upvotes: 0,
      downvotes: 0,
      evidence_links: [],
      last_reviewed_at: null,
      approved_by_admin: true,
      fixation_label: inferFixationLabel(
        `${system.category ?? ""} ${system.description ?? ""} ${procedure.name} ${variant.name}`,
      ),
      source: "seed",
    })
  }

  const candidates = buildCandidateMappings(
    procedure.id,
    procedure.name,
    subspecialty,
    anatomy,
    subanatomyGroup,
    variant,
    new Set(records.keys()),
  )

  for (const candidate of candidates) {
    records.set(candidate.id, candidate)
  }

  const merged = Array.from(records.values())
    .map((record) => mergeStoredRecord(record, cachedReviewSnapshot[record.mapping_id]))
    .filter((record) => record.mapping_status !== "rejected")
    .filter((record) => includeReviewRequired || record.mapping_status === "confirmed")
    .sort(sortMappings)

  return merged
}

export function getSuggestionCandidatesForVariant(
  variant: ProcedureVariant,
  currentMappings: ReviewableSystemMapping[],
): SystemWithSupplier[] {
  const existingSystemIds = new Set(currentMappings.map((mapping) => mapping.id))

  return systems
    .filter((system) => (system.service_line_ids ?? []).includes(variant.service_line_id ?? ""))
    .filter((system) => !variant.anatomy_id || (system.anatomy_ids ?? []).includes(variant.anatomy_id))
    .filter((system) => !existingSystemIds.has(system.id))
    .map((system) => getSystemWithSupplier(system.id))
    .filter((system): system is SystemWithSupplier => Boolean(system))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function suggestSystemMapping(input: SuggestSystemInput): void {
  ensureLoadedReviewSnapshot()

  const system = getSystemWithSupplier(input.system_id)
  if (!system) return

  const actor = getReviewActor()
  const mappingId = buildSystemMappingId(input.variant_id, input.system_id)
  const existing = cachedReviewSnapshot[mappingId]

  cachedReviewSnapshot = {
    ...cachedReviewSnapshot,
    [mappingId]: {
      ...(existing ?? {}),
      id: mappingId,
      specialty: input.specialty,
      subspecialty: input.subspecialty,
      anatomy: input.anatomy,
      subanatomy_group: input.subanatomy_group,
      procedure_id: input.procedure_id,
      procedure_name: input.procedure_name,
      variant_id: input.variant_id,
      variant_name: input.variant_name,
      system_id: input.system_id,
      system_name: system.name,
      supplier_name: system.supplier?.name ?? "",
      category: system.category ?? "",
      description: system.description ?? "",
      is_default: existing?.is_default ?? false,
      mapping_status: "review_required",
      review_notes: input.review_notes?.trim() || existing?.review_notes || "",
      suggested_by_users: Array.from(
        new Set([...(existing?.suggested_by_users ?? []), actor]),
      ),
      upvotes: existing?.upvotes ?? 1,
      downvotes: existing?.downvotes ?? 0,
      evidence_links: Array.from(
        new Set([...(existing?.evidence_links ?? []), ...(input.evidence_links ?? [])]),
      ),
      last_reviewed_at: existing?.last_reviewed_at ?? null,
      approved_by_admin: existing?.approved_by_admin ?? false,
      fixation_label: input.fixation_label,
      source: "community",
      user_votes: {
        ...(existing?.user_votes ?? {}),
        [actor]: "up",
      },
      revision_history: [
        ...(existing?.revision_history ?? []),
        {
          actor,
          change_type: "suggestion",
          summary: "Suggested mapping added",
          revised_at: new Date().toISOString(),
        },
      ],
    },
  }

  persistReviewSnapshot()
}

export function voteOnSystemMapping(
  mappingId: string,
  direction: "up" | "down",
  options?: { reason?: string; actor?: string },
): void {
  ensureLoadedReviewSnapshot()
  const existing = cachedReviewSnapshot[mappingId]
  if (!existing) return

  const actor = options?.actor ?? getReviewActor()
  const reviewerStatus = getReviewerStatus(actor)
  if (reviewerStatus === "banned") return
  if (direction === "down" && !options?.reason?.trim()) return

  const previousVote = existing.user_votes?.[actor]
  let upvotes = existing.upvotes ?? 0
  let downvotes = existing.downvotes ?? 0

  if (previousVote === direction) {
    if (direction === "up") upvotes = Math.max(0, upvotes - 1)
    if (direction === "down") downvotes = Math.max(0, downvotes - 1)
    const nextVotes = { ...(existing.user_votes ?? {}) }
    delete nextVotes[actor]
    cachedReviewSnapshot = {
      ...cachedReviewSnapshot,
      [mappingId]: {
        ...existing,
        upvotes,
        downvotes,
        user_votes: nextVotes,
        vote_reasons:
          direction === "down"
            ? Object.fromEntries(
                Object.entries(existing.vote_reasons ?? {}).filter(([key]) => key !== actor),
              )
            : existing.vote_reasons,
      },
    }
    persistReviewSnapshot()
    return
  }

  if (previousVote === "up") upvotes = Math.max(0, upvotes - 1)
  if (previousVote === "down") downvotes = Math.max(0, downvotes - 1)
  if (direction === "up") upvotes += 1
  if (direction === "down") downvotes += 1

  cachedReviewSnapshot = {
    ...cachedReviewSnapshot,
    [mappingId]: {
      ...existing,
      upvotes,
      downvotes,
      user_votes: {
        ...(existing.user_votes ?? {}),
        [actor]: direction,
      },
      vote_reasons:
        direction === "down"
          ? {
              ...(existing.vote_reasons ?? {}),
              [actor]: options?.reason?.trim() ?? "",
            }
          : Object.fromEntries(
              Object.entries(existing.vote_reasons ?? {}).filter(([key]) => key !== actor),
            ),
      vote_history: [
        ...(existing.vote_history ?? []),
        {
          actor,
          direction,
          reason: options?.reason?.trim() || undefined,
          voted_at: new Date().toISOString(),
        },
      ],
    },
  }

  persistReviewSnapshot()
}

export function submitSectionValidation(input: {
  mapping_id: string
  section: ReviewableSectionKey
  vote: SectionVote
  issue_type?: SectionIssueType
  note?: string
  actor?: string
}): void {
  ensureLoadedReviewSnapshot()
  const existing = cachedReviewSnapshot[input.mapping_id]
  if (!existing) return

  const actor = input.actor ?? getReviewActor()
  const nextRecord: SectionValidationRecord = {
    id: buildEntryId("SV"),
    section: input.section,
    vote: input.vote,
    issue_type: input.issue_type,
    note: input.note?.trim() || undefined,
    user: actor,
    timestamp: new Date().toISOString(),
  }

  cachedReviewSnapshot = {
    ...cachedReviewSnapshot,
    [input.mapping_id]: {
      ...existing,
      section_validations: {
        ...(existing.section_validations ?? {}),
        [input.section]: [
          ...((existing.section_validations ?? {})[input.section] ?? []),
          nextRecord,
        ],
      },
      last_reviewed_at: nextRecord.timestamp,
    },
  }

  persistReviewSnapshot()
}

export function submitSectionProposal(input: {
  mapping_id: string
  section: ReviewableSectionKey
  action_type: ProposalActionType
  issue_type?: SectionIssueType
  proposed_value?: AcceptedSectionData
  note?: string
  actor?: string
}): SectionProposalRecord | null {
  ensureLoadedReviewSnapshot()
  const existing = cachedReviewSnapshot[input.mapping_id]
  if (!existing) return null

  const actor = input.actor ?? getReviewActor()
  const proposal: SectionProposalRecord = {
    id: buildEntryId("SP"),
    record_id: input.mapping_id,
    section: input.section,
    action_type: input.action_type,
    issue_type: input.issue_type,
    current_value_snapshot: cloneAcceptedSectionData(existing.accepted_section_data?.[input.section]),
    proposed_value: sanitizeSectionProposalValue(input.section, input.proposed_value),
    note: input.note?.trim() || undefined,
    submitted_by: actor,
    submitted_at: new Date().toISOString(),
    status: "pending",
  }

  cachedReviewSnapshot = {
    ...cachedReviewSnapshot,
    [input.mapping_id]: {
      ...existing,
      proposals: [...(existing.proposals ?? []), proposal],
      revision_history: [
        ...(existing.revision_history ?? []),
        {
          actor,
          change_type: "suggestion",
          summary:
            input.action_type === "flag_only"
              ? `Flag submitted for ${input.section}`
              : input.action_type === "suggest_correction"
                ? `Suggested correction for ${input.section}`
                : `Suggested addition for ${input.section}`,
          revised_at: proposal.submitted_at,
        },
      ],
      last_reviewed_at: proposal.submitted_at,
    },
  }

  persistReviewSnapshot()
  return proposal
}

export function getModerationQueue(status?: ProposalStatus): ModerationQueueItem[] {
  ensureLoadedReviewSnapshot()
  const items: ModerationQueueItem[] = []

  for (const [mappingId, record] of Object.entries(cachedReviewSnapshot)) {
    for (const proposal of record.proposals ?? []) {
      if (status && proposal.status !== status) continue
      items.push({
        proposal,
        record_title: record.system_name ?? "Untitled record",
        supplier_name: record.supplier_name ?? "Unknown supplier",
        mapping_id: mappingId,
      })
    }
  }

  return items.sort((a, b) => b.proposal.submitted_at.localeCompare(a.proposal.submitted_at))
}

export function getFlaggedQueue(): FlaggedQueueItem[] {
  ensureLoadedReviewSnapshot()
  const items: FlaggedQueueItem[] = []

  for (const [mappingId, record] of Object.entries(cachedReviewSnapshot)) {
    for (const section of ["systems", "trays", "skus"] as ReviewableSectionKey[]) {
      const validations = record.section_validations?.[section] ?? []
      const latest = validations[validations.length - 1]
      if (!latest || latest.vote !== "incorrect") continue
      items.push({
        mapping_id: mappingId,
        record_title: record.system_name ?? "Untitled record",
        supplier_name: record.supplier_name ?? "Unknown supplier",
        section,
        latest_validation: latest,
      })
    }
  }

  return items.sort((a, b) => b.latest_validation.timestamp.localeCompare(a.latest_validation.timestamp))
}

export function moderateProposal(input: {
  mapping_id: string
  proposal_id: string
  decision: Extract<ProposalStatus, "approved" | "rejected">
  review_note?: string
  actor?: string
}): void {
  ensureLoadedReviewSnapshot()
  const existing = cachedReviewSnapshot[input.mapping_id]
  if (!existing) return

  const actor = input.actor ?? getReviewActor()
  const reviewedAt = new Date().toISOString()

  const nextProposals = (existing.proposals ?? []).map((proposal) => {
    if (proposal.id !== input.proposal_id) return proposal
    return {
      ...proposal,
      status: input.decision,
      reviewed_by: actor,
      reviewed_at: reviewedAt,
      review_note: input.review_note?.trim() || undefined,
    }
  })
  const approvedProposal =
    input.decision === "approved"
      ? nextProposals.find((proposal) => proposal.id === input.proposal_id)
      : undefined

  const nextAcceptedSectionData = { ...(existing.accepted_section_data ?? {}) }
  if (approvedProposal && approvedProposal.action_type !== "flag_only" && approvedProposal.proposed_value) {
    nextAcceptedSectionData[approvedProposal.section] = mergeApprovedSectionData(
      approvedProposal.section,
      cloneAcceptedSectionData(existing.accepted_section_data?.[approvedProposal.section]),
      approvedProposal.proposed_value,
    )
  }

  cachedReviewSnapshot = {
    ...cachedReviewSnapshot,
    [input.mapping_id]: {
      ...existing,
      proposals: nextProposals,
      accepted_section_data: nextAcceptedSectionData,
      revision_history: [
        ...(existing.revision_history ?? []),
        {
          actor,
          change_type: input.decision === "approved" ? "proposal_approved" : "proposal_rejected",
          summary:
            input.decision === "approved"
              ? `Approved ${approvedProposal?.section ?? "section"} proposal`
              : "Rejected proposed change",
          revised_at: reviewedAt,
        },
        ...(approvedProposal && approvedProposal.action_type !== "flag_only" && approvedProposal.proposed_value
          ? [{
              actor,
              change_type: "accepted_data_updated" as const,
              summary: `Accepted ${approvedProposal.section} data updated from approved suggestion`,
              revised_at: reviewedAt,
            }]
          : []),
      ],
      last_reviewed_at: reviewedAt,
    },
  }

  persistReviewSnapshot()
}

export function reviewSystemMapping(
  mappingId: string,
  updates: {
    mapping_status?: MappingStatus
    review_notes?: string
    evidence_links?: string[]
    fixation_label?: FixationLabel
    approved_by_admin?: boolean
  },
): void {
  ensureLoadedReviewSnapshot()
  const existing = cachedReviewSnapshot[mappingId]
  if (!existing) return
  const actor = getReviewActor()
  const reviewedAt = new Date().toISOString()

  cachedReviewSnapshot = {
    ...cachedReviewSnapshot,
    [mappingId]: {
      ...existing,
      ...updates,
      last_reviewed_at: reviewedAt,
      approved_by_admin:
        updates.approved_by_admin ??
        (updates.mapping_status === "confirmed" ? true : existing.approved_by_admin ?? false),
      review_history: [
        ...(existing.review_history ?? []),
        {
          actor,
          outcome: updates.mapping_status ?? existing.mapping_status ?? "review_required",
          notes: updates.review_notes?.trim() || undefined,
          reviewed_at: reviewedAt,
          approved_by_admin:
            updates.approved_by_admin ??
            (updates.mapping_status === "confirmed" ? true : existing.approved_by_admin ?? false),
        },
      ],
      revision_history: [
        ...(existing.revision_history ?? []),
        ...(updates.mapping_status && updates.mapping_status !== existing.mapping_status
          ? [{
              actor,
              change_type: "mapping_status" as const,
              summary: `Review outcome set to ${updates.mapping_status.replaceAll("_", " ")}`,
              revised_at: reviewedAt,
            }]
          : []),
        ...(updates.review_notes && updates.review_notes.trim() !== (existing.review_notes ?? "").trim()
          ? [{
              actor,
              change_type: "review_notes" as const,
              summary: "Review notes updated",
              revised_at: reviewedAt,
            }]
          : []),
      ],
    },
  }

  persistReviewSnapshot()
}

export function addSystemMappingRevision(
  mappingId: string,
  summary: string,
  changeType: "fixation" | "review_notes" | "mapping_status" | "suggestion" = "suggestion",
): void {
  ensureLoadedReviewSnapshot()
  const existing = cachedReviewSnapshot[mappingId]
  if (!existing) return

  cachedReviewSnapshot = {
    ...cachedReviewSnapshot,
    [mappingId]: {
      ...existing,
      revision_history: [
        ...(existing.revision_history ?? []),
        {
          actor: getReviewActor(),
          change_type: changeType,
          summary,
          revised_at: new Date().toISOString(),
        },
      ],
      last_reviewed_at: new Date().toISOString(),
    },
  }

  persistReviewSnapshot()
}

export function setSystemFixationLabel(
  mappingId: string,
  fixationLabel: FixationLabel,
): void {
  ensureLoadedReviewSnapshot()
  const existing = cachedReviewSnapshot[mappingId]
  if (!existing) return

  cachedReviewSnapshot = {
    ...cachedReviewSnapshot,
    [mappingId]: {
      ...existing,
      fixation_label: fixationLabel,
      last_reviewed_at: new Date().toISOString(),
      revision_history: [
        ...(existing.revision_history ?? []),
        {
          actor: getReviewActor(),
          change_type: "fixation",
          summary: `Implant type set to ${fixationLabel.replaceAll("_", " ")}`,
          revised_at: new Date().toISOString(),
        },
      ],
    },
  }

  persistReviewSnapshot()
}

export function getSystemMappingReviewSnapshot(): Record<string, StoredReviewRecord> {
  ensureLoadedReviewSnapshot()
  return cachedReviewSnapshot
}

export function getSystemMappingHistory(mappingId: string): {
  reviewHistory: ReviewHistoryEntry[]
  revisionHistory: RevisionHistoryEntry[]
} {
  ensureLoadedReviewSnapshot()
  const record = cachedReviewSnapshot[mappingId]
  return {
    reviewHistory: record?.review_history ?? [],
    revisionHistory: record?.revision_history ?? [],
  }
}

export function getSectionReviewState(
  mappingId: string,
  section: ReviewableSectionKey,
): "unverified" | "reviewed" | "needs_review" {
  ensureLoadedReviewSnapshot()
  const validations = cachedReviewSnapshot[mappingId]?.section_validations?.[section] ?? []
  const latest = validations[validations.length - 1]
  if (!latest) return "unverified"
  if (latest.vote === "incorrect") return "needs_review"
  return "reviewed"
}

export function parseEvidenceLinkText(value: string): string[] {
  return parseEvidenceLinks(value)
}
