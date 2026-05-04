import { TEAMS_MIRRORING_ENABLED } from "./identity-config"

export interface TeamsWorkspaceMirrorConfig {
  workspaceId: string
  teamsTeamId?: string
  teamsChannelId?: string
  teamsMirroringEnabled: boolean
}

export interface TeamsMirrorPayload {
  workspaceId: string
  threadId: string
  senderId: string
  text: string
  messageId?: string
  metadata?: Record<string, string>
}

export function canMirrorWorkspaceToTeams(config: TeamsWorkspaceMirrorConfig | null | undefined) {
  return Boolean(
    TEAMS_MIRRORING_ENABLED &&
      config?.teamsMirroringEnabled &&
      config.teamsTeamId &&
      config.teamsChannelId,
  )
}
