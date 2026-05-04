import { NextResponse } from "next/server"
import { getTeamsWorkspaceMirrorConfig, saveTeamsWorkspaceMirrorConfig } from "@/lib/firestore"
import { type TeamsWorkspaceMirrorConfig } from "@/lib/teams-mirroring"

type RouteContext = {
  params: Promise<{ workspaceId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { workspaceId } = await context.params
  const normalizedWorkspaceId = workspaceId.trim()

  if (!normalizedWorkspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 })
  }

  const config = await getTeamsWorkspaceMirrorConfig(normalizedWorkspaceId)
  return NextResponse.json({ config })
}

export async function PUT(request: Request, context: RouteContext) {
  const { workspaceId } = await context.params
  const normalizedWorkspaceId = workspaceId.trim()

  if (!normalizedWorkspaceId) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const teamsTeamId = typeof body?.teamsTeamId === "string" ? body.teamsTeamId.trim() : ""
  const teamsChannelId = typeof body?.teamsChannelId === "string" ? body.teamsChannelId.trim() : ""
  const teamsMirroringEnabled = body?.teamsMirroringEnabled === true

  const config: TeamsWorkspaceMirrorConfig = {
    workspaceId: normalizedWorkspaceId,
    teamsTeamId,
    teamsChannelId,
    teamsMirroringEnabled,
  }

  await saveTeamsWorkspaceMirrorConfig(config)

  return NextResponse.json({
    config,
    message: "Teams workspace mirroring config saved.",
  })
}
