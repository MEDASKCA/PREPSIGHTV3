"use client"

import Link from "next/link"
import { useSyncExternalStore } from "react"
import { useSearchParams } from "next/navigation"
import MobileProcedureRepositoryView from "@/components/MobileProcedureRepositoryView"
import ProcedurePageClient from "@/components/ProcedurePageClient"
import SharedProcedureIndexView from "@/components/SharedProcedureIndexView"
import HistoryTracker from "@/components/HistoryTracker"
import { decorateCardSections } from "@/lib/catalogue"
import {
  getLibrariesSnapshot,
  getLibraryByIdSnapshot,
  getLibraryCardByIdSnapshot,
  subscribeLibraries,
} from "@/lib/libraries"
import { buildSystemCardSections } from "@/lib/system-card"
import {
  getCuratedVariantsForProcedureWithSystems,
  getProcedureVariantById,
  getSystemById,
} from "@/lib/variants"

export default function LibraryCardRouteClient({
  libraryId,
  cardId,
}: {
  libraryId: string
  cardId: string
}) {
  const searchParams = useSearchParams()
  useSyncExternalStore(subscribeLibraries, getLibrariesSnapshot, getLibrariesSnapshot)

  const library = getLibraryByIdSnapshot(libraryId)
  const card = getLibraryCardByIdSnapshot(libraryId, cardId)

  if (!library || !card) {
    return (
      <div className="app-shell-bg flex min-h-screen items-center justify-center px-6">
        <div className="app-card-bg app-card-border w-full max-w-lg rounded-[28px] border px-6 py-7 text-center">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#5B7288]">Card Not Found</p>
          <p className="mt-2 text-[20px] tracking-[-0.03em] text-[#10243E]">
            This card is not available in the selected library.
          </p>
          <Link href="/" className="mt-5 inline-flex rounded-xl bg-[#4DA3FF] px-4 py-3 text-sm text-white">
            Return home
          </Link>
        </div>
      </div>
    )
  }

  const variantId = searchParams.get("variant") ?? undefined
  const systemId = searchParams.get("system") ?? undefined
  const variants =
    library.libraryType === "shared"
      ? getCuratedVariantsForProcedureWithSystems(card.id, card.name)
      : []
  const isPublishedSharedVersion =
    library.libraryType === "shared" && card.publishState === "published"

  if (
    library.libraryType === "shared" &&
    !isPublishedSharedVersion &&
    variants.length > 0 &&
    !(variantId && systemId)
  ) {
    return <SharedProcedureIndexView libraryId={libraryId} procedure={card} variants={variants} />
  }

  const selectedVariant = variantId ? getProcedureVariantById(variantId) : null
  const selectedSystem = systemId ? getSystemById(systemId) : null
  const routeSections =
    selectedVariant && selectedSystem
      ? buildSystemCardSections(
          card,
          selectedVariant.id,
          selectedVariant.name,
          selectedSystem.id,
          selectedSystem.name,
        )
      : card.sections

  const decoratedSections = decorateCardSections(routeSections)

  return (
    <>
      <HistoryTracker id={card.id} />
      {library.libraryType === "shared" ? (
        <MobileProcedureRepositoryView
          procedure={{
            ...card,
            name: selectedSystem?.name ?? card.name,
            description: selectedSystem?.description ?? card.description,
            implantSystem: selectedSystem?.name ?? card.implantSystem,
          }}
          sections={decoratedSections}
          sourceProcedure={card}
          selectedVariantId={selectedVariant?.id}
          selectedVariantName={selectedVariant?.name}
          selectedSystemId={selectedSystem?.id}
          selectedSystemName={selectedSystem?.name}
        />
      ) : (
        <ProcedurePageClient
          procedure={card}
          cardSections={decoratedSections}
          cardKey={`${library.id}__${card.id}`}
          title={card.name}
          subtitle={
            card.cardScope === "local"
              ? `${library.name} - Local card`
              : `${library.name} - Shared card`
          }
          tertiaryLabel={card.implantSystem}
          implantSystem={card.implantSystem}
        />
      )}
    </>
  )
}
