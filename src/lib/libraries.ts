import { procedures } from "./data"
import { getProfile } from "./profile"
import { CLINICAL_SETTINGS } from "./settings"
import { onAuthChange } from "./auth"
import {
  canUseCollaborationFirestore,
  deleteFirestoreLibrary,
  getFirestoreLibraries,
  getFirestoreLibraryCards,
  getFirestorePublishedCards,
  saveFirestoreLibrary,
  saveFirestoreLibraryCard,
  saveFirestorePublishedCard,
} from "./collaboration-firestore"
import {
  getAccessibleOrganizationIdsForProfile,
  getActiveTeamSnapshot,
  getMemberPublicAlias,
} from "./team-workspaces"
import type { LibraryRecord, Procedure } from "./types"

const LIBRARIES_STORAGE_KEY = "prepsight_local_libraries"
const LIBRARY_CARDS_STORAGE_KEY = "prepsight_local_library_cards"
const PUBLISHED_CARDS_STORAGE_KEY = "prepsight_published_cards"
const KNOWN_REMOTE_LIBRARY_IDS_KEY = "prepsight_known_remote_library_ids"
const DELETED_LOCAL_LIBRARY_IDS_KEY = "prepsight_deleted_local_library_ids"
const LIBRARIES_EVENT = "prepsight:libraries"

const SHARED_LIBRARY_CREATED_AT = "2026-03-30T00:00:00.000Z"

type StoredCardsByLibrary = Record<string, Procedure[]>

let cachedLibrariesRaw: string | null | undefined
let cachedLocalLibraries: LibraryRecord[] = []
let cachedCardsRaw: string | null | undefined
let cachedLocalCards: StoredCardsByLibrary = {}
let cachedPublishedRaw: string | null | undefined
let cachedPublishedCards: Procedure[] = []
let cachedSnapshotKey: string | null | undefined
let cachedSnapshot: LibraryRecord[] = buildSharedLibraries()
let authListening = false
let activeUid: string | null = null

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function sortCards(cards: Procedure[]): Procedure[] {
  return [...cards].sort((left, right) => {
    const leftTime = left.updatedAt ?? left.publishedAt ?? left.createdAt ?? ""
    const rightTime = right.updatedAt ?? right.publishedAt ?? right.createdAt ?? ""
    if (leftTime !== rightTime) return rightTime.localeCompare(leftTime)
    return left.name.localeCompare(right.name)
  })
}

function dedupeLibraries(libraries: LibraryRecord[]): LibraryRecord[] {
  const byId = new Map<string, LibraryRecord>()

  for (const library of libraries) {
    const current = byId.get(library.id)
    if (!current || library.updatedAt.localeCompare(current.updatedAt) >= 0) {
      byId.set(library.id, library)
    }
  }

  return [...byId.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

function readLocalLibraries(): LibraryRecord[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(LIBRARIES_STORAGE_KEY)
    if (raw === cachedLibrariesRaw) return cachedLocalLibraries
    if (!raw) {
      cachedLibrariesRaw = raw
      cachedLocalLibraries = []
      return cachedLocalLibraries
    }

    const parsed = JSON.parse(raw)
    cachedLibrariesRaw = raw
    cachedLocalLibraries = Array.isArray(parsed)
      ? dedupeLibraries(
          parsed.filter((entry): entry is LibraryRecord => Boolean(entry) && typeof entry.id === "string"),
        )
      : []
    return cachedLocalLibraries
  } catch {
    return cachedLocalLibraries
  }
}

function readLocalCards(): StoredCardsByLibrary {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(LIBRARY_CARDS_STORAGE_KEY)
    if (raw === cachedCardsRaw) return cachedLocalCards
    if (!raw) {
      cachedCardsRaw = raw
      cachedLocalCards = {}
      return cachedLocalCards
    }

    const parsed = JSON.parse(raw)
    cachedCardsRaw = raw
    cachedLocalCards = parsed && typeof parsed === "object" ? (parsed as StoredCardsByLibrary) : {}
    return cachedLocalCards
  } catch {
    return cachedLocalCards
  }
}

function readPublishedCards(): Procedure[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(PUBLISHED_CARDS_STORAGE_KEY)
    if (raw === cachedPublishedRaw) return cachedPublishedCards
    if (!raw) {
      cachedPublishedRaw = raw
      cachedPublishedCards = []
      return cachedPublishedCards
    }

    const parsed = JSON.parse(raw)
    cachedPublishedRaw = raw
    cachedPublishedCards = Array.isArray(parsed)
      ? parsed.filter((entry): entry is Procedure => Boolean(entry) && typeof entry.id === "string")
      : []
    return cachedPublishedCards
  } catch {
    return cachedPublishedCards
  }
}

function readKnownRemoteLibraryIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = window.localStorage.getItem(KNOWN_REMOTE_LIBRARY_IDS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch { return new Set() }
}

function writeKnownRemoteLibraryIds(ids: Set<string>): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(KNOWN_REMOTE_LIBRARY_IDS_KEY, JSON.stringify([...ids]))
}

function readDeletedLocalLibraryIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = window.localStorage.getItem(DELETED_LOCAL_LIBRARY_IDS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch { return new Set() }
}

function writeDeletedLocalLibraryIds(ids: Set<string>): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(DELETED_LOCAL_LIBRARY_IDS_KEY, JSON.stringify([...ids]))
}

function writeLocalLibraries(libraries: LibraryRecord[]): void {
  if (typeof window === "undefined") return
  const nextLibraries = dedupeLibraries(libraries)
  const raw = JSON.stringify(nextLibraries)
  cachedLibrariesRaw = raw
  cachedLocalLibraries = nextLibraries
  cachedSnapshotKey = undefined
  window.localStorage.setItem(LIBRARIES_STORAGE_KEY, raw)
}

function writeLocalCards(cardsByLibrary: StoredCardsByLibrary): void {
  if (typeof window === "undefined") return
  const raw = JSON.stringify(cardsByLibrary)
  cachedCardsRaw = raw
  cachedLocalCards = cardsByLibrary
  cachedSnapshotKey = undefined
  window.localStorage.setItem(LIBRARY_CARDS_STORAGE_KEY, raw)
}

function writePublishedCards(cards: Procedure[]): void {
  if (typeof window === "undefined") return
  const raw = JSON.stringify(cards)
  cachedPublishedRaw = raw
  cachedPublishedCards = cards
  cachedSnapshotKey = undefined
  window.localStorage.setItem(PUBLISHED_CARDS_STORAGE_KEY, raw)
}

function emitLibrariesChanged(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(LIBRARIES_EVENT))
}

function mergeLibraries(primary: LibraryRecord[], secondary: LibraryRecord[]): LibraryRecord[] {
  const byId = new Map<string, LibraryRecord>()
  for (const library of secondary) byId.set(library.id, library)
  for (const library of primary) byId.set(library.id, library)
  return dedupeLibraries([...byId.values()])
}

function mergeCardMaps(primary: StoredCardsByLibrary, secondary: StoredCardsByLibrary): StoredCardsByLibrary {
  const libraryIds = new Set([...Object.keys(primary), ...Object.keys(secondary)])
  const merged: StoredCardsByLibrary = {}

  libraryIds.forEach((libraryId) => {
    const byId = new Map<string, Procedure>()
    for (const card of secondary[libraryId] ?? []) byId.set(card.id, card)
    for (const card of primary[libraryId] ?? []) byId.set(card.id, card)
    merged[libraryId] = sortCards([...byId.values()])
  })

  return merged
}

function mergePublishedCards(primary: Procedure[], secondary: Procedure[]): Procedure[] {
  const byId = new Map<string, Procedure>()
  for (const card of secondary) byId.set(card.id, card)
  for (const card of primary) byId.set(card.id, card)
  return sortCards([...byId.values()])
}

function buildSharedCardsSnapshot(): Procedure[] {
  const seededSharedCards = procedures.filter((procedure) => procedure.cardScope !== "local")
  const publishedCards = readPublishedCards()
  const byId = new Map<string, Procedure>()

  for (const card of seededSharedCards) byId.set(card.id, card)
  for (const card of publishedCards) byId.set(card.id, card)

  return sortCards(Array.from(byId.values()))
}

function buildSharedLibraries(): LibraryRecord[] {
  const sharedCards = buildSharedCardsSnapshot()
  return CLINICAL_SETTINGS.map((setting) => {
    const settingCards = sharedCards.filter((procedure) => procedure.setting === setting)
    const slug = slugify(setting)

    return {
      id: `shared-${slug}-reference`,
      name: setting,
      slug: `${slug}-global-cards`,
      description: `Global procedure repository for ${setting}.`,
      libraryType: "shared" as const,
      visibility: "public" as const,
      ownerType: "platform" as const,
      ownerId: "prepsight",
      ownerName: "PrepSight",
      ownerPublicAlias: "PSH-000",
      cardIds: settingCards.map((procedure) => procedure.id),
      createdAt: SHARED_LIBRARY_CREATED_AT,
      updatedAt: settingCards[0]?.updatedAt ?? SHARED_LIBRARY_CREATED_AT,
    }
  }).filter((library) => library.cardIds.length > 0)
}

function buildSharedLibraryId(setting: Procedure["setting"]): string {
  return `shared-${slugify(setting)}-reference`
}

function getSharedLibraryName(setting: Procedure["setting"]): string {
  return setting
}

function getActiveLocalLibraryIdentity() {
  if (typeof window === "undefined") return null
  const profile = getProfile()
  if (!profile?.hospital?.trim()) return null

  const activeTeam = getActiveTeamSnapshot(profile)
  const ownerName = activeTeam?.internalName ?? profile.hospital.trim()
  const ownerPublicAlias = activeTeam?.publicAlias
  const ownerId = activeTeam?.id ?? "me"
  const createdAt = profile.completedAt || SHARED_LIBRARY_CREATED_AT

  return { ownerName, ownerPublicAlias, ownerId, createdAt }
}

function ensureDefaultLocalLibrary(libraries: LibraryRecord[]): LibraryRecord[] {
  if (typeof window === "undefined") return libraries
  const identity = getActiveLocalLibraryIdentity()
  if (!identity) return libraries

  const deletedIds = readDeletedLocalLibraryIds()
  const ownerSlug = slugify(identity.ownerName) || "hospital"
  const defaultId = `local-${ownerSlug}-library`

  // Find/create the top-level (parent) library — excludes specialty sub-libraries
  const matchingParent = libraries.find(
    (library) => library.libraryType === "local" && library.ownerId === identity.ownerId && !library.parentId,
  )

  let result = libraries
  let parentId = defaultId

  if (matchingParent) {
    parentId = matchingParent.id
    result = dedupeLibraries(result.map((library) =>
      library.id === matchingParent.id
        ? { ...library, ownerName: identity.ownerName, ownerPublicAlias: identity.ownerPublicAlias }
        : library,
    ))
  } else if (!deletedIds.has(defaultId)) {
    result = dedupeLibraries([
      {
        id: defaultId,
        name: `${identity.ownerName} Local Cards`,
        slug: `${ownerSlug}-local-cards`,
        description: `Local procedure cards for ${identity.ownerName}.`,
        libraryType: "local",
        visibility: identity.ownerId === "me" ? "private" : "organization",
        ownerType: identity.ownerId === "me" ? "user" : "organization",
        ownerId: identity.ownerId,
        ownerName: identity.ownerName,
        ownerPublicAlias: identity.ownerPublicAlias,
        cardIds: [],
        createdAt: identity.createdAt,
        updatedAt: identity.createdAt,
      },
      ...result,
    ])
  }

  // Create specialty sub-libraries from the user's specialties of interest
  const profile = getProfile()
  const specialties = profile?.specialtiesOfInterest?.filter(Boolean) ?? []

  for (const specialty of specialties) {
    const specialtyId = `local-${ownerSlug}-${slugify(specialty)}-library`
    if (deletedIds.has(specialtyId)) continue
    const alreadyExists = result.some((lib) => lib.id === specialtyId)
    if (alreadyExists) continue
    result = dedupeLibraries([
      ...result,
      {
        id: specialtyId,
        name: `${specialty} Local Cards`,
        slug: `${ownerSlug}-${slugify(specialty)}-local-cards`,
        description: `Local cards for ${specialty}.`,
        libraryType: "local",
        visibility: identity.ownerId === "me" ? "private" : "organization",
        ownerType: identity.ownerId === "me" ? "user" : "organization",
        ownerId: identity.ownerId,
        ownerName: identity.ownerName,
        ownerPublicAlias: identity.ownerPublicAlias,
        cardIds: [],
        parentId,
        createdAt: identity.createdAt,
        updatedAt: identity.createdAt,
      },
    ])
  }

  return result
}

const AUTOGEN_LIB_CLEANUP_KEY = "prepsight_autogen_lib_cleanup_v2"

async function hydrateRemoteLibraries(uid: string | null): Promise<void> {
  if (typeof window === "undefined") return
  if (!canUseCollaborationFirestore(uid)) {
    writeLocalLibraries(ensureDefaultLocalLibrary(readLocalLibraries()))
    writeLocalCards(readLocalCards())
    writePublishedCards(readPublishedCards())
    emitLibrariesChanged()
    return
  }

  const remoteUid = uid as string
  const profile = getProfile()
  const allowedOwnerIds = getAccessibleOrganizationIdsForProfile(profile)

  const [allRemoteLibraries, remotePublishedCards] = await Promise.all([
    getFirestoreLibraries(allowedOwnerIds),
    getFirestorePublishedCards(),
  ])

  // One-time migration: purge stale auto-generated "Local Cards" libraries.
  // These are created by ensureDefaultLocalLibrary and keep re-appearing because old code
  // re-uploaded them to Firestore even after the user deleted them.
  // We scan BOTH Firestore AND localStorage — Firestore may already be clean but
  // localStorage still holds the ghost entries.
  if (!window.localStorage.getItem(AUTOGEN_LIB_CLEANUP_KEY)) {
    const isStale = (lib: LibraryRecord) =>
      lib.libraryType === "local" && lib.name.endsWith("Local Cards")
    const staleInFirestore = allRemoteLibraries.filter(isStale)
    const staleInLocal = readLocalLibraries().filter(isStale)
    const allStaleIds = new Set([
      ...staleInFirestore.map((l) => l.id),
      ...staleInLocal.map((l) => l.id),
    ])
    if (allStaleIds.size > 0) {
      await Promise.all(
        staleInFirestore.map((lib) => deleteFirestoreLibrary(remoteUid, lib.id).catch(() => undefined)),
      )
      writeDeletedLocalLibraryIds(new Set([...readDeletedLocalLibraryIds(), ...allStaleIds]))
      writeLocalLibraries(readLocalLibraries().filter((lib) => !allStaleIds.has(lib.id)))
      const currentCards = readLocalCards()
      const cleanedCards: StoredCardsByLibrary = {}
      for (const [id, cards] of Object.entries(currentCards)) {
        if (!allStaleIds.has(id)) cleanedCards[id] = cards
      }
      writeLocalCards(cleanedCards)
      emitLibrariesChanged()
    }
    window.localStorage.setItem(AUTOGEN_LIB_CLEANUP_KEY, "1")
  }

  // If Firestore has no libraries at all, the database was wiped — clear local state entirely
  // rather than re-uploading stale local data.
  if (allRemoteLibraries.length === 0) {
    const localCount = readLocalLibraries().filter((lib) => lib.libraryType === "local").length
    if (localCount > 0) {
      writeLocalLibraries([])
      writeLocalCards({})
      writeKnownRemoteLibraryIds(new Set())
      emitLibrariesChanged()
      return
    }
  }

  // Always exclude deleted IDs from both Firestore results and localStorage
  const deletedIds = readDeletedLocalLibraryIds()
  const remoteLibraries = allRemoteLibraries.filter((lib) => !deletedIds.has(lib.id))
  const localLibraries = ensureDefaultLocalLibrary(
    readLocalLibraries().filter((lib) => !deletedIds.has(lib.id)),
  )

  const remoteCards = await getFirestoreLibraryCards([
    ...new Set([...localLibraries.map((lib) => lib.id), ...remoteLibraries.map((lib) => lib.id)]),
  ])

  const mergedLibraries = ensureDefaultLocalLibrary(mergeLibraries(remoteLibraries, localLibraries))
  const mergedCards = mergeCardMaps(remoteCards, readLocalCards())
  const mergedPublishedCards = mergePublishedCards(remotePublishedCards, readPublishedCards())

  writeLocalLibraries(mergedLibraries)
  writeLocalCards(mergedCards)
  writePublishedCards(mergedPublishedCards)
  emitLibrariesChanged()

  const remoteLibraryIds = new Set(remoteLibraries.map((lib) => lib.id))
  const remotePublishedIds = new Set(remotePublishedCards.map((card) => card.id))

  // Track known remote IDs so future Firestore deletions can be detected
  let knownRemoteIds = readKnownRemoteLibraryIds()
  if (knownRemoteIds.size === 0) {
    const seedIds = new Set(remoteLibraryIds)
    const localCardStore = readLocalCards()
    for (const lib of localLibraries) {
      const hasCards = lib.cardIds.length > 0 || (localCardStore[lib.id]?.length ?? 0) > 0
      if (hasCards) seedIds.add(lib.id)
    }
    writeKnownRemoteLibraryIds(seedIds)
    knownRemoteIds = seedIds
  }

  const deletedRemoteIds = new Set(
    localLibraries
      .filter((lib) => knownRemoteIds.has(lib.id) && !remoteLibraryIds.has(lib.id))
      .map((lib) => lib.id),
  )

  if (deletedRemoteIds.size > 0) {
    writeLocalLibraries(mergedLibraries.filter((lib) => !deletedRemoteIds.has(lib.id)))
    const currentCards = readLocalCards()
    const cleanedCards: StoredCardsByLibrary = {}
    for (const [libraryId, cards] of Object.entries(currentCards)) {
      if (!deletedRemoteIds.has(libraryId)) cleanedCards[libraryId] = cards
    }
    writeLocalCards(cleanedCards)
    writeDeletedLocalLibraryIds(new Set([...readDeletedLocalLibraryIds(), ...deletedRemoteIds]))
  }

  writeKnownRemoteLibraryIds(new Set([...knownRemoteIds, ...remoteLibraryIds]))

  const uploadableLocalLibraries = localLibraries.filter((lib) => !deletedRemoteIds.has(lib.id))

  await Promise.all([
    ...uploadableLocalLibraries
      .filter((lib) => !remoteLibraryIds.has(lib.id))
      .map((lib) => saveFirestoreLibrary(remoteUid, lib).catch(() => undefined)),
    ...Object.entries(readLocalCards()).flatMap(([libraryId, cards]) =>
      deletedIds.has(libraryId) || deletedRemoteIds.has(libraryId)
        ? []
        : cards.map((card) => saveFirestoreLibraryCard(remoteUid, libraryId, card).catch(() => undefined)),
    ),
    ...readPublishedCards()
      .filter((card) => !remotePublishedIds.has(card.id))
      .map((card) => saveFirestorePublishedCard(remoteUid, card).catch(() => undefined)),
  ])
}

function ensureRealtimeSync(): void {
  if (authListening || typeof window === "undefined") return
  authListening = true
  readLocalLibraries()
  readLocalCards()
  readPublishedCards()

  onAuthChange((user) => {
    activeUid = user?.uid ?? null
    void hydrateRemoteLibraries(activeUid)
  })
}

function upsertLocalCards(libraryId: string, cards: Procedure[]): void {
  const current = readLocalCards()
  writeLocalCards({
    ...current,
    [libraryId]: sortCards(cards),
  })
}

function updateLibraryCardIds(libraryId: string, cardIds: string[]): void {
  const localLibraries = ensureDefaultLocalLibrary(readLocalLibraries()).map((library) =>
    library.id === libraryId
      ? { ...library, cardIds, updatedAt: new Date().toISOString() }
      : library,
  )
  writeLocalLibraries(localLibraries)
}

export function subscribeLibraries(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined
  ensureRealtimeSync()

  const handler = () => listener()
  window.addEventListener(LIBRARIES_EVENT, handler)
  window.addEventListener("storage", handler)

  return () => {
    window.removeEventListener(LIBRARIES_EVENT, handler)
    window.removeEventListener("storage", handler)
  }
}

export function getLibrariesSnapshot(): LibraryRecord[] {
  ensureRealtimeSync()
  const sharedLibraries = buildSharedLibraries()
  if (typeof window === "undefined") return sharedLibraries

  const localLibraries = ensureDefaultLocalLibrary(readLocalLibraries())
  const snapshotKey = JSON.stringify({
    localLibraries,
    sharedIds: sharedLibraries.map((library) => [library.id, library.cardIds]),
    publishedIds: readPublishedCards().map((card) => card.id),
  })

  if (snapshotKey === cachedSnapshotKey) return cachedSnapshot

  cachedSnapshotKey = snapshotKey
  cachedSnapshot = dedupeLibraries([...sharedLibraries, ...localLibraries])
  return cachedSnapshot
}

export function getLibraryByIdSnapshot(libraryId: string): LibraryRecord | undefined {
  return getLibrariesSnapshot().find((library) => library.id === libraryId)
}

export function getLibraryCardsSnapshot(libraryId: string): Procedure[] {
  const library = getLibraryByIdSnapshot(libraryId)
  if (!library) return []

  if (library.libraryType === "shared") {
    const cardIds = new Set(library.cardIds)
    return buildSharedCardsSnapshot().filter((card) => cardIds.has(card.id))
  }

  const cardsByLibrary = readLocalCards()
  return sortCards(cardsByLibrary[libraryId] ?? [])
}

export function getLibraryCardByIdSnapshot(libraryId: string, cardId: string): Procedure | undefined {
  return getLibraryCardsSnapshot(libraryId).find((card) => card.id === cardId)
}

export function getPublishedCardsByFamilySnapshot(familyId: string): Procedure[] {
  return buildSharedCardsSnapshot().filter(
    (card) => card.publishState === "published" && card.familyId === familyId,
  )
}

export function getLocalCardsByFamilySnapshot(libraryId: string, familyId: string): Procedure[] {
  return getLibraryCardsSnapshot(libraryId).filter((card) => card.familyId === familyId)
}

export function createLocalLibrary(input: {
  name: string
  description?: string
  visibility?: LibraryRecord["visibility"]
}): LibraryRecord {
  ensureRealtimeSync()
  const now = new Date().toISOString()
  const profile = getProfile()
  const activeTeam = getActiveTeamSnapshot(profile)
  const localLibraries = ensureDefaultLocalLibrary(readLocalLibraries())
  const idBase = `library-${slugify(input.name) || "local-library"}`
  const existingIds = new Set(localLibraries.map((library) => library.id))

  let id = idBase
  let suffix = 2
  while (existingIds.has(id)) {
    id = `${idBase}-${suffix}`
    suffix += 1
  }

  const library: LibraryRecord = {
    id,
    name: input.name.trim(),
    slug: slugify(input.name) || id,
    description: input.description?.trim() || undefined,
    libraryType: "local",
    visibility: input.visibility ?? (activeTeam ? "organization" : "private"),
    ownerType: activeTeam ? "organization" : "user",
    ownerId: activeTeam?.id ?? "me",
    ownerName: activeTeam?.internalName ?? profile?.hospital?.trim() ?? profile?.name?.trim() ?? "My workspace",
    ownerPublicAlias: activeTeam?.publicAlias,
    cardIds: [],
    createdAt: now,
    updatedAt: now,
  }

  writeLocalLibraries([library, ...localLibraries])
  emitLibrariesChanged()

  if (canUseCollaborationFirestore(activeUid)) {
    const remoteUid = activeUid as string
    void saveFirestoreLibrary(remoteUid, library).catch((error) => {
      console.warn("[PrepSight] createLocalLibrary remote sync failed:", error)
    })
  }

  return library
}

export function addCardToLocalLibrary(options: {
  libraryId: string
  sourceCard: Procedure
  mode?: "copy" | "linked"
}): Procedure {
  ensureRealtimeSync()
  const { libraryId, sourceCard } = options
  const library = getLibraryByIdSnapshot(libraryId)
  if (!library || library.libraryType !== "local") {
    throw new Error("Local library not found")
  }

  const profile = getProfile()
  const activeTeam = getActiveTeamSnapshot(profile)
  const currentCards = getLibraryCardsSnapshot(libraryId)
  const sourceSlug = slugify(sourceCard.name) || sourceCard.id.toLowerCase()
  let cardId = `${sourceSlug}--${library.slug}`
  let suffix = 2
  const existingIds = new Set(currentCards.map((card) => card.id))

  while (existingIds.has(cardId)) {
    cardId = `${sourceSlug}--${library.slug}-${suffix}`
    suffix += 1
  }

  const nextCard: Procedure = {
    ...sourceCard,
    id: cardId,
    familyId: sourceCard.familyId || sourceCard.id,
    cardScope: "local",
    publishState: "draft",
    status: sourceCard.sections.length > 0 ? "draft" : "placeholder",
    description: sourceCard.description ?? `Local card based on ${sourceCard.name}.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sourceCardId: sourceCard.id,
    sourceLibraryId: sourceCard.cardScope === "local" ? sourceCard.sourceLibraryId ?? libraryId : buildSharedLibraryId(sourceCard.setting),
    sourceLibraryName: sourceCard.sourceLibraryName ?? getSharedLibraryName(sourceCard.setting),
    sourceOrganizationName: library.ownerName,
    sourceOrganizationPublicAlias: library.ownerPublicAlias,
    sourceContributorName: profile?.name?.trim() || "You",
    sourceContributorPublicAlias: getMemberPublicAlias(activeTeam?.id, profile?.name),
  }

  const nextCards = [...currentCards, nextCard]
  upsertLocalCards(libraryId, nextCards)
  updateLibraryCardIds(libraryId, nextCards.map((card) => card.id))
  emitLibrariesChanged()

  if (canUseCollaborationFirestore(activeUid)) {
    const remoteUid = activeUid as string
    void Promise.all([
      saveFirestoreLibrary(remoteUid, getLibraryByIdSnapshot(libraryId)!),
      saveFirestoreLibraryCard(remoteUid, libraryId, nextCard),
    ]).catch((error) => {
      console.warn("[PrepSight] addCardToLocalLibrary remote sync failed:", error)
    })
  }

  return nextCard
}

export function saveLocalLibraryCard(libraryId: string, card: Procedure): Procedure {
  ensureRealtimeSync()
  const library = getLibraryByIdSnapshot(libraryId)
  if (!library || library.libraryType !== "local") {
    throw new Error("Local library not found")
  }

  const profile = getProfile()
  const activeTeam = getActiveTeamSnapshot(profile)
  const currentCards = getLibraryCardsSnapshot(libraryId)
  const persistedCard: Procedure = {
    ...card,
    cardScope: "local",
    publishState: card.publishState ?? "draft",
    updatedAt: new Date().toISOString(),
    sourceOrganizationName: card.sourceOrganizationName ?? library.ownerName,
    sourceOrganizationPublicAlias: card.sourceOrganizationPublicAlias ?? library.ownerPublicAlias,
    sourceContributorName: profile?.name?.trim() || card.sourceContributorName || "You",
    sourceContributorPublicAlias:
      card.sourceContributorPublicAlias ?? getMemberPublicAlias(activeTeam?.id, profile?.name),
  }

  const nextCards = currentCards.filter((entry) => entry.id !== card.id)
  nextCards.push(persistedCard)
  upsertLocalCards(libraryId, nextCards)
  updateLibraryCardIds(libraryId, nextCards.map((entry) => entry.id))
  emitLibrariesChanged()

  if (canUseCollaborationFirestore(activeUid)) {
    const remoteUid = activeUid as string
    void Promise.all([
      saveFirestoreLibrary(remoteUid, getLibraryByIdSnapshot(libraryId)!),
      saveFirestoreLibraryCard(remoteUid, libraryId, persistedCard),
    ]).catch((error) => {
      console.warn("[PrepSight] saveLocalLibraryCard remote sync failed:", error)
    })
  }

  return persistedCard
}

export function publishLocalCardToGlobal(options: {
  libraryId: string
  cardId: string
}): Procedure {
  ensureRealtimeSync()
  const { libraryId, cardId } = options
  const library = getLibraryByIdSnapshot(libraryId)
  if (!library || library.libraryType !== "local") {
    throw new Error("Local library not found")
  }

  const localCard = getLibraryCardByIdSnapshot(libraryId, cardId)
  if (!localCard) {
    throw new Error("Local card not found")
  }

  const now = new Date().toISOString()
  const profile = getProfile()
  const activeTeam = getActiveTeamSnapshot(profile)
  const contributorName = profile?.name?.trim() || localCard.sourceContributorName || "You"
  const contributorAlias = getMemberPublicAlias(activeTeam?.id, profile?.name)
  const publishedCards = readPublishedCards()
  const existing = publishedCards.find((card) => card.sourceCardId === localCard.id)
  const publishedId = existing?.id ?? `published-${slugify(localCard.name) || localCard.id}-${slugify(localCard.variantLabel || localCard.implantSystem || "version")}`

  const publishedCard: Procedure = {
    ...localCard,
    id: publishedId,
    cardScope: "shared",
    publishState: "published",
    status: "published",
    publishedAt: now,
    updatedAt: now,
    sourceCardId: localCard.id,
    sourceLibraryId: library.id,
    sourceLibraryName: library.name,
    sourceOrganizationName: library.ownerName,
    sourceOrganizationPublicAlias: library.ownerPublicAlias ?? "PSH-000",
    sourceContributorName: contributorName,
    sourceContributorPublicAlias: contributorAlias,
  }

  writePublishedCards([
    ...publishedCards.filter((card) => card.sourceCardId !== localCard.id),
    publishedCard,
  ])

  saveLocalLibraryCard(libraryId, {
    ...localCard,
    publishState: "published",
    publishedAt: now,
  })

  emitLibrariesChanged()

  if (canUseCollaborationFirestore(activeUid)) {
    const remoteUid = activeUid as string
    void saveFirestorePublishedCard(remoteUid, publishedCard).catch((error) => {
      console.warn("[PrepSight] publishLocalCardToGlobal remote sync failed:", error)
    })
  }

  return publishedCard
}

export function getDefaultLocalLibraryId(): string | null {
  const identity = getActiveLocalLibraryIdentity()
  const library = getLibrariesSnapshot().find((entry) =>
    entry.libraryType === "local" &&
    (identity ? entry.ownerId === identity.ownerId : true),
  )
  return library?.id ?? null
}

export function getSharedLibraryId(setting: Procedure["setting"] = "Operating Theatre"): string {
  return buildSharedLibraryId(setting)
}

export async function deleteLocalLibrary(libraryId: string): Promise<void> {
  ensureRealtimeSync()

  // Remove from localStorage
  writeLocalLibraries(readLocalLibraries().filter((lib) => lib.id !== libraryId))
  const currentCards = readLocalCards()
  const cleanedCards: StoredCardsByLibrary = {}
  for (const [id, cards] of Object.entries(currentCards)) {
    if (id !== libraryId) cleanedCards[id] = cards
  }
  writeLocalCards(cleanedCards)

  // Block this ID from ever being auto-recreated
  writeDeletedLocalLibraryIds(new Set([...readDeletedLocalLibraryIds(), libraryId]))

  // Remove from known-remote set so the deletion isn't misread as an external deletion
  const knownRemoteIds = readKnownRemoteLibraryIds()
  knownRemoteIds.delete(libraryId)
  writeKnownRemoteLibraryIds(knownRemoteIds)

  emitLibrariesChanged()

  // Purge from Firestore (library doc + all card docs)
  if (canUseCollaborationFirestore(activeUid)) {
    void deleteFirestoreLibrary(activeUid as string, libraryId).catch((error) => {
      console.warn("[PrepSight] deleteLocalLibrary Firestore delete failed:", error)
    })
  }
}

export function clearAllLocalData(): void {
  if (typeof window === "undefined") return
  const keysToRemove = [
    LIBRARIES_STORAGE_KEY,
    LIBRARY_CARDS_STORAGE_KEY,
    PUBLISHED_CARDS_STORAGE_KEY,
    KNOWN_REMOTE_LIBRARY_IDS_KEY,
    // DELETED_LOCAL_LIBRARY_IDS_KEY and AUTOGEN_LIB_CLEANUP_KEY are intentionally preserved —
    // they are permanent guards against ghost libraries re-appearing, not transient cache.
  ]
  for (const key of keysToRemove) window.localStorage.removeItem(key)
  cachedLibrariesRaw = undefined
  cachedLocalLibraries = []
  cachedCardsRaw = undefined
  cachedLocalCards = {}
  cachedPublishedRaw = undefined
  cachedPublishedCards = []
  cachedSnapshotKey = undefined
  emitLibrariesChanged()
}
