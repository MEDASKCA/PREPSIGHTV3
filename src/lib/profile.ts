import { ClinicalSetting, PlatformRole, PrepSightProfile, USER_ROLE_TO_PLATFORM_ROLE } from "./types"
import {
  getUserOrganizationMemberships,
  saveUserProfile,
  upsertOrganizationMembership,
  getUserProfile,
} from "./firestore"

const STORAGE_KEY = "prepsight_profile"
const FORCE_ONBOARDING_KEY = "prepsight_force_onboarding"
export const PLATFORM_ROLE_COOKIE_KEY = "prepsight_platform_role"
const ROLE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30
function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function resolvePlatformRole(profile: PrepSightProfile): PlatformRole {
  return profile.platformRole ?? USER_ROLE_TO_PLATFORM_ROLE[profile.role]
}

function isUserRole(value: unknown): value is PrepSightProfile["role"] {
  return value === "viewer" || value === "editor" || value === "clinical_author"
}

function setPlatformRoleCookie(role: PlatformRole): void {
  if (typeof document === "undefined") return
  document.cookie = `${PLATFORM_ROLE_COOKIE_KEY}=${role}; path=/; max-age=${ROLE_COOKIE_MAX_AGE}; samesite=lax`
}

function clearPlatformRoleCookie(): void {
  if (typeof document === "undefined") return
  document.cookie = `${PLATFORM_ROLE_COOKIE_KEY}=; path=/; max-age=0; samesite=lax`
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
    activeOrganizationId:
      typeof candidate.activeOrganizationId === "string" ? candidate.activeOrganizationId : undefined,
    organizationIds: Array.isArray(candidate.organizationIds)
      ? candidate.organizationIds.filter((value): value is string => typeof value === "string")
      : undefined,
    platformRole:
      candidate.platformRole === "user" ||
      candidate.platformRole === "moderator" ||
      candidate.platformRole === "admin"
        ? candidate.platformRole
        : undefined,
  }

  normalized.platformRole = resolvePlatformRole(normalized)
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
    return profile
  } catch {
    return null
  }
}

export function hasCompleteProfile(): boolean {
  return isCompleteProfile(getProfile())
}

export function saveProfileLocal(profile: PrepSightProfile): void {
  if (typeof window === "undefined") return
  const normalized = normalizeProfile(profile)
  if (!normalized) return
  const hydrated = ensureLocalOrganizationContext(normalized)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrated))
  window.localStorage.removeItem(FORCE_ONBOARDING_KEY)
  setPlatformRoleCookie(hydrated.platformRole!)
}

export function syncProfileRoleCookie(): void {
  const profile = getProfile()
  if (!profile) return
  setPlatformRoleCookie(profile.platformRole!)
}

export function clearProfile(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
  clearPlatformRoleCookie()
}

export function hasProfile(): boolean {
  return getProfile() !== null
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

  saveProfileLocal(next)
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

  saveProfileLocal(next)
  return next
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
  saveProfileLocal(normalized)
  if (!uid) return

  try {
    const membership = await upsertOrganizationMembership(uid, normalized)
    const approvedOrganizationId = membership?.status === "active" ? membership.organizationId : undefined
    const profileForStorage: PrepSightProfile = {
      ...normalized,
      activeOrganizationId: approvedOrganizationId ?? normalized.activeOrganizationId,
      organizationIds: approvedOrganizationId
        ? Array.from(new Set([...(normalized.organizationIds ?? []), approvedOrganizationId]))
        : normalized.organizationIds,
    }

    saveProfileLocal(profileForStorage)
    await saveUserProfile(uid, profileForStorage)
  } catch (error) {
    console.warn("[PrepSight] Falling back to local profile save:", error)
  }
}

export async function resolveProfile(uid: string): Promise<PrepSightProfile | null> {
  if (shouldForceOnboarding()) return null
  const local = getProfile()
  if (local) return local

  const remote = await getUserProfile(uid)
  if (remote) {
    const normalized = normalizeProfile(remote)
    if (!normalized) return null
    const memberships = await getUserOrganizationMemberships(uid)
    const hydrated: PrepSightProfile = {
      ...normalized,
      activeOrganizationId:
        normalized.activeOrganizationId ??
        memberships.find((membership) => membership.status === "active")?.organizationId,
      organizationIds:
        normalized.organizationIds?.length
          ? normalized.organizationIds
          : memberships
              .filter((membership) => membership.status === "active")
              .map((membership) => membership.organizationId),
    }
    saveProfileLocal(hydrated)
    return hydrated
  }

  return null
}

export async function syncMembershipsIntoProfile(uid: string): Promise<PrepSightProfile | null> {
  const profile = await resolveProfile(uid)
  if (!profile) return null

  const memberships = await getUserOrganizationMemberships(uid)
  const activeMembershipIds = memberships
    .filter((membership) => membership.status === "active")
    .map((membership) => membership.organizationId)

  const next: PrepSightProfile = {
    ...profile,
    activeOrganizationId: profile.activeOrganizationId ?? activeMembershipIds[0],
    organizationIds: Array.from(new Set([...(profile.organizationIds ?? []), ...activeMembershipIds])),
  }

  saveProfileLocal(next)
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
