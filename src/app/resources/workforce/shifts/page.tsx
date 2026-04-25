"use client"

import dynamic from "next/dynamic"
import { useMemo, useState } from "react"
import {
  CalendarClock,
  ChevronRight,
  Filter,
  CheckCircle2,
  MapPinned,
  Navigation,
  Phone,
  PoundSterling,
  Sparkles,
  X,
} from "lucide-react"
import DesktopSectionWordmark from "@/components/DesktopSectionWordmark"
import WorkforceSectionNav from "@/components/WorkforceSectionNav"
import WorkspaceDesktopShell from "@/components/WorkspaceDesktopShell"
import type { WorkforceHospitalPin } from "@/components/WorkforceShiftMap"

const WorkforceShiftMap = dynamic(() => import("@/components/WorkforceShiftMap"), { ssr: false })

const nextShift = {
  day: "Today",
  time: "07:30 - 18:00",
  area: "Theatre 1",
  specialty: "Trauma and orthopaedics",
  allocation: "Primary knee replacement list · scrub cover",
}

const typeFilters = ["Internal", "External"] as const
const modeFilters = ["Feed", "Map"] as const

const allShifts = [
  {
    id: "royal-free-trauma",
    type: "Internal" as const,
    title: "Saturday trauma list",
    when: "Sat 27 Apr · 08:00 - 14:00",
    site: "Royal Free Hospital · theatre 2",
    hospital: "Royal Free Hospital",
    fit: "strong fit" as const,
    rate: "Bank · enhanced weekend rate",
    distanceMiles: 2.5,
    contactNumber: "020 7794 0500",
    position: [51.5539, -0.1644] as [number, number],
  },
  {
    id: "royal-free-recovery",
    type: "Internal" as const,
    title: "Late recovery support",
    when: "Sun 28 Apr · 12:00 - 20:00",
    site: "Royal Free Hospital · recovery",
    hospital: "Royal Free Hospital",
    fit: "good fit" as const,
    rate: "Bank · late cover",
    distanceMiles: 2.5,
    contactNumber: "020 7794 0500",
    position: [51.5564, -0.1632] as [number, number],
  },
  {
    id: "barnet-endoscopy",
    type: "External" as const,
    title: "Endoscopy support",
    when: "Mon 29 Apr · 09:00 - 17:00",
    site: "Barnet Hospital · endoscopy",
    hospital: "Barnet Hospital",
    fit: "developing fit" as const,
    rate: "Agency · supervised",
    distanceMiles: 8.1,
    contactNumber: "020 8216 4600",
    position: [51.6507, -0.2002] as [number, number],
  },
  {
    id: "uch-trauma",
    type: "External" as const,
    title: "Orthopaedic late cover",
    when: "Tue 30 Apr · 13:00 - 21:00",
    site: "University College Hospital · theatres",
    hospital: "University College Hospital",
    fit: "good fit" as const,
    rate: "Bank · urgent fill",
    distanceMiles: 5.6,
    contactNumber: "020 3456 7890",
    position: [51.5246, -0.134] as [number, number],
  },
]

const allHospitals = [
  {
    id: "royal-free-hospital",
    type: "Internal" as const,
    hospital: "Royal Free Hospital",
    distanceMiles: 2.5,
    contactNumber: "020 7794 0500",
    position: [51.5539, -0.1644] as [number, number],
  },
  {
    id: "barnet-hospital",
    type: "External" as const,
    hospital: "Barnet Hospital",
    distanceMiles: 8.1,
    contactNumber: "020 8216 4600",
    position: [51.6507, -0.2002] as [number, number],
  },
  {
    id: "uch-hospital",
    type: "External" as const,
    hospital: "University College Hospital",
    distanceMiles: 5.6,
    contactNumber: "020 3456 7890",
    position: [51.5246, -0.134] as [number, number],
  },
  {
    id: "whittington-hospital",
    type: "External" as const,
    hospital: "Whittington Hospital",
    distanceMiles: 4.2,
    contactNumber: "020 7272 3070",
    position: [51.5686, -0.1361] as [number, number],
  },
  {
    id: "st-marys-hospital",
    type: "External" as const,
    hospital: "St Mary's Hospital",
    distanceMiles: 6.4,
    contactNumber: "020 3312 6666",
    position: [51.5178, -0.1749] as [number, number],
  },
  {
    id: "north-middlesex-hospital",
    type: "External" as const,
    hospital: "North Middlesex Hospital",
    distanceMiles: 9.8,
    contactNumber: "020 8887 2000",
    position: [51.6135, -0.0699] as [number, number],
  },
  {
    id: "watford-general-hospital",
    type: "External" as const,
    hospital: "Watford General Hospital",
    distanceMiles: 18.4,
    contactNumber: "01923 244366",
    position: [51.6498, -0.4052] as [number, number],
  },
  {
    id: "luton-dunstable",
    type: "External" as const,
    hospital: "Luton and Dunstable Hospital",
    distanceMiles: 30.7,
    contactNumber: "01582 491166",
    position: [51.8842, -0.4582] as [number, number],
  },
]

const shiftStatuses = [
  {
    status: "Booked",
    title: "Saturday trauma list",
    hospital: "Royal Free Hospital",
    contact: "Approved by Lisa Warren",
    phone: "020 7794 0500",
  },
  {
    status: "Awaiting Confirmation",
    title: "Endoscopy support",
    hospital: "Barnet Hospital",
    contact: "Pending with Daniel Shah",
    phone: "020 8216 4600",
  },
  {
    status: "Requested",
    title: "Orthopaedic late cover",
    hospital: "University College Hospital",
    contact: "Requested to rota team",
    phone: "020 3456 7890",
  },
  {
    status: "Shift Offer",
    title: "Late recovery support",
    hospital: "Royal Free Hospital",
    contact: "Offered by Nina Clarke",
    phone: "020 7794 0555",
  },
]

const rateFilters = ["Any rate", "Premium", "Enhanced weekend", "Urgent fill"]
const shiftModeFilters = ["Any type", "Bank", "Agency", "Permanent cover"]

const baseCenter: [number, number] = [51.5539, -0.1644]

function pillTone(value: string) {
  switch (value) {
    case "none":
      return "bg-[#EFF3F6] text-[#6E7E8B]"
    case "strong fit":
      return "bg-[#ECFBF4] text-[#18794E]"
    case "good fit":
      return "bg-[#FFF8E7] text-[#9C6500]"
    case "developing fit":
      return "bg-[#EEF6FF] text-[#1C78A0]"
    default:
      return "bg-[#F3F7FA] text-[#5C7487]"
  }
}

function strongestFit(
  fits: Array<"strong fit" | "good fit" | "developing fit">,
): "strong fit" | "good fit" | "developing fit" {
  if (fits.includes("strong fit")) return "strong fit"
  if (fits.includes("good fit")) return "good fit"
  return "developing fit"
}

export default function WorkforceShiftsPage() {
  const [shiftType, setShiftType] = useState<(typeof typeFilters)[number]>("Internal")
  const [mode, setMode] = useState<(typeof modeFilters)[number]>("Map")
  const [radiusMiles, setRadiusMiles] = useState(30)
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null)
  const [hoveredHospitalId, setHoveredHospitalId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState("2026-04-27")
  const [rateFilter, setRateFilter] = useState("Any rate")
  const [shiftModeFilter, setShiftModeFilter] = useState("Any type")

  const filteredShifts = useMemo(
    () => allShifts.filter((shift) => shift.type === shiftType && shift.distanceMiles <= radiusMiles),
    [shiftType, radiusMiles],
  )

  const hospitals = useMemo(() => {
    const grouped = new Map<
      string,
      {
        id: string
        hospital: string
        distanceMiles: number
        contactNumber: string
        position: [number, number]
        shifts: typeof allShifts
      }
    >()

    for (const shift of filteredShifts) {
      const existing = grouped.get(shift.hospital)
      if (existing) {
        existing.shifts.push(shift)
      } else {
        grouped.set(shift.hospital, {
          id: shift.hospital.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          hospital: shift.hospital,
          distanceMiles: shift.distanceMiles,
          contactNumber: shift.contactNumber,
          position: shift.position,
          shifts: [shift],
        })
      }
    }

    return allHospitals
      .filter((hospital) => hospital.type === shiftType && hospital.distanceMiles <= radiusMiles)
      .map((hospital) => {
        const groupedHospital = grouped.get(hospital.hospital)
        const shifts = groupedHospital?.shifts ?? []
        return {
          ...hospital,
          shifts,
          strongestFit: shifts.length > 0 ? strongestFit(shifts.map((shift) => shift.fit)) : ("none" as const),
          shiftCount: shifts.length,
        }
      })
  }, [filteredShifts, radiusMiles, shiftType])

  const hospitalPins: WorkforceHospitalPin[] = hospitals.map((hospital) => ({
    id: hospital.id,
    hospital: hospital.hospital,
    distanceMiles: hospital.distanceMiles,
    contactNumber: hospital.contactNumber,
    shiftCount: hospital.shiftCount,
    strongestFit: hospital.strongestFit,
    position: hospital.position,
  }))

  const selectedHospital =
    selectedHospitalId ? hospitals.find((hospital) => hospital.id === selectedHospitalId) ?? null : null

  return (
    <WorkspaceDesktopShell currentNav="workforce">
      <div className="px-5 py-4 lg:px-6 lg:py-5">
        <DesktopSectionWordmark label="Resources Workforce" />
        <p className="mt-3 max-w-[800px] text-[15px] leading-7 text-[#486579]">
          Shifts should feel like discovery and booking, not a rota dump. Internal shows opportunities inside
          the staff member&apos;s normal organisation. External opens the wider market. The map should answer a
          simple question first: which hospitals are inside my radius?
        </p>

        <WorkforceSectionNav current="shifts" />

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.92fr)]">
          <div className="space-y-5">
            <section className="overflow-hidden rounded-[32px] border border-[#CFE3EA] bg-[linear-gradient(135deg,#FFFFFF_0%,#F5FCFE_100%)] shadow-[0_18px_46px_rgba(16,36,62,0.08)]">
              <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[13px] uppercase tracking-[0.18em] text-[#7A98AA]">My next move</p>
                  <h2 className="mt-3 text-[34px] leading-[1.02] tracking-[-0.06em] text-[#10243E]">
                    {nextShift.day} · {nextShift.time}
                  </h2>
                  <p className="mt-3 text-[18px] tracking-[-0.03em] text-[#173A52]">{nextShift.area}</p>
                  <p className="mt-1 text-[14px] text-[#61758B]">{nextShift.specialty}</p>
                  <p className="mt-3 max-w-[620px] text-[14px] leading-6 text-[#486579]">{nextShift.allocation}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button className="rounded-[20px] bg-[#0096C7] px-5 py-3 text-[14px] text-white shadow-[0_10px_24px_rgba(0,150,199,0.24)]">
                    Open shift
                  </button>
                  <button className="rounded-[20px] border border-[#CFE4EC] bg-[#F6FBFD] px-5 py-3 text-[14px] text-[#1B86AE]">
                    View allocation
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-[#D6E7EE] bg-white/92 p-5 shadow-[0_18px_46px_rgba(16,36,62,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles size={17} className="text-[#1b86ae]" />
                    <h2 className="text-[24px] tracking-[-0.04em] text-[#10243E]">Hospital discovery</h2>
                  </div>
                  <p className="mt-2 text-[14px] text-[#61758B]">
                    Start at the hospital level. Then open the available shifts inside that hospital.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {typeFilters.map((filter) => (
                    <button
                      key={filter}
                      onClick={() => {
                        setShiftType(filter)
                        setSelectedHospitalId(null)
                        setHoveredHospitalId(null)
                      }}
                      className={`rounded-full px-4 py-2 text-[13px] ${
                        shiftType === filter
                          ? "bg-[#0096C7] text-white shadow-[0_10px_24px_rgba(0,150,199,0.22)]"
                          : "border border-[#D6E7EE] bg-[#F6FBFD] text-[#486579]"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap gap-2">
                  {modeFilters.map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setMode(filter)}
                      className={`rounded-full px-4 py-2 text-[13px] ${
                        mode === filter
                          ? "bg-[#173A52] text-white"
                          : "border border-[#D6E7EE] bg-white text-[#486579]"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 rounded-full border border-[#D6E7EE] bg-[#F6FBFD] px-4 py-2">
                  <Navigation size={15} className="text-[#1b86ae]" />
                  <span className="text-[13px] text-[#486579]">Radius</span>
                  <input
                    type="range"
                    min="5"
                    max="150"
                    step="5"
                    value={radiusMiles}
                      onChange={(event) => {
                        setRadiusMiles(Number(event.target.value))
                        setSelectedHospitalId(null)
                        setHoveredHospitalId(null)
                      }}
                    className="w-28 accent-[#0096C7]"
                  />
                  <span className="text-[13px] text-[#15364D]">{radiusMiles} miles</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-[13px]">
                <span className="rounded-full bg-[#EEF8FF] px-3 py-1.5 text-[#1B86AE]">
                  {hospitals.length} hospitals in range
                </span>
                <span className="rounded-full bg-[#F7F9FB] px-3 py-1.5 text-[#61758B]">
                  {filteredShifts.length} shifts in range
                </span>
              </div>

              <div className="mt-5">
                {mode === "Feed" ? (
                  <div className="space-y-3">
                    {hospitals.map((hospital) => (
                      <div
                        key={hospital.id}
                        className="rounded-[24px] border border-[#D7E8EF] bg-[linear-gradient(180deg,#FFFFFF_0%,#FAFDFF_100%)] p-4 shadow-[0_12px_26px_rgba(16,36,62,0.05)]"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-[18px] tracking-[-0.03em] text-[#15364D]">{hospital.hospital}</h3>
                              <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${pillTone(hospital.strongestFit)}`}>
                                {hospital.strongestFit}
                              </span>
                              <span className="rounded-full bg-[#F7F9FB] px-3 py-1.5 text-[12px] text-[#61758B]">
                                {hospital.distanceMiles} miles away
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
                              <span className="rounded-full bg-[#F1F8FB] px-3 py-1.5 text-[#1B86AE]">
                                {hospital.shiftCount > 0 ? `${hospital.shiftCount} shifts` : "No shifts"}
                              </span>
                              <span className="rounded-full bg-[#F7F9FB] px-3 py-1.5 text-[#61758B]">
                                {hospital.contactNumber}
                              </span>
                            </div>
                            <div className="mt-4 space-y-2">
                              {hospital.shifts.length > 0 ? (
                                hospital.shifts.map((shift) => (
                                  <div key={shift.id} className="rounded-[16px] border border-[#E8F0F4] bg-[#FBFDFF] px-3 py-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div>
                                        <p className="text-[14px] text-[#15364D]">{shift.title}</p>
                                        <p className="mt-1 text-[12px] text-[#61758B]">{shift.when}</p>
                                      </div>
                                      <span className="rounded-full bg-[#F1F8FB] px-3 py-1 text-[12px] text-[#1B86AE]">
                                        {shift.rate}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="rounded-[16px] border border-dashed border-[#D6E7EE] bg-[#FBFDFF] px-3 py-4 text-[13px] text-[#7A98AA]">
                                  No shifts are currently available in this hospital.
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => setSelectedHospitalId(hospital.id)}
                            className="inline-flex items-center gap-2 rounded-full bg-[#0096C7] px-4 py-2 text-[13px] text-white shadow-[0_10px_24px_rgba(0,150,199,0.24)]"
                          >
                            Open hospital
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <WorkforceShiftMap
                    hospitals={hospitalPins}
                    radiusMiles={radiusMiles}
                    selectedHospitalId={selectedHospitalId}
                    hoveredHospitalId={hoveredHospitalId}
                    center={baseCenter}
                    onSelectHospital={setSelectedHospitalId}
                    onHoverHospital={setHoveredHospitalId}
                  />
                )}
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-[30px] border border-[#D6E7EE] bg-white/92 p-5 shadow-[0_18px_46px_rgba(16,36,62,0.08)]">
              <div className="flex items-center gap-2">
                <Filter size={17} className="text-[#1b86ae]" />
                <h2 className="text-[22px] tracking-[-0.04em] text-[#10243E]">Filters</h2>
              </div>

              <div className="mt-4 space-y-4">
                <div className="rounded-[20px] border border-[#E8F0F4] bg-[#FBFDFF] p-4">
                  <div className="flex items-center gap-2">
                    <CalendarClock size={15} className="text-[#1b86ae]" />
                    <p className="text-[14px] text-[#15364D]">Date</p>
                  </div>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    className="mt-3 w-full rounded-[16px] border border-[#D6E7EE] bg-white px-3 py-3 text-[14px] text-[#15364D] outline-none"
                  />
                </div>

                <div className="rounded-[20px] border border-[#E8F0F4] bg-[#FBFDFF] p-4">
                  <p className="text-[14px] text-[#15364D]">Shift type</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {shiftModeFilters.map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setShiftModeFilter(filter)}
                        className={`rounded-full px-3 py-2 text-[12px] ${
                          shiftModeFilter === filter
                            ? "bg-[#0096C7] text-white"
                            : "border border-[#D6E7EE] bg-white text-[#486579]"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[20px] border border-[#E8F0F4] bg-[#FBFDFF] p-4">
                  <div className="flex items-center gap-2">
                    <PoundSterling size={15} className="text-[#1b86ae]" />
                    <p className="text-[14px] text-[#15364D]">Rate</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {rateFilters.map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setRateFilter(filter)}
                        className={`rounded-full px-3 py-2 text-[12px] ${
                          rateFilter === filter
                            ? "bg-[#173A52] text-white"
                            : "border border-[#D6E7EE] bg-white text-[#486579]"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-[#D6E7EE] bg-white/92 p-5 shadow-[0_18px_46px_rgba(16,36,62,0.08)]">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={17} className="text-[#1b86ae]" />
                <h2 className="text-[22px] tracking-[-0.04em] text-[#10243E]">My shift status</h2>
              </div>
              <div className="mt-4 space-y-3">
                {shiftStatuses.map((item) => (
                  <div
                    key={`${item.status}-${item.title}`}
                    className="rounded-[20px] border border-[#E8F0F4] bg-[#FBFDFF] px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#EEF8FF] px-3 py-1.5 text-[12px] text-[#1B86AE]">
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-3 text-[15px] text-[#15364D]">{item.title}</p>
                    <p className="mt-1 text-[13px] text-[#61758B]">{item.hospital}</p>
                    <p className="mt-3 text-[13px] text-[#486579]">{item.contact}</p>
                    <div className="mt-2 flex items-center gap-2 text-[13px] text-[#61758B]">
                      <Phone size={14} className="text-[#1b86ae]" />
                      {item.phone}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {selectedHospital ? (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(16,36,62,0.24)] px-4">
            <div className="w-full max-w-[760px] rounded-[30px] border border-[#CFE3EA] bg-white p-6 shadow-[0_26px_80px_rgba(16,36,62,0.22)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[13px] uppercase tracking-[0.18em] text-[#7A98AA]">{shiftType} hospital</p>
                  <h3 className="mt-2 text-[30px] leading-[1.04] tracking-[-0.05em] text-[#10243E]">
                    {selectedHospital.hospital}
                  </h3>
                  <p className="mt-2 text-[15px] text-[#486579]">{selectedHospital.distanceMiles} miles away</p>
                </div>
                <button
                  onClick={() => setSelectedHospitalId(null)}
                  className="rounded-full border border-[#D6E7EE] bg-[#F6FBFD] p-2 text-[#486579]"
                  aria-label="Close hospital modal"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-[#E8F0F4] bg-[#FBFDFF] p-4">
                  <p className="text-[13px] text-[#7A98AA]">Contact</p>
                  <div className="mt-2 flex items-center gap-2 text-[15px] text-[#15364D]">
                    <Phone size={15} className="text-[#1b86ae]" />
                    {selectedHospital.contactNumber}
                  </div>
                </div>
                <div className="rounded-[22px] border border-[#E8F0F4] bg-[#FBFDFF] p-4">
                  <p className="text-[13px] text-[#7A98AA]">Shifts in this hospital</p>
                  <p className="mt-2 text-[15px] text-[#15364D]">{selectedHospital.shiftCount}</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {selectedHospital.shifts.map((shift) => (
                  <div key={shift.id} className="rounded-[22px] border border-[#E8F0F4] bg-[#FBFDFF] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[16px] text-[#15364D]">{shift.title}</p>
                          <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${pillTone(shift.fit)}`}>
                            {shift.fit}
                          </span>
                        </div>
                        <p className="mt-2 text-[13px] text-[#61758B]">{shift.when}</p>
                        <p className="mt-1 text-[13px] text-[#61758B]">{shift.rate}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="rounded-[18px] border border-[#CFE4EC] bg-[#F6FBFD] px-4 py-2 text-[13px] text-[#1B86AE]">
                          View shift
                        </button>
                        <button className="rounded-[18px] bg-[#0096C7] px-4 py-2 text-[13px] text-white shadow-[0_10px_24px_rgba(0,150,199,0.24)]">
                          Offer availability
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <span className="rounded-[20px] border border-[#D6E7EE] bg-white px-4 py-3 text-[13px] text-[#61758B]">
                  Subject to approval
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </WorkspaceDesktopShell>
  )
}
