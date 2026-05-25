export type ClinicalSetting =
  | "Operating Theatre"
  | "Endoscopy Suite"
  | "Interventional Radiology / Cath Lab"
  | "Emergency Department"
  | "Intensive Care Unit"
  | "Ward"
  | "Outpatient / Clinic"
  | "Maternity & Obstetrics"

export type SectionType =
  | "overview"
  | "consent_documentation"
  | "pre_procedure_assessment"
  | "ppe"
  | "patient_preparation"
  | "anaesthesia"
  | "patient_positioning"
  | "sterile_field_draping"
  | "instrument_sets_trays"
  | "equipment_devices"
  | "implants_prosthetics"
  | "consumables_supplies"
  | "medications_fluids"
  | "specimen_collection"
  | "procedure_reference"
  | "nurse_prep_notes"
  | "post_procedure_care"
  | "discharge_criteria"
  | "complications_escalation"
  | "patient_information"
  | "wound_closure"
  | "local_infiltration"
  | "dressings"
  | "handover_notes"

export interface Supplier {
  name: string
  contact?: string
  url?: string
}

export interface Item {
  id: string
  name: string
  sku?: string
  description?: string
  product?: string
  manufacturer?: string
  supplier?: Supplier
  imageUrl?: string
  notes?: string
  defaultQty?: number
  location?: string
  catalogueItemId?: string
  sourceType?: "supplier" | "hospital" | "catalogue"
  isFixed?: boolean
}

export type CardContentMode = "fixed" | "editable" | "mixed"

export interface Section {
  id: string
  title: string
  sectionType: SectionType
  items: Item[]
  contentMode?: CardContentMode
  sourceType?: "supplier" | "hospital" | "catalogue"
  // patient_positioning
  patientPositionInstructions?: string
  // procedure_reference
  operativeTechniqueUrl?: string
  implantGuideUrl?: string
  externalLinks?: { label: string; url: string }[]
  // nurse_prep_notes
  nurseNotes?: string
  // overview
  summary?: string
  duration?: string
  anaesthesiaType?: string
  primarySystem?: string
  alternatives?: string[]
  // post_procedure_care
  recoveryNotes?: string
  // discharge_criteria
  dischargeCriteria?: string[]
  // complications_escalation
  commonComplications?: string[]
}

export interface WorkflowStep {
  id: string
  order: number
  title: string
  summary: string
  detail?: string
  relatedSectionIds?: string[]
  expectedInstruments?: string[]
  reminders?: string[]
  rationale?: string
}

export interface CatalogueItemRecord {
  id: string
  name: string
  sku?: string
  product?: string
  description?: string
  manufacturer?: string
  supplier?: Supplier
  category: SectionType | "implant_system" | "positioning_equipment"
  aliases?: string[]
  sourceType: "supplier" | "hospital" | "catalogue"
  isFixed: boolean
  variantGroupId?: string
  sizeLabel?: string
}

export interface ChecklistEntry {
  catalogueItemId?: string
  itemName: string
  sectionType: SectionType
  requiredQty?: number
  checkedQty?: number
  checked: boolean
  note?: string
  updatedAt: string
  updatedBy?: string
}

export interface ProcedureFamily {
  id: string              // "total-hip-replacement"
  name: string            // "Total Hip Replacement"
  specialty: string       // "Orthopaedics"
  setting: ClinicalSetting
  description?: string    // brief summary shown on family page
  tags?: string[]         // searchable aliases e.g. ["THR", "hip arthroplasty"]
}

export interface CardChange {
  sectionId: string
  sectionTitle: string
  before: Item[]
  after: Item[]
  changeType: "added" | "modified" | "removed"
}

export interface CardVersion {
  id: string
  cardId: string
  versionNumber: number
  status: "draft" | "pending_review" | "published"
  createdAt: string
  createdBy: string
  createdByName?: string
  updatedAt: string
  updatedBy?: string
  updatedByName?: string
  approvedAt?: string
  approvedBy?: string
  approvedByName?: string
  rejectionReason?: string
  changes: CardChange[]
  snapshot: Procedure
}

export interface Procedure {
  id: string
  familyId: string        // links to ProcedureFamily
  variantLabel?: string   // what makes this variant unique e.g. "Posterior — Exeter / Trident"
  name: string            // procedure name (usually = family name)
  cardScope?: "shared" | "local"
  publishState?: "draft" | "published"
  status?: string         // "draft" | "pending_review" | "published" | other legacy values
  currentVersionId?: string
  versionNumber?: number
  setting: ClinicalSetting
  specialty: string
  specialty_id?: string
  service_line_id?: string
  anatomy_id?: string
  subanatomy_group?: string
  aliases?: string[]
  description?: string
  approach?: string
  implantSystem?: string
  sections: Section[]
  workflowSteps?: WorkflowStep[]
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
  sourceCardId?: string
  sourceLibraryId?: string
  sourceLibraryName?: string
  sourceOrganizationName?: string
  sourceOrganizationPublicAlias?: string
  sourceContributorName?: string
  sourceContributorPublicAlias?: string
}

export type LibraryType = "shared" | "local"
export type LibraryVisibility = "private" | "organization" | "public"

export interface LibraryRecord {
  id: string
  name: string
  slug: string
  description?: string
  libraryType: LibraryType
  visibility: LibraryVisibility
  ownerType: "platform" | "organization" | "user"
  ownerId: string
  ownerName: string
  ownerPublicAlias?: string
  cardIds: string[]
  sourceLibraryId?: string
  parentId?: string
  createdAt: string
  updatedAt: string
}

export interface Surgeon {
  id: string
  name: string        // "Mr James Wilson"
  shortName: string   // "Wilson" — for compact display
  initials: string    // "JW" — for avatar badges
  specialty: string
  grade?: string      // "Consultant", "Associate Specialist"
}

export interface SurgeonProcedure {
  id: string            // unique assignment e.g. "wilson-thr"
  surgeonId: string     // references Surgeon.id
  procedureId: string   // references Procedure.id
  implantSystem?: string  // surgeon's preferred system (overrides template)
  notes?: string          // surgeon-specific prep notes
}

export interface ItemDisplayInfo {
  item: Item
  sectionId: string
  name: string
  product: string
  location: string
  qty: string
  imageUrl: string | null
}

/** How the user intends to use PrepSight — stored internally, not shown verbatim */
export type UserRole = "viewer" | "editor" | "clinical_author" | "manager" | "senior_manager"
export type PlatformRole = "user" | "moderator" | "admin"
export type MembershipStatus = "active" | "pending_approval" | "suspended"
export type OrganizationVisibility = "private" | "discoverable" | "shared_anonymised"
export type AccessSurface = "portal" | "governance" | "operator"
export type AccountType = "portal_user" | "governance_admin" | "vendor_operator"
export type PortalMembershipRole = "user" | "manager"
export type GovernanceMembershipRole = "it_admin" | "governance_admin" | "read_only"
export type OperatorMembershipRole = "vendor_operator" | "vendor_admin"

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  viewer:          "User",
  editor:          "Content Manager",
  clinical_author: "Clinical Author",
  manager:         "Manager",
  senior_manager:  "Senior Manager",
}

export const USER_ROLE_TO_PLATFORM_ROLE: Record<UserRole, PlatformRole> = {
  viewer:          "user",
  editor:          "moderator",
  clinical_author: "admin",
  manager:         "admin",
  senior_manager:  "admin",
}

export interface PrepSightProfile {
  hospital: string
  departments: string[]
  role: UserRole
  platformRole?: PlatformRole
  accountType?: AccountType
  surfaces?: AccessSurface[]
  activeOrganizationId?: string
  organizationIds?: string[]
  jobTitle?: string
  band?: string
  name?: string
  email?: string
  specialtiesOfInterest: string[]
  completedAt: string
}

export interface OrganizationRecord {
  id: string
  /** Internal display name shown inside the owning organisation context. */
  internalName: string
  /** Opaque alias shown outside the owning organisation, especially in the global repository. */
  publicAlias: string
  visibility: OrganizationVisibility
  createdAt: string
  createdBy: string
  aliasRotatesAfter?: string
}

export interface OrganizationMembershipRecord {
  id: string
  organizationId: string
  uid: string
  /** Internal display name shown inside the owning organisation context. */
  displayName?: string
  jobTitle?: string
  internalRole: UserRole
  platformRole: PlatformRole
  departments: string[]
  specialtiesOfInterest: string[]
  status: MembershipStatus
  /** Opaque alias shown outside the owning organisation, especially in the global repository. */
  publicAlias: string
  approvedBy?: string
  requestedAt: string
  approvedAt?: string
  startsAt?: string
  endsAt?: string
}

export type IdentityMode = "internal" | "anonymised"

export interface PortalMembershipRecord {
  id: string
  organizationId: string
  uid: string
  role: PortalMembershipRole
  status: MembershipStatus
  displayName?: string
  jobTitle?: string
  publicAlias?: string
  departments: string[]
  specialtiesOfInterest: string[]
  requestedAt: string
  approvedAt?: string
  approvedBy?: string
}

export interface GovernanceMembershipRecord {
  id: string
  organizationId: string
  uid: string
  role: GovernanceMembershipRole
  status: MembershipStatus
  displayName?: string
  requestedAt: string
  approvedAt?: string
  approvedBy?: string
}

export interface OperatorMembershipRecord {
  id: string
  uid: string
  role: OperatorMembershipRole
  status: "active" | "suspended"
  displayName?: string
  requestedAt: string
  approvedAt?: string
  approvedBy?: string
}

export interface StaffingReportRowRecord {
  sourceMatchKey: string
  name: string
  classification: string
  shiftTime?: string
}

export interface StaffingReportRecord {
  id: string
  organizationId: string
  sourceSystem: "optima"
  fileName: string
  reportDate?: string
  weekLabel?: string
  source?: string
  fulfilmentType?: string
  rowCount: number
  rows: StaffingReportRowRecord[]
  uploadedAt: string
  uploadedBy?: string
}

export interface StaffingStaffPoolRecord {
  id: string
  organizationId: string
  sourceSystem: "optima"
  sourceMatchKey: string
  sourceName: string
  sourceClassification: string
  sourceTitle?: string
  sourceBand?: string
  latestShiftTime?: string
  firstSeenAt: string
  lastSeenAt: string
  lastReportDate?: string
  lastReportId?: string
  occurrenceCount: number
}
