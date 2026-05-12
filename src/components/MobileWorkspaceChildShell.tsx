"use client"

import Link from "next/link"
import { MoreVertical, Search, X } from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"
import AppMenuContent from "@/components/AppMenuContent"
import MobileGlobalSearchOverlay from "@/components/MobileGlobalSearchOverlay"
import MobileSurfaceHeader from "@/components/MobileSurfaceHeader"
import { getProfile, getRelevantSettings } from "@/lib/profile"
import { TAB_ITEMS } from "@/v4/data"
import type { TabKey } from "@/v4/types"

function CommsFilledIcon({ size = 23 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5.003L2.5 21.5l4.497-.838A9.954 9.954 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2Z" />
    </svg>
  )
}

function LibraryFilledIcon({ size = 23 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="2" y="3" width="6" height="18" rx="1.5" />
      <rect x="10" y="3" width="3.5" height="18" rx="1" />
      <path d="M16 4.8 21.2 6.5 17.8 18.2 12.6 16.5z" />
    </svg>
  )
}

function tabHref(tab: TabKey) {
  return (
    TAB_ITEMS.find((item) => item.key === tab)?.href ??
    (tab === "comms" ? "/comms" : tab === "updates" ? "/insights" : tab === "resources" ? "/resources" : "/library")
  )
}

export default function MobileWorkspaceChildShell({
  parentTitle,
  childTitle,
  activeSurface,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  flushChildren = false,
  children,
}: {
  parentTitle: string
  childTitle?: string
  activeSurface: TabKey
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  flushChildren?: boolean
  children: ReactNode
}) {
  const [mobileGlobalSearchOpen, setMobileGlobalSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const profile = getProfile()
  const settings = useMemo(() => (profile ? getRelevantSettings(profile) : []), [profile])
  const hospital = profile?.hospital?.trim() || "Royal Free Hospital"
  const department = settings[0] ?? "Operating Theatres"

  return (
    <div className="flex h-[100svh] min-h-0 flex-col overflow-hidden bg-black lg:hidden">
      <MobileSurfaceHeader
        title={parentTitle}
        hospital={hospital}
        department={department}
        rightControls={(
          <>
            <button
              type="button"
              onClick={() => setMobileGlobalSearchOpen(true)}
              aria-label="Open global search"
              className="text-white hover:text-white"
            >
              <Search size={20} />
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="Open menu"
              className="text-white hover:text-white"
            >
              <MoreVertical size={22} />
            </button>
          </>
        )}
      />

      {menuOpen ? (
        <div className="fixed inset-0 z-[60] bg-black/58 text-white backdrop-blur-sm">
          <div
            className="h-full w-[min(88vw,29rem)] overflow-y-auto rounded-r-[32px] rounded-tl-[24px] border-r border-t border-[#3a3a3d] bg-[linear-gradient(180deg,#262628_0%,#1d1d1f_100%)] px-4 shadow-[18px_0_44px_rgba(0,0,0,0.5)]"
            style={{
              paddingTop: "calc(env(safe-area-inset-top,0px) + 12px)",
              paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 108px)",
            }}
          >
            <div className="mb-2 flex items-start justify-end">
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#d8d8d8] transition-colors hover:bg-[#2e2e31] hover:text-white"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <div className="pb-2 text-[16px] text-white">Menu</div>
            <AppMenuContent />
          </div>
        </div>
      ) : null}

      <main className={`min-h-0 flex-1 overflow-hidden bg-black pb-28 ${flushChildren ? "px-0" : "px-4"}`}>
        <div className="flex h-full min-h-0 flex-col">
          {childTitle ? (
            <div className="shrink-0 pb-4 pt-1">
              <h1 className="text-[24px] text-white">{childTitle}</h1>
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </main>
      <MobileGlobalSearchOverlay
        open={mobileGlobalSearchOpen}
        onClose={() => setMobileGlobalSearchOpen(false)}
      />

      <div className="fixed inset-x-0 bottom-0 z-50">
        <div className="border-t border-black bg-black px-3 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-2">
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${TAB_ITEMS.length}, minmax(0, 1fr))` }}
          >
            {TAB_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = item.key === activeSurface

              return (
                <Link
                  key={item.key}
                  href={tabHref(item.key)}
                  className={`flex flex-col items-center justify-center rounded-[16px] px-2 py-2.5 transition-all ${
                    isActive ? "bg-[var(--mob-dock-active-bg)] text-[var(--mob-dock-active)]" : "text-[var(--mob-dock-inactive)]"
                  }`}
                >
                  <div className="relative flex h-7 w-7 items-center justify-center">
                    {item.key === "comms" ? (
                      <CommsFilledIcon size={23} />
                    ) : item.key === "library" ? (
                      <LibraryFilledIcon size={23} />
                    ) : (
                      <Icon size={23} strokeWidth={isActive ? 2.2 : 1.7} />
                    )}
                  </div>
                  <span className="mt-1 text-[11px] font-medium tracking-wide">
                    {item.key === "updates" ? "Insights" : item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
