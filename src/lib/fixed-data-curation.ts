import { execFile } from "node:child_process"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

const ROOT = process.cwd()
const SCRIPTS_DIR = path.join(ROOT, "scripts")
const DATA_DIR = path.join(ROOT, "data", "catalogue")
const INTAKE_DIR = path.join(DATA_DIR, "intake")
const IMPORTS_DIR = path.join(DATA_DIR, "imports")
const MASTER_WORKBOOK = path.join(ROOT, "PrepSight_Fixed_Data_Inventory.xlsx")

export type FixedDataSheet =
  | "PROCEDURES"
  | "SUPPLIERS"
  | "SYSTEMS"
  | "TRAYS"
  | "COMPONENTS"
  | "PRODUCTS"
  | "SYSTEM_MAPPINGS"

export type DatasetResponse = Record<
  FixedDataSheet,
  {
    headers: string[]
    rows: Record<string, string>[]
    count: number
  }
>

export type ValidationReport = {
  source_meta?: Record<string, string>
  ready_to_import: Record<string, Record<string, string>[]>
  needs_review: Record<string, { row: Record<string, string>; reason: string }[]>
  rejected: Record<string, { row: Record<string, string>; reason: string }[]>
  duplicate_warnings: Array<Record<string, unknown>>
  missing_field_warnings: Array<Record<string, unknown>>
  bad_link_warnings: Array<Record<string, unknown>>
  exception_report: Array<Record<string, unknown>>
  unresolved_items?: Array<Record<string, string>>
  schema_errors?: string[]
}

function safeParseJson<T>(text: string): T {
  return JSON.parse(text) as T
}

async function ensureDirs() {
  await mkdir(INTAKE_DIR, { recursive: true })
  await mkdir(IMPORTS_DIR, { recursive: true })
}

async function runPython(args: string[]) {
  const { stdout, stderr } = await execFileAsync("python", args, {
    cwd: ROOT,
    maxBuffer: 20 * 1024 * 1024,
  })
  return { stdout: stdout.trim(), stderr: stderr.trim() }
}

export async function loadFixedDataDataset(): Promise<DatasetResponse> {
  const script = path.join(SCRIPTS_DIR, "export_fixed_data_dataset.py")
  const { stdout } = await runPython([script, "--master", MASTER_WORKBOOK])
  return safeParseJson<DatasetResponse>(stdout)
}

export async function validateExtractionPayload(payload: unknown) {
  await ensureDirs()
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const inputPath = path.join(INTAKE_DIR, `${stamp}.json`)
  const outputPath = path.join(INTAKE_DIR, `${stamp}.validated.json`)
  await writeFile(inputPath, JSON.stringify(payload, null, 2), "utf-8")

  const script = path.join(SCRIPTS_DIR, "validate_fixed_data_extraction.py")
  await runPython([script, inputPath, "--master", MASTER_WORKBOOK, "--output", outputPath])
  const reportText = await readFile(outputPath, "utf-8")
  const report = safeParseJson<ValidationReport>(reportText)
  const unresolvedItems =
    typeof payload === "object" && payload !== null && "unresolved_items" in payload && Array.isArray((payload as Record<string, unknown>).unresolved_items)
      ? ((payload as Record<string, unknown>).unresolved_items as Array<Record<string, string>>)
      : []

  return {
    report: {
      ...report,
      unresolved_items: unresolvedItems,
    } satisfies ValidationReport,
    inputPath,
    outputPath,
  }
}

export async function importValidatedReport(validatedReport: ValidationReport) {
  await ensureDirs()
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const validatedPath = path.join(IMPORTS_DIR, `${stamp}.validated.json`)
  const workbookPath = path.join(IMPORTS_DIR, `PrepSight_Fixed_Data_Inventory_${stamp}.xlsx`)
  await writeFile(validatedPath, JSON.stringify(validatedReport, null, 2), "utf-8")

  const script = path.join(SCRIPTS_DIR, "import_validated_fixed_data.py")
  const { stdout } = await runPython([
    script,
    validatedPath,
    "--master",
    MASTER_WORKBOOK,
    "--output",
    workbookPath,
  ])

  return {
    summary: safeParseJson<{
      output_workbook: string
      imported_rows: Record<string, number>
      skipped_duplicates: Record<string, number>
    }>(stdout),
    workbookPath,
  }
}
