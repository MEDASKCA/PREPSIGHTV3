"use client"

import { ChevronRight, CircleCheckBig } from "lucide-react"

export default function AssistantCompactCard({
  title,
  meta,
  summary,
  checklist,
  href,
  onPrompt,
}: {
  title: string
  meta: string
  summary?: string
  checklist: string[]
  href?: string
  onPrompt: (prompt: string) => void
}) {
  return (
    <div className="mt-3 max-w-2xl rounded-[22px] border border-[#D8E3EE] bg-white p-4 shadow-[0_14px_34px_rgba(16,36,62,0.10)] lg:rounded-[24px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B7B8C]">
            PrepSight card
          </p>
          <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-[#10243E]">
            {title}
          </h2>
          <p className="mt-1 text-[13px] text-[#526579]">{meta}</p>
          {summary ? (
            <p className="mt-2 max-w-xl text-[13px] leading-6 text-[#334155]">
              {summary}
            </p>
          ) : null}
        </div>
        <div className="rounded-full bg-[#E7F7EE] px-3 py-1 text-[11px] font-semibold text-[#216746]">
          Compact
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {checklist.map((item) => (
          <div key={item} className="flex items-center gap-3 rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
            <CircleCheckBig size={15} className="shrink-0 text-[#7dd3fc]" />
            <span className="text-[14px] text-[#334155]">{item}</span>
          </div>
        ))}
      </div>

      {href ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onPrompt(title)}
            className="inline-flex items-center gap-2 rounded-full bg-[#10243E] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#183454]"
          >
            <ChevronRight size={14} />
            Open full card
          </button>
        </div>
      ) : null}
    </div>
  )
}
