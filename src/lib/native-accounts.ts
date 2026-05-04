import { NATIVE_ACCOUNT_REQUIRE_APPROVAL } from "./identity-config"

export type PrepSightAuthMode = "nhsmail" | "native"
export type PrepSightApprovalStatus = "pending_review" | "approved" | "suspended"
export type PrepSightSubscriptionStatus = "inactive" | "trial" | "active" | "past_due"

export interface PrepSightNativeAccountRecord {
  uid: string
  email: string
  displayName: string
  authMode: PrepSightAuthMode
  approvalStatus: PrepSightApprovalStatus
  // Retained for future billing or entitlements, but not used for access gating today.
  subscriptionStatus: PrepSightSubscriptionStatus
  createdAt: string
  updatedAt: string
}

export function buildPendingNativeAccount(input: {
  uid: string
  email: string
  displayName: string
}): PrepSightNativeAccountRecord {
  const now = new Date().toISOString()
  return {
    uid: input.uid,
    email: input.email.trim().toLowerCase(),
    displayName: input.displayName.trim(),
    authMode: "native",
    approvalStatus: NATIVE_ACCOUNT_REQUIRE_APPROVAL ? "pending_review" : "approved",
    subscriptionStatus: "inactive",
    createdAt: now,
    updatedAt: now,
  }
}
