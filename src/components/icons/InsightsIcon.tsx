export default function InsightsIcon({
  size = 24,
  strokeWidth = 1.4,
  className = "",
}: {
  size?: number
  strokeWidth?: number
  className?: string
}) {
  const isActive = strokeWidth > 2

  const activeFilter =
    "brightness(0) saturate(100%) invert(46%) sepia(94%) saturate(439%) hue-rotate(156deg) brightness(97%)"
  const inactiveFilter = "brightness(0) saturate(0%) invert(53%)"

  const displaySize = Math.round(size * 1.25)

  return (
    <img
      src="/Insights.png"
      width={displaySize}
      height={displaySize}
      alt=""
      style={{ filter: isActive ? activeFilter : inactiveFilter, objectFit: "contain" }}
      className={className}
    />
  )
}
