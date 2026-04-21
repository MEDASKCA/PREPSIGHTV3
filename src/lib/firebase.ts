import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import {
  initializeAuth,
  getAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  type Auth,
} from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID

// Hosts that proxy /__/auth/* → Firebase hosting, so we use them as authDomain
const AUTH_PROXY_HOSTS = new Set([
  "prepsight.medaskca.com",
  "www.prepsight.medaskca.com",
  "ps.medaskca.com",
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
      : `${projectId}.firebaseapp.com`

  const firebaseConfig = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  }
  try {
    // Use initializeAuth with IndexedDB as primary persistence so that
    // redirect OAuth state survives page reloads (fixes auth/missing-initial-state
    // on Chrome for Android which partitions sessionStorage across navigations).
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig)
      auth = initializeAuth(app, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
        popupRedirectResolver: browserPopupRedirectResolver,
      })
    } else {
      app = getApps()[0]
      auth = getAuth(app)
    }
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
