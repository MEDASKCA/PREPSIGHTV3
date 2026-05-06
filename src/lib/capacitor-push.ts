"use client"

import { doc, setDoc, arrayUnion } from "firebase/firestore"
import { db } from "@/lib/firebase"

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return !!(window as any).Capacitor?.isNativePlatform?.()
  } catch {
    return false
  }
}

export async function setupCapacitorPush(uid: string): Promise<void> {
  if (!isNativeApp()) return

  const { PushNotifications } = await import("@capacitor/push-notifications")

  const permission = await PushNotifications.requestPermissions()
  if (permission.receive !== "granted") return

  await PushNotifications.register()

  PushNotifications.addListener("registration", async (token) => {
    if (!token.value || !db) return
    await setDoc(doc(db, "comms_v5_users", uid), { fcmTokens: arrayUnion(token.value) }, { merge: true })
  })

  // Foreground notification received — Capacitor surfaces it here on native
  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.log("Push received in foreground:", notification)
  })

  // User tapped a notification
  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    console.log("Notification tapped:", action)
    // Could navigate to comms here in future
  })
}
