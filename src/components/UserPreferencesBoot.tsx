"use client"

import { useEffect } from "react"
import { applyUserPreferences, readUserPreferences } from "@/lib/user-preferences"
import { syncProfileRoleCookie } from "@/lib/profile"
import { isNativeApp } from "@/lib/capacitor-push"

export default function UserPreferencesBoot() {
  useEffect(() => {
    applyUserPreferences(readUserPreferences())
    syncProfileRoleCookie()

    if (!isNativeApp() && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/firebase-messaging-sw.js").catch(() => {})
    }
  }, [])

  return null
}
