"use client"

function matchesMediaQuery(query: string) {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches
}

export function isFoldableMobileViewport() {
  if (typeof window === "undefined") return false

  // Desktop — always use desktop layout
  if (matchesMediaQuery("(min-width: 1024px)")) return false

  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent || "" : ""
  const isAndroid = /Android/i.test(userAgent)
  const isMobile = /Mobile/i.test(userAgent)
  const isTouch =
    (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) ||
    matchesMediaQuery("(pointer: coarse)")

  // Must be Android mobile touch device
  if (!isAndroid || !isMobile || !isTouch) return false

  // Explicit foldable model names
  if (
    /SM-F[79]\d{2}/i.test(userAgent) ||          // Samsung Z Fold/Flip all generations
    /Pixel[ _](?:Fold|9 Pro Fold)/i.test(userAgent) ||
    /Surface Duo/i.test(userAgent)
  ) return true

  // Dimension fallback: regular Android phones max out at ~430px CSS width in portrait.
  // Unfolded foldables are 700-900px. Anything >= 560px is a foldable or wide tablet.
  const vw = window.innerWidth
  const vh = window.innerHeight
  const shorterSide = Math.min(vw, vh)

  return shorterSide >= 560
}
