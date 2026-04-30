"use client"

import { useRef, useState, useSyncExternalStore } from "react"
import {
  getDesktopCommsPreference,
  subscribeDesktopCommsPreference,
  toggleDesktopCommsPreference,
} from "@/lib/desktop-comms"

export default function DesktopCommsFAB() {
  const commsRailOpen = useSyncExternalStore(
    subscribeDesktopCommsPreference,
    getDesktopCommsPreference,
    getDesktopCommsPreference,
  )
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{
    startX: number; startY: number; origX: number; origY: number; moved: boolean
  } | null>(null)

  // Only visible on desktop when comms is closed
  if (commsRailOpen) return null

  const SIZE = 52

  return (
    <div
      className="hidden lg:block"
      style={{
        position: "fixed",
        zIndex: 150,
        ...(pos
          ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" }
          : { right: 24, bottom: 24 }),
      }}
      onMouseDown={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        dragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top, moved: false }
        const onMove = (mv: MouseEvent) => {
          if (!dragRef.current) return
          const dx = mv.clientX - dragRef.current.startX
          const dy = mv.clientY - dragRef.current.startY
          if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.moved = true
          const nx = dragRef.current.origX + dx
          const ny = dragRef.current.origY + dy
          setPos({
            x: Math.max(0, Math.min(nx, window.innerWidth - SIZE)),
            y: Math.max(0, Math.min(ny, window.innerHeight - SIZE)),
          })
        }
        const onUp = () => {
          dragRef.current = null
          window.removeEventListener("mousemove", onMove)
          window.removeEventListener("mouseup", onUp)
        }
        window.addEventListener("mousemove", onMove)
        window.addEventListener("mouseup", onUp)
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (dragRef.current?.moved) return
          toggleDesktopCommsPreference()
        }}
        className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#0096C7] shadow-[0_4px_20px_rgba(0,150,199,0.45)] transition-colors hover:bg-[#007fb3] select-none"
        aria-label="Open PrepSight Comms"
        title="Open Comms"
      >
        <img
          src="/image3.png"
          alt=""
          aria-hidden="true"
          className="h-[580px] w-[580px] shrink-0 object-contain opacity-[0.98] [filter:drop-shadow(0_0_1px_rgba(255,255,255,0.5))]"
        />
      </button>
    </div>
  )
}
