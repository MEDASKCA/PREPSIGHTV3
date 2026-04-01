import specialties from "../../data/taxonomy/specialties.json"
import serviceLines from "../../data/taxonomy/service_lines.json"
import serviceLineAnatomyMap from "../../data/taxonomy/service_line_anatomy_map.json"
import anatomy from "../../data/taxonomy/anatomy.json"

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

interface ServiceLineAnatomyMapRecord {
  id: string
  service_line_id: string
  anatomy_id: string
  sort_order: number
}

interface AnatomyRecord {
  id: string
  name: string
  specialty_id: string
  parent_id: string | null
  sort_order: number
  tags?: string[]
}

const CURATED_ANATOMY_ORDER: Record<string, string[]> = {
  SL_ARTHROPLASTY: ["Hip", "Knee", "Shoulder", "Elbow", "Ankle", "Wrist", "Hand", "Foot"],
  SL_FOOT_AND_ANKLE_SURGERY: ["Ankle", "Hindfoot", "Midfoot", "Forefoot", "Digits / Toes"],
  SL_HAND_AND_WRIST_SURGERY: ["Wrist", "Hand", "Digits", "Forearm"],
  SL_HIP_PRESERVATION: ["Hip"],
  SL_LIMB_RECONSTRUCTION_DEFORMITY: ["Femur", "Tibia", "Fibula", "Upper Limb", "Whole Limb"],
  SL_ORTHOPAEDIC_INFECTION: ["Hip", "Knee", "Shoulder", "Long Bones", "Soft Tissue"],
  SL_ORTHOPAEDIC_ONCOLOGY: ["Femur", "Tibia", "Humerus", "Pelvis", "Spine"],
  SL_ORTHOPAEDIC_TRAUMA_SURGERY: ["Shoulder", "Elbow", "Wrist", "Hip", "Femur", "Knee", "Tibia", "Foot & Ankle"],
  SL_PAEDIATRIC_ORTHOPAEDIC_SURGERY: ["Hip", "Spine", "Lower Limb", "Foot", "Upper Limb"],
  SL_REVISION_ARTHROPLASTY: ["Hip", "Knee", "Shoulder", "Elbow"],
  SL_SHOULDER_AND_ELBOW_SURGERY: ["Shoulder", "Elbow"],
  SL_SPINE_SURGERY: ["Cervical Spine", "Thoracic Spine", "Lumbar Spine", "Sacrum"],
  SL_SPORTS_AND_KNEE_SURGERY: ["Knee", "Shoulder", "Hip", "Ankle"],
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase()
}

const anatomyRows = anatomy as AnatomyRecord[]
const serviceLineRows = serviceLines as ServiceLineRecord[]
const serviceLineAnatomyRows = serviceLineAnatomyMap as ServiceLineAnatomyMapRecord[]

const operatingTheatreSpecialties = (specialties as SpecialtyRecord[]).filter(
  (item) => item.category === "Operating Theatre"
)

const serviceLineIdsWithAnatomy = new Set(
  serviceLineAnatomyRows.map((row) => row.service_line_id)
)

const specialtyIdByName = new Map<string, string>()
for (const item of operatingTheatreSpecialties) {
  specialtyIdByName.set(normalizeKey(item.name), item.id)
}

const displayAliases: Record<string, string> = {
  "trauma and orthopaedics": "SPEC_TRAUMA_ORTHOPAEDICS",
  "otolaryngology (ear, nose and throat)": "SPEC_ENT",
  "oral and maxillofacial": "SPEC_OMFS",
  "dental and oral": "SPEC_DENTAL_ORAL_SURGERY",
  "plastic and reconstructive": "SPEC_PLASTIC_RECONSTRUCTIVE_SURGERY",
  "cardiothoracic": "SPEC_CARDIOTHORACIC_SURGERY",
  "vascular": "SPEC_VASCULAR_SURGERY",
  "paediatric": "SPEC_PAEDIATRIC_SURGERY",
  "podiatric": "SPEC_PODIATRIC_SURGERY",
}

export function getOperatingTheatreSpecialtyIdByLabel(label: string): string | undefined {
  const key = normalizeKey(label)
  return displayAliases[key] ?? specialtyIdByName.get(key)
}

export function getServiceLinesForSpecialty(specialtyId: string): ServiceLineRecord[] {
  const rows = serviceLineRows.filter((item) => item.specialty_id === specialtyId)

  const byName = new Map<string, ServiceLineRecord[]>()
  for (const row of rows) {
    const key = normalizeKey(row.name)
    const list = byName.get(key) ?? []
    list.push(row)
    byName.set(key, list)
  }

  const deduped: ServiceLineRecord[] = []
  for (const candidates of byName.values()) {
    const preferred = candidates.find((row) => serviceLineIdsWithAnatomy.has(row.id))
    deduped.push(preferred ?? candidates[0])
  }

  return deduped.sort((a, b) => a.name.localeCompare(b.name))
}

export function getAnatomyForServiceLine(serviceLineId: string): AnatomyRecord[] {
  const mapRows = serviceLineAnatomyRows
    .filter((row) => row.service_line_id === serviceLineId)
    .sort((a, b) => a.sort_order - b.sort_order)

  const anatomyById = new Map<string, AnatomyRecord>()
  for (const row of anatomyRows) {
    anatomyById.set(row.id, row)
  }

  const resolved: AnatomyRecord[] = []
  for (const row of mapRows) {
    const found = anatomyById.get(row.anatomy_id)
    if (found) resolved.push(found)
  }

  const byName = new Map<string, AnatomyRecord[]>()
  for (const row of resolved) {
    const key = normalizeKey(row.name)
    const list = byName.get(key) ?? []
    list.push(row)
    byName.set(key, list)
  }

  const deduped = Array.from(byName.values()).map((candidates) => {
    const preferredWithParent = candidates.find(
      (row) => row.id.startsWith("ANAT_SPEC_") && row.parent_id,
    )
    const preferredScoped = candidates.find((row) =>
      row.id.startsWith("ANAT_SPEC_"),
    )
    return preferredWithParent ?? preferredScoped ?? candidates[0]
  })

  const curatedOrder = CURATED_ANATOMY_ORDER[serviceLineId]
  if (curatedOrder) {
    const rank = new Map(
      curatedOrder.map((name, index) => [normalizeKey(name), index]),
    )
    return deduped
      .filter((row) => rank.has(normalizeKey(row.name)))
      .sort(
        (a, b) =>
          (rank.get(normalizeKey(a.name)) ?? Number.MAX_SAFE_INTEGER) -
          (rank.get(normalizeKey(b.name)) ?? Number.MAX_SAFE_INTEGER),
      )
  }

  return deduped.sort((a, b) => {
    const aScoped = a.id.startsWith("ANAT_SPEC_") ? 0 : 1
    const bScoped = b.id.startsWith("ANAT_SPEC_") ? 0 : 1
    if (aScoped !== bScoped) return aScoped - bScoped
    return a.name.localeCompare(b.name)
  })
}

export function getServiceLineNameById(serviceLineId: string): string | undefined {
  const found = serviceLineRows.find((item) => item.id === serviceLineId)
  return found?.name
}

export function getAnatomyNameById(anatomyId: string): string | undefined {
  const found = anatomyRows.find((item) => item.id === anatomyId)
  return found?.name
}

export function getDescendantAnatomyIds(anatomyId: string): string[] {
  const collected = new Set<string>()

  function walk(id: string) {
    if (collected.has(id)) return
    collected.add(id)

    for (const row of anatomyRows) {
      if (row.parent_id === id) {
        walk(row.id)
      }
    }
  }

  walk(anatomyId)
  return Array.from(collected)
}

export function getChildAnatomy(parentId: string): AnatomyRecord[] {
  return anatomyRows
    .filter((row) => row.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
}
