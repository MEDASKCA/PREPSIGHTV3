PrepSight portal vnext

Purpose:
- isolated sibling app for NHSmail sign-in
- PrepSight native accounts
- approval and subscription flow
- Teams mirroring integration

Rules:
- preserve the existing PrepSight UI structure and styling
- make auth, billing, and integration changes additively
- treat this app as the migration target, not the current live portal

Notes:
- copied from `prepsight-portal`
- excludes `.git`, `.next`, and `node_modules`
