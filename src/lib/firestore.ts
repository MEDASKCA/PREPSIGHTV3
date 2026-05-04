import {
  addDoc,
  doc, getDoc, setDoc, deleteDoc,
  collection, getDocs, query, where, onSnapshot,
} from "firebase/firestore"
import { db } from "./firebase"
import {
  ChecklistEntry,
  GovernanceMembershipRecord,
  OrganizationMembershipRecord,
  OrganizationRecord,
  OperatorMembershipRecord,
  PlatformRole,
  PortalMembershipRecord,
  PrepSightProfile,
  Section,
  StaffingReportRecord,
  StaffingReportRowRecord,
  StaffingStaffPoolRecord,
  USER_ROLE_TO_PLATFORM_ROLE,
  UserRole,
} from "./types"
import { buildMemberPublicAlias, buildOrganizationPublicAlias } from "./identity"
import { type ActiveUserSessionRecord } from "./device-session"
import { type PrepSightNativeAccountRecord } from "./native-accounts"
import { type TeamsMirrorPayload, type TeamsWorkspaceMirrorConfig } from "./teams-mirroring"

const ORGANIZATION_ALIAS_ROTATION_DAYS = 30
const PORTAL_MEMBERSHIPS_COLLECTION = "portal_memberships"
const GOVERNANCE_MEMBERSHIPS_COLLECTION = "governance_memberships"
const OPERATOR_MEMBERSHIPS_COLLECTION = "operator_memberships"
const VNEXT_NATIVE_ACCOUNTS_COLLECTION = "vnext_native_accounts"
const VNEXT_TEAMS_WORKSPACE_CONFIGS_COLLECTION = "vnext_teams_workspace_configs"
const VNEXT_TEAMS_MIRROR_LOG_COLLECTION = "vnext_teams_mirror_log"
const STAFFING_REPORTS_COLLECTION = "staffing_reports"
const STAFFING_STAFF_POOL_COLLECTION = "staffing_staff_pool"

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function normalizeStaffingMatchKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()
}

function normalizePoolClassification(classification: string): string {
  return classification.replace(/Sp\s*$/i, "").trim()
}

function parsePoolClassification(classification: string): { title?: string; band?: string; normalized: string } {
  const normalized = normalizePoolClassification(classification)
  const match = normalized.match(/^(.*?)(Band\s*\d+[A-Za-z]*)$/i)
  if (!match) {
    return { normalized, title: normalized || undefined, band: undefined }
  }
  return {
    normalized,
    title: match[1].trim() || undefined,
    band: match[2].replace(/\s+/g, " ").trim() || undefined,
  }
}

function staffingPoolDocId(organizationId: string, sourceMatchKey: string): string {
  return `${organizationId}__${sourceMatchKey.replace(/[^a-z0-9]+/g, "-")}`
}

function addDaysIso(date: Date, days: number): string {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString()
}

function membershipDocId(uid: string, organizationId: string): string {
  return `${uid}__${organizationId}`
}

function operatorMembershipDocId(uid: string): string {
  return uid
}

function portalMembershipDoc(uid: string, organizationId: string) {
  return doc(db!, PORTAL_MEMBERSHIPS_COLLECTION, membershipDocId(uid, organizationId))
}

function governanceMembershipDoc(uid: string, organizationId: string) {
  return doc(db!, GOVERNANCE_MEMBERSHIPS_COLLECTION, membershipDocId(uid, organizationId))
}

function operatorMembershipDoc(uid: string) {
  return doc(db!, OPERATOR_MEMBERSHIPS_COLLECTION, operatorMembershipDocId(uid))
}

function vnextNativeAccountDoc(uid: string) {
  return doc(db!, VNEXT_NATIVE_ACCOUNTS_COLLECTION, uid)
}

function vnextTeamsWorkspaceConfigDoc(workspaceId: string) {
  return doc(db!, VNEXT_TEAMS_WORKSPACE_CONFIGS_COLLECTION, workspaceId)
}

function vnextTeamsMirrorLogDoc(payload: TeamsMirrorPayload) {
  const suffix = payload.messageId?.trim() || `${Date.now()}`
  return doc(db!, VNEXT_TEAMS_MIRROR_LOG_COLLECTION, `${payload.workspaceId}__${payload.threadId}__${suffix}`)
}

function mapLegacyMembershipToPortalMembership(
  membership: OrganizationMembershipRecord,
): PortalMembershipRecord {
  return {
    id: membership.id,
    organizationId: membership.organizationId,
    uid: membership.uid,
    role:
      membership.internalRole === "manager" || membership.internalRole === "senior_manager"
        ? "manager"
        : "user",
    status: membership.status,
    displayName: membership.displayName,
    jobTitle: membership.jobTitle,
    publicAlias: membership.publicAlias,
    departments: membership.departments,
    specialtiesOfInterest: membership.specialtiesOfInterest,
    requestedAt: membership.requestedAt,
    approvedAt: membership.approvedAt,
    approvedBy: membership.approvedBy,
  }
}

export async function getPortalMemberships(uid: string): Promise<PortalMembershipRecord[]> {
  if (!db) return []
  try {
    const snap = await getDocs(query(collection(db, PORTAL_MEMBERSHIPS_COLLECTION), where("uid", "==", uid)))
    return snap.docs.map((entry) => ({ id: entry.id, ...entry.data() } as PortalMembershipRecord))
  } catch (err) {
    console.warn("[PrepSight] Firestore getPortalMemberships failed:", err)
    return []
  }
}

export async function getPortalMembershipsByOrganization(
  organizationId: string,
  options?: { strict?: boolean },
): Promise<PortalMembershipRecord[]> {
  if (!db) return []
  try {
    let portalSnap: Awaited<ReturnType<typeof getDocs>> | null = null
    let legacySnap: Awaited<ReturnType<typeof getDocs>> | null = null

    try {
      portalSnap = await getDocs(
        query(collection(db, PORTAL_MEMBERSHIPS_COLLECTION), where("organizationId", "==", organizationId)),
      )
    } catch (err) {
      console.warn("[PrepSight] Firestore portal_memberships read failed, falling back to legacy memberships:", err)
    }

    try {
      legacySnap = await getDocs(
        query(collection(db, "organization_memberships"), where("organizationId", "==", organizationId)),
      )
    } catch (err) {
      console.warn("[PrepSight] Firestore organization_memberships read failed:", err)
      if (options?.strict) throw err
    }

    const merged = new Map<string, PortalMembershipRecord>()

    legacySnap?.docs.forEach((entry) => {
      const membership = { id: entry.id, ...(entry.data() as Record<string, unknown>) } as OrganizationMembershipRecord
      merged.set(membership.uid, mapLegacyMembershipToPortalMembership(membership))
    })

    portalSnap?.docs.forEach((entry) => {
      const membership = { id: entry.id, ...(entry.data() as Record<string, unknown>) } as PortalMembershipRecord
      merged.set(membership.uid, membership)
    })

    return Array.from(merged.values())
  } catch (err) {
    console.warn("[PrepSight] Firestore getPortalMembershipsByOrganization failed:", err)
    if (options?.strict) throw err
    return []
  }
}

export async function getGovernanceMemberships(uid: string): Promise<GovernanceMembershipRecord[]> {
  if (!db) return []
  try {
    const snap = await getDocs(query(collection(db, GOVERNANCE_MEMBERSHIPS_COLLECTION), where("uid", "==", uid)))
    return snap.docs.map((entry) => ({ id: entry.id, ...entry.data() } as GovernanceMembershipRecord))
  } catch (err) {
    console.warn("[PrepSight] Firestore getGovernanceMemberships failed:", err)
    return []
  }
}

export async function getOperatorMembership(uid: string): Promise<OperatorMembershipRecord | null> {
  if (!db) return null
  try {
    const snap = await getDoc(operatorMembershipDoc(uid))
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as OperatorMembershipRecord) : null
  } catch (err) {
    console.warn("[PrepSight] Firestore getOperatorMembership failed:", err)
    return null
  }
}

export async function savePortalMembership(membership: PortalMembershipRecord): Promise<void> {
  if (!db) return
  try {
    await setDoc(portalMembershipDoc(membership.uid, membership.organizationId), membership)
  } catch (err) {
    console.warn("[PrepSight] Firestore savePortalMembership failed:", err)
  }
}

export async function upsertPortalMembership(
  uid: string,
  profile: PrepSightProfile,
  options?: {
    organizationId?: string
    displayName?: string
    approvedBy?: string
    forceStatus?: PortalMembershipRecord["status"]
  },
): Promise<PortalMembershipRecord | null> {
  if (!db) return null

  const organization =
    options?.organizationId
      ? await getOrganization(options.organizationId)
      : await ensureOrganizationForHospital(uid, profile.hospital)

  if (!organization) return null

  const membershipRef = portalMembershipDoc(uid, organization.id)
  const existing = await getDoc(membershipRef)
  const now = new Date().toISOString()
  const requestedStatus: PortalMembershipRecord["status"] =
    options?.forceStatus ??
    (existing.exists() ? (existing.data().status as PortalMembershipRecord["status"] | undefined) : undefined) ??
    (organization.createdBy === uid ? "active" : "pending_approval")

  const membership: PortalMembershipRecord = {
    id: membershipDocId(uid, organization.id),
    organizationId: organization.id,
    uid,
    role: profile.role === "manager" || profile.role === "senior_manager" ? "manager" : "user",
    status: requestedStatus,
    displayName: options?.displayName ?? profile.name,
    jobTitle: profile.jobTitle,
    publicAlias:
      existing.exists() && typeof existing.data().publicAlias === "string"
        ? (existing.data().publicAlias as string)
        : buildMemberPublicAlias(profile),
    departments: profile.departments,
    specialtiesOfInterest: profile.specialtiesOfInterest,
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
    approvedBy:
      requestedStatus === "active"
        ? options?.approvedBy ??
          (existing.exists() && typeof existing.data().approvedBy === "string"
            ? (existing.data().approvedBy as string)
            : organization.createdBy)
        : undefined,
  }

  await savePortalMembership(membership)
  return membership
}

export async function saveGovernanceMembership(membership: GovernanceMembershipRecord): Promise<void> {
  if (!db) return
  try {
    await setDoc(governanceMembershipDoc(membership.uid, membership.organizationId), membership)
  } catch (err) {
    console.warn("[PrepSight] Firestore saveGovernanceMembership failed:", err)
  }
}

export async function saveOperatorMembership(membership: OperatorMembershipRecord): Promise<void> {
  if (!db) return
  try {
    await setDoc(operatorMembershipDoc(membership.uid), membership)
  } catch (err) {
    console.warn("[PrepSight] Firestore saveOperatorMembership failed:", err)
  }
}

// ── User profile ──────────────────────────────────────────────────────────────

export async function getPrepSightNativeAccount(uid: string): Promise<PrepSightNativeAccountRecord | null> {
  if (!db) return null
  try {
    const snap = await getDoc(vnextNativeAccountDoc(uid))
    return snap.exists() ? (snap.data() as PrepSightNativeAccountRecord) : null
  } catch (err) {
    console.warn("[PrepSight] Firestore getPrepSightNativeAccount failed:", err)
    return null
  }
}

export async function savePrepSightNativeAccount(record: PrepSightNativeAccountRecord): Promise<void> {
  if (!db) return
  try {
    await setDoc(vnextNativeAccountDoc(record.uid), record, { merge: true })
  } catch (err) {
    console.warn("[PrepSight] Firestore savePrepSightNativeAccount failed:", err)
  }
}

export async function getTeamsWorkspaceMirrorConfig(workspaceId: string): Promise<TeamsWorkspaceMirrorConfig | null> {
  if (!db) return null
  try {
    const snap = await getDoc(vnextTeamsWorkspaceConfigDoc(workspaceId))
    return snap.exists() ? (snap.data() as TeamsWorkspaceMirrorConfig) : null
  } catch (err) {
    console.warn("[PrepSight] Firestore getTeamsWorkspaceMirrorConfig failed:", err)
    return null
  }
}

export async function saveTeamsWorkspaceMirrorConfig(config: TeamsWorkspaceMirrorConfig): Promise<void> {
  if (!db) return
  try {
    await setDoc(vnextTeamsWorkspaceConfigDoc(config.workspaceId), config, { merge: true })
  } catch (err) {
    console.warn("[PrepSight] Firestore saveTeamsWorkspaceMirrorConfig failed:", err)
  }
}

export async function appendTeamsMirrorLogEntry(payload: TeamsMirrorPayload): Promise<void> {
  if (!db) return
  try {
    await setDoc(vnextTeamsMirrorLogDoc(payload), {
      ...payload,
      mirroredAt: new Date().toISOString(),
    })
  } catch (err) {
    console.warn("[PrepSight] Firestore appendTeamsMirrorLogEntry failed:", err)
  }
}

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
    await setDoc(doc(db, "users", uid), profile, { merge: true })
  } catch (err) {
    console.warn("[PrepSight] Firestore saveUserProfile failed:", err)
  }
}

export async function saveStaffingReport(
  input: Omit<StaffingReportRecord, "id" | "uploadedAt">,
): Promise<StaffingReportRecord | null> {
  if (!db) return null
  try {
    const uploadedAt = new Date().toISOString()
    const reportPayload = {
      ...input,
      uploadedAt,
    }
    const reportRef = await addDoc(collection(db, STAFFING_REPORTS_COLLECTION), reportPayload)
    const savedReport: StaffingReportRecord = {
      id: reportRef.id,
      ...reportPayload,
    }

    for (const row of input.rows) {
      const poolClassification = parsePoolClassification(row.classification)
      const poolMatchKey = normalizeStaffingMatchKey(`${row.name} ${poolClassification.normalized}`)
      const poolId = staffingPoolDocId(input.organizationId, poolMatchKey)
      const poolRef = doc(db, STAFFING_STAFF_POOL_COLLECTION, poolId)
      const existing = await getDoc(poolRef)
      const previous = existing.exists() ? (existing.data() as StaffingStaffPoolRecord) : null
      const nextRecord: StaffingStaffPoolRecord = {
        id: poolId,
        organizationId: input.organizationId,
        sourceSystem: "optima",
        sourceMatchKey: poolMatchKey,
        sourceName: row.name,
        sourceClassification: poolClassification.normalized,
        sourceTitle: poolClassification.title,
        sourceBand: poolClassification.band,
        latestShiftTime: row.shiftTime,
        firstSeenAt: previous?.firstSeenAt ?? uploadedAt,
        lastSeenAt: uploadedAt,
        lastReportDate: input.reportDate,
        lastReportId: reportRef.id,
        occurrenceCount: (previous?.occurrenceCount ?? 0) + 1,
      }
      await setDoc(poolRef, nextRecord, { merge: true })
    }

    return savedReport
  } catch (err) {
    console.warn("[PrepSight] Firestore saveStaffingReport failed:", err)
    return null
  }
}

export async function getStaffingStaffPoolByOrganization(
  organizationId: string,
): Promise<StaffingStaffPoolRecord[]> {
  if (!db) return []
  try {
    const snap = await getDocs(
      query(collection(db, STAFFING_STAFF_POOL_COLLECTION), where("organizationId", "==", organizationId)),
    )
    return snap.docs
      .map((entry) => {
        const data = entry.data() as StaffingStaffPoolRecord
        return { ...data, id: data.id || entry.id }
      })
      .sort((left, right) => left.sourceName.localeCompare(right.sourceName))
  } catch (err) {
    console.warn("[PrepSight] Firestore getStaffingStaffPoolByOrganization failed:", err)
    return []
  }
}

export async function getStaffingReportsByOrganization(
  organizationId: string,
): Promise<StaffingReportRecord[]> {
  if (!db) return []
  try {
    const snap = await getDocs(
      query(collection(db, STAFFING_REPORTS_COLLECTION), where("organizationId", "==", organizationId)),
    )
    return snap.docs
      .map((entry) => {
        const data = entry.data() as StaffingReportRecord
        return { ...data, id: data.id || entry.id }
      })
      .sort((left, right) => (right.reportDate ?? right.uploadedAt).localeCompare(left.reportDate ?? left.uploadedAt))
  } catch (err) {
    console.warn("[PrepSight] Firestore getStaffingReportsByOrganization failed:", err)
    return []
  }
}

export async function getUsersByHospital(hospitalName: string): Promise<Array<PrepSightProfile & { uid: string }>> {
  if (!db) return []
  try {
    const snap = await getDocs(query(collection(db, "users"), where("hospital", "==", hospitalName)))
    return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as PrepSightProfile) }))
  } catch (err) {
    console.warn("[PrepSight] Firestore getUsersByHospital failed:", err)
    return []
  }
}

export async function getPortalUsersByOrganization(
  organizationId: string,
  hospitalName?: string,
  options?: { strict?: boolean },
): Promise<Array<PrepSightProfile & { uid: string }>> {
  if (!db) return []
  const firestore = db
  try {
    const memberships = await getPortalMembershipsByOrganization(organizationId, options)
    const mergedUsers = new Map<string, PrepSightProfile & { uid: string }>()

    const membershipUsers = await Promise.all(
      memberships.map(async (membership) => {
        let userProfile: PrepSightProfile | null = null
        try {
          const userSnap = await getDoc(doc(firestore, "users", membership.uid))
          userProfile = userSnap.exists() ? (userSnap.data() as PrepSightProfile) : null
        } catch {
          // User profile documents are owner-readable only in current rules.
          // Fall back to membership-visible data so management screens still render.
          userProfile = null
        }
        const inferredRole: UserRole = membership.role === "manager" ? "manager" : "viewer"

        return {
          uid: membership.uid,
          hospital: userProfile?.hospital ?? "",
          departments: membership.departments.length ? membership.departments : (userProfile?.departments ?? []),
          role: userProfile?.role ?? inferredRole,
          platformRole: userProfile?.platformRole ?? USER_ROLE_TO_PLATFORM_ROLE[userProfile?.role ?? inferredRole],
          accountType: userProfile?.accountType,
          surfaces: userProfile?.surfaces,
          activeOrganizationId: userProfile?.activeOrganizationId ?? membership.organizationId,
          organizationIds: userProfile?.organizationIds ?? [membership.organizationId],
          jobTitle: userProfile?.jobTitle,
          name: userProfile?.name ?? membership.displayName,
          email: userProfile?.email,
          specialtiesOfInterest:
            membership.specialtiesOfInterest.length
              ? membership.specialtiesOfInterest
              : (userProfile?.specialtiesOfInterest ?? []),
          completedAt: userProfile?.completedAt ?? membership.approvedAt ?? membership.requestedAt,
        } satisfies PrepSightProfile & { uid: string }
      }),
    )

    membershipUsers.forEach((user) => {
      mergedUsers.set(user.uid, user)
    })

    const supplementalQueries = [
      query(collection(firestore, "users"), where("activeOrganizationId", "==", organizationId)),
      query(collection(firestore, "users"), where("organizationIds", "array-contains", organizationId)),
      ...(hospitalName?.trim()
        ? [query(collection(firestore, "users"), where("hospital", "==", hospitalName.trim()))]
        : []),
    ]

    for (const usersQuery of supplementalQueries) {
      try {
        const snap = await getDocs(usersQuery)
        snap.docs.forEach((entry) => {
          const profile = entry.data() as PrepSightProfile
          const existing = mergedUsers.get(entry.id)
          mergedUsers.set(entry.id, {
            uid: entry.id,
            ...profile,
            departments: existing?.departments?.length ? existing.departments : profile.departments,
            role: existing?.role ?? profile.role,
            platformRole: existing?.platformRole ?? profile.platformRole,
            activeOrganizationId: existing?.activeOrganizationId ?? profile.activeOrganizationId ?? organizationId,
            organizationIds: existing?.organizationIds ?? profile.organizationIds ?? [organizationId],
            specialtiesOfInterest:
              existing?.specialtiesOfInterest?.length ? existing.specialtiesOfInterest : profile.specialtiesOfInterest,
            completedAt: existing?.completedAt ?? profile.completedAt,
          })
        })
      } catch (err) {
        console.warn("[PrepSight] Firestore supplemental users query failed:", err)
      }
    }

    return Array.from(mergedUsers.values()).sort((left, right) =>
      (left.name ?? "").localeCompare(right.name ?? ""),
    )
  } catch (err) {
    console.warn("[PrepSight] Firestore getPortalUsersByOrganization failed:", err)
    if (options?.strict) throw err
    return []
  }
}

export async function getActiveUserSession(uid: string): Promise<ActiveUserSessionRecord | null> {
  if (!db) return null
  try {
    const snap = await getDoc(doc(db, "users", uid))
    if (!snap.exists()) return null
    const activeSession = snap.data().activeSession as Partial<ActiveUserSessionRecord> | null | undefined
    if (
      !activeSession ||
      typeof activeSession.sessionId !== "string" ||
      typeof activeSession.deviceLabel !== "string" ||
      typeof activeSession.updatedAt !== "string"
    ) {
      return null
    }
    return {
      sessionId: activeSession.sessionId,
      deviceLabel: activeSession.deviceLabel,
      updatedAt: activeSession.updatedAt,
    }
  } catch (err) {
    console.warn("[PrepSight] Firestore getActiveUserSession failed:", err)
    return null
  }
}

export async function claimActiveUserSession(
  uid: string,
  activeSession: ActiveUserSessionRecord,
): Promise<void> {
  if (!db) return
  try {
    await setDoc(doc(db, "users", uid), { activeSession }, { merge: true })
  } catch (err) {
    console.warn("[PrepSight] Firestore claimActiveUserSession failed:", err)
  }
}

export async function clearActiveUserSession(uid: string, sessionId?: string): Promise<void> {
  if (!db) return
  try {
    const current = await getActiveUserSession(uid)
    if (sessionId && current?.sessionId && current.sessionId !== sessionId) {
      return
    }
    await setDoc(doc(db, "users", uid), { activeSession: null }, { merge: true })
  } catch (err) {
    console.warn("[PrepSight] Firestore clearActiveUserSession failed:", err)
  }
}

export function subscribeToActiveUserSession(
  uid: string,
  onChange: (activeSession: ActiveUserSessionRecord | null) => void,
) {
  if (!db) return () => {}
  return onSnapshot(
    doc(db, "users", uid),
    (snap) => {
      if (!snap.exists()) {
        onChange(null)
        return
      }
      const activeSession = snap.data().activeSession as Partial<ActiveUserSessionRecord> | null | undefined
      if (
        !activeSession ||
        typeof activeSession.sessionId !== "string" ||
        typeof activeSession.deviceLabel !== "string" ||
        typeof activeSession.updatedAt !== "string"
      ) {
        onChange(null)
        return
      }
      onChange({
        sessionId: activeSession.sessionId,
        deviceLabel: activeSession.deviceLabel,
        updatedAt: activeSession.updatedAt,
      })
    },
    () => onChange(null),
  )
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

  try {
    const portalMembershipsQuery = query(
      collection(db, PORTAL_MEMBERSHIPS_COLLECTION),
      where("uid", "==", uid),
    )
    const snap = await getDocs(portalMembershipsQuery)
    await Promise.all(snap.docs.map((entry) => deleteDoc(entry.ref)))
  } catch (err) {
    console.warn("[PrepSight] Firestore deletePortalMemberships failed:", err)
  }
}

export interface FirestoreRegistration {
  uid: string
  profile: PrepSightProfile | null
  memberships: OrganizationMembershipRecord[]
}

export async function getFirestoreRegistrations(): Promise<FirestoreRegistration[]> {
  if (!db) return []

  try {
    const [usersSnap, membershipsSnap] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "organization_memberships")),
    ])

    const membershipsByUid = new Map<string, OrganizationMembershipRecord[]>()
    membershipsSnap.docs.forEach((entry) => {
      const membership = { id: entry.id, ...entry.data() } as OrganizationMembershipRecord
      const current = membershipsByUid.get(membership.uid) ?? []
      current.push(membership)
      membershipsByUid.set(membership.uid, current)
    })

    const registrations = usersSnap.docs.map((entry) => {
      const profile = entry.data() as PrepSightProfile
      return {
        uid: entry.id,
        profile,
        memberships: membershipsByUid.get(entry.id) ?? [],
      }
    })

    return registrations.sort((left, right) =>
      (right.profile?.completedAt ?? "").localeCompare(left.profile?.completedAt ?? ""),
    )
  } catch (err) {
    console.warn("[PrepSight] Firestore getFirestoreRegistrations failed:", err)
    return []
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
    jobTitle: profile.jobTitle,
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
  await savePortalMembership(mapLegacyMembershipToPortalMembership(membership))
  return membership
}

export async function approveOrganizationMembership(
  uid: string,
  membershipId: string,
): Promise<OrganizationMembershipRecord | null> {
  if (!db) return null

  try {
    const membershipRef = doc(db, "organization_memberships", membershipId)
    const membershipSnap = await getDoc(membershipRef)
    if (!membershipSnap.exists()) return null

    const current = { id: membershipSnap.id, ...membershipSnap.data() } as OrganizationMembershipRecord
    const organization = await getOrganization(current.organizationId)
    if (!organization || organization.createdBy !== uid) return null

    const approved: OrganizationMembershipRecord = {
      ...current,
      status: "active",
      approvedBy: uid,
      approvedAt: new Date().toISOString(),
    }

    await setDoc(membershipRef, approved)
    await savePortalMembership(mapLegacyMembershipToPortalMembership(approved))
    return approved
  } catch (err) {
    console.warn("[PrepSight] Firestore approveOrganizationMembership failed:", err)
    return null
  }
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
