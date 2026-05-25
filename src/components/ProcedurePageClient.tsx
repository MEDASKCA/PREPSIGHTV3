"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition, type CSSProperties } from "react"
import Link from "next/link"
import { House, Plus } from "lucide-react"
import MobileSurfaceHeader from "./MobileSurfaceHeader"
import DesktopCommsPanel from "./DesktopCommsPanel"
import KardexSection from "./KardexSection"
import CollectionPanel from "./CollectionPanel"
import HistoryBackButton from "./HistoryBackButton"
import ItemDetailPanel from "./ItemDetailPanel"
import RelatedWalkthroughs from "./RelatedWalkthroughs"
import { CardVersionHistory } from "./CardVersionHistory"
import WorkspaceNavRail from "./WorkspaceNavRail"
import { Procedure, Section, ItemDisplayInfo, SectionType } from "@/lib/types"
import { getMockWalkthroughs } from "@/lib/video-mocks"
import { SECTION_TYPE_CATALOGUE, SETTING_COLOUR } from "@/lib/settings"
import { getProfile, getRelevantSettings } from "@/lib/profile"
import { getCardCustomSections, saveCardCustomSections } from "@/lib/firestore"
import { onAuthChange } from "@/lib/auth"
import { buildDraftSection } from "@/lib/procedure-library"
import { formatProcedureHierarchy } from "@/lib/procedure-hierarchy"
import { getContributionIdentity } from "@/lib/team-workspaces"
import { getDesktopCommsPreference, getDesktopCommsWidth, subscribeDesktopCommsPreference } from "@/lib/desktop-comms"
import { publishLocalCardToGlobal } from "@/lib/libraries"

type PageMode = "browse" | "collection"

interface LastEdit {
  date: string
  by: string
}

interface Props {
  procedure: Procedure
  cardSections: Section[]
  cardKey: string
  title?: string
  subtitle?: string
  tertiaryLabel?: string
  implantSystem?: string
  hideMobileHeader?: boolean
}

function formatName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length < 2) return parts[0]
  return `${parts[0][0]}. ${parts[parts.length - 1]}`
}

function today(): string {
  return new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default function ProcedurePageClient({
  procedure,
  cardSections,
  cardKey,
  title,
  subtitle,
  tertiaryLabel,
  implantSystem,
  hideMobileHeader = false,
}: Props) {
  const isSharedPublishedCard = procedure.cardScope === "shared" && procedure.publishState === "published"
  const profile = getProfile()
  const hospitalLabel = profile?.hospital?.trim() || "Royal Free Hospital"
  const departmentLabel = (profile ? getRelevantSettings(profile) : [])[0] ?? "Operating Theatres"
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [desktopNavOpen, setDesktopNavOpen] = useState(true)
  const [lastEdit, setLastEdit] = useState<LastEdit | null>(null)
  const [sectionsState, setSectionsState] = useState<Section[]>(cardSections)
  const [uid, setUid] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [mode, setMode] = useState<PageMode>("browse")
  const [isDark, setIsDark] = useState(false)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [activeSection, setActiveSection] = useState<string>("")
  const [isDesktop, setIsDesktop] = useState(false)
  const [showSectionRibbon, setShowSectionRibbon] = useState(false)
  const [publishMessage, setPublishMessage] = useState<string | null>(null)
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
  const contentRef = useRef<HTMLDivElement>(null)

  const [selectedItemInfo, setSelectedItemInfo] = useState<ItemDisplayInfo | null>(null)
  const [panelWidth, setPanelWidth] = useState(420)
  const panelWidthRef = useRef(420)
  const isDraggingRef = useRef(false)

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    const startX = e.clientX
    const startW = panelWidthRef.current

    function onMove(ev: MouseEvent) {
      if (!isDraggingRef.current) return
      const newW = Math.max(280, Math.min(720, startW + (startX - ev.clientX)))
      panelWidthRef.current = newW
      setPanelWidth(newW)
    }
    function onUp() {
      isDraggingRef.current = false
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }, [])

  useEffect(() => {
    const sync = () => setIsDark(document.documentElement.dataset.theme === "dark")
    sync()
    window.addEventListener("prepsight:preferences-changed", sync as EventListener)
    return () => window.removeEventListener("prepsight:preferences-changed", sync as EventListener)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  useEffect(() => {
    if (!isDesktop || sectionsState.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id)
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    )
    sectionsState.forEach((s) => {
      const el = document.getElementById(`section-${s.id}`)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [isDesktop, sectionsState])

  function toggleItem(itemId: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  function handleModeChange(next: PageMode) {
    setMode(next)
    if (next === "browse") setCheckedItems(new Set())
  }

  const settingColour =
    SETTING_COLOUR[procedure.setting] ?? "bg-gray-100 text-gray-700"
  const hasSections = sectionsState.length > 0
  const walkthroughs = isSharedPublishedCard ? [] : getMockWalkthroughs(procedure)
  const hierarchyLabel = formatProcedureHierarchy(procedure)
  const canEditSections =
    !isSharedPublishedCard &&
    (procedure.cardScope === "local" ||
      procedure.status === "draft" ||
      sectionsState.some((section) => section.contentMode !== "fixed"))
  const availableSectionOptions = SECTION_TYPE_CATALOGUE.filter(
    (entry) => !sectionsState.some((section) => section.sectionType === entry.type),
  )

  useEffect(() => onAuthChange((user) => setUid(user?.uid ?? null)), [])

  useEffect(() => {
    setSectionsState(cardSections)
  }, [cardSections])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!uid) return
      const customSections = await getCardCustomSections(uid, cardKey)
      if (cancelled || customSections.length === 0) return
      setSectionsState((current) =>
        current.map((section) => {
          if (section.contentMode === "fixed") return section
          const override = customSections.find((item) => item.id === section.id)
          return override ?? section
        }),
      )
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [cardKey, uid])

  function handleItemSave(sectionId: string, updatedItem: import("@/lib/types").Item) {
    setSectionsState((current) => {
      const next = current.map((section) => {
        if (section.id !== sectionId) return section
        return {
          ...section,
          items: section.items.map((it) => (it.id === updatedItem.id ? updatedItem : it)),
        }
      })
      if (uid) {
        const editableSections = next.filter((s) => s.contentMode !== "fixed")
        startTransition(() => { void saveCardCustomSections(uid, cardKey, editableSections) })
      }
      return next
    })
    setSelectedItemInfo((prev) => {
      if (!prev || prev.item.id !== updatedItem.id) return prev
      return {
        ...prev,
        item: updatedItem,
        name: updatedItem.name,
        product: updatedItem.product ?? "",
        location: updatedItem.location ?? "",
        qty: updatedItem.defaultQty != null ? String(updatedItem.defaultQty) : "",
      }
    })
  }

  function handleSectionSave() {
    const profile = getProfile()
    const identity = getContributionIdentity(profile, procedure.cardScope === "shared" ? "public" : "internal")
    const by = procedure.cardScope === "shared" ? identity : formatName(identity)
    setLastEdit({ date: today(), by })
  }

  function handleSectionChange(updatedSection: Section) {
    setSectionsState((current) => {
      const next = current.map((section) =>
        section.id === updatedSection.id ? updatedSection : section,
      )

      if (uid) {
        const editableSections = next.filter(
          (section) => section.contentMode !== "fixed",
        )
        startTransition(() => {
          void saveCardCustomSections(uid, cardKey, editableSections)
        })
      }

      return next
    })
  }

  function persistEditableSections(next: Section[]) {
    if (!uid) return
    const editableSections = next.filter((section) => section.contentMode !== "fixed")
    startTransition(() => {
      void saveCardCustomSections(uid, cardKey, editableSections)
    })
  }

  function handleAddSection(sectionType: SectionType) {
    setSectionsState((current) => {
      if (current.some((section) => section.sectionType === sectionType)) return current
      const nextSection = buildDraftSection(
        sectionType,
        cardKey.replace(/[^a-zA-Z0-9_-]+/g, "-"),
        current.length,
      )
      const next = [...current, nextSection]
      persistEditableSections(next)
      return next
    })
    setShowSectionRibbon(false)
  }

  function handlePublishToGlobal() {
    if (procedure.cardScope !== "local") return
    const libraryId = cardKey.split("__")[0]
    if (!libraryId) {
      setPublishMessage("Unable to resolve the local library.")
      return
    }

    try {
      publishLocalCardToGlobal({ libraryId, cardId: procedure.id })
      setPublishMessage("Published to global repository.")
    } catch {
      setPublishMessage("Unable to publish this card right now.")
    }
  }

  function handleToggleNavigation() {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      setDesktopNavOpen((value) => !value)
      return
    }
    setMobileMenuOpen((value) => !value)
  }

  const desktopGridStyle: CSSProperties | undefined = commsRailOpen
    ? desktopNavOpen
      ? { gridTemplateColumns: `240px minmax(0,1fr) ${commsRailWidth}px` }
      : { gridTemplateColumns: `80px minmax(0,1fr) ${commsRailWidth}px` }
    : undefined

  return (
    <div className="procedure-route-theme app-shell-bg min-h-screen bg-[#F4F7FA] lg:h-screen lg:flex lg:flex-col lg:overflow-hidden">
      <div className={`lg:hidden ${hideMobileHeader ? "hidden" : ""}`}>
        <MobileSurfaceHeader
          title="Library"
          hospital={hospitalLabel}
          department={departmentLabel}
        />
      </div>

      <div
        style={desktopGridStyle}
        className={`lg:grid lg:flex-1 lg:gap-4 ${desktopNavOpen ? "lg:grid-cols-[240px_minmax(0,1fr)]" : "lg:grid-cols-[80px_minmax(0,1fr)]"}`}
      >
        <WorkspaceNavRail currentNav="collections" collapsed={!desktopNavOpen} onToggleCollapsed={() => setDesktopNavOpen((value) => !value)} />

        <div className="min-w-0 lg:flex lg:flex-1 lg:flex-col lg:overflow-hidden">
      <header data-dev-trigger className="shrink-0 border-b border-[#8ADFF0] bg-[#0077B6] lg:static">
        <div className="mx-auto flex max-w-none items-start gap-3 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+8px)] lg:items-center lg:gap-4 lg:px-10 lg:py-4">
          <HistoryBackButton
            fallbackHref="/"
            className="mt-0.5 shrink-0 text-[#10243E] transition-colors hover:opacity-80 lg:mt-0 lg:flex lg:h-9 lg:w-9 lg:items-center lg:justify-center lg:rounded-[12px] lg:border lg:border-[#8CCFDF] lg:bg-white/70"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h1 className="text-[18px] font-semibold leading-snug text-[#10243E] lg:text-[34px] lg:font-bold lg:tracking-[-0.03em]">
                {title ?? procedure.name}
              </h1>
              {!isSharedPublishedCard && (subtitle || tertiaryLabel) && (
                <span className="text-[13px] leading-snug text-[#406175] lg:text-[20px]">
                  {[subtitle, tertiaryLabel].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>

            <div className="mt-1 flex items-center gap-1.5">
              <span className={`hidden rounded-full px-2 py-0.5 text-[11px] font-semibold lg:inline lg:px-3 lg:py-1 lg:text-[14px] ${settingColour}`}>
                {procedure.setting}
              </span>
              <span className="hidden text-[11px] text-[#7ECFDF] lg:inline lg:text-[20px]">·</span>
              <span className="hidden text-[11px] text-[#406175] lg:inline lg:text-[20px]">{hierarchyLabel}</span>
              <span className="lg:hidden text-[11px] text-[#406175] font-medium">
                {procedure.setting} / {hierarchyLabel}
              </span>

              {!isSharedPublishedCard && walkthroughs.length > 0 && (
                <>
                  <span className="text-[11px] text-[#7ECFDF] lg:text-[20px]">·</span>
                  <a
                    href="#related-walkthroughs"
                    className="rounded-full border border-[#8CCFDF] bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-[#0F4C5C] transition-colors hover:bg-[#EEF9FC] lg:px-3 lg:py-1 lg:text-[13px]"
                  >
                    {walkthroughs.length} walkthrough{walkthroughs.length === 1 ? "" : "s"}
                  </a>
                </>
              )}

              {lastEdit && (
                <>
                  <span className="text-[11px] text-[#7ECFDF] lg:text-[20px]">·</span>
                  <span className="text-[11px] text-[#406175] lg:text-[20px]">
                    Updated {lastEdit.date} by {lastEdit.by}
                  </span>
                </>
              )}

              {!isSharedPublishedCard ? <div className="ml-auto flex gap-0.5 rounded-lg border border-[#8CCFDF] bg-white/75 p-0.5 lg:hidden shrink-0">
                {procedure.cardScope === "local" ? (
                  <button
                    type="button"
                    onClick={handlePublishToGlobal}
                    className="rounded-md px-3 py-1 text-[12px] font-semibold text-[#0F4C5C]"
                  >
                    Publish
                  </button>
                ) : null}
                {(["browse", "collection"] as PageMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleModeChange(m)}
                    className={`rounded-md px-3 py-1 text-[12px] font-semibold transition-all ${
                      mode === m
                        ? "bg-[#00B4D8] text-[#10243E] shadow-sm"
                        : "text-[#406175]"
                    }`}
                  >
                    {m === "browse" ? "Browse" : "Collect"}
                  </button>
                ))}
              </div> : null}
            </div>
          </div>

          {!isSharedPublishedCard ? <div className="hidden lg:flex gap-1 rounded-xl border border-[#8CCFDF] bg-white/75 p-1 shrink-0">
            {procedure.cardScope === "local" ? (
              <button
                type="button"
                onClick={handlePublishToGlobal}
                className="rounded-lg px-4 py-2 text-[16px] font-semibold text-[#0F4C5C] hover:opacity-80"
              >
                Publish to global
              </button>
            ) : null}
            {(["browse", "collection"] as PageMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleModeChange(m)}
                className={`rounded-lg px-4 py-2 text-[16px] font-semibold transition-colors ${
                  mode === m
                    ? "bg-[#00B4D8] text-[#10243E] shadow-sm"
                    : "text-[#406175] hover:opacity-80"
                }`}
              >
                {m === "browse" ? "Browse & Update" : "Collection"}
              </button>
            ))}
          </div> : null}

          <Link
            href="/"
            className="mt-0.5 shrink-0 flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#8CCFDF] bg-white/75 text-[#10243E] transition-all active:bg-[#EEF9FC] lg:mt-0 lg:h-9 lg:w-9 lg:rounded-[12px] lg:hover:bg-[#EEF9FC]"
            aria-label="Home"
          >
            <House size={20} />
          </Link>
        </div>
      </header>

      <main className="relative select-none lg:flex lg:flex-1 lg:overflow-hidden">
        <div ref={contentRef} className="flex-1 overflow-y-auto min-w-0">
          {publishMessage ? (
            <section className="px-4 pt-4 lg:px-7 lg:pt-6">
              <div className="rounded-[16px] border border-[#BFEAF5] bg-[#EEF9FC] px-4 py-3 text-[13px] text-[#0F4C5C]">
                {publishMessage}
              </div>
            </section>
          ) : null}
          {hasSections ? (
            <>
              {canEditSections ? (
                <section className="px-4 pt-4 lg:px-7 lg:pt-6">
                  <div className="rounded-[20px] border border-[#D5EAF1] bg-white px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0F4C5C]">
                          Section Ribbon
                        </p>
                        <p className="mt-1 text-[14px] text-[#61758B]">
                          Add version card sections for this procedure branch.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSectionRibbon((current) => !current)}
                        className="inline-flex items-center gap-2 rounded-xl border border-[#BFEAF5] bg-[#EEF9FC] px-3 py-2 text-[13px] font-semibold text-[#10243E]"
                      >
                        <Plus size={15} />
                        Add section
                      </button>
                    </div>

                    {showSectionRibbon ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {availableSectionOptions.length > 0 ? (
                          availableSectionOptions.map((entry) => (
                            <button
                              key={entry.type}
                              type="button"
                              onClick={() => handleAddSection(entry.type)}
                              className="rounded-xl border border-[#D5EAF1] bg-[#F8FBFD] px-3 py-2 text-left transition-colors hover:bg-[#EEF9FC]"
                            >
                              <div className="text-[13px] font-semibold text-[#10243E]">{entry.label}</div>
                              <div className="mt-0.5 text-[11px] leading-4 text-[#61758B]">{entry.description}</div>
                            </button>
                          ))
                        ) : (
                          <p className="text-[13px] text-[#61758B]">
                            All standard section types for this card are already in use.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {sectionsState.map((section) => (
                <KardexSection
                  key={`${section.id}:${section.items.length}:${section.nurseNotes ?? ""}:${section.patientPositionInstructions ?? ""}:${section.externalLinks?.length ?? 0}`}
                  section={section}
                  anchorId={`section-${section.id}`}
                  defaultOpen={isSharedPublishedCard ? false : isDesktop}
                  variant={isSharedPublishedCard ? "community" : "default"}
                  showChecks={!isSharedPublishedCard && mode === "collection"}
                  checkedItems={checkedItems}
                  onItemCheck={toggleItem}
                  implantSystem={implantSystem ?? procedure.implantSystem}
                  procedureId={procedure.id}
                  procedureName={procedure.name}
                  uid={uid}
                  onSave={handleSectionSave}
                  onSectionChange={handleSectionChange}
                  onItemSelect={isDesktop ? setSelectedItemInfo : undefined}
                />
              ))}

              {!isSharedPublishedCard && mode === "collection" && (
                <CollectionPanel
                  sections={sectionsState}
                  checkedItems={checkedItems}
                  procedureId={procedure.id}
                  procedureName={procedure.name}
                  variantName={subtitle}
                  uid={uid}
                  isDark={isDark}
                />
              )}

              {!isSharedPublishedCard ? <RelatedWalkthroughs videos={walkthroughs} /> : null}

              <CardVersionHistory cardId={procedure.id} />

              <footer className="mt-6 border-t border-[#D5EAF1] px-4 pt-4 lg:mt-8 lg:px-7 lg:pt-6">
                <p className="text-[13px] text-[#61758B] lg:text-sm">
                  {procedure.updatedAt
                    ? `Reviewed ${new Date(procedure.updatedAt).toLocaleDateString("en-GB", {
                        month: "long",
                        year: "numeric",
                      })} · `
                    : "Reviewed periodically · "}
                  PrepSight editorial · Local policy applies
                </p>
              </footer>
            </>
          ) : (
            <div className="mx-4 rounded-xl border border-dashed border-[#D5EAF1] bg-white px-5 py-8 text-center text-sm text-[#61758B] lg:mx-0 lg:rounded-[28px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#94A3B8]">
                Card Not Built Yet
              </p>
              <p className="mt-2 text-[15px] font-semibold text-[#10243E]">
                This procedure is in the catalogue, but the detailed card has not been authored yet.
              </p>
              <p className="mt-2 text-[14px] leading-6 text-[#61758B]">
                Use this placeholder to keep the procedure visible while the benchmark card set is built out one procedure at a time.
              </p>
            </div>
          )}
        </div>

        <div
          className="hidden lg:block w-[6px] shrink-0 cursor-col-resize bg-[#123544] hover:bg-[#00B4D8] active:bg-[#00B4D8] transition-colors"
          onMouseDown={startDrag}
        />

        <div
          className="hidden lg:flex lg:flex-col shrink-0 overflow-hidden border-l border-[#D5EAF1] bg-white"
          style={{ width: panelWidth }}
        >
          <ItemDetailPanel
            info={selectedItemInfo}
            onClose={() => setSelectedItemInfo(null)}
            onItemSave={handleItemSave}
          />
        </div>
      </main>
        </div>

        {commsRailOpen ? <DesktopCommsPanel /> : null}
      </div>
    </div>
  )
}
