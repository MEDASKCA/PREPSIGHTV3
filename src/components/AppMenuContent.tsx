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
          className="flex items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 text-[14px] font-medium text-[#EAF6FF] hover:bg-white/10"
        >
          <img
            src={item.iconSrc}
            alt=""
            aria-hidden="true"
            className="h-[15px] w-[15px] shrink-0 object-contain"
          />
          {item.label}
        </Link>
      ))}
    </div>
  )
}
