"use client"

export default function DesktopSectionWordmark({
  group,
  label,
}: {
  group?: string | null
  label: string
}) {
  return (
    <span className="app-display-font flex min-w-0 items-baseline gap-1.5 leading-none">
      {group ? (
        <>
          <span
            className="shrink-0 text-[22px] text-[#67CFCF]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontWeight: 500 }}
          >
            {group}
          </span>
          <span className="text-[15px] text-[#67CFCF]/40">·</span>
        </>
      ) : null}
      <span
        className="truncate text-[22px] text-[#67CFCF]"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontWeight: 500 }}
      >
        {label}
      </span>
    </span>
  )
}
