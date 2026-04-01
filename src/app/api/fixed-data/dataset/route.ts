import { NextResponse } from "next/server"

import { isDevRequestHost } from "@/lib/dev-access"
import { loadFixedDataDataset } from "@/lib/fixed-data-curation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    if (!(await isDevRequestHost())) {
      return NextResponse.json({ ok: false, error: "Not available." }, { status: 404 })
    }
    const dataset = await loadFixedDataDataset()
    return NextResponse.json({ ok: true, dataset })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load dataset.",
      },
      { status: 500 },
    )
  }
}
