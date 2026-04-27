"use client"

import WorkspaceDesktopShell from "@/components/WorkspaceDesktopShell"

export default function ConnectorsPage() {
  return (
    <WorkspaceDesktopShell currentNav="connectors" sectionLabel="Connectors">
      <div className="px-5 py-4 lg:px-6 lg:py-5">
        <div className="mt-0 rounded-[28px] border border-[#D6E7EE] bg-white/88 p-6 shadow-[0_18px_46px_rgba(16,36,62,0.08)]">
          <p className="text-[15px] text-[#35516A]">
            Connectors is being prepared. This will be the place for external systems and integrations.
          </p>
        </div>
      </div>
    </WorkspaceDesktopShell>
  )
}
