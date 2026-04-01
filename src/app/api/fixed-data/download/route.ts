import { readFile } from "node:fs/promises"
import path from "node:path"

import { NextResponse } from "next/server"

import { isDevRequestHost } from "@/lib/dev-access"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ROOT = process.cwd()
const IMPORTS_DIR = path.join(ROOT, "data", "catalogue", "imports")

export async function GET(request: Request) {
  if (!(await isDevRequestHost())) {
    return NextResponse.json({ ok: false, error: "Not available." }, { status: 404 })
  }

  const url = new URL(request.url)
  const file = url.searchParams.get("file")
  if (!file || file.includes("/") || file.includes("\\") || !file.endsWith(".xlsx")) {
    return NextResponse.json({ ok: false, error: "Invalid file." }, { status: 400 })
  }

  try {
    const target = path.join(IMPORTS_DIR, file)
    const buffer = await readFile(target)
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${file}"`,
      },
    })
  } catch {
    return NextResponse.json({ ok: false, error: "File not found." }, { status: 404 })
  }
}
