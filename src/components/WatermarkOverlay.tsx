"use client"

import { useEffect, useState } from "react"
import { onAuthChange } from "@/lib/auth"

/**
 * Diagonal repeating watermark overlay with the signed-in user's email + date.
 * Positioned absolute — parent must be `relative`.
 * Opacity is low enough not to obscure content but visible in screenshots.
 */
export default function WatermarkOverlay() {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onAuthChange((u) => setEmail(u?.email ?? null))
    return unsub
  }, [])

  if (!email) return null

  const date = new Date().toLocaleDateString("en-GB")
  const text = `${email} · ${date}`

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        pointerEvents: "none",
        userSelect: "none",
        overflow: "hidden",
        opacity: 0.045,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "-50%",
          display: "flex",
          flexWrap: "wrap",
          gap: "2rem 3rem",
          transform: "rotate(-20deg)",
          alignContent: "flex-start",
          padding: "2rem",
        }}
      >
        {Array.from({ length: 120 }, (_, i) => (
          <span
            key={i}
            style={{
              fontSize: "11px",
              fontFamily: "monospace",
              whiteSpace: "nowrap",
              color: "#000",
              flexShrink: 0,
            }}
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  )
}
