"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

export default function HistoryBackButton({
  fallbackHref,
  className,
}: {
  fallbackHref: string
  className?: string
}) {
  const router = useRouter()

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
      return
    }

    router.push(fallbackHref)
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={className}
      aria-label="Back"
    >
      <ArrowLeft size={20} />
    </button>
  )
}
