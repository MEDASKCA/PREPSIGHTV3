"use client"

import Link from "next/link"
import { WORKSPACE_NAV_ITEMS, type WorkspaceNavKey } from "@/lib/workspace-nav"

export type { WorkspaceNavKey } from "@/lib/workspace-nav"

export default function WorkspaceNavRail({
  currentNav,
}: {
  currentNav: WorkspaceNavKey
}) {
  return (
    <aside className="-mt-4 hidden min-w-0 self-stretch border-r border-[#0085B2] bg-[#0096C7] px-3 pb-4 pt-7 lg:block lg:min-h-[calc(100vh-5.5rem)]">
      <div className="space-y-1">
        {WORKSPACE_NAV_ITEMS.map((item) => {
          const active = item.key === currentNav
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3.5 rounded-[8px] px-3 py-2.5 text-[15px] ${
                active
                  ? "bg-white/10 font-medium text-white"
                  : "text-[#D7E7F7] hover:bg-white/6"
              }`}
            >
              <img
                src={item.iconSrc}
                alt=""
                aria-hidden="true"
                className="h-[26px] w-[26px] shrink-0 object-contain"
              />
              {item.label}
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
