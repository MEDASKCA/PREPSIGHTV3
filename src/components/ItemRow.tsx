"use client"

import { useState, useEffect, useRef } from "react"
import { Package, Check, Trash2, X, Pencil, Phone, ExternalLink, ImagePlus, ChevronDown } from "lucide-react"
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore"
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
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

const URGENCY_DOT: Record<UrgencyLevel, string> = {
  info: "bg-[#3ea6ff]",
  advisory: "bg-[#e0a458]",
  urgent: "bg-[#d97757]",
  critical: "bg-[#d36b76]",
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
  const [draftName, setDraftName] = useState(item.name)
  const [draftManufacturer, setDraftManufacturer] = useState(item.manufacturer ?? "")
  const [draftSku, setDraftSku] = useState(item.sku ?? "")

  // Mobile detail drawer
  const [detailOpen, setDetailOpen] = useState(false)
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const [imagePickerOpen, setImagePickerOpen] = useState(false)

  // Mobile "i" notes + comments drawer
  const [infoOpen, setInfoOpen] = useState(false)
  const [instruction, setInstruction] = useState(item.notes ?? "")
  const [instructionDraft, setInstructionDraft] = useState(item.notes ?? "")
  const [editingInstruction, setEditingInstruction] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [newUrgency, setNewUrgency] = useState<UrgencyLevel>("info")
  const [urgencyMenuOpen, setUrgencyMenuOpen] = useState(false)
  const [imageSaving, setImageSaving] = useState(false)
  const uploadImageInputRef = useRef<HTMLInputElement>(null)
  const cameraImageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const [a, b, c] = locParts(item.location ?? "")
    setDraftLocA(a); setDraftLocB(b); setDraftLocC(c)
    setDraftQty(item.defaultQty != null ? String(item.defaultQty) : "")
    setDraftName(item.name)
    setDraftManufacturer(item.manufacturer ?? "")
    setDraftSku(item.sku ?? "")
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.location, item.defaultQty, item.name, item.manufacturer, item.sku])

  useEffect(() => {
    if (!editMode) {
      const [a, b, c] = locParts(item.location ?? "")
      setDraftLocA(a); setDraftLocB(b); setDraftLocC(c)
      setDraftQty(item.defaultQty != null ? String(item.defaultQty) : "")
      setDraftName(item.name)
      setDraftManufacturer(item.manufacturer ?? "")
      setDraftSku(item.sku ?? "")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, item.location, item.defaultQty, item.name, item.manufacturer, item.sku])

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

  function handleImageSelect() {
    if (localImage) {
      setImagePreviewOpen(true)
      return
    }
    handleSelect()
  }

  function handleMobileLinkAction() {
    setInfoOpen(true)
  }

  function openImagePicker() {
    setImagePickerOpen(true)
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ""

    setImageSaving(true)
    try {
      if (storage && db) {
        const imageRef = storageRef(storage, `item-images/${item.id}`)
        await uploadBytes(imageRef, file)
        const url = await getDownloadURL(imageRef)
        await setDoc(doc(db, "item_images", item.id), { url })
        setLocalImage(url)
        onItemSave?.({ ...item, imageUrl: url })
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const nextImage = typeof reader.result === "string" ? reader.result : null
        if (!nextImage) return
        setLocalImage(nextImage)
        onItemSave?.({ ...item, imageUrl: nextImage })
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("[PrepSight] mobile item image save failed", error)
      if (typeof window !== "undefined") {
        window.alert("Image failed to save. Firestore or Storage permission may be blocking it.")
      }
    } finally {
      setImageSaving(false)
    }
  }

  async function handleImageRemove() {
    setLocalImage(null)
    try {
      if (storage) {
        await deleteObject(storageRef(storage, `item-images/${item.id}`)).catch(() => undefined)
      }
      if (db) {
        await deleteDoc(doc(db, "item_images", item.id))
      }
      onItemSave?.({ ...item, imageUrl: undefined })
    } catch (error) {
      console.error("[PrepSight] mobile item image delete failed", error)
      if (typeof window !== "undefined") {
        window.alert("Image failed to delete. Firestore or Storage permission may be blocking it.")
      }
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

  function saveIdentityFields() {
    if (!onItemSave) return
    const nextName = draftName.trim() || item.name
    const nextManufacturer = draftManufacturer.trim() || undefined
    const nextSku = draftSku.trim() || undefined
    if (nextName === item.name && nextManufacturer === item.manufacturer && nextSku === item.sku) return
    onItemSave({
      ...item,
      name: nextName,
      manufacturer: nextManufacturer,
      sku: nextSku,
    })
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
    setUrgencyMenuOpen(false)
  }

  const locDisplay = item.location
    ? item.location.split("/").map((p) => p.trim()).filter(Boolean).join(" · ")
    : "—"

  const textPrimary = isDark ? "text-white" : "text-[#10243E]"
  const textMuted = isDark ? "text-[#94a3b8]" : "text-[#94a3b8]"
  const divider = isDark ? "border-[#334155]" : "border-[#E2EDF2]"
  const inputCls = "w-full rounded border border-[#2d2d2d] bg-black px-2.5 py-1.5 text-[14px] text-white placeholder:text-[#7d7d7d] focus:outline-none focus:ring-1 focus:ring-[#4DA3FF]"
  const mobileSheetSurface = "bg-[#1f1f1f] border-[#1f1f1f] text-white"
  const mobileSheetMuted = "text-[#b8b8b8]"
  const mobileSheetSubtle = "text-[#d6d6d6]"
  const mobileSheetDivider = "border-[#1f1f1f]"

  return (
    <>
      {/* ── Row ─────────────────────────────────────────────────────────── */}
      <div className={`border-b py-1.5 lg:py-4 ${editMode ? "border-[#2d2d2d] bg-black" : isDark ? "border-[#334155] bg-[#111E30]" : "border-[#D5DCE3]"}`}>
        <input
          ref={uploadImageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <input
          ref={cameraImageInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageUpload}
          className="hidden"
        />
        <div className={`${editMode ? "grid grid-cols-[56px_minmax(0,1fr)_32px] items-start gap-3" : "flex items-center gap-2"} lg:gap-5`}>

        {/* Thumbnail — mobile only */}
        <div className={`shrink-0 lg:hidden ${editMode ? "pt-1" : ""}`}>
          <button
            type="button"
            onClick={editMode ? openImagePicker : handleImageSelect}
            className={`overflow-hidden rounded-lg ${editMode ? "block" : ""}`}
            aria-label={editMode ? `Update image for ${item.name}` : `Preview image for ${item.name}`}
          >
            {localImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={localImage} alt={item.name} className={`${editMode ? "h-14 w-14 rounded-lg" : "h-16 w-16 rounded-xl"} object-cover`} />
            ) : (
              <div className={`flex ${editMode ? "h-14 w-14 rounded-lg" : "h-16 w-16 rounded-xl"} items-center justify-center ${isDark ? "bg-[#1A2840]" : "bg-[#EEF2F6]"}`}>
                <Package size={editMode ? 20 : 18} className={isDark ? "text-[#64748B]" : "text-[#94a3b8]"} />
              </div>
            )}
          </button>
          {editMode ? (
            <div className="mt-2 flex gap-1">
              <button
                type="button"
                onClick={openImagePicker}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#2d2d2d] bg-black text-[#d9d9d9] disabled:opacity-50"
                aria-label={localImage ? "Update image" : "Add image"}
                disabled={imageSaving}
              >
                <ImagePlus size={14} />
              </button>
              {localImage ? (
                <button
                  type="button"
                  onClick={handleImageRemove}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#4a2327] bg-black text-[#f28b82] disabled:opacity-50"
                  aria-label="Remove image"
                  disabled={imageSaving}
                >
                  <span className="text-[18px] leading-none">-</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Name + meta */}
        {editMode ? (
        <div className="flex-1 min-w-0">
          <div className="space-y-2">
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#8f8f8f]">Item name</p>
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={saveIdentityFields}
                placeholder="Item name"
                className={inputCls}
              />
            </div>
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#8f8f8f]">Manufacturer</p>
              <input
                type="text"
                value={draftManufacturer}
                onChange={(e) => setDraftManufacturer(e.target.value)}
                onBlur={saveIdentityFields}
                placeholder="Manufacturer"
                className={inputCls}
              />
            </div>
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#8f8f8f]">SKU / Reference</p>
              <input
                type="text"
                value={draftSku}
                onChange={(e) => setDraftSku(e.target.value)}
                onBlur={saveIdentityFields}
                placeholder="SKU / Reference"
                className={inputCls}
              />
            </div>
          </div>

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
        ) : (
        <button
          type="button"
          onClick={handleMobileLinkAction}
          className="flex-1 min-w-0 text-left"
          aria-label={`Open notes and comments for ${item.name}`}
        >
          <span className={`block w-full text-[15px] font-semibold leading-snug underline underline-offset-2 lg:text-[22px] lg:no-underline lg:leading-tight ${isDark ? "text-white" : "text-[#2F8EF7] lg:text-[#10243E]"}`}>
            {item.name}
          </span>

          {item.product && (
            <span className={`mt-0.5 block text-[13px] leading-snug lg:mt-1 lg:text-[18px] ${isDark ? "text-[#C7D2E0]" : "text-[#94a3b8]"}`}>
              {item.product}
            </span>
          )}

          <span className={`mt-0.5 block lg:hidden text-[13px] leading-tight ${isDark ? "text-[#64748B]" : "text-[#94a3b8]"}`}>
            <span className={`block ${item.location ? "" : (isDark ? "text-[#475569]" : "text-[#C5D0DB]")}`}>
              {item.location
                ? item.location.split("/").map((p) => p.trim()).filter(Boolean).join(", ")
                : "—"}
            </span>
            {item.defaultQty != null && <span className="block">Req. Qty: {item.defaultQty}</span>}
          </span>
        </button>
        )}

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

        {/* Edit mode: delete button */}
        {editMode && onDelete && (
          <button onClick={onDelete} className={`shrink-0 ${editMode ? "mt-2" : ""} h-8 w-8 rounded-full border border-[#4a2327] bg-black flex items-center justify-center text-[#F87171] hover:bg-[#1a0608] transition-colors lg:h-11 lg:w-11 lg:rounded-xl`} aria-label="Remove item">
            <span className="text-[18px] leading-none lg:hidden">-</span>
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
      </div>

      {imagePickerOpen ? (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setImagePickerOpen(false)} />
          <div className="fixed inset-x-3 bottom-3 z-50 overflow-hidden rounded-[24px] border border-[#252525] bg-[#1a1a1a] shadow-2xl">
            <div className="px-5 pb-2 pt-4 text-center">
              <p className="text-[16px] font-semibold text-white">{localImage ? "Update image" : "Add image"}</p>
            </div>
            <div className="px-3 pb-3">
              <button
                type="button"
                onClick={() => {
                  setImagePickerOpen(false)
                  cameraImageInputRef.current?.click()
                }}
                className="flex w-full items-center justify-between rounded-[16px] bg-black px-4 py-3 text-left text-[15px] text-white"
              >
                <span>Take photo</span>
                <span className="text-[#8f8f8f]">Camera</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setImagePickerOpen(false)
                  uploadImageInputRef.current?.click()
                }}
                className="mt-2 flex w-full items-center justify-between rounded-[16px] bg-black px-4 py-3 text-left text-[15px] text-white"
              >
                <span>Upload image</span>
                <span className="text-[#8f8f8f]">Files</span>
              </button>
              <button
                type="button"
                onClick={() => setImagePickerOpen(false)}
                className="mt-2 w-full rounded-[16px] bg-[#242424] px-4 py-3 text-[15px] font-medium text-[#d0d0d0]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {imagePreviewOpen && localImage ? (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-50 bg-black/88" onClick={() => setImagePreviewOpen(false)} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6">
            <button
              type="button"
              onClick={() => setImagePreviewOpen(false)}
              className="absolute right-4 top-[calc(env(safe-area-inset-top)+12px)] flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/10 bg-[#2b2b2b] text-white"
              aria-label="Close image preview"
            >
              <X size={18} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={localImage} alt={item.name} className="max-h-full w-full rounded-[20px] object-contain" />
          </div>
        </div>
      ) : null}

      {/* ── Mobile: Item detail sheet ───────────────────────────────────── */}
      {detailOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-40 bg-black/58" onClick={() => setDetailOpen(false)} />
          <div className={`fixed inset-x-3 bottom-3 top-[max(132px,env(safe-area-inset-top)+56px)] z-50 flex flex-col overflow-hidden rounded-[26px] border shadow-2xl ${mobileSheetSurface}`}>
            <div className="flex justify-center pt-2">
              <div className="h-1 w-10 rounded-full bg-[#5c5c5c]" />
            </div>
            <div className="flex items-start justify-between px-5 pb-3 pt-3">
              <div className="min-w-0 pr-4">
                <h3 className="text-[18px] font-bold leading-snug text-white">{item.name}</h3>
                <p className={`mt-1 text-[13px] ${mobileSheetMuted}`}>Item details</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-white/10 bg-[#2b2b2b] text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className={`border-t ${mobileSheetDivider}`} />
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-4">

              {localImage && (
                <button type="button" onClick={() => setImagePreviewOpen(true)} className="mb-5 block w-full overflow-hidden rounded-[18px] bg-[#181818]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={localImage} alt={item.name} className="max-h-[36vh] w-full object-contain" />
                </button>
              )}

              {item.product && (
                <div className={`pb-4 ${mobileSheetSubtle}`}>
                  <p className={`text-[12px] font-semibold uppercase tracking-wide ${mobileSheetMuted}`}>Product Ref</p>
                  <p className="mt-1 text-[15px] text-white">{item.product}</p>
                </div>
              )}
              <div className={`border-t ${mobileSheetDivider}`} />

              {item.description && (
                <div className="py-4">
                  <p className={`text-[12px] font-semibold uppercase tracking-wide ${mobileSheetMuted}`}>Description</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-[#e2e2e2]">{item.description}</p>
                </div>
              )}
              {item.description && <div className={`border-t ${mobileSheetDivider}`} />}

              <div className="py-4">
                <p className={`text-[12px] font-semibold uppercase tracking-wide ${mobileSheetMuted}`}>Location</p>
                <p className="mt-1 text-[15px] text-white">{item.location ? item.location.split("/").map((p) => p.trim()).filter(Boolean).join(" / ") : "—"}</p>
              </div>
              <div className={`border-t ${mobileSheetDivider}`} />

              <div className="py-4">
                <p className={`text-[12px] font-semibold uppercase tracking-wide ${mobileSheetMuted}`}>Required quantity</p>
                <p className="mt-1 text-[15px] text-white">{item.defaultQty != null ? item.defaultQty : "—"}</p>
              </div>
              <div className={`border-t ${mobileSheetDivider}`} />

              {item.supplier?.name && (
                <div className="py-4">
                  <p className={`text-[12px] font-semibold uppercase tracking-wide ${mobileSheetMuted}`}>Supplier</p>
                  <p className="mt-1 text-[16px] font-semibold text-white">{item.supplier.name}</p>
                  {item.supplier.contact && (
                    <a href={`tel:${item.supplier.contact.replace(/\s/g, "")}`} className="mt-2 flex items-center gap-2 text-[15px] text-[#2aa7ff]">
                      <Phone size={15} />{item.supplier.contact}
                    </a>
                  )}
                  {item.supplier.url && (
                    <a href={item.supplier.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 flex items-center gap-2 text-[15px] text-[#2aa7ff]">
                      <ExternalLink size={15} />Visit supplier
                    </a>
                  )}
                </div>
              )}

              {(!item.product && !item.description && !item.supplier?.name) && (
                <p className={`py-6 text-center text-[15px] ${mobileSheetMuted}`}>No additional details available.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile: Notes & Comments sheet ─────────────────────────────── */}
      {infoOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-40 bg-black/58" onClick={() => setInfoOpen(false)} />
          <div className={`fixed inset-x-3 bottom-3 top-[max(132px,env(safe-area-inset-top)+56px)] z-50 flex flex-col overflow-hidden rounded-[26px] border shadow-2xl ${mobileSheetSurface}`}>
            <div className="flex justify-center pt-2">
              <div className="h-1 w-10 rounded-full bg-[#5c5c5c]" />
            </div>
            <div className="flex items-start justify-between px-5 pb-3 pt-3">
              <div className="min-w-0 pr-4">
                  <h3 className="text-[18px] font-bold leading-snug text-white">{item.name}</h3>
                  <p className={`mt-1 text-[13px] ${mobileSheetMuted}`}>Notes & Comments</p>
                </div>
                <button type="button" onClick={() => setInfoOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-white/10 bg-[#2b2b2b] text-white"><X size={18} /></button>
            </div>
            <div className={`border-t ${mobileSheetDivider}`} />
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-4">
              <button
                type="button"
                onClick={() => {
                  setInfoOpen(false)
                  setDetailOpen(true)
                }}
                className="mb-4 inline-flex items-center rounded-[12px] bg-[#0d8bd8] px-4 py-2 text-[14px] font-semibold text-white"
              >
                Open item details
              </button>

              <div className="pb-5">
                <div className="flex items-center justify-between mb-2.5">
                  <p className={`text-[13px] font-semibold uppercase tracking-wide ${mobileSheetMuted}`}>Custom Instructions</p>
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
                      className="w-full rounded-xl border border-[#353535] bg-[#2a2a2a] px-3.5 py-3 text-[15px] leading-relaxed text-white resize-none placeholder:text-[#7d7d7d] focus:outline-none focus:ring-2 focus:ring-[#4DA3FF]"
                    />
                    <div className="flex gap-2 mt-3">
                      <button onClick={saveInstruction} className="flex-1 rounded-xl bg-[#4DA3FF] py-2.5 text-[15px] font-semibold text-white">Save</button>
                      <button onClick={() => setEditingInstruction(false)} className="flex-1 rounded-xl border border-[#353535] py-2.5 text-[15px] font-semibold text-[#c7c7c7]">Cancel</button>
                    </div>
                  </>
                ) : (
                  <p className={`text-[15px] leading-relaxed ${instruction ? "text-[#e2e2e2]" : mobileSheetMuted}`}>
                    {instruction || "No custom instructions added."}
                  </p>
                )}
              </div>
              <div className={`border-t ${mobileSheetDivider}`} />

              <div className="pt-5">
                <p className={`mb-3 text-[13px] font-semibold uppercase tracking-wide ${mobileSheetMuted}`}>Comments</p>

                <div className="mb-4 rounded-xl border border-[#353535] bg-[#2a2a2a] p-3.5">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={2}
                    placeholder="Write a comment…"
                    className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-white placeholder:text-[#7d7d7d] focus:outline-none"
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setUrgencyMenuOpen((open) => !open)}
                        className="inline-flex items-center gap-2 rounded-full border border-[#3b3b3b] bg-[#1f1f1f] px-3 py-2 text-[13px] font-medium text-white"
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${URGENCY_DOT[newUrgency]}`} />
                        <span>{URGENCY[newUrgency].label}</span>
                        <ChevronDown size={14} className={`transition-transform ${urgencyMenuOpen ? "rotate-180" : ""}`} />
                      </button>
                      {urgencyMenuOpen ? (
                        <div className="absolute left-0 top-[calc(100%+8px)] z-20 min-w-[11rem] overflow-hidden rounded-2xl border border-[#353535] bg-[#282828] shadow-[0_18px_48px_rgba(0,0,0,0.45)]">
                          {(["info", "advisory", "urgent", "critical"] as UrgencyLevel[]).map((u) => (
                            <button
                              key={u}
                              type="button"
                              onClick={() => {
                                setNewUrgency(u)
                                setUrgencyMenuOpen(false)
                              }}
                              className="flex w-full items-center gap-3 px-3 py-3 text-left text-[13px] text-white hover:bg-[#333333]"
                            >
                              <span className={`h-2.5 w-2.5 rounded-full ${URGENCY_DOT[u]}`} />
                              <span>{URGENCY[u].label}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={addComment}
                      disabled={!newComment.trim()}
                      className="ml-auto rounded-xl bg-[#3f6ea4] px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {comments.length === 0 ? (
                  <p className={`py-3 text-center text-[14px] ${mobileSheetMuted}`}>No comments yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {comments.map((c) => (
                      <div key={c.id} className="rounded-xl border border-[#353535] bg-[#2a2a2a] p-3.5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${URGENCY[c.urgency].colour}`}>{URGENCY[c.urgency].label}</span>
                          <span className={`text-[13px] ${mobileSheetMuted}`}>{c.date}</span>
                        </div>
                        <p className="text-[15px] leading-relaxed text-[#e2e2e2]">{c.text}</p>
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
