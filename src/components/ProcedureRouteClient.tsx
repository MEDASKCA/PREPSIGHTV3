"use client"

import Link from "next/link"
import { useSyncExternalStore } from "react"
import ProcedurePageClient from "@/components/ProcedurePageClient"
import HistoryTracker from "@/components/HistoryTracker"
import { getProcedureByIdSnapshot, getProcedureLibrarySnapshot, subscribeProcedureLibrary } from "@/lib/procedure-library"
import { decorateCardSections } from "@/lib/catalogue"

export default function ProcedureRouteClient({
  procedureId,
}: {
  procedureId: string
}) {
  const procedures = useSyncExternalStore(
    subscribeProcedureLibrary,
    getProcedureLibrarySnapshot,
    getProcedureLibrarySnapshot,
  )
  const procedure = procedures.find((entry) => entry.id === procedureId) ?? getProcedureByIdSnapshot(procedureId)

  if (!procedure) {
    return (
      <div className="app-shell-bg flex min-h-screen items-center justify-center px-6">
        <div className="app-card-bg app-card-border w-full max-w-lg rounded-[28px] border px-6 py-7 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5B7288]">
            Procedure Not Found
          </p>
          <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-[#10243E]">
            This card is not available in your current library.
          </h1>
          <p className="mt-3 text-[15px] leading-6 text-[#61758B]">
            It may have been removed, or this device has not synced that draft yet.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-xl bg-[#4DA3FF] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2F8EF7]"
          >
            Return home
          </Link>
        </div>
      </div>
    )
  }

  const decoratedSections = decorateCardSections(procedure.sections)

  return (
    <>
      <HistoryTracker id={procedure.id} />
      <ProcedurePageClient
        procedure={procedure}
        cardSections={decoratedSections}
        cardKey={procedure.id}
        title={procedure.name}
        subtitle={procedure.status === "draft" ? "Draft procedure card" : procedure.approach}
        tertiaryLabel={procedure.implantSystem}
        implantSystem={procedure.implantSystem}
      />
    </>
  )
}
