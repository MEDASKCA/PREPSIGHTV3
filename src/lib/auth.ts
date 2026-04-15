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
  if (!auth) return null
  return getRedirectResult(auth)
}

export async function signOut() {
  if (!auth) return
  return firebaseSignOut(auth)
}

export async function deleteAuthenticatedAccount() {
  if (!auth?.currentUser) throw new Error("No authenticated user")
  await deleteUser(auth.currentUser)
}

export async function getAuthenticatedUser() {
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
  if (!auth) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(auth, callback)
}

export type { User }
