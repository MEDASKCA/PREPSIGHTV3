"use client"

import Link from "next/link"
import type { PointerEvent as ReactPointerEvent } from "react"
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Download,
  Play,
  Plus,
  ShieldAlert,
} from "lucide-react"
import AppMenuContent from "@/components/AppMenuContent"
import AppTopBar from "@/components/AppTopBar"
import DesktopCommsPanel from "@/components/DesktopCommsPanel"
import TriangleIcon from "@/components/TriangleIcon"
import WorkspaceNavRail from "@/components/WorkspaceNavRail"
import CollectionPanel from "@/components/CollectionPanel"
import ItemDetailPanel from "@/components/ItemDetailPanel"
import KardexSection from "@/components/KardexSection"
import { getBookmarksSnapshot, removeBookmark, saveBookmark, subscribeBookmarks } from "@/lib/bookmarks"
import {
  addCardToLocalLibrary,
  createLocalLibrary,
  getDefaultLocalLibraryId,
  getLibraryCardsSnapshot,
  getPublishedCardsByFamilySnapshot,
} from "@/lib/libraries"
import { getDesktopCommsPreference, getDesktopCommsWidth, subscribeDesktopCommsPreference } from "@/lib/desktop-comms"
import { formatProcedureHierarchy } from "@/lib/procedure-hierarchy"
import type { ItemDisplayInfo, Procedure, Section } from "@/lib/types"

type MatchOption = {
  value: string
  aliases?: string[]
}

type NewSectionLayout = "item_list" | "text_block" | "text_with_links" | "checklist"

const SURGEON_GRADE_OPTIONS: MatchOption[] = [
  { value: "Consultant", aliases: ["cons", "consult"] },
  { value: "Associate Specialist", aliases: ["assoc specialist"] },
  { value: "Specialty Doctor", aliases: ["spec doctor", "staff grade"] },
  { value: "Specialist Registrar (SpR)", aliases: ["spr", "spec reg", "specialist reg", "reg", "registrar"] },
  { value: "Registrar", aliases: ["reg"] },
  { value: "Senior Clinical Fellow", aliases: ["scf"] },
  { value: "Clinical Fellow", aliases: ["cf", "fellow"] },
  { value: "Core Trainee", aliases: ["ct", "core"] },
  { value: "SHO", aliases: ["senior house officer"] },
  { value: "Foundation Doctor", aliases: ["fy", "foundation"] },
]

const SURGEON_TITLE_OPTIONS: MatchOption[] = [
  { value: "Mr" },
  { value: "Miss" },
  { value: "Ms" },
  { value: "Mrs" },
  { value: "Mx" },
  { value: "Dr", aliases: ["doctor"] },
  { value: "Professor", aliases: ["prof"] },
  { value: "Consultant", aliases: ["cons", "consult"] },
  { value: "Specialist Registrar (SpR)", aliases: ["spr", "spec reg", "specialist reg", "reg", "registrar"] },
  { value: "Registrar", aliases: ["reg"] },
]

function formatUpdatedDate(value?: string) {
  if (!value) return "recently"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "recently"
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function normalizeComparableText(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function cloneSections(currentSections: Section[]): Section[] {
  return currentSections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({ ...item })),
    externalLinks: section.externalLinks?.map((link) => ({ ...link })),
    alternatives: section.alternatives ? [...section.alternatives] : undefined,
    dischargeCriteria: section.dischargeCriteria ? [...section.dischargeCriteria] : undefined,
    commonComplications: section.commonComplications ? [...section.commonComplications] : undefined,
  }))
}

function normalizeMatchValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function getInitialism(value: string) {
  return value
    .replace(/\([^)]*\)/g, " ")
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((part) => part[0]?.toLowerCase() ?? "")
    .join("")
}

function getClosestMatches(input: string, options: MatchOption[], limit = 3) {
  const trimmedInput = input.trim()
  if (!trimmedInput) return []

  const normalizedInput = normalizeMatchValue(trimmedInput)
  const loweredInput = trimmedInput.toLowerCase()

  const ranked = options
    .map((option) => {
      const candidates = [option.value, ...(option.aliases ?? [])]
      let bestScore = -1

      candidates.forEach((candidate) => {
        const normalizedCandidate = normalizeMatchValue(candidate)
        const loweredCandidate = candidate.toLowerCase()
        const initialism = getInitialism(candidate)

        let score = -1
        if (normalizedCandidate === normalizedInput) score = 100
        else if (loweredCandidate === loweredInput) score = 95
        else if (initialism && initialism === normalizedInput) score = 90
        else if (normalizedCandidate.startsWith(normalizedInput)) score = 80
        else if (loweredCandidate.startsWith(loweredInput)) score = 75
        else if (normalizedCandidate.includes(normalizedInput)) score = 60
        else if (normalizedInput.includes(normalizedCandidate)) score = 50

        if (score > bestScore) bestScore = score
      })

      return { value: option.value, score: bestScore }
    })
    .filter((option) => option.score >= 60)
    .sort((left, right) => right.score - left.score || left.value.localeCompare(right.value))

  return Array.from(new Set(ranked.map((option) => option.value))).slice(0, limit)
}

function hasExactMatch(input: string, options: string[]) {
  const normalizedInput = normalizeMatchValue(input)
  return options.some((option) => normalizeMatchValue(option) === normalizedInput)
}

function getOverviewSummary(procedure: Procedure, sections: Section[]) {
  return (
    sections.find((section) => section.sectionType === "overview")?.summary ||
    procedure.description ||
    "This is the global reference guide, showing the approved sections currently shared from hospital versions."
  )
}

function buildNewSection(sectionName: string, layout: NewSectionLayout): Section {
  const baseId = slugify(sectionName) || `section-${Date.now()}`

  if (layout === "text_block") {
    return {
      id: baseId,
      title: sectionName,
      sectionType: "handover_notes",
      items: [],
      nurseNotes: "",
    }
  }

  if (layout === "text_with_links") {
    return {
      id: baseId,
      title: sectionName,
      sectionType: "procedure_reference",
      items: [],
      externalLinks: [],
    }
  }

  if (layout === "checklist") {
    return {
      id: baseId,
      title: sectionName,
      sectionType: "implants_prosthetics",
      items: [],
    }
  }

  return {
    id: baseId,
    title: sectionName,
    sectionType: "patient_preparation",
    items: [],
  }
}

function getCompactVersionPrefix(value?: string) {
  if (!value) return ""

  const trimmed = value.trim()
  if (!trimmed) return ""

  const compact = trimmed
    .replace(/\bknee system\b/gi, "")
    .replace(/\bsystem\b/gi, "")
    .replace(/\bapproach\b/gi, "")
    .replace(/\s+\/\s+/g, " / ")
    .replace(/\s{2,}/g, " ")
    .trim()

  return compact
}

function buildProcedureDisplayTitle({
  procedureName,
  variantName,
  systemName,
  approachName,
}: {
  procedureName: string
  variantName?: string
  systemName?: string
  approachName?: string
}) {
  const prefix =
    getCompactVersionPrefix(variantName) ||
    getCompactVersionPrefix(systemName) ||
    getCompactVersionPrefix(approachName)

  if (!prefix) return procedureName

  const loweredProcedureName = procedureName.toLowerCase()
  const loweredPrefix = prefix.toLowerCase()

  if (loweredProcedureName.startsWith(loweredPrefix)) return procedureName

  return `${prefix} ${procedureName}`.replace(/\s{2,}/g, " ").trim()
}

function cardMatchesVersionContext(
  card: Procedure,
  options: {
    procedureName: string
    systemName?: string
    approachName?: string
  },
) {
  const targetProcedure = normalizeComparableText(options.procedureName)
  const targetSystem = normalizeComparableText(options.systemName)
  const targetApproach = normalizeComparableText(options.approachName)
  const cardProcedure = normalizeComparableText(card.name)
  const cardSystem = normalizeComparableText(card.implantSystem)
  const cardApproach = normalizeComparableText(card.approach)

  if (targetProcedure && cardProcedure && targetProcedure !== cardProcedure) return false
  if (targetSystem && cardSystem && !cardSystem.includes(targetSystem) && !targetSystem.includes(cardSystem)) return false
  if (targetApproach && cardApproach && !cardApproach.includes(targetApproach) && !targetApproach.includes(cardApproach)) return false

  return true
}

export default function MobileProcedureRepositoryView({
  procedure,
  sections,
  sourceProcedure,
  selectedVariantId,
  selectedVariantName,
  selectedSystemId,
  selectedSystemName,
}: {
  procedure: Procedure
  sections: Section[]
  sourceProcedure?: Procedure
  selectedVariantId?: string
  selectedVariantName?: string
  selectedSystemId?: string
  selectedSystemName?: string
}) {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [desktopNavOpen, setDesktopNavOpen] = useState(true)
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
  const [mobileMetaOpen, setMobileMetaOpen] = useState(false)
  const [mode, setMode] = useState<"browse" | "collect">("browse")
  const [createNoticeOpen, setCreateNoticeOpen] = useState(false)
  const [createNoticeStep, setCreateNoticeStep] = useState<1 | 2>(1)
  const [createNeedsVariants, setCreateNeedsVariants] = useState<"yes" | "no" | "">("")
  const [surgeonGrade, setSurgeonGrade] = useState("")
  const [surgeonTitle, setSurgeonTitle] = useState("")
  const [surgeonFirstName, setSurgeonFirstName] = useState("")
  const [surgeonLastName, setSurgeonLastName] = useState("")
  const [selectedEditAvailableSectionId, setSelectedEditAvailableSectionId] = useState<string | null>(null)
  const [selectedEditIncludedSectionId, setSelectedEditIncludedSectionId] = useState<string | null>(null)
  const [createNoticeMessage, setCreateNoticeMessage] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [authoringMode, setAuthoringMode] = useState<"edit" | "adapt" | null>(null)
  const [cardName, setCardName] = useState("")
  const [newSectionOpen, setNewSectionOpen] = useState(false)
  const [newSectionName, setNewSectionName] = useState("")
  const [newSectionLayout, setNewSectionLayout] = useState<NewSectionLayout | "">("")
  const [createMessage, setCreateMessage] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [openVersionId, setOpenVersionId] = useState<string>("global-current")
  const [sectionsState, setSectionsState] = useState(sections)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [selectedItemInfo, setSelectedItemInfo] = useState<ItemDisplayInfo | null>(null)
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null)
  const [dragTargetSectionId, setDragTargetSectionId] = useState<string | null>(null)
  const [dragPreview, setDragPreview] = useState<{
    x: number
    y: number
    width: number
    height: number
    offsetX: number
    offsetY: number
    title: string
  } | null>(null)
  const mobileEditAvailableListRef = useRef<HTMLDivElement | null>(null)
  const mobileEditExistingListRef = useRef<HTMLDivElement | null>(null)
  const desktopEditAvailableListRef = useRef<HTMLDivElement | null>(null)
  const desktopEditExistingListRef = useRef<HTMLDivElement | null>(null)
  const sectionElementRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const hierarchyLabel = formatProcedureHierarchy(sourceProcedure ?? procedure)
  const displayTitle = buildProcedureDisplayTitle({
    procedureName: procedure.name,
    variantName: selectedVariantName,
    systemName: selectedSystemName ?? procedure.implantSystem,
    approachName: procedure.approach,
  })
  const bookmarks = useSyncExternalStore(subscribeBookmarks, getBookmarksSnapshot, getBookmarksSnapshot)
  const currentProcedureId = sourceProcedure?.id ?? procedure.id
  const currentFamilyId = sourceProcedure?.familyId ?? procedure.familyId
  const sharedCardHref = `/libraries/shared-prepsight-reference/cards/${currentProcedureId}${selectedVariantId && selectedSystemId ? `?variant=${encodeURIComponent(selectedVariantId)}&system=${encodeURIComponent(selectedSystemId)}` : ""}`
  const publishedCards = useMemo(
    () => getPublishedCardsByFamilySnapshot(currentFamilyId),
    [currentFamilyId],
  )
  const relevantPublishedCards = useMemo(() => {
    const filtered = publishedCards.filter((card) =>
      cardMatchesVersionContext(card, {
        procedureName: sourceProcedure?.name ?? procedure.name,
        systemName: selectedSystemName ?? procedure.implantSystem,
        approachName: procedure.approach,
      }),
    )

    const deduped = new Map<string, Procedure>()

    for (const card of filtered) {
      const displayName = card.variantLabel?.trim() || card.implantSystem?.trim() || card.name
      const dedupeKey = [
        normalizeComparableText(displayName),
        normalizeComparableText(card.sourceOrganizationPublicAlias ?? card.sourceOrganizationName),
        normalizeComparableText(card.sourceContributorPublicAlias ?? card.sourceContributorName),
      ].join("|")
      const current = deduped.get(dedupeKey)
      const currentTimestamp = current?.publishedAt ?? current?.updatedAt ?? current?.createdAt ?? ""
      const nextTimestamp = card.publishedAt ?? card.updatedAt ?? card.createdAt ?? ""

      if (!current || nextTimestamp.localeCompare(currentTimestamp) >= 0) {
        deduped.set(dedupeKey, card)
      }
    }

    return Array.from(deduped.values())
  }, [procedure.approach, procedure.implantSystem, procedure.name, publishedCards, selectedSystemName, sourceProcedure?.name])

  const versionEntries = useMemo(() => {
    if (relevantPublishedCards.length > 0) {
      return relevantPublishedCards.map((card, index) => ({
        id: card.id,
        name: card.variantLabel?.trim() || card.implantSystem?.trim() || card.name,
        detail: `${card.sourceOrganizationPublicAlias ?? "PSH-000"} · ${card.sourceContributorPublicAlias ?? "TO-CONS-000"} · Shared ${formatUpdatedDate(card.publishedAt)}`,
        active: card.id === (sourceProcedure?.id ?? procedure.id) || index === 0,
        updatedAt: card.publishedAt ?? card.updatedAt,
        href: `/libraries/shared-prepsight-reference/cards/${card.id}`,
      }))
    }
    return []
  }, [procedure.id, relevantPublishedCards, sourceProcedure?.id])
  const hasPublishedVersions = relevantPublishedCards.length > 0
  const selectedPublishedCard = useMemo(
    () => relevantPublishedCards.find((card) => card.id === openVersionId) ?? null,
    [openVersionId, relevantPublishedCards],
  )
  const showVersionActions = Boolean(selectedPublishedCard)
  const selectedVersionName = selectedPublishedCard?.variantLabel?.trim() || selectedPublishedCard?.implantSystem?.trim() || selectedPublishedCard?.name || procedure.name
  const selectedVersionHref = selectedPublishedCard
    ? `/libraries/shared-prepsight-reference/cards/${selectedPublishedCard.id}`
    : sharedCardHref
  const bookmarkId = selectedPublishedCard ? `shared-mobile:${selectedPublishedCard.id}` : `shared-mobile:${currentProcedureId}`
  const saved = useMemo(
    () => (showVersionActions ? bookmarks.some((bookmark) => bookmark.id === bookmarkId) : false),
    [bookmarkId, bookmarks, showVersionActions],
  )
  const bookmarkCount = useMemo(
    () => (showVersionActions ? bookmarks.filter((bookmark) => bookmark.id === bookmarkId || bookmark.href === selectedVersionHref).length : 0),
    [bookmarkId, bookmarks, selectedVersionHref, showVersionActions],
  )
  const contributorCount = useMemo(
    () =>
      new Set(
        relevantPublishedCards
          .map((card) => card.sourceContributorPublicAlias ?? card.sourceContributorName ?? "")
          .filter(Boolean),
      ).size,
    [relevantPublishedCards],
  )
  const showStatsRow = bookmarkCount > 0 || relevantPublishedCards.length > 0 || contributorCount > 0

  const localVersionLinks = useMemo(() => {
    const localLibraryId = getDefaultLocalLibraryId()
    if (!localLibraryId) return []
    return getLibraryCardsSnapshot(localLibraryId)
      .filter((card) => card.familyId === currentFamilyId)
      .slice(0, 3)
      .map((card) => ({
        id: card.id,
        name: card.name,
        href: `/libraries/${localLibraryId}/cards/${card.id}`,
      }))
  }, [currentFamilyId])

  const surgeonDisplayName = useMemo(() => {
    return [surgeonGrade.trim(), surgeonTitle.trim(), surgeonFirstName.trim(), surgeonLastName.trim()]
      .filter(Boolean)
      .join(" ")
  }, [surgeonFirstName, surgeonGrade, surgeonLastName, surgeonTitle])
  const surgeonGradeSuggestions = useMemo(
    () => getClosestMatches(surgeonGrade, SURGEON_GRADE_OPTIONS),
    [surgeonGrade],
  )
  const surgeonTitleSuggestions = useMemo(
    () => getClosestMatches(surgeonTitle, SURGEON_TITLE_OPTIONS),
    [surgeonTitle],
  )
  const editIncludedSections = useMemo(() => sectionsState, [sectionsState])
  const editAvailableSections = useMemo(() => {
    const merged = [...sections, ...sectionsState]
    return merged.filter((section, index) => merged.findIndex((entry) => entry.id === section.id) === index)
  }, [sections, sectionsState])
  function handleToggleBookmark() {
    if (saved) {
      removeBookmark(bookmarkId)
      return
    }

    saveBookmark({
      id: bookmarkId,
      title: selectedVersionName,
      subtitle: `Community | ${hierarchyLabel}`,
      href: selectedVersionHref,
    })
  }

  function handleOpenCreateNotice() {
    setAuthoringMode("adapt")
    setCreateNoticeOpen(true)
    setCreateNoticeStep(1)
    setCreateNeedsVariants("")
    setSurgeonGrade("")
    setSurgeonTitle("")
    setSurgeonFirstName("")
    setSurgeonLastName("")
    setCreateNoticeMessage("")
    setCreateMessage("")
  }

  function handleOpenEditPanel() {
    setAuthoringMode("edit")
    setCreateOpen(true)
    setCreateNoticeOpen(false)
    setSelectedEditAvailableSectionId(null)
    setSelectedEditIncludedSectionId(null)
    setNewSectionOpen(false)
    setNewSectionName("")
    setNewSectionLayout("")
    setCreateMessage("")
  }

  function handleContinueCreateNotice() {
    if (createNoticeStep === 1) {
      if (!createNeedsVariants) {
        setCreateNoticeMessage("Choose whether this procedure needs separate versions.")
        return
      }
      setCreateNoticeStep(2)
      setCreateNoticeMessage("")
      return
    }

    if (createNoticeStep === 2) {
      if (!surgeonFirstName.trim() || !surgeonLastName.trim()) {
        setCreateNoticeMessage("Enter the surgeon's first and last name.")
        return
      }
      setCreateNoticeOpen(false)
      setCreateOpen(true)
      setCreateNoticeMessage("")
      setCreateMessage("")
      return
    }
  }

  function addSelectedEditSection() {
    if (!selectedEditAvailableSectionId) return
    const sourceSection = sections.find((section) => section.id === selectedEditAvailableSectionId)
    if (!sourceSection) return
    setSectionsState((current) => {
      if (current.some((section) => section.id === sourceSection.id)) return current
      const nextIds = new Set([...current.map((section) => section.id), sourceSection.id])
      return cloneSections(sections.filter((section) => nextIds.has(section.id)))
    })
    setSelectedEditIncludedSectionId(selectedEditAvailableSectionId)
    setSelectedEditAvailableSectionId(null)
    setCreateMessage("")
  }

  function removeSelectedEditSection() {
    if (!selectedEditIncludedSectionId) return
    setSectionsState((current) =>
      current.filter((section) => section.id !== selectedEditIncludedSectionId),
    )
    setSelectedEditAvailableSectionId(selectedEditIncludedSectionId)
    setSelectedEditIncludedSectionId(null)
    setCreateMessage("")
  }

  function addNewSectionToEditor() {
    const trimmedName = newSectionName.trim()
    if (!trimmedName) {
      setCreateMessage("Enter a section name.")
      return
    }
    if (!newSectionLayout) {
      setCreateMessage("Select a section type.")
      return
    }

    const draftSection = buildNewSection(trimmedName, newSectionLayout)
    if (editAvailableSections.some((section) => section.id === draftSection.id)) {
      setCreateMessage("A section with that name already exists.")
      return
    }

    setSectionsState((current) => [...current, draftSection])
    setSelectedEditIncludedSectionId(draftSection.id)
    setSelectedEditAvailableSectionId(null)
    setNewSectionOpen(false)
    setNewSectionName("")
    setNewSectionLayout("")
    setCreateMessage("")
  }

  function scrollEditList(
    ref:
      | React.RefObject<HTMLDivElement | null>
      | { current: HTMLDivElement | null },
    direction: "up" | "down",
  ) {
    ref.current?.scrollBy({
      top: direction === "up" ? -96 : 96,
      behavior: "smooth",
    })
  }

  function toggleItem(itemId: string) {
    setCheckedItems((current) => {
      const next = new Set(current)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  function handleCreateLocalCard() {
    if (!sourceProcedure || !selectedSystemId || !selectedSystemName) {
      setCreateMessage("This procedure cannot be adapted yet.")
      return
    }

    const trimmedName = cardName.trim()
    if (!trimmedName) {
      setCreateMessage("Enter a name for your version.")
      return
    }
    setCreateMessage("")
    setIsCreating(true)

    try {
      const nextLibraryId =
        getDefaultLocalLibraryId()
        ?? createLocalLibrary({
          name: "My Local Cards",
          description: "Hospital procedure guides adapted from the PrepSight Library.",
          visibility: "organization",
        }).id

      const created = addCardToLocalLibrary({
        libraryId: nextLibraryId,
          sourceCard: {
            ...sourceProcedure,
            id: `${sourceProcedure.id}--${slugify(trimmedName) || "local-card"}`,
            name: trimmedName,
            variantLabel: selectedVariantName,
            description: `Hospital version of ${sourceProcedure.name} based on ${selectedSystemName}.`,
            implantSystem: trimmedName,
            sourceContributorName: surgeonDisplayName,
            sections: cloneSections(sectionsState),
            status: "draft",
            cardScope: "local",
          },
        })

      setCreateOpen(false)
      setCardName("")
      setSurgeonGrade("")
      setSurgeonTitle("")
      setSurgeonFirstName("")
      setSurgeonLastName("")
      setCreateNeedsVariants("")
      router.push(`/libraries/${nextLibraryId}/cards/${created.id}`)
    } catch {
      setCreateMessage("Unable to adapt right now.")
    } finally {
      setIsCreating(false)
    }
  }

  function handleOpenLocalVariants() {
    const localLibraryId = getDefaultLocalLibraryId()
    if (localLibraryId) {
      router.push(`/libraries/${localLibraryId}`)
      return
    }
    setCreateOpen(true)
    setCreateMessage("")
  }

  function handleToggleNavigation() {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      setDesktopNavOpen((value) => !value)
      return
    }
    setMobileMenuOpen((value) => !value)
  }

  function renderDesktopMetaPanel(compact = false, includePublishedVersions = true) {
    return (
      <>
        <section className={`${compact ? "pb-3" : "border-b border-[#2d2d2d] pb-5"}`}>
          <div className="px-6">
            <h1 className={`${compact ? "text-[28px]" : "text-[36px]"} font-semibold leading-tight tracking-[-0.03em] text-white`}>{displayTitle}</h1>
            <p className={`${compact ? "mt-1 text-[14px] leading-6" : "mt-2 text-[16px] leading-7"} text-[#888888]`}>{hierarchyLabel}</p>
          </div>
        </section>

        <section className={`${compact ? "mt-2 pb-3" : "mt-3 border-b border-[#2d2d2d] pb-4"}`}>
          <div className="px-6">
            <div
              className={`${
                compact ? "grid grid-cols-[minmax(0,1fr)_420px] items-start gap-6" : "flex items-start gap-3"
              } ${compact ? "text-[14px] leading-6" : "text-[16px] leading-7"} text-[#888888]`}
            >
              <div className="flex min-w-0 items-start gap-3">
                <ShieldAlert size={20} className="mt-1 shrink-0 text-[#0096C7]" />
                <p>
                  Community reference card · Updated {formatUpdatedDate(procedure.updatedAt)}.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={`${compact ? "mt-3 gap-x-4 gap-y-2 pb-3 text-[14px]" : "mt-4 gap-x-5 gap-y-3 pb-4 text-[16px]"} flex flex-wrap items-center px-6`}>
          <button
            type="button"
            onClick={handleOpenEditPanel}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              createOpen && authoringMode === "edit"
                ? "bg-[#0F4C5C] text-white hover:bg-[#136275]"
                : "bg-[#0096C7] text-white hover:bg-[#0085B2] active:bg-[#0077B6]"
            }`}
          >
            <Plus size={18} />
            Edit
          </button>
          {showVersionActions || compact ? (
            <button
              type="button"
              onClick={handleOpenCreateNotice}
              className="inline-flex items-center gap-2 font-medium text-[#0096C7] hover:text-white"
            >
              <Download size={18} />
              Adapt
            </button>
          ) : null}
          {showVersionActions || compact ? (
            <button type="button" onClick={handleToggleBookmark} className="inline-flex items-center gap-2 font-medium text-[#0096C7] hover:text-white">
              <Bookmark size={18} />
              {saved ? "Bookmarked" : "Bookmark"}
            </button>
          ) : null}
          {(showVersionActions || compact) && hasPublishedVersions ? (
            <button type="button" className="inline-flex items-center gap-2 font-medium text-[#0096C7] hover:text-white">
              <Play size={18} />
              Start procedure
            </button>
          ) : null}
        </section>

        {showStatsRow ? (
                <section className={`${compact ? "mt-3 gap-x-3 gap-y-2 px-6 text-[14px]" : "mt-4 gap-x-4 gap-y-3 px-6 text-[16px]"} flex flex-wrap text-[#888888]`}>
            {bookmarkCount > 0 ? (
              <button type="button" onClick={handleToggleBookmark} className="inline-flex items-center gap-2 transition-colors hover:text-white">
                <Bookmark size={17} />
                {bookmarkCount} bookmark{bookmarkCount === 1 ? "" : "s"}
              </button>
            ) : null}
            {publishedCards.length > 0 ? (
              <button type="button" onClick={handleOpenLocalVariants} className="inline-flex items-center gap-2 transition-colors hover:text-white">
                <span
                  aria-hidden="true"
                  className="h-[17px] w-[17px] shrink-0 bg-[#888888]"
                  style={{
                    WebkitMaskImage: "url('/9168210.png')",
                    maskImage: "url('/9168210.png')",
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                    maskPosition: "center",
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                  }}
                />
                {publishedCards.length} version{publishedCards.length === 1 ? "" : "s"}
              </button>
            ) : null}
            {contributorCount > 0 ? (
              <button type="button" onClick={() => setOpenVersionId((current) => (current ? "" : "global-current"))} className="inline-flex items-center gap-2 transition-colors hover:text-white">
                <span aria-hidden="true" className="inline-flex h-[17px] w-[17px] items-center justify-center text-[#888888]">
                  <svg viewBox="0 0 24 24" className="h-[17px] w-[17px] fill-current" focusable="false">
                    <path d="M12 12c2.76 0 5-2.46 5-5.5S14.76 1 12 1 7 3.46 7 6.5 9.24 12 12 12Zm0 2c-4.42 0-8 2.69-8 6v1h16v-1c0-3.31-3.58-6-8-6Z" />
                  </svg>
                </span>
                {contributorCount} contributor{contributorCount === 1 ? "" : "s"}
              </button>
            ) : null}
          </section>
        ) : null}

        {createOpen ? (
          <section className={`${compact ? "mt-3 pb-3" : "mt-4 border-b border-[#2d2d2d] pb-4"}`}>
            <div className="space-y-3">
              {authoringMode === "adapt" ? (
                <input
                  value={cardName}
                  onChange={(event) => setCardName(event.target.value)}
                  placeholder="Hospital version name"
                  className="w-full rounded-[6px] border border-[#2d2d2d] bg-[#111111] px-3 py-2.5 text-[14px] text-[#e0e0e0] outline-none placeholder:text-[#7B8EA3]"
                />
              ) : (
                <div className="space-y-3">
                  <p className="text-[14px] font-semibold text-white">Sections</p>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setNewSectionOpen((value) => !value)}
                      className="text-[12px] font-semibold text-[#0096C7]"
                    >
                      + New
                    </button>
                    {newSectionOpen ? (
                      <div className="space-y-2">
                        <input
                          value={newSectionName}
                          onChange={(event) => {
                            setNewSectionName(event.target.value)
                            setCreateMessage("")
                          }}
                          placeholder="Section name"
                          className="w-full rounded-[8px] border border-[#2d2d2d] bg-[#111111] px-3 py-2 text-[13px] text-[#e0e0e0] outline-none placeholder:text-[#7B8EA3]"
                        />
                        <div className="flex items-center gap-2">
                          <select
                            value={newSectionLayout}
                            onChange={(event) => setNewSectionLayout(event.target.value as NewSectionLayout | "")}
                            className="min-w-0 flex-1 rounded-[8px] border border-[#2d2d2d] bg-[#111111] px-3 py-2 text-[13px] text-[#e0e0e0] outline-none"
                          >
                            <option value="">Select Type</option>
                            <option value="item_list">Item list</option>
                            <option value="text_block">Text block</option>
                            <option value="text_with_links">Text block with links</option>
                            <option value="checklist">Checklist</option>
                          </select>
                          <button
                            type="button"
                            onClick={addNewSectionToEditor}
                            className="rounded-[8px] bg-[#0096C7] px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#0085B2]"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2 px-1 py-1 text-[11px] font-semibold text-[#0096C7]">
                        <button
                          type="button"
                          onClick={() => scrollEditList(desktopEditAvailableListRef, "up")}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#2d2d2d] text-[#0096C7] transition-colors hover:bg-[#1c1c1c]"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <span>Available</span>
                        <button
                          type="button"
                          onClick={() => scrollEditList(desktopEditAvailableListRef, "down")}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#2d2d2d] text-[#0096C7] transition-colors hover:bg-[#1c1c1c]"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                      <div
                        ref={desktopEditAvailableListRef}
                        className="max-h-60 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                      >
                        {editAvailableSections.map((section) => {
                          const selected = selectedEditAvailableSectionId === section.id
                          const disabled = editIncludedSections.some((entry) => entry.id === section.id)
                          return (
                            <button
                              key={section.id}
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                setSelectedEditAvailableSectionId(section.id)
                                setSelectedEditIncludedSectionId(null)
                              }}
                              className={`mx-1 my-0.5 block w-[calc(100%-0.5rem)] rounded-[8px] border px-2 py-1.5 text-center text-[12px] leading-4 transition-colors ${
                                disabled
                                  ? "cursor-not-allowed border-[#2d2d2d] bg-[#1c1c1c] text-[#0096C7]"
                                  : selected
                                    ? "border-[#0096C7] bg-[#0096C7] text-white"
                                    : "border-[#0096C7] bg-[#0096C7] text-white hover:bg-[#0085B2]"
                              }`}
                            >
                              {section.title}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={addSelectedEditSection}
                        disabled={!selectedEditAvailableSectionId}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#2d2d2d] text-[16px] text-[#0096C7] transition-colors hover:bg-[#1c1c1c] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        &rarr;
                      </button>
                      <button
                        type="button"
                        onClick={removeSelectedEditSection}
                        disabled={!selectedEditIncludedSectionId}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#2d2d2d] text-[16px] text-[#0096C7] transition-colors hover:bg-[#1c1c1c] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        &larr;
                      </button>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2 px-1 py-1 text-[11px] font-semibold text-[#0096C7]">
                        <button
                          type="button"
                          onClick={() => scrollEditList(desktopEditExistingListRef, "up")}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#2d2d2d] text-[#0096C7] transition-colors hover:bg-[#1c1c1c]"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <span>Existing</span>
                        <button
                          type="button"
                          onClick={() => scrollEditList(desktopEditExistingListRef, "down")}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#2d2d2d] text-[#0096C7] transition-colors hover:bg-[#1c1c1c]"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                      <div
                        ref={desktopEditExistingListRef}
                        className="max-h-60 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                      >
                        {editIncludedSections.map((section) => {
                          const selected = selectedEditIncludedSectionId === section.id
                          return (
                            <button
                              key={section.id}
                              type="button"
                              onClick={() => {
                                setSelectedEditIncludedSectionId(section.id)
                                setSelectedEditAvailableSectionId(null)
                              }}
                              className={`mx-1 my-0.5 block w-[calc(100%-0.5rem)] rounded-[8px] border px-2 py-1.5 text-center text-[12px] leading-4 transition-colors ${
                                selected
                                  ? "border-[#0096C7] bg-[#001a2a] text-[#e0e0e0]"
                                  : "border-[#2d2d2d] bg-[#001a2a] text-[#e0e0e0] hover:bg-[#001a2a]"
                              }`}
                            >
                              {section.title}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {createMessage ? <p className="text-[13px] text-[#B65454]">{createMessage}</p> : null}
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={authoringMode === "adapt" ? handleCreateLocalCard : () => setCreateOpen(false)}
                  className="rounded-[6px] bg-[#0096C7] px-3 py-2 text-[13px] text-white disabled:opacity-60"
                >
                  {authoringMode === "adapt" ? (isCreating ? "Saving..." : "Save to my hospital") : "Done"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {!compact && includePublishedVersions && hasPublishedVersions ? (
          <section className={`${compact ? "mt-3" : "mt-5"} border-t border-[#2d2d2d]`}>
            <div className={`flex items-center justify-between border-b border-[#2d2d2d] px-6 ${compact ? "py-2 text-[14px]" : "py-3 text-[16px]"} text-white`}>
              <span className="font-semibold">Published versions</span>
              <span className="font-medium text-[#888888]">{versionEntries.length} published version{versionEntries.length === 1 ? "" : "s"}</span>
            </div>
            <div>
              {versionEntries.map((version) => (
                <div key={version.id} className={`border-b border-[#2d2d2d] px-6 ${compact ? "py-2 text-[14px]" : "py-3 text-[16px]"}`}>
                  <button
                    type="button"
                    onClick={() => setOpenVersionId((current) => (current === version.id ? "" : version.id))}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-white">{version.name}</span>
                      <span className="block truncate text-[14px] text-[#888888]">
                        Updated {formatUpdatedDate(version.updatedAt)}
                      </span>
                    </span>
                    <TriangleIcon
                      direction={openVersionId === version.id ? "up" : "down"}
                      size={10}
                      className="shrink-0 text-[#888888]"
                    />
                  </button>
                  {openVersionId === version.id ? (
                    <div className="pt-2">
                      <div className="text-[14px] leading-6 text-[#888888]">{version.detail}</div>
                      <button
                        type="button"
                        onClick={() => router.push(version.href)}
                        className="mt-2 inline-flex items-center gap-1 text-[14px] font-medium text-[#0096C7]"
                      >
                        Open procedure guide
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </>
    )
  }

  function renderCompactPublishedVersionsPanel() {
    if (!hasPublishedVersions) return null

    const versionsOpen = openVersionId !== ""

    return (
      <section className="bg-black px-6 py-4">
        <div className="text-[14px]">
          <p className="text-right font-semibold text-white">Published versions</p>
          <button
            type="button"
            onClick={() => setOpenVersionId((current) => (current ? "" : "global-current"))}
            className="mt-0.5 inline-flex w-full items-center justify-end gap-2 text-right text-[#888888] transition-colors hover:text-white"
          >
            <span>
              {versionEntries.length} published version{versionEntries.length === 1 ? "" : "s"}
            </span>
            <TriangleIcon
              direction={versionsOpen ? "up" : "down"}
              size={10}
              className="shrink-0 text-[#888888]"
            />
          </button>
          {versionsOpen ? (
            <div className="mt-2 max-h-[168px] overflow-y-auto pt-2">
              {versionEntries.map((version) => (
                <div key={version.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0 flex items-center gap-3 text-[14px]">
                    <span className="truncate font-medium text-white">{version.name}</span>
                    <span className="truncate text-[13px] text-[#888888]">
                      Updated {formatUpdatedDate(version.updatedAt)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(version.href)}
                    className="shrink-0 text-[13px] font-medium text-[#0096C7] transition-colors hover:text-white"
                  >
                    [Open]
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    )
  }

  function reorderSections(draggedId: string, targetId: string) {
    if (draggedId === targetId) return
    setSectionsState((current) => {
      const draggedIndex = current.findIndex((section) => section.id === draggedId)
      const targetIndex = current.findIndex((section) => section.id === targetId)
      if (draggedIndex === -1 || targetIndex === -1) return current
      const next = [...current]
      const [dragged] = next.splice(draggedIndex, 1)
      next.splice(targetIndex, 0, dragged)
      return next
    })
  }

  function beginSectionReorder(sectionId: string, event: ReactPointerEvent<HTMLElement>) {
    if (!(createOpen && authoringMode === "edit")) return
    event.preventDefault()
    event.stopPropagation()
    if ("setPointerCapture" in event.currentTarget) {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    const previewElement =
      event.currentTarget.closest(".kardex-section-header") ??
      sectionElementRefs.current[sectionId]
    const rect = previewElement?.getBoundingClientRect()
    if (!rect) return
    setDraggingSectionId(sectionId)
    setDragTargetSectionId(sectionId)
    setDragPreview({
      x: event.clientX - (event.clientX - rect.left),
      y: event.clientY - (event.clientY - rect.top),
      width: rect.width,
      height: rect.height,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      title: sectionsState.find((section) => section.id === sectionId)?.title ?? "",
    })
  }

  useEffect(() => {
    if (!draggingSectionId || !dragPreview) return

    function handlePointerMove(event: PointerEvent) {
      const activeSectionId = draggingSectionId
      if (!activeSectionId) return

      setDragPreview((current) =>
        current
          ? {
              ...current,
              x: event.clientX - current.offsetX,
              y: event.clientY - current.offsetY,
            }
          : null,
      )

      const closestSection = sectionsState
        .filter((section) => section.id !== activeSectionId)
        .map((section) => {
          const rect = sectionElementRefs.current[section.id]?.getBoundingClientRect()
          if (!rect) return null
          return {
            id: section.id,
            distance: Math.abs(event.clientY - (rect.top + rect.height / 2)),
          }
        })
        .filter((entry): entry is { id: string; distance: number } => entry !== null)
        .sort((left, right) => left.distance - right.distance)[0]

      if (closestSection) {
        setDragTargetSectionId((current) => (current === closestSection.id ? current : closestSection.id))
      }
    }

    function stopDragging() {
      if (draggingSectionId && dragTargetSectionId && draggingSectionId !== dragTargetSectionId) {
        reorderSections(draggingSectionId, dragTargetSectionId)
      }
      setDraggingSectionId(null)
      setDragTargetSectionId(null)
      setDragPreview(null)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", stopDragging)
    window.addEventListener("pointercancel", stopDragging)
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", stopDragging)
      window.removeEventListener("pointercancel", stopDragging)
    }
  }, [dragPreview, dragTargetSectionId, draggingSectionId, sectionsState])

  return (
    <div className="min-h-screen bg-black text-[#e0e0e0]">
      <div className="lg:hidden">
        <AppTopBar
          menuOpen={mobileMenuOpen}
          onToggleMenu={handleToggleNavigation}
          menuContent={<AppMenuContent />}
          sectionLabel="Library"
          mobileMenuOnly
          hideMobileMenu
        />
      </div>

        {createNoticeOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,36,62,0.42)] px-4">
            <div className="w-full max-w-md rounded-[18px] bg-[#1c1c1c] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
              <h2 className="text-center text-[20px] font-semibold tracking-[-0.03em] text-[#e0e0e0]">
                {createNoticeStep === 1 ? "Before you create" : "Surgeon"}
              </h2>
              {createNoticeStep === 1 ? (
                <div className="mt-3 space-y-4">
                  <p className="text-center text-[14px] leading-6 text-[#888888]">
                    Will this need more than one version because of different surgeon preferences, approaches, implant systems, or variants?
                  </p>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCreateNeedsVariants("yes")
                        setCreateNoticeMessage("")
                      }}
                      className={`block w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                        createNeedsVariants === "yes"
                          ? "border-[#0096C7] bg-[#001a2a] text-[#e0e0e0]"
                          : "border-[#2d2d2d] text-[#888888] hover:bg-[#1c1c1c]"
                      }`}
                    >
                      Yes, there may be different versions
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreateNeedsVariants("no")
                        setCreateNoticeMessage("")
                      }}
                      className={`block w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                        createNeedsVariants === "no"
                          ? "border-[#0096C7] bg-[#001a2a] text-[#e0e0e0]"
                          : "border-[#2d2d2d] text-[#888888] hover:bg-[#1c1c1c]"
                      }`}
                    >
                      No, one version is enough
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-4">
                  <p className="text-center text-[14px] leading-6 text-[#888888]">
                    Who is the surgeon for this version? This version will be saved to My Team&apos;s collection and also published in Community.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <input
                        value={surgeonGrade}
                        onChange={(event) => {
                          setSurgeonGrade(event.target.value)
                          setCreateNoticeMessage("")
                        }}
                        placeholder="Grade"
                        className="w-full rounded-xl border border-[#2d2d2d] bg-[#111111] px-4 py-3 text-center text-[14px] text-[#e0e0e0] outline-none placeholder:text-center placeholder:text-[#0096C7]"
                      />
                      {surgeonGrade.trim() && surgeonGradeSuggestions.length > 0 && !hasExactMatch(surgeonGrade, surgeonGradeSuggestions) ? (
                        <div className="rounded-xl border border-[#2d2d2d] bg-[#1c1c1c] py-1">
                          <p className="px-3 py-2 text-center text-[13px] font-medium text-[#0096C7]">
                            Are you talking about:
                          </p>
                          <div>
                            {surgeonGradeSuggestions.map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() => {
                                  setSurgeonGrade(suggestion)
                                  setCreateNoticeMessage("")
                                }}
                                className="block w-full px-3 py-2 text-center text-[13px] text-[#0096C7] transition-colors hover:bg-[#1c1c1c] hover:text-white"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <input
                        value={surgeonTitle}
                        onChange={(event) => {
                          setSurgeonTitle(event.target.value)
                          setCreateNoticeMessage("")
                        }}
                        placeholder="Title"
                        className="w-full rounded-xl border border-[#2d2d2d] bg-[#111111] px-4 py-3 text-center text-[14px] text-[#e0e0e0] outline-none placeholder:text-center placeholder:text-[#0096C7]"
                      />
                      {surgeonTitle.trim() && surgeonTitleSuggestions.length > 0 && !hasExactMatch(surgeonTitle, surgeonTitleSuggestions) ? (
                        <div className="rounded-xl border border-[#2d2d2d] bg-[#1c1c1c] py-1">
                          <p className="px-3 py-2 text-center text-[13px] font-medium text-[#0096C7]">
                            Are you talking about:
                          </p>
                          <div>
                            {surgeonTitleSuggestions.map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() => {
                                  setSurgeonTitle(suggestion)
                                  setCreateNoticeMessage("")
                                }}
                                className="block w-full px-3 py-2 text-center text-[13px] text-[#0096C7] transition-colors hover:bg-[#1c1c1c] hover:text-white"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <input
                      value={surgeonFirstName}
                      onChange={(event) => {
                        setSurgeonFirstName(event.target.value)
                        setCreateNoticeMessage("")
                      }}
                      placeholder="First name"
                      className="w-full rounded-xl border border-[#2d2d2d] bg-[#111111] px-4 py-3 text-center text-[14px] text-[#e0e0e0] outline-none placeholder:text-center placeholder:text-[#0096C7]"
                    />
                    <input
                      value={surgeonLastName}
                      onChange={(event) => {
                        setSurgeonLastName(event.target.value)
                        setCreateNoticeMessage("")
                      }}
                      placeholder="Last name"
                      className="w-full rounded-xl border border-[#2d2d2d] bg-[#111111] px-4 py-3 text-center text-[14px] text-[#e0e0e0] outline-none placeholder:text-center placeholder:text-[#0096C7]"
                    />
                  </div>
                </div>
              )}
              {createNoticeMessage ? <p className="mt-3 text-[13px] text-[#B65454]">{createNoticeMessage}</p> : null}
              <div className="mt-5 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (createNoticeStep === 2) {
                      setCreateNoticeStep(1)
                      setCreateNoticeMessage("")
                      return
                    }
                    setCreateNoticeOpen(false)
                    setCreateNoticeMessage("")
                  }}
                  className="inline-flex items-center justify-center rounded-xl border border-[#2d2d2d] px-4 py-2.5 text-sm font-semibold text-[#0096C7] transition-colors hover:bg-[#1c1c1c]"
                >
                  {createNoticeStep === 1 ? "Cancel" : "Back"}
                </button>
                <button
                  type="button"
                  onClick={handleContinueCreateNotice}
                  className="inline-flex items-center justify-center rounded-xl bg-[#0096C7] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0085B2] active:bg-[#0077B6]"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {draggingSectionId && dragPreview ? (
          <div
            className="pointer-events-none fixed z-[70]"
            style={{
              left: dragPreview.x,
              top: dragPreview.y,
              width: dragPreview.width,
              transform: "translate3d(0, 0, 0)",
            }}
          >
            <div
              className={`flex w-full items-center gap-3 px-4 py-3.5 shadow-[0_18px_40px_rgba(16,36,62,0.22)] ${
                dragTargetSectionId && dragTargetSectionId !== draggingSectionId
                  ? "border border-[#00B4D8] bg-[#00B4D8]"
                  : "border border-[#C97583] bg-[#D9919B]"
              }`}
              style={{ minHeight: dragPreview.height }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-[#0096C7]">
                <span className="text-[16px] leading-none">⋮⋮</span>
              </div>
              <span className="text-[16px] font-medium text-[#e0e0e0]">
                {dragPreview.title}
              </span>
              <span className="ml-auto text-[#e0e0e0]">▼</span>
            </div>
          </div>
        ) : null}

        <main className="pb-28 lg:hidden">
          <section className={`mt-4 px-4 pb-4 ${mobileMetaOpen ? "border-b border-[#2d2d2d]" : ""}`}>
              <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em] text-[#e0e0e0]">{displayTitle}</h1>
            <p className="mt-2 text-[14px] leading-6 text-[#888888]">{hierarchyLabel}</p>
            <button
              type="button"
              onClick={() => setMobileMetaOpen((value) => !value)}
              className="mt-3 inline-flex items-center gap-2 text-[14px] font-medium text-[#0096C7]"
            >
              <span className={`text-[12px] leading-none transition-transform ${mobileMetaOpen ? "rotate-180" : ""}`}>▼</span>
              <span>{mobileMetaOpen ? "Hide details" : "Show details"}</span>
            </button>
          </section>

          {mobileMetaOpen ? (
          <>
          <section className="mt-3 border-b border-[#2d2d2d] px-4 pb-3">
            <div className="flex items-start gap-3 text-[14px] leading-6 text-[#888888]">
              <ShieldAlert size={16} className="mt-0.5 shrink-0 text-[#0096C7]" />
              <p>
                Community reference card · Updated {formatUpdatedDate(procedure.updatedAt)}. Adapt this card locally.
              </p>
            </div>
          </section>

          <section className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 px-4 pb-3 text-[14px]">
            <button
              type="button"
              onClick={handleOpenEditPanel}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                createOpen && authoringMode === "edit"
                  ? "bg-[#0F4C5C] text-white hover:bg-[#136275]"
                  : "bg-[#0096C7] text-white hover:bg-[#0085B2] active:bg-[#0077B6]"
              }`}
            >
              <Plus size={14} />
              Edit
            </button>
            {showVersionActions ? (
              <button
                type="button"
                onClick={handleOpenCreateNotice}
                className="inline-flex items-center gap-1.5 font-medium text-[#0096C7] hover:text-white"
              >
                <Download size={14} />
                Adapt
              </button>
            ) : null}
            {showVersionActions ? (
              <button type="button" onClick={handleToggleBookmark} className="inline-flex items-center gap-1.5 font-medium text-[#0096C7] hover:text-white">
                <Bookmark size={14} />
                {saved ? "Bookmarked" : "Bookmark"}
              </button>
            ) : null}
            {showVersionActions && hasPublishedVersions ? (
              <button type="button" className="inline-flex items-center gap-2 font-medium text-[#0096C7] hover:text-white">
                <Play size={14} />
                Start procedure
              </button>
            ) : null}
          </section>

          {showStatsRow ? (
            <section className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-b border-[#2d2d2d] px-4 pb-3 text-[14px] text-[#888888]">
              {bookmarkCount > 0 ? (
                <button type="button" onClick={handleToggleBookmark} className="inline-flex items-center gap-1.5 transition-colors hover:text-white">
                  <Bookmark size={13} />
                  {bookmarkCount} bookmark{bookmarkCount === 1 ? "" : "s"}
                </button>
              ) : null}
              {publishedCards.length > 0 ? (
                <button type="button" onClick={handleOpenLocalVariants} className="inline-flex items-center gap-2 transition-colors hover:text-white">
                  <span
                    aria-hidden="true"
                    className="h-[13px] w-[13px] shrink-0 bg-current"
                    style={{
                      WebkitMaskImage: "url('/9168210.png')",
                      maskImage: "url('/9168210.png')",
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat: "no-repeat",
                      WebkitMaskPosition: "center",
                      maskPosition: "center",
                      WebkitMaskSize: "contain",
                      maskSize: "contain",
                    }}
                  />
                  {publishedCards.length} version{publishedCards.length === 1 ? "" : "s"}
                </button>
              ) : null}
              {contributorCount > 0 ? (
                <button type="button" onClick={() => setOpenVersionId((current) => (current ? "" : "global-current"))} className="inline-flex items-center gap-2 transition-colors hover:text-white">
                  <span aria-hidden="true" className="inline-flex h-[13px] w-[13px] shrink-0 items-center justify-center">
                    <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] fill-current" focusable="false">
                      <path d="M12 12c2.76 0 5-2.46 5-5.5S14.76 1 12 1 7 3.46 7 6.5 9.24 12 12 12Zm0 2c-4.42 0-8 2.69-8 6v1h16v-1c0-3.31-3.58-6-8-6Z" />
                    </svg>
                  </span>
                  {contributorCount} contributor{contributorCount === 1 ? "" : "s"}
                </button>
              ) : null}
            </section>
          ) : null}

          {createOpen ? (
              <section className="mt-4 border-b border-[#2d2d2d] px-4 pb-4">
                <div className="space-y-3">
                {authoringMode === "adapt" ? (
                  <input
                    value={cardName}
                    onChange={(event) => setCardName(event.target.value)}
                    placeholder="Version name"
                    className="w-full rounded-[6px] border border-[#2d2d2d] bg-[#111111] px-3 py-2.5 text-[14px] text-[#e0e0e0] outline-none placeholder:text-[#7B8EA3]"
                  />
                ) : (
                  <div className="space-y-3">
                    <p className="text-[14px] font-semibold text-[#e0e0e0]">Sections</p>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setNewSectionOpen((value) => !value)}
                        className="text-[12px] font-semibold text-[#0096C7]"
                      >
                        + New
                      </button>
                      {newSectionOpen ? (
                        <div className="space-y-2">
                          <input
                            value={newSectionName}
                            onChange={(event) => {
                              setNewSectionName(event.target.value)
                              setCreateMessage("")
                            }}
                            placeholder="Section name"
                            className="w-full rounded-[8px] border border-[#2d2d2d] bg-[#111111] px-3 py-2 text-[13px] text-[#e0e0e0] outline-none placeholder:text-[#7B8EA3]"
                          />
                          <div className="flex items-center gap-2">
                            <select
                              value={newSectionLayout}
                              onChange={(event) => setNewSectionLayout(event.target.value as NewSectionLayout | "")}
                              className="min-w-0 flex-1 rounded-[8px] border border-[#2d2d2d] bg-[#111111] px-3 py-2 text-[13px] text-[#e0e0e0] outline-none"
                            >
                              <option value="">Select Type</option>
                              <option value="item_list">Item list</option>
                              <option value="text_block">Text block</option>
                              <option value="text_with_links">Text block with links</option>
                              <option value="checklist">Checklist</option>
                            </select>
                            <button
                              type="button"
                              onClick={addNewSectionToEditor}
                              className="rounded-[8px] bg-[#0096C7] px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#0085B2]"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] gap-1.5">
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-2 px-1 py-1 text-[11px] font-semibold text-[#0096C7]">
                          <button
                            type="button"
                            onClick={() => scrollEditList(mobileEditAvailableListRef, "up")}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#2d2d2d] text-[#0096C7] transition-colors hover:bg-[#1c1c1c]"
                          >
                            <ChevronUp size={12} />
                          </button>
                          <span>Available</span>
                          <button
                            type="button"
                            onClick={() => scrollEditList(mobileEditAvailableListRef, "down")}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#2d2d2d] text-[#0096C7] transition-colors hover:bg-[#1c1c1c]"
                          >
                            <ChevronDown size={12} />
                          </button>
                        </div>
                        <div
                          ref={mobileEditAvailableListRef}
                          className="max-h-44 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        >
                          {editAvailableSections.map((section) => {
                            const selected = selectedEditAvailableSectionId === section.id
                            const disabled = editIncludedSections.some((entry) => entry.id === section.id)
                            return (
                              <button
                                key={section.id}
                                type="button"
                                disabled={disabled}
                                onClick={() => {
                                  setSelectedEditAvailableSectionId(section.id)
                                  setSelectedEditIncludedSectionId(null)
                                }}
                                className={`mx-1 my-0.5 block w-[calc(100%-0.5rem)] rounded-[8px] border px-2 py-1.5 text-center text-[12px] leading-4 transition-colors ${
                                  disabled
                                    ? "cursor-not-allowed border-[#2d2d2d] bg-[#1c1c1c] text-[#0096C7]"
                                    : selected
                                      ? "border-[#0096C7] bg-[#0096C7] text-white"
                                      : "border-[#0096C7] bg-[#0096C7] text-white hover:bg-[#0085B2]"
                                }`}
                              >
                                {section.title}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={addSelectedEditSection}
                          disabled={!selectedEditAvailableSectionId}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#2d2d2d] text-[16px] text-[#0096C7] transition-colors hover:bg-[#1c1c1c] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          &rarr;
                        </button>
                        <button
                          type="button"
                          onClick={removeSelectedEditSection}
                          disabled={!selectedEditIncludedSectionId}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#2d2d2d] text-[16px] text-[#0096C7] transition-colors hover:bg-[#1c1c1c] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          &larr;
                        </button>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-2 px-1 py-1 text-[11px] font-semibold text-[#0096C7]">
                          <button
                            type="button"
                            onClick={() => scrollEditList(mobileEditExistingListRef, "up")}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#2d2d2d] text-[#0096C7] transition-colors hover:bg-[#1c1c1c]"
                          >
                            <ChevronUp size={12} />
                          </button>
                          <span>Existing</span>
                          <button
                            type="button"
                            onClick={() => scrollEditList(mobileEditExistingListRef, "down")}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#2d2d2d] text-[#0096C7] transition-colors hover:bg-[#1c1c1c]"
                          >
                            <ChevronDown size={12} />
                          </button>
                        </div>
                        <div
                          ref={mobileEditExistingListRef}
                          className="max-h-44 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        >
                          {editIncludedSections.map((section) => {
                            const selected = selectedEditIncludedSectionId === section.id
                            return (
                              <button
                                key={section.id}
                                type="button"
                                onClick={() => {
                                  setSelectedEditIncludedSectionId(section.id)
                                  setSelectedEditAvailableSectionId(null)
                                }}
                                className={`mx-1 my-0.5 block w-[calc(100%-0.5rem)] rounded-[8px] border px-2 py-1.5 text-center text-[12px] leading-4 transition-colors ${
                                  selected
                                    ? "border-[#0096C7] bg-[#001a2a] text-[#e0e0e0]"
                                    : "border-[#2d2d2d] bg-[#001a2a] text-[#e0e0e0] hover:bg-[#001a2a]"
                                }`}
                              >
                                {section.title}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {createMessage ? <p className="text-[13px] text-[#B65454]">{createMessage}</p> : null}
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isCreating}
                    onClick={authoringMode === "adapt" ? handleCreateLocalCard : () => setCreateOpen(false)}
                    className="rounded-[6px] bg-[#0096C7] px-3 py-2 text-[13px] text-white disabled:opacity-60"
                  >
                    {authoringMode === "adapt" ? (isCreating ? "Adapting..." : "Adapt") : "Done"}
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {hasPublishedVersions ? (
            <section className="mt-5 border-t border-[#2d2d2d]">
              <div className="flex items-center justify-between border-b border-[#2d2d2d] px-4 py-3 text-[14px] text-[#e0e0e0]">
                <span className="font-semibold">Published versions</span>
                <span className="font-medium text-[#888888]">{versionEntries.length} published version{versionEntries.length === 1 ? "" : "s"}</span>
              </div>
              <div>
                {versionEntries.map((version) => (
                  <div key={version.id} className="border-t border-[#0096C7] bg-[#003d54] px-4 py-3 text-[14px] last:border-b last:border-b-[#0096C7]">
                    <button
                      type="button"
                      onClick={() => setOpenVersionId((current) => (current === version.id ? "" : version.id))}
                      className="flex w-full items-start justify-between gap-3 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium leading-snug text-[#e0e0e0]">{version.name}</span>
                        <span className="mt-0.5 block text-[13px] text-[#aaaaaa]">
                          Updated {formatUpdatedDate(version.updatedAt)}
                        </span>
                      </span>
                      <TriangleIcon
                        direction={openVersionId === version.id ? "up" : "down"}
                        size={10}
                        className="mt-0.5 shrink-0 text-[#0096C7]"
                      />
                    </button>
                    {openVersionId === version.id ? (
                      <div className="pt-2">
                        <div className="text-[13px] leading-5 text-[#888888]">{version.detail}</div>
                        <button
                          type="button"
                          onClick={() => router.push(version.href)}
                          className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-[#0096C7]"
                        >
                          Open procedure guide
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          </>
          ) : null}

          {localVersionLinks.length > 0 ? (
            <section className={`mt-5 ${mobileMetaOpen ? "border-t border-[#2d2d2d]" : ""}`}>
              <div className="border-b border-[#2d2d2d] px-4 py-3 text-[14px] font-semibold text-[#e0e0e0]">Versions</div>
              <div>
                {localVersionLinks.map((version) => (
                  <button
                    key={version.id}
                    type="button"
                    onClick={() => router.push(version.href)}
                    className="flex w-full items-start justify-between gap-3 border-t border-[#0096C7] bg-[#003d54] px-4 py-3 text-left text-[14px] last:border-b last:border-b-[#0096C7] hover:bg-[#004a66]"
                  >
                    <span className="flex-1 font-medium leading-snug text-[#e0e0e0]">{version.name}</span>
                    <TriangleIcon direction="down" size={10} className="mt-0.5 shrink-0 text-[#0096C7]" />
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-5">
            {sectionsState.length > 0 ? (
              <>
                {createOpen && authoringMode === "edit" ? (
                  <div className="mb-3 text-[13px] font-medium text-[#0096C7]">
                    Rearrange sections by dragging the grip on each section bar.
                  </div>
                ) : null}
                {sectionsState.map((section) => (
                  <div
                    key={`${section.id}:${section.items.length}:${section.nurseNotes ?? ""}:${section.patientPositionInstructions ?? ""}:${section.externalLinks?.length ?? 0}`}
                    ref={(element) => {
                      sectionElementRefs.current[section.id] = element
                    }}
                    className="transition-opacity"
                  >
                    {dragTargetSectionId === section.id && draggingSectionId !== section.id ? (
                      <div className="mb-1 rounded-[10px] border-2 border-dashed border-[#00B4D8] bg-[#D9EFF7] px-4 py-4">
                        <div className="text-center text-[13px] font-medium text-[#0096C7]">
                          Drop section here
                        </div>
                      </div>
                    ) : null}
                    {draggingSectionId === section.id ? (
                      <div className="mb-1 rounded-[10px] border-2 border-dashed border-[#D9919B] bg-[#FBECEE] px-4 py-4">
                        <div className="text-center text-[13px] font-medium text-[#A34F5C]">
                          Moving section
                        </div>
                      </div>
                    ) : (
                      <KardexSection
                        section={section}
                        anchorId={`section-${section.id}`}
                        defaultOpen={false}
                        showChecks={mode === "collect"}
                        checkedItems={checkedItems}
                        onItemCheck={toggleItem}
                        implantSystem={procedure.implantSystem}
                        procedureId={procedure.id}
                        procedureName={procedure.name}
                        uid={null}
                        onSave={() => undefined}
                        editHighlight={createOpen && authoringMode === "edit"}
                        reorderActive={createOpen && authoringMode === "edit"}
                        onReorderPointerDown={(event) => beginSectionReorder(section.id, event)}
                        onSectionChange={(updatedSection) =>
                          setSectionsState((current) =>
                            current.map((entry) => (entry.id === updatedSection.id ? updatedSection : entry)),
                          )
                        }
                        isDark={true}
                      />
                    )}
                  </div>
                ))}

                {mode === "collect" ? (
                  <CollectionPanel
                    sections={sectionsState}
                    checkedItems={checkedItems}
                    procedureId={procedure.id}
                    procedureName={procedure.name}
                    uid={null}
                    isDark={true}
                  />
                ) : null}
              </>
            ) : (
              <div className="border-t border-[#2d2d2d] px-1 py-8 text-center text-[14px] text-[#888888]">
                No sections match the current search.
              </div>
            )}
          </section>
        </main>

        <div className={`hidden lg:grid lg:min-h-screen lg:gap-0 ${desktopNavOpen ? "lg:grid-cols-[240px_minmax(0,1fr)]" : "lg:grid-cols-[80px_minmax(0,1fr)]"}`}>
          <WorkspaceNavRail currentNav="collections" collapsed={!desktopNavOpen} onToggleCollapsed={() => setDesktopNavOpen((value) => !value)} />

          <div className="flex min-w-0 flex-col">
            <div className="hidden lg:block">
              <AppTopBar menuOpen={false} onToggleMenu={handleToggleNavigation} searchPlaceholder="Search anywhere..." sectionLabel="Library Collections" />
            </div>
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <main className={`min-w-0 flex-1 lg:grid lg:min-h-0 lg:gap-0 ${
                commsRailOpen
                  ? "lg:grid-cols-[minmax(0,1fr)_420px] lg:grid-rows-[auto_minmax(0,1fr)]"
                  : "lg:grid-cols-[440px_minmax(0,1fr)_440px]"
              }`}>
                {!commsRailOpen ? (
                  <aside className="flex min-h-0 h-full flex-col border-r border-[#2d2d2d] bg-black">
                    <div className="min-h-0 flex-1 overflow-y-auto py-6">{renderDesktopMetaPanel()}</div>
                  </aside>
                ) : null}

                {commsRailOpen ? (
                  <>
                    <section className="border-b border-[#2d2d2d] bg-black">
                      <div className="py-4">{renderDesktopMetaPanel(true, false)}</div>
                    </section>
                    <div>{renderCompactPublishedVersionsPanel()}</div>
                  </>
                ) : null}

                <section className={`bg-black ${commsRailOpen ? "min-w-0 border-r border-[#2d2d2d]" : "border-r border-[#2d2d2d]"}`}>
                  <div className={`h-full overflow-y-auto ${commsRailOpen ? "py-0" : "py-6"}`}>
                    {sectionsState.length > 0 ? (
                      <>
                        {createOpen && authoringMode === "edit" ? (
                          <div className={`${commsRailOpen ? "px-6 py-3" : "px-6 pb-3"} text-[13px] font-medium text-[#0096C7]`}>
                            Rearrange sections by dragging the grip on each section bar.
                          </div>
                        ) : null}
                        {sectionsState.map((section) => (
                          <div
                            key={`${section.id}:${section.items.length}:${section.nurseNotes ?? ""}:${section.patientPositionInstructions ?? ""}:${section.externalLinks?.length ?? 0}`}
                            ref={(element) => {
                              sectionElementRefs.current[section.id] = element
                            }}
                            className="transition-opacity"
                          >
                            {dragTargetSectionId === section.id && draggingSectionId !== section.id ? (
                              <div className="mx-6 mb-1 rounded-[12px] border-2 border-dashed border-[#0096C7] bg-[#001a26] px-4 py-5">
                                <div className="text-center text-[14px] font-medium text-[#0096C7]">
                                  Drop section here
                                </div>
                              </div>
                            ) : null}
                            {draggingSectionId === section.id ? (
                              <div className="mx-6 mb-1 rounded-[12px] border-2 border-dashed border-[#D9919B] bg-[#1a0608] px-4 py-5">
                                <div className="text-center text-[14px] font-medium text-[#D9919B]">
                                  Moving section
                                </div>
                              </div>
                            ) : (
                              <KardexSection
                                section={section}
                                anchorId={`section-${section.id}`}
                                defaultOpen={false}
                                showChecks={mode === "collect"}
                                checkedItems={checkedItems}
                                onItemCheck={toggleItem}
                                implantSystem={procedure.implantSystem}
                                procedureId={procedure.id}
                                procedureName={procedure.name}
                                uid={null}
                                onSave={() => undefined}
                                editHighlight={createOpen && authoringMode === "edit"}
                                reorderActive={createOpen && authoringMode === "edit"}
                                onReorderPointerDown={(event) => beginSectionReorder(section.id, event)}
                                onSectionChange={(updatedSection) =>
                                  setSectionsState((current) =>
                                    current.map((entry) => (entry.id === updatedSection.id ? updatedSection : entry)),
                                  )
                                }
                                onItemSelect={setSelectedItemInfo}
                                isDark={true}
                              />
                            )}
                          </div>
                        ))}

                        {mode === "collect" ? (
                          <CollectionPanel
                            sections={sectionsState}
                            checkedItems={checkedItems}
                            procedureId={procedure.id}
                            procedureName={procedure.name}
                            uid={null}
                            isDark={true}
                          />
                        ) : null}
                      </>
                    ) : (
                      <div className="px-6 py-8 text-center text-[14px] text-[#888888]">
                        No sections match the current search.
                      </div>
                    )}
                  </div>
                </section>

                <aside className={`h-full bg-black ${commsRailOpen ? "min-h-0" : ""}`}>
                  <div className="h-full overflow-hidden flex flex-col">
                    <ItemDetailPanel
                      className="shared-desktop-item-panel"
                      info={selectedItemInfo}
                      onClose={() => setSelectedItemInfo(null)}
                      compact={commsRailOpen}
                    />
                  </div>
                </aside>
              </main>

              {commsRailOpen ? (
                <div className="relative hidden flex-shrink-0 border-l border-black lg:block" style={{ width: commsRailWidth }}>
                  <DesktopCommsPanel />
                </div>
              ) : null}
            </div>
          </div>
        </div>
    </div>
  )
}
