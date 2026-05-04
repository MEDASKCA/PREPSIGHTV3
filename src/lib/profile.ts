import { ClinicalSetting, PlatformRole, PrepSightProfile, USER_ROLE_TO_PLATFORM_ROLE } from "./types"
import {
  getPortalMemberships,
  ensureOrganizationForHospital,
  saveUserProfile,
  upsertOrganizationMembership,
  upsertPortalMembership,
  getUserProfile,
} from "./firestore"

const STORAGE_KEY = "prepsight_profile"
const STORAGE_UID_KEY = "prepsight_profile_uid"
const FORCE_ONBOARDING_KEY = "prepsight_force_onboarding"
const ONBOARDING_COMPLETE_PREFIX = "prepsight_ob_done_"
export const PLATFORM_ROLE_COOKIE_KEY = "prepsight_platform_role"
export const SPECIALTY_PREFERENCES_COOKIE_KEY = "prepsight_specialties"
const PROFILE_CHANGE_EVENT = "prepsight:profile-changed"
const ROLE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30
function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function resolvePlatformRole(profile: PrepSightProfile): PlatformRole {
  return profile.platformRole ?? USER_ROLE_TO_PLATFORM_ROLE[profile.role]
}

function isUserRole(value: unknown): value is PrepSightProfile["role"] {
  return value === "viewer" || value === "editor" || value === "clinical_author" || value === "manager" || value === "senior_manager"
}

function isAccountType(value: unknown): value is NonNullable<PrepSightProfile["accountType"]> {
  return value === "portal_user" || value === "governance_admin" || value === "vendor_operator"
}

function isAccessSurface(value: unknown): value is NonNullable<PrepSightProfile["surfaces"]>[number] {
  return value === "portal" || value === "governance" || value === "operator"
}

function setPlatformRoleCookie(role: PlatformRole): void {
  if (typeof document === "undefined") return
  document.cookie = `${PLATFORM_ROLE_COOKIE_KEY}=${role}; path=/; max-age=${ROLE_COOKIE_MAX_AGE}; samesite=lax`
}

function clearPlatformRoleCookie(): void {
  if (typeof document === "undefined") return
  document.cookie = `${PLATFORM_ROLE_COOKIE_KEY}=; path=/; max-age=0; samesite=lax`
}

function setSpecialtyPreferencesCookie(specialties: string[]): void {
  if (typeof document === "undefined") return
  const normalized = specialties
    .map((value) => value.trim())
    .filter(Boolean)
  document.cookie = `${SPECIALTY_PREFERENCES_COOKIE_KEY}=${encodeURIComponent(JSON.stringify(normalized))}; path=/; max-age=${ROLE_COOKIE_MAX_AGE}; samesite=lax`
}

function clearSpecialtyPreferencesCookie(): void {
  if (typeof document === "undefined") return
  document.cookie = `${SPECIALTY_PREFERENCES_COOKIE_KEY}=; path=/; max-age=0; samesite=lax`
}

function publishProfileChange(profile: PrepSightProfile | null): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent<PrepSightProfile | null>(PROFILE_CHANGE_EVENT, { detail: profile }))
}

function normalizeProfile(profile: unknown): PrepSightProfile | null {
  if (!profile || typeof profile !== "object") return null

  const candidate = profile as Partial<PrepSightProfile>
  if (typeof candidate.hospital !== "string") return null
  if (!isUserRole(candidate.role)) return null
  if (!Array.isArray(candidate.departments)) return null
  if (!Array.isArray(candidate.specialtiesOfInterest)) return null
  if (typeof candidate.completedAt !== "string") return null

  const normalized: PrepSightProfile = {
    hospital: candidate.hospital,
    departments: candidate.departments.filter((value): value is string => typeof value === "string"),
    role: candidate.role,
    specialtiesOfInterest: candidate.specialtiesOfInterest.filter(
      (value): value is string => typeof value === "string",
    ),
    completedAt: candidate.completedAt,
    jobTitle: typeof candidate.jobTitle === "string" ? candidate.jobTitle : undefined,
    name: typeof candidate.name === "string" ? candidate.name : undefined,
    email: typeof candidate.email === "string" ? candidate.email : undefined,
    activeOrganizationId:
      typeof candidate.activeOrganizationId === "string" ? candidate.activeOrganizationId : undefined,
    organizationIds: Array.isArray(candidate.organizationIds)
      ? candidate.organizationIds.filter((value): value is string => typeof value === "string")
      : undefined,
    accountType: isAccountType(candidate.accountType) ? candidate.accountType : undefined,
    surfaces: Array.isArray(candidate.surfaces)
      ? candidate.surfaces.filter(isAccessSurface)
      : undefined,
    platformRole:
      candidate.platformRole === "user" ||
      candidate.platformRole === "moderator" ||
      candidate.platformRole === "admin"
        ? candidate.platformRole
        : undefined,
  }

  normalized.platformRole = resolvePlatformRole(normalized)
  normalized.surfaces = normalized.surfaces?.length ? Array.from(new Set(normalized.surfaces)) : undefined
  return normalized
}

function ensureLocalOrganizationContext(profile: PrepSightProfile): PrepSightProfile {
  const hospitalSlug = slugify(profile.hospital.trim())
  const activeOrganizationId =
    profile.activeOrganizationId?.trim() ||
    profile.organizationIds?.find((value) => value.trim()) ||
    hospitalSlug ||
    undefined

  const organizationIds = activeOrganizationId
    ? Array.from(new Set([...(profile.organizationIds ?? []), activeOrganizationId]))
    : profile.organizationIds

  return {
    ...profile,
    activeOrganizationId,
    organizationIds,
  }
}

function ensurePortalSurfaceProfile(profile: PrepSightProfile): PrepSightProfile {
  return {
    ...profile,
    accountType: "portal_user",
    surfaces: Array.from(new Set([...(profile.surfaces ?? []), "portal"])),
  }
}

export function isCompleteProfile(profile: PrepSightProfile | null): boolean {
  if (!profile) return false
  if (!profile.hospital.trim()) return false
  if (!profile.departments.length) return false
  if (!profile.completedAt) return false
  return true
}

export function getProfile(): PrepSightProfile | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const profile = normalizeProfile(JSON.parse(raw))
    if (!profile) return null
    setPlatformRoleCookie(profile.platformRole!)
    setSpecialtyPreferencesCookie(profile.specialtiesOfInterest)
    return profile
  } catch {
    return null
  }
}

function getStoredProfileOwnerUid(): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_UID_KEY)
    return raw?.trim() || null
  } catch {
    return null
  }
}

function getProfileForUid(uid: string): PrepSightProfile | null {
  const local = getProfile()
  if (!local) return null
  const ownerUid = getStoredProfileOwnerUid()
  if (ownerUid === uid) return local
  return null
}

export function hasCompleteProfile(): boolean {
  return isCompleteProfile(getProfile())
}

export function saveProfileLocal(profile: PrepSightProfile, uid?: string): void {
  if (typeof window === "undefined") return
  const normalized = normalizeProfile(profile)
  if (!normalized) return
  const hydrated = ensureLocalOrganizationContext(ensurePortalSurfaceProfile(normalized))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrated))
  if (uid?.trim()) {
    localStorage.setItem(STORAGE_UID_KEY, uid.trim())
  }
  window.localStorage.removeItem(FORCE_ONBOARDING_KEY)
  setPlatformRoleCookie(hydrated.platformRole!)
  setSpecialtyPreferencesCookie(hydrated.specialtiesOfInterest)
  publishProfileChange(hydrated)
}

export function syncProfileRoleCookie(): void {
  const profile = getProfile()
  if (!profile) return
  setPlatformRoleCookie(profile.platformRole!)
}

export function clearProfile(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(STORAGE_UID_KEY)
  clearPlatformRoleCookie()
  clearSpecialtyPreferencesCookie()
  publishProfileChange(null)
}

export function hasProfile(): boolean {
  return getProfile() !== null
}

export function markOnboardingComplete(uid: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(`${ONBOARDING_COMPLETE_PREFIX}${uid}`, "1")
  } catch {}
}

export function hasOnboardingCompleteFlag(uid: string): boolean {
  if (typeof window === "undefined") return false
  try {
    return localStorage.getItem(`${ONBOARDING_COMPLETE_PREFIX}${uid}`) === "1"
  } catch {
    return false
  }
}

export function clearOnboardingCompleteFlag(uid: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(`${ONBOARDING_COMPLETE_PREFIX}${uid}`)
  } catch {}
}

export function setActiveOrganizationId(organizationId: string): PrepSightProfile | null {
  const profile = getProfile()
  if (!profile) return null
  const normalized = organizationId.trim()
  if (!normalized) return profile

  const next: PrepSightProfile = {
    ...profile,
    activeOrganizationId: normalized,
    organizationIds: Array.from(new Set([...(profile.organizationIds ?? []), normalized])),
  }

  saveProfileLocal(next, getStoredProfileOwnerUid() ?? undefined)
  return next
}

export function addOrganizationMembershipToProfile(organizationId: string): PrepSightProfile | null {
  const profile = getProfile()
  if (!profile) return null
  const normalized = organizationId.trim()
  if (!normalized) return profile

  const next: PrepSightProfile = {
    ...profile,
    activeOrganizationId: profile.activeOrganizationId ?? normalized,
    organizationIds: Array.from(new Set([...(profile.organizationIds ?? []), normalized])),
  }

  saveProfileLocal(next, getStoredProfileOwnerUid() ?? undefined)
  return next
}

export function subscribeProfile(onChange: (profile: PrepSightProfile | null) => void): () => void {
  if (typeof window === "undefined") return () => {}

  const handleProfileChange = (event: Event) => {
    const customEvent = event as CustomEvent<PrepSightProfile | null>
    onChange(customEvent.detail ?? null)
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === STORAGE_UID_KEY) {
      onChange(getProfile())
    }
  }

  window.addEventListener(PROFILE_CHANGE_EVENT, handleProfileChange as EventListener)
  window.addEventListener("storage", handleStorage)

  return () => {
    window.removeEventListener(PROFILE_CHANGE_EVENT, handleProfileChange as EventListener)
    window.removeEventListener("storage", handleStorage)
  }
}

export function getPrimaryWorkspaceLabel(profile: PrepSightProfile | null): string | null {
  const value = profile?.departments?.find((entry) => entry.trim())
  return value?.trim() || null
}

export function shouldForceOnboarding(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(FORCE_ONBOARDING_KEY) === "true"
}

export function resetOnboarding(): void {
  if (typeof window === "undefined") return
  clearProfile()
  window.localStorage.setItem(FORCE_ONBOARDING_KEY, "true")
}

export async function saveProfile(profile: PrepSightProfile, uid?: string): Promise<void> {
  const normalized = normalizeProfile(profile)
  if (!normalized) return
  const portalProfile = ensurePortalSurfaceProfile(normalized)
  saveProfileLocal(portalProfile, uid)
  if (!uid) return

  try {
    const legacyMembership = await upsertOrganizationMembership(uid, portalProfile)
    const membership = await upsertPortalMembership(uid, portalProfile)
    const approvedOrganizationId =
      (membership?.status === "active" ? membership.organizationId : undefined) ??
      (legacyMembership?.status === "active" ? legacyMembership.organizationId : undefined)
    const profileForStorage: PrepSightProfile = {
      ...portalProfile,
      activeOrganizationId: approvedOrganizationId ?? normalized.activeOrganizationId,
      organizationIds: approvedOrganizationId
        ? Array.from(new Set([...(portalProfile.organizationIds ?? []), approvedOrganizationId]))
        : portalProfile.organizationIds,
    }

    saveProfileLocal(profileForStorage, uid)
    await saveUserProfile(uid, profileForStorage)
  } catch (error) {
    console.warn("[PrepSight] Falling back to local profile save:", error)
  }
}

export async function resolveProfile(uid: string): Promise<PrepSightProfile | null> {
  if (shouldForceOnboarding()) return null
  const local = getProfileForUid(uid)
  if (local) return local
  if (getProfile() && !getStoredProfileOwnerUid()) {
    clearProfile()
  }

  const remote = await getUserProfile(uid)
  if (remote) {
    const normalized = normalizeProfile(remote)
    if (!normalized) return null
    const portalProfile = ensurePortalSurfaceProfile(normalized)
    const portalMemberships = await getPortalMemberships(uid)
    const activePortalMembershipIds = portalMemberships
      .filter((membership) => membership.status === "active")
      .map((membership) => membership.organizationId)
    const hydrated: PrepSightProfile = {
      ...portalProfile,
      activeOrganizationId:
        portalProfile.activeOrganizationId ??
        activePortalMembershipIds[0] ??
        (await ensureOrganizationForHospital(uid, portalProfile.hospital))?.id,
      organizationIds:
        portalProfile.organizationIds?.length
          ? Array.from(new Set([...portalProfile.organizationIds, ...activePortalMembershipIds]))
          : Array.from(new Set(activePortalMembershipIds)),
    }
    try {
      await upsertOrganizationMembership(uid, hydrated)
      await upsertPortalMembership(uid, hydrated)
    } catch (error) {
      console.warn("[PrepSight] Membership metadata sync failed during resolveProfile:", error)
    }
    saveProfileLocal(hydrated, uid)
    return hydrated
  }

  if (getStoredProfileOwnerUid() && getStoredProfileOwnerUid() !== uid) {
    clearProfile()
  }
  return null
}

export async function syncMembershipsIntoProfile(uid: string): Promise<PrepSightProfile | null> {
  const profile = await resolveProfile(uid)
  if (!profile) return null

  const portalMemberships = await getPortalMemberships(uid)
  const activePortalMembershipIds = portalMemberships
    .filter((membership) => membership.status === "active")
    .map((membership) => membership.organizationId)

  const next: PrepSightProfile = {
    ...ensurePortalSurfaceProfile(profile),
    activeOrganizationId: profile.activeOrganizationId ?? activePortalMembershipIds[0],
    organizationIds: Array.from(
      new Set([...(profile.organizationIds ?? []), ...activePortalMembershipIds]),
    ),
  }

  try {
    await upsertOrganizationMembership(uid, next)
    await upsertPortalMembership(uid, next)
  } catch (error) {
    console.warn("[PrepSight] Membership metadata sync failed during syncMembershipsIntoProfile:", error)
  }

  saveProfileLocal(next, uid)
  return next
}

const DEPT_TO_SETTING: Record<string, ClinicalSetting> = {
  Theatres: "Operating Theatre",
  Endoscopy: "Endoscopy Suite",
  "ICU / Critical Care": "Intensive Care Unit",
  "Emergency Department": "Emergency Department",
  Ward: "Ward",
  "Clinic / Outpatients": "Outpatient / Clinic",
  Maternity: "Maternity & Obstetrics",
  "Interventional Radiology": "Interventional Radiology / Cath Lab",
}

export function getRelevantSettings(profile: PrepSightProfile): ClinicalSetting[] {
  return profile.departments
    .map((department) => DEPT_TO_SETTING[department])
    .filter(Boolean) as ClinicalSetting[]
}
