"use client"

import {
  ArrowRightLeft,
  CalendarClock,
  Clock3,
  MapPinned,
  Phone,
  Users2,
} from "lucide-react"
import DesktopSectionWordmark from "@/components/DesktopSectionWordmark"
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
    <WorkspaceDesktopShell currentNav="workforce">
      <div className="px-5 py-4 lg:px-6 lg:py-5">
        <DesktopSectionWordmark label="Resources Workforce" />
        <p className="mt-3 max-w-[780px] text-[15px] leading-7 text-[#486579]">
          Rota should be the permanent-staff surface. This is where the user sees their department allocation,
          upcoming rota, and actions like swaps, leave, and availability.
        </p>

        <WorkforceSectionNav current="overview" />

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.95fr)]">
          <section className="space-y-5">
            <div className="rounded-[30px] border border-[#D6E7EE] bg-[linear-gradient(135deg,#FFFFFF_0%,#F5FCFE_100%)] p-6 shadow-[0_18px_46px_rgba(16,36,62,0.08)]">
              <div className="flex items-center gap-2">
                <Users2 size={17} className="text-[#1b86ae]" />
                <h2 className="text-[25px] tracking-[-0.04em] text-[#10243E]">My rota and allocation</h2>
              </div>
              <p className="mt-3 max-w-[760px] text-[14px] leading-7 text-[#61758B]">
                This page should answer: where am I working, who allocated me, and what can I change in my rota?
              </p>
            </div>

            <div className="space-y-3">
              {rotaItems.map((item) => (
                <div
                  key={`${item.day}-${item.area}`}
                  className="rounded-[26px] border border-[#D6E7EE] bg-white/92 p-5 shadow-[0_18px_46px_rgba(16,36,62,0.08)]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[22px] tracking-[-0.04em] text-[#10243E]">{item.day}</h3>
                        <span className="rounded-full bg-[#EEF8FF] px-3 py-1.5 text-[12px] text-[#1B86AE]">
                          {item.time}
                        </span>
                      </div>
                      <p className="mt-3 text-[17px] text-[#15364D]">{item.area}</p>
                      <p className="mt-1 text-[14px] text-[#61758B]">{item.specialty}</p>
                      <p className="mt-3 text-[14px] leading-7 text-[#486579]">{item.detail}</p>
                    </div>

                    <div className="min-w-[220px] rounded-[22px] border border-[#E8F0F4] bg-[#FBFDFF] p-4">
                      <div className="flex items-center gap-2">
                        <MapPinned size={15} className="text-[#1b86ae]" />
                        <p className="text-[13px] text-[#7A98AA]">Allocation contact</p>
                      </div>
                      <p className="mt-3 text-[15px] text-[#15364D]">{item.contact}</p>
                      <div className="mt-2 flex items-center gap-2 text-[13px] text-[#61758B]">
                        <Phone size={14} className="text-[#1b86ae]" />
                        {item.phone}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[30px] border border-[#D6E7EE] bg-white/92 p-5 shadow-[0_18px_46px_rgba(16,36,62,0.08)]">
              <div className="flex items-center gap-2">
                <ArrowRightLeft size={17} className="text-[#1b86ae]" />
                <h2 className="text-[22px] tracking-[-0.04em] text-[#10243E]">Rota actions</h2>
              </div>
              <div className="mt-4 space-y-3">
                {rotaActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.title}
                      className="flex w-full items-start gap-3 rounded-[20px] border border-[#E8F0F4] bg-[#FBFDFF] px-4 py-4 text-left"
                    >
                      <span className="mt-0.5 rounded-full bg-[#EEF8FF] p-2 text-[#1b86ae]">
                        <Icon size={16} />
                      </span>
                      <span>
                        <span className="block text-[15px] text-[#15364D]">{action.title}</span>
                        <span className="mt-1 block text-[13px] leading-6 text-[#61758B]">{action.description}</span>
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
