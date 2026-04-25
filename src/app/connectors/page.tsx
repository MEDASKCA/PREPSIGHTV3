"use client"

import DesktopSectionWordmark from "@/components/DesktopSectionWordmark"
import WorkspaceDesktopShell from "@/components/WorkspaceDesktopShell"

export default function ConnectorsPage() {
  return (
    <WorkspaceDesktopShell currentNav="connectors">
      <div className="px-5 py-4 lg:px-6 lg:py-5">
        <DesktopSectionWordmark label="Connectors" />
        <div className="mt-5 rounded-[28px] border border-[#D6E7EE] bg-white/88 p-6 shadow-[0_18px_46px_rgba(16,36,62,0.08)]">
          <p className="text-[15px] text-[#35516A]">
            Connectors is being prepared. This will be the place for external systems and integrations.
          </p>
        </div>
      </div>
    </WorkspaceDesktopShell>
  )
}
