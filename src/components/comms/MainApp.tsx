"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore"
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"
import { signOut, type User } from "firebase/auth"
import { auth, db, storage } from "@/lib/firebase"
import { isFoldableMobileViewport as detectFoldableMobileViewport } from "@/lib/foldable"
import { setFoldCommsThread, getFoldCommsThread } from "@/lib/fold-comms-thread"
import { subscribeFoldOpenDm, consumeFoldOpenDm } from "@/lib/fold-open-dm"
import MobileGlobalSearchOverlay from "@/components/MobileGlobalSearchOverlay"
import MobileSurfaceHeader from "@/components/MobileSurfaceHeader"
import { clearCallStatus, getCallStatus, publishCallStatus, resetCallStatus } from "@/lib/call-state"
import { toggleDesktopCommsPreference } from "@/lib/desktop-comms"
import {
  createDirectPing,
  DEFAULT_PING_SHORTCUTS,
  getEffectivePingStatus,
  getPingStatusLabel,
  getPingRoleFromClinicalRole,
  isPingActive,
  markPingStatus,
  markThreadPingsSeen,
  normalizePingShortcutSets,
  readCachedPingShortcutSets,
  savePingShortcutSets,
  subscribePingShortcutSets,
} from "@/lib/comms-pings"
import { createVideoBackgroundBlurProcessor, type VideoBackgroundBlurProcessor } from "@/lib/video-background-blur"
import type {
  CommsAttachment,
  CommsPing,
  PingCategory,
  PingRole,
  PingShortcutSets,
  CommsOrg,
  CommsThread,
  CommsMessage,
  CommsPresence,
  CommsUser,
  CommsCall,
} from "@/lib/comms-types"
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowUp,
  ArrowRight,
  Check,
  Clock3,
  ChevronDown,
  ChevronRight,
  Edit2,
  Forward,
  LockKeyhole,
  LogOut,
  Mic,
  MicOff,
  MoreVertical,
  Pause,
  Paperclip,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  PhoneOutgoing,
  Pin,
  Plus,
  Play,
  Reply,
  RotateCcw,
  Search,
  ScanFace,
  Send,
  Settings,
  Smile,
  Trash2,
  Video,
  VideoOff,
  Volume2,
  SwitchCamera,
  ThumbsUp,
  Maximize2,
  Minimize2,
  PanelRight,
  Square,
  Users,
  X,
  Zap,
} from "lucide-react"

// â"€â"€â"€ Emoji data â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

const QUICK_REACT = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "✅"]

const PING_CATEGORIES: { id: PingCategory; label: string }[] = [
  { id: "action",    label: "Action"    },
  { id: "urgent",    label: "Urgent"    },
  { id: "reminder",  label: "Reminder"  },
  { id: "change",    label: "Change"    },
  { id: "heads_up",  label: "Heads Up"  },
  { id: "question",  label: "Question"  },
  { id: "confirmed", label: "Confirmed" },
]
const INCOMING_RING_TIMEOUT_MS = 12000
const DEFAULT_THEATRE_GROUPS = [
  "Trauma and Orthopaedics",
  "General Surgery",
  "Urology",
  "Obstetrics",
  "Gynaecology",
  "Otolaryngology",
  "Oral and Maxillofacial",
  "Dental",
  "Plastics",
  "Neurosurgery",
  "Cardiac",
  "Vascular",
  "Paediatrics",
  "Ophthalmology",
  "Podiatry",
  "Anaesthetics",
]
const TOM_UID = "tom-assistant"
const TOM_USER: CommsUser = {
  uid: TOM_UID,
  displayName: "TOM",
  email: "tom@prepsight.local",
  clinicalRole: "PrepSight assistant",
  updatedAt: 0,
}

function PingShortcutSettingsPanel({
  sets,
  onSave,
}: {
  sets: PingShortcutSets
  onSave: (next: PingShortcutSets) => void
}) {
  const [draft, setDraft] = useState<PingShortcutSets>(sets)
  const [activeRole, setActiveRole] = useState<PingRole>("Surgeon")
  const [newPing, setNewPing] = useState("")

  useEffect(() => {
    setDraft(sets)
  }, [sets])

  const activeCustomPings = draft[activeRole]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(Object.keys(DEFAULT_PING_SHORTCUTS) as PingRole[]).map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setActiveRole(role)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] transition-colors ${
              activeRole === role ? "bg-[#0096C7] font-medium text-white" : "bg-[#111111] text-white/75"
            }`}
          >
            {role}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#67CFCF]">Role defaults</p>
        <div className="mt-3 space-y-2">
          {DEFAULT_PING_SHORTCUTS[activeRole].map((ping) => (
            <div key={ping} className="rounded-[12px] border border-[#1f1f1f] bg-[#121212] px-3 py-2.5 text-[13px] text-white">
              {ping}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#67CFCF]">Your custom shortcuts</p>
          <button
            type="button"
            onClick={() => setDraft((current) => ({ ...current, [activeRole]: [] }))}
            className="text-[11px] font-semibold text-white/60 hover:text-white"
          >
            Clear role
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {activeCustomPings.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-white/10 bg-[#101010] px-3 py-3 text-[12px] text-white/55">
              No custom shortcuts for {activeRole.toLowerCase()} yet.
            </div>
          ) : (
            activeCustomPings.map((ping, index) => (
              <div key={`${activeRole}-${index}`} className="flex items-center gap-2 rounded-[12px] border border-[#1f1f1f] bg-[#121212] px-3 py-2.5">
                <input
                  value={ping}
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      [activeRole]: current[activeRole].map((item, itemIndex) => itemIndex === index ? e.target.value : item),
                    }))
                  }
                  className="flex-1 bg-transparent text-[13px] text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      [activeRole]: current[activeRole].filter((_, itemIndex) => itemIndex !== index),
                    }))
                  }
                  className="text-[11px] font-semibold text-[#f87171] hover:text-[#fb7185]"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#67CFCF]">Add shortcut</p>
        <div className="mt-3 flex gap-2">
          <input
            value={newPing}
            onChange={(e) => setNewPing(e.target.value)}
            placeholder={`Add a ${activeRole.toLowerCase()} shortcut`}
            className="flex-1 rounded-[12px] border border-[#2a2a2a] bg-[#141414] px-4 py-3 text-[13px] text-white placeholder:text-white/35 outline-none focus:border-[#0096C7]/50"
          />
          <button
            type="button"
            disabled={!newPing.trim()}
            onClick={() => {
              setDraft((current) => ({
                ...current,
                [activeRole]: [...current[activeRole], newPing.trim()],
              }))
              setNewPing("")
            }}
            className="rounded-[12px] bg-[#0096C7] px-4 py-3 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            Add
          </button>
        </div>
      </div>

      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={() =>
            onSave({
              Surgeon: draft.Surgeon.filter((item) => item.trim()),
              Anaesthetist: draft.Anaesthetist.filter((item) => item.trim()),
              Scrub: draft.Scrub.filter((item) => item.trim()),
              ODP: draft.ODP.filter((item) => item.trim()),
            })
          }
          className="w-full rounded-[12px] bg-[#0096C7] py-3 text-[13px] font-semibold text-white hover:bg-[#0087b3]"
        >
          Save shortcuts
        </button>
      </div>
    </div>
  )
}
type TomWatchTask = {
  id: string
  threadId: string
  subject: string
  status: "watching" | "completed"
  createdAt: number
  completedAt?: number
}

type ImageViewerState = {
  attachment: CommsAttachment
  messageId: string
  description: string
  createdAt: number
  senderName: string
}

const EMOJI_CATS: { icon: string; emojis: string[] }[] = [
  { icon: "😀", emojis: ["😀", "😃", "😄", "😁", "😆", "😂", "🤣", "🙂", "🙃", "😉", "😊", "😍", "🥰", "😘", "😎", "🤓", "🤔", "😐", "😶", "🙄", "😴", "😷", "🤒", "🤕", "🤯", "😮", "😢", "😭", "😡", "🤬"] },
  { icon: "👍", emojis: ["👍", "👎", "👏", "🙌", "🙏", "👋", "👌", "✌️", "🤞", "🤝", "💪", "🫶", "👀", "💋"] },
  { icon: "❤️", emojis: ["❤️", "💙", "💚", "💛", "🧡", "💜", "🖤", "🤍", "🤎", "💔", "💕", "💖", "💯", "🔥", "✨", "⭐", "🎉", "🎊"] },
  { icon: "🐶", emojis: ["🐶", "🐱", "🐭", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐢", "🐬"] },
  { icon: "🍎", emojis: ["🍎", "🍊", "🍇", "🍓", "🍍", "🥭", "🥑", "🍕", "🍔", "🌮", "🍣", "🍜", "🍰", "🍫", "☕", "🍵", "🍺", "🥂"] },
  { icon: "⚽", emojis: ["⚽", "🏀", "🏈", "🎾", "🏐", "🎯", "🎮", "🎲", "🎵", "🎤", "🎬", "🚗", "✈️", "🚀", "📚", "💡", "🩺", "🔬"] },
]

// â"€â"€â"€ Helpers â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

const AVATAR_COLORS = [
  "from-sky-400 to-blue-500",
  "from-purple-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
]

function Avatar({ name, size = 40, uid }: { name: string; size?: number; uid?: string }) {
  if (uid === TOM_UID) {
    return (
      <div
        aria-label="TOM"
        className="shrink-0 rounded-full"
        style={{
          width: size,
          height: size,
          backgroundImage: "url('/TOM.jpg')",
          backgroundSize: "175%",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
    )
  }
  const idx = uid ? uid.charCodeAt(0) % AVATAR_COLORS.length : 0
  return (
    <div
      className={`rounded-full bg-gradient-to-br ${AVATAR_COLORS[idx]} flex items-center justify-center shrink-0 text-white font-medium`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function DesktopCommsWordmark() {
  return (
    <span
      className="app-display-font block text-[22px] leading-none tracking-[-0.05em] text-[#67CFCF]"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontWeight: 500 }}
    >
      Comms
    </span>
  )
}

function normalizeContactIdentity(value?: string) {
  return (value || "").trim().toLowerCase()
}

function dedupeDisplayedContacts(entries: CommsUser[]) {
  const deduped = new Map<string, CommsUser>()

  for (const entry of entries) {
    const emailKey = normalizeContactIdentity(entry.email)
    const displayNameKey = normalizeContactIdentity(entry.displayName)
    const key = entry.uid === TOM_UID
      ? TOM_UID
      : emailKey || displayNameKey || entry.uid

    if (!deduped.has(key)) {
      deduped.set(key, entry)
    }
  }

  return Array.from(deduped.values())
}

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || name
}

function triggerHapticPulse(duration = 12) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return
  navigator.vibrate(duration)
}

function hasLiveVideoTrack(stream: MediaStream | null | undefined) {
  return !!stream?.getVideoTracks().some(track => track.readyState !== "ended" && !track.muted)
}

function EmojiPicker({
  onSelect,
  onClose,
  variant = "popover",
}: {
  onSelect: (e: string) => void
  onClose: () => void
  variant?: "popover" | "drawer"
}) {
  const [cat, setCat] = useState(0)
  return (
    <div className={`${variant === "drawer" ? "flex h-full w-full flex-col overflow-hidden bg-black" : "absolute bottom-full left-0 z-50 mb-2 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"}`}>
      <div className={`${variant === "drawer" ? "border-b border-[#2d2d2d] px-1 py-1.5 shrink-0" : "border-b border-gray-100 px-2 pt-2"}`}>
        {variant === "drawer" ? (
          <div className="flex justify-end mb-1">
            <button onClick={onClose} className="px-1 py-0.5 text-white hover:text-white">
              <X size={12} />
            </button>
          </div>
        ) : null}
        <div className={`flex gap-0.5 ${variant === "drawer" ? "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : ""}`}>
          {EMOJI_CATS.map((c, i) => (
            <button key={i} onClick={() => setCat(i)}
              className={`shrink-0 rounded-lg px-1.5 py-1 text-sm transition duration-200 ${cat === i ? (variant === "drawer" ? "bg-[#1c1c1c]" : "bg-sky-100") : (variant === "drawer" ? "hover:bg-[#1c1c1c]" : "hover:bg-gray-100")}`}>
              {c.icon}
            </button>
          ))}
          {variant !== "drawer" && (
            <button onClick={onClose} className="ml-auto px-2 py-1 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      <div className={`${variant === "drawer" ? "grid flex-1 grid-cols-3 gap-0.5 overflow-y-auto px-1 py-2" : "grid max-h-52 grid-cols-8 gap-0.5 overflow-y-auto p-2"}`}>
        {EMOJI_CATS[cat].emojis.map((e) => (
          <button key={e} onClick={() => { onSelect(e); onClose() }}
            className={`${variant === "drawer" ? "rounded-xl py-2 text-[24px] leading-none hover:bg-[#1c1c1c]" : "rounded p-1 text-xl leading-none hover:bg-gray-100"}`}>
            {e}
          </button>
        ))}
      </div>
    </div>
  )
}

function formatTime(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  return isToday
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" })
}

function isEmojiOnly(text: string): boolean {
  if (!text.trim()) return false
  const remainder = text.replace(/\p{Extended_Pictographic}/gu, "").replace(/[\s\u200D\uFE0F]/g, "")
  return remainder.length === 0
}

function segmentEmoji(text: string): string[] {
  try {
    if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
      const seg = new (Intl as any).Segmenter(undefined, { granularity: "grapheme" })
      return [...seg.segment(text.trim())].map((s: any) => s.segment as string).filter((s: string) => s.trim().length > 0)
    }
  } catch {}
  return [...text.trim()].filter(c => c.trim().length > 0)
}

function emojiToNotoUrl(emoji: string): string {
  // Skip variation selectors (FE0F, FE0E) â€" they don't appear in CDN paths
  const SKIP = new Set([0xFE0F, 0xFE0E])
  const cps: string[] = []
  for (const char of emoji) {
    const cp = char.codePointAt(0)
    if (cp !== undefined && cp > 0x20 && !SKIP.has(cp)) {
      cps.push(cp.toString(16))
    }
  }
  if (cps.length === 0) return ""
  return `https://fonts.gstatic.com/s/e/notoemoji/latest/${cps.join("_")}/512.gif`
}

function formatCallDuration(sec: number) {
  if (sec < 60) return `${sec}s`
  return `${Math.floor(sec / 60)}m ${sec % 60}s`
}

function formatRecordingDuration(sec: number) {
  const minutes = Math.floor(sec / 60)
  const seconds = sec % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

const MAX_INLINE_VOICE_NOTE_BYTES = 450_000
const MAX_INLINE_VOICE_NOTE_SECONDS = 45

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
        return
      }
      reject(new Error("Unable to prepare voice note."))
    }
    reader.onerror = () => reject(reader.error ?? new Error("Unable to prepare voice note."))
    reader.readAsDataURL(blob)
  })
}

function getAttachmentPreviewLabel(
  attachments?: { name: string; type: "image" | "file" | "audio" }[] | CommsAttachment[],
) {
  const firstAttachment = attachments?.[0]
  if (!firstAttachment) return "attachment"
  if (firstAttachment.type === "audio") return "voice note"
  if (firstAttachment.type === "image") return "photo"
  return "attachment"
}

function sanitizeThreadPreviewText(value?: string) {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? ""
  if (!normalized) return ""
  if (/attachment/i.test(normalized)) return "attachment"
  if (/[ÃÂðÅ]/.test(normalized) && normalized.length < 40) return "attachment"
  return normalized
}

function repairMojibake(value?: string) {
  if (!value) return ""
  if (!/[ÃÂâðÅ]/.test(value)) return value
  try {
    const bytes = Uint8Array.from(Array.from(value), (char) => char.charCodeAt(0) & 0xff)
    const decoded = new TextDecoder("utf-8").decode(bytes)
    return decoded.includes("�") ? value : decoded
  } catch {
    return value
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
        return
      }
      reject(new Error("Unable to read image."))
    }
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read image."))
    reader.readAsDataURL(file)
  })
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("Unable to process image."))
    }
    image.src = objectUrl
  })
}

async function buildInlineImageAttachment(file: File) {
  const image = await loadImageFromFile(file)
  const maxDimension = 1600
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  const context = canvas.getContext("2d")

  if (!context) {
    return {
      name: file.name,
      url: await readFileAsDataUrl(file),
      type: "image" as const,
      size: file.size,
    }
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL("image/jpeg", 0.82)
  return {
    name: file.name.replace(/\.[^.]+$/, "") + ".jpg",
    url: dataUrl,
    type: "image" as const,
    size: Math.round((dataUrl.length * 3) / 4),
  }
}

function normalizeTomText(value: string) {
  return value.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim()
}

function extractTomWatchSubject(text: string) {
  const normalized = normalizeTomText(text)
  const match = normalized.match(/text me when (.+?) (?:has )?(?:finished|completed|done)$/)
  return match?.[1]?.trim() || null
}

function extractTomCompletionSubject(text: string) {
  const normalized = normalizeTomText(text)
  const match = normalized.match(/(.+?) (?:has )?(?:finished|completed|done)$/)
  return match?.[1]?.trim() || null
}

function TypingDots({ tone = "default" }: { tone?: "default" | "tom" }) {
  const dotClass = tone === "tom" ? "bg-[#29b6d8]" : "bg-[#7aa8b7]"
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map(index => (
        <span
          key={index}
          className={`h-1.5 w-1.5 rounded-full ${dotClass} animate-[typingPulse_1.15s_ease-in-out_infinite]`}
          style={{ animationDelay: `${index * 0.16}s` }}
        />
      ))}
    </span>
  )
}

const VOICE_NOTE_WAVE = [6, 8, 19, 7, 6, 10, 6, 17, 8, 6, 10, 21, 7, 6, 18, 8, 6, 7, 15, 8, 6]

function VoiceNoteAttachment({ url, isOwn }: { url: string; isOwn: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const syncDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
    const syncTime = () => setCurrentTime(audio.currentTime)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(audio.duration || 0)
    }

    syncDuration()
    syncTime()
    audio.addEventListener("loadedmetadata", syncDuration)
    audio.addEventListener("timeupdate", syncTime)
    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("loadedmetadata", syncDuration)
      audio.removeEventListener("timeupdate", syncTime)
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [url])

  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0
  const activeBars = Math.max(1, Math.round(progress * VOICE_NOTE_WAVE.length))

  async function togglePlayback() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      await audio.play()
      return
    }
    audio.pause()
  }

  return (
    <div className="flex w-[248px] max-w-full items-center gap-2 py-0.5">
      <audio ref={audioRef} src={url} preload="metadata" className="hidden" />
      <button
        type="button"
        onClick={() => void togglePlayback()}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef2f4] text-[#091116] shadow-[0_6px_12px_rgba(0,0,0,0.18)] transition-all duration-200 hover:scale-[1.03] hover:bg-white"
        aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
      >
        {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="translate-x-[1px]" />}
      </button>
      <div className="min-w-0 flex-1">
        {isPlaying ? (
          <div className="flex h-3 items-center gap-[3px]">
            {VOICE_NOTE_WAVE.map((height, index) => (
              <span
                key={index}
                className={`block w-[3px] rounded-full transition-all duration-300 ${index < activeBars ? (isOwn ? "bg-[#52e1ff] shadow-[0_0_10px_rgba(82,225,255,0.3)]" : "bg-[#1fd4ff] shadow-[0_0_10px_rgba(31,212,255,0.22)]") : (isOwn ? "bg-[#315766]" : "bg-[#2b353b]")}`}
                style={{
                  height: Math.max(3, Math.round(height * 0.38)),
                  animation: index < activeBars ? `voiceWavePulse 1.2s ease-in-out ${index * 0.05}s infinite` : undefined,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-3 items-center">
            <div className={`relative h-px w-full ${isOwn ? "bg-[#315766]" : "bg-[#41494f]"}`}>
              <div className={`absolute left-0 top-0 h-px transition-[width] duration-200 ${isOwn ? "bg-[#52e1ff]" : "bg-[#b8c1c6]"}`} style={{ width: `${progress * 100}%` }} />
              <span
                className={`absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full transition-[left] duration-200 ${isOwn ? "bg-[#52e1ff] shadow-[0_0_0_2px_rgba(82,225,255,0.12)]" : "bg-white shadow-[0_0_0_2px_rgba(255,255,255,0.06)]"}`}
                style={{ left: `calc(${progress * 100}% - 3px)` }}
              />
            </div>
          </div>
        )}
      </div>
      <span className={`shrink-0 text-[10px] tabular-nums ${isOwn ? "text-[#bfe6ee]" : "text-[#8e9ca3]"}`}>
        {formatRecordingDuration(Math.round(duration || currentTime))}
      </span>
    </div>
  )
}

// â"€â"€â"€ Call button helper â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function CallButton({ icon, onClick, danger, active, disabled, "aria-label": ariaLabel }: {
  icon: React.ReactNode
  onClick?: () => void
  danger?: boolean
  active?: boolean
  disabled?: boolean
  "aria-label"?: string
}) {
  return (
    <button
      onClick={() => {
        if (disabled) return
        triggerHapticPulse()
        onClick?.()
      }}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`flex h-[52px] w-[52px] items-center justify-center rounded-full transition-colors ${
        disabled
          ? "bg-[#2a2a2a] text-white cursor-not-allowed"
          : danger
            ? "bg-[#ef4444] text-white hover:bg-[#dc2626] active:bg-[#b91c1c]"
            : active
              ? "bg-[#404040] text-white"
              : "bg-[#2a2a2a] text-white hover:bg-[#383838]"
      }`}
    >
      {icon}
    </button>
  )
}

// â"€â"€â"€ Main component â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

interface Props {
  user: User
  org: CommsOrg
  onSignOut: () => void
  onSwitchOrg: () => void
  embedded?: boolean
  showProfileButton?: boolean
  visible?: boolean   // false = this page is hidden; auto-minimise active calls
  profileHospital?: string
  profileDepartment?: string
  hideMobileHeader?: boolean
  allowFoldableSplitView?: boolean
  suppressCallOverlay?: boolean  // hide call overlay UI while keeping WebRTC alive
  onDirectThreadActiveChange?: (active: boolean) => void
  restoreStoredThread?: boolean
  ownsGlobalCallStatus?: boolean
}

export default function MainApp({ user, org, onSignOut, onSwitchOrg, embedded = false, showProfileButton = false, visible = true, profileHospital, profileDepartment, hideMobileHeader = false, allowFoldableSplitView = true, suppressCallOverlay = false, onDirectThreadActiveChange, restoreStoredThread = false, ownsGlobalCallStatus = true }: Props) {
  const appRef = useRef<HTMLDivElement>(null)
  const firestore = db!
  const firebaseAuth = auth!
  const firebaseStorage = storage!
  // â"€â"€ State â"€â"€
  const [threads, setThreads] = useState<CommsThread[]>([])
  const [messages, setMessages] = useState<CommsMessage[]>([])
  const [inboxMessages, setInboxMessages] = useState<CommsMessage[]>([])
  const [members, setMembers] = useState<CommsUser[]>([])
  const [presence, setPresence] = useState<Record<string, CommsPresence>>({})
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [selectedThread, setSelectedThread] = useState<CommsThread | null>(() =>
    restoreStoredThread ? getFoldCommsThread() : (!allowFoldableSplitView && hideMobileHeader ? getFoldCommsThread() : null)
  )
  const [inputText, setInputText] = useState("")
  const [composerError, setComposerError] = useState("")
  const [replyTo, setReplyTo] = useState<CommsMessage | null>(null)
  const [pendingPingReplyMessageId, setPendingPingReplyMessageId] = useState<string | null>(null)
  const [editingMessage, setEditingMessage] = useState<CommsMessage | null>(null)
  const [editText, setEditText] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<CommsMessage | null>(null)
  const [lightboxImage, setLightboxImage] = useState<ImageViewerState | null>(null)
  const [forwardingMessage, setForwardingMessage] = useState<CommsMessage | null>(null)
  const [actionBoxPosition, setActionBoxPosition] = useState<{ top: number; left: number } | null>(null)
  const [showContacts, setShowContacts] = useState(false)
  const [embeddedContactsBounds, setEmbeddedContactsBounds] = useState<{ top: number; left: number; height: number } | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showDirectContactSheet, setShowDirectContactSheet] = useState(false)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [showNewDM, setShowNewDM] = useState(false)
  const [filterTab, setFilterTab] = useState<"chats" | "pings" | "spaces" | "feeds">("chats")

  const [todaySessions, setTodaySessions] = useState<Array<{ theatre: string; specialty: string; staff: string[] }>>([])
  const [sessionsLoaded, setSessionsLoaded] = useState(false)
  const [orgTeams, setOrgTeams] = useState<Array<{ id: string; name: string; type: "theatre" | "specialty" }>>([])


  const [showCreateSpace, setShowCreateSpace] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState("")
  const [newSpaceMembers, setNewSpaceMembers] = useState<string[]>([])
  const [creatingSpace, setCreatingSpace] = useState(false)
  const [showSpaceInfo, setShowSpaceInfo] = useState(false)
  const [isFoldableSplitView, setIsFoldableSplitView] = useState(false)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [recordingElapsed, setRecordingElapsed] = useState(0)
  const [recordedVoiceBlob, setRecordedVoiceBlob] = useState<Blob | null>(null)
  const [recordedVoiceUrl, setRecordedVoiceUrl] = useState<string | null>(null)
  const [isVoicePreviewPlaying, setIsVoicePreviewPlaying] = useState(false)
  const [permissionWarning, setPermissionWarning] = useState("")
  const [tomOperatorTypingThreadId, setTomOperatorTypingThreadId] = useState<string | null>(null)
  const [joinCodeThread, setJoinCodeThread] = useState<CommsThread | null>(null)
  const [joinCodeInput, setJoinCodeInput] = useState("")
  const [joinCodeError, setJoinCodeError] = useState("")
  const [showPingPicker, setShowPingPicker] = useState<"composer" | "longpress" | null>(null)
  const [pendingPingCategory, setPendingPingCategory] = useState<PingCategory | null>(null)
  const [pings, setPings] = useState<CommsPing[]>([])
  const [allPings, setAllPings] = useState<CommsPing[]>([])
  const [showPingSettings, setShowPingSettings] = useState(false)
  const [pingShortcutSets, setPingShortcutSets] = useState<PingShortcutSets>(() => readCachedPingShortcutSets())
  const notifiedPingIdsRef = useRef<Set<string>>(new Set())
  const escalatedPingIdsRef = useRef<Set<string>>(new Set())
  const messageLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressMessageTapRef = useRef(false)
  const [pingNow, setPingNow] = useState(() => Date.now())

  useEffect(() => {
    if (!embedded || !showContacts) return

    const updateBounds = () => {
      const rect = appRef.current?.getBoundingClientRect()
      if (!rect) return
      setEmbeddedContactsBounds({
        top: rect.top,
        left: rect.left,
        height: rect.height,
      })
    }

    updateBounds()
    window.addEventListener("resize", updateBounds)
    window.addEventListener("scroll", updateBounds, true)
    return () => {
      window.removeEventListener("resize", updateBounds)
      window.removeEventListener("scroll", updateBounds, true)
    }
  }, [embedded, showContacts])

  useEffect(() => {
    if (!pendingPingReplyMessageId) return
    const match = messages.find((entry) => entry.id === pendingPingReplyMessageId)
    if (!match) return
    setReplyTo(match)
    setPendingPingReplyMessageId(null)
  }, [messages, pendingPingReplyMessageId])

  useEffect(() => {
    const timer = window.setInterval(() => setPingNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    return () => {
      stopVoiceTimer()
      if (voiceRecorderRef.current && voiceRecorderRef.current.state !== "inactive") {
        voiceRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
        voiceRecorderRef.current.stop()
      }
      if (recordedVoiceUrl) URL.revokeObjectURL(recordedVoiceUrl)
    }
  }, [recordedVoiceUrl])

  useEffect(() => {
    const syncFoldableSplitView = () => {
      setIsFoldableSplitView(allowFoldableSplitView && detectFoldableMobileViewport())
    }

    syncFoldableSplitView()
    window.addEventListener("resize", syncFoldableSplitView)
    return () => window.removeEventListener("resize", syncFoldableSplitView)
  }, [allowFoldableSplitView])

  useEffect(() => {
    const audio = voicePreviewRef.current
    if (!audio) return

    const handleEnded = () => {
      setIsVoicePreviewPlaying(false)
      audio.currentTime = 0
    }

    audio.addEventListener("ended", handleEnded)
    return () => audio.removeEventListener("ended", handleEnded)
  }, [recordedVoiceUrl])

  // â"€â"€ Call state â"€â"€
  const [callState, setCallState] = useState<"idle" | "outgoing" | "incoming" | "active">("idle")
  const [activeCall, setActiveCall] = useState<CommsCall | null>(null)
  const [callerInfo, setCallerInfo] = useState<CommsUser | null>(null)
  const [callMediaMode, setCallMediaMode] = useState<"audio" | "video">("audio")
  const [videoBlurEnabled, setVideoBlurEnabled] = useState(false)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const localPreviewStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const floatingVideoRef = useRef<HTMLVideoElement | null>(null)
  const incomingRingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const blurProcessorRef = useRef<VideoBackgroundBlurProcessor | null>(null)
  const callStartTimeRef = useRef<number>(0)
  const callThreadIdRef = useRef<string>("")
  const callUnsubRef = useRef<(() => void) | null>(null)
  const callSignalUnsubRef = useRef<(() => void) | null>(null)
  const autoAnswerCallIdRef = useRef<string | null>(null)
  const outgoingRingRef = useRef<HTMLAudioElement | null>(null)
  const deepLinkThreadIdRef = useRef<string | null>(null)
  const deepLinkCallSenderRef = useRef<string | null>(null)
  const deepLinkDmWithRef = useRef<string | null>(null)
  const [remoteVideoActive, setRemoteVideoActive] = useState(false)
  const [showConnectingOverlay, setShowConnectingOverlay] = useState(false)
  const tomAnswerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tomTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [tomVoiceMode, setTomVoiceMode] = useState(false)
  const [calleeInfo, setCalleeInfo] = useState<CommsUser | null>(null)
  const [callElapsed, setCallElapsed] = useState(0)
  const [callMuted, setCallMuted] = useState(false)
  const [callSpeaker, setCallSpeaker] = useState(false)
  const [callViewMode, setCallViewMode] = useState<"panel" | "fullscreen" | "floating">("panel")
  const [showLocalAsPrimary, setShowLocalAsPrimary] = useState(false)
  const [floatingPos, setFloatingPos] = useState<{ x: number; y: number } | null>(null)
  const [floatingSize, setFloatingSize] = useState({ w: 130, h: 190 })
  const floatingDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const floatingResizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null)
  const [showCallControls, setShowCallControls] = useState(false)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [camFacingMode, setCamFacingMode] = useState<"user" | "environment">("user")
  const [awaitingVideoAccept, setAwaitingVideoAccept] = useState(false)
  const [incomingVideoRequest, setIncomingVideoRequest] = useState<{ uid: string; name: string } | null>(null)
  const awaitingVideoAcceptRef = useRef(false)
  const videoRequestResetTimeoutRef = useRef<number | null>(null)
  const [tomTyping, setTomTyping] = useState(false)
  const [tomTasks, setTomTasks] = useState<TomWatchTask[]>([])
  const voiceRecorderRef = useRef<MediaRecorder | null>(null)
  const voiceChunksRef = useRef<Blob[]>([])
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const voicePreviewRef = useRef<HTMLAudioElement | null>(null)

  // â"€â"€ Refs â"€â"€
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const seededGroupNamesRef = useRef<Record<string, true>>({})
  const tomThreadSeededRef = useRef(false)
  const tomTaskStorageKey = `prepsight-tom-tasks:${org.id}:${user.uid}`
  // Stable wrappers that always point to the latest function versions (avoids stale-closure in published callbacks)
  const callActionsRef = useRef<{
    endCall: () => void
    answerCall: () => void
    declineCall: () => void
    toggleMute: () => void
    switchToAudio: () => void
    switchToVideo: () => void
    requestVideo: () => void
    acceptVideoRequest: () => void
    declineVideoRequest: () => void
  }>({ endCall: () => {}, answerCall: () => {}, declineCall: () => {}, toggleMute: () => {}, switchToAudio: () => {}, switchToVideo: () => {}, requestVideo: () => {}, acceptVideoRequest: () => {}, declineVideoRequest: () => {} })

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(tomTaskStorageKey)
      setTomTasks(raw ? (JSON.parse(raw) as TomWatchTask[]) : [])
    } catch {
      setTomTasks([])
    }
  }, [tomTaskStorageKey])

  useEffect(() => {
    try {
      window.localStorage.setItem(tomTaskStorageKey, JSON.stringify(tomTasks))
    } catch {
      // ignore local persistence failures
    }
  }, [tomTaskStorageKey, tomTasks])

  // â"€â"€ Clear stale calls on mount (page refresh leaves Firestore calls open) â"€â"€
  // Uses single-field queries only â€" Firestore auto-indexes these, no composite index needed.
  useEffect(() => {
    if (getCallStatus().state !== "idle") return

    async function clearStaleCalls() {
      try {
        const [s1, s2] = await Promise.all([
          getDocs(query(collection(firestore, "comms_v5_calls"), where("callerUid", "==", user.uid))),
          getDocs(query(collection(firestore, "comms_v5_calls"), where("calleeUid", "==", user.uid))),
        ])
        const stale = [...s1.docs, ...s2.docs].filter(d => {
          const data = d.data()
          if (data.organizationId !== org.id) return false
          if (data.status === "active") return true
          // Only clear ringing calls that are genuinely stale — a fresh ringing call
          // means the callee just tapped Answer from a notification (page reload).
          if (data.status === "ringing") return Date.now() - (data.createdAt || 0) > 30_000
          return false
        })
        await Promise.all(stale.map(d => updateDoc(d.ref, { status: "ended", endedAt: Date.now() })))
      } catch (e) { console.warn("stale call cleanup:", e) }
    }
    clearStaleCalls()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Ref callbacks — set srcObject immediately when element mounts so Android WebView plays without gesture
  function playVideo(el: HTMLVideoElement) {
    el.muted = true
    el.play().catch(() => {
      setTimeout(() => el.play().catch(() => {}), 300)
    })
  }

  const setRemoteVideoRef = useCallback((el: HTMLVideoElement | null) => {
    remoteVideoRef.current = el
    if (!el) return
    const stream = remoteStreamRef.current
    if (stream && stream.getVideoTracks().some(t => t.readyState !== "ended")) {
      el.muted = true
      el.srcObject = stream
      playVideo(el)
    }
  }, [])

  const setFloatingVideoRef = useCallback((el: HTMLVideoElement | null) => {
    floatingVideoRef.current = el
    if (el && remoteStreamRef.current) {
      el.muted = true
      el.srcObject = remoteStreamRef.current
      playVideo(el)
    }
  }, [])

  const setLocalVideoRef = useCallback((el: HTMLVideoElement | null) => {
    localVideoRef.current = el
    if (el) {
      const stream = localPreviewStreamRef.current ?? localStreamRef.current
      if (stream) { el.muted = true; el.srcObject = stream; playVideo(el) }
    }
  }, [])

  // â"€â"€ Sync local video stream to ref once call UI mounts â"€â"€
  useEffect(() => {
    if (callState !== "idle" && localVideoRef.current) {
      localVideoRef.current.srcObject = localPreviewStreamRef.current ?? localStreamRef.current
      playVideo(localVideoRef.current)
    }
  }, [callState, callViewMode, callMediaMode])

  // â"€â"€ Re-apply remote stream when video element mounts/unmounts (callState or view mode changes) â"€â"€
  useEffect(() => {
    if (!remoteStreamRef.current) return
    const hasVideo = hasLiveVideoTrack(remoteStreamRef.current)
    setRemoteVideoActive(hasVideo)
    if (hasVideo) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.muted = true
        remoteVideoRef.current.srcObject = remoteStreamRef.current
        remoteVideoRef.current.play().catch(() => {})
      }
      if (floatingVideoRef.current) {
        floatingVideoRef.current.muted = true
        floatingVideoRef.current.srcObject = remoteStreamRef.current
        floatingVideoRef.current.play().catch(() => {})
      }
    } else {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
      if (floatingVideoRef.current) floatingVideoRef.current.srcObject = null
    }
  }, [callState, callViewMode, callMediaMode, remoteVideoActive])

  // Polling fallback — onmute doesn't fire reliably on all WebView implementations
  useEffect(() => {
    if (callState !== "active") return
    const interval = setInterval(() => {
      const hasVideo = hasLiveVideoTrack(remoteStreamRef.current)
      if (hasVideo !== remoteVideoActive) {
        setRemoteVideoActive(hasVideo)
        if (!hasVideo) {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
          if (floatingVideoRef.current) floatingVideoRef.current.srcObject = null
        } else {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.muted = true
            remoteVideoRef.current.srcObject = remoteStreamRef.current
            remoteVideoRef.current.play().catch(() => {})
          }
          if (floatingVideoRef.current) {
            floatingVideoRef.current.muted = true
            floatingVideoRef.current.srcObject = remoteStreamRef.current
            floatingVideoRef.current.play().catch(() => {})
          }
        }
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [callState, remoteVideoActive])

  // â"€â"€ Tap-to-reveal call controls (video mode): show for 7s then auto-hide â"€â"€
  function revealCallControls() {
    setShowCallControls(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => setShowCallControls(false), 7000)
  }
  useEffect(() => {
    if (callState === "active" && (callMediaMode === "video" || remoteVideoActive)) {
      revealCallControls()
    }
    if (callState === "idle") {
      setShowCallControls(false)
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState, callMediaMode])

  // â"€â"€ Auto-minimise to floating only when panel becomes invisible (not fullscreen â€" that's intentional) â"€â"€
  useEffect(() => {
    if (!visible && callState !== "idle" && callViewMode === "panel") setCallViewMode("floating")
  }, [visible, callState, callViewMode])

  useEffect(() => () => clearMessageLongPress(), [])

  // â"€â"€ Reset floating position when entering floating mode â"€â"€
  useEffect(() => {
    if (callViewMode === "floating") setFloatingPos(null)
  }, [callViewMode])

  // â"€â"€ Register stable action callbacks in global store (mount only) â"€â"€
  useEffect(() => {
    if (!ownsGlobalCallStatus) return
    publishCallStatus({
      end: () => callActionsRef.current.endCall(),
      answer: () => callActionsRef.current.answerCall(),
      decline: () => callActionsRef.current.declineCall(),
      toggleMute: () => callActionsRef.current.toggleMute(),
      switchToAudio: () => callActionsRef.current.switchToAudio(),
      expand: () => setCallViewMode("panel"),
      acceptVideoRequest: () => callActionsRef.current.acceptVideoRequest(),
      declineVideoRequest: () => callActionsRef.current.declineVideoRequest(),
    })
    return () => clearCallStatus()
  }, [ownsGlobalCallStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  // â"€â"€ Sync call state changes to global store â"€â"€
  useEffect(() => {
    if (!ownsGlobalCallStatus) return
    publishCallStatus({
      state: callState,
      mediaMode: callMediaMode,
      videoBlurEnabled,
      muted: callMuted,
      minimized: callViewMode === "floating",
    })
  }, [callState, callMediaMode, videoBlurEnabled, callMuted, callViewMode, ownsGlobalCallStatus])

  useEffect(() => {
    if (!ownsGlobalCallStatus) return
    publishCallStatus({ incomingVideoRequest })
  }, [incomingVideoRequest, ownsGlobalCallStatus])

  function setLocalPreviewStream(stream: MediaStream | null) {
    localPreviewStreamRef.current = stream
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream
      if (stream) {
        localVideoRef.current.play().catch(() => {})
      }
    }
  }

  async function replaceOutgoingVideoTrack(track: MediaStreamTrack | null) {
    const sender = pcRef.current?.getSenders().find((candidate) => candidate.track?.kind === "video")
    if (!sender) return
    await sender.replaceTrack(track).catch((error) => {
      console.warn("replace outgoing video track:", error)
    })
  }

  function teardownBlurProcessor() {
    blurProcessorRef.current?.destroy()
    blurProcessorRef.current = null
  }

  async function disableBackgroundBlur(updateState = true) {
    teardownBlurProcessor()
    const rawTrack = localStreamRef.current?.getVideoTracks()[0] ?? null
    if (rawTrack) {
      await replaceOutgoingVideoTrack(rawTrack)
      setLocalPreviewStream(localStreamRef.current)
    } else {
      setLocalPreviewStream(null)
    }
    if (updateState) {
      setVideoBlurEnabled(false)
    }
  }

  async function enableBackgroundBlur() {
    if (callMediaMode !== "video" || !localStreamRef.current) return
    const rawTrack = localStreamRef.current.getVideoTracks()[0]
    if (!rawTrack) return
    teardownBlurProcessor()
    try {
      const processor = await createVideoBackgroundBlurProcessor(rawTrack)
      const processedTrack = processor.outputStream.getVideoTracks()[0]
      if (!processedTrack) {
        processor.destroy()
        return
      }
      blurProcessorRef.current = processor
      setLocalPreviewStream(processor.outputStream)
      await replaceOutgoingVideoTrack(processedTrack)
      setVideoBlurEnabled(true)
      setShowLocalAsPrimary(true)
    } catch (error) {
      console.warn("enable background blur:", error)
      setLocalPreviewStream(localStreamRef.current)
      setVideoBlurEnabled(false)
    }
  }

  async function toggleBackgroundBlur() {
    if (videoBlurEnabled) {
      await disableBackgroundBlur()
      return
    }
    await enableBackgroundBlur()
  }

  useEffect(() => {
    if (!ownsGlobalCallStatus) return
    publishCallStatus({ elapsed: callElapsed })
  }, [callElapsed, ownsGlobalCallStatus])

  useEffect(() => {
    if (!ownsGlobalCallStatus) return
    publishCallStatus({ callerName: callerInfo?.displayName ?? "", callerUid: callerInfo?.uid ?? "" })
  }, [callerInfo, ownsGlobalCallStatus])

  useEffect(() => {
    if (!ownsGlobalCallStatus) return
    publishCallStatus({ calleeName: calleeInfo?.displayName ?? "", calleeUid: calleeInfo?.uid ?? "" })
  }, [calleeInfo, ownsGlobalCallStatus])

  // Read URL params on mount — set by Android when tapping call/message notifications
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const autoAnswer = params.get("autoAnswer")
    if (autoAnswer) autoAnswerCallIdRef.current = autoAnswer
    const threadId = params.get("threadId")
    if (threadId) deepLinkThreadIdRef.current = threadId
    const callSender = params.get("callSender")
    if (callSender) deepLinkCallSenderRef.current = callSender
    const dmWith = params.get("dmWith")
    if (dmWith) deepLinkDmWithRef.current = dmWith
    if (autoAnswer || callSender) setShowConnectingOverlay(true)
  }, [])

  // Hide connecting overlay once call state is established
  useEffect(() => {
    if (showConnectingOverlay && callState !== "idle") setShowConnectingOverlay(false)
  }, [callState, showConnectingOverlay])

  // Safety: dismiss overlay after 8s even if call never arrives
  useEffect(() => {
    if (!showConnectingOverlay) return
    const t = setTimeout(() => setShowConnectingOverlay(false), 8000)
    return () => clearTimeout(t)
  }, [showConnectingOverlay])

  // Auto-answer when the call arrives and matches the notification tap
  useEffect(() => {
    if (callState === "incoming" && activeCall && autoAnswerCallIdRef.current === activeCall.id) {
      autoAnswerCallIdRef.current = null
      callActionsRef.current.answerCall()
    }
  }, [callState, activeCall]) // eslint-disable-line react-hooks/exhaustive-deps

  // â"€â"€ Vibrate on incoming call â"€â"€
  useEffect(() => {
    if (!ownsGlobalCallStatus || callState !== "incoming" || !("vibrate" in navigator)) return
    // Ring pattern: 400ms on, 200ms off, repeat
    const interval = setInterval(() => navigator.vibrate([400, 200, 400, 200, 400]), 1400)
    return () => { clearInterval(interval); navigator.vibrate(0) }
  }, [callState, ownsGlobalCallStatus])

  // â"€â"€ Ringtone on incoming call (web + Capacitor foreground — CallRingtoneService handles background) â"€â"€
  useEffect(() => {
    if (!ownsGlobalCallStatus || callState !== "incoming") return
    // Only play in-app ringtone when visible — CallRingtoneService handles it when backgrounded
    if (document.visibilityState !== "visible") return
    const audio = new Audio("/call-ringtone.mp3")
    audio.loop = true
    void audio.play().catch(() => {})
    return () => { audio.pause(); audio.src = "" }
  }, [callState, ownsGlobalCallStatus])

  useEffect(() => {
    if (!ownsGlobalCallStatus || callState !== "incoming" || !activeCall) return
    if (incomingRingTimeoutRef.current) {
      clearTimeout(incomingRingTimeoutRef.current)
    }
    incomingRingTimeoutRef.current = setTimeout(() => {
      incomingRingTimeoutRef.current = null
      if (activeCall.calleeUid === TOM_UID || activeCall.callerUid === TOM_UID) {
        cleanupCall()
        return
      }
      void updateDoc(doc(firestore, "comms_v5_calls", activeCall.id), {
        status: "missed",
        endedAt: Date.now(),
      }).catch(() => {})
    }, INCOMING_RING_TIMEOUT_MS)
    return () => {
      if (incomingRingTimeoutRef.current) {
        clearTimeout(incomingRingTimeoutRef.current)
        incomingRingTimeoutRef.current = null
      }
    }
  }, [activeCall, callState, ownsGlobalCallStatus])


  // â"€â"€ Call elapsed timer â"€â"€
  useEffect(() => {
    if (callState !== "active") { setCallElapsed(0); return }
    const interval = setInterval(() => {
      setCallElapsed(Math.round((Date.now() - callStartTimeRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [callState])

  // â"€â"€ Push notifications (native Capacitor or web FCM) â"€â"€
  useEffect(() => {
    import("@/lib/capacitor-push").then(({ isNativeApp, setupCapacitorPush }) => {
      if (isNativeApp()) {
        setupCapacitorPush(user.uid)
        return
      }
      import("@/lib/fcm").then(({ requestNotificationPermission, onForegroundMessage }) => {
        requestNotificationPermission(user.uid)
        return onForegroundMessage((payload) => {
          const data = payload.data || {}
          const title = payload.notification?.title || data.title || ""
          const body = payload.notification?.body || data.body || ""
          if (data.type === "message" && data.threadId === selectedThread?.id) return
          if (title || body) new Notification(title || "PrepSight", { body, icon: "/logo.png" })
        })
      }).catch(() => {})
    }).catch(() => {})
  }, [user.uid])

  // â"€â"€ Presence heartbeat â"€â"€
  useEffect(() => {
    async function setOnline() {
      try {
        await setDoc(doc(firestore, "comms_v5_presence", user.uid), {
          uid: user.uid, status: "online", lastSeen: Date.now(), organizationId: org.id,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : ""
        if (message.toLowerCase().includes("permission")) {
          setPermissionWarning("Live Comms access is limited until Firestore permissions are updated.")
          return
        }
        console.error(error)
      }
    }
    setOnline()
    const interval = setInterval(setOnline, 30_000)
    const handleUnload = () => {
      void setDoc(doc(firestore, "comms_v5_presence", user.uid), {
        uid: user.uid, status: "offline", lastSeen: Date.now(), organizationId: org.id,
      }).catch(() => {})
    }
    window.addEventListener("beforeunload", handleUnload)
    return () => { clearInterval(interval); window.removeEventListener("beforeunload", handleUnload) }
  }, [user.uid, org.id])

  // â"€â"€ Load members â"€â"€
  useEffect(() => {
    const q = query(collection(firestore, "comms_v5_memberships"), where("orgId", "==", org.id), where("status", "==", "active"))
    return onSnapshot(q, async snap => {
      const uids = Array.from(
        new Set(
          snap.docs
            .map(d => d.data().uid as string)
            .filter((uid): uid is string => typeof uid === "string" && uid.trim().length > 0),
        ),
      )
      const users: CommsUser[] = []
      for (const uid of uids) {
        const ud = await getDoc(doc(firestore, "comms_v5_users", uid))
        if (ud.exists()) users.push({ uid, ...ud.data() } as CommsUser)
      }
      setMembers(users)
    }, error => {
      if ((error.message || "").toLowerCase().includes("permission")) {
        setPermissionWarning("Live Comms access is limited until Firestore permissions are updated.")
        setMembers([])
        return
      }
      console.error(error)
    })
  }, [org.id])

  // â"€â"€ Load presence â"€â"€
  useEffect(() => {
    const q = query(collection(firestore, "comms_v5_presence"), where("organizationId", "==", org.id))
    return onSnapshot(q, snap => {
      const map: Record<string, CommsPresence> = {}
      snap.docs.forEach(d => { map[d.id] = d.data() as CommsPresence })
      setPresence(map)
    }, error => {
      if ((error.message || "").toLowerCase().includes("permission")) {
        setPermissionWarning("Live Comms access is limited until Firestore permissions are updated.")
        setPresence({})
        return
      }
      console.error(error)
    })
  }, [org.id])

  // â"€â"€ Load threads â"€â"€
  useEffect(() => {
    const q = query(
      collection(firestore, "comms_v5_threads"),
      where("memberUids", "array-contains", user.uid),
      orderBy("updatedAt", "desc"),
    )
    return onSnapshot(q, snap => {
      setThreads(snap.docs.map(d => ({ id: d.id, ...d.data() } as CommsThread)))
    }, error => {
      if ((error.message || "").toLowerCase().includes("permission")) {
        setPermissionWarning("Live Comms access is limited until Firestore permissions are updated.")
        setThreads([])
        return
      }
      console.error(error)
    })
  }, [user.uid])

  useEffect(() => {
    const q = query(
      collection(firestore, "comms_v5_messages"),
      where("memberUids", "array-contains", user.uid),
      orderBy("createdAt", "desc"),
    )
    return onSnapshot(q, snap => {
      setInboxMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as CommsMessage)))
    }, error => {
      if ((error.message || "").toLowerCase().includes("permission")) {
        setPermissionWarning("Live Comms access is limited until Firestore permissions are updated.")
        setInboxMessages([])
        return
      }
      console.error(error)
    })
  }, [user.uid])

  // â"€â"€ Load messages â"€â"€
  useEffect(() => {
    if (!selectedThread) { setMessages([]); return }
    const q = query(
      collection(firestore, "comms_v5_messages"),
      where("memberUids", "array-contains", user.uid),
      where("threadId", "==", selectedThread.id),
      orderBy("createdAt", "asc"),
    )
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as CommsMessage)))
    }, error => {
      if ((error.message || "").toLowerCase().includes("permission")) {
        setPermissionWarning("Live Comms access is limited until Firestore permissions are updated.")
        setMessages([])
        return
      }
      console.error(error)
    })
  }, [selectedThread?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (!selectedThread || messages.length === 0) return
    void markThreadRead(selectedThread.id)
  }, [selectedThread?.id, messages.length])

  // â"€â"€ Incoming call listener â"€â"€
  useEffect(() => {
    const q = query(
      collection(firestore, "comms_v5_calls"),
      where("calleeUid", "==", user.uid),
      where("status", "==", "ringing"),
      where("organizationId", "==", org.id),
    )
    return onSnapshot(q, async snap => {
      if (!snap.empty && callState === "idle") {
        const callDoc = snap.docs[0]
        const call = { id: callDoc.id, ...callDoc.data() } as CommsCall
        // Reject ghost calls left over from a previous session (older than 60 s)
        if (Date.now() - call.createdAt > 60_000) {
          try { await updateDoc(doc(firestore, "comms_v5_calls", callDoc.id), { status: "missed" }) } catch {}
          return
        }
        setActiveCall(call)
        setCallMediaMode(call.mode || "audio")
        setCallState("incoming")
        subscribeToCallStatus(call.id)
        const callerDoc = await getDoc(doc(firestore, "comms_v5_users", call.callerUid))
        if (callerDoc.exists()) setCallerInfo(callerDoc.data() as CommsUser)
      }
    }, error => {
      if ((error.message || "").toLowerCase().includes("permission")) {
        setPermissionWarning("Live Comms access is limited until Firestore permissions are updated.")
        return
      }
      console.error(error)
    })
  }, [user.uid, org.id, callState])

  // â"€â"€ Thread helpers â"€â"€
  function selectThread(thread: CommsThread) {
    if (isGroupLocked(thread)) {
      setJoinCodeThread(thread)
      setJoinCodeInput("")
      setJoinCodeError("")
      return
    }
    setSelectedThread(thread)
    setUnreadCounts(prev => ({ ...prev, [thread.id]: 0 }))
    void markThreadRead(thread.id)
    setReplyTo(null)
    setEditingMessage(null)
    setActionMessage(null)
    setActionBoxPosition(null)
    setShowEmojiPicker(null)
    onDirectThreadActiveChange?.(thread.type === "direct")
    setFoldCommsThread(thread)
  }

  async function togglePinThread(threadId: string) {
    const nextPinned = isThreadPinned(threadId)
      ? (currentUserRecord?.pinnedThreadIds || []).filter(id => id !== threadId)
      : Array.from(new Set([...(currentUserRecord?.pinnedThreadIds || []), threadId]))

    try {
      await setDoc(
        doc(firestore, "comms_v5_users", user.uid),
        {
          pinnedThreadIds: nextPinned,
          updatedAt: Date.now(),
        },
        { merge: true },
      )
    } catch {
      // ignore
    }
  }

  async function unlockGroupThread() {
    if (!joinCodeThread) return
    if (joinCodeInput.trim() !== "1234") {
      setJoinCodeError("Code invalid")
      return
    }

    const nextUnlocked = Array.from(
      new Set([...(currentUserRecord?.unlockedGroupIds || []), joinCodeThread.id]),
    )

    try {
      await setDoc(
        doc(firestore, "comms_v5_users", user.uid),
        {
          unlockedGroupIds: nextUnlocked,
          updatedAt: Date.now(),
        },
        { merge: true },
      )
      const thread = joinCodeThread
      setJoinCodeThread(null)
      setJoinCodeInput("")
      setJoinCodeError("")
      setSelectedThread(thread)
      setUnreadCounts(prev => ({ ...prev, [thread.id]: 0 }))
      void markThreadRead(thread.id)
    } catch {
      setJoinCodeError("Unable to join right now")
    }
  }

  async function handleSavePingShortcutSets(next: PingShortcutSets) {
    setPingShortcutSets(next)
    try {
      await savePingShortcutSets(firestore, user.uid, next)
    } catch {
      setPermissionWarning("Unable to save ping shortcuts right now.")
    }
  }

  async function handlePingAction(pingId: string, status: "seen" | "accepted" | "completed" | "declined" | "escalated") {
    try {
      await markPingStatus(firestore, pingId, status, user.uid)
    } catch {
      setPermissionWarning("Unable to update ping status right now.")
    }
  }

  function getThreadById(threadId: string) {
    return threads.find((thread) => thread.id === threadId) ?? null
  }

  function openPingThread(ping: CommsPing, withCustomReply = false) {
    const thread = getThreadById(ping.threadId)
    if (!thread) return
    setFilterTab("chats")
    if (withCustomReply && ping.messageId) {
      setPendingPingReplyMessageId(ping.messageId)
    }
    selectThread(thread)
  }

  async function sendPingReply(ping: CommsPing, replyText: string, kind: "quick" | "custom", label: string) {
    const thread = getThreadById(ping.threadId)
    if (!thread) {
      setPermissionWarning("Unable to find the ping thread right now.")
      return
    }
    const content = replyText.trim()
    if (!content) return

    const createdAt = Date.now()
    const sourceMessage = ping.messageId ? messages.find((entry) => entry.id === ping.messageId) ?? null : null

    await addDoc(collection(firestore, "comms_v5_messages"), {
      threadId: thread.id,
      uid: user.uid,
      displayName: user.displayName || "User",
      text: content,
      type: "text",
      organizationId: org.id,
      memberUids: thread.memberUids,
      createdAt,
      pingReply: {
        pingId: ping.id,
        kind,
        label,
      },
      ...(sourceMessage
        ? {
            replyTo: {
              messageId: sourceMessage.id,
              uid: sourceMessage.uid,
              displayName: sourceMessage.displayName,
              text: sourceMessage.text,
            },
          }
        : {}),
    })
    await updateDoc(doc(firestore, "comms_v5_threads", thread.id), {
      updatedAt: createdAt,
      lastMessage: content,
    })
    if (ping.recipientUid === user.uid && getEffectivePingStatus(ping) === "sent") {
      await updateDoc(doc(firestore, "comms_v5_pings", ping.id), {
        status: "completed",
        seenAt: createdAt,
        completedAt: createdAt,
        ...(kind === "quick" ? { acceptedAt: createdAt } : {}),
      })
    } else if (kind === "quick") {
      await updateDoc(doc(firestore, "comms_v5_pings", ping.id), {
        status: "completed",
        acceptedAt: createdAt,
        completedAt: createdAt,
      })
    }
    if (kind === "quick") {
      await sendTomPingUpdate(thread, `Response received after ${formatPingElapsed(ping.createdAt, createdAt)} — ${label}.`)
    }
  }

  async function markThreadRead(threadId: string) {
    const readAt = Date.now()
    setThreads(current =>
      current.map(thread =>
        thread.id === threadId
          ? { ...thread, readBy: { ...(thread.readBy || {}), [user.uid]: readAt } }
          : thread,
      ),
    )
    try {
      await updateDoc(doc(firestore, "comms_v5_threads", threadId), {
        [`readBy.${user.uid}`]: readAt,
      })
      const seenPings = await markThreadPingsSeen(firestore, threadId, user.uid)
      setPings((current) =>
        current.map((ping) =>
          ping.threadId === threadId && ping.recipientUid === user.uid && getEffectivePingStatus(ping) === "sent"
            ? { ...ping, status: "completed", seenAt: readAt, completedAt: readAt }
            : ping,
        ),
      )
      const thread = threads.find((entry) => entry.id === threadId) ?? selectedThread
      if (thread) {
        for (const ping of seenPings) {
          await sendTomPingUpdate(thread, `Seen after ${formatPingElapsed(ping.createdAt, readAt)}.`)
        }
      }
    } catch {
      // keep local clear even if remote write lags
    }
  }

  async function sendTomMessage(thread: CommsThread, text: string) {
    const createdAt = Date.now()
    const memberUids = Array.from(new Set([...thread.memberUids, user.uid, TOM_UID]))
    await addDoc(collection(firestore, "comms_v5_messages"), {
      threadId: thread.id,
      uid: TOM_UID,
      displayName: "TOM",
      text,
      type: "text",
      organizationId: org.id,
      memberUids,
      createdAt,
    })
    await updateDoc(doc(firestore, "comms_v5_threads", thread.id), {
      updatedAt: createdAt,
      lastMessage: text,
    })
  }

  function getThreadName(thread: CommsThread) {
    if (thread.type === "channel") return thread.name || "channel"
    const otherUid = thread.memberUids.find(u => u !== user.uid) || ""
    return allMembers.find(m => m.uid === otherUid)?.displayName || "Direct Message"
  }

  function getThreadAvatar(thread: CommsThread) {
    if (thread.type === "direct") {
      const otherUid = thread.memberUids.find(u => u !== user.uid) || ""
      return allMembers.find(m => m.uid === otherUid) || null
    }
    return null
  }

  function getOtherUid(thread: CommsThread) {
    return thread.memberUids.find(u => u !== user.uid) || ""
  }

  function isThreadPinned(threadId: string) {
    return (currentUserRecord?.pinnedThreadIds || []).includes(threadId)
  }

  function isGroupUnlocked(threadId: string) {
    return (currentUserRecord?.unlockedGroupIds || []).includes(threadId)
  }

  function isGroupLocked(thread: CommsThread) {
    return thread.type === "channel" && thread.subtype !== "group" && !isGroupUnlocked(thread.id)
  }

  function getLastMessagePreview(thread: CommsThread) {
    const latest = inboxMessages
      .filter(message => message.threadId === thread.id && !message.deleted)
      .sort((left, right) => right.createdAt - left.createdAt)[0]

    if (latest?.ping) {
      return latest.uid === user.uid
        ? `You pinged ${latest.ping.recipientDisplayName} - ${latest.text.trim()}`
        : `Pinged you - ${latest.text.trim()}`
    }
    if (latest?.pingReply?.label && latest?.text?.trim()) {
      return `${latest.pingReply.label} - ${latest.text.trim()}`
    }
    if (latest?.text?.trim()) return latest.text.trim()
    if (latest?.attachments?.length) return getAttachmentPreviewLabel(latest.attachments)
    if (thread.type === "direct" && thread.memberUids.includes(TOM_UID)) return "Ask me anything"
    if (thread.type === "channel" && isGroupLocked(thread)) return "Enter code to join"
    const sanitizedLastMessage = sanitizeThreadPreviewText(thread.lastMessage)
    if (sanitizedLastMessage) return sanitizedLastMessage
    return thread.type === "channel" ? "Group" : ""
  }

  function clearMessageLongPress() {
    if (messageLongPressTimerRef.current) {
      clearTimeout(messageLongPressTimerRef.current)
      messageLongPressTimerRef.current = null
    }
  }

  function openMessageActions(target: HTMLElement, msg: CommsMessage, isOwnMessage: boolean, emitHaptic = false) {
    if (emitHaptic) triggerHapticPulse()
    const containerRect = appRef.current?.getBoundingClientRect()
    const bubbleRect = target.getBoundingClientRect()
    const boxWidth = 228
    const preferredLeft = isOwnMessage
      ? bubbleRect.right - (containerRect?.left ?? 0) - boxWidth
      : bubbleRect.left - (containerRect?.left ?? 0)
    const maxLeft = (containerRect?.width ?? 320) - boxWidth - 12
    setActionBoxPosition({
      top: Math.max(16, bubbleRect.bottom - (containerRect?.top ?? 0) + 8),
      left: Math.max(12, Math.min(preferredLeft, maxLeft)),
    })
    setActionMessage(msg)
    setShowEmojiPicker(null)
  }

  function renderMessageAttachment(att: CommsAttachment, index: number, isOwn: boolean, message: CommsMessage) {
    if (att.type === "image") {
      return (
        <div key={`${att.url}-${index}`} className="mb-2 last:mb-0">
          <img
            src={att.url}
            alt={att.name}
            onClick={(event) => {
              event.stopPropagation()
              setLightboxImage({
                attachment: att,
                messageId: message.id,
                description: repairMojibake(message.originalText ?? message.text).trim(),
                createdAt: message.createdAt,
                senderName: message.displayName,
              })
            }}
            className="block max-h-[360px] w-auto max-w-full rounded-[19px] bg-[#071017] object-cover shadow-[0_16px_36px_rgba(0,0,0,0.28)] cursor-zoom-in"
          />
        </div>
      )
    }

    if (att.type === "audio") {
      return (
        <div key={`${att.url}-${index}`} className="mb-2 last:mb-0">
          <VoiceNoteAttachment url={att.url} isOwn={isOwn} />
        </div>
      )
    }

    return (
      <div key={`${att.url}-${index}`} className="mb-2 last:mb-0">
        <a
          href={att.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 text-sm underline ${isOwn ? "text-white" : "text-[#29b6d8]"}`}
        >
          <Paperclip size={13} /> {att.name}
        </a>
      </div>
    )
  }

  function getSeenReceiptMembers(thread: CommsThread | null, message: CommsMessage) {
    if (!thread || message.uid !== user.uid || message.deleted) return []

    return thread.memberUids
      .filter((uid) => uid !== user.uid && uid !== TOM_UID)
      .map((uid) => ({
        uid,
        readAt: thread.readBy?.[uid] ?? 0,
        member: allMembers.find((member) => member.uid === uid) ?? null,
      }))
      .filter((entry) => entry.member && entry.readAt >= message.createdAt)
      .sort((left, right) => right.readAt - left.readAt)
  }

  function renderMessageMeta(message: CommsMessage, isOwn: boolean) {
    const seenMembers = getSeenReceiptMembers(liveSelectedThread, message)
    const visibleSeenMembers = seenMembers.slice(0, 3)
    const hiddenSeenCount = Math.max(0, seenMembers.length - visibleSeenMembers.length)

    return (
      <div className="mt-1 flex w-full items-center justify-between gap-3 px-1">
        <span className="text-xs text-white/60">{formatTime(message.createdAt)}</span>
        {isOwn && visibleSeenMembers.length > 0 ? (
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1.5">
              {visibleSeenMembers.map(({ member, uid }) =>
                member ? (
                  <div key={uid} className="rounded-full ring-2 ring-black">
                    <Avatar name={member.displayName} size={18} uid={member.uid} />
                  </div>
                ) : null,
              )}
            </div>
            {hiddenSeenCount > 0 ? (
              <span className="text-[11px] text-[#7f96a3]">{hiddenSeenCount} more</span>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  function formatPingElapsed(startedAt: number, now: number) {
    const totalSeconds = Math.max(0, Math.floor((now - startedAt) / 1000))
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    if (hours > 0) return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  function getPingDisplayElapsed(ping: CommsPing, now: number) {
    const stopAt = ping.seenAt ?? ping.escalatedAt ?? ping.completedAt ?? ping.declinedAt ?? now
    return formatPingElapsed(ping.createdAt, stopAt)
  }

  function getPingLiveTone(ping: CommsPing | null, now: number) {
    if (!ping) {
      return {
        bubble: "",
        timerTone: "text-white/60",
        label: "",
      }
    }

    const status = getEffectivePingStatus(ping, now)
    const ageMs = Math.max(0, (ping.seenAt ?? now) - ping.createdAt)

    if (status === "escalated") {
      return {
        bubble: "bg-gradient-to-br from-[#c93853] to-[#8f1630] text-white",
        timerTone: "text-rose-200",
        label: "Redirected",
      }
    }

    if (status === "seen") {
      return {
        bubble: "bg-gradient-to-br from-[#c18a1d] to-[#8b5c06] text-white",
        timerTone: "text-amber-200",
        label: "Seen",
      }
    }

    if (ageMs >= 120_000) {
      return {
        bubble: "bg-gradient-to-br from-[#c18a1d] to-[#8b5c06] text-white",
        timerTone: "text-amber-200",
        label: "Pending",
      }
    }

    return {
      bubble: "bg-gradient-to-br from-[#228b57] to-[#17663f] text-white",
      timerTone: "text-emerald-200",
      label: "Pending",
    }
  }

  async function sendTomPingUpdate(thread: CommsThread, text: string) {
    setTomOperatorTypingThreadId(thread.id)
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 1200))
      const createdAt = Date.now()
      await addDoc(collection(firestore, "comms_v5_messages"), {
        threadId: thread.id,
        uid: TOM_UID,
        displayName: "TOM",
        text,
        type: "text",
        organizationId: org.id,
        memberUids: Array.from(new Set([...thread.memberUids, TOM_UID])),
        createdAt,
      })
      await updateDoc(doc(firestore, "comms_v5_threads", thread.id), {
        updatedAt: createdAt,
        lastMessage: text,
      })
    } finally {
      setTomOperatorTypingThreadId((current) => (current === thread.id ? null : current))
    }
  }

  async function reopenPing(ping: CommsPing) {
    const thread = threads.find((entry) => entry.id === ping.threadId) ?? selectedThread
    if (!thread) return
    const now = Date.now()
    await updateDoc(doc(firestore, "comms_v5_pings", ping.id), {
      status: "sent",
      createdAt: now,
      seenAt: deleteField(),
      acceptedAt: deleteField(),
      completedAt: deleteField(),
      declinedAt: deleteField(),
      escalatedAt: deleteField(),
      escalatedBy: deleteField(),
    })
    await sendTomPingUpdate(thread, "Ping reopened.")
  }

  async function stopPing(ping: CommsPing) {
    const thread = threads.find((entry) => entry.id === ping.threadId) ?? selectedThread
    if (!thread) return
    await updateDoc(doc(firestore, "comms_v5_pings", ping.id), {
      status: "completed",
      completedAt: Date.now(),
    })
    await sendTomPingUpdate(thread, "Ping stopped.")
  }

  function getPingReplyVisual(label: string) {
    const lower = label.trim().toLowerCase()

    if (lower.includes("escalate") || lower.includes("redirect")) {
      return {
        icon: ArrowUp,
        tone: "text-white",
        surface: "border-red-500/75 bg-gradient-to-b from-[#ff4d5d] to-[#df0b24] shadow-[0_0_28px_rgba(255,59,76,0.45)]",
      }
    }
    if (lower.includes("acknowledge") || lower.includes("seen")) {
      return {
        icon: Check,
        tone: "text-white",
        surface: "border-sky-500/75 bg-gradient-to-b from-[#3aa7ff] to-[#0b69d9] shadow-[0_0_28px_rgba(41,182,216,0.45)]",
      }
    }
    if (lower.includes("way") || lower.includes("coming") || lower.includes("bringing") || lower.includes("on it") || lower.includes("covering") || lower.includes("supporting")) {
      return {
        icon: ThumbsUp,
        tone: "text-white",
        surface: "border-emerald-500/75 bg-gradient-to-b from-[#52d64d] to-[#17982c] shadow-[0_0_28px_rgba(73,208,85,0.42)]",
      }
    }
    if (lower.includes("review") || lower.includes("check") || lower.includes("finding") || lower.includes("arranging")) {
      return {
        icon: Search,
        tone: "text-white",
        surface: "border-amber-500/75 bg-gradient-to-b from-[#f7bb45] to-[#dc7a12] shadow-[0_0_28px_rgba(245,158,11,0.42)]",
      }
    }
    if (lower.includes("unable") || lower.includes("can't")) {
      return {
        icon: X,
        tone: "text-white",
        surface: "border-red-500/75 bg-gradient-to-b from-[#ff4d5d] to-[#df0b24] shadow-[0_0_28px_rgba(255,59,76,0.45)]",
      }
    }
    return {
      icon: Clock3,
      tone: "text-white",
      surface: "border-zinc-400/70 bg-gradient-to-b from-[#686868] to-[#343434] shadow-[0_0_20px_rgba(255,255,255,0.14)]",
    }
  }

  function renderPingMessageActions(message: CommsMessage) {
    if (!message.ping || message.ping.recipientUid !== user.uid) return null

    const alreadyReplied = messages.some((entry) => entry.uid === user.uid && entry.pingReply?.pingId === message.ping?.pingId)
    if (alreadyReplied) return null

    return (
      <div className="mt-2 flex flex-wrap gap-3" data-no-long-press="true">
        {message.ping.quickReplies.map((reply) => (
          (() => {
            const visual = getPingReplyVisual(reply.label)
            const Icon = visual.icon
            return (
              <button
                key={`${message.id}-${reply.id}`}
                type="button"
                onClick={() => void sendPingReply(
                  {
                    id: message.ping!.pingId,
                    category: "action",
                    text: message.text,
                    threadId: message.threadId,
                    threadName: selectedThread?.name ?? "Direct Message",
                    organizationId: org.id,
                    scope: "direct",
                    createdBy: message.uid,
                    displayName: message.displayName,
                    createdAt: message.createdAt,
                    memberUids: message.memberUids,
                    recipientUid: message.ping!.recipientUid,
                    recipientDisplayName: message.ping!.recipientDisplayName,
                    messageId: message.id,
                    quickReplies: message.ping!.quickReplies,
                  },
                  reply.message,
                  "quick",
                  reply.label,
                )}
                className="flex w-[52px] flex-col items-center gap-1.5 text-center"
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-full border transition-transform hover:scale-[1.04] ${visual.surface}`}>
                  <Icon size={14} className={visual.tone} />
                </span>
                <span className="text-[10px] leading-tight text-white/72">{reply.label}</span>
              </button>
            )
          })()
        ))}
      </div>
    )
  }

  function isNestedInteractiveTarget(target: EventTarget | null, currentTarget: HTMLElement) {
    if (!(target instanceof HTMLElement)) return false
    if (target === currentTarget) return false
    return Boolean(target.closest("button,a,input,textarea,select,summary,[data-no-long-press='true']"))
  }

  function isOnline(uid: string) {
    if (uid === TOM_UID) return true
    const p = presence[uid]
    return p?.status === "online" && Date.now() - p.lastSeen < 60_000
  }

  const currentUserRecord = members.find(member => member.uid === user.uid) || null
  const allMembers = [TOM_USER, ...members.filter(member => member.uid !== TOM_UID)]
  const contactMembers = allMembers.filter(member => member.uid !== user.uid)
  const displayedContactMembers = dedupeDisplayedContacts(contactMembers)
  const pingById = useMemo(() => {
    const map = new Map<string, CommsPing>()
    for (const ping of allPings) map.set(ping.id, ping)
    return map
  }, [allPings])
  const activeThreadPing = useMemo(() => {
    if (!selectedThread) return null
    const threadPings = allPings
      .filter((ping) => ping.threadId === selectedThread.id)
      .sort((left, right) => right.createdAt - left.createdAt)
    const livePing = threadPings
      .filter((ping) => {
        const status = getEffectivePingStatus(ping, pingNow)
        return status !== "completed" && status !== "declined"
      })
      .sort((left, right) => {
        const leftSeen = left.seenAt ?? 0
        const rightSeen = right.seenAt ?? 0
        if (leftSeen !== rightSeen) return rightSeen - leftSeen
        return right.createdAt - left.createdAt
      })[0] ?? null
    if (livePing) return livePing
    const latestThreadPing = threadPings[0] ?? null
    if (latestThreadPing) {
      const latestStatus = getEffectivePingStatus(latestThreadPing, pingNow)
      if (
        (latestStatus === "completed" && latestThreadPing.completedAt && pingNow - latestThreadPing.completedAt < 5 * 60_000) ||
        (latestStatus === "declined" && latestThreadPing.declinedAt && pingNow - latestThreadPing.declinedAt < 5 * 60_000)
      ) {
        return latestThreadPing
      }
      return null
    }

    const fallbackMessage = [...messages]
      .reverse()
      .find((message) => message.threadId === selectedThread.id && message.ping)
    if (!fallbackMessage?.ping) return null

    return {
      id: fallbackMessage.ping.pingId,
      category: "action",
      text: fallbackMessage.text,
      pingRole: undefined,
      quickReplies: fallbackMessage.ping.quickReplies,
      threadId: fallbackMessage.threadId,
      threadName: selectedThread.name ?? fallbackMessage.ping.recipientDisplayName,
      organizationId: org.id,
      scope: "direct",
      createdBy: fallbackMessage.uid,
      displayName: fallbackMessage.displayName,
      createdAt: fallbackMessage.createdAt,
      messageId: fallbackMessage.id,
      memberUids: fallbackMessage.memberUids,
      recipientUid: fallbackMessage.ping.recipientUid,
      recipientDisplayName: fallbackMessage.ping.recipientDisplayName,
      status: "sent",
    } satisfies CommsPing
  }, [allPings, messages, org.id, pingNow, selectedThread])

  function renderPinnedActivePingBar() {
    if (!activeThreadPing) return null
    const status = getEffectivePingStatus(activeThreadPing, pingNow)
    const tone = getPingLiveTone(activeThreadPing, pingNow)
    const elapsed = getPingDisplayElapsed(activeThreadPing, pingNow)
    const fromSelf = activeThreadPing.createdBy === user.uid
    const canReopen = fromSelf && (status === "seen" || status === "escalated")
    const canStop = fromSelf && status !== "completed" && status !== "declined"
    const seenMembers = fromSelf
      ? (selectedThread?.memberUids ?? [])
          .filter((uid) => uid !== user.uid && uid !== TOM_UID)
          .map((uid) => ({
            uid,
            member: allMembers.find((member) => member.uid === uid) ?? null,
            readAt: selectedThread?.readBy?.[uid] ?? 0,
          }))
          .filter((entry) => entry.member && entry.readAt >= activeThreadPing.createdAt)
          .sort((left, right) => right.readAt - left.readAt)
      : []
    const visibleSeenMembers = seenMembers.slice(0, 3)
    const statusLabel =
      status === "sent" ? "Active ping"
      : status === "seen" ? "Seen"
      : status === "escalated" ? "Redirected"
      : getPingStatusLabel(activeThreadPing)
    const dockTone =
      status === "escalated"
        ? "border-rose-700/70 bg-gradient-to-r from-[#48111c] via-[#5e1826] to-[#411019]"
      : status === "seen"
        ? "border-amber-700/70 bg-gradient-to-r from-[#4b3210] via-[#65400f] to-[#472c09]"
      : "border-emerald-700/70 bg-gradient-to-r from-[#113224] via-[#14402a] to-[#102e1f]"
    const showAnimatedDots = status === "sent"

    return (
      <div className={`mb-2 -mx-4 border-y px-4 py-2 shadow-[0_-10px_30px_rgba(0,0,0,0.24)] ${dockTone}`}>
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/20">
            <Pin size={14} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2 text-[12px] font-semibold text-white/92">
                <span>{statusLabel}</span>
                {showAnimatedDots ? (
                  <span className="inline-flex items-center gap-0.5" aria-hidden="true">
                    <span className="h-1 w-1 rounded-full bg-white/90 animate-pulse" />
                    <span className="h-1 w-1 rounded-full bg-white/75 animate-pulse [animation-delay:180ms]" />
                    <span className="h-1 w-1 rounded-full bg-white/60 animate-pulse [animation-delay:360ms]" />
                  </span>
                ) : null}
                <span className="truncate text-white/68">{fromSelf ? "You sent this" : activeThreadPing.displayName}</span>
              </div>
                <p className="mt-0.5 text-[13px] font-semibold leading-tight text-white">{activeThreadPing.text}</p>
                <div className="mt-1 min-w-0 text-[11px] text-white/74">
                  {visibleSeenMembers.length > 0 ? (
                    <span className="inline-flex items-center gap-1.5 align-middle">
                      <span className="text-white/74">Seen by</span>
                      <span className="flex -space-x-1.5">
                        {visibleSeenMembers.map(({ member, uid }) =>
                          member ? (
                            <span key={uid} className="rounded-full ring-2 ring-black/25">
                              <Avatar name={member.displayName} size={16} uid={member.uid} />
                            </span>
                          ) : null,
                        )}
                      </span>
                    </span>
                  ) : (
                    <span className="text-white/68">{status === "sent" ? "Waiting to be seen" : statusLabel}</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <div className={`text-[15px] font-semibold tabular-nums leading-none ${tone.timerTone}`}>
                  {elapsed}
                </div>
                <div className="flex items-center gap-1.5">
                {canStop ? (
                  <button
                    type="button"
                    onClick={() => void stopPing(activeThreadPing)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/15 text-white transition-colors hover:bg-black/25"
                    aria-label="Stop ping"
                    title="Stop ping"
                  >
                    <Square size={13} fill="currentColor" />
                  </button>
                ) : null}
                {canReopen ? (
                  <button
                    type="button"
                    onClick={() => void reopenPing(activeThreadPing)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/15 text-white transition-colors hover:bg-black/25"
                    aria-label="Reopen ping"
                    title="Reopen ping"
                  >
                    <RotateCcw size={13} />
                  </button>
                ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  useEffect(() => {
    setPingShortcutSets(normalizePingShortcutSets(currentUserRecord?.pingShortcutSets))
  }, [currentUserRecord?.pingShortcutSets])

  useEffect(() => subscribePingShortcutSets(setPingShortcutSets), [])

  const hospitalLabel = profileHospital || currentUserRecord?.hospital?.trim() || org.name
  const departmentLabel = profileDepartment || currentUserRecord?.department?.trim() || ""
  const groupLabel = currentUserRecord?.groupLabel?.trim() || departmentLabel
  const clinicalRoleLabel = currentUserRecord?.clinicalRole?.trim() || "Clinical role not set"

  function collectWorkspaceGroups() {
    if (currentUserRecord?.specialties?.length) {
      return currentUserRecord.specialties
        .map(value => value.trim())
        .filter(Boolean)
    }

    if (departmentLabel.toLowerCase().includes("theatre")) {
      return DEFAULT_THEATRE_GROUPS
    }

    return []
  }

  const workspaceGroups = collectWorkspaceGroups()

  useEffect(() => {
    if (!workspaceGroups.length) return

    const existingChannelNames = new Set(
      threads
        .filter(thread => thread.type === "channel")
        .map(thread => (thread.name || "").trim().toLowerCase())
        .filter(Boolean),
    )

    const missingGroups = workspaceGroups.filter(group => {
      const normalized = group.trim().toLowerCase()
      if (!normalized) return false
      if (existingChannelNames.has(normalized)) return false
      if (seededGroupNamesRef.current[normalized]) return false
      return true
    })

    if (!missingGroups.length) return

    let cancelled = false

    async function ensureGroups() {
      const memberUids = Array.from(new Set(members.map(member => member.uid).concat(user.uid)))

      for (const group of missingGroups) {
        if (cancelled) return
        const normalized = group.trim().toLowerCase()
        if (!normalized) continue
        seededGroupNamesRef.current[normalized] = true
        await addDoc(collection(firestore, "comms_v5_threads"), {
          type: "channel",
          name: group,
          description: departmentLabel ? `${departmentLabel} group` : "Group",
          organizationId: org.id,
          memberUids,
          createdBy: user.uid,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastMessage: "",
          readBy: { [user.uid]: Date.now() },
        })
      }
    }

    void ensureGroups()

    return () => {
      cancelled = true
    }
  }, [workspaceGroups, threads, members, user.uid, org.id, departmentLabel])

  useEffect(() => {
    const existingTomThread = threads.find(thread =>
      thread.type === "direct" &&
      thread.memberUids.includes(user.uid) &&
      thread.memberUids.includes(TOM_UID) &&
      thread.memberUids.length === 2,
    )
    if (existingTomThread || tomThreadSeededRef.current) return

    tomThreadSeededRef.current = true

    async function ensureTomThread() {
      const now = Date.now()
      await addDoc(collection(firestore, "comms_v5_threads"), {
        type: "direct",
        organizationId: org.id,
        memberUids: [user.uid, TOM_UID],
        createdBy: user.uid,
        createdAt: now,
        updatedAt: now,
        lastMessage: "Ask me anything",
        readBy: { [user.uid]: now },
      })
    }

    void ensureTomThread()
  }, [threads, user.uid, org.id])

  // Load today's theatre sessions once for On Shift context filter
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    getDocs(query(collection(firestore, "theatre_sessions"), where("date", "==", today)))
      .then(snap => {
        setTodaySessions(snap.docs.map(d => ({
          theatre: d.data().theatre as string,
          specialty: (d.data().specialty as string) ?? "",
          staff: ((d.data().staff ?? []) as Array<{ name: string }>).map(m => m.name),
        })))
        setSessionsLoaded(true)
      })
      .catch(() => { setSessionsLoaded(true) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Subscribe to org_teams for Spaces sectioning + seeding ────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(firestore, "org_teams"), where("orgId", "==", org.id)),
      snap => setOrgTeams(snap.docs.map(d => ({
        id: d.id,
        name: d.data().name as string,
        type: d.data().type as "theatre" | "specialty",
      }))),
      () => {},
    )
    return unsub
  }, [org.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-seed persistent team threads (theatres + specialties) ────────────
  const teamThreadsSeededRef = useRef(false)
  useEffect(() => {
    if (teamThreadsSeededRef.current) return
    if (!sessionsLoaded) return
    teamThreadsSeededRef.current = true

    // Theatre names: org_teams "theatre" type first, fall back to today's sessions
    const orgTheatreNames = orgTeams.filter(t => t.type === "theatre").map(t => t.name)
    const sessionTheatreNames = todaySessions.map(s => s.theatre).filter(Boolean)
    const theatreNames = [...new Set([...orgTheatreNames, ...sessionTheatreNames])]

    // Specialty names: always from org_teams "specialty" type
    const specialtyNames = orgTeams.filter(t => t.type === "specialty").map(t => t.name)

    const allGroupNames = [...theatreNames, ...specialtyNames]
    if (!allGroupNames.length) return

    getDocs(query(
      collection(firestore, "comms_v5_threads"),
      where("organizationId", "==", org.id),
      where("type", "==", "channel"),
    )).then(async snap => {
      const existingNames = new Set(snap.docs.map(d => (d.data().name as string) ?? "").filter(Boolean))

      for (const name of allGroupNames) {
        if (existingNames.has(name)) continue

        const isTheatre = theatreNames.includes(name)
        let memberUids: string[]

        if (isTheatre) {
          const staffNames = todaySessions.find(s => s.theatre === name)?.staff ?? []
          memberUids = members.length
            ? staffNames
                .map(n => members.find(m => m.displayName?.toLowerCase() === n.toLowerCase())?.uid)
                .filter((uid): uid is string => Boolean(uid))
            : []
        } else {
          memberUids = members
            .filter(m => m.department === name || m.specialties?.includes(name))
            .map(m => m.uid)
        }

        const allMemberUids = [...new Set([user.uid, ...memberUids])]
        await addDoc(collection(firestore, "comms_v5_threads"), {
          type: "channel",
          subtype: "group",
          teamType: isTheatre ? "theatre" : "specialty",
          name,
          organizationId: org.id,
          memberUids: allMemberUids,
          createdBy: user.uid,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      }
    }).catch(() => {})
  }, [sessionsLoaded, orgTeams.length, org.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!org?.id) return
    const q = query(
      collection(firestore, "comms_v5_pings"),
      where("organizationId", "==", org.id),
    )
    const unsub = onSnapshot(
      q,
      snap => {
        const sorted = snap.docs
          .map(d => ({ id: d.id, ...d.data() }) as CommsPing)
          .filter((ping) => ping.createdBy === user.uid || ping.memberUids.includes(user.uid))
          .sort((a, b) => b.createdAt - a.createdAt)
        setAllPings(sorted)
        setPings(
          sorted
            .filter((ping) => ping.recipientUid === user.uid)
            .filter((ping) => getEffectivePingStatus(ping) === "sent"),
        )
      },
      err => {
        if (err.code !== "permission-denied") console.error("pings listener:", err)
      },
    )
    return unsub
  }, [org?.id, user.uid])

  useEffect(() => {
    if (!org?.id) return
    let seeded = false
    const q = query(
      collection(firestore, "comms_v5_pings"),
      where("organizationId", "==", org.id),
    )
    return onSnapshot(q, (snap) => {
      const incoming = (allPings.length
        ? allPings
        : snap.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as CommsPing))
        .filter((ping) => ping.recipientUid === user.uid)
        .filter((ping) => getEffectivePingStatus(ping) === "sent")

      if (!seeded) {
        notifiedPingIdsRef.current = new Set(incoming.map((ping) => ping.id))
        seeded = true
        return
      }

      for (const ping of incoming) {
        if (notifiedPingIdsRef.current.has(ping.id)) continue
        notifiedPingIdsRef.current.add(ping.id)
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          new Notification("You have been pinged", {
            body: `${ping.displayName}: ${ping.text}`,
            icon: "/logo.png",
          })
        }
      }
    }, () => {})
  }, [allPings, org?.id, user.uid])

  useEffect(() => {
    const escalated = allPings.filter((ping) => getEffectivePingStatus(ping, pingNow) === "escalated")
    for (const ping of escalated) {
      if (escalatedPingIdsRef.current.has(ping.id)) continue
      const thread = threads.find((entry) => entry.id === ping.threadId)
      if (!thread) continue
      escalatedPingIdsRef.current.add(ping.id)
      void sendTomPingUpdate(thread, `No response after ${formatPingElapsed(ping.createdAt, pingNow)}. Redirect recommended.`)
    }
  }, [allPings, pingNow, threads])

  const filteredThreads = threads.filter(t => {
    if (filterTab === "chats" && t.type !== "direct") return false
    if (filterTab === "pings") return false // placeholder until Pings is defined
    if (filterTab === "spaces" && !(t.type === "channel" && t.subtype === "group")) return false
    if (filterTab === "feeds" && !(t.type === "channel" && (t.subtype === "feed" || !t.subtype))) return false
    if (t.type === "channel" && ((t.name || "").trim().toLowerCase() === "general" || (t.description || "").trim().toLowerCase() === "general discussion")) {
      return false
    }
    return true
  })

  const visibleThreads: CommsThread[] = []
  {
    const seenChannelNames = new Set<string>()
    const seenDirectParticipants = new Set<string>()
    for (const thread of filteredThreads) {
      if (thread.type === "direct") {
        const otherUid = thread.memberUids.find(uid => uid !== user.uid) || thread.id
        if (seenDirectParticipants.has(otherUid)) {
          continue
        }
        seenDirectParticipants.add(otherUid)
        visibleThreads.push(thread)
        continue
      }

      const normalized = (thread.name || "").trim().toLowerCase()
      if (!normalized) {
        visibleThreads.push(thread)
        continue
      }

      if (seenChannelNames.has(normalized)) {
        continue
      }

      seenChannelNames.add(normalized)
      visibleThreads.push(thread)
    }
  }
  visibleThreads.sort((left, right) => {
    const leftIsTom = left.type === "direct" && left.memberUids.includes(TOM_UID)
    const rightIsTom = right.type === "direct" && right.memberUids.includes(TOM_UID)
    if (leftIsTom !== rightIsTom) return leftIsTom ? -1 : 1
    if (left.updatedAt !== right.updatedAt) return right.updatedAt - left.updatedAt
    if (unreadCounts[left.id] !== unreadCounts[right.id]) return (unreadCounts[right.id] || 0) - (unreadCounts[left.id] || 0)
    return 0
  })

  // ─────────────────────────────────────────────────────────────────────────

  const selectedOtherUid = selectedThread?.type === "direct" ? getOtherUid(selectedThread) : ""
  const selectedDirectContact = selectedThread?.type === "direct" ? getThreadAvatar(selectedThread) : null
  const liveSelectedThread = selectedThread ? threads.find((thread) => thread.id === selectedThread.id) ?? selectedThread : null
  const isTomConversation = !!selectedThread && selectedThread.type === "direct" && selectedThread.memberUids.includes(TOM_UID)
  const activeRemoteUid = activeCall
    ? activeCall.callerUid === user.uid
      ? activeCall.calleeUid
      : activeCall.callerUid
    : ""
  const isSelectedDirectCallTarget =
    !!selectedThread &&
    selectedThread.type === "direct" &&
    !!selectedOtherUid &&
    selectedOtherUid === activeRemoteUid
  const hideThreadHeaderCallButtons =
    callState === "active" &&
    callViewMode === "floating" &&
    isSelectedDirectCallTarget
  const canJoinExistingVideoCall = callState === "active" && callMediaMode === "audio" && remoteVideoActive
  const shouldRequestVideoApproval = callState === "active" && callMediaMode === "audio" && !remoteVideoActive
  const otherPresence = selectedOtherUid ? presence[selectedOtherUid] : null
  const otherIsTyping =
    !!selectedThread &&
    selectedThread.type === "direct" &&
    selectedOtherUid !== TOM_UID &&
    !!otherPresence?.typingThreadId &&
    otherPresence.typingThreadId === selectedThread.id &&
    typeof otherPresence.typingUpdatedAt === "number" &&
    Date.now() - otherPresence.typingUpdatedAt < 6000
  const showTomTyping = !!selectedThread && selectedThread.type === "direct" && selectedOtherUid === TOM_UID && tomTyping
  const showTomOperatorTyping = !!selectedThread && tomOperatorTypingThreadId === selectedThread.id
  const tomDefaultThread = visibleThreads.find(
    (thread) => thread.type === "direct" && thread.memberUids.includes(TOM_UID),
  ) ?? null

  // Navigate to DM thread by display name (?dmWith=Name Surname or fold signal)
  useEffect(() => {
    if (!threads.length || !members.length) return
    const name = deepLinkDmWithRef.current
    if (!name) return
    deepLinkDmWithRef.current = null
    const lower = name.toLowerCase()
    const target = members.find(m => m.displayName?.toLowerCase() === lower)
    if (!target) return
    const thread = threads.find(t =>
      t.type === "direct" && t.memberUids.includes(target.uid) && !t.memberUids.includes(TOM_UID)
    )
    if (thread) selectThread(thread)
  }, [threads, members]) // eslint-disable-line react-hooks/exhaustive-deps

  // Foldable split: react to requestFoldOpenDm() signals from other panes
  useEffect(() => {
    function handleFoldDm() {
      const name = consumeFoldOpenDm()
      if (!name || !threads.length || !members.length) return
      const lower = name.toLowerCase()
      const target = members.find(m => m.displayName?.toLowerCase() === lower)
      if (!target) return
      const thread = threads.find(t =>
        t.type === "direct" && t.memberUids.includes(target.uid) && !t.memberUids.includes(TOM_UID)
      )
      if (thread) selectThread(thread)
    }
    return subscribeFoldOpenDm(handleFoldDm)
  }, [threads, members]) // eslint-disable-line react-hooks/exhaustive-deps

  // Navigate to deep-linked thread once threads have loaded from Firestore
  useEffect(() => {
    if (!threads.length) return
    const threadId = deepLinkThreadIdRef.current
    if (threadId) {
      deepLinkThreadIdRef.current = null
      const target = threads.find(t => t.id === threadId)
      if (target) { selectThread(target); return }
    }
    const senderUid = deepLinkCallSenderRef.current
    if (senderUid) {
      deepLinkCallSenderRef.current = null
      const target = threads.find(t =>
        t.type === "direct" && t.memberUids.includes(senderUid) && !t.memberUids.includes(TOM_UID)
      )
      if (target) selectThread(target)
    }
  }, [threads]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isFoldableSplitView || selectedThread) return
    // Don't override a pending notification deep-link
    if (deepLinkThreadIdRef.current || deepLinkCallSenderRef.current) return
    // Prefer the last active thread; fall back to TOM only if none stored or not found
    const last = getFoldCommsThread()
    const preferred = (last && visibleThreads.find(t => t.id === last.id)) ?? tomDefaultThread
    if (!preferred) return
    setSelectedThread(preferred)
    setUnreadCounts(prev => ({ ...prev, [preferred.id]: 0 }))
    void markThreadRead(preferred.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFoldableSplitView, selectedThread, tomDefaultThread])

  function renderMobileThreadPane(splitView: boolean, minimalHeader = false) {
    if (!selectedThread) return null

    return (
      <div
        className={splitView ? "flex h-full min-h-0 flex-col bg-black" : "absolute inset-x-0 top-0 z-10 flex flex-col bg-black"}
        style={splitView ? undefined : { bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)" }}
      >
        {minimalHeader ? (
          <div
            className="bg-black px-5 pb-3 flex items-center gap-3 shrink-0"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}
          >
            <button onClick={() => {
              setSelectedThread(null)
              setFoldCommsThread(null)
              onDirectThreadActiveChange?.(false)
            }} className="mr-1">
              <ArrowLeft size={22} className="text-white" />
            </button>
            {selectedThread.type === "channel" ? (
              <Avatar name={getThreadName(selectedThread)} size={40} uid={selectedThread.id} />
            ) : (() => {
              const av = getThreadAvatar(selectedThread)
              return av ? <Avatar name={av.displayName} size={40} uid={av.uid} /> : <Avatar name="?" size={40} />
            })()}
            <button
              type="button"
              onClick={() => {
                if (selectedThread.type === "direct" && selectedDirectContact) {
                  setShowDirectContactSheet(true)
                } else if (selectedThread.subtype === "group") {
                  setShowSpaceInfo(true)
                }
              }}
              className={`min-w-0 flex-1 text-left ${selectedThread.type === "direct" || selectedThread.subtype === "group" ? "cursor-pointer" : "cursor-default"}`}
            >
              <p className="text-white text-base font-semibold truncate">{getThreadName(selectedThread)}</p>
              {selectedThread.type === "direct" && (
                <p className="text-sm text-white/60">
                  {showTomTyping || otherIsTyping ? "typing..." : isOnline(getOtherUid(selectedThread)) ? "Online" : "Offline"}
                </p>
              )}
              {selectedThread.subtype === "group" && (
                <p className="text-sm text-white/60">{selectedThread.memberUids.length} member{selectedThread.memberUids.length !== 1 ? "s" : ""} · tap for info</p>
              )}
              {selectedThread.type === "channel" && selectedThread.subtype !== "group" && selectedThread.description && (
                <p className="truncate text-sm text-white/60">{selectedThread.description}</p>
              )}
            </button>
            <div className="flex items-center gap-2">
              {selectedThread.type === "direct" && !hideThreadHeaderCallButtons && (
                <>
                  <button
                    onClick={
                      callState === "active" && callMediaMode === "audio" ? () => void endCall()
                      : callState === "idle" ? () => void initiateCall(getOtherUid(selectedThread), selectedThread.id, "audio")
                      : undefined
                    }
                    disabled={callState !== "idle" && !(callState === "active" && callMediaMode === "audio")}
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                      callState === "active" && callMediaMode === "audio"
                        ? "bg-[#ef4444]"
                      : callState !== "idle"
                        ? "cursor-not-allowed bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] opacity-40"
                        : "bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] shadow-[0_12px_26px_rgba(0,150,199,0.28)] hover:bg-[#0085B2]"
                    }`}
                  >
                    {callState === "active" && callMediaMode === "audio"
                      ? <PhoneOff size={17} className="text-white" />
                      : <Phone size={17} className="text-white" />}
                  </button>
                  {!isTomConversation ? (
                    <button
                      onClick={
                        callState === "active" && callMediaMode === "video" ? switchToAudio
                        : canJoinExistingVideoCall ? switchToVideo
                        : shouldRequestVideoApproval ? () => void requestVideo()
                        : callState === "idle" ? () => void initiateCall(getOtherUid(selectedThread), selectedThread.id, "video")
                        : undefined
                      }
                      disabled={callState === "incoming" || callState === "outgoing"}
                      className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                        callState === "active" && callMediaMode === "video"
                          ? "bg-[#ef4444]"
                        : (callState === "incoming" || callState === "outgoing")
                          ? "cursor-not-allowed bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] opacity-40"
                          : "bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] shadow-[0_12px_26px_rgba(0,150,199,0.28)] hover:bg-[#0085B2]"
                      }`}
                    >
                      {callState === "active" && callMediaMode === "video"
                        ? <PhoneOff size={17} className="text-white" />
                        : <Video size={17} className="text-white" />}
                    </button>
                  ) : null}
                </>
              )}
              {(!splitView || !minimalHeader) && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowGlobalSearch(true)}
                    className="text-white hover:text-white"
                    aria-label="Search"
                  >
                    <Search size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowProfile(true)}
                    className="text-white hover:text-white"
                    aria-label="More options"
                  >
                    <MoreVertical size={22} />
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div
            className="bg-black px-5 pb-3 flex items-center gap-3 shrink-0"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}
          >
            {!splitView ? (
              <button onClick={() => {
                setSelectedThread(null)
                setFoldCommsThread(null)
                onDirectThreadActiveChange?.(false)
              }} className="mr-1">
                <ArrowLeft size={22} className="text-white" />
              </button>
            ) : null}
            {selectedThread.type === "channel" ? (
              <Avatar name={getThreadName(selectedThread)} size={40} uid={selectedThread.id} />
            ) : (() => {
              const av = getThreadAvatar(selectedThread)
              return av ? <Avatar name={av.displayName} size={40} uid={av.uid} /> : <Avatar name="?" size={40} />
            })()}
            <button
              type="button"
              onClick={() => {
                if (selectedThread.type === "direct" && selectedDirectContact) {
                  setShowDirectContactSheet(true)
                } else if (selectedThread.subtype === "group") {
                  setShowSpaceInfo(true)
                }
              }}
              className={`min-w-0 flex-1 text-left ${selectedThread.type === "direct" || selectedThread.subtype === "group" ? "cursor-pointer" : "cursor-default"}`}
            >
              <p className="text-white text-base font-semibold truncate">{getThreadName(selectedThread)}</p>
              {selectedThread.type === "direct" && (
                <p className="text-sm text-white/60">
                  {showTomTyping || otherIsTyping ? "typing..." : isOnline(getOtherUid(selectedThread)) ? "Online" : "Offline"}
                </p>
              )}
              {selectedThread.subtype === "group" && (
                <p className="text-sm text-white/60">{selectedThread.memberUids.length} member{selectedThread.memberUids.length !== 1 ? "s" : ""} · tap for info</p>
              )}
              {selectedThread.type === "channel" && selectedThread.subtype !== "group" && selectedThread.description && (
                <p className="truncate text-sm text-white/60">{selectedThread.description}</p>
              )}
            </button>
              <div className="flex items-center gap-2">
                {selectedThread.type === "direct" && !hideThreadHeaderCallButtons && (
                  <>
                    <button
                    onClick={
                      callState === "active" && callMediaMode === "audio" ? () => void endCall()
                      : callState === "idle" ? () => void initiateCall(getOtherUid(selectedThread), selectedThread.id, "audio")
                      : undefined
                    }
                    disabled={callState !== "idle" && !(callState === "active" && callMediaMode === "audio")}
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                      callState === "active" && callMediaMode === "audio"
                        ? "bg-[#ef4444]"
                      : callState !== "idle"
                        ? "cursor-not-allowed bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] opacity-40"
                        : "bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] shadow-[0_12px_26px_rgba(0,150,199,0.28)] hover:bg-[#0085B2]"
                    }`}
                  >
                    {callState === "active" && callMediaMode === "audio"
                      ? <PhoneOff size={17} className="text-white" />
                      : <Phone size={17} className="text-white" />}
                  </button>
                    {!isTomConversation ? (
                      <button
                        onClick={
                          callState === "active" && callMediaMode === "video" ? switchToAudio
                          : canJoinExistingVideoCall ? switchToVideo
                          : shouldRequestVideoApproval ? () => void requestVideo()
                          : callState === "idle" ? () => void initiateCall(getOtherUid(selectedThread), selectedThread.id, "video")
                          : undefined
                        }
                        disabled={callState === "incoming" || callState === "outgoing"}
                        className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                          callState === "active" && callMediaMode === "video"
                            ? "bg-[#ef4444]"
                          : (callState === "incoming" || callState === "outgoing")
                            ? "cursor-not-allowed bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] opacity-40"
                            : "bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] shadow-[0_12px_26px_rgba(0,150,199,0.28)] hover:bg-[#0085B2]"
                        }`}
                      >
                        {callState === "active" && callMediaMode === "video"
                          ? <PhoneOff size={17} className="text-white" />
                          : <Video size={17} className="text-white" />}
                      </button>
                    ) : null}
                  </>
                )}
              {(!splitView || !minimalHeader) && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowGlobalSearch(true)}
                    className="text-white hover:text-white"
                    aria-label="Search"
                  >
                    <Search size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowProfile(true)}
                    className="text-white hover:text-white"
                    aria-label="More options"
                  >
                    <MoreVertical size={22} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="relative flex-1 min-h-0">
          <div
            className="absolute inset-0 overflow-y-auto overscroll-contain bg-black px-4 py-4 space-y-1 [touch-action:pan-y]"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {messages.map((msg, idx) => {
              const isOwn = msg.uid === user.uid
              const isTom = msg.uid === TOM_UID
              const isSystem = msg.type === "system"
              const prevMsg = messages[idx - 1]
              const showSenderName = selectedThread.type === "channel" && !isOwn && (!prevMsg || prevMsg.uid !== msg.uid)
              const showIncomingAvatar = !isOwn && (showSenderName || isTom)
              const messageText = repairMojibake(msg.text)
              const pingState = msg.ping ? (pingById.get(msg.ping.pingId) ?? null) : null
              const pingTone = getPingLiveTone(pingState, pingNow)
              const pingElapsed = pingState ? getPingDisplayElapsed(pingState, pingNow) : null
              const pingHeadline = msg.ping
                ? (isOwn ? `You pinged ${msg.ping.recipientDisplayName}` : `${msg.displayName} pinged you`)
                : null
              const emojiOnly = !msg.attachments?.length && !msg.deleted && isEmojiOnly(messageText)
              const hasImageAttachment = Boolean(msg.attachments?.some((att) => att.type === "image"))
              const hasNonImageAttachment = Boolean(msg.attachments?.some((att) => att.type !== "image"))
              const imageOnlyMessage =
                hasImageAttachment &&
                !hasNonImageAttachment &&
                !messageText.trim() &&
                !msg.replyTo
              const seenMembers = getSeenReceiptMembers(liveSelectedThread, msg)
              const visibleSeenMembers = seenMembers.slice(0, 3)
              const hiddenSeenCount = Math.max(0, seenMembers.length - visibleSeenMembers.length)

              if (msg.type === "call" || (isSystem && messageText.startsWith("📞"))) {
                const answered = msg.callAnswered ?? messageText.includes("Voice call")
                const isOutgoing = msg.uid === user.uid
                const missed = !answered
                const callTime = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                const durationStr = msg.callDuration ? formatCallDuration(msg.callDuration) : null
                const IconComp = missed ? PhoneMissed : isOutgoing ? PhoneOutgoing : PhoneIncoming
                const iconColor = missed ? "text-red-400" : isOutgoing ? "text-[#0096C7]" : "text-emerald-400"
                const label = missed ? "Missed call" : isOutgoing ? "Outgoing call" : "Incoming call"
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <div className={`flex items-center gap-2 rounded-full border border-[#2d2d2d] bg-[#1a1a1a] px-3 py-1.5 ${iconColor}`}>
                      <IconComp size={13} strokeWidth={2} className="shrink-0" />
                      <span className="text-[12px] font-medium text-[#e0e0e0]">{label}</span>
                      <span className="text-[12px] text-[#555]">·</span>
                      <span className="text-[12px] text-[#666]">{callTime}{durationStr ? ` · ${durationStr}` : ""}</span>
                    </div>
                  </div>
                )
              }
              if (isSystem) return (
                <div key={msg.id} className="flex justify-center my-3">
                  <span className="bg-[#1c1c1c] text-white text-sm px-4 py-1.5 rounded-full">{messageText}</span>
                </div>
              )
              if (msg.deleted) return (
                <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <span className="text-sm text-white italic px-3 py-1">This message was deleted</span>
                </div>
              )

              return (
                <div key={msg.id}
                  className={`flex ${isOwn ? "flex-row-reverse" : "flex-row"} items-end ${showSenderName ? "gap-2" : "gap-0.5"} group`}
                >
                  {!isOwn ? (
                    <div className={`shrink-0 ${showIncomingAvatar ? "w-8" : "w-1"}`}>
                      {showIncomingAvatar && <Avatar name={msg.displayName} size={32} uid={msg.uid} />}
                    </div>
                  ) : null}

                  <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[84%]`}>
                    {!isOwn && showSenderName && (
                      <span className="text-sm text-[#0096C7] mb-1 ml-1">{msg.displayName}</span>
                    )}

                    {msg.replyTo && (
                      <div className={`text-sm text-white bg-[#1c1c1c] rounded-t-xl px-3 py-2 border-l-2 border-[#29b6d8] mb-0.5 max-w-full ${isOwn ? "rounded-bl-xl" : "rounded-br-xl"}`}>
                        <span className="text-[#29b6d8]">{msg.replyTo.displayName}</span>: {repairMojibake(msg.replyTo.text).slice(0, 60)}{msg.replyTo.text.length > 60 ? "..." : ""}
                      </div>
                    )}

                    {editingMessage?.id === msg.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          autoFocus
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") { setEditingMessage(null); setEditText("") } }}
                          className="flex-1 bg-[#111111] border border-[#29b6d8] rounded-xl px-3 py-2 text-[16px] text-[#e0e0e0] outline-none"
                        />
                        <button onClick={saveEdit}><Check size={18} className="text-[#29b6d8]" /></button>
                        <button onClick={() => { setEditingMessage(null); setEditText("") }}><X size={18} className="text-gray-400" /></button>
                      </div>
                    ) : (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={event => {
                          if (!suppressMessageTapRef.current) return
                          suppressMessageTapRef.current = false
                          event.preventDefault()
                        }}
                        onKeyDown={event => {
                          if (event.key !== "Enter" && event.key !== " ") return
                          event.preventDefault()
                          openMessageActions(event.currentTarget, msg, isOwn, true)
                        }}
                        onContextMenu={event => {
                          event.preventDefault()
                          openMessageActions(event.currentTarget, msg, isOwn, true)
                        }}
                        onPointerDown={event => {
                          if (event.pointerType === "mouse") return
                          if (isNestedInteractiveTarget(event.target, event.currentTarget)) return
                          suppressMessageTapRef.current = false
                          clearMessageLongPress()
                          const target = event.currentTarget
                          messageLongPressTimerRef.current = setTimeout(() => {
                            suppressMessageTapRef.current = true
                            openMessageActions(target, msg, isOwn, true)
                          }, 420)
                        }}
                        onPointerUp={() => clearMessageLongPress()}
                        onPointerCancel={() => clearMessageLongPress()}
                        onPointerLeave={() => clearMessageLongPress()}
                        className={`relative text-left text-[14px] leading-snug ${
                          emojiOnly
                            ? ""
                            : imageOnlyMessage
                              ? isOwn
                                ? "overflow-hidden rounded-[22px] bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] p-[3px] text-white shadow-[0_16px_34px_rgba(0,150,199,0.22)]"
                                : isTom
                                  ? "overflow-hidden rounded-[22px] bg-[#138496] p-[3px] text-white shadow-[0_16px_34px_rgba(19,132,150,0.3)]"
                                  : "overflow-hidden rounded-[22px] bg-[#0b4b63] p-[3px] text-white shadow-[0_16px_34px_rgba(0,0,0,0.2)]"
                              : isOwn
                                  ? "px-3 py-1.5 rounded-2xl bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] text-white rounded-br-sm"
                                : isTom
                                  ? "px-3 py-1.5 rounded-2xl bg-[#138496] text-white rounded-bl-sm"
                                  : "px-3 py-1.5 rounded-2xl bg-[#003d54] text-white rounded-bl-sm"
                        }`}>
                        {msg.attachments?.map((att, ai) => renderMessageAttachment(att, ai, isOwn, msg))}
                        {pingHeadline ? (
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <div className="text-[11px] font-medium text-white/78">
                              {pingHeadline}
                            </div>
                            {pingElapsed ? (
                              <div className={`shrink-0 text-[11px] font-medium tabular-nums ${pingTone.timerTone}`}>
                                {pingElapsed}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {msg.ping && pingTone.label ? (
                          <div className={`mb-1 text-[11px] ${isOwn ? "text-white/74" : "text-white/58"}`}>{pingTone.label}</div>
                        ) : null}
                        {emojiOnly ? (() => {
                          const segs = segmentEmoji(messageText)
                          const sz = segs.length === 1 ? 64 : segs.length <= 3 ? 52 : 44
                          return (
                            <div className="flex flex-wrap gap-1 py-1">
                              {segs.map((em, i) => {
                                const url = emojiToNotoUrl(em)
                                return url ? (
                                  <img
                                    key={i}
                                    src={url}
                                    alt={em}
                                    width={sz}
                                    height={sz}
                                    className="object-contain"
                                    onError={(e) => {
                                      const t = e.currentTarget
                                      const span = document.createElement("span")
                                      span.textContent = em
                                      span.style.fontSize = `${sz}px`
                                      span.style.lineHeight = "1"
                                      t.replaceWith(span)
                                    }}
                                  />
                                ) : (
                                  <span key={i} style={{ fontSize: sz, lineHeight: 1 }}>{em}</span>
                                )
                              })}
                            </div>
                          )
                        })() : messageText}
                        {msg.edited && !emojiOnly && <span className={`ml-1 text-xs ${isOwn ? "text-white" : "text-white"}`}>(edited)</span>}
                      </div>
                    )}

                    {msg.reactions && Object.entries(msg.reactions).filter(([, uids]) => uids.length > 0).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {Object.entries(msg.reactions).map(([emoji, uids]) =>
                          uids.length > 0 && (
                            <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm leading-none ${
                                uids.includes(user.uid) ? "border-[#0096C7]/60 bg-[#003d54] text-white" : "border-[#2d2d2d] bg-[#1c1c1c] text-[#e0e0e0]"
                              }`}>
                              {emoji} {uids.length}
                            </button>
                          )
                        )}
                      </div>
                    )}

                    {renderMessageMeta(msg, isOwn)}
                  </div>

                </div>
              )
            })}
            {(otherIsTyping || showTomTyping || showTomOperatorTyping) && (
              <div className="flex items-end gap-0.5">
                <div className="w-1 shrink-0" />
                <div className="flex max-w-[84%] flex-col items-start">
                  <div className="rounded-2xl rounded-bl-sm bg-[#138496] px-3 py-1.5 text-left text-[14px] leading-snug text-white">
                    <TypingDots tone={showTomTyping || showTomOperatorTyping ? "tom" : "default"} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {(showEmojiPicker === "drawer" || showEmojiPicker === "input") && (
            <div className="absolute right-0 inset-y-0 z-[25] w-[162px] bg-black border-l border-[#2d2d2d] overflow-hidden flex flex-col"
              style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
              <EmojiPicker
                variant="drawer"
                onSelect={e => {
                  if (showEmojiPicker === "input") {
                    setInputText(prev => prev + e)
                    setShowEmojiPicker(null)
                    return
                  }
                  if (!actionMessage) return
                  void toggleReaction(actionMessage.id, e)
                  setShowEmojiPicker(null)
                  setActionMessage(null)
                  setActionBoxPosition(null)
                }}
                onClose={() => setShowEmojiPicker(null)}
              />
            </div>
          )}
          {showPingPicker && (
            <div className="absolute right-0 inset-y-0 z-[25] w-[162px] bg-black border-l border-[#2d2d2d] overflow-hidden flex flex-col"
              style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
              <div className="border-b border-[#2d2d2d] px-3 py-2 flex items-center justify-between shrink-0">
                <span className="text-[11px] font-medium text-white uppercase tracking-wide">Ping type</span>
                <button onClick={() => setShowPingPicker(null)}><X size={12} className="text-white" /></button>
              </div>
              <div className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-1">
                {PING_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      if (showPingPicker === "composer") {
                        setPendingPingCategory(cat.id)
                        setShowPingPicker(null)
                      } else if (showPingPicker === "longpress" && actionMessage) {
                        const msg = actionMessage
                        setShowPingPicker(null)
                        setActionMessage(null)
                        void createPing(cat.id, repairMojibake(msg.text), selectedThread!, msg.id)
                      }
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-[13px] text-[#e0e0e0] bg-[#1c1c1c] hover:bg-[#242424] active:bg-[#2e2e2e] transition-colors"
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {replyTo && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0d1a22] border-t border-[#2d2d2d] shrink-0">
            <div className="flex-1 min-w-0">
              <span className="text-sm text-[#29b6d8]">{replyTo.displayName}</span>
              <p className="text-sm text-white truncate">{repairMojibake(replyTo.text)}</p>
            </div>
            <button onClick={() => setReplyTo(null)}><X size={16} className="text-white" /></button>
          </div>
        )}

        <div
          className="bg-black shrink-0 relative px-4 pt-2"
          style={{
            paddingBottom: splitView
              ? "calc(env(safe-area-inset-bottom, 0px) + 16px)"
              : minimalHeader
                ? "calc(env(safe-area-inset-bottom, 0px) + 6px)"
              : "calc(env(safe-area-inset-bottom, 0px) + 6px)",
          }}
        >
          {renderPinnedActivePingBar()}
          {composerError ? (
            <div className="mb-2 rounded-xl border border-[#5a3d08] bg-[#2c1f05] px-3 py-2 text-[12px] text-[#f7c873]">
              {composerError}
            </div>
          ) : null}
          <div className="flex items-center gap-2 rounded-2xl border border-[#2d2d2d] bg-[#111111] px-3 py-1.5 pr-2">
            <button onClick={() => fileInputRef.current?.click()} className="text-white shrink-0">
              <Paperclip size={17} />
            </button>
            <button
              onClick={() => setShowPingPicker(showPingPicker === "composer" ? null : "composer")}
              className="shrink-0"
              aria-label="Ping"
            >
              <Zap size={17} strokeWidth={2} className={pendingPingCategory ? "text-[#0e7490]" : "text-[#00b8d4]"} fill={pendingPingCategory ? "#0e7490" : "none"} />
            </button>
            <input type="file" ref={fileInputRef} className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = "" }} />
            {pendingPingCategory && !isRecordingVoice && !recordedVoiceBlob && (
              <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full bg-[#0e7490]/20 border border-[#0e7490]/50">
                <span className="text-[11px] text-[#5bc8da] font-medium">{PING_CATEGORIES.find(c => c.id === pendingPingCategory)?.label}</span>
                <button onClick={() => setPendingPingCategory(null)} className="text-[#5bc8da]"><X size={9} /></button>
              </div>
            )}
            {isRecordingVoice || recordedVoiceBlob ? (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={cancelVoiceRecording}
                  className="shrink-0 px-1 text-[13px] text-white transition-colors hover:text-white"
                >
                  cancel
                </button>
                <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[18px] border border-[#26343a] bg-[#0f1315] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  {isRecordingVoice ? (
                    <>
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[#ef4444] animate-pulse" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] tracking-[0.08em] text-[#6fa8b6]">recording</p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="h-1.5 w-2.5 rounded-full bg-[#1e6376]/45" />
                            <span className="h-2 w-3 rounded-full bg-[#2586a1]/65" />
                            <span className="h-3 w-3.5 rounded-full bg-[#29b6d8]" />
                            <span className="h-2 w-3 rounded-full bg-[#2586a1]/65" />
                            <span className="h-1.5 w-2.5 rounded-full bg-[#1e6376]/45" />
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 font-mono text-[12px] text-[#d2d8db]">{formatRecordingDuration(recordingElapsed)}</span>
                      <button
                        type="button"
                        onClick={stopVoiceRecording}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#304047] bg-[#151b1d] text-white transition-colors hover:border-[#3d5964] hover:bg-[#1b2326]"
                        aria-label="Stop recording"
                      >
                        <Square size={11} fill="currentColor" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => void toggleVoicePreviewPlayback()}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#304047] bg-[#151b1d] text-white transition-colors hover:border-[#3d5964] hover:bg-[#1b2326]"
                        aria-label={isVoicePreviewPlaying ? "Pause voice note preview" : "Play voice note preview"}
                      >
                        {isVoicePreviewPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-[#f2f4f5]">voice note ready</p>
                        <p className="mt-0.5 text-[12px] text-[#6fa8b6]">{formatRecordingDuration(recordingElapsed)}</p>
                      </div>
                      <audio ref={voicePreviewRef} src={recordedVoiceUrl ?? undefined} preload="metadata" className="hidden" />
                    </>
                  )}
                </div>
              </div>
            ) : (
              <input
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Message…"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-[#e0e0e0] placeholder-[#555555] outline-none"
              />
            )}
            {!isRecordingVoice && !recordedVoiceBlob ? (
              <button onClick={() => setShowEmojiPicker(showEmojiPicker === "input" ? null : "input")}
                className="text-white shrink-0">
                <Smile size={17} />
              </button>
            ) : null}
              {recordedVoiceBlob ? (
                <button
                  type="button"
                  onClick={() => void sendVoiceMessage()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] shadow-[0_12px_26px_rgba(0,150,199,0.28)]"
                  aria-label="Send voice message"
                >
                  <Send size={13} className="text-white" />
                </button>
              ) : inputText.trim() || isTomConversation ? (
                <button onClick={() => sendMessage()} disabled={!inputText.trim()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] shadow-[0_12px_26px_rgba(0,150,199,0.28)] disabled:opacity-40">
                  <Send size={13} className="text-white" />
                </button>
              ) : (
              <button
                type="button"
                onClick={() => void startVoiceRecording()}
                disabled={isRecordingVoice}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] shadow-[0_12px_26px_rgba(0,150,199,0.28)] disabled:opacity-40"
                aria-label="Record voice message"
              >
                <Mic size={13} className="text-white" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  useEffect(() => {
    const threadMap = new Map(threads.map(thread => [thread.id, thread]))
    const nextUnread: Record<string, number> = {}
    for (const message of inboxMessages) {
      if (message.uid === user.uid) continue
      const thread = threadMap.get(message.threadId)
      if (!thread) continue
      const lastReadAt = thread.readBy?.[user.uid] ?? 0
      if (message.createdAt > lastReadAt) {
        nextUnread[message.threadId] = (nextUnread[message.threadId] || 0) + 1
      }
    }
    setUnreadCounts(nextUnread)
  }, [inboxMessages, threads, user.uid])

  useEffect(() => {
    if (!selectedThread || !messages.length) return
    const latestIncoming = [...messages].reverse().find(message => message.uid !== user.uid)
    if (!latestIncoming) return
    const lastReadAt = selectedThread.readBy?.[user.uid] ?? 0
    if (latestIncoming.createdAt > lastReadAt) {
      void markThreadRead(selectedThread.id)
    }
  }, [messages, selectedThread?.id])

  useEffect(() => {
    let cancelled = false
    const shouldBroadcastTyping = !!selectedThread && inputText.trim().length > 0

    const timeout = setTimeout(async () => {
      try {
        await setDoc(doc(firestore, "comms_v5_presence", user.uid), {
          uid: user.uid,
          status: "online",
          lastSeen: Date.now(),
          organizationId: org.id,
          typingThreadId: shouldBroadcastTyping ? selectedThread?.id ?? null : null,
          typingUpdatedAt: shouldBroadcastTyping ? Date.now() : null,
        }, { merge: true })
      } catch {
        if (!cancelled) {
          // typing is non-critical
        }
      }
    }, shouldBroadcastTyping ? 160 : 0)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [inputText, selectedThread?.id, org.id, user.uid])

  // â"€â"€ Send message â"€â"€
  function getThreadPingScope(thread: CommsThread): "direct" | "space" | "org" {
    if (thread.type === "direct") return "direct"
    if (thread.subtype === "group") return "space"
    return "org"
  }

  async function createPing(category: PingCategory, text: string, thread: CommsThread, messageId?: string) {
    try {
      if (thread.type === "direct" && thread.memberUids.includes(TOM_UID)) {
        setComposerError("Pings can’t be created in TOM chat. Open the colleague’s direct thread or send from Workforce.")
        return
      }
      if (thread.type === "direct") {
        const recipientUid = thread.memberUids.find((uid) => uid !== user.uid && uid !== TOM_UID)
        const recipient = recipientUid ? allMembers.find((member) => member.uid === recipientUid) ?? null : null
        if (recipientUid && recipient) {
          await createDirectPing(firestore, {
            organizationId: org.id,
            senderUid: user.uid,
            senderDisplayName: user.displayName || "User",
            recipientUid,
            recipientDisplayName: recipient.displayName || "Recipient",
            pingRole: getPingRoleFromClinicalRole(recipient.clinicalRole || recipient.groupLabel || "Practitioner"),
            text,
            category,
            existingMessageId: messageId,
          })
          return
        }
      }
      await addDoc(collection(firestore, "comms_v5_pings"), {
        category,
        text: text.trim(),
        threadId: thread.id,
        threadName: thread.name ?? (thread.type === "direct" ? "Direct Message" : "Channel"),
        organizationId: org.id,
        scope: getThreadPingScope(thread),
        createdBy: user.uid,
        displayName: user.displayName || "User",
        createdAt: Date.now(),
        memberUids: thread.memberUids ?? [],
        ...(messageId ? { messageId } : {}),
      })
    } catch (error) {
      if (error instanceof Error && error.message === "ACTIVE_PING_EXISTS") {
        setComposerError("Only one active ping is allowed per recipient at a time.")
        return
      }
      throw error
    }
  }

  async function sendMessage(text?: string, attachments?: { name: string; url: string; type: "image" | "file" | "audio"; size: number }[]) {
    const content = text ?? inputText.trim()
    if (!content && !attachments?.length) return
    if (!selectedThread) return
    setComposerError("")
    const msg: Record<string, unknown> = {
      threadId: selectedThread.id,
      uid: user.uid,
      displayName: user.displayName || "User",
      text: content,
      type: attachments?.length ? "file" : "text",
      organizationId: org.id,
      memberUids: selectedThread.memberUids,
      createdAt: Date.now(),
    }
    if (replyTo) msg.replyTo = { messageId: replyTo.id, uid: replyTo.uid, displayName: replyTo.displayName, text: replyTo.text }
    if (attachments?.length) msg.attachments = attachments
    await addDoc(collection(firestore, "comms_v5_messages"), msg)
    const previewText = content || getAttachmentPreviewLabel(attachments)
    await updateDoc(doc(firestore, "comms_v5_threads", selectedThread.id), {
      updatedAt: Date.now(),
      lastMessage: previewText,
    })
    if (selectedThread.type === "direct" && selectedThread.memberUids.includes(TOM_UID)) {
      setTomTyping(true)
      if (tomTypingTimeoutRef.current) clearTimeout(tomTypingTimeoutRef.current)
      const watchSubject = content ? extractTomWatchSubject(content) : null
      const completionSubject = content ? extractTomCompletionSubject(content) : null
      const matchingTask = completionSubject
        ? tomTasks.find(task =>
            task.threadId === selectedThread.id &&
            task.status === "watching" &&
            normalizeTomText(task.subject) === completionSubject,
          )
        : null
      tomTypingTimeoutRef.current = setTimeout(async () => {
        setTomTyping(false)
        tomTypingTimeoutRef.current = null
        if (watchSubject) {
          const task: TomWatchTask = {
            id: `tom-task-${Date.now()}`,
            threadId: selectedThread.id,
            subject: watchSubject,
            status: "watching",
            createdAt: Date.now(),
          }
          setTomTasks(current => [...current, task])
          await sendTomMessage(
            selectedThread,
            `Understood. Iâ€™ll text you when ${watchSubject} has finished.`,
          )
          return
        }
        if (matchingTask) {
          setTomTasks(current =>
            current.map(task =>
              task.id === matchingTask.id
                ? { ...task, status: "completed", completedAt: Date.now() }
                : task,
            ),
          )
          await sendTomMessage(
            selectedThread,
            `Hi, just to update you, ${matchingTask.subject} has completed.`,
          )
          return
        }
      }, 1800)
    }
    if (selectedThread.type === "channel" && selectedThread.subtype === "group" && /@tom/i.test(content)) {
      const thread = selectedThread
      setTimeout(() => {
        sendTomMessage(thread, "Hi! I'm TOM, PrepSight's AI assistant. I'm here to help with clinical coordination, scheduling, handovers and more. Full TOM integration is coming soon — watch this space.").catch(console.error)
      }, 1500)
    }
    if (pendingPingCategory && content) {
      const thread = selectedThread
      const category = pendingPingCategory
      setPendingPingCategory(null)
      void createPing(category, content, thread)
    }
    setInputText(""); setReplyTo(null)
  }

  async function saveEdit() {
    if (!editingMessage || !editText.trim()) return
    await updateDoc(doc(firestore, "comms_v5_messages", editingMessage.id), {
      text: editText.trim(), edited: true, editedAt: Date.now(),
    })
    setEditingMessage(null); setEditText("")
  }

  async function deleteMessage(messageId: string) {
    const msgRef = doc(firestore, "comms_v5_messages", messageId)
    const snap = await getDoc(msgRef)
    if (!snap.exists()) return

    const message = { id: snap.id, ...snap.data() } as CommsMessage
    if (message.deleted) return

    const deletedAt = Date.now()
    const deletedByName = user.displayName || user.email || "User"
    const originalText = message.originalText ?? message.text
    const originalAttachments = message.originalAttachments ?? message.attachments ?? []
    const deleteReason =
      message.type === "call" && message.callAnswered === false
        ? "user_removed_missed_call"
        : originalAttachments.some((attachment) => attachment.type === "image")
          ? "user_removed_image_message"
          : "user_removed_message"

    await addDoc(collection(firestore, "comms_v5_message_recycle_bin"), {
      messageId: message.id,
      threadId: message.threadId,
      organizationId: message.organizationId,
      deletedAt,
      deletedBy: user.uid,
      deletedByName,
      deleteReason,
      snapshot: {
        ...message,
        originalText,
        originalAttachments,
      },
    })

    await updateDoc(msgRef, {
      deleted: true,
      deletedAt,
      deletedBy: user.uid,
      deletedByName,
      deleteReason,
      originalText,
      originalAttachments,
      text: "This message was deleted",
      attachments: deleteField(),
      replyTo: deleteField(),
      reactions: deleteField(),
      edited: deleteField(),
      editedAt: deleteField(),
    })
  }

  async function toggleReaction(messageId: string, emoji: string) {
    const msgRef = doc(firestore, "comms_v5_messages", messageId)
    const snap = await getDoc(msgRef)
    if (!snap.exists()) return
    const reactions = (snap.data().reactions || {}) as Record<string, string[]>
    const current = reactions[emoji] || []
    if (current.includes(user.uid)) {
      const updated = current.filter(u => u !== user.uid)
      await updateDoc(msgRef, { [`reactions.${emoji}`]: updated.length ? updated : deleteField() })
    } else {
      await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayUnion(user.uid) })
    }
  }

  async function handleFileUpload(file: File) {
    if (!selectedThread) return
    setComposerError("")
    const ext = file.name.split(".").pop()?.toLowerCase()
    const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")

    if (isImage) {
      try {
        if (storage) {
          const path = `comms/${org.id}/${selectedThread.id}/${Date.now()}_${file.name}`
          const r = storageRef(firebaseStorage, path)
          await uploadBytes(r, file)
          const url = await getDownloadURL(r)
          await sendMessage("", [{ name: file.name, url, type: "image", size: file.size }])
          return
        }
      } catch {
        // Fall back to inline image attachments if Storage is unavailable or blocked.
      }

      const inlineAttachment = await buildInlineImageAttachment(file)
      await sendMessage("", [inlineAttachment])
      return
    }

    if (!storage) {
      setComposerError("File attachments need Firebase Storage. Image sending still works.")
      return
    }

    try {
      const path = `comms/${org.id}/${selectedThread.id}/${Date.now()}_${file.name}`
      const r = storageRef(firebaseStorage, path)
      await uploadBytes(r, file)
      const url = await getDownloadURL(r)
      await sendMessage("", [{ name: file.name, url, type: "file", size: file.size }])
    } catch {
      setComposerError("Unable to upload this file right now.")
    }
  }

  function clearRecordedVoice() {
    if (voicePreviewRef.current) {
      voicePreviewRef.current.pause()
      voicePreviewRef.current.currentTime = 0
    }
    if (recordedVoiceUrl) URL.revokeObjectURL(recordedVoiceUrl)
    setRecordedVoiceBlob(null)
    setRecordedVoiceUrl(null)
    setRecordingElapsed(0)
    setIsVoicePreviewPlaying(false)
  }

  function stopVoiceTimer() {
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current)
      voiceTimerRef.current = null
    }
  }

  async function startVoiceRecording() {
    if (!selectedThread || isRecordingVoice || recordedVoiceBlob) return

    try {
      setPermissionWarning("")
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      voiceChunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) voiceChunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(voiceChunksRef.current, { type: recorder.mimeType || "audio/webm" })
        stream.getTracks().forEach((track) => track.stop())
        setRecordedVoiceBlob(blob)
        setRecordedVoiceUrl(URL.createObjectURL(blob))
        setIsRecordingVoice(false)
        stopVoiceTimer()
      }
      recorder.start()
      voiceRecorderRef.current = recorder
      setIsRecordingVoice(true)
      setRecordingElapsed(0)
      stopVoiceTimer()
      voiceTimerRef.current = setInterval(() => {
        setRecordingElapsed((current) => current + 1)
      }, 1000)
    } catch {
      setPermissionWarning("Microphone access is required to record a voice message.")
    }
  }

  function stopVoiceRecording() {
    if (!voiceRecorderRef.current || voiceRecorderRef.current.state === "inactive") return
    voiceRecorderRef.current.stop()
    voiceRecorderRef.current = null
  }

  function cancelVoiceRecording() {
    if (voiceRecorderRef.current && voiceRecorderRef.current.state !== "inactive") {
      voiceRecorderRef.current.onstop = () => {
        voiceRecorderRef.current = null
      }
      voiceRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
      voiceRecorderRef.current.stop()
    }
    stopVoiceTimer()
    setIsRecordingVoice(false)
    clearRecordedVoice()
  }

  async function sendVoiceMessage() {
    if (!selectedThread || !recordedVoiceBlob) return

    if (recordingElapsed > MAX_INLINE_VOICE_NOTE_SECONDS || recordedVoiceBlob.size > MAX_INLINE_VOICE_NOTE_BYTES) {
      setPermissionWarning("Voice notes are currently limited to short clips. Keep them under 45 seconds.")
      return
    }

    const ext = recordedVoiceBlob.type.includes("mp4") ? "m4a" : "webm"
    const filename = `voice-note-${Date.now()}.${ext}`
    try {
      const url = await blobToDataUrl(recordedVoiceBlob)
      await sendMessage("", [{ name: filename, url, type: "audio", size: recordedVoiceBlob.size }])
      setPermissionWarning("")
      clearRecordedVoice()
    } catch {
      setPermissionWarning("Voice note could not be attached. Try a shorter recording.")
    }
  }

  async function toggleVoicePreviewPlayback() {
    const audio = voicePreviewRef.current
    if (!audio || !recordedVoiceUrl) return

    if (audio.paused) {
      await audio.play()
      setIsVoicePreviewPlaying(true)
      return
    }

    audio.pause()
    setIsVoicePreviewPlaying(false)
  }

  async function forwardMessageToThread(thread: CommsThread, original: CommsMessage) {
    const forwardedText = original.text?.trim()
      ? `Forwarded from ${original.displayName}: ${original.text}`
      : `Forwarded from ${original.displayName}`

    const payload: Record<string, unknown> = {
      threadId: thread.id,
      uid: user.uid,
      displayName: user.displayName || "User",
      text: forwardedText,
      type: original.attachments?.length ? "file" : "text",
      organizationId: org.id,
      memberUids: thread.memberUids,
      createdAt: Date.now(),
    }

    if (original.attachments?.length) {
      payload.attachments = original.attachments
    }

    await addDoc(collection(firestore, "comms_v5_messages"), payload)
    await updateDoc(doc(firestore, "comms_v5_threads", thread.id), {
      updatedAt: Date.now(),
      lastMessage: forwardedText,
    })
  }

  async function startDM(targetUid: string) {
    const existing = threads.find(t =>
      t.type === "direct" && t.memberUids.includes(targetUid) && t.memberUids.includes(user.uid) && t.memberUids.length === 2
    )
    if (existing) {
      if (forwardingMessage) {
        await forwardMessageToThread(existing, forwardingMessage)
        setForwardingMessage(null)
      }
      selectThread(existing)
      setShowContacts(false)
      setShowNewDM(false)
      return
    }
    const now = Date.now()
    const threadRef = await addDoc(collection(firestore, "comms_v5_threads"), {
      type: "direct", organizationId: org.id, memberUids: [user.uid, targetUid],
      createdBy: user.uid, createdAt: now, updatedAt: now, lastMessage: "", readBy: { [user.uid]: now },
    })
    const thread = { id: threadRef.id, type: "direct", organizationId: org.id, memberUids: [user.uid, targetUid], createdBy: user.uid, createdAt: now, updatedAt: now, lastMessage: "", readBy: { [user.uid]: now } } as CommsThread
    if (forwardingMessage) {
      await forwardMessageToThread(thread, forwardingMessage)
      setForwardingMessage(null)
    }
    selectThread(thread)
    setShowContacts(false); setShowNewDM(false)
  }

  async function createSpace() {
    if (!db || !newSpaceName.trim()) return
    setCreatingSpace(true)
    try {
      const now = Date.now()
      const allMemberUids = Array.from(new Set([user.uid, TOM_UID, ...newSpaceMembers]))
      const threadRef = await addDoc(collection(db, "comms_v5_threads"), {
        type: "channel",
        subtype: "group",
        name: newSpaceName.trim(),
        organizationId: org.id,
        memberUids: allMemberUids,
        createdBy: user.uid,
        createdAt: now,
        updatedAt: now,
        lastMessage: "",
        readBy: { [user.uid]: now },
      })
      const newThread: CommsThread = {
        id: threadRef.id,
        type: "channel",
        subtype: "group",
        name: newSpaceName.trim(),
        organizationId: org.id,
        memberUids: allMemberUids,
        createdBy: user.uid,
        createdAt: now,
        updatedAt: now,
        lastMessage: "",
        readBy: { [user.uid]: now },
      }
      setShowCreateSpace(false)
      setNewSpaceName("")
      setNewSpaceMembers([])
      selectThread(newThread)
    } finally {
      setCreatingSpace(false)
    }
  }

  async function addMemberToSpace(uid: string) {
    if (!db || !selectedThread || selectedThread.subtype !== "group") return
    await updateDoc(doc(db, "comms_v5_threads", selectedThread.id), {
      memberUids: arrayUnion(uid),
    })
    setSelectedThread(prev => prev ? { ...prev, memberUids: Array.from(new Set([...prev.memberUids, uid])) } : prev)
  }

  async function removeMemberFromSpace(uid: string) {
    if (!db || !selectedThread || selectedThread.subtype !== "group") return
    await updateDoc(doc(db, "comms_v5_threads", selectedThread.id), {
      memberUids: arrayRemove(uid),
    })
    setSelectedThread(prev => prev ? { ...prev, memberUids: prev.memberUids.filter(id => id !== uid) } : prev)
  }

  // â"€â"€ WebRTC â"€â"€
  function createPC() {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
    })
    pcRef.current = pc
    return pc
  }

  function attachRemoteAudio(pc: RTCPeerConnection) {
    pc.ontrack = e => {
      // Prefer the stream from the event; fall back to building one from the track
      const stream = e.streams?.[0] ?? (() => {
        const s = remoteStreamRef.current ?? new MediaStream()
        s.addTrack(e.track)
        return s
      })()

      // If we have an existing stream, graft new tracks into it so we keep audio+video together
      if (remoteStreamRef.current && remoteStreamRef.current !== stream) {
        if (!remoteStreamRef.current.getTracks().includes(e.track)) {
          remoteStreamRef.current.addTrack(e.track)
        }
        remoteStreamRef.current = remoteStreamRef.current
      } else {
        remoteStreamRef.current = stream
      }

      if (ownsGlobalCallStatus) {
        publishCallStatus({ remoteStream: remoteStreamRef.current })
      }

      if (remoteAudioRef.current) {
        stopOutgoingRing()                        // stop web-side ring if any
        remoteAudioRef.current.srcObject = remoteStreamRef.current
        remoteAudioRef.current.play().catch(() => {})
      }

      const hasVideo = hasLiveVideoTrack(remoteStreamRef.current)
      setRemoteVideoActive(hasVideo)

      if (hasVideo) {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.muted = true
          remoteVideoRef.current.srcObject = remoteStreamRef.current
          remoteVideoRef.current.play().catch(() => {})
        }
        if (floatingVideoRef.current) {
          floatingVideoRef.current.muted = true
          floatingVideoRef.current.srcObject = remoteStreamRef.current
          floatingVideoRef.current.play().catch(() => {})
        }
      } else if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null
      }

      // When remote activates video (replaceTrack) the track fires onunmute.
      // Video is per-person, so do not automatically turn on our own camera.
      if (e.track.kind === "video") {
        e.track.onunmute = () => {
          const isRemoteVideoVisible = hasLiveVideoTrack(remoteStreamRef.current)
          setRemoteVideoActive(isRemoteVideoVisible)
          if (remoteVideoRef.current) {
            remoteVideoRef.current.muted = true
            remoteVideoRef.current.srcObject = remoteStreamRef.current
            remoteVideoRef.current.play().catch(() => {})
          }
          if (floatingVideoRef.current) {
            floatingVideoRef.current.srcObject = remoteStreamRef.current
            floatingVideoRef.current.play().catch(() => {})
          }
        }
        e.track.onmute = () => {
          const isRemoteVideoVisible = hasLiveVideoTrack(remoteStreamRef.current)
          setRemoteVideoActive(isRemoteVideoVisible)
          if (isRemoteVideoVisible) return
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
          if (floatingVideoRef.current) floatingVideoRef.current.srcObject = null
        }
        e.track.onended = () => {
          const isRemoteVideoVisible = hasLiveVideoTrack(remoteStreamRef.current)
          setRemoteVideoActive(isRemoteVideoVisible)
          if (isRemoteVideoVisible) return
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
          if (floatingVideoRef.current) floatingVideoRef.current.srcObject = null
        }
      }
    }
  }

  function subscribeToCallStatus(
    callId: string,
    threadId?: string,
    onAnswer?: (sdp: RTCSessionDescriptionInit) => Promise<void>,
  ) {
    callUnsubRef.current?.()
    let answerProcessed = false

    const unsub = onSnapshot(doc(firestore, "comms_v5_calls", callId), async snap => {
      const data = snap.data()
      if (!data) { cleanupCall(); return }

      const nextCall = { id: snap.id, ...data } as CommsCall
      setActiveCall(nextCall)

      // Process answer SDP once (caller side only — callee has stable state)
      if (onAnswer && data.answer && !answerProcessed) {
        answerProcessed = true
        await onAnswer(data.answer as RTCSessionDescriptionInit)
      }

      if (data.status === "active") {
        stopOutgoingRing()
        setCallState("active")
      }

      if (data.status === "declined" || data.status === "missed") {
        if (threadId) await postCallMessage(threadId, false, 0, nextCall.mode || "audio")
        cleanupCall()
        return
      }

      if (data.status === "ended") { cleanupCall(); return }

      // Video request signalling
      if (data.videoRequestFrom && data.videoRequestFrom !== user.uid) {
        // Remote party is requesting to switch to video — show Accept/Decline modal
        if (!incomingVideoRequest) {
          const requesterName = data.videoRequestName || "Other person"
          setIncomingVideoRequest({ uid: data.videoRequestFrom as string, name: requesterName as string })
        }
      } else if (!data.videoRequestFrom) {
        // Request was cleared (accepted or declined)
        setIncomingVideoRequest(null)
        awaitingVideoAcceptRef.current = false
        setAwaitingVideoAccept(false)
        if (videoRequestResetTimeoutRef.current) {
          clearTimeout(videoRequestResetTimeoutRef.current)
          videoRequestResetTimeoutRef.current = null
        }
      }

      // Mid-call renegotiation (e.g. one party switched audio→video)
      const pc = pcRef.current
      if (!pc) return
      if (data.reofferSdp && pc.signalingState === "stable") {
        const offerSdp = data.reofferSdp as RTCSessionDescriptionInit
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offerSdp))
          const reAnswer = await pc.createAnswer()
          await pc.setLocalDescription(reAnswer)
          await updateDoc(doc(firestore, "comms_v5_calls", callId), {
            reanswerSdp: { type: reAnswer.type, sdp: reAnswer.sdp },
            reofferSdp: deleteField(),
          })
        } catch (e) { console.warn("reoffer failed:", e) }
      }
      if (data.reanswerSdp && pc.signalingState === "have-local-offer") {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.reanswerSdp))
          await updateDoc(doc(firestore, "comms_v5_calls", callId), {
            reanswerSdp: deleteField(),
          })
        } catch (e) { console.warn("reanswer failed:", e) }
      }
    })
    callUnsubRef.current = unsub
    return unsub
  }

  function startOutgoingRing() {
    const win = window as any
    if (win.PSRing) {
      win.PSRing.start()
      return
    }
    // Web fallback
    const el = remoteAudioRef.current
    if (!el) return
    el.pause()
    el.srcObject = null
    el.src = "/outgoing-call.mp3"
    el.loop = true
    void el.play().catch(e => console.warn("outgoing ring blocked:", e))
  }

  function stopOutgoingRing() {
    const win = window as any
    if (win.PSRing) {
      win.PSRing.stop()
      return
    }
    const el = remoteAudioRef.current
    if (el) { el.pause(); el.src = "" }
  }

  async function initiateCall(calleeUid: string, threadId: string, mode: "audio" | "video" = "audio") {
    if (callState !== "idle") return
    setCallMediaMode(mode)
    if (calleeUid === TOM_UID) {
      callThreadIdRef.current = threadId
      callStartTimeRef.current = 0
      setActiveCall({
        id: `tom-call-${Date.now()}`,
        callerUid: user.uid,
        calleeUid: TOM_UID,
        organizationId: org.id,
        status: "ringing",
        createdAt: Date.now(),
      } as CommsCall)
      setCallerInfo(TOM_USER)
      setTomVoiceMode(false)
      setCallState("outgoing")
      startOutgoingRing()
      if (tomAnswerTimeoutRef.current) {
        clearTimeout(tomAnswerTimeoutRef.current)
      }
      tomAnswerTimeoutRef.current = setTimeout(() => {
        callStartTimeRef.current = Date.now()
        setTomVoiceMode(true)
        setCallState("active")
        setActiveCall(current =>
          current
            ? { ...current, status: "active", answeredAt: Date.now() }
            : current,
        )
      }, 1400)
      return
    }
    // Ring starts before any awaits — within the user gesture, ensures autoplay works
    // and the native PSRing.start() fires immediately on button tap
    startOutgoingRing()
    // Fetch callee profile for call UI
    try {
      const calleeDoc = await getDoc(doc(firestore, "comms_v5_users", calleeUid))
      if (calleeDoc.exists()) setCalleeInfo(calleeDoc.data() as CommsUser)
    } catch { /* non-critical */ }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === "video" })
    } catch {
      stopOutgoingRing()
      alert(mode === "video" ? "Camera or microphone permission denied" : "Microphone permission denied")
      return
    }
    localStreamRef.current = stream
    setLocalPreviewStream(stream)
    const pc = createPC()
    attachRemoteAudio(pc)
    stream.getTracks().forEach(t => pc.addTrack(t, stream))

    const callRef = doc(collection(firestore, "comms_v5_calls"))
    callThreadIdRef.current = threadId
    callStartTimeRef.current = 0

    // Collect ICE candidates after we have a call doc ID
    const pendingCandidates: RTCIceCandidateInit[] = []
    pc.onicecandidate = e => {
      if (e.candidate) pendingCandidates.push(e.candidate.toJSON())
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    const callData = {
      callerUid: user.uid,
      callerName: user.displayName || user.email || "",
      calleeUid,
      organizationId: org.id,
      mode,
      status: "ringing",
      offer: { type: offer.type, sdp: offer.sdp },
      createdAt: Date.now(),
    }
    await setDoc(callRef, callData)
    setActiveCall({ id: callRef.id, ...callData } as CommsCall)
    setCallState("outgoing")

    // Flush pending ICE candidates
    for (const c of pendingCandidates) {
      await addDoc(collection(firestore, "comms_v5_calls", callRef.id, "caller_candidates"), c)
    }
    // Keep streaming new ones
    pc.onicecandidate = e => {
      if (e.candidate) addDoc(collection(firestore, "comms_v5_calls", callRef.id, "caller_candidates"), e.candidate.toJSON())
    }

    // Buffer callee ICE candidates until the answer SDP is applied — candidates
    // arrive before the answer write because they're written first during answerCall().
    // Applying addIceCandidate before setRemoteDescription silently drops them.
    let remoteReady = false
    const bufferedCalleeCandidates: RTCIceCandidateInit[] = []

    // Listen for callee ICE candidates — buffer until answer SDP is applied
    onSnapshot(collection(firestore, "comms_v5_calls", callRef.id, "callee_candidates"), snap => {
      snap.docChanges().forEach(change => {
        if (change.type === "added") {
          const c = change.doc.data() as RTCIceCandidateInit
          if (remoteReady) {
            pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
          } else {
            bufferedCalleeCandidates.push(c)
          }
        }
      })
    })

    // Listen for answer + all status changes via a single listener (eliminates two-listener race)
    subscribeToCallStatus(callRef.id, threadId, async (answerSdp) => {
      if (pc.signalingState !== "have-local-offer") return
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answerSdp))
        remoteReady = true
        for (const c of bufferedCalleeCandidates) {
          pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
        }
        bufferedCalleeCandidates.length = 0
      } catch (e) { console.warn("setRemoteDescription(answer) failed:", e) }
      callStartTimeRef.current = Date.now()
      setCallState("active")
    })
  }

  async function answerCall() {
    if (!activeCall) return
    triggerHapticPulse()
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: activeCall.mode === "video" })
    } catch {
      alert(activeCall.mode === "video" ? "Camera or microphone permission denied" : "Microphone permission denied")
      return
    }
    localStreamRef.current = stream
    setLocalPreviewStream(stream)
    const pc = createPC()
    attachRemoteAudio(pc)
    stream.getTracks().forEach(t => pc.addTrack(t, stream))

    // Get offer SDP from Firestore
    const callSnap = await getDoc(doc(firestore, "comms_v5_calls", activeCall.id))
    const offerData = callSnap.data()?.offer
    if (!offerData) return

    await pc.setRemoteDescription(new RTCSessionDescription(offerData))

    // Set handler BEFORE setLocalDescription — ICE gathering starts on setLocalDescription,
    // and any candidates fired before the handler is attached are silently dropped.
    pc.onicecandidate = e => {
      if (e.candidate) addDoc(collection(firestore, "comms_v5_calls", activeCall.id, "callee_candidates"), e.candidate.toJSON())
    }

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    await updateDoc(doc(firestore, "comms_v5_calls", activeCall.id), {
      answer: { type: answer.type, sdp: answer.sdp },
      status: "active",
      answeredAt: Date.now(),
    })

    callStartTimeRef.current = Date.now()
    setCallState("active")
    subscribeToCallStatus(activeCall.id)

    // Listen for caller ICE candidates
    onSnapshot(collection(firestore, "comms_v5_calls", activeCall.id, "caller_candidates"), snap => {
      snap.docChanges().forEach(change => {
        if (change.type === "added") {
          pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(() => {})
        }
      })
    })
  }

  async function declineCall() {
    if (!activeCall) return
    triggerHapticPulse()
    if (activeCall.calleeUid === TOM_UID || activeCall.callerUid === TOM_UID) {
      cleanupCall()
      return
    }
    await updateDoc(doc(firestore, "comms_v5_calls", activeCall.id), { status: "declined" })
    cleanupCall()
  }

  async function endCall() {
    if (!activeCall) return
    triggerHapticPulse()
    const duration = callStartTimeRef.current ? Math.round((Date.now() - callStartTimeRef.current) / 1000) : 0
    if (activeCall.calleeUid === TOM_UID || activeCall.callerUid === TOM_UID) {
      if (callThreadIdRef.current) {
        await postCallMessage(callThreadIdRef.current, duration > 0, duration, activeCall.mode || "audio")
      }
      cleanupCall()
      return
    }
    await updateDoc(doc(firestore, "comms_v5_calls", activeCall.id), { status: "ended", endedAt: Date.now() })
    if (activeCall.callerUid === user.uid && callThreadIdRef.current) {
      await postCallMessage(callThreadIdRef.current, duration > 0, duration, activeCall.mode || "audio")
    }
    cleanupCall()
  }

  async function postCallMessage(threadId: string, answered: boolean, duration: number, mode: "audio" | "video") {
    const text = answered ? `📞 Voice call · ${formatCallDuration(duration)}` : "📞 Missed call"
    const thread = threads.find(t => t.id === threadId)
    if (!thread) return
    await addDoc(collection(firestore, "comms_v5_messages"), {
      threadId, uid: user.uid, displayName: user.displayName || "User",
      text, type: "call", callAnswered: answered, callDuration: duration, callMode: mode,
      organizationId: org.id, memberUids: thread.memberUids, createdAt: Date.now(),
    })
    await updateDoc(doc(firestore, "comms_v5_threads", threadId), { updatedAt: Date.now(), lastMessage: text })
  }

  function cleanupCall() {
    stopOutgoingRing()
    if (tomAnswerTimeoutRef.current) {
      clearTimeout(tomAnswerTimeoutRef.current)
      tomAnswerTimeoutRef.current = null
    }
    if (tomTypingTimeoutRef.current) {
      clearTimeout(tomTypingTimeoutRef.current)
      tomTypingTimeoutRef.current = null
    }
    if (incomingRingTimeoutRef.current) {
      clearTimeout(incomingRingTimeoutRef.current)
      incomingRingTimeoutRef.current = null
    }
    if (videoRequestResetTimeoutRef.current) {
      clearTimeout(videoRequestResetTimeoutRef.current)
      videoRequestResetTimeoutRef.current = null
    }
    callUnsubRef.current?.(); callUnsubRef.current = null
    callSignalUnsubRef.current?.(); callSignalUnsubRef.current = null
    teardownBlurProcessor()
    pcRef.current?.close(); pcRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop()); localStreamRef.current = null
    if (remoteAudioRef.current) { remoteAudioRef.current.srcObject = null }
    if (remoteVideoRef.current) { remoteVideoRef.current.srcObject = null }
    setLocalPreviewStream(null)
    remoteStreamRef.current = null
    setTomVoiceMode(false)
    setCallState("idle"); setActiveCall(null); setCallerInfo(null); setCalleeInfo(null)
    setCallElapsed(0); setCallMuted(false); setCallSpeaker(false)
    setVideoBlurEnabled(false)
    setShowLocalAsPrimary(false)
    setRemoteVideoActive(false)
    awaitingVideoAcceptRef.current = false
    setAwaitingVideoAccept(false)
    setIncomingVideoRequest(null)
    setCallViewMode("panel")
    if (ownsGlobalCallStatus) {
      resetCallStatus()
    }
  }

  function toggleMute() {
    triggerHapticPulse()
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    setCallMuted(v => !v)
  }

  async function switchToAudio() {
    if (!localStreamRef.current || callState !== "active") return
    triggerHapticPulse()
    if (videoBlurEnabled) await disableBackgroundBlur()
    const pc = pcRef.current
    // Stop local video tracks and detach from sender
    const videoTracks = localStreamRef.current.getVideoTracks()
    // Use replaceTrack(null) if pre-negotiated transceiver exists — no renegotiation,
    // remote's track fires onmute and their UI clears the video element automatically
    const vt = pc?.getTransceivers().find(t => t.sender.track?.kind === "video")
    if (vt) {
      await vt.sender.replaceTrack(null)
      videoTracks.forEach(t => { t.stop(); localStreamRef.current?.removeTrack(t) })
    } else {
      videoTracks.forEach(track => {
        track.stop()
        const sender = pc?.getSenders().find(s => s.track === track)
        if (sender) pc?.removeTrack(sender)
      })
      if (pc && activeCall) {
        try {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          await updateDoc(doc(firestore, "comms_v5_calls", activeCall.id), {
            reofferSdp: { type: offer.type, sdp: offer.sdp },
          })
        } catch (e) { console.warn("renegotiate audio:", e) }
      }
    }
    setLocalPreviewStream(null)
    setShowLocalAsPrimary(false)
    const remoteStillVisible = hasLiveVideoTrack(remoteStreamRef.current)
    setRemoteVideoActive(remoteStillVisible)
    if (remoteStillVisible) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current
        remoteVideoRef.current.play().catch(() => {})
      }
      if (floatingVideoRef.current) {
        floatingVideoRef.current.srcObject = remoteStreamRef.current
        floatingVideoRef.current.play().catch(() => {})
      }
    } else {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
      if (floatingVideoRef.current) floatingVideoRef.current.srcObject = null
    }
    setCallMediaMode("audio")
  }

  async function switchToVideo() {
    if (callState !== "active") return
    triggerHapticPulse()
    const pc = pcRef.current
    if (!pc) return
    if (hasLiveVideoTrack(localStreamRef.current)) {
      setCallMediaMode("video")
      return
    }
    try {
      let videoStream: MediaStream
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: camFacingMode }, audio: false })
      } catch {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      }
      const track = videoStream.getVideoTracks()[0]
      if (!track) return

      localStreamRef.current?.addTrack(track)
      pc.addTrack(track, localStreamRef.current!)

      setLocalPreviewStream(localStreamRef.current)
      setCallMediaMode("video")

      if (activeCall) {
        try {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          await updateDoc(doc(firestore, "comms_v5_calls", activeCall.id), {
            reofferSdp: { type: offer.type, sdp: offer.sdp },
          })
        } catch (e) { console.warn("switchToVideo renegotiate:", e) }
      }
    } catch (e) {
      alert("Could not access camera: " + String(e))
      console.warn("switchToVideo:", e)
    }
  }

  async function requestVideo() {
    if (callState !== "active" || !activeCall || awaitingVideoAccept) return
    triggerHapticPulse()
    const myName = user.displayName || user.email || "Caller"
    if (callMediaMode !== "video") {
      await switchToVideo()
    }
    awaitingVideoAcceptRef.current = true
    setAwaitingVideoAccept(true)
    if (videoRequestResetTimeoutRef.current) {
      clearTimeout(videoRequestResetTimeoutRef.current)
      videoRequestResetTimeoutRef.current = null
    }
    try {
      await updateDoc(doc(firestore, "comms_v5_calls", activeCall.id), {
        videoRequestFrom: user.uid,
        videoRequestName: myName,
        videoAccepted: deleteField(),
      })
      videoRequestResetTimeoutRef.current = window.setTimeout(() => {
        videoRequestResetTimeoutRef.current = null
        awaitingVideoAcceptRef.current = false
        setAwaitingVideoAccept(false)
      }, 6000)
    } catch (e) {
      awaitingVideoAcceptRef.current = false
      setAwaitingVideoAccept(false)
      console.warn("requestVideo failed:", e)
    }
  }

  async function acceptVideoRequest() {
    if (!activeCall || !incomingVideoRequest) return
    triggerHapticPulse()
    setIncomingVideoRequest(null)
    awaitingVideoAcceptRef.current = false
    setAwaitingVideoAccept(false)
    if (videoRequestResetTimeoutRef.current) {
      clearTimeout(videoRequestResetTimeoutRef.current)
      videoRequestResetTimeoutRef.current = null
    }
    await switchToVideo()
    await updateDoc(doc(firestore, "comms_v5_calls", activeCall.id), {
      videoRequestFrom: deleteField(),
      videoRequestName: deleteField(),
      videoAccepted: deleteField(),
    })
  }

  async function declineVideoRequest() {
    if (!activeCall || !incomingVideoRequest) return
    triggerHapticPulse()
    setIncomingVideoRequest(null)
    awaitingVideoAcceptRef.current = false
    setAwaitingVideoAccept(false)
    if (videoRequestResetTimeoutRef.current) {
      clearTimeout(videoRequestResetTimeoutRef.current)
      videoRequestResetTimeoutRef.current = null
    }
    await updateDoc(doc(firestore, "comms_v5_calls", activeCall.id), {
      videoRequestFrom: deleteField(),
      videoRequestName: deleteField(),
      videoAccepted: deleteField(),
    })
  }

  async function switchCamera() {
    if (!localStreamRef.current || callMediaMode !== "video") return
    const shouldRestoreBlur = videoBlurEnabled
    if (shouldRestoreBlur) {
      await disableBackgroundBlur(false)
    }
    const currentTrack = localStreamRef.current.getVideoTracks()[0]
    const nextFacing: "user" | "environment" = camFacingMode === "user" ? "environment" : "user"
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: nextFacing }, audio: false })
      const newTrack = newStream.getVideoTracks()[0]
      const sender = pcRef.current?.getSenders().find(s => s.track?.kind === "video")
      if (sender) await sender.replaceTrack(newTrack)
      currentTrack?.stop()
      if (currentTrack) localStreamRef.current.removeTrack(currentTrack)
      localStreamRef.current.addTrack(newTrack)
      setLocalPreviewStream(localStreamRef.current)
      setCamFacingMode(nextFacing)
      if (shouldRestoreBlur) {
        await enableBackgroundBlur()
      }
    } catch (e) {
      console.warn("switch camera:", e)
      if (shouldRestoreBlur) {
        await enableBackgroundBlur()
      }
    }
  }

  // Keep callActionsRef current every render so stable store callbacks always invoke latest functions
  callActionsRef.current = { endCall, answerCall, declineCall, toggleMute, switchToAudio, switchToVideo, requestVideo, acceptVideoRequest, declineVideoRequest }

  const handleSignOut = useCallback(async () => {
    await setDoc(doc(firestore, "comms_v5_presence", user.uid), {
      uid: user.uid, status: "offline", lastSeen: Date.now(), organizationId: org.id,
    })
    await signOut(firebaseAuth)
    onSignOut()
  }, [user.uid, org.id, onSignOut])

  const handleSwitchOrg = useCallback(async () => {
    await setDoc(doc(firestore, "comms_v5_presence", user.uid), {
      uid: user.uid, status: "offline", lastSeen: Date.now(), organizationId: org.id,
    })
    setShowProfile(false)
    onSwitchOrg()
  }, [user.uid, org.id, onSwitchOrg])

  const displayName = currentUserRecord?.displayName || user.displayName || user.email || "U"

  // â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  // RENDER
  // â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  return (
    <div
      ref={appRef}
      className={`relative flex flex-col overflow-hidden ${embedded ? "h-full max-w-none bg-black lg:bg-black" : "max-w-md mx-auto bg-black"}`}
      style={{ height: embedded ? "100%" : "100dvh" }}
    >
      <style jsx global>{`
        @keyframes typingPulse {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
          40% { transform: translateY(-2px); opacity: 1; }
        }
        @keyframes voiceWavePulse {
          0%, 100% { transform: scaleY(0.92); opacity: 0.82; }
          50% { transform: scaleY(1.18); opacity: 1; }
        }
        @keyframes createSpaceDrawerIn {
          from { transform: translateX(-28px) scale(0.985); opacity: 0; }
          to { transform: translateX(0) scale(1); opacity: 1; }
        }
      `}</style>
      {/* Hidden audio for remote stream â€" video refs live in call UI only to avoid ref conflicts */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Connecting overlay — shown when app opens from a call notification */}
      {showConnectingOverlay && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black pointer-events-none">
          <p className="animate-pulse text-base font-medium text-white tracking-wide">Connecting…</p>
        </div>
      )}

      {/* Incoming video request modal rendered globally in PrepSightV4App via call-state */}

      {/* â"€â"€ Header â"€â"€ */}
      <div
        className={`shrink-0 ${embedded ? "bg-black" : "bg-black px-5 pb-0"}`}
        style={embedded ? undefined : { paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}
      >
        {embedded && hideMobileHeader ? null : (
          <div className="lg:hidden">
            {isFoldableSplitView ? (
              <div
                className="shrink-0 bg-black px-5 pb-2"
                style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
              >
                <div className="mb-0 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[24px] tracking-tight">
                    <img src="/PrepSight%20logo.png" alt="" aria-hidden="true" className="h-[54px] w-auto" />
                    <span>
                      <span className="app-display-font text-[0.86em] tracking-[-0.05em] text-[#0096C7]">PrepSight</span>{" "}
                      <em
                        className="text-[0.84em] leading-none tracking-[-0.05em] text-[#67CFCF]"
                        style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontWeight: 500 }}
                      >
                        Comms
                      </em>
                    </span>
                  </span>
                  {!selectedThread && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowGlobalSearch(true)
                        }}
                        aria-label="Toggle search"
                        className="text-white hover:text-white"
                      >
                        <Search size={20} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowProfile(true)}
                        aria-label="More"
                        className="text-white hover:text-white"
                      >
                        <MoreVertical size={22} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-[-2px] text-[14px] text-white">
                  <span className="block truncate whitespace-nowrap">{groupLabel ? `${hospitalLabel} | ${groupLabel}` : hospitalLabel}</span>
                </div>
              </div>
            ) : (
              <MobileSurfaceHeader
                title="Comms"
                hospital={hospitalLabel}
                department={groupLabel}
                compact
                rightControls={(
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowGlobalSearch(true)
                      }}
                      aria-label="Toggle search"
                      className="text-white hover:text-white"
                    >
                      <Search size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowProfile(true)}
                      aria-label="More"
                      className="text-white hover:text-white"
                    >
                      <MoreVertical size={22} />
                    </button>
                  </>
                )}
              />
            )}
          </div>
        )}
        <div className={`hidden lg:block ${embedded ? "px-5 pt-3 pb-2" : "px-5 pb-2"}`}>
        <div className="mb-0.5 flex items-center justify-between">
          {embedded ? (
            <div className="mt-2">
              <DesktopCommsWordmark />
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-[28px] tracking-tight">
              <img src="/PrepSight%20logo.png" alt="" aria-hidden="true" className="h-[54px] w-auto" />
              <span>
                <span className="app-display-font text-[0.86em] tracking-[-0.05em] text-[#0096C7]">PrepSight</span>{" "}
                <em
                  className="text-[0.84em] leading-none tracking-[-0.05em] text-[#67CFCF]"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontWeight: 500 }}
                >
                  Comms
                </em>
              </span>
            </span>
          )}
          <div
            className={`items-center gap-2 lg:gap-3 ${
              (showProfileButton || !embedded) ? "flex" : "hidden lg:flex"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setShowGlobalSearch(true)
              }}
              aria-label="Toggle search"
              className="text-white hover:text-white lg:hidden"
            >
              <Search size={20} />
            </button>
            <button
              type="button"
              onClick={() => {
                toggleDesktopCommsPreference()
              }}
              aria-label="Close PrepSight Comms"
              title="Close PrepSight Comms"
              className="hidden text-white hover:text-white lg:block"
            >
              <X size={20} />
            </button>
            {(showProfileButton || !embedded) ? (
              <button
                type="button"
                onClick={() => setShowProfile(true)}
                aria-label="More"
                className="text-white hover:text-white"
              >
                <MoreVertical size={22} />
              </button>
            ) : null}
          </div>
        </div>
        <div className="ml-1 mt-[-2px] flex items-center gap-2 overflow-hidden text-[14px] text-white">
          <span>{hospitalLabel}</span>
          {groupLabel ? <span className="shrink-0 text-[#5f5f5f]">|</span> : null}
          {groupLabel ? <span className="truncate">{groupLabel}</span> : null}
        </div>
        </div>

        {permissionWarning ? (
          <div className="mb-4 rounded-2xl border border-[#0096C7]/30 bg-[#001a26] px-4 py-3 text-[13px] leading-5 text-[#e0e0e0]">
            {permissionWarning}
          </div>
        ) : null}
      </div>

      {/* â"€â"€ Filter row â"€â"€ */}
      <div className={`border-b border-black bg-black px-4 pt-0 pb-3 shrink-0 ${isFoldableSplitView ? "w-1/2" : ""}`}>
        {/* Avatar strip — leftmost slot reserved for Status */}
        <div className="-mx-4 mb-3 bg-[#0a0a0b] px-4 pt-0.5 pb-1.5">
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

            {/* Status placeholder — wired up later */}
            <button
              type="button"
              disabled
              title="Status — coming soon"
              className="flex w-[52px] shrink-0 flex-col items-center gap-0.5 text-center opacity-40"
            >
              <div className="relative flex h-[48px] w-[48px] items-center justify-center rounded-full border border-[#2a2a2a] bg-[#111111]">
                <span className="h-3 w-3 rounded-full border-2 border-[#22c55e] bg-[#22c55e]/30" />
              </div>
              <span className="w-full truncate text-[10px] leading-tight text-white">Status</span>
            </button>

            {displayedContactMembers.map(member => (
              <button
                key={member.uid}
                type="button"
                onClick={() => startDM(member.uid)}
                aria-label={`Message ${member.displayName}`}
                className="flex w-[52px] shrink-0 flex-col items-center gap-0.5 text-center"
              >
                <div className="relative">
                  <Avatar name={member.displayName} size={48} uid={member.uid} />
                  {isOnline(member.uid) ? (
                    <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-black bg-emerald-400" />
                  ) : null}
                </div>
                <span className="w-full truncate text-[10px] leading-tight text-white">
                  {getFirstName(member.displayName)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab row */}
        <div className="flex gap-1.5">
          {(["chats","pings","spaces","feeds"] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
                filterTab === tab ? "bg-[#0096C7] text-white font-medium" : "text-white"
              }`}
            >
              {tab === "chats" ? "Chats" : tab === "pings" ? "Pings" : tab === "spaces" ? "Spaces" : "Feeds"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Thread list ── */}
      <div className={`relative flex-1 min-h-0 ${isFoldableSplitView ? "w-1/2" : ""}`}>
      <div className="h-full overflow-y-auto bg-black">
          {filterTab === "pings" ? (
            <>
              <button
                type="button"
                onClick={() => setShowPingSettings(true)}
                className="sticky top-0 z-10 flex w-full items-center justify-between border-b border-[#1e1e1e] bg-black px-4 py-3 text-left transition-colors hover:bg-[#0f0f0f]"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-white">Manage shortcuts</p>
                </div>
                <ChevronRight size={15} className="shrink-0 text-white/45" />
              </button>
              {pings.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 px-8 pt-24 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#111111] text-[#0e7490]">
                  <Zap size={28} />
                </div>
                <div>
                  <p className="text-[16px] font-medium text-white">No pings yet</p>
                  <p className="mt-1 text-[13px] text-white">Right-click a user in Workforce or tap ⚡ in a chat to create a ping.</p>
                </div>
              </div>
            ) : (
              <div>
                {pings.map(ping => {
                  const effectiveStatus = getEffectivePingStatus(ping)
                  const statusLabel = effectiveStatus === "sent" ? "New ping" : getPingStatusLabel(ping)
                  const isRecipient = ping.recipientUid === user.uid
                  const statusTone =
                    effectiveStatus === "completed" ? "text-emerald-300"
                    : effectiveStatus === "declined" ? "text-zinc-300"
                    : effectiveStatus === "escalated" ? "text-rose-300"
                    : effectiveStatus === "accepted" ? "text-sky-300"
                    : effectiveStatus === "seen" ? "text-amber-300"
                    : "text-[#67CFCF]"
                  const urgencyTone =
                    ping.category === "urgent" ? "bg-amber-400"
                    : ping.category === "action" ? "bg-sky-400"
                    : "bg-zinc-500"
                  const actorLabel = ping.displayName || "Sender"
                  const quickReplies = (ping.quickReplies ?? []).filter((entry) => entry.message.trim())
                  return (
                    <div key={ping.id} className="border-b border-black px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openPingThread(ping)}
                        className="w-full text-left active:bg-[#0f0f0f]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="truncate text-[15px] font-medium leading-tight text-white">{actorLabel}</span>
                          <span className="shrink-0 text-[11px] tabular-nums text-white/42">{formatTime(ping.createdAt)}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className={`h-2 w-2 shrink-0 rounded-full ${urgencyTone}`} />
                          <p className="min-w-0 flex-1 text-[13px] leading-tight text-white/82">{ping.text}</p>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                          <span className={`font-medium ${statusTone}`}>{statusLabel}</span>
                          <span className="text-white/40">Tap to open thread</span>
                        </div>
                      </button>
                      {isRecipient ? (
                        <div className="mt-3 flex flex-wrap gap-3">
                          {quickReplies.map((reply) => {
                            const visual = getPingReplyVisual(reply.label)
                            const Icon = visual.icon
                            return (
                              <button
                                key={reply.id}
                                type="button"
                                onClick={() => void sendPingReply(ping, reply.message, "quick", reply.label)}
                                className="flex w-[52px] flex-col items-center gap-1.5 text-center"
                              >
                                <span className={`flex h-9 w-9 items-center justify-center rounded-full border transition-transform hover:scale-[1.04] ${visual.surface}`}>
                                  <Icon size={14} className={visual.tone} />
                                </span>
                                <span className="text-[10px] leading-tight text-white/72">{reply.label}</span>
                              </button>
                            )
                          })}
                          <button
                            type="button"
                            onClick={() => openPingThread(ping, true)}
                            className="flex w-[52px] flex-col items-center gap-1.5 text-center"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2d2d2d] bg-[#111111] text-[11px] font-semibold text-white transition-colors hover:bg-[#151515]">
                              <Reply size={14} />
                            </span>
                            <span className="text-[10px] leading-tight text-white/72">Reply</span>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
            </>
          ) : null}
          {filterTab !== "pings" && visibleThreads.length === 0 && filterTab === "spaces" ? (
            <div className="flex flex-col items-center justify-center gap-4 px-8 pt-24 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#111111] text-[#0096C7]">
                <Users size={28} />
              </div>
              <div>
                <p className="text-[16px] font-medium text-white">No spaces yet</p>
                <p className="mt-1 text-[13px] text-white">Tap + to create a space and start a group chat with your team.</p>
              </div>
            </div>
          ) : filterTab !== "pings" && visibleThreads.length === 0 ? (
            <p className="mt-20 text-center text-sm text-white">No conversations yet</p>
          ) : null}

          {filterTab !== "pings" && filterTab !== "spaces" && visibleThreads.map(thread => {
            const unread = unreadCounts[thread.id] || 0
            const avatar = getThreadAvatar(thread)
            const otherUid = thread.type === "direct" ? getOtherUid(thread) : ""
            const online = otherUid ? isOnline(otherUid) : false
            const name = getThreadName(thread)

            return (
              <button
                key={thread.id}
                onClick={() => selectThread(thread)}
                className={`w-full flex items-center gap-3 px-4 py-2 border-b border-black active:bg-[#111111] ${
                  selectedThread?.id === thread.id ? "bg-[var(--mob-accent-bg,rgba(0,180,216,0.08))]" : ""
                }`}
              >
                <div className="relative shrink-0">
                  {thread.type === "channel" ? (
                    <Avatar name={name} size={48} uid={thread.id} />
                  ) : avatar ? (
                    <Avatar name={avatar.displayName} size={48} uid={avatar.uid} />
                  ) : (
                    <Avatar name="?" size={48} />
                  )}
                  {online && (
                    <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-400 border-2 border-black rounded-full" />
                  )}
                  {thread.type === "channel" && isGroupLocked(thread) && (
                    <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--mob-surface,#111111)] text-white">
                      <LockKeyhole size={10} />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 text-left leading-tight">
                  <div className="flex items-start justify-between gap-3 leading-tight">
                    <span className={`truncate text-[15px] leading-tight ${unread ? "font-semibold text-white" : "font-medium text-white"}`}>
                      {name}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      {isThreadPinned(thread.id) ? <Pin size={12} className="fill-white text-white" /> : null}
                      <span className="text-[11px] text-white/60">
                        {thread.updatedAt ? formatTime(thread.updatedAt) : ""}
                      </span>
                    </div>
                  </div>
                  <div className="mt-px flex items-center justify-between gap-3 leading-tight">
                    <span className="truncate text-[13px] leading-tight text-white/60">
                      {thread.subtype === "group"
                        ? `${thread.memberUids.length} member${thread.memberUids.length !== 1 ? "s" : ""}`
                        : getLastMessagePreview(thread)}
                    </span>
                    {unread > 0 && (
                      <span className="ml-2 flex h-[20px] min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[#0096C7] px-1.5 text-[11px] font-semibold text-white">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}

          {filterTab === "spaces" && (() => {
            const theatreNameSet = new Set([
              ...orgTeams.filter(t => t.type === "theatre").map(t => t.name),
              ...todaySessions.map(s => s.theatre),
            ])
            const specialtyNameSet = new Set(orgTeams.filter(t => t.type === "specialty").map(t => t.name))

            const isTheatreThread = (t: CommsThread) => t.teamType === "theatre" || theatreNameSet.has(t.name ?? "")
            const isTeamThread = (t: CommsThread) => t.teamType === "specialty" || specialtyNameSet.has(t.name ?? "")

            const theatreThreads = visibleThreads.filter(isTheatreThread)
            const teamThreads = visibleThreads.filter(t => !isTheatreThread(t) && isTeamThread(t))
            const otherThreads = visibleThreads.filter(t => !isTheatreThread(t) && !isTeamThread(t))

            const renderSpaceRow = (thread: CommsThread) => {
              const unread = unreadCounts[thread.id] || 0
              const name = getThreadName(thread)
              return (
                <button
                  key={thread.id}
                  onClick={() => selectThread(thread)}
                  className={`w-full flex items-center gap-3 px-4 py-2 border-b border-black active:bg-[#111111] ${
                    selectedThread?.id === thread.id ? "bg-[var(--mob-accent-bg,rgba(0,180,216,0.08))]" : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar name={name} size={48} uid={thread.id} />
                    {thread.type === "channel" && isGroupLocked(thread) && (
                      <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--mob-surface,#111111)] text-white">
                        <LockKeyhole size={10} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left leading-tight">
                    <div className="flex items-start justify-between gap-3 leading-tight">
                      <span className={`truncate text-[15px] leading-tight ${unread ? "font-semibold text-white" : "font-medium text-white"}`}>
                        {name}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        {isThreadPinned(thread.id) ? <Pin size={12} className="fill-white text-white" /> : null}
                        <span className="text-[11px] text-white/60">
                          {thread.updatedAt ? formatTime(thread.updatedAt) : ""}
                        </span>
                      </div>
                    </div>
                    <div className="mt-px flex items-center justify-between gap-3 leading-tight">
                      <span className="truncate text-[13px] leading-tight text-white/60">
                        {`${thread.memberUids.length} member${thread.memberUids.length !== 1 ? "s" : ""}`}
                      </span>
                      {unread > 0 && (
                        <span className="ml-2 flex h-[20px] min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[#0096C7] px-1.5 text-[11px] font-semibold text-white">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            }

            return (
              <>
                {theatreThreads.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 px-4 pb-1.5 pt-4">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white">Theatres</span>
                      <span className="rounded-full bg-[#161616] px-1.5 text-[10px] text-white">{theatreThreads.length}</span>
                    </div>
                    {theatreThreads.map(renderSpaceRow)}
                  </>
                )}
                {teamThreads.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 px-4 pb-1.5 pt-4">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white">Teams</span>
                      <span className="rounded-full bg-[#161616] px-1.5 text-[10px] text-white">{teamThreads.length}</span>
                    </div>
                    {teamThreads.map(renderSpaceRow)}
                  </>
                )}
                {otherThreads.map(renderSpaceRow)}
              </>
            )
          })()}
      </div>
      {filterTab === "spaces" && (
        <button
          type="button"
          onClick={() => { setNewSpaceName(""); setNewSpaceMembers([]); setShowCreateSpace(true) }}
          className="absolute bottom-6 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[#0096C7] shadow-[0_4px_20px_rgba(0,150,199,0.4)] active:scale-95 transition-transform"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)" }}
        >
          <Plus size={24} className="text-white" />
        </button>
      )}
      </div>

      {/* Bottom nav */}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• THREAD VIEW â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* Space Info side drawer */}
      {showSpaceInfo && selectedThread?.subtype === "group" && (() => {
        const spaceMembers = members.filter(m => selectedThread.memberUids.includes(m.uid) && m.uid !== TOM_UID)
        const nonMembers = members.filter(m => !selectedThread.memberUids.includes(m.uid) && m.uid !== TOM_UID)
        const isAdmin = selectedThread.createdBy === user.uid
        return (
          <div
            className="absolute inset-0 z-30 bg-black/58"
            style={{ animation: "mobileGlobalSearchFadeIn 260ms ease-out both" }}
            onClick={() => setShowSpaceInfo(false)}
          >
            <div
              className="h-full overflow-y-auto rounded-r-[32px] rounded-tl-[24px] border-r border-t border-[#2d2d2d] bg-[linear-gradient(180deg,#111111_0%,#0a0a0a_100%)] px-4 shadow-[18px_0_44px_rgba(0,0,0,0.5)]"
              style={{
                width: "min(88%,29rem)",
                animation: "createSpaceDrawerIn 300ms cubic-bezier(0.22,1,0.36,1) both",
                paddingTop: "calc(env(safe-area-inset-top,0px) + 12px)",
                paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 32px)",
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="mb-2 flex items-start justify-end">
                <button
                  type="button"
                  onClick={() => setShowSpaceInfo(false)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#d8d8d8] hover:bg-[#1a1a1a] hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mb-1 flex items-center gap-3">
                <Avatar name={getThreadName(selectedThread)} size={48} uid={selectedThread.id} />
                <div className="min-w-0">
                  <p className="text-[20px] font-semibold text-white truncate">{getThreadName(selectedThread)}</p>
                  <p className="text-[13px] text-white">{selectedThread.memberUids.length} member{selectedThread.memberUids.length !== 1 ? "s" : ""}</p>
                </div>
              </div>

              <div className="mt-6">
                <p className="mb-3 text-[16px] text-white">Members</p>
                <div>
                  {spaceMembers.map(member => (
                    <div key={member.uid} className="flex items-center gap-3 px-1 py-3 border-b border-[#181818] last:border-b-0">
                      <div className="relative shrink-0">
                        <Avatar name={member.displayName} size={40} uid={member.uid} />
                        {isOnline(member.uid) && (
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-black rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-[14px] text-[#d8d8d8]">
                          {member.displayName}
                          {member.uid === user.uid ? <span className="ml-1.5 text-[11px] text-[#555]">You</span> : null}
                          {member.uid === selectedThread.createdBy ? <span className="ml-1.5 text-[11px] text-[#0096C7]">Admin</span> : null}
                        </p>
                        {member.clinicalRole && <p className="truncate text-[12px] text-white">{member.clinicalRole}</p>}
                      </div>
                      {isAdmin && member.uid !== user.uid && (
                        <button
                          type="button"
                          onClick={() => void removeMemberFromSpace(member.uid)}
                          className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-[#555] hover:bg-[#1f1f1f] hover:text-[#ef4444] transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {nonMembers.length > 0 && (
                <div className="mt-6">
                  <p className="mb-3 text-[16px] text-white">Add people</p>
                  <div>
                    {nonMembers.map(member => (
                      <button
                        key={member.uid}
                        type="button"
                        onClick={() => void addMemberToSpace(member.uid)}
                        className="flex w-full items-center gap-3 px-1 py-3 border-b border-[#181818] last:border-b-0 active:bg-[#141414]"
                      >
                        <Avatar name={member.displayName} size={40} uid={member.uid} />
                        <div className="flex-1 min-w-0 text-left">
                          <p className="truncate text-[14px] text-[#d8d8d8]">{member.displayName}</p>
                          {member.clinicalRole && <p className="truncate text-[12px] text-white">{member.clinicalRole}</p>}
                        </div>
                        <Plus size={18} className="shrink-0 text-[#0096C7]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {showPingSettings && (
        <>
          <div
            className="absolute inset-0 z-30 bg-black/58"
            style={{ animation: "mobileGlobalSearchFadeIn 260ms ease-out both" }}
            onClick={() => setShowPingSettings(false)}
          />
          <div
            className="absolute inset-y-0 right-0 z-40 flex h-full w-full max-w-[28rem] flex-col border-l border-[#2d2d2d] bg-black shadow-[-18px_0_40px_rgba(0,0,0,0.58)]"
            style={{ animation: "mobileSlideInRight 280ms cubic-bezier(.22,.91,.31,1) both" }}
          >
            <div className="flex items-center justify-between border-b border-[#2d2d2d] px-4 py-3">
              <div>
                <p className="text-[15px] font-semibold text-white">Ping shortcuts</p>
                <p className="mt-0.5 text-[12px] text-white/60">Manage the shortcuts available when you ping each role.</p>
              </div>
              <button type="button" onClick={() => setShowPingSettings(false)} className="text-white/70 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <PingShortcutSettingsPanel
                sets={pingShortcutSets}
                onSave={(next) => {
                  void handleSavePingShortcutSets(next)
                  setShowPingSettings(false)
                }}
              />
            </div>
          </div>
        </>
      )}

      {/* Create Space side drawer */}
      {showCreateSpace && (
        <>
          <div
            className="absolute inset-0 z-30 bg-black/58"
            style={{ animation: "mobileGlobalSearchFadeIn 260ms ease-out both" }}
            onClick={() => setShowCreateSpace(false)}
          >
            <div
              className="h-full overflow-y-auto rounded-r-[32px] rounded-tl-[24px] border-r border-t border-[#2d2d2d] bg-[linear-gradient(180deg,#111111_0%,#0a0a0a_100%)] px-4 shadow-[18px_0_44px_rgba(0,0,0,0.5)]"
              style={{
                width: "min(88%,29rem)",
                animation: "createSpaceDrawerIn 300ms cubic-bezier(0.22,1,0.36,1) both",
                paddingTop: "calc(env(safe-area-inset-top,0px) + 12px)",
                paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 32px)",
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="mb-2 flex items-start justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateSpace(false)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#d8d8d8] transition-colors hover:bg-[#1a1a1a] hover:text-white"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="mb-5 text-[22px] font-semibold text-white">New Space</p>

              <input
                type="text"
                value={newSpaceName}
                onChange={e => setNewSpaceName(e.target.value)}
                placeholder="Space name"
                className="w-full rounded-full border border-[#2d2d2d] bg-[#161616] px-4 py-2.5 text-[15px] text-white outline-none placeholder:text-white focus:border-[#0096C7] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                autoFocus
              />

              {members.filter(m => m.uid !== user.uid).length > 0 && (
                <div className="mt-6">
                  <p className="mb-3 text-[16px] text-white">Add members</p>
                  <div className="space-y-0">
                    {members.filter(m => m.uid !== user.uid).map(member => {
                      const selected = newSpaceMembers.includes(member.uid)
                      return (
                        <button
                          key={member.uid}
                          type="button"
                          onClick={() => setNewSpaceMembers(prev =>
                            selected ? prev.filter(id => id !== member.uid) : [...prev, member.uid]
                          )}
                          className="flex w-full items-center gap-3 px-1 py-3 border-b border-[#181818] last:border-b-0 active:bg-[#141414]"
                        >
                          <Avatar name={member.displayName} size={40} uid={member.uid} />
                          <div className="flex-1 min-w-0 text-left">
                            <p className="truncate text-[14px] text-[#d8d8d8]">{member.displayName}</p>
                            {member.clinicalRole && <p className="truncate text-[12px] text-white">{member.clinicalRole}</p>}
                          </div>
                          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${selected ? "border-[#0096C7] bg-[#0096C7]" : "border-[#333]"}`}>
                            {selected && <Check size={12} className="text-white" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  {newSpaceMembers.length > 0 && (
                    <p className="mt-3 text-[13px] text-[#0096C7]">{newSpaceMembers.length} member{newSpaceMembers.length !== 1 ? "s" : ""} selected</p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={createSpace}
                disabled={!newSpaceName.trim() || creatingSpace}
                className="mt-6 w-full rounded-full bg-[#0096C7] py-3 text-[15px] font-semibold text-white disabled:opacity-40 transition-opacity"
              >
                {creatingSpace ? "Creating…" : "Create Space"}
              </button>
            </div>
          </div>
        </>
      )}

      <MobileGlobalSearchOverlay open={showGlobalSearch} onClose={() => setShowGlobalSearch(false)} halfScreen={isFoldableSplitView} />
      {joinCodeThread ? (
        <div className="absolute inset-0 z-20 flex items-end justify-center bg-[rgba(19,66,83,0.28)] px-4 pb-[calc(env(safe-area-inset-bottom)+24px)] lg:items-center lg:pb-0">
          <div className="w-full max-w-sm rounded-[28px] border border-[#A7D9E8] bg-[#DDF3FA] p-5 shadow-[0_24px_60px_rgba(14,77,103,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[20px] font-medium text-[#0b4d67]">{getThreadName(joinCodeThread)}</p>
                <p className="mt-1 text-[13px] text-[#6c93a2]">Enter access code once to join this group</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setJoinCodeThread(null)
                  setJoinCodeInput("")
                  setJoinCodeError("")
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0096C7] text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 rounded-2xl border border-[#B9DEEA] bg-[#D4EEF8] px-4 py-3">
              <input
                value={joinCodeInput}
                onChange={event => setJoinCodeInput(event.target.value)}
                placeholder="Enter code"
                className="w-full bg-transparent text-[15px] text-[#24556b] placeholder-[#7298A8] outline-none"
              />
            </div>
            {joinCodeError ? <p className="mt-2 text-[12px] text-[#B45309]">{joinCodeError}</p> : null}
            <button
              type="button"
              onClick={() => void unlockGroupThread()}
              className="mt-4 flex w-full items-center justify-center rounded-2xl bg-[#0096C7] px-4 py-3 text-sm font-semibold text-white"
            >
              Join group
            </button>
          </div>
        </div>
      ) : null}
      {selectedThread && isFoldableSplitView ? (
        <div className="absolute inset-y-0 right-0 left-1/2 z-10 bg-black">
          {renderMobileThreadPane(true)}
        </div>
      ) : null}
      {selectedThread && !isFoldableSplitView && embedded && hideMobileHeader && !allowFoldableSplitView ? (
        <div className="absolute inset-0 z-10 bg-black">
          {renderMobileThreadPane(true, true)}
        </div>
      ) : null}
      {selectedThread && !isFoldableSplitView && !(embedded && hideMobileHeader && !allowFoldableSplitView) && (
        <div
          className="absolute inset-x-0 top-0 z-10 flex flex-col bg-black"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)" }}
        >
          {/* Thread header */}
          <div
            className="bg-black px-5 pb-3 flex items-center gap-3 shrink-0"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}
          >
            <button onClick={() => {
              setSelectedThread(null)
              setFoldCommsThread(null)
              onDirectThreadActiveChange?.(false)
            }} className="mr-1">
              <ArrowLeft size={22} className="text-white" />
            </button>
            {selectedThread.type === "channel" ? (
              <Avatar name={getThreadName(selectedThread)} size={40} uid={selectedThread.id} />
            ) : (() => {
              const av = getThreadAvatar(selectedThread)
              return av ? <Avatar name={av.displayName} size={40} uid={av.uid} /> : <Avatar name="?" size={40} />
            })()}
            <button
              type="button"
              onClick={() => {
                if (selectedThread.type === "direct" && selectedDirectContact) {
                  setShowDirectContactSheet(true)
                } else if (selectedThread.subtype === "group") {
                  setShowSpaceInfo(true)
                }
              }}
              className={`min-w-0 flex-1 text-left ${selectedThread.type === "direct" || selectedThread.subtype === "group" ? "cursor-pointer" : "cursor-default"}`}
            >
              <p className="text-white text-base font-semibold truncate">{getThreadName(selectedThread)}</p>
              {selectedThread.type === "direct" && (
                <p className="text-sm text-white/60">
                  {showTomTyping || otherIsTyping ? "typing..." : isOnline(getOtherUid(selectedThread)) ? "Online" : "Offline"}
                </p>
              )}
              {selectedThread.subtype === "group" && (
                <p className="text-sm text-white/60">{selectedThread.memberUids.length} member{selectedThread.memberUids.length !== 1 ? "s" : ""} · tap for info</p>
              )}
              {selectedThread.type === "channel" && selectedThread.subtype !== "group" && selectedThread.description && (
                <p className="truncate text-sm text-white/60">{selectedThread.description}</p>
              )}
            </button>
            <div className="flex items-center gap-2">
              {selectedThread.type === "direct" && !hideThreadHeaderCallButtons && (
                <>
                  {/* Audio call button â€" red hang-up when audio call active, grey when video call active, blue otherwise */}
                  <button
                    onClick={
                      callState === "active" && callMediaMode === "audio" ? () => void endCall()
                      : callState === "idle" ? () => void initiateCall(getOtherUid(selectedThread), selectedThread.id, "audio")
                      : undefined
                    }
                    disabled={callState !== "idle" && !(callState === "active" && callMediaMode === "audio")}
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                      callState === "active" && callMediaMode === "audio"
                        ? "bg-[#ef4444]"
                      : callState !== "idle"
                        ? "cursor-not-allowed bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] opacity-40"
                        : "bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] shadow-[0_12px_26px_rgba(0,150,199,0.28)] hover:bg-[#0085B2]"
                    }`}
                  >
                    {callState === "active" && callMediaMode === "audio"
                      ? <PhoneOff size={17} className="text-white" />
                      : <Phone size={17} className="text-white" />}
                  </button>
                  {!isTomConversation ? (
                    <button
                      onClick={
                        callState === "active" && callMediaMode === "video" ? switchToAudio
                        : canJoinExistingVideoCall ? switchToVideo
                        : shouldRequestVideoApproval ? () => void requestVideo()
                        : callState === "idle" ? () => void initiateCall(getOtherUid(selectedThread), selectedThread.id, "video")
                        : undefined
                      }
                      disabled={callState === "incoming" || callState === "outgoing"}
                      className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                        callState === "active" && callMediaMode === "video"
                          ? "bg-[#ef4444]"
                        : (callState === "incoming" || callState === "outgoing")
                          ? "cursor-not-allowed bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] opacity-40"
                          : "bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] shadow-[0_12px_26px_rgba(0,150,199,0.28)] hover:bg-[#0085B2]"
                      }`}
                    >
                      {callState === "active" && callMediaMode === "video"
                        ? <PhoneOff size={17} className="text-white" />
                        : <Video size={17} className="text-white" />}
                    </button>
                  ) : null}
                </>
              )}
              <button
                type="button"
                onClick={() => setShowGlobalSearch(true)}
                className="text-white hover:text-white"
                aria-label="Search"
              >
                <Search size={20} />
              </button>
              <button
                type="button"
                onClick={() => setShowProfile(true)}
                className="text-white hover:text-white"
                aria-label="More options"
              >
                <MoreVertical size={22} />
              </button>
            </div>
          </div>

          {/* Messages container with emoji overlay */}
          <div className="relative flex-1 min-h-0">
          <div
            className="absolute inset-0 overflow-y-auto overscroll-contain bg-black px-4 py-4 space-y-1 [touch-action:pan-y]"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {messages.map((msg, idx) => {
              const isOwn = msg.uid === user.uid
              const isTom = msg.uid === TOM_UID
              const isSystem = msg.type === "system"
              const prevMsg = messages[idx - 1]
              const showSenderName = selectedThread.type === "channel" && !isOwn && (!prevMsg || prevMsg.uid !== msg.uid)
              const showIncomingAvatar = !isOwn && (showSenderName || isTom)
              const messageText = repairMojibake(msg.text)
              const pingState = msg.ping ? (pingById.get(msg.ping.pingId) ?? null) : null
              const pingTone = getPingLiveTone(pingState, pingNow)
              const pingElapsed = pingState ? getPingDisplayElapsed(pingState, pingNow) : null
              const pingHeadline = msg.ping
                ? (isOwn ? `You pinged ${msg.ping.recipientDisplayName}` : `${msg.displayName} pinged you`)
                : null
              const emojiOnly = !msg.attachments?.length && !msg.deleted && isEmojiOnly(messageText)
              const hasImageAttachment = Boolean(msg.attachments?.some((att) => att.type === "image"))
              const hasNonImageAttachment = Boolean(msg.attachments?.some((att) => att.type !== "image"))
              const imageOnlyMessage =
                hasImageAttachment &&
                !hasNonImageAttachment &&
                !messageText.trim() &&
                !msg.replyTo

              if (msg.type === "call" || (isSystem && messageText.startsWith("📞"))) {
                const answered = msg.callAnswered ?? messageText.includes("Voice call")
                const isOutgoing = msg.uid === user.uid
                const missed = !answered
                const callTime = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                const durationStr = msg.callDuration ? formatCallDuration(msg.callDuration) : null
                const IconComp = missed ? PhoneMissed : isOutgoing ? PhoneOutgoing : PhoneIncoming
                const iconColor = missed ? "text-red-400" : isOutgoing ? "text-[#0096C7]" : "text-emerald-400"
                const label = missed ? "Missed call" : isOutgoing ? "Outgoing call" : "Incoming call"
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <div className={`flex items-center gap-2 rounded-full border border-[#2d2d2d] bg-[#1a1a1a] px-3 py-1.5 ${iconColor}`}>
                      <IconComp size={13} strokeWidth={2} className="shrink-0" />
                      <span className="text-[12px] font-medium text-[#e0e0e0]">{label}</span>
                      <span className="text-[12px] text-[#555]">·</span>
                      <span className="text-[12px] text-[#666]">{callTime}{durationStr ? ` · ${durationStr}` : ""}</span>
                    </div>
                  </div>
                )
              }
              if (isSystem) return (
                <div key={msg.id} className="flex justify-center my-3">
                  <span className="bg-[#1c1c1c] text-white text-sm px-4 py-1.5 rounded-full">{messageText}</span>
                </div>
              )
              if (msg.deleted) return (
                <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <span className="text-sm text-white italic px-3 py-1">This message was deleted</span>
                </div>
              )

              return (
                <div key={msg.id}
                  className={`flex ${isOwn ? "flex-row-reverse" : "flex-row"} items-end ${showSenderName ? "gap-2" : "gap-0.5"} group`}
                >
                  {!isOwn ? (
                    <div className={`shrink-0 ${showIncomingAvatar ? "w-8" : "w-1"}`}>
                      {showIncomingAvatar && <Avatar name={msg.displayName} size={32} uid={msg.uid} />}
                    </div>
                  ) : null}

                  <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[84%]`}>
                    {!isOwn && showSenderName && (
                      <span className="text-sm text-[#0096C7] mb-1 ml-1">{msg.displayName}</span>
                    )}

                    {msg.replyTo && (
                      <div className={`text-sm text-white bg-[#1c1c1c] rounded-t-xl px-3 py-2 border-l-2 border-[#29b6d8] mb-0.5 max-w-full ${isOwn ? "rounded-bl-xl" : "rounded-br-xl"}`}>
                        <span className="text-[#29b6d8]">{msg.replyTo.displayName}</span>: {repairMojibake(msg.replyTo.text).slice(0, 60)}{msg.replyTo.text.length > 60 ? "..." : ""}
                      </div>
                    )}

                    {editingMessage?.id === msg.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          autoFocus
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") { setEditingMessage(null); setEditText("") } }}
                          className="flex-1 bg-[#111111] border border-[#29b6d8] rounded-xl px-3 py-2 text-[16px] text-[#e0e0e0] outline-none"
                        />
                        <button onClick={saveEdit}><Check size={18} className="text-[#29b6d8]" /></button>
                        <button onClick={() => { setEditingMessage(null); setEditText("") }}><X size={18} className="text-gray-400" /></button>
                      </div>
                    ) : (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={event => {
                          if (!suppressMessageTapRef.current) return
                          suppressMessageTapRef.current = false
                          event.preventDefault()
                        }}
                        onKeyDown={event => {
                          if (event.key !== "Enter" && event.key !== " ") return
                          event.preventDefault()
                          openMessageActions(event.currentTarget, msg, isOwn, true)
                        }}
                        onContextMenu={event => {
                          event.preventDefault()
                          openMessageActions(event.currentTarget, msg, isOwn, true)
                        }}
                        onPointerDown={event => {
                          if (event.pointerType === "mouse") return
                          if (isNestedInteractiveTarget(event.target, event.currentTarget)) return
                          suppressMessageTapRef.current = false
                          clearMessageLongPress()
                          const target = event.currentTarget
                          messageLongPressTimerRef.current = setTimeout(() => {
                            suppressMessageTapRef.current = true
                            openMessageActions(target, msg, isOwn, true)
                          }, 420)
                        }}
                        onPointerUp={() => clearMessageLongPress()}
                        onPointerCancel={() => clearMessageLongPress()}
                        onPointerLeave={() => clearMessageLongPress()}
                        className={`relative text-left text-[14px] leading-snug ${
                          emojiOnly
                            ? ""
                            : imageOnlyMessage
                              ? isOwn
                                ? "overflow-hidden rounded-[22px] bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] p-[3px] text-white shadow-[0_16px_34px_rgba(0,150,199,0.22)]"
                                : isTom
                                  ? "overflow-hidden rounded-[22px] bg-[#138496] p-[3px] text-white shadow-[0_16px_34px_rgba(19,132,150,0.3)]"
                                  : "overflow-hidden rounded-[22px] bg-[#0b4b63] p-[3px] text-white shadow-[0_16px_34px_rgba(0,0,0,0.2)]"
                              : isOwn
                                  ? "px-3 py-1.5 rounded-2xl bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] text-white rounded-br-sm"
                                : isTom
                                  ? "px-3 py-1.5 rounded-2xl bg-[#138496] text-white rounded-bl-sm"
                                  : "px-3 py-1.5 rounded-2xl bg-[#003d54] text-white rounded-bl-sm"
                        }`}>
                        {msg.attachments?.map((att, ai) => renderMessageAttachment(att, ai, isOwn, msg))}
                        {pingHeadline ? (
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <div className="text-[11px] font-medium text-white/78">
                              {pingHeadline}
                            </div>
                            {pingElapsed ? (
                              <div className={`shrink-0 text-[11px] font-medium tabular-nums ${pingTone.timerTone}`}>
                                {pingElapsed}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {msg.ping && pingTone.label ? (
                          <div className={`mb-1 text-[11px] ${isOwn ? "text-white/74" : "text-white/58"}`}>{pingTone.label}</div>
                        ) : null}
                        {emojiOnly ? (() => {
                          const segs = segmentEmoji(messageText)
                          const sz = segs.length === 1 ? 64 : segs.length <= 3 ? 52 : 44
                          return (
                            <div className="flex flex-wrap gap-1 py-1">
                              {segs.map((em, i) => {
                                const url = emojiToNotoUrl(em)
                                return url ? (
                                  <img
                                    key={i}
                                    src={url}
                                    alt={em}
                                    width={sz}
                                    height={sz}
                                    className="object-contain"
                                    onError={(e) => {
                                      const t = e.currentTarget
                                      const span = document.createElement("span")
                                      span.textContent = em
                                      span.style.fontSize = `${sz}px`
                                      span.style.lineHeight = "1"
                                      t.replaceWith(span)
                                    }}
                                  />
                                ) : (
                                  <span key={i} style={{ fontSize: sz, lineHeight: 1 }}>{em}</span>
                                )
                              })}
                            </div>
                          )
                        })() : messageText}
                        {msg.edited && !emojiOnly && <span className={`ml-1 text-xs ${isOwn ? "text-white" : "text-white"}`}>(edited)</span>}
                      </div>
                    )}

                    {msg.reactions && Object.entries(msg.reactions).filter(([, uids]) => uids.length > 0).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {Object.entries(msg.reactions).map(([emoji, uids]) =>
                          uids.length > 0 && (
                            <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm leading-none ${
                                uids.includes(user.uid) ? "border-[#0096C7]/60 bg-[#003d54] text-white" : "border-[#2d2d2d] bg-[#1c1c1c] text-[#e0e0e0]"
                              }`}>
                              {emoji} {uids.length}
                            </button>
                          )
                        )}
                      </div>
                    )}

                    {renderMessageMeta(msg, isOwn)}
                  </div>

                </div>
              )
            })}
            {(otherIsTyping || showTomTyping || showTomOperatorTyping) && (
              <div className="flex items-end gap-0.5">
                <div className="w-1 shrink-0" />
                <div className="flex max-w-[84%] flex-col items-start">
                  <div className="rounded-2xl rounded-bl-sm bg-[#138496] px-3 py-1.5 text-left text-[14px] leading-snug text-white">
                    <TypingDots tone={showTomTyping || showTomOperatorTyping ? "tom" : "default"} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Emoji overlay — z-[25] sits above the z-20 action backdrop so category buttons are clickable */}
          {(showEmojiPicker === "drawer" || showEmojiPicker === "input") && (
            <div className="absolute right-0 inset-y-0 z-[25] w-[162px] bg-black border-l border-[#2d2d2d] overflow-hidden flex flex-col"
              style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
              <EmojiPicker
                variant="drawer"
                onSelect={e => {
                  if (showEmojiPicker === "input") {
                    setInputText(prev => prev + e)
                    setShowEmojiPicker(null)
                    return
                  }
                  if (!actionMessage) return
                  void toggleReaction(actionMessage.id, e)
                  setShowEmojiPicker(null)
                  setActionMessage(null)
                  setActionBoxPosition(null)
                }}
                onClose={() => setShowEmojiPicker(null)}
              />
            </div>
          )}
          {showPingPicker && (
            <div className="absolute right-0 inset-y-0 z-[25] w-[162px] bg-black border-l border-[#2d2d2d] overflow-hidden flex flex-col"
              style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
              <div className="border-b border-[#2d2d2d] px-3 py-2 flex items-center justify-between shrink-0">
                <span className="text-[11px] font-medium text-white uppercase tracking-wide">Ping type</span>
                <button onClick={() => setShowPingPicker(null)}><X size={12} className="text-white" /></button>
              </div>
              <div className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-1">
                {PING_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      if (showPingPicker === "composer") {
                        setPendingPingCategory(cat.id)
                        setShowPingPicker(null)
                      } else if (showPingPicker === "longpress" && actionMessage) {
                        const msg = actionMessage
                        setShowPingPicker(null)
                        setActionMessage(null)
                        void createPing(cat.id, repairMojibake(msg.text), selectedThread!, msg.id)
                      }
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-[13px] text-[#e0e0e0] bg-[#1c1c1c] hover:bg-[#242424] active:bg-[#2e2e2e] transition-colors"
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          </div>{/* end messages container */}

          {/* Reply banner */}
          {replyTo && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0d1a22] border-t border-[#2d2d2d] shrink-0">
              <div className="flex-1 min-w-0">
                <span className="text-sm text-[#29b6d8]">{replyTo.displayName}</span>
                <p className="text-sm text-white truncate">{repairMojibake(replyTo.text)}</p>
              </div>
              <button onClick={() => setReplyTo(null)}><X size={16} className="text-white" /></button>
            </div>
          )}

          {/* Input */}
          <div
            className="bg-black shrink-0 relative px-4 pt-2"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 6px)" }}
          >
            {renderPinnedActivePingBar()}
            {composerError ? (
              <div className="mb-2 rounded-xl border border-[#5a3d08] bg-[#2c1f05] px-3 py-2 text-[12px] text-[#f7c873]">
                {composerError}
              </div>
            ) : null}
            <div className="flex items-center gap-2 rounded-2xl border border-[#2d2d2d] bg-[#111111] px-3 py-1.5 pr-2">
              <button onClick={() => fileInputRef.current?.click()} className="text-white shrink-0">
                <Paperclip size={17} />
              </button>
              <button
                onClick={() => setShowPingPicker(showPingPicker === "composer" ? null : "composer")}
                className="shrink-0"
                aria-label="Ping"
              >
                <Zap size={17} strokeWidth={2} className={pendingPingCategory ? "text-[#0e7490]" : "text-[#00b8d4]"} fill={pendingPingCategory ? "#0e7490" : "none"} />
              </button>
              <input type="file" ref={fileInputRef} className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = "" }} />
              {pendingPingCategory && !isRecordingVoice && !recordedVoiceBlob && (
                <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full bg-[#0e7490]/20 border border-[#0e7490]/50">
                  <span className="text-[11px] text-[#5bc8da] font-medium">{PING_CATEGORIES.find(c => c.id === pendingPingCategory)?.label}</span>
                  <button onClick={() => setPendingPingCategory(null)} className="text-[#5bc8da]"><X size={9} /></button>
                </div>
              )}
              {isRecordingVoice || recordedVoiceBlob ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <button
                    type="button"
                    onClick={cancelVoiceRecording}
                    className="shrink-0 px-1 text-[13px] text-white transition-colors hover:text-white"
                  >
                    cancel
                  </button>
                  <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[18px] border border-[#26343a] bg-[#0f1315] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    {isRecordingVoice ? (
                      <>
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-[#ef4444] animate-pulse" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] tracking-[0.08em] text-[#6fa8b6]">recording</p>
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className="h-1.5 w-2.5 rounded-full bg-[#1e6376]/45" />
                              <span className="h-2 w-3 rounded-full bg-[#2586a1]/65" />
                              <span className="h-3 w-3.5 rounded-full bg-[#29b6d8]" />
                              <span className="h-2 w-3 rounded-full bg-[#2586a1]/65" />
                              <span className="h-1.5 w-2.5 rounded-full bg-[#1e6376]/45" />
                            </div>
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-[12px] text-[#d2d8db]">{formatRecordingDuration(recordingElapsed)}</span>
                        <button
                          type="button"
                          onClick={stopVoiceRecording}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#304047] bg-[#151b1d] text-white transition-colors hover:border-[#3d5964] hover:bg-[#1b2326]"
                          aria-label="Stop recording"
                        >
                          <Square size={11} fill="currentColor" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => void toggleVoicePreviewPlayback()}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#304047] bg-[#151b1d] text-white transition-colors hover:border-[#3d5964] hover:bg-[#1b2326]"
                          aria-label={isVoicePreviewPlaying ? "Pause voice note preview" : "Play voice note preview"}
                        >
                          {isVoicePreviewPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] text-[#f2f4f5]">voice note ready</p>
                          <p className="mt-0.5 text-[12px] text-[#6fa8b6]">{formatRecordingDuration(recordingElapsed)}</p>
                        </div>
                        <audio ref={voicePreviewRef} src={recordedVoiceUrl ?? undefined} preload="metadata" className="hidden" />
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <input
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder="Message…"
                  className="min-w-0 flex-1 bg-transparent text-[15px] text-[#e0e0e0] placeholder-[#555555] outline-none"
                />
              )}
              {!isRecordingVoice && !recordedVoiceBlob ? (
                <button onClick={() => setShowEmojiPicker(showEmojiPicker === "input" ? null : "input")}
                  className="text-white shrink-0">
                  <Smile size={17} />
                </button>
              ) : null}
              {recordedVoiceBlob ? (
                <button
                  type="button"
                  onClick={() => void sendVoiceMessage()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] shadow-[0_12px_26px_rgba(0,150,199,0.28)]"
                  aria-label="Send voice message"
                >
                  <Send size={13} className="text-white" />
                </button>
              ) : inputText.trim() || isTomConversation ? (
                <button onClick={() => sendMessage()} disabled={!inputText.trim()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] shadow-[0_12px_26px_rgba(0,150,199,0.28)] disabled:opacity-40">
                  <Send size={13} className="text-white" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void startVoiceRecording()}
                  disabled={isRecordingVoice}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] shadow-[0_12px_26px_rgba(0,150,199,0.28)] disabled:opacity-40"
                  aria-label="Record voice message"
                >
                  <Mic size={13} className="text-white" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {showDirectContactSheet && selectedDirectContact ? (
        <div className="absolute inset-0 z-30 flex items-end bg-black/60" onClick={() => setShowDirectContactSheet(false)}>
          <div
            className="w-full rounded-t-[24px] border-t border-white/10 bg-[#0f0f0f] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+18px)] pt-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#2a2a2a]" />
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <Avatar name={selectedDirectContact.displayName} size={52} uid={selectedDirectContact.uid} />
              <div className="min-w-0">
                <p className="truncate text-[18px] text-white">{selectedDirectContact.displayName}</p>
                <p className="mt-1 text-[12px] text-white/60">
                  {isOnline(selectedDirectContact.uid) ? "Online" : "Offline"}
                </p>
              </div>
            </div>
            <div className="space-y-3 pt-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">Role</p>
                <p className="mt-1 text-[14px] text-white">{selectedDirectContact.clinicalRole?.trim() || "Not set"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">Band / Grade</p>
                <p className="mt-1 text-[14px] text-white">{selectedDirectContact.groupLabel?.trim() || "Not set"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">Email</p>
                <p className="mt-1 break-all text-[14px] text-white">{selectedDirectContact.email?.trim() || "Not set"}</p>
              </div>
              {selectedDirectContact.department?.trim() ? (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">Department</p>
                  <p className="mt-1 text-[14px] text-white">{selectedDirectContact.department.trim()}</p>
                </div>
              ) : null}
              {selectedDirectContact.hospital?.trim() ? (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">Hospital</p>
                  <p className="mt-1 text-[14px] text-white">{selectedDirectContact.hospital.trim()}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• MESSAGE ACTION OVERLAY (tap-hold bubble) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {lightboxImage ? (
        <div className="absolute inset-0 z-40 flex flex-col bg-black" onClick={() => setLightboxImage(null)}>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 py-4" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white"
              aria-label="Close image preview"
            >
              <X size={18} />
            </button>
            <img
              src={lightboxImage.attachment.url}
              alt={lightboxImage.attachment.name}
              className="max-h-full max-w-full rounded-[18px] bg-[#071017] object-contain shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
            />
          </div>
          <div className="shrink-0 border-t border-white/10 bg-[#0a0f14] px-4 py-3" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-[13px] text-white">{lightboxImage.senderName}</p>
              <p className="shrink-0 text-[12px] text-[#7f96a3]">{new Date(lightboxImage.createdAt).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
            </div>
            {lightboxImage.description ? (
              <p className="mt-2 text-[14px] leading-relaxed text-white">{lightboxImage.description}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      {actionMessage && (
        <div className="absolute inset-0 z-20">
          <div className="absolute inset-0" onClick={() => { setActionMessage(null); setActionBoxPosition(null); setShowEmojiPicker(null) }} />
          <div
            className="absolute"
            style={{
              top: actionBoxPosition?.top ?? 24,
              left: actionBoxPosition?.left ?? 16,
            }}
          >
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  triggerHapticPulse()
                  setShowEmojiPicker(showEmojiPicker === "drawer" ? null : "drawer")
                }}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] text-white shadow-[0_10px_24px_rgba(26,134,200,0.28)] transition hover:scale-[1.03]"
                aria-label="More reactions"
              >
                <Smile size={17} />
              </button>
              <button
                onClick={() => {
                  triggerHapticPulse()
                  setReplyTo(actionMessage)
                  setActionMessage(null)
                  setActionBoxPosition(null)
                }}
                className="group flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] text-white shadow-[0_10px_24px_rgba(26,134,200,0.28)] transition hover:scale-[1.03]"
                aria-label="Reply"
              >
                <Reply size={18} className="transition group-hover:scale-110" />
              </button>
              <button
                onClick={() => {
                  triggerHapticPulse()
                  setForwardingMessage(actionMessage)
                  setShowNewDM(true)
                  setActionMessage(null)
                  setActionBoxPosition(null)
                }}
                className="group flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] text-white shadow-[0_10px_24px_rgba(26,134,200,0.28)] transition hover:scale-[1.03]"
                aria-label="Forward"
              >
                <Forward size={18} className="transition group-hover:translate-x-0.5" />
              </button>
              {!actionMessage.deleted ? (
                <button
                  onClick={() => {
                    triggerHapticPulse()
                    setShowPingPicker("longpress")
                    setActionBoxPosition(null)
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] text-white shadow-[0_10px_24px_rgba(26,134,200,0.28)] transition hover:scale-[1.03]"
                  aria-label="Ping"
                >
                  <Zap size={17} />
                </button>
              ) : null}
              {actionMessage.uid === user.uid && !actionMessage.deleted ? (
                <button
                  onClick={() => {
                    triggerHapticPulse()
                    void deleteMessage(actionMessage.id)
                    setActionMessage(null)
                    setActionBoxPosition(null)
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] text-white shadow-[0_10px_24px_rgba(26,134,200,0.28)] transition hover:scale-[1.03]"
                  aria-label="Delete"
                >
                  <Trash2 size={17} />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {showContacts && !embedded && (
        <div className="absolute inset-0 z-20 flex">
          {/* Panel */}
          <div
            className="fixed inset-y-0 left-0 z-30 flex h-[100dvh] w-[78%] flex-col rounded-r-[34px] border-r border-[#2d2d2d] bg-[#1c1c1c] shadow-[12px_0_28px_rgba(0,0,0,0.4)]"
            style={{
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
              animation: "slideInLeft 0.25s ease-out",
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#2d2d2d] px-6 pt-10 pb-4">
              <div>
                <h2 className="text-[32px] tracking-[-0.05em] text-[#e0e0e0]">Contacts</h2>
                <p className="mt-0.5 text-sm text-white">{org.name}</p>
              </div>
              <button
                onClick={() => setShowContacts(false)}
                className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#2d2d2d] text-[#e0e0e0]"
              >
                <ArrowLeft size={18} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
              {displayedContactMembers.filter(m => isOnline(m.uid)).length > 0 && (
                <>
                  <p className="mb-3 mt-2 text-xs tracking-[0.14em] text-white">available</p>
                  {displayedContactMembers.filter(m => isOnline(m.uid)).map(m => (
                    <button key={m.uid} onClick={() => startDM(m.uid)}
                      className="flex w-full items-center gap-4 border-b border-[#2d2d2d] py-2.5">
                      <div className="relative">
                        <Avatar name={m.displayName} size={44} uid={m.uid} />
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#1c1c1c] bg-emerald-400" />
                      </div>
                      <div className="flex flex-1 items-center gap-3 text-left text-[15px] text-[#e0e0e0]">
                        <span className="min-w-0 flex-1 truncate">{m.displayName}</span>
                        <span className="w-[52px] shrink-0 text-right text-sm text-emerald-400">online</span>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {displayedContactMembers.filter(m => !isOnline(m.uid)).length > 0 && (
                <>
                  <p className="mb-3 mt-6 text-xs tracking-[0.14em] text-white">offline</p>
                  {displayedContactMembers.filter(m => !isOnline(m.uid)).map(m => (
                    <button key={m.uid} onClick={() => startDM(m.uid)}
                      className="flex w-full items-center gap-4 border-b border-[#2d2d2d] py-2.5">
                      <div className="relative">
                        <Avatar name={m.displayName} size={44} uid={m.uid} />
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#1c1c1c] bg-[#555555]" />
                      </div>
                      <div className="flex flex-1 items-center gap-3 text-left text-[15px] text-white">
                        <span className="min-w-0 flex-1 truncate">{m.displayName}</span>
                        <span className="w-[52px] shrink-0 text-right text-sm text-white">offline</span>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {displayedContactMembers.length === 0 && (
                <p className="mt-20 text-center text-sm text-white">
                  No members yet.<br />Code: <span className="tracking-widest text-[#0096C7]">{org.joinCode}</span>
                </p>
              )}
            </div>

          </div>

          {/* Tap-outside to close */}
          <div className="flex-1 bg-black/50" onClick={() => setShowContacts(false)} />
        </div>
      )}

      {showContacts && embedded && embeddedContactsBounds ? (
        <>
          <button
            type="button"
            onClick={() => setShowContacts(false)}
            className="fixed inset-0 z-20 bg-black/50"
            aria-label="Close contacts"
          />
          <div
            className="fixed inset-y-0 left-0 z-30 flex h-[100dvh] w-[78%] flex-col rounded-r-[34px] border-r border-[#2d2d2d] bg-[#1c1c1c] shadow-[12px_0_28px_rgba(0,0,0,0.4)] lg:hidden"
            style={{
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="flex items-start justify-between border-b border-[#2d2d2d] px-6 pt-10 pb-4">
              <div>
                <h2 className="text-[32px] tracking-[-0.05em] text-[#e0e0e0]">Contacts</h2>
                <p className="mt-0.5 text-sm text-white">{org.name}</p>
              </div>
              <button
                onClick={() => setShowContacts(false)}
                className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#0096C7] text-white"
              >
                <ArrowRight size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2">
              {displayedContactMembers.filter(m => isOnline(m.uid)).length > 0 && (
                <>
                  <p className="mb-3 mt-2 text-xs tracking-[0.14em] text-white">available</p>
                  {displayedContactMembers.filter(m => isOnline(m.uid)).map(m => (
                    <button key={m.uid} onClick={() => startDM(m.uid)}
                      className="flex w-full items-center gap-4 border-b border-[#2d2d2d] py-2.5">
                      <div className="relative">
                        <Avatar name={m.displayName} size={44} uid={m.uid} />
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#1c1c1c] bg-emerald-400" />
                      </div>
                      <div className="flex flex-1 items-center gap-3 text-left text-[15px] text-[#e0e0e0]">
                        <span className="min-w-0 flex-1 truncate">{m.displayName}</span>
                        <span className="w-[52px] shrink-0 text-right text-sm text-emerald-400">online</span>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {displayedContactMembers.filter(m => !isOnline(m.uid)).length > 0 && (
                <>
                  <p className="mb-3 mt-6 text-xs tracking-[0.14em] text-white">offline</p>
                  {displayedContactMembers.filter(m => !isOnline(m.uid)).map(m => (
                    <button key={m.uid} onClick={() => startDM(m.uid)}
                      className="flex w-full items-center gap-4 border-b border-[#2d2d2d] py-2.5">
                      <div className="relative">
                        <Avatar name={m.displayName} size={44} uid={m.uid} />
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#1c1c1c] bg-[#555555]" />
                      </div>
                      <div className="flex flex-1 items-center gap-3 text-left text-[15px] text-white">
                        <span className="min-w-0 flex-1 truncate">{m.displayName}</span>
                        <span className="w-[52px] shrink-0 text-right text-sm text-white">offline</span>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {displayedContactMembers.length === 0 && (
                <p className="mt-20 text-center text-sm text-white">
                  No members yet.<br />Code: <span className="tracking-widest text-[#0096C7]">{org.joinCode}</span>
                </p>
              )}
            </div>
          </div>
          <div
            className="fixed z-30 hidden flex-col overflow-hidden rounded-l-[32px] rounded-r-[26px] border border-[rgba(145,214,230,0.72)] bg-[rgba(222,247,252,0.88)] shadow-[0_28px_80px_rgba(31,124,150,0.18)] backdrop-blur-[24px] lg:flex"
            style={{
              top: embeddedContactsBounds.top,
              left: Math.max(16, embeddedContactsBounds.left - 316),
              width: 316,
              height: embeddedContactsBounds.height,
            }}
          >
            <div className="px-5 pt-7 pb-4 flex items-start justify-between border-b border-[rgba(137,193,210,0.42)]">
              <div>
                <h2 className="text-[#176d8c] text-[30px] tracking-[-0.05em]">Contacts</h2>
                <p className="text-[#3d89a0] text-sm mt-1">{org.name}</p>
              </div>
              <button
                onClick={() => setShowContacts(false)}
                className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#0096C7] text-white shadow-[0_12px_26px_rgba(0,150,199,0.28)] transition-colors hover:bg-[#0085B2]"
              >
                <ArrowRight size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3">
              {displayedContactMembers.filter(m => isOnline(m.uid)).length > 0 && (
                <>
                  <p className="mb-3 mt-2 text-xs tracking-[0.14em] text-[#67a7ba]">available</p>
                  {displayedContactMembers.filter(m => isOnline(m.uid)).map(m => (
                    <button key={m.uid} onClick={() => startDM(m.uid)}
                      className="flex w-full items-center gap-4 border-b border-[rgba(137,193,210,0.22)] py-2.5">
                      <div className="relative">
                        <Avatar name={m.displayName} size={44} uid={m.uid} />
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#dff5fb] rounded-full" />
                      </div>
                      <div className="flex flex-1 items-center gap-3 text-left text-[15px] text-[#154b5f]">
                        <span className="min-w-0 flex-1 truncate">{m.displayName}</span>
                        <span className="w-[52px] shrink-0 text-right text-sm text-emerald-500">online</span>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {displayedContactMembers.filter(m => !isOnline(m.uid)).length > 0 && (
                <>
                  <p className="mb-3 mt-6 text-xs tracking-[0.14em] text-[#67a7ba]">offline</p>
                  {displayedContactMembers.filter(m => !isOnline(m.uid)).map(m => (
                    <button key={m.uid} onClick={() => startDM(m.uid)}
                      className="flex w-full items-center gap-4 border-b border-[rgba(137,193,210,0.22)] py-2.5">
                      <div className="relative">
                        <Avatar name={m.displayName} size={44} uid={m.uid} />
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-white/75 border-2 border-[#dff5fb] rounded-full" />
                      </div>
                      <div className="flex flex-1 items-center gap-3 text-left text-[15px] text-[#3d6c7f]">
                        <span className="min-w-0 flex-1 truncate">{m.displayName}</span>
                        <span className="w-[52px] shrink-0 text-right text-sm text-[#7aa8b7]">offline</span>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {displayedContactMembers.length === 0 && (
                <p className="text-[#7aa8b7] text-sm text-center mt-20">
                  No members yet.<br />Code: <span className="text-[#176d8c] tracking-widest">{org.joinCode}</span>
                </p>
              )}
            </div>

          </div>
        </>
      ) : null}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• NEW DM OVERLAY â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {showNewDM && (
        <div className="absolute inset-0 bg-[#0d1b2a] z-20 flex flex-col">
          <div
            className="px-5 pb-4 flex items-center justify-between border-b border-white/10"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}
          >
            <span className="text-white text-lg">New message</span>
            <button onClick={() => setShowNewDM(false)}><X size={22} className="text-white" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}>
            {displayedContactMembers.map(m => (
              <button key={m.uid} onClick={() => startDM(m.uid)}
                className="w-full flex items-center gap-4 py-3.5 border-b border-white/5">
                <div className="relative">
                  <Avatar name={m.displayName} size={48} uid={m.uid} />
                  {isOnline(m.uid) && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#0d1b2a] rounded-full" />
                  )}
                </div>
                <div className="flex flex-1 items-center gap-3 text-left text-[15px] text-white">
                  <span className="min-w-0 flex-1 truncate">{m.displayName}</span>
                  <span className={`w-[52px] shrink-0 text-right text-sm ${isOnline(m.uid) ? "text-emerald-400" : "text-gray-500"}`}>
                    {isOnline(m.uid) ? "online" : "offline"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• NEW CHANNEL MODAL â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• PROFILE DRAWER â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {showProfile && (
        <div className="absolute inset-0 z-30">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowProfile(false)} />
          <div className="fixed inset-y-0 right-0 z-30 flex h-[100dvh] w-72 flex-col rounded-l-[34px] border-l border-[#2d2d2d] bg-[#1c1c1c] shadow-[-12px_0_28px_rgba(0,0,0,0.4)] lg:hidden"
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="border-b border-[#2d2d2d] px-5 pt-12 pb-6">
              <div className="mb-6 flex items-center justify-between">
                <span className="text-[#e0e0e0]">Profile</span>
                <button onClick={() => setShowProfile(false)}><X size={20} className="text-white" /></button>
              </div>
              <div className="flex flex-col items-center">
                <Avatar name={displayName} size={70} uid={user.uid} />
                <p className="mt-3 text-[15px] text-[#e0e0e0]">{user.displayName}</p>
                <p className="mt-1 text-sm text-[#0096C7]">{clinicalRoleLabel}</p>
                <p className="mt-1 text-sm text-white">{user.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-sm text-emerald-400">Online</span>
                </div>
              </div>
            </div>
            <div className="border-b border-[#2d2d2d] px-5 py-4">
              <p className="mb-3 text-xs tracking-widest text-white">workspace</p>
              <p className="text-[15px] text-[#e0e0e0]">{hospitalLabel}</p>
              <p className="mt-1 text-sm text-white">{groupLabel}</p>
              <p className="mt-1 text-sm text-white">
                Join code: <span className="tracking-widest text-[#0096C7]">{org.joinCode}</span>
              </p>
            </div>
            <div className="flex flex-1 flex-col gap-1 px-5 py-4">
              <button className="flex items-center gap-3 py-3.5 text-[15px] text-white">
                <Settings size={18} /> Settings
              </button>
              <button onClick={handleSwitchOrg} className="flex items-center gap-3 py-3.5 text-[15px] text-white">
                <ChevronDown size={18} /> Switch workspace
              </button>
              <button onClick={handleSignOut} className="mt-2 flex items-center gap-3 py-3.5 text-[15px] text-red-400">
                <LogOut size={18} /> Sign out
              </button>
            </div>
          </div>
          <div className="absolute inset-y-0 right-0 hidden w-72 flex-col rounded-l-[34px] border-l border-[rgba(168,221,234,0.72)] bg-[linear-gradient(180deg,rgba(214,243,250,0.96)_0%,rgba(233,248,252,0.94)_46%,rgba(222,243,249,0.98)_100%)] shadow-[-18px_0_44px_rgba(31,124,150,0.14)] backdrop-blur-[14px] lg:flex"
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="border-b border-[rgba(137,193,210,0.34)] px-5 pt-12 pb-6">
              <div className="mb-6 flex items-center justify-between">
                <span className="text-[#176d8c]">Profile</span>
                <button onClick={() => setShowProfile(false)}><X size={20} className="text-[#6f9db0]" /></button>
              </div>
              <div className="flex flex-col items-center">
                <Avatar name={displayName} size={70} uid={user.uid} />
                <p className="mt-3 text-[15px] text-[#154b5f]">{user.displayName}</p>
                <p className="mt-1 text-sm text-[#1b86ae]">{clinicalRoleLabel}</p>
                <p className="mt-1 text-sm text-[#7a9aa8]">{user.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-sm text-emerald-400">Online</span>
                </div>
              </div>
            </div>
            <div className="border-b border-[rgba(137,193,210,0.34)] px-5 py-4">
              <p className="mb-3 text-xs tracking-widest text-[#7fa9b8]">workspace</p>
              <p className="text-[15px] text-[#154b5f]">{hospitalLabel}</p>
              <p className="mt-1 text-sm text-[#5d8797]">{groupLabel}</p>
              <p className="mt-1 text-sm text-[#7fa9b8]">
                Join code: <span className="tracking-widest text-[#1b86ae]">{org.joinCode}</span>
              </p>
            </div>
            <div className="flex flex-1 flex-col gap-1 px-5 py-4">
              <button className="flex items-center gap-3 py-3.5 text-[15px] text-[#527786]">
                <Settings size={18} /> Settings
              </button>
              <button onClick={handleSwitchOrg} className="flex items-center gap-3 py-3.5 text-[15px] text-[#527786]">
                <ChevronDown size={18} /> Switch workspace
              </button>
              <button onClick={handleSignOut} className="mt-2 flex items-center gap-3 py-3.5 text-[15px] text-red-400">
                <LogOut size={18} /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â•â•â• CALL OVERLAY â€" panel or fullscreen â•â•â• */}
      {callState !== "idle" && callViewMode !== "floating" && !suppressCallOverlay && (
        <div
          className={`z-[200] flex flex-col bg-[#0c0c0c] pointer-events-auto ${
            callViewMode === "fullscreen"
              ? "fixed inset-0"
              : isFoldableSplitView
                ? "absolute inset-y-0 right-0 left-1/2"
                : "absolute inset-0"
          }`}
          style={{
            paddingTop: (callViewMode === "fullscreen" || !(embedded && hideMobileHeader))
              ? "env(safe-area-inset-top, 0px)"
              : undefined,
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
          onClick={revealCallControls}
        >

          {/* Primary remote video — only render when remote party has an active video track */}
          {remoteVideoActive && !tomVoiceMode && callState === "active" && (
            <div
              className={`absolute overflow-hidden bg-black transition-all ${
                showLocalAsPrimary
                  ? "bottom-28 right-3 z-20 rounded-xl border border-white/15 shadow-lg"
                  : "inset-0"
              }`}
              style={showLocalAsPrimary
                ? { width: callViewMode === "fullscreen" ? 90 : 68, height: callViewMode === "fullscreen" ? 126 : 96 }
                : undefined}
            >
              <video
                ref={setRemoteVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
                onCanPlay={e => void (e.target as HTMLVideoElement).play()}
              />
              {showLocalAsPrimary ? (
                <button
                  onClick={() => setShowLocalAsPrimary(false)}
                  className="absolute inset-0"
                  aria-label="Show colleague camera as main view"
                />
              ) : null}
            </div>
          )}

          {/* Local video */}
          {callMediaMode === "video" && !tomVoiceMode && (callState === "active" || callState === "outgoing") && (
            <div
              className={`absolute overflow-hidden transition-all ${
                callState === "active" && showLocalAsPrimary
                  ? "inset-0 bg-black"
                  : "bottom-28 right-3 z-20 rounded-xl border border-white/15 shadow-lg"
              }`}
              style={callState === "active" && showLocalAsPrimary
                ? undefined
                : { width: callViewMode === "fullscreen" ? 90 : 68, height: callViewMode === "fullscreen" ? 126 : 96 }}
            >
              <video
                ref={setLocalVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              {callState === "active" && !showLocalAsPrimary ? (
                <button
                  onClick={() => setShowLocalAsPrimary(true)}
                  className="absolute inset-0"
                  aria-label="Show my camera as main view"
                />
              ) : null}
            </div>
          )}

          {/* Top bar â€" single size toggle + panel switcher (desktop) + timer */}
          <div className="relative z-20 flex items-center justify-between px-4 pt-4">
            <div className="flex items-center gap-2">
              {/* Minimise to floating â€" expand again by tapping the floating window */}
              <button
                onClick={() => setCallViewMode("floating")}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
                aria-label="Minimise to floating window"
              >
                <Minimize2 size={14} />
              </button>
              {/* Foldable-only: segmented ratio control — 50% (half pane) or 100% (both panes) */}
              {!allowFoldableSplitView && (
                <div className="flex items-center overflow-hidden rounded-full bg-black/40 backdrop-blur-sm lg:hidden">
                  <button
                    onClick={() => setCallViewMode("panel")}
                    className={`flex h-8 w-[38px] items-center justify-center text-[10px] font-semibold transition-colors ${
                      callViewMode !== "fullscreen" ? "bg-white/20 text-white" : "text-white hover:text-white"
                    }`}
                    aria-label="Half-pane view"
                    title="Call takes half the screen"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => setCallViewMode("fullscreen")}
                    className={`flex h-8 w-[38px] items-center justify-center text-[10px] font-semibold transition-colors ${
                      callViewMode === "fullscreen" ? "bg-white/20 text-white" : "text-white hover:text-white"
                    }`}
                    aria-label="Full-width view"
                    title="Call takes both panes"
                  >
                    100%
                  </button>
                </div>
              )}
              {/* Desktop-only panel view button */}
              <button
                onClick={() => setCallViewMode("panel")}
                className={`hidden lg:flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors ${
                  callViewMode === "panel"
                    ? "bg-white/20 text-white"
                    : "bg-black/40 text-white hover:bg-black/60 hover:text-white"
                }`}
                aria-label="Panel view"
              >
                <PanelRight size={14} />
              </button>
            </div>
            <div className="w-[72px]" />
          </div>

          {/* Identity block â€" hidden only when remote video is actually live */}
          <div className={`relative z-10 flex flex-1 flex-col items-center justify-center gap-4 px-6
            ${callState === "active" && !tomVoiceMode && callMediaMode === "video" && remoteVideoActive ? "pointer-events-none opacity-0" : ""}`}
          >
            <div className="relative flex items-center justify-center">
              {callState === "incoming" && (
                <>
                  <div className="absolute rounded-full bg-white/[0.06] animate-ping" style={{ inset: -22 }} />
                  <div className="absolute rounded-full bg-white/[0.04] animate-ping" style={{ inset: -40, animationDelay: "0.35s" }} />
                </>
              )}
              {/* Show the OTHER party's info regardless of caller/callee role */}
              {(() => {
                const remote = activeCall?.callerUid === user.uid ? calleeInfo : callerInfo
                return (
                  <Avatar
                    name={remote?.displayName ?? "?"}
                    size={callViewMode === "fullscreen" ? 88 : 68}
                    uid={remote?.uid}
                  />
                )
              })()}
            </div>
            {(() => {
              const remote = activeCall?.callerUid === user.uid ? calleeInfo : callerInfo
              return (
                <div className="text-center">
                  <p className={`tracking-[-0.02em] text-white ${callViewMode === "fullscreen" ? "text-[24px]" : "text-[19px]"}`}>
                    {remote?.displayName ?? (callState === "incoming" ? "Incoming call" : (selectedThread ? getThreadName(selectedThread) : ""))}
                  </p>
                  {remote?.clinicalRole && (
                    <p className="mt-1 text-[14px] text-white">{remote.clinicalRole}</p>
                  )}
                  <p className="mt-1 text-[14px] text-white">
                    {callState === "outgoing"
                      ? (callMediaMode === "video" ? "Video calling" : "Calling")
                      : callState === "incoming"
                        ? (callMediaMode === "video" ? "Incoming video call" : "Incoming call")
                        : (tomVoiceMode ? "TOM voice" : "Connected")}
                  </p>
                  {callState === "active" && (
                    <p className="mt-1 tabular-nums text-[13px] text-white">
                      {formatCallDuration(callElapsed)}
                    </p>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Active call controls */}
          {callState === "active" && (
            <div
              className={`z-20 flex gap-3 transition-opacity duration-300 ${
                !tomVoiceMode && (callMediaMode === "video" || remoteVideoActive)
                  ? `absolute left-0 top-0 bottom-0 flex-col items-center justify-center px-3 bg-gradient-to-r from-black/55 to-transparent w-[68px] ${showCallControls ? "opacity-100" : "opacity-0 pointer-events-none"}`
                  : "relative mb-6 flex-row items-center justify-center"
              }`}
            >
              {callMediaMode === "video" && !tomVoiceMode && (
                <CallButton icon={<SwitchCamera size={20} />} onClick={() => void switchCamera()} aria-label="Flip camera" />
              )}
              {callMediaMode === "video" && !tomVoiceMode && callState === "active" && (
                <CallButton
                  icon={<ArrowLeftRight size={18} className={showLocalAsPrimary ? "text-[#67CFCF]" : ""} />}
                  onClick={() => setShowLocalAsPrimary((value) => !value)}
                  active={showLocalAsPrimary}
                  aria-label={showLocalAsPrimary ? "Show colleague camera as main view" : "Show my camera as main view"}
                />
              )}
              {callMediaMode === "video" && !tomVoiceMode && (
                <CallButton
                  icon={<ScanFace size={18} className={videoBlurEnabled ? "text-[#67CFCF]" : ""} />}
                  onClick={() => void toggleBackgroundBlur()}
                  active={videoBlurEnabled}
                  aria-label={videoBlurEnabled ? "Disable background blur" : "Enable background blur"}
                />
              )}
              <CallButton
                icon={callMuted ? <MicOff size={20} className="text-red-400" /> : <Mic size={20} />}
                onClick={toggleMute}
                active={callMuted}
                aria-label={callMuted ? "Unmute" : "Mute"}
              />
              {callMediaMode === "audio" ? (
                <>
                  <CallButton
                    icon={<Volume2 size={20} className={callSpeaker ? "text-[#0096C7]" : ""} />}
                    onClick={() => setCallSpeaker(v => !v)}
                    active={callSpeaker}
                    aria-label="Speaker"
                  />
                  <CallButton
                    icon={<Video size={20} className={shouldRequestVideoApproval && awaitingVideoAccept ? "animate-pulse text-[#29b6d8]" : ""} />}
                    onClick={() => void (canJoinExistingVideoCall ? switchToVideo() : requestVideo())}
                    disabled={shouldRequestVideoApproval && awaitingVideoAccept}
                    aria-label={
                      canJoinExistingVideoCall
                        ? "Turn on my camera"
                        : awaitingVideoAccept
                          ? "Waiting for video accept…"
                          : "Request video"
                    }
                  />
                </>
              ) : (
                !tomVoiceMode && (
                  <CallButton
                    icon={<VideoOff size={20} />}
                    onClick={switchToAudio}
                    aria-label="Camera off"
                  />
                )
              )}
              <CallButton icon={<PhoneOff size={20} />} onClick={() => void endCall()} danger aria-label="End call" />
            </div>
          )}

          {/* Incoming / outgoing action buttons */}
          {(callState === "incoming" || callState === "outgoing") && (
            <div className="relative z-10 flex items-end justify-center gap-12 pb-12">
              {callState === "incoming" && (
                <button
                  onClick={answerCall}
                  className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#22c55e] hover:bg-[#16a34a] active:bg-[#15803d]"
                  aria-label="Answer"
                >
                  <PhoneIncoming size={24} className="text-white" />
                </button>
              )}
              <button
                onClick={callState === "incoming" ? declineCall : () => void endCall()}
                className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#ef4444] hover:bg-[#dc2626] active:bg-[#b91c1c]"
                aria-label={callState === "incoming" ? "Decline" : "Cancel"}
              >
                <PhoneOff size={24} className="text-white" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* â•â•â• FLOATING WINDOW â•â•â• */}
      {callState !== "idle" && callViewMode === "floating" && !embedded && (
        callState === "active" && callMediaMode === "video" && !tomVoiceMode ? (
          /* Video PiP â€" draggable + resizable */
          <div
            className="fixed z-[300] overflow-hidden rounded-2xl shadow-2xl border border-white/[0.08] pointer-events-auto select-none"
            style={{
              width: floatingSize.w,
              height: floatingSize.h,
              ...(floatingPos
                ? { left: floatingPos.x, top: floatingPos.y, right: "auto", bottom: "auto" }
                : { right: 16, bottom: 96 }),
            }}
            onMouseDown={(e) => {
              if ((e.target as HTMLElement).dataset.resize) return
              const rect = e.currentTarget.getBoundingClientRect()
              floatingDragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top }
              const onMove = (mv: MouseEvent) => {
                if (!floatingDragRef.current) return
                const nx = floatingDragRef.current.origX + mv.clientX - floatingDragRef.current.startX
                const ny = floatingDragRef.current.origY + mv.clientY - floatingDragRef.current.startY
                setFloatingPos({ x: Math.max(0, Math.min(nx, window.innerWidth - floatingSize.w)), y: Math.max(0, Math.min(ny, window.innerHeight - floatingSize.h)) })
              }
              const onUp = () => { floatingDragRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
              window.addEventListener("mousemove", onMove)
              window.addEventListener("mouseup", onUp)
            }}
            onTouchStart={(e) => {
              if ((e.target as HTMLElement).dataset.resize) return
              const t = e.touches[0]
              const rect = e.currentTarget.getBoundingClientRect()
              floatingDragRef.current = { startX: t.clientX, startY: t.clientY, origX: rect.left, origY: rect.top }
              const onMove = (mv: TouchEvent) => {
                if (!floatingDragRef.current) return
                const tc = mv.touches[0]
                const nx = floatingDragRef.current.origX + tc.clientX - floatingDragRef.current.startX
                const ny = floatingDragRef.current.origY + tc.clientY - floatingDragRef.current.startY
                setFloatingPos({ x: Math.max(0, Math.min(nx, window.innerWidth - floatingSize.w)), y: Math.max(0, Math.min(ny, window.innerHeight - floatingSize.h)) })
              }
              const onEnd = () => { floatingDragRef.current = null; window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onEnd) }
              window.addEventListener("touchmove", onMove, { passive: true })
              window.addEventListener("touchend", onEnd)
            }}
          >
            <video
              ref={setFloatingVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover bg-black"
              onCanPlay={e => void (e.target as HTMLVideoElement).play()}
            />
            {/* Gradient scrim + controls */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
            {/* Tap anywhere to expand */}
            <button
              className="absolute inset-0 z-10"
              onClick={() => setCallViewMode(visible ? "panel" : "fullscreen")}
              aria-label="Expand call"
            />
            <div className="absolute right-1.5 top-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-md bg-black/40 pointer-events-none">
              <Maximize2 size={10} className="text-white" />
            </div>
            {/* Name + elapsed */}
            <div className="absolute bottom-9 left-0 right-0 z-20 px-2 pointer-events-none">
              <p className="truncate text-center text-[11px] text-white">
                {calleeInfo?.displayName ?? ""}
              </p>
              <p className="text-center text-[10px] text-white tabular-nums">
                {formatCallDuration(callElapsed)}
              </p>
            </div>
            {/* Mute + End */}
            <div className="absolute bottom-1.5 left-0 right-0 z-20 flex items-center justify-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); toggleMute() }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50"
                aria-label={callMuted ? "Unmute" : "Mute"}
              >
                {callMuted ? <MicOff size={12} className="text-red-400" /> : <Mic size={12} className="text-white" />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); void endCall() }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ef4444]"
                aria-label="End call"
              >
                <PhoneOff size={12} className="text-white" />
              </button>
            </div>
            {/* Resize handle â€" bottom-right corner */}
            <div
              data-resize="1"
              className="absolute bottom-0 right-0 z-30 h-5 w-5 cursor-se-resize"
              style={{ touchAction: "none" }}
              onMouseDown={(e) => {
                e.stopPropagation()
                floatingResizeRef.current = { startX: e.clientX, startY: e.clientY, origW: floatingSize.w, origH: floatingSize.h }
                const rect = e.currentTarget.closest<HTMLElement>(".fixed")!.getBoundingClientRect()
                if (!floatingPos) setFloatingPos({ x: rect.left, y: rect.top })
                const onMove = (mv: MouseEvent) => {
                  if (!floatingResizeRef.current) return
                  const nw = Math.max(110, floatingResizeRef.current.origW + mv.clientX - floatingResizeRef.current.startX)
                  const nh = Math.max(150, floatingResizeRef.current.origH + mv.clientY - floatingResizeRef.current.startY)
                  setFloatingSize({ w: Math.min(nw, 320), h: Math.min(nh, 500) })
                }
                const onUp = () => { floatingResizeRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
                window.addEventListener("mousemove", onMove)
                window.addEventListener("mouseup", onUp)
              }}
              onTouchStart={(e) => {
                e.stopPropagation()
                const t = e.touches[0]
                floatingResizeRef.current = { startX: t.clientX, startY: t.clientY, origW: floatingSize.w, origH: floatingSize.h }
                const rect = e.currentTarget.closest<HTMLElement>(".fixed")!.getBoundingClientRect()
                if (!floatingPos) setFloatingPos({ x: rect.left, y: rect.top })
                const onMove = (mv: TouchEvent) => {
                  if (!floatingResizeRef.current) return
                  const tc = mv.touches[0]
                  const nw = Math.max(110, floatingResizeRef.current.origW + tc.clientX - floatingResizeRef.current.startX)
                  const nh = Math.max(150, floatingResizeRef.current.origH + tc.clientY - floatingResizeRef.current.startY)
                  setFloatingSize({ w: Math.min(nw, 320), h: Math.min(nh, 500) })
                }
                const onEnd = () => { floatingResizeRef.current = null; window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onEnd) }
                window.addEventListener("touchmove", onMove, { passive: false })
                window.addEventListener("touchend", onEnd)
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" className="absolute bottom-1 right-1 text-white pointer-events-none">
                <path d="M10 2L2 10M10 6L6 10M10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        ) : (
          /* Audio pill â€" draggable */
          <div
            className="z-[300] flex items-center gap-3 rounded-2xl bg-[#181818] px-3 py-2.5 shadow-2xl border border-white/[0.08] pointer-events-auto select-none"
            style={{
              position: "fixed",
              ...(floatingPos
                ? { left: floatingPos.x, top: floatingPos.y, right: "auto", bottom: "auto", width: 248 }
                : { bottom: 96, left: 16, right: 16 }),
            }}
            onMouseDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              floatingDragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top }
              const onMove = (mv: MouseEvent) => {
                if (!floatingDragRef.current) return
                const nx = floatingDragRef.current.origX + mv.clientX - floatingDragRef.current.startX
                const ny = floatingDragRef.current.origY + mv.clientY - floatingDragRef.current.startY
                setFloatingPos({ x: Math.max(0, Math.min(nx, window.innerWidth - 248)), y: Math.max(0, Math.min(ny, window.innerHeight - 60)) })
              }
              const onUp = () => { floatingDragRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
              window.addEventListener("mousemove", onMove)
              window.addEventListener("mouseup", onUp)
            }}
            onTouchStart={(e) => {
              const t = e.touches[0]
              const rect = e.currentTarget.getBoundingClientRect()
              floatingDragRef.current = { startX: t.clientX, startY: t.clientY, origX: rect.left, origY: rect.top }
              const onMove = (mv: TouchEvent) => {
                if (!floatingDragRef.current) return
                const tc = mv.touches[0]
                const nx = floatingDragRef.current.origX + tc.clientX - floatingDragRef.current.startX
                const ny = floatingDragRef.current.origY + tc.clientY - floatingDragRef.current.startY
                setFloatingPos({ x: Math.max(0, Math.min(nx, window.innerWidth - 248)), y: Math.max(0, Math.min(ny, window.innerHeight - 60)) })
              }
              const onEnd = () => { floatingDragRef.current = null; window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onEnd) }
              window.addEventListener("touchmove", onMove, { passive: true })
              window.addEventListener("touchend", onEnd)
            }}
            role="button"
            tabIndex={0}
            onClick={() => setCallViewMode(visible ? "panel" : "fullscreen")}
            onKeyDown={(e) => e.key === "Enter" && setCallViewMode(visible ? "panel" : "fullscreen")}
            aria-label="Expand call"
          >
            <Avatar
              name={((activeCall?.callerUid === user.uid) ? calleeInfo?.displayName : callerInfo?.displayName) ?? "?"}
              size={34}
              uid={(activeCall?.callerUid === user.uid) ? calleeInfo?.uid : callerInfo?.uid}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-white">
                {callState === "incoming"
                  ? (callerInfo?.displayName ?? "Incoming call")
                  : (calleeInfo?.displayName ?? "Call")}
              </p>
              <p className="text-[11px] text-white">
                {callState === "active"
                  ? formatCallDuration(callElapsed)
                  : callState === "outgoing"
                    ? "Calling"
                    : "Incoming"}
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); toggleMute() }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2a2a2a]"
              aria-label={callMuted ? "Unmute" : "Mute"}
            >
              {callMuted ? <MicOff size={14} className="text-red-400" /> : <Mic size={14} className="text-white" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); void endCall() }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ef4444]"
              aria-label="End call"
            >
              <PhoneOff size={14} className="text-white" />
            </button>
          </div>
        )
      )}

    </div>
  )
}
