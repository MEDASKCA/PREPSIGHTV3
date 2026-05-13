"use client"

// In-memory signal for foldable split: surface pane requests comms pane to open a DM by display name.
// Mirrors the fold-comms-thread pattern.

let _name: string | null = null
const _listeners = new Set<() => void>()

export function requestFoldOpenDm(displayName: string) {
  _name = displayName
  _listeners.forEach((l) => l())
}

export function consumeFoldOpenDm(): string | null {
  const name = _name
  _name = null
  return name
}

export function subscribeFoldOpenDm(listener: () => void) {
  _listeners.add(listener)
  return () => { _listeners.delete(listener) }
}
