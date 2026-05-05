"use client"

function matchesMediaQuery(query: string) {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches
}

function matchesFoldableUserAgent(userAgent: string) {
  return /\bSM-F(?:7|9)\d{2}\b/i.test(userAgent) || /Pixel Fold|Pixel 9 Pro Fold|Surface Duo/i.test(userAgent)
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

  if (matchesFoldableUserAgent(userAgent)) return true

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const viewportShortestSide = Math.min(viewportWidth, viewportHeight)
  const viewportLongestSide = Math.max(viewportWidth, viewportHeight)
  const viewportAspectRatio = viewportLongestSide / Math.max(viewportShortestSide, 1)

  if (viewportShortestSide >= 520 && viewportLongestSide >= 680 && viewportAspectRatio <= 1.9) {
    return true
  }

  const screenWidth = typeof window.screen !== "undefined" ? window.screen.width : viewportWidth
  const screenHeight = typeof window.screen !== "undefined" ? window.screen.height : viewportHeight
  const screenShortestSide = Math.min(screenWidth, screenHeight)
  const screenLongestSide = Math.max(screenWidth, screenHeight)
  const screenAspectRatio = screenLongestSide / Math.max(screenShortestSide, 1)

  return screenShortestSide >= 520 && screenAspectRatio <= 1.7
}
