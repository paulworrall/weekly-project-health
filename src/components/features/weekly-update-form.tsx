"use client";

import { useId, useState } from "react";
import type { ProjectStatus, Rag, Spend, UpdateState } from "@/types/domain";
import { PROJECT_STATUSES } from "@/types/domain";
import { fieldErrors, weeklySubmitSchema, weeklyUpdateSchema } from "@/types/schemas";
import { formatTime } from "@/lib/dates";
import { PROJECT_STATUS_LABEL } from "@/lib/labels";
import { RAG, RAG_VALUES, ragLabel } from "@/lib/rag";
import { hasFigure, isOverBudget, spendAheadBy, spendLabel } from "@/lib/spend";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/fields";

const COMPLETE_OPTIONS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const selectClass = "min-h-11 w-full cursor-pointer border border-navy bg-white px-3 text-[14px]";

/** Delivery RAG as pill buttons with colour word + meaning; the pressed one is filled. */
export function RagSelector({
  value,
  onChange,
  disabled,
  error,
}: {
  value: Rag | null;
  onChange: (r: Rag) => void;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <fieldset className="sm:col-span-3" aria-describedby={error ? "rag-error" : undefined}>
      <legend className="lbl mb-2">Delivery RAG</legend>
      <div className="flex flex-wrap gap-2">
        {RAG_VALUES.map((r) => {
          const on = value === r;
          return (
            <button
              key={r}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => onChange(r)}
              className={`min-h-11 cursor-pointer rounded-full px-4.5 text-[14px] font-medium whitespace-nowrap text-navy disabled:cursor-not-allowed ${
                on ? `${RAG[r].bgClass} border-[3px] border-navy` : "border border-navy bg-white"
              }`}
            >
              {ragLabel(r)}
            </button>
          );
        })}
      </div>
      <FormError id="rag-error">{error}</FormError>
    </fieldset>
  );
}

export interface WeeklyUpdateFormProps {
  initial: {
    status: ProjectStatus;
    rag: Rag;
    percentComplete: number;
    updateText: string;
    state: UpdateState | null;
  };
  submittedAt: string | null;
  spend: Spend;
  readOnly: boolean;
  dueLabel: string;
  lastSubmissionText: string;
  /** Closed week: what was saved at the close. */
  closedText?: string;
  now: string;
}

/**
 * This week's update: status, % complete (0–100 in steps of 10), Complete vs spend, Delivery RAG
 * and update text, with Submit and Save draft (local state until brief 05).
 */
export function WeeklyUpdateForm(p: WeeklyUpdateFormProps) {
  const ids = { status: useId(), complete: useId(), update: useId() };
  const validInitial = COMPLETE_OPTIONS.includes(p.initial.percentComplete);
  const [status, setStatus] = useState<ProjectStatus>(p.initial.status);
  const [rag, setRag] = useState<Rag>(p.initial.rag);
  const [complete, setComplete] = useState<number | null>(
    validInitial ? p.initial.percentComplete : null
  );
  const [updateText, setUpdateText] = useState(p.initial.updateText);
  const [state, setState] = useState<UpdateState | null>(p.initial.state);
  const [submittedAt, setSubmittedAt] = useState<string | null>(p.submittedAt);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const values = { status, rag, percentComplete: complete ?? Number.NaN, updateText };

  function save(kind: UpdateState) {
    const schema = kind === "SUBMITTED" ? weeklySubmitSchema : weeklyUpdateSchema;
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setState(kind);
    if (kind === "SUBMITTED") setSubmittedAt(p.now);
  }

  const banner = p.readOnly
    ? { tone: "bg-line-soft", title: "Week closed.", text: p.closedText ?? "" }
    : state === "SUBMITTED"
      ? {
          tone: "bg-success-tint",
          title: `Submitted${submittedAt ? ` at ${formatTime(submittedAt)}` : ""}.`,
          text: `This update is in the weekly report. You can edit and submit again until the week closes on ${p.dueLabel}; the latest submission is what the report shows.`,
        }
      : state === "DRAFT" && submittedAt
        ? {
            tone: "bg-warning-tint",
            title: "Draft saved.",
            text: `The report still shows the update submitted at ${formatTime(submittedAt)} until you submit again, by ${p.dueLabel}.`,
          }
        : state === "DRAFT"
          ? {
              tone: "bg-warning-tint",
              title: "Draft saved, not yet submitted.",
              text: `${p.lastSubmissionText} Submit by ${p.dueLabel} to include this week's update in the report.`,
            }
          : {
              tone: "bg-warning-tint",
              title: "Not submitted this week.",
              text: `${p.lastSubmissionText} Submit by ${p.dueLabel} to include this week's update in the report.`,
            };

  const c = complete ?? 0;
  const ahead = spendAheadBy(p.spend, c);
  const spendWidth = hasFigure(p.spend) ? Math.min(100, (p.spend.percentSpent as number) * 100) : 0;
  const errorCount = Object.keys(errors).length;

  return (
    <>
      <div
        role="status"
        className={`mb-5 flex flex-wrap gap-2 px-4.5 py-3.5 text-[14px] ${banner.tone}`}
      >
        <span className="font-medium">{banner.title}</span>
        <span>{banner.text}</span>
      </div>
      <form
        aria-labelledby="inputs-h"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save("SUBMITTED");
        }}
      >
        <h2 id="inputs-h" className="mb-5 text-[24px] font-light">
          This week&apos;s update
        </h2>
        {errorCount ? (
          <p role="alert" className="mb-4 bg-warning-tint px-4 py-2.5 text-[14px] font-medium">
            Check the {errorCount === 1 ? "field" : "fields"} marked below.
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label htmlFor={ids.status} className="lbl">
              Status
            </label>
            <select
              id={ids.status}
              value={status}
              disabled={p.readOnly}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className={selectClass}
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <FormError>{errors.status}</FormError>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={ids.complete} className="lbl">
              % complete
            </label>
            <select
              id={ids.complete}
              value={complete === null ? "" : String(complete)}
              disabled={p.readOnly}
              onChange={(e) => setComplete(e.target.value === "" ? null : Number(e.target.value))}
              aria-invalid={errors.percentComplete ? true : undefined}
              aria-describedby={errors.percentComplete ? `${ids.complete}-error` : undefined}
              className={selectClass}
            >
              {complete === null ? <option value="">Choose % complete</option> : null}
              {COMPLETE_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}%
                </option>
              ))}
            </select>
            <FormError id={`${ids.complete}-error`}>{errors.percentComplete}</FormError>
          </div>
          <div role="group" aria-labelledby="cvs-label" className="flex flex-col gap-2">
            <span id="cvs-label" className="lbl">
              Complete vs spend
            </span>
            <div className="flex min-h-11 flex-col justify-center gap-2">
              <div className="flex items-center gap-2.5 text-[13px]">
                <span className="w-16">Complete</span>
                <div className="relative h-3 flex-1 bg-track" aria-hidden="true">
                  <div className="absolute inset-y-0 left-0 bg-navy" style={{ width: `${c}%` }} />
                </div>
                <span className="w-14 text-right font-medium">
                  {complete === null ? "—" : `${c}%`}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-[13px]">
                <span className="w-16">Spend</span>
                <div className="relative h-3 flex-1 bg-track" aria-hidden="true">
                  <div
                    className="absolute inset-y-0 left-0 bg-orange"
                    style={{ width: `${spendWidth}%` }}
                  />
                </div>
                <span
                  className={`w-14 text-right font-medium ${isOverBudget(p.spend) ? "text-overspend" : ""}`}
                >
                  {hasFigure(p.spend) ? spendLabel(p.spend) : "—"}
                </span>
              </div>
            </div>
            <p
              className={`text-[13px] font-medium ${ahead !== null && ahead > 0 ? "text-overspend" : ""}`}
            >
              {ahead === null
                ? `No spend figure: ${spendLabel(p.spend)}.`
                : ahead > 0
                  ? `Spend is ${ahead} points ahead of completion.`
                  : "Completion is level with or ahead of spend."}
            </p>
          </div>
          <RagSelector value={rag} onChange={setRag} disabled={p.readOnly} error={errors.rag} />
          <div className="flex flex-col gap-2 sm:col-span-3">
            <label htmlFor={ids.update} className="lbl">
              Weekly update
            </label>
            <textarea
              id={ids.update}
              rows={5}
              value={updateText}
              readOnly={p.readOnly}
              onChange={(e) => setUpdateText(e.target.value)}
              aria-invalid={errors.updateText ? true : undefined}
              aria-describedby={errors.updateText ? `${ids.update}-error` : undefined}
              className="resize-y border border-navy bg-white p-3 text-[14px] leading-normal"
            />
            <FormError id={`${ids.update}-error`}>{errors.updateText}</FormError>
          </div>
        </div>
        {!p.readOnly ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="submit">
              {state === "SUBMITTED" ? "Submit again" : "Submit update"}
            </Button>
            <Button variant="secondary" onClick={() => save("DRAFT")}>
              Save draft
            </Button>
          </div>
        ) : null}
      </form>
    </>
  );
}
