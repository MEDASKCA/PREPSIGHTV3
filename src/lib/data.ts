import specialties from "../../data/taxonomy/specialties.json"
import anaesthesiaProcedures from "../../data/procedures/anaesthesia/procedures_anaesthesia.json"
import cardiothoracicProcedures from "../../data/procedures/cardiothoracic/procedures_cardiothoracic.json"
import dentalAndOralProcedures from "../../data/procedures/dental_and_oral/procedures_dental_and_oral.json"
import generalSurgeryProcedures from "../../data/procedures/general_surgery/procedures_general_surgery.json"
import gynaecologyProcedures from "../../data/procedures/gynaecology/procedures_gynaecology.json"
import neurosurgeryProcedures from "../../data/procedures/neurosurgery/procedures_neurosurgery.json"
import obstetricsProcedures from "../../data/procedures/obstetrics/procedures_obstetrics.json"
import ophthalmologyProcedures from "../../data/procedures/opthalmology/procedures_opthalmology.json"
import oralAndMaxillofacialProcedures from "../../data/procedures/oral_and_maxillofacial/procedures_oral_and_maxillofacial.json"
import otolaryngologyProcedures from "../../data/procedures/otolaryngology/procedures_otolaryngology.json"
import paediatricProcedures from "../../data/procedures/paediatric/procedures_paediatric.json"
import plasticAndReconstructiveProcedures from "../../data/procedures/plastic_and_reconstructive/procedures_plastic_and_reconstructive.json"
import podiatricProcedures from "../../data/procedures/podiatric/procedures_podiatric.json"
import traumaAndOrthopaedicsProcedures from "../../data/procedures/trauma_and_orthopaedics/procedures_trauma_and_orthopaedics.json"
import urologyProcedures from "../../data/procedures/urology/procedures_urology.json"
import vascularProcedures from "../../data/procedures/vascular/procedures_vascular.json"
import { ClinicalSetting, Procedure } from "./types"
import { canonicalSpecialtyName } from "./specialty-normalization"
import { referenceProcedures } from "./reference-data"

function normalizeText(v?: string): string {
  return (v ?? "").trim().toLowerCase()
}

export const SEED_SUPERSEDES: Record<string, string> = {}

interface RegistryProcedureRow {
  id: string
  name: string
  specialty_id?: string
  service_line_id?: string
  anatomy_id?: string
  aliases?: string[]
  description?: string
  status?: string
  subanatomy_group?: string
}

interface SpecialtyRow {
  id: string
  name: string
  category: string
}

const operatingTheatreSetting: ClinicalSetting = "Operating Theatre"

const specialtyNameById = new Map(
  (specialties as SpecialtyRow[])
    .filter((entry) => entry.category === operatingTheatreSetting)
    .map((entry) => [entry.id, canonicalSpecialtyName(operatingTheatreSetting, entry.name)]),
)

const registryProcedureRows: RegistryProcedureRow[] = [
  ...(anaesthesiaProcedures as RegistryProcedureRow[]),
  ...(cardiothoracicProcedures as RegistryProcedureRow[]),
  ...(dentalAndOralProcedures as RegistryProcedureRow[]),
  ...(generalSurgeryProcedures as RegistryProcedureRow[]),
  ...(gynaecologyProcedures as RegistryProcedureRow[]),
  ...(neurosurgeryProcedures as RegistryProcedureRow[]),
  ...(obstetricsProcedures as RegistryProcedureRow[]),
  ...(ophthalmologyProcedures as RegistryProcedureRow[]),
  ...(oralAndMaxillofacialProcedures as RegistryProcedureRow[]),
  ...(otolaryngologyProcedures as RegistryProcedureRow[]),
  ...(paediatricProcedures as RegistryProcedureRow[]),
  ...(plasticAndReconstructiveProcedures as RegistryProcedureRow[]),
  ...(podiatricProcedures as RegistryProcedureRow[]),
  ...(traumaAndOrthopaedicsProcedures as RegistryProcedureRow[]),
  ...(urologyProcedures as RegistryProcedureRow[]),
  ...(vascularProcedures as RegistryProcedureRow[]),
]

const registryProcedures: Procedure[] = registryProcedureRows.map((procedure) => ({
  id: procedure.id,
  familyId: procedure.id,
  name: procedure.name,
  cardScope: "shared",
  setting: operatingTheatreSetting,
  specialty: specialtyNameById.get(procedure.specialty_id ?? "") ?? "Operating Theatre",
  specialty_id: procedure.specialty_id,
  service_line_id: procedure.service_line_id,
  anatomy_id: procedure.anatomy_id,
  subanatomy_group: procedure.subanatomy_group,
  aliases: procedure.aliases ?? [],
  description: procedure.description,
  status: procedure.status ?? "placeholder",
  sections: [],
  workflowSteps: [],
}))

const mergedProcedures = new Map<string, Procedure>()

for (const procedure of registryProcedures) {
  mergedProcedures.set(procedure.id, procedure)
}

for (const procedure of referenceProcedures) {
  mergedProcedures.set(procedure.id, {
    ...procedure,
    cardScope: procedure.cardScope ?? "shared",
    specialty: canonicalSpecialtyName(procedure.setting, procedure.specialty),
  })
}

export const procedures: Procedure[] = Array.from(mergedProcedures.values())

export function getProcedureById(id: string): Procedure | undefined {
  return procedures.find((p) => normalizeText(p.id) === normalizeText(id))
}

export function getProceduresBySettingAndSpecialty(): Map<ClinicalSetting, Map<string, Procedure[]>> {
  const outer = new Map<ClinicalSetting, Map<string, Procedure[]>>()

  for (const p of procedures) {
    if (!outer.has(p.setting)) {
      outer.set(p.setting, new Map())
    }

    const inner = outer.get(p.setting)!
    const specialty = canonicalSpecialtyName(p.setting, p.specialty)
    const list = inner.get(specialty) ?? []
    list.push(p)
    inner.set(specialty, list)
  }

  return outer
}

export function getProceduresBySetting(setting: ClinicalSetting): Procedure[] {
  return procedures.filter((p) => p.setting === setting)
}

export function getProceduresBySpecialty(setting: ClinicalSetting, specialty: string): Procedure[] {
  const requestedSpecialty = canonicalSpecialtyName(setting, specialty)

  return procedures.filter(
    (p) =>
      p.setting === setting &&
      canonicalSpecialtyName(p.setting, p.specialty) === requestedSpecialty,
  )
}
