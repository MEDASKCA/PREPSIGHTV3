import { Surgeon, SurgeonProcedure } from "./types"

// ── Surgeon Registry ──────────────────────────────────────────────────────────
// These are the "drivers". Each surgeon can be assigned to multiple procedures.
// Multiple surgeons can share the same procedure (different garage, same car model).

// Surgeon data is user-generated — staff add surgeons when creating or editing procedure cards.
export const surgeons: Surgeon[] = []

// ── Surgeon Garages ───────────────────────────────────────────────────────────
// Each entry = one surgeon's assignment of one procedure template.
// Same procedure can appear in multiple surgeons' garages.
// Optional fields override the template default for that surgeon.

// Surgeon-procedure assignments are user-generated — added when staff create or edit procedure cards.
export const surgeonProcedures: SurgeonProcedure[] = []

// ── Helper functions ──────────────────────────────────────────────────────────

export function getSurgeonById(id: string): Surgeon | undefined {
  return surgeons.find((s) => s.id === id)
}

export function getSurgeonsBySpecialty(specialty: string): Surgeon[] {
  return surgeons.filter((s) => s.specialty === specialty)
}

/** All procedure assignments for a given surgeon (their "garage") */
export function getSurgeonLibrary(surgeonId: string): SurgeonProcedure[] {
  return surgeonProcedures.filter((sp) => sp.surgeonId === surgeonId)
}

/** All surgeons who have a given procedure in their garage */
export function getSurgeonsForProcedure(procedureId: string): Surgeon[] {
  const ids = new Set(
    surgeonProcedures
      .filter((sp) => sp.procedureId === procedureId)
      .map((sp) => sp.surgeonId)
  )
  return surgeons.filter((s) => ids.has(s.id))
}

/** Specific surgeon-procedure assignment (their version of that car) */
export function getSurgeonProcedure(surgeonId: string, procedureId: string): SurgeonProcedure | undefined {
  return surgeonProcedures.find(
    (sp) => sp.surgeonId === surgeonId && sp.procedureId === procedureId
  )
}
