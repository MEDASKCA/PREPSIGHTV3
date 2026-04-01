import { NextResponse } from "next/server"

import { isDevRequestHost } from "@/lib/dev-access"
import { validateExtractionPayload } from "@/lib/fixed-data-curation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    if (!(await isDevRequestHost())) {
      return NextResponse.json({ ok: false, error: "Not available." }, { status: 404 })
    }
    const payload = await request.json()
    const result = await validateExtractionPayload(payload)
    return NextResponse.json({ ok: true, report: result.report })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Validation failed.",
      },
      { status: 500 },
    )
  }
}
