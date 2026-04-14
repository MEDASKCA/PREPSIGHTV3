"use client"

import Link from "next/link"
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import AppMenuContent from "@/components/AppMenuContent"
import AppTopBar from "@/components/AppTopBar"
import WorkspaceNavRail from "@/components/WorkspaceNavRail"
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

type TreeAccumulator = {
  cards: Procedure[]
  branches: Map<string, TreeAccumulator>
}

function createTreeAccumulator(): TreeAccumulator {
  return {
    cards: [],
    branches: new Map<string, TreeAccumulator>(),
  }
}

function getLibraryDisplayName(name: string) {
  return name.replace(/^PrepSight\s+/i, "").trim() || name
}

function getLibraryOwnerLabel(library?: { libraryType: "shared" | "local"; ownerName: string; ownerPublicAlias?: string }) {
  if (!library) return ""
  if (library.libraryType === "shared") return library.ownerPublicAlias?.trim() || library.ownerName
  return library.ownerName
}

function getProcedureClassBucket(card: Procedure): string | null {
  const text = `${card.name} ${card.variantLabel ?? ""} ${card.description ?? ""}`.toLowerCase()

  if (text.includes("robotic") || text.includes("patient specific instrumentation")) {
    return "Robotic / Assisted"
  }
  if (text.includes("revision") || text.includes("reconstruction") || text.includes("periprosthetic") || text.includes("resection arthroplasty")) {
    return "Revision / Reconstruction"
  }
  if (text.includes("direct anterior") || text.includes("posterior approach")) {
    return "Approach / Technique"
  }
  if (text.includes("unicompartmental") || text.includes("resurfacing")) {
    return "Partial / Resurfacing"
  }
  if (text.includes("stemless") || text.includes("dual mobility") || text.includes("constrained") || text.includes("rotating hinge") || text.includes("convertible") || text.includes("ceramic-on-ceramic") || text.includes("stemmed")) {
    return "Special Constructs"
  }
  if (text.includes("primary") || text.includes("total") || text.includes("cemented") || text.includes("cementless") || text.includes("hybrid")) {
    return "Primary"
  }
  return null
}

function getAdditionalBranchPath(card: Procedure, anatomyGroup: string | null): string[] {
  if (anatomyGroup !== "Whole Joint") return []

  const procedureClass = getProcedureClassBucket(card)
  return procedureClass ? [procedureClass] : []
}

function buildBranchTree(parentId: string, accumulator: TreeAccumulator): TreeBranch[] {
  return [...accumulator.branches.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([label, node]) => ({
      id: `${parentId}:${label}`,
      label,
      cards: [...node.cards].sort((left, right) => left.name.localeCompare(right.name)),
      branches: buildBranchTree(`${parentId}:${label}`, node),
    }))
}

function FolderBadge({
  tone,
  open = false,
  size = "md",
}: {
  tone: "global" | "local"
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
      : {
          body: open ? "#60C7C8" : "#4ABABB",
          tab: open ? "#9EE6E1" : "#87DDD8",
          edge: "#349FA0",
          flap: "#DDF8F4",
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
  children: ReactNode
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

function TreeLeafList({
  cards,
  libraryId,
  className = "ml-3",
  compact = false,
}: {
  cards: Procedure[]
  libraryId: string
  className?: string
  compact?: boolean
}) {
  return (
    <div className={className}>
      {cards.map((card, index) => (
        <TreeBranchNode
          key={card.id}
          isLast={index === cards.length - 1}
          lineColor="#6FD3EA"
          nodeColor="#2FB8D6"
          compact={compact}
        >
          <Link
            href={`/libraries/${libraryId}/cards/${card.id}`}
            className="block py-1 text-[14px] leading-6 text-[#10243E] transition-colors hover:text-[#0F4C5C] lg:text-[15px]"
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
  folderTone,
  compact = false,
}: {
  group: TreeGroup
  libraryId: string
  isBranchExpanded: (branchId: string) => boolean
  toggleBranch: (branchId: string) => void
  folderTone: "global" | "local"
  compact?: boolean
}) {
  const directRows = [
    ...group.branches.map((branch) => ({ type: "branch" as const, branch })),
    ...(group.cards.length > 0 ? [{ type: "cards" as const }] : []),
  ]

  return (
    <div className="border-t border-[#E8EFF6] px-4 py-2">
      <div className="ml-3">
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
                compact={compact}
              >
                <button
                  type="button"
                  onClick={() => toggleBranch(branch.id)}
                  className="flex w-full items-center justify-between gap-3 py-1 text-left font-normal"
                >
                  <div className="flex items-center gap-2">
                    <FolderBadge tone={folderTone} open={isBranchExpanded(branch.id)} size="md" />
                    <p className="text-[14px] leading-5 font-normal text-[#10243E]">
                      {branch.label}
                    </p>
                  </div>
                  <span className={`text-[12px] leading-none text-[#0077B6] transition-transform lg:hidden ${isBranchExpanded(branch.id) ? "rotate-180" : ""}`}>▼</span>
                  <ChevronDown
                    size={14}
                    className={`hidden shrink-0 text-[#406175] transition-transform lg:block ${isBranchExpanded(branch.id) ? "rotate-180" : ""}`}
                  />
                </button>

                {isBranchExpanded(branch.id) ? (
                  <TreeBranchContent
                  branch={branch}
                  libraryId={libraryId}
                  isBranchExpanded={isBranchExpanded}
                  toggleBranch={toggleBranch}
                  folderTone={folderTone}
                  compact={compact}
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
              compact={compact}
            >
              <p className="py-1 text-[14px] leading-5 font-normal text-[#10243E]">Procedures</p>
              <TreeLeafList cards={group.cards} libraryId={libraryId} compact={compact} />
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
  folderTone,
  compact = false,
}: {
  branch: TreeBranch
  libraryId: string
  isBranchExpanded: (branchId: string) => boolean
  toggleBranch: (branchId: string) => void
  folderTone: "global" | "local"
  compact?: boolean
}) {
  const directRows = [
    ...branch.branches.map((child) => ({ type: "branch" as const, branch: child })),
    ...(branch.cards.length > 0 ? [{ type: "cards" as const }] : []),
  ]

  return (
    <div className={compact ? "ml-2" : "ml-7"}>
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
              compact={compact}
            >
              <button
              type="button"
              onClick={() => toggleBranch(child.id)}
              className="flex w-full items-center justify-between gap-3 py-1 text-left font-normal"
            >
                <div className="flex items-center gap-2">
                  <FolderBadge tone={folderTone} open={expanded} size="md" />
                  <p className="text-[14px] leading-5 font-normal text-[#10243E]">
                    {child.label}
                  </p>
                </div>
                <span className={`text-[12px] leading-none text-[#0077B6] transition-transform lg:hidden ${expanded ? "rotate-180" : ""}`}>▼</span>
                <ChevronDown
                  size={14}
                  className={`hidden shrink-0 text-[#406175] transition-transform lg:block ${expanded ? "rotate-180" : ""}`}
                />
              </button>

              {expanded ? (
                <TreeBranchContent
                  branch={child}
                  libraryId={libraryId}
                  isBranchExpanded={isBranchExpanded}
                  toggleBranch={toggleBranch}
                  folderTone={folderTone}
                  compact={compact}
                />
              ) : null}
            </TreeBranchNode>
          )
        }

        return (
          <div key={`${branch.id}:cards`}>
            <TreeLeafList cards={branch.cards} libraryId={libraryId} className="" compact={compact} />
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
  const [mobileExpandedGroups, setMobileExpandedGroups] = useState<Record<string, boolean>>({})
  const [mobileExpandedBranches, setMobileExpandedBranches] = useState<Record<string, boolean>>({})
  const contributorCount = library?.libraryType === "shared" ? 3 : 1
  const displayName = library ? getLibraryDisplayName(library.name) : ""
  const ownerLabel = getLibraryOwnerLabel(library)
  const showOwnerName = Boolean(ownerLabel) && ownerLabel.trim().toLowerCase() !== "prepsight"
  const collapseHierarchyByDefault = library?.libraryType === "shared"
  const folderTone = library?.libraryType === "local" ? "local" : "global"

  const tree = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const groupMap = new Map<string, TreeAccumulator>()

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
      const current = groupMap.get(specialty) ?? createTreeAccumulator()
      const path = [
        ...(subspecialty && subspecialty !== specialty ? [subspecialty] : []),
        ...(anatomyGroup && anatomyGroup !== subspecialty ? [anatomyGroup] : []),
        ...getAdditionalBranchPath(card, anatomyGroup),
      ]

      let cursor = current
      for (const segment of path) {
        const next = cursor.branches.get(segment) ?? createTreeAccumulator()
        cursor.branches.set(segment, next)
        cursor = next
      }
      cursor.cards.push(card)

      groupMap.set(specialty, current)
    }

    return [...groupMap.entries()]
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([label, value]): TreeGroup => ({
        id: `group:${label}`,
        label,
        cards: [...value.cards].sort((left, right) => left.name.localeCompare(right.name)),
        branches: buildBranchTree(`branch:${label}`, value),
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

  function isMobileGroupExpanded(groupId: string) {
    if (mobileExpandedGroups[groupId] !== undefined) return mobileExpandedGroups[groupId]
    return false
  }

  function toggleMobileGroup(groupId: string) {
    setMobileExpandedGroups((current) => ({
      ...current,
      [groupId]: !isMobileGroupExpanded(groupId),
    }))
  }

  function isMobileBranchExpanded(branchId: string) {
    if (mobileExpandedBranches[branchId] !== undefined) return mobileExpandedBranches[branchId]
    return false
  }

  function toggleMobileBranch(branchId: string) {
    setMobileExpandedBranches((current) => ({
      ...current,
      [branchId]: !isMobileBranchExpanded(branchId),
    }))
  }

  if (!library) {
    return (
      <div className="app-shell-bg flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-lg border border-[#D5DCE3] bg-white px-6 py-7 text-center">
          <p className="text-[14px] text-[#10243E]">Collection not found.</p>
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
        mobileMenuOnly
        menuContent={<AppMenuContent />}
      />

      <main className="w-full px-4 pt-0 pb-4 lg:pl-0 lg:pr-4 lg:pt-4 lg:pb-4">
        <div className="space-y-4 lg:hidden">
          <section className="space-y-2 px-1">
            <div>
              {showOwnerName ? <p className="text-[13px] text-[#5B7A8A]">{ownerLabel}</p> : null}
              <h1 className="mt-1 text-[28px] tracking-[-0.04em] text-[#10243E]">{displayName}</h1>
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
                      className="inline-flex rounded-[10px] border border-[#0F4C5C] bg-[#0F4C5C] px-3 py-2 text-[13px] font-medium text-white"
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
                    onClick={() => toggleMobileGroup(group.id)}
                    className="flex w-full items-center justify-between gap-3 bg-[#F0FAFC] px-4 py-3 text-left font-normal text-[#10243E]"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FolderBadge tone={folderTone} open={isMobileGroupExpanded(group.id)} size="lg" />
                      <p className="pr-2 text-[14px] leading-5 font-normal text-[#10243E]">{group.label}</p>
                      <span className="text-[14px] font-normal text-[#10243E]">{totalForGroup(group)}</span>
                    </div>
                    <span className={`text-[12px] leading-none text-[#0077B6] transition-transform lg:hidden ${isMobileGroupExpanded(group.id) ? "rotate-180" : ""}`}>▼</span>
                    <ChevronDown
                      size={16}
                      className={`hidden shrink-0 text-[#406175] transition-transform lg:block ${isMobileGroupExpanded(group.id) ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isMobileGroupExpanded(group.id) ? (
                    <TreeGroupContent
                      group={group}
                      libraryId={library.id}
                      isBranchExpanded={isMobileBranchExpanded}
                      toggleBranch={toggleMobileBranch}
                      folderTone={folderTone}
                      compact
                    />
                  ) : null}
                </section>
              ))
            )}
          </div>
        </div>

        <div className={`hidden lg:grid lg:gap-4 ${desktopNavOpen ? "lg:grid-cols-[210px_minmax(0,1fr)_300px]" : "lg:grid-cols-[minmax(0,1fr)_300px]"}`}>
          {desktopNavOpen ? <WorkspaceNavRail currentNav="collections" /> : null}

          <div className="min-w-0 space-y-2">
            <section className="space-y-2 px-1">
              <div>
                {showOwnerName ? <p className="text-[13px] text-[#5B7A8A]">{ownerLabel}</p> : null}
                <h1 className="mt-1 text-[30px] tracking-[-0.04em] text-[#10243E]">{displayName}</h1>
              </div>
            </section>

            <section className="overflow-x-auto border-b border-[#BFEAF5]">
              <nav className="flex min-w-max items-center gap-6 text-[14px] text-[#406175]">
                <div className="border-b-2 border-[#0F4C5C] px-1 py-3 text-[#10243E]">Procedures {cards.length}</div>
                <div className="px-1 py-3">Contributors {contributorCount}</div>
              </nav>
            </section>

            <section className="overflow-hidden rounded-[12px] border border-[#DCEAF0] bg-white shadow-[0_12px_30px_-26px_rgba(16,36,62,0.28)]">
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
                          className="inline-flex rounded-[10px] border border-[#0F4C5C] bg-[#0F4C5C] px-3 py-2 text-[13px] font-medium text-white"
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
                          <FolderBadge tone={folderTone} open={isGroupExpanded(group.id)} size="lg" />
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
                          folderTone={folderTone}
                        />
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <aside className="min-w-0">
            <div className="overflow-hidden rounded-[12px] border border-[#DCEAF0] bg-white shadow-[0_12px_30px_-26px_rgba(16,36,62,0.28)]">
              <div className="border-b border-[#D7E9EE] bg-[#10243E] px-4 py-3 text-[14px] text-white">PrepSight Library</div>
              <div className="divide-y divide-[#E8EFF6]">
                {sharedCards.slice(0, 8).map((card) => (
                  <Link
                    key={card.id}
                    href={`/libraries/${sharedLibraryId}/cards/${card.id}`}
                    className="block px-3 py-2 text-left transition-colors hover:bg-[#F4FBFF]"
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
