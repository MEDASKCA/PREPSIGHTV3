"use client"

import { useState } from "react"
import MobileResourcesSurface from "@/components/MobileWorkforceSurface"
import MobileWorkspaceChildShell from "@/components/MobileWorkspaceChildShell"
import type { TabKey } from "@/v4/types"

export default function MobileResourcesPage() {
  const [searchValue, setSearchValue] = useState("")

  return (
      <MobileWorkspaceChildShell
        parentTitle="Resources"
        activeSurface={"logistics" as TabKey}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search Resources"
        flushChildren
    >
      <MobileResourcesSurface embedded />
    </MobileWorkspaceChildShell>
  )
}
