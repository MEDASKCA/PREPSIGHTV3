"use client"

export default function DesktopSectionWordmark({ label }: { label: string }) {
  return (
    <span
      className="block text-[32px] leading-none tracking-[-0.05em] text-[#1b86ae]"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontWeight: 500 }}
    >
      {label}
    </span>
  )
}
