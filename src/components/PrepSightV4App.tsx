"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react"
import AppMenuContent from "@/components/AppMenuContent"
import AppTopBar from "@/components/AppTopBar"
import DesktopSectionWordmark from "@/components/DesktopSectionWordmark"
import {
  BookmarkList,
  EmbeddedLibrariesDashboardMobile,
  LibraryTree,
} from "@/components/LibrariesDashboard"
import LibraryPageClient from "@/components/LibraryPageClient"
import V5CommsDesktopRail from "@/components/V5CommsDesktopRail"
import WorkspaceNavRail from "@/components/WorkspaceNavRail"
import { getBookmarksSnapshot, subscribeBookmarks } from "@/lib/bookmarks"
import { getDesktopCommsPreference, getDesktopCommsWidth, getDesktopCommsWidthBounds, setDesktopCommsWidth, subscribeDesktopCommsPreference } from "@/lib/desktop-comms"
import { getLibrariesSnapshot, getLibraryCardsSnapshot, subscribeLibraries } from "@/lib/libraries"
import { getProfile, getRelevantSettings } from "@/lib/profile"
import { subscribeTeams } from "@/lib/team-workspaces"
import { LOGISTICS_SECTIONS, TAB_ITEMS, UPDATES } from "@/v4/data"
import type { LogisticsKey, TabKey, UpdateKey } from "@/v4/types"

function formatLibraryTypeLabel(library: { libraryType: "shared" | "local"; ownerName: string }) {
  return library.libraryType === "shared" ? "PrepSight library" : `${library.ownerName} library`
}

function formatLibraryOwnerLabel(library: {
  libraryType: "shared" | "local"
  ownerName: string
  ownerPublicAlias?: string
}) {
  return library.libraryType === "shared"
    ? library.ownerPublicAlias?.trim() || library.ownerName
    : library.ownerName
}

function ResourcesPanel({
  activeKey,
  onSelect,
}: {
  activeKey: LogisticsKey | null
  onSelect: (key: LogisticsKey) => void
}) {
  const activeSection = LOGISTICS_SECTIONS.find((section) => section.key === activeKey) ?? LOGISTICS_SECTIONS[0]

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className="rounded-[20px] border border-[#D6E7EE] bg-white p-4 shadow-[0_16px_34px_rgba(16,36,62,0.08)]">
        <p className="text-[14px] text-[#5B7A8A]">Resources</p>
        <h2 className="mt-1 text-[28px] tracking-[-0.04em] text-[#10243E]">Operational workspace</h2>
        <div className="mt-4 space-y-3">
          {LOGISTICS_SECTIONS.map((section) => {
            const selected = section.key === activeSection.key
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => onSelect(section.key)}
                className={`w-full rounded-[18px] border px-4 py-4 text-left transition-colors ${
                  selected
                    ? "border-[#8BCBE5] bg-[#F2FBFE]"
                    : "border-[#E3EDF2] bg-[#FBFDFF] hover:bg-[#F5FAFC]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[17px] font-medium tracking-[-0.02em] text-[#10243E]">{section.title}</p>
                    <p className="mt-1 text-[14px] text-[#61758B]">{section.detail}</p>
                  </div>
                  {selected ? (
                    <span className="rounded-full bg-[#0096C7] px-2.5 py-1 text-[11px] font-medium text-white">
                      Open
                    </span>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-[20px] border border-[#D6E7EE] bg-white p-4 shadow-[0_16px_34px_rgba(16,36,62,0.08)]">
        <div
          className="rounded-[18px] px-4 py-4"
          style={{ background: `linear-gradient(180deg, ${activeSection.tone} 0%, #F7FCFE 100%)` }}
        >
          <p className="text-[13px] uppercase tracking-[0.16em] text-[#4F6980]">Current focus</p>
          <h3 className="mt-2 text-[24px] tracking-[-0.04em] text-[#10243E]">{activeSection.title}</h3>
          <p className="mt-2 text-[15px] leading-6 text-[#35516A]">{activeSection.detail}</p>
        </div>

        <div className="mt-4 space-y-3">
          {activeSection.rows.map((row) => (
            <div
              key={row.title}
              className="rounded-[18px] border border-[#E3EDF2] bg-[#FBFDFF] px-4 py-4"
            >
              <p className="text-[16px] font-medium text-[#10243E]">{row.title}</p>
              <p className="mt-1 text-[14px] leading-6 text-[#61758B]">{row.meta}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function UpdatesPanel({
  activeKey,
  onSelect,
}: {
  activeKey: UpdateKey | null
  onSelect: (key: UpdateKey) => void
}) {
  const activeUpdate = UPDATES.find((update) => update.key === activeKey) ?? UPDATES[0]

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className="rounded-[20px] border border-[#D6E7EE] bg-white p-4 shadow-[0_16px_34px_rgba(16,36,62,0.08)]">
        <p className="text-[14px] text-[#5B7A8A]">Updates</p>
        <h2 className="mt-1 text-[28px] tracking-[-0.04em] text-[#10243E]">Latest changes</h2>
        <div className="mt-4 space-y-3">
          {UPDATES.map((update) => {
            const selected = update.key === activeUpdate.key
            return (
              <button
                key={update.key}
                type="button"
                onClick={() => onSelect(update.key)}
                className={`w-full rounded-[18px] border px-4 py-4 text-left transition-colors ${
                  selected
                    ? "border-[#8BCBE5] bg-[#F2FBFE]"
                    : "border-[#E3EDF2] bg-[#FBFDFF] hover:bg-[#F5FAFC]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[17px] font-medium tracking-[-0.02em] text-[#10243E]">{update.title}</p>
                    <p className="mt-1 text-[14px] text-[#61758B]">{update.detail}</p>
                  </div>
                  <span className="text-[12px] text-[#7A90A4]">{update.time}</span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-[20px] border border-[#D6E7EE] bg-white p-4 shadow-[0_16px_34px_rgba(16,36,62,0.08)]">
        <p className="text-[13px] uppercase tracking-[0.16em] text-[#4F6980]">Selected update</p>
        <h3 className="mt-2 text-[24px] tracking-[-0.04em] text-[#10243E]">{activeUpdate.title}</h3>
        <p className="mt-2 text-[14px] text-[#61758B]">{activeUpdate.detail}</p>
        <div className="mt-4 rounded-[18px] border border-[#E3EDF2] bg-[#FBFDFF] px-4 py-4">
          <p className="text-[15px] leading-7 text-[#35516A]">{activeUpdate.body}</p>
        </div>
      </section>
    </div>
  )
}

function LibraryOverview({
  query,
  selectedLibraryId,
  onSelectLibrary,
  onBackToCollections,
}: {
  query: string
  selectedLibraryId: string | null
  onSelectLibrary: (libraryId: string) => void
  onBackToCollections: () => void
}) {
  const libraries = useSyncExternalStore(
    subscribeLibraries,
    getLibrariesSnapshot,
    getLibrariesSnapshot,
  )
  const bookmarks = useSyncExternalStore(
    subscribeBookmarks,
    getBookmarksSnapshot,
    getBookmarksSnapshot,
  )
  useSyncExternalStore(subscribeTeams, () => 0, () => 0)

  const profile = getProfile()
  const workspaceLabel = useMemo(() => {
    const settings = profile ? getRelevantSettings(profile) : []
    return settings[0] ?? "Operating Theatre"
  }, [profile])

  const [globalOpen, setGlobalOpen] = useState(true)
  const [localOpen, setLocalOpen] = useState(true)

  const { filteredLibraries, totalCards } = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const orderedLibraries = [...libraries].sort((left, right) => {
      if (left.libraryType !== right.libraryType) {
        return left.libraryType === "shared" ? -1 : 1
      }

      return left.name.localeCompare(right.name)
    })

    const filtered = normalizedQuery
      ? orderedLibraries.filter((library) =>
          `${library.name} ${formatLibraryOwnerLabel(library)} ${library.description ?? ""}`
            .toLowerCase()
            .includes(normalizedQuery),
        )
      : orderedLibraries

    return {
      filteredLibraries: filtered,
      totalCards: libraries.reduce((sum, library) => sum + getLibraryCardsSnapshot(library.id).length, 0),
    }
  }, [libraries, query])

  const filteredGlobalLibraries = filteredLibraries.filter(
    (library) => library.libraryType === "shared" && library.name === workspaceLabel,
  )
  const filteredLocalLibraries = filteredLibraries.filter((library) => library.libraryType === "local")
  const localCollectionsTitle = filteredLocalLibraries.length === 1 ? "My Group" : "My Groups"

  if (selectedLibraryId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToCollections}
            className="rounded-[12px] border border-[#A9DBEA] bg-white px-3 py-2 text-[14px] text-[#0F4C5C]"
          >
            Back to collections
          </button>
          <p className="text-[14px] text-[#61758B]">Library detail</p>
        </div>
        <LibraryPageClient libraryId={selectedLibraryId} embedded />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[20px] border border-[#D6E7EE] bg-white p-4 shadow-[0_16px_34px_rgba(16,36,62,0.08)]">
        <p className="text-[14px] text-[#5B7A8A]">Workspace</p>
        <h1 className="mt-1 text-[32px] tracking-[-0.04em] text-[#10243E]">{workspaceLabel}</h1>
        <p className="mt-2 text-[15px] text-[#61758B]">
          {libraries.length} collections · {totalCards} procedure cards
        </p>
      </section>

      <section className="rounded-[20px] border border-[#D6E7EE] bg-white p-4 shadow-[0_16px_34px_rgba(16,36,62,0.08)]">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-[24px] font-medium tracking-[-0.03em] text-[#10243E]">Collections</h2>
          <Link href="/" className="text-[14px] text-[#0F4C5C]">
            Request access
          </Link>
        </div>

        <LibraryTree
          title="Community"
          tone="global"
          open={globalOpen}
          onToggle={() => setGlobalOpen((value) => !value)}
          description="Shared collections for this workspace."
          libraries={filteredGlobalLibraries.slice(0, 8)}
          emptyMessage={`No shared collections are available yet for ${workspaceLabel}.`}
          onLibrarySelect={onSelectLibrary}
        />

        <div className="mt-4">
          <LibraryTree
            title={localCollectionsTitle}
            tone="local"
            open={localOpen}
            onToggle={() => setLocalOpen((value) => !value)}
            description="Collections specific to your organisation or access scope."
            libraries={filteredLocalLibraries.slice(0, 8)}
            emptyMessage="No My Group collections are available yet."
            onLibrarySelect={onSelectLibrary}
          />
        </div>
      </section>

      <section className="rounded-[20px] border border-[#D6E7EE] bg-white p-4 shadow-[0_16px_34px_rgba(16,36,62,0.08)]">
        <BookmarkList bookmarks={bookmarks} />
      </section>
    </div>
  )
}

export default function PrepSightV4App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [desktopNavOpen, setDesktopNavOpen] = useState(true)
  const [searchValue, setSearchValue] = useState("")
  const [activeTab, setActiveTab] = useState<TabKey>("library")
  const [activeResourceKey, setActiveResourceKey] = useState<LogisticsKey | null>(LOGISTICS_SECTIONS[0]?.key ?? null)
  const [activeUpdateKey, setActiveUpdateKey] = useState<UpdateKey | null>(UPDATES[0]?.key ?? null)
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null)
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

  const desktopGridStyle: CSSProperties | undefined = commsRailOpen
    ? { gridTemplateColumns: `${desktopNavOpen ? 210 : 80}px minmax(0,1fr) ${commsRailWidth}px` }
    : undefined

  function openTab(tab: TabKey) {
    setActiveTab(tab)
    setSelectedLibraryId(null)
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#E5F5F8_0%,#F3F9FB_42%,#F4F7FA_100%)]">
      <AppTopBar
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((value) => !value)}
        menuContent={<AppMenuContent />}
        mobileMenuOnly
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search anywhere..."
      />

      <div className="lg:hidden">
        <main className="px-4 py-4 pb-28">
          {activeTab === "library" ? (
            selectedLibraryId ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setSelectedLibraryId(null)}
                  className="rounded-[12px] border border-[#A9DBEA] bg-white px-3 py-2 text-[14px] text-[#0F4C5C]"
                >
                  Back to collections
                </button>
                <LibraryPageClient libraryId={selectedLibraryId} embedded />
              </div>
            ) : (
              <EmbeddedLibrariesDashboardMobile query={searchValue} onSelectLibrary={setSelectedLibraryId} />
            )
          ) : activeTab === "logistics" ? (
            <ResourcesPanel activeKey={activeResourceKey} onSelect={setActiveResourceKey} />
          ) : (
            <UpdatesPanel activeKey={activeUpdateKey} onSelect={setActiveUpdateKey} />
          )}
        </main>

        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-[460px]">
          <div className="border-t border-[#005F8F] bg-[#0077B6] px-3 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] shadow-[0_-10px_36px_rgba(4,10,20,0.22)]">
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${TAB_ITEMS.length}, minmax(0, 1fr))` }}
            >
              {TAB_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = item.key === activeTab

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => openTab(item.key)}
                    className={`flex flex-col items-center justify-center rounded-[16px] px-2 py-2.5 transition-all ${
                      isActive ? "bg-white/16 text-white" : "text-white/55 hover:text-white/80"
                    }`}
                  >
                    <div className="relative flex h-7 w-7 items-center justify-center">
                      <Icon size={23} strokeWidth={isActive ? 2.2 : 1.7} />
                    </div>
                    <span className={`mt-1 text-[11px] font-medium tracking-wide ${isActive ? "text-white" : "text-white/55"}`}>
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <main
        style={desktopGridStyle}
        className={`hidden lg:grid ${desktopNavOpen ? "lg:grid-cols-[210px_minmax(0,1fr)]" : "lg:grid-cols-[80px_minmax(0,1fr)]"}`}
      >
        <WorkspaceNavRail currentNav="collections" collapsed={!desktopNavOpen} onToggleCollapsed={() => setDesktopNavOpen((value) => !value)} />

        <section className="min-w-0 px-6 py-5">
          <div className="mb-4">
            <DesktopSectionWordmark label="Library Collections" />
          </div>

          {activeTab === "library" ? (
            <LibraryOverview
              query={searchValue}
              selectedLibraryId={selectedLibraryId}
              onSelectLibrary={setSelectedLibraryId}
              onBackToCollections={() => setSelectedLibraryId(null)}
            />
          ) : activeTab === "logistics" ? (
            <ResourcesPanel activeKey={activeResourceKey} onSelect={setActiveResourceKey} />
          ) : (
            <UpdatesPanel activeKey={activeUpdateKey} onSelect={setActiveUpdateKey} />
          )}
        </section>

        {commsRailOpen ? (
          <aside className="relative min-w-0">
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
            <V5CommsDesktopRail />
          </aside>
        ) : null}
      </main>
    </div>
  )
}
