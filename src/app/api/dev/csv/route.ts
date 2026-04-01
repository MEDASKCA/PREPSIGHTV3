import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

// This route is only functional in development
const ROOT = process.cwd()

interface EntityConfig {
  jsonPath: string
  arrayFields: string[]
  intFields: string[]
  boolFields: string[]
}

const ENTITIES: Record<string, EntityConfig> = {
  // ── Taxonomy ─────────────────────────────────────────────────────────────
  "taxonomy/specialties": {
    jsonPath: "data/taxonomy/specialties.json",
    arrayFields: [], intFields: [], boolFields: [],
  },
  "taxonomy/service_lines": {
    jsonPath: "data/taxonomy/service_lines.json",
    arrayFields: [], intFields: [], boolFields: [],
  },
  "taxonomy/anatomy": {
    jsonPath: "data/taxonomy/anatomy.json",
    arrayFields: ["tags"], intFields: ["sort_order"], boolFields: [],
  },
  // ── Procedures ────────────────────────────────────────────────────────────
  "procedures/trauma_and_orthopaedics": {
    jsonPath: "data/procedures/trauma_and_orthopaedics/procedures_trauma_and_orthopaedics.json",
    arrayFields: ["aliases"], intFields: [], boolFields: [],
  },
  "procedures/general_surgery": {
    jsonPath: "data/procedures/general_surgery/procedures_general_surgery.json",
    arrayFields: ["aliases"], intFields: [], boolFields: [],
  },
  "procedures/urology": {
    jsonPath: "data/procedures/urology/procedures_urology.json",
    arrayFields: ["aliases"], intFields: [], boolFields: [],
  },
  "procedures/gynaecology": {
    jsonPath: "data/procedures/gynaecology/procedures_gynaecology.json",
    arrayFields: ["aliases"], intFields: [], boolFields: [],
  },
  "procedures/obstetrics": {
    jsonPath: "data/procedures/obstetrics/procedures_obstetrics.json",
    arrayFields: ["aliases"], intFields: [], boolFields: [],
  },
  "procedures/otolaryngology": {
    jsonPath: "data/procedures/otolaryngology/procedures_otolaryngology.json",
    arrayFields: ["aliases"], intFields: [], boolFields: [],
  },
  "procedures/oral_and_maxillofacial": {
    jsonPath: "data/procedures/oral_and_maxillofacial/procedures_oral_and_maxillofacial.json",
    arrayFields: ["aliases"], intFields: [], boolFields: [],
  },
  "procedures/dental_and_oral": {
    jsonPath: "data/procedures/dental_and_oral/procedures_dental_and_oral.json",
    arrayFields: ["aliases"], intFields: [], boolFields: [],
  },
  "procedures/plastic_and_reconstructive": {
    jsonPath: "data/procedures/plastic_and_reconstructive/procedures_plastic_and_reconstructive.json",
    arrayFields: ["aliases"], intFields: [], boolFields: [],
  },
  "procedures/neurosurgery": {
    jsonPath: "data/procedures/neurosurgery/procedures_neurosurgery.json",
    arrayFields: ["aliases"], intFields: [], boolFields: [],
  },
  "procedures/cardiothoracic": {
    jsonPath: "data/procedures/cardiothoracic/procedures_cardiothoracic.json",
    arrayFields: ["aliases"], intFields: [], boolFields: [],
  },
  "procedures/vascular": {
    jsonPath: "data/procedures/vascular/procedures_vascular.json",
    arrayFields: ["aliases"], intFields: [], boolFields: [],
  },
  "procedures/paediatric": {
    jsonPath: "data/procedures/paediatric/procedures_paediatric.json",
    arrayFields: ["aliases"], intFields: [], boolFields: [],
  },
  "procedures/opthalmology": {
    jsonPath: "data/procedures/opthalmology/procedures_opthalmology.json",
    arrayFields: ["aliases"], intFields: [], boolFields: [],
  },
  "procedures/podiatric": {
    jsonPath: "data/procedures/podiatric/procedures_podiatric.json",
    arrayFields: ["aliases"], intFields: [], boolFields: [],
  },
  "procedures/anaesthesia": {
    jsonPath: "data/procedures/anaesthesia/procedures_anaesthesia.json",
    arrayFields: ["aliases"], intFields: [], boolFields: [],
  },
  // ── Procedure variants ────────────────────────────────────────────────────
  "procedure_variants/trauma_and_orthopaedics": {
    jsonPath: "data/procedure_variants/trauma_and_orthopaedics/procedure_variants_trauma_and_orthopaedics.json",
    arrayFields: [], intFields: ["sort_order"], boolFields: [],
  },
  // ── Systems & suppliers ────────────────────────────────────────────────────
  "systems": {
    jsonPath: "data/systems/systems.json",
    arrayFields: ["service_line_ids", "anatomy_ids", "aliases"], intFields: [], boolFields: [],
  },
  "procedure_variant_system_map": {
    jsonPath: "data/systems/procedure_variant_system_map.json",
    arrayFields: [], intFields: [], boolFields: ["is_default"],
  },
  "suppliers": {
    jsonPath: "data/suppliers/suppliers.json",
    arrayFields: ["aliases"], intFields: [], boolFields: [],
  },
}

// ── CSV helpers ────────────────────────────────────────────────────────────

function csvQuote(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === "," && !inQuotes) {
      result.push(current); current = ""
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function jsonToCSV(rows: Record<string, unknown>[], config: EntityConfig): string {
  if (rows.length === 0) return ""
  const headers = Object.keys(rows[0])
  const lines: string[] = [headers.join(",")]
  for (const row of rows) {
    const cells = headers.map((h) => {
      const val = row[h]
      if (val === null || val === undefined) return ""
      if (config.arrayFields.includes(h) && Array.isArray(val)) return csvQuote((val as string[]).join("|"))
      return csvQuote(String(val))
    })
    lines.push(cells.join(","))
  }
  return lines.join("\n")
}

function csvToJSON(csv: string, config: EntityConfig): Record<string, unknown>[] {
  const lines = csv.split("\n").filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0])
  return lines.slice(1).map((line) => {
    const cells = parseCSVLine(line)
    const obj: Record<string, unknown> = {}
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i]
      const raw = cells[i] ?? ""
      if (config.arrayFields.includes(key)) {
        obj[key] = raw ? raw.split("|").map((s) => s.trim()).filter(Boolean) : []
      } else if (config.intFields.includes(key)) {
        obj[key] = raw !== "" ? parseInt(raw, 10) : undefined
      } else if (config.boolFields.includes(key)) {
        obj[key] = raw === "true"
      } else {
        // Store empty string fields as undefined to keep JSON clean (omit key)
        if (raw !== "") obj[key] = raw
      }
    }
    return obj
  })
}

// ── Route handlers ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 })
  }

  const entity = req.nextUrl.searchParams.get("entity")
  if (!entity || !ENTITIES[entity]) {
    return NextResponse.json(
      { error: "Unknown entity", available: Object.keys(ENTITIES) },
      { status: 400 }
    )
  }

  const config = ENTITIES[entity]
  const jsonFile = path.join(ROOT, config.jsonPath)

  try {
    const raw = await fs.readFile(jsonFile, "utf-8")
    const json = JSON.parse(raw) as Record<string, unknown>[]
    const csv = jsonToCSV(json, config)
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv" },
    })
  } catch {
    return NextResponse.json({ error: `Could not read ${config.jsonPath}` }, { status: 404 })
  }
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 })
  }

  let body: { entity: string; csv: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { entity, csv } = body
  if (!entity || !ENTITIES[entity]) {
    return NextResponse.json({ error: "Unknown entity" }, { status: 400 })
  }
  if (typeof csv !== "string") {
    return NextResponse.json({ error: "Missing csv string" }, { status: 400 })
  }

  const config = ENTITIES[entity]
  const jsonFile = path.join(ROOT, config.jsonPath)

  let parsed: Record<string, unknown>[]
  try {
    parsed = csvToJSON(csv, config)
  } catch (err) {
    return NextResponse.json({ error: `CSV parse error: ${err}` }, { status: 400 })
  }

  if (parsed.length === 0) {
    return NextResponse.json({ error: "CSV produced 0 rows — refusing to overwrite" }, { status: 400 })
  }

  try {
    await fs.writeFile(jsonFile, JSON.stringify(parsed, null, 2) + "\n", "utf-8")
    return NextResponse.json({ ok: true, rows: parsed.length })
  } catch (err) {
    return NextResponse.json({ error: `Write failed: ${err}` }, { status: 500 })
  }
}
