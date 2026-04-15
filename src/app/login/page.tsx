"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  signInWithGoogle,
  signInWithMicrosoft,
  getLoginRedirectResult,
  onAuthChange,
} from "@/lib/auth"
import { auth } from "@/lib/firebase"

// ── Theatre light geometry ────────────────────────────────────────────────────
// SVG viewBox="0 0 300 320"  CX=150, CY=190 (fixture centre)
const CX = 150, CY = 190
const RINGS = [
  { r: 0,   n: 1,  lr: 14 },
  { r: 30,  n: 8,  lr: 9  },
  { r: 58,  n: 14, lr: 9  },
  { r: 87,  n: 20, lr: 8  },
  { r: 113, n: 24, lr: 8  },
]

function formatSvgCoord(value: number) {
  return value.toFixed(6)
}

const LEDS: { x: string; y: string; r: number; idx: number }[] = []
let idx = 0
for (const { r, n, lr } of RINGS) {
  for (let j = 0; j < n; j++) {
    const angle = n === 1 ? 0 : (2 * Math.PI * j) / n - Math.PI / 2
    LEDS.push({
      x: formatSvgCoord(CX + r * Math.cos(angle)),
      y: formatSvgCoord(CY + r * Math.sin(angle)),
      r: lr,
      idx: idx++,
    })
  }
}

const PENDING_PROVIDER_KEY = "prepsight_pending_auth"

function readPendingProvider() {
  if (typeof window === "undefined") return null
  const value =
    window.localStorage.getItem(PENDING_PROVIDER_KEY) ??
    window.sessionStorage.getItem(PENDING_PROVIDER_KEY)
  return value === "google" || value === "microsoft" ? value : null
}

function writePendingProvider(provider: "google" | "microsoft") {
  if (typeof window === "undefined") return
  window.localStorage.setItem(PENDING_PROVIDER_KEY, provider)
  window.sessionStorage.setItem(PENDING_PROVIDER_KEY, provider)
}

function clearPendingProvider() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(PENDING_PROVIDER_KEY)
  window.sessionStorage.removeItem(PENDING_PROVIDER_KEY)
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter()
  const authConfigured = Boolean(auth)
  const pendingProvider = readPendingProvider()

  const [lit,           setLit]           = useState(() => pendingProvider !== null)
  const [loading,       setLoading]       = useState<"google" | "microsoft" | null>(() => pendingProvider)
  const [error,         setError]         = useState<string | null>(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [debugLines,    setDebugLines]    = useState<string[]>([])
  const [showDebug,     setShowDebug]     = useState(false)

  function appendDebug(message: string) {
    if (!showDebug) return
    const timestamp = new Date().toISOString().slice(11, 19)
    setDebugLines((current) => [`${timestamp} ${message}`, ...current].slice(0, 12))
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    setShowDebug(window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  }, [])

  useEffect(() => {
    if (!showDebug) return
    appendDebug(`page loaded path=${window.location.pathname} search=${window.location.search || "(none)"}`)
    appendDebug(`auth configured=${String(authConfigured)} pending=${pendingProvider ?? "(none)"} currentUser=${auth?.currentUser?.uid ?? "(none)"}`)
  }, [showDebug, authConfigured, pendingProvider])

  // Handle redirect result (mobile sign-in returns here after redirect)
  useEffect(() => {
    if (!authConfigured) return
    appendDebug("checking redirect result")

    getLoginRedirectResult()
      .then((result) => {
        if (result?.user) {
          appendDebug(`redirect result user uid=${result.user.uid}`)
          clearPendingProvider()
          setAuthenticated(true)
          setLoading(null)
          router.replace("/")
          return
        }
        if (pendingProvider) {
          appendDebug("redirect result empty, clearing pending provider")
          clearPendingProvider()
          setLoading(null)
          setError(null)
        } else {
          appendDebug("redirect result empty")
        }
      })
      .catch((e: unknown) => {
        clearPendingProvider()
        const code =
          typeof e === "object" && e !== null && "code" in e
            ? String((e as { code?: string }).code ?? "")
            : ""
        appendDebug(`redirect result error code=${code || "(none)"} message=${e instanceof Error ? e.message : "unknown"}`)
        if (code === "auth/missing-initial-state") {
          setError("Sign-in session expired. Open the site in your browser and try again.")
          setLoading(null)
          return
        }
        const msg = e instanceof Error ? e.message : "Sign-in failed"
        setError(msg)
        setLoading(null)
      })
  }, [authConfigured, pendingProvider, router])

  useEffect(() => {
    return onAuthChange((user) => {
      appendDebug(`auth state changed uid=${user?.uid ?? "(none)"}`)
      if (!user) return
      clearPendingProvider()
      setLit(true)
      setAuthenticated(true)
      setLoading(null)
      router.replace("/")
    })
  }, [router])

  function handleLight() {
    if (!lit) setLit(true)
  }

  async function handleGoogle() {
    if (!authConfigured) {
      setError("Local Firebase auth is not configured. Add a real .env.local to test login on localhost.")
      return
    }
    appendDebug("google sign-in clicked")
    setError(null); setLoading("google")
    try {
      writePendingProvider("google")
      appendDebug("pending provider set to google")
      const signIn = await signInWithGoogle()
      appendDebug(`google sign-in method=${signIn.method}`)
      if (signIn.method === "redirect") {
        return
      }
      clearPendingProvider()
      setLoading(null)
      setAuthenticated(true)
      router.replace("/")
    } catch (e: unknown) {
      clearPendingProvider()
      appendDebug(`google sign-in error message=${e instanceof Error ? e.message : "unknown"}`)
      const msg = e instanceof Error ? e.message : "Sign-in failed"
      if (!msg.includes("popup-closed")) setError(msg)
      setLoading(null)
    }
  }

  async function handleMicrosoft() {
    if (!authConfigured) {
      setError("Local Firebase auth is not configured. Add a real .env.local to test login on localhost.")
      return
    }
    appendDebug("microsoft sign-in clicked")
    setError(null); setLoading("microsoft")
    try {
      writePendingProvider("microsoft")
      appendDebug("pending provider set to microsoft")
      const signIn = await signInWithMicrosoft()
      appendDebug(`microsoft sign-in method=${signIn.method}`)
      if (signIn.method === "redirect") {
        return
      }
      clearPendingProvider()
      setLoading(null)
      setAuthenticated(true)
      router.replace("/")
    } catch (e: unknown) {
      clearPendingProvider()
      appendDebug(`microsoft sign-in error message=${e instanceof Error ? e.message : "unknown"}`)
      const msg = e instanceof Error ? e.message : "Sign-in failed"
      if (!msg.includes("popup-closed")) setError(msg)
      setLoading(null)
    }
  }

  const ledFill = authenticated ? "#ffffff" : (lit ? "#fffde7" : "#1a1a1a")
  function ledTransition(i: number) {
    return authenticated
      ? "fill 0.05s ease"
      : `fill 0.08s ease ${i * 11}ms, filter 0.08s ease ${i * 11}ms`
  }

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center overflow-hidden select-none"
      style={{ backgroundColor: "#000" }}
    >
      {/* ── Auth success burst flash ───────────────────────────────────────── */}
      {authenticated && (
        <div
          className="absolute inset-0 pointer-events-none z-50"
          style={{
            animation: "lightBurst 0.8s ease-out forwards",
            background: "radial-gradient(ellipse 110% 75% at 50% 0%, rgba(255,255,240,0.95) 0%, rgba(255,244,180,0.5) 35%, transparent 70%)",
          }}
        />
      )}

      {/* ── Warm glow radiates from fixture when lit ──────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: lit ? 1 : 0,
          transition: authenticated ? "opacity 0.3s ease" : "opacity 1.2s ease",
          background: authenticated
            ? "radial-gradient(ellipse 100% 65% at 50% 0%, rgba(255,255,220,0.25) 0%, rgba(255,244,180,0.08) 45%, transparent 80%)"
            : "radial-gradient(ellipse 90% 55% at 50% 0%, rgba(255,244,180,0.12) 0%, rgba(255,244,180,0.04) 45%, transparent 80%)",
        }}
      />

      {/* ── Theatre light SVG ─────────────────────────────────────────────── */}
      <div
        className="relative z-10 flex-shrink-0"
        style={{ cursor: lit ? "default" : "pointer", marginTop: "-2px" }}
        onClick={handleLight}
        role={lit ? undefined : "button"}
        aria-label={lit ? undefined : "Turn on the theatre light"}
      >
        <svg viewBox="0 0 300 320" className="w-72 h-auto md:w-80">
          <defs>
            <radialGradient id="ledglow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#fffde7" />
              <stop offset="60%"  stopColor="#fff8e1" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fff8e1" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="ledglow-burst" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#ffffff" />
              <stop offset="50%"  stopColor="#fffde7" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#fffde7" stopOpacity="0" />
            </radialGradient>
            <filter id="bloom" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="bloom-burst" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Ceiling arm */}
          <rect
            x="143" y="0" width="14" height="58" rx="4"
            fill={lit ? "#666" : "#252525"}
            style={{ transition: "fill 0.6s ease" }}
          />

          {/* Mounting yoke */}
          <rect
            x="126" y="52" width="48" height="16" rx="5"
            fill={lit ? "#777" : "#2a2a2a"}
            style={{ transition: "fill 0.6s ease" }}
          />

          {/* Outer housing */}
          <circle
            cx={CX} cy={CY} r="132"
            fill={lit ? "#181818" : "#111"}
            style={{ transition: "fill 0.8s ease" }}
          />
          <circle
            cx={CX} cy={CY} r="132"
            fill="none" stroke={lit ? "#555" : "#1e1e1e"} strokeWidth="5"
            style={{ transition: "stroke 0.8s ease" }}
          />

          {/* Inner reflector bowl */}
          <circle
            cx={CX} cy={CY} r="118"
            fill={lit ? "#0d0d0d" : "#0a0a0a"}
            style={{ transition: "fill 0.8s ease" }}
          />

          {/* LED modules */}
          {LEDS.map((led) => (
            <circle
              key={led.idx}
              cx={led.x} cy={led.y} r={led.r}
              fill={ledFill}
              filter={authenticated ? "url(#bloom-burst)" : (lit ? "url(#bloom)" : undefined)}
              style={{ transition: ledTransition(led.idx) }}
            />
          ))}

          {/* Centre handle grip */}
          <circle cx={CX} cy={CY} r="20" fill={lit ? "#666" : "#222"} style={{ transition: "fill 0.6s ease" }} />
          <circle cx={CX} cy={CY} r="11" fill={lit ? "#444" : "#181818"} style={{ transition: "fill 0.6s ease" }} />

          {/* Lens bloom overlay when lit */}
          {lit && (
            <circle
              cx={CX} cy={CY} r="118"
              fill={authenticated ? "url(#ledglow-burst)" : "url(#ledglow)"}
              style={{ opacity: authenticated ? 0.5 : 0.18, transition: "opacity 0.1s ease" }}
            />
          )}
        </svg>
      </div>

      {/* ── Pre-click hint ────────────────────────────────────────────────── */}
      <p
        className="text-[#333] text-xs font-semibold tracking-[0.25em] uppercase mt-1 z-10"
        style={{
          opacity: lit ? 0 : 1,
          transition: "opacity 0.4s ease",
          pointerEvents: "none",
          animation: !lit ? "pulse 2s ease-in-out infinite" : "none",
        }}
      >
        Enter the theatre
      </p>

      {/* ── Login content — slides in when lit ────────────────────────────── */}
      <div
        className="w-full max-w-sm px-6 pb-10 flex flex-col items-center z-10"
        style={{
          opacity: lit ? 1 : 0,
          transform: lit ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.6s ease 600ms, transform 0.6s ease 600ms",
          pointerEvents: lit ? "auto" : "none",
        }}
      >
        {/* PrepSight */}
        <h1
          className="text-5xl font-extrabold text-[#00B4D8] tracking-tight mb-1"
          style={{
            opacity: lit ? 1 : 0,
            transition: "opacity 0.5s ease 1180ms",
          }}
        >
          PrepSight
        </h1>

        {/* Tagline + description */}
        <div
          className="text-center mb-6"
          style={{
            opacity: lit ? 1 : 0,
            transition: "opacity 0.5s ease 1380ms",
          }}
        >
          <p className="text-[#e5e5e5] font-semibold text-sm mb-3">Every case. Every setting. Every team.</p>
          <p className="text-xs text-[#444] mt-3 leading-relaxed">
            Intended to support preparation, not replace local policy or
            professional judgement.
          </p>
        </div>

        {/* Sign-in card */}
        <div
          className="w-full"
          style={{
            opacity: lit ? 1 : 0,
            transition: "opacity 0.5s ease 1580ms",
          }}
        >
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl p-5">
            <p className="text-xs font-semibold text-[#555] uppercase tracking-widest text-center mb-4">
              Sign in to continue
            </p>

            <button
              onClick={handleGoogle}
              disabled={loading !== null || authenticated}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-[#282828] rounded-xl text-sm font-semibold text-[#bbb] hover:bg-[#181818] active:bg-[#222] transition-colors disabled:opacity-40 mb-3"
            >
              {loading === "google" ? <BtnSpinner /> : <GoogleIcon />}
              Continue with Google
            </button>

            <button
              onClick={handleMicrosoft}
              disabled={loading !== null || authenticated}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-[#282828] rounded-xl text-sm font-semibold text-[#bbb] hover:bg-[#181818] active:bg-[#222] transition-colors disabled:opacity-40"
            >
              {loading === "microsoft" ? <BtnSpinner /> : <MicrosoftIcon />}
              Continue with Microsoft
            </button>

            {error ? (
              <p
                className={`mt-4 text-xs text-center ${
                  authConfigured ? "text-red-400" : "text-amber-400"
                }`}
              >
                {error}
              </p>
            ) : null}
            {loading && !error ? (
              <p className="mt-4 text-xs text-[#7a7a7a] text-center">
                Completing sign-in...
              </p>
            ) : null}
            {!authConfigured && !error ? (
              <p className="mt-4 text-xs text-amber-400 text-center leading-relaxed">
                Local Firebase auth is not configured. Add a real `.env.local` to test login on localhost.
              </p>
            ) : null}
          </div>

          <p className="mt-4 text-xs text-[#2a2a2a] text-center leading-relaxed">
            PrepSight is a product of MEDASKCA™
          </p>
          <p className="mt-2 text-xs text-[#4f6d78] text-center leading-relaxed">
            <Link href="/privacy" className="underline underline-offset-2 hover:text-[#0F4C5C]">
              Privacy
            </Link>
            {" · "}
            <Link href="/terms" className="underline underline-offset-2 hover:text-[#0F4C5C]">
              Terms
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function BtnSpinner() {
  return <span className="w-4 h-4 border-2 border-[#333] border-t-[#4DA3FF] rounded-full animate-spin" />
}

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18">
      <rect width="8.5"  height="8.5"               fill="#F25022"/>
      <rect x="9.5"      width="8.5"  height="8.5"  fill="#7FBA00"/>
      <rect y="9.5"      width="8.5"  height="8.5"  fill="#00A4EF"/>
      <rect x="9.5" y="9.5" width="8.5" height="8.5" fill="#FFB900"/>
    </svg>
  )
}
