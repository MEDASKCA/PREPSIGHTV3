"use client"

export type LocalDeviceSession = {
  sessionId: string
  deviceLabel: string
  createdAt: string
}

export type ActiveUserSessionRecord = {
  sessionId: string
  deviceLabel: string
  updatedAt: string
}

const DEVICE_SESSION_KEY = "prepsight_device_session"
const SESSION_CONFLICT_NOTICE_KEY = "prepsight_session_conflict_notice"

function createSessionId() {
  return `session_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
}

function detectBrowserLabel(userAgent: string) {
  if (/Edg\//i.test(userAgent)) return "Edge"
  if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent)) return "Chrome"
  if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) return "Safari"
  if (/Firefox\//i.test(userAgent)) return "Firefox"
  return "Browser"
}

function detectOsLabel(userAgent: string) {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "iPhone"
  if (/Android/i.test(userAgent)) return "Android"
  if (/Windows/i.test(userAgent)) return "Windows"
  if (/Mac OS X|Macintosh/i.test(userAgent)) return "Mac"
  if (/Linux/i.test(userAgent)) return "Linux"
  return "device"
}

function buildDeviceLabel() {
  if (typeof navigator === "undefined") return "This device"
  const browser = detectBrowserLabel(navigator.userAgent || "")
  const os = detectOsLabel(navigator.userAgent || "")
  return `${browser} on ${os}`
}

export function readDeviceSession(): LocalDeviceSession | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(DEVICE_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LocalDeviceSession>
    if (
      typeof parsed.sessionId !== "string" ||
      typeof parsed.deviceLabel !== "string" ||
      typeof parsed.createdAt !== "string"
    ) {
      return null
    }
    return {
      sessionId: parsed.sessionId,
      deviceLabel: parsed.deviceLabel,
      createdAt: parsed.createdAt,
    }
  } catch {
    return null
  }
}

export function getOrCreateDeviceSession(): LocalDeviceSession | null {
  if (typeof window === "undefined") return null
  const existing = readDeviceSession()
  if (existing) return existing

  const created: LocalDeviceSession = {
    sessionId: createSessionId(),
    deviceLabel: buildDeviceLabel(),
    createdAt: new Date().toISOString(),
  }
  window.localStorage.setItem(DEVICE_SESSION_KEY, JSON.stringify(created))
  return created
}

export function clearDeviceSession(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(DEVICE_SESSION_KEY)
}

export function setSessionConflictNotice(message: string): void {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(SESSION_CONFLICT_NOTICE_KEY, message)
}

export function consumeSessionConflictNotice(): string | null {
  if (typeof window === "undefined") return null
  const value = window.sessionStorage.getItem(SESSION_CONFLICT_NOTICE_KEY)
  if (!value) return null
  window.sessionStorage.removeItem(SESSION_CONFLICT_NOTICE_KEY)
  return value
}
