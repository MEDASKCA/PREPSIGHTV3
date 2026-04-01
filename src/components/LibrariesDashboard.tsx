"use client"

import Link from "next/link"
import { useMemo, useState, useSyncExternalStore } from "react"
import { ChevronDown, Folder, FolderOpen } from "lucide-react"
import AppMenuContent from "@/components/AppMenuContent"
import AppTopBar from "@/components/AppTopBar"
import { getLibrariesSnapshot, getLibraryCardsSnapshot, subscribeLibraries } from "@/lib/libraries"
import { getProfile, getRelevantSettings } from "@/lib/profile"

function formatMeta(cardCount: number, typeLabel: string) {
  return `${cardCount} procedure${cardCount === 1 ? "" : "s"} · ${typeLabel}`
}

function getLibraryTypeLabel(library: { libraryType: "shared" | "local"; ownerName: string }) {
  return library.libraryType === "shared" ? "PrepSight Library" : `${library.ownerName} Library`
}

function getLibraryOwnerLabel(library: { libraryType: "shared" | "local"; ownerName: string; ownerPublicAlias?: string }) {
  return library.libraryType === "shared"
    ? library.ownerPublicAlias?.trim() || library.ownerName
    : library.ownerName
}

export default function LibrariesDashboard() {
  const libraries = useSyncExternalStore(
    subscribeLibraries,
    getLibrariesSnapshot,
    getLibrariesSnapshot,
  )
  const [query, setQuery] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [desktopNavOpen, setDesktopNavOpen] = useState(true)
  const [globalOpen, setGlobalOpen] = useState(true)
  const [localOpen, setLocalOpen] = useState(true)
  const workspaceLabel = useMemo(() => {
    const profile = getProfile()
    const settings = profile ? getRelevantSettings(profile) : []
    return settings[0] ?? "Operating Theatre"
  }, [])

  function handleToggleNavigation() {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      setDesktopNavOpen((value) => !value)
      return
    }
    setMobileMenuOpen((value) => !value)
  }

  const { filteredLibraries, totalCards, globalLibraries, localLibraries } = useMemo(() => {
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
      globalLibraries: libraries.filter((library) => library.libraryType === "shared"),
      localLibraries: libraries.filter((library) => library.libraryType === "local"),
    }
  }, [libraries, query])

  const filteredGlobalLibraries = filteredLibraries.filter((library) => library.libraryType === "shared")
  const filteredLocalLibraries = filteredLibraries.filter((library) => library.libraryType === "local")

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
          <section className="rounded-[22px] border border-[#B8DEE6] bg-[linear-gradient(135deg,#0F4C5C_0%,#15728A_58%,#2A96A8_100%)] px-4 py-5 shadow-[0_20px_44px_-28px_rgba(16,36,62,0.5)]">
            <p className="text-[12px] uppercase tracking-[0.16em] text-[#BDEBF3]">Workspace</p>
            <h1 className="mt-1 text-[32px] tracking-[-0.04em] text-white">{workspaceLabel}</h1>
            <p className="mt-2 text-[14px] text-[#D7F2F7]">
              {libraries.length} repositories · {totalCards} procedure repositories
            </p>
          </section>

          <section>
            <div className="px-1">
              <h2 className="whitespace-nowrap text-[20px] tracking-[-0.02em] text-[#10243E]">Repositories</h2>
            </div>

            <div className="mt-3 px-1">
              <div>
                <div className="px-3 pb-2">
                  <button
                    type="button"
                    onClick={() => setGlobalOpen((value) => !value)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-center gap-2 text-[18px] font-medium tracking-[-0.02em] text-[#0F4C5C]">
                      {globalOpen ? (
                        <FolderOpen size={18} className="shrink-0 text-[#0F9FC1]" />
                      ) : (
                        <Folder size={18} className="shrink-0 text-[#0F9FC1]" />
                      )}
                      <span>Global</span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-[#406175] transition-transform ${globalOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <div className="mt-1 text-[13px] text-[#406175]">
                    Shared repositories available across PrepSight.
                  </div>
                </div>
                {globalOpen ? (
                  <div className="ml-[11px] border-l border-[#9FD6E2] pl-4">
                    {filteredGlobalLibraries.map((library) => {
                      const cardCount = getLibraryCardsSnapshot(library.id).length

                      return (
                        <Link
                          key={library.id}
                          href={`/libraries/${library.id}`}
                          className="group block min-w-0 rounded-[14px] px-3 py-3 transition-colors hover:bg-[#F4FBFF]"
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-[11px] h-px w-3 shrink-0 bg-[#9FD6E2]" />
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
                    })}
                  </div>
                ) : null}
              </div>

              <div className="mt-4">
                <div className="border-t border-[#D9EBF0] px-3 pb-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setLocalOpen((value) => !value)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-center gap-2 text-[18px] font-medium tracking-[-0.02em] text-[#10243E]">
                      {localOpen ? (
                        <FolderOpen size={18} className="shrink-0 text-[#0F9FC1]" />
                      ) : (
                        <Folder size={18} className="shrink-0 text-[#0F9FC1]" />
                      )}
                      <span>Local</span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-[#61758B] transition-transform ${localOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <div className="mt-1 text-[13px] text-[#61758B]">
                    Repositories specific to your organisation or access scope.
                  </div>
                </div>
                {localOpen ? (
                  <>
                    <div className="px-3 pb-2">
                      <Link href="/" className="inline-block text-[13px] font-medium text-[#0F4C5C]">
                        Request Access to other Repositories
                      </Link>
                    </div>
                    <div className="ml-[11px] border-l border-[#D3E5EB] pl-4">
                      {filteredLocalLibraries.map((library) => {
                        const cardCount = getLibraryCardsSnapshot(library.id).length

                        return (
                          <Link
                            key={library.id}
                            href={`/libraries/${library.id}`}
                            className="group block min-w-0 rounded-[14px] px-3 py-3 transition-colors hover:bg-[#F4FBFF]"
                          >
                            <div className="flex items-start gap-2">
                              <div className="mt-[11px] h-px w-3 shrink-0 bg-[#D3E5EB]" />
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
                      })}
                    </div>
                  </>
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
                <Link href="/" className="block py-2 text-[14px] text-[#10243E]">
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
            <section className="rounded-[24px] border border-[#B8DEE6] bg-[linear-gradient(135deg,#0F4C5C_0%,#15728A_58%,#2A96A8_100%)] px-6 py-6 shadow-[0_22px_46px_-30px_rgba(16,36,62,0.48)]">
              <p className="text-[12px] uppercase tracking-[0.16em] text-[#BDEBF3]">Workspace</p>
              <h1 className="mt-1 text-[32px] tracking-[-0.04em] text-white">{workspaceLabel}</h1>
              <p className="mt-2 text-[14px] text-[#D7F2F7]">{libraries.length} repositories · {totalCards} procedure repositories</p>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-4">
                <h2 className="text-[18px] text-[#10243E]">Repositories</h2>
              </div>

              <div className="px-1 py-1">
                <div>
                  <div className="pb-2">
                    <button
                      type="button"
                      onClick={() => setGlobalOpen((value) => !value)}
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-2 text-[18px] font-medium tracking-[-0.02em] text-[#0F4C5C]">
                        {globalOpen ? (
                          <FolderOpen size={18} className="shrink-0 text-[#0F9FC1]" />
                        ) : (
                          <Folder size={18} className="shrink-0 text-[#0F9FC1]" />
                        )}
                        <span>Global</span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`shrink-0 text-[#406175] transition-transform ${globalOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    <div className="mt-1 text-[13px] text-[#406175]">
                      Shared repositories available across PrepSight.
                    </div>
                  </div>
                  {globalOpen ? (
                    <div className="ml-[11px] border-l border-[#9FD6E2] pl-4">
                      {filteredGlobalLibraries.slice(0, 8).map((library) => {
                        const cardCount = getLibraryCardsSnapshot(library.id).length

                        return (
                          <Link
                            key={library.id}
                            href={`/libraries/${library.id}`}
                            className="group block py-3 transition-colors hover:bg-[#F4FBFF]"
                          >
                            <div className="flex items-start gap-2">
                              <div className="mt-[11px] h-px w-3 shrink-0 bg-[#9FD6E2]" />
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
                      })}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4">
                  <div className="border-t border-[#D9EBF0] pb-2 pt-4">
                    <button
                      type="button"
                      onClick={() => setLocalOpen((value) => !value)}
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-2 text-[18px] font-medium tracking-[-0.02em] text-[#10243E]">
                        {localOpen ? (
                          <FolderOpen size={18} className="shrink-0 text-[#0F9FC1]" />
                        ) : (
                          <Folder size={18} className="shrink-0 text-[#0F9FC1]" />
                        )}
                        <span>Local</span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`shrink-0 text-[#61758B] transition-transform ${localOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    <div className="mt-1 text-[13px] text-[#61758B]">
                      Repositories specific to your organisation or access scope.
                    </div>
                  </div>
                  {localOpen ? (
                    <>
                      <div className="pb-2">
                        <Link href="/" className="inline-block text-[13px] font-medium text-[#0F4C5C]">
                          Request Access to other Repositories
                        </Link>
                      </div>
                      <div className="ml-[11px] border-l border-[#D3E5EB] pl-4">
                        {filteredLocalLibraries.slice(0, 8).map((library) => {
                          const cardCount = getLibraryCardsSnapshot(library.id).length

                          return (
                            <Link
                              key={library.id}
                              href={`/libraries/${library.id}`}
                              className="group block py-3 transition-colors hover:bg-[#F4FBFF]"
                            >
                              <div className="flex items-start gap-2">
                                <div className="mt-[11px] h-px w-3 shrink-0 bg-[#D3E5EB]" />
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
                        })}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </section>
          </div>

          <aside className="min-w-0">
            <div className="overflow-hidden rounded-[24px] border border-[#C2DFE7] bg-white shadow-[0_20px_42px_-32px_rgba(16,36,62,0.35)]">
              <div className="border-b border-[#E8EFF6] bg-[#10243E] px-4 py-3 text-[14px] text-white">
                Workspace
              </div>
              <div className="space-y-2 px-4 py-3 text-[13px] text-[#61758B]">
                <p>{libraries.length} repositories</p>
                <p>{totalCards} procedure repositories</p>
                <p>{globalLibraries.length} global</p>
                <p>{localLibraries.length} local</p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
