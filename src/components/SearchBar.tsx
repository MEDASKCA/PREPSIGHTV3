"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { Procedure } from "@/lib/types"
import ProcedureCard from "./ProcedureCard"

interface Props {
  procedures: Procedure[]
}

export default function SearchBar({ procedures }: Props) {
  const [query, setQuery] = useState("")

  const results =
    query.trim().length > 0
      ? procedures.filter(
          (p) =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.specialty.toLowerCase().includes(query.toLowerCase()) ||
            p.setting.toLowerCase().includes(query.toLowerCase()) ||
            (p.approach ?? "").toLowerCase().includes(query.toLowerCase())
        )
      : []

  return (
    <div>
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search procedures, specialties, settings..."
          className="w-full pl-9 pr-4 py-2.5 border border-[#D5DCE3] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#4DA3FF] focus:border-transparent"
        />
      </div>

      {results.length > 0 && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {results.map((p) => (
            <ProcedureCard key={p.id} procedure={p} />
          ))}
        </div>
      )}

      {query.trim().length > 0 && results.length === 0 && (
        <p className="mt-3 text-sm text-[#94a3b8]">No procedures found for &ldquo;{query}&rdquo;</p>
      )}
    </div>
  )
}
