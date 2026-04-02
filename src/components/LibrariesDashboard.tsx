"use client"

import Link from "next/link"
import { startTransition, useMemo, useState, useSyncExternalStore } from "react"
import {
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  LayoutGrid,
  Plus,
  RefreshCw,
} from "lucide-react"
import AppMenuContent from "@/components/AppMenuContent"
import AppTopBar from "@/components/AppTopBar"
import { getLibrariesSnapshot, getLibraryCardsSnapshot, subscribeLibraries } from "@/lib/libraries"
import { getProfile, getRelevantSettings, setActiveOrganizationId } from "@/lib/profile"
import {
  getActiveTeamSnapshot,
  getTeamWorkspacesForProfile,
  subscribeTeams,
  type TeamWorkspaceRecord,
} from "@/lib/team-workspaces"

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
    detail: `${getLibraryCardsSnapshot(library.id).length} cards are available in the shared repository.`,
    href: `/libraries/${library.id}`,
    emphasis: index === 0,
  }))

  const localUpdates = input.localLibraries.slice(0, 4).map((library, index) => ({
    id: `local-${library.id}`,
    title: `${library.ownerName} has local work in progress`,
    detail: `${getLibraryCardsSnapshot(library.id).length} local cards belong to this workspace repository.`,
    href: `/libraries/${library.id}`,
    emphasis: index === 0,
  }))

  if (localUpdates.length === 0) {
    localUpdates.push({
      id: "local-empty",
      title: `No local repositories yet for ${input.workspaceName}`,
      detail: "Create local cards or join another workspace to see operational repositories here.",
      href: "/procedures/new",
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
    <section className="border-b border-[#D9EBF0] pb-5 last:border-b-0 last:pb-0">
      <div>
        <p className="text-[15px] font-medium text-[#10243E]">{title}</p>
        {subtitle ? <p className="mt-1 text-[12px] leading-5 text-[#6B7F90]">{subtitle}</p> : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
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
}: {
  title: string
  tone: "global" | "local"
  open: boolean
  onToggle: () => void
  description: string
  libraries: ReturnType<typeof getLibrariesSnapshot>
  emptyMessage: string
}) {
  const borderColor = tone === "global" ? "border-[#9FD6E2]" : "border-[#D3E5EB]"
  const lineColor = tone === "global" ? "bg-[#9FD6E2]" : "bg-[#D3E5EB]"
  const textColor = tone === "global" ? "text-[#0F4C5C]" : "text-[#10243E]"

  return (
    <div>
      <div className="pb-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className={`flex items-center gap-2 text-[18px] font-medium tracking-[-0.02em] ${textColor}`}>
            {open ? (
              <FolderOpen size={18} className="shrink-0 text-[#0F9FC1]" />
            ) : (
              <Folder size={18} className="shrink-0 text-[#0F9FC1]" />
            )}
            <span>{title}</span>
          </div>
          <ChevronDown
            size={16}
            className={`shrink-0 text-[#61758B] transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <div className="mt-1 text-[13px] text-[#61758B]">{description}</div>
      </div>

      {open ? (
        <div className={`ml-[11px] border-l ${borderColor} pl-4`}>
          {libraries.length > 0 ? (
            libraries.map((library) => {
              const cardCount = getLibraryCardsSnapshot(library.id).length

              return (
                <Link
                  key={library.id}
                  href={`/libraries/${library.id}`}
                  className="group block border-b border-l-2 border-b-[#E6EFF4] border-l-transparent py-3 pl-1 transition-colors hover:border-l-[#0F9FC1] hover:bg-[#F4FBFF]"
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-[11px] h-px w-3 shrink-0 ${lineColor}`} />
                    <FolderOpen size={16} className="mt-0.5 shrink-0 text-[#0F9FC1]" />
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium text-[#10243E]">
                        {getLibraryOwnerLabel(library)}/{library.name}
                      </p>
                      <p className="mt-1 truncate text-[13px] text-[#61758B]">
                        {formatMeta(cardCount, getLibraryTypeLabel(library))}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })
          ) : (
            <p className="py-2 text-[13px] text-[#61758B]">{emptyMessage}</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default function LibrariesDashboard() {
  const libraries = useSyncExternalStore(
    subscribeLibraries,
    getLibrariesSnapshot,
    getLibrariesSnapshot,
  )
  useSyncExternalStore(subscribeTeams, () => 0, () => 0)
  const [query, setQuery] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [desktopNavOpen, setDesktopNavOpen] = useState(true)
  const [globalOpen, setGlobalOpen] = useState(true)
  const [localOpen, setLocalOpen] = useState(true)
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
    { label: "Create new card", href: "/procedures/new", icon: Plus, tone: "#4DA3FF" },
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
        searchPlaceholder="Find a specialty, repository, or team..."
        menuContent={<AppMenuContent />}
      />

      <main className="w-full px-4 py-6 lg:px-6 lg:py-6">
        <div className="space-y-6 lg:hidden">
          <section className="rounded-[3px] border border-[#7FD3E4] bg-[#2E9FBE] px-4 py-5 shadow-[0_14px_28px_-26px_rgba(16,36,62,0.22)]">
            <p className="text-[13px] text-[#D9F6FB]">Workspace</p>
            <h1 className="mt-1 text-[32px] tracking-[-0.04em] text-white">{workspaceLabel}</h1>
            <p className="mt-2 text-[14px] text-[#E7FAFD]">
              {libraries.length} repositories · {totalCards} procedure repositories
            </p>
          </section>

          <section>
            <div className="px-1">
              <h2 className="whitespace-nowrap text-[20px] tracking-[-0.02em] text-[#10243E]">Repositories</h2>
            </div>

            <div className="mt-3 px-1">
              <LibraryTree
                title="Global"
                tone="global"
                open={globalOpen}
                onToggle={() => setGlobalOpen((value) => !value)}
                description="Shared repositories for this workspace."
                libraries={filteredGlobalLibraries}
                emptyMessage={`No shared repositories are available yet for ${workspaceLabel}.`}
              />

              <div className="mt-4 border-t border-[#D9EBF0] pt-4">
                <LibraryTree
                  title="Local"
                  tone="local"
                  open={localOpen}
                  onToggle={() => setLocalOpen((value) => !value)}
                  description="Repositories specific to your organisation or access scope."
                  libraries={filteredLocalLibraries}
                  emptyMessage="No local repositories are available yet."
                />
                {localOpen ? (
                  <div className="px-3 pt-2">
                    <Link href="/" className="inline-block text-[13px] text-[#0F4C5C]">
                      Request access to other repositories
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>

        <div className={`hidden lg:grid lg:gap-8 ${desktopNavOpen ? "lg:grid-cols-[220px_minmax(0,1fr)_320px]" : "lg:grid-cols-[minmax(0,1fr)_320px]"}`}>
          {desktopNavOpen ? (
            <aside className="min-w-0 border-r border-[#D5EAF1] pr-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[14px] text-[#10243E]">Navigation</div>
              </div>

              <div className="mt-4 space-y-1">
                <Link href="/" className="block py-2 text-[14px] text-[#10243E]">
                  Dashboard
                </Link>
                <Link href="/" className="block py-2 text-[14px] font-medium text-[#0F4C5C]">
                  Repositories
                </Link>
                <Link href="/review" className="block py-2 text-[14px] text-[#10243E]">
                  Review
                </Link>
                <Link href="/calendar" className="block py-2 text-[14px] text-[#10243E]">
                  Calendar
                </Link>
                <Link href="/catalogue" className="block py-2 text-[14px] text-[#10243E]">
                  Catalogue
                </Link>
                <Link href="/procedures/new" className="block py-2 text-[14px] text-[#10243E]">
                  New card
                </Link>
                <Link href="/settings/profile" className="block py-2 text-[14px] text-[#10243E]">
                  Profile
                </Link>
              </div>
            </aside>
          ) : null}

          <div className="min-w-0 space-y-5">
            <section className="rounded-[3px] border border-[#7FD3E4] bg-[#2E9FBE] px-6 py-6 shadow-[0_14px_28px_-26px_rgba(16,36,62,0.22)]">
              <p className="text-[13px] text-[#D9F6FB]">Workspace</p>
              <h1 className="mt-1 text-[32px] tracking-[-0.04em] text-white">{workspaceLabel}</h1>
              <p className="mt-2 text-[14px] text-[#E7FAFD]">{libraries.length} repositories · {totalCards} procedure repositories</p>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-4">
                <h2 className="text-[18px] text-[#10243E]">Repositories</h2>
              </div>

              <div className="px-1 py-1">
                <LibraryTree
                  title="Global"
                  tone="global"
                  open={globalOpen}
                  onToggle={() => setGlobalOpen((value) => !value)}
                  description="Shared repositories for this workspace."
                  libraries={filteredGlobalLibraries.slice(0, 8)}
                  emptyMessage={`No shared repositories are available yet for ${workspaceLabel}.`}
                />

                <div className="mt-4 border-t border-[#D9EBF0] pt-4">
                  <LibraryTree
                    title="Local"
                    tone="local"
                    open={localOpen}
                    onToggle={() => setLocalOpen((value) => !value)}
                    description="Repositories specific to your organisation or access scope."
                    libraries={filteredLocalLibraries.slice(0, 8)}
                    emptyMessage="No local repositories are available yet."
                  />
                  {localOpen ? (
                    <div className="pt-2">
                      <Link href="/" className="inline-block text-[13px] text-[#0F4C5C]">
                        Request access to other repositories
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          </div>

          <aside className="min-w-0 border-l border-[#D5EAF1] pl-6">
            <div className="space-y-6">
              <RightRailSection
                title="Active workspace"
                subtitle="Switch context without leaving this page."
              >
                <div className="pb-3">
                  <p className="text-[18px] tracking-[-0.03em] text-[#10243E]">
                    {activeTeam?.internalName ?? profile?.hospital ?? "No active workspace"}
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-[#5B7286]">
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
                        className={`flex w-full items-center justify-between border-l-2 px-2 py-2 text-left transition-colors ${
                          isActive ? "border-l-[#0F9FC1] bg-[#F2F8FC]" : "border-l-transparent hover:border-l-[#D7E9EE] hover:bg-[#F7FBFD]"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] text-[#10243E]">{team.internalName}</span>
                          <span className="mt-0.5 block text-[12px] text-[#61758B]">{team.publicAlias} · {team.visibility}</span>
                        </span>
                        <span className={`text-[12px] ${isActive ? "text-[#2563EB]" : "text-[#406175]"}`}>
                          {isActive ? "Active" : "Switch"}
                        </span>
                      </button>
                    )
                  }) : (
                    <p className="text-[13px] leading-5 text-[#61758B]">
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
                        className="group flex items-center justify-between border-l-2 border-l-transparent px-2 py-2 transition-colors hover:border-l-[#D7E9EE] hover:bg-[#F7FBFD]"
                      >
                        <span className="flex items-center gap-3">
                          <Icon size={15} style={{ color: action.tone }} />
                          <span className="text-[13px] text-[#10243E]">{action.label}</span>
                        </span>
                        <ChevronRight size={14} className="text-[#7A92A4]" />
                      </Link>
                    )
                  })}
                </div>
              </RightRailSection>

              <RightRailSection
                title="Updates"
                subtitle="What has moved in shared and local repositories."
              >
                <div className="space-y-4">
                  <div>
                    <p className="text-[13px] text-[#5B7A8A]">Global</p>
                    <div className="mt-2 space-y-1">
                      {updates.globalUpdates.map((update) => (
                        <Link
                          key={update.id}
                          href={update.href}
                          className="block border-l-2 border-l-transparent px-2 py-2 transition-colors hover:border-l-[#D7E9EE] hover:bg-[#F7FBFD]"
                        >
                          <div className="min-w-0">
                            <p className={`text-[13px] text-[#10243E] ${update.emphasis ? "font-medium" : ""}`}>{update.title}</p>
                            <p className="mt-0.5 text-[12px] leading-5 text-[#61758B]">{update.detail}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[13px] text-[#5B7A8A]">Local</p>
                    <div className="mt-2 space-y-1">
                      {updates.localUpdates.map((update) => (
                        <Link
                          key={update.id}
                          href={update.href}
                          className="block border-l-2 border-l-transparent px-2 py-2 transition-colors hover:border-l-[#F2D3A8] hover:bg-[#FFF8F1]"
                        >
                          <div className="min-w-0">
                            <p className={`text-[13px] text-[#10243E] ${update.emphasis ? "font-medium" : ""}`}>{update.title}</p>
                            <p className="mt-0.5 text-[12px] leading-5 text-[#61758B]">{update.detail}</p>
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
