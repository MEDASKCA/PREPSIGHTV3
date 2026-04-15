"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { onAuthChange, type User } from "@/lib/auth"
import { hasCompleteProfile, isCompleteProfile, resolveProfile, shouldForceOnboarding } from "@/lib/profile"
import AdminUnlocker from "./AdminUnlocker"

const PUBLIC_ROUTES    = ["/login"]
const ONBOARDING_ROUTE = "/onboarding"
const ADMIN_ROUTE      = "/admin"

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
  const isOnboarding = pathname === ONBOARDING_ROUTE
  const isAdmin = pathname.startsWith(ADMIN_ROUTE)

  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [profileReady, setProfileReady] = useState(false)
  const [profileComplete, setProfileComplete] = useState(false)

  useEffect(() => {
    return onAuthChange((u) => setUser(u))
  }, [])

  useEffect(() => {
    let cancelled = false

    if (user === undefined) {
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
  }, [user])

  useEffect(() => {
    if (user === undefined || !profileReady) return

    const forceOnboarding = shouldForceOnboarding()

    if (!user && !isPublic) { router.replace("/login"); return }
    if (user && isPublic) { router.replace("/"); return }
    if (user && profileComplete && isOnboarding && !forceOnboarding) { router.replace("/"); return }
    if (user && (!profileComplete || forceOnboarding) && !isOnboarding && !isAdmin) { router.replace("/onboarding"); return }
  }, [user, profileReady, profileComplete, pathname, router])

  if (isPublic) {
    return <><AdminUnlocker />{children}</>
  }

  if (user === undefined || !profileReady) {
    return <LoadingScreen message="Loading..." />
  }

  if (!user) {
    return isPublic
      ? <><AdminUnlocker />{children}</>
      : <LoadingScreen message="Loading..." />
  }

  if (isPublic) {
    return <LoadingScreen message="Loading..." />
  }

  const forceOnboarding = shouldForceOnboarding()

  if (!profileComplete || forceOnboarding) {
    return isOnboarding
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
