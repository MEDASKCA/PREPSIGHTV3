"use client"

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"

const BUTTON_SIZE = 64
const EDGE_GAP = 16
const BOTTOM_GAP = 20

function clampPosition(x: number, y: number) {
  if (typeof window === "undefined") {
    return { x, y }
  }

  const maxX = window.innerWidth - BUTTON_SIZE - EDGE_GAP
  const maxY = window.innerHeight - BUTTON_SIZE - BOTTOM_GAP

  return {
    x: Math.min(Math.max(EDGE_GAP, x), maxX),
    y: Math.min(Math.max(EDGE_GAP, y), maxY),
  }
}

export default function FloatingChatButton() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    if (typeof window === "undefined") return null
    return clampPosition(
      window.innerWidth - BUTTON_SIZE - EDGE_GAP,
      window.innerHeight - BUTTON_SIZE - BOTTOM_GAP,
    )
  })
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const draggingRef = useRef(false)

  useEffect(() => {
    function handleMove(event: PointerEvent) {
      if (!draggingRef.current) return

      const next = clampPosition(
        event.clientX - dragOffsetRef.current.x,
        event.clientY - dragOffsetRef.current.y,
      )
      setPosition(next)
    }

    function handleUp() {
      draggingRef.current = false
    }

    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)

    return () => {
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
    }
  }, [])

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
    draggingRef.current = true
  }

  if (!position) return null

  return (
    <button
      type="button"
      aria-label="Open AI assistant"
      onPointerDown={handlePointerDown}
      className="fixed z-50 flex touch-none items-center justify-center rounded-full transition-transform active:scale-[0.98] lg:hidden"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${BUTTON_SIZE}px`,
        height: `${BUTTON_SIZE}px`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/ps-mark.png"
        alt="P.S."
        aria-hidden="true"
        className="h-[60px] w-[60px] object-contain"
        draggable="false"
        style={{
          animation: "ai-icon-surge 2.8s ease-in-out infinite",
          filter:
            "drop-shadow(0 0 6px rgba(22,182,255,0.45)) drop-shadow(0 0 12px rgba(32,231,199,0.35))",
        }}
      />
    </button>
  )
}
