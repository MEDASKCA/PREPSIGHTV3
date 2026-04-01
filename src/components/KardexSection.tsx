"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, ExternalLink, Save, Check, Clock, SquarePen, Plus, Trash2 } from "lucide-react"
import ItemRow from "./ItemRow"
import CataloguePickerModal from "./CataloguePickerModal"
import ImplantCheckPanel from "./ImplantCheckPanel"
import { Section, Item, ItemDisplayInfo } from "@/lib/types"

interface Props {
  section: Section
  defaultOpen?: boolean
  anchorId?: string
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
}

function today() {
  return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export default function KardexSection({
  section,
  defaultOpen = false,
  anchorId,
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
}: Props) {
  const [open, setOpen]             = useState(defaultOpen)
  const [editMode, setEditMode]     = useState(false)
  const [savedFeedback, setSavedFeedback] = useState(false)
  const [localItems, setLocalItems] = useState<Item[]>(section.items)

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

  function handleEditSave() {
    if (!canEditSection) return
    if (editMode) {
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
      emitSectionChange({
        items: localItems,
        nurseNotes: notesDraft,
        patientPositionInstructions: positionDraft,
        operativeTechniqueUrl: localOpTechUrl,
        implantGuideUrl: localImplantUrl,
        externalLinks: localExternalLinks,
      })
      setEditMode(false)
      setSavedFeedback(true)
      setTimeout(() => setSavedFeedback(false), 1500)
      onSave?.()
    } else {
      // Enter edit mode — sync drafts from committed values
      setNotesDraft(nurseNotes)
      setPositionDraft(positionText)
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


  function emitSectionChange(overrides?: Partial<Section>) {
    onSectionChange?.({
      ...section,
      items: localItems,
      nurseNotes,
      patientPositionInstructions: positionText,
      operativeTechniqueUrl: localOpTechUrl,
      implantGuideUrl: localImplantUrl,
      externalLinks: localExternalLinks,
      ...overrides,
    })
  }

  return (
    <div id={anchorId} className="kardex-section mb-1 scroll-mt-24">
      <div className="kardex-section-header flex items-center bg-[#00B4D8] transition-colors">
        <button
          onClick={() => setOpen(!open)}
          className="flex-1 flex items-center gap-3 px-4 py-3.5 text-left text-base font-semibold text-[#10243E] transition-colors hover:bg-[#33C4E2] lg:px-7 lg:py-5 lg:text-[24px]"
        >
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
              className={`ml-2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors shrink-0 lg:mr-4 lg:px-5 lg:py-2.5 lg:text-[20px] ${
                editMode
                  ? "bg-[#0F4C5C] text-white hover:bg-[#136275]"
                  : "bg-white/80 text-[#10243E] hover:bg-[#EEF9FC]"
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
          className="px-4 py-3.5 text-[#10243E] transition-colors hover:bg-[#33C4E2] lg:px-6"
        >
          {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {open && (
        <div className="kardex-section-body bg-white px-4 py-2 lg:px-7 lg:py-4">

          {/* ── OVERVIEW ───────────────────────────────────────────── */}
          {isOverview && (section.summary || section.duration || section.anaesthesiaType || section.primarySystem || section.alternatives?.length) && (
            <div className="py-2 space-y-3">
              {section.summary && (
                <p className="text-base leading-relaxed text-[#10243E] lg:text-[20px] lg:text-lg lg:leading-8">{section.summary}</p>
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {section.duration && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#61758B] lg:text-[18px]">Duration</p>
                    <p className="text-sm font-semibold text-[#10243E] lg:text-[20px]">{section.duration}</p>
                  </div>
                )}
                {section.anaesthesiaType && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#61758B] lg:text-[18px]">Anaesthesia</p>
                    <p className="text-sm font-semibold text-[#10243E] lg:text-[20px]">{section.anaesthesiaType}</p>
                  </div>
                )}
                {section.primarySystem && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#61758B] lg:text-[18px]">System</p>
                    <p className="text-sm font-semibold text-[#10243E] lg:text-[20px]">{section.primarySystem}</p>
                  </div>
                )}
              </div>
              {section.alternatives && section.alternatives.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#61758B] lg:text-[18px] mb-1">Alternatives</p>
                  <div className="flex flex-wrap gap-1.5">
                    {section.alternatives.map((alt) => (
                      <span
                        key={alt}
                        className="rounded-full border border-[#D5EAF1] bg-[#F8FBFD] px-2.5 py-0.5 text-xs font-medium text-[#406175]"
                      >
                        {alt}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PROCEDURE REFERENCE ────────────────────────────────── */}
          {isProcedureRef && (
            <div className="py-2 space-y-4">
              {editMode ? (
                /* Edit mode — link inputs */
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wide text-[#61758B] lg:text-[18px]">Edit references</p>

                  <div>
                    <label className="text-xs text-[#64748b] font-medium block mb-1.5">
                      Operative Technique URL
                    </label>
                    <input
                      type="url"
                      value={localOpTechUrl}
                      onChange={(e) => setLocalOpTechUrl(e.target.value)}
                      placeholder="https://"
                        className="w-full rounded-xl border border-[#D5DCE3] bg-white px-3 py-2.5 text-sm text-[#10243E] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#00B4D8] placeholder:text-[#7A8DA3]"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#64748b] font-medium block mb-1.5">
                      Implant Guide / Catalogue URL
                    </label>
                    <input
                      type="url"
                      value={localImplantUrl}
                      onChange={(e) => setLocalImplantUrl(e.target.value)}
                      placeholder="https://"
                        className="w-full rounded-xl border border-[#D5DCE3] bg-white px-3 py-2.5 text-sm text-[#10243E] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#00B4D8] placeholder:text-[#7A8DA3]"
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
                          className="w-full rounded-xl border border-[#D5DCE3] bg-white px-3 py-2 text-sm text-[#10243E] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#00B4D8] placeholder:text-[#7A8DA3]"
                        />
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => updateExternalLink(i, "url", e.target.value)}
                          placeholder="https://"
                          className="w-full rounded-xl border border-[#D5DCE3] bg-white px-3 py-2 text-sm text-[#10243E] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#00B4D8] placeholder:text-[#7A8DA3]"
                        />
                      </div>
                      <button
                        onClick={() => removeExternalLink(i)}
                        className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEF9FC] text-[#0F4C5C] hover:bg-[#DDF4FA] transition-colors"
                        aria-label="Remove link"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={addExternalLink}
                    className="flex items-center gap-1.5 text-sm text-[#0F4C5C] font-semibold"
                  >
                    <Plus size={14} /> Add link
                  </button>
                </div>
              ) : (
                /* View mode — link list */
                (localOpTechUrl || localImplantUrl || localExternalLinks.some((l) => l.url)) && (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-[#61758B] lg:text-[18px]">References</p>
                    {localOpTechUrl && (
                      <a
                        href={localOpTechUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-base font-semibold text-[#0F4C5C] lg:text-[20px] underline underline-offset-2"
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
                        className="flex items-center gap-2 text-base font-semibold text-[#0F4C5C] lg:text-[20px] underline underline-offset-2"
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
                        className="flex items-center gap-2 text-base font-semibold text-[#0F4C5C] lg:text-[20px] underline underline-offset-2"
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
            <div className="my-2 rounded-xl border border-[#D5EAF1] bg-[#F8FBFD] p-4">
              <p className="text-xs uppercase tracking-wide text-[#61758B] lg:text-[18px] mb-2">Nurse prep notes</p>
              {editMode ? (
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-xl border border-[#D5DCE3] bg-white px-3 py-2.5 text-base text-[#10243E] focus:outline-none focus:ring-2 focus:ring-[#00B4D8]"
                />
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-base leading-relaxed text-[#475569] lg:text-[20px]">
                    {nurseNotes || <span className="text-[#5D8A97]">No prep notes added yet.</span>}
                  </p>
                  {notesLastEdited && (
                    <p className="mt-2 text-xs text-[#A7D8E2] flex items-center gap-1">
                      <Clock size={11} /> Last edited by You · {notesLastEdited}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── PATIENT POSITIONING ────────────────────────────────── */}
          {isPositioning && (
            <div className="mt-2 mb-3 rounded-xl border border-[#D5EAF1] bg-[#F8FBFD] p-4">
              <p className="text-xs uppercase tracking-wide text-[#61758B] lg:text-[18px] mb-2">Patient positioning</p>
              {editMode ? (
                <>
                  <textarea
                    value={positionDraft}
                    onChange={(e) => setPositionDraft(e.target.value)}
                    rows={5}
                    className="w-full resize-none rounded-xl border border-[#D5DCE3] bg-white px-3 py-2.5 text-base text-[#10243E] focus:outline-none focus:ring-2 focus:ring-[#00B4D8]"
                  />
                  <p className="mt-2 text-xs text-[#FFD58A] flex items-center gap-1">
                    ⚠ Changes to patient positioning require clinical approval before publishing.
                  </p>
                </>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-base leading-relaxed text-[#475569] lg:text-[20px]">
                    {positionText || <span className="text-[#5D8A97]">No positioning instructions set.</span>}
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
          {isPostCare && section.recoveryNotes && (
            <div className="my-2 rounded-xl border border-[#D5EAF1] bg-[#F8FBFD] p-4">
              <p className="text-xs uppercase tracking-wide text-[#61758B] lg:text-[18px] mb-2">Recovery notes</p>
              <p className="whitespace-pre-wrap text-base leading-relaxed text-[#475569] lg:text-[20px]">{section.recoveryNotes}</p>
            </div>
          )}

          {/* ── DISCHARGE CRITERIA ─────────────────────────────────── */}
          {isDischarge && section.dischargeCriteria && section.dischargeCriteria.length > 0 && (
            <div className="py-2">
              <p className="text-xs uppercase tracking-wide text-[#61758B] lg:text-[18px] mb-2">Discharge criteria</p>
              <ul className="space-y-1">
                {section.dischargeCriteria.map((criterion, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#475569] lg:text-[20px] lg:text-base">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    {criterion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── COMPLICATIONS & ESCALATION ─────────────────────────── */}
          {isComplications && section.commonComplications && section.commonComplications.length > 0 && (
            <div className="py-2">
              <p className="text-xs uppercase tracking-wide text-[#61758B] lg:text-[18px] mb-2">Common complications</p>
              <ul className="space-y-1">
                {section.commonComplications.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#475569] lg:text-[20px] lg:text-base">
                    <span className="text-amber-500 mt-0.5">⚠</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── HANDOVER NOTES ─────────────────────────────────────── */}
          {isHandover && (
            <div className="space-y-4 py-2">
              {section.recoveryNotes && (
                <div className="rounded-xl border border-[#D5EAF1] bg-[#F8FBFD] p-4">
                  <p className="text-xs uppercase tracking-wide text-[#61758B] lg:text-[18px] mb-2">Post-op care</p>
                  <p className="whitespace-pre-wrap text-base leading-relaxed text-[#475569] lg:text-[20px]">{section.recoveryNotes}</p>
                </div>
              )}
              {section.dischargeCriteria && section.dischargeCriteria.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#61758B] lg:text-[18px] mb-2">Discharge criteria</p>
                  <ul className="space-y-1">
                    {section.dischargeCriteria.map((criterion, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[#475569] lg:text-[20px]">
                        <span className="text-emerald-500 mt-0.5">✓</span>
                        {criterion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {section.commonComplications && section.commonComplications.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#61758B] lg:text-[18px] mb-2">Complications & escalation</p>
                  <ul className="space-y-1">
                    {section.commonComplications.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[#475569] lg:text-[20px]">
                        <span className="text-amber-500 mt-0.5">⚠</span>
                        {c}
                      </li>
                    ))}
                  </ul>
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D5EAF1] bg-[#F8FBFD] px-3 py-1.5 text-xs font-semibold text-[#10243E] transition-colors hover:bg-[#EEF9FC]"
              >
                <Plus size={13} /> Add from catalogue
              </button>
            </div>
          )}

          {localItems.length > 0 && (
            <>
              {/* Desktop column headers */}
              <div className="hidden lg:flex items-center gap-5 border-b border-[#D5EAF1] px-4 py-2 bg-[#F8FBFD]">
                <div className="flex-1 min-w-0" />
                <div className="w-60 shrink-0">
                  <p className="text-[20px] font-semibold text-[#A7D8E2]">Location</p>
                </div>
                <div className="w-28 shrink-0 text-center">
                  <p className="text-[20px] font-semibold text-[#A7D8E2]">Quantity</p>
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
