"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import PrepSightV4App from "./PrepSightV4App"
import PublicLanding from "./PublicLanding"
import MedaskcaLoadingScreen from "./MedaskcaLoadingScreen"
import { onAuthChange, type User } from "@/lib/auth"
import type { TabKey } from "@/v4/types"

export default function RootEntry({ initialSurface }: { initialSurface?: TabKey }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    return onAuthChange((nextUser) => {
      setUser(nextUser)
    })
  }, [])

  useEffect(() => {
    if (user && pathname === "/" && !initialSurface) {
      if (typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches) {
        router.replace("/comms")
        return
      }
      router.replace("/library")
    }
  }, [initialSurface, pathname, router, user])

  if (user === undefined) return <MedaskcaLoadingScreen message="Loading..." />
  return user ? <PrepSightV4App initialSurface={initialSurface} /> : <PublicLanding />
}
