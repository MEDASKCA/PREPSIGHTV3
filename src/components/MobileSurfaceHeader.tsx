"use client"

import type { ReactNode } from "react"

export default function MobileSurfaceHeader({
  title,
  hospital,
  department,
  rightControls,
  children,
  compact = false,
}: {
  title: string
  hospital: string
  department: string
  rightControls?: ReactNode
  children?: ReactNode
  compact?: boolean
}) {
  return (
    <div className={`shrink-0 bg-black px-5 ${compact ? "pb-2" : "pb-3"}`} style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}>
      <div className="mb-0 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[28px] tracking-tight">
          <img src="/PrepSight%20logo.png" alt="" aria-hidden="true" className="h-[54px] w-auto" />
          <span>
            <span className="app-display-font text-[0.86em] tracking-[-0.05em] text-[#0096C7]">PrepSight</span>{" "}
            <em
              className="text-[0.84em] leading-none tracking-[-0.05em] text-[#67CFCF]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontWeight: 500 }}
            >
              {title}
            </em>
          </span>
        </span>
        {rightControls ? <div className="flex items-center gap-2">{rightControls}</div> : null}
      </div>
      <div className={`${compact ? "mt-[-2px]" : "mt-0.5"} ml-1 flex items-center gap-2 overflow-hidden text-[14px] text-white`}>
        <span className="min-w-0 flex-[1.35] truncate whitespace-nowrap">{hospital}</span>
        <span className="shrink-0 text-[#5f5f5f]">|</span>
        <span className="min-w-0 flex-1 truncate whitespace-nowrap">{department}</span>
      </div>
      {children}
    </div>
  )
}
