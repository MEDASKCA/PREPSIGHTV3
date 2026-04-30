"use client"

export default function DesktopSectionWordmark({
  group,
  label,
}: {
  group?: string | null
  label: string
}) {
  return (
    <span className="app-display-font flex items-baseline gap-1.5 leading-none">
      {group ? (
        <>
          <span className="text-[18px] text-white/40">{group}</span>
          <span className="text-[15px] text-white/20">·</span>
        </>
      ) : null}
      <span className="text-[22px] text-[#67CFCF]">{label}</span>
    </span>
  )
}
