"use client"

import { useEffect, useState } from "react"
import LibrariesDashboard from "./LibrariesDashboard"
import PublicLanding from "./PublicLanding"
import { onAuthChange, type User } from "@/lib/auth"
import { auth } from "@/lib/firebase"

export default function RootEntry() {
  const [user, setUser] = useState<User | null>(() => auth?.currentUser ?? null)

  useEffect(() => {
    return onAuthChange((nextUser) => {
      setUser(nextUser)
    })
  }, [])

  return user ? <LibrariesDashboard /> : <PublicLanding />
}
