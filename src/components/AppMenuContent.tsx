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
          className="flex items-center gap-2.5 rounded-[10px] px-1.5 py-2.5 text-left text-[15px] font-medium text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.14)] hover:bg-white/14"
        >
          <img
            src={item.iconSrc}
            alt=""
            aria-hidden="true"
            className="h-[22px] w-[22px] shrink-0 object-contain brightness-[1.7] contrast-[1.15]"
          />
          {item.label}
        </Link>
      ))}
    </div>
  )
}
