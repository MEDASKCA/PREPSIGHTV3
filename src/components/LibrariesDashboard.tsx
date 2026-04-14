"use client"

import Link from "next/link"
import { startTransition, useMemo, useState, useSyncExternalStore } from "react"
import {
  ArrowRightLeft,
  Bookmark,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  RefreshCw,
} from "lucide-react"
import AppMenuContent from "@/components/AppMenuContent"
import AppTopBar from "@/components/AppTopBar"
import WorkspaceNavRail from "@/components/WorkspaceNavRail"
import { getLibrariesSnapshot, getLibraryCardsSnapshot, subscribeLibraries } from "@/lib/libraries"
import { getProfile, getRelevantSettings, setActiveOrganizationId } from "@/lib/profile"
import {
  getActiveTeamSnapshot,
  getTeamWorkspacesForProfile,
  subscribeTeams,
  type TeamWorkspaceRecord,
} from "@/lib/team-workspaces"
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

function buildUpdateRows(input: {
  globalLibraries: ReturnType<typeof getLibrariesSnapshot>
  localLibraries: ReturnType<typeof getLibrariesSnapshot>
  workspaceName: string
}) {
  const globalUpdates = input.globalLibraries.slice(0, 4).map((library, index) => ({
    id: `global-${library.id}`,
    title: `${library.name} has shared procedures ready`,
    detail: `${getLibraryCardsSnapshot(library.id).length} cards are available in the community collection.`,
    href: `/libraries/${library.id}`,
    emphasis: index === 0,
  }))

  const localUpdates = input.localLibraries.slice(0, 4).map((library, index) => ({
    id: `local-${library.id}`,
    title: `${library.ownerName} has My Team work in progress`,
    detail: `${getLibraryCardsSnapshot(library.id).length} My Team cards belong to this workspace collection.`,
    href: `/libraries/${library.id}`,
    emphasis: index === 0,
  }))

  if (localUpdates.length === 0) {
    localUpdates.push({
      id: "local-empty",
      title: `No My Team collections yet for ${input.workspaceName}`,
      detail: "Create My Team cards or join another workspace to see operational collections here.",
      href: "/",
      emphasis: true,
    })
  }

  return { globalUpdates, localUpdates }
}

function RightRailSection({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[12px] border border-[#DCEAF0] bg-white px-4 py-4 shadow-[0_12px_30px_-26px_rgba(16,36,62,0.28)]">
      <div>
        <p className="text-[15px] font-medium text-[#10243E]">{title}</p>
        {subtitle ? <p className="mt-1 text-[13px] leading-6 text-[#6B7F90]">{subtitle}</p> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
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

function LibraryTree({
  title,
  tone,
  open,
  onToggle,
  description,
  libraries,
  emptyMessage,
  compact = false,
}: {
  title: string
  tone: "global" | "local"
  open: boolean
  onToggle: () => void
  description: string
  libraries: ReturnType<typeof getLibrariesSnapshot>
  emptyMessage: string
  compact?: boolean
}) {
  const borderColor = tone === "global" ? "border-[#9FD6E2]" : "border-[#D3E5EB]"
  const textColor = tone === "global" ? "text-[#0F4C5C]" : "text-[#10243E]"
  const nodeColor = tone === "global" ? "#0F9FC1" : "#16989A"
  const lineColor = tone === "global" ? "#6FD3EA" : "#8ED9D6"

  return (
    <div className="rounded-[12px] border border-[#DCEAF0] bg-white px-3 py-3 shadow-[0_12px_30px_-26px_rgba(16,36,62,0.28)]">
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
          <span className={`text-[12px] leading-none text-[#0077B6] transition-transform lg:hidden ${open ? "rotate-180" : ""}`}>▼</span>
          <ChevronDown
            size={16}
            className={`hidden shrink-0 text-[#61758B] transition-transform lg:block ${open ? "rotate-180" : ""}`}
          />
        </button>
        <div className="mt-1 text-[14px] text-[#61758B]">{description}</div>
      </div>

      {open ? (
        <div className={compact ? "ml-[4px] pl-1.5" : "ml-[14px] pl-6"}>
          {libraries.length > 0 ? (
            libraries.map((library, index) => {
              const cardCount = getLibraryCardsSnapshot(library.id).length

              return (
                <TreeBranchNode
                  key={library.id}
                  isLast={index === libraries.length - 1}
                  lineColor={lineColor}
                  nodeColor={nodeColor}
                  compact={compact}
                >
                  <Link
                    href={`/libraries/${library.id}`}
                    className="block py-1 text-left transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <FolderBadge tone={tone} open size="md" />
                      </div>
                      <div className="min-w-0">
                        <p className="break-words text-[14px] leading-5 font-normal text-[#10243E] hover:text-[#0F4C5C] lg:truncate lg:text-[15px]">
                          {getLibraryOwnerLabel(library)}/{library.name}
                        </p>
                        <p className="mt-0.5 break-words text-[13px] leading-5 text-[#61758B] lg:truncate lg:text-[14px]">
                          {formatMeta(cardCount, getLibraryTypeLabel(library))}
                        </p>
                      </div>
                    </div>
                  </Link>
                </TreeBranchNode>
              )
            })
          ) : (
            <p className="py-2 text-[14px] text-[#61758B]">{emptyMessage}</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

function BookmarkList({
  bookmarks,
}: {
  bookmarks: ReturnType<typeof getBookmarksSnapshot>
}) {
  return (
    <div className="rounded-[12px] border border-[#DCEAF0] bg-white px-3 py-3 shadow-[0_12px_30px_-26px_rgba(16,36,62,0.28)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[18px] font-medium tracking-[-0.02em] text-[#10243E]">
          <FolderBadge tone="bookmark" open size="lg" />
          <span>Bookmarks</span>
        </div>
        <Link href="/bookmarks" className="text-[14px] text-[#0F4C5C]">
          View all
        </Link>
      </div>
      <div className="mt-1 text-[14px] text-[#61758B]">Your saved procedure shortcuts.</div>

      <div className="mt-3">
        {bookmarks.length > 0 ? (
          <div className="space-y-1">
            {bookmarks.slice(0, 5).map((bookmark) => (
              <Link
                key={bookmark.id}
                href={bookmark.href}
                className="block rounded-[10px] px-2.5 py-2 transition-colors hover:bg-[#F4FBFF]"
              >
                <p className="truncate text-[14px] text-[#10243E]">{bookmark.title}</p>
                <p className="mt-0.5 truncate text-[13px] text-[#61758B]">{bookmark.subtitle}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="py-2 text-[14px] text-[#61758B]">No bookmarks yet.</p>
        )}
      </div>
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
  const activeTeam = getActiveTeamSnapshot(profile)
  const userTeams = getTeamWorkspacesForProfile(profile)
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

  function handleSwitchWorkspace(team: TeamWorkspaceRecord) {
    startTransition(() => {
      setActiveOrganizationId(team.id)
      if (typeof window !== "undefined") {
        window.location.reload()
      }
    })
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
  const updates = buildUpdateRows({
    globalLibraries: filteredGlobalLibraries,
    localLibraries: filteredLocalLibraries,
    workspaceName: activeTeam?.internalName ?? profile?.hospital ?? "your workspace",
  })

  const quickActions = [
    { label: "Browse workspace", href: "/", icon: LayoutGrid, tone: "#14B8A6" },
    { label: "Open review", href: "/review", icon: RefreshCw, tone: "#F59E0B" },
    { label: "Switch workspace", href: "/settings/profile", icon: ArrowRightLeft, tone: "#7C5CFC" },
  ]

  return (
    <div className="app-shell-bg min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#E5F5F8_0%,#F3F9FB_42%,#F4F7FA_100%)]">
      <AppTopBar
        menuOpen={mobileMenuOpen}
        onToggleMenu={handleToggleNavigation}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Find a specialty, collection, or team..."
        mobileMenuOnly
        menuContent={<AppMenuContent />}
      />

      <main className="w-full px-4 pt-0 pb-4 lg:pl-0 lg:pr-4 lg:pt-4 lg:pb-4">
        <div className="space-y-4 lg:hidden">
          <section className="px-1">
            <p className="text-[14px] text-[#5B7A8A]">Workspace</p>
            <h1 className="mt-1 text-[32px] tracking-[-0.04em] text-[#10243E]">{workspaceLabel}</h1>
            <p className="mt-2 text-[15px] text-[#61758B]">
              {libraries.length} collections · {totalCards} procedure cards
            </p>
          </section>

          <section>
            <div className="px-1">
              <h2 className="whitespace-nowrap text-[24px] font-medium tracking-[-0.03em] text-[#10243E]">Collections</h2>
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

              <div className="mt-3 border-t border-[#D9EBF0] pt-3">
                <LibraryTree
                  title="My Team"
                  tone="local"
                  open={mobileLocalOpen}
                  onToggle={() => setMobileLocalOpen((value) => !value)}
                  description="Collections specific to your organisation or access scope."
                  libraries={filteredLocalLibraries}
                  emptyMessage="No My Team collections are available yet."
                  compact
                />
                {mobileLocalOpen ? (
                  <div className="px-3 pt-2">
                    <Link href="/" className="inline-block text-[14px] text-[#0F4C5C]">
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

        <div className={`hidden lg:grid lg:gap-4 ${desktopNavOpen ? "lg:grid-cols-[210px_minmax(0,1fr)_470px]" : "lg:grid-cols-[minmax(0,1fr)_470px]"}`}>
          {desktopNavOpen ? <WorkspaceNavRail currentNav="collections" /> : null}

          <div className="min-w-0 space-y-2">
            <section className="px-1">
              <p className="text-[14px] text-[#5B7A8A]">Workspace</p>
              <h1 className="mt-1 text-[32px] tracking-[-0.04em] text-[#10243E]">{workspaceLabel}</h1>
              <p className="mt-2 text-[15px] text-[#E7FAFD]">{libraries.length} collections · {totalCards} procedure cards</p>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-4">
                <h2 className="text-[24px] font-medium tracking-[-0.03em] text-[#10243E]">Collections</h2>
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
                    title="My Team"
                    tone="local"
                    open={localOpen}
                    onToggle={() => setLocalOpen((value) => !value)}
                    description="Collections specific to your organisation or access scope."
                    libraries={filteredLocalLibraries.slice(0, 8)}
                    emptyMessage="No My Team collections are available yet."
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

          <aside className="min-w-0">
            <div className="space-y-3">
              <RightRailSection
                title="Active workspace"
                subtitle="Switch context without leaving this page."
              >
                <div className="pb-3">
                  <p className="text-[18px] tracking-[-0.03em] text-[#10243E]">
                    {activeTeam?.internalName ?? profile?.hospital ?? "No active workspace"}
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-[#5B7286]">
                    {activeTeam?.publicAlias ?? "PSH-000"} · {profile?.platformRole ?? "user"} · {userTeams.length || 1} workspace membership{userTeams.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="space-y-1">
                  {userTeams.length > 0 ? userTeams.map((team) => {
                    const isActive = team.id === activeTeam?.id
                    return (
                  <button
                        key={team.id}
                        type="button"
                        onClick={() => handleSwitchWorkspace(team)}
                        className={`flex w-full items-center justify-between rounded-[10px] px-2.5 py-2 text-left transition-colors ${
                          isActive ? "bg-[#F2F8FC]" : "hover:bg-[#F7FBFD]"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] text-[#10243E]">{team.internalName}</span>
                          <span className="mt-0.5 block text-[13px] text-[#61758B]">{team.publicAlias} · {team.visibility}</span>
                        </span>
                        <span className={`text-[13px] ${isActive ? "text-[#2563EB]" : "text-[#406175]"}`}>
                          {isActive ? "Active" : "Switch"}
                        </span>
                      </button>
                    )
                  }) : (
                    <p className="text-[14px] leading-6 text-[#61758B]">
                      Additional workspaces will appear here as the user joins more hospital or team memberships.
                    </p>
                  )}
                </div>
              </RightRailSection>

              <RightRailSection
                title="Quick links"
                subtitle="Fast entry points without repeating the main view."
              >
                <div className="space-y-1">
                  {quickActions.map((action) => {
                    const Icon = action.icon
                    return (
                      <Link
                        key={action.label}
                        href={action.href}
                        className="group flex items-center justify-between rounded-[10px] px-2.5 py-2 transition-colors hover:bg-[#F7FBFD]"
                      >
                        <span className="flex items-center gap-3">
                          <Icon size={15} style={{ color: action.tone }} />
                          <span className="text-[14px] text-[#10243E]">{action.label}</span>
                        </span>
                        <ChevronRight size={14} className="text-[#7A92A4]" />
                      </Link>
                    )
                  })}
                </div>
              </RightRailSection>

              <RightRailSection
                title="Updates"
                subtitle="What has moved in community and My Team collections."
              >
                <div className="space-y-3">
                  <div>
                    <p className="text-[14px] text-[#5B7A8A]">Community</p>
                    <div className="mt-2 space-y-1">
                      {updates.globalUpdates.map((update) => (
                        <Link
                          key={update.id}
                          href={update.href}
                          className="block rounded-[10px] px-2.5 py-2 transition-colors hover:bg-[#F7FBFD]"
                        >
                          <div className="min-w-0">
                            <p className={`text-[14px] text-[#10243E] ${update.emphasis ? "font-medium" : ""}`}>{update.title}</p>
                            <p className="mt-0.5 text-[13px] leading-6 text-[#61758B]">{update.detail}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[14px] text-[#5B7A8A]">My Team</p>
                    <div className="mt-2 space-y-1">
                      {updates.localUpdates.map((update) => (
                        <Link
                          key={update.id}
                          href={update.href}
                          className="block rounded-[10px] px-2.5 py-2 transition-colors hover:bg-[#FFF8F1]"
                        >
                          <div className="min-w-0">
                            <p className={`text-[14px] text-[#10243E] ${update.emphasis ? "font-medium" : ""}`}>{update.title}</p>
                            <p className="mt-0.5 text-[13px] leading-6 text-[#61758B]">{update.detail}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </RightRailSection>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
