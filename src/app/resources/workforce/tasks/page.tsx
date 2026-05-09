"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import RootEntry from "@/components/RootEntry"
import { CheckCircle2, Clock3, Layers3 } from "lucide-react"
import WorkforcePersistentHeader from "@/components/WorkforcePersistentHeader"
import WorkspaceDesktopShell from "@/components/WorkspaceDesktopShell"

const tasks = [
  {
    title: "Confirm cover for Friday swap",
    detail: "Two colleagues are available to take your Theatre 3 shift.",
    due: "Today",
  },
  {
    title: "Acknowledge tomorrow's brief",
    detail: "Case order changed for your morning allocation.",
    due: "Before 07:00",
  },
  {
    title: "Skills sign-off ready",
    detail: "Two competencies are ready for supervisor confirmation.",
    due: "This week",
  },
]

export default function WorkforceTasksPage() {
  const router = useRouter()
  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const mediaQuery = window.matchMedia("(min-width: 1024px)")
    const syncViewport = () => {
      const nextIsDesktop = mediaQuery.matches
      setIsDesktopViewport(nextIsDesktop)
      if (!nextIsDesktop) {
        router.replace("/resources")
      }
    }

    syncViewport()
    mediaQuery.addEventListener("change", syncViewport)
    return () => mediaQuery.removeEventListener("change", syncViewport)
  }, [router])

  if (isDesktopViewport === false) {
    return <RootEntry initialSurface="resources" />
  }

  return (
    <WorkspaceDesktopShell currentNav="workforce" sectionLabel="Resources Workforce">
      <div className="flex h-full min-h-0 flex-col px-5 py-4 lg:px-6 lg:py-5">
        <WorkforcePersistentHeader current="tasks" />

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          <p className="max-w-[760px] text-[15px] leading-7 text-[#486579]">
            Tasks should be short, actionable, and easy to clear. This is where the user should see what needs a
            response without hunting through shifts or messages.
          </p>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.95fr)]">
          <section className="rounded-[30px] border border-[#D6E7EE] bg-white/92 p-5 shadow-[0_18px_46px_rgba(16,36,62,0.08)]">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={17} className="text-[#1b86ae]" />
              <h2 className="text-[24px] tracking-[-0.04em] text-[#10243E]">Tasks for me</h2>
            </div>
            <div className="mt-4 space-y-3">
              {tasks.map((task) => (
                <div key={task.title} className="rounded-[22px] border border-[#E8F0F4] bg-[#FBFDFF] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[16px] leading-6 text-[#15364D]">{task.title}</p>
                    <span className="rounded-full bg-[#EEF8FF] px-2.5 py-1 text-[11px] font-medium text-[#1C78A0]">
                      {task.due}
                    </span>
                  </div>
                  <p className="mt-2 text-[13px] leading-7 text-[#61758B]">{task.detail}</p>
                  <div className="mt-4 flex gap-2">
                    <button className="rounded-full bg-[#0096C7] px-4 py-2 text-[13px] text-white shadow-[0_10px_24px_rgba(0,150,199,0.24)]">
                      Open
                    </button>
                    <button className="rounded-full border border-[#CFE4EC] bg-[#F6FBFD] px-4 py-2 text-[13px] text-[#1B86AE]">
                      Mark done
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-5">
            <section className="rounded-[30px] border border-[#D6E7EE] bg-white/92 p-5 shadow-[0_18px_46px_rgba(16,36,62,0.08)]">
              <div className="flex items-center gap-2">
                <Clock3 size={17} className="text-[#1b86ae]" />
                <h2 className="text-[22px] tracking-[-0.04em] text-[#10243E]">How this should feel</h2>
              </div>
              <div className="mt-4 space-y-3 text-[14px] leading-7 text-[#61758B]">
                <div className="rounded-[20px] border border-[#E8F0F4] bg-[#FBFDFF] p-4">
                  This should feel lighter than email and more direct than a dashboard.
                </div>
                <div className="rounded-[20px] border border-[#E8F0F4] bg-[#FBFDFF] p-4">
                  Tasks should usually be tied to my shift, my allocation, or my skills profile.
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-[#D6E7EE] bg-[linear-gradient(135deg,#FFFFFF_0%,#F5FCFE_100%)] p-5 shadow-[0_18px_46px_rgba(16,36,62,0.08)]">
              <div className="flex items-center gap-2">
                <Layers3 size={17} className="text-[#1b86ae]" />
                <h2 className="text-[22px] tracking-[-0.04em] text-[#10243E]">Direction</h2>
              </div>
              <p className="mt-3 text-[14px] leading-7 text-[#61758B]">
                Keep this page narrow in scope. It should not become another inbox. Only actions that clearly
                require the user's response belong here.
              </p>
            </section>
          </div>
          </div>
        </div>
      </div>
    </WorkspaceDesktopShell>
  )
}
