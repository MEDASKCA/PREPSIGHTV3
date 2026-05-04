"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { onAuthChange, signOut, type User } from "@/lib/auth"
import { readDeviceSession, setSessionConflictNotice } from "@/lib/device-session"
import { subscribeToActiveUserSession } from "@/lib/firestore"
import { hasCompleteProfile, hasOnboardingCompleteFlag, isCompleteProfile, resolveProfile, shouldForceOnboarding } from "@/lib/profile"
import AdminUnlocker from "./AdminUnlocker"
import MedaskcaLoadingScreen from "./MedaskcaLoadingScreen"
import PersistentCommsLayer from "./PersistentCommsLayer"
import DesktopCommsFAB from "./DesktopCommsFAB"

const PUBLIC_ROUTES    = ["/", "/login", "/privacy", "/terms"]
const ONBOARDING_ROUTE = "/onboarding"
const ADMIN_ROUTE      = "/admin"
const PENDING_AUTH_KEY = "prepsight_pending_auth"

export default function AppGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isPublic = PUBLIC_ROUTES.includes(pathname)
  const isLandingPage = pathname === "/"
  const isLegalPage = pathname === "/privacy" || pathname === "/terms"
  const isOnboarding = pathname === ONBOARDING_ROUTE
  const isAdmin = pathname.startsWith(ADMIN_ROUTE)

  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [authReady, setAuthReady] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const [profileComplete, setProfileComplete] = useState(false)
  const sessionTakeoverHandledRef = useRef(false)

  function hasPendingAuth() {
    if (typeof window === "undefined") return false
    try {
      const pending =
        window.localStorage.getItem(PENDING_AUTH_KEY) ??
        window.sessionStorage.getItem(PENDING_AUTH_KEY)
      return pending === "google" || pending === "microsoft" || pending === "microsoft-general"
    } catch {
      return false
    }
  }

  useEffect(() => {
    const unsub = onAuthChange((u) => {
      setUser(u)
      setAuthReady(true)
    })
    // Safety timeout: if Firebase auth hasn't resolved in 8s, unblock the gate
    // so the user isn't stuck on the loading screen forever (e.g. slow mobile IndexedDB).
    const timeout = setTimeout(() => {
      setAuthReady((prev) => {
        if (!prev) {
          setUser(null)
          return true
        }
        return prev
      })
    }, 8000)
    return () => {
      unsub()
      clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    if (!authReady || !user) {
      sessionTakeoverHandledRef.current = false
      return
    }

    const currentSession = readDeviceSession()
    if (!currentSession) return

    return subscribeToActiveUserSession(user.uid, (activeSession) => {
      if (!activeSession || activeSession.sessionId === currentSession.sessionId) {
        sessionTakeoverHandledRef.current = false
        return
      }
      if (sessionTakeoverHandledRef.current) return

      sessionTakeoverHandledRef.current = true
      const confirmed = window.confirm(
        `This account is active on another device (${activeSession.deviceLabel}).\n\nWould you like to sign out of that device and continue here?`,
      )
      if (confirmed) {
        // Claim session on this device — the other device's listener will detect
        // the change and sign itself out automatically.
        return
      }
      setSessionConflictNotice(
        `Signed out — session remains active on ${activeSession.deviceLabel}.`,
      )
      void signOut().finally(() => {
        router.replace("/login")
      })
    })
  }, [authReady, router, user])

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
        setProfileComplete(isCompleteProfile(profile) || hasCompleteProfile() || hasOnboardingCompleteFlag(user.uid))
        setProfileReady(true)
      })
      .catch(() => {
        if (cancelled) return
        setProfileComplete(hasCompleteProfile() || hasOnboardingCompleteFlag(user.uid))
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
    if (!user && !isPublic && !pendingAuth) { router.replace("/login"); return }
    if (user && isPublic && !isLegalPage && !isLandingPage) {
      router.replace((!profileComplete || forceOnboarding) ? "/onboarding" : "/")
      return
    }
    if (user && profileComplete && isOnboarding && !forceOnboarding) { router.replace("/"); return }
    if (
      user &&
      (!profileComplete || forceOnboarding) &&
      !isOnboarding &&
      !isAdmin &&
      !isLegalPage &&
      (!isPublic || isLandingPage)
    ) {
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
    isLandingPage,
    isOnboarding,
    isAdmin,
    isLegalPage,
  ])

  if (!authReady || user === undefined || !profileReady) {
    return <MedaskcaLoadingScreen message="Loading..." />
  }

  if (!user) {
    return isPublic
      ? <><AdminUnlocker />{children}</>
      : <MedaskcaLoadingScreen message="Loading..." />
  }

  if (isPublic && !isLegalPage && !isLandingPage) {
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
      <PersistentCommsLayer />
      <DesktopCommsFAB />
    </div>
  )
}
