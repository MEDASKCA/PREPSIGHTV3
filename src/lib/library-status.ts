import { procedures } from "./data"
import { canonicalSpecialtyName } from "./specialty-normalization"
import type { ClinicalSetting, Procedure } from "./types"

export type LibraryAvailability = "live" | "in_progress"

function matchesSpecialty(procedure: Procedure, setting: ClinicalSetting, specialty: string) {
  return (
    procedure.setting === setting &&
    canonicalSpecialtyName(procedure.setting, procedure.specialty) ===
      canonicalSpecialtyName(setting, specialty)
  )
}

export function getSpecialtyAvailability(
  setting: ClinicalSetting,
  specialty: string,
): LibraryAvailability {
  return procedures.some((procedure) => matchesSpecialty(procedure, setting, specialty))
    ? "live"
    : "in_progress"
}

export function getLiveProcedureCountForSpecialty(
  setting: ClinicalSetting,
  specialty: string,
): number {
  return procedures.filter((procedure) => matchesSpecialty(procedure, setting, specialty)).length
}

export function getAnatomyLibraryMessage(options: {
  setting?: ClinicalSetting
  specialty?: string
  anatomy?: string
  hasLiveProcedures: boolean
}) {
  const { specialty, anatomy, hasLiveProcedures } = options

  if (hasLiveProcedures) {
    return {
      eyebrow: "Reference Slice",
      title: "Validated cards are live here.",
      message:
        "This anatomy is currently powered by the canonical PrepSight reference dataset. Future procedures should plug into the same schema rather than needing new wiring.",
    }
  }

  const specialtyLabel = specialty ?? "This specialty"
  const anatomyLabel = anatomy ?? "this anatomy"

  return {
    eyebrow: "Library In Build",
    title: `${specialtyLabel} is visible, but ${anatomyLabel} is not validated yet.`,
    message:
      "Keep browsing the shell, but treat this branch as under construction. Use the New card flow to propose the next procedure, then review and publish it into the shared reference library.",
  }
}

