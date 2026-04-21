import { auth } from "./firebase"
import {
  GoogleAuthProvider,
  OAuthProvider,
  deleteUser,
  reauthenticateWithPopup,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  browserLocalPersistence,
  setPersistence,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"

const googleProvider = new GoogleAuthProvider()
const microsoftProvider = new OAuthProvider("microsoft.com")
microsoftProvider.setCustomParameters({ prompt: "select_account", tenant: "common" })
const LOCAL_DEV_AUTH_KEY = "prepsight_local_dev_auth"
type LocalDevSession = {
  email: string
  uid: string
  displayName: string
}

function isLocalDevHost() {
  if (typeof window === "undefined") return false
  const hostname = window.location.hostname.toLowerCase()

  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return true
  }

  if (hostname.endsWith(".local")) {
    return true
  }

  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!ipv4Match) return false

  const octets = ipv4Match.slice(1).map((value) => Number(value))
  if (octets.some((value) => Number.isNaN(value) || value < 0 || value > 255)) {
    return false
  }

  const [first, second] = octets
  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  )
}

function createLocalDevUid(email: string) {
  return `local-dev-${email.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
}

function readLocalDevSession(): LocalDevSession | null {
  if (!isLocalDevHost()) return null
  try {
    const raw = window.localStorage.getItem(LOCAL_DEV_AUTH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LocalDevSession>
    if (typeof parsed.email !== "string" || typeof parsed.uid !== "string") return null
    return {
      email: parsed.email,
      uid: parsed.uid,
      displayName:
        typeof parsed.displayName === "string" && parsed.displayName.trim().length > 0
          ? parsed.displayName
          : parsed.email.split("@")[0],
    }
  } catch {
    return null
  }
}

function writeLocalDevSession(email: string) {
  if (!isLocalDevHost()) throw new Error("Local dev sign-in is only available on localhost")
  const normalizedEmail = email.trim().toLowerCase()
  const session: LocalDevSession = {
    email: normalizedEmail,
    uid: createLocalDevUid(normalizedEmail),
    displayName: normalizedEmail.split("@")[0],
  }
  window.localStorage.setItem(LOCAL_DEV_AUTH_KEY, JSON.stringify(session))
  return session
}

function clearLocalDevSession() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(LOCAL_DEV_AUTH_KEY)
}

function buildLocalDevUser(session: LocalDevSession): User {
  return {
    uid: session.uid,
    email: session.email,
    displayName: session.displayName,
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: new Date(0).toISOString(),
      lastSignInTime: new Date().toISOString(),
    },
    phoneNumber: null,
    photoURL: null,
    providerData: [
      {
        uid: session.email,
        displayName: session.displayName,
        email: session.email,
        phoneNumber: null,
        photoURL: null,
        providerId: "google.com",
      },
    ],
    providerId: "firebase",
    refreshToken: "local-dev",
    tenantId: null,
    delete: async () => {
      clearLocalDevSession()
    },
    getIdToken: async () => "local-dev-token",
    getIdTokenResult: async () => ({
      token: "local-dev-token",
      signInProvider: "google.com",
      signInSecondFactor: null,
      authTime: new Date().toISOString(),
      issuedAtTime: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      claims: {},
    }),
    reload: async () => {},
    toJSON: () => session,
  } as User
}

function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

function isEmbeddedBrowser() {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent || ""
  return /FBAN|FBAV|Instagram|Messenger/i.test(ua) || (/\bwv\b/i.test(ua) && /Android/i.test(ua))
}

function canUseSessionStorage() {
  if (typeof window === "undefined") return false
  try {
    const key = "__prepsight_auth_probe__"
    window.sessionStorage.setItem(key, "1")
    window.sessionStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

function shouldPreferRedirect() {
  // WebView/embedded browsers (Gmail, Instagram, Outlook): popup only.
  // Redirect in these contexts is intercepted by Android and gets stuck.
  if (isEmbeddedBrowser()) return false
  // Regular mobile browsers (Android Chrome, iOS Safari): use redirect.
  // signInWithPopup on Android Chrome opens accounts.google.com, which then
  // triggers Android's native app intent chooser ("Open with Gmail / Outlook"),
  // blocking OAuth completion entirely.
  if (isMobile()) return true
  return false
}

async function prepareAuth() {
  if (!auth) throw new Error("Firebase not configured")
  await setPersistence(auth, browserLocalPersistence)
  return auth
}

if (auth) {
  void setPersistence(auth, browserLocalPersistence).catch(() => {})
}

export async function signInWithGoogle() {
  const authInstance = await prepareAuth()
  if (shouldPreferRedirect()) {
    await signInWithRedirect(authInstance, googleProvider)
    return { method: "redirect" as const }
  }
  try {
    const result = await signInWithPopup(authInstance, googleProvider)
    return { method: "popup" as const, result }
  } catch (e: unknown) {
    const code = (e as { code?: string }).code ?? ""
    if (
      (code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment" ||
        code === "auth/cancelled-popup-request") &&
      shouldPreferRedirect()
    ) {
      await signInWithRedirect(authInstance, googleProvider)
      return { method: "redirect" as const }
    }
    if (code === "auth/popup-blocked") {
      throw new Error("Google sign-in popup was blocked. Allow popups for localhost and try again.")
    }
    throw e
  }
}

export async function signInLocally(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  if (!/^[^@\s]+@gmail\.com$/.test(normalizedEmail)) {
    throw new Error("Enter a Gmail address for localhost dev sign-in.")
  }
  const session = writeLocalDevSession(normalizedEmail)
  return { method: "local" as const, user: buildLocalDevUser(session) }
}

export async function signInWithMicrosoft() {
  const authInstance = await prepareAuth()
  if (shouldPreferRedirect()) {
    await signInWithRedirect(authInstance, microsoftProvider)
    return { method: "redirect" as const }
  }
  try {
    const result = await signInWithPopup(authInstance, microsoftProvider)
    return { method: "popup" as const, result }
  } catch (e: unknown) {
    const code = (e as { code?: string }).code ?? ""
    if (
      (code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment" ||
        code === "auth/cancelled-popup-request") &&
      shouldPreferRedirect()
    ) {
      await signInWithRedirect(authInstance, microsoftProvider)
      return { method: "redirect" as const }
    }
    if (code === "auth/popup-blocked") {
      throw new Error("Microsoft sign-in popup was blocked. Allow popups for localhost and try again.")
    }
    throw e
  }
}

export async function getLoginRedirectResult() {
  if (!auth) return null
  return getRedirectResult(auth)
}

export async function signOut() {
  clearLocalDevSession()
  if (!auth) return
  return firebaseSignOut(auth)
}

export async function deleteAuthenticatedAccount() {
  const localUser = readLocalDevSession()
  if (localUser) {
    clearLocalDevSession()
    return
  }
  if (!auth?.currentUser) throw new Error("No authenticated user")
  await deleteUser(auth.currentUser)
}

export async function getAuthenticatedUser() {
  const localUser = readLocalDevSession()
  if (localUser) return buildLocalDevUser(localUser)
  return auth?.currentUser ?? null
}

export async function reauthenticateAuthenticatedUser() {
  if (!auth?.currentUser) throw new Error("No authenticated user")

  const providerIds = auth.currentUser.providerData.map((provider) => provider.providerId)
  const provider =
    providerIds.includes("microsoft.com")
      ? microsoftProvider
      : providerIds.includes("google.com")
        ? googleProvider
        : null

  if (!provider) {
    throw new Error("Unsupported authentication provider for reauthentication")
  }

  await reauthenticateWithPopup(auth.currentUser, provider)
  return auth.currentUser
}

export function onAuthChange(callback: (user: User | null) => void) {
  const localUser = readLocalDevSession()
  if (localUser) {
    callback(buildLocalDevUser(localUser))
    return () => {}
  }
  if (!auth) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(auth, callback)
}

export type { User }
