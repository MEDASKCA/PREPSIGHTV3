import specialties from "../../data/taxonomy/specialties.json"
import serviceLines from "../../data/taxonomy/service_lines.json"
import serviceLineAnatomyMap from "../../data/taxonomy/service_line_anatomy_map.json"
import anatomy from "../../data/taxonomy/anatomy.json"
import { procedures as seedProcedures } from "./seed-data/index"
import { buildSeededMemberAlias, buildSeededOrganizationAlias } from "./identity"
import { DEFAULT_SECTIONS_BY_SETTING, CLINICAL_SETTINGS, SETTING_SPECIALTIES } from "./settings"
import type { ClinicalSetting } from "./types"
import {
  buildCanonicalProcedureId,
  buildProcedureVersionId,
  buildPublicationProjectionId,
  buildRepositoryId,
  buildTaxonomyNodeId,
  normalizeSharedLabel,
  slugifyShared,
  type SharedProcedureRecord,
  type SharedProcedureVersionRecord,
  type SharedRepositoryRecord,
  type SharedRepositorySeedBundle,
  type SharedTaxonomyNodeRecord,
} from "./shared-repository"

interface SpecialtyRecord {
  id: string
  name: string
  category: string
}

interface ServiceLineRecord {
  id: string
  name: string
  specialty_id: string
}

interface AnatomyRecord {
  id: string
  name: string
  specialty_id: string
  parent_id: string | null
  sort_order: number
}

interface ServiceLineAnatomyMapRecord {
  service_line_id: string
  anatomy_id: string
  sort_order: number
}

const GLOBAL_REPOSITORY_ID = buildRepositoryId("global", "canonical")
const GLOBAL_ORGANIZATION_ID = "platform"
const GLOBAL_ORGANIZATION_ALIAS = "PSH-000"
const SEEDED_AUTHOR_UID = "seed:platform"

function buildGlobalRepository(): SharedRepositoryRecord {
  const now = new Date().toISOString()
  return {
    id: GLOBAL_REPOSITORY_ID,
    kind: "global",
    visibility: "global",
    organizationId: GLOBAL_ORGANIZATION_ID,
    internalName: "PrepSight Global Canonical Repository",
    publicAlias: GLOBAL_ORGANIZATION_ALIAS,
    settings: [...CLINICAL_SETTINGS],
    createdAt: now,
    createdBy: SEEDED_AUTHOR_UID,
    updatedAt: now,
    publicationMode: "automatic",
  }
}

function buildSettingNodes(now: string): SharedTaxonomyNodeRecord[] {
  return CLINICAL_SETTINGS.map((setting, index) => ({
    id: buildTaxonomyNodeId("setting", setting, slugifyShared(setting)),
    slug: slugifyShared(setting),
    kind: "setting",
    setting,
    label: setting,
    normalizedLabel: normalizeSharedLabel(setting),
    pathIds: [],
    pathLabels: [],
    sortOrder: index,
    sectionTemplate: DEFAULT_SECTIONS_BY_SETTING[setting] ?? [],
    canonical: true,
    lifecycleState: "active",
    sourceRepositoryId: GLOBAL_REPOSITORY_ID,
    sourceOrganizationId: GLOBAL_ORGANIZATION_ID,
    sourceOrganizationAlias: GLOBAL_ORGANIZATION_ALIAS,
    createdAt: now,
    createdBy: SEEDED_AUTHOR_UID,
    updatedAt: now,
  }))
}

function buildSpecialtyNodes(now: string): SharedTaxonomyNodeRecord[] {
  const settingNodeBySetting = new Map(
    CLINICAL_SETTINGS.map((setting) => [setting, buildTaxonomyNodeId("setting", setting, slugifyShared(setting))]),
  )

  return CLINICAL_SETTINGS.flatMap((setting) =>
    (SETTING_SPECIALTIES[setting] ?? []).map((label, index) => ({
      id: buildTaxonomyNodeId("specialty", setting, slugifyShared(label)),
      slug: slugifyShared(label),
      kind: "specialty" as const,
      setting,
      label,
      normalizedLabel: normalizeSharedLabel(label),
      parentId: settingNodeBySetting.get(setting),
      pathIds: [settingNodeBySetting.get(setting) ?? ""].filter(Boolean),
      pathLabels: [setting],
      sortOrder: index,
      sectionTemplate: DEFAULT_SECTIONS_BY_SETTING[setting] ?? [],
      canonical: true,
      lifecycleState: "active",
      sourceRepositoryId: GLOBAL_REPOSITORY_ID,
      sourceOrganizationId: GLOBAL_ORGANIZATION_ID,
      sourceOrganizationAlias: GLOBAL_ORGANIZATION_ALIAS,
      createdAt: now,
      createdBy: SEEDED_AUTHOR_UID,
      updatedAt: now,
    })),
  )
}

function buildOperatingTheatreDeeperNodes(now: string): SharedTaxonomyNodeRecord[] {
  const specialtyRows = specialties as SpecialtyRecord[]
  const serviceLineRows = serviceLines as ServiceLineRecord[]
  const anatomyRows = anatomy as AnatomyRecord[]
  const mapRows = serviceLineAnatomyMap as ServiceLineAnatomyMapRecord[]
  const setting = "Operating Theatre" as const

  const allowedSpecialties = specialtyRows.filter((row) => row.category === setting)
  const specialtyIdToNodeId = new Map<string, string>()

  for (const row of allowedSpecialties) {
    specialtyIdToNodeId.set(row.id, buildTaxonomyNodeId("specialty", setting, slugifyShared(row.name)))
  }

  const serviceLineNodes = serviceLineRows
    .filter((row) => specialtyIdToNodeId.has(row.specialty_id))
    .map((row, index) => {
      const parentId = specialtyIdToNodeId.get(row.specialty_id)
      const specialtyLabel = allowedSpecialties.find((entry) => entry.id === row.specialty_id)?.name ?? setting
      return {
        id: buildTaxonomyNodeId("service_line", setting, row.id.toLowerCase()),
        slug: row.id.toLowerCase(),
        kind: "service_line" as const,
        setting,
        label: row.name,
        normalizedLabel: normalizeSharedLabel(row.name),
        parentId,
        pathIds: [buildTaxonomyNodeId("setting", setting, slugifyShared(setting)), parentId ?? ""].filter(Boolean),
        pathLabels: [setting, specialtyLabel],
        sortOrder: index,
        sectionTemplate: DEFAULT_SECTIONS_BY_SETTING[setting] ?? [],
        canonical: true,
        lifecycleState: "active" as const,
        sourceRepositoryId: GLOBAL_REPOSITORY_ID,
        sourceOrganizationId: GLOBAL_ORGANIZATION_ID,
        sourceOrganizationAlias: GLOBAL_ORGANIZATION_ALIAS,
        createdAt: now,
        createdBy: SEEDED_AUTHOR_UID,
        updatedAt: now,
      }
    })

  const anatomyParentMap = new Map<string, string>()
  for (const row of mapRows) {
    if (!anatomyParentMap.has(row.anatomy_id)) {
      anatomyParentMap.set(row.anatomy_id, buildTaxonomyNodeId("service_line", setting, row.service_line_id.toLowerCase()))
    }
  }

  const anatomyNodes = anatomyRows
    .filter((row) => anatomyParentMap.has(row.id) || row.parent_id)
    .map((row) => {
      const specialtyLabel = allowedSpecialties.find((entry) => entry.id === row.specialty_id)?.name ?? setting
      const directParentId =
        row.parent_id ? buildTaxonomyNodeId("anatomy", setting, row.parent_id.toLowerCase()) : anatomyParentMap.get(row.id)
      return {
        id: buildTaxonomyNodeId("anatomy", setting, row.id.toLowerCase()),
        slug: row.id.toLowerCase(),
        kind: "anatomy" as const,
        setting,
        label: row.name,
        normalizedLabel: normalizeSharedLabel(row.name),
        parentId: directParentId,
        pathIds: [
          buildTaxonomyNodeId("setting", setting, slugifyShared(setting)),
          buildTaxonomyNodeId("specialty", setting, slugifyShared(specialtyLabel)),
          directParentId ?? "",
        ].filter(Boolean),
        pathLabels: [setting, specialtyLabel],
        sortOrder: row.sort_order ?? 0,
        sectionTemplate: DEFAULT_SECTIONS_BY_SETTING[setting] ?? [],
        canonical: true,
        lifecycleState: "active" as const,
        sourceRepositoryId: GLOBAL_REPOSITORY_ID,
        sourceOrganizationId: GLOBAL_ORGANIZATION_ID,
        sourceOrganizationAlias: GLOBAL_ORGANIZATION_ALIAS,
        createdAt: now,
        createdBy: SEEDED_AUTHOR_UID,
        updatedAt: now,
      }
    })

  return [...serviceLineNodes, ...anatomyNodes]
}

function buildCanonicalProcedures(now: string): SharedProcedureRecord[] {
  return seedProcedures.map((procedure) => {
    const procedureSlug = slugifyShared(procedure.id || procedure.name)
    return {
      id: buildCanonicalProcedureId(procedure.setting, procedureSlug),
      slug: procedureSlug,
      canonicalName: procedure.name,
      aliases: procedure.aliases ?? [],
      setting: procedure.setting,
      taxonomyNodeIds: {
        settingId: buildTaxonomyNodeId("setting", procedure.setting, slugifyShared(procedure.setting)),
        specialtyId: buildTaxonomyNodeId("specialty", procedure.setting, slugifyShared(procedure.specialty)),
        serviceLineId: procedure.service_line_id
          ? buildTaxonomyNodeId("service_line", procedure.setting, procedure.service_line_id.toLowerCase())
          : undefined,
        anatomyId: procedure.anatomy_id
          ? buildTaxonomyNodeId("anatomy", procedure.setting, procedure.anatomy_id.toLowerCase())
          : undefined,
      },
      procedureFamilyId: procedure.familyId,
      description: procedure.description,
      tags: [
        procedure.setting,
        procedure.specialty,
        ...(procedure.aliases ?? []),
        ...(procedure.approach ? [procedure.approach] : []),
        ...(procedure.implantSystem ? [procedure.implantSystem] : []),
      ],
      origin: "seed",
      canonical: true,
      lifecycleState: "active",
      sourceRepositoryId: GLOBAL_REPOSITORY_ID,
      sourceOrganizationId: GLOBAL_ORGANIZATION_ID,
      sourceOrganizationAlias: GLOBAL_ORGANIZATION_ALIAS,
      createdAt: now,
      createdBy: SEEDED_AUTHOR_UID,
      updatedAt: now,
    }
  })
}

function buildCanonicalVersions(
  procedures: SharedProcedureRecord[],
  now: string,
): SharedProcedureVersionRecord[] {
  return procedures.map((procedure, index) => ({
    id: buildProcedureVersionId(GLOBAL_REPOSITORY_ID, procedure.id, "canonical"),
    procedureId: procedure.id,
    repositoryId: GLOBAL_REPOSITORY_ID,
    organizationId: GLOBAL_ORGANIZATION_ID,
    title: procedure.canonicalName,
    kind: "canonical",
    sections: seedProcedures[index]?.sections ?? [],
    workflowSteps: seedProcedures[index]?.workflowSteps ?? [],
    metadata: {
      approach: seedProcedures[index]?.approach,
      implantSystem: seedProcedures[index]?.implantSystem,
      variantLabel: seedProcedures[index]?.variantLabel,
      sourceCardId: seedProcedures[index]?.id,
    },
    contributor: {
      uid: SEEDED_AUTHOR_UID,
      organizationId: GLOBAL_ORGANIZATION_ID,
      internalDisplayName: "PrepSight Seed Import",
      publicAlias: buildSeededMemberAlias(`seed:${procedure.id}`, {
        departments: [procedure.setting],
        specialtiesOfInterest: [procedure.canonicalName],
        role: "clinical_author",
      }),
    },
    lifecycleState: "active",
    automaticallyPublished: true,
    createdAt: now,
    updatedAt: now,
    revision: 1,
  }))
}

function buildCanonicalPublications(
  procedures: SharedProcedureRecord[],
  versions: SharedProcedureVersionRecord[],
  now: string,
) {
  const versionByProcedureId = new Map(versions.map((version) => [version.procedureId, version]))
  return procedures.map((procedure) => {
    const version = versionByProcedureId.get(procedure.id)
    return {
      id: buildPublicationProjectionId(version?.id ?? procedure.id),
      procedureId: procedure.id,
      versionId: version?.id ?? procedure.id,
      sourceRepositoryId: GLOBAL_REPOSITORY_ID,
      sourceOrganizationId: GLOBAL_ORGANIZATION_ID,
      sourceOrganizationAlias: GLOBAL_ORGANIZATION_ALIAS,
      contributorAlias: version?.contributor.publicAlias,
      identityMode: "anonymised" as const,
      publicationStatus: "active" as const,
      publishedAt: now,
      updatedAt: now,
      engagement: {
        likes: 0,
        useful: 0,
        saves: 0,
        ratingCount: 0,
        ratingAverage: 0,
        comments: 0,
        suggestions: 0,
      },
    }
  })
}

export function buildSharedRepositorySeedBundle(): SharedRepositorySeedBundle {
  const now = new Date().toISOString()
  const repositories = [buildGlobalRepository()]
  const taxonomyNodes = [
    ...buildSettingNodes(now),
    ...buildSpecialtyNodes(now),
    ...buildOperatingTheatreDeeperNodes(now),
  ]
  const canonicalProcedures = buildCanonicalProcedures(now)
  const procedureVersions = buildCanonicalVersions(canonicalProcedures, now)
  const publications = buildCanonicalPublications(canonicalProcedures, procedureVersions, now)

  return {
    repositories,
    taxonomyNodes,
    canonicalProcedures,
    procedureVersions,
    publications,
  }
}

export function buildSeededWorkspaceAlias(workspaceName: string): string {
  return buildSeededOrganizationAlias(workspaceName)
}
