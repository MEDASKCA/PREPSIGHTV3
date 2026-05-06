"use client"

import { useEffect } from "react"
import { applyUserPreferences, readUserPreferences } from "@/lib/user-preferences"
import { syncProfileRoleCookie } from "@/lib/profile"

export default function UserPreferencesBoot() {
  useEffect(() => {
    applyUserPreferences(readUserPreferences())
    syncProfileRoleCookie()

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/firebase-messaging-sw.js").catch(() => {})
    }
  }, [])

  return null
}
