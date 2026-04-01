"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileJson,
  FolderSearch2,
  House,
  Copy,
  LoaderCircle,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react"
import { FIXED_DATA_EXTRACTION_PROMPT } from "@/lib/fixed-data-extraction-prompt"

type FixedDataSheet =
  | "PROCEDURES"
  | "SUPPLIERS"
  | "SYSTEMS"
  | "TRAYS"
  | "COMPONENTS"
  | "PRODUCTS"
  | "SYSTEM_MAPPINGS"

type DatasetResponse = Record<
  FixedDataSheet,
  {
    headers: string[]
    rows: Record<string, string>[]
    count: number
  }
>

type ValidationReport = {
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

type ImportSummary = {
  output_workbook: string
  imported_rows: Record<string, number>
  skipped_duplicates: Record<string, number>
}

const SHEETS: FixedDataSheet[] = [
  "PROCEDURES",
  "SUPPLIERS",
  "SYSTEMS",
  "TRAYS",
  "COMPONENTS",
  "PRODUCTS",
  "SYSTEM_MAPPINGS",
]

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function SectionCard({
  title,
  value,
  tone,
}: {
  title: string
  value: string | number
  tone: "blue" | "green" | "amber" | "red"
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "red"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-sky-200 bg-sky-50 text-sky-700"

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em]">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}

function SimpleTable({
  headers,
  rows,
  emptyLabel,
}: {
  headers: string[]
  rows: Record<string, string>[]
  emptyLabel: string
}) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="max-h-[420px] overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-slate-600">
            <tr>
              {headers.map((header) => (
                <th key={header} className="border-b border-slate-200 px-3 py-2.5 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${index}-${headers[0] ?? "row"}`} className="align-top odd:bg-white even:bg-slate-50/50">
                {headers.map((header) => (
                  <td key={header} className="border-b border-slate-100 px-3 py-2 text-slate-700">
                    {row[header] || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function WarningList({
  title,
  items,
}: {
  title: string
  items: Array<Record<string, unknown>>
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <AlertCircle size={18} className="text-amber-500" />
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      </div>
      {items.length ? (
        <div className="mt-4 space-y-3">
          {items.map((item, index) => (
            <div key={index} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-slate-700">
              <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-5">
                {JSON.stringify(item, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">None.</p>
      )}
    </section>
  )
}

export default function FixedDataCurationClient() {
  const [dataset, setDataset] = useState<DatasetResponse | null>(null)
  const [datasetLoading, setDatasetLoading] = useState(false)
  const [datasetError, setDatasetError] = useState("")
  const [activeSheet, setActiveSheet] = useState<FixedDataSheet>("SYSTEMS")
  const [datasetQuery, setDatasetQuery] = useState("")

  const [intakeValue, setIntakeValue] = useState("")
  const [validationLoading, setValidationLoading] = useState(false)
  const [validationError, setValidationError] = useState("")
  const [report, setReport] = useState<ValidationReport | null>(null)

  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState("")
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [importDownloadFile, setImportDownloadFile] = useState("")
  const [copyState, setCopyState] = useState<"" | "copied">("")

  async function loadDataset() {
    setDatasetLoading(true)
    setDatasetError("")
    try {
      const response = await fetch("/api/fixed-data/dataset", { cache: "no-store" })
      const body = (await response.json()) as { ok: boolean; dataset?: DatasetResponse; error?: string }
      if (!response.ok || !body.ok || !body.dataset) {
        throw new Error(body.error || "Failed to load dataset.")
      }
      setDataset(body.dataset)
    } catch (error) {
      setDatasetError(error instanceof Error ? error.message : "Failed to load dataset.")
    } finally {
      setDatasetLoading(false)
    }
  }

  async function runValidation() {
    setValidationLoading(true)
    setValidationError("")
    setImportSummary(null)
    setImportDownloadFile("")
    try {
      const parsed = JSON.parse(intakeValue)
      const response = await fetch("/api/fixed-data/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      })
      const body = (await response.json()) as { ok: boolean; report?: ValidationReport; error?: string }
      if (!response.ok || !body.ok || !body.report) {
        throw new Error(body.error || "Validation failed.")
      }
      setReport(body.report)
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Validation failed.")
    } finally {
      setValidationLoading(false)
    }
  }

  async function runImport() {
    if (!report) return
    setImportLoading(true)
    setImportError("")
    try {
      const response = await fetch("/api/fixed-data/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report }),
      })
      const body = (await response.json()) as {
        ok: boolean
        summary?: ImportSummary
        workbookPath?: string
        error?: string
      }
      if (!response.ok || !body.ok || !body.summary || !body.workbookPath) {
        throw new Error(body.error || "Import failed.")
      }
      setImportSummary(body.summary)
      setImportDownloadFile(body.workbookPath.split(/[\\/]/).pop() || "")
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Import failed.")
    } finally {
      setImportLoading(false)
    }
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(FIXED_DATA_EXTRACTION_PROMPT)
      setCopyState("copied")
      window.setTimeout(() => setCopyState(""), 1800)
    } catch {
      setCopyState("")
    }
  }

  const activeSheetData = dataset?.[activeSheet]
  const filteredRows = useMemo(() => {
    if (!activeSheetData) return []
    const query = datasetQuery.trim().toLowerCase()
    if (!query) return activeSheetData.rows
    return activeSheetData.rows.filter((row) =>
      Object.values(row).some((value) => value.toLowerCase().includes(query)),
    )
  }, [activeSheetData, datasetQuery])

  const readyCounts = useMemo(() => {
    if (!report) return 0
    return Object.values(report.ready_to_import).reduce((sum, rows) => sum + rows.length, 0)
  }, [report])

  const needsReviewCount = useMemo(() => {
    if (!report) return 0
    return Object.values(report.needs_review).reduce((sum, rows) => sum + rows.length, 0)
  }, [report])

  const rejectedCount = useMemo(() => {
    if (!report) return 0
    return Object.values(report.rejected).reduce((sum, rows) => sum + rows.length, 0)
  }, [report])

  const unresolvedCount = report?.unresolved_items?.length ?? 0

  const totalImported = importSummary
    ? Object.values(importSummary.imported_rows).reduce((sum, count) => sum + count, 0)
    : 0

  return (
    <div className="min-h-screen bg-[#F3F6FA]">
      <header data-dev-trigger className="sticky top-0 z-30 border-b border-white/10 bg-[#00B4D8]">
        <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+10px)] lg:px-6">
          <Link href="/" className="mt-0.5 shrink-0 text-[#10243E]/70 transition-colors hover:text-[#10243E]">
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-[20px] font-semibold leading-tight text-[#10243E]">Fixed-data curation</h1>
            <p className="mt-1 text-sm text-[#10243E]/72">
              Browse the master dataset, validate extraction JSON, and run controlled imports into a new workbook copy.
            </p>
          </div>
          <Link
            href="/"
            className="mt-0.5 shrink-0 rounded-xl p-2 text-[#10243E]/70 transition-colors hover:bg-[#10243E]/8 hover:text-[#10243E]"
            aria-label="Home"
          >
            <House size={18} />
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[1.2fr_1fr] lg:px-6">
        <section className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Dataset browser</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">Master workbook view</h2>
                <p className="mt-1 text-sm text-slate-500">Browse the 7-sheet fixed-data model as it currently stands.</p>
              </div>
              <button
                type="button"
                onClick={loadDataset}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {datasetLoading ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Refresh dataset
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
              <SectionCard title="Sheets" value={SHEETS.length} tone="blue" />
              <SectionCard title="Procedures" value={dataset?.PROCEDURES.count ?? 0} tone="blue" />
              <SectionCard title="Systems" value={dataset?.SYSTEMS.count ?? 0} tone="green" />
              <SectionCard title="Mappings" value={dataset?.SYSTEM_MAPPINGS.count ?? 0} tone="amber" />
            </div>

            {datasetError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {datasetError}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              {SHEETS.map((sheet) => (
                <button
                  key={sheet}
                  type="button"
                  onClick={() => setActiveSheet(sheet)}
                  className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                    activeSheet === sheet
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {sheet}
                </button>
              ))}
            </div>

            <div className="mt-4 relative">
              <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={datasetQuery}
                onChange={(event) => setDatasetQuery(event.target.value)}
                placeholder="Search by name, ID, supplier, procedure..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-sky-300"
              />
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
              <p>{activeSheetData?.count ?? 0} rows in {activeSheet}</p>
              <p>{filteredRows.length} shown</p>
            </div>

            <div className="mt-4">
              <SimpleTable
                headers={activeSheetData?.headers ?? []}
                rows={filteredRows}
                emptyLabel={datasetLoading ? "Loading dataset..." : "No rows available for this sheet yet."}
              />
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Extraction prompt</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">Default ChatGPT prompt</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Copy this prompt first, paste your IFU or operative text into ChatGPT, then bring the JSON result back here.
                </p>
              </div>
              <button
                type="button"
                onClick={copyPrompt}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <Copy size={16} />
                {copyState === "copied" ? "Copied" : "Copy prompt"}
              </button>
            </div>

            <pre className="mt-4 max-h-[320px] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-800 whitespace-pre-wrap">
              {FIXED_DATA_EXTRACTION_PROMPT}
            </pre>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-sky-50 p-2 text-sky-700">
                <FileJson size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Extraction intake</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">Validate extraction JSON</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Paste or upload extraction JSON, run the validator, then inspect ready, review, and rejected rows.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                <Upload size={16} />
                Upload JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    setIntakeValue(await file.text())
                  }}
                />
              </label>
              <button
                type="button"
                onClick={runValidation}
                disabled={validationLoading || !intakeValue.trim()}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#00A896] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#02897a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {validationLoading ? <LoaderCircle size={16} className="animate-spin" /> : <FolderSearch2 size={16} />}
                Run validator
              </button>
            </div>

            <textarea
              value={intakeValue}
              onChange={(event) => setIntakeValue(event.target.value)}
              placeholder="Paste extraction JSON here..."
              className="mt-4 min-h-[220px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-800 outline-none transition focus:border-sky-300"
            />

            {validationError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {validationError}
              </div>
            ) : null}
          </div>

          {report ? (
            <>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Validation result</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">Exception and import review</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <SectionCard title="Ready to import" value={readyCounts} tone="green" />
                  <SectionCard title="Needs review" value={needsReviewCount} tone="amber" />
                  <SectionCard title="Rejected" value={rejectedCount} tone="red" />
                  <SectionCard title="Unresolved items" value={unresolvedCount} tone="blue" />
                </div>

                {report.schema_errors?.length ? (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <p className="font-semibold">Schema errors</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {report.schema_errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={runImport}
                    disabled={importLoading || readyCounts === 0}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {importLoading ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Run controlled import
                  </button>
                  {importDownloadFile ? (
                    <a
                      href={`/api/fixed-data/download?file=${encodeURIComponent(importDownloadFile)}`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      <Download size={16} />
                      Download imported workbook
                    </a>
                  ) : null}
                </div>

                {importError ? (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {importError}
                  </div>
                ) : null}

                {importSummary ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                    <p className="font-semibold">Controlled import completed</p>
                    <p className="mt-1">Imported {totalImported} rows into a new workbook copy.</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {Object.entries(importSummary.imported_rows).map(([sheet, count]) => (
                        <div key={sheet} className="rounded-xl bg-white/70 px-3 py-2">
                          <span className="font-medium">{sheet}</span>: {count} imported, {importSummary.skipped_duplicates[sheet] ?? 0} skipped
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-5">
                <section className="rounded-3xl border border-slate-200 bg-white p-5">
                  <h3 className="text-base font-semibold text-slate-900">Ready to import</h3>
                  <div className="mt-4 space-y-4">
                    {Object.entries(report.ready_to_import).map(([sheet, rows]) => (
                      <div key={sheet}>
                        <p className="mb-2 text-sm font-semibold text-slate-700">{sheet}</p>
                        <SimpleTable
                          headers={rows.length ? Object.keys(rows[0]) : []}
                          rows={rows}
                          emptyLabel={`No ${sheet.toLowerCase()} rows ready.`}
                        />
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5">
                  <h3 className="text-base font-semibold text-slate-900">Needs review</h3>
                  <div className="mt-4 space-y-4">
                    {Object.entries(report.needs_review).map(([sheet, rows]) => (
                      <div key={sheet}>
                        <p className="mb-2 text-sm font-semibold text-slate-700">{sheet}</p>
                        <SimpleTable
                          headers={rows.length ? [...Object.keys(rows[0].row), "Reason"] : []}
                          rows={rows.map((entry) => ({ ...entry.row, Reason: entry.reason }))}
                          emptyLabel={`No ${sheet.toLowerCase()} rows need review.`}
                        />
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5">
                  <h3 className="text-base font-semibold text-slate-900">Rejected</h3>
                  <div className="mt-4 space-y-4">
                    {Object.entries(report.rejected).map(([sheet, rows]) => (
                      <div key={sheet}>
                        <p className="mb-2 text-sm font-semibold text-slate-700">{sheet}</p>
                        <SimpleTable
                          headers={rows.length ? [...Object.keys(rows[0].row), "Reason"] : []}
                          rows={rows.map((entry) => ({ ...entry.row, Reason: entry.reason }))}
                          emptyLabel={`No rejected ${sheet.toLowerCase()} rows.`}
                        />
                      </div>
                    ))}
                  </div>
                </section>

                <WarningList title="Duplicate warnings" items={report.duplicate_warnings} />
                <WarningList title="Missing-field warnings" items={report.missing_field_warnings} />
                <WarningList title="Bad-link warnings" items={report.bad_link_warnings} />

                <section className="rounded-3xl border border-slate-200 bg-white p-5">
                  <h3 className="text-base font-semibold text-slate-900">Unresolved items</h3>
                  <SimpleTable
                    headers={report.unresolved_items?.length ? Object.keys(report.unresolved_items[0]) : []}
                    rows={report.unresolved_items ?? []}
                    emptyLabel="No unresolved items returned from extraction."
                  />
                </section>
              </div>
            </>
          ) : null}
        </section>
      </main>
    </div>
  )
}
