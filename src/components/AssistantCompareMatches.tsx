"use client"

interface MatchedProcedure {
  id: string
  name: string
  specialty: string
  setting: string
  sectionsCount: number
  fixedCount: number
  editableCount: number
  implantSystem?: string
  href: string
}

export default function AssistantCompareMatches({
  items,
  onPrompt,
}: {
  items: MatchedProcedure[]
  onPrompt: (prompt: string) => void
}) {
  if (items.length === 0) return null

  return (
    <section className="mt-3 grid gap-3 md:grid-cols-2">
      {items.slice(0, 2).map((item) => (
        <article
          key={item.id}
          className="rounded-[22px] border border-[#D8E3EE] bg-white p-4 shadow-[0_14px_34px_rgba(16,36,62,0.08)]"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B7B8C]">
            Matched procedure
          </p>
          <h3 className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-[#10243E]">
            {item.name}
          </h3>
          <p className="mt-1 text-[13px] text-[#526579]">
            {[item.setting, item.specialty, item.implantSystem].filter(Boolean).join(" · ")}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FBFF] px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#94A3B8]">Sections</p>
              <p className="mt-1 text-sm font-semibold text-[#10243E]">{item.sectionsCount}</p>
            </div>
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FBFF] px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#94A3B8]">Fixed</p>
              <p className="mt-1 text-sm font-semibold text-[#10243E]">{item.fixedCount}</p>
            </div>
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FBFF] px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#94A3B8]">Editable</p>
              <p className="mt-1 text-sm font-semibold text-[#10243E]">{item.editableCount}</p>
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => onPrompt(item.name)}
              className="rounded-full bg-[#10243E] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#183454]"
            >
              Open card
            </button>
          </div>
        </article>
      ))}
    </section>
  )
}
