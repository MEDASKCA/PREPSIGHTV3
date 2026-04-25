"use client"

import Link from "next/link"
import { LibraryBig, Menu, Search, Settings2, Bell, BriefcaseMedical } from "lucide-react"
import type { ReactNode } from "react"

export default function V4LibraryRouteShell({
  children,
}: {
  children: ReactNode
}) {
  return (
    <>
      <div className="lg:hidden">
        <div className="fixed inset-x-0 top-0 z-20 mx-auto max-w-[460px] border-b border-[#0085B2] bg-[#0096C7] px-4 pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-2">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-white/12 text-white"
              aria-label="Open quick links"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-[18px] font-semibold leading-5 text-white">
                <span>PrepSight </span>
                <span className="font-serif italic font-medium text-white/88">Library</span>
              </span>
              <span className="truncate text-[12px] leading-5 text-white/78">The Royal London Hospital</span>
            </div>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-white/12 text-white"
              aria-label="Open quick links"
            >
              <Settings2 size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-screen bg-[#EEF5F8] px-4 pt-[calc(env(safe-area-inset-top,0px)+84px)] pb-[calc(env(safe-area-inset-bottom,0px)+156px)]">
          <div className="flex w-full items-center gap-3 rounded-[20px] border border-[#D7E9EE] bg-white px-4 py-3 text-left shadow-[0_10px_24px_rgba(16,36,62,0.06)]">
            <Search size={18} className="text-[#0F4C5C]" />
            <span className="text-[15px] text-[#0F4C5C]">Search library...</span>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {["Collections", "Review", "Calendar", "Catalogue", "Directory"].map((label, index) => (
              <button
                key={label}
                type="button"
                className={`shrink-0 rounded-full px-4 py-2 text-[13px] shadow-[0_6px_14px_rgba(16,36,62,0.05)] ${
                  index === 0 ? "border border-[#5CC7C4] bg-[#5CC7C4] text-white" : "border border-[#D7E9EE] bg-white text-[#0F4C5C]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4 [&_.prepsight-app-topbar]:hidden">
            {children}
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-[460px]">
          <div className="border-t border-[#D7E9EE] bg-[#0077B6] px-2 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] shadow-[0_-10px_36px_rgba(4,10,20,0.22)]">
            <div className="grid grid-cols-3 gap-1">
              {[
                { href: "/v4", label: "Library", icon: LibraryBig, active: true },
                { href: "/v4", label: "Logistics", icon: BriefcaseMedical },
                { href: "/v4", label: "Updates", icon: Bell },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex flex-col items-center justify-center rounded-[14px] px-2 py-3 text-[11px] ${
                      item.active ? "bg-white/12 text-white" : "text-[#D7E7F7]"
                    }`}
                  >
                    <Icon size={18} />
                    <span className="mt-1">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:block">{children}</div>
    </>
  )
}
