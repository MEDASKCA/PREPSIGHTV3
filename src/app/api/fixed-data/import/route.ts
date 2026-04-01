import { NextResponse } from "next/server"

import { isDevRequestHost } from "@/lib/dev-access"
import { importValidatedReport, type ValidationReport } from "@/lib/fixed-data-curation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    if (!(await isDevRequestHost())) {
      return NextResponse.json({ ok: false, error: "Not available." }, { status: 404 })
    }
    const body = (await request.json()) as { report?: ValidationReport }
    if (!body.report) {
      return NextResponse.json({ ok: false, error: "Missing validated report." }, { status: 400 })
    }
    const result = await importValidatedReport(body.report)
    return NextResponse.json({
      ok: true,
      summary: result.summary,
      workbookPath: result.workbookPath,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Import failed.",
      },
      { status: 500 },
    )
  }
}
