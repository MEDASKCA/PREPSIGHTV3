"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { TAB_ITEMS } from "@/v4/data"

export default function V4LibraryRouteShell({
  children,
}: {
  children: ReactNode
}) {
  return (
    <>
      {/* Mobile: render children (they supply their own dark AppTopBar + content),
          then fix a 4-tab dock at the bottom */}
      <div className="lg:hidden">
        {children}

        <div className="fixed inset-x-0 bottom-0 z-30">
          <div className="bg-black border-t border-black px-3 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)]">
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${TAB_ITEMS.length}, minmax(0, 1fr))` }}
            >
              {TAB_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = item.key === "library"
                return (
                  <Link
                    key={item.key}
                    href="/"
                    className={`flex flex-col items-center justify-center rounded-[16px] px-2 py-2.5 transition-all ${
                      isActive
                        ? "bg-[rgba(0,150,199,0.12)] text-[#0096C7]"
                        : "text-[#888888] hover:text-[#e0e0e0]"
                    }`}
                  >
                    <div className="relative flex h-7 w-7 items-center justify-center">
                      <Icon size={23} strokeWidth={isActive ? 2.2 : 1.7} />
                    </div>
                    <span className={`mt-1 text-[11px] font-medium tracking-wide ${isActive ? "text-[#0096C7]" : "text-[#888888]"}`}>
                      {item.key === "updates" ? "Insights" : item.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: children handle their own layout */}
      <div className="hidden lg:block">{children}</div>
    </>
  )
}
