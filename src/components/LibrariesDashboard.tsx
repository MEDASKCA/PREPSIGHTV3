"use client"

import Link from "next/link"
import { useMemo, useState, useSyncExternalStore } from "react"
import TriangleIcon from "@/components/TriangleIcon"
import AppMenuContent from "@/components/AppMenuContent"
import AppTopBar from "@/components/AppTopBar"
import WorkspaceNavRail from "@/components/WorkspaceNavRail"
import { deleteLocalLibrary, getLibrariesSnapshot, getLibraryCardsSnapshot, subscribeLibraries } from "@/lib/libraries"
import { getProfile, getRelevantSettings } from "@/lib/profile"
import { subscribeTeams } from "@/lib/team-workspaces"
import { getBookmarksSnapshot, subscribeBookmarks } from "@/lib/bookmarks"

function formatMeta(cardCount: number, typeLabel: string) {
  return `${cardCount} procedure${cardCount === 1 ? "" : "s"} · ${typeLabel}`
}

function getLibraryTypeLabel(library: { libraryType: "shared" | "local"; ownerName: string }) {
  return library.libraryType === "shared" ? "PrepSight library" : `${library.ownerName} library`
}

function getLibraryOwnerLabel(library: { libraryType: "shared" | "local"; ownerName: string; ownerPublicAlias?: string }) {
  return library.libraryType === "shared"
    ? library.ownerPublicAlias?.trim() || library.ownerName
    : library.ownerName
}

function FolderBadge({
  tone,
  open = false,
  size = "md",
}: {
  tone: "global" | "local" | "bookmark"
  open?: boolean
  size?: "md" | "lg"
}) {
  const palette =
    tone === "global"
      ? {
          body: open ? "#79CFE6" : "#67C4DE",
          tab: open ? "#A8E3F2" : "#93DAED",
          edge: "#4FAFCD",
          flap: "#D7F3FA",
        }
      : tone === "local"
        ? {
            body: open ? "#60C7C8" : "#4ABABB",
            tab: open ? "#9EE6E1" : "#87DDD8",
            edge: "#349FA0",
            flap: "#DDF8F4",
          }
        : {
            body: open ? "#F2C86B" : "#E8B94D",
            tab: open ? "#F7E1A3" : "#F2D47F",
            edge: "#D5A53B",
            flap: "#FBEDBF",
          }

  const width = size === "lg" ? 36 : 30
  const height = size === "lg" ? 26 : 22

  return (
    <span className="inline-flex shrink-0">
      <svg width={width} height={height} viewBox="0 0 36 26" aria-hidden="true">
        {open ? (
          <>
            <path d="M4 8h10l2-3h7c1.3 0 2.4.7 3 1.8l1 1.7H4.8A2.8 2.8 0 0 0 2 11.3v1.2L4 8Z" fill={palette.tab} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M3.2 11.2h29.4c1.1 0 1.8 1.1 1.4 2.1l-2.4 7.8A2.6 2.6 0 0 1 29 23H6a2.6 2.6 0 0 1-2.5-1.9L1.7 13A1.4 1.4 0 0 1 3.2 11.2Z" fill={palette.flap} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M5.2 9.6h11l2-2.8h6.7c1.1 0 2.1.5 2.8 1.4l1 1.4H5.2Z" fill={palette.body} opacity="0.95" />
          </>
        ) : (
          <>
            <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H14l2-2.5h6.8A2.5 2.5 0 0 1 25 5h6.5A2.5 2.5 0 0 1 34 7.5v12A2.5 2.5 0 0 1 31.5 22h-26A2.5 2.5 0 0 1 3 19.5v-11Z" fill={palette.body} stroke={palette.edge} strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M3.8 8.7h29.4v2.6H3.8z" fill={palette.tab} opacity="0.95" />
          </>
        )}
      </svg>
    </span>
  )
}

function TreeBranchNode({
  children,
  isLast,
  nodeColor,
  lineColor,
  compact = false,
}: {
  children: React.ReactNode
  isLast: boolean
  nodeColor: string
  lineColor: string
  compact?: boolean
}) {
  return (
    <div className={`relative ${compact ? "pl-6" : "pl-11"}`}>
      <div className={`absolute left-0 top-0 bottom-0 ${compact ? "w-5" : "w-9"}`}>
        {!isLast ? <div className={`absolute top-0 bottom-0 w-px ${compact ? "left-[6px]" : "left-[12px]"}`} style={{ backgroundColor: lineColor }} /> : null}
        <div className={`absolute top-0 h-[16px] w-px ${compact ? "left-[6px]" : "left-[12px]"}`} style={{ backgroundColor: lineColor }} />
        <div className={`absolute top-[16px] h-px ${compact ? "left-[6px] w-[8px]" : "left-[12px] w-[16px]"}`} style={{ backgroundColor: lineColor }} />
        <div
          className={`absolute top-[13px] h-[6px] w-[6px] rounded-full ${compact ? "left-[13px]" : "left-[27px]"}`}
          style={{ backgroundColor: nodeColor }}
        />
      </div>
      {children}
    </div>
  )
}

export function LibraryTree({
  title,
  tone,
  open,
  onToggle,
  description,
  libraries,
  emptyMessage,
  compact = false,
  onLibrarySelect,
  onDeleteLibrary,
}: {
  title: string
  tone: "global" | "local"
  open: boolean
  onToggle: () => void
  description: string
  libraries: ReturnType<typeof getLibrariesSnapshot>
  emptyMessage: string
  compact?: boolean
  onLibrarySelect?: (libraryId: string) => void
  onDeleteLibrary?: (libraryId: string) => void
}) {
  const textColor = "text-[#e0e0e0]"
  const nodeColor = tone === "global" ? "#0F9FC1" : "#16989A"
  const lineColor = tone === "global" ? "#6FD3EA" : "#8ED9D6"

  return (
    <div className="rounded-[12px] border border-[#2d2d2d] bg-[#1c1c1c] px-3 py-3 shadow-[0_10px_24px_rgba(0,0,0,0.3)] transition-transform duration-200 ease-out hover:scale-[1.015] lg:hover:scale-100">
      <div className="pb-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className={`flex items-center gap-2 text-[18px] font-medium tracking-[-0.02em] ${textColor}`}>
            <FolderBadge tone={tone} open={open} size="lg" />
            <span>{title}</span>
          </div>
          <span className="lg:hidden">
            <TriangleIcon direction={open ? "up" : "down"} size={11} className="text-[#0096C7]" />
          </span>
          <TriangleIcon direction={open ? "up" : "down"} size={11} className="hidden shrink-0 text-[#0096C7] lg:block" />
        </button>
        <div className="mt-1 text-[14px] text-[#888888]">{description}</div>
      </div>

      {open ? (
        <div className={compact ? "ml-[4px] pl-1.5" : "ml-[14px] pl-6"}>
          {libraries.length > 0 ? (() => {
            const topLevel = libraries.filter((lib) => !lib.parentId)
            const byParent = libraries.reduce<Record<string, typeof libraries>>((acc, lib) => {
              if (lib.parentId) {
                acc[lib.parentId] = [...(acc[lib.parentId] ?? []), lib]
              }
              return acc
            }, {})

            return topLevel.map((library, index) => {
              const cardCount = getLibraryCardsSnapshot(library.id).length
              const children = byParent[library.id] ?? []
              const isLast = index === topLevel.length - 1

              function renderLibraryContent(lib: typeof library, childMode = false) {
                const count = getLibraryCardsSnapshot(lib.id).length
                const label = lib.name
                return (
                  <div className="group flex items-start gap-1 py-1">
                    {onLibrarySelect ? (
                      <button
                        type="button"
                        onClick={() => onLibrarySelect(lib.id)}
                        className="block min-w-0 flex-1 text-left transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <FolderBadge tone={tone} open size={childMode ? "md" : "md"} />
                          </div>
                          <div className="min-w-0">
                            <p className="break-words text-[14px] leading-5 font-normal text-[#e0e0e0] hover:text-white lg:truncate lg:text-[15px]">
                              {label}
                            </p>
                            <p className="mt-0.5 break-words text-[13px] leading-5 text-[#888888] lg:truncate lg:text-[14px]">
                              {formatMeta(count, getLibraryTypeLabel(lib))}
                            </p>
                          </div>
                        </div>
                      </button>
                    ) : (
                      <Link
                        href={`/libraries/${lib.id}`}
                        className="block min-w-0 flex-1 py-0 text-left transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <FolderBadge tone={tone} open size="md" />
                          </div>
                          <div className="min-w-0">
                            <p className="break-words text-[14px] leading-5 font-normal text-[#e0e0e0] hover:text-white lg:truncate lg:text-[15px]">
                              {label}
                            </p>
                            <p className="mt-0.5 break-words text-[13px] leading-5 text-[#888888] lg:truncate lg:text-[14px]">
                              {formatMeta(count, getLibraryTypeLabel(lib))}
                            </p>
                          </div>
                        </div>
                      </Link>
                    )}
                    {onDeleteLibrary && lib.libraryType === "local" ? (
                      <button
                        type="button"
                        title="Remove library"
                        onClick={(e) => { e.stopPropagation(); onDeleteLibrary(lib.id) }}
                        className="mt-0.5 shrink-0 rounded p-1 text-[#555] opacity-0 transition-opacity hover:text-[#e05252] group-hover:opacity-100"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                      </button>
                    ) : null}
                  </div>
                )
              }

              return (
                <TreeBranchNode
                  key={library.id}
                  isLast={isLast}
                  lineColor={lineColor}
                  nodeColor={nodeColor}
                  compact={compact}
                >
                  {renderLibraryContent(library)}
                  {children.length > 0 ? (
                    <div className={compact ? "ml-[4px] pl-1.5" : "ml-[14px] pl-4"}>
                      {children.map((child, ci) => (
                        <TreeBranchNode
                          key={child.id}
                          isLast={ci === children.length - 1}
                          lineColor={lineColor}
                          nodeColor={nodeColor}
                          compact
                        >
                          {renderLibraryContent(child, true)}
                        </TreeBranchNode>
                      ))}
                    </div>
                  ) : null}
                </TreeBranchNode>
              )
            })
          })() : (
            <p className="py-2 text-[14px] text-[#888888]">{emptyMessage}</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function BookmarkList({
  bookmarks,
}: {
  bookmarks: ReturnType<typeof getBookmarksSnapshot>
}) {
  return (
    <div className="rounded-[12px] border border-[#2d2d2d] bg-[#1c1c1c] px-3 py-3 shadow-[0_10px_24px_rgba(0,0,0,0.3)] transition-transform duration-200 ease-out hover:scale-[1.015] lg:hover:scale-100">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[18px] font-medium tracking-[-0.02em] text-[#e0e0e0]">
          <FolderBadge tone="bookmark" open size="lg" />
          <span>Bookmarks</span>
        </div>
        <Link href="/bookmarks" className="text-[14px] text-[#0096C7]">
          View all
        </Link>
      </div>
      <div className="mt-1 text-[14px] text-[#888888]">Your saved procedure shortcuts.</div>

      <div className="mt-3">
        {bookmarks.length > 0 ? (
          <div className="space-y-1">
            {bookmarks.slice(0, 5).map((bookmark) => (
              <Link
                key={bookmark.id}
                href={bookmark.href}
                className="block rounded-[10px] px-2.5 py-2 transition-colors hover:bg-[#2a2a2a]"
              >
                <p className="truncate text-[14px] text-[#e0e0e0]">{bookmark.title}</p>
                <p className="mt-0.5 truncate text-[13px] text-[#888888]">{bookmark.subtitle}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="py-2 text-[14px] text-[#888888]">No bookmarks yet.</p>
        )}
      </div>
    </div>
  )
}

export function EmbeddedLibrariesDashboardMobile({
  query = "",
  onSelectLibrary,
  onDeleteLibrary,
}: {
  query?: string
  onSelectLibrary?: (libraryId: string) => void
  onDeleteLibrary?: (libraryId: string) => void
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
  const [mobileGlobalOpen, setMobileGlobalOpen] = useState(false)
  const [mobileLocalOpen, setMobileLocalOpen] = useState(false)
  const profile = getProfile()
  const workspaceLabel = useMemo(() => {
    const settings = profile ? getRelevantSettings(profile) : []
    return settings[0] ?? "Operating Theatre"
  }, [profile])

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
          `${library.name} ${getLibraryOwnerLabel(library)} ${library.description ?? ""}`.toLowerCase().includes(normalizedQuery),
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

  return (
    <div className="space-y-4">

      <section>
        <div className="px-1">
          <h2 className="whitespace-nowrap text-[24px] font-medium tracking-[-0.03em] text-white">Collections</h2>
        </div>

        <div className="mt-3 px-1">
          <LibraryTree
            title="Community"
            tone="global"
            open={mobileGlobalOpen}
            onToggle={() => setMobileGlobalOpen((value) => !value)}
            description="Shared collections for this workspace."
            libraries={filteredGlobalLibraries}
            emptyMessage={`No shared collections are available yet for ${workspaceLabel}.`}
            compact
            onLibrarySelect={onSelectLibrary}
          />

          <div className="mt-3 pt-3">
            <LibraryTree
              title={localCollectionsTitle}
              tone="local"
              open={mobileLocalOpen}
              onToggle={() => setMobileLocalOpen((value) => !value)}
              description="Collections specific to your organisation or access scope."
              libraries={filteredLocalLibraries}
              emptyMessage="No My Group collections are available yet."
              compact
              onLibrarySelect={onSelectLibrary}
              onDeleteLibrary={onDeleteLibrary}
            />
            {mobileLocalOpen ? (
              <div className="px-3 pt-2">
                <Link href="/" className="inline-block text-[14px] text-[#0096C7]">
                  Request access to other collections
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="px-1">
        <BookmarkList bookmarks={bookmarks} />
      </section>
    </div>
  )
}

export default function LibrariesDashboard() {
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
  const [query, setQuery] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [desktopNavOpen, setDesktopNavOpen] = useState(true)
  const [globalOpen, setGlobalOpen] = useState(true)
  const [localOpen, setLocalOpen] = useState(true)
  const [mobileGlobalOpen, setMobileGlobalOpen] = useState(false)
  const [mobileLocalOpen, setMobileLocalOpen] = useState(false)
  const profile = getProfile()
  const workspaceLabel = useMemo(() => {
    const settings = profile ? getRelevantSettings(profile) : []
    return settings[0] ?? "Operating Theatre"
  }, [profile])

  function handleToggleNavigation() {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      setDesktopNavOpen((value) => !value)
      return
    }
    setMobileMenuOpen((value) => !value)
  }

  function handleDeleteLibrary(libraryId: string) {
    void deleteLocalLibrary(libraryId)
  }

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
          `${library.name} ${getLibraryOwnerLabel(library)} ${library.description ?? ""}`.toLowerCase().includes(normalizedQuery),
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

  return (
    <div className="app-shell-bg min-h-screen overflow-x-hidden bg-black">
      <AppTopBar
        menuOpen={mobileMenuOpen}
        onToggleMenu={handleToggleNavigation}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Find a specialty, collection, or group..."
        mobileMenuOnly
        menuContent={<AppMenuContent />}
      />

      <main className="w-full px-4 pt-0 pb-4 lg:px-0 lg:pb-0">
        <div className="space-y-4 lg:hidden">

          <section>
            <div className="px-1">
              <h2 className="whitespace-nowrap text-[24px] font-medium tracking-[-0.03em] text-white">Collections</h2>
            </div>

            <div className="mt-3 px-1">
              <LibraryTree
                title="Community"
                tone="global"
                open={mobileGlobalOpen}
                onToggle={() => setMobileGlobalOpen((value) => !value)}
                description="Shared collections for this workspace."
                libraries={filteredGlobalLibraries}
                emptyMessage={`No shared collections are available yet for ${workspaceLabel}.`}
                compact
              />

              <div className="mt-3 pt-3">
                <LibraryTree
                  title={localCollectionsTitle}
                  tone="local"
                  open={mobileLocalOpen}
                  onToggle={() => setMobileLocalOpen((value) => !value)}
                  description="Collections specific to your organisation or access scope."
                  libraries={filteredLocalLibraries}
                  emptyMessage="No My Group collections are available yet."
                  compact
                  onDeleteLibrary={handleDeleteLibrary}
                />
                {mobileLocalOpen ? (
                  <div className="px-3 pt-2">
                    <Link href="/" className="inline-block text-[14px] text-[#0096C7]">
                      Request access to other collections
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="px-1">
            <BookmarkList bookmarks={bookmarks} />
          </section>
        </div>

        <div className={`hidden lg:grid lg:gap-y-4 lg:gap-x-0 ${desktopNavOpen ? "lg:grid-cols-[240px_minmax(0,1fr)]" : "lg:grid-cols-[80px_minmax(0,1fr)]"}`}>
          <WorkspaceNavRail currentNav="collections" collapsed={!desktopNavOpen} onToggleCollapsed={() => setDesktopNavOpen((value) => !value)} />

          <div className="min-w-0 space-y-2">
            <section>
              <div className="mb-3 flex items-center justify-between gap-4">
                <h2 className="text-[22px] font-medium tracking-[-0.03em] text-white">Collections</h2>
              </div>

              <div className="px-1 py-1">
                <LibraryTree
                  title="Community"
                  tone="global"
                  open={globalOpen}
                  onToggle={() => setGlobalOpen((value) => !value)}
                  description="Shared collections for this workspace."
                  libraries={filteredGlobalLibraries.slice(0, 8)}
                  emptyMessage={`No shared collections are available yet for ${workspaceLabel}.`}
                />

                <div className="mt-3 pt-3">
                  <LibraryTree
                    title={localCollectionsTitle}
                    tone="local"
                    open={localOpen}
                    onToggle={() => setLocalOpen((value) => !value)}
                    description="Collections specific to your organisation or access scope."
                    libraries={filteredLocalLibraries}
                    emptyMessage="No My Group collections are available yet."
                    onDeleteLibrary={handleDeleteLibrary}
                  />
                  {localOpen ? (
                    <div className="pt-2">
                      <Link href="/" className="inline-block text-[14px] text-[#0F4C5C]">
                        Request access to other collections
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="px-1 py-1">
              <BookmarkList bookmarks={bookmarks} />
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
