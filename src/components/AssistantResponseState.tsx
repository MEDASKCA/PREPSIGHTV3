"use client"

export default function AssistantResponseState({
  label,
  detail,
  className = "",
}: {
  label: string
  detail?: string
  className?: string
}) {
  return (
    <div className={`inline-flex max-w-[40rem] items-center gap-4 text-[16px] ${className}`} title={detail}>
      <span className="relative inline-flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/bounce.gif"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-contain"
        />
      </span>
      <span className="min-w-0 bg-[linear-gradient(90deg,rgba(0,180,216,0.62)_0%,rgba(0,180,216,0.96)_26%,rgba(210,249,255,1)_50%,rgba(0,180,216,0.96)_74%,rgba(0,180,216,0.62)_100%)] bg-[length:220%_100%] bg-clip-text text-[16px] font-medium tracking-[0.01em] text-transparent drop-shadow-[0_0_16px_rgba(0,180,216,0.26)] animate-[assistantTextFlow_2.2s_ease-in-out_infinite]">
        {label}
      </span>
    </div>
  )
}
