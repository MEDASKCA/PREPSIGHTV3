"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, CircleAlert, X } from "lucide-react"
import {
  canModerateReviews,
  getFlaggedQueue,
  getModerationQueue,
  getReviewActor,
  moderateProposal,
  subscribeToSystemMappingReviews,
  type ModerationQueueItem,
} from "@/lib/system-mapping-review"
import { getProfile } from "@/lib/profile"

type QueueTab = "pending" | "flagged" | "approved" | "rejected"

export default function ReviewModerationPage() {
  const [tab, setTab] = useState<QueueTab>("pending")
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({})
  const [profileReady, setProfileReady] = useState(false)
  const [canModerate, setCanModerate] = useState(false)
  const [pending, setPending] = useState<ModerationQueueItem[]>([])
  const [approved, setApproved] = useState<ModerationQueueItem[]>([])
  const [rejected, setRejected] = useState<ModerationQueueItem[]>([])
  const [flagged, setFlagged] = useState<ReturnType<typeof getFlaggedQueue>>([])

  useEffect(() => {
    function refresh() {
      const profile = getProfile()
      setCanModerate(canModerateReviews(profile))
      setProfileReady(true)
      setPending(getModerationQueue("pending"))
      setApproved(getModerationQueue("approved"))
      setRejected(getModerationQueue("rejected"))
      setFlagged(getFlaggedQueue())
    }

    refresh()
    return subscribeToSystemMappingReviews(refresh)
  }, [])

  const reviewer = useMemo(() => getReviewActor(getProfile()), [])

  function actOnProposal(mappingId: string, proposalId: string, decision: "approved" | "rejected") {
    moderateProposal({
      mapping_id: mappingId,
      proposal_id: proposalId,
      decision,
      review_note: reviewNote[proposalId]?.trim(),
      actor: reviewer,
    })
  }

  if (!profileReady) return null

  if (!canModerate) {
    return (
      <main className="min-h-screen bg-[#F4F8FB] px-4 py-8 text-[#10243E]">
        <div className="mx-auto max-w-2xl rounded-[24px] border border-[#D8E3EE] bg-white p-6 text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#0891B2]">Data Review</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.04em]">Moderation queue</h1>
          <p className="mt-3 text-[15px] text-[#64748B]">Moderator or admin access is required for this workspace.</p>
          <Link href="/review" className="mt-5 inline-flex rounded-full bg-[#06B6D4] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white">
            Back to review
          </Link>
        </div>
      </main>
    )
  }

  const tabs = [
    { id: "pending" as const, label: "Pending suggestions", count: pending.length },
    { id: "flagged" as const, label: "Flagged records", count: flagged.length },
    { id: "approved" as const, label: "Recently approved", count: approved.length },
    { id: "rejected" as const, label: "Recently rejected", count: rejected.length },
  ]

  return (
    <main className="min-h-screen bg-[#F4F8FB] text-[#10243E]">
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-[calc(env(safe-area-inset-top)+1.5rem)] lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/review" className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-[#D8E3EE] bg-white">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0891B2]">Data Review</p>
              <h1 className="text-[28px] font-semibold tracking-[-0.04em]">Moderation queue</h1>
            </div>
          </div>
          <div className="rounded-full border border-[#D8E3EE] bg-white px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#475569]">
            Reviewer {reviewer}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-full px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] ${
                tab === item.id ? "bg-[#06B6D4] text-white" : "border border-[#D8E3EE] bg-white text-[#475569]"
              }`}
            >
              {item.label} {item.count}
            </button>
          ))}
        </div>

        {tab === "pending" ? (
          <div className="mt-5 space-y-3">
            {pending.length > 0 ? pending.map((item) => (
              <div key={item.proposal.id} className="rounded-[24px] border border-[#D8E3EE] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#0891B2]">{item.proposal.section}</p>
                    <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.03em]">{item.record_title}</h2>
                    <p className="mt-1 text-[14px] text-[#64748B]">{item.supplier_name}</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                    Pending
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-[14px] text-[#334155] lg:grid-cols-2">
                  <div className="rounded-[18px] border border-[#E2E8F0] bg-[#F8FBFD] p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">Current accepted value</p>
                    <div className="mt-2 space-y-1.5">
                      {item.proposal.current_value_snapshot.items.length > 0 ? item.proposal.current_value_snapshot.items.map((entry) => (
                        <p key={entry.label}><span className="font-semibold text-[#10243E]">{entry.label}:</span> {entry.value}</p>
                      )) : <p>{item.proposal.current_value_snapshot.empty_state || "No accepted data held"}</p>}
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-[#E2E8F0] bg-white p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">Proposed value</p>
                    <div className="mt-2 space-y-1.5">
                      {item.proposal.proposed_value?.items?.length ? item.proposal.proposed_value.items.map((entry) => (
                        <p key={entry.label}><span className="font-semibold text-[#10243E]">{entry.label}:</span> {entry.value}</p>
                      )) : <p>{item.proposal.action_type === "flag_only" ? "Flag only. No replacement proposed." : "No proposed value supplied."}</p>}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#64748B]">
                  <span>Suggestion type: {item.proposal.action_type.replaceAll("_", " ")}</span>
                  <span>Issue: {(item.proposal.issue_type ?? "not specified").replaceAll("_", " ")}</span>
                  <span>Submitted by: {item.proposal.submitted_by}</span>
                </div>

                {item.proposal.note ? (
                  <p className="mt-3 rounded-[16px] border border-[#E2E8F0] bg-[#F8FBFD] px-3 py-2 text-[14px] text-[#475569]">
                    {item.proposal.note}
                  </p>
                ) : null}

                <label className="mt-4 block">
                  <span className="text-[13px] font-semibold text-[#475569]">Moderator note (optional)</span>
                  <textarea
                    value={reviewNote[item.proposal.id] ?? ""}
                    onChange={(event) => setReviewNote((current) => ({ ...current, [item.proposal.id]: event.target.value }))}
                    rows={2}
                    className="mt-1 w-full rounded-[16px] border border-[#D8E3EE] bg-white px-3 py-2.5 text-[15px] text-[#334155] outline-none"
                  />
                </label>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => actOnProposal(item.mapping_id, item.proposal.id, "approved")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white"
                  >
                    <Check size={13} />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => actOnProposal(item.mapping_id, item.proposal.id, "rejected")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white"
                  >
                    <X size={13} />
                    Reject
                  </button>
                </div>
              </div>
            )) : (
              <p className="rounded-[24px] border border-[#D8E3EE] bg-white p-4 text-[14px] text-[#64748B]">No pending suggestions.</p>
            )}
          </div>
        ) : null}

        {tab === "flagged" ? (
          <div className="mt-5 space-y-3">
            {flagged.length > 0 ? flagged.map((item) => (
              <div key={`${item.mapping_id}-${item.section}`} className="rounded-[24px] border border-[#F3D1D1] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-rose-600">{item.section}</p>
                    <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.03em]">{item.record_title}</h2>
                    <p className="mt-1 text-[14px] text-[#64748B]">{item.supplier_name}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700">
                    <CircleAlert size={12} />
                    Needs review
                  </span>
                </div>
                <div className="mt-3 text-[14px] text-[#334155]">
                  <p><span className="font-semibold text-[#10243E]">Reviewer:</span> {item.latest_validation.user}</p>
                  <p><span className="font-semibold text-[#10243E]">Issue:</span> {(item.latest_validation.issue_type ?? "not specified").replaceAll("_", " ")}</p>
                  {item.latest_validation.note ? <p><span className="font-semibold text-[#10243E]">Note:</span> {item.latest_validation.note}</p> : null}
                </div>
              </div>
            )) : (
              <p className="rounded-[24px] border border-[#D8E3EE] bg-white p-4 text-[14px] text-[#64748B]">No flagged records.</p>
            )}
          </div>
        ) : null}

        {tab === "approved" ? (
          <QueueHistoryList items={approved} state="approved" />
        ) : null}

        {tab === "rejected" ? (
          <QueueHistoryList items={rejected} state="rejected" />
        ) : null}
      </div>
    </main>
  )
}

function QueueHistoryList({
  items,
  state,
}: {
  items: ModerationQueueItem[]
  state: "approved" | "rejected"
}) {
  return (
    <div className="mt-5 space-y-3">
      {items.length > 0 ? items.map((item) => (
        <div key={item.proposal.id} className="rounded-[24px] border border-[#D8E3EE] bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#0891B2]">{item.proposal.section}</p>
              <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.03em]">{item.record_title}</h2>
              <p className="mt-1 text-[14px] text-[#64748B]">{item.supplier_name}</p>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${state === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {state === "approved" ? <Check size={12} /> : <X size={12} />}
              {state}
            </span>
          </div>
          <div className="mt-3 text-[14px] text-[#334155]">
            <p><span className="font-semibold text-[#10243E]">Suggestion type:</span> {item.proposal.action_type.replaceAll("_", " ")}</p>
            <p><span className="font-semibold text-[#10243E]">Submitted by:</span> {item.proposal.submitted_by}</p>
            {item.proposal.reviewed_by ? <p><span className="font-semibold text-[#10243E]">Reviewed by:</span> {item.proposal.reviewed_by}</p> : null}
            {item.proposal.review_note ? <p><span className="font-semibold text-[#10243E]">Moderator note:</span> {item.proposal.review_note}</p> : null}
          </div>
        </div>
      )) : (
        <p className="rounded-[24px] border border-[#D8E3EE] bg-white p-4 text-[14px] text-[#64748B]">Nothing here yet.</p>
      )}
    </div>
  )
}
