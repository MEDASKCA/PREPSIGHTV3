"use client"

import { useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react"
import AppTopBar from "@/components/AppTopBar"
import V5CommsDesktopRail from "@/components/V5CommsDesktopRail"
import WorkspaceNavRail, { type WorkspaceNavKey } from "@/components/WorkspaceNavRail"
import { getDesktopCommsPreference, getDesktopCommsWidth, getDesktopCommsWidthBounds, setDesktopCommsWidth, subscribeDesktopCommsPreference } from "@/lib/desktop-comms"

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

  const gridStyle: CSSProperties | undefined = effectiveRightRail
    ? desktopNavOpen
      ? { gridTemplateColumns: `210px minmax(0,1fr) ${commsRailWidth}px` }
      : { gridTemplateColumns: `80px minmax(0,1fr) ${commsRailWidth}px` }
    : undefined

  return (
    <div className="hidden min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#E5F5F8_0%,#F3F9FB_42%,#F4F7FA_100%)] lg:block">
      <AppTopBar
        menuOpen={desktopNavOpen}
        onToggleMenu={() => setDesktopNavOpen((value) => !value)}
        searchPlaceholder="Search anywhere..."
      />

      <main className="w-full px-4 pt-0 pb-4 lg:px-0 lg:pb-0">
        <div
          style={gridStyle}
          className={`grid gap-y-4 gap-x-0 ${desktopNavOpen ? "grid-cols-[210px_minmax(0,1fr)]" : "grid-cols-[80px_minmax(0,1fr)]"}`}
        >
          <WorkspaceNavRail currentNav={currentNav} collapsed={!desktopNavOpen} onToggleCollapsed={() => setDesktopNavOpen((value) => !value)} />

          <div className="min-w-0">{children}</div>

          {effectiveRightRail ? (
            <aside className="relative min-w-0">
              {commsRailOpen ? (
                <button
                  type="button"
                  onMouseDown={(event) => {
                    ;(window as Window & { __prepsightStartCommsResize?: (nextEvent: MouseEvent) => void }).__prepsightStartCommsResize?.(event.nativeEvent)
                  }}
                  className="group absolute left-0 top-0 z-20 hidden h-full w-5 -translate-x-1/2 cursor-col-resize lg:block"
                  aria-label="Resize PrepSight Comms panel"
                  title={`Resize Comms panel (${minCommsWidth}-${maxCommsWidth}px)`}
                >
                  <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#b8ddea] transition-colors group-hover:bg-[#7fcce3]" />
                  <span className="absolute left-1/2 top-1/2 h-24 w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#dff5fb] shadow-[0_8px_24px_rgba(15,76,92,0.14)] ring-1 ring-[#a8d9e8] transition-all group-hover:h-28 group-hover:bg-[#c8edf7] group-hover:ring-[#7fcce3]" />
                </button>
              ) : null}
              {effectiveRightRail}
            </aside>
          ) : null}
        </div>
      </main>
    </div>
  )
}
