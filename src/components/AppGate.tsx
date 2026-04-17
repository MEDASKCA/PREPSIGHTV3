"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { onAuthChange, type User } from "@/lib/auth"
import { hasCompleteProfile, isCompleteProfile, resolveProfile, shouldForceOnboarding } from "@/lib/profile"
import AdminUnlocker from "./AdminUnlocker"
import MedaskcaLoadingScreen from "./MedaskcaLoadingScreen"

const PUBLIC_ROUTES    = ["/login", "/privacy", "/terms"]
const ONBOARDING_ROUTE = "/onboarding"
const ADMIN_ROUTE      = "/admin"
const PENDING_AUTH_KEY = "prepsight_pending_auth"
const ALLOW_GUEST_BROWSING = true

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

    if (!user && isAdmin && !pendingAuth) { router.replace("/login"); return }
    if (ALLOW_GUEST_BROWSING && !user && pathname === "/login") { router.replace("/"); return }
    if (!ALLOW_GUEST_BROWSING && !user && !isPublic && !pendingAuth) { router.replace("/login"); return }
    if (user && isPublic && !isLegalPage) {
      router.replace((!profileComplete || forceOnboarding) ? "/onboarding" : "/")
      return
    }
    if (user && profileComplete && isOnboarding && !forceOnboarding) { router.replace("/"); return }
    if (user && (!profileComplete || forceOnboarding) && !isOnboarding && !isAdmin && !isLegalPage && !isPublic) {
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

  if (!authReady || user === undefined || !profileReady) {
    return <MedaskcaLoadingScreen message="Loading..." />
  }

  if (!user) {
    if (ALLOW_GUEST_BROWSING && !isAdmin && !isOnboarding) {
      return (
        <div className="min-h-screen bg-[#F4F7FA]">
          <div className="min-w-0 flex min-h-screen flex-col">
            <main className="flex-1">{children}</main>
          </div>
          <AdminUnlocker />
        </div>
      )
    }

    return isPublic
      ? <><AdminUnlocker />{children}</>
      : <MedaskcaLoadingScreen message="Loading..." />
  }

  if (isPublic && !isLegalPage) {
    return <MedaskcaLoadingScreen message="Loading..." />
  }

  const forceOnboarding = shouldForceOnboarding()

  if (!profileComplete || forceOnboarding) {
    return isOnboarding
      ? <><AdminUnlocker />{children}</>
      : isLegalPage
        ? <><AdminUnlocker />{children}</>
      : isAdmin
        ? <><AdminUnlocker />{children}</>
        : <MedaskcaLoadingScreen message="Loading..." />
  }

  if (isOnboarding) {
    return <MedaskcaLoadingScreen message="Loading..." />
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
