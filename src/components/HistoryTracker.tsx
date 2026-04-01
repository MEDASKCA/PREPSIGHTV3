"use client"

import { useEffect } from "react"
import { addToHistory } from "@/lib/history"

export default function HistoryTracker({
  id,
  variantId,
  systemId,
}: {
  id: string
  variantId?: string
  systemId?: string
}) {
  useEffect(() => {
    addToHistory({ procedureId: id, variantId, systemId })
  }, [id, variantId, systemId])
  return null
}
