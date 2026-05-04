"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import MobileResourcesPage from "@/components/MobileResourcesPage"

export default function ResourcesPage() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      router.replace("/resources/workforce")
    }
  }, [router])

  return (
    <div className="lg:hidden">
      <MobileResourcesPage />
    </div>
  )
}
