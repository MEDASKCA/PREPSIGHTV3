export type AppearanceTheme = "light" | "dark"
export type LanguagePreference = "en" | "es" | "fr" | "de" | "pt"

export interface UserPreferences {
  notifications: {
    procedureUpdates: boolean
    productAnnouncements: boolean
    accountAlerts: boolean
  }
  access: {
    appearance: AppearanceTheme
    language: LanguagePreference
  }
}

export const USER_PREFERENCES_STORAGE_KEY = "prepsight_user_preferences"

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  notifications: {
    procedureUpdates: true,
    productAnnouncements: false,
    accountAlerts: true,
  },
  access: {
    appearance: "light",
    language: "en",
  },
}

const LANGUAGE_TO_HTML_LANG: Record<LanguagePreference, string> = {
  en: "en",
  es: "es",
  fr: "fr",
  de: "de",
  pt: "pt",
}

function mergeUserPreferences(
  value: Partial<UserPreferences> | null | undefined,
): UserPreferences {
  return {
    notifications: {
      procedureUpdates:
        value?.notifications?.procedureUpdates ?? DEFAULT_USER_PREFERENCES.notifications.procedureUpdates,
      productAnnouncements:
        value?.notifications?.productAnnouncements ?? DEFAULT_USER_PREFERENCES.notifications.productAnnouncements,
      accountAlerts:
        value?.notifications?.accountAlerts ?? DEFAULT_USER_PREFERENCES.notifications.accountAlerts,
    },
    access: {
      appearance: value?.access?.appearance ?? DEFAULT_USER_PREFERENCES.access.appearance,
      language: value?.access?.language ?? DEFAULT_USER_PREFERENCES.access.language,
    },
  }
}

export function readUserPreferences(): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_USER_PREFERENCES

  try {
    const raw = window.localStorage.getItem(USER_PREFERENCES_STORAGE_KEY)
    if (!raw) return DEFAULT_USER_PREFERENCES
    return mergeUserPreferences(JSON.parse(raw) as Partial<UserPreferences>)
  } catch {
    return DEFAULT_USER_PREFERENCES
  }
}

export function saveUserPreferences(preferences: UserPreferences): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(USER_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
}

export function applyUserPreferences(preferences: UserPreferences): void {
  if (typeof window === "undefined") return

  const root = window.document.documentElement
  root.dataset.theme = preferences.access.appearance
  root.lang = LANGUAGE_TO_HTML_LANG[preferences.access.language]
  window.dispatchEvent(new Event("prepsight:preferences-changed"))
}
