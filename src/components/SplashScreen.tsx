"use client"

import { useEffect, useState } from "react"

interface Props {
  onComplete?: () => void
}

/**
 * First-session splash: MEDASKCA fades in → fades out → PrepSight fades in → overlay fades out.
 * Total duration ~3.2s. Sets sessionStorage flag before calling onComplete.
 */
export default function SplashScreen({ onComplete }: Props) {
  // "medaskca" → "prepsight" → "done" (triggers fade-out)
  const [phase, setPhase] = useState<"medaskca" | "prepsight" | "done">("medaskca")

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("prepsight"), 1600)
    const t2 = setTimeout(() => setPhase("done"),      2800)
    const t3 = setTimeout(() => {
      sessionStorage.setItem("splash_shown", "1")
      onComplete?.()
    }, 3300)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onComplete])

  return (
    <div
      className="fixed inset-0 z-[100] bg-white flex items-center justify-center"
      style={{
        opacity: phase === "done" ? 0 : 1,
        transition: "opacity 0.5s ease-out",
        pointerEvents: phase === "done" ? "none" : "auto",
      }}
    >
      {phase === "medaskca" && (
        <div className="text-center animate-fade-in">
          <p
            style={{
              fontSize: "2rem",
              fontWeight: 900,
              letterSpacing: "0.25em",
              color: "#003366",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            MEDASKCA
          </p>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.5rem", letterSpacing: "0.05em" }}>
            The intelligent operations platform
          </p>
        </div>
      )}

      {phase === "prepsight" && (
        <div className="text-center animate-fade-in">
          <div className="flex flex-col items-center leading-none mb-2">
            <span style={{ fontSize: "1.25rem", color: "#9CA3AF", fontFamily: "'Kalam', cursive, system-ui" }}>
              P.S.
            </span>
            <span
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                color: "#00B4D8",
                letterSpacing: "-0.025em",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              PrepSight
            </span>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.5rem" }}>
            Clinical procedure reference
          </p>
        </div>
      )}
    </div>
  )
}
