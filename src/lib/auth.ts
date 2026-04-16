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
microsoftProvider.setCustomParameters({ prompt: "select_account" })
const LOCAL_DEV_AUTH_KEY = "prepsight_local_dev_auth"
const REDIRECT_AUTH_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "prepsight.medaskca.com",
  "prepsight.vercel.app",
  "prepsightv3.vercel.app",
  "ps.medaskca.com",
  "ps-two-dusky.vercel.app",
  "prepsightv3-3l6x93pra-alex-monterubios-projects.vercel.app",
])

type LocalDevSession = {
  email: string
  uid: string
  displayName: string
}

function isLocalDevHost() {
  if (typeof window === "undefined") return false
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
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

function shouldUseRedirect() {
  if (typeof window === "undefined") return false
  return isMobile() || REDIRECT_AUTH_HOSTS.has(window.location.hostname)
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
  if (shouldUseRedirect()) {
    await signInWithRedirect(authInstance, googleProvider)
    return { method: "redirect" as const }
  }
  try {
    const result = await signInWithPopup(authInstance, googleProvider)
    return { method: "popup" as const, result }
  } catch (e: unknown) {
    const code = (e as { code?: string }).code ?? ""
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
  if (shouldUseRedirect()) {
    await signInWithRedirect(authInstance, microsoftProvider)
    return { method: "redirect" as const }
  }
  try {
    const result = await signInWithPopup(authInstance, microsoftProvider)
    return { method: "popup" as const, result }
  } catch (e: unknown) {
    const code = (e as { code?: string }).code ?? ""
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
