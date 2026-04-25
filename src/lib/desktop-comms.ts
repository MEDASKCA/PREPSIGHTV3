"use client"

const STORAGE_KEY = "prepsight.desktop.comms.open"
const WIDTH_KEY = "prepsight.desktop.comms.width"
const DEFAULT_OPEN = true
const DEFAULT_WIDTH = 340
const MIN_WIDTH = 300
const MAX_WIDTH = 520

function readStoredValue() {
  if (typeof window === "undefined") return DEFAULT_OPEN
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored == null) return DEFAULT_OPEN
  return stored === "true"
}

export function getDesktopCommsPreference() {
  return readStoredValue()
}

export function subscribeDesktopCommsPreference(callback: () => void) {
  if (typeof window === "undefined") return () => {}

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback()
  }

  const handleCustom = () => callback()

  window.addEventListener("storage", handleStorage)
  window.addEventListener("prepsight:desktop-comms-change", handleCustom)

  return () => {
    window.removeEventListener("storage", handleStorage)
    window.removeEventListener("prepsight:desktop-comms-change", handleCustom)
  }
}

export function setDesktopCommsPreference(nextValue: boolean) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, String(nextValue))
  window.dispatchEvent(new Event("prepsight:desktop-comms-change"))
}

export function toggleDesktopCommsPreference() {
  setDesktopCommsPreference(!readStoredValue())
}

function clampWidth(value: number) {
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(value)))
}

function readStoredWidth() {
  if (typeof window === "undefined") return DEFAULT_WIDTH
  const stored = window.localStorage.getItem(WIDTH_KEY)
  if (stored == null) return DEFAULT_WIDTH
  const parsed = Number(stored)
  if (!Number.isFinite(parsed)) return DEFAULT_WIDTH
  return clampWidth(parsed)
}

export function getDesktopCommsWidth() {
  return readStoredWidth()
}

export function setDesktopCommsWidth(nextWidth: number) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(WIDTH_KEY, String(clampWidth(nextWidth)))
  window.dispatchEvent(new Event("prepsight:desktop-comms-change"))
}

export function getDesktopCommsWidthBounds() {
  return { min: MIN_WIDTH, max: MAX_WIDTH, defaultWidth: DEFAULT_WIDTH }
}
