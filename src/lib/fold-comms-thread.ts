"use client"

import type { CommsThread } from "@/lib/comms-types"

let _thread: CommsThread | null = null
const _listeners = new Set<() => void>()

export function setFoldCommsThread(t: CommsThread | null) {
  _thread = t
  _listeners.forEach((l) => l())
}

export function getFoldCommsThread(): CommsThread | null {
  return _thread
}

export function subscribeFoldCommsThread(listener: () => void) {
  _listeners.add(listener)
  return () => { _listeners.delete(listener) }
}
