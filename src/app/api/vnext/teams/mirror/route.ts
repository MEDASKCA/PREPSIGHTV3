import { NextResponse } from "next/server"
import { canMirrorWorkspaceToTeams } from "@/lib/teams-mirroring"
import { appendTeamsMirrorLogEntry, getTeamsWorkspaceMirrorConfig } from "@/lib/firestore"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const workspaceId = typeof body?.workspaceId === "string" ? body.workspaceId.trim() : ""
  const threadId = typeof body?.threadId === "string" ? body.threadId.trim() : ""
  const senderId = typeof body?.senderId === "string" ? body.senderId.trim() : ""
  const text = typeof body?.text === "string" ? body.text.trim() : ""

  if (!workspaceId || !threadId || !senderId || !text) {
    return NextResponse.json(
      { error: "workspaceId, threadId, senderId, and text are required." },
      { status: 400 },
    )
  }

  const config = await getTeamsWorkspaceMirrorConfig(workspaceId)
  if (!canMirrorWorkspaceToTeams(config)) {
    return NextResponse.json({
      mirrored: false,
      reason: "Teams mirroring is not enabled or not mapped for this workspace.",
    })
  }

  await appendTeamsMirrorLogEntry({
    workspaceId,
    threadId,
    senderId,
    text,
    messageId: typeof body?.messageId === "string" ? body.messageId.trim() : undefined,
    metadata: typeof body?.metadata === "object" && body.metadata ? body.metadata : undefined,
  })

  // TODO: replace this placeholder with real Microsoft Graph channel posting.
  return NextResponse.json({
    mirrored: true,
    teamId: config?.teamsTeamId ?? null,
    channelId: config?.teamsChannelId ?? null,
  })
}
