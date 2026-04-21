"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, ChevronRight, X } from "lucide-react"
import {
  clearProfile,
  resolveProfile,
  saveProfile,
} from "@/lib/profile"
import { clearDemoSession, isDemoSessionActive } from "@/lib/demo-access"
import { getFirestoreHospitals } from "@/lib/firestore"
import { PrepSightProfile, USER_ROLE_LABEL, type UserRole } from "@/lib/types"
import { ONBOARDING_SETTING_SPECIALTIES } from "@/lib/settings"
import { onAuthChange, signOut, type User } from "@/lib/auth"
import hospitalsData from "@/lib/hospitals.json"
import MedaskcaLoadingScreen from "@/components/MedaskcaLoadingScreen"

const SEEDED_HOSPITALS = hospitalsData

const DEPARTMENTS = [
  "Theatres",
  "Endoscopy",
  "ICU / Critical Care",
  "Emergency Department",
  "Ward",
  "Clinic / Outpatients",
  "Maternity",
  "Interventional Radiology",
  "Other",
]

const DEPT_TO_SPECIALTY: Record<string, string[]> = {
  "Theatres": [...ONBOARDING_SETTING_SPECIALTIES["Operating Theatre"]],
  "Endoscopy": [...ONBOARDING_SETTING_SPECIALTIES["Endoscopy Suite"]],
  "ICU / Critical Care": [...ONBOARDING_SETTING_SPECIALTIES["Intensive Care Unit"]],
  "Emergency Department": [...ONBOARDING_SETTING_SPECIALTIES["Emergency Department"]],
  "Ward": [...ONBOARDING_SETTING_SPECIALTIES["Ward"]],
  "Clinic / Outpatients": [...ONBOARDING_SETTING_SPECIALTIES["Outpatient / Clinic"]],
  "Maternity": [...ONBOARDING_SETTING_SPECIALTIES["Maternity & Obstetrics"]],
  "Interventional Radiology": [...ONBOARDING_SETTING_SPECIALTIES["Interventional Radiology / Cath Lab"]],
}

const DEPT_TO_SETTING_LABEL: Record<string, string> = {
  "Theatres": "Operating Theatre",
  "Endoscopy": "Endoscopy Suite",
  "ICU / Critical Care": "Intensive Care Unit",
  "Emergency Department": "Emergency Department",
  "Ward": "Ward",
  "Clinic / Outpatients": "Outpatient / Clinic",
  "Maternity": "Maternity & Obstetrics",
  "Interventional Radiology": "Interventional Radiology / Cath Lab",
  "Other": "Other",
}

const DEPARTMENT_PURPOSE: Record<string, string> = {
  "Theatres": "Surface operative cards, preparation checklists, implants, instruments, and workflow guidance first.",
  "Endoscopy": "Prioritise scopes, procedure prep, sedation, consumables, and turnaround information.",
  "ICU / Critical Care": "Prioritise line, airway, renal, and critical-care workflows used in high-acuity settings.",
  "Emergency Department": "Prioritise rapid-access procedural guidance, resuscitation support, and emergency setup.",
  "Ward": "Prioritise bedside procedures, escalation prep, post-procedure care, and ward-based workflows.",
  "Clinic / Outpatients": "Prioritise minor procedure setup, assessment, follow-up, and outpatient preparation cards.",
  "Maternity": "Prioritise obstetric, antenatal, labour, postnatal, and maternity procedure guidance.",
  "Interventional Radiology": "Prioritise procedural setup, imaging support, devices, sedation, and sterile prep guidance.",
  "Other": "Keeps your account flexible while the wider hospital library is still being built out.",
}

const TOTAL_STEPS = 8
const CTA_LABELS = [
  "Continue",
  "Confirm my hospital",
  "Continue",
  "Confirm my role",
  "Understood, continue",
  "Confirm my area",
  "Continue",
  "Enter PrepSight",
]

const ROLE_OPTIONS: Array<{ role: UserRole; label: string; description: string }> = [
  {
    role: "viewer",
    label: USER_ROLE_LABEL.viewer,
    description: "I use PrepSight to look up and reference procedure cards.",
  },
  {
    role: "editor",
    label: USER_ROLE_LABEL.editor,
    description: "I help create and maintain card content for my team.",
  },
  {
    role: "clinical_author",
    label: "Clinical Author / Admin",
    description: "I author content and manage team access. Up to 2 admins per workspace.",
  },
]

function normalizeDisplayName(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function isProfessionalDisplayName(value: string): boolean {
  const normalized = normalizeDisplayName(value)
  if (normalized.length < 3 || normalized.length > 60) return false
  if (!/^[A-Za-z .'-]+$/.test(normalized)) return false

  const parts = normalized
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => /[A-Za-z]/.test(part))

  return parts.length >= 2
}

function CompactSpecialtyToggle({
  label,
  selected,
  onToggle,
  delay = 0,
}: {
  label: string
  selected: boolean
  onToggle: () => void
  delay?: number
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`chip-reveal flex h-[50px] items-center justify-center rounded-2xl border px-3 py-1 text-center text-[12px] font-medium transition-all duration-200 ease-out active:scale-[0.98] lg:h-[82px] lg:px-5 lg:py-3 lg:text-lg ${
        selected
          ? "border-[#0085B2] bg-[#0096C7] text-white shadow-[0_10px_22px_rgba(0,150,199,0.24)] ring-2 ring-[#7DD9EE]/60 scale-[1.01]"
          : "border-[#4CBFD4] bg-[#7DD9EE] text-[#0F4C5C] hover:bg-[#0096C7] hover:text-white active:bg-[#0096C7] active:text-white"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="max-w-[11ch] leading-[1.05] lg:max-w-[14ch] lg:leading-5">{label}</span>
    </button>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [demoSessionActive, setDemoSessionActive] = useState(() => isDemoSessionActive())
  const [step, setStep] = useState(1)
  const [animKey, setAnimKey] = useState(0)
  const [hasStartedOnboarding, setHasStartedOnboarding] = useState(false)

  const [hospital, setHospital] = useState("")
  const [hospitals, setHospitals] = useState(SEEDED_HOSPITALS)
  const [hospitalSuggestions, setHospitalSuggestions] = useState<typeof SEEDED_HOSPITALS>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [role, setRole] = useState<UserRole>("viewer")
  const [departments, setDepartments] = useState<string[]>([])
  const [specialties, setSpecialties] = useState<string[]>([])
  const [collapsedDepartments, setCollapsedDepartments] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [finishing, setFinishing] = useState(false)

  const hospitalWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => onAuthChange((u) => setUser(u ?? null)), [])

  useEffect(() => {
    setDemoSessionActive(isDemoSessionActive())
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadHospitals() {
      const firestoreHospitals = await getFirestoreHospitals()
      if (cancelled || firestoreHospitals.length === 0) return

      const merged = [...SEEDED_HOSPITALS]
      const known = new Set(
        SEEDED_HOSPITALS.map((entry) => `${entry.hospital.trim().toLowerCase()}__${entry.trust.trim().toLowerCase()}`),
      )

      for (const entry of firestoreHospitals) {
        const hospitalName = entry.name.trim()
        if (!hospitalName) continue
        const trustName = entry.trust?.trim() || entry.name.trim()
        const key = `${hospitalName.toLowerCase()}__${trustName.toLowerCase()}`
        if (known.has(key)) continue
        known.add(key)
        merged.push({
          hospital: hospitalName,
          trust: trustName,
          address: "",
          postcode: "",
        })
      }

      setHospitals(merged)
    }

    void loadHospitals()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!user) return
    setDisplayName((current) => current || normalizeDisplayName(user.displayName ?? ""))
    resolveProfile(user.uid)
      .then((profile) => {
        if (!profile) return

        setHospital((current) => current || profile.hospital || "")
        setDepartments((current) => (current.length > 0 ? current : profile.departments))
        setSpecialties((current) =>
          current.length > 0 ? current : profile.specialtiesOfInterest,
        )
        setDisplayName((current) =>
          current || normalizeDisplayName(profile.name ?? user.displayName ?? ""),
        )
      })
      .catch(() => null)
  }, [user])

  useEffect(() => {
    function handler(event: MouseEvent) {
      if (!hospitalWrapRef.current?.contains(event.target as Node)) {
        setShowSuggestions((current) => (current ? false : current))
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const hospitalMatch = hospitals.find(
    (entry) => entry.hospital.toLowerCase() === hospital.trim().toLowerCase(),
  )
  const membershipHint = hospitalMatch
    ? "If this hospital already has an internal PrepSight library, your membership may need approval before full access is granted."
    : "If your hospital is not listed yet, your entry can start a new PrepSight workspace."

  const normalizedDisplayName = normalizeDisplayName(displayName)
  const displayNameLooksValid = isProfessionalDisplayName(normalizedDisplayName)

  const availableSpecialties = Array.from(
    new Set(departments.flatMap((department) => DEPT_TO_SPECIALTY[department] ?? [])),
  )

  const specialtyGroups = departments
    .map((department) => ({
      department,
      settingLabel: DEPT_TO_SETTING_LABEL[department] ?? department,
      specialties: DEPT_TO_SPECIALTY[department] ?? [],
    }))
    .filter((group) => group.specialties.length > 0)

  const specialtyGroupDepartments = specialtyGroups.map((group) => group.department)
  const specialtyGroupKey = specialtyGroupDepartments.join("|")

  useEffect(() => {
    if (specialtyGroupDepartments.length <= 1) {
      setCollapsedDepartments((current) => (current.length === 0 ? current : []))
      return
    }

    setCollapsedDepartments((current) => {
      const next = current.filter((department) => specialtyGroupDepartments.includes(department))
      if (next.length === 0) return [...specialtyGroupDepartments]
      if (next.length === current.length && next.every((department, index) => department === current[index])) {
        return current
      }
      return next
    })
  }, [specialtyGroupDepartments, specialtyGroupKey])

  function handleHospitalInput(value: string) {
    setHospital(value)
    if (value.trim().length === 0) {
      setHospitalSuggestions([])
      setShowSuggestions(false)
      return
    }

    const query = value.toLowerCase()
    const matches = hospitals.filter((entry) =>
      entry.hospital.toLowerCase().includes(query) ||
      entry.trust.toLowerCase().includes(query) ||
      (entry.postcode && entry.postcode.toLowerCase().includes(query)),
    ).slice(0, 5)

    setHospitalSuggestions(matches)
    setShowSuggestions(matches.length > 0)
  }

  function canAdvance() {
    if (step === 2) return hospital.trim().length > 0
    if (step === 3) return displayNameLooksValid
    if (step === 6) return departments.length > 0
    return true
  }

  function toggleDepartmentCollapse(department: string) {
    if (specialtyGroups.length <= 1) return
    setCollapsedDepartments((current) =>
      current.includes(department)
        ? current.filter((value) => value !== department)
        : [...current, department],
    )
  }

  function goNext() {
    setHasStartedOnboarding(true)
    setStep((current) => current + 1)
    setAnimKey((current) => current + 1)
  }

  function goBack() {
    setHasStartedOnboarding(true)
    setStep((current) => current - 1)
    setAnimKey((current) => current + 1)
  }

  async function handleSignOut() {
    const confirmed = window.confirm("Cancel registration? You will be signed out and returned to the login page.")
    if (!confirmed) return
    clearProfile()
    clearDemoSession()
    await signOut().catch(() => undefined)
    if (typeof window !== "undefined") {
      window.location.replace("/login")
      return
    }
    router.replace("/login")
  }

  async function handleFinish() {
    if (saving || finishing) return

    setHasStartedOnboarding(true)
    setFinishing(true)
    setSaving(true)
    setSaveError("")

    const profile: PrepSightProfile = {
      hospital: hospital.trim(),
      departments,
      role,
      name: normalizedDisplayName,
      specialtiesOfInterest: specialties,
      completedAt: new Date().toISOString(),
    }

    try {
      await saveProfile(profile, user?.uid)
      if (typeof window !== "undefined") {
        window.location.replace("/")
        return
      }
      router.replace("/")
    } catch (error) {
      console.error("[PrepSight] Onboarding save failed:", error)
      setSaveError(
        "PrepSight could not finish setting up your workspace. Check Firestore rules for the new project and try again.",
      )
      setFinishing(false)
    } finally {
      setSaving(false)
    }
  }

  const progressPct = ((step - 1) / (TOTAL_STEPS - 1)) * 100

  if (finishing) {
    return <MedaskcaLoadingScreen message="Setting up your workspace..." />
  }

  return (
    <div className="onboarding-stage min-h-screen flex flex-col overflow-x-clip">
      {user || demoSessionActive ? (
        <div className="absolute right-4 top-4 z-20 md:right-6 md:top-6">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#0085B2] bg-[#0096C7] text-white shadow-[0_10px_24px_rgba(0,150,199,0.24)] transition-colors hover:bg-[#0085B2]"
            aria-label="Cancel registration"
            title="Cancel registration"
          >
            <X size={22} strokeWidth={2.2} />
          </button>
        </div>
      ) : null}
      <div className="onboarding-ambient" aria-hidden="true">
        <div className="onboarding-ambient-glow onboarding-ambient-glow-a" />
        <div className="onboarding-ambient-glow onboarding-ambient-glow-b" />
        <div className="onboarding-ambient-grid" />
      </div>

      <div className="onboarding-progress-shell mt-[env(safe-area-inset-top,0px)] h-0.5 lg:mt-0">
        <div
          className="onboarding-progress-bar h-full transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="relative z-10 flex-1 px-6 pb-8 pt-20 sm:pt-24 lg:px-12 lg:pt-16">
        <div className="mx-auto w-full max-w-3xl" key={animKey}>
          {step === 1 && (
            <div className="animate-step-in lg:pt-10">
              <img src="/ps-mark.png" alt="P.S." className="mb-4 h-12 w-auto lg:mb-6 lg:h-16" />

              <h2 className="mb-2 text-[1.75rem] font-bold text-[#3F4752] leading-tight lg:max-w-2xl lg:mb-3 lg:text-4xl lg:leading-tight">
                A procedure card. Reimagined.
              </h2>
              <p className="mb-6 max-w-2xl text-sm leading-6 text-[#0F4C5C] lg:text-lg lg:leading-7">
                Preparation information has a habit of living everywhere. A notebook somewhere. A screenshot on a phone. A preference list saved in a folder. And occasionally... memory. We bring it together in one place. Each card acts as a guide to the key details used to prepare procedures, organised by setting and specialty.
              </p>

              <div className="max-w-2xl space-y-3 lg:space-y-5">
                {[
                  "Each card brings the key preparation details together in one place.",
                  "Cards are organised by setting and specialty, so you find what you need quickly.",
                  "Each hospital can build and maintain its own living internal library instead of relying on shared drives, screenshots, or printed card folders.",
                  "PrepSight supports your preparation. Your trust's policy and your clinical judgement always come first.",
                ].map((point, index) => (
                  <div
                    key={point}
                    className="flex items-start gap-3 line-reveal lg:gap-4"
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    <ChevronRight size={18} className="mt-0.5 shrink-0 text-[#4DA3FF]" />
                    <p className="text-sm leading-5 text-[#0F4C5C] lg:text-lg lg:leading-8">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-step-in flex min-h-[68dvh] flex-col justify-center md:min-h-0">
              <div className="mb-6 lg:mb-8">
                {["Your hospital.", "Your workflows.", "Your PrepSight."].map((line, index) => (
                  <p
                    key={line}
                    className="text-3xl font-bold text-[#3F4752] leading-tight line-reveal lg:text-6xl lg:leading-[1.02]"
                    style={{ animationDelay: `${index * 120}ms` }}
                  >
                    {line}
                  </p>
                ))}
              </div>

              <p className="mb-6 max-w-2xl text-base leading-7 text-[#0F4C5C] line-reveal lg:mb-8 lg:text-xl lg:leading-9" style={{ animationDelay: "420ms" }}>
                PrepSight works best when your account is linked to your hospital or trust. Enter your organisation and we&apos;ll connect you to the right workspace.
              </p>

              <div
                ref={hospitalWrapRef}
                className="relative isolate line-reveal"
                style={{ animationDelay: "560ms" }}
              >
                <input
                  type="text"
                  value={hospital}
                  onChange={(event) => handleHospitalInput(event.target.value)}
                  placeholder="Search for your hospital or trust"
                  className="w-full rounded-xl border border-[#D5DCE3] bg-white px-4 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#4DA3FF] transition-shadow lg:px-5 lg:py-4 lg:text-lg"
                  autoFocus
                />

                {showSuggestions && (
                  <div className="absolute left-0 right-0 top-full mt-1 overflow-hidden rounded-xl border border-[#D5DCE3] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.16)] ring-1 ring-white z-30">
                    {hospitalSuggestions.map((entry) => (
                      <button
                        key={`${entry.hospital}-${entry.postcode ?? ""}`}
                        type="button"
                        onMouseDown={() => {
                          setHospital(entry.hospital)
                          setShowSuggestions(false)
                        }}
                        className="w-full px-4 py-3 text-left text-[15px] transition-colors hover:bg-[#F4F7FA] lg:text-sm"
                      >
                        <p className="text-[#3F4752] font-medium">{entry.hospital}</p>
                        <p className="text-xs text-[#94a3b8] mt-0.5">
                          {entry.trust}
                          {entry.postcode ? ` · ${entry.postcode}` : ""}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                <p className="mt-3 text-[13px] leading-5 text-[#0F4C5C] lg:text-base lg:leading-7">
                  Not listed? Type it in and we&apos;ll save it automatically.
                </p>
                <p className="mt-3 text-[13px] leading-5 text-[#0F4C5C] lg:text-base lg:leading-7">
                  {membershipHint}
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-step-in pt-6 sm:pt-0">
              <h2 className="mb-3 text-3xl font-bold text-[#3F4752] lg:text-5xl">
                What should colleagues call you?
              </h2>
              <p className="mb-6 max-w-2xl text-base leading-7 text-[#0F4C5C] lg:text-xl lg:leading-9">
                This name is shown within your organisation so colleagues can recognise your contributions.
              </p>

              <div className="space-y-3">
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Enter your professional display name"
                  className="w-full rounded-xl border border-[#D5DCE3] bg-white px-4 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#4DA3FF] transition-shadow lg:px-5 lg:py-4 lg:text-lg"
                  autoFocus
                />
                <p className="text-[13px] leading-5 text-[#0F4C5C] lg:text-base lg:leading-7">
                  Use your professional name. This is visible within your organisation.
                </p>
                <p className="text-[13px] leading-5 text-[#0F4C5C] lg:text-base lg:leading-7">
                  By continuing, you confirm this is the name you use professionally. Read our{" "}
                  <Link href="/privacy" className="font-semibold text-[#0077B6] underline underline-offset-2">
                    Privacy Statement
                  </Link>
                  .
                </p>
                {!displayNameLooksValid && normalizedDisplayName.length > 0 && (
                  <p className="text-[13px] leading-5 text-[#C2410C] lg:text-xs">
                    Enter a professional name using letters only, with at least a first name and surname.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-step-in">
              <h2 className="mb-2 text-3xl font-bold text-[#3F4752] lg:text-5xl">
                How will you use PrepSight?
              </h2>
              <p className="mb-6 max-w-2xl text-base leading-7 text-[#0F4C5C] lg:text-xl lg:leading-9">
                Choose the role that best fits how you work. You can update this later.
              </p>
              <div className="grid gap-3">
                {ROLE_OPTIONS.map((option) => (
                  <button
                    key={option.role}
                    type="button"
                    onClick={() => setRole(option.role)}
                    className={`flex items-start gap-4 rounded-2xl border px-5 py-4 text-left transition-all duration-200 ${
                      role === option.role
                        ? "border-[#0085B2] bg-[#0096C7] text-white shadow-[0_10px_22px_rgba(0,150,199,0.24)] ring-2 ring-[#7DD9EE]/60"
                        : "border-[#4CBFD4] bg-[#7DD9EE] text-[#0F4C5C] hover:bg-[#0096C7] hover:text-white"
                    }`}
                  >
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${role === option.role ? "border-white bg-white" : "border-[#0F4C5C]"}`}>
                      {role === option.role && <span className="h-2.5 w-2.5 rounded-full bg-[#0096C7]" />}
                    </div>
                    <div>
                      <p className="text-base font-semibold lg:text-lg">{option.label}</p>
                      <p className={`mt-1 text-sm leading-5 lg:text-base lg:leading-6 ${role === option.role ? "text-white/90" : "text-[#0F4C5C]"}`}>{option.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="animate-step-in">
              <div className="mb-2 flex justify-center lg:mb-3">
                <img src="/disclaimer.png" alt="" className="h-28 w-28 lg:h-32 lg:w-32" />
              </div>
              <h2 className="mb-2 text-3xl font-bold text-[#3F4752] lg:text-5xl">
                One thing before you continue.
              </h2>
              <p className="mb-4 text-base leading-6 text-[#0F4C5C] lg:text-lg lg:leading-8">
                Please take a moment to read this.
              </p>

              <div className="space-y-2.5">
                <p className="text-sm leading-5 text-[#0F4C5C] lg:text-base lg:leading-7">
                  PrepSight is a preparation and reference aid.
                </p>
                <p className="text-sm leading-5 text-[#0F4C5C] lg:text-base lg:leading-7">
                  It reflects established practice, but it does not replace the policies, protocols, or clinical judgement of your trust.
                </p>
                <p className="text-sm leading-5 text-[#0F4C5C] lg:text-base lg:leading-7">
                  Shared cards may be visible across organisations in anonymised form, but internal hospital information and contributor identity should stay scoped to the correct membership context.
                </p>
                <ul className="space-y-1 list-disc list-inside">
                  {[
                    "Always follow your local guidelines",
                    "Clinical judgement takes precedence",
                    "Cards are reviewed periodically but may not reflect the most recent local changes",
                  ].map((item) => (
                    <li key={item} className="text-sm leading-5 text-[#0F4C5C] lg:text-base lg:leading-7">
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="pt-0.5 text-base font-semibold text-[#0F4C5C] lg:text-lg">
                  PrepSight supports you. It does not override you.
                </p>
              </div>

              <p className="mt-3 text-sm leading-5 text-[#0F4C5C] lg:text-base lg:leading-7">
                By continuing, you confirm you have read this notice.
              </p>
            </div>
          )}

          {step === 6 && (
            <div className="animate-step-in">
              <h2 className="mb-2 text-3xl font-bold text-[#3F4752] lg:text-5xl">
                Which areas do you work in?
              </h2>
              <p className="mb-6 max-w-2xl text-base leading-7 text-[#0F4C5C] lg:text-xl lg:leading-9">
                Select all that apply. PrepSight will use this to branch the right parts of the library and prioritise the workflows you are most likely to need.
              </p>

              <div className="grid grid-cols-2 gap-2 lg:gap-3">
                {DEPARTMENTS.map((department, index) => (
                  <button
                    key={department}
                    type="button"
                    onClick={() => {
                      setDepartments((current) =>
                        current.includes(department)
                          ? current.filter((value) => value !== department)
                          : [...current, department],
                      )
                    }}
                    className={`chip-reveal flex h-[64px] items-center justify-center rounded-2xl border px-4 py-2 text-center text-sm font-medium transition-all duration-200 ease-out active:scale-[0.98] lg:h-[82px] lg:px-5 lg:py-3 lg:text-lg ${
                      departments.includes(department)
                        ? "border-[#0085B2] bg-[#0096C7] text-white shadow-[0_10px_22px_rgba(0,150,199,0.24)] ring-2 ring-[#7DD9EE]/60 scale-[1.01]"
                        : "border-[#4CBFD4] bg-[#7DD9EE] text-[#0F4C5C] hover:bg-[#0096C7] hover:text-white active:bg-[#0096C7] active:text-white"
                    }`}
                    style={{ animationDelay: `${index * 25}ms` }}
                  >
                    <span className="max-w-[12ch] leading-[1.2] lg:max-w-[14ch] lg:leading-5">{department}</span>
                  </button>
                ))}
              </div>

            </div>
          )}

          {step === 7 && (
            <div className="animate-step-in">
              <h2 className="mb-2 text-3xl font-bold text-[#3F4752] lg:text-5xl">
                Which specialties matter most to you?
              </h2>
              <p className="mb-4 max-w-2xl text-sm leading-6 text-[#0F4C5C] lg:mb-6 lg:text-xl lg:leading-9">
                Optional. You can always browse the full library. This helps PrepSight prioritise the specialties, cards, and assistant context you are most likely to open first.
              </p>

              {availableSpecialties.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {specialtyGroups.map((group, groupIndex) => (
                      <section key={group.department}>
                        {specialtyGroups.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => toggleDepartmentCollapse(group.department)}
                            className="mb-2 flex w-full items-center justify-between rounded-2xl border border-[#8ADFF0] bg-[#00B4D8] px-4 py-3 text-left text-[#10243E] transition-all hover:bg-[#33C4E2]"
                          >
                            <div>
                              <p className="text-[15px] font-semibold lg:text-lg">
                                {group.settingLabel}
                              </p>
                            </div>
                            <ChevronDown
                              size={16}
                              className={`shrink-0 transition-transform ${
                                collapsedDepartments.includes(group.department) ? "" : "rotate-180"
                              }`}
                            />
                          </button>
                        ) : null}

                        {!collapsedDepartments.includes(group.department) && (
                          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-3 lg:gap-2">
                            {group.specialties.map((specialty, specialtyIndex) => (
                              <CompactSpecialtyToggle
                                key={`${group.department}-${specialty}`}
                                label={specialty}
                                selected={specialties.includes(specialty)}
                                onToggle={() =>
                                  setSpecialties((current) =>
                                    current.includes(specialty)
                                      ? current.filter((value) => value !== specialty)
                                      : [...current, specialty],
                                  )
                                }
                                delay={(groupIndex * 120) + (specialtyIndex * 20)}
                              />
                            ))}
                          </div>
                        )}
                      </section>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm leading-6 text-[#0F4C5C] lg:text-base lg:leading-7">
                  Select at least one clinical area first and PrepSight will branch the relevant specialties underneath it.
                </p>
              )}

              <p className="mt-3 text-xs leading-5 text-[#0F4C5C] lg:mt-4 lg:text-base lg:leading-7">
                These choices do not lock anything down. They simply give your account a more useful starting point while the wider library grows.
              </p>
            </div>
          )}

          {step === 8 && (
            <div className="animate-step-in">
              <h2 className="mb-2 text-3xl font-bold text-[#3F4752] lg:text-5xl">You&apos;re set up.</h2>
              <p className="mb-6 max-w-2xl text-base leading-7 text-[#0F4C5C] lg:text-xl lg:leading-9">
                Your account is ready. PrepSight will start with the hospital areas and specialties most relevant to you.
              </p>
              <p className="mb-6 max-w-2xl text-sm leading-6 text-[#0F4C5C] lg:text-base lg:leading-7">
                You can later be added to other hospital workspaces if you bank or rotate elsewhere. Those memberships should be approved by the relevant team lead.
              </p>

              <div className="rounded-xl border border-[#0F4C5C] bg-[#DDF7FC] divide-y divide-[#0F4C5C]/20">
                {[
                  { label: "Name", value: normalizedDisplayName || "-" },
                  { label: "Role", value: ROLE_OPTIONS.find((o) => o.role === role)?.label ?? role },
                  { label: "Areas", value: departments.join(", ") || "-" },
                  { label: "Hospital", value: hospital || "-" },
                  ...(specialties.length > 0 ? [{ label: "Specialties", value: specialties.join(", ") }] : []),
                ].map(({ label, value }, index) => (
                  <div
                    key={label}
                    className="flex items-start gap-3 px-4 py-3.5 line-reveal"
                    style={{ animationDelay: `${index * 120}ms` }}
                  >
                    <Check size={14} className="mt-0.5 shrink-0 text-[#0F4C5C]" />
                    <div>
                      <p className="text-sm text-[#0F4C5C] lg:text-base">{label}</p>
                      <p className="mt-0.5 text-sm font-semibold text-[#3F4752] lg:text-lg">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-sm leading-6 text-[#0F4C5C] lg:text-base lg:leading-7">
                You can update your profile later, and request access to additional hospital workspaces separately.
              </p>
              {saveError && (
                <p className="mt-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]">
                  {saveError}
                </p>
              )}
            </div>
          )}

          <div className="mt-7 flex w-full items-center gap-3 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] lg:mt-10 lg:max-w-2xl">
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              className="px-2 py-3 text-sm font-semibold text-[#0F4C5C] transition-colors hover:text-[#3F4752] shrink-0 lg:text-lg"
            >
              Back
            </button>
          )}

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canAdvance()}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#0096C7] px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0085B2] disabled:cursor-not-allowed disabled:opacity-30 lg:px-6 lg:py-4 lg:text-lg"
            >
              {CTA_LABELS[step - 1]} <ChevronRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={saving}
              className="pulse-once flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#0096C7] px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0085B2] disabled:opacity-60 lg:px-6 lg:py-4 lg:text-lg"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check size={15} /> Enter PrepSight
                </>
              )}
            </button>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
