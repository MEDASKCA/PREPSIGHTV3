"use client"

import Link from "next/link"
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react"
import TriangleIcon from "@/components/TriangleIcon"
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
import { getActiveTeamSnapshot } from "@/lib/team-workspaces"
import type { ClinicalSetting, Procedure } from "@/lib/types"

type LibraryTab = "procedures" | "updates"

type LibraryUpdateItem = {
  id: string
  title: string
  detail: string
  kindLabel: string
  timestamp: string
  href: string
}

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

function formatUpdateDate(value?: string) {
  if (!value) return "Recently"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Recently"

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000))
  if (diffMinutes < 60) return `${diffMinutes}min ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })
}

function getUpdateContextLabel(card: Procedure) {
  const specialty = getSpecialtyLabel(card)
  const subspecialty = getSubspecialtyLabel(card)
  const anatomyGroup = getAnatomyGroupLabel(card)

  return [specialty, subspecialty, anatomyGroup].filter(Boolean).join(" · ")
}

function normalizeOrganizationName(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function isSameOrganization(cardOrganization: string | undefined, localOrganization: string | undefined) {
  const left = normalizeOrganizationName(cardOrganization)
  const right = normalizeOrganizationName(localOrganization)
  if (!left || !right) return false
  return left.includes(right) || right.includes(left)
}

function getSharedUpdateDetail(card: Procedure, contextLabel: string, localOrganization?: string) {
  if (isSameOrganization(card.sourceOrganizationName, localOrganization)) {
    return `${contextLabel} Â· By ${card.sourceContributorName ?? card.sourceContributorPublicAlias ?? "your team"}`
  }

  return `${contextLabel} Â· ${card.sourceOrganizationPublicAlias ?? "PSH-000"}`
}

function buildLibraryUpdates(
  cards: Procedure[],
  libraryType: "shared" | "local",
  libraryId: string,
  localOrganization?: string,
): LibraryUpdateItem[] {
  const updates = cards.map((card) => {
    const createdAt = card.createdAt ?? card.updatedAt ?? card.publishedAt
    const updatedAt = card.updatedAt ?? card.publishedAt ?? card.createdAt
    const publishedAt = card.publishedAt
    const contextLabel = getUpdateContextLabel(card)
    const href = `/libraries/${libraryId}/cards/${card.id}`

    if (libraryType === "shared") {
      const isNewPublication = Boolean(publishedAt) && publishedAt === updatedAt
      return {
        id: `update:${card.id}:${publishedAt ?? updatedAt ?? createdAt ?? "unknown"}`,
        title: card.name,
        detail: getSharedUpdateDetail(card, contextLabel, localOrganization),
        kindLabel: isNewPublication ? "New" : "Revised",
        timestamp: publishedAt ?? updatedAt ?? createdAt ?? "",
        href,
      }
    }

    const isPublished = card.publishState === "published"
    const isNewDraft = Boolean(createdAt) && createdAt === updatedAt

    return {
      id: `update:${card.id}:${updatedAt ?? createdAt ?? publishedAt ?? "unknown"}`,
      title: card.name,
      detail: isPublished
        ? `${contextLabel} · Shared from ${card.sourceOrganizationName ?? "your workspace"}`
        : isNewDraft
          ? `${contextLabel} · Added to My Team by ${card.sourceContributorName ?? "your team"}`
          : `${contextLabel} · Updated by ${card.sourceContributorName ?? "your team"}`,
      kindLabel: isPublished ? "Published" : isNewDraft ? "New" : "Revised",
      timestamp: updatedAt ?? createdAt ?? publishedAt ?? "",
      href,
    }
  })

  return updates
    .filter((item) => item.timestamp)
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
}

function renderCompactUpdateMeta(update: LibraryUpdateItem) {
  return [update.kindLabel, update.detail, formatUpdateDate(update.timestamp)]
    .filter(Boolean)
    .join(" · ")
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

function MobileTriangle({ open }: { open: boolean }) {
  return (
    <span
      className={`block text-[13px] leading-none text-[#0077B6] transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      ▼
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
                  <span className="lg:hidden">
                    <MobileTriangle open={isBranchExpanded(branch.id)} />
                  </span>
                  <TriangleIcon direction={isBranchExpanded(branch.id) ? "up" : "down"} size={10} className="hidden shrink-0 text-[#406175] lg:block" />
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
                <span className="lg:hidden">
                  <MobileTriangle open={expanded} />
                </span>
                <TriangleIcon direction={expanded ? "up" : "down"} size={10} className="hidden shrink-0 text-[#406175] lg:block" />
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
  embedded = false,
}: {
  libraryId: string
  embedded?: boolean
}) {
  const libraries = useSyncExternalStore(
    subscribeLibraries,
    getLibrariesSnapshot,
    getLibrariesSnapshot,
  )
  const profile = getProfile()
  const activeTeam = getActiveTeamSnapshot(profile)
  const localOrganization = activeTeam?.internalName ?? profile?.hospital
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
  const sharedLibraryId = sharedLibrary?.id ?? getSharedLibraryId(activeSetting)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [desktopNavOpen, setDesktopNavOpen] = useState(true)
  const [query, setQuery] = useState("")
  const [activeTab, setActiveTab] = useState<LibraryTab>("procedures")
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({})
  const [mobileExpandedGroups, setMobileExpandedGroups] = useState<Record<string, boolean>>({})
  const [mobileExpandedBranches, setMobileExpandedBranches] = useState<Record<string, boolean>>({})
  const [mobileExpandedUpdates, setMobileExpandedUpdates] = useState<Record<string, boolean>>({})
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
  const updates = useMemo(() => {
    if (!library) return []
    return buildLibraryUpdates(cards, library.libraryType, library.id, localOrganization)
  }, [cards, library])
  const emptyProcedureMessage = library?.libraryType === "local"
    ? "Your hospital hasn't added any procedures yet."
    : "No procedures are available here yet."
  const updateEmptyMessage = library?.libraryType === "shared"
    ? "No community updates have been recorded for this collection yet."
    : "No My Team updates have been recorded for this collection yet."

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

  function isMobileUpdateExpanded(updateId: string) {
    if (mobileExpandedUpdates[updateId] !== undefined) return mobileExpandedUpdates[updateId]
    return false
  }

  function toggleMobileUpdate(updateId: string) {
    setMobileExpandedUpdates((current) => ({
      ...current,
      [updateId]: !isMobileUpdateExpanded(updateId),
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

  if (embedded) {
    return (
      <div className="space-y-0 pb-[calc(env(safe-area-inset-bottom,0px)+168px)]">
        <section className="space-y-2 px-4 pt-3 pb-2">
          <div>
            {showOwnerName ? <p className="text-[13px] text-[#0F4C5C]">{ownerLabel}</p> : null}
            <h1 className="mt-1 text-[26px] tracking-[-0.04em] text-[#10243E]">{displayName}</h1>
          </div>

          <nav className="flex items-center gap-6 overflow-x-auto border-b border-[#BFEAF5] text-[14px] text-[#0F4C5C]">
            <button
              type="button"
              onClick={() => setActiveTab("procedures")}
              className={`px-1 py-3 ${activeTab === "procedures" ? "border-b-2 border-[#0F4C5C] text-[#10243E]" : ""}`}
            >
              Procedures {cards.length}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("updates")}
              className={`px-1 py-3 ${activeTab === "updates" ? "border-b-2 border-[#0F4C5C] text-[#10243E]" : ""}`}
            >
              Updates {updates.length}
            </button>
          </nav>
        </section>

        {activeTab === "procedures" ? (
          <section className="space-y-0">
            <div className="bg-[#10243E] px-4 py-3 text-[14px] font-medium text-white">Specialty hierarchy</div>
            {tree.length === 0 ? (
              <div className="px-4 py-5 text-[14px] text-[#0F4C5C]">{emptyProcedureMessage}</div>
            ) : (
              <div className="border-y border-[#D7E9EE] bg-white">
                {tree.map((group) => (
                  <section key={group.id} className="border-b border-[#E8EFF6] last:border-b-0">
                    <button
                      type="button"
                      onClick={() => toggleMobileGroup(group.id)}
                      className="grid w-full grid-cols-[36px_minmax(0,1fr)_44px_18px] items-center gap-x-2 bg-[#EAF7FD] px-3 py-2 text-left font-normal text-[#10243E]"
                    >
                      <div className="flex items-center justify-center">
                        <FolderBadge tone={folderTone} open={isMobileGroupExpanded(group.id)} size="lg" />
                      </div>
                      <p className="min-w-0 pr-2 text-[15px] leading-5 font-normal text-[#10243E]">{group.label}</p>
                      <span className="text-right text-[15px] font-normal text-[#10243E]">{totalForGroup(group)}</span>
                      <span className="flex justify-end">
                        <MobileTriangle open={isMobileGroupExpanded(group.id)} />
                      </span>
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
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-0">
            <div className="bg-[#10243E] px-4 py-3 text-[14px] font-medium text-white">Recent updates</div>
            {updates.length > 0 ? (
              <div className="border-y border-[#D7E9EE] bg-white">
                {updates.map((update) => (
                  <section key={update.id} className="border-b border-[#E8EFF6] last:border-b-0">
                    <button
                      type="button"
                      onClick={() => toggleMobileUpdate(update.id)}
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto_18px] items-center gap-x-2 bg-[#EAF7FD] px-3 py-2 text-left transition-colors hover:bg-[#DDF2F8]"
                    >
                      <p className="truncate text-[14px] font-medium text-[#10243E]">{update.title}</p>
                      <p className="text-[12px] text-[#0F4C5C]">{formatUpdateDate(update.timestamp)}</p>
                      <span className="flex justify-end">
                        <MobileTriangle open={isMobileUpdateExpanded(update.id)} />
                      </span>
                    </button>
                    {isMobileUpdateExpanded(update.id) ? (
                      <div className="border-t border-[#EEF4F7] px-3 py-2">
                        <p className="text-[14px] leading-5 text-[#0F4C5C]">{renderCompactUpdateMeta(update)}</p>
                        <Link
                          href={update.href}
                          className="mt-2 inline-flex items-center justify-center rounded-xl bg-[#0096C7] px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-[#0085B2] active:bg-[#0077B6]"
                        >
                          Open procedure
                        </Link>
                      </div>
                    ) : null}
                  </section>
                ))}
              </div>
            ) : (
              <div className="px-4 py-3 text-[14px] text-[#0F4C5C]">{updateEmptyMessage}</div>
            )}
          </section>
        )}
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

      <main className="w-full px-0 pt-0 pb-0 lg:pl-0 lg:pr-4 lg:pt-4 lg:pb-4">
        <div className="space-y-0 lg:hidden">
          <section className="space-y-2 px-4 pt-3 pb-2">
            <div>
              {showOwnerName ? <p className="text-[13px] text-[#5B7A8A]">{ownerLabel}</p> : null}
              <h1 className="mt-1 text-[28px] tracking-[-0.04em] text-[#10243E]">{displayName}</h1>
            </div>
          </section>

          <section className="overflow-x-auto px-4 py-2">
            <nav className="flex min-w-max items-center gap-2 text-[14px]">
              <button
                type="button"
                onClick={() => setActiveTab("procedures")}
                className={`rounded-[10px] border px-3 py-2 font-medium transition-colors ${
                  activeTab === "procedures"
                    ? "border-[#4FAFCD] bg-[#EAF7FD] text-[#10243E]"
                    : "border-[#BFEAF5] bg-white text-[#406175]"
                }`}
              >
                Procedures {cards.length}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("updates")}
                className={`rounded-[10px] border px-3 py-2 font-medium transition-colors ${
                  activeTab === "updates"
                    ? "border-[#4FAFCD] bg-[#EAF7FD] text-[#10243E]"
                    : "border-[#BFEAF5] bg-white text-[#406175]"
                }`}
              >
                Updates {updates.length}
              </button>
            </nav>
          </section>

          {activeTab === "procedures" ? (
            <section className="space-y-0">
              <div className="bg-[#10243E] px-4 py-3 text-[14px] font-medium text-white">
                Specialty hierarchy
              </div>
              {tree.length === 0 ? (
                <div className="px-4 py-3 text-[14px] text-[#61758B]">
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
                <div className="border-y border-[#D7E9EE] bg-white">
                  {tree.map((group) => (
                    <section key={group.id} className="border-b border-[#E8EFF6] last:border-b-0">
                      <button
                        type="button"
                        onClick={() => toggleMobileGroup(group.id)}
                        className="grid w-full grid-cols-[36px_minmax(0,1fr)_44px_18px] items-center gap-x-2 bg-[#EAF7FD] px-3 py-2 text-left font-normal text-[#10243E]"
                      >
                        <div className="flex items-center justify-center">
                          <FolderBadge tone={folderTone} open={isMobileGroupExpanded(group.id)} size="lg" />
                        </div>
                        <p className="min-w-0 pr-2 text-[15px] leading-5 font-normal text-[#10243E]">{group.label}</p>
                        <span className="text-right text-[15px] font-normal text-[#10243E]">{totalForGroup(group)}</span>
                        <span className="flex justify-end">
                          <MobileTriangle open={isMobileGroupExpanded(group.id)} />
                        </span>
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
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="space-y-0">
              <div className="bg-[#10243E] px-4 py-3 text-[14px] font-medium text-white">
                Recent updates
              </div>
              {updates.length > 0 ? (
                <div className="border-y border-[#D7E9EE] bg-white">
                  {updates.map((update) => (
                    <section key={update.id} className="border-b border-[#E8EFF6] last:border-b-0">
                      <button
                        type="button"
                        onClick={() => toggleMobileUpdate(update.id)}
                        className="grid w-full grid-cols-[minmax(0,1fr)_auto_18px] items-center gap-x-2 bg-[#EAF7FD] px-3 py-2 text-left transition-colors hover:bg-[#DDF2F8]"
                      >
                        <p className="truncate text-[14px] font-medium text-[#10243E]">{update.title}</p>
                        <p className="text-[12px] text-[#0F4C5C]">{formatUpdateDate(update.timestamp)}</p>
                        <span className="flex justify-end">
                          <MobileTriangle open={isMobileUpdateExpanded(update.id)} />
                        </span>
                      </button>

                      {isMobileUpdateExpanded(update.id) ? (
                        <div className="border-t border-[#EEF4F7] px-3 py-2">
                          <p className="text-[14px] leading-5 text-[#0F4C5C]">{renderCompactUpdateMeta(update)}</p>
                          <Link
                            href={update.href}
                            className="mt-2 inline-flex items-center justify-center rounded-xl bg-[#0096C7] px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-[#0085B2] active:bg-[#0077B6]"
                          >
                            Open procedure
                          </Link>
                        </div>
                      ) : null}
                    </section>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3 text-[14px] text-[#61758B]">{updateEmptyMessage}</div>
              )}
            </section>
          )}
        </div>

        <div className={`hidden lg:grid lg:gap-4 ${desktopNavOpen ? "lg:grid-cols-[210px_minmax(0,1fr)]" : "lg:grid-cols-[80px_minmax(0,1fr)]"}`}>
          <WorkspaceNavRail currentNav="collections" collapsed={!desktopNavOpen} onToggleCollapsed={() => setDesktopNavOpen((value) => !value)} />

          <div className="min-w-0 space-y-2">
            <section className="space-y-2 px-1">
              <div>
                {showOwnerName ? <p className="text-[13px] text-[#5B7A8A]">{ownerLabel}</p> : null}
                <h1 className="mt-1 text-[30px] tracking-[-0.04em] text-[#10243E]">{displayName}</h1>
              </div>
            </section>

            <section className="overflow-x-auto border-b border-[#BFEAF5]">
              <nav className="flex min-w-max items-center gap-6 text-[14px] text-[#406175]">
                <button
                  type="button"
                  onClick={() => setActiveTab("procedures")}
                  className={`px-1 py-3 ${activeTab === "procedures" ? "border-b-2 border-[#0F4C5C] text-[#10243E]" : ""}`}
                >
                  Procedures {cards.length}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("updates")}
                  className={`px-1 py-3 ${activeTab === "updates" ? "border-b-2 border-[#0F4C5C] text-[#10243E]" : ""}`}
                >
                  Updates {updates.length}
                </button>
              </nav>
            </section>

            {activeTab === "procedures" ? (
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
                        <TriangleIcon
                          direction={isGroupExpanded(group.id) ? "up" : "down"}
                          size={10}
                          className="shrink-0 text-[#406175]"
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
            ) : (
              <section className="overflow-hidden rounded-[12px] border border-[#DCEAF0] bg-white shadow-[0_12px_30px_-26px_rgba(16,36,62,0.28)]">
                <div className="border-b border-[#D7E9EE] bg-[#10243E] px-4 py-3 text-[14px] text-white">
                  Recent updates
                </div>
                {updates.length > 0 ? (
                  <div className="divide-y divide-[#E8EFF6]">
                    {updates.map((update) => (
                      <Link
                        key={update.id}
                        href={update.href}
                        className="block px-4 py-3 transition-colors hover:bg-[#F8FBFD]"
                      >
                        <div className="min-w-0">
                          <p className="text-[14px] font-medium text-[#10243E]">{update.title}</p>
                          <p className="mt-1 text-[12px] leading-5 text-[#61758B]">{renderCompactUpdateMeta(update)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-5 text-[14px] text-[#61758B]">{updateEmptyMessage}</div>
                )}
              </section>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}


