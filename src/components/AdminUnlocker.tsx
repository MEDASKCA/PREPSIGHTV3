"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { checkAdminPassword, setAdminSession } from "@/lib/admin"

const CLICK_TARGET    = 10
const CLICK_WINDOW_MS = 8000   // clicks must land within 8 seconds

export default function AdminUnlocker() {
  const router   = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [password, setPassword]   = useState("")
  const [error, setError]         = useState(false)
  const clickTimesRef = useRef<number[]>([])
  const inputRef      = useRef<HTMLInputElement>(null)

  const handleDocClick = useCallback((e: MouseEvent) => {
    // Only count clicks that land on the app header (marked with data-dev-trigger)
    if (!(e.target as Element).closest("[data-dev-trigger]")) return

    const now = Date.now()
    // Remove clicks outside the rolling window
    clickTimesRef.current = clickTimesRef.current.filter((t) => now - t < CLICK_WINDOW_MS)
    clickTimesRef.current.push(now)

    if (clickTimesRef.current.length >= CLICK_TARGET) {
      clickTimesRef.current = []
      setShowModal(true)
    }
  }, [])

  useEffect(() => {
    document.addEventListener("click", handleDocClick)
    return () => document.removeEventListener("click", handleDocClick)
  }, [handleDocClick])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const hasShortcutModifier = e.ctrlKey || e.metaKey
      if (!hasShortcutModifier || !e.shiftKey) return
      if (e.repeat) return
      if (e.key.toLowerCase() !== "m") return

      const target = e.target
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return
      }

      e.preventDefault()
      setShowModal(true)
      setError(false)
      setPassword("")
      clickTimesRef.current = []
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Auto-focus password field when modal opens
  useEffect(() => {
    if (showModal) {
      setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [showModal])

  function dismiss() {
    setShowModal(false)
    setPassword("")
    setError(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (checkAdminPassword(password)) {
      setAdminSession()
      dismiss()
      router.push("/admin")
    } else {
      setError(true)
      setPassword("")
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  if (!showModal) return null

  return (
    <div
      className="fixed inset-0 bg-black/85 flex items-center justify-center z-[9999] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-xs shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-1">Dev Mode</p>
            <h2 className="text-base font-bold text-slate-900 leading-snug">Enter password</h2>
          </div>
          <button
            onClick={dismiss}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors shrink-0 ml-3"
          >
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} autoComplete="off">
          <input
            ref={inputRef}
            type="password"
            name="admin-password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false) }}
            placeholder="Password"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#4DA3FF] transition-colors"
          />

          {error && (
            <p className="mt-2 text-xs text-red-400 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
              Incorrect password
            </p>
          )}

          <button
            type="submit"
            className="w-full mt-4 bg-[#4DA3FF] text-white font-semibold text-sm py-2.5 rounded-xl hover:bg-[#2F8EF7] transition-colors"
          >
            Enter dev mode
          </button>
        </form>
      </div>
    </div>
  )
}
