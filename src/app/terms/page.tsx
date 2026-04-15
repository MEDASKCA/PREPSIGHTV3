export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F4F7FA] px-6 py-10 text-[#10243E]">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-3xl font-bold">Terms of Use</h1>
        <div className="space-y-4 text-sm leading-7 text-[#0F4C5C] md:text-base">
          <p>
            PrepSight is intended to support procedural preparation and internal reference workflows. It does not
            replace local policy, approved protocols, or professional clinical judgement.
          </p>
          <p>
            You are responsible for ensuring the information you provide for your account is accurate and that your
            use of the platform complies with your organisation&apos;s policies and applicable professional standards.
          </p>
          <p>
            Accounts using inaccurate, misleading, or impersonated identity details may be restricted, corrected, or
            deleted.
          </p>
          <p>
            Access to organisation-specific workspaces may be approved, limited, or removed by the relevant
            organisation or platform administrators.
          </p>
        </div>
      </div>
    </main>
  )
}
