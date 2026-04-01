// ── Admin session & content registry ─────────────────────────────────────────

const ADMIN_SESSION_KEY = "ps-admin-v1"

// Set NEXT_PUBLIC_ADMIN_PASSWORD in .env.local to override the default
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "prepsight-dev"

export function checkAdminPassword(input: string): boolean {
  return input === ADMIN_PASSWORD
}

export function setAdminSession(): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(ADMIN_SESSION_KEY, "true")
  }
}

export function isAdminSession(): boolean {
  if (typeof window === "undefined") return false
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "true"
}

export function clearAdminSession(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(ADMIN_SESSION_KEY)
  }
}

// ── Editable content registry ─────────────────────────────────────────────────
// Each entry maps to a Firestore document in admin_content/{key}
// Components can read overrides via getAllAdminContent() + fallback to defaultValue

export interface ContentEntry {
  key: string           // flat key e.g. "login.tagline"
  page: string          // display group e.g. "Login"
  label: string         // human-readable field name
  defaultValue: string  // fallback used in code
  multiline?: boolean   // textarea vs input
}

export const CONTENT_REGISTRY: ContentEntry[] = [
  // Login page
  {
    key:          "login.tagline",
    page:         "Login",
    label:        "Hero tagline",
    defaultValue: "Every case. Every setting. Every team.",
  },
  {
    key:          "login.body_1",
    page:         "Login",
    label:        "Body paragraph 1",
    defaultValue: "Preparation information has a habit of living everywhere. A notebook somewhere. A screenshot on a phone. A preference list saved in a folder. And occasionally... memory! We bring it together in one place. Each card acts as a guide to the key details used to prepare procedures, organised by setting and specialty.",
    multiline:    true,
  },
  {
    key:          "login.body_2",
    page:         "Login",
    label:        "Body paragraph 2 (disclaimer)",
    defaultValue: "PrepSight supports your preparation. Your trust\u2019s policy and your clinical judgement always come first.",
    multiline:    true,
  },
  {
    key:          "login.footer_note",
    page:         "Login",
    label:        "Footer note",
    defaultValue: "PrepSight holds no patient data. Sign-in saves your preferences only.",
  },

  // Onboarding
  {
    key:          "onboarding.step1_title",
    page:         "Onboarding",
    label:        "Step 1 title (Hospital)",
    defaultValue: "Where do you work?",
  },
  {
    key:          "onboarding.step2_title",
    page:         "Onboarding",
    label:        "Step 2 title (Departments)",
    defaultValue: "Your departments",
  },
  {
    key:          "onboarding.step3_title",
    page:         "Onboarding",
    label:        "Step 3 title (Disclaimer)",
    defaultValue: "Important to know",
  },
  {
    key:          "onboarding.step3_body",
    page:         "Onboarding",
    label:        "Step 3 body (disclaimer text)",
    defaultValue: "PrepSight is a reference tool, not a substitute for clinical judgement, trust policies, or local protocols. Always follow your organisation's guidelines.",
    multiline:    true,
  },
  {
    key:          "onboarding.step4_title",
    page:         "Onboarding",
    label:        "Step 4 title (Use case)",
    defaultValue: "How will you use PrepSight?",
  },

  // Home page
  {
    key:          "home.search_placeholder",
    page:         "Home",
    label:        "Search placeholder text",
    defaultValue: "Search procedures, specialties\u2026",
  },
  {
    key:          "home.empty_state",
    page:         "Home",
    label:        "Empty search result message",
    defaultValue: "No procedures match your search.",
  },

  // Footer / trust line
  {
    key:          "global.footer_trust",
    page:         "Global",
    label:        "Procedure page footer (trust indicator)",
    defaultValue: "PrepSight editorial · Local policy applies",
  },
  {
    key:          "global.brand_name",
    page:         "Global",
    label:        "Brand name (MEDASKCA wordmark)",
    defaultValue: "MEDASKCA",
  },
]

// Group registry by page for display
export function groupedContent(): Record<string, ContentEntry[]> {
  return CONTENT_REGISTRY.reduce<Record<string, ContentEntry[]>>((acc, entry) => {
    if (!acc[entry.page]) acc[entry.page] = []
    acc[entry.page].push(entry)
    return acc
  }, {})
}
