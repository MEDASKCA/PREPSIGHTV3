"use client"

import { getMessaging, getToken, onMessage } from "firebase/messaging"
import { doc, setDoc, arrayUnion } from "firebase/firestore"
import { app, db } from "@/lib/firebase"

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

export async function requestNotificationPermission(uid: string): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window) || !app) return false
  if (!VAPID_KEY) { console.warn("NEXT_PUBLIC_FIREBASE_VAPID_KEY not set"); return false }

  const permission = await Notification.requestPermission()
  if (permission !== "granted") return false

  try {
    const messaging = getMessaging(app)
    const reg = await navigator.serviceWorker.ready
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg })

    if (token && db) {
      await setDoc(doc(db, "comms_v5_users", uid), { fcmTokens: arrayUnion(token) }, { merge: true })
    }

    return !!token
  } catch (err) {
    console.error("FCM token error:", err)
    return false
  }
}

export function onForegroundMessage(
  callback: (payload: { notification?: { title?: string; body?: string }; data?: Record<string, string> }) => void
) {
  if (typeof window === "undefined" || !app) return () => {}
  try {
    const messaging = getMessaging(app)
    return onMessage(messaging, callback)
  } catch {
    return () => {}
  }
}
