"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowUp, House, Package, Plus, Sparkles, X } from "lucide-react"
import AssistantCompactCard from "@/components/AssistantCompactCard"
import AssistantCompareMatches from "@/components/AssistantCompareMatches"
import AssistantLauncherBlock from "@/components/AssistantLauncherBlock"
import AssistantResponseState from "@/components/AssistantResponseState"
import AssistantResponseText from "@/components/AssistantResponseText"
import AssistantWalkthroughBlock from "@/components/AssistantWalkthroughBlock"
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
import { getProfile } from "@/lib/profile"
import { USER_ROLE_LABEL } from "@/lib/types"

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

function AIIcon({ className = "h-[68px] w-[68px]" }: { className?: string }) {
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

function SearchlessBrand() {
  return (
    <div
      data-dev-trigger
      className="flex h-11 shrink-0 items-center gap-2 rounded-[14px] border border-[#D8E3EE] bg-[#F8FBFF] px-3"
    >
      <AIIcon className="h-[28px] w-[28px]" />
      <span className="text-sm font-semibold text-[#00B4D8]">PrepSight</span>
    </div>
  )
}

function ReplyCard({
  message,
  onAction,
  onPrompt,
  onFollow,
}: {
  message: ChatMessage
  onAction: (href: string) => void
  onPrompt: (value: string) => void
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
        <div className="max-w-[92%] px-1 py-2">
          <AssistantResponseState label={message.pendingLabel} detail={message.pendingDetail} className="text-[#5A7184]" />
        </div>
      ) : (
        <div
          className={`max-w-[92%] overflow-hidden rounded-[24px] border px-4 py-3 ${
            isAssistant
              ? "rounded-tl-md border-[#E2E8F0] bg-white text-[#10243E] shadow-[0_16px_30px_rgba(15,23,42,0.08)]"
              : "rounded-tr-md border-[#00B4D8] bg-[#00B4D8] text-white shadow-[0_12px_26px_rgba(0,180,216,0.24)]"
          }`}
        >
          <AssistantResponseText
            text={message.reply.text}
            animate={isAssistant}
            className="text-[13px] leading-6 text-[#10243E]"
            onProgress={onFollow}
            onComplete={() => setContentReady(true)}
          />
        

        {contentReady && message.reply.stats && message.reply.stats.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {message.reply.stats.map((stat) => (
              <div
                key={`${message.id}-${stat.label}`}
                className="rounded-2xl border border-[#D5E3EF] bg-[#F8FBFF] px-3 py-2"
              >
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#94A3B8]">
                  {stat.label}
                </p>
                <p className="mt-1 text-base font-semibold text-[#10243E]">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {contentReady && message.reply.table && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-[#D5E3EF] bg-white">
            {message.reply.table.title && (
              <div className="border-b border-[#D5E3EF] bg-[#F8FBFF] px-3 py-2">
                <p className="text-xs font-semibold text-[#10243E]">
                  {message.reply.table.title}
                </p>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="text-[#64748B]">
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
                          className="px-3 py-2 align-top text-[#10243E]"
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

export default function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const profile = useMemo(() => getProfile(), [])
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const messageSeed = useRef(0)
  const assistantTimerRef = useRef<number | null>(null)
  const [prompt, setPrompt] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [open, setOpen] = useState(false)

  const context = useMemo(
    () => buildAssistantContext(pathname, new URLSearchParams(searchParams.toString())),
    [pathname, searchParams],
  )

  useEffect(() => {
    const welcome = buildAssistantWelcome(context)
    setMessages([
      {
        id: `assistant-${++messageSeed.current}`,
        role: "assistant",
        reply: welcome,
      },
    ])
  }, [context])

  useEffect(() => {
    if (!scrollerRef.current) return
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight
  }, [messages])

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

  function followAssistantThread() {
    const thread = scrollerRef.current
    if (!thread) return
    thread.scrollTop = thread.scrollHeight
    const last = thread.lastElementChild as HTMLElement | null
    last?.scrollIntoView({ block: "end" })
  }

  const shortcuts = [
    { label: "Home", href: "/", icon: House },
    { label: "Catalogue", href: "/catalogue", icon: Package },
    { label: "New card", href: "/procedures/new", icon: Plus },
  ]

  return (
    <div className="relative flex h-full">
      <div className="flex h-full w-[128px] shrink-0 flex-col border-r border-[#E2E8F0] bg-[#FCFDFE] px-4 py-4 text-[#10243E] shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label="Open AI assistant"
          className="relative mb-5 flex h-[132px] w-full items-center justify-center rounded-[26px] border border-[#E2E8F0] bg-white shadow-[0_12px_26px_rgba(15,23,42,0.06)]"
        >
          <AIIcon className="h-[136px] w-[136px]" />
        </button>

        <div className="mt-1 flex w-full flex-col gap-3">
          {shortcuts.map((shortcut) => (
            <Link
              key={shortcut.label}
              href={shortcut.href}
              className="rounded-[20px] border border-[#E2E8F0] bg-white px-3 py-3 transition-colors hover:bg-[#F7FAFD]"
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border border-[#E2E8F0] bg-[#F8FBFF] text-[#5B7089]">
                  <shortcut.icon size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-left text-[12px] font-semibold text-[#34475A]">{shortcut.label}</p>
                  <p className="mt-1 text-left text-[11px] leading-4 text-[#7B8CA0]">
                    {shortcut.label === "Home"
                      ? "Workspace"
                      : shortcut.label === "Catalogue"
                        ? "Products"
                        : "Authoring"}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-auto w-full rounded-[24px] border border-[#E2E8F0] bg-white px-3 py-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#94A3B8]">Mode</p>
          <p className="mt-2 text-sm font-semibold text-[#34475A]">
            {profile ? USER_ROLE_LABEL[profile.role] ?? profile.role : "PrepSight"}
          </p>
        </div>
      </div>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close AI assistant overlay"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-[rgba(8,17,30,0.46)] backdrop-blur-[2px]"
          />

          <div className="fixed inset-[18px_18px_18px_160px] z-50 overflow-hidden rounded-[30px] border border-[#D8E3EE] bg-[#EEF3F8] text-[#10243E] shadow-[0_28px_80px_rgba(15,23,42,0.16)]">
            <div className="flex h-full flex-col">
              <div className="shrink-0 border-b border-[#D8E3EE] bg-[#E6ECF3]">
                <div className="flex items-center justify-between border-b border-[#D8E3EE] px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                    <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
                    <span className="h-3 w-3 rounded-full bg-[#28C840]" />
                  </div>
                  <div className="rounded-[14px] border border-[#D8E3EE] bg-white px-4 py-2 text-sm font-semibold text-[#10243E] shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
                    PrepSight Browser
                  </div>
                  <div className="w-[92px]" />
                </div>

                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[18px] border border-[#D8E3EE] bg-white px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <SearchlessBrand />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#10243E]">
                        {context.title}
                      </p>
                      <p className="truncate text-xs text-[#5B7089]">
                        Ask naturally. I can answer, show a table, generate a visual summary, or take you there.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close AI assistant"
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#D8E3EE] bg-white text-[#5B7089] transition-colors hover:bg-[#F8FBFF]"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-[520px_1fr] gap-0">
                <div className="border-r border-[#D8E3EE] bg-[#F7FAFD] p-6">
                  <div className="space-y-5">
                    <div className="rounded-[26px] border border-[#D8E3EE] bg-white p-6 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
                      <div className="flex items-start gap-4">
                        <div className="rounded-[20px] border border-[#D8E3EE] bg-[#F8FBFF] p-3">
                          <AIIcon className="h-[56px] w-[56px]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-[#94A3B8]">Current page</p>
                          <h2 className="mt-3 text-[32px] font-semibold tracking-[-0.04em] text-[#10243E]">
                            {context.title}
                          </h2>
                          <p className="mt-3 text-sm leading-7 text-[#5B7089]">{context.description}</p>
                        </div>
                      </div>
                    </div>

                    {profile && (
                      <div className="rounded-[26px] border border-[#D8E3EE] bg-white p-6 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[#94A3B8]">Session</p>
                        <p className="mt-3 text-sm font-semibold text-[#10243E]">
                          {USER_ROLE_LABEL[profile.role] ?? profile.role}
                        </p>
                        {profile.departments[0] && (
                          <p className="mt-2 text-sm text-[#5B7089]">{profile.departments[0]}</p>
                        )}
                      </div>
                    )}

                    <div className="rounded-[26px] border border-[#D8E3EE] bg-white p-6 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[#94A3B8]">Quick access</p>
                      <div className="mt-4 grid grid-cols-1 gap-4">
                        {shortcuts.map((shortcut) => (
                          <Link
                            key={shortcut.label}
                            href={shortcut.href}
                            className="block rounded-[22px] border border-[#E2E8F0] bg-[#FAFCFE] p-5 transition-colors hover:bg-white"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-[#D8E3EE] bg-white text-[#3F78A6]">
                                <shortcut.icon size={18} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-base font-semibold text-[#10243E]">{shortcut.label}</p>
                                <p className="mt-1 text-sm leading-6 text-[#5B7089]">
                                  {shortcut.label === "Home"
                                    ? "Return to the main workspace."
                                    : shortcut.label === "Catalogue"
                                      ? "Open the central product bank."
                                      : "Create or author a new card."}
                                </p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex min-h-0 flex-col bg-[#FDFEFF]">
                  <div className="shrink-0 border-b border-[#E2E8F0] bg-white px-8 py-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[#94A3B8]">Conversation</p>
                        <p className="mt-2 text-lg font-semibold text-[#10243E]">
                          Ask for answers, structured tables, navigation, or visual summaries
                        </p>
                      </div>
                      <div className="rounded-[16px] border border-[#E2E8F0] bg-[#FAFCFE] px-3 py-2 text-xs font-semibold text-[#5B7089]">
                        PrepSight assistant
                      </div>
                    </div>
                  </div>

                  <div ref={scrollerRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-8 py-8">
                    {messages.map((message) => (
                      <ReplyCard
                        key={message.id}
                        message={message}
                        onAction={(href) => {
                          setOpen(false)
                          router.push(href)
                        }}
                        onPrompt={handleSend}
                        onFollow={followAssistantThread}
                      />
                    ))}
                  </div>

                  <div className="shrink-0 border-t border-[#E2E8F0] bg-white px-8 pb-8 pt-5">
                    <div className="flex items-end gap-2 rounded-[24px] border border-[#D8E3EE] bg-[#FAFCFE] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                      <Sparkles size={16} className="mb-2 shrink-0 text-[#94A3B8]" />
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
                        className="max-h-32 min-h-[44px] flex-1 resize-none border-0 bg-transparent px-1 py-2 text-sm text-[#10243E] placeholder:text-[#94A3B8] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSend()}
                        aria-label="Send"
                        className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#10243E] text-white transition-transform hover:scale-[1.02]"
                      >
                        <ArrowUp size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
