import type { CSSProperties } from "react"

type TriangleDirection = "up" | "down" | "left" | "right"

const rotationMap: Record<TriangleDirection, string> = {
  down: "rotate(0deg)",
  up: "rotate(180deg)",
  right: "rotate(-90deg)",
  left: "rotate(90deg)",
}

export default function TriangleIcon({
  direction = "down",
  size = 12,
  className = "",
  style,
}: {
  direction?: TriangleDirection
  size?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      width={size}
      height={size}
      className={className}
      style={{ transform: rotationMap[direction], transformOrigin: "50% 50%", ...style }}
    >
      <path d="M6 9.5 1.75 3h8.5L6 9.5Z" fill="currentColor" />
    </svg>
  )
}
