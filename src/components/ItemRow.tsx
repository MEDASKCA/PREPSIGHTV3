"use client"

import { useState, useEffect } from "react"
import { Package, Check, Trash2, X, Pencil, Phone, ExternalLink } from "lucide-react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Item, ItemDisplayInfo, SectionType } from "@/lib/types"

type UrgencyLevel = "info" | "advisory" | "urgent" | "critical"

interface Comment {
  id: string
  text: string
  urgency: UrgencyLevel
  date: string
}

const URGENCY: Record<UrgencyLevel, { label: string; colour: string }> = {
  info:     { label: "Info",     colour: "bg-sky-100 text-sky-700" },
  advisory: { label: "Advisory", colour: "bg-amber-100 text-amber-700" },
  urgent:   { label: "Urgent",   colour: "bg-orange-100 text-orange-700" },
  critical: { label: "Critical", colour: "bg-red-100 text-red-700" },
}

function todayLabel() {
  return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

interface Props {
  item: Item
  sectionType?: SectionType
  editMode?: boolean
  onDelete?: () => void
  onItemSave?: (updatedItem: Item) => void
  isChecked?: boolean
  onCheck?: () => void
  onSelect?: (info: ItemDisplayInfo) => void
}

export default function ItemRow({
  item,
  sectionType,
  editMode = false,
  onDelete,
  onItemSave,
  isChecked = false,
  onCheck,
  onSelect,
}: Props) {
  const [isDark, setIsDark] = useState(false)
  const [localImage, setLocalImage] = useState<string | null>(item.imageUrl ?? null)

  // Mobile edit state — location split into 3 parts
  const locParts = (val: string) => { const p = val.split("/").map(s => s.trim()); return [p[0]??"", p[1]??"", p[2]??""] }
  const [draftLocA, setDraftLocA] = useState(() => locParts(item.location ?? "")[0])
  const [draftLocB, setDraftLocB] = useState(() => locParts(item.location ?? "")[1])
  const [draftLocC, setDraftLocC] = useState(() => locParts(item.location ?? "")[2])
  const [draftQty, setDraftQty] = useState(item.defaultQty != null ? String(item.defaultQty) : "")

  // Mobile detail drawer
  const [detailOpen, setDetailOpen] = useState(false)

  // Mobile "i" notes + comments drawer
  const [infoOpen, setInfoOpen] = useState(false)
  const [instruction, setInstruction] = useState(item.notes ?? "")
  const [instructionDraft, setInstructionDraft] = useState(item.notes ?? "")
  const [editingInstruction, setEditingInstruction] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [newUrgency, setNewUrgency] = useState<UrgencyLevel>("info")

  useEffect(() => {
    const [a, b, c] = locParts(item.location ?? "")
    setDraftLocA(a); setDraftLocB(b); setDraftLocC(c)
    setDraftQty(item.defaultQty != null ? String(item.defaultQty) : "")
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.location, item.defaultQty])

  useEffect(() => {
    if (!editMode) {
      const [a, b, c] = locParts(item.location ?? "")
      setDraftLocA(a); setDraftLocB(b); setDraftLocC(c)
      setDraftQty(item.defaultQty != null ? String(item.defaultQty) : "")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, item.location, item.defaultQty])

  useEffect(() => {
    setInstruction(item.notes ?? "")
    setInstructionDraft(item.notes ?? "")
  }, [item.notes])

  useEffect(() => {
    if (!db || item.imageUrl) return
    getDoc(doc(db, "item_images", item.id)).then((snap) => {
      if (snap.exists()) setLocalImage(snap.data().url as string)
    }).catch(() => {})
  }, [item.id, item.imageUrl])

  useEffect(() => {
    setLocalImage(item.imageUrl ?? null)
  }, [item.imageUrl])

  useEffect(() => {
    const sync = () => setIsDark(document.documentElement.dataset.theme === "dark")
    sync()
    window.addEventListener("prepsight:preferences-changed", sync as EventListener)
    return () => window.removeEventListener("prepsight:preferences-changed", sync as EventListener)
  }, [])

  function handleSelect() {
    if (onSelect) {
      onSelect({ item, sectionId: "", name: item.name, product: item.product ?? "", location: item.location ?? "", qty: item.defaultQty != null ? String(item.defaultQty) : "", imageUrl: localImage })
    } else {
      setDetailOpen(true)
    }
  }

  function saveLocation() {
    if (!onItemSave) return
    const combined = [draftLocA, draftLocB, draftLocC].map(s => s.trim()).filter(Boolean).join("/")
    if (combined === (item.location ?? "")) return
    onItemSave({ ...item, location: combined || undefined })
  }

  function saveQty() {
    if (!onItemSave) return
    const parsed = draftQty.trim() === "" ? undefined : Number(draftQty)
    if (isNaN(parsed as number)) return
    if (parsed === item.defaultQty) return
    onItemSave({ ...item, defaultQty: parsed })
  }

  function saveInstruction() {
    if (!onItemSave) return
    onItemSave({ ...item, notes: instructionDraft.trim() || undefined })
    setInstruction(instructionDraft.trim())
    setEditingInstruction(false)
  }

  function addComment() {
    if (!newComment.trim()) return
    setComments((prev) => [{
      id: crypto.randomUUID(),
      text: newComment.trim(),
      urgency: newUrgency,
      date: todayLabel(),
    }, ...prev])
    setNewComment("")
  }

  const locDisplay = item.location
    ? item.location.split("/").map((p) => p.trim()).filter(Boolean).join(" · ")
    : "—"

  const sheetBg = isDark ? "bg-[#1A2433] border-[#334155]" : "bg-white border-[#D5DCE3]"
  const textPrimary = isDark ? "text-white" : "text-[#10243E]"
  const textMuted = isDark ? "text-[#94a3b8]" : "text-[#94a3b8]"
  const divider = isDark ? "border-[#334155]" : "border-[#E2EDF2]"
  const inputCls = `w-full rounded border px-2.5 py-1.5 text-[14px] focus:outline-none focus:ring-1 focus:ring-[#4DA3FF] ${isDark ? "border-[#334155] bg-[#1A2840] text-white placeholder:text-[#475569]" : "border-[#D5DCE3] bg-white text-[#3F4752] placeholder:text-[#94a3b8]"}`

  return (
    <>
      {/* ── Row ─────────────────────────────────────────────────────────── */}
      <div className={`flex items-center gap-2 border-b py-1.5 lg:gap-5 lg:py-4 ${isDark ? "border-[#334155] bg-[#111E30]" : "border-[#D5DCE3]"} ${editMode ? (isDark ? "bg-[#1A2433]" : "bg-[#fff8f5]") : ""}`}>

        {/* Thumbnail — mobile only */}
        <button
          type="button"
          onClick={handleSelect}
          className="shrink-0 rounded-lg overflow-hidden lg:hidden"
          aria-label={`View details for ${item.name}`}
        >
          {localImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={localImage} alt={item.name} className="w-9 h-9 object-cover rounded-lg" />
          ) : (
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? "bg-[#1A2840]" : "bg-[#EEF2F6]"}`}>
              <Package size={16} className={isDark ? "text-[#64748B]" : "text-[#94a3b8]"} />
            </div>
          )}
        </button>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          {/* Item name — mobile: 15px blue underlined tap target; desktop: 22px dark no underline */}
          <button
            onClick={handleSelect}
            className={`w-full text-left text-[15px] font-semibold leading-snug underline underline-offset-2 lg:text-[22px] lg:no-underline lg:leading-tight ${isDark ? "text-white" : "text-[#2F8EF7] lg:text-[#10243E]"}`}
          >
            {item.name}
          </button>

          {/* Product ref */}
          {item.product && (
            <p className={`mt-0.5 text-[13px] leading-snug lg:text-[18px] lg:mt-1 ${isDark ? "text-[#C7D2E0]" : "text-[#94a3b8]"}`}>
              {item.product}
            </p>
          )}

          {/* Mobile meta: location + req qty — display mode */}
          {!editMode && (
            <div className={`mt-0.5 lg:hidden text-[13px] leading-tight ${isDark ? "text-[#64748B]" : "text-[#94a3b8]"}`}>
              <p className={item.location ? "" : (isDark ? "text-[#475569]" : "text-[#C5D0DB]")}>
                {item.location
                  ? item.location.split("/").map((p) => p.trim()).filter(Boolean).join(", ")
                  : "—"}
              </p>
              {item.defaultQty != null && <p>Req. Qty: {item.defaultQty}</p>}
            </div>
          )}

          {/* Mobile location + qty inputs — edit mode */}
          {editMode && onItemSave && (
            <div className="mt-1 flex flex-col gap-1 lg:hidden">
              {[
                { val: draftLocA, set: setDraftLocA, ph: "Floor / Building" },
                { val: draftLocB, set: setDraftLocB, ph: "Room / Store" },
                ...(sectionType !== "equipment_devices" ? [{ val: draftLocC, set: setDraftLocC, ph: "Shelf / Drawer" }] : []),
              ].map(({ val, set, ph }) => (
                <input key={ph} type="text" value={val} onChange={(e) => set(e.target.value)} onBlur={saveLocation} placeholder={ph} className={inputCls} />
              ))}
              <input type="number" value={draftQty} onChange={(e) => setDraftQty(e.target.value)} onBlur={saveQty} placeholder="Req. Qty" min={0} className={inputCls} />
            </div>
          )}
        </div>

        {/* Desktop: Location column */}
        <div className="hidden lg:block lg:w-60 shrink-0">
          <p className={`text-[20px] font-medium ${isDark ? "text-[#C7D2E0]" : "text-[#526579]"}`}>{locDisplay}</p>
        </div>

        {/* Desktop: Quantity column */}
        <div className="hidden lg:block lg:w-28 shrink-0 text-center">
          <p className={`text-[20px] font-semibold ${isDark ? "text-white" : "text-[#3F4752]"}`}>
            {item.defaultQty != null ? item.defaultQty : "—"}
          </p>
        </div>

        {/* Mobile "i" button */}
        {!editMode && (
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className={`shrink-0 lg:hidden w-7 h-7 rounded-full border-2 flex items-center justify-center text-[13px] font-bold transition-colors ${isDark ? "border-[#334155] text-[#64748B]" : "border-[#D5DCE3] text-[#94a3b8]"}`}
            aria-label="Notes and comments"
          >
            i
          </button>
        )}

        {/* Edit mode: delete button */}
        {editMode && onDelete && (
          <button onClick={onDelete} className="shrink-0 w-7 h-7 rounded-full bg-[#F87171]/10 flex items-center justify-center text-[#F87171] hover:bg-[#F87171]/20 transition-colors lg:w-11 lg:h-11 lg:rounded-xl" aria-label="Remove item">
            <Trash2 size={13} className="lg:hidden" />
            <Trash2 size={20} className="hidden lg:block" />
          </button>
        )}

        {/* Check button (collection mode) */}
        {onCheck !== undefined && (
          <button
            type="button"
            onClick={onCheck}
            className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors lg:w-8 lg:h-8 ${isChecked ? "bg-emerald-500 border-emerald-500" : isDark ? "border-[#334155] bg-[#1A2840] hover:border-emerald-400" : "border-[#D5DCE3] bg-white hover:border-emerald-400"}`}
            aria-label={isChecked ? "Uncheck item" : "Check item"}
          >
            {isChecked && <Check size={11} className="lg:hidden" />}
            {isChecked && <Check size={16} className="hidden lg:block text-white" />}
          </button>
        )}
      </div>

      {/* ── Mobile: Item detail drawer ───────────────────────────────────── */}
      {detailOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setDetailOpen(false)} />
          <div className={`fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t shadow-2xl max-h-[80vh] overflow-y-auto ${sheetBg}`}>
            <div className="flex justify-center pt-3 pb-1">
              <div className={`w-10 h-1 rounded-full ${isDark ? "bg-[#334155]" : "bg-[#D5DCE3]"}`} />
            </div>
            <div className="px-5 pb-10 pt-2">

              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <h3 className={`text-[18px] font-bold leading-snug pr-4 ${textPrimary}`}>{item.name}</h3>
                <button type="button" onClick={() => setDetailOpen(false)} className={textMuted}><X size={22} /></button>
              </div>

              {/* Image */}
              {localImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={localImage} alt={item.name} className="w-full max-h-52 object-contain rounded-xl mb-5 bg-[#F4F7FA]" />
              )}

              {/* Product ref */}
              {item.product && (
                <div className={`mb-4 pb-4 border-b ${divider}`}>
                  <p className={`text-[12px] font-semibold uppercase tracking-wide mb-1 ${textMuted}`}>Product Ref</p>
                  <p className={`text-[15px] ${textPrimary}`}>{item.product}</p>
                </div>
              )}

              {/* Description */}
              {item.description && (
                <div className={`mb-4 pb-4 border-b ${divider}`}>
                  <p className={`text-[12px] font-semibold uppercase tracking-wide mb-1 ${textMuted}`}>Description</p>
                  <p className={`text-[15px] leading-relaxed ${isDark ? "text-[#C7D2E0]" : "text-[#526579]"}`}>{item.description}</p>
                </div>
              )}

              {/* Supplier */}
              {item.supplier?.name && (
                <div>
                  <p className={`text-[12px] font-semibold uppercase tracking-wide mb-1 ${textMuted}`}>Supplier</p>
                  <p className={`text-[16px] font-semibold ${textPrimary}`}>{item.supplier.name}</p>
                  {item.supplier.contact && (
                    <a href={`tel:${item.supplier.contact.replace(/\s/g, "")}`} className="mt-2 flex items-center gap-2 text-[15px] text-[#4DA3FF]">
                      <Phone size={15} />{item.supplier.contact}
                    </a>
                  )}
                  {item.supplier.url && (
                    <a href={item.supplier.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 flex items-center gap-2 text-[15px] text-[#4DA3FF]">
                      <ExternalLink size={15} />Visit supplier
                    </a>
                  )}
                </div>
              )}

              {(!item.product && !item.description && !item.supplier?.name) && (
                <p className={`text-[15px] text-center py-6 ${textMuted}`}>No additional details available.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile: Notes & Comments drawer ─────────────────────────────── */}
      {infoOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setInfoOpen(false)} />
          <div className={`fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t shadow-2xl max-h-[88vh] overflow-y-auto ${sheetBg}`}>
            <div className="flex justify-center pt-3 pb-1">
              <div className={`w-10 h-1 rounded-full ${isDark ? "bg-[#334155]" : "bg-[#D5DCE3]"}`} />
            </div>
            <div className="px-5 pb-10 pt-2">

              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className={`text-[18px] font-bold leading-snug ${textPrimary}`}>{item.name}</h3>
                  <p className={`text-[13px] mt-0.5 ${textMuted}`}>Notes & Comments</p>
                </div>
                <button type="button" onClick={() => setInfoOpen(false)} className={textMuted}><X size={22} /></button>
              </div>

              {/* Custom Instructions */}
              <div className={`mb-5 pb-5 border-b ${divider}`}>
                <div className="flex items-center justify-between mb-2.5">
                  <p className={`text-[13px] font-semibold uppercase tracking-wide ${textMuted}`}>Custom Instructions</p>
                  {!item.isFixed && onItemSave && !editingInstruction && (
                    <button type="button" onClick={() => { setInstructionDraft(instruction); setEditingInstruction(true) }} className="flex items-center gap-1.5 text-[14px] text-[#4DA3FF] font-medium">
                      <Pencil size={13} /> Edit
                    </button>
                  )}
                </div>
                {editingInstruction ? (
                  <>
                    <textarea
                      value={instructionDraft}
                      onChange={(e) => setInstructionDraft(e.target.value)}
                      rows={4}
                      placeholder="Add custom instructions…"
                      className={`w-full rounded-xl border px-3.5 py-3 text-[15px] leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-[#4DA3FF] ${isDark ? "border-[#334155] bg-[#111E30] text-white placeholder:text-[#475569]" : "border-[#D5DCE3] bg-[#F8FAFC] text-[#3F4752] placeholder:text-[#94a3b8]"}`}
                    />
                    <div className="flex gap-2 mt-3">
                      <button onClick={saveInstruction} className="flex-1 rounded-xl bg-[#4DA3FF] py-2.5 text-[15px] font-semibold text-white">Save</button>
                      <button onClick={() => setEditingInstruction(false)} className={`flex-1 rounded-xl border py-2.5 text-[15px] font-semibold ${isDark ? "border-[#334155] text-[#94a3b8]" : "border-[#D5DCE3] text-[#64748b]"}`}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <p className={`text-[15px] leading-relaxed ${instruction ? (isDark ? "text-[#C7D2E0]" : "text-[#526579]") : textMuted}`}>
                    {instruction || "No custom instructions added."}
                  </p>
                )}
              </div>

              {/* Comments */}
              <div>
                <p className={`text-[13px] font-semibold uppercase tracking-wide mb-3 ${textMuted}`}>Comments</p>

                {/* Add comment box */}
                <div className={`rounded-xl border p-3.5 mb-4 ${isDark ? "border-[#334155] bg-[#111E30]" : "border-[#D5DCE3] bg-[#F8FAFC]"}`}>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={2}
                    placeholder="Write a comment…"
                    className={`w-full bg-transparent text-[15px] leading-relaxed resize-none focus:outline-none ${isDark ? "text-white placeholder:text-[#475569]" : "text-[#3F4752] placeholder:text-[#94a3b8]"}`}
                  />
                  <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                    {(["info", "advisory", "urgent", "critical"] as UrgencyLevel[]).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setNewUrgency(u)}
                        className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold border-2 transition-colors ${URGENCY[u].colour} ${newUrgency === u ? "border-current" : "border-transparent opacity-50"}`}
                      >
                        {URGENCY[u].label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={addComment}
                      disabled={!newComment.trim()}
                      className="ml-auto rounded-lg bg-[#4DA3FF] px-4 py-1.5 text-[14px] font-semibold text-white disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Comment list */}
                {comments.length === 0 ? (
                  <p className={`text-[14px] text-center py-3 ${textMuted}`}>No comments yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {comments.map((c) => (
                      <div key={c.id} className={`rounded-xl p-3.5 border ${isDark ? "bg-[#111E30] border-[#334155]" : "bg-white border-[#E2EDF2]"}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${URGENCY[c.urgency].colour}`}>{URGENCY[c.urgency].label}</span>
                          <span className={`text-[13px] ${textMuted}`}>{c.date}</span>
                        </div>
                        <p className={`text-[15px] leading-relaxed ${isDark ? "text-[#C7D2E0]" : "text-[#526579]"}`}>{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  )
}
