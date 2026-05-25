"use client"

import { useEffect } from "react"

export default function PWARegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return
    }

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister()
      })
    }).catch(() => {
      // Ignore cleanup failures.
    })
  }, [])

  return null
}
