"use client"

import WorkspaceDesktopShell from "@/components/WorkspaceDesktopShell"

const supplyRows = [
  ["core packs", "stable day-of-case quantities and reorder signals"],
  ["consumables", "single-use items tied to procedure demand and expiry risk"],
  ["back orders", "exceptions that need substitution or escalation"],
]

export default function SuppliesPage() {
  return (
    <WorkspaceDesktopShell currentNav="supplies" sectionLabel="Resources Supplies">
      <div className="space-y-5 px-2 py-2 lg:px-4 lg:py-4">
        <section>
          <h1 className="text-[32px] tracking-[-0.04em] text-white">supplies</h1>
          <p className="mt-2 max-w-[760px] text-[15px] leading-7 text-[#9a9a9a]">
            Supplies should focus on what is short, what is stable, and what will block cases.
          </p>
        </section>

        <section className="overflow-hidden rounded-[12px] border border-[#2d2d2d] bg-[#161616]">
          {supplyRows.map(([label, detail]) => (
            <div key={label} className="border-b border-[#252525] px-4 py-4 last:border-b-0 hover:bg-[#1d1d1d]">
              <p className="text-[15px] text-white">{label}</p>
              <p className="mt-1 text-[14px] text-[#8f8f8f]">{detail}</p>
            </div>
          ))}
        </section>
      </div>
    </WorkspaceDesktopShell>
  )
}
