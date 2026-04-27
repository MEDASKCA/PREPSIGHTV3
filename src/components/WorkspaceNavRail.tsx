"use client"

import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"
import {
  WORKSPACE_NAV_GROUPS,
  WORKSPACE_NAV_ITEMS,
  WORKSPACE_TOP_LEVEL_ITEMS,
  type WorkspaceNavGroupKey,
  type WorkspaceNavKey,
} from "@/lib/workspace-nav"

export type { WorkspaceNavKey } from "@/lib/workspace-nav"

export default function WorkspaceNavRail({
  currentNav,
  collapsed = false,
  onToggleCollapsed,
}: {
  currentNav: WorkspaceNavKey
  collapsed?: boolean
  onToggleCollapsed?: () => void
}) {
  const [openGroups, setOpenGroups] = useState<Record<WorkspaceNavGroupKey, boolean>>({
    library: true,
    resources: true,
    insights: false,
  })

  function toggleGroup(groupKey: WorkspaceNavGroupKey) {
    setOpenGroups(current => ({ ...current, [groupKey]: !current[groupKey] }))
  }

  return (
    <aside
      className={`hidden min-w-0 self-stretch border-r border-[#2d2d2d] bg-[#202020] pb-4 pt-4 lg:block lg:min-h-screen lg:overflow-y-auto ${
        collapsed ? "px-2" : "px-3"
      }`}
    >
      <div>
        <div className={`flex pb-4 ${collapsed ? "flex-col items-center gap-3" : "items-center justify-between gap-4 px-1"}`}>
          {collapsed ? (
            <Link href="/" className="flex items-center justify-center">
              <img src="/PrepSight%20logo.png" alt="PrepSight" className="h-[54px] w-auto" />
            </Link>
          ) : (
            <Link href="/" className="app-display-font flex items-center gap-1 text-[26px] tracking-[-0.05em] text-[#0096C7]">
              <img src="/PrepSight%20logo.png" alt="" aria-hidden="true" className="h-[54px] w-auto" />
              PrepSight
            </Link>
          )}
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="group flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition-all hover:bg-white/20 hover:text-white"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed
              ? <ChevronRight size={15} strokeWidth={2.2} />
              : <ChevronLeft  size={15} strokeWidth={2.2} />
            }
          </button>
        </div>

        {collapsed ? (
          <div className="space-y-1">
            {WORKSPACE_NAV_ITEMS.map((item) => {
              const active = item.key === currentNav
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex items-center justify-center rounded-[10px] px-2 py-2.5 ${
                    active ? "bg-white/10 font-medium text-white" : "text-[#D7E7F7] hover:bg-white/6"
                  }`}
                  title={item.label}
                >
                  <img
                    src={item.iconSrc}
                    alt=""
                    aria-hidden="true"
                    className="h-[26px] w-[26px] shrink-0 object-contain"
                  />
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2 px-2">
            {WORKSPACE_NAV_GROUPS.map((group) => {
              const isOpen = openGroups[group.key]
              return (
                <div key={group.key}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="flex min-w-0 items-center justify-between px-2 pb-1 text-left"
                    aria-expanded={isOpen}
                    aria-label={isOpen ? `Collapse ${group.label} section` : `Expand ${group.label} section`}
                  >
                    <p className={`text-[17px] text-white/84 ${isOpen ? "italic" : "font-medium"}`}>{group.label}</p>
                  </button>
                  {isOpen && group.items.length > 0 ? (
                    <div className="space-y-1 pl-3">
                      {group.items.map((item) => {
                        const active = item.key === currentNav
                        return (
                          <Link
                            key={item.key}
                            href={item.href}
                            className={`flex items-center gap-3 rounded-[8px] px-2 py-2 text-[15px] ${
                              active ? "bg-white/10 font-medium text-white" : "text-[#D7E7F7] hover:bg-white/6"
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
                  ) : null}
                </div>
              )
            })}

            {WORKSPACE_TOP_LEVEL_ITEMS.length > 0 ? (
              <div className="pt-2">
                <div className="mb-2 h-px bg-white/12" />
                {WORKSPACE_TOP_LEVEL_ITEMS.map((item) => {
                  const active = item.key === currentNav
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-[8px] px-2 py-2 text-[15px] ${
                        active ? "bg-white/10 font-medium text-white" : "text-[#D7E7F7] hover:bg-white/6"
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
            ) : null}
          </div>
        )}
      </div>
    </aside>
  )
}
