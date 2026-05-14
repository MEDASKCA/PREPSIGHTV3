"use client"

import { arrayUnion, doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

let initializedForUid: string | null = null

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
  if (initializedForUid === uid) return

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications")

    const permission = await PushNotifications.requestPermissions()
    if (permission.receive !== "granted") return

    await PushNotifications.register()

    PushNotifications.addListener("registration", async (token) => {
      if (!token.value || !db) return
      await setDoc(doc(db, "comms_v5_users", uid), { fcmTokens: arrayUnion(token.value) }, { merge: true })
    })

    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("Push received in foreground:", notification)
    })

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("Notification tapped:", action)
    })

    initializedForUid = uid
  } catch (error) {
    console.warn("Capacitor push setup failed:", error)
  }
}
