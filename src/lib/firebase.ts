import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID
const AUTH_PROXY_HOSTS = new Set([
  "prepsight.medaskca.com",
  "prepsight.vercel.app",
  "ps.medaskca.com",
  "ps-two-dusky.vercel.app",
])

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let storage: FirebaseStorage | null = null

if (apiKey && projectId && storageBucket && messagingSenderId && appId) {
  const runtimeHostname =
    typeof window !== "undefined" ? window.location.hostname : null
  const authDomain =
    runtimeHostname && AUTH_PROXY_HOSTS.has(runtimeHostname)
      ? runtimeHostname
      : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN

  const firebaseConfig = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  }
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    auth = getAuth(app)
    db = getFirestore(app)
    storage = getStorage(app)
  } catch {
    app = null
    auth = null
    db = null
    storage = null
  }
}

export { auth, db, storage }
