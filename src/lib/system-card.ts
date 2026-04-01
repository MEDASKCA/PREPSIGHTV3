import type { Procedure, Section } from "./types"
import { getProcedureSystemCard } from "./variants"

function cloneSections(sections: Section[]): Section[] {
  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({ ...item })),
    externalLinks: section.externalLinks?.map((link) => ({ ...link })),
    alternatives: section.alternatives ? [...section.alternatives] : undefined,
    dischargeCriteria: section.dischargeCriteria ? [...section.dischargeCriteria] : undefined,
    commonComplications: section.commonComplications ? [...section.commonComplications] : undefined,
  }))
}

export function buildSystemCardSections(
  procedure: Procedure,
  variantId: string,
  _variantName: string,
  systemId: string,
  _systemName: string,
): Section[] {
  const mappedCard = getProcedureSystemCard(variantId, systemId)
  if (mappedCard) {
    return cloneSections(mappedCard.sections)
  }

  return cloneSections(procedure.sections)
}
