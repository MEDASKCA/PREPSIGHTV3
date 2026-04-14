"use client"

import { useState, type ReactNode } from "react"
import AppMenuContent from "@/components/AppMenuContent"
import AppTopBar from "@/components/AppTopBar"
import WorkspaceNavRail, { type WorkspaceNavKey } from "@/components/WorkspaceNavRail"

export default function LibraryAppShell({
  currentNav = "collections",
  searchValue,
  onSearchChange,
  searchPlaceholder,
  children,
  rightRail,
}: {
  currentNav?: WorkspaceNavKey
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder: string
  children: ReactNode
  rightRail?: ReactNode
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [desktopNavOpen, setDesktopNavOpen] = useState(true)

  function handleToggleNavigation() {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      setDesktopNavOpen((value) => !value)
      return
    }
    setMobileMenuOpen((value) => !value)
  }

  return (
    <div className="app-shell-bg min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#E5F5F8_0%,#F4FAFC_40%,#F4F7FA_100%)]">
      <AppTopBar
        menuOpen={mobileMenuOpen}
        onToggleMenu={handleToggleNavigation}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        mobileMenuOnly
        menuContent={<AppMenuContent />}
      />

      <main className="w-full px-4 pt-0 pb-4 lg:pl-0 lg:pr-4 lg:pt-4 lg:pb-4">
        <div
          className={`lg:grid lg:gap-4 ${
            desktopNavOpen
              ? rightRail
                ? "lg:grid-cols-[210px_minmax(0,1fr)_300px]"
                : "lg:grid-cols-[210px_minmax(0,1fr)]"
              : rightRail
                ? "lg:grid-cols-[minmax(0,1fr)_300px]"
                : "lg:grid-cols-[minmax(0,1fr)]"
          }`}
        >
          {desktopNavOpen ? <WorkspaceNavRail currentNav={currentNav} /> : null}
          <div className="min-w-0">{children}</div>
          {rightRail ? <aside className="min-w-0">{rightRail}</aside> : null}
        </div>
      </main>
    </div>
  )
}
