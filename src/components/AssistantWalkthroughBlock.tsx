"use client"

import { Clock3, PlayCircle } from "lucide-react"

import type { MockWalkthrough } from "@/lib/video-mocks"

interface Props {
  title: string
  items: MockWalkthrough[]
}

const STATUS_STYLES: Record<MockWalkthrough["status"], string> = {
  "PrepSight editorial": "bg-[#D9ECFF] text-[#19507A]",
  Contributor: "bg-[#E7F7EE] text-[#216746]",
  Community: "bg-[#FFF3D6] text-[#8A5A00]",
}

export default function AssistantWalkthroughBlock({ title, items }: Props) {
  if (items.length === 0) return null

  return (
    <section className="mt-3 overflow-hidden rounded-[22px] border border-[#D5E3EF] bg-[#F8FBFF]">
      <div className="border-b border-[#D5E3EF] bg-white px-4 py-3">
        <p className="text-sm font-semibold text-[#10243E]">{title}</p>
      </div>

      <div className="grid gap-3 p-3">
        {items.slice(0, 3).map((item) => (
          <article
            key={item.id}
            className="rounded-[18px] border border-[#D5E3EF] bg-white p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#183B56] text-white">
                  <PlayCircle size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold leading-5 text-[#10243E]">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#6C8196]">
                    {item.reason}
                  </p>
                </div>
              </div>

              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${STATUS_STYLES[item.status]}`}>
                {item.status}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#5F7487]">
              <span>{item.creator}</span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <Clock3 size={13} />
                {item.duration}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
