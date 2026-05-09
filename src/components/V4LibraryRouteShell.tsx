"use client"

import type { ReactNode } from "react"
import RootEntry from "@/components/RootEntry"

export default function V4LibraryRouteShell({
  children,
}: {
  children: ReactNode
}) {
  return (
    <>
      <div className="lg:hidden">
        <RootEntry initialSurface="library" />
      </div>

      {/* Desktop: children handle their own layout */}
      <div className="hidden lg:block">{children}</div>
    </>
  )
}
