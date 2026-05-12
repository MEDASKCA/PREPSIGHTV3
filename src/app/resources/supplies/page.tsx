"use client"

import RootEntry from "@/components/RootEntry"
import WorkspaceDesktopShell from "@/components/WorkspaceDesktopShell"

const supplyRows = [
  ["core packs", "stable day-of-case quantities and reorder signals"],
  ["consumables", "single-use items tied to procedure demand and expiry risk"],
  ["back orders", "exceptions that need substitution or escalation"],
]

export default function SuppliesPage() {
  return (
    <>
      <div className="lg:hidden">
        <RootEntry initialSurface="resources" />
      </div>
      <div className="hidden lg:block">
        <WorkspaceDesktopShell currentNav="supplies">
          <div className="flex h-full min-h-0 flex-col gap-5 px-2 py-2 lg:px-4 lg:py-4">
            <section>
              <h1 className="hidden text-[21px] font-medium tracking-[-0.03em] text-white lg:block">Supplies</h1>
              <p className="mt-2 max-w-[760px] text-[15px] leading-7 text-white">
                Supplies should focus on what is short, what is stable, and what will block cases.
              </p>
            </section>

            <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-black bg-[#161616]">
              <div className="min-h-0 flex-1 overflow-y-auto">
                {supplyRows.map(([label, detail]) => (
                  <div key={label} className="border-b border-black px-4 py-4 last:border-b-0 hover:bg-[#1d1d1d]">
                    <p className="text-[15px] text-white">{label}</p>
                    <p className="mt-1 text-[14px] text-white">{detail}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-black bg-black px-4 py-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] leading-none text-white">
                  <span className="text-white/55">Key</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#34d399]" />Stock</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#fbbf24]" />Low</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#38bdf8]" />Ordered</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#fb7185]" />Out</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#c084fc]" />Recall</span>
                </div>
              </div>
            </section>
          </div>
        </WorkspaceDesktopShell>
      </div>
    </>
  )
}
