"use client"

import Link from "next/link"
import {
  Bell,
  Bookmark,
  ChevronDown,
  Clock3,
  FileText,
  FolderKanban,
  GitBranch,
  GitCompareArrows,
  Grip,
  History,
  LayoutList,
  Menu,
  MoreHorizontal,
  Play,
  Search,
  ShieldAlert,
  Stethoscope,
  UserCircle2,
  Users,
} from "lucide-react"

const tabs = [
  { label: "Procedure", active: true },
  { label: "Notes", active: false },
  { label: "Proposed Changes", active: false },
  { label: "More", active: false },
]

const stats = [
  { label: "Saved", value: "24", icon: Bookmark },
  { label: "Variants", value: "3", icon: GitBranch },
  { label: "Following", value: "12", icon: Bell },
  { label: "Versions", value: "5", icon: History },
  { label: "Contributors", value: "8", icon: Users },
  { label: "Activity", value: "19", icon: Clock3 },
]

const sections = [
  { name: "Overview", meta: "Approved summary · updated 2 days ago", icon: FileText },
  { name: "Preparation", meta: "Anaesthetic, trays, implants, checks", icon: FolderKanban },
  { name: "Positioning", meta: "Lateral decubitus · supports confirmed", icon: LayoutList },
  { name: "Instruments", meta: "Primary set, reamers, broaches, cement", icon: FolderKanban },
  { name: "Procedure Steps", meta: "12 structured operative steps", icon: FileText },
  { name: "Closure", meta: "Layered closure and dressing pathway", icon: FileText },
  { name: "Post-Op", meta: "Recovery, imaging, mobilisation, handover", icon: FileText },
  { name: "Notes", meta: "3 operational notes and questions", icon: GitCompareArrows },
  { name: "Change History", meta: "v1.1 to v1.2 review trail", icon: History },
]

const overviewBlocks = [
  {
    label: "Procedure Purpose",
    text: "Elective primary total hip replacement for end-stage hip arthropathy with pain, functional loss, and failed conservative management.",
  },
  {
    label: "Key Principles",
    text: "Confirm laterality, implant plan, cement strategy, blood management, antibiotics, imaging availability, and agreed approach before knife-to-skin.",
  },
  {
    label: "Critical Risks",
    text: "Wrong-side surgery, cement reaction, neurovascular injury, instability, fracture, leg-length discrepancy, and retained equipment counts.",
  },
  {
    label: "Setup Summary",
    text: "Posterior approach setup. Hip set, acetabular reamers, femoral broaches, trial heads, cement kit, pulse lavage, diathermy, cell salvage if required.",
  },
  {
    label: "Last Updated",
    text: "Reviewed by Mr A. Rahman and Theatre Orthopaedic Lead, March 29, 2026.",
  },
]

export default function MobileProcedureRepoPreview() {
  return (
    <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col border-x border-[#1F2937] bg-[#0D1117]">
        <header className="border-b border-[#212B36] bg-[#0D1117] px-3 pt-3 pb-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#2D3748] bg-[#111827] text-[#E6EDF3]"
                aria-label="Open navigation"
              >
                <Menu size={18} />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ps-mark.png" alt="P.S." className="h-7 w-auto" />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#2D3748] bg-[#111827] text-[#C7D2DA]"
                aria-label="Search"
              >
                <Search size={17} />
              </button>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#2D3748] bg-[#111827] text-[#C7D2DA]"
                aria-label="Activity"
              >
                <Bell size={17} />
              </button>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#2D3748] bg-[#111827] text-[#C7D2DA]"
                aria-label="Profile"
              >
                <UserCircle2 size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <section className="border-b border-[#212B36] px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] tracking-[0.08em] text-[#7D8590]">Orthopaedics</p>
                <h1 className="mt-1 text-[29px] leading-[1.08] tracking-[-0.045em] text-[#F0F6FC]">
                  Total Hip Replacement
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-[#9FB0C0]">
                  <span>St Thomas&apos; NHS Trust</span>
                  <span>Approved</span>
                  <span>v1.2</span>
                </div>
              </div>

              <div className="mt-1 shrink-0 rounded-full border border-[#1D4ED8]/40 bg-[#0B2540] px-2.5 py-1 text-[12px] text-[#8CCFFF]">
                Approved
              </div>
            </div>
          </section>

          <section className="border-b border-[#212B36] px-2">
            <nav className="flex overflow-x-auto whitespace-nowrap">
              {tabs.map((tab) => (
                <button
                  key={tab.label}
                  type="button"
                  className={`border-b px-3 py-3 text-[13px] ${
                    tab.active
                      ? "border-[#22C1DC] text-[#F0F6FC]"
                      : "border-transparent text-[#8B98A5]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </section>

          <section className="border-b border-[#212B36] bg-[#0F1722] px-4 py-3">
            <div className="flex items-start gap-3">
              <ShieldAlert size={16} className="mt-0.5 shrink-0 text-[#22C1DC]" />
              <div className="min-w-0 text-[13px] leading-5 text-[#C8D1D9]">
                A proposed change to implant availability is awaiting review. Regional variant for cementless primary THR is also available.
              </div>
            </div>
          </section>

          <section className="border-b border-[#212B36] px-4 py-3">
            <div className="grid grid-cols-3 gap-x-4 gap-y-3">
              {stats.map((item) => {
                const Icon = item.icon

                return (
                  <button
                    key={item.label}
                    type="button"
                    className="flex min-w-0 items-center gap-2 text-left"
                  >
                    <Icon size={14} className="shrink-0 text-[#7D8590]" />
                    <div className="min-w-0">
                      <p className="text-[14px] leading-4 text-[#F0F6FC]">{item.value}</p>
                      <p className="truncate text-[11px] uppercase tracking-[0.08em] text-[#7D8590]">
                        {item.label}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="border-b border-[#212B36] px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex min-w-0 items-center gap-2 rounded-[10px] border border-[#2D3748] bg-[#111827] px-3 py-2 text-[13px] text-[#E6EDF3]"
              >
                <GitBranch size={15} className="shrink-0 text-[#7D8590]" />
                <span className="truncate">Approved Version</span>
                <ChevronDown size={14} className="shrink-0 text-[#7D8590]" />
              </button>

              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-[10px] border border-[#1793A8] bg-[#122431] px-3 py-2 text-[13px] text-[#DDF8FD]"
              >
                <Play size={15} className="shrink-0" />
                Start Procedure
              </button>

              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#2D3748] bg-[#111827] text-[#C7D2DA]"
                aria-label="More actions"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>
          </section>

          <section className="border-b border-[#212B36]">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-[13px] uppercase tracking-[0.08em] text-[#7D8590]">Procedure Structure</h2>
              <button type="button" className="text-[12px] text-[#8CCFFF]">
                View all
              </button>
            </div>

            <div className="divide-y divide-[#212B36]">
              {sections.map((section) => {
                const Icon = section.icon

                return (
                  <button
                    key={section.name}
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#111827]"
                  >
                    <div className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#273142] bg-[#111827] text-[#8CCFFF]">
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] text-[#F0F6FC]">{section.name}</p>
                      <p className="truncate text-[12px] text-[#7D8590]">{section.meta}</p>
                    </div>
                    <ChevronDown size={15} className="-rotate-90 shrink-0 text-[#66707B]" />
                  </button>
                )
              })}
            </div>
          </section>

          <section className="px-4 py-4">
            <div className="mb-3 flex items-center gap-2">
              <Stethoscope size={15} className="text-[#22C1DC]" />
              <h2 className="text-[13px] uppercase tracking-[0.08em] text-[#7D8590]">Overview</h2>
            </div>

            <div className="rounded-[12px] border border-[#212B36] bg-[#0F1722]">
              {overviewBlocks.map((block, index) => (
                <div
                  key={block.label}
                  className={`px-4 py-3 ${index < overviewBlocks.length - 1 ? "border-b border-[#212B36]" : ""}`}
                >
                  <p className="text-[11px] uppercase tracking-[0.08em] text-[#7D8590]">{block.label}</p>
                  <p className="mt-1 text-[14px] leading-6 text-[#D0D7DE]">{block.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="px-4 pb-6">
            <div className="rounded-[12px] border border-[#212B36] bg-[#0D141D] px-4 py-3 text-[12px] leading-5 text-[#8B98A5]">
              Procedure cards are controlled operational documents. Approved version is for reference and workflow support only. Local policy and clinical judgement remain primary.
            </div>
          </section>
        </main>

        <footer className="border-t border-[#212B36] bg-[#0D1117] px-4 py-3">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.08em] text-[#7D8590]">
            <Link href="/" className="inline-flex items-center gap-2">
              <Grip size={14} />
              Libraries
            </Link>
            <span>Procedure Repository</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
