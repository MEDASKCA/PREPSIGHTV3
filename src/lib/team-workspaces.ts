"use client"

import { OrganizationMembershipRecord, OrganizationRecord, PrepSightProfile, USER_ROLE_TO_PLATFORM_ROLE } from "./types"
import {
  buildMemberPublicAlias,
  buildOpaquePublicAlias,
  buildOrganizationPublicAlias,
  formatMemberIdentity,
  formatOrganizationIdentity,
} from "./identity"

const TEAMS_STORAGE_KEY = "prepsight_team_workspaces"
const MEMBERSHIPS_STORAGE_KEY = "prepsight_team_memberships"
const TEAMS_EVENT = "prepsight:teams"
let cachedTeamsRaw: string | null | undefined
let cachedTeams: TeamWorkspaceRecord[] = []
let cachedMembershipsRaw: string | null | undefined
let cachedMemberships: MembershipMap = {}

export interface TeamWorkspaceRecord extends OrganizationRecord {
  inviteCode: string
}

type MembershipMap = Record<string, OrganizationMembershipRecord[]>

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function readTeams(): TeamWorkspaceRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(TEAMS_STORAGE_KEY)
    if (raw === cachedTeamsRaw) return cachedTeams
    if (!raw) {
      cachedTeamsRaw = raw
      cachedTeams = []
      return cachedTeams
    }
    const parsed = JSON.parse(raw)
    cachedTeamsRaw = raw
    cachedTeams = Array.isArray(parsed) ? parsed as TeamWorkspaceRecord[] : []
    return cachedTeams
  } catch {
    return cachedTeams
  }
}

function writeTeams(teams: TeamWorkspaceRecord[]): void {
  if (typeof window === "undefined") return
  const raw = JSON.stringify(teams)
  cachedTeamsRaw = raw
  cachedTeams = teams
  window.localStorage.setItem(TEAMS_STORAGE_KEY, raw)
}

function readMemberships(): MembershipMap {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(MEMBERSHIPS_STORAGE_KEY)
    if (raw === cachedMembershipsRaw) return cachedMemberships
    if (!raw) {
      cachedMembershipsRaw = raw
      cachedMemberships = {}
      return cachedMemberships
    }
    const parsed = JSON.parse(raw)
    cachedMembershipsRaw = raw
    cachedMemberships = parsed && typeof parsed === "object" ? parsed as MembershipMap : {}
    return cachedMemberships
  } catch {
    return cachedMemberships
  }
}

function writeMemberships(map: MembershipMap): void {
  if (typeof window === "undefined") return
  const raw = JSON.stringify(map)
  cachedMembershipsRaw = raw
  cachedMemberships = map
  window.localStorage.setItem(MEMBERSHIPS_STORAGE_KEY, raw)
}

function emitChange(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(TEAMS_EVENT))
}

export function subscribeTeams(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined
  const handler = () => listener()
  window.addEventListener(TEAMS_EVENT, handler)
  window.addEventListener("storage", handler)
  return () => {
    window.removeEventListener(TEAMS_EVENT, handler)
    window.removeEventListener("storage", handler)
  }
}

export function getTeamWorkspacesSnapshot(): TeamWorkspaceRecord[] {
  return readTeams()
}

export function getActiveTeamSnapshot(profile: PrepSightProfile | null): TeamWorkspaceRecord | null {
  if (!profile?.activeOrganizationId) return null
  return readTeams().find((team) => team.id === profile.activeOrganizationId) ?? null
}

export function getTeamMembersSnapshot(organizationId?: string): OrganizationMembershipRecord[] {
  if (!organizationId) return []
  return readMemberships()[organizationId] ?? []
}

export function getMemberPublicAlias(
  organizationId: string | undefined,
  displayName?: string,
): string {
  if (!organizationId) return buildOpaquePublicAlias("MEM")
  const existing = getTeamMembersSnapshot(organizationId).find((member) => member.displayName === displayName)
  return existing?.publicAlias ?? buildOpaquePublicAlias("MEM")
}

export function getContributionIdentity(profile: PrepSightProfile | null, visibility: "internal" | "public"): string {
  if (!profile) return visibility === "public" ? "Local staff" : "Unknown"
  return formatMemberIdentity(
    visibility === "internal" ? "internal" : "anonymised",
    {
      displayName: profile.name?.trim() || "You",
      publicAlias: getMemberPublicAlias(profile.activeOrganizationId, profile.name),
    },
    "You",
    "Local staff",
  )
}

export function getOrganizationIdentity(profile: PrepSightProfile | null, visibility: "internal" | "public"): string {
  if (!profile) return visibility === "public" ? "PSH-000" : "Unknown organisation"
  const activeTeam = getActiveTeamSnapshot(profile)
  return formatOrganizationIdentity(
    visibility === "internal" ? "internal" : "anonymised",
    {
      internalName: activeTeam?.internalName ?? profile.hospital ?? "Unknown organisation",
      publicAlias: activeTeam?.publicAlias ?? "PSH-000",
    },
    visibility === "internal" ? "Unknown organisation" : "PSH-000",
  )
}

export function createTeamWorkspace(input: {
  name: string
  profile: PrepSightProfile
  uid?: string | null
  visibility?: TeamWorkspaceRecord["visibility"]
}): TeamWorkspaceRecord {
  const now = new Date().toISOString()
  const teams = readTeams()
  const baseId = slugify(input.name) || slugify(input.profile.hospital) || "team"
  let id = baseId
  let suffix = 2
  while (teams.some((team) => team.id === id)) {
    id = `${baseId}-${suffix}`
    suffix += 1
  }

  const team: TeamWorkspaceRecord = {
    id,
    internalName: input.name.trim(),
    publicAlias: buildOrganizationPublicAlias(),
    inviteCode: buildOpaquePublicAlias("TEAM"),
    visibility: input.visibility ?? "shared_anonymised",
    createdAt: now,
    createdBy: input.uid ?? "local-user",
    aliasRotatesAfter: now,
  }

  const memberships = readMemberships()
  const creator: OrganizationMembershipRecord = {
    id: `${input.uid ?? "local-user"}__${id}`,
    organizationId: id,
    uid: input.uid ?? "local-user",
    displayName: input.profile.name ?? "You",
    internalRole: input.profile.role,
    platformRole: input.profile.platformRole ?? USER_ROLE_TO_PLATFORM_ROLE[input.profile.role],
    departments: input.profile.departments,
    specialtiesOfInterest: input.profile.specialtiesOfInterest,
    status: "active",
    publicAlias: buildMemberPublicAlias(input.profile),
    approvedBy: input.uid ?? "local-user",
    requestedAt: now,
    approvedAt: now,
  }

  writeTeams([team, ...teams])
  writeMemberships({
    ...memberships,
    [id]: [creator, ...(memberships[id] ?? [])],
  })
  emitChange()
  return team
}

export function joinTeamWorkspace(input: {
  inviteCode: string
  profile: PrepSightProfile
  uid?: string | null
}): TeamWorkspaceRecord | null {
  const teams = readTeams()
  const team = teams.find((entry) => entry.inviteCode.toLowerCase() === input.inviteCode.trim().toLowerCase())
  if (!team) return null

  const memberships = readMemberships()
  const teamMemberships = memberships[team.id] ?? []
  const uid = input.uid ?? "local-user"
  if (!teamMemberships.some((member) => member.uid === uid)) {
    teamMemberships.push({
      id: `${uid}__${team.id}`,
      organizationId: team.id,
      uid,
      displayName: input.profile.name ?? "You",
      internalRole: input.profile.role,
      platformRole: input.profile.platformRole ?? USER_ROLE_TO_PLATFORM_ROLE[input.profile.role],
      departments: input.profile.departments,
      specialtiesOfInterest: input.profile.specialtiesOfInterest,
      status: "active",
      publicAlias: buildMemberPublicAlias(input.profile),
      approvedBy: team.createdBy,
      requestedAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
    })
  }

  writeMemberships({
    ...memberships,
    [team.id]: teamMemberships,
  })
  emitChange()
  return team
}
