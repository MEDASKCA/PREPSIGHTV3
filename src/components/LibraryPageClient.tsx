"use client"

import Link from "next/link"
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react"
import { ChevronDown, Folder, FolderOpen } from "lucide-react"
import AppMenuContent from "@/components/AppMenuContent"
import AppTopBar from "@/components/AppTopBar"
import {
  getLibrariesSnapshot,
  getLibraryByIdSnapshot,
  getLibraryCardsSnapshot,
  getSharedLibraryId,
  subscribeLibraries,
} from "@/lib/libraries"
import { getProfile, getRelevantSettings } from "@/lib/profile"
import { getAnatomyNameById, getServiceLineNameById } from "@/lib/operating-theatre-taxonomy"
import { CLINICAL_SETTINGS } from "@/lib/settings"
import type { ClinicalSetting, Procedure } from "@/lib/types"

function getSpecialtyLabel(card: Procedure) {
  return card.specialty || card.setting || "General"
}

function getSubspecialtyLabel(card: Procedure) {
  return card.service_line_id ? getServiceLineNameById(card.service_line_id)?.trim() || null : null
}

function getAnatomyGroupLabel(card: Procedure) {
  return card.subanatomy_group?.trim() || (card.anatomy_id ? getAnatomyNameById(card.anatomy_id)?.trim() || null : null)
}

interface TreeBranch {
  id: string
  label: string
  cards: Procedure[]
  branches: TreeBranch[]
}

interface TreeGroup {
  id: string
  label: string
  cards: Procedure[]
  branches: TreeBranch[]
}

type TreeBranchMap = Map<string, Procedure[] | Map<string, Procedure[]>>
type TreeGroupAccumulator = {
  cards: Procedure[]
  branches: TreeBranchMap
}

function getLibraryDisplayName(name: string) {
  return name.replace(/^PrepSight\s+/i, "").trim() || name
}

function getLibraryOwnerLabel(library?: { libraryType: "shared" | "local"; ownerName: string; ownerPublicAlias?: string }) {
  if (!library) return ""
  if (library.libraryType === "shared") return library.ownerPublicAlias?.trim() || library.ownerName
  return library.ownerName
}

function TreeBranchNode({
  children,
  isLast,
  nodeColor,
  lineColor,
}: {
  children: ReactNode
  isLast: boolean
  nodeColor: string
  lineColor: string
}) {
  return (
    <div className="relative pl-7">
      <div className="absolute left-0 top-0 bottom-0 w-5">
        {!isLast ? <div className="absolute left-[7px] top-0 bottom-0 w-px" style={{ backgroundColor: lineColor }} /> : null}
        <div className="absolute left-[7px] top-0 h-[15px] w-px" style={{ backgroundColor: lineColor }} />
        <div className="absolute left-[7px] top-[15px] h-px w-[8px]" style={{ backgroundColor: lineColor }} />
        <div
          className="absolute left-[15px] top-[12px] h-[5px] w-[5px] rounded-full"
          style={{ backgroundColor: nodeColor }}
        />
      </div>
      {children}
    </div>
  )
}

function TreeLeafList({
  cards,
  libraryId,
  className = "ml-3",
}: {
  cards: Procedure[]
  libraryId: string
  className?: string
}) {
  return (
    <div className={className}>
      {cards.map((card, index) => (
        <TreeBranchNode
          key={card.id}
          isLast={index === cards.length - 1}
          lineColor="#6FD3EA"
          nodeColor="#2FB8D6"
        >
          <Link
            href={`/libraries/${libraryId}/cards/${card.id}`}
            className="block py-1 text-[15px] text-[#10243E] transition-colors hover:text-[#0F4C5C]"
          >
            {card.name}
          </Link>
        </TreeBranchNode>
      ))}
    </div>
  )
}

function TreeGroupContent({
  group,
  libraryId,
  isBranchExpanded,
  toggleBranch,
}: {
  group: TreeGroup
  libraryId: string
  isBranchExpanded: (branchId: string) => boolean
  toggleBranch: (branchId: string) => void
}) {
  const directRows = [
    ...group.branches.map((branch) => ({ type: "branch" as const, branch })),
    ...(group.cards.length > 0 ? [{ type: "cards" as const }] : []),
  ]

  return (
    <div className="border-t border-[#E8EFF6] px-4 py-2">
      <div className="ml-1">
        {directRows.map((row, index) => {
          const isLast = index === directRows.length - 1

          if (row.type === "branch") {
            const { branch } = row

            return (
              <TreeBranchNode
                key={branch.id}
                isLast={isLast}
                lineColor="#2FB8D6"
                nodeColor="#0F9FC1"
              >
                <button
                  type="button"
                  onClick={() => toggleBranch(branch.id)}
                  className="flex w-full items-center justify-between gap-3 py-1 text-left font-normal"
                >
                  <p className="text-[14px] font-normal text-[#10243E]">
                    {branch.label}
                  </p>
                  <ChevronDown
                    size={14}
                    className={`shrink-0 text-[#406175] transition-transform ${isBranchExpanded(branch.id) ? "rotate-180" : ""}`}
                  />
                </button>

                {isBranchExpanded(branch.id) ? (
                  <TreeBranchContent
                    branch={branch}
                    libraryId={libraryId}
                    isBranchExpanded={isBranchExpanded}
                    toggleBranch={toggleBranch}
                  />
                ) : null}
              </TreeBranchNode>
            )
          }

          return (
            <TreeBranchNode
              key={`${group.id}:cards`}
              isLast={isLast}
              lineColor="#2FB8D6"
              nodeColor="#0F9FC1"
            >
              <p className="py-1 text-[14px] font-normal text-[#10243E]">Procedures</p>
              <TreeLeafList cards={group.cards} libraryId={libraryId} />
            </TreeBranchNode>
          )
        })}
      </div>
    </div>
  )
}

function TreeBranchContent({
  branch,
  libraryId,
  isBranchExpanded,
  toggleBranch,
}: {
  branch: TreeBranch
  libraryId: string
  isBranchExpanded: (branchId: string) => boolean
  toggleBranch: (branchId: string) => void
}) {
  const directRows = [
    ...branch.branches.map((child) => ({ type: "branch" as const, branch: child })),
    ...(branch.cards.length > 0 ? [{ type: "cards" as const }] : []),
  ]

  return (
    <div className="ml-3">
      {directRows.map((row, index) => {
        const isLast = index === directRows.length - 1

        if (row.type === "branch") {
          const { branch: child } = row
          const expanded = isBranchExpanded(child.id)

          return (
            <TreeBranchNode
              key={child.id}
              isLast={isLast}
              lineColor="#6FD3EA"
              nodeColor="#2FB8D6"
            >
              <button
                type="button"
                onClick={() => toggleBranch(child.id)}
                className="flex w-full items-center justify-between gap-3 py-1 text-left font-normal"
              >
                <p className="text-[14px] font-normal text-[#10243E]">
                  {child.label}
                </p>
                <ChevronDown
                  size={14}
                  className={`shrink-0 text-[#406175] transition-transform ${expanded ? "rotate-180" : ""}`}
                />
              </button>

              {expanded ? (
                <TreeBranchContent
                  branch={child}
                  libraryId={libraryId}
                  isBranchExpanded={isBranchExpanded}
                  toggleBranch={toggleBranch}
                />
              ) : null}
            </TreeBranchNode>
          )
        }

        return (
          <div key={`${branch.id}:cards`}>
            <TreeLeafList cards={branch.cards} libraryId={libraryId} className="" />
          </div>
        )
      })}
    </div>
  )
}

export default function LibraryPageClient({
  libraryId,
}: {
  libraryId: string
}) {
  const libraries = useSyncExternalStore(
    subscribeLibraries,
    getLibrariesSnapshot,
    getLibrariesSnapshot,
  )
  const profile = getProfile()
  const library = getLibraryByIdSnapshot(libraryId)
  const cards = useMemo(() => getLibraryCardsSnapshot(libraryId), [libraryId, libraries])
  const activeSetting = useMemo<ClinicalSetting>(() => {
    if (library?.libraryType === "shared" && CLINICAL_SETTINGS.includes(library.name as ClinicalSetting)) {
      return library.name as ClinicalSetting
    }
    const settings = profile ? getRelevantSettings(profile) : []
    return settings[0] ?? "Operating Theatre"
  }, [library, profile])
  const sharedLibrary = libraries.find((entry) => entry.libraryType === "shared" && entry.name === activeSetting)
  const sharedCards = sharedLibrary ? getLibraryCardsSnapshot(sharedLibrary.id) : []
  const sharedLibraryId = sharedLibrary?.id ?? getSharedLibraryId(activeSetting)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [desktopNavOpen, setDesktopNavOpen] = useState(true)
  const [query, setQuery] = useState("")
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({})
  const contributorCount = library?.libraryType === "shared" ? 3 : 1
  const displayName = library ? getLibraryDisplayName(library.name) : ""
  const ownerLabel = getLibraryOwnerLabel(library)
  const showOwnerName = Boolean(ownerLabel) && ownerLabel.trim().toLowerCase() !== "prepsight"
  const collapseHierarchyByDefault = library?.libraryType === "shared"

  const tree = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const groupMap = new Map<string, TreeGroupAccumulator>()

    for (const card of cards) {
      if (
        normalizedQuery &&
        !`${card.name} ${card.specialty} ${card.implantSystem ?? ""} ${getSubspecialtyLabel(card) ?? ""} ${getAnatomyGroupLabel(card) ?? ""}`.toLowerCase().includes(normalizedQuery)
      ) {
        continue
      }
      const specialty = getSpecialtyLabel(card)
      const subspecialty = getSubspecialtyLabel(card)
      const anatomyGroup = getAnatomyGroupLabel(card)
      const current = groupMap.get(specialty) ?? { cards: [], branches: new Map<string, Procedure[] | Map<string, Procedure[]>>() as TreeBranchMap }

      if (subspecialty && subspecialty !== specialty) {
        const existing = current.branches.get(subspecialty)

        if (anatomyGroup && anatomyGroup !== subspecialty) {
          const anatomyMap = existing instanceof Map ? existing : new Map<string, Procedure[]>()
          const anatomyCards = anatomyMap.get(anatomyGroup) ?? []
          anatomyCards.push(card)
          anatomyMap.set(anatomyGroup, anatomyCards)
          current.branches.set(subspecialty, anatomyMap)
        } else {
          const branchCards = Array.isArray(existing) ? existing : []
          branchCards.push(card)
          current.branches.set(subspecialty, branchCards)
        }
      } else {
        current.cards.push(card)
      }

      groupMap.set(specialty, current)
    }

    return [...groupMap.entries()]
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([label, value]): TreeGroup => ({
        id: `group:${label}`,
        label,
        cards: [...value.cards].sort((left, right) => left.name.localeCompare(right.name)),
        branches: [...value.branches.entries()]
          .sort((left, right) => left[0].localeCompare(right[0]))
          .map(([branchLabel, branchValue]) => ({
            id: `branch:${label}:${branchLabel}`,
            label: branchLabel,
            cards: Array.isArray(branchValue)
              ? [...branchValue].sort((left, right) => left.name.localeCompare(right.name))
              : [],
            branches: branchValue instanceof Map
              ? [...branchValue.entries()]
                  .sort((left, right) => left[0].localeCompare(right[0]))
                  .map(([childLabel, childCards]) => ({
                    id: `branch:${label}:${branchLabel}:${childLabel}`,
                    label: childLabel,
                    cards: [...childCards].sort((left, right) => left.name.localeCompare(right.name)),
                    branches: [],
                  }))
              : [],
          })),
      }))
  }, [cards, query])

  function totalForBranch(branch: TreeBranch): number {
    return branch.cards.length + branch.branches.reduce((sum, child) => sum + totalForBranch(child), 0)
  }

  function totalForGroup(group: TreeGroup) {
    return group.cards.length + group.branches.reduce((sum, branch) => sum + totalForBranch(branch), 0)
  }

  function isGroupExpanded(groupId: string) {
    if (expandedGroups[groupId] !== undefined) return expandedGroups[groupId]
    return !collapseHierarchyByDefault
  }

  function toggleGroup(groupId: string) {
    setExpandedGroups((current) => ({
      ...current,
      [groupId]: !isGroupExpanded(groupId),
    }))
  }

  function toggleBranch(branchId: string) {
    setExpandedBranches((current) => ({
      ...current,
      [branchId]: !(current[branchId] ?? !collapseHierarchyByDefault),
    }))
  }

  function isBranchExpanded(branchId: string) {
    if (expandedBranches[branchId] !== undefined) return expandedBranches[branchId]
    return !collapseHierarchyByDefault
  }

  function handleToggleNavigation() {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      setDesktopNavOpen((value) => !value)
      return
    }
    setMobileMenuOpen((value) => !value)
  }

  if (!library) {
    return (
      <div className="app-shell-bg flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-lg border border-[#D5DCE3] bg-white px-6 py-7 text-center">
          <p className="text-[14px] text-[#10243E]">Repository not found.</p>
          <Link href="/" className="mt-4 inline-flex border border-[#10243E] px-4 py-2 text-[13px] text-[#10243E]">
            Return to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell-bg min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#E5F5F8_0%,#F4FAFC_40%,#F4F7FA_100%)]">
      <AppTopBar
        menuOpen={mobileMenuOpen}
        onToggleMenu={handleToggleNavigation}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Find a procedure, branch, or version..."
        menuContent={<AppMenuContent />}
      />

      <main className="w-full px-4 py-6 lg:px-6 lg:py-6">
        <div className="space-y-6 lg:hidden">
          <section className="space-y-3 rounded-[3px] border border-[#7FD3E4] bg-[#2E9FBE] px-4 py-5 shadow-[0_14px_28px_-26px_rgba(16,36,62,0.22)]">
            <div>
              {showOwnerName ? <p className="text-[13px] text-[#D9F6FB]">{ownerLabel}</p> : null}
              <h1 className="mt-1 text-[28px] tracking-[-0.04em] text-white">{displayName}</h1>
            </div>
          </section>

          <section className="overflow-x-auto border-b border-[#BFEAF5]">
            <nav className="flex min-w-max items-center gap-6 text-[14px] text-[#406175]">
              <div className="border-b-2 border-[#0F4C5C] px-1 py-3 text-[#10243E]">Procedures {cards.length}</div>
              <div className="px-1 py-3">Contributors {contributorCount}</div>
            </nav>
          </section>

          <div className="-mx-4 border-y border-[#C2DFE7] bg-white">
            {tree.length === 0 ? (
              <div className="px-4 py-5 text-[14px] text-[#61758B]">
                {library.libraryType === "local" ? (
                  <div className="space-y-3">
                    <p>Your hospital hasn&apos;t added any procedures yet.</p>
                    <p>Browse the PrepSight Library to find a procedure and adapt it for your team.</p>
                    <Link
                      href={`/libraries/${sharedLibraryId}`}
                      className="inline-flex border border-[#0F4C5C] bg-[#0F4C5C] px-3 py-2 text-[13px] font-medium text-white"
                    >
                      Browse PrepSight Library
                    </Link>
                  </div>
                ) : (
                  <p>No procedures are available here yet.</p>
                )}
              </div>
            ) : (
              tree.map((group) => (
                <section key={group.id}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="flex w-full items-center justify-between gap-3 bg-[#F0FAFC] px-4 py-3 text-left font-normal text-[#10243E]"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {isGroupExpanded(group.id) ? (
                        <FolderOpen size={16} className="shrink-0 text-[#0F9FC1]" />
                      ) : (
                        <Folder size={16} className="shrink-0 text-[#0F9FC1]" />
                      )}
                      <p className="truncate text-[14px] font-normal text-[#10243E]">{group.label}</p>
                      <span className="text-[14px] font-normal text-[#10243E]">{totalForGroup(group)}</span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-[#406175] transition-transform ${isGroupExpanded(group.id) ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isGroupExpanded(group.id) ? (
                    <TreeGroupContent
                      group={group}
                      libraryId={library.id}
                      isBranchExpanded={isBranchExpanded}
                      toggleBranch={toggleBranch}
                    />
                  ) : null}
                </section>
              ))
            )}
          </div>
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
            <section className="space-y-3 rounded-[3px] border border-[#7FD3E4] bg-[#2E9FBE] px-6 py-6 shadow-[0_14px_28px_-26px_rgba(16,36,62,0.22)]">
              <div>
                {showOwnerName ? <p className="text-[13px] text-[#D9F6FB]">{ownerLabel}</p> : null}
                <h1 className="mt-1 text-[30px] tracking-[-0.04em] text-white">{displayName}</h1>
              </div>
            </section>

            <section className="overflow-x-auto border-b border-[#BFEAF5]">
              <nav className="flex min-w-max items-center gap-6 text-[14px] text-[#406175]">
                <div className="border-b-2 border-[#0F4C5C] px-1 py-3 text-[#10243E]">Procedures {cards.length}</div>
                <div className="px-1 py-3">Contributors {contributorCount}</div>
              </nav>
            </section>

            <section className="overflow-hidden rounded-[3px] border border-[#C2DFE7] bg-white shadow-[0_14px_28px_-26px_rgba(16,36,62,0.18)]">
              <div className="border-b border-[#D7E9EE] bg-[#10243E] px-4 py-3 text-[14px] text-white">
                Specialty hierarchy
              </div>

              <div>
                {tree.length === 0 ? (
                  <div className="px-4 py-5 text-[14px] text-[#61758B]">
                    {library.libraryType === "local" ? (
                      <div className="space-y-3">
                        <p>Your hospital hasn&apos;t added any procedures yet.</p>
                        <p>Browse the PrepSight Library to find a procedure and adapt it for your team.</p>
                        <Link
                          href={`/libraries/${sharedLibraryId}`}
                          className="inline-flex border border-[#0F4C5C] bg-[#0F4C5C] px-3 py-2 text-[13px] font-medium text-white"
                        >
                          Browse PrepSight Library
                        </Link>
                      </div>
                    ) : (
                      <p>No procedures are available here yet.</p>
                    )}
                  </div>
                ) : (
                  tree.map((group) => (
                    <div key={group.id} className="border-b border-[#E8EFF6] last:border-b-0">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className="flex w-full items-center justify-between gap-3 bg-[#F8FBFD] px-4 py-2 text-left font-normal"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          {isGroupExpanded(group.id) ? (
                            <FolderOpen size={16} className="shrink-0 text-[#0F9FC1]" />
                          ) : (
                            <Folder size={16} className="shrink-0 text-[#0F9FC1]" />
                          )}
                          <p className="truncate text-[14px] font-normal text-[#10243E]">
                            {group.label}
                          </p>
                      <span className="text-[14px] font-normal text-[#10243E]">{totalForGroup(group)}</span>
                        </div>
                        <ChevronDown
                          size={16}
                          className={`shrink-0 text-[#406175] transition-transform ${isGroupExpanded(group.id) ? "rotate-180" : ""}`}
                        />
                      </button>

                      {isGroupExpanded(group.id) ? (
                        <TreeGroupContent
                          group={group}
                          libraryId={library.id}
                          isBranchExpanded={isBranchExpanded}
                          toggleBranch={toggleBranch}
                        />
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <aside className="min-w-0">
            <div className="overflow-hidden rounded-[3px] border border-[#C2DFE7] bg-white shadow-[0_14px_28px_-26px_rgba(16,36,62,0.18)]">
              <div className="border-b border-[#E8EFF6] bg-[#10243E] px-4 py-3 text-[14px] text-white">PrepSight Library</div>
              <div className="divide-y divide-[#E8EFF6]">
                {sharedCards.slice(0, 8).map((card) => (
                  <Link
                    key={card.id}
                    href={`/libraries/${sharedLibraryId}/cards/${card.id}`}
                    className="block px-4 py-2 text-left transition-colors hover:bg-[#F4FBFF]"
                  >
                    <p className="truncate text-[15px] text-[#10243E]">{card.name}</p>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
