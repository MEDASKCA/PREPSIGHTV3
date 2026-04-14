"use client"

import { useState, type ReactNode } from "react"
import AppTopBar from "@/components/AppTopBar"
import WorkspaceNavRail, { type WorkspaceNavKey } from "@/components/WorkspaceNavRail"

export default function WorkspaceDesktopShell({
  currentNav,
  children,
  rightRail,
}: {
  currentNav: WorkspaceNavKey
  children: ReactNode
  rightRail?: ReactNode
}) {
  const [desktopNavOpen, setDesktopNavOpen] = useState(true)

  return (
    <div className="hidden min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#E5F5F8_0%,#F3F9FB_42%,#F4F7FA_100%)] lg:block">
      <AppTopBar
        menuOpen={desktopNavOpen}
        onToggleMenu={() => setDesktopNavOpen((value) => !value)}
        searchPlaceholder="Search anywhere..."
      />

      <main className="w-full px-4 pt-4 pb-4 lg:pl-0 lg:pr-4">
        <div className={`grid gap-4 ${desktopNavOpen ? "grid-cols-[210px_minmax(0,1fr)_300px]" : rightRail ? "grid-cols-[minmax(0,1fr)_300px]" : "grid-cols-[minmax(0,1fr)]"}`}>
          {desktopNavOpen ? <WorkspaceNavRail currentNav={currentNav} /> : null}

          <div className="min-w-0">{children}</div>

          {rightRail ? <aside className="min-w-0">{rightRail}</aside> : null}
        </div>
      </main>
    </div>
  )
}
