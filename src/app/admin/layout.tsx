"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { isAdminSession } from "@/lib/admin"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router  = useRouter()
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    if (isAdminSession()) {
      setOk(true)
    } else {
      router.replace("/")
    }
  }, [router])

  if (!ok) return null

  return <>{children}</>
}
