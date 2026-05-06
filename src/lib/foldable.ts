"use client"

export function isFoldableMobileViewport(): boolean {
  if (typeof window === "undefined") return false

  // Anything 1024px+ wide gets the desktop layout
  if (window.innerWidth >= 1024) return false

  // Must be a touch device — rules out desktop browsers at any window size
  const isTouch =
    (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) ||
    window.matchMedia("(pointer: coarse)").matches

  if (!isTouch) return false

  // Touch device with viewport shorter side >= 560px is a foldable or tablet.
  // Regular phones max out at ~430px. All unfolded foldables are 650px+.
  const shorter = Math.min(window.innerWidth, window.innerHeight)
  return shorter >= 560
}
