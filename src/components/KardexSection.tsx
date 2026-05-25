"use client"

import type { PointerEvent as ReactPointerEvent } from "react"
import { useEffect, useState } from "react"
import { ExternalLink, Save, Check, Clock, SquarePen, Plus, Trash2, GripVertical } from "lucide-react"
import TriangleIcon from "@/components/TriangleIcon"
import ItemRow from "./ItemRow"
import CataloguePickerModal from "./CataloguePickerModal"
import ImplantCheckPanel from "./ImplantCheckPanel"
import { Section, Item, ItemDisplayInfo } from "@/lib/types"

interface Props {
  section: Section
  defaultOpen?: boolean
  anchorId?: string
  variant?: "default" | "community"
  isDark?: boolean
  showChecks?: boolean
  checkedItems?: Set<string>
  onItemCheck?: (itemId: string) => void
  implantSystem?: string
  procedureId?: string
  procedureName?: string
  uid?: string | null
  onSave?: () => void
  onSectionChange?: (section: Section) => void
  onItemSelect?: (info: ItemDisplayInfo) => void
  editHighlight?: boolean
  reorderActive?: boolean
  onReorderPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void
}

function today() {
  return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export default function KardexSection({
  section,
  defaultOpen = false,
  anchorId,
  variant = "default",
  isDark = false,
  showChecks = false,
  checkedItems,
  onItemCheck,
  implantSystem,
  procedureId,
  procedureName,
  uid,
  onSave,
  onSectionChange,
  onItemSelect,
  editHighlight = false,
  reorderActive = false,
  onReorderPointerDown,
}: Props) {
  const [open, setOpen]             = useState(defaultOpen)
  const [editMode, setEditMode]     = useState(false)
  const [savedFeedback, setSavedFeedback] = useState(false)
  const [localItems, setLocalItems] = useState<Item[]>(section.items)

  // Overview
  const [overviewSummary, setOverviewSummary] = useState(section.summary ?? "")
  const [overviewSummaryDraft, setOverviewSummaryDraft] = useState(section.summary ?? "")
  const [overviewDuration, setOverviewDuration] = useState(section.duration ?? "")
  const [overviewDurationDraft, setOverviewDurationDraft] = useState(section.duration ?? "")
  const [overviewAnaesthesia, setOverviewAnaesthesia] = useState(section.anaesthesiaType ?? "")
  const [overviewAnaesthesiaDraft, setOverviewAnaesthesiaDraft] = useState(section.anaesthesiaType ?? "")
  const [overviewPrimarySystem, setOverviewPrimarySystem] = useState(section.primarySystem ?? "")
  const [overviewPrimarySystemDraft, setOverviewPrimarySystemDraft] = useState(section.primarySystem ?? "")
  const [overviewAlternatives, setOverviewAlternatives] = useState(section.alternatives ?? [])
  const [overviewAlternativesDraft, setOverviewAlternativesDraft] = useState((section.alternatives ?? []).join("\n"))

  // Nurse prep notes
  const [nurseNotes, setNurseNotes]             = useState(section.nurseNotes ?? "")
  const [notesDraft, setNotesDraft]             = useState(section.nurseNotes ?? "")
  const [notesLastEdited, setNotesLastEdited]   = useState<string | null>(null)

  // Patient positioning
  const [positionText, setPositionText]   = useState(section.patientPositionInstructions ?? "")
  const [positionDraft, setPositionDraft] = useState(section.patientPositionInstructions ?? "")
  const [positionPending, setPositionPending] = useState(false)

  // Procedure reference links
  const [localOpTechUrl,      setLocalOpTechUrl]      = useState(section.operativeTechniqueUrl ?? "")
  const [localImplantUrl,     setLocalImplantUrl]      = useState(section.implantGuideUrl ?? "")
  const [localExternalLinks,  setLocalExternalLinks]   = useState<{ url: string; label: string }[]>(
    section.externalLinks ?? []
  )
  const [showCataloguePicker, setShowCataloguePicker] = useState(false)

  // Other text-only sections
  const [recoveryNotes, setRecoveryNotes] = useState(section.recoveryNotes ?? "")
  const [recoveryNotesDraft, setRecoveryNotesDraft] = useState(section.recoveryNotes ?? "")
  const [dischargeCriteria, setDischargeCriteria] = useState(section.dischargeCriteria ?? [])
  const [dischargeCriteriaDraft, setDischargeCriteriaDraft] = useState((section.dischargeCriteria ?? []).join("\n"))
  const [commonComplications, setCommonComplications] = useState(section.commonComplications ?? [])
  const [commonComplicationsDraft, setCommonComplicationsDraft] = useState((section.commonComplications ?? []).join("\n"))

  useEffect(() => {
    setLocalItems(section.items)
    setOverviewSummary(section.summary ?? "")
    setOverviewSummaryDraft(section.summary ?? "")
    setOverviewDuration(section.duration ?? "")
    setOverviewDurationDraft(section.duration ?? "")
    setOverviewAnaesthesia(section.anaesthesiaType ?? "")
    setOverviewAnaesthesiaDraft(section.anaesthesiaType ?? "")
    setOverviewPrimarySystem(section.primarySystem ?? "")
    setOverviewPrimarySystemDraft(section.primarySystem ?? "")
    setOverviewAlternatives(section.alternatives ?? [])
    setOverviewAlternativesDraft((section.alternatives ?? []).join("\n"))
    setNurseNotes(section.nurseNotes ?? "")
    setNotesDraft(section.nurseNotes ?? "")
    setPositionText(section.patientPositionInstructions ?? "")
    setPositionDraft(section.patientPositionInstructions ?? "")
    setLocalOpTechUrl(section.operativeTechniqueUrl ?? "")
    setLocalImplantUrl(section.implantGuideUrl ?? "")
    setLocalExternalLinks(section.externalLinks ?? [])
    setRecoveryNotes(section.recoveryNotes ?? "")
    setRecoveryNotesDraft(section.recoveryNotes ?? "")
    setDischargeCriteria(section.dischargeCriteria ?? [])
    setDischargeCriteriaDraft((section.dischargeCriteria ?? []).join("\n"))
    setCommonComplications(section.commonComplications ?? [])
    setCommonComplicationsDraft((section.commonComplications ?? []).join("\n"))
  }, [section])

  function handleEditSave() {
    if (!canEditSection) return
    if (editMode) {
      const nextAlternatives = overviewAlternativesDraft.split("\n").map((entry) => entry.trim()).filter(Boolean)
      const nextDischargeCriteria = dischargeCriteriaDraft.split("\n").map((entry) => entry.trim()).filter(Boolean)
      const nextCommonComplications = commonComplicationsDraft.split("\n").map((entry) => entry.trim()).filter(Boolean)

      setOverviewSummary(overviewSummaryDraft)
      setOverviewDuration(overviewDurationDraft)
      setOverviewAnaesthesia(overviewAnaesthesiaDraft)
      setOverviewPrimarySystem(overviewPrimarySystemDraft)
      setOverviewAlternatives(nextAlternatives)
      // Commit nurse notes
      if (notesDraft !== nurseNotes) {
        setNurseNotes(notesDraft)
        setNotesLastEdited(today())
      }
      // Commit positioning
      if (positionDraft !== positionText) {
        setPositionText(positionDraft)
        setPositionPending(true)
      }
      setRecoveryNotes(recoveryNotesDraft)
      setDischargeCriteria(nextDischargeCriteria)
      setCommonComplications(nextCommonComplications)
      emitSectionChange({
        items: localItems,
        summary: overviewSummaryDraft.trim() || undefined,
        duration: overviewDurationDraft.trim() || undefined,
        anaesthesiaType: overviewAnaesthesiaDraft.trim() || undefined,
        primarySystem: overviewPrimarySystemDraft.trim() || undefined,
        alternatives: nextAlternatives,
        nurseNotes: notesDraft,
        patientPositionInstructions: positionDraft,
        operativeTechniqueUrl: localOpTechUrl,
        implantGuideUrl: localImplantUrl,
        externalLinks: localExternalLinks,
        recoveryNotes: recoveryNotesDraft.trim() || undefined,
        dischargeCriteria: nextDischargeCriteria,
        commonComplications: nextCommonComplications,
      })
      setEditMode(false)
      setSavedFeedback(true)
      setTimeout(() => setSavedFeedback(false), 1500)
      onSave?.()
    } else {
      setOverviewSummaryDraft(overviewSummary)
      setOverviewDurationDraft(overviewDuration)
      setOverviewAnaesthesiaDraft(overviewAnaesthesia)
      setOverviewPrimarySystemDraft(overviewPrimarySystem)
      setOverviewAlternativesDraft(overviewAlternatives.join("\n"))
      // Enter edit mode — sync drafts from committed values
      setNotesDraft(nurseNotes)
      setPositionDraft(positionText)
      setRecoveryNotesDraft(recoveryNotes)
      setDischargeCriteriaDraft(dischargeCriteria.join("\n"))
      setCommonComplicationsDraft(commonComplications.join("\n"))
      setEditMode(true)
    }
  }

  function deleteItem(id: string) {
    setLocalItems((prev) => {
      const next = prev.filter((i) => i.id !== id)
      onSectionChange?.({ ...section, items: next })
      return next
    })
  }

  function handleItemSave(updatedItem: Item) {
    setLocalItems((prev) => {
      const next = prev.map((i) => (i.id === updatedItem.id ? updatedItem : i))
      onSectionChange?.({ ...section, items: next })
      return next
    })
    onSave?.()
  }

  function addExternalLink() {
    setLocalExternalLinks((prev) => [...prev, { label: "", url: "" }])
  }

  function updateExternalLink(i: number, field: "label" | "url", value: string) {
    setLocalExternalLinks((prev) =>
      prev.map((link, idx) => (idx === i ? { ...link, [field]: value } : link))
    )
  }

  function removeExternalLink(i: number) {
    setLocalExternalLinks((prev) => prev.filter((_, idx) => idx !== i))
  }

  function addItemFromCatalogue(item: Item) {
    setLocalItems((prev) => {
      const next = [...prev, item]
      onSectionChange?.({ ...section, items: next })
      return next
    })
    setShowCataloguePicker(false)
  }

  const isProcedureRef  = section.sectionType === "procedure_reference"
  const isNurseNotes    = section.sectionType === "nurse_prep_notes"
  const isPositioning   = section.sectionType === "patient_positioning"
  const isOverview      = section.sectionType === "overview"
  const isPostCare      = section.sectionType === "post_procedure_care"
  const isDischarge     = section.sectionType === "discharge_criteria"
  const isComplications = section.sectionType === "complications_escalation"
  const isHandover      = section.sectionType === "handover_notes"
  const isImplants      = section.sectionType === "implants_prosthetics"
  const canEditSection  = section.contentMode !== "fixed"
  const isCommunity = variant === "community"
  const headerClass = isDark
    ? "bg-[#003d54]"
    : editHighlight ? "bg-[#F2B6BF]" : isCommunity ? "bg-[#D9EFF7]" : "bg-[#00B4D8]"
  const headerHoverClass = isDark
    ? "hover:bg-[#004a66]"
    : editHighlight ? "hover:bg-[#EBA5B1]" : isCommunity ? "hover:bg-[#C8E7F3]" : "hover:bg-[#33C4E2]"
  const headerTitleClass = isDark
    ? "flex-1 flex items-center gap-3 px-4 py-3.5 text-left text-[17px] font-medium text-white transition-colors lg:px-7 lg:py-4 lg:text-[22px]"
    : isCommunity
      ? "flex-1 flex items-center gap-3 px-4 py-3.5 text-left text-[17px] font-medium text-[#10243E] transition-colors lg:px-7 lg:py-4 lg:text-[22px]"
      : "flex-1 flex items-center gap-3 px-4 py-3.5 text-left text-base font-semibold text-[#10243E] transition-colors lg:px-7 lg:py-5 lg:text-[24px]"


  function emitSectionChange(overrides?: Partial<Section>) {
    onSectionChange?.({
      ...section,
      items: localItems,
      nurseNotes,
      summary: overviewSummary,
      duration: overviewDuration,
      anaesthesiaType: overviewAnaesthesia,
      primarySystem: overviewPrimarySystem,
      alternatives: overviewAlternatives,
      patientPositionInstructions: positionText,
      operativeTechniqueUrl: localOpTechUrl,
      implantGuideUrl: localImplantUrl,
      externalLinks: localExternalLinks,
      recoveryNotes,
      dischargeCriteria,
      commonComplications,
      ...overrides,
    })
  }

  return (
    <div id={anchorId} className="kardex-section mb-1 scroll-mt-24">
      <div className={`kardex-section-header flex items-center transition-colors ${headerClass}`}>
        <button
          onClick={() => setOpen(!open)}
          className={`${headerTitleClass} ${headerHoverClass}`}
        >
          {reorderActive ? (
            <span
              onPointerDown={onReorderPointerDown}
              onClick={(event) => event.stopPropagation()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 text-[#0F4C5C] touch-none cursor-grab active:cursor-grabbing"
              aria-label="Drag to rearrange"
              role="button"
            >
              <GripVertical size={18} />
            </span>
          ) : null}
          <span className="flex-1">{section.title}</span>
        </button>

        {open && canEditSection && (
          savedFeedback ? (
            <div className="ml-2 mr-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <Check size={14} className="text-white" />
            </div>
          ) : (
            <button
              onClick={handleEditSave}
              className={`ml-2 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors shrink-0 lg:mr-4 lg:px-5 lg:py-2.5 lg:text-[20px] ${
                editMode
                  ? "border-[#0F4C5C] bg-[#0F4C5C] text-white hover:bg-[#136275]"
                  : isDark ? "border-[#0b5f7d] bg-black text-[#0096C7] hover:bg-[#05131a]" : "border-[#8CCFDF] bg-white/80 text-[#0096C7] hover:bg-[#EEF9FC]"
              }`}
              aria-label={editMode ? "Save changes" : "Edit section"}
            >
              {editMode
                ? <><Save size={13} /> Save</>
                : <><SquarePen size={13} /> Edit</>
              }
            </button>
          )
        )}

        <button
          onClick={() => setOpen(!open)}
          className={`px-4 py-3.5 transition-colors lg:px-6 ${isDark ? "text-[#0096C7]" : "text-[#10243E]"} ${headerHoverClass}`}
        >
          {open ? <TriangleIcon direction="up" size={12} /> : <TriangleIcon direction="down" size={12} />}
        </button>
      </div>

      {open && (
        <div className={`kardex-section-body px-4 py-2 lg:px-7 lg:py-4 ${isDark ? "bg-black text-[#e0e0e0]" : "bg-white"}`}>

          {/* ── OVERVIEW ───────────────────────────────────────────── */}
          {isOverview && (
            <div className="py-2 space-y-3">
              {editMode ? (
                <div className="space-y-3">
                  <textarea
                    value={overviewSummaryDraft}
                    onChange={(e) => setOverviewSummaryDraft(e.target.value)}
                    rows={4}
                    placeholder="Overview summary"
                    className={`w-full resize-none rounded-xl border px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${isDark ? "border-[#2d2d2d] bg-[#111111] text-[#e0e0e0] placeholder:text-[#555555]" : "border-[#D5DCE3] bg-white text-[#10243E] placeholder:text-[#7A8DA3]"}`}
                  />
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div>
                      <p className={`mb-1 text-xs tracking-wide lg:text-[18px] ${isDark ? "text-white" : "text-[#61758B]"}`}>Duration</p>
                      <input
                        type="text"
                        value={overviewDurationDraft}
                        onChange={(e) => setOverviewDurationDraft(e.target.value)}
                        placeholder="e.g. 90 mins"
                        className={`w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${isDark ? "border-[#2d2d2d] bg-[#111111] text-[#e0e0e0] placeholder:text-[#555555]" : "border-[#D5DCE3] bg-white text-[#10243E] placeholder:text-[#7A8DA3]"}`}
                      />
                    </div>
                    <div>
                      <p className={`mb-1 text-xs tracking-wide lg:text-[18px] ${isDark ? "text-white" : "text-[#61758B]"}`}>Anaesthesia</p>
                      <input
                        type="text"
                        value={overviewAnaesthesiaDraft}
                        onChange={(e) => setOverviewAnaesthesiaDraft(e.target.value)}
                        placeholder="e.g. Spinal"
                        className={`w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${isDark ? "border-[#2d2d2d] bg-[#111111] text-[#e0e0e0] placeholder:text-[#555555]" : "border-[#D5DCE3] bg-white text-[#10243E] placeholder:text-[#7A8DA3]"}`}
                      />
                    </div>
                    <div>
                      <p className={`mb-1 text-xs tracking-wide lg:text-[18px] ${isDark ? "text-white" : "text-[#61758B]"}`}>System</p>
                      <input
                        type="text"
                        value={overviewPrimarySystemDraft}
                        onChange={(e) => setOverviewPrimarySystemDraft(e.target.value)}
                        placeholder="Primary system"
                        className={`w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${isDark ? "border-[#2d2d2d] bg-[#111111] text-[#e0e0e0] placeholder:text-[#555555]" : "border-[#D5DCE3] bg-white text-[#10243E] placeholder:text-[#7A8DA3]"}`}
                      />
                    </div>
                  </div>
                  <div>
                    <p className={`mb-1 text-xs tracking-wide lg:text-[18px] ${isDark ? "text-white" : "text-[#61758B]"}`}>Alternatives</p>
                    <textarea
                      value={overviewAlternativesDraft}
                      onChange={(e) => setOverviewAlternativesDraft(e.target.value)}
                      rows={4}
                      placeholder="One alternative per line"
                      className={`w-full resize-none rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${isDark ? "border-[#2d2d2d] bg-[#111111] text-[#e0e0e0] placeholder:text-[#555555]" : "border-[#D5DCE3] bg-white text-[#10243E] placeholder:text-[#7A8DA3]"}`}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {overviewSummary && (
                    <p className={`text-base leading-relaxed lg:text-[20px] lg:text-lg lg:leading-8 ${isDark ? "text-[#e0e0e0]" : "text-[#10243E]"}`}>{overviewSummary}</p>
                  )}
                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    {overviewDuration && (
                      <div>
                        <p className={`text-xs tracking-wide lg:text-[18px] ${isDark ? "text-white" : "text-[#61758B]"}`}>Duration</p>
                        <p className={`text-sm font-semibold lg:text-[20px] ${isDark ? "text-[#e0e0e0]" : "text-[#10243E]"}`}>{overviewDuration}</p>
                      </div>
                    )}
                    {overviewAnaesthesia && (
                      <div>
                        <p className={`text-xs tracking-wide lg:text-[18px] ${isDark ? "text-white" : "text-[#61758B]"}`}>Anaesthesia</p>
                        <p className={`text-sm font-semibold lg:text-[20px] ${isDark ? "text-[#e0e0e0]" : "text-[#10243E]"}`}>{overviewAnaesthesia}</p>
                      </div>
                    )}
                    {overviewPrimarySystem && (
                      <div>
                        <p className={`text-xs tracking-wide lg:text-[18px] ${isDark ? "text-white" : "text-[#61758B]"}`}>System</p>
                        <p className={`text-sm font-semibold lg:text-[20px] ${isDark ? "text-[#e0e0e0]" : "text-[#10243E]"}`}>{overviewPrimarySystem}</p>
                      </div>
                    )}
                  </div>
                  {overviewAlternatives.length > 0 && (
                    <div>
                      <p className={`text-xs tracking-wide lg:text-[18px] mb-1 ${isDark ? "text-white" : "text-[#61758B]"}`}>Alternatives</p>
                      <div className="flex flex-wrap gap-1.5">
                        {overviewAlternatives.map((alt) => (
                          <span
                            key={alt}
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${isDark ? "border-[#2d2d2d] bg-[#1a1a1a] text-white" : "border-[#D5EAF1] bg-[#F8FBFD] text-[#406175]"}`}
                          >
                            {alt}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── PROCEDURE REFERENCE ────────────────────────────────── */}
          {isProcedureRef && (
            <div className="py-2 space-y-4">
              {editMode ? (
                /* Edit mode — link inputs */
                <div className="space-y-3">
                  <p className={`text-xs tracking-wide lg:text-[18px] ${isDark ? "text-white" : "text-[#61758B]"}`}>Edit references</p>

                  <div>
                    <label className={`text-xs font-medium block mb-1.5 ${isDark ? "text-white" : "text-[#64748b]"}`}>
                      Operative Technique URL
                    </label>
                    <input
                      type="url"
                      value={localOpTechUrl}
                      onChange={(e) => setLocalOpTechUrl(e.target.value)}
                      placeholder="https://"
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${isDark ? "border-[#2d2d2d] bg-[#1a1a1a] text-[#e0e0e0] placeholder:text-[#555555]" : "border-[#D5DCE3] bg-white text-[#10243E] placeholder:text-[#7A8DA3]"}`}
                    />
                  </div>

                  <div>
                    <label className={`text-xs font-medium block mb-1.5 ${isDark ? "text-white" : "text-[#64748b]"}`}>
                      Implant Guide / Catalogue URL
                    </label>
                    <input
                      type="url"
                      value={localImplantUrl}
                      onChange={(e) => setLocalImplantUrl(e.target.value)}
                      placeholder="https://"
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${isDark ? "border-[#2d2d2d] bg-[#1a1a1a] text-[#e0e0e0] placeholder:text-[#555555]" : "border-[#D5DCE3] bg-white text-[#10243E] placeholder:text-[#7A8DA3]"}`}
                    />
                  </div>

                  {localExternalLinks.map((link, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-1.5">
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) => updateExternalLink(i, "label", e.target.value)}
                          placeholder="Link label"
                          className={`w-full rounded-xl border px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${isDark ? "border-[#2d2d2d] bg-[#1a1a1a] text-[#e0e0e0] placeholder:text-[#555555]" : "border-[#D5DCE3] bg-white text-[#10243E] placeholder:text-[#7A8DA3]"}`}
                        />
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => updateExternalLink(i, "url", e.target.value)}
                          placeholder="https://"
                          className={`w-full rounded-xl border px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${isDark ? "border-[#2d2d2d] bg-[#1a1a1a] text-[#e0e0e0] placeholder:text-[#555555]" : "border-[#D5DCE3] bg-white text-[#10243E] placeholder:text-[#7A8DA3]"}`}
                        />
                      </div>
                      <button
                        onClick={() => removeExternalLink(i)}
                        className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${isDark ? "bg-[#1a1a1a] text-[#0096C7] hover:bg-[#252525]" : "bg-[#EEF9FC] text-[#0F4C5C] hover:bg-[#DDF4FA]"}`}
                        aria-label="Remove link"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={addExternalLink}
                    className={`flex items-center gap-1.5 text-sm font-semibold ${isDark ? "text-[#0096C7]" : "text-[#0F4C5C]"}`}
                  >
                    <Plus size={14} /> Add link
                  </button>
                </div>
              ) : (
                /* View mode — link list */
                (localOpTechUrl || localImplantUrl || localExternalLinks.some((l) => l.url)) && (
                  <div className="space-y-2">
                    <p className={`text-xs tracking-wide lg:text-[18px] ${isDark ? "text-white" : "text-[#61758B]"}`}>References</p>
                    {localOpTechUrl && (
                      <a
                        href={localOpTechUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 text-base font-semibold lg:text-[20px] underline underline-offset-2 ${isDark ? "text-[#0096C7]" : "text-[#0F4C5C]"}`}
                      >
                        <ExternalLink size={16} className="shrink-0" />
                        Operative Technique
                      </a>
                    )}
                    {localImplantUrl && (
                      <a
                        href={localImplantUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 text-base font-semibold lg:text-[20px] underline underline-offset-2 ${isDark ? "text-[#0096C7]" : "text-[#0F4C5C]"}`}
                      >
                        <ExternalLink size={16} className="shrink-0" />
                        Implant Guide / Catalogue
                      </a>
                    )}
                    {localExternalLinks.filter((l) => l.url).map((link, i) => (
                      <a
                        key={`${link.url}-${i}`}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 text-base font-semibold lg:text-[20px] underline underline-offset-2 ${isDark ? "text-[#0096C7]" : "text-[#0F4C5C]"}`}
                      >
                        <ExternalLink size={16} className="shrink-0" />
                        {link.label || link.url}
                      </a>
                    ))}
                  </div>
                )
              )}
            </div>
          )}

          {/* ── NURSE PREP NOTES ───────────────────────────────────── */}
          {isNurseNotes && (
            <div className={`my-2 rounded-xl border p-4 ${isDark ? "border-[#2d2d2d] bg-[#1a1a1a]" : "border-[#D5EAF1] bg-[#F8FBFD]"}`}>
              <p className={`text-xs tracking-wide lg:text-[18px] mb-2 ${isDark ? "text-white" : "text-[#61758B]"}`}>Nurse prep notes</p>
              {editMode ? (
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  rows={5}
                  className={`w-full resize-none rounded-xl border px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${isDark ? "border-[#2d2d2d] bg-[#111111] text-[#e0e0e0]" : "border-[#D5DCE3] bg-white text-[#10243E]"}`}
                />
              ) : (
                <>
                  <p className={`whitespace-pre-wrap text-base leading-relaxed lg:text-[20px] ${isDark ? "text-[#e0e0e0]" : "text-[#475569]"}`}>
                    {nurseNotes || <span className={isDark ? "text-white" : "text-[#5D8A97]"}>No prep notes added yet.</span>}
                  </p>
                  {notesLastEdited && (
                    <p className={`mt-2 text-xs flex items-center gap-1 ${isDark ? "text-white" : "text-[#A7D8E2]"}`}>
                      <Clock size={11} /> Last edited by You · {notesLastEdited}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── PATIENT POSITIONING ────────────────────────────────── */}
          {isPositioning && (
            <div className={`mt-2 mb-3 rounded-xl border p-4 ${isDark ? "border-[#2d2d2d] bg-[#1a1a1a]" : "border-[#D5EAF1] bg-[#F8FBFD]"}`}>
              <p className={`text-xs tracking-wide lg:text-[18px] mb-2 ${isDark ? "text-white" : "text-[#61758B]"}`}>Patient positioning</p>
              {editMode ? (
                <>
                  <textarea
                    value={positionDraft}
                    onChange={(e) => setPositionDraft(e.target.value)}
                    rows={5}
                    className={`w-full resize-none rounded-xl border px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${isDark ? "border-[#2d2d2d] bg-[#111111] text-[#e0e0e0]" : "border-[#D5DCE3] bg-white text-[#10243E]"}`}
                  />
                  <p className="mt-2 text-xs text-[#FFD58A] flex items-center gap-1">
                    ⚠ Changes to patient positioning require clinical approval before publishing.
                  </p>
                </>
              ) : (
                <>
                  <p className={`whitespace-pre-wrap text-base leading-relaxed lg:text-[20px] ${isDark ? "text-[#e0e0e0]" : "text-[#475569]"}`}>
                    {positionText || <span className={isDark ? "text-white" : "text-[#5D8A97]"}>No positioning instructions set.</span>}
                  </p>
                  {positionPending && (
                    <p className="mt-2 text-xs text-[#FFD58A] flex items-center gap-1">
                      <Clock size={11} /> Pending clinical approval
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── POST-PROCEDURE CARE ────────────────────────────────── */}
          {isPostCare && (
            <div className={`my-2 rounded-xl border p-4 ${isDark ? "border-[#2d2d2d] bg-[#1a1a1a]" : "border-[#D5EAF1] bg-[#F8FBFD]"}`}>
              <p className={`text-xs tracking-wide lg:text-[18px] mb-2 ${isDark ? "text-white" : "text-[#61758B]"}`}>Recovery notes</p>
              {editMode ? (
                <textarea
                  value={recoveryNotesDraft}
                  onChange={(e) => setRecoveryNotesDraft(e.target.value)}
                  rows={5}
                  className={`w-full resize-none rounded-xl border px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${isDark ? "border-[#2d2d2d] bg-[#111111] text-[#e0e0e0]" : "border-[#D5DCE3] bg-white text-[#10243E]"}`}
                />
              ) : (
                <p className={`whitespace-pre-wrap text-base leading-relaxed lg:text-[20px] ${isDark ? "text-[#e0e0e0]" : "text-[#475569]"}`}>{recoveryNotes || "No recovery notes added yet."}</p>
              )}
            </div>
          )}

          {/* ── DISCHARGE CRITERIA ─────────────────────────────────── */}
          {isDischarge && (
            <div className="py-2">
              <p className={`text-xs tracking-wide lg:text-[18px] mb-2 ${isDark ? "text-white" : "text-[#61758B]"}`}>Discharge criteria</p>
              {editMode ? (
                <textarea
                  value={dischargeCriteriaDraft}
                  onChange={(e) => setDischargeCriteriaDraft(e.target.value)}
                  rows={5}
                  placeholder="One criterion per line"
                  className={`w-full resize-none rounded-xl border px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${isDark ? "border-[#2d2d2d] bg-[#111111] text-[#e0e0e0] placeholder:text-[#555555]" : "border-[#D5DCE3] bg-white text-[#10243E] placeholder:text-[#7A8DA3]"}`}
                />
              ) : (
                <ul className="space-y-1">
                  {dischargeCriteria.map((criterion, i) => (
                    <li key={i} className={`flex items-start gap-2 text-sm lg:text-[20px] lg:text-base ${isDark ? "text-[#e0e0e0]" : "text-[#475569]"}`}>
                      <span className="text-emerald-500 mt-0.5">✓</span>
                      {criterion}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ── COMPLICATIONS & ESCALATION ─────────────────────────── */}
          {isComplications && (
            <div className="py-2">
              <p className={`text-xs tracking-wide lg:text-[18px] mb-2 ${isDark ? "text-white" : "text-[#61758B]"}`}>Common complications</p>
              {editMode ? (
                <textarea
                  value={commonComplicationsDraft}
                  onChange={(e) => setCommonComplicationsDraft(e.target.value)}
                  rows={5}
                  placeholder="One complication per line"
                  className={`w-full resize-none rounded-xl border px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${isDark ? "border-[#2d2d2d] bg-[#111111] text-[#e0e0e0] placeholder:text-[#555555]" : "border-[#D5DCE3] bg-white text-[#10243E] placeholder:text-[#7A8DA3]"}`}
                />
              ) : (
                <ul className="space-y-1">
                  {commonComplications.map((c, i) => (
                    <li key={i} className={`flex items-start gap-2 text-sm lg:text-[20px] lg:text-base ${isDark ? "text-[#e0e0e0]" : "text-[#475569]"}`}>
                      <span className="text-amber-500 mt-0.5">⚠</span>
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ── HANDOVER NOTES ─────────────────────────────────────── */}
          {isHandover && (
            <div className="space-y-4 py-2">
              {(editMode || recoveryNotes) && (
                <div className={`rounded-xl border p-4 ${isDark ? "border-[#2d2d2d] bg-[#1a1a1a]" : "border-[#D5EAF1] bg-[#F8FBFD]"}`}>
                  <p className={`text-xs tracking-wide lg:text-[18px] mb-2 ${isDark ? "text-white" : "text-[#61758B]"}`}>Post-op care</p>
                  {editMode ? (
                    <textarea
                      value={recoveryNotesDraft}
                      onChange={(e) => setRecoveryNotesDraft(e.target.value)}
                      rows={4}
                      className={`w-full resize-none rounded-xl border px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${isDark ? "border-[#2d2d2d] bg-[#111111] text-[#e0e0e0]" : "border-[#D5DCE3] bg-white text-[#10243E]"}`}
                    />
                  ) : (
                    <p className={`whitespace-pre-wrap text-base leading-relaxed lg:text-[20px] ${isDark ? "text-[#e0e0e0]" : "text-[#475569]"}`}>{recoveryNotes}</p>
                  )}
                </div>
              )}
              {(editMode || dischargeCriteria.length > 0) && (
                <div>
                  <p className={`text-xs tracking-wide lg:text-[18px] mb-2 ${isDark ? "text-white" : "text-[#61758B]"}`}>Discharge criteria</p>
                  {editMode ? (
                    <textarea
                      value={dischargeCriteriaDraft}
                      onChange={(e) => setDischargeCriteriaDraft(e.target.value)}
                      rows={4}
                      placeholder="One criterion per line"
                      className={`w-full resize-none rounded-xl border px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${isDark ? "border-[#2d2d2d] bg-[#111111] text-[#e0e0e0] placeholder:text-[#555555]" : "border-[#D5DCE3] bg-white text-[#10243E] placeholder:text-[#7A8DA3]"}`}
                    />
                  ) : (
                    <ul className="space-y-1">
                      {dischargeCriteria.map((criterion, i) => (
                        <li key={i} className={`flex items-start gap-2 text-sm lg:text-[20px] ${isDark ? "text-[#e0e0e0]" : "text-[#475569]"}`}>
                          <span className="text-emerald-500 mt-0.5">✓</span>
                          {criterion}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {(editMode || commonComplications.length > 0) && (
                <div>
                  <p className={`text-xs tracking-wide lg:text-[18px] mb-2 ${isDark ? "text-white" : "text-[#61758B]"}`}>Complications & escalation</p>
                  {editMode ? (
                    <textarea
                      value={commonComplicationsDraft}
                      onChange={(e) => setCommonComplicationsDraft(e.target.value)}
                      rows={4}
                      placeholder="One complication per line"
                      className={`w-full resize-none rounded-xl border px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${isDark ? "border-[#2d2d2d] bg-[#111111] text-[#e0e0e0] placeholder:text-[#555555]" : "border-[#D5DCE3] bg-white text-[#10243E] placeholder:text-[#7A8DA3]"}`}
                    />
                  ) : (
                    <ul className="space-y-1">
                      {commonComplications.map((c, i) => (
                        <li key={i} className={`flex items-start gap-2 text-sm lg:text-[20px] ${isDark ? "text-[#e0e0e0]" : "text-[#475569]"}`}>
                          <span className="text-amber-500 mt-0.5">⚠</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── IMPLANTS STOCK CHECK ──────────────────────────────── */}
          {isImplants && implantSystem && (
            <ImplantCheckPanel
              implantSystem={implantSystem}
              procedureId={procedureId ?? "unknown"}
              procedureName={procedureName ?? ""}
              uid={uid ?? null}
            />
          )}

          {/* ── ITEMS LIST ────────────────────────────────────────── */}
          {/* Suppress scaffold placeholder items in the implants section — the ImplantCheckPanel is the checklist */}
          {isImplants && implantSystem && !editMode ? null : (
          <>
          {editMode && canEditSection && (
            <div className="mb-3 flex justify-end">
              <button
                onClick={() => setShowCataloguePicker(true)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${isDark ? "border-[#2d2d2d] bg-[#111111] text-[#e0e0e0] hover:bg-[#171717]" : "border-[#D5EAF1] bg-[#F8FBFD] text-[#10243E] hover:bg-[#EEF9FC]"}`}
              >
                <Plus size={13} /> Add from catalogue
              </button>
            </div>
          )}

          {localItems.length > 0 && (
            <>
              {/* Desktop column headers */}
              <div className={`hidden lg:flex items-center gap-5 border-b px-4 py-2 ${isDark ? "border-[#2d2d2d] bg-[#1a1a1a]" : "border-[#D5EAF1] bg-[#F8FBFD]"}`}>
                <div className="flex-1 min-w-0" />
                <div className="w-60 shrink-0">
                  <p className={`text-[20px] font-semibold ${isDark ? "text-white" : "text-[#A7D8E2]"}`}>Location</p>
                </div>
                <div className="w-28 shrink-0 text-center">
                  <p className={`text-[20px] font-semibold ${isDark ? "text-white" : "text-[#A7D8E2]"}`}>Quantity</p>
                </div>
              </div>

              {localItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  sectionType={section.sectionType}
                  editMode={editMode}
                  onDelete={() => deleteItem(item.id)}
                  onItemSave={handleItemSave}
                  isChecked={showChecks ? (checkedItems?.has(item.id) ?? false) : false}
                  onCheck={showChecks && onItemCheck ? () => onItemCheck(item.id) : undefined}
                  onSelect={onItemSelect
                    ? (info) => onItemSelect({ ...info, sectionId: section.id })
                    : undefined}
                />
              ))}
            </>
          )}
          </>
          )}

        </div>
      )}

      {showCataloguePicker && (
        <CataloguePickerModal
          sectionType={section.sectionType}
          onClose={() => setShowCataloguePicker(false)}
          onSelect={addItemFromCatalogue}
        />
      )}
    </div>
  )
}
