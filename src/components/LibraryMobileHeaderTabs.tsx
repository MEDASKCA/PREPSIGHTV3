"use client"

import { useRouter } from "next/navigation"
import TriangleIcon from "@/components/TriangleIcon"
import { getDefaultLocalLibraryId, getSharedLibraryId } from "@/lib/libraries"
import { CLINICAL_SETTINGS } from "@/lib/settings"
import type { ClinicalSetting } from "@/lib/types"

export default function LibraryMobileHeaderTabs({
  currentTab,
  selectedWorkspace,
  onWorkspaceChange,
  localCollectionsTitle = "My Group",
}: {
  currentTab: "community" | "group" | "bookmarks"
  selectedWorkspace: ClinicalSetting
  onWorkspaceChange?: (setting: ClinicalSetting) => void
  localCollectionsTitle?: string
}) {
  const router = useRouter()

  function openTab(tab: "community" | "group" | "bookmarks") {
    if (tab === "bookmarks") {
      router.push("/bookmarks")
      return
    }

    if (tab === "group") {
      const localLibraryId = getDefaultLocalLibraryId()
      if (localLibraryId) {
        router.push(`/libraries/${localLibraryId}`)
        return
      }
      router.push("/library")
      return
    }

    router.push(`/libraries/${getSharedLibraryId(selectedWorkspace)}`)
  }

  return (
    <section className="pt-2">
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-white">Collections</span>
        <div className="relative min-w-0 flex-1">
          <select
            value={selectedWorkspace}
            onChange={(event) => onWorkspaceChange?.(event.target.value as ClinicalSetting)}
            className="w-full appearance-none rounded-[12px] border border-[#2d2d2d] bg-[#111111] px-3 py-2 pr-9 text-[13px] text-white outline-none"
          >
            {CLINICAL_SETTINGS.map((setting) => (
              <option key={setting} value={setting}>
                {setting}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#0096C7]">
            <TriangleIcon direction="down" size={12} />
          </span>
        </div>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {([
          { key: "community", label: "Community" },
          { key: "group", label: localCollectionsTitle },
          { key: "bookmarks", label: "Bookmarks" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => openTab(tab.key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors ${
              currentTab === tab.key
                ? "bg-[#0096C7] text-white"
                : "text-white hover:text-[#e0e0e0]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </section>
  )
}
