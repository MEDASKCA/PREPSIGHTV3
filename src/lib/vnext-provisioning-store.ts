import type { PrepSightNativeAccountRecord } from "./native-accounts"
import type { TeamsMirrorPayload, TeamsWorkspaceMirrorConfig } from "./teams-mirroring"

type NativeAccountRequestStore = Map<string, PrepSightNativeAccountRecord>
type TeamsWorkspaceConfigStore = Map<string, TeamsWorkspaceMirrorConfig>
type TeamsMirrorLog = Array<TeamsMirrorPayload & { createdAt: string }>

declare global {
  // eslint-disable-next-line no-var
  var __prepsightVnextNativeAccounts: NativeAccountRequestStore | undefined
  // eslint-disable-next-line no-var
  var __prepsightVnextTeamsConfigs: TeamsWorkspaceConfigStore | undefined
  // eslint-disable-next-line no-var
  var __prepsightVnextTeamsMirrorLog: TeamsMirrorLog | undefined
}

const nativeAccounts = globalThis.__prepsightVnextNativeAccounts ?? new Map<string, PrepSightNativeAccountRecord>()
const teamsConfigs = globalThis.__prepsightVnextTeamsConfigs ?? new Map<string, TeamsWorkspaceMirrorConfig>()
const teamsMirrorLog = globalThis.__prepsightVnextTeamsMirrorLog ?? []

globalThis.__prepsightVnextNativeAccounts = nativeAccounts
globalThis.__prepsightVnextTeamsConfigs = teamsConfigs
globalThis.__prepsightVnextTeamsMirrorLog = teamsMirrorLog

export function upsertNativeAccountRequest(record: PrepSightNativeAccountRecord) {
  nativeAccounts.set(record.uid, record)
  return record
}

export function getNativeAccountRequest(uid: string) {
  return nativeAccounts.get(uid) ?? null
}

export function upsertTeamsWorkspaceConfig(config: TeamsWorkspaceMirrorConfig) {
  teamsConfigs.set(config.workspaceId, config)
  return config
}

export function getTeamsWorkspaceConfig(workspaceId: string) {
  return teamsConfigs.get(workspaceId) ?? null
}

export function appendTeamsMirrorLog(payload: TeamsMirrorPayload) {
  teamsMirrorLog.unshift({ ...payload, createdAt: new Date().toISOString() })
  if (teamsMirrorLog.length > 200) teamsMirrorLog.length = 200
}

export function getTeamsMirrorLogSnapshot() {
  return [...teamsMirrorLog]
}
