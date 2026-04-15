"use client"

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore"
import { db } from "./firebase"
import {
  OrganizationMembershipRecord,
  OrganizationRecord,
  PrepSightProfile,
  Procedure,
  USER_ROLE_TO_PLATFORM_ROLE,
  type LibraryRecord,
} from "./types"
import { buildMemberPublicAlias, buildOpaquePublicAlias, buildOrganizationPublicAlias } from "./identity"

const LIBRARIES_COLLECTION = "libraries"
const LIBRARY_CARDS_COLLECTION = "library_cards"
const PUBLISHED_CARDS_COLLECTION = "published_cards"
const BOOKMARKS_COLLECTION = "bookmarks"

export interface StoredBookmarkRecord {
  id: string
  title: string
  subtitle: string
  href: string
  savedAt: string
}

export interface FirestoreTeamWorkspaceRecord extends OrganizationRecord {
  inviteCode: string
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function isRemoteReady(uid?: string | null): uid is string {
  return Boolean(db && uid && !uid.startsWith("local-dev-"))
}

function membershipDocId(uid: string, organizationId: string) {
  return `${uid}__${organizationId}`
}

function libraryCardDocId(libraryId: string, cardId: string) {
  return `${libraryId}__${cardId}`.replace(/[^a-zA-Z0-9:_-]+/g, "-")
}

function bookmarkDocId(uid: string, bookmarkId: string) {
  return `${uid}__${bookmarkId}`.replace(/[^a-zA-Z0-9:_-]+/g, "-")
}

function sortProcedures(cards: Procedure[]): Procedure[] {
  return [...cards].sort((left, right) => {
    const leftTime = left.updatedAt ?? left.publishedAt ?? left.createdAt ?? ""
    const rightTime = right.updatedAt ?? right.publishedAt ?? right.createdAt ?? ""
    if (leftTime !== rightTime) return rightTime.localeCompare(leftTime)
    return left.name.localeCompare(right.name)
  })
}

export function canUseCollaborationFirestore(uid?: string | null): boolean {
  return isRemoteReady(uid)
}

export async function getFirestoreLibraries(
  allowedOwnerIds: string[],
): Promise<LibraryRecord[]> {
  if (!db || allowedOwnerIds.length === 0) return []

  try {
    const snap = await getDocs(collection(db, LIBRARIES_COLLECTION))
    const allowed = new Set(allowedOwnerIds)
    return snap.docs
      .map((entry) => ({ id: entry.id, ...entry.data() } as LibraryRecord))
      .filter((entry) => allowed.has(entry.ownerId))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  } catch (error) {
    console.warn("[PrepSight] getFirestoreLibraries failed:", error)
    return []
  }
}

export async function saveFirestoreLibrary(
  uid: string,
  library: LibraryRecord,
): Promise<void> {
  if (!isRemoteReady(uid)) return
  await setDoc(doc(db!, LIBRARIES_COLLECTION, library.id), {
    ...library,
    updatedBy: uid,
  })
}

export async function getFirestoreLibraryCards(
  libraryIds: string[],
): Promise<Record<string, Procedure[]>> {
  if (!db || libraryIds.length === 0) return {}

  try {
    const snap = await getDocs(collection(db, LIBRARY_CARDS_COLLECTION))
    const allowed = new Set(libraryIds)
    const cardsByLibrary: Record<string, Procedure[]> = {}

    snap.docs.forEach((entry) => {
      const data = entry.data() as { libraryId?: string; card?: Procedure }
      if (!data.libraryId || !data.card || !allowed.has(data.libraryId)) return
      cardsByLibrary[data.libraryId] = [...(cardsByLibrary[data.libraryId] ?? []), data.card]
    })

    Object.keys(cardsByLibrary).forEach((libraryId) => {
      cardsByLibrary[libraryId] = sortProcedures(cardsByLibrary[libraryId] ?? [])
    })

    return cardsByLibrary
  } catch (error) {
    console.warn("[PrepSight] getFirestoreLibraryCards failed:", error)
    return {}
  }
}

export async function saveFirestoreLibraryCard(
  uid: string,
  libraryId: string,
  card: Procedure,
): Promise<void> {
  if (!isRemoteReady(uid)) return
  await setDoc(doc(db!, LIBRARY_CARDS_COLLECTION, libraryCardDocId(libraryId, card.id)), {
    id: libraryCardDocId(libraryId, card.id),
    libraryId,
    card,
    updatedAt: new Date().toISOString(),
    updatedBy: uid,
  })
}

export async function getFirestorePublishedCards(): Promise<Procedure[]> {
  if (!db) return []

  try {
    const snap = await getDocs(collection(db, PUBLISHED_CARDS_COLLECTION))
    return sortProcedures(
      snap.docs.map((entry) => {
        const data = entry.data() as { card?: Procedure }
        return data.card ?? ({ id: entry.id } as Procedure)
      }).filter((card): card is Procedure => typeof card.id === "string"),
    )
  } catch (error) {
    console.warn("[PrepSight] getFirestorePublishedCards failed:", error)
    return []
  }
}

export async function saveFirestorePublishedCard(
  uid: string,
  card: Procedure,
): Promise<void> {
  if (!isRemoteReady(uid)) return
  await setDoc(doc(db!, PUBLISHED_CARDS_COLLECTION, card.id), {
    id: card.id,
    card,
    updatedAt: new Date().toISOString(),
    updatedBy: uid,
  })
}

export async function getFirestoreBookmarks(uid: string): Promise<StoredBookmarkRecord[]> {
  if (!isRemoteReady(uid)) return []

  try {
    const snap = await getDocs(query(collection(db!, BOOKMARKS_COLLECTION), where("uid", "==", uid)))
    return snap.docs
      .map((entry) => entry.data() as StoredBookmarkRecord & { uid: string })
      .filter((entry) => typeof entry.id === "string")
      .sort((left, right) => right.savedAt.localeCompare(left.savedAt))
      .map(({ uid: _uid, ...bookmark }) => bookmark)
  } catch (error) {
    console.warn("[PrepSight] getFirestoreBookmarks failed:", error)
    return []
  }
}

export async function saveFirestoreBookmark(
  uid: string,
  bookmark: StoredBookmarkRecord,
): Promise<void> {
  if (!isRemoteReady(uid)) return
  await setDoc(doc(db!, BOOKMARKS_COLLECTION, bookmarkDocId(uid, bookmark.id)), {
    ...bookmark,
    uid,
  })
}

export async function deleteFirestoreBookmark(uid: string, bookmarkId: string): Promise<void> {
  if (!isRemoteReady(uid)) return
  await deleteDoc(doc(db!, BOOKMARKS_COLLECTION, bookmarkDocId(uid, bookmarkId)))
}

export async function getFirestoreTeamsForProfile(
  uid: string,
  profile: PrepSightProfile | null,
): Promise<{
  teams: FirestoreTeamWorkspaceRecord[]
  membershipsByOrganizationId: Record<string, OrganizationMembershipRecord[]>
}> {
  if (!isRemoteReady(uid)) {
    return { teams: [], membershipsByOrganizationId: {} }
  }

  try {
    const [organizationsSnap, membershipsSnap] = await Promise.all([
      getDocs(collection(db!, "organizations")),
      getDocs(collection(db!, "organization_memberships")),
    ])

    const allMemberships = membershipsSnap.docs.map(
      (entry) => ({ id: entry.id, ...entry.data() } as OrganizationMembershipRecord),
    )

    const allowedOrganizationIds = new Set<string>([
      ...(profile?.organizationIds ?? []),
      ...(profile?.activeOrganizationId ? [profile.activeOrganizationId] : []),
      ...allMemberships.filter((membership) => membership.uid === uid).map((membership) => membership.organizationId),
    ])

    const membershipsByOrganizationId: Record<string, OrganizationMembershipRecord[]> = {}
    allMemberships.forEach((membership) => {
      if (!allowedOrganizationIds.has(membership.organizationId)) return
      membershipsByOrganizationId[membership.organizationId] = [
        ...(membershipsByOrganizationId[membership.organizationId] ?? []),
        membership,
      ]
    })

    const teams = organizationsSnap.docs
      .map((entry) => ({ id: entry.id, ...entry.data() } as FirestoreTeamWorkspaceRecord))
      .filter((team) => allowedOrganizationIds.has(team.id))
      .sort((left, right) => left.internalName.localeCompare(right.internalName))

    return { teams, membershipsByOrganizationId }
  } catch (error) {
    console.warn("[PrepSight] getFirestoreTeamsForProfile failed:", error)
    return { teams: [], membershipsByOrganizationId: {} }
  }
}

export async function createFirestoreTeamWorkspace(input: {
  name: string
  profile: PrepSightProfile
  uid: string
  visibility?: FirestoreTeamWorkspaceRecord["visibility"]
}): Promise<FirestoreTeamWorkspaceRecord> {
  if (!isRemoteReady(input.uid)) {
    throw new Error("Firestore not available")
  }

  const now = new Date().toISOString()
  const baseId = slugify(input.name) || slugify(input.profile.hospital) || "team"
  let id = baseId
  let suffix = 2

  while ((await getDoc(doc(db!, "organizations", id))).exists()) {
    id = `${baseId}-${suffix}`
    suffix += 1
  }

  const team: FirestoreTeamWorkspaceRecord = {
    id,
    internalName: input.name.trim(),
    publicAlias: buildOrganizationPublicAlias(),
    inviteCode: buildOpaquePublicAlias("TEAM"),
    visibility: input.visibility ?? "shared_anonymised",
    createdAt: now,
    createdBy: input.uid,
    aliasRotatesAfter: now,
  }

  const membership: OrganizationMembershipRecord = {
    id: membershipDocId(input.uid, id),
    organizationId: id,
    uid: input.uid,
    displayName: input.profile.name ?? "You",
    internalRole: input.profile.role,
    platformRole: input.profile.platformRole ?? USER_ROLE_TO_PLATFORM_ROLE[input.profile.role],
    departments: input.profile.departments,
    specialtiesOfInterest: input.profile.specialtiesOfInterest,
    status: "active",
    publicAlias: buildMemberPublicAlias(input.profile),
    approvedBy: input.uid,
    requestedAt: now,
    approvedAt: now,
  }

  await Promise.all([
    setDoc(doc(db!, "organizations", team.id), team),
    setDoc(doc(db!, "organization_memberships", membership.id), membership),
  ])

  return team
}

export async function joinFirestoreTeamWorkspace(input: {
  inviteCode: string
  profile: PrepSightProfile
  uid: string
}): Promise<{ team: FirestoreTeamWorkspaceRecord; membership: OrganizationMembershipRecord } | null> {
  if (!isRemoteReady(input.uid)) {
    return null
  }

  try {
    const organizationsSnap = await getDocs(collection(db!, "organizations"))
    const team = organizationsSnap.docs
      .map((entry) => ({ id: entry.id, ...entry.data() } as FirestoreTeamWorkspaceRecord))
      .find((entry) => entry.inviteCode?.toLowerCase() === input.inviteCode.trim().toLowerCase())

    if (!team) return null

    const membershipId = membershipDocId(input.uid, team.id)
    const membershipRef = doc(db!, "organization_memberships", membershipId)
    const existingMembershipSnap = await getDoc(membershipRef)
    const now = new Date().toISOString()
    const existingMembership = existingMembershipSnap.exists()
      ? ({ id: existingMembershipSnap.id, ...existingMembershipSnap.data() } as OrganizationMembershipRecord)
      : null
    const requestedStatus = existingMembership?.status ?? "pending_approval"
    const membership: OrganizationMembershipRecord = {
      id: membershipId,
      organizationId: team.id,
      uid: input.uid,
      displayName: input.profile.name ?? existingMembership?.displayName ?? "You",
      internalRole: input.profile.role,
      platformRole: input.profile.platformRole ?? USER_ROLE_TO_PLATFORM_ROLE[input.profile.role],
      departments: input.profile.departments,
      specialtiesOfInterest: input.profile.specialtiesOfInterest,
      status: requestedStatus,
      publicAlias: existingMembership?.publicAlias ?? buildMemberPublicAlias(input.profile),
      approvedBy: requestedStatus === "active" ? existingMembership?.approvedBy ?? team.createdBy : undefined,
      requestedAt: existingMembership?.requestedAt ?? now,
      approvedAt: requestedStatus === "active" ? existingMembership?.approvedAt ?? now : undefined,
    }

    await setDoc(membershipRef, membership)
    return { team, membership }
  } catch (error) {
    console.warn("[PrepSight] joinFirestoreTeamWorkspace failed:", error)
    return null
  }
}
