"use client"

import WorkspaceDesktopShell from "@/components/WorkspaceDesktopShell"

const equipmentRows = [
  ["anaesthesia machines", "availability, service dates, and room assignment"],
  ["imaging and power", "c-arms, diathermy, towers, and battery readiness"],
  ["loan and reserve", "what can move, what is fixed, and what needs sign-off"],
]

export default function EquipmentPage() {
  return (
    <WorkspaceDesktopShell currentNav="equipment" sectionLabel="Resources Equipment">
      <div className="space-y-5 px-2 py-2 lg:px-4 lg:py-4">
        <section>
          <h1 className="text-[32px] tracking-[-0.04em] text-white">equipment</h1>
          <p className="mt-2 max-w-[760px] text-[15px] leading-7 text-[#9a9a9a]">
            Track room-critical devices without decorative panels or wasted white space.
          </p>
        </section>

        <section className="overflow-hidden rounded-[12px] border border-[#2d2d2d] bg-[#161616]">
          {equipmentRows.map(([label, detail]) => (
            <div key={label} className="flex items-start justify-between gap-4 border-b border-[#252525] px-4 py-4 last:border-b-0 hover:bg-[#1d1d1d]">
              <div>
                <p className="text-[15px] text-white">{label}</p>
                <p className="mt-1 text-[14px] text-[#8f8f8f]">{detail}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </WorkspaceDesktopShell>
  )
}
