import type { AssistantCarryContext, AssistantContext, AssistantDecisionTrace } from "./assistant-contracts"

type AssistantDebugEvent = {
  prompt: string
  context: {
    pageKind: AssistantContext["pageKind"]
    setting?: string
    specialty?: string
  }
  carry?: AssistantCarryContext
  trace: AssistantDecisionTrace
}

const DEBUG_EVENT_NAME = "prepsight:assistant-trace"

export function emitAssistantDebugEvent(event: AssistantDebugEvent): void {
  if (typeof window === "undefined") return

  window.dispatchEvent(
    new CustomEvent<AssistantDebugEvent>(DEBUG_EVENT_NAME, {
      detail: event,
    }),
  )

  if (process.env.NODE_ENV !== "production") {
    console.debug("[PrepSight Assistant Trace]", event)
  }
}

export function getAssistantDebugEventName(): string {
  return DEBUG_EVENT_NAME
}
