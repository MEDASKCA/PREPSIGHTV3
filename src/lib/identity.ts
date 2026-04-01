import type {
  IdentityMode,
  OrganizationMembershipRecord,
  OrganizationRecord,
  PrepSightProfile,
  UserRole,
} from "./types"

const ALIAS_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
export type GlobalIdentityTier = "anonymised" | "coarse" | "hidden"

function randomDigits(length = 3): string {
  let token = ""
  for (let index = 0; index < length; index += 1) {
    token += Math.floor(Math.random() * 10).toString()
  }
  return token
}

function hashSeed(seed: string): number {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 1000
  }
  return hash
}

function toThreeDigits(value: number): string {
  return (value % 1000).toString().padStart(3, "0")
}

function randomToken(length = 6): string {
  let token = ""
  for (let index = 0; index < length; index += 1) {
    token += ALIAS_ALPHABET[Math.floor(Math.random() * ALIAS_ALPHABET.length)] ?? "X"
  }
  return token
}

function normalize(value?: string | null): string {
  return value?.trim().toLowerCase() ?? ""
}

function getSpecialtyCode(profile?: Pick<PrepSightProfile, "specialtiesOfInterest" | "departments"> | null): string {
  const specialty = normalize(profile?.specialtiesOfInterest?.[0])
  if (specialty.includes("trauma") || specialty.includes("orthop")) return "TO"
  if (specialty.includes("card")) return "CA"
  if (specialty.includes("vascular")) return "VS"
  if (specialty.includes("urology")) return "UR"
  if (specialty.includes("gyn")) return "GO"
  if (specialty.includes("obstet")) return "OBS"
  if (specialty.includes("ent")) return "ENT"
  if (specialty.includes("plast")) return "PL"
  if (specialty.includes("neuro")) return "NS"
  if (specialty.includes("general")) return "GS"

  const department = normalize(profile?.departments?.[0])
  if (department.includes("theatre")) return "TH"
  if (department.includes("endoscopy")) return "EN"
  if (department.includes("icu")) return "ICU"
  if (department.includes("emergency")) return "ED"

  return "GEN"
}

function getRoleCode(role?: UserRole): string {
  switch (role) {
    case "clinical_author":
      return "CONS"
    case "editor":
      return "STAFF"
    case "viewer":
      return "STAFF"
    default:
      return "STAFF"
  }
}

export function buildOrganizationPublicAlias(): string {
  return `PSH-${randomDigits(3)}`
}

export function buildMemberPublicAlias(profile?: Pick<PrepSightProfile, "specialtiesOfInterest" | "departments" | "role"> | null): string {
  const specialtyCode = getSpecialtyCode(profile)
  const roleCode = getRoleCode(profile?.role)
  return `${specialtyCode}-${roleCode}-${randomDigits(3)}`
}

export function buildOpaquePublicAlias(prefix = "ALIAS"): string {
  return `${prefix}-${randomToken(6)}`
}

export function buildSeededOrganizationAlias(seed: string): string {
  return `PSH-${toThreeDigits(hashSeed(seed))}`
}

export function buildSeededMemberAlias(
  seed: string,
  profile?: Pick<PrepSightProfile, "specialtiesOfInterest" | "departments" | "role"> | null,
): string {
  const specialtyCode = getSpecialtyCode(profile)
  const roleCode = getRoleCode(profile?.role)
  return `${specialtyCode}-${roleCode}-${toThreeDigits(hashSeed(seed))}`
}

export function formatOrganizationIdentity(
  mode: IdentityMode,
  organization?: Pick<OrganizationRecord, "internalName" | "publicAlias"> | null,
  fallback = "Unknown organisation",
): string {
  if (!organization) return fallback
  if (mode === "internal") return organization.internalName?.trim() || fallback
  return organization.publicAlias?.trim() || fallback
}

export function formatMemberIdentity(
  mode: IdentityMode,
  member?: Pick<OrganizationMembershipRecord, "displayName" | "publicAlias"> | null,
  fallbackInternal = "Unknown staff member",
  fallbackAnonymised = "Local staff",
): string {
  if (!member) return mode === "internal" ? fallbackInternal : fallbackAnonymised
  if (mode === "internal") return member.displayName?.trim() || fallbackInternal
  return member.publicAlias?.trim() || fallbackAnonymised
}

export function formatGlobalProvenance(options: {
  tier?: GlobalIdentityTier
  organizationAlias?: string
  memberAlias?: string
  specialtyLabel?: string
  memberRoleLabel?: string
}): string {
  const {
    tier = "anonymised",
    organizationAlias = "PSH-000",
    memberAlias = "GEN-STAFF-000",
    specialtyLabel = "Specialty",
    memberRoleLabel = "Consultant",
  } = options

  if (tier === "hidden") return "Anonymous source"
  if (tier === "coarse") return `Anonymous hospital · ${specialtyLabel} ${memberRoleLabel}`
  return `${organizationAlias} · ${memberAlias}`
}
