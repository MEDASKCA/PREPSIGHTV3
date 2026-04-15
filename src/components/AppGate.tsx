"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { onAuthChange, type User } from "@/lib/auth"
import { hasCompleteProfile, isCompleteProfile, resolveProfile, shouldForceOnboarding } from "@/lib/profile"
import AdminUnlocker from "./AdminUnlocker"

const PUBLIC_ROUTES    = ["/login", "/privacy", "/terms"]
const ONBOARDING_ROUTE = "/onboarding"
const ADMIN_ROUTE      = "/admin"
const PENDING_AUTH_KEY = "prepsight_pending_auth"

const BRAND_LETTERS = "MEDASKCA".split("")

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-medaskca.png"
        alt="MEDASKCA"
        className="w-16 h-16 rounded-full mb-6"
        style={{ animation: "medaskca-pulse 2s ease-in-out infinite" }}
      />

      <div className="flex gap-1 mb-6">
        {BRAND_LETTERS.map((letter, i) => (
          <span
            key={i}
            className="text-2xl font-bold tracking-widest text-white"
            style={{ animation: `medaskca-pulse 2s ease-in-out ${i * 80}ms infinite` }}
          >
            {letter}
          </span>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#00B4D8]"
            style={{ animation: `dot-bounce 1.2s ease-in-out ${i * 200}ms infinite` }}
          />
        ))}
      </div>

      <p className="text-xs text-[#555] tracking-widest uppercase">{message}</p>
    </div>
  )
}

export default function AppGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isPublic = PUBLIC_ROUTES.includes(pathname)
  const isLegalPage = pathname === "/privacy" || pathname === "/terms"
  const isOnboarding = pathname === ONBOARDING_ROUTE
  const isAdmin = pathname.startsWith(ADMIN_ROUTE)

  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [authReady, setAuthReady] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const [profileComplete, setProfileComplete] = useState(false)

  function hasPendingAuth() {
    if (typeof window === "undefined") return false
    const pending =
      window.localStorage.getItem(PENDING_AUTH_KEY) ??
      window.sessionStorage.getItem(PENDING_AUTH_KEY)
    return pending === "google" || pending === "microsoft"
  }

  useEffect(() => {
    return onAuthChange((u) => {
      setUser(u)
      setAuthReady(true)
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    if (!authReady || user === undefined) {
      setProfileReady(false)
      setProfileComplete(false)
      return
    }

    if (!user) {
      setProfileReady(true)
      setProfileComplete(false)
      return
    }

    const forceOnboarding = shouldForceOnboarding()
    if (forceOnboarding) {
      setProfileReady(true)
      setProfileComplete(false)
      return
    }

    setProfileReady(false)
    void resolveProfile(user.uid)
      .then((profile) => {
        if (cancelled) return
        setProfileComplete(isCompleteProfile(profile) || hasCompleteProfile())
        setProfileReady(true)
      })
      .catch(() => {
        if (cancelled) return
        setProfileComplete(hasCompleteProfile())
        setProfileReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [authReady, user])

  useEffect(() => {
    if (!authReady || user === undefined || !profileReady) return

    const forceOnboarding = shouldForceOnboarding()
    const pendingAuth = hasPendingAuth()

    if (!user && !isPublic && !pendingAuth) { router.replace("/login"); return }
    if (user && pathname === "/login") { router.replace("/"); return }
    if (user && profileComplete && isOnboarding && !forceOnboarding) { router.replace("/"); return }
    if (user && (!profileComplete || forceOnboarding) && !isOnboarding && !isAdmin && !isLegalPage) {
      router.replace("/onboarding")
      return
    }
  }, [
    authReady,
    user,
    profileReady,
    profileComplete,
    pathname,
    router,
    isPublic,
    isOnboarding,
    isAdmin,
    isLegalPage,
  ])

  if (isPublic) {
    return <><AdminUnlocker />{children}</>
  }

  if (!authReady || user === undefined || !profileReady) {
    return <LoadingScreen message="Loading..." />
  }

  if (!user) {
    return isPublic
      ? <><AdminUnlocker />{children}</>
      : <LoadingScreen message="Loading..." />
  }

  if (pathname === "/login") {
    return <LoadingScreen message="Loading..." />
  }

  const forceOnboarding = shouldForceOnboarding()

  if (!profileComplete || forceOnboarding) {
    return isOnboarding
      ? <><AdminUnlocker />{children}</>
      : isLegalPage
        ? <><AdminUnlocker />{children}</>
      : isAdmin
        ? <><AdminUnlocker />{children}</>
        : <LoadingScreen message="Loading..." />
  }

  if (isOnboarding) {
    return <LoadingScreen message="Loading..." />
  }

  if (isAdmin) {
    return <><AdminUnlocker />{children}</>
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <div className="min-w-0 flex min-h-screen flex-col">
        <main className="flex-1">{children}</main>
      </div>
      <AdminUnlocker />
    </div>
  )
}
