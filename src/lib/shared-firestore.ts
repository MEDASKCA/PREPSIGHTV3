import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore"
import { db } from "./firebase"
import {
  SHARED_COLLECTIONS,
  type PublicationCommentRecord,
  type PublicationProjectionRecord,
  type PublicationRatingRecord,
  type PublicationReactionRecord,
  type PublicationSuggestionRecord,
  type SharedProcedureRecord,
  type SharedProcedureVersionRecord,
  type SharedRepositoryRecord,
  type SharedRepositorySeedBundle,
  type SharedTaxonomyNodeRecord,
} from "./shared-repository"

function sortByText<T>(items: T[], selector: (item: T) => string): T[] {
  return [...items].sort((left, right) => selector(left).localeCompare(selector(right)))
}

export async function seedSharedRepositoryBundle(bundle: SharedRepositorySeedBundle): Promise<void> {
  if (!db) return

  const batch = writeBatch(db)

  for (const repository of bundle.repositories) {
    batch.set(doc(db, SHARED_COLLECTIONS.repositories, repository.id), repository)
  }

  for (const node of bundle.taxonomyNodes) {
    batch.set(doc(db, SHARED_COLLECTIONS.taxonomyNodes, node.id), node)
  }

  for (const procedure of bundle.canonicalProcedures) {
    batch.set(doc(db, SHARED_COLLECTIONS.canonicalProcedures, procedure.id), procedure)
  }

  for (const version of bundle.procedureVersions) {
    batch.set(doc(db, SHARED_COLLECTIONS.procedureVersions, version.id), version)
  }

  for (const publication of bundle.publications) {
    batch.set(doc(db, SHARED_COLLECTIONS.publications, publication.id), publication)
  }

  await batch.commit()
}

export async function getSharedRepositories(): Promise<SharedRepositoryRecord[]> {
  if (!db) return []
  try {
    const snap = await getDocs(collection(db, SHARED_COLLECTIONS.repositories))
    return sortByText(
      snap.docs.map((entry) => ({ id: entry.id, ...entry.data() } as SharedRepositoryRecord)),
      (item) => item.internalName,
    )
  } catch (error) {
    console.warn("[PrepSight] getSharedRepositories failed:", error)
    return []
  }
}

export async function getSharedTaxonomyNodes(options?: {
  setting?: SharedTaxonomyNodeRecord["setting"]
  kind?: SharedTaxonomyNodeRecord["kind"]
  parentId?: string
}): Promise<SharedTaxonomyNodeRecord[]> {
  if (!db) return []
  try {
    let ref = collection(db, SHARED_COLLECTIONS.taxonomyNodes)
    const constraints = []
    if (options?.setting) constraints.push(where("setting", "==", options.setting))
    if (options?.kind) constraints.push(where("kind", "==", options.kind))
    if (options?.parentId) constraints.push(where("parentId", "==", options.parentId))
    const snap = constraints.length > 0 ? await getDocs(query(ref, ...constraints)) : await getDocs(ref)
    return sortByText(
      snap.docs.map((entry) => ({ id: entry.id, ...entry.data() } as SharedTaxonomyNodeRecord)),
      (item) => item.label,
    )
  } catch (error) {
    console.warn("[PrepSight] getSharedTaxonomyNodes failed:", error)
    return []
  }
}

export async function getCanonicalProcedures(options?: {
  setting?: SharedProcedureRecord["setting"]
  specialtyId?: string
  sourceRepositoryId?: string
}): Promise<SharedProcedureRecord[]> {
  if (!db) return []
  try {
    const constraints = []
    if (options?.setting) constraints.push(where("setting", "==", options.setting))
    if (options?.specialtyId) {
      constraints.push(where("taxonomyNodeIds.specialtyId", "==", options.specialtyId))
    }
    if (options?.sourceRepositoryId) {
      constraints.push(where("sourceRepositoryId", "==", options.sourceRepositoryId))
    }
    const snap = constraints.length > 0
      ? await getDocs(query(collection(db, SHARED_COLLECTIONS.canonicalProcedures), ...constraints))
      : await getDocs(collection(db, SHARED_COLLECTIONS.canonicalProcedures))
    return sortByText(
      snap.docs.map((entry) => ({ id: entry.id, ...entry.data() } as SharedProcedureRecord)),
      (item) => item.canonicalName,
    )
  } catch (error) {
    console.warn("[PrepSight] getCanonicalProcedures failed:", error)
    return []
  }
}

export async function getProcedureVersions(options: {
  procedureId?: string
  repositoryId?: string
  organizationId?: string
}): Promise<SharedProcedureVersionRecord[]> {
  if (!db) return []
  try {
    const constraints = []
    if (options.procedureId) constraints.push(where("procedureId", "==", options.procedureId))
    if (options.repositoryId) constraints.push(where("repositoryId", "==", options.repositoryId))
    if (options.organizationId) constraints.push(where("organizationId", "==", options.organizationId))
    const snap = constraints.length > 0
      ? await getDocs(query(collection(db, SHARED_COLLECTIONS.procedureVersions), ...constraints))
      : await getDocs(collection(db, SHARED_COLLECTIONS.procedureVersions))
    return sortByText(
      snap.docs.map((entry) => ({ id: entry.id, ...entry.data() } as SharedProcedureVersionRecord)),
      (item) => item.title,
    )
  } catch (error) {
    console.warn("[PrepSight] getProcedureVersions failed:", error)
    return []
  }
}

export async function saveProcedureVersion(record: SharedProcedureVersionRecord): Promise<void> {
  if (!db) return
  await setDoc(doc(db, SHARED_COLLECTIONS.procedureVersions, record.id), record)
}

export async function getPublicationProjection(publicationId: string): Promise<PublicationProjectionRecord | null> {
  if (!db) return null
  try {
    const snap = await getDoc(doc(db, SHARED_COLLECTIONS.publications, publicationId))
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as PublicationProjectionRecord) : null
  } catch (error) {
    console.warn("[PrepSight] getPublicationProjection failed:", error)
    return null
  }
}

export async function getPublicationComments(publicationId: string): Promise<PublicationCommentRecord[]> {
  if (!db) return []
  try {
    const snap = await getDocs(
      query(collection(db, SHARED_COLLECTIONS.comments), where("publicationId", "==", publicationId)),
    )
    return snap.docs.map((entry) => ({ id: entry.id, ...entry.data() } as PublicationCommentRecord))
  } catch (error) {
    console.warn("[PrepSight] getPublicationComments failed:", error)
    return []
  }
}

export async function savePublicationComment(record: PublicationCommentRecord): Promise<void> {
  if (!db) return
  await setDoc(doc(db, SHARED_COLLECTIONS.comments, record.id), record)
}

export async function getPublicationSuggestions(publicationId: string): Promise<PublicationSuggestionRecord[]> {
  if (!db) return []
  try {
    const snap = await getDocs(
      query(collection(db, SHARED_COLLECTIONS.suggestions), where("publicationId", "==", publicationId)),
    )
    return snap.docs.map((entry) => ({ id: entry.id, ...entry.data() } as PublicationSuggestionRecord))
  } catch (error) {
    console.warn("[PrepSight] getPublicationSuggestions failed:", error)
    return []
  }
}

export async function savePublicationSuggestion(record: PublicationSuggestionRecord): Promise<void> {
  if (!db) return
  await setDoc(doc(db, SHARED_COLLECTIONS.suggestions, record.id), record)
}

export async function savePublicationRating(record: PublicationRatingRecord): Promise<void> {
  if (!db) return
  await setDoc(doc(db, SHARED_COLLECTIONS.ratings, record.id), record)
}

export async function savePublicationReaction(record: PublicationReactionRecord): Promise<void> {
  if (!db) return
  await setDoc(doc(db, SHARED_COLLECTIONS.reactions, record.id), record)
}
