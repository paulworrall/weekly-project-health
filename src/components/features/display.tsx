/**
 * Small display pieces shared by the screens. Status is never shown by colour alone: every
 * pill, tag and bar carries words or a text alternative.
 */
import type { ReactNode } from "react";
import type { LogLevel, LogStatus, ProjectStatus, Spend } from "@/types/domain";
import type { RagCounts } from "@/types/views";
import { deltaSrText, deltaText } from "@/lib/delta";
import { LEVEL_LABEL, LOG_STATUS_LABEL, PROJECT_STATUS_LABEL } from "@/lib/labels";
import { RAG, RAG_VALUES, ragDescription, ragLabel, ragShares } from "@/lib/rag";
import { isOverBudget, spendLabel } from "@/lib/spend";

const pill =
  "inline-flex min-h-[26px] items-center rounded-full px-3 text-[12px] font-medium whitespace-nowrap";

/** Stacked Delivery RAG bar with its counts as words below. */
export function RagBar({
  counts,
  subject = "Delivery RAG",
  height = 14,
  inline = false,
}: {
  counts: RagCounts;
  subject?: string;
  height?: number;
  inline?: boolean;
}) {
  const shares = ragShares(counts);
  return (
    <div>
      <div
        role="img"
        aria-label={ragDescription(counts, subject)}
        className="flex bg-track"
        style={{ height }}
      >
        {RAG_VALUES.map((r) => (
          <div key={r} className={RAG[r].bgClass} style={{ width: `${shares[r]}%` }} />
        ))}
      </div>
      <div
        aria-hidden="true"
        className={`mt-2 text-[14px] ${inline ? "flex flex-wrap gap-x-4 gap-y-1" : "grid gap-0.5"}`}
      >
        {RAG_VALUES.map((r) => (
          <span key={r}>
            {counts[r]} {ragLabel(r)}
          </span>
        ))}
      </div>
    </div>
  );
}

const LEVEL_STYLE: Record<LogLevel, string> = {
  BLOCKER: "bg-blocker text-white",
  HIGH: "bg-navy text-white",
  MEDIUM: "bg-rag-amber text-navy",
  LOW: "border border-navy bg-white text-navy",
};

/** Severity or priority as a square tag with its word. */
export function LevelTag({ level }: { level: LogLevel }) {
  return (
    <span
      className={`inline-flex min-h-7 min-w-20 items-center justify-center px-2.5 text-[11px] font-medium tracking-[0.08em] uppercase ${LEVEL_STYLE[level]}`}
    >
      {LEVEL_LABEL[level]}
    </span>
  );
}

const LOG_STATUS_STYLE: Record<LogStatus, string> = {
  OPEN: "border border-navy bg-white",
  ON_PAUSE: "bg-line-soft",
  CLOSED: "bg-navy text-white",
};

export function LogStatusPill({ status }: { status: LogStatus }) {
  return <span className={`${pill} ${LOG_STATUS_STYLE[status]}`}>{LOG_STATUS_LABEL[status]}</span>;
}

export function ProjectStatusPill({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`${pill} ${status === "COMPLETE" ? "bg-navy text-white" : "border border-navy bg-white"}`}
    >
      {PROJECT_STATUS_LABEL[status]}
    </span>
  );
}

/** Generic pill, e.g. "Draft saved", "Not started", "Confirmed". */
export function Tag({
  tone = "outline",
  children,
}: {
  tone?: "outline" | "navy" | "warning" | "muted" | "success" | "pinned";
  children: ReactNode;
}) {
  const tones = {
    outline: "border border-navy bg-white",
    navy: "bg-navy text-white",
    warning: "bg-warning-tint",
    muted: "bg-line-soft",
    success: "bg-success-tint",
    pinned: "border border-navy bg-pinned",
  } as const;
  return <span className={`${pill} ${tones[tone]}`}>{children}</span>;
}

/** "▲ +2" with screen-reader text "up 2 on last week". */
export function Delta({
  now,
  prev,
  period = "on last week",
  showPeriod = false,
  className = "",
}: {
  now: number;
  prev: number;
  period?: string;
  showPeriod?: boolean;
  className?: string;
}) {
  return (
    <span className={className}>
      <span aria-hidden="true">
        {deltaText(now, prev)}
        {showPeriod && now !== prev ? ` ${period}` : ""}
      </span>
      <span className="sr-only">{deltaSrText(now, prev, period)}</span>
    </span>
  );
}

/** % spend cell: figure in bold (overspend in its own colour, with "Over budget"), or the status words. */
export function SpendCell({ spend, stacked = true }: { spend: Spend; stacked?: boolean }) {
  const over = isOverBudget(spend);
  if (spend.spendStatus !== "VALUE")
    return <span className="text-[13px]">{spendLabel(spend)}</span>;
  return (
    <span className={stacked ? "flex flex-col items-end" : ""}>
      <span className={`font-medium ${over ? "text-overspend" : ""}`}>{spendLabel(spend)}</span>
      {over ? (
        <span className="text-[12px] font-medium text-overspend">
          {stacked ? "" : " · "}Over budget
        </span>
      ) : null}
    </span>
  );
}

/** White card section with an optional heading row. */
export function Card({
  children,
  className = "",
  as: As = "section",
  labelledBy,
  label,
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "aside";
  labelledBy?: string;
  label?: string;
}) {
  return (
    <As
      aria-labelledby={labelledBy}
      aria-label={label}
      className={`bg-white p-5 sm:p-7 ${className}`}
    >
      {children}
    </As>
  );
}

/** Wide tables scroll in their own box (keyboard-focusable). */
export function TableScroll({ label, children }: { label: string; children: ReactNode }) {
  return (
    // `relative` keeps visually hidden captions (position: absolute) inside the scroll box, so
    // they can't widen the page at phone width.
    <div role="region" aria-label={label} tabIndex={0} className="relative overflow-x-auto">
      {children}
    </div>
  );
}

export const th =
  "px-2.5 py-2.5 text-left text-[11px] font-medium tracking-[0.08em] text-muted uppercase";
export const td = "px-2.5 py-3 align-top";
export const tableClass = "w-full border-collapse text-[14px]";
export const theadRow = "border-b border-navy";
export const tbodyRow = "border-b border-line";
