"use client"

import { useEffect, useState } from "react"
import PrepSightV4App from "./PrepSightV4App"
import PublicLanding from "./PublicLanding"
import MedaskcaLoadingScreen from "./MedaskcaLoadingScreen"
import { onAuthChange, type User } from "@/lib/auth"

export default function RootEntry() {
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => {
    return onAuthChange((nextUser) => {
      setUser(nextUser)
    })
  }, [])

  if (user === undefined) return <MedaskcaLoadingScreen message="Loading..." />
  return user ? <PrepSightV4App /> : <PublicLanding />
}
