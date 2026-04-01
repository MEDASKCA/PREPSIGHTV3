import type { Procedure, Section, WorkflowStep } from "./types"

export interface ReferenceProcedure extends Procedure {
  aliases: string[]
  workflowSteps: WorkflowStep[]
  defaultVariantId: string
  defaultSystemId: string
}

export interface ReferenceVariant {
  id: string
  procedure_id: string
  setting?: string
  specialty_id?: string
  service_line_id?: string
  anatomy_id?: string
  name: string
  variant_type?: string
  variant_value?: string
  approach?: string
  description?: string
  sort_order?: number
  status?: string
  aliases?: string[]
}

export interface ReferenceProcedureSystemMapRow {
  id: string
  procedure_variant_id: string
  system_id: string
  is_default?: boolean
  status?: string
}

export interface ReferenceSystem {
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

export interface ReferenceSupplier {
  id: string
  name: string
  aliases?: string[]
  status?: string
}

export interface ReferenceProcedureSystemCard extends ReferenceProcedureSystemMapRow {
  sections: Section[]
  workflowSteps?: WorkflowStep[]
}
