"use client"

const DEMO_ACCESS_KEY = "prepsight_demo_access"

export const DEMO_USERNAME = "demo"
export const DEMO_PASSWORD = "medaskca-demo"

export function isDemoSessionActive() {
  if (typeof window === "undefined") return false
  const value =
    window.localStorage.getItem(DEMO_ACCESS_KEY) ??
    window.sessionStorage.getItem(DEMO_ACCESS_KEY)
  return value === "enabled"
}

export function enableDemoSession() {
  if (typeof window === "undefined") return
  window.localStorage.setItem(DEMO_ACCESS_KEY, "enabled")
  window.sessionStorage.setItem(DEMO_ACCESS_KEY, "enabled")
}

export function clearDemoSession() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(DEMO_ACCESS_KEY)
  window.sessionStorage.removeItem(DEMO_ACCESS_KEY)
}
