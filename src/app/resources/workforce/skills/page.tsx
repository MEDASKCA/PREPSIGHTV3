"use client"

import { GraduationCap, ShieldCheck, Sparkles } from "lucide-react"
import WorkforceSectionNav from "@/components/WorkforceSectionNav"
import WorkspaceDesktopShell from "@/components/WorkspaceDesktopShell"

const skills = [
  { label: "Trauma and orthopaedics", level: "independent", note: "Eligible for matched T&O shifts" },
  { label: "General surgery", level: "supervised", note: "Available with senior support" },
  { label: "Urology", level: "independent", note: "Can book listed shifts directly" },
  { label: "Endoscopy", level: "developing", note: "Shown when supervision is available" },
]

const prompts = [
  "Two competencies are ready for sign-off",
  "One passport item expires next month",
  "Three matched shifts depend on your current T&O status",
]

function pillTone(value: string) {
  switch (value) {
    case "independent":
      return "bg-[#ECFBF4] text-[#18794E]"
    case "supervised":
      return "bg-[#FFF8E7] text-[#9C6500]"
    case "developing":
      return "bg-[#EEF6FF] text-[#1C78A0]"
    default:
      return "bg-[#F3F7FA] text-[#5C7487]"
  }
}

export default function WorkforceSkillsPage() {
  return (
    <WorkspaceDesktopShell currentNav="workforce" sectionLabel="Resources Workforce">
      <div className="px-5 py-4 lg:px-6 lg:py-5">
        <p className="mt-3 max-w-[760px] text-[15px] leading-7 text-[#486579]">
          Skills should feel like a passport and eligibility view. It should be obvious what I am signed off
          to do and what kind of shifts should be surfaced to me.
        </p>

        <WorkforceSectionNav current="skills" />

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.95fr)]">
          <section className="rounded-[30px] border border-[#D6E7EE] bg-white/92 p-5 shadow-[0_18px_46px_rgba(16,36,62,0.08)]">
            <div className="flex items-center gap-2">
              <GraduationCap size={17} className="text-[#1b86ae]" />
              <h2 className="text-[24px] tracking-[-0.04em] text-[#10243E]">My skills passport</h2>
            </div>
            <div className="mt-4 space-y-3">
              {skills.map((skill) => (
                <div key={skill.label} className="rounded-[22px] border border-[#E8F0F4] bg-[#FBFDFF] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[16px] text-[#15364D]">{skill.label}</p>
                      <p className="mt-1 text-[13px] text-[#61758B]">{skill.note}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${pillTone(skill.level)}`}>
                      {skill.level}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-5">
            <section className="rounded-[30px] border border-[#D6E7EE] bg-white/92 p-5 shadow-[0_18px_46px_rgba(16,36,62,0.08)]">
              <div className="flex items-center gap-2">
                <ShieldCheck size={17} className="text-[#1b86ae]" />
                <h2 className="text-[22px] tracking-[-0.04em] text-[#10243E]">What this should drive</h2>
              </div>
              <div className="mt-4 space-y-3">
                {prompts.map((prompt) => (
                  <div key={prompt} className="rounded-[20px] border border-[#E8F0F4] bg-[#FBFDFF] p-4 text-[14px] leading-7 text-[#61758B]">
                    {prompt}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[30px] border border-[#D6E7EE] bg-[linear-gradient(135deg,#FFFFFF_0%,#F5FCFE_100%)] p-5 shadow-[0_18px_46px_rgba(16,36,62,0.08)]">
              <div className="flex items-center gap-2">
                <Sparkles size={17} className="text-[#1b86ae]" />
                <h2 className="text-[22px] tracking-[-0.04em] text-[#10243E]">Direction</h2>
              </div>
              <p className="mt-3 text-[14px] leading-7 text-[#61758B]">
                This page should explain eligibility, not overwhelm the user with admin wording. The connection
                between skills and available shifts should feel immediate.
              </p>
            </section>
          </div>
        </div>
      </div>
    </WorkspaceDesktopShell>
  )
}
