import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const ROOT = process.cwd()

// ── Slug ↔ directory mapping ────────────────────────────────────────────────
const SPEC_ID_TO_SLUG: Record<string, string> = {
  SPEC_TRAUMA_ORTHOPAEDICS:             "trauma_and_orthopaedics",
  SPEC_GENERAL_SURGERY:                 "general_surgery",
  SPEC_UROLOGY:                         "urology",
  SPEC_GYNECOLOGY:                      "gynaecology",
  SPEC_OBSTETRICS:                      "obstetrics",
  SPEC_ENT:                             "otolaryngology",
  SPEC_OMFS:                            "oral_and_maxillofacial",
  SPEC_DENTAL_ORAL_SURGERY:             "dental_and_oral",
  SPEC_PLASTIC_RECONSTRUCTIVE_SURGERY:  "plastic_and_reconstructive",
  SPEC_NEUROSURGERY:                    "neurosurgery",
  SPEC_CARDIOTHORACIC_SURGERY:          "cardiothoracic",
  SPEC_VASCULAR_SURGERY:                "vascular",
  SPEC_PAEDIATRIC_SURGERY:              "paediatric",
  SPEC_OPHTHALMOLOGY:                   "opthalmology",
  SPEC_PODIATRIC_SURGERY:               "podiatric",
  SPEC_ANAESTHESIA:                     "anaesthesia",
}

// CSV slug overrides (typos in existing directory names)
const SLUG_DIR: Record<string, string> = { ophthalmology: "opthalmology" }
function dirSlug(csvSlug: string): string { return SLUG_DIR[csvSlug] ?? csvSlug }

// ── CSV helpers ────────────────────────────────────────────────────────────
const MASTER_HEADERS = [
  "specialty_group_id","specialty_group_name",
  "specialty_id","specialty_name","specialty_slug",
  "service_line_id","service_line_name",
  "anatomy_id","anatomy_name",
  "procedure_id","procedure_name","procedure_aliases","procedure_description","procedure_status",
  "case_tag_ids","case_tag_names",
  "variant_id","variant_name","variant_type","variant_value","variant_description","variant_sort_order","variant_status",
  "system_map_id","system_id","system_name","system_type","system_category","system_aliases","system_description","system_status",
  "mapping_role","mapping_usage_type","mapping_is_default","mapping_status",
  "supplier_id","supplier_name","supplier_aliases","supplier_status",
  "setting","data_quality_status","audit_notes",
]

function csvQuote(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) return '"' + v.replace(/"/g, '""') + '"'
  return v
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = "", inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === "," && !inQuotes) { result.push(current); current = "" }
    else current += ch
  }
  result.push(current)
  return result
}

function parseMasterCSV(text: string): Record<string, string>[] {
  const lines = text.split("\n").filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0]).map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const cells = parseCSVLine(line)
    const row: Record<string, string> = {}
    for (let i = 0; i < headers.length; i++) row[headers[i]] = (cells[i] ?? "").trim()
    return row
  })
}

// ── Value helpers ─────────────────────────────────────────────────────────
function isNA(v: string | undefined): boolean { return !v || v === "N/A" || v === "" }
function parseAliases(v: string): string[] {
  if (isNA(v)) return []
  return v.split("|").map((s) => s.trim()).filter((s) => s && s !== "N/A")
}
function parseBool(v: string): boolean { return v.trim().toLowerCase() === "true" }
function parseIntSafe(v: string): number | undefined {
  if (isNA(v)) return undefined
  const n = parseInt(v, 10); return isNaN(n) ? undefined : n
}
function na(v: string | undefined): string { return (!v || v === "") ? "N/A" : v }
function aliasStr(arr: string[] | undefined): string { return arr?.length ? arr.join("|") : "N/A" }

// ── Entity types ───────────────────────────────────────────────────────────
interface SpecialtyRecord    { id: string; name: string; category: string }
interface ServiceLineRecord  { id: string; name: string; specialty_id: string }
interface AnatomyRecord      { id: string; name: string; specialty_id: string; parent_id: string | null; sort_order: number; tags?: string[] }
interface SpecialtyGroupRecord { id: string; name: string; specialties: { specialty_id: string; service_line_ids: string[] }[] }
interface ProcedureRecord    { id: string; name: string; specialty_id: string; service_line_id: string; anatomy_id: string; aliases: string[]; description: string; status: string }
interface VariantRecord      { id: string; procedure_id: string; setting: string; specialty_id: string; service_line_id: string; anatomy_id: string; name: string; variant_type: string; variant_value: string; description: string; sort_order?: number; status: string }
interface SystemRecord       { id: string; name: string; supplier_id?: string; specialty_id: string; service_line_ids: string[]; anatomy_ids: string[]; system_type: string; category: string; aliases: string[]; description: string; status: string }
interface VariantSystemMapRecord { id: string; procedure_variant_id: string; system_id: string; is_default: boolean; status: string }
interface SupplierRecord     { id: string; name: string; aliases: string[]; status: string }

// ── Read JSON helper (returns [] on missing file) ──────────────────────────
async function readJSON<T>(filePath: string): Promise<T[]> {
  try { return JSON.parse(await fs.readFile(path.join(ROOT, filePath), "utf-8")) }
  catch { return [] }
}

// ── Merge helpers (CSV record wins on conflict, existing records kept) ─────
function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map<string, T>(existing.map((r) => [r.id, r]))
  for (const rec of incoming) map.set(rec.id, rec) // CSV wins
  return [...map.values()]
}

// Anatomy is special: preserve parent_id / sort_order from existing
function mergeAnatomy(existing: AnatomyRecord[], incoming: AnatomyRecord[]): AnatomyRecord[] {
  const map = new Map<string, AnatomyRecord>(existing.map((r) => [r.id, r]))
  for (const rec of incoming) {
    if (!map.has(rec.id)) map.set(rec.id, rec) // only add new; never overwrite existing
  }
  return [...map.values()]
}

// Systems: union service_line_ids and anatomy_ids from both sources
function mergeSystems(existing: SystemRecord[], incoming: SystemRecord[]): SystemRecord[] {
  const map = new Map<string, SystemRecord>(existing.map((r) => [r.id, r]))
  for (const rec of incoming) {
    const ex = map.get(rec.id)
    if (!ex) { map.set(rec.id, rec); continue }
    map.set(rec.id, {
      ...rec,
      service_line_ids: [...new Set([...ex.service_line_ids, ...rec.service_line_ids])],
      anatomy_ids:      [...new Set([...ex.anatomy_ids,      ...rec.anatomy_ids])],
    })
  }
  return [...map.values()]
}

// ── Extract entities from parsed CSV rows ──────────────────────────────────
function extractEntities(rows: Record<string, string>[]) {
  const specialties    = new Map<string, SpecialtyRecord>()
  const serviceLines   = new Map<string, ServiceLineRecord>()
  const anatomyNew     = new Map<string, AnatomyRecord>()
  const proceduresBySlug = new Map<string, Map<string, ProcedureRecord>>()
  const variantsBySlug   = new Map<string, Map<string, VariantRecord>>()
  const systemsMap = new Map<string, { record: SystemRecord; sls: Set<string>; anats: Set<string> }>()
  const variantSystemMap = new Map<string, VariantSystemMapRecord>()
  const suppliers      = new Map<string, SupplierRecord>()
  const sgMap = new Map<string, { name: string; specs: Map<string, Set<string>> }>()

  for (const row of rows) {
    const { specialty_group_id, specialty_group_name, specialty_id, specialty_name, specialty_slug,
      service_line_id, service_line_name, anatomy_id, anatomy_name,
      procedure_id, procedure_name, procedure_aliases, procedure_description, procedure_status,
      variant_id, variant_name, variant_type, variant_value, variant_description, variant_sort_order, variant_status,
      system_map_id, system_id, system_name, system_type, system_category, system_aliases, system_description, system_status,
      mapping_is_default, mapping_status,
      supplier_id, supplier_name, supplier_aliases, supplier_status,
    } = row

    if (!isNA(specialty_id) && !specialties.has(specialty_id))
      specialties.set(specialty_id, { id: specialty_id, name: specialty_name, category: "Operating Theatre" })

    if (!isNA(service_line_id) && !serviceLines.has(service_line_id))
      serviceLines.set(service_line_id, { id: service_line_id, name: service_line_name, specialty_id })

    if (!isNA(anatomy_id) && !anatomyNew.has(anatomy_id))
      anatomyNew.set(anatomy_id, { id: anatomy_id, name: isNA(anatomy_name) ? anatomy_id : anatomy_name, specialty_id, parent_id: null, sort_order: 0 })

    if (!isNA(specialty_group_id)) {
      if (!sgMap.has(specialty_group_id)) sgMap.set(specialty_group_id, { name: specialty_group_name, specs: new Map() })
      const sg = sgMap.get(specialty_group_id)!
      if (!sg.specs.has(specialty_id)) sg.specs.set(specialty_id, new Set())
      if (!isNA(service_line_id)) sg.specs.get(specialty_id)!.add(service_line_id)
    }

    if (!isNA(procedure_id) && !isNA(specialty_slug)) {
      const slug = dirSlug(specialty_slug)
      if (!proceduresBySlug.has(slug)) proceduresBySlug.set(slug, new Map())
      const m = proceduresBySlug.get(slug)!
      if (!m.has(procedure_id))
        m.set(procedure_id, {
          id: procedure_id, name: procedure_name, specialty_id,
          service_line_id: isNA(service_line_id) ? "" : service_line_id,
          anatomy_id: isNA(anatomy_id) ? "" : anatomy_id,
          aliases: parseAliases(procedure_aliases),
          description: isNA(procedure_description) ? "" : procedure_description,
          status: isNA(procedure_status) ? "active" : procedure_status,
        })
    }

    if (!isNA(variant_id) && !isNA(specialty_slug)) {
      const slug = dirSlug(specialty_slug)
      if (!variantsBySlug.has(slug)) variantsBySlug.set(slug, new Map())
      const m = variantsBySlug.get(slug)!
      if (!m.has(variant_id)) {
        const sortOrder = parseIntSafe(variant_sort_order)
        const rec: VariantRecord = {
          id: variant_id, procedure_id, setting: "operating_theatre",
          specialty_id,
          service_line_id: isNA(service_line_id) ? "" : service_line_id,
          anatomy_id: isNA(anatomy_id) ? "" : anatomy_id,
          name: variant_name,
          variant_type: isNA(variant_type) ? "" : variant_type,
          variant_value: isNA(variant_value) ? "" : variant_value,
          description: isNA(variant_description) ? "" : variant_description,
          status: isNA(variant_status) ? "active" : variant_status,
        }
        if (sortOrder !== undefined) rec.sort_order = sortOrder
        m.set(variant_id, rec)
      }
    }

    if (!isNA(system_id)) {
      if (!systemsMap.has(system_id)) {
        systemsMap.set(system_id, {
          record: {
            id: system_id, name: system_name,
            supplier_id: isNA(supplier_id) ? undefined : supplier_id,
            specialty_id,
            service_line_ids: isNA(service_line_id) ? [] : [service_line_id],
            anatomy_ids: isNA(anatomy_id) ? [] : [anatomy_id],
            system_type: isNA(system_type) ? "" : system_type,
            category: isNA(system_category) ? "" : system_category,
            aliases: parseAliases(system_aliases),
            description: isNA(system_description) ? "" : system_description,
            status: isNA(system_status) ? "active" : system_status,
          },
          sls: new Set(isNA(service_line_id) ? [] : [service_line_id]),
          anats: new Set(isNA(anatomy_id) ? [] : [anatomy_id]),
        })
      } else {
        const e = systemsMap.get(system_id)!
        if (!isNA(service_line_id)) e.sls.add(service_line_id)
        if (!isNA(anatomy_id)) e.anats.add(anatomy_id)
      }
    }

    if (!isNA(system_map_id) && !isNA(variant_id) && !isNA(system_id) && !variantSystemMap.has(system_map_id))
      variantSystemMap.set(system_map_id, {
        id: system_map_id, procedure_variant_id: variant_id, system_id,
        is_default: parseBool(mapping_is_default ?? ""),
        status: isNA(mapping_status) ? "active" : mapping_status,
      })

    if (!isNA(supplier_id) && !suppliers.has(supplier_id))
      suppliers.set(supplier_id, { id: supplier_id, name: supplier_name, aliases: parseAliases(supplier_aliases), status: isNA(supplier_status) ? "active" : supplier_status })
  }

  const specialtyGroups: SpecialtyGroupRecord[] = []
  for (const [id, { name, specs }] of sgMap.entries())
    specialtyGroups.push({ id, name, specialties: [...specs.entries()].map(([sid, slSet]) => ({ specialty_id: sid, service_line_ids: [...slSet] })) })

  const finalSystems: SystemRecord[] = []
  for (const { record, sls, anats } of systemsMap.values())
    finalSystems.push({ ...record, service_line_ids: [...sls], anatomy_ids: [...anats] })

  return { specialties: [...specialties.values()], serviceLines: [...serviceLines.values()], anatomyNew: [...anatomyNew.values()], specialtyGroups, proceduresBySlug, variantsBySlug, systems: finalSystems, variantSystemMap: [...variantSystemMap.values()], suppliers: [...suppliers.values()] }
}

// ── Write helper ──────────────────────────────────────────────────────────
async function writeJSON(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8")
}

// ── EXPORT: build master CSV from current JSONs ────────────────────────────
async function exportMasterCSV(): Promise<string> {
  const specialties   = await readJSON<SpecialtyRecord>("data/taxonomy/specialties.json")
  const serviceLines  = await readJSON<ServiceLineRecord>("data/taxonomy/service_lines.json")
  const anatomy       = await readJSON<AnatomyRecord>("data/taxonomy/anatomy.json")
  const systems       = await readJSON<SystemRecord>("data/systems/systems.json")
  const vsMap         = await readJSON<VariantSystemMapRecord>("data/systems/procedure_variant_system_map.json")
  const suppliers     = await readJSON<SupplierRecord>("data/suppliers/suppliers.json")
  const sgRaw         = await readJSON<SpecialtyGroupRecord>("data/taxonomy/specialty_groups.json")

  const specById      = new Map(specialties.map((r) => [r.id, r]))
  const slById        = new Map(serviceLines.map((r) => [r.id, r]))
  const anatById      = new Map(anatomy.map((r) => [r.id, r]))
  const sysById       = new Map(systems.map((r) => [r.id, r]))
  const supById       = new Map(suppliers.map((r) => [r.id, r]))
  const sgBySpecId    = new Map<string, SpecialtyGroupRecord>()
  for (const sg of sgRaw)
    for (const s of sg.specialties) sgBySpecId.set(s.specialty_id, sg)

  // variant → systems map
  const variantSystems = new Map<string, Array<{ map: VariantSystemMapRecord; sys: SystemRecord }>>()
  for (const row of vsMap) {
    const sys = sysById.get(row.system_id)
    if (!sys) continue
    const arr = variantSystems.get(row.procedure_variant_id) ?? []
    arr.push({ map: row, sys })
    variantSystems.set(row.procedure_variant_id, arr)
  }

  const rows: string[] = [MASTER_HEADERS.join(",")]

  for (const specId of Object.keys(SPEC_ID_TO_SLUG)) {
    const slug = SPEC_ID_TO_SLUG[specId]
    const spec = specById.get(specId)
    const specName = spec?.name ?? specId
    const sg = sgBySpecId.get(specId)

    const procedures = await readJSON<ProcedureRecord>(`data/procedures/${slug}/procedures_${slug}.json`)
    const variantFile = `data/procedure_variants/${slug}/procedure_variants_${slug}.json`
    const variants = await readJSON<VariantRecord>(variantFile)
    const variantsByProc = new Map<string, VariantRecord[]>()
    for (const v of variants) {
      const arr = variantsByProc.get(v.procedure_id) ?? []
      arr.push(v); variantsByProc.set(v.procedure_id, arr)
    }

    for (const proc of procedures) {
      const sl = slById.get(proc.service_line_id)
      const anat = anatById.get(proc.anatomy_id)
      const procVariants = variantsByProc.get(proc.id) ?? []

      function makeRow(v: VariantRecord | null, mapRow: VariantSystemMapRecord | null, sys: SystemRecord | null): string {
        const sup = sys?.supplier_id ? supById.get(sys.supplier_id) : null
        const cells: string[] = [
          na(sg?.id), na(sg?.name),
          specId, specName, slug,
          na(proc.service_line_id), na(sl?.name),
          na(proc.anatomy_id), na(anat?.name),
          proc.id, proc.name, aliasStr(proc.aliases), na(proc.description), na(proc.status),
          "N/A", "N/A", // case_tag_ids, case_tag_names
          v ? v.id : "N/A", v ? v.name : "N/A", v ? na(v.variant_type) : "N/A", v ? na(v.variant_value) : "N/A", v ? na(v.description) : "N/A", v?.sort_order !== undefined ? String(v.sort_order) : "N/A", v ? na(v.status) : "N/A",
          mapRow ? mapRow.id : "N/A", sys ? sys.id : "N/A", sys ? sys.name : "N/A", sys ? na(sys.system_type) : "N/A", sys ? na(sys.category) : "N/A", sys ? aliasStr(sys.aliases) : "N/A", sys ? na(sys.description) : "N/A", sys ? na(sys.status) : "N/A",
          "N/A", "N/A", mapRow ? String(mapRow.is_default) : "N/A", mapRow ? na(mapRow.status) : "N/A",
          sup ? sup.id : "N/A", sup ? sup.name : "N/A", sup ? aliasStr(sup.aliases) : "N/A", sup ? na(sup.status) : "N/A",
          "operating_theatre", "active", "",
        ]
        return cells.map(csvQuote).join(",")
      }

      if (procVariants.length === 0) {
        rows.push(makeRow(null, null, null))
      } else {
        for (const v of procVariants) {
          const sysList = variantSystems.get(v.id) ?? []
          if (sysList.length === 0) {
            rows.push(makeRow(v, null, null))
          } else {
            for (const { map, sys } of sysList) {
              rows.push(makeRow(v, map, sys))
            }
          }
        }
      }
    }
  }

  return rows.join("\n")
}

// ── Preview line type ──────────────────────────────────────────────────────
type PreviewLine = { entity: string; count: number; path: string; new: number; updated: number }

// ── GET — export current data as master CSV ────────────────────────────────
export async function GET() {
  if (process.env.NODE_ENV === "production")
    return NextResponse.json({ error: "Not available in production" }, { status: 403 })
  try {
    const csv = await exportMasterCSV()
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv" } })
  } catch (err) {
    return NextResponse.json({ error: `Export failed: ${err}` }, { status: 500 })
  }
}

// ── POST — import (merge) master CSV ──────────────────────────────────────
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production")
    return NextResponse.json({ error: "Not available in production" }, { status: 403 })

  let body: { csv: string; dryRun?: boolean }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) }

  const { csv, dryRun = true } = body
  if (typeof csv !== "string" || !csv.trim())
    return NextResponse.json({ error: "Missing csv string" }, { status: 400 })

  const rows = parseMasterCSV(csv)
  if (rows.length === 0) return NextResponse.json({ error: "CSV produced 0 rows" }, { status: 400 })

  const ext = extractEntities(rows)

  // ── Merge all entities with existing data ──────────────────────────────
  const existingAnatomy    = await readJSON<AnatomyRecord>("data/taxonomy/anatomy.json")
  const existingSpecialties = await readJSON<SpecialtyRecord>("data/taxonomy/specialties.json")
  const existingServiceLines = await readJSON<ServiceLineRecord>("data/taxonomy/service_lines.json")
  const existingSystems    = await readJSON<SystemRecord>("data/systems/systems.json")
  const existingVSMap      = await readJSON<VariantSystemMapRecord>("data/systems/procedure_variant_system_map.json")
  const existingSuppliers  = await readJSON<SupplierRecord>("data/suppliers/suppliers.json")

  const mergedAnatomy      = mergeAnatomy(existingAnatomy, ext.anatomyNew)
  const mergedSpecialties  = mergeById(existingSpecialties, ext.specialties)
  const mergedServiceLines = mergeById(existingServiceLines, ext.serviceLines)
  const mergedSystems      = mergeSystems(existingSystems, ext.systems)
  const mergedVSMap        = mergeById(existingVSMap, ext.variantSystemMap)
  const mergedSuppliers    = mergeById(existingSuppliers, ext.suppliers)

  // Procedures and variants: merge per-slug
  const procedureWrites: { filePath: string; data: ProcedureRecord[] }[] = []
  const variantWrites:   { filePath: string; data: VariantRecord[] }[]   = []

  for (const [slug, incoming] of ext.proceduresBySlug.entries()) {
    const filePath = `data/procedures/${slug}/procedures_${slug}.json`
    const existing = await readJSON<ProcedureRecord>(filePath)
    const merged   = mergeById(existing, [...incoming.values()])
    procedureWrites.push({ filePath, data: merged })
  }

  for (const [slug, incoming] of ext.variantsBySlug.entries()) {
    const filePath = `data/procedure_variants/${slug}/procedure_variants_${slug}.json`
    const existing = await readJSON<VariantRecord>(filePath)
    const merged   = mergeById(existing, [...incoming.values()])
    variantWrites.push({ filePath, data: merged })
  }

  // ── Build preview ────────────────────────────────────────────────────────
  function countChanges<T extends { id: string }>(existing: T[], merged: T[]): { total: number; newCount: number; updated: number } {
    const exIds = new Set(existing.map((r) => r.id))
    return { total: merged.length, newCount: merged.filter((r) => !exIds.has(r.id)).length, updated: merged.filter((r) => exIds.has(r.id)).length }
  }

  const preview: PreviewLine[] = [
    (() => { const c = countChanges(existingAnatomy, mergedAnatomy); return { entity: "Anatomy", count: c.total, path: "data/taxonomy/anatomy.json", new: c.newCount, updated: 0 } })(),
    (() => { const c = countChanges(existingSpecialties, mergedSpecialties); return { entity: "Specialties", count: c.total, path: "data/taxonomy/specialties.json", new: c.newCount, updated: c.updated } })(),
    (() => { const c = countChanges(existingServiceLines, mergedServiceLines); return { entity: "Service Lines", count: c.total, path: "data/taxonomy/service_lines.json", new: c.newCount, updated: c.updated } })(),
    { entity: "Specialty Groups", count: ext.specialtyGroups.length, path: "data/taxonomy/specialty_groups.json", new: 0, updated: ext.specialtyGroups.length },
    (() => { const c = countChanges(existingSystems, mergedSystems); return { entity: "Systems", count: c.total, path: "data/systems/systems.json", new: c.newCount, updated: c.updated } })(),
    (() => { const c = countChanges(existingVSMap, mergedVSMap); return { entity: "Variant-System Map", count: c.total, path: "data/systems/procedure_variant_system_map.json", new: c.newCount, updated: c.updated } })(),
    (() => { const c = countChanges(existingSuppliers, mergedSuppliers); return { entity: "Suppliers", count: c.total, path: "data/suppliers/suppliers.json", new: c.newCount, updated: c.updated } })(),
    ...procedureWrites.map(({ filePath, data }) => {
      const slug = filePath.split("/")[2]
      const exCount = 0 // already merged, don't re-read
      return { entity: `Procedures: ${slug}`, count: data.length, path: filePath, new: 0, updated: data.length }
    }),
    ...variantWrites.map(({ filePath, data }) => {
      const slug = filePath.split("/")[2]
      return { entity: `Variants: ${slug}`, count: data.length, path: filePath, new: 0, updated: data.length }
    }),
  ]

  if (dryRun) return NextResponse.json({ dryRun: true, rows: rows.length, preview })

  // ── Write all ────────────────────────────────────────────────────────────
  try {
    await Promise.all([
      writeJSON(path.join(ROOT, "data/taxonomy/anatomy.json"),         mergedAnatomy),
      writeJSON(path.join(ROOT, "data/taxonomy/specialties.json"),     mergedSpecialties),
      writeJSON(path.join(ROOT, "data/taxonomy/service_lines.json"),   mergedServiceLines),
      writeJSON(path.join(ROOT, "data/taxonomy/specialty_groups.json"),ext.specialtyGroups),
      writeJSON(path.join(ROOT, "data/systems/systems.json"),          mergedSystems),
      writeJSON(path.join(ROOT, "data/systems/procedure_variant_system_map.json"), mergedVSMap),
      writeJSON(path.join(ROOT, "data/suppliers/suppliers.json"),      mergedSuppliers),
      ...procedureWrites.map(({ filePath, data }) => writeJSON(path.join(ROOT, filePath), data)),
      ...variantWrites.map(({ filePath, data }) => writeJSON(path.join(ROOT, filePath), data)),
    ])
  } catch (err) {
    return NextResponse.json({ error: `Write failed: ${err}` }, { status: 500 })
  }

  return NextResponse.json({ dryRun: false, rows: rows.length, preview })
}
