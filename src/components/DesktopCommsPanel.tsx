"use client"

import { useEffect, useSyncExternalStore } from "react"
import {
  getDesktopCommsPreference,
  getDesktopCommsWidth,
  getDesktopCommsWidthBounds,
  setDesktopCommsWidth,
  subscribeDesktopCommsPreference,
} from "@/lib/desktop-comms"

export function useDesktopCommsLayout() {
  const open = useSyncExternalStore(
    subscribeDesktopCommsPreference,
    getDesktopCommsPreference,
    getDesktopCommsPreference,
  )
  const width = useSyncExternalStore(
    subscribeDesktopCommsPreference,
    getDesktopCommsWidth,
    getDesktopCommsWidth,
  )
  return { open, width, ...getDesktopCommsWidthBounds() }
}

export default function DesktopCommsPanel() {
  const { open, min: minCommsWidth, max: maxCommsWidth } = useDesktopCommsLayout()

  useEffect(() => {
    if (!open) return

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

    ;(window as Window & { __prepsightStartCommsResize?: (event: MouseEvent) => void }).__prepsightStartCommsResize =
      handleResizeStart

    return () => {
      handleMouseUp()
      delete (window as Window & { __prepsightStartCommsResize?: (event: MouseEvent) => void }).__prepsightStartCommsResize
    }
  }, [open])

  if (!open) return null

  return (
    <aside className="relative min-w-0 lg:h-full lg:self-stretch lg:overflow-hidden">
      <button
        type="button"
        onMouseDown={(event) => {
          ;(window as Window & { __prepsightStartCommsResize?: (nextEvent: MouseEvent) => void }).__prepsightStartCommsResize?.(
            event.nativeEvent,
          )
        }}
        className="group absolute left-0 top-0 z-20 hidden h-full w-5 -translate-x-1/2 cursor-col-resize lg:block"
        aria-label="Resize PrepSight Comms panel"
        title={`Resize Comms panel (${minCommsWidth}-${maxCommsWidth}px)`}
      >
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#b8ddea] transition-colors group-hover:bg-[#7fcce3]" />
        <span className="absolute left-1/2 top-1/2 h-24 w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#dff5fb] shadow-[0_8px_24px_rgba(15,76,92,0.14)] ring-1 ring-[#a8d9e8] transition-all group-hover:h-28 group-hover:bg-[#c8edf7] group-hover:ring-[#7fcce3]" />
      </button>
    </aside>
  )
}
