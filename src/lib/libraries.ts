import { procedures } from "./data"
import { getProfile } from "./profile"
import { CLINICAL_SETTINGS } from "./settings"
import { onAuthChange } from "./auth"
import {
  canUseCollaborationFirestore,
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
      ? parsed.filter((entry): entry is LibraryRecord => Boolean(entry) && typeof entry.id === "string")
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

function writeLocalLibraries(libraries: LibraryRecord[]): void {
  if (typeof window === "undefined") return
  const raw = JSON.stringify(libraries)
  cachedLibrariesRaw = raw
  cachedLocalLibraries = libraries
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
  return [...byId.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
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

  const matchingLibrary = libraries.find(
    (library) => library.libraryType === "local" && library.ownerId === identity.ownerId,
  )
  if (matchingLibrary) {
    return libraries.map((library) =>
      library.id === matchingLibrary.id
        ? {
            ...library,
            ownerName: identity.ownerName,
            ownerPublicAlias: identity.ownerPublicAlias,
          }
        : library,
    )
  }

  return [
    {
      id: `local-${slugify(identity.ownerName) || "hospital"}-library`,
      name: `${identity.ownerName} Local Cards`,
      slug: `${slugify(identity.ownerName) || "hospital"}-local-cards`,
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
    ...libraries,
  ]
}

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
  const localLibraries = ensureDefaultLocalLibrary(readLocalLibraries())
  const [remoteLibraries, remotePublishedCards] = await Promise.all([
    getFirestoreLibraries(allowedOwnerIds),
    getFirestorePublishedCards(),
  ])
  const remoteCards = await getFirestoreLibraryCards([
    ...new Set([...localLibraries.map((library) => library.id), ...remoteLibraries.map((library) => library.id)]),
  ])

  const mergedLibraries = ensureDefaultLocalLibrary(mergeLibraries(remoteLibraries, localLibraries))
  const mergedCards = mergeCardMaps(remoteCards, readLocalCards())
  const mergedPublishedCards = mergePublishedCards(remotePublishedCards, readPublishedCards())

  writeLocalLibraries(mergedLibraries)
  writeLocalCards(mergedCards)
  writePublishedCards(mergedPublishedCards)
  emitLibrariesChanged()

  const remoteLibraryIds = new Set(remoteLibraries.map((library) => library.id))
  const remotePublishedIds = new Set(remotePublishedCards.map((card) => card.id))

  await Promise.all([
    ...localLibraries
      .filter((library) => !remoteLibraryIds.has(library.id))
      .map((library) => saveFirestoreLibrary(remoteUid, library).catch(() => undefined)),
    ...Object.entries(readLocalCards()).flatMap(([libraryId, cards]) =>
      cards.map((card) => saveFirestoreLibraryCard(remoteUid, libraryId, card).catch(() => undefined)),
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
  cachedSnapshot = [...sharedLibraries, ...localLibraries]
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
