"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type TextSegment = {
  text: string
  bold: boolean
}

function parseSegments(text: string): TextSegment[] {
  const parts = text.split(/(\*\*.*?\*\*)/g).filter((part) => part.length > 0)
  return parts.flatMap((part) => {
    const bold = part.startsWith("**") && part.endsWith("**") && part.length >= 4
    const content = bold ? part.slice(2, -2) : part
    return content.split(/(\s+)/).filter((piece) => piece.length > 0).map((piece) => ({
      text: piece,
      bold,
    }))
  })
}

export default function AssistantResponseText({
  text,
  animate = false,
  className = "",
  onComplete,
  onProgress,
}: {
  text: string
  animate?: boolean
  className?: string
  onComplete?: () => void
  onProgress?: () => void
}) {
  const segments = useMemo(() => parseSegments(text), [text])
  const [visibleCount, setVisibleCount] = useState(animate ? 0 : segments.length)
  const onCompleteRef = useRef(onComplete)
  const onProgressRef = useRef(onProgress)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    onProgressRef.current = onProgress
  }, [onProgress])

  useEffect(() => {
    if (!animate) {
      setVisibleCount(segments.length)
      onProgressRef.current?.()
      onCompleteRef.current?.()
      return
    }

    setVisibleCount(0)
    let cancelled = false

    const tick = (index: number) => {
      if (cancelled) return
      setVisibleCount(index)
      onProgressRef.current?.()
      if (index >= segments.length) {
        onCompleteRef.current?.()
        return
      }

      const next = segments[index]?.text ?? ""
      const delay = /^\s+$/.test(next) ? 0 : next.length > 8 ? 58 : 40
      window.setTimeout(() => tick(index + 1), delay)
    }

    tick(1)

    return () => {
      cancelled = true
    }
  }, [animate, segments])

  return (
    <p className={className}>
      {segments.slice(0, visibleCount).map((segment, index) => (
        segment.bold ? (
          <strong key={`${index}-${segment.text}`} className="font-semibold text-current">
            {segment.text}
          </strong>
        ) : (
          <span key={`${index}-${segment.text}`}>{segment.text}</span>
        )
      ))}
      {animate && visibleCount < segments.length ? (
        <span className="ml-0.5 inline-block h-[1.05em] w-[0.12em] translate-y-[0.14em] rounded-full bg-current/40 align-baseline animate-pulse" />
      ) : null}
    </p>
  )
}
