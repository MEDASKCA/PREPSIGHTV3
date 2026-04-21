"use client"

import { onAuthChange } from "./auth"
import {
  approveFirestoreMembership,
  canUseCollaborationFirestore,
  createFirestoreTeamWorkspace,
  getFirestoreTeamsForProfile,
  joinFirestoreTeamWorkspace,
  type FirestoreTeamWorkspaceRecord,
} from "./collaboration-firestore"
import {
  OrganizationMembershipRecord,
  OrganizationRecord,
  PrepSightProfile,
  USER_ROLE_TO_PLATFORM_ROLE,
} from "./types"
import {
  buildMemberPublicAlias,
  buildOpaquePublicAlias,
  buildOrganizationPublicAlias,
  formatMemberIdentity,
  formatOrganizationIdentity,
} from "./identity"
import { getProfile } from "./profile"

const TEAMS_STORAGE_KEY = "prepsight_team_workspaces"
const MEMBERSHIPS_STORAGE_KEY = "prepsight_team_memberships"
const TEAMS_EVENT = "prepsight:teams"

let cachedTeamsRaw: string | null | undefined
let cachedTeams: TeamWorkspaceRecord[] = []
let cachedMembershipsRaw: string | null | undefined
let cachedMemberships: MembershipMap = {}
let authListening = false
let activeUid: string | null = null
const EMPTY_TEAM_MEMBERS: OrganizationMembershipRecord[] = []

export interface TeamWorkspaceRecord extends OrganizationRecord {
  inviteCode: string
}

type MembershipMap = Record<string, OrganizationMembershipRecord[]>

export interface TeamJoinResult {
  team: TeamWorkspaceRecord
  membership: OrganizationMembershipRecord
}

function normalizeTeamWorkspace(value: unknown): TeamWorkspaceRecord | null {
  if (!value || typeof value !== "object") return null
  const team = value as Partial<TeamWorkspaceRecord>
  if (typeof team.id !== "string" || typeof team.internalName !== "string") return null
  if (typeof team.publicAlias !== "string" || typeof team.visibility !== "string") return null
  if (typeof team.createdAt !== "string" || typeof team.createdBy !== "string") return null

  return {
    id: team.id,
    internalName: team.internalName,
    publicAlias: team.publicAlias,
    visibility: team.visibility as TeamWorkspaceRecord["visibility"],
    createdAt: team.createdAt,
    createdBy: team.createdBy,
    aliasRotatesAfter: typeof team.aliasRotatesAfter === "string" ? team.aliasRotatesAfter : undefined,
    inviteCode: typeof team.inviteCode === "string" ? team.inviteCode : "",
  }
}

function normalizeMembership(value: unknown): OrganizationMembershipRecord | null {
  if (!value || typeof value !== "object") return null
  const membership = value as Partial<OrganizationMembershipRecord>
  if (
    typeof membership.id !== "string" ||
    typeof membership.organizationId !== "string" ||
    typeof membership.uid !== "string" ||
    !Array.isArray(membership.departments) ||
    !Array.isArray(membership.specialtiesOfInterest) ||
    typeof membership.internalRole !== "string" ||
    typeof membership.platformRole !== "string" ||
    typeof membership.status !== "string" ||
    typeof membership.publicAlias !== "string" ||
    typeof membership.requestedAt !== "string"
  ) {
    return null
  }

  return {
    id: membership.id,
    organizationId: membership.organizationId,
    uid: membership.uid,
    displayName: typeof membership.displayName === "string" ? membership.displayName : undefined,
    internalRole: membership.internalRole as OrganizationMembershipRecord["internalRole"],
    platformRole: membership.platformRole as OrganizationMembershipRecord["platformRole"],
    departments: membership.departments.filter((entry): entry is string => typeof entry === "string"),
    specialtiesOfInterest: membership.specialtiesOfInterest.filter((entry): entry is string => typeof entry === "string"),
    status: membership.status as OrganizationMembershipRecord["status"],
    publicAlias: membership.publicAlias,
    approvedBy: typeof membership.approvedBy === "string" ? membership.approvedBy : undefined,
    requestedAt: membership.requestedAt,
    approvedAt: typeof membership.approvedAt === "string" ? membership.approvedAt : undefined,
    startsAt: typeof membership.startsAt === "string" ? membership.startsAt : undefined,
    endsAt: typeof membership.endsAt === "string" ? membership.endsAt : undefined,
  }
}

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
    cachedTeams = Array.isArray(parsed)
      ? parsed
          .map((entry) => normalizeTeamWorkspace(entry))
          .filter((entry): entry is TeamWorkspaceRecord => Boolean(entry))
      : []
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
    cachedMemberships = parsed && typeof parsed === "object"
      ? Object.fromEntries(
          Object.entries(parsed).map(([organizationId, memberships]) => [
            organizationId,
            Array.isArray(memberships)
              ? memberships
                  .map((entry) => normalizeMembership(entry))
                  .filter((entry): entry is OrganizationMembershipRecord => Boolean(entry))
              : [],
          ]),
        )
      : {}
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

function getCurrentUserMemberships(): OrganizationMembershipRecord[] {
  if (!activeUid) return []
  return Object.values(readMemberships())
    .reduce<OrganizationMembershipRecord[]>((all, memberships) => {
      all.push(...memberships)
      return all
    }, [])
    .filter((membership) => membership.uid === activeUid)
}

export function getAccessibleOrganizationIdsForProfile(profile: PrepSightProfile | null): string[] {
  if (!profile) return []
  const currentMemberships = getCurrentUserMemberships()
  if (currentMemberships.length === 0) {
    return Array.from(
      new Set([
        ...(profile.organizationIds ?? []),
        ...(profile.activeOrganizationId ? [profile.activeOrganizationId] : []),
      ]),
    )
  }

  return Array.from(
    new Set(
      currentMemberships
        .filter((membership) => membership.status === "active")
        .map((membership) => membership.organizationId),
    ),
  )
}

function getPendingOrganizationIds(profile: PrepSightProfile | null): string[] {
  if (!profile) return []
  return Array.from(
    new Set(
      getCurrentUserMemberships()
        .filter((membership) => membership.status === "pending_approval")
        .map((membership) => membership.organizationId),
    ),
  )
}

function mergeTeams(primary: TeamWorkspaceRecord[], secondary: TeamWorkspaceRecord[]): TeamWorkspaceRecord[] {
  const byId = new Map<string, TeamWorkspaceRecord>()
  for (const team of secondary) byId.set(team.id, team)
  for (const team of primary) byId.set(team.id, team)
  return [...byId.values()].sort((left, right) =>
    (left.internalName ?? "").localeCompare(right.internalName ?? ""),
  )
}

function mergeMembershipMaps(primary: MembershipMap, secondary: MembershipMap): MembershipMap {
  const allOrganizationIds = new Set([...Object.keys(primary), ...Object.keys(secondary)])
  const merged: MembershipMap = {}

  allOrganizationIds.forEach((organizationId) => {
    const entries = new Map<string, OrganizationMembershipRecord>()
    for (const membership of secondary[organizationId] ?? []) entries.set(membership.id, membership)
    for (const membership of primary[organizationId] ?? []) entries.set(membership.id, membership)
    merged[organizationId] = [...entries.values()].sort((left, right) =>
      (left.displayName ?? "").localeCompare(right.displayName ?? ""),
    )
  })

  return merged
}

async function hydrateRemoteTeams(uid: string | null): Promise<void> {
  if (typeof window === "undefined") return
  if (!canUseCollaborationFirestore(uid)) {
    writeTeams(readTeams())
    writeMemberships(readMemberships())
    emitChange()
    return
  }

  const remoteUid = uid as string
  const profile = getProfile()
  const localTeams = readTeams()
  const localMemberships = readMemberships()
  const remote = await getFirestoreTeamsForProfile(remoteUid, profile)
  const mergedTeams = mergeTeams(remote.teams, localTeams)
  const mergedMemberships = mergeMembershipMaps(remote.membershipsByOrganizationId, localMemberships)

  writeTeams(mergedTeams)
  writeMemberships(mergedMemberships)
  emitChange()
}

export async function refreshTeamWorkspaceData(uid?: string | null): Promise<void> {
  await hydrateRemoteTeams(uid ?? activeUid)
}

function ensureRealtimeSync(): void {
  if (authListening || typeof window === "undefined") return
  authListening = true
  readTeams()
  readMemberships()

  onAuthChange((user) => {
    activeUid = user?.uid ?? null
    void hydrateRemoteTeams(activeUid)
  })
}

export function subscribeTeams(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined
  ensureRealtimeSync()

  const handler = () => listener()
  window.addEventListener(TEAMS_EVENT, handler)
  window.addEventListener("storage", handler)
  return () => {
    window.removeEventListener(TEAMS_EVENT, handler)
    window.removeEventListener("storage", handler)
  }
}

export function getTeamWorkspacesSnapshot(): TeamWorkspaceRecord[] {
  ensureRealtimeSync()
  return readTeams()
}

export function getTeamWorkspacesForProfile(profile: PrepSightProfile | null): TeamWorkspaceRecord[] {
  if (!profile) return []
  const allowed = new Set(getAccessibleOrganizationIdsForProfile(profile))
  return getTeamWorkspacesSnapshot().filter((team) => allowed.has(team.id))
}

export function getActiveTeamSnapshot(profile: PrepSightProfile | null): TeamWorkspaceRecord | null {
  if (!profile) return null
  const accessibleOrganizationIds = getAccessibleOrganizationIdsForProfile(profile)
  if (accessibleOrganizationIds.length === 0) return null
  const requestedId = profile.activeOrganizationId?.trim()
  const activeOrganizationId = requestedId && accessibleOrganizationIds.includes(requestedId)
    ? requestedId
    : accessibleOrganizationIds[0]
  return getTeamWorkspacesSnapshot().find((team) => team.id === activeOrganizationId) ?? null
}

export function getPendingTeamWorkspacesForProfile(profile: PrepSightProfile | null): TeamWorkspaceRecord[] {
  if (!profile) return []
  const pending = new Set(getPendingOrganizationIds(profile))
  return getTeamWorkspacesSnapshot().filter((team) => pending.has(team.id))
}

export function getTeamMembersSnapshot(organizationId?: string): OrganizationMembershipRecord[] {
  ensureRealtimeSync()
  if (!organizationId) return EMPTY_TEAM_MEMBERS
  return readMemberships()[organizationId] ?? EMPTY_TEAM_MEMBERS
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

function buildLocalTeamWorkspace(input: {
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

  return {
    id,
    internalName: input.name.trim(),
    publicAlias: buildOrganizationPublicAlias(),
    inviteCode: buildOpaquePublicAlias("TEAM"),
    visibility: input.visibility ?? "shared_anonymised",
    createdAt: now,
    createdBy: input.uid ?? "local-user",
    aliasRotatesAfter: now,
  }
}

function buildLocalMembership(team: TeamWorkspaceRecord, input: {
  profile: PrepSightProfile
  uid?: string | null
  status?: OrganizationMembershipRecord["status"]
}): OrganizationMembershipRecord {
  const now = new Date().toISOString()
  const uid = input.uid ?? "local-user"
  const status = input.status ?? "active"
  return {
    id: `${uid}__${team.id}`,
    organizationId: team.id,
    uid,
    displayName: input.profile.name ?? "You",
    internalRole: input.profile.role,
    platformRole: input.profile.platformRole ?? USER_ROLE_TO_PLATFORM_ROLE[input.profile.role],
    departments: input.profile.departments,
    specialtiesOfInterest: input.profile.specialtiesOfInterest,
    status,
    publicAlias: buildMemberPublicAlias(input.profile),
    approvedBy: status === "active" ? team.createdBy : undefined,
    requestedAt: now,
    approvedAt: status === "active" ? now : undefined,
  }
}

function upsertLocalTeam(team: TeamWorkspaceRecord, membership: OrganizationMembershipRecord): void {
  writeTeams(mergeTeams([team], readTeams()))
  writeMemberships(
    mergeMembershipMaps(
      { [team.id]: [membership] },
      readMemberships(),
    ),
  )
  emitChange()
}

export async function createTeamWorkspace(input: {
  name: string
  profile: PrepSightProfile
  uid?: string | null
  visibility?: TeamWorkspaceRecord["visibility"]
}): Promise<TeamWorkspaceRecord> {
  ensureRealtimeSync()

  const fallbackTeam = buildLocalTeamWorkspace(input)
  const fallbackMembership = buildLocalMembership(fallbackTeam, {
    profile: input.profile,
    uid: input.uid,
  })
  upsertLocalTeam(fallbackTeam, fallbackMembership)

  if (!canUseCollaborationFirestore(activeUid ?? input.uid ?? null)) {
    return fallbackTeam
  }

  try {
    const remoteUid = (activeUid ?? input.uid) as string
    const remoteTeam = await createFirestoreTeamWorkspace({
      name: input.name,
      profile: input.profile,
      uid: remoteUid,
      visibility: input.visibility,
    })
    upsertLocalTeam(remoteTeam, buildLocalMembership(remoteTeam, { profile: input.profile, uid: remoteUid }))
    return remoteTeam
  } catch (error) {
    console.warn("[PrepSight] createTeamWorkspace remote sync failed:", error)
    return fallbackTeam
  }
}

export async function approveTeamMember(
  membershipId: string,
  uid: string | null,
): Promise<void> {
  if (!canUseCollaborationFirestore(uid)) return
  await approveFirestoreMembership(membershipId, uid as string)
  await hydrateRemoteTeams(uid)
}

export async function joinTeamWorkspace(input: {
  inviteCode: string
  profile: PrepSightProfile
  uid?: string | null
}): Promise<TeamJoinResult | null> {
  ensureRealtimeSync()

  if (canUseCollaborationFirestore(activeUid ?? input.uid ?? null)) {
    try {
      const remoteUid = (activeUid ?? input.uid) as string
      const remoteResult = await joinFirestoreTeamWorkspace({
        inviteCode: input.inviteCode,
        profile: input.profile,
        uid: remoteUid,
      })
      if (remoteResult) {
        upsertLocalTeam(remoteResult.team, {
          ...remoteResult.membership,
          displayName: remoteResult.membership.displayName ?? input.profile.name ?? "You",
        })
        return { team: remoteResult.team, membership: remoteResult.membership }
      }
    } catch (error) {
      console.warn("[PrepSight] joinTeamWorkspace remote sync failed:", error)
    }
  }

  const teams = readTeams()
  const team = teams.find((entry) => entry.inviteCode.toLowerCase() === input.inviteCode.trim().toLowerCase())
  if (!team) return null

  const membership = buildLocalMembership(team, { profile: input.profile, uid: input.uid })
  upsertLocalTeam(team, membership)
  return { team, membership }
}
