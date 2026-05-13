"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowUp, Paperclip, Sparkles, X } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import AssistantCompactCard from "./AssistantCompactCard"
import AssistantCompareMatches from "./AssistantCompareMatches"
import AssistantLauncherBlock from "./AssistantLauncherBlock"
import AssistantResponseState from "./AssistantResponseState"
import AssistantResponseText from "./AssistantResponseText"
import AssistantWalkthroughBlock from "./AssistantWalkthroughBlock"
import ProfileButton from "./ProfileButton"
import {
  buildAssistantContext,
  buildAssistantDecisionTrace,
  buildAssistantPendingState,
  buildAssistantReply,
  buildAssistantWelcome,
} from "@/lib/assistant"
import type { AssistantCarryContext, AssistantReply } from "@/lib/assistant-contracts"
import { getActionPrompt, getTableRowPrompt } from "@/lib/assistant-chat"
import { emitAssistantDebugEvent } from "@/lib/assistant-observability"

interface ChatMessage {
  id: string
  role: "assistant" | "user"
  reply: AssistantReply
  pendingLabel?: string
  pendingDetail?: string
}

function extractProcedureIdFromHref(href: string | undefined): string | undefined {
  if (!href) return undefined
  const match = href.match(/\/procedures\/([^/?#]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : undefined
}

function deriveCarryContext(messages: ChatMessage[]): AssistantCarryContext | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (!message || message.role !== "assistant") continue

    const compactCardHref = message.reply.compactCard?.href
    const compactProcedureId = extractProcedureIdFromHref(compactCardHref)
    if (compactProcedureId || message.reply.compactCard?.title) {
      return {
        procedureId: compactProcedureId,
        procedureName: message.reply.compactCard?.title,
      }
    }

    const firstMatch = message.reply.matchedProcedures?.[0]
    if (firstMatch) {
      return {
        procedureId: firstMatch.id,
        procedureName: firstMatch.name,
        specialty: firstMatch.specialty,
      }
    }

    if (message.reply.launcher?.title === "Specialties") {
      return {
        browseLabel: "Specialties",
      }
    }

    if (message.reply.entityDefinition) {
      return {
        entityLabel: message.reply.entityDefinition.label,
        entityKind: message.reply.entityDefinition.kind,
        entityDescription: message.reply.entityDefinition.description,
      }
    }
  }

  return undefined
}

function AIIcon({ className = "h-[92px] w-[92px]" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/ps-mark.png"
      alt="P.S."
      aria-hidden="true"
      className={`${className} object-contain [animation:aiIconSurge_1.8s_ease-in-out_infinite]`}
    />
  )
}

function AssistantBubble({
  message,
  onAction,
  onPrompt,
  onFollow,
}: {
  message: ChatMessage
  onAction: (href: string) => void
  onPrompt: (prompt: string) => void
  onFollow?: () => void
}) {
  const isAssistant = message.role === "assistant"
  const [contentReady, setContentReady] = useState(!isAssistant || !message.reply.text?.trim())

  useEffect(() => {
    setContentReady(!isAssistant || !message.reply.text?.trim())
  }, [isAssistant, message.id, message.pendingLabel, message.reply.text])

  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      {isAssistant && message.pendingLabel ? (
        <div className="max-w-[88%] px-1 py-2">
          <AssistantResponseState label={message.pendingLabel} detail={message.pendingDetail} className="text-[#5A7184]" />
        </div>
      ) : (
        <div
          className={`max-w-[88%] overflow-hidden rounded-[24px] border px-4 py-3 shadow-sm ${
            isAssistant
              ? "rounded-tl-md border-[#D7E6F4] bg-white text-[#1E293B]"
              : "rounded-tr-md border-[#00B4D8] bg-[#00B4D8] text-white shadow-[0_12px_26px_rgba(0,180,216,0.24)]"
          }`}
        >
          <AssistantResponseText
            text={message.reply.text}
            animate={isAssistant}
            className="text-[14px] leading-6"
            onProgress={onFollow}
            onComplete={() => setContentReady(true)}
          />
        

        {contentReady && message.reply.stats && message.reply.stats.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {message.reply.stats.map((stat) => (
              <div
                key={`${message.id}-${stat.label}`}
                className="rounded-2xl border border-[#E2E8F0] bg-[#F8FBFF] px-3 py-2"
              >
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#94A3B8]">
                  {stat.label}
                </p>
                <p className="mt-1 text-base font-semibold text-[#0F172A]">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {contentReady && message.reply.table && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-[#D7E6F4] bg-[#F8FBFF]">
            {message.reply.table.title && (
              <div className="border-b border-[#D7E6F4] bg-white px-3 py-2">
                <p className="text-xs font-semibold text-[#0F172A]">
                  {message.reply.table.title}
                </p>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-white text-[#64748B]">
                  <tr>
                    {message.reply.table.columns.map((column) => (
                      <th key={`${message.id}-${column}`} className="px-3 py-2 font-medium">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {message.reply.table.rows.map((row, rowIndex) => (
                    <tr key={`${message.id}-row-${rowIndex}`} className="border-t border-[#E2E8F0]">
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`${message.id}-${rowIndex}-${cellIndex}`}
                          className="px-3 py-2 align-top text-[#0F172A]"
                        >
                          {cellIndex === 0 && message.reply.table?.rowHrefs?.[rowIndex] ? (
                            <button
                              type="button"
                              onClick={() => onPrompt(getTableRowPrompt(row))}
                              className="text-left font-medium text-[#0F172A] underline decoration-[#93C5FD] underline-offset-2 hover:text-[#0369A1]"
                            >
                              {cell}
                            </button>
                          ) : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {contentReady && message.reply.compactCard && (
          <AssistantCompactCard
            title={message.reply.compactCard.title}
            meta={message.reply.compactCard.meta}
            summary={message.reply.compactCard.summary}
            checklist={message.reply.compactCard.checklist}
            href={message.reply.compactCard.href}
            onPrompt={onPrompt}
          />
        )}

        {contentReady && message.reply.matchedProcedures && message.reply.matchedProcedures.length > 0 && (
          <AssistantCompareMatches
            items={message.reply.matchedProcedures}
            onPrompt={onPrompt}
          />
        )}

        {contentReady && message.reply.launcher && message.reply.launcher.items.length > 0 && (
          <AssistantLauncherBlock
            title={message.reply.launcher.title}
            items={message.reply.launcher.items}
            onPrompt={onPrompt}
          />
        )}

        {contentReady && message.reply.walkthroughs && message.reply.walkthroughs.items.length > 0 && (
          <AssistantWalkthroughBlock
            title={message.reply.walkthroughs.title}
            items={message.reply.walkthroughs.items}
          />
        )}

        {contentReady && message.reply.actions && message.reply.actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.reply.actions.map((action) => (
              <button
                key={`${message.id}-${action.label}-${action.href}`}
                type="button"
                onClick={() => onPrompt(getActionPrompt(action, message.reply))}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                  action.tone === "primary"
                    ? "border border-[#8ADFF0] bg-[#AEEAF7] text-[#10243E] hover:bg-[#9BE4F4]"
                    : "border border-[#8ADFF0] bg-[#AEEAF7] text-[#24506A] hover:bg-[#9BE4F4]"
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {contentReady && message.reply.chips && message.reply.chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.reply.chips.map((chip) => (
              <button
                key={`${message.id}-${chip}`}
                type="button"
                onClick={() => onPrompt(chip)}
                className="rounded-full border border-[#8ADFF0] bg-[#AEEAF7] px-3 py-2 text-[11px] font-medium text-[#24506A] hover:bg-[#9BE4F4]"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
        </div>
      )}
    </div>
  )
}

export default function MobileDrawer() {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const messageSeed = useRef(0)
  const assistantTimerRef = useRef<number | null>(null)

  const context = useMemo(
    () => buildAssistantContext(pathname, new URLSearchParams(searchParams.toString())),
    [pathname, searchParams],
  )

  useEffect(() => {
    if (!open) return
    const welcome = buildAssistantWelcome(context)
    setMessages([
      {
        id: `assistant-${++messageSeed.current}`,
        role: "assistant",
        reply: welcome,
      },
    ])
  }, [context, open])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  useEffect(() => {
    if (!open || !scrollerRef.current) return
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight
  }, [messages, open])

  useEffect(() => {
    return () => {
      if (assistantTimerRef.current !== null) {
        window.clearTimeout(assistantTimerRef.current)
      }
    }
  }, [])

  function handleSend(nextPrompt?: string) {
    const value = (nextPrompt ?? prompt).trim()
    if (!value) return
    const carry = deriveCarryContext(messages)
    setPrompt("")

    if (assistantTimerRef.current !== null) {
      window.clearTimeout(assistantTimerRef.current)
    }

    const userId = `user-${++messageSeed.current}`
    const assistantId = `assistant-${++messageSeed.current}`
    const pending = buildAssistantPendingState(context, value, carry)

    setMessages((current) => [
      ...current,
      {
        id: userId,
        role: "user",
        reply: { text: value },
      },
      {
        id: assistantId,
        role: "assistant",
        reply: { text: "" },
        pendingLabel: pending.label,
        pendingDetail: pending.detail,
      },
    ])

    assistantTimerRef.current = window.setTimeout(() => {
      const reply = buildAssistantReply(context, value, carry)
      const trace = buildAssistantDecisionTrace(context, value, carry)
      const debugSetting =
        typeof (context as { setting?: unknown }).setting === "string"
          ? (context as { setting?: string }).setting
          : undefined
      const debugSpecialty =
        typeof (context as { specialty?: unknown }).specialty === "string"
          ? (context as { specialty?: string }).specialty
          : undefined
      emitAssistantDebugEvent({
        prompt: value,
        context: {
          pageKind: context.pageKind,
          setting: debugSetting,
          specialty: debugSpecialty,
        },
        carry,
        trace,
      })
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? { ...message, reply, pendingLabel: undefined }
            : message,
        ),
      )
      assistantTimerRef.current = null
    }, pending.delay)
  }

  function handleAction(href: string) {
    setOpen(false)
    router.push(href)
  }

  function followAssistantThread() {
    const thread = scrollerRef.current
    if (!thread) return
    thread.scrollTop = thread.scrollHeight
    const last = thread.lastElementChild as HTMLElement | null
    last?.scrollIntoView({ block: "end" })
  }

  return (
    <>
      <div className="sticky top-0 z-40 grid grid-cols-3 items-center overflow-visible border-b border-[#D5DCE3] bg-white px-4 py-0.5 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI assistant"
          className="relative -my-6 -ml-3 flex h-[102px] w-[102px] items-center justify-center transition-transform active:scale-95"
        >
          <AIIcon className="h-[108px] w-[108px]" />
        </button>

        <Link href="/" data-dev-trigger className="flex justify-center">
          <span className="text-base font-bold text-[#00B4D8]">PrepSight</span>
        </Link>

        <div className="flex justify-end">
          <ProfileButton />
        </div>
      </div>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close AI assistant overlay"
        />
      )}

      <div
        className={`fixed left-0 top-0 z-50 flex h-[100dvh] w-[min(94vw,390px)] flex-col overflow-hidden border-r border-white/20 bg-[#EEF5FB] shadow-[0_20px_60px_rgba(15,23,42,0.28)] transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-[102%]"
        }`}
      >
        <div className="relative overflow-hidden border-b border-[#D5E3EF] bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.2),_transparent_42%),linear-gradient(180deg,#0F172A_0%,#12263A_58%,#17324A_100%)] px-4 pb-4 pt-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AIIcon className="mt-[-8px] h-[68px] w-[68px] shrink-0" />
              <div className="pt-1">
                <p className="text-xs uppercase tracking-[0.24em] text-white">Assistant</p>
                <p className="mt-2 max-w-[220px] text-sm leading-6 text-white">
                  {context.title}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close AI assistant"
              className="mt-1 flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-3 rounded-[24px] border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white">
              <Sparkles size={12} />
              Context aware
            </div>
            <p className="mt-2 text-sm leading-6 text-white">
              {context.description}
            </p>
          </div>
        </div>

        <div ref={scrollerRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.map((message) => (
            <AssistantBubble
              key={message.id}
              message={message}
              onAction={handleAction}
              onPrompt={handleSend}
              onFollow={followAssistantThread}
            />
          ))}
        </div>

        <div className="border-t border-[#D5E3EF] bg-white/90 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pt-3 backdrop-blur-xl">
          <div className="flex items-end gap-2 rounded-[26px] border border-[#D5E3EF] bg-[#F8FBFF] px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <button
              type="button"
              aria-label="Attach"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[#64748B]"
            >
              <Paperclip size={17} />
            </button>

            <textarea
              rows={1}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ask naturally. I can answer, show a table, or take you there."
              className="max-h-28 min-h-[38px] flex-1 resize-none border-0 bg-transparent px-1 py-1.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none"
            />

            <button
              type="button"
              onClick={() => handleSend()}
              aria-label="Send"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#00B4D8] text-white transition-colors hover:bg-[#12C4E7]"
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
