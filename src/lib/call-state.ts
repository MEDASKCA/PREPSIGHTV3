"use client"

import { useEffect, useState } from "react"

export type CallStatusState = {
  state: "idle" | "incoming" | "outgoing" | "active"
  mediaMode: "audio" | "video"
  elapsed: number
  muted: boolean
  minimized: boolean
  callerName: string
  callerUid: string
  calleeName: string
  calleeUid: string
  remoteStream: MediaStream | null
  // action callbacks registered by MainApp
  end: (() => void) | null
  answer: (() => void) | null
  decline: (() => void) | null
  toggleMute: (() => void) | null
  switchToAudio: (() => void) | null
  switchCamera: (() => void) | null
  expand: (() => void) | null
  enterFullscreen: (() => void) | null
}

const IDLE: CallStatusState = {
  state: "idle",
  mediaMode: "audio",
  elapsed: 0,
  muted: false,
  minimized: false,
  callerName: "",
  callerUid: "",
  calleeName: "",
  calleeUid: "",
  remoteStream: null,
  end: null,
  answer: null,
  decline: null,
  toggleMute: null,
  switchToAudio: null,
  switchCamera: null,
  expand: null,
  enterFullscreen: null,
}

let _state: CallStatusState = { ...IDLE }
const _listeners = new Set<(s: CallStatusState) => void>()

export function getCallStatus(): CallStatusState {
  return _state
}

export function publishCallStatus(patch: Partial<CallStatusState>): void {
  _state = { ..._state, ...patch }
  _listeners.forEach(fn => fn(_state))
}

// Resets non-action fields to idle; preserves registered callbacks so they stay valid until unmount
export function resetCallStatus(): void {
  const { end, answer, decline, toggleMute, switchToAudio, expand } = _state
  _state = { ...IDLE, end, answer, decline, toggleMute, switchToAudio, expand }
  _listeners.forEach(fn => fn(_state))
}

// Full clear — called when MainApp unmounts
export function clearCallStatus(): void {
  _state = { ...IDLE }
  _listeners.forEach(fn => fn(_state))
}

export function subscribeCallStatus(fn: (s: CallStatusState) => void): () => void {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}

export function useCallStatus(): CallStatusState {
  const [s, setS] = useState<CallStatusState>(getCallStatus)
  useEffect(() => subscribeCallStatus(setS), [])
  return s
}
