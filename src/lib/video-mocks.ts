import type { Procedure } from "./types"

export interface MockWalkthrough {
  id: string
  title: string
  creator: string
  duration: string
  status: "PrepSight editorial" | "Contributor" | "Community"
  reason: string
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function getMockWalkthroughs(procedure: Procedure): MockWalkthrough[] {
  const base = slugify(procedure.id || procedure.name)
  const systemName = procedure.implantSystem || "system setup"
  const approachName = procedure.approach || "standard workflow"

  return [
    {
      id: `${base}-prep-basics`,
      title: `${procedure.name} prep basics`,
      creator: "PrepSight editorial",
      duration: "6 min",
      status: "PrepSight editorial",
      reason: "Workflow overview",
    },
    {
      id: `${base}-system-overview`,
      title: `${systemName} tray and instrumentation overview`,
      creator: "A. Morgan",
      duration: "9 min",
      status: "Contributor",
      reason: "System explainer",
    },
    {
      id: `${base}-variation-note`,
      title: `${procedure.name}: what changes for ${approachName.toLowerCase()}`,
      creator: "Community roundtable",
      duration: "4 min",
      status: "Community",
      reason: "Variation note",
    },
  ]
}
