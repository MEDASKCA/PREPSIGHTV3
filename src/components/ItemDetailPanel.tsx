"use client"

import { useState, useEffect, useRef } from "react"
import {
  Package, X, MapPin, Hash, Layers, User, Pencil, Save,
  Check, Trash2, ImagePlus, Loader2, Clock, Flag,
} from "lucide-react"
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore"
import { storage, db } from "@/lib/firebase"
import { ItemDisplayInfo, Item } from "@/lib/types"

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

function today() {
  return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

interface Props {
  info: ItemDisplayInfo | null
  onClose: () => void
  onItemSave?: (sectionId: string, updatedItem: Item) => void
  className?: string
  compact?: boolean
}

export default function ItemDetailPanel({ info, onClose, onItemSave, className = "", compact = false }: Props) {
  const [isEditing, setIsEditing] = useState(false)

  // Draft fields (populated when edit starts)
  const [draftName, setDraftName]           = useState("")
  const [draftSize, setDraftSize]           = useState("")
  const [draftProduct, setDraftProduct]     = useState("")
  const [draftManufacturer, setDraftManufacturer] = useState("")
  const [draftSku, setDraftSku]             = useState("")
  const [draftLocFloor, setDraftLocFloor]   = useState("")
  const [draftLocRoom, setDraftLocRoom]     = useState("")
  const [draftLocShelf, setDraftLocShelf]   = useState("")
  const [draftQty, setDraftQty]             = useState("")
  const [draftSupplier, setDraftSupplier]   = useState("")
  const [draftContact, setDraftContact]     = useState("")
  const [draftDescription, setDraftDescription] = useState("")

  // Image state
  const [localImage, setLocalImage]               = useState<string | null>(null)
  const [pendingImage, setPendingImage]           = useState<string | null>(null)
  const [savingImage, setSavingImage]             = useState(false)
  const [deletingImage, setDeletingImage]         = useState(false)
  const [confirmDeleteImg, setConfirmDeleteImg]   = useState(false)
  const [imageError, setImageError]               = useState<string | null>(null)
  const [imagePickerOpen, setImagePickerOpen]     = useState(false)

  // Notes / comments
  const [instruction, setInstruction]                     = useState("")
  const [instructionDraft, setInstructionDraft]           = useState("")
  const [editingInstruction, setEditingInstruction]       = useState(false)
  const [instructionLastEdited, setInstructionLastEdited] = useState<string | null>(null)
  const [comments, setComments]     = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [newUrgency, setNewUrgency] = useState<UrgencyLevel>("info")

  const uploadInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Reset all state when a different item is selected
  useEffect(() => {
    setIsEditing(false)
    setPendingImage(null)
    setConfirmDeleteImg(false)
    setImageError(null)
    setInstruction("")
    setInstructionDraft("")
    setEditingInstruction(false)
    setInstructionLastEdited(null)
    setComments([])
    setNewComment("")

    if (!info) {
      setLocalImage(null)
      return
    }

    setLocalImage(info.imageUrl)

    // Load Firestore image if item.imageUrl is null
    if (!info.imageUrl && db) {
      getDoc(doc(db, "item_images", info.item.id)).then((snap) => {
        if (snap.exists()) setLocalImage(snap.data().url as string)
      }).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info?.item.id])

  function startEdit() {
    if (!info) return
    const { item } = info
    const locParts = (item.location ?? "").split("/")
    setDraftName(item.name)
    setDraftSize(item.size ?? "")
    setDraftProduct(item.product ?? "")
    setDraftManufacturer(item.manufacturer ?? "")
    setDraftSku(item.sku ?? "")
    setDraftLocFloor(locParts[0]?.trim() ?? "")
    setDraftLocRoom(locParts[1]?.trim() ?? "")
    setDraftLocShelf(locParts[2]?.trim() ?? "")
    setDraftQty(item.defaultQty != null ? String(item.defaultQty) : "")
    setDraftSupplier(item.supplier?.name ?? "")
    setDraftContact(item.supplier?.contact ?? "")
    setDraftDescription(item.description ?? "")
    setIsEditing(true)
  }

  function cancelEdit() {
    setIsEditing(false)
  }

  function saveEdit() {
    if (!info || !onItemSave) return
    const updatedItem: Item = {
      ...info.item,
      name: draftName.trim() || info.item.name,
      size: draftSize.trim() || undefined,
      product: draftProduct.trim() || undefined,
      manufacturer: draftManufacturer.trim() || undefined,
      sku: draftSku.trim() || undefined,
      location: [draftLocFloor, draftLocRoom, draftLocShelf].filter(Boolean).join("/") || undefined,
      defaultQty: draftQty !== "" ? Number(draftQty) : undefined,
      description: draftDescription.trim() || undefined,
      supplier: draftSupplier.trim()
        ? { name: draftSupplier.trim(), contact: draftContact.trim() || undefined, url: info.item.supplier?.url }
        : undefined,
    }
    onItemSave(info.sectionId, updatedItem)
    setIsEditing(false)
  }

  // ── Image helpers ────────────────────────────────────────────────────────
  function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out — check Firebase rules.`)), ms)
      ),
    ])
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (pendingImage?.startsWith("blob:")) URL.revokeObjectURL(pendingImage)
    setPendingImage(URL.createObjectURL(file))
    e.target.value = ""
  }

  function openImagePicker() {
    setImagePickerOpen(true)
  }

  async function saveImage() {
    if (!pendingImage || !info) return
    setSavingImage(true)
    setImageError(null)
    try {
      if (storage && db) {
        const blob = await fetch(pendingImage).then((r) => r.blob())
        const sRef = storageRef(storage, `item-images/${info.item.id}`)
        await withTimeout(uploadBytes(sRef, blob), 10000, "Storage upload")
        const url = await getDownloadURL(sRef)
        if (pendingImage.startsWith("blob:")) URL.revokeObjectURL(pendingImage)
        setLocalImage(url)
        setPendingImage(null)
        await withTimeout(setDoc(doc(db, "item_images", info.item.id), { url }), 10000, "Firestore write")
      } else {
        setLocalImage(pendingImage)
        setPendingImage(null)
      }
    } catch (err: unknown) {
      setImageError(err instanceof Error ? err.message : String(err))
    } finally {
      setSavingImage(false)
    }
  }

  function cancelPendingImage() {
    if (pendingImage?.startsWith("blob:")) URL.revokeObjectURL(pendingImage)
    setPendingImage(null)
  }

  async function removeImage() {
    if (!info) return
    setDeletingImage(true)
    try {
      if (storage && db) {
        try { await deleteObject(storageRef(storage, `item-images/${info.item.id}`)) } catch {}
        await deleteDoc(doc(db, "item_images", info.item.id))
      }
      if (localImage?.startsWith("blob:")) URL.revokeObjectURL(localImage)
      setLocalImage(null)
      setConfirmDeleteImg(false)
    } finally {
      setDeletingImage(false)
    }
  }

  // ── Comments ─────────────────────────────────────────────────────────────
  function addComment() {
    if (!newComment.trim()) return
    setComments((prev) => [{
      id: crypto.randomUUID(),
      text: newComment.trim(),
      urgency: newUrgency,
      date: today(),
    }, ...prev])
    setNewComment("")
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!info) {
    return (
      <div className={`flex h-full flex-col items-center justify-center gap-4 px-8 text-center ${className}`}>
        <div className="rounded-full bg-[#EEF2F6] p-6">
          <Package size={36} className="text-[#94a3b8]" />
        </div>
        <p className="text-[18px] font-semibold text-[#3F4752]">Item details</p>
        <p className="text-[16px] text-[#94a3b8] leading-relaxed">
          Click any item to view its details, image, and supplier info — and edit it here.
        </p>
      </div>
    )
  }

  const { item } = info
  const canEdit = !item.isFixed && !!onItemSave

  return (
    <div className={`relative flex h-full flex-col bg-[#F4F7FA] ${className}`}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className={`flex items-start gap-3 border-b border-[#D5DCE3] bg-white ${compact ? "px-5 py-3" : "px-6 py-5"} shrink-0`}>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className={`w-full ${compact ? "text-[18px]" : "text-[22px]"} font-bold text-[#10243E] border-b-2 border-[#4DA3FF] bg-transparent focus:outline-none pb-0.5`}
            />
          ) : (
            <h2 className={`${compact ? "text-[18px]" : "text-[22px]"} font-bold leading-snug text-[#10243E]`}>{item.name}</h2>
          )}
          {item.sku && (
            <p className={`mt-1 flex items-center gap-1.5 ${compact ? "text-[12px]" : "text-[14px]"} text-[#94a3b8]`}>
              <Hash size={13} className="shrink-0" />{item.sku}
            </p>
          )}
          {item.isFixed && (
            <span className="mt-1 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
              Fixed
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {canEdit && !isEditing && (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 rounded-xl bg-[#F4F7FA] px-3 py-2 text-[14px] font-semibold text-[#475569] hover:bg-[#E2EDF2] transition-colors"
            >
              <Pencil size={13} /> Edit
            </button>
          )}
          {isEditing && (
            <>
              <button
                onClick={saveEdit}
                className="flex items-center gap-1.5 rounded-xl bg-[#4DA3FF] px-3 py-2 text-[14px] font-semibold text-white hover:bg-[#2F8EF7] transition-colors"
              >
                <Save size={13} /> Save
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1.5 rounded-xl border border-[#D5DCE3] px-3 py-2 text-[14px] font-semibold text-[#64748b] hover:bg-[#F4F7FA] transition-colors"
              >
                <X size={13} /> Cancel
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#F4F7FA] flex items-center justify-center text-[#0096C7] hover:bg-[#E2EDF2] transition-colors"
            aria-label="Close detail panel"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Scrollable body ─────────────────────────────────────────────── */}
      {imagePickerOpen ? (
        <div className="absolute inset-0 z-20 flex items-end bg-black/45 p-3">
          <div className="w-full overflow-hidden rounded-[24px] border border-[#252525] bg-[#1a1a1a] shadow-2xl">
            <div className="px-5 pb-2 pt-4 text-center">
              <p className="text-[16px] font-semibold text-white">{localImage ? "Update image" : "Add image"}</p>
            </div>
            <div className="px-3 pb-3">
              <button
                type="button"
                onClick={() => {
                  setImagePickerOpen(false)
                  cameraInputRef.current?.click()
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
                  uploadInputRef.current?.click()
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

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* ── Image ──────────────────────────────────────────────────── */}
        <div>
          {pendingImage ? (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pendingImage} alt={item.name} className="w-full h-48 object-cover rounded-2xl border border-[#D5DCE3] mb-3" />
              <div className="flex gap-2">
                <button
                  onClick={saveImage}
                  disabled={savingImage}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-[15px] disabled:opacity-60 hover:bg-emerald-600 transition-colors"
                >
                  {savingImage ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  {savingImage ? "Saving…" : "Save image"}
                </button>
                <button
                  onClick={cancelPendingImage}
                  disabled={savingImage}
                  className="px-4 py-2.5 rounded-xl border border-[#D5DCE3] text-[#64748b] font-semibold text-[15px] disabled:opacity-60 hover:bg-[#F4F7FA] transition-colors"
                >
                  Cancel
                </button>
              </div>
              {imageError && <p className="text-[13px] text-red-500 mt-2 text-center">{imageError}</p>}
            </div>
          ) : localImage ? (
            confirmDeleteImg ? (
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={localImage} alt={item.name} className="w-full h-48 object-cover rounded-2xl border border-[#D5DCE3] opacity-40 mb-3" />
                <p className="text-[15px] font-semibold text-[#3F4752] mb-3 text-center">Delete this image?</p>
                <div className="flex gap-2">
                  <button
                    onClick={removeImage}
                    disabled={deletingImage}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#F87171] text-white font-semibold py-2.5 rounded-xl text-[15px] disabled:opacity-60 hover:bg-[#ef4444] transition-colors"
                  >
                    {deletingImage ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    {deletingImage ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteImg(false)}
                    disabled={deletingImage}
                    className="px-4 py-2.5 rounded-xl border border-[#D5DCE3] text-[#64748b] font-semibold text-[15px] disabled:opacity-60 hover:bg-[#F4F7FA] transition-colors"
                  >
                    Keep it
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={localImage} alt={item.name} className="w-full h-56 object-cover rounded-2xl border border-[#D5DCE3] mb-3" />
                <button
                  onClick={openImagePicker}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-[#cbd5e1] rounded-xl py-2 text-[14px] text-[#94a3b8] hover:border-[#4DA3FF] hover:text-[#4DA3FF] transition-colors mb-2"
                >
                  <ImagePlus size={14} /> Replace image
                </button>
                <button
                  onClick={() => setConfirmDeleteImg(true)}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-[#F87171] text-[#F87171] rounded-xl py-2 text-[14px] font-semibold hover:bg-[#fef2f2] transition-colors"
                >
                  <Trash2 size={14} /> Delete image
                </button>
              </div>
            )
          ) : (
            <button
              onClick={openImagePicker}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-[#cbd5e1] rounded-2xl py-8 text-[15px] text-[#94a3b8] hover:border-[#4DA3FF] hover:text-[#4DA3FF] transition-colors"
            >
              <ImagePlus size={20} /> Add image
            </button>
          )}
          <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
        </div>

        {/* ── Description ────────────────────────────────────────────── */}
        {isEditing ? (
          <div>
            <p className="text-[13px] uppercase tracking-wide text-[#94a3b8] mb-1.5">Description</p>
            <textarea
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              rows={3}
              placeholder="Add a description…"
              className="w-full text-[20px] bg-white border border-[#D5DCE3] rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#4DA3FF] placeholder:text-[#D5DCE3]"
            />
          </div>
        ) : item.description ? (
          <p className="text-[20px] leading-relaxed text-[#475569]">{item.description}</p>
        ) : null}

        {/* ── Detail fields ───────────────────────────────────────────── */}
        {isEditing ? (
          <div className="space-y-4">
            {/* Product name */}
            <div>
              <label className="text-[13px] uppercase tracking-wide text-[#94a3b8] block mb-1.5">Size</label>
              <input
                type="text"
                value={draftSize}
                onChange={(e) => setDraftSize(e.target.value)}
                placeholder="e.g. XL-L or 178cm"
                className="w-full text-[20px] bg-white border border-[#D5DCE3] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4DA3FF] placeholder:text-[#D5DCE3]"
              />
            </div>

            <div>
              <label className="text-[13px] uppercase tracking-wide text-[#94a3b8] block mb-1.5">Product name</label>
              <input
                type="text"
                value={draftProduct}
                onChange={(e) => setDraftProduct(e.target.value)}
                placeholder="e.g. Biogel"
                className="w-full text-[20px] bg-white border border-[#D5DCE3] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4DA3FF] placeholder:text-[#D5DCE3]"
              />
            </div>

            <div>
              <label className="text-[13px] uppercase tracking-wide text-[#94a3b8] block mb-1.5">Manufacturer</label>
              <input
                type="text"
                value={draftManufacturer}
                onChange={(e) => setDraftManufacturer(e.target.value)}
                placeholder="e.g. Molnlycke"
                className="w-full text-[20px] bg-white border border-[#D5DCE3] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4DA3FF] placeholder:text-[#D5DCE3]"
              />
            </div>

            <div>
              <label className="text-[13px] uppercase tracking-wide text-[#94a3b8] block mb-1.5">SKU / Reference</label>
              <input
                type="text"
                value={draftSku}
                onChange={(e) => setDraftSku(e.target.value)}
                placeholder="e.g. 1234"
                className="w-full text-[20px] bg-white border border-[#D5DCE3] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4DA3FF] placeholder:text-[#D5DCE3]"
              />
            </div>

            {/* Location */}
            <div>
              <label className="text-[13px] uppercase tracking-wide text-[#94a3b8] block mb-1.5">Location</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <input
                    type="text"
                    value={draftLocFloor}
                    onChange={(e) => setDraftLocFloor(e.target.value)}
                    placeholder="Floor/Bldg"
                    maxLength={10}
                    className="w-full text-[18px] bg-white border border-[#D5DCE3] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4DA3FF] placeholder:text-[#D5DCE3]"
                  />
                  <p className="text-[12px] text-[#94a3b8] mt-1 px-1">Floor / Bldg</p>
                </div>
                <div>
                  <input
                    type="text"
                    value={draftLocRoom}
                    onChange={(e) => setDraftLocRoom(e.target.value)}
                    placeholder="Room"
                    maxLength={10}
                    className="w-full text-[18px] bg-white border border-[#D5DCE3] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4DA3FF] placeholder:text-[#D5DCE3]"
                  />
                  <p className="text-[12px] text-[#94a3b8] mt-1 px-1">Room</p>
                </div>
                <div>
                  <input
                    type="text"
                    value={draftLocShelf}
                    onChange={(e) => setDraftLocShelf(e.target.value)}
                    placeholder="Shelf"
                    maxLength={10}
                    className="w-full text-[18px] bg-white border border-[#D5DCE3] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4DA3FF] placeholder:text-[#D5DCE3]"
                  />
                  <p className="text-[12px] text-[#94a3b8] mt-1 px-1">Shelf / Drawer</p>
                </div>
              </div>
            </div>

            {/* Quantity */}
            <div className="w-1/3">
              <label className="text-[13px] uppercase tracking-wide text-[#94a3b8] block mb-1.5">Quantity</label>
              <input
                type="number"
                value={draftQty}
                onChange={(e) => setDraftQty(e.target.value)}
                placeholder="1"
                className="w-full text-[20px] bg-white border border-[#D5DCE3] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4DA3FF] placeholder:text-[#D5DCE3]"
              />
            </div>

            {/* Supplier */}
            <div>
              <label className="text-[13px] uppercase tracking-wide text-[#94a3b8] block mb-1.5">Supplier</label>
              <input
                type="text"
                value={draftSupplier}
                onChange={(e) => setDraftSupplier(e.target.value)}
                placeholder="e.g. Stryker"
                className="w-full text-[20px] bg-white border border-[#D5DCE3] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4DA3FF] placeholder:text-[#D5DCE3]"
              />
            </div>

            <div>
              <label className="text-[13px] uppercase tracking-wide text-[#94a3b8] block mb-1.5">Supplier contact</label>
              <input
                type="text"
                value={draftContact}
                onChange={(e) => setDraftContact(e.target.value)}
                placeholder="e.g. 0800 123 456"
                className="w-full text-[20px] bg-white border border-[#D5DCE3] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4DA3FF] placeholder:text-[#D5DCE3]"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {item.product && (
              <div className="col-span-2 rounded-2xl bg-white border border-[#D5DCE3] px-4 py-3">
                <p className="text-[13px] uppercase tracking-wide text-[#94a3b8] mb-1">Product name</p>
                <p className="text-[20px] font-semibold text-[#3F4752]">{item.product}</p>
              </div>
            )}

            {item.manufacturer && (
              <div className="rounded-2xl bg-white border border-[#D5DCE3] px-4 py-3">
                <p className="text-[13px] uppercase tracking-wide text-[#94a3b8] mb-1">Manufacturer</p>
                <p className="text-[20px] font-semibold text-[#3F4752]">{item.manufacturer}</p>
              </div>
            )}

            {item.sku && (
              <div className="rounded-2xl bg-white border border-[#D5DCE3] px-4 py-3">
                <p className="text-[13px] uppercase tracking-wide text-[#94a3b8] mb-1">SKU / Reference</p>
                <p className="text-[20px] font-semibold text-[#3F4752]">{item.sku}</p>
              </div>
            )}

            {item.defaultQty != null && (
              <div className="rounded-2xl bg-white border border-[#D5DCE3] px-4 py-3">
                <p className="text-[13px] uppercase tracking-wide text-[#94a3b8] mb-1">Quantity</p>
                <p className="text-[20px] font-semibold text-[#3F4752]">{item.defaultQty}</p>
              </div>
            )}

            {item.location && (
              <div className={`${item.defaultQty != null ? "" : "col-span-2"} rounded-2xl bg-white border border-[#D5DCE3] px-4 py-3`}>
                <p className="text-[13px] uppercase tracking-wide text-[#94a3b8] mb-1 flex items-center gap-1">
                  <MapPin size={11} /> Location
                </p>
                <p className="text-[20px] font-semibold text-[#3F4752]">
                  {item.location.split("/").map((p) => p.trim()).filter(Boolean).join(" · ")}
                </p>
              </div>
            )}

            {item.supplier?.name && (
              <div className="col-span-2 rounded-2xl bg-white border border-[#D5DCE3] px-4 py-3">
                <p className="text-[13px] uppercase tracking-wide text-[#94a3b8] mb-1 flex items-center gap-1">
                  <User size={11} /> Supplier
                </p>
                <p className="text-[20px] font-semibold text-[#3F4752]">{item.supplier.name}</p>
                {item.supplier.contact && (
                  <p className="mt-0.5 text-[18px] text-[#64748b]">{item.supplier.contact}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Fixed notes (read-only) ─────────────────────────────────── */}
        {item.notes && (
          <div className="rounded-2xl bg-[#FFF8F0] border border-[#FDBA74]/40 px-4 py-3">
            <p className="text-[13px] uppercase tracking-wide text-[#94a3b8] mb-1.5">Notes</p>
            <p className="text-[20px] leading-relaxed text-[#475569]">{item.notes}</p>
          </div>
        )}

        {/* ── Custom instructions ─────────────────────────────────────── */}
        <div className="border border-[#D5DCE3] rounded-2xl p-4 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] uppercase tracking-wide text-[#94a3b8]">Custom instructions</span>
            {!editingInstruction && (
              <button
                onClick={() => { setInstructionDraft(instruction); setEditingInstruction(true) }}
                className="flex items-center gap-1 text-[14px] text-[#2F8EF7] font-semibold"
              >
                <Pencil size={12} /> Edit
              </button>
            )}
          </div>

          {editingInstruction ? (
            <>
              <textarea
                value={instructionDraft}
                onChange={(e) => setInstructionDraft(e.target.value)}
                placeholder="Add standing instructions for this item…"
                rows={3}
                className="w-full text-[20px] border border-[#D5DCE3] rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#4DA3FF] bg-white placeholder:text-[#cbd5e1]"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    setInstruction(instructionDraft)
                    setInstructionLastEdited(today())
                    setEditingInstruction(false)
                  }}
                  className="flex items-center gap-1 bg-[#4DA3FF] text-white text-[16px] font-semibold px-3 py-1.5 rounded-lg hover:bg-[#2F8EF7] transition-colors"
                >
                  <Check size={14} /> Save
                </button>
                <button
                  onClick={() => setEditingInstruction(false)}
                  className="flex items-center gap-1 text-[16px] text-[#64748b] px-3 py-1.5 rounded-lg border border-[#D5DCE3] hover:bg-[#F4F7FA] transition-colors"
                >
                  <X size={14} /> Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[20px] text-[#475569] leading-relaxed whitespace-pre-wrap">
                {instruction || <span className="text-[#cbd5e1]">No instructions added.</span>}
              </p>
              {instructionLastEdited && (
                <p className="mt-2 text-[13px] text-[#94a3b8] flex items-center gap-1">
                  <Clock size={12} /> Last edited by You · {instructionLastEdited}
                </p>
              )}
            </>
          )}
        </div>

        {/* ── Add comment ─────────────────────────────────────────────── */}
        <div>
          <span className="text-[13px] uppercase tracking-wide text-[#94a3b8] block mb-2">Add comment</span>
          <div className="flex gap-1.5 mb-3">
            {(Object.keys(URGENCY) as UrgencyLevel[]).map((u) => (
              <button
                key={u}
                onClick={() => setNewUrgency(u)}
                className={[
                  "flex-1 text-[14px] font-semibold py-1.5 rounded-lg border transition-colors",
                  newUrgency === u
                    ? URGENCY[u].colour + " border-transparent"
                    : "border-[#D5DCE3] text-[#94a3b8]",
                ].join(" ")}
              >
                {URGENCY[u].label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addComment()}
              placeholder="Write a comment…"
              className="flex-1 text-[20px] bg-white border border-[#D5DCE3] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4DA3FF] placeholder:text-[#cbd5e1]"
            />
            <button
              onClick={addComment}
              className="shrink-0 bg-[#4DA3FF] text-white text-[16px] font-semibold px-4 rounded-xl hover:bg-[#2F8EF7] transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* ── Comment list ────────────────────────────────────────────── */}
        {comments.length > 0 && (
          <div className="space-y-3">
            <span className="text-[13px] uppercase tracking-wide text-[#94a3b8] block">Comments</span>
            {comments.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl p-4 border border-[#D5DCE3]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-[13px] font-semibold px-2.5 py-0.5 rounded-full ${URGENCY[c.urgency].colour}`}>
                      <Flag size={11} />
                      {URGENCY[c.urgency].label}
                    </span>
                    <span className="text-[13px] text-[#94a3b8]">{c.date}</span>
                  </div>
                  <button
                    onClick={() => setComments((prev) => prev.filter((x) => x.id !== c.id))}
                    className="text-[#cbd5e1] hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className="text-[20px] text-[#475569] leading-relaxed">{c.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Source badge ─────────────────────────────────────────────── */}
        {item.sourceType && (
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-[#94a3b8] shrink-0" />
            <span className="text-[18px] text-[#94a3b8] capitalize">{item.sourceType} item</span>
          </div>
        )}

      </div>
    </div>
  )
}
