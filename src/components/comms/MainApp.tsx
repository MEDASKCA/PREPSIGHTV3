"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Image from "next/image"
import {
  addDoc,
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
import type {
  CommsOrg,
  CommsThread,
  CommsMessage,
  CommsPresence,
  CommsUser,
  CommsCall,
} from "@/lib/comms-types"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Edit2,
  Forward,
  LockKeyhole,
  LogOut,
  MoreVertical,
  Paperclip,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  PhoneOutgoing,
  Pin,
  Plus,
  Reply,
  Search,
  Send,
  Settings,
  Smile,
  Sun,
  Trash2,
  Video,
  X,
} from "lucide-react"

// ─── Emoji data ────────────────────────────────────────────────────────────────

const QUICK_REACT = ["👍","❤️","😂","😮","😢","🙏","🔥","✅"]
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
type TomWatchTask = {
  id: string
  threadId: string
  subject: string
  status: "watching" | "completed"
  createdAt: number
  completedAt?: number
}

const EMOJI_CATS: { icon: string; emojis: string[] }[] = [
  { icon: "😀", emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😚","😙","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","😕","😟","🙁","☹️","😮","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","💩","🤡","👹","👺","👻","👽","🤖"] },
  { icon: "👍", emojis: ["👍","👎","👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝️","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","💪","🦾","👀","👅","👄","💋","🫂"] },
  { icon: "❤️", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","🫶","💏","💑","🥂","🎉","🎊","🎈","🎁","🎀","🎗️","🏆","🥇","🥈","🥉","🎖️","🏅"] },
  { icon: "🐶", emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐒","🐔","🐧","🐦","🦆","🦅","🦉","🦇","🐺","🐴","🦄","🐝","🦋","🐌","🐞","🐜","🐢","🐍","🦎","🦕","🦖","🐙","🐡","🐠","🐟","🐬","🐳","🦈","🐊","🐘","🦛","🦏","🦒","🐎","🐕","🐈","🐓","🦚","🦜","🐇","🦝","🦔"] },
  { icon: "🍕", emojis: ["🍎","🍊","🍋","🍇","🍓","🫐","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🌽","🥕","🧄","🥔","🍳","🥚","🧀","🥩","🍗","🍖","🌭","🍔","🍟","🍕","🌮","🌯","🥗","🍝","🍜","🍲","🍛","🍣","🥟","🍤","🍙","🍚","🍘","🍥","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🍯","🧃","🥤","🧋","🍵","☕","🍺","🥂","🍷","🍸","🍹","🍾","🥃"] },
  { icon: "⚽", emojis: ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🏓","🏸","🥊","🥋","🎽","🛹","⛸️","🥅","⛳","🎯","🎮","🎲","♟️","🎭","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🎷","🎺","🎸","🎻","🎙️","📻","🎚️","🎛️"] },
  { icon: "🚗", emojis: ["🚗","🚕","🚙","🚌","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🏍️","🛵","🚲","✈️","🛫","🛬","🪂","💺","🚁","🛸","🚀","🛶","⛵","🚤","🛥️","🚢","⚓","🗺️","🧭","🏔️","⛰️","🌋","🏕️","🏖️","🏜️","🏝️","🏞️","🏟️","🏛️","🏗️","🏠","🏡","🏢","🏥","🏦","🏨","🏪","🏫","🏬","🏭","🏯","🏰","💒","🗼","🗽","⛪","🕌","🕍","🕋"] },
  { icon: "💡", emojis: ["💡","🔦","🕯️","🪔","💰","💴","💵","💶","💷","💸","💳","🪙","💹","📈","📉","📊","📋","📌","📍","📎","🖇️","📏","📐","✂️","🗃️","🗄️","🗑️","🔒","🔓","🔑","🗝️","🔨","🪓","⛏️","⚒️","🛠️","🔧","🪛","🔩","⚙️","🗜️","⚖️","🔗","⛓️","🪝","🧲","🪜","🧰","💊","🩺","🩹","🩻","💉","🩸","🧬","🔬","🔭","📡","🧫","🧪"] },
]

// ─── Helpers ───────────────────────────────────────────────────────────────────

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
        className="relative shrink-0 overflow-hidden"
        style={{
          width: size,
          height: size,
        }}
      >
        <img
          src="/image1.png"
          alt="TOM"
          width={Math.round(size * 2.15)}
          height={Math.round(size * 2.15)}
          className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-[46%]"
          style={{ imageRendering: "auto" }}
        />
      </div>
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
      className="app-display-font block text-[22px] leading-none text-[#67CFCF]"
    >
      Comms
    </span>
  )
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
            <button onClick={onClose} className="px-1 py-0.5 text-[#888888] hover:text-white">
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
        {EMOJI_CATS[cat].emojis.map((e, index) => (
          <button key={e} onClick={() => { onSelect(e); onClose() }}
            className={`${variant === "drawer" ? "rounded-xl py-2 text-[24px] leading-none transition duration-200 hover:bg-[#1c1c1c]" : "rounded p-1 text-xl leading-none hover:bg-gray-100"}`}
            style={variant === "drawer" ? { transitionDelay: `${Math.min(index, 10) * 12}ms` } : undefined}>
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
  const remainder = text.replace(/\p{Extended_Pictographic}/gu, "").replace(/[\s‍️]/g, "")
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
  // Skip variation selectors (FE0F, FE0E) — they don't appear in CDN paths
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

// ─── Main component ────────────────────────────────────────────────────────────

interface Props {
  user: User
  org: CommsOrg
  onSignOut: () => void
  onSwitchOrg: () => void
  embedded?: boolean
  showProfileButton?: boolean
}

export default function MainApp({ user, org, onSignOut, onSwitchOrg, embedded = false, showProfileButton = false }: Props) {
  const appRef = useRef<HTMLDivElement>(null)
  const firestore = db!
  const firebaseAuth = auth!
  const firebaseStorage = storage!
  // ── State ──
  const [threads, setThreads] = useState<CommsThread[]>([])
  const [messages, setMessages] = useState<CommsMessage[]>([])
  const [inboxMessages, setInboxMessages] = useState<CommsMessage[]>([])
  const [members, setMembers] = useState<CommsUser[]>([])
  const [presence, setPresence] = useState<Record<string, CommsPresence>>({})
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [selectedThread, setSelectedThread] = useState<CommsThread | null>(null)
  const [inputText, setInputText] = useState("")
  const [replyTo, setReplyTo] = useState<CommsMessage | null>(null)
  const [editingMessage, setEditingMessage] = useState<CommsMessage | null>(null)
  const [editText, setEditText] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<CommsMessage | null>(null)
  const [forwardingMessage, setForwardingMessage] = useState<CommsMessage | null>(null)
  const [actionBoxPosition, setActionBoxPosition] = useState<{ top: number; left: number } | null>(null)
  const [showContacts, setShowContacts] = useState(false)
  const [embeddedContactsBounds, setEmbeddedContactsBounds] = useState<{ top: number; left: number; height: number } | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showCommsSearch, setShowCommsSearch] = useState(false)
  const [showNewDM, setShowNewDM] = useState(false)
  const [filterTab, setFilterTab] = useState<"chats" | "pinned" | "groups">("chats")
  const [searchQuery, setSearchQuery] = useState("")
  const [permissionWarning, setPermissionWarning] = useState("")
  const [joinCodeThread, setJoinCodeThread] = useState<CommsThread | null>(null)
  const [joinCodeInput, setJoinCodeInput] = useState("")
  const [joinCodeError, setJoinCodeError] = useState("")

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

  // ── Call state ──
  const [callState, setCallState] = useState<"idle" | "outgoing" | "incoming" | "active">("idle")
  const [activeCall, setActiveCall] = useState<CommsCall | null>(null)
  const [callerInfo, setCallerInfo] = useState<CommsUser | null>(null)
  const [callMediaMode, setCallMediaMode] = useState<"audio" | "video">("audio")
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const callStartTimeRef = useRef<number>(0)
  const callThreadIdRef = useRef<string>("")
  const callUnsubRef = useRef<(() => void) | null>(null)
  const callSignalUnsubRef = useRef<(() => void) | null>(null)
  const tomAnswerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tomTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [tomVoiceMode, setTomVoiceMode] = useState(false)
  const [tomTyping, setTomTyping] = useState(false)
  const [tomTasks, setTomTasks] = useState<TomWatchTask[]>([])

  // ── Refs ──
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const seededGroupNamesRef = useRef<Record<string, true>>({})
  const tomThreadSeededRef = useRef(false)
  const tomTaskStorageKey = `prepsight-tom-tasks:${org.id}:${user.uid}`

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

  // ── Presence heartbeat ──
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

  // ── Load members ──
  useEffect(() => {
    const q = query(collection(firestore, "comms_v5_memberships"), where("orgId", "==", org.id), where("status", "==", "active"))
    return onSnapshot(q, async snap => {
      const uids = snap.docs.map(d => d.data().uid as string)
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

  // ── Load presence ──
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

  // ── Load threads ──
  useEffect(() => {
    const q = query(
      collection(firestore, "comms_v5_threads"),
      where("organizationId", "==", org.id),
      where("memberUids", "array-contains", user.uid),
    )
    return onSnapshot(q, snap => {
      const updated = snap.docs.map(d => ({ id: d.id, ...d.data() } as CommsThread))
        .sort((a, b) => b.updatedAt - a.updatedAt)
      setThreads(updated)
    }, error => {
      if ((error.message || "").toLowerCase().includes("permission")) {
        setPermissionWarning("Live Comms access is limited until Firestore permissions are updated.")
        setThreads([])
        return
      }
      console.error(error)
    })
  }, [org.id, user.uid])

  useEffect(() => {
    const q = query(
      collection(firestore, "comms_v5_messages"),
      where("organizationId", "==", org.id),
      where("memberUids", "array-contains", user.uid),
    )
    return onSnapshot(q, snap => {
      const nextMessages = snap.docs.map(d => ({ id: d.id, ...d.data() } as CommsMessage))
      setInboxMessages(nextMessages)
    }, error => {
      if ((error.message || "").toLowerCase().includes("permission")) {
        setPermissionWarning("Live Comms access is limited until Firestore permissions are updated.")
        setInboxMessages([])
        return
      }
      console.error(error)
    })
  }, [org.id, user.uid])

  // ── Load messages ──
  useEffect(() => {
    if (!selectedThread) { setMessages([]); return }
    const q = query(
      collection(firestore, "comms_v5_messages"),
      where("threadId", "==", selectedThread.id),
      where("organizationId", "==", org.id),
      where("memberUids", "array-contains", user.uid),
    )
    return onSnapshot(q, snap => {
      const nextMessages = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as CommsMessage))
        .sort((a, b) => a.createdAt - b.createdAt)
      setMessages(nextMessages)
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

  // ── Incoming call listener ──
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

  // ── Thread helpers ──
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
    } catch {
      // keep local clear even if remote write lags
    }
  }

  async function sendTomMessage(thread: CommsThread, text: string) {
    const createdAt = Date.now()
    await addDoc(collection(firestore, "comms_v5_messages"), {
      threadId: thread.id,
      uid: TOM_UID,
      displayName: "TOM",
      text,
      type: "text",
      organizationId: org.id,
      memberUids: thread.memberUids,
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
    return thread.type === "channel" && !isGroupUnlocked(thread.id)
  }

  function getLastMessagePreview(thread: CommsThread) {
    const latest = inboxMessages
      .filter(message => message.threadId === thread.id && !message.deleted)
      .sort((left, right) => right.createdAt - left.createdAt)[0]

    if (latest?.text?.trim()) return latest.text.trim()
    if (thread.type === "direct" && thread.memberUids.includes(TOM_UID)) return "Ask me anything"
    if (thread.type === "channel" && isGroupLocked(thread)) return "Enter code to join"
    return thread.lastMessage?.trim() || (thread.type === "channel" ? "Group" : "")
  }

  function isOnline(uid: string) {
    if (uid === TOM_UID) return true
    const p = presence[uid]
    return p?.status === "online" && Date.now() - p.lastSeen < 60_000
  }

  const currentUserRecord = members.find(member => member.uid === user.uid) || null
  const allMembers = [TOM_USER, ...members.filter(member => member.uid !== TOM_UID)]
  const contactMembers = allMembers.filter(member => member.uid !== user.uid)
  const hospitalLabel = currentUserRecord?.hospital?.trim() || org.name
  const departmentLabel = currentUserRecord?.department?.trim() || "Operating Theatres"
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

  const filteredThreads = threads.filter(t => {
    if (filterTab === "pinned" && !isThreadPinned(t.id)) return false
    if (filterTab === "chats" && t.type !== "direct") return false
    if (filterTab === "groups" && t.type !== "channel") return false
    if (t.type === "channel" && ((t.name || "").trim().toLowerCase() === "general" || (t.description || "").trim().toLowerCase() === "general discussion")) {
      return false
    }
    if (searchQuery && !getThreadName(t).toLowerCase().includes(searchQuery.toLowerCase())) return false
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

  const selectedOtherUid = selectedThread?.type === "direct" ? getOtherUid(selectedThread) : ""
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

  // ── Send message ──
  async function sendMessage(text?: string, attachments?: { name: string; url: string; type: "image" | "file"; size: number }[]) {
    const content = text ?? inputText.trim()
    if (!content && !attachments?.length) return
    if (!selectedThread) return
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
    await updateDoc(doc(firestore, "comms_v5_threads", selectedThread.id), {
      updatedAt: Date.now(), lastMessage: content || "📎 Attachment",
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
            `Understood. I’ll text you when ${watchSubject} has finished.`,
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
    await updateDoc(doc(firestore, "comms_v5_messages", messageId), { deleted: true, text: "This message was deleted" })
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
    const ext = file.name.split(".").pop()?.toLowerCase()
    const isImage = ["jpg","jpeg","png","gif","webp","svg"].includes(ext || "")
    const path = `comms/${org.id}/${selectedThread.id}/${Date.now()}_${file.name}`
    const r = storageRef(firebaseStorage, path)
    await uploadBytes(r, file)
    const url = await getDownloadURL(r)
    await sendMessage("", [{ name: file.name, url, type: isImage ? "image" : "file", size: file.size }])
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

  // ── WebRTC ──
  function createPC() {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    })
    pcRef.current = pc
    return pc
  }

  function attachRemoteAudio(pc: RTCPeerConnection) {
    pc.ontrack = e => {
      if (remoteAudioRef.current && e.streams[0]) {
        remoteAudioRef.current.srcObject = e.streams[0]
        remoteAudioRef.current.play().catch(() => {})
      }
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0]
        remoteVideoRef.current.play().catch(() => {})
      }
    }
  }

  function subscribeToCallStatus(callId: string, threadId?: string) {
    callUnsubRef.current?.()
    const unsub = onSnapshot(doc(firestore, "comms_v5_calls", callId), async snap => {
      const data = snap.data()
      if (!data) {
        cleanupCall()
        return
      }

      const nextCall = { id: snap.id, ...data } as CommsCall
      setActiveCall(nextCall)

      if (data.status === "active" && callState !== "active") {
        setCallState("active")
      }

      if (data.status === "declined" || data.status === "missed") {
        if (threadId) {
          await postCallMessage(threadId, false, 0, nextCall.mode || "audio")
        }
        cleanupCall()
        return
      }

      if (data.status === "ended") {
        cleanupCall()
      }
    })
    callUnsubRef.current = unsub
    return unsub
  }

  async function initiateCall(calleeUid: string, threadId: string) {
    if (callState !== "idle") return
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
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callMediaMode === "video" })
    } catch {
      alert(callMediaMode === "video" ? "Camera or microphone permission denied" : "Microphone permission denied")
      return
    }
    localStreamRef.current = stream
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream
    }
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
      calleeUid,
      organizationId: org.id,
      mode: callMediaMode,
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

    // Listen for answer + status changes
    subscribeToCallStatus(callRef.id, threadId)

    callSignalUnsubRef.current?.()
    const answerUnsub = onSnapshot(doc(firestore, "comms_v5_calls", callRef.id), async snap => {
      const data = snap.data()
      if (!data) return
      if (data.answer && pc.signalingState === "have-local-offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
        callStartTimeRef.current = Date.now()
        setCallState("active")
      }
    })
    callSignalUnsubRef.current = answerUnsub

    // Listen for callee ICE candidates
    onSnapshot(collection(firestore, "comms_v5_calls", callRef.id, "callee_candidates"), snap => {
      snap.docChanges().forEach(change => {
        if (change.type === "added") {
          pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(() => {})
        }
      })
    })
  }

  async function answerCall() {
    if (!activeCall) return
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: activeCall.mode === "video" })
    } catch {
      alert(activeCall.mode === "video" ? "Camera or microphone permission denied" : "Microphone permission denied")
      return
    }
    localStreamRef.current = stream
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream
    }
    const pc = createPC()
    attachRemoteAudio(pc)
    stream.getTracks().forEach(t => pc.addTrack(t, stream))

    // Get offer SDP from Firestore
    const callSnap = await getDoc(doc(firestore, "comms_v5_calls", activeCall.id))
    const offerData = callSnap.data()?.offer
    if (!offerData) return

    await pc.setRemoteDescription(new RTCSessionDescription(offerData))

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    pc.onicecandidate = e => {
      if (e.candidate) addDoc(collection(firestore, "comms_v5_calls", activeCall.id, "callee_candidates"), e.candidate.toJSON())
    }

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
    if (activeCall.calleeUid === TOM_UID || activeCall.callerUid === TOM_UID) {
      cleanupCall()
      return
    }
    await updateDoc(doc(firestore, "comms_v5_calls", activeCall.id), { status: "declined" })
    cleanupCall()
  }

  async function endCall() {
    if (!activeCall) return
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
    if (tomAnswerTimeoutRef.current) {
      clearTimeout(tomAnswerTimeoutRef.current)
      tomAnswerTimeoutRef.current = null
    }
    if (tomTypingTimeoutRef.current) {
      clearTimeout(tomTypingTimeoutRef.current)
      tomTypingTimeoutRef.current = null
    }
    callUnsubRef.current?.(); callUnsubRef.current = null
    callSignalUnsubRef.current?.(); callSignalUnsubRef.current = null
    pcRef.current?.close(); pcRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop()); localStreamRef.current = null
    if (remoteAudioRef.current) { remoteAudioRef.current.srcObject = null }
    if (remoteVideoRef.current) { remoteVideoRef.current.srcObject = null }
    if (localVideoRef.current) { localVideoRef.current.srcObject = null }
    setTomVoiceMode(false)
    setCallState("idle"); setActiveCall(null); setCallerInfo(null)
  }

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

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

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
      `}</style>
      {/* Hidden audio for remote stream — video refs live in call UI only to avoid ref conflicts */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* ── Header ── */}
      <div
        className={`px-5 pb-3 shrink-0 ${embedded ? "bg-black pt-3" : "bg-black"}`}
        style={embedded ? undefined : { paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
      >
        <div className="flex items-center justify-between">
          {embedded ? (
            <>
              <div className="hidden lg:block">
                <DesktopCommsWordmark />
              </div>
              <span className="inline-flex items-center gap-1 text-[28px] tracking-tight lg:hidden">
                <img src="/PrepSight%20logo.png" alt="" aria-hidden="true" className="h-[54px] w-auto" />
                <span>
                  <span className="text-[0.86em] text-[#0096C7]">PrepSight</span>{" "}
                  <em
                    className="text-[0.84em] leading-none tracking-[-0.05em] text-white"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontWeight: 500 }}
                  >
                    Comms
                  </em>
                </span>
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-[28px] tracking-tight">
              <img src="/PrepSight%20logo.png" alt="" aria-hidden="true" className="h-[54px] w-auto" />
              <span>
                <span className="text-[0.86em] text-[#0096C7]">PrepSight</span>{" "}
                <em
                  className="text-[0.84em] leading-none tracking-[-0.05em] text-white"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontWeight: 500 }}
                >
                  Comms
                </em>
              </span>
            </span>
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (showCommsSearch) { setSearchQuery("") }
                setShowCommsSearch(v => !v)
              }}
              aria-label="Toggle search"
              className={showCommsSearch ? "text-white" : "text-white/70 hover:text-white"}
            >
              <Search size={20} />
            </button>
            {(showProfileButton || !embedded) ? (
              <button
                type="button"
                onClick={() => setShowProfile(true)}
                aria-label="More"
                className="text-white/80 hover:text-white"
              >
                <MoreVertical size={22} />
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[13px] text-[#888888]">
          <span>{hospitalLabel}</span>
          {groupLabel ? <span className="text-[#2d2d2d]">|</span> : null}
          {groupLabel ? <span>{groupLabel}</span> : null}
        </div>

        {showCommsSearch && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[#2d2d2d] bg-[#111111] px-4 py-2">
            <Search size={14} className="shrink-0 text-[#888888]" />
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search Comms"
              className="flex-1 bg-transparent text-[15px] text-[#e0e0e0] placeholder-[#555555] outline-none"
            />
            {searchQuery ? (
              <button onClick={() => setSearchQuery("")} className="text-[#888888]">
                <X size={14} />
              </button>
            ) : null}
          </div>
        )}

        {permissionWarning ? (
          <div className="mb-4 rounded-2xl border border-[#0096C7]/30 bg-[#001a26] px-4 py-3 text-[13px] leading-5 text-[#e0e0e0]">
            {permissionWarning}
          </div>
        ) : null}
      </div>

      {/* ── Filter row ── */}
      <div className="border-b border-black bg-black px-4 py-2.5 flex items-center gap-3 shrink-0">
        <button onClick={() => setShowContacts(true)} className="shrink-0">
          <Image src="/contacts-icon.png" alt="Contacts" width={28} height={28} />
        </button>
        <div className="flex gap-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(["chats","pinned","groups"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`border-b-2 pb-1 text-[14px] transition-colors ${
                filterTab === tab
                  ? "border-[#0096C7] font-semibold text-[#0096C7]"
                  : "border-transparent text-[var(--mob-text-2,#888888)] hover:text-[var(--mob-text,#111111)]"
              }`}
            >
              {tab === "chats" ? "Chats" : tab === "pinned" ? "Pinned" : "Groups"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Thread list ── */}
      <div className="flex-1 overflow-y-auto bg-black">
        {visibleThreads.length === 0 && (
          <p className="mt-20 text-center text-sm text-[var(--mob-text-2,#888888)]">No conversations yet</p>
        )}

        {visibleThreads.map(thread => {
          const unread = unreadCounts[thread.id] || 0
          const avatar = getThreadAvatar(thread)
          const otherUid = thread.type === "direct" ? getOtherUid(thread) : ""
          const online = otherUid ? isOnline(otherUid) : false
          const name = getThreadName(thread)

          return (
            <button
              key={thread.id}
              onClick={() => selectThread(thread)}
              className={`w-full flex items-center gap-3 px-4 py-3 border-b border-black active:bg-[#111111] ${
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
                  <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--mob-surface,#111111)] text-[var(--mob-text-2,#888888)]">
                    <LockKeyhole size={10} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-start justify-between gap-3">
                  <span className={`truncate text-[15px] ${unread ? "font-semibold text-[var(--mob-text,#e0e0e0)]" : "font-medium text-[var(--mob-text,#e0e0e0)]"}`}>
                    {name}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    {isThreadPinned(thread.id) ? <Pin size={12} className="fill-[var(--mob-text-2,#888888)] text-[var(--mob-text-2,#888888)]" /> : null}
                    <span className="text-[11px] text-[var(--mob-text-2,#888888)]">
                      {thread.updatedAt ? formatTime(thread.updatedAt) : ""}
                    </span>
                  </div>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-3">
                  <span className="truncate text-[13px] text-[var(--mob-text-2,#888888)]">
                    {getLastMessagePreview(thread)}
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
      </div>

      {/* ── Bottom nav ── */}

      {/* ═══════════════════ THREAD VIEW ═══════════════════ */}
      {!selectedThread ? (
        <button
          type="button"
          onClick={() => setShowNewDM(true)}
          className="absolute bottom-[calc(env(safe-area-inset-bottom)+84px)] right-5 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[#0096C7] text-white shadow-[0_14px_30px_rgba(0,150,199,0.34)] lg:hidden"
          aria-label="New chat"
        >
          <Plus size={24} />
        </button>
      ) : null}
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
      {selectedThread && (
        <div className="absolute inset-0 z-10 flex flex-col bg-black">
          {/* Thread header */}
          <div
            className="bg-black px-5 pb-4 flex items-center gap-3 shrink-0"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}
          >
            <button onClick={() => setSelectedThread(null)} className="mr-1">
              <ArrowLeft size={22} className="text-white" />
            </button>
            {selectedThread.type === "channel" ? (
              <Avatar name={getThreadName(selectedThread)} size={40} uid={selectedThread.id} />
            ) : (() => {
              const av = getThreadAvatar(selectedThread)
              return av ? <Avatar name={av.displayName} size={40} uid={av.uid} /> : <Avatar name="?" size={40} />
            })()}
            <div className="flex-1 min-w-0">
              <p className="text-white text-base font-semibold truncate">{getThreadName(selectedThread)}</p>
              {selectedThread.type === "direct" && (
                <p className="text-sm text-[#888888]">
                  {showTomTyping || otherIsTyping ? "typing…" : isOnline(getOtherUid(selectedThread)) ? "Online" : "Offline"}
                </p>
              )}
              {selectedThread.type === "channel" && selectedThread.description && (
                <p className="truncate text-sm text-[#888888]">{selectedThread.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedThread.type === "direct" && (
                <>
                  <button
                    onClick={() => { setCallMediaMode("audio"); void initiateCall(getOtherUid(selectedThread), selectedThread.id) }}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#29b6d8] to-[#1a86c8]"
                  >
                    <Phone size={18} className="text-white" />
                  </button>
                  <button
                    onClick={() => { setCallMediaMode("video"); void initiateCall(getOtherUid(selectedThread), selectedThread.id) }}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#29b6d8] to-[#1a86c8]"
                  >
                    <Video size={18} className="text-white" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setShowProfile(true)}
                className="text-white hover:text-white/70"
                aria-label="More options"
              >
                <MoreVertical size={22} />
              </button>
            </div>
          </div>

          {/* Messages container with emoji overlay */}
          <div className="relative flex-1 min-h-0">
          <div className="absolute inset-0 overflow-y-auto bg-black px-4 py-4 space-y-1">
            {messages.map((msg, idx) => {
              const isOwn = msg.uid === user.uid
              const isSystem = msg.type === "system"
              const prevMsg = messages[idx - 1]
              const showSenderName = selectedThread.type === "channel" && !isOwn && (!prevMsg || prevMsg.uid !== msg.uid)
              const emojiOnly = !msg.attachments?.length && !msg.deleted && isEmojiOnly(msg.text)

              if (msg.type === "call" || (isSystem && msg.text?.startsWith("📞"))) {
                const answered = msg.callAnswered ?? msg.text?.includes("Voice call")
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
                  <span className="bg-[#1c1c1c] text-[#888888] text-sm px-4 py-1.5 rounded-full">{msg.text}</span>
                </div>
              )
              if (msg.deleted) return (
                <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <span className="text-sm text-[var(--mob-text-2,#888888)] italic px-3 py-1">This message was deleted</span>
                </div>
              )

              return (
                <div key={msg.id}
                  className={`flex ${isOwn ? "flex-row-reverse" : "flex-row"} items-end ${showSenderName ? "gap-2" : "gap-0.5"} group`}
                >
                  {!isOwn ? (
                    <div className={`shrink-0 ${showSenderName ? "w-8" : "w-1"}`}>
                      {showSenderName && <Avatar name={msg.displayName} size={32} uid={msg.uid} />}
                    </div>
                  ) : null}

                  <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[84%]`}>
                    {!isOwn && showSenderName && (
                      <span className="text-sm text-[#0096C7] mb-1 ml-1">{msg.displayName}</span>
                    )}

                    {msg.replyTo && (
                      <div className={`text-sm text-[#888888] bg-[#1c1c1c] rounded-t-xl px-3 py-2 border-l-2 border-[#29b6d8] mb-0.5 max-w-full ${isOwn ? "rounded-bl-xl" : "rounded-br-xl"}`}>
                        <span className="text-[#29b6d8]">{msg.replyTo.displayName}</span>: {msg.replyTo.text.slice(0, 60)}{msg.replyTo.text.length > 60 ? "…" : ""}
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
                      <button
                        type="button"
                        onClick={event => {
                          const containerRect = appRef.current?.getBoundingClientRect()
                          const bubbleRect = event.currentTarget.getBoundingClientRect()
                          const boxWidth = 228
                          const preferredLeft = isOwn
                            ? bubbleRect.right - (containerRect?.left ?? 0) - boxWidth
                            : bubbleRect.left - (containerRect?.left ?? 0)
                          const maxLeft = ((containerRect?.width ?? 320) - boxWidth - 12)
                          setActionBoxPosition({
                            top: Math.max(16, bubbleRect.bottom - (containerRect?.top ?? 0) + 8),
                            left: Math.max(12, Math.min(preferredLeft, maxLeft)),
                          })
                          setActionMessage(msg)
                          setShowEmojiPicker(null)
                        }}
                        className={`relative text-left text-[14px] leading-snug ${
                          emojiOnly
                            ? ""
                            : isOwn
                              ? "px-3 py-1.5 rounded-2xl bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] text-white rounded-br-sm"
                              : "px-3 py-1.5 rounded-2xl bg-[#003d54] text-white rounded-bl-sm"
                        }`}>
                        {msg.attachments?.map((att, ai) => (
                          <div key={ai} className="mb-2">
                            {att.type === "image" ? (
                              <img src={att.url} alt={att.name} className="rounded-xl max-w-full max-h-48 object-cover" />
                            ) : (
                              <a href={att.url} target="_blank" rel="noopener noreferrer"
                                className={`flex items-center gap-2 text-sm underline ${isOwn ? "text-white/80" : "text-[#29b6d8]"}`}>
                                <Paperclip size={13} /> {att.name}
                              </a>
                            )}
                          </div>
                        ))}
                        {emojiOnly ? (() => {
                          const segs = segmentEmoji(msg.text)
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
                        })() : msg.text}
                        {msg.edited && !emojiOnly && <span className={`ml-1 text-xs ${isOwn ? "text-white/50" : "text-white/50"}`}>(edited)</span>}
                      </button>
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

                    <span className="text-xs text-[var(--mob-text-2,#888888)] mt-1 mx-1">{formatTime(msg.createdAt)}</span>
                  </div>

                </div>
              )
            })}
            {(otherIsTyping || showTomTyping) && (
              <div className="flex items-end gap-0.5">
                <div className="w-1 shrink-0" />
                <div className="flex max-w-[84%] flex-col items-start">
                  <div className="rounded-2xl rounded-bl-sm bg-[#003d54] px-3 py-1.5 text-left text-[14px] leading-snug text-white/70">
                    <TypingDots tone={showTomTyping ? "tom" : "default"} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Emoji overlay — absolute right side, overlays messages without pushing them */}
          {(showEmojiPicker === "drawer" || showEmojiPicker === "input") && (
            <div className="absolute right-0 inset-y-0 z-10 w-[162px] bg-black border-l border-[#2d2d2d] overflow-hidden flex flex-col">
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
          </div>{/* end messages container */}

          {/* Reply banner */}
          {replyTo && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0d1a22] border-t border-[#2d2d2d] shrink-0">
              <div className="flex-1 min-w-0">
                <span className="text-sm text-[#29b6d8]">{replyTo.displayName}</span>
                <p className="text-sm text-[#888888] truncate">{replyTo.text}</p>
              </div>
              <button onClick={() => setReplyTo(null)}><X size={16} className="text-[#888888]" /></button>
            </div>
          )}

          {/* Input */}
          <div
            className="bg-black shrink-0 relative px-4 pt-2"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 48px)" }}
          >
            <div className="flex items-center gap-2 rounded-2xl border border-[#2d2d2d] bg-[#111111] px-3 py-1.5 pr-2">
              <button onClick={() => fileInputRef.current?.click()} className="text-white shrink-0">
                <Paperclip size={17} />
              </button>
              <button
                onClick={() => selectedThread && void togglePinThread(selectedThread.id)}
                className="shrink-0"
                aria-label="Pin thread"
              >
                <Sun size={17} strokeWidth={2} className={selectedThread && isThreadPinned(selectedThread.id) ? "text-[#00e5ff]" : "text-[#00b8d4]"} />
              </button>
              <input type="file" ref={fileInputRef} className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = "" }} />
              <input
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Message…"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-[#e0e0e0] placeholder-[#555555] outline-none"
              />
              <button onClick={() => setShowEmojiPicker(showEmojiPicker === "input" ? null : "input")}
                className="text-[#888888] text-lg shrink-0">😊</button>
              <button onClick={() => sendMessage()} disabled={!inputText.trim()}
                className="h-8 w-8 bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] disabled:opacity-40 rounded-full flex items-center justify-center shrink-0">
                <Send size={13} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ MESSAGE ACTION OVERLAY (tap-hold bubble) ═══════════════════ */}
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
                onClick={() => setShowEmojiPicker(showEmojiPicker === "drawer" ? null : "drawer")}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#29b6d8] to-[#1a86c8] text-white shadow-[0_10px_24px_rgba(26,134,200,0.28)] transition hover:scale-[1.03]"
                aria-label="More reactions"
              >
                <Smile size={17} />
              </button>
              <button
                onClick={() => {
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
              {actionMessage.uid === user.uid && !actionMessage.deleted ? (
                <button
                  onClick={() => {
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
                <p className="mt-0.5 text-sm text-[#888888]">{org.name}</p>
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
              {contactMembers.filter(m => isOnline(m.uid)).length > 0 && (
                <>
                  <p className="mb-3 mt-2 text-xs tracking-[0.14em] text-[#888888]">available</p>
                  {contactMembers.filter(m => isOnline(m.uid)).map(m => (
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
              {contactMembers.filter(m => !isOnline(m.uid)).length > 0 && (
                <>
                  <p className="mb-3 mt-6 text-xs tracking-[0.14em] text-[#888888]">offline</p>
                  {contactMembers.filter(m => !isOnline(m.uid)).map(m => (
                    <button key={m.uid} onClick={() => startDM(m.uid)}
                      className="flex w-full items-center gap-4 border-b border-[#2d2d2d] py-2.5">
                      <div className="relative">
                        <Avatar name={m.displayName} size={44} uid={m.uid} />
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#1c1c1c] bg-[#555555]" />
                      </div>
                      <div className="flex flex-1 items-center gap-3 text-left text-[15px] text-[#888888]">
                        <span className="min-w-0 flex-1 truncate">{m.displayName}</span>
                        <span className="w-[52px] shrink-0 text-right text-sm text-[#555555]">offline</span>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {contactMembers.length === 0 && (
                <p className="mt-20 text-center text-sm text-[#888888]">
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
                <p className="mt-0.5 text-sm text-[#888888]">{org.name}</p>
              </div>
              <button
                onClick={() => setShowContacts(false)}
                className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#0096C7] text-white"
              >
                <ArrowRight size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2">
              {contactMembers.filter(m => isOnline(m.uid)).length > 0 && (
                <>
                  <p className="mb-3 mt-2 text-xs tracking-[0.14em] text-[#888888]">available</p>
                  {contactMembers.filter(m => isOnline(m.uid)).map(m => (
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
              {contactMembers.filter(m => !isOnline(m.uid)).length > 0 && (
                <>
                  <p className="mb-3 mt-6 text-xs tracking-[0.14em] text-[#888888]">offline</p>
                  {contactMembers.filter(m => !isOnline(m.uid)).map(m => (
                    <button key={m.uid} onClick={() => startDM(m.uid)}
                      className="flex w-full items-center gap-4 border-b border-[#2d2d2d] py-2.5">
                      <div className="relative">
                        <Avatar name={m.displayName} size={44} uid={m.uid} />
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#1c1c1c] bg-[#555555]" />
                      </div>
                      <div className="flex flex-1 items-center gap-3 text-left text-[15px] text-[#888888]">
                        <span className="min-w-0 flex-1 truncate">{m.displayName}</span>
                        <span className="w-[52px] shrink-0 text-right text-sm text-[#555555]">offline</span>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {contactMembers.length === 0 && (
                <p className="mt-20 text-center text-sm text-[#888888]">
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
              {contactMembers.filter(m => isOnline(m.uid)).length > 0 && (
                <>
                  <p className="mb-3 mt-2 text-xs tracking-[0.14em] text-[#67a7ba]">available</p>
                  {contactMembers.filter(m => isOnline(m.uid)).map(m => (
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
              {contactMembers.filter(m => !isOnline(m.uid)).length > 0 && (
                <>
                  <p className="mb-3 mt-6 text-xs tracking-[0.14em] text-[#67a7ba]">offline</p>
                  {contactMembers.filter(m => !isOnline(m.uid)).map(m => (
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
              {contactMembers.length === 0 && (
                <p className="text-[#7aa8b7] text-sm text-center mt-20">
                  No members yet.<br />Code: <span className="text-[#176d8c] tracking-widest">{org.joinCode}</span>
                </p>
              )}
            </div>

          </div>
        </>
      ) : null}

      {/* ═══════════════════ NEW DM OVERLAY ═══════════════════ */}
      {showNewDM && (
        <div className="absolute inset-0 bg-[#0d1b2a] z-20 flex flex-col">
          <div
            className="px-5 pb-4 flex items-center justify-between border-b border-white/10"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}
          >
            <span className="text-white text-lg">New message</span>
            <button onClick={() => setShowNewDM(false)}><X size={22} className="text-white/60" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {contactMembers.map(m => (
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

      {/* ═══════════════════ NEW CHANNEL MODAL ═══════════════════ */}

      {/* ═══════════════════ PROFILE DRAWER ═══════════════════ */}
      {showProfile && (
        <div className="absolute inset-0 z-30">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowProfile(false)} />
          <div className="fixed inset-y-0 right-0 z-30 flex h-[100dvh] w-72 flex-col rounded-l-[34px] border-l border-[#2d2d2d] bg-[#1c1c1c] shadow-[-12px_0_28px_rgba(0,0,0,0.4)] lg:hidden"
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="border-b border-[#2d2d2d] px-5 pt-12 pb-6">
              <div className="mb-6 flex items-center justify-between">
                <span className="text-[#e0e0e0]">Profile</span>
                <button onClick={() => setShowProfile(false)}><X size={20} className="text-[#888888]" /></button>
              </div>
              <div className="flex flex-col items-center">
                <Avatar name={displayName} size={70} uid={user.uid} />
                <p className="mt-3 text-[15px] text-[#e0e0e0]">{user.displayName}</p>
                <p className="mt-1 text-sm text-[#0096C7]">{clinicalRoleLabel}</p>
                <p className="mt-1 text-sm text-[#888888]">{user.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-sm text-emerald-400">Online</span>
                </div>
              </div>
            </div>
            <div className="border-b border-[#2d2d2d] px-5 py-4">
              <p className="mb-3 text-xs tracking-widest text-[#888888]">workspace</p>
              <p className="text-[15px] text-[#e0e0e0]">{hospitalLabel}</p>
              <p className="mt-1 text-sm text-[#888888]">{groupLabel}</p>
              <p className="mt-1 text-sm text-[#888888]">
                Join code: <span className="tracking-widest text-[#0096C7]">{org.joinCode}</span>
              </p>
            </div>
            <div className="flex flex-1 flex-col gap-1 px-5 py-4">
              <button className="flex items-center gap-3 py-3.5 text-[15px] text-[#888888]">
                <Settings size={18} /> Settings
              </button>
              <button onClick={handleSwitchOrg} className="flex items-center gap-3 py-3.5 text-[15px] text-[#888888]">
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

      {/* ═══════════════════ CALL UI ═══════════════════ */}
      {callState !== "idle" && (
        <div className="absolute inset-0 bg-[#0d1b2a]/95 z-40 flex flex-col items-center justify-center gap-10"
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className={`absolute inset-0 overflow-hidden ${activeCall?.mode === "video" && !tomVoiceMode ? "" : "hidden"}`}>
            <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-6 right-5 h-32 w-24 rounded-[20px] border border-white/30 object-cover shadow-[0_18px_40px_rgba(0,0,0,0.28)]"
            />
          </div>
          <div className="flex flex-col items-center gap-5">
            {callState === "incoming" && callerInfo ? (
              <>
                <Avatar name={callerInfo.displayName} size={90} uid={callerInfo.uid} />
                <div className="text-center">
                  <p className="text-white text-xl">{callerInfo.displayName}</p>
                  <p className="text-white/50 text-base mt-1">Incoming call…</p>
                </div>
              </>
            ) : callState === "outgoing" ? (
              <>
                <div className="w-24 h-24 rounded-full bg-[#29b6d8]/20 flex items-center justify-center">
                  <Phone size={40} className="text-[#29b6d8]" />
                </div>
                <div className="text-center">
                  <p className="text-white text-xl">Calling…</p>
                  <p className="text-white/50 text-base mt-1">{selectedThread ? getThreadName(selectedThread) : ""}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Phone size={40} className="text-emerald-400" />
                </div>
                <div className="text-center">
                  <p className="text-white text-xl">{tomVoiceMode ? "TOM voice mode" : "On call"}</p>
                  <p className="text-white/50 text-base mt-1">{tomVoiceMode ? "Connected" : "Connected"}</p>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-8">
            {callState === "incoming" && (
              <button onClick={answerCall}
                className="w-18 h-18 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg"
                style={{ width: 72, height: 72 }}>
                <PhoneIncoming size={28} className="text-white" />
              </button>
            )}
            <button
              onClick={callState === "incoming" ? declineCall : endCall}
              className="bg-red-500 rounded-full flex items-center justify-center shadow-lg"
              style={{ width: 72, height: 72 }}
            >
              <PhoneOff size={28} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
