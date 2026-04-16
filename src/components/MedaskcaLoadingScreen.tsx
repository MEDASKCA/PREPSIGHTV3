"use client"

const BRAND_LETTERS = "MEDASKCA".split("")

export default function MedaskcaLoadingScreen({
  title,
  message,
}: {
  title?: string
  message: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-medaskca.png"
        alt="MEDASKCA"
        className="mb-6 h-16 w-16 rounded-full"
        style={{ animation: "medaskca-pulse 2s ease-in-out infinite" }}
      />

      <div className="mb-6 flex gap-1">
        {BRAND_LETTERS.map((letter, index) => (
          <span
            key={letter + index}
            className="text-2xl font-bold tracking-widest text-white"
            style={{ animation: `medaskca-pulse 2s ease-in-out ${index * 80}ms infinite` }}
          >
            {letter}
          </span>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-1.5 w-1.5 rounded-full bg-[#00B4D8]"
            style={{ animation: `dot-bounce 1.2s ease-in-out ${index * 200}ms infinite` }}
          />
        ))}
      </div>

      {title ? (
        <p className="mb-2 text-base font-semibold tracking-[0.18em] text-white uppercase text-center">
          {title}
        </p>
      ) : null}
      <p className="text-xs tracking-widest text-[#555] uppercase">{message}</p>
    </div>
  )
}
