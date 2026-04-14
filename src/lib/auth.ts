import { auth } from "./firebase"
import {
  GoogleAuthProvider,
  OAuthProvider,
  deleteUser,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  browserLocalPersistence,
  setPersistence,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"

const googleProvider    = new GoogleAuthProvider()
const microsoftProvider = new OAuthProvider("microsoft.com")
microsoftProvider.setCustomParameters({ prompt: "select_account" })
const LOCAL_AUTH_DISABLED_KEY = "prepsight_local_auth_disabled"
const LOCAL_AUTH_EVENT = "prepsight-local-auth-change"
const LOCAL_DEV_USER = {
  uid: "local-dev-user",
  email: "local@prepsight.dev",
  displayName: "Local Dev",
  photoURL: null,
} as User

function isPrivateLanHost(host: string) {
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true
  const match172 = host.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/)
  if (!match172) return false
  const secondOctet = Number(match172[1])
  return secondOctet >= 16 && secondOctet <= 31
}

function isLocalDevHost() {
  if (typeof window === "undefined") return false
  const host = window.location.hostname.trim().toLowerCase()
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || isPrivateLanHost(host)
}

function isLocalDevSignedIn() {
  if (!isLocalDevHost()) return false
  return window.localStorage.getItem(LOCAL_AUTH_DISABLED_KEY) !== "true"
}

function setLocalDevSignedIn(nextSignedIn: boolean) {
  if (!isLocalDevHost()) return
  if (nextSignedIn) {
    window.localStorage.removeItem(LOCAL_AUTH_DISABLED_KEY)
  } else {
    window.localStorage.setItem(LOCAL_AUTH_DISABLED_KEY, "true")
  }
  window.dispatchEvent(new Event(LOCAL_AUTH_EVENT))
}

function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

function shouldUseRedirect() {
  if (typeof window === "undefined") return false
  return isMobile()
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
  if (isLocalDevHost()) {
    setLocalDevSignedIn(true)
    return { method: "popup" as const, result: null }
  }
  if (!auth) throw new Error("Firebase not configured")
  if (shouldUseRedirect()) {
    const authInstance = await prepareAuth()
    await signInWithRedirect(authInstance, googleProvider)
    return { method: "redirect" as const }
  }
  try {
    const result = await signInWithPopup(auth, googleProvider)
    return { method: "popup" as const, result }
  } catch (e: unknown) {
    const code = (e as { code?: string }).code ?? ""
    if (code === "auth/popup-blocked" || code === "auth/popup-closed-by-user") {
      const authInstance = await prepareAuth()
      await signInWithRedirect(authInstance, googleProvider)
      return { method: "redirect" as const }
    }
    throw e
  }
}

export async function signInWithMicrosoft() {
  if (isLocalDevHost()) {
    setLocalDevSignedIn(true)
    return { method: "popup" as const, result: null }
  }
  if (!auth) throw new Error("Firebase not configured")
  if (shouldUseRedirect()) {
    const authInstance = await prepareAuth()
    await signInWithRedirect(authInstance, microsoftProvider)
    return { method: "redirect" as const }
  }
  try {
    const result = await signInWithPopup(auth, microsoftProvider)
    return { method: "popup" as const, result }
  } catch (e: unknown) {
    const code = (e as { code?: string }).code ?? ""
    if (code === "auth/popup-blocked" || code === "auth/popup-closed-by-user") {
      const authInstance = await prepareAuth()
      await signInWithRedirect(authInstance, microsoftProvider)
      return { method: "redirect" as const }
    }
    throw e
  }
}

export async function getLoginRedirectResult() {
  if (isLocalDevHost()) return null
  if (!auth) return null
  return getRedirectResult(auth)
}

export async function signOut() {
  if (isLocalDevHost()) {
    setLocalDevSignedIn(false)
    return
  }
  if (!auth) return
  return firebaseSignOut(auth)
}

export async function deleteAuthenticatedAccount() {
  if (isLocalDevHost()) {
    setLocalDevSignedIn(false)
    return
  }
  if (!auth?.currentUser) throw new Error("No authenticated user")
  await deleteUser(auth.currentUser)
}

export function onAuthChange(callback: (user: User | null) => void) {
  if (isLocalDevHost()) {
    const notify = () => callback(isLocalDevSignedIn() ? LOCAL_DEV_USER : null)
    notify()
    window.addEventListener("storage", notify)
    window.addEventListener(LOCAL_AUTH_EVENT, notify)
    return () => {
      window.removeEventListener("storage", notify)
      window.removeEventListener(LOCAL_AUTH_EVENT, notify)
    }
  }
  if (!auth) {
    // No Firebase credentials — treat as not signed in
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(auth, callback)
}

export type { User }
