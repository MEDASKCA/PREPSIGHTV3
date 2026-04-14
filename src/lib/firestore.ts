import {
  doc, getDoc, setDoc, deleteDoc,
  collection, getDocs, query, where,
} from "firebase/firestore"
import { db } from "./firebase"
import {
  ChecklistEntry,
  OrganizationMembershipRecord,
  OrganizationRecord,
  PlatformRole,
  PrepSightProfile,
  Section,
  USER_ROLE_TO_PLATFORM_ROLE,
  UserRole,
} from "./types"
import { buildMemberPublicAlias, buildOrganizationPublicAlias } from "./identity"

const ORGANIZATION_ALIAS_ROTATION_DAYS = 30

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function addDaysIso(date: Date, days: number): string {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString()
}

function membershipDocId(uid: string, organizationId: string): string {
  return `${uid}__${organizationId}`
}

// ── User profile ──────────────────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<PrepSightProfile | null> {
  if (!db) return null
  try {
    const snap = await getDoc(doc(db, "users", uid))
    return snap.exists() ? (snap.data() as PrepSightProfile) : null
  } catch (err) {
    console.warn("[PrepSight] Firestore getUserProfile failed:", err)
    return null
  }
}

export async function saveUserProfile(uid: string, profile: PrepSightProfile): Promise<void> {
  if (!db) return
  try {
    await setDoc(doc(db, "users", uid), profile)
  } catch (err) {
    console.warn("[PrepSight] Firestore saveUserProfile failed:", err)
  }
}

export async function deleteUserAccountData(uid: string): Promise<void> {
  if (!db) return

  try {
    await deleteDoc(doc(db, "users", uid))
  } catch (err) {
    console.warn("[PrepSight] Firestore deleteUserProfile failed:", err)
  }

  try {
    const membershipsQuery = query(
      collection(db, "organization_memberships"),
      where("uid", "==", uid),
    )
    const snap = await getDocs(membershipsQuery)
    await Promise.all(snap.docs.map((entry) => deleteDoc(entry.ref)))
  } catch (err) {
    console.warn("[PrepSight] Firestore deleteUserMemberships failed:", err)
  }
}

export async function hasUserProfile(uid: string): Promise<boolean> {
  const p = await getUserProfile(uid)
  return p !== null
}

export async function getOrganization(organizationId: string): Promise<OrganizationRecord | null> {
  if (!db) return null
  try {
    const snap = await getDoc(doc(db, "organizations", organizationId))
    return snap.exists()
      ? ({ id: snap.id, ...snap.data() } as OrganizationRecord)
      : null
  } catch (err) {
    console.warn("[PrepSight] Firestore getOrganization failed:", err)
    return null
  }
}

export async function ensureOrganizationForHospital(
  uid: string,
  hospitalName: string,
): Promise<OrganizationRecord | null> {
  if (!db) return null

  const normalizedName = hospitalName.trim()
  if (!normalizedName) return null

  const organizationId = slugify(normalizedName)
  const organizationRef = doc(db, "organizations", organizationId)
  const existing = await getDoc(organizationRef)

  if (existing.exists()) {
    return { id: existing.id, ...existing.data() } as OrganizationRecord
  }

  const now = new Date()
  const created: OrganizationRecord = {
    id: organizationId,
    internalName: normalizedName,
    publicAlias: buildOrganizationPublicAlias(),
    visibility: "private",
    createdAt: now.toISOString(),
    createdBy: uid,
    aliasRotatesAfter: addDaysIso(now, ORGANIZATION_ALIAS_ROTATION_DAYS),
  }

  await setDoc(organizationRef, {
    internalName: created.internalName,
    publicAlias: created.publicAlias,
    visibility: created.visibility,
    createdAt: created.createdAt,
    createdBy: created.createdBy,
    aliasRotatesAfter: created.aliasRotatesAfter,
  })

  return created
}

export async function getUserOrganizationMemberships(
  uid: string,
): Promise<OrganizationMembershipRecord[]> {
  if (!db) return []

  try {
    const membershipsQuery = query(
      collection(db, "organization_memberships"),
      where("uid", "==", uid),
    )
    const snap = await getDocs(membershipsQuery)
    return snap.docs
      .map((entry) => ({ id: entry.id, ...entry.data() } as OrganizationMembershipRecord))
  } catch (err) {
    console.warn("[PrepSight] Firestore getUserOrganizationMemberships failed:", err)
    return []
  }
}

export async function upsertOrganizationMembership(
  uid: string,
  profile: PrepSightProfile,
  options?: {
    organizationId?: string
    displayName?: string
    approvedBy?: string
    forceStatus?: OrganizationMembershipRecord["status"]
  },
): Promise<OrganizationMembershipRecord | null> {
  if (!db) return null

  const organization =
    options?.organizationId
      ? await getOrganization(options.organizationId)
      : await ensureOrganizationForHospital(uid, profile.hospital)

  if (!organization) return null

  const membershipId = membershipDocId(uid, organization.id)
  const membershipRef = doc(db, "organization_memberships", membershipId)
  const existing = await getDoc(membershipRef)
  const now = new Date().toISOString()
  const requestedStatus: OrganizationMembershipRecord["status"] =
    options?.forceStatus ??
    (existing.exists() ? (existing.data().status as OrganizationMembershipRecord["status"] | undefined) : undefined) ??
    (organization.createdBy === uid ? "active" : "pending_approval")

  const internalRole: UserRole = profile.role
  const platformRole: PlatformRole = profile.platformRole ?? USER_ROLE_TO_PLATFORM_ROLE[internalRole]

  const membership: OrganizationMembershipRecord = {
    id: membershipId,
    organizationId: organization.id,
    uid,
    displayName: options?.displayName ?? profile.name,
    internalRole,
    platformRole,
    departments: profile.departments,
    specialtiesOfInterest: profile.specialtiesOfInterest,
    status: requestedStatus,
    publicAlias:
      existing.exists() && typeof existing.data().publicAlias === "string"
        ? (existing.data().publicAlias as string)
        : buildMemberPublicAlias(profile),
    approvedBy:
      requestedStatus === "active"
        ? options?.approvedBy ?? organization.createdBy
        : undefined,
    requestedAt:
      existing.exists() && typeof existing.data().requestedAt === "string"
        ? (existing.data().requestedAt as string)
        : now,
    approvedAt:
      requestedStatus === "active"
        ? existing.exists() && typeof existing.data().approvedAt === "string"
          ? (existing.data().approvedAt as string)
          : now
        : undefined,
  }

  await setDoc(membershipRef, membership)
  return membership
}

// ── Admin content ─────────────────────────────────────────────────────────────
// Stored in admin_content/{key} — dots in key replaced with underscores as doc ID

function contentDocId(key: string) {
  return key.replace(/\./g, "_")
}

export async function getAllAdminContent(): Promise<Record<string, string>> {
  if (!db) return {}
  try {
    const snap = await getDocs(collection(db, "admin_content"))
    const result: Record<string, string> = {}
    snap.forEach((d) => {
      // Convert doc ID back to dotted key
      result[d.id.replace(/_/g, ".")] = d.data().value as string
    })
    return result
  } catch {
    return {}
  }
}

export async function saveAdminContent(uid: string, key: string, value: string): Promise<void> {
  if (!db) return
  await setDoc(doc(db, "admin_content", contentDocId(key)), {
    value,
    updatedAt: new Date().toISOString(),
    updatedBy: uid,
  })
}

export async function deleteAdminContent(key: string): Promise<void> {
  if (!db) return
  await deleteDoc(doc(db, "admin_content", contentDocId(key)))
}

// ── Hospitals (Firestore additions on top of seed JSON) ───────────────────────

export interface FirestoreHospital {
  id: string
  name: string
  trust?: string
  addedAt: string
  addedBy: string
  approved: boolean
  approvedAt?: string
  approvedBy?: string
}

export async function getFirestoreHospitals(): Promise<FirestoreHospital[]> {
  if (!db) return []
  try {
    const snap = await getDocs(collection(db, "hospitals"))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreHospital))
  } catch {
    return []
  }
}

export async function addFirestoreHospital(
  uid: string,
  name: string,
  trust?: string,
): Promise<void> {
  if (!db) return
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  await setDoc(doc(db, "hospitals", id), {
    name,
    trust: trust ?? "",
    addedAt: new Date().toISOString(),
    addedBy: uid,
    approved: false,
  })
}

export async function approveFirestoreHospital(uid: string, id: string): Promise<void> {
  if (!db) return
  const ref = doc(db, "hospitals", id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  await setDoc(ref, { ...snap.data(), approved: true, approvedAt: new Date().toISOString(), approvedBy: uid })
}

export async function deleteFirestoreHospital(id: string): Promise<void> {
  if (!db) return
  await deleteDoc(doc(db, "hospitals", id))
}

// ── Surgeons (Firestore) ──────────────────────────────────────────────────────

export interface FirestoreSurgeon {
  id: string
  name: string
  shortName: string
  specialty: string
  grade?: string
  addedAt: string
  addedBy: string
  approved: boolean
}

export async function getFirestoreSurgeons(): Promise<FirestoreSurgeon[]> {
  if (!db) return []
  try {
    const snap = await getDocs(collection(db, "surgeons"))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreSurgeon))
  } catch {
    return []
  }
}

export async function addFirestoreSurgeon(
  uid: string,
  surgeon: Omit<FirestoreSurgeon, "id" | "addedAt" | "addedBy" | "approved">,
): Promise<void> {
  if (!db) return
  const id = surgeon.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  await setDoc(doc(db, "surgeons", id), {
    ...surgeon,
    addedAt: new Date().toISOString(),
    addedBy: uid,
    approved: false,
  })
}

export async function approveFirestoreSurgeon(uid: string, id: string): Promise<void> {
  if (!db) return
  const ref = doc(db, "surgeons", id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  await setDoc(ref, { ...snap.data(), approved: true, approvedAt: new Date().toISOString(), approvedBy: uid })
}

export async function deleteFirestoreSurgeon(id: string): Promise<void> {
  if (!db) return
  await deleteDoc(doc(db, "surgeons", id))
}

// Card checklist state (mutable, user/hospital specific)

function checklistDocId(uid: string, cardKey: string) {
  return `${uid}__${cardKey.replace(/[^a-z0-9_-]+/gi, "-")}`
}

export async function getCardChecklist(
  uid: string,
  cardKey: string,
): Promise<ChecklistEntry[]> {
  if (!db) return []
  try {
    const snap = await getDoc(doc(db, "card_checklists", checklistDocId(uid, cardKey)))
    if (!snap.exists()) return []
    const entries = snap.data().entries
    return Array.isArray(entries) ? (entries as ChecklistEntry[]) : []
  } catch (err) {
    console.warn("[PrepSight] Firestore getCardChecklist failed:", err)
    return []
  }
}

export async function saveCardChecklist(
  uid: string,
  cardKey: string,
  entries: ChecklistEntry[],
): Promise<void> {
  if (!db) return
  try {
    await setDoc(doc(db, "card_checklists", checklistDocId(uid, cardKey)), {
      entries,
      updatedAt: new Date().toISOString(),
      updatedBy: uid,
    })
  } catch (err) {
    console.warn("[PrepSight] Firestore saveCardChecklist failed:", err)
  }
}

export async function getCardCustomSections(
  uid: string,
  cardKey: string,
): Promise<Section[]> {
  if (!db) return []
  try {
    const snap = await getDoc(doc(db, "card_custom_sections", checklistDocId(uid, cardKey)))
    if (!snap.exists()) return []
    const sections = snap.data().sections
    return Array.isArray(sections) ? (sections as Section[]) : []
  } catch (err) {
    console.warn("[PrepSight] Firestore getCardCustomSections failed:", err)
    return []
  }
}

export async function saveCardCustomSections(
  uid: string,
  cardKey: string,
  sections: Section[],
): Promise<void> {
  if (!db) return
  try {
    await setDoc(doc(db, "card_custom_sections", checklistDocId(uid, cardKey)), {
      sections,
      updatedAt: new Date().toISOString(),
      updatedBy: uid,
    })
  } catch (err) {
    console.warn("[PrepSight] Firestore saveCardCustomSections failed:", err)
  }
}

// ── Collection runs (audit) ────────────────────────────────────────────────────

export interface CollectionRunEntry {
  itemName: string
  sectionTitle: string
  reason: string
  note: string
}

export interface CollectionRun {
  procedureId: string
  procedureName: string
  variantName?: string
  uid: string
  submittedAt: string
  totalItems: number
  collectedCount: number
  collectedItems: string[]
  uncollectedItems: CollectionRunEntry[]
}

export async function saveCollectionRun(run: CollectionRun): Promise<void> {
  if (!db) return
  try {
    const id = `${run.uid}__${run.procedureId}__${Date.now()}`
    await setDoc(doc(db, "collection_runs", id), run)
  } catch (err) {
    console.warn("[PrepSight] Firestore saveCollectionRun failed:", err)
  }
}
