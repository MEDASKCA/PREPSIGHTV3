"use client"

import { useState } from "react"
import TriangleIcon from "@/components/TriangleIcon"
import ProcedureCard from "./ProcedureCard"
import { getSurgeonsForProcedure } from "@/lib/surgeons"
import { Procedure } from "@/lib/types"

interface Props {
  specialty: string
  procedures: Procedure[]
  defaultOpen?: boolean
}

export default function SpecialtySection({ specialty, procedures, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#D5DCE3]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-[#4DA3FF] px-4 py-3.5 flex items-center justify-between gap-2 hover:bg-[#2F8EF7] transition-colors"
      >
        <h2 className="flex-1 min-w-0 whitespace-normal break-words text-white font-semibold text-base leading-snug">
          {specialty}
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          {open ? <TriangleIcon direction="up" size={10} className="text-white" /> : <TriangleIcon direction="down" size={10} className="text-white" />}
          <span className="text-white text-xs tabular-nums text-right min-w-[7.5rem]">
            {procedures.length} {procedures.length === 1 ? "procedure" : "procedures"}
          </span>
        </div>
      </button>

      {open && (
        <div className="divide-y divide-[#F4F7FA]">
          {procedures.map((p) => (
            <ProcedureCard
              key={p.id}
              procedure={p}
              cardCount={1 + getSurgeonsForProcedure(p.id).length}
            />
          ))}
        </div>
      )}
    </div>
  )
}
