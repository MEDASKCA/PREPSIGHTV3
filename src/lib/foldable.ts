"use client"

function matchesMediaQuery(query: string) {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches
}

export function isFoldableMobileViewport() {
  if (typeof window === "undefined") return false

  if (matchesMediaQuery("(min-width: 1024px)")) return false

  if (matchesMediaQuery("(spanning: single-fold-vertical)") || matchesMediaQuery("(spanning: single-fold-horizontal)")) {
    return true
  }

  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent || "" : ""
  const isAndroidMobile = /Android/i.test(userAgent) && /Mobile/i.test(userAgent)
  const isTouchViewport =
    (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) ||
    matchesMediaQuery("(pointer: coarse)") ||
    matchesMediaQuery("(hover: none)")

  if (!isAndroidMobile || !isTouchViewport) return false

  const width = window.innerWidth
  const height = window.innerHeight
  const shortestSide = Math.min(width, height)
  const longestSide = Math.max(width, height)
  const aspectRatio = longestSide / Math.max(shortestSide, 1)

  return shortestSide >= 560 && longestSide >= 720 && aspectRatio <= 1.85
}
