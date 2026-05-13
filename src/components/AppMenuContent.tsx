"use client"

import Link from "next/link"
import { WORKSPACE_NAV_ITEMS } from "@/lib/workspace-nav"

export default function AppMenuContent() {
  return (
    <div className="space-y-1.5">
      {WORKSPACE_NAV_ITEMS.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className="flex items-center gap-2.5 rounded-[10px] px-1.5 py-2.5 text-left text-[15px] font-medium text-white hover:bg-white/10 lg:text-[#10243E] lg:hover:bg-[rgba(244,251,255,0.72)]"
        >
          <img
            src={item.iconSrc}
            alt=""
            aria-hidden="true"
            className="h-[22px] w-[22px] shrink-0 object-contain brightness-0 invert lg:[filter:brightness(0)_saturate(100%)_invert(23%)_sepia(24%)_saturate(1180%)_hue-rotate(146deg)_brightness(93%)_contrast(91%)]"
          />
          {item.label}
        </Link>
      ))}
    </div>
  )
}