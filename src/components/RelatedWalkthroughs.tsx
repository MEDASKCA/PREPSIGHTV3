"use client"

import { useState } from "react"
import { PlayCircle, Clock3 } from "lucide-react"
import TriangleIcon from "@/components/TriangleIcon"

import type { MockWalkthrough } from "@/lib/video-mocks"

interface Props {
  videos: MockWalkthrough[]
  defaultOpen?: boolean
}

const STATUS_STYLES: Record<MockWalkthrough["status"], string> = {
  "PrepSight editorial": "border border-[#1E6B82] bg-[#0E2A36] text-[#B9EAF4]",
  Contributor: "border border-[#1B8E71] bg-[#0E2F2A] text-[#C6F5E6]",
  Community: "border border-[#8B6B2B] bg-[#2C2618] text-[#FFE2A3]",
}

export default function RelatedWalkthroughs({ videos, defaultOpen = false }: Props) {
  if (videos.length === 0) return null
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section id="related-walkthroughs" className="kardex-section mb-1 scroll-mt-24">
      <div className="kardex-section-header flex items-center border-b border-[#BFEAF5] bg-[#00B4D8] transition-colors">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex flex-1 items-center gap-3 px-4 py-3.5 text-left text-base font-semibold text-[#10243E] transition-colors hover:bg-[#33C4E2] lg:px-7 lg:py-5 lg:text-[24px]"
        >
          <span className="flex-1">Related walkthroughs</span>
          <span className="rounded-full border border-[#8CCFDF] bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-[#10243E] lg:text-[13px]">
            {videos.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="px-4 py-3.5 text-[#10243E] transition-colors hover:bg-[#33C4E2] lg:px-6"
          aria-label={open ? "Collapse walkthroughs" : "Expand walkthroughs"}
        >
          {open ? <TriangleIcon direction="up" size={12} /> : <TriangleIcon direction="down" size={12} />}
        </button>
      </div>

      {open && (
        <div className="kardex-section-body border-b border-[#D5EAF1] bg-white px-4 py-3 lg:px-7 lg:py-4">
          <p className="max-w-2xl text-[13px] leading-6 text-[#61758B] lg:text-[14px]">
            Mocked for local exploration. Videos are shown here as supporting context, not as the
            primary reference layer.
          </p>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {videos.map((video) => (
              <article
                key={video.id}
                className="rounded-[20px] border border-[#D5EAF1] bg-[#F8FBFD] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#183B56] text-white">
                    <PlayCircle size={22} />
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[video.status]}`}>
                    {video.status}
                  </span>
                </div>

                <h3 className="mt-4 text-[15px] font-semibold leading-6 text-[#183B56]">
                  {video.title}
                </h3>

                <p className="mt-1 text-[12px] font-medium uppercase tracking-[0.12em] text-[#6C8196]">
                  {video.reason}
                </p>

                <div className="mt-4 flex items-center justify-between gap-3 text-[13px] text-[#5F7487]">
                  <span>{video.creator}</span>
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <Clock3 size={14} />
                    {video.duration}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
