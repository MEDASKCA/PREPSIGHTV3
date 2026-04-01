import { procedures, getProceduresBySpecialty, SEED_SUPERSEDES } from "@/lib/data"
import { ClinicalSetting, Procedure } from "@/lib/types"
import { SETTING_COLOUR, SETTING_SPECIALTIES } from "@/lib/settings"
import { House } from "lucide-react"
import Link from "next/link"
import HomeHero from "@/components/HomeHero"
import OperatingTheatreTabs from "@/components/OperatingTheatreTabs"
import ProcedureTabs from "@/components/ProcedureTabs"
import HistoryBackButton from "@/components/HistoryBackButton"
import LibrariesDashboard from "@/components/LibrariesDashboard"
import {
  getOperatingTheatreSpecialtyIdByLabel,
  getServiceLinesForSpecialty,
  getServiceLineNameById,
  getAnatomyNameById,
  getDescendantAnatomyIds,
} from "@/lib/operating-theatre-taxonomy"
import { hasVariantsForProcedure } from "@/lib/variants"
import { canonicalSpecialtyName } from "@/lib/specialty-normalization"

const SPECIALTY_PAGE_COLOURS = [
  { header: "#00B4D8", hover: "#0891B2", soft: "#DDF7FC", softBorder: "#8ADFF0", softText: "#0F4C5C" },
  { header: "#4DA3FF", hover: "#2F8EF7", soft: "#EAF3FF", softBorder: "#B9D8FF", softText: "#19507A" },
  { header: "#38BDF8", hover: "#0EA5E9", soft: "#E0F2FE", softBorder: "#7DD3FC", softText: "#0C4A6E" },
  { header: "#22C1DC", hover: "#06B6D4", soft: "#ECFEFF", softBorder: "#A5F3FC", softText: "#155E75" },
  { header: "#5AA9FF", hover: "#3B82F6", soft: "#EFF6FF", softBorder: "#93C5FD", softText: "#1D4ED8" },
  { header: "#14B8A6", hover: "#0D9488", soft: "#F0FDFA", softBorder: "#99F6E4", softText: "#115E59" },
]

interface Props {
  searchParams: Promise<{
    setting?: string
    specialty?: string
    service_line?: string
    anatomy?: string
    procedure?: string
    procedure_variant?: string
    system?: string
    library?: string
  }>
}

function normalizeText(value?: string) {
  return (value ?? "").trim().toLowerCase()
}

function dedupeProceduresForDisplay(list: Procedure[]): Procedure[] {
  const grouped = new Map<string, Procedure[]>()

  for (const procedure of list) {
    const key = [
      normalizeText(procedure.name),
      normalizeText("service_line_id" in procedure ? String(procedure.service_line_id) : ""),
      normalizeText("anatomy_id" in procedure ? String(procedure.anatomy_id) : ""),
      normalizeText("subanatomy_group" in procedure ? String(procedure.subanatomy_group) : ""),
    ].join("|")
    const rows = grouped.get(key) ?? []
    rows.push(procedure)
    grouped.set(key, rows)
  }

  return Array.from(grouped.values()).map((candidates) => {
    const withVariants = candidates.find((row) => hasVariantsForProcedure(row.id))
    const withSections = candidates.find((row) => row.sections.length > 0)
    return withVariants ?? withSections ?? candidates[0]
  })
}

export default async function HomePage({ searchParams }: Props) {
  const { setting, specialty, service_line, anatomy, system, library } =
    await searchParams

  if (!setting) {
    return <LibrariesDashboard />
  }

  const activeSetting = setting as ClinicalSetting
  const activeSpecialty = specialty
  const isOperatingTheatre = activeSetting === "Operating Theatre"

  const isSettingOverview = !activeSpecialty
  const isOperatingTheatreOverviewPage = isOperatingTheatre && !activeSpecialty
  const isOperatingTheatreSpecialtyPage = isOperatingTheatre && !!activeSpecialty && !anatomy
  const isAnatomyPage = isOperatingTheatre && !!activeSpecialty && !!anatomy

  if (isSettingOverview) {
    return <HomeHero initialWorkspace={activeSetting} />
  }

  const settingColour =
    SETTING_COLOUR[activeSetting] ?? "bg-gray-100 text-gray-700"

  const operatingTheatreTabs = isOperatingTheatre
    ? SETTING_SPECIALTIES["Operating Theatre"]
      .filter((spec) => !activeSpecialty || spec === activeSpecialty)
      .map((spec) => {
        const specId = getOperatingTheatreSpecialtyIdByLabel(spec)
        const serviceLines = specId ? getServiceLinesForSpecialty(specId) : []
        const palette =
          SPECIALTY_PAGE_COLOURS[
            SETTING_SPECIALTIES["Operating Theatre"].indexOf(spec) % SPECIALTY_PAGE_COLOURS.length
          ] ?? SPECIALTY_PAGE_COLOURS[0]

        return {
          name: spec,
          subspecialtyCount: serviceLines.length,
          serviceLines,
          palette,
        }
      })
    : []

  const serviceLineLabel = service_line
    ? getServiceLineNameById(service_line) ?? service_line
    : undefined

  const anatomyLabel = anatomy
    ? getAnatomyNameById(anatomy) ?? anatomy
    : undefined

  const activeSpecialtyPalette = activeSpecialty
    ? SPECIALTY_PAGE_COLOURS[
        SETTING_SPECIALTIES["Operating Theatre"].indexOf(activeSpecialty) % SPECIALTY_PAGE_COLOURS.length
      ] ?? SPECIALTY_PAGE_COLOURS[0]
    : SPECIALTY_PAGE_COLOURS[0]

  let theatreProcedures: Procedure[] = procedures

  if (isOperatingTheatre && activeSpecialty) {
    theatreProcedures = getProceduresBySpecialty(activeSetting, activeSpecialty)

    if (service_line) {
      theatreProcedures = theatreProcedures.filter(
        (p) => "service_line_id" in p && p.service_line_id === service_line,
      )
    }

    if (anatomy) {
      const allowedAnatomyIds = new Set([
        anatomy,
        ...getDescendantAnatomyIds(anatomy),
      ])

      theatreProcedures = theatreProcedures.filter((p) => {
        if (!("anatomy_id" in p) || typeof p.anatomy_id !== "string") {
          return false
        }
        return allowedAnatomyIds.has(p.anatomy_id)
      })
    }

    theatreProcedures = dedupeProceduresForDisplay(
      theatreProcedures.filter((p) => {
        if (p.status === "inactive") return false
        // In specialty/service-line views (no anatomy filter) suppress JSON procedures that
        // are semantically covered by an authored seed card — seed version is preferred.
        if (!anatomy && p.id in SEED_SUPERSEDES) return false
        return true
      }),
    )
  }

  const backHref = anatomy
    ? `/?setting=${encodeURIComponent(activeSetting)}&specialty=${encodeURIComponent(
        activeSpecialty!,
      )}${service_line ? `&service_line=${encodeURIComponent(service_line)}` : ""}`
    : activeSpecialty
      ? `/?setting=${encodeURIComponent(activeSetting)}`
      : "/"

  const pageTitle = isAnatomyPage
    ? serviceLineLabel && anatomyLabel
      ? `${serviceLineLabel}: ${anatomyLabel}`
      : anatomyLabel ?? anatomy!
    : isOperatingTheatreOverviewPage
      ? activeSetting
      : activeSpecialty ?? activeSetting

  return (
    <div className="app-shell-bg min-h-screen">
      <header data-dev-trigger className="app-header-bg sticky top-0 z-30 border-b app-card-border lg:backdrop-blur-2xl">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+8px)] lg:max-w-none lg:px-12 lg:py-5">
          <HistoryBackButton
            fallbackHref={backHref}
            className="app-header-muted transition-colors hover:opacity-80 lg:flex lg:h-14 lg:w-14 lg:items-center lg:justify-center lg:rounded-[20px] lg:border lg:border-white/10 lg:bg-white/6"
          />

          <div className="min-w-0 flex-1">
            <h1 className="app-header-text text-[18px] font-normal leading-snug lg:text-[40px] lg:font-normal lg:tracking-[-0.05em]">
              {pageTitle}
            </h1>

            {isOperatingTheatreOverviewPage ? (
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className="app-header-muted rounded-full px-2 py-0.5 text-xs lg:border lg:border-white/10 lg:bg-white/8 lg:px-4 lg:py-1.5 lg:text-[20px] lg:font-normal lg:uppercase lg:tracking-[0.16em]">
                  Specialties
                </span>
              </div>
            ) : (
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-normal ${settingColour} lg:px-4 lg:py-1.5 lg:text-[20px] lg:uppercase lg:tracking-[0.16em]`}
                >
                  {activeSetting}
                </span>

                {activeSpecialty && (
                  <span className="app-header-muted rounded-full px-2 py-0.5 text-xs lg:border lg:border-white/10 lg:bg-white/8 lg:px-4 lg:py-1.5 lg:text-[20px] lg:uppercase lg:tracking-[0.16em]">
                    {activeSpecialty}
                  </span>
                )}

                {isAnatomyPage && anatomyLabel && (
                  <span className="app-header-muted rounded-full px-2 py-0.5 text-xs lg:border lg:border-white/10 lg:bg-white/8 lg:px-4 lg:py-1.5 lg:text-[20px] lg:uppercase lg:tracking-[0.16em]">
                    {anatomyLabel}
                  </span>
                )}
              </div>
            )}
          </div>

          <Link
            href="/"
            className="app-header-muted shrink-0 rounded-lg p-2 transition-colors hover:opacity-80 lg:flex lg:h-14 lg:w-14 lg:items-center lg:justify-center lg:rounded-[20px] lg:border lg:border-white/10 lg:bg-white/6 lg:hover:bg-white/10"
            aria-label="Home"
          >
            <House size={18} />
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-4xl space-y-4 pb-28 pt-3 lg:max-w-none lg:space-y-8 lg:px-12 lg:pb-10 lg:pt-10">
        {isOperatingTheatreOverviewPage && (
          <OperatingTheatreTabs
            tabs={operatingTheatreTabs}
            selectedServiceLineId={service_line}
          />
        )}

        {isOperatingTheatreSpecialtyPage && (
          <OperatingTheatreTabs
            tabs={operatingTheatreTabs}
            selectedServiceLineId={service_line}
            specialtyFirst
          />
        )}

        {isAnatomyPage && (
          <>
            <ProcedureTabs
              procedures={theatreProcedures}
              specialty={activeSpecialty}
              serviceLine={serviceLineLabel}
              anatomy={anatomyLabel}
              selectedSystemId={system}
              palette={activeSpecialtyPalette}
            />
          </>
        )}
      </main>
    </div>
  )
}
