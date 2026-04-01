import { getAnatomyNameById, getServiceLineNameById } from "@/lib/operating-theatre-taxonomy"
import type { Procedure } from "@/lib/types"

function clean(value?: string | null) {
  return value?.trim() || undefined
}

export function getProcedureHierarchy(procedure: Procedure) {
  const specialty = clean(procedure.specialty) ?? "General"
  const subspecialty = clean(
    procedure.service_line_id ? getServiceLineNameById(procedure.service_line_id) : undefined,
  )
  const anatomy = clean(
    procedure.subanatomy_group || (procedure.anatomy_id ? getAnatomyNameById(procedure.anatomy_id) : undefined),
  )

  return { specialty, subspecialty, anatomy }
}

export function formatProcedureHierarchy(
  procedure: Procedure,
  separator = " / ",
) {
  const { specialty, subspecialty, anatomy } = getProcedureHierarchy(procedure)
  return [specialty, subspecialty, anatomy].filter(Boolean).join(separator)
}
