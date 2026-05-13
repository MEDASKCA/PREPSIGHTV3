"use client"

import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"

export default function MobileSurfaceHeader({
  title,
  hospital,
  department,
  rightControls,
  children,
  compact = false,
  onBack,
}: {
  title: string
  hospital: string
  department: string
  rightControls?: ReactNode
  children?: ReactNode
  compact?: boolean
  onBack?: () => void
}) {
  const hospitalDisplay = hospital.replace("NHS Foundation Trust", "NHSFT")

  return (
    <div
      className={`w-full overflow-hidden shrink-0 bg-black px-5 ${compact ? "pb-2" : "pb-3"}`}
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 6px)" }}
    >
      <div className="flex items-start gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="mt-2.5 shrink-0 text-[#0096C7]"
          >
            <ArrowLeft size={22} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-[24px] tracking-tight leading-none">
              <img src="/PrepSight%20logo.png" alt="" aria-hidden="true" className="h-[54px] w-auto shrink-0" />
              <span>
                <span className="app-display-font text-[0.86em] tracking-[-0.05em] text-[#0096C7]">PrepSight</span>{" "}
                <em
                  className="text-[0.84em] tracking-[-0.05em] text-[#67CFCF]"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontWeight: 500 }}
                >
                  {title}
                </em>
              </span>
            </span>
            {rightControls && (
              <div className="shrink-0 flex items-center gap-2">{rightControls}</div>
            )}
          </div>

          <div className="mt-0.5 text-[12px] text-white leading-[1.35]">
            {hospitalDisplay}{" "}
            <span className="text-[#5f5f5f]">|</span>{" "}
            {department}
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}
