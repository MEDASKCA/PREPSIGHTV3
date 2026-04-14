"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ChevronLeft, FolderOpen } from "lucide-react"
import TriangleIcon from "@/components/TriangleIcon"
import { getAnatomyForServiceLine, getChildAnatomy } from "@/lib/operating-theatre-taxonomy"

interface SpecialtyTab {
  name: string
  subspecialtyCount: number
  serviceLines: { id: string; name: string }[]
  palette?: {
    header: string
    hover: string
    soft: string
    softBorder: string
    softText: string
  }
}

function formatSubspecialtyLabel(name: string): string {
  if (name.endsWith("General Surgery")) return name
  return name.endsWith(" Surgery") ? name.slice(0, -8) : name
}

function getServiceLineIconSrc(name: string): string {
  return `/icons/service-line-icons/${name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}.svg`
}

function AnatomyOutline({ name, color }: { name: string; color: string }) {
  const key = name.toLowerCase()

  if (key.includes("hip") || key.includes("acetabul")) {
    return (
      <svg viewBox="0 0 80 80" className="h-20 w-20" fill="none" aria-hidden="true">
        <path d="M28 18c3 9 3 19-2 27l-5 9c-3 5-1 11 5 14" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <path d="M52 18c-3 9-3 19 2 27l5 9c3 5 1 11-5 14" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx="28" cy="56" r="7" stroke={color} strokeWidth="3" />
        <circle cx="52" cy="56" r="7" stroke={color} strokeWidth="3" />
        <path d="M34 33h12" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }

  if (key.includes("knee") || key.includes("patella")) {
    return (
      <svg viewBox="0 0 80 80" className="h-20 w-20" fill="none" aria-hidden="true">
        <path d="M34 14v22c0 5 5 9 11 9h4" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <path d="M46 66V44c0-5-5-9-11-9h-4" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx="40" cy="40" r="8" stroke={color} strokeWidth="3" />
      </svg>
    )
  }

  if (key.includes("shoulder")) {
    return (
      <svg viewBox="0 0 80 80" className="h-20 w-20" fill="none" aria-hidden="true">
        <path d="M16 48c7-15 16-24 24-24s17 9 24 24" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <path d="M28 24l10 11" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <path d="M52 24L42 35" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }

  if (key.includes("elbow")) {
    return (
      <svg viewBox="0 0 80 80" className="h-20 w-20" fill="none" aria-hidden="true">
        <path d="M24 18v18c0 7 5 12 12 12h10" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <path d="M56 62V44c0-7-5-12-12-12H34" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx="40" cy="40" r="7" stroke={color} strokeWidth="3" />
      </svg>
    )
  }

  if (key.includes("ankle") || key.includes("foot")) {
    return (
      <svg viewBox="0 0 80 80" className="h-20 w-20" fill="none" aria-hidden="true">
        <path d="M34 16v26l18 13c5 3 5 9 0 12H29" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <path d="M34 42l-9 18" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }

  if (key.includes("wrist") || key.includes("hand")) {
    return (
      <svg viewBox="0 0 80 80" className="h-20 w-20" fill="none" aria-hidden="true">
        <path d="M26 54V30m8 24V26m8 28V28m8 26V34" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <path d="M24 54c0 8 7 12 16 12s16-4 16-12" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }

  if (key.includes("pelvis") || key.includes("femur")) {
    return (
      <svg viewBox="0 0 80 80" className="h-20 w-20" fill="none" aria-hidden="true">
        <path d="M26 20c4 8 4 18 0 26m28-26c-4 8-4 18 0 26" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <path d="M26 46c4 8 8 14 14 18m14-18c-4 8-8 14-14 18" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <path d="M32 32h16" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20" fill="none" aria-hidden="true">
      <path d="M20 56c6-20 15-32 20-32s14 12 20 32" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx="40" cy="24" r="8" stroke={color} strokeWidth="3" />
    </svg>
  )
}

const SERVICE_LINE_IMAGE_MAP: Record<string, string> = {
  // Trauma and Orthopaedics
  "Arthroplasty":                           "/icons/service-lines/arthroplasty.jpg",
  "Revision Arthroplasty":                  "/icons/service-lines/arthroplasty.jpg",
  "Hip Preservation":                       "/icons/service-lines/arthroplasty.jpg",
  "Sports & Knee":                          "/icons/service-lines/sports-and-knee-surgery.jpg",
  "Shoulder & Elbow":                       "/icons/service-lines/shoulder-and-elbow-surgery.jpg",
  "Foot & Ankle":                           "/icons/service-lines/foot-and-ankle-surgery.jpg",
  "Hand & Wrist":                           "/icons/service-lines/hand-and-wrist-surgery.jpg",
  "Orthopaedic Oncology":                   "/icons/service-lines/orthopaedic-oncology.jpg",
  "Orthopaedic Trauma":                     "/icons/service-lines/orthopaedic-trauma-surgery.jpg",
  "Paediatric Orthopaedics":                "/icons/service-lines/paediatric-orthopaedic-surgery.jpg",
  "Spine":                                  "/icons/service-lines/spine-surgery.jpg",
  "Limb Reconstruction / Deformity":        "/icons/service-lines/orthopaedic-trauma-surgery.jpg",
  "Orthopaedic Infection":                  "/icons/service-lines/orthopaedic-trauma-surgery.jpg",
  // General Surgery
  "Acute Care Surgery":                     "/icons/service-lines/acute-care-surgery.jpg",
  "Bariatric Surgery":                      "/icons/service-lines/bariatric-surgery.jpg",
  "Breast Surgery":                         "/icons/service-lines/breast-surgery.jpg",
  "Colorectal Surgery":                     "/icons/service-lines/colorectal-surgery.jpg",
  "Emergency General Surgery":              "/icons/service-lines/emergency-general-surgery.jpg",
  "Endocrine Surgery":                      "/icons/service-lines/endocrine-surgery.jpg",
  "Hepatopancreatobiliary Surgery":         "/icons/service-lines/hepatopancreatobiliary-surgery.jpg",
  "Hernia Surgery":                         "/icons/service-lines/hernia-surgery.jpg",
  "Surgical Oncology":                      "/icons/service-lines/surgical-oncology.jpg",
  "Transplant Surgery":                     "/icons/service-lines/transplant-surgery.jpg",
  "Upper Gastrointestinal Surgery":         "/icons/service-lines/upper-gastrointestinal-surgery.jpg",
  // Neurosurgery
  "Cranial Neurosurgery":                   "/icons/service-lines/cranial-neurosurgery.jpg",
  "Functional Neurosurgery":                "/icons/service-lines/functional-neurosurgery.jpg",
  "Neurooncologic Surgery":                 "/icons/service-lines/neurooncologic-surgery.jpg",
  "Paediatric Neurosurgery":                "/icons/service-lines/paediatric-neurosurgery.jpg",
  "Spinal Neurosurgery":                    "/icons/service-lines/spinal-neurosurgery.jpg",
  // Cardiothoracic
  "Cardiac Surgery":                        "/icons/service-lines/cardiac-surgery.jpg",
  "Congenital Cardiac Surgery":             "/icons/service-lines/congenital-cardiac-surgery.jpg",
  "Thoracic Surgery":                       "/icons/service-lines/thoracic-surgery.jpg",
  // Vascular
  "Aortic Surgery":                         "/icons/service-lines/aortic-surgery.jpg",
  "Peripheral Vascular Surgery":            "/icons/service-lines/peripheral-vascular-surgery.jpg",
  "Vascular Access Surgery":                "/icons/service-lines/vascular-access-surgery.jpg",
  // Ophthalmology
  "Cataract Surgery":                       "/icons/service-lines/cataract-surgery.jpg",
  "Corneal and Anterior Segment Surgery":   "/icons/service-lines/corneal-and-anterior-segment-surgery.jpg",
  "Glaucoma Surgery":                       "/icons/service-lines/glaucoma-surgery.jpg",
  "Oculoplastic Surgery":                   "/icons/service-lines/oculoplastic-surgery.jpg",
  "Vitreoretinal Surgery":                  "/icons/service-lines/vitreoretinal-surgery.jpg",
  // Urology
  "Andrology":                              "/icons/service-lines/andrology.jpg",
  "Endourology":                            "/icons/service-lines/endourology.jpg",
  "Functional Urology and Incontinence":    "/icons/service-lines/functional-urology-and-incontinence.jpg",
  "Reconstructive Urology":                 "/icons/service-lines/reconstructive-urology.jpg",
  "Urologic Oncology":                      "/icons/service-lines/urologic-oncology.jpg",
  // Gynecology
  "Benign Gynecology":                      "/icons/service-lines/benign-gynecology.jpg",
  "Gynecologic Oncology":                   "/icons/service-lines/gynecologic-oncology.jpg",
  "Minimally Invasive Gynecologic Surgery": "/icons/service-lines/minimally-invasive-gynecologic-surgery.jpg",
  "Urogynecology and Pelvic Floor Surgery": "/icons/service-lines/urogynecology-and-pelvic-floor-surgery.jpg",
  // Plastic and Reconstructive
  "Breast Reconstruction Surgery":          "/icons/service-lines/breast-reconstruction-surgery.jpg",
  "Burns Surgery":                          "/icons/service-lines/burns-surgery.jpg",
  "Cleft Lip and Palate Surgery":           "/icons/service-lines/cleft-lip-and-palate-surgery.jpg",
  "Hand and Microsurgery":                  "/icons/service-lines/hand-and-microsurgery.jpg",
  // ENT
  "Head and Neck Surgery":                  "/icons/service-lines/head-and-neck-surgery.jpg",
  "Laryngology and Airway Surgery":         "/icons/service-lines/laryngology-and-airway-surgery.jpg",
  "Otology and Neurotology":                "/icons/service-lines/otology-and-neurotology.jpg",
  "Rhinology and Sinus Surgery":            "/icons/service-lines/rhinology-and-sinus-surgery.jpg",
  // Anaesthesia
  "Cardiothoracic Anaesthesia":             "/icons/service-lines/cardiothoracic-anaesthesia.jpg",
  "General Anaesthesia":                    "/icons/service-lines/general-anaesthesia.jpg",
  "Obstetric Anaesthesia":                  "/icons/service-lines/obstetric-anaesthesia.jpg",
  "Paediatric Anaesthesia":                 "/icons/service-lines/paediatric-anaesthesia.jpg",
  "Regional Anaesthesia":                   "/icons/service-lines/regional-anaesthesia.jpg",
  // Podiatric
  "Diabetic Foot Surgery":                  "/icons/service-lines/diabetic-foot-surgery.jpg",
  "Forefoot Surgery":                       "/icons/service-lines/forefoot-surgery.jpg",
  "Midfoot Surgery":                        "/icons/service-lines/midfoot-surgery.jpg",
  "Rearfoot and Ankle Surgery":             "/icons/service-lines/rearfoot-and-ankle-surgery.jpg",
}

function SubspecialtyArtwork({
  name,
  palette,
}: {
  name: string
  palette: NonNullable<SpecialtyTab["palette"]>
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const key = name.toLowerCase()
  const stroke = "rgba(255,255,255,0.92)"
  const accent = palette.soft
  const imageSrc = SERVICE_LINE_IMAGE_MAP[name]

  if (imageSrc && !imgFailed) {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-[24px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
        <div className="absolute inset-0 rounded-[24px] bg-gradient-to-t from-black/40 to-transparent" />
      </div>
    )
  }

  if (key.includes("foot") || key.includes("ankle")) {
    return (
      <svg viewBox="0 0 300 170" className="h-full w-full" fill="none" aria-hidden="true">
        <rect x="14" y="14" width="272" height="142" rx="24" fill="rgba(255,255,255,0.08)" />
        <path d="M140 38v56l46 30c11 7 10 18-1 24H122" stroke={stroke} strokeWidth="7" strokeLinecap="round" />
        <path d="M140 94l-20 38" stroke={accent} strokeWidth="7" strokeLinecap="round" />
      </svg>
    )
  }

  if (key.includes("hand") || key.includes("wrist")) {
    return (
      <svg viewBox="0 0 300 170" className="h-full w-full" fill="none" aria-hidden="true">
        <rect x="14" y="14" width="272" height="142" rx="24" fill="rgba(255,255,255,0.08)" />
        <path d="M112 122V68m22 54V58m22 64V62m22 60V78" stroke={stroke} strokeWidth="7" strokeLinecap="round" />
        <path d="M106 122c0 17 18 26 44 26s44-9 44-26" stroke={accent} strokeWidth="7" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 300 170" className="h-full w-full" fill="none" aria-hidden="true">
      <rect x="14" y="14" width="272" height="142" rx="24" fill="rgba(255,255,255,0.08)" />
      <path d="M96 126c18-46 35-70 54-70s36 24 54 70" stroke={stroke} strokeWidth="7" strokeLinecap="round" />
      <circle cx="150" cy="58" r="15" stroke={accent} strokeWidth="8" />
    </svg>
  )
}

function getSubanatomyPreview(anatomyId: string): string[] {
  return Array.from(
    new Set(getChildAnatomy(anatomyId).map((item) => item.name)),
  )
}

export default function OperatingTheatreTabs({
  tabs = [],
  initialExpanded,
  selectedServiceLineId,
  specialtyFirst = false,
}: {
  tabs?: SpecialtyTab[]
  initialExpanded?: string
  selectedServiceLineId?: string
  specialtyFirst?: boolean
}) {
  const searchParams = useSearchParams()

  const [expandedSpecialty, setExpandedSpecialty] = useState<string | null>(
    initialExpanded ?? null,
  )
  const [expandedServiceLine, setExpandedServiceLine] = useState<string | null>(
    selectedServiceLineId ?? null,
  )

  const sortedTabs = useMemo(() => tabs, [tabs])
  const defaultDesktopServiceLine = selectedServiceLineId ?? sortedTabs[0]?.serviceLines[0]?.id ?? null

  const currentSetting = searchParams.get("setting") ?? "Operating Theatre"
  const currentSpecialty = searchParams.get("specialty") ?? initialExpanded ?? ""
  const currentAnatomy = searchParams.get("anatomy")

  function buildHref(params: Record<string, string | null | undefined>) {
    const next = new URLSearchParams(searchParams.toString())

    Object.entries(params).forEach(([key, value]) => {
      if (!value) {
        next.delete(key)
      } else {
        next.set(key, value)
      }
    })

    return `/?${next.toString()}`
  }

  function toggleSpecialty(name: string) {
    setExpandedSpecialty((prev) => (prev === name ? null : name))
    setExpandedServiceLine(null)
  }

  function toggleServiceLine(serviceLineId: string) {
    setExpandedServiceLine((prev) => (prev === serviceLineId ? null : serviceLineId))
  }

  return (
    <div className="space-y-2 lg:space-y-6">
      {sortedTabs.map((tab) => {
        const isOpen = specialtyFirst || expandedSpecialty === tab.name
        const palette = tab.palette ?? {
          header: "#00B4D8",
          hover: "#0891B2",
          soft: "#DDF7FC",
          softBorder: "#8ADFF0",
          softText: "#0F4C5C",
        }
        const activeDesktopServiceLine = expandedServiceLine ?? defaultDesktopServiceLine
        const activeDesktopIndex = tab.serviceLines.findIndex(
          (serviceLine) => serviceLine.id === activeDesktopServiceLine,
        )

        return (
          <div
            key={tab.name}
            className={`operating-tabs-root overflow-hidden ${
              specialtyFirst
                ? "rounded-none border-0 bg-transparent shadow-none"
                : "rounded-xl border border-[#D5DCE3] bg-white shadow-sm"
            } lg:rounded-[36px] lg:border-[#14304B] lg:bg-[#08131F] lg:shadow-[0_30px_70px_rgba(15,23,42,0.26)]`}
          >
            {specialtyFirst ? null : (
              <button
                onClick={() => toggleSpecialty(tab.name)}
                className="app-display-font flex w-full items-center gap-3 px-4 py-4 text-left text-base font-semibold text-white transition-colors lg:px-8 lg:py-8 lg:text-[42px] lg:font-semibold lg:tracking-[-0.06em]"
                style={{ backgroundColor: palette.header }}
                onMouseEnter={(event) => {
                  ;(event.currentTarget as HTMLButtonElement).style.backgroundColor = palette.hover
                }}
                onMouseLeave={(event) => {
                  ;(event.currentTarget as HTMLButtonElement).style.backgroundColor = palette.header
                }}
              >
                <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug">
                  {tab.name}
                </span>
                {isOpen ? (
                  <TriangleIcon direction="up" size={10} className="shrink-0 text-white/80 lg:hidden" />
                ) : (
                  <TriangleIcon direction="down" size={10} className="shrink-0 text-white/80 lg:hidden" />
                )}
              </button>
            )}

            {isOpen && (
              <div className={`${specialtyFirst ? "divide-y-0 bg-transparent" : "divide-y divide-[#E6EEF7]"} lg:divide-y-0 lg:bg-[#08131F] lg:p-6`}>
                {specialtyFirst && (
                  <div className="hidden lg:block">
                    <div className="relative overflow-hidden rounded-[40px] bg-transparent px-12 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          const nextIndex =
                            activeDesktopIndex <= 0 ? tab.serviceLines.length - 1 : activeDesktopIndex - 1
                          setExpandedServiceLine(tab.serviceLines[nextIndex]?.id ?? defaultDesktopServiceLine)
                        }}
                        className="absolute left-6 top-1/2 z-30 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#274561] shadow-[0_14px_30px_rgba(15,23,42,0.22)] transition hover:scale-105"
                        aria-label="Previous subspecialty"
                      >
                        <ChevronLeft size={24} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const nextIndex =
                            activeDesktopIndex === -1 || activeDesktopIndex >= tab.serviceLines.length - 1
                              ? 0
                              : activeDesktopIndex + 1
                          setExpandedServiceLine(tab.serviceLines[nextIndex]?.id ?? defaultDesktopServiceLine)
                        }}
                        className="absolute right-6 top-1/2 z-30 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#274561] shadow-[0_14px_30px_rgba(15,23,42,0.22)] transition hover:scale-105"
                        aria-label="Next subspecialty"
                      >
                        <TriangleIcon direction="right" size={14} />
                      </button>

                      <div className="relative flex h-[660px] items-center justify-center" style={{ perspective: "1800px" }}>
                        {tab.serviceLines.map((line, index) => {
                          const anatomyNodes = getAnatomyForServiceLine(line.id)
                          const isActiveLine = activeDesktopServiceLine === line.id
                          const rawOffset =
                            activeDesktopIndex === -1
                              ? 0
                              : index - activeDesktopIndex
                          const wrappedOffset =
                            rawOffset > tab.serviceLines.length / 2
                              ? rawOffset - tab.serviceLines.length
                              : rawOffset < -tab.serviceLines.length / 2
                                ? rawOffset + tab.serviceLines.length
                                : rawOffset
                          const absOffset = Math.abs(wrappedOffset)

                          if (absOffset > 2) {
                            return null
                          }

                          const translateXMap: Record<number, string> = {
                            0: "0px",
                            1: "285px",
                            2: "470px",
                            [-1]: "-285px",
                            [-2]: "-470px",
                          }
                          const rotateYMap: Record<number, string> = {
                            0: "0deg",
                            1: "-24deg",
                            2: "-38deg",
                            [-1]: "24deg",
                            [-2]: "38deg",
                          }
                          const scaleMap: Record<number, number> = {
                            0: 1,
                            1: 0.82,
                            2: 0.7,
                            [-1]: 0.82,
                            [-2]: 0.7,
                          }
                          const opacityMap: Record<number, number> = {
                            0: 1,
                            1: 0.92,
                            2: 0.72,
                            [-1]: 0.92,
                            [-2]: 0.72,
                          }
                          const depthMap: Record<number, string> = {
                            0: "0px",
                            1: "-12px",
                            2: "-30px",
                            [-1]: "-12px",
                            [-2]: "-30px",
                          }
                          const zIndexMap: Record<number, number> = {
                            0: 30,
                            1: 20,
                            2: 10,
                            [-1]: 20,
                            [-2]: 10,
                          }

                          return (
                            <button
                              key={`desktop-line-${line.id}`}
                              type="button"
                              onClick={() => setExpandedServiceLine(line.id)}
                              className="group absolute left-1/2 top-[66%] w-[390px] -translate-y-1/2 overflow-visible text-left transition-all duration-500"
                              style={{
                                transform: `translate(-50%, -50%) translateX(${translateXMap[wrappedOffset]}) translateZ(${depthMap[wrappedOffset]}) rotateY(${rotateYMap[wrappedOffset]}) scale(${scaleMap[wrappedOffset]})`,
                                transformStyle: "preserve-3d",
                                boxShadow: isActiveLine
                                  ? `0 26px 44px ${palette.header}45`
                                  : "0 16px 28px rgba(15,23,42,0.18)",
                                opacity: opacityMap[wrappedOffset],
                                zIndex: zIndexMap[wrappedOffset],
                              }}
                            >
                              <div
                                className="relative overflow-hidden rounded-[30px] border px-6 py-6"
                                style={{
                                  background: isActiveLine
                                    ? `linear-gradient(145deg, ${palette.header} 0%, ${palette.hover} 100%)`
                                    : "linear-gradient(145deg, #23384C 0%, #12273A 100%)",
                                  borderColor: isActiveLine ? `${palette.softBorder}99` : "rgba(255,255,255,0.14)",
                                }}
                              >
                                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.03))]" />
                                <div className="relative">
                                  <div className="flex items-start justify-between gap-4">
                                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                      isActiveLine ? "border border-white/16 bg-white/10 text-white/76" : ""
                                    }`}
                                    style={
                                      isActiveLine
                                        ? undefined
                                        : { backgroundColor: palette.soft, color: palette.softText }
                                  }>
                                    {anatomyNodes.length} anatomy
                                  </span>
                                </div>
                                <div className="mt-4 h-[138px] overflow-hidden rounded-[22px] border border-white/14 bg-white/6">
                                  <SubspecialtyArtwork name={line.name} palette={palette} />
                                </div>
                                <p className={`app-display-font mt-5 font-semibold leading-[1.02] tracking-[-0.05em] text-white ${
                                  isActiveLine ? "text-[34px]" : "text-[28px]"
                                }`}>
                                  {formatSubspecialtyLabel(line.name)}
                                </p>
                                <p className={`mt-2 text-sm leading-6 ${isActiveLine ? "text-white/76" : "text-white/56"}`}>
                                  Select this folder to browse its anatomy files.
                                  </p>
                                </div>
                              </div>
                              <div
                                className="pointer-events-none absolute left-3 right-3 top-[calc(100%+8px)] overflow-hidden rounded-[24px] opacity-30 blur-[1px]"
                                style={{
                                  transform: "scaleY(-1)",
                                  maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)",
                                  WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)",
                                }}
                              >
                                <div
                                  className="overflow-hidden rounded-[30px] border px-6 py-6"
                                  style={{
                                    background: isActiveLine
                                      ? `linear-gradient(145deg, ${palette.header} 0%, ${palette.hover} 100%)`
                                      : "linear-gradient(145deg, #23384C 0%, #12273A 100%)",
                                    borderColor: isActiveLine ? `${palette.softBorder}66` : "rgba(255,255,255,0.08)",
                                  }}
                                >
                                  <div className="relative">
                                    <div className="flex items-start justify-between gap-4">
                                      <span
                                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                          isActiveLine ? "border border-white/16 bg-white/10 text-white/76" : ""
                                        }`}
                                        style={
                                          isActiveLine
                                            ? undefined
                                            : { backgroundColor: palette.soft, color: palette.softText }
                                        }
                                      >
                                        {anatomyNodes.length} anatomy
                                      </span>
                                    </div>
                                    <div className="mt-4 h-[138px] overflow-hidden rounded-[22px] border border-white/14 bg-white/6">
                                      <SubspecialtyArtwork name={line.name} palette={palette} />
                                    </div>
                                    <p className={`app-display-font mt-5 font-semibold leading-[1.02] tracking-[-0.05em] text-white ${
                                      isActiveLine ? "text-[34px]" : "text-[28px]"
                                    }`}>
                                      {formatSubspecialtyLabel(line.name)}
                                    </p>
                                    <p className={`mt-2 text-sm leading-6 ${isActiveLine ? "text-white/76" : "text-white/56"}`}>
                                      Select this folder to browse its anatomy files.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {tab.serviceLines.map((line) => {
                  const mobileOpen = expandedServiceLine === line.id
                  const isSelectedLine = specialtyFirst
                    ? (expandedServiceLine ?? defaultDesktopServiceLine) === line.id
                    : mobileOpen
                  const anatomyNodes = getAnatomyForServiceLine(line.id)

                  return (
                    <div key={line.id} className={`ot-line-block ${specialtyFirst ? "bg-transparent" : "bg-white"} lg:bg-transparent ${specialtyFirst && !isSelectedLine ? "lg:hidden" : ""}`}>
                      {specialtyFirst ? (
                        <div className="hidden lg:block lg:-mt-20">
                          <div className="mb-4 flex items-end justify-between gap-6">
                            <div className="flex items-center gap-4">
                              <div
                                className="flex h-14 w-14 items-center justify-center rounded-[20px]"
                                style={{ backgroundColor: palette.soft, color: palette.softText }}
                              >
                                <FolderOpen size={24} />
                              </div>
                              <div>
                                <p className="app-display-font text-[38px] font-semibold tracking-[-0.06em] text-white">
                                  {formatSubspecialtyLabel(line.name)}
                                </p>
                                <p className="mt-1 text-[18px] text-white/58">
                                  Anatomy files within this subspecialty.
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                            <span
                              className="rounded-full px-4 py-1.5 text-[20px] font-semibold uppercase tracking-[0.1em]"
                              style={{ backgroundColor: palette.soft, color: palette.softText }}
                            >
                              {anatomyNodes.length} anatomy
                            </span>
                          </div>
                        </div>

                          <div
                            className="rounded-[34px] border p-5"
                            style={{ borderColor: `${palette.softBorder}55`, backgroundColor: "rgba(255,255,255,0.03)" }}
                          >
                            {anatomyNodes.length > 0 ? (
                              <div className={`grid gap-5 ${anatomyNodes.length >= 4 ? "grid-cols-4" : anatomyNodes.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                                {anatomyNodes.map((node) => {
                                  const isActiveAnatomy = currentAnatomy === node.id
                                  const subanatomyPreview = getSubanatomyPreview(node.id)

                                  return (
                                    <Link
                                      key={node.id}
                                      href={buildHref({
                                        setting: currentSetting,
                                        specialty: currentSpecialty || tab.name,
                                        service_line: line.id,
                                        anatomy: node.id,
                                      })}
                                      className="group relative overflow-hidden rounded-[24px] px-6 py-5 transition-all duration-300 hover:-translate-y-2 hover:scale-[1.015]"
                                      style={{
                                        background: isActiveAnatomy
                                          ? `linear-gradient(155deg, white 0%, ${palette.soft} 45%, ${palette.softBorder} 100%)`
                                          : `linear-gradient(155deg, white 0%, ${palette.soft}EE 50%, ${palette.softBorder}BB 100%)`,
                                        color: palette.softText,
                                        border: `1px solid ${isActiveAnatomy ? palette.softBorder : `${palette.softBorder}88`}`,
                                        boxShadow: isActiveAnatomy
                                          ? `0 32px 60px rgba(15,23,42,0.28), 0 0 0 1px ${palette.softBorder}60`
                                          : `0 16px 40px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.95)`,
                                      }}
                                    >
                                      {/* Top colour accent strip */}
                                      <div
                                        className="pointer-events-none absolute inset-x-0 top-0 h-[3px] rounded-t-[28px]"
                                        style={{ background: `linear-gradient(90deg, transparent, ${palette.header}, transparent)` }}
                                      />
                                      {/* Inner top shine */}
                                      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 rounded-t-[28px] bg-gradient-to-b from-white/70 to-transparent" />

                                      <div className="relative flex flex-col items-center text-center">
                                        <p className="app-display-font text-[34px] font-semibold leading-tight tracking-[-0.05em]">
                                          {node.name}
                                        </p>
                                        {subanatomyPreview.filter((l) => l !== "Whole Joint").length > 0 && (
                                          <p className="mt-5 text-[18px] leading-snug">
                                            {subanatomyPreview.filter((l) => l !== "Whole Joint").map((label, i, arr) => (
                                              <span key={label}>
                                                <span className="opacity-60">{label}</span>
                                                {i < arr.length - 1 && (
                                                  <span className="opacity-100 font-bold mx-2 text-[28px]" style={{ color: palette.header }}>·</span>
                                                )}
                                              </span>
                                            ))}
                                          </p>
                                        )}
                                      </div>
                                    </Link>
                                  )
                                })}
                              </div>
                            ) : (
                              <p className="px-2 py-6 text-[18px] text-white/48">
                                No anatomy nodes mapped for this subspecialty yet.
                              </p>
                            )}
                          </div>
                        </div>
                      ) : null}

                      <div className={`${specialtyFirst ? "px-2.5 py-1.5" : ""} lg:hidden`}>
                        <button
                          type="button"
                          onClick={() => toggleServiceLine(line.id)}
                          className={`ot-service-line-bar flex w-full items-center gap-3 px-4 py-4 text-[15px] transition-colors ${
                            specialtyFirst ? "rounded-[20px]" : ""
                          }`}
                          style={{
                            backgroundColor: specialtyFirst ? "#FFFFFF" : palette.soft,
                            color: specialtyFirst ? "#334155" : palette.softText,
                            borderLeft: specialtyFirst ? undefined : `4px solid ${palette.softBorder}`,
                            border: specialtyFirst ? "1px solid rgba(213,220,227,0.92)" : undefined,
                            boxShadow: specialtyFirst
                              ? "inset 0 1px 0 rgba(255,255,255,0.96), inset 0 -1px 0 rgba(15,23,42,0.06), 0 8px 18px rgba(15,23,42,0.08)"
                              : undefined,
                          }}
                        >
                          {specialtyFirst && (
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full"
                              style={{
                                background: `linear-gradient(180deg, ${palette.soft} 0%, ${palette.softBorder} 100%)`,
                                boxShadow:
                                  "inset 0 1px 0 rgba(255,255,255,0.82), inset 0 -1px 0 rgba(15,23,42,0.08), 0 4px 10px rgba(15,23,42,0.08)",
                              }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={getServiceLineIconSrc(line.name)}
                                alt=""
                                className="h-5 w-5 object-contain"
                              />
                            </div>
                          )}

                          <span className="min-w-0 flex-1 text-left whitespace-normal break-words leading-snug font-semibold">
                            {formatSubspecialtyLabel(line.name)}
                          </span>

                          {mobileOpen ? (
                            <TriangleIcon direction="down" size={10} className="shrink-0" style={{ color: palette.softText }} />
                          ) : (
                            <TriangleIcon direction="right" size={10} className="shrink-0" style={{ color: palette.softText }} />
                          )}
                        </button>
                      </div>

                      {(specialtyFirst ? mobileOpen : isSelectedLine) && (
                        <div className={`ot-mobile-panel lg:hidden ${specialtyFirst ? "bg-transparent px-0 pb-1.5" : "border-t border-[#E6EEF7] bg-white"}`}>
                          {anatomyNodes.length > 0 ? (
                            <div className={`ot-anatomy-list ${specialtyFirst ? "divide-y divide-[#DCEAF8]" : "divide-y divide-[#DCEAF8]"}`}>
                              {anatomyNodes.map((node) => {
                                const isActiveAnatomy = currentAnatomy === node.id
                                const subanatomyPreview = getSubanatomyPreview(node.id)

                                return (
                                  <Link
                                    key={node.id}
                                    href={buildHref({
                                      setting: currentSetting,
                                      specialty: currentSpecialty || tab.name,
                                      service_line: line.id,
                                      anatomy: node.id,
                                    })}
                                    className={`ot-anatomy-row flex w-full items-center gap-2 px-4 py-3.5 text-[15px] transition-colors ${
                                      isActiveAnatomy
                                        ? "bg-[#E7F2FF] font-semibold text-[#1E3A5F]"
                                        : "text-[#334155] hover:bg-[#F8FBFF]"
                                    }`}
                                    style={{
                                      backgroundColor: isActiveAnatomy ? "#E7F2FF" : undefined,
                                    }}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="whitespace-normal break-words leading-[1.2]">
                                        {node.name}
                                      </div>
                                      {subanatomyPreview.length > 0 && (
                                        <div className="mt-0.5 text-xs leading-[1.3] text-[#64748b] opacity-82">
                                          <span className="font-medium uppercase tracking-[0.08em] text-[#94a3b8]">
                                            Includes
                                          </span>
                                          {" · "}
                                          {subanatomyPreview.slice(0, 4).join(" · ")}
                                        </div>
                                      )}
                                    </div>
                                    <TriangleIcon
                                      direction="right"
                                      size={9}
                                      className={`shrink-0 ${isActiveAnatomy ? "text-[#64748b]" : "text-[#94a3b8]"}`}
                                    />
                                  </Link>
                                )
                              })}
                            </div>
                          ) : (
                            <p className={`ot-empty-state ${specialtyFirst ? "px-6 py-3" : "px-6 py-3"} text-sm text-[#94a3b8]`}>
                              No anatomy nodes mapped for this subspecialty yet.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {tab.serviceLines.length === 0 && (
                  <p className="px-4 py-3 text-sm text-[#94a3b8]">
                    No service lines yet.
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
