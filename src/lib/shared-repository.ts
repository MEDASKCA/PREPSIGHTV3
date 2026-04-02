import type { ClinicalSetting, Procedure, SectionType } from "./types"

export const SHARED_COLLECTIONS = {
  repositories: "repositories_v2",
  taxonomyNodes: "taxonomy_nodes_v2",
  canonicalProcedures: "canonical_procedures_v2",
  procedureVersions: "procedure_versions_v2",
  publications: "publication_projections_v2",
  comments: "publication_comments_v2",
  suggestions: "publication_suggestions_v2",
  ratings: "publication_ratings_v2",
  reactions: "publication_reactions_v2",
  activity: "publication_activity_v2",
} as const

export type SharedCollectionName =
  (typeof SHARED_COLLECTIONS)[keyof typeof SHARED_COLLECTIONS]

export type RepositoryKind = "global" | "organization" | "team"
export type RepositoryVisibility = "internal" | "organization" | "global"
export type TaxonomyNodeKind = "setting" | "specialty" | "service_line" | "anatomy"
export type ContentLifecycleState = "draft" | "active" | "superseded" | "archived"
export type PublicationMode = "automatic" | "manual"
export type ProcedureOrigin = "seed" | "workspace" | "imported"
export type VersionKind = "canonical" | "consultant_preference" | "team_preference" | "local_adaptation"
export type PublicationStatus = "active" | "withdrawn" | "superseded"
export type CommunityReaction = "like" | "useful" | "save"
export type SuggestionStatus = "open" | "accepted" | "rejected" | "implemented"

export interface RepositoryContributorIdentity {
  uid: string
  organizationId: string
  membershipId?: string
  internalDisplayName?: string
  publicAlias?: string
}

export interface SharedRepositoryRecord {
  id: string
  kind: RepositoryKind
  visibility: RepositoryVisibility
  organizationId?: string
  teamId?: string
  internalName: string
  publicAlias?: string
  settings: ClinicalSetting[]
  createdAt: string
  createdBy: string
  updatedAt: string
  sourceRepositoryId?: string
  publicationMode: PublicationMode
}

export interface SharedTaxonomyNodeRecord {
  id: string
  slug: string
  kind: TaxonomyNodeKind
  setting: ClinicalSetting
  label: string
  normalizedLabel: string
  parentId?: string
  pathIds: string[]
  pathLabels: string[]
  sortOrder: number
  sectionTemplate: SectionType[]
  canonical: boolean
  lifecycleState: ContentLifecycleState
  sourceRepositoryId: string
  sourceOrganizationId?: string
  sourceOrganizationAlias?: string
  createdAt: string
  createdBy: string
  updatedAt: string
}

export interface SharedProcedureRecord {
  id: string
  slug: string
  canonicalName: string
  aliases: string[]
  setting: ClinicalSetting
  taxonomyNodeIds: {
    settingId: string
    specialtyId: string
    serviceLineId?: string
    anatomyId?: string
  }
  procedureFamilyId: string
  description?: string
  tags: string[]
  origin: ProcedureOrigin
  canonical: boolean
  lifecycleState: ContentLifecycleState
  sourceRepositoryId: string
  sourceOrganizationId?: string
  sourceOrganizationAlias?: string
  createdAt: string
  createdBy: string
  updatedAt: string
}

export interface SharedProcedureVersionRecord {
  id: string
  procedureId: string
  repositoryId: string
  organizationId?: string
  consultantId?: string
  consultantName?: string
  consultantPublicAlias?: string
  title: string
  kind: VersionKind
  sections: Procedure["sections"]
  workflowSteps: Procedure["workflowSteps"]
  metadata: {
    approach?: string
    implantSystem?: string
    variantLabel?: string
    sourceCardId?: string
  }
  contributor: RepositoryContributorIdentity
  lifecycleState: ContentLifecycleState
  automaticallyPublished: boolean
  createdAt: string
  updatedAt: string
  revision: number
}

export interface PublicationProjectionRecord {
  id: string
  procedureId: string
  versionId: string
  sourceRepositoryId: string
  sourceOrganizationId?: string
  sourceOrganizationAlias?: string
  contributorAlias?: string
  consultantAlias?: string
  identityMode: "anonymised" | "internal"
  publicationStatus: PublicationStatus
  publishedAt: string
  updatedAt: string
  engagement: {
    likes: number
    useful: number
    saves: number
    ratingCount: number
    ratingAverage: number
    comments: number
    suggestions: number
  }
}

export interface PublicationCommentRecord {
  id: string
  publicationId: string
  author: RepositoryContributorIdentity
  body: string
  createdAt: string
  updatedAt?: string
}

export interface PublicationSuggestionRecord {
  id: string
  publicationId: string
  author: RepositoryContributorIdentity
  title: string
  body: string
  status: SuggestionStatus
  createdAt: string
  updatedAt?: string
  resolvedAt?: string
  resolvedBy?: string
}

export interface PublicationRatingRecord {
  id: string
  publicationId: string
  author: RepositoryContributorIdentity
  score: 1 | 2 | 3 | 4 | 5
  createdAt: string
  updatedAt?: string
}

export interface PublicationReactionRecord {
  id: string
  publicationId: string
  author: RepositoryContributorIdentity
  reaction: CommunityReaction
  createdAt: string
}

export interface SharedRepositorySeedBundle {
  repositories: SharedRepositoryRecord[]
  taxonomyNodes: SharedTaxonomyNodeRecord[]
  canonicalProcedures: SharedProcedureRecord[]
  procedureVersions: SharedProcedureVersionRecord[]
  publications: PublicationProjectionRecord[]
}

export function slugifyShared(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function normalizeSharedLabel(value: string): string {
  return value.trim().toLowerCase()
}

export function buildRepositoryId(kind: RepositoryKind, slug: string): string {
  return `${kind}:${slug}`
}

export function buildTaxonomyNodeId(
  kind: TaxonomyNodeKind,
  setting: ClinicalSetting,
  slug: string,
): string {
  return `${kind}:${slugifyShared(setting)}:${slug}`
}

export function buildCanonicalProcedureId(setting: ClinicalSetting, slug: string): string {
  return `procedure:${slugifyShared(setting)}:${slug}`
}

export function buildProcedureVersionId(repositoryId: string, procedureId: string, suffix: string): string {
  return `version:${repositoryId}:${procedureId}:${suffix}`
}

export function buildPublicationProjectionId(versionId: string): string {
  return `publication:${versionId}`
}
