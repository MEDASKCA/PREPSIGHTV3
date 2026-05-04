export const NHSMAIL_TENANT_ID =
  process.env.NEXT_PUBLIC_NHSMAIL_TENANT_ID?.trim() || "organizations"

export const NHSMAIL_AUTHORITY = `https://login.microsoftonline.com/${NHSMAIL_TENANT_ID}`

export const NHSMAIL_PROVIDER_HINT =
  process.env.NEXT_PUBLIC_NHSMAIL_PROVIDER_HINT?.trim() || "nhs.net"

export const NATIVE_ACCOUNT_REQUIRE_APPROVAL =
  process.env.NEXT_PUBLIC_NATIVE_ACCOUNT_REQUIRE_APPROVAL !== "false"

export const TEAMS_MIRRORING_ENABLED =
  process.env.NEXT_PUBLIC_TEAMS_MIRRORING_ENABLED === "true"
