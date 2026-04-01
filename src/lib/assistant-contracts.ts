import type { ClinicalSetting, Section } from "./types"
import type { MockWalkthrough } from "./video-mocks"
import type { AssistantLauncherItem } from "./assistant-launchers"

export type AssistantEntityKind =
  | "system"
  | "component"
  | "product"
  | "procedure"

export type AssistantTone =
  | "neutral"
  | "helpful"
  | "confident"
  | "cautious"

export type AssistantResponseMode =
  | "entity_definition"
  | "table"
  | "compact_card"
  | "launcher"
  | "actions_only"
  | "text_only"
  | "clarification"

export type AssistantGroundingLayer =
  | "fixed_data"
  | "authored_card"
  | "catalogue"
  | "heuristic"

export interface AssistantAction {
  label: string
  href: string
  tone?: "primary" | "secondary"
}

export interface AssistantTable {
  title?: string
  columns: string[]
  rows: string[][]
  rowHrefs?: string[]
}

export interface AssistantStat {
  label: string
  value: string
}

export interface AssistantEntityDefinition {
  label: string
  kind: AssistantEntityKind
  description: string
}

export interface AssistantGroundingSummary {
  source: AssistantGroundingLayer
  confidence: number
  ambiguity: "none" | "low" | "high"
  note?: string
}

export interface AssistantClarificationOption {
  id: string
  label: string
  description?: string
  href?: string
}

export interface AssistantClarification {
  kind: "procedure" | "approach" | "system" | "browse_scope" | "general"
  question: string
  options?: AssistantClarificationOption[]
}

export interface AssistantCompactCard {
  title: string
  meta: string
  summary?: string
  checklist: string[]
  href?: string
}

export interface AssistantMatchedProcedure {
  id: string
  name: string
  specialty: string
  setting: string
  sectionsCount: number
  fixedCount: number
  editableCount: number
  implantSystem?: string
  href: string
}

export interface AssistantVariantChoice {
  id: string
  label: string
  description?: string
  href?: string
}

export interface AssistantLauncher {
  title: string
  items: AssistantLauncherItem[]
}

export interface AssistantWalkthroughGroup {
  title: string
  items: MockWalkthrough[]
}

export interface AssistantCarryContext {
  procedureId?: string
  procedureName?: string
  specialty?: string
  browseLabel?: string
  entityLabel?: string
  entityKind?: AssistantEntityKind
  entityDescription?: string
  variantId?: string
  variantName?: string
  systemId?: string
  systemName?: string
  lastIntentId?: string
}

export interface AssistantReply {
  /**
   * Main user-facing response body.
   */
  text: string

  /**
   * Optional short heading for richer chat layouts.
   */
  title?: string

  /**
   * Optional presentational hint for UI styling.
   */
  tone?: AssistantTone

  entityDefinition?: AssistantEntityDefinition
  actions?: AssistantAction[]
  table?: AssistantTable
  stats?: AssistantStat[]
  chips?: string[]

  launcher?: AssistantLauncher
  compactCard?: AssistantCompactCard
  walkthroughs?: AssistantWalkthroughGroup

  matchedProcedures?: AssistantMatchedProcedure[]
  variantChoices?: AssistantVariantChoice[]

  /**
   * Used when the assistant should ask a narrow, answerable follow-up
   * rather than falling back to a vague prompt.
   */
  clarification?: AssistantClarification

  /**
   * Optional summary of how strongly grounded the reply is.
   */
  grounding?: AssistantGroundingSummary

  /**
   * Optional next-turn context to keep the assistant anchored.
   */
  carry?: AssistantCarryContext

  /**
   * Optional short explanation for debug panels or traces.
   * Not required for end-user display.
   */
  debugSummary?: string
}

export interface AssistantPendingState {
  label: string
  detail: string
  delay: number
}

export interface AssistantContext {
  pageKind:
    | "home"
    | "setting"
    | "specialty"
    | "anatomy"
    | "card"
    | "catalogue"
    | "unknown"

  title: string
  description: string

  setting?: ClinicalSetting
  specialty?: string

  serviceLine?: string
  serviceLineId?: string

  anatomy?: string
  anatomyId?: string

  procedureId?: string
  procedureName?: string

  variantId?: string
  variantName?: string

  systemId?: string
  systemName?: string

  sections?: Section[]
  stats?: AssistantStat[]
}

export interface AssistantDecisionTrace {
  intentId: string
  confidence: number
  pageKind: AssistantContext["pageKind"]
  responseMode: AssistantResponseMode

  activeEntity?: {
    label: string
    kind: AssistantEntityKind
  }

  matchedProcedureIds: string[]
  browseLabel?: string
  groundingLayers: AssistantGroundingLayer[]

  /**
   * Optional short note explaining why this route was chosen.
   */
  rationale?: string
}