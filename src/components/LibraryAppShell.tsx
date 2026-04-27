"use client"

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react"
import AppMenuContent from "@/components/AppMenuContent"
import AppTopBar from "@/components/AppTopBar"
import V5CommsDesktopRail from "@/components/V5CommsDesktopRail"
import WorkspaceNavRail, { type WorkspaceNavKey } from "@/components/WorkspaceNavRail"
import { getDesktopCommsPreference, getDesktopCommsWidth, getDesktopCommsWidthBounds, setDesktopCommsWidth, subscribeDesktopCommsPreference } from "@/lib/desktop-comms"

export default function LibraryAppShell({
  currentNav = "collections",
  searchValue,
  onSearchChange,
  searchPlaceholder,
  sectionLabel,
  children,
  rightRail,
}: {
  currentNav?: WorkspaceNavKey
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder: string
  sectionLabel?: string
  children: ReactNode
  rightRail?: ReactNode
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [desktopNavOpen, setDesktopNavOpen] = useState(true)
  const commsRailOpen = useSyncExternalStore(
    subscribeDesktopCommsPreference,
    getDesktopCommsPreference,
    getDesktopCommsPreference,
  )
  const commsRailWidth = useSyncExternalStore(
    subscribeDesktopCommsPreference,
    getDesktopCommsWidth,
    getDesktopCommsWidth,
  )
  const effectiveRightRail = commsRailOpen ? <V5CommsDesktopRail /> : rightRail
  const { min: minCommsWidth, max: maxCommsWidth } = getDesktopCommsWidthBounds()

  useEffect(() => {
    if (!effectiveRightRail) return

    const handleMouseUp = () => {
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }

    const handleMouseMove = (event: MouseEvent) => {
      setDesktopCommsWidth(window.innerWidth - event.clientX)
    }

    const handleResizeStart = (event: MouseEvent) => {
      event.preventDefault()
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    }

    ;(window as Window & { __prepsightStartCommsResize?: (event: MouseEvent) => void }).__prepsightStartCommsResize = handleResizeStart

    return () => {
      handleMouseUp()
      delete (window as Window & { __prepsightStartCommsResize?: (event: MouseEvent) => void }).__prepsightStartCommsResize
    }
  }, [effectiveRightRail])

  const navCols = desktopNavOpen ? "lg:grid-cols-[240px_minmax(0,1fr)]" : "lg:grid-cols-[80px_minmax(0,1fr)]"

  return (
    <div className="min-h-screen overflow-x-hidden bg-black">
      {/* Mobile-only AppTopBar */}
      <div className="lg:hidden">
        <AppTopBar
          menuOpen={mobileMenuOpen}
          onToggleMenu={() => setMobileMenuOpen((v) => !v)}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          mobileMenuOnly
          menuContent={<AppMenuContent />}
        />
      </div>

      {/* Unified layout grid — block on mobile, grid on desktop */}
      <div className={`lg:grid lg:min-h-screen ${navCols}`}>
        <WorkspaceNavRail
          currentNav={currentNav}
          collapsed={!desktopNavOpen}
          onToggleCollapsed={() => setDesktopNavOpen((v) => !v)}
        />

        <div className="flex min-w-0 flex-col">
          {/* Desktop AppTopBar inside content column */}
          <div className="hidden lg:block">
            <AppTopBar
              menuOpen={desktopNavOpen}
              onToggleMenu={() => setDesktopNavOpen((v) => !v)}
              searchValue={searchValue}
              onSearchChange={onSearchChange}
              searchPlaceholder={searchPlaceholder}
              sectionLabel={sectionLabel}
            />
          </div>

          <div className="flex min-h-0 flex-1">
            <main className="min-w-0 flex-1 px-4 pb-4 lg:px-6 lg:py-5">
              {children}
            </main>

            {effectiveRightRail ? (
              <aside
                className="relative hidden flex-shrink-0 border-l border-black lg:block"
                style={{ width: commsRailWidth }}
              >
                {commsRailOpen ? (
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      ;(window as Window & { __prepsightStartCommsResize?: (nextEvent: MouseEvent) => void }).__prepsightStartCommsResize?.(event.nativeEvent)
                    }}
                    className="absolute left-0 top-0 z-20 h-full w-[4px] cursor-col-resize bg-[#333333]"
                    aria-label="Resize PrepSight Comms panel"
                    title={`Resize Comms panel (${minCommsWidth}-${maxCommsWidth}px)`}
                  />
                ) : null}
                {effectiveRightRail}
              </aside>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
