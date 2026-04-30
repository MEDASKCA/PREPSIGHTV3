"use client"

import { useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react"
import AppTopBar from "@/components/AppTopBar"
import WorkspaceNavRail, { type WorkspaceNavKey } from "@/components/WorkspaceNavRail"
import { getDesktopCommsPreference, getDesktopCommsWidth, getDesktopCommsWidthBounds, setDesktopCommsWidth, subscribeDesktopCommsPreference } from "@/lib/desktop-comms"
import { getNavBreadcrumb } from "@/lib/workspace-nav"

export default function WorkspaceDesktopShell({
  currentNav,
  sectionLabel,
  children,
  rightRail,
}: {
  currentNav: WorkspaceNavKey
  sectionLabel?: string
  children: ReactNode
  rightRail?: ReactNode
}) {
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
  const { min: minCommsWidth, max: maxCommsWidth } = getDesktopCommsWidthBounds()
  const navBreadcrumb = getNavBreadcrumb(currentNav)
  const showRightAside = commsRailOpen || Boolean(rightRail)

  useEffect(() => {
    if (!commsRailOpen) return

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
  }, [commsRailOpen])

  const navGridStyle: CSSProperties = desktopNavOpen
    ? { gridTemplateColumns: "240px minmax(0,1fr)" }
    : { gridTemplateColumns: "80px minmax(0,1fr)" }

  return (
    <div
      className="hidden min-h-screen overflow-x-hidden bg-black lg:grid lg:min-h-screen"
      style={navGridStyle}
    >
      <WorkspaceNavRail
        currentNav={currentNav}
        collapsed={!desktopNavOpen}
        onToggleCollapsed={() => setDesktopNavOpen((v) => !v)}
      />

      <div className="flex min-w-0 flex-col">
        <div className="flex min-h-0 flex-1">
          {/* Sub-column: AppTopBar + main content — sized to exclude the comms aside */}
          <div className="flex min-w-0 flex-1 flex-col">
            <AppTopBar
              menuOpen={desktopNavOpen}
              onToggleMenu={() => setDesktopNavOpen((v) => !v)}
              searchPlaceholder="Search anywhere..."
              sectionLabel={sectionLabel}
              navBreadcrumb={navBreadcrumb}
            />
            <main className="min-w-0 flex-1 px-6 py-5">
              {children}
            </main>
          </div>

          {showRightAside ? (
            <aside
              className="relative flex-shrink-0 border-l-[3px] border-[#2d2d2d]"
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
              {!commsRailOpen ? rightRail : null}
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  )
}
