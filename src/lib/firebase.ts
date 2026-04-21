import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let storage: FirebaseStorage | null = null

if (apiKey && projectId && storageBucket && messagingSenderId && appId) {
  const firebaseConfig = {
    apiKey,
    // Always use the default Firebase auth domain — the custom authDomain proxy through
    // Vercel causes popup postMessage failures and redirect state loss on Android Chrome.
    authDomain: `${projectId}.firebaseapp.com`,
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
