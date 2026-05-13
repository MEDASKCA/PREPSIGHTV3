"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getCuratedVariantsForProcedureWithSystems,
  hasOnlySyntheticBranching,
  type SystemWithSupplier,
  type VariantWithSystems,
} from "@/lib/variants";
import { getProfile } from "@/lib/profile";
import {
  FIXATION_LABELS,
  getReviewedMappingsForVariant,
  getSuggestionCandidatesForVariant,
  isTrustedReviewer,
  parseEvidenceLinkText,
  reviewSystemMapping,
  setSystemFixationLabel,
  subscribeToSystemMappingReviews,
  suggestSystemMapping,
  type FixationLabel,
  type ReviewableSystemMapping,
} from "@/lib/system-mapping-review";
import type { PrepSightProfile } from "@/lib/types";

type ProcedureListItem = {
  id: string;
  name: string;
  description?: string;
  aliases?: string[];
  status?: string;
  subanatomy_group?: string;
};

type Palette = {
  header: string;
  hover: string;
  soft: string;
  softBorder: string;
  softText: string;
};

type ProcedureTabsProps = {
  procedures: ProcedureListItem[];
  setting?: string;
  specialty?: string;
  serviceLine?: string;
  anatomy?: string;
  selectedSystemId?: string;
  palette?: Palette;
};

type GroupedProcedureSet = {
  groupName: string;
  items: Array<{
    procedure: ProcedureListItem;
    variants: VariantWithSystems[];
    suppressBranching: boolean;
  }>;
};

function sortSubanatomyGroups(a: string, b: string): number {
  if (a === "Whole Joint") return -1;
  if (b === "Whole Joint") return 1;
  return a.localeCompare(b);
}

function SubanatomyHeader({
  label,
  isDark,
  expanded,
  onToggle,
}: {
  label: string;
  isDark: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between px-4 py-1 text-left"
    >
      <h2 className={`text-[14px] font-normal tracking-[-0.01em] lg:text-[18px] lg:font-normal ${isDark ? "text-[#E5EEF9]" : "text-[#51677E]"}`}>
        {label}
      </h2>
      <Chevron expanded={expanded} className={isDark ? "text-[#C7D2E0]" : "text-[#61758B]"} />
    </button>
  );
}

function formatFixationLabel(value: FixationLabel): string {
  return value.replaceAll("_", " ");
}

function StatusBadge({
  status,
  isDark,
}: {
  status: "confirmed" | "review_required";
  isDark: boolean;
}) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-normal uppercase tracking-[0.12em] ${
        status === "confirmed"
          ? isDark
            ? "bg-[#133126] text-[#86EFAC]"
            : "bg-[#DCFCE7] text-[#166534]"
          : isDark
            ? "bg-[#3F2A13] text-[#F8D8A8]"
            : "bg-[#FFF3D9] text-[#9A5B00]"
      }`}
    >
      {status === "confirmed" ? "● Confirmed" : "▲ Review"}
    </span>
  );
}

function FixationBadge({
  label,
  isDark,
}: {
  label?: string;
  isDark: boolean;
}) {
  if (!label || label === "unknown") return null;

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-normal uppercase tracking-[0.08em] ${
        isDark
          ? "bg-[#132238] text-[#C7D2E0]"
          : "bg-[#EEF4F8] text-[#475569]"
      }`}
    >
      {label.replaceAll("_", " ")}
    </span>
  );
}

function FixationSelect({
  value,
  isDark,
  onChange,
}: {
  value: FixationLabel;
  isDark: boolean;
  onChange: (value: FixationLabel) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as FixationLabel)}
      className={`rounded-full border px-2 py-1 text-[11px] font-normal ${
        isDark
          ? "border-[#334155] bg-[#132238] text-white"
          : "border-[#D8E3EE] bg-white text-[#10243E]"
      }`}
    >
      {FIXATION_LABELS.map((label) => (
        <option key={label} value={label}>
          {formatFixationLabel(label)}
        </option>
      ))}
    </select>
  );
}

function SuggestSystemForm({
  variant,
  procedure,
  specialty,
  subspecialty,
  anatomy,
  subanatomyGroup,
  candidates,
  isDark,
  onSubmitted,
}: {
  variant: VariantWithSystems;
  procedure: ProcedureListItem;
  specialty: string;
  subspecialty: string;
  anatomy: string;
  subanatomyGroup: string;
  candidates: SystemWithSupplier[];
  isDark: boolean;
  onSubmitted: () => void;
}) {
  const [selectedSystemId, setSelectedSystemId] = useState(candidates[0]?.id ?? "");
  const [fixationLabel, setFixationLabel] = useState<FixationLabel>("unknown");
  const [reviewNotes, setReviewNotes] = useState("");
  const [evidenceLinks, setEvidenceLinks] = useState("");

  useEffect(() => {
    setSelectedSystemId(candidates[0]?.id ?? "");
  }, [candidates]);

  if (candidates.length === 0) {
    return (
      <div className={`rounded-[16px] border px-3 py-3 text-xs ${isDark ? "border-[#334155] bg-[#1B2636] text-[#C7D2E0]" : "border-[#D8E3EE] bg-[#F8FBFD] text-[#51677E]"}`}>
        No additional system candidates available for this branch yet.
      </div>
    );
  }

  return (
    <div className={`rounded-[18px] border p-3 ${isDark ? "border-[#334155] bg-[#1B2636]" : "border-[#D8E3EE] bg-[#F8FBFD]"}`}>
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_160px]">
        <select
          value={selectedSystemId}
          onChange={(event) => setSelectedSystemId(event.target.value)}
          className={`rounded-[12px] border px-3 py-2 text-sm ${isDark ? "border-[#334155] bg-[#132238] text-white" : "border-[#D8E3EE] bg-white text-[#10243E]"}`}
        >
          {candidates.map((system) => (
            <option key={system.id} value={system.id}>
              {system.name}
            </option>
          ))}
        </select>
        <select
          value={fixationLabel}
          onChange={(event) => setFixationLabel(event.target.value as FixationLabel)}
          className={`rounded-[12px] border px-3 py-2 text-sm ${isDark ? "border-[#334155] bg-[#132238] text-white" : "border-[#D8E3EE] bg-white text-[#10243E]"}`}
        >
          {FIXATION_LABELS.map((label) => (
            <option key={label} value={label}>
              {formatFixationLabel(label)}
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={reviewNotes}
        onChange={(event) => setReviewNotes(event.target.value)}
        rows={2}
        placeholder="Why should this system be considered?"
        className={`mt-2 w-full rounded-[12px] border px-3 py-2 text-sm ${isDark ? "border-[#334155] bg-[#132238] text-white placeholder:text-[#94A3B8]" : "border-[#D8E3EE] bg-white text-[#10243E] placeholder:text-[#7A8CA0]"}`}
      />
      <input
        value={evidenceLinks}
        onChange={(event) => setEvidenceLinks(event.target.value)}
        placeholder="Evidence links separated by spaces"
        className={`mt-2 w-full rounded-[12px] border px-3 py-2 text-sm ${isDark ? "border-[#334155] bg-[#132238] text-white placeholder:text-[#94A3B8]" : "border-[#D8E3EE] bg-white text-[#10243E] placeholder:text-[#7A8CA0]"}`}
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => {
            if (!selectedSystemId) return;
            suggestSystemMapping({
              specialty,
              subspecialty,
              anatomy,
              subanatomy_group: subanatomyGroup,
              procedure_id: procedure.id,
              procedure_name: procedure.name,
              variant_id: variant.id,
              variant_name: variant.name,
              system_id: selectedSystemId,
              fixation_label: fixationLabel,
              review_notes: reviewNotes,
              evidence_links: parseEvidenceLinkText(evidenceLinks),
            });
            setReviewNotes("");
            setEvidenceLinks("");
            onSubmitted();
          }}
          className={`rounded-full px-3 py-1.5 text-[11px] font-normal uppercase tracking-[0.14em] ${isDark ? "bg-[#0EA5E9] text-[#07111F]" : "bg-[#0EA5E9] text-white"}`}
        >
          Suggest system
        </button>
      </div>
    </div>
  );
}

function Chevron({ expanded, className = "" }: { expanded: boolean; className?: string }) {
  return (
    <svg
      className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-90" : ""} ${className}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 0 1 .02-1.06L10.94 10 7.23 6.29a.75.75 0 1 1 1.06-1.06l4.24 4.24a.75.75 0 0 1 0 1.06l-4.24 4.24a.75.75 0 0 1-1.08-.02Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function formatSystemMeta(system: SystemWithSupplier) {
  const categorySuffix =
    system.category?.split("—")[1]?.trim() ||
    system.category?.split("-")[1]?.trim() ||
    "";
  const rawSystemType = system.system_type?.trim() || "";
  const systemType =
    categorySuffix ||
    (rawSystemType.toLowerCase() === "implant" ? "" : rawSystemType);
  return {
    supplier: system.supplier?.name ? `by ${system.supplier.name}` : "",
    type: systemType || "",
  };

}

function SystemRow({
  system,
  procedureId,
  variantId,
  isSelected,
  isDark,
  canReview,
}: {
  system: SystemWithSupplier | ReviewableSystemMapping;
  procedureId: string;
  variantId: string;
  isSelected: boolean;
  isDark: boolean;
  canReview: boolean;
}) {
  const rowClassName = isDark
    ? `procedure-system-row flex w-full items-start justify-between gap-3 border-t px-4 py-4 text-left transition lg:px-5 lg:py-3.5 ${
        isSelected ? "bg-[#334155]" : "bg-[#243244] hover:bg-[#2B3B50]"
      } border-[#334155]`
    : [
        "procedure-system-row flex w-full items-start justify-between gap-3 border-t border-[#D5DCE3] px-4 py-4 text-left transition lg:border-[#D8E3EE] lg:px-5 lg:py-3.5",
        isSelected ? "bg-[#E1F3F0] lg:bg-[#EEF7FF]" : "bg-white hover:bg-[#F4FBFA] lg:bg-white lg:hover:bg-[#F7FBFF]",
      ].join(" ");

  const reviewable = "mapping_id" in system ? (system as ReviewableSystemMapping) : null;
  const href = `/procedures/${procedureId}?variant=${encodeURIComponent(variantId)}&system=${encodeURIComponent(system.id)}`;

  return (
    <div className={rowClassName}>
      <Link href={href} className="min-w-0 flex-1">
        <div className={`app-display-font text-[15px] font-normal lg:text-[22px] lg:font-normal lg:tracking-[-0.03em] ${isDark ? "text-white" : "text-slate-900 lg:text-[#10243E]"}`}>
          {system.name}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {"fixation_class" in system && (
            <FixationBadge
              label={typeof system.fixation_class === "string" ? system.fixation_class : undefined}
              isDark={isDark}
            />
          )}
          {"mapping_status" in system &&
            (system.mapping_status === "confirmed" || system.mapping_status === "review_required") && (
              <StatusBadge status={system.mapping_status} isDark={isDark} />
            )}
        </div>
        {(formatSystemMeta(system).type || formatSystemMeta(system).supplier) && (
          <div className="mt-1 space-y-0.5">
            {formatSystemMeta(system).type && (
              <div className={`text-[11px] font-normal uppercase tracking-[0.08em] lg:text-[12px] ${isDark ? "text-[#C7D2E0]" : "text-slate-600 lg:text-[#51677E]"}`}>
                {formatSystemMeta(system).type}
              </div>
            )}
            {formatSystemMeta(system).supplier && (
              <div className={`text-[13px] lg:text-sm ${isDark ? "text-[#C7D2E0]" : "text-slate-500 lg:text-[#61758B]"}`}>
                {formatSystemMeta(system).supplier}
              </div>
            )}
          </div>
        )}
        {system.description && (
          <div className={`mt-1 line-clamp-2 text-xs lg:text-sm lg:leading-6 ${isDark ? "text-[#C7D2E0]" : "text-slate-500 lg:text-[#61758B]"}`}>
            {system.description}
          </div>
        )}
      </Link>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          {system.is_default && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-normal lg:border lg:px-2.5 lg:py-0.5 ${isDark ? "border-[#334155] bg-[#132238] text-[#E5EEF9]" : "bg-[#E1F3F0] text-[#134E4A] lg:border-[#D6E6F5] lg:bg-[#F3FAF9] lg:text-[#134E4A]"}`}>
              Default
            </span>
          )}
          <Link href={href} className="flex h-6 w-6 items-center justify-center">
            <Chevron expanded={false} className={isDark ? "text-[#C7D2E0]" : "text-[#7BA9A3] lg:text-[#8AA2BA]"} />
          </Link>
        </div>
        {reviewable && canReview ? (
          <div className="flex flex-wrap items-center justify-end gap-1">
            <button
              type="button"
              onClick={() =>
                reviewSystemMapping(reviewable.mapping_id, {
                  mapping_status: "confirmed",
                  approved_by_admin: true,
                })
              }
              className={`rounded-full px-2 py-1 text-[10px] font-normal uppercase tracking-[0.08em] ${
                isDark ? "bg-[#133126] text-[#86EFAC]" : "bg-[#DCFCE7] text-[#166534]"
              }`}
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() =>
                reviewSystemMapping(reviewable.mapping_id, {
                  mapping_status: "review_required",
                  approved_by_admin: false,
                  review_notes: reviewable.review_notes || "Flagged for review.",
                })
              }
              className={`rounded-full px-2 py-1 text-[10px] font-normal uppercase tracking-[0.08em] ${
                isDark ? "bg-[#3F2A13] text-[#F8D8A8]" : "bg-[#FFF3D9] text-[#9A5B00]"
              }`}
            >
              Flag
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function VariantSection({
  procedure,
  procedureId,
  variant,
  expanded,
  selectedSystemId,
  onToggle,
  isFirst,
  palette,
  isDark,
  specialty,
  subspecialty,
  anatomy,
  subanatomyGroup,
  canReview,
}: {
  procedure: ProcedureListItem;
  procedureId: string;
  variant: VariantWithSystems;
  expanded: boolean;
  selectedSystemId?: string;
  onToggle: () => void;
  isFirst: boolean;
  palette: Palette;
  isDark: boolean;
  specialty: string;
  subspecialty: string;
  anatomy: string;
  subanatomyGroup: string;
  canReview: boolean;
}) {
  const reviewedSystems = useMemo(
    () =>
      getReviewedMappingsForVariant({
        procedure: { id: procedure.id, name: procedure.name },
        variant,
        currentSystems: variant.systems,
        specialty,
        subspecialty,
        anatomy,
        subanatomyGroup,
        includeReviewRequired: true,
      }),
    [anatomy, procedure.id, procedure.name, specialty, subanatomyGroup, subspecialty, variant],
  );

  return (
    <div className={isFirst ? "" : "procedure-variant-divider border-t border-[#D5DCE3] lg:border-white/10"}>
      <button
        type="button"
        onClick={onToggle}
        className="procedure-variant-bar flex w-full items-center justify-between gap-3 px-5 py-5 text-left transition lg:hidden"
        style={{
          backgroundColor: isDark ? "#243244" : palette.soft,
          color: isDark ? "#E5EEF9" : palette.softText,
          borderLeft: `4px solid ${isDark ? "#334155" : palette.softBorder}`,
        }}
      >
        <div className="min-w-0">
          <div className="app-display-font text-[15px] font-normal lg:text-[26px] lg:font-normal lg:tracking-[-0.04em]">
            {variant.name}
          </div>
          {variant.description && (
            <div className="mt-1 line-clamp-2 text-[13px] leading-5 opacity-90 lg:text-sm lg:leading-6">
              {variant.description}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Chevron expanded={expanded} className="opacity-80" />
        </div>
      </button>

      <div className="procedure-variant-bar hidden lg:block lg:px-6 lg:py-5" style={{ backgroundColor: isDark ? "#243244" : palette.soft, color: isDark ? "#E5EEF9" : palette.softText }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-normal uppercase tracking-[0.18em] opacity-60">
              Approach
            </p>
            <p className="mt-2 text-[26px] font-normal tracking-[-0.04em]">
              {variant.name}
            </p>
            {variant.description && (
              <p className="mt-2 max-w-xl text-sm leading-6 opacity-78">
                {variant.description}
              </p>
            )}
          </div>
          <span className={`rounded-full px-3 py-1 text-[11px] font-normal uppercase tracking-[0.16em] ${isDark ? "border border-[#334155] bg-[#132238] text-[#E5EEF9]" : "border border-black/10 bg-white/55"}`}>
            {reviewedSystems.length} systems
          </span>
        </div>
      </div>

      {expanded && (
        <div className={`procedure-variant-content lg:hidden ${isDark ? "bg-[#243244]" : "bg-white"}`}>
          {reviewedSystems.length > 0 ? (
            reviewedSystems.map((system) => (
              <SystemRow
                key={system.id}
                system={system}
                procedureId={procedureId}
                variantId={variant.id}
                isSelected={selectedSystemId === system.id}
                isDark={isDark}
                canReview={canReview}
              />
            ))
          ) : (
            <div className={`procedure-empty-row border-t px-5 py-4 text-sm ${isDark ? "border-[#334155] bg-[#243244] text-[#C7D2E0]" : "border-[#D5DCE3] bg-white text-slate-500 lg:border-white/10 lg:bg-transparent lg:text-white"}`}>
              No systems linked yet for this variant.
            </div>
          )}
        </div>
      )}

      <div className="hidden lg:block lg:bg-transparent">
        {reviewedSystems.length > 0 ? (
          reviewedSystems.map((system) => (
            <SystemRow
              key={system.id}
              system={system}
              procedureId={procedureId}
              variantId={variant.id}
              isSelected={selectedSystemId === system.id}
              isDark={isDark}
              canReview={canReview}
            />
          ))
        ) : (
          <div className={`procedure-empty-row border-t px-5 py-4 text-sm ${isDark ? "border-[#334155] bg-[#243244] text-[#C7D2E0]" : "border-[#D5DCE3] bg-white text-slate-500 lg:border-[#D8E3EE] lg:bg-white lg:text-[#61758B]"}`}>
            No systems linked yet for this variant.
          </div>
        )}
      </div>
    </div>
  );
}

function DesktopProcedureMatrix({
  proceduresWithVariants,
  selectedSystemId,
  palette,
  isDark,
  specialty,
  subspecialty,
  anatomy,
  canReview,
}: {
  proceduresWithVariants: Array<{
    procedure: ProcedureListItem;
    variants: VariantWithSystems[];
    suppressBranching: boolean;
  }>;
  selectedSystemId?: string;
  palette: Palette;
  isDark: boolean;
  specialty: string;
  subspecialty: string;
  anatomy: string;
  canReview: boolean;
}) {
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});

  return (
    <div className="hidden space-y-5 lg:block">
      {proceduresWithVariants.map(({ procedure, variants, suppressBranching }) => {
        const procedureApproaches = suppressBranching
          ? []
          : variants.map((variant) => ({
              id: variant.id,
              name: variant.name,
              description: variant.description,
              systems: variant.systems,
            }));

        return (
          <div
            key={procedure.id}
            className="overflow-visible"
          >
            <div className="grid grid-cols-[280px_minmax(0,1fr)] items-start gap-5 overflow-visible">
              <div className="px-2 py-5">
                <div
                  className="rounded-[22px] px-5 py-5"
                  style={{ backgroundColor: palette.hover }}
                >
                <p className="text-[11px] font-normal uppercase tracking-[0.18em] text-white">
                  Procedure
                </p>
                <p className="mt-2 text-[20px] font-normal tracking-[-0.03em] text-white">
                  {procedure.name}
                </p>
                {procedure.description && (
                  <p className="mt-2 text-sm leading-6 text-white">
                    {procedure.description}
                  </p>
                )}
                </div>
              </div>

              <div className="min-w-0 p-0 overflow-visible">
                {procedureApproaches.length > 0 ? (
                  <div
                    className="grid items-start gap-4 overflow-visible"
                    style={{ gridTemplateColumns: `repeat(${procedureApproaches.length}, minmax(0, 1fr))` }}
                  >
                    {procedureApproaches.map((approach) => {
                      const cardKey = `${procedure.id}:${approach.id}`;
                      const isCollapsed = collapsedCards[cardKey] ?? true;

                      return (
                        <div
                          key={`${procedure.id}-${approach.id}`}
                          className={`procedure-approach-card relative overflow-hidden rounded-[24px] border shadow-[0_8px_18px_rgba(15,23,42,0.04)] ${
                            isCollapsed ? "min-h-[220px]" : ""
                          } ${isDark ? "bg-[#243244] border-[#334155]" : "bg-white"}`}
                          style={{
                            borderColor: isDark ? "#334155" : `${palette.softBorder}55`,
                            backgroundColor: isDark ? "#243244" : "transparent",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setCollapsedCards((current) => ({
                                ...current,
                                [cardKey]: !isCollapsed,
                              }))
                            }
                            className="w-full text-left transition-[filter] duration-200 hover:brightness-[0.98]"
                          >
                            <div
                              className={`procedure-approach-bar px-4 ${isCollapsed ? "flex min-h-[220px] items-center py-8" : "border-b py-3"}`}
                              style={{
                                borderColor: isDark ? "#334155" : `${palette.softBorder}55`,
                                backgroundColor: isDark ? "#243244" : `${palette.soft}`,
                              }}
                            >
                              <div className="flex w-full flex-col items-center justify-center gap-3 text-center">
                                <div className="flex flex-col items-center text-center">
                                  <p
                                    className="text-[13px] font-normal uppercase tracking-[0.12em]"
                                    style={{ color: palette.softText }}
                                  >
                                    Approach
                                  </p>
                <p className={`app-display-font mt-1.5 text-[25px] font-normal tracking-[-0.03em] ${isDark ? "text-white" : "text-[#10243E]"}`}>
                                    {approach.name}
                                  </p>
                                  {approach.description && !isCollapsed && (
                                    <p className={`mt-2 max-w-xl text-[14px] leading-6 ${isDark ? "text-[#C7D2E0]" : "text-[#61758B]"}`}>
                                      {approach.description}
                                    </p>
                                  )}
                                </div>
                                <span
                                  className="text-[13px] font-normal uppercase tracking-[0.12em]"
                                  style={{ color: palette.softText }}
                                >
                                  {approach.systems.length} system options
                                </span>
                                <Chevron expanded={!isCollapsed} className={isDark ? "text-[#C7D2E0]" : "text-[#46607A]"} />
                              </div>
                            </div>
                          </button>

                          {!isCollapsed && (
                            <div
                              className="procedure-approach-content border-t p-3"
                              style={{
                                backgroundColor: isDark ? "#243244" : `${palette.soft}`,
                                borderColor: isDark ? "#334155" : `${palette.softBorder}55`,
                              }}
                            >
                              {approach.systems.length > 0 ? (
                                <div className="space-y-2">
                                  {approach.systems.map((system) => (
                                    <Link
                                      key={`${procedure.id}-${approach.id}-${system.id}`}
                                      href={`/procedures/${procedure.id}?variant=${encodeURIComponent(approach.id)}&system=${encodeURIComponent(system.id)}`}
                                      className={[
                                        "block rounded-[16px] border px-3 py-3 transition",
                                        selectedSystemId === system.id
                                          ? "shadow-[0_10px_24px_rgba(15,23,42,0.10)]"
                                          : isDark
                                            ? "hover:bg-[#2B3B50]"
                                            : "hover:bg-white/90",
                                      ].join(" ")}
                                      style={
                                        selectedSystemId === system.id
                                          ? {
                                              borderColor: isDark ? "#475569" : `${palette.header}66`,
                                              backgroundColor: isDark ? "#334155" : palette.header,
                                            }
                                          : {
                                              borderColor: isDark ? "#334155" : `${palette.header}33`,
                                              backgroundColor: isDark ? "#243244" : palette.hover,
                                            }
                                      }
                                    >
                                      <div className="min-w-0">
                                        <div className="text-[19px] font-normal leading-6 text-white">
                                          {system.name}
                                        </div>
                                        {(formatSystemMeta(system).type ||
                                          formatSystemMeta(system).supplier) && (
                                          <div className="mt-1 space-y-0.5">
                                            {formatSystemMeta(system).type && (
                                              <div className="text-[12px] font-normal uppercase tracking-[0.08em] text-white">
                                                {formatSystemMeta(system).type}
                                              </div>
                                            )}
                                            {formatSystemMeta(system).supplier && (
                                              <div className="text-[15px] leading-5 text-white">
                                                {formatSystemMeta(system).supplier}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                              ) : (
                                <div
                                  className={`procedure-empty-row rounded-[16px] border border-dashed px-3 py-4 text-[17px] ${isDark ? "bg-[#243244]" : "bg-[#FAFCFE]"}`}
                                  style={{ borderColor: isDark ? "#334155" : `${palette.softBorder}66`, color: isDark ? "#C7D2E0" : palette.softText }}
                                >
                                  No systems
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-2 py-3 text-sm text-[#A2B2C2]">
                    No clinically reliable branching available yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProcedureSection({
  procedure,
  variants,
  suppressBranching,
  selectedSystemId,
  palette,
  isDark,
  specialty,
  subspecialty,
  anatomy,
  canReview,
}: {
  procedure: ProcedureListItem;
  variants: VariantWithSystems[];
  suppressBranching: boolean;
  selectedSystemId?: string;
  palette: Palette;
  isDark: boolean;
  specialty: string;
  subspecialty: string;
  anatomy: string;
  canReview: boolean;
}) {
  const [openVariantId, setOpenVariantId] = useState<string | null>(null);
  const [desktopExpanded, setDesktopExpanded] = useState(false);
  const canOpenDirectCard = suppressBranching || variants.length === 0;
  const hasAuthoredCard = (procedure.status ?? "").toLowerCase() !== "placeholder";
  const directLinkHref = `/procedures/${procedure.id}`;

  if (canOpenDirectCard) {
    return (
      <Link
        href={directLinkHref}
        className={`procedure-section-card block overflow-hidden lg:inline-block lg:w-full lg:break-inside-avoid lg:rounded-[24px] lg:border lg:shadow-[0_12px_28px_rgba(15,23,42,0.06)] ${
          isDark ? "lg:border-[#334155] lg:bg-[#243244]" : "lg:border-[#D8E3EE] lg:bg-white"
        }`}
      >
        <div
          className="flex items-center gap-3 px-4 py-3 text-white lg:px-5 lg:py-4"
          style={{ background: `linear-gradient(145deg, ${palette.header} 0%, ${palette.hover} 100%)` }}
        >
          <div className="min-w-0 flex-1">
            <div className="app-display-font text-[15px] font-normal leading-snug text-white lg:text-[21px] lg:tracking-[-0.03em]">
              {procedure.name}
            </div>
            {procedure.description && (
              <div className="mt-0.5 line-clamp-1 text-[12px] leading-5 text-white lg:text-[13px]">
                {procedure.description}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full border border-white/14 bg-white/10 px-2.5 py-1 text-[10px] font-normal uppercase tracking-[0.14em] text-white">
              {hasAuthoredCard ? "Ready" : "Stub"}
            </span>
            <span className="rounded-full bg-white/16 px-3 py-1 text-[10px] font-normal uppercase tracking-[0.14em] text-white">
              Open Card
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className={`procedure-section-card overflow-hidden lg:inline-block lg:w-full lg:break-inside-avoid lg:rounded-[28px] lg:border lg:shadow-[0_18px_42px_rgba(15,23,42,0.08)] ${isDark ? "lg:border-[#334155] lg:bg-[#243244]" : "lg:border-[#D8E3EE] lg:bg-white"}`}>
      <button
        type="button"
        onClick={() => setDesktopExpanded((current) => !current)}
        className="hidden w-full lg:block"
      >
        <div
          className="flex items-stretch text-white"
        style={{ background: `linear-gradient(145deg, ${palette.header} 0%, ${palette.hover} 100%)` }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4 text-left lg:px-5 lg:py-4">
            <div className="min-w-0 flex-1">
              <p className="hidden lg:block lg:text-[11px] lg:font-normal lg:uppercase lg:tracking-[0.18em] lg:text-white">
                Menu
              </p>
              <div className="app-display-font text-sm font-normal text-white lg:text-[24px] lg:font-normal lg:tracking-[-0.04em]">
                {procedure.name}
              </div>
              {desktopExpanded && procedure.description && (
                <div className="mt-1 line-clamp-2 text-xs text-white lg:max-w-3xl lg:text-[13px] lg:leading-5">
                  {procedure.description}
                </div>
              )}
            </div>
            <div className="hidden lg:flex lg:items-center lg:gap-3">
              <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1 text-[10px] font-normal uppercase tracking-[0.16em] text-white">
                {canOpenDirectCard
                  ? hasAuthoredCard
                    ? "Card ready"
                    : "Placeholder"
                  : `${variants.length || 1} approaches`}
              </span>
              <Chevron expanded={desktopExpanded} className="text-white" />
            </div>
          </div>
        </div>
      </button>

      <div
        className="flex items-stretch text-white lg:hidden"
        style={{ background: `linear-gradient(145deg, ${palette.header} 0%, ${palette.hover} 100%)` }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4 text-left">
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-normal leading-snug text-white">
              {procedure.name}
            </div>
            {procedure.description && (
              <div className="mt-1 line-clamp-2 text-[13px] text-white leading-5">
                {procedure.description}
              </div>
            )}
          </div>
        </div>
      </div>

      <>
          <div className={`procedure-variant-content lg:hidden ${isDark ? "bg-[#243244]" : "bg-white"}`}>
            {variants.length > 0 ? (
              variants.map((variant, index) => (
                <VariantSection
                  key={variant.id}
                  procedure={procedure}
                  procedureId={procedure.id}
                  variant={variant}
                  expanded={openVariantId === variant.id}
                  selectedSystemId={selectedSystemId}
                  isFirst={index === 0}
                  palette={palette}
                  isDark={isDark}
                  specialty={specialty}
                  subspecialty={subspecialty}
                  anatomy={anatomy}
                  subanatomyGroup={procedure.subanatomy_group?.trim() || "Ungrouped"}
                  canReview={canReview}
                  onToggle={() =>
                    setOpenVariantId((current) => (current === variant.id ? null : variant.id))
                  }
                />
              ))
            ) : (
              <div className={`procedure-empty-row border-t px-5 py-4 text-sm ${isDark ? "border-[#334155] bg-[#243244] text-[#C7D2E0]" : "border-[#D5DCE3] bg-white text-slate-500"}`}>
                No clinically reliable branching available yet.
              </div>
            )}
          </div>

          <div className={`procedure-variant-content hidden lg:block ${isDark ? "lg:bg-[#243244]" : "lg:bg-white"} ${desktopExpanded ? "" : "lg:hidden"}`}>
            {variants.length > 0 ? (
              <div
                className="grid gap-0"
                style={{ gridTemplateColumns: `repeat(${variants.length}, minmax(0, 1fr))` }}
              >
                {variants.map((variant, index) => (
                  <div
                    key={variant.id}
                    className={index === 0 ? "min-w-0" : "min-w-0 border-l border-[#E4EDF6]"}
                  >
                    <VariantSection
                      procedure={procedure}
                      procedureId={procedure.id}
                      variant={variant}
                      expanded
                      selectedSystemId={selectedSystemId}
                      isFirst
                      palette={palette}
                      isDark={isDark}
                      specialty={specialty}
                      subspecialty={subspecialty}
                      anatomy={anatomy}
                      subanatomyGroup={procedure.subanatomy_group?.trim() || "Ungrouped"}
                      canReview={canReview}
                      onToggle={() => {
                        setOpenVariantId((current) => (current === variant.id ? null : variant.id));
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className={`procedure-empty-row border-t px-5 py-4 text-sm ${isDark ? "border-[#334155] bg-[#243244] text-[#C7D2E0]" : "border-[#E4EDF6] bg-white text-[#61758B]"}`}>
                No clinically reliable branching available yet.
              </div>
            )}
          </div>
      </>
    </div>
  );
}

export default function ProcedureTabs({
  procedures,
  specialty,
  serviceLine,
  anatomy,
  selectedSystemId,
  palette = {
    header: "#4DA3FF",
    hover: "#2F8EF7",
    soft: "#C7ECE8",
    softBorder: "#99D8D1",
    softText: "#134E4A",
  },
}: ProcedureTabsProps) {
  const [isDark, setIsDark] = useState(false);
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);
  const [profile, setProfile] = useState<PrepSightProfile | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const syncTheme = () => {
      setIsDark(document.documentElement.dataset.theme === "dark");
    };

    syncTheme();
    window.addEventListener("storage", syncTheme);
    window.addEventListener("prepsight:preferences-changed", syncTheme as EventListener);

    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener("prepsight:preferences-changed", syncTheme as EventListener);
    };
  }, []);

  useEffect(() => {
    setProfile(getProfile());
    return subscribeToSystemMappingReviews(() => {
      setProfile(getProfile());
      setReviewRefreshKey((current) => current + 1);
    });
  }, []);

  const trustedReviewer = isTrustedReviewer(profile);
  const reviewSpecialty = specialty ?? "Trauma and Orthopaedics";
  const reviewSubspecialty = serviceLine ?? specialty ?? "Trauma and Orthopaedics";
  const reviewAnatomy = anatomy ?? "Unknown Anatomy";

  const proceduresWithVariants = useMemo(() => {
    return procedures
      .filter((procedure) => procedure.status !== "inactive")
      .map((procedure) => ({
        procedure,
        variants: getCuratedVariantsForProcedureWithSystems(procedure.id, procedure.name),
        suppressBranching: hasOnlySyntheticBranching(procedure.id, procedure.name),
      }));
  }, [procedures, reviewRefreshKey]);

  const groupedProcedures = useMemo<GroupedProcedureSet[]>(() => {
    const grouped = new Map<string, GroupedProcedureSet["items"]>();

    for (const item of proceduresWithVariants) {
      const groupName = item.procedure.subanatomy_group?.trim() || "Ungrouped";
      const list = grouped.get(groupName) ?? [];
      list.push(item);
      grouped.set(groupName, list);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => sortSubanatomyGroups(a[0], b[0]))
      .map(([groupName, items]) => ({
        groupName,
        items: items.sort((a, b) => a.procedure.name.localeCompare(b.procedure.name)),
      }));
  }, [proceduresWithVariants]);

  useEffect(() => {
    setCollapsedGroups((current) => {
      const next = { ...current };
      for (const group of groupedProcedures) {
        if (!(group.groupName in next)) {
          next[group.groupName] = false;
        }
      }
      return next;
    });
  }, [groupedProcedures]);

  if (!proceduresWithVariants.length) {
    return (
      <div className={`procedure-empty-row rounded-xl border border-dashed px-5 py-6 text-sm lg:rounded-[28px] lg:px-7 lg:py-7 ${isDark ? "border-[#334155] bg-[#243244] text-[#C7D2E0]" : "border-slate-300 bg-white text-slate-500 lg:border-[#D8E3EE] lg:bg-white lg:text-[#61758B]"}`}>
        <p className="text-[11px] font-normal uppercase tracking-[0.16em] text-[#94A3B8] lg:text-[12px]">
          Under construction
        </p>
        <p className="mt-2 text-[15px] font-normal text-[#10243E] lg:text-[20px]">
          This anatomy is visible in the library shell, but no validated procedure cards have been published here yet.
        </p>
        <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#61758B]">
          Keep the navigation path intact so teams can see what is coming next. Use the New card flow to propose a procedure and build it against the same structured model used for the live THR and TKR references.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 lg:hidden">
        {groupedProcedures.map(({ groupName, items }) => (
          <section key={groupName} className="space-y-0">
            <SubanatomyHeader
              label={groupName}
              isDark={isDark}
              expanded={!collapsedGroups[groupName]}
              onToggle={() =>
                setCollapsedGroups((current) => ({
                  ...current,
                  [groupName]: !current[groupName],
                }))
              }
            />
            {!collapsedGroups[groupName] &&
              items.map(({ procedure, variants, suppressBranching }, idx) => (
                <div
                  key={procedure.id}
                  className={idx > 0 ? `${isDark ? "border-t border-[#334155]" : "border-t border-[#E8EFF6]"}` : ""}
                >
                  <ProcedureSection
                    key={procedure.id}
                    procedure={procedure}
                    variants={variants}
                    suppressBranching={suppressBranching}
                    selectedSystemId={selectedSystemId}
                    palette={palette}
                    isDark={isDark}
                    specialty={reviewSpecialty}
                    subspecialty={reviewSubspecialty}
                    anatomy={reviewAnatomy}
                    canReview={trustedReviewer}
                  />
                </div>
              ))}
          </section>
        ))}
      </div>

      <div className="hidden space-y-4 lg:block">
        {groupedProcedures.map(({ groupName, items }) => (
          <section key={groupName} className="space-y-2">
            <SubanatomyHeader
              label={groupName}
              isDark={isDark}
              expanded={!collapsedGroups[groupName]}
              onToggle={() =>
                setCollapsedGroups((current) => ({
                  ...current,
                  [groupName]: !current[groupName],
                }))
              }
            />
            {!collapsedGroups[groupName] && (
              <DesktopProcedureMatrix
                proceduresWithVariants={items}
                selectedSystemId={selectedSystemId}
                palette={palette}
                isDark={isDark}
                specialty={reviewSpecialty}
                subspecialty={reviewSubspecialty}
                anatomy={reviewAnatomy}
                canReview={trustedReviewer}
              />
            )}
          </section>
        ))}
      </div>

    </>
  );
}
