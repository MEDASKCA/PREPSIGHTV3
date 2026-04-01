"use client"

import { useState } from "react"
import { ASSISTANT_ICON_MAP, type AssistantLauncherItem } from "@/lib/assistant-launchers"

function withAlpha(hex: string, alpha: string): string {
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? `${hex}${alpha}` : hex
}

function shellStyle(color: string) {
  return {
    background: `linear-gradient(180deg, ${withAlpha(color, "FF")} 0%, ${withAlpha(color, "F0")} 42%, ${withAlpha(color, "D2")} 100%)`,
    boxShadow: `0 10px 18px ${withAlpha(color, "24")}, inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -12px 18px rgba(15,23,42,0.14)`,
  }
}

function glossStyle() {
  return {
    background: "linear-gradient(180deg, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.18) 48%, rgba(255,255,255,0) 100%)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
  }
}

export default function AssistantLauncherBlock({
  title,
  items,
  onPrompt,
}: {
  title: string
  items: AssistantLauncherItem[]
  onPrompt: (prompt: string) => void
}) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-[#D7E6F4] bg-white">
      <div className="border-b border-[#D7E6F4] bg-[#F8FBFF] px-3 py-2">
        <p className="text-xs font-semibold text-[#10243E]">{title}</p>
      </div>
      <div className="grid grid-cols-4 gap-x-2.5 gap-y-4 px-3 py-4">
        {items.map((item) => {
          const Icon = ASSISTANT_ICON_MAP[item.iconKey as keyof typeof ASSISTANT_ICON_MAP] ?? ASSISTANT_ICON_MAP.stethoscope
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onPrompt(item.label)}
              className="group flex select-none flex-col items-center text-center"
            >
              <div
                className="relative mb-1.5 flex h-14 w-14 items-center justify-center rounded-[20px] ring-1 ring-black/5 transition-transform duration-200 ease-out group-hover:-translate-y-0.5"
                style={shellStyle(item.color)}
              >
                <div className="pointer-events-none absolute inset-x-1.5 top-1.5 h-5 rounded-[14px]" style={glossStyle()} />
                {item.imageSrc && !failedImages.has(item.id) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageSrc}
                    alt=""
                    className="h-10 w-10 scale-[1.08] object-contain drop-shadow-[0_1px_2px_rgba(15,23,42,0.22)]"
                    onError={() => setFailedImages((prev) => new Set(prev).add(item.id))}
                  />
                ) : (
                  <Icon size={24} className="text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.28)]" />
                )}
              </div>
              <p className="line-clamp-2 text-[11px] font-semibold leading-4 text-[#475569]">{item.label}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
