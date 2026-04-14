"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Bookmark,
  GitBranch,
  Play,
  Plus,
  ShieldAlert,
  Users,
} from "lucide-react"
import AppMenuContent from "@/components/AppMenuContent"
import AppTopBar from "@/components/AppTopBar"
import TriangleIcon from "@/components/TriangleIcon"
import WorkspaceNavRail from "@/components/WorkspaceNavRail"
import CollectionPanel from "@/components/CollectionPanel"
import ItemDetailPanel from "@/components/ItemDetailPanel"
import KardexSection from "@/components/KardexSection"
import {
  addCardToLocalLibrary,
  createLocalLibrary,
  getDefaultLocalLibraryId,
  getLibraryCardsSnapshot,
  getPublishedCardsByFamilySnapshot,
} from "@/lib/libraries"
import { formatProcedureHierarchy } from "@/lib/procedure-hierarchy"
import type { ItemDisplayInfo, Procedure, Section } from "@/lib/types"

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

function getOverviewSummary(procedure: Procedure, sections: Section[]) {
  return (
    sections.find((section) => section.sectionType === "overview")?.summary ||
    procedure.description ||
    "This is the global reference guide, showing the approved sections currently shared from hospital versions."
  )
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
  const [mobileMetaOpen, setMobileMetaOpen] = useState(false)
  const [mode, setMode] = useState<"browse" | "collect">("browse")
  const [saved, setSaved] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [cardName, setCardName] = useState("")
  const [createMessage, setCreateMessage] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [openVersionId, setOpenVersionId] = useState<string>("global-current")
  const [sectionsState, setSectionsState] = useState(sections)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [selectedItemInfo, setSelectedItemInfo] = useState<ItemDisplayInfo | null>(null)
  const hierarchyLabel = formatProcedureHierarchy(sourceProcedure ?? procedure)

  const versionEntries = useMemo(() => {
    const publishedCards = getPublishedCardsByFamilySnapshot(sourceProcedure?.familyId ?? procedure.familyId)
    if (publishedCards.length > 0) {
      return publishedCards.map((card, index) => ({
        id: card.id,
        name: card.variantLabel?.trim() || card.implantSystem?.trim() || card.name,
        detail: `${card.sourceOrganizationPublicAlias ?? "PSH-000"} · ${card.sourceContributorPublicAlias ?? "TO-CONS-000"} · Shared ${formatUpdatedDate(card.publishedAt)}`,
        active: card.id === (sourceProcedure?.id ?? procedure.id) || index === 0,
        updatedAt: card.publishedAt ?? card.updatedAt,
        href: `/libraries/shared-prepsight-reference/cards/${card.id}`,
      }))
    }

    const currentCardId = sourceProcedure?.id ?? procedure.id
    return [
      {
        id: "global-current",
        name: selectedSystemName ?? procedure.implantSystem ?? procedure.name,
        detail: "No approved versions yet. Adapt this procedure for your hospital to create your own version.",
        active: true,
        updatedAt: procedure.updatedAt,
        href: `/libraries/shared-prepsight-reference/cards/${currentCardId}${selectedVariantId && selectedSystemId ? `?variant=${encodeURIComponent(selectedVariantId)}&system=${encodeURIComponent(selectedSystemId)}` : ""}`,
      },
    ]
  }, [procedure, sourceProcedure, selectedVariantId, selectedSystemId, selectedSystemName])

  const localVersionLinks = useMemo(() => {
    const localLibraryId = getDefaultLocalLibraryId()
    if (!localLibraryId) return []
    return getLibraryCardsSnapshot(localLibraryId)
      .filter((card) => card.familyId === (sourceProcedure?.familyId ?? procedure.familyId))
      .slice(0, 3)
      .map((card) => ({
        id: card.id,
        name: card.name,
        href: `/libraries/${localLibraryId}/cards/${card.id}`,
      }))
  }, [procedure.familyId, sourceProcedure?.familyId])

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
      setCreateMessage("Enter a name for your hospital version.")
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
          sections: cloneSections(sectionsState),
          status: "draft",
          cardScope: "local",
        },
      })

      setCreateOpen(false)
      setCardName("")
      router.push(`/libraries/${nextLibraryId}/cards/${created.id}`)
    } catch {
      setCreateMessage("Unable to create card right now.")
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

  return (
    <div className="shared-card-route min-h-screen bg-[#F6FAFC] text-[#10243E]">
      <div className="min-h-screen w-full bg-transparent">
        <AppTopBar
          menuOpen={mobileMenuOpen}
          onToggleMenu={handleToggleNavigation}
          menuContent={<AppMenuContent />}
          mobileMenuOnly
        />

        <main className="pb-8 lg:hidden">
          <section className="mx-4 mt-4 border-b border-[#C7DEE7] pb-4">
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em] text-[#10243E]">{procedure.name}</h1>
            <p className="mt-2 text-[14px] leading-6 text-[#35546D]">{hierarchyLabel}</p>
            <button
              type="button"
              onClick={() => setMobileMetaOpen((value) => !value)}
              className="mt-3 inline-flex items-center gap-2 text-[14px] font-medium text-[#0F4C5C]"
            >
              <span className={`text-[12px] leading-none transition-transform ${mobileMetaOpen ? "rotate-180" : ""}`}>▼</span>
              <span>{mobileMetaOpen ? "Hide details" : "Show details"}</span>
            </button>
          </section>

          {mobileMetaOpen ? (
          <>
          <section className="mx-4 mt-3 border-b border-[#C7DEE7]">
            <nav className="flex overflow-x-auto whitespace-nowrap text-[14px]">
              {["Procedure", "Notes", "Suggest an edit", "More"].map((tab, index) => (
                <button
                  key={tab}
                  type="button"
                  className={`border-b px-3 py-3 ${
                    index === 0 ? "border-[#2A96A8] font-semibold text-[#10243E]" : "border-transparent text-[#4C647A]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </section>

          <section className="mx-4 mt-3 border-b border-[#C7DEE7] pb-3">
            <div className="flex items-start gap-3 text-[14px] leading-6 text-[#35546D]">
              <ShieldAlert size={16} className="mt-0.5 shrink-0 text-[#2A96A8]" />
              <p>
                Community reference card · Updated {formatUpdatedDate(procedure.updatedAt)}. Create a My Team version to adapt it locally.
              </p>
            </div>
          </section>

          <section className="mx-4 mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[#C7DEE7] pb-3 text-[14px]">
            <button
              type="button"
              onClick={() => {
                setCreateOpen((value) => !value)
                setCreateMessage("")
              }}
              className="inline-flex items-center gap-1.5 font-medium text-[#0F4C5C] hover:text-[#10243E]"
            >
              <Plus size={14} />
              Create My Team version
            </button>
            <button type="button" onClick={() => setSaved((value) => !value)} className="inline-flex items-center gap-1.5 font-medium text-[#0F4C5C] hover:text-[#10243E]">
              <Bookmark size={14} />
              {saved ? "Bookmarked" : "Bookmark"}
            </button>
            <button type="button" className="inline-flex items-center gap-2 font-medium text-[#0F4C5C] hover:text-[#10243E]">
              <Play size={14} />
              Start procedure
            </button>
          </section>

          <section className="mx-4 mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[14px] text-[#4C647A]">
            <button type="button" onClick={() => setSaved((value) => !value)} className="inline-flex items-center gap-1.5 transition-colors hover:text-[#10243E]">
              <Bookmark size={13} />
              {saved ? 25 : 24} bookmarks
            </button>
            <button type="button" onClick={handleOpenLocalVariants} className="inline-flex items-center gap-1.5 transition-colors hover:text-[#10243E]">
              <GitBranch size={13} />
              3 My Team versions
            </button>
            <button type="button" onClick={() => setOpenVersionId((current) => (current ? "" : "global-current"))} className="inline-flex items-center gap-1.5 transition-colors hover:text-[#10243E]">
              <Users size={13} />
              3 contributors
            </button>
          </section>

          {createOpen ? (
            <section className="mx-4 mt-4 border-b border-[#D5EAF1] pb-4">
              <div className="space-y-3">
                <input
                  value={cardName}
                  onChange={(event) => setCardName(event.target.value)}
                  placeholder="Hospital version name"
                  className="w-full rounded-[6px] border border-[#D5EAF1] bg-[#F8FBFD] px-3 py-2.5 text-[14px] text-[#10243E] outline-none placeholder:text-[#7B8EA3]"
                />
                {createMessage ? <p className="text-[13px] text-[#B65454]">{createMessage}</p> : null}
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isCreating}
                    onClick={handleCreateLocalCard}
                    className="rounded-[6px] bg-[#2A96A8] px-3 py-2 text-[13px] text-white disabled:opacity-60"
                  >
                    {isCreating ? "Saving..." : "Save to my hospital"}
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          <section className="mx-4 mt-5 border-t border-[#C7DEE7]">
            <div className="flex items-center justify-between border-b border-[#D9EBF0] px-1 py-3 text-[14px] text-[#10243E]">
              <span className="font-semibold">Published versions</span>
              <span className="font-medium text-[#35546D]">{versionEntries.length} published version{versionEntries.length === 1 ? "" : "s"}</span>
            </div>
            <div>
              {versionEntries.map((version) => (
                <div key={version.id} className="border-b border-[#DCE8ED] px-1 py-3 text-[14px]">
                  <button
                    type="button"
                    onClick={() => setOpenVersionId((current) => (current === version.id ? "" : version.id))}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-[#10243E]">{version.name}</span>
                      <span className="block truncate text-[13px] text-[#4C647A]">
                        Updated {formatUpdatedDate(version.updatedAt)}
                      </span>
                    </span>
                    <TriangleIcon
                      direction={openVersionId === version.id ? "up" : "down"}
                      size={10}
                      className="shrink-0 text-[#61758B]"
                    />
                  </button>
                  {openVersionId === version.id ? (
                    <div className="pt-2">
                      <div className="text-[13px] leading-5 text-[#4C647A]">{version.detail}</div>
                      <button
                        type="button"
                        onClick={() => router.push(version.href)}
                        className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-[#0F4C5C]"
                      >
                        Open procedure guide
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
          </>
          ) : null}

          {localVersionLinks.length > 0 ? (
            <section className="mx-4 mt-5 border-t border-[#C7DEE7]">
              <div className="border-b border-[#D9EBF0] px-1 py-3 text-[14px] font-semibold text-[#10243E]">Hospital versions</div>
              <div>
                {localVersionLinks.map((version) => (
                  <button
                    key={version.id}
                    type="button"
                    onClick={() => router.push(version.href)}
                    className="flex w-full items-center justify-between border-b border-[#DCE8ED] px-1 py-3 text-left text-[14px] hover:bg-[#F8FBFD]"
                  >
                    <span className="truncate font-medium text-[#10243E]">{version.name}</span>
                    <span className="font-medium text-[#35546D]">Open</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mx-4 mt-5">
            {sectionsState.length > 0 ? (
              <>
                {sectionsState.map((section) => (
                  <KardexSection
                    key={`${section.id}:${section.items.length}:${section.nurseNotes ?? ""}:${section.patientPositionInstructions ?? ""}:${section.externalLinks?.length ?? 0}`}
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
                    onSectionChange={(updatedSection) =>
                      setSectionsState((current) =>
                        current.map((entry) => (entry.id === updatedSection.id ? updatedSection : entry)),
                      )
                    }
                  />
                ))}

                {mode === "collect" ? (
                  <CollectionPanel
                    sections={sectionsState}
                    checkedItems={checkedItems}
                    procedureId={procedure.id}
                    procedureName={procedure.name}
                    uid={null}
                    isDark={false}
                  />
                ) : null}
              </>
            ) : (
              <div className="border-t border-[#D5EAF1] px-1 py-8 text-center text-[14px] text-[#61758B]">
                No sections match the current search.
              </div>
            )}
          </section>
        </main>

        <div className={`hidden lg:grid lg:min-h-0 lg:gap-4 ${desktopNavOpen ? "lg:grid-cols-[210px_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1fr)]"} lg:pl-0 lg:pr-4 lg:pt-4 lg:pb-4`}>
          {desktopNavOpen ? <WorkspaceNavRail currentNav="collections" /> : null}

        <main className="min-w-0 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[440px_minmax(0,1fr)_440px] lg:gap-0">
          <aside className="flex min-h-0 flex-col border-r border-[#C7DEE7] bg-[#F6FAFC]">
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              <section className="border-b border-[#C7DEE7] pb-5">
                <h1 className="text-[36px] font-semibold leading-tight tracking-[-0.03em] text-[#10243E]">{procedure.name}</h1>
                <p className="mt-2 text-[16px] leading-7 text-[#35546D]">{hierarchyLabel}</p>
              </section>

              <section className="mt-3 border-b border-[#C7DEE7]">
                <nav className="flex overflow-x-auto whitespace-nowrap text-[16px]">
                  {["Procedure", "Notes", "Suggest an edit", "More"].map((tab, index) => (
                    <button
                      key={tab}
                      type="button"
                      className={`border-b px-3 py-3 ${
                        index === 0 ? "border-[#2A96A8] font-semibold text-[#10243E]" : "border-transparent text-[#4C647A]"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </nav>
              </section>

              <section className="mt-3 border-b border-[#C7DEE7] pb-4">
                <div className="flex items-start gap-3 text-[16px] leading-7 text-[#35546D]">
                  <ShieldAlert size={20} className="mt-1 shrink-0 text-[#2A96A8]" />
                  <p>
                    Community reference card · Updated {formatUpdatedDate(procedure.updatedAt)}. Create a My Team version to adapt it locally.
                  </p>
                </div>
              </section>

              <section className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-[#C7DEE7] pb-4 text-[16px]">
                <button
                  type="button"
                  onClick={() => {
                    setCreateOpen((value) => !value)
                    setCreateMessage("")
                  }}
                  className="inline-flex items-center gap-2 font-medium text-[#0F4C5C] hover:text-[#10243E]"
                >
                  <Plus size={18} />
                  Create My Team version
                </button>
                <button type="button" onClick={() => setSaved((value) => !value)} className="inline-flex items-center gap-2 font-medium text-[#0F4C5C] hover:text-[#10243E]">
                  <Bookmark size={18} />
                  {saved ? "Bookmarked" : "Bookmark"}
                </button>
                <button type="button" className="inline-flex items-center gap-2 font-medium text-[#0F4C5C] hover:text-[#10243E]">
                  <Play size={18} />
                  Start procedure
                </button>
              </section>

              <section className="mt-4 flex flex-wrap gap-x-4 gap-y-3 text-[16px] text-[#4C647A]">
                <button type="button" onClick={() => setSaved((value) => !value)} className="inline-flex items-center gap-2 transition-colors hover:text-[#10243E]">
                  <Bookmark size={17} />
                  {saved ? 25 : 24} bookmarks
                </button>
                <button type="button" onClick={handleOpenLocalVariants} className="inline-flex items-center gap-2 transition-colors hover:text-[#10243E]">
                  <GitBranch size={17} />
                  3 My Team versions
                </button>
                <button type="button" onClick={() => setOpenVersionId((current) => (current ? "" : "global-current"))} className="inline-flex items-center gap-2 transition-colors hover:text-[#10243E]">
                  <Users size={17} />
                  3 contributors
                </button>
              </section>

              {createOpen ? (
                <section className="mt-4 border-b border-[#D5EAF1] pb-4">
                  <div className="space-y-3">
                    <input
                      value={cardName}
                      onChange={(event) => setCardName(event.target.value)}
                      placeholder="Hospital version name"
                      className="w-full rounded-[6px] border border-[#D5EAF1] bg-[#F8FBFD] px-3 py-2.5 text-[14px] text-[#10243E] outline-none placeholder:text-[#7B8EA3]"
                    />
                    {createMessage ? <p className="text-[13px] text-[#B65454]">{createMessage}</p> : null}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={isCreating}
                        onClick={handleCreateLocalCard}
                        className="rounded-[6px] bg-[#2A96A8] px-3 py-2 text-[13px] text-white disabled:opacity-60"
                      >
                        {isCreating ? "Saving..." : "Save to my hospital"}
                      </button>
                    </div>
                  </div>
                </section>
              ) : null}

              <section className="mt-5 border-t border-[#C7DEE7]">
                <div className="flex items-center justify-between border-b border-[#D9EBF0] px-1 py-3 text-[16px] text-[#10243E]">
                  <span className="font-semibold">Published versions</span>
                  <span className="font-medium text-[#35546D]">{versionEntries.length} published version{versionEntries.length === 1 ? "" : "s"}</span>
                </div>
                <div>
                  {versionEntries.map((version) => (
                    <div key={version.id} className="border-b border-[#DCE8ED] px-1 py-3 text-[16px]">
                      <button
                        type="button"
                        onClick={() => setOpenVersionId((current) => (current === version.id ? "" : version.id))}
                        className="flex w-full items-center justify-between gap-3 text-left"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-[#10243E]">{version.name}</span>
                          <span className="block truncate text-[14px] text-[#4C647A]">
                            Updated {formatUpdatedDate(version.updatedAt)}
                          </span>
                        </span>
                        <TriangleIcon
                          direction={openVersionId === version.id ? "up" : "down"}
                          size={10}
                          className="shrink-0 text-[#61758B]"
                        />
                      </button>
                      {openVersionId === version.id ? (
                        <div className="pt-2">
                          <div className="text-[14px] leading-6 text-[#4C647A]">{version.detail}</div>
                          <button
                            type="button"
                            onClick={() => router.push(version.href)}
                            className="mt-2 inline-flex items-center gap-1 text-[14px] font-medium text-[#0F4C5C]"
                          >
                            Open procedure guide
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </aside>

          <section className="border-r border-[#C7DEE7] bg-[#F6FAFC]">
            <div className="h-full overflow-y-auto px-6 py-6">
              {sectionsState.length > 0 ? (
                <>
                  {sectionsState.map((section) => (
                    <KardexSection
                      key={`${section.id}:${section.items.length}:${section.nurseNotes ?? ""}:${section.patientPositionInstructions ?? ""}:${section.externalLinks?.length ?? 0}`}
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
                      onSectionChange={(updatedSection) =>
                        setSectionsState((current) =>
                          current.map((entry) => (entry.id === updatedSection.id ? updatedSection : entry)),
                        )
                      }
                      onItemSelect={setSelectedItemInfo}
                    />
                  ))}

                  {mode === "collect" ? (
                    <CollectionPanel
                      sections={sectionsState}
                      checkedItems={checkedItems}
                      procedureId={procedure.id}
                      procedureName={procedure.name}
                      uid={null}
                      isDark={false}
                    />
                  ) : null}
                </>
              ) : (
                <div className="border-t border-[#D5EAF1] px-1 py-8 text-center text-[14px] text-[#61758B]">
                  No sections match the current search.
                </div>
              )}
            </div>
          </section>

          <aside className="bg-[#F4F7FA]">
            <div className="h-full overflow-hidden">
              <ItemDetailPanel
                className="shared-desktop-item-panel"
                info={selectedItemInfo}
                onClose={() => setSelectedItemInfo(null)}
              />
            </div>
          </aside>
        </main>
        </div>
      </div>
    </div>
  )
}
