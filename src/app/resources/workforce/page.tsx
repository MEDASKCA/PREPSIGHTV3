"use client"

import {
  ArrowRightLeft,
  CalendarClock,
  Clock3,
  MapPinned,
  Phone,
  Users2,
} from "lucide-react"
import WorkforceSectionNav from "@/components/WorkforceSectionNav"
import WorkspaceDesktopShell from "@/components/WorkspaceDesktopShell"

const rotaItems = [
  {
    day: "Today",
    time: "07:30 - 18:00",
    area: "Theatre 1",
    specialty: "Trauma and orthopaedics",
    detail: "Primary knee replacement list · scrub cover",
    contact: "Lisa Warren",
    phone: "020 7794 0500",
  },
  {
    day: "Tomorrow",
    time: "08:00 - 16:30",
    area: "Recovery",
    specialty: "General surgery",
    detail: "Late list support and handover cover",
    contact: "Daniel Shah",
    phone: "020 7794 0555",
  },
]

const rotaActions = [
  {
    title: "Offer a shift swap",
    description: "Permanent staff action for reallocating an assigned shift.",
    icon: ArrowRightLeft,
  },
  {
    title: "Request leave",
    description: "Submit planned leave against the rota and staffing view.",
    icon: CalendarClock,
  },
  {
    title: "Update availability",
    description: "Let the rota team know when you cannot be allocated.",
    icon: Clock3,
  },
]

export default function WorkforcePage() {
  return (
    <WorkspaceDesktopShell currentNav="workforce" sectionLabel="Resources Workforce">
      <div className="px-2 py-2 lg:px-4 lg:py-4">
        <p className="mt-3 max-w-[780px] text-[15px] leading-7 text-[#9a9a9a]">
          Rota should be the permanent-staff surface. This is where the user sees their department allocation,
          upcoming rota, and actions like swaps, leave, and availability.
        </p>

        <WorkforceSectionNav current="overview" />

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.95fr)]">
          <section className="space-y-5">
            <div className="border-b border-[#2d2d2d] pb-5">
              <div className="flex items-center gap-2">
                <Users2 size={17} className="text-white" />
                <h2 className="text-[25px] tracking-[-0.04em] text-white">my rota and allocation</h2>
              </div>
              <p className="mt-3 max-w-[760px] text-[14px] leading-7 text-[#8f8f8f]">
                This page should answer: where am I working, who allocated me, and what can I change in my rota?
              </p>
            </div>

            <div className="overflow-hidden rounded-[12px] border border-[#2d2d2d] bg-[#161616]">
              {rotaItems.map((item) => (
                <div
                  key={`${item.day}-${item.area}`}
                  className="border-b border-[#252525] p-5 last:border-b-0 hover:bg-[#1d1d1d]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[22px] tracking-[-0.04em] text-white">{item.day.toLowerCase()}</h3>
                        <span className="rounded-full border border-[#2d2d2d] bg-[#202020] px-3 py-1.5 text-[12px] text-[#d0d0d0]">
                          {item.time}
                        </span>
                      </div>
                      <p className="mt-3 text-[17px] text-white">{item.area}</p>
                      <p className="mt-1 text-[14px] text-[#8f8f8f]">{item.specialty}</p>
                      <p className="mt-3 text-[14px] leading-7 text-[#b0b0b0]">{item.detail}</p>
                    </div>

                    <div className="min-w-[220px] border-l border-[#2d2d2d] pl-4">
                      <div className="flex items-center gap-2">
                        <MapPinned size={15} className="text-white" />
                        <p className="text-[13px] text-[#7f7f7f]">allocation contact</p>
                      </div>
                      <p className="mt-3 text-[15px] text-white">{item.contact}</p>
                      <div className="mt-2 flex items-center gap-2 text-[13px] text-[#8f8f8f]">
                        <Phone size={14} className="text-white" />
                        {item.phone}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[12px] border border-[#2d2d2d] bg-[#161616] p-5">
              <div className="flex items-center gap-2">
                <ArrowRightLeft size={17} className="text-white" />
                <h2 className="text-[22px] tracking-[-0.04em] text-white">rota actions</h2>
              </div>
              <div className="mt-4 space-y-3">
                {rotaActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.title}
                      className="flex w-full items-start gap-3 rounded-[12px] border border-[#2d2d2d] bg-[#1b1b1b] px-4 py-4 text-left transition-colors hover:border-[#3a3a3a] hover:bg-[#202020]"
                    >
                      <span className="mt-0.5 rounded-full border border-[#2d2d2d] bg-[#202020] p-2 text-white">
                        <Icon size={16} />
                      </span>
                      <span>
                        <span className="block text-[15px] text-white">{action.title.toLowerCase()}</span>
                        <span className="mt-1 block text-[13px] leading-6 text-[#8f8f8f]">{action.description}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </WorkspaceDesktopShell>
  )
}
