"use client"

import { useEffect } from "react"

export default function PWARegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return
    }

    const host = window.location.hostname
    const isPrivateLanHost =
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
      (() => {
        const match = host.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/)
        if (!match) return false
        const secondOctet = Number(match[1])
        return secondOctet >= 16 && secondOctet <= 31
      })()

    const shouldDisableServiceWorker =
      host === "localhost" ||
      host === "127.0.0.1" ||
      isPrivateLanHost

    if (shouldDisableServiceWorker) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister()
        })
      }).catch(() => {
        // Ignore cleanup failures on local development.
      })
      return
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Ignore registration failures in development fallback scenarios.
    })
  }, [])

  return null
}
