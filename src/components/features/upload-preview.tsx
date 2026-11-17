"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition, type KeyboardEvent } from "react";
import type { ActionResult } from "@/types/action-result";
import type { MissingDecision, SpendUploadChange } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { TableScroll, tableClass, tbodyRow, td, th, theadRow } from "./display";

type TabKey = "MISSING" | "NEW" | "RENAMED" | "MOVED" | "SPEND";

const TABS: { key: TabKey; label: string; colA: string; colB: string }[] = [
  { key: "MISSING", label: "Missing from file", colA: "Workstream", colB: "Decision" },
  { key: "NEW", label: "New projects", colA: "Workstream", colB: "% spend" },
  { key: "RENAMED", label: "Renamed", colA: "Was", colB: "Now" },
  { key: "MOVED", label: "Moved workstream", colA: "Was", colB: "Now" },
  { key: "SPEND", label: "% spend changed", colA: "Was", colB: "Now" },
];

function inTab(c: SpendUploadChange, k: TabKey): boolean {
  if (k === "MISSING") return c.type === "MISSING";
  if (k === "NEW") return c.type === "NEW";
  if (k === "MOVED") return c.type === "MOVED";
  if (k === "RENAMED") return c.type === "CHANGED" && c.field === "name";
  return c.type === "CHANGED" && c.field === "percentSpent";
}

/** True when every missing project has a decision (Confirm is disabled until then). */
export function allDecided(
  changes: readonly SpendUploadChange[],
  decisions: Record<string, MissingDecision>
): boolean {
  return changes.filter((c) => c.type === "MISSING").every((c) => !!decisions[c.id]);
}

export interface PreviewActions {
  decide: (changeId: string, decision: string) => Promise<ActionResult<null>>;
  confirm: (uploadId: string) => Promise<ActionResult<{ rows: number }>>;
  cancel: (uploadId: string) => Promise<ActionResult<null>>;
}

/**
 * Step 2 of 3: preview of changes, tabbed by type. Every project missing from the file needs a
 * decision, with nothing pre-selected (decision 17 Nov), saved as it's clicked; Confirm stays
 * disabled until then, and while the file has row errors.
 */
export function UploadPreview({
  uploadId,
  changes,
  fileChecks,
  rowErrors = [],
  clientName,
  rowCount,
  actions,
}: {
  uploadId: string;
  changes: SpendUploadChange[];
  fileChecks: string[];
  rowErrors?: { rowNumber: number; message: string }[];
  clientName: string;
  rowCount: number;
  actions: PreviewActions;
}) {
  const router = useRouter();
  const [pendingAction, start] = useTransition();
  const [tab, setTab] = useState<TabKey>(
    () => TABS.find((t) => changes.some((c) => inTab(c, t.key)))?.key ?? "MISSING"
  );
  const [decisions, setDecisions] = useState<Record<string, MissingDecision>>(() =>
    Object.fromEntries(
      changes.filter((c) => c.decision).map((c) => [c.id, c.decision as MissingDecision])
    )
  );
  const [done, setDone] = useState<"" | "confirmed" | "cancelled">("");
  const [error, setError] = useState("");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const panelId = useId();

  const missing = changes.filter((c) => c.type === "MISSING");
  const pending = missing.filter((c) => !decisions[c.id]).length;
  const ready = allDecided(changes, decisions) && rowErrors.length === 0;

  function decide(changeId: string, value: MissingDecision) {
    const before = decisions[changeId];
    setDecisions((s) => ({ ...s, [changeId]: value }));
    setError("");
    start(async () => {
      const r = await actions.decide(changeId, value);
      if (!r.ok) {
        setDecisions((s) => {
          const next = { ...s };
          if (before) next[changeId] = before;
          else delete next[changeId];
          return next;
        });
        setError(r.message);
      }
    });
  }

  function finish(kind: "confirmed" | "cancelled") {
    setError("");
    start(async () => {
      const r =
        kind === "confirmed" ? await actions.confirm(uploadId) : await actions.cancel(uploadId);
      if (r.ok) {
        setDone(kind);
        router.refresh();
      } else setError(r.message);
    });
  }
  const current = TABS.find((t) => t.key === tab)!;
  const rows = changes.filter((c) => inTab(c, tab));

  function onKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const last = TABS.length - 1;
    const next =
      e.key === "ArrowRight"
        ? i === last
          ? 0
          : i + 1
        : e.key === "ArrowLeft"
          ? i === 0
            ? last
            : i - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    setTab(TABS[next].key);
    tabRefs.current[next]?.focus();
  }

  if (done) {
    return (
      <div
        role="status"
        className={`mt-4 px-4 py-3.5 text-[14px] ${done === "confirmed" ? "bg-success-tint" : "bg-line-soft"}`}
      >
        <p className="font-medium">
          {done === "confirmed" ? "Upload confirmed." : "Upload cancelled."}
        </p>
        <p className="mt-1">
          {done === "confirmed"
            ? `${rowCount} records are now the live ${clientName} list. The history below shows it as Confirmed.`
            : "Nothing was changed. It stays in the history as Cancelled."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        role="status"
        className={`mt-4 mb-5 flex flex-wrap gap-x-6 gap-y-2 px-4 py-3 text-[14px] ${rowErrors.length ? "bg-warning-tint" : "bg-success-tint"}`}
      >
        <span className="font-medium">
          {rowErrors.length ? "File has rows with errors" : "File checks passed"}
        </span>
        {fileChecks.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      {rowErrors.length ? (
        <div className="mb-5">
          <h3 className="lbl mb-2">Rows with errors</h3>
          <ul className="grid gap-1 text-[14px]">
            {rowErrors.slice(0, 50).map((e) => (
              <li key={e.rowNumber}>
                <span className="font-medium">Row {e.rowNumber}:</span> {e.message}
              </li>
            ))}
          </ul>
          {rowErrors.length > 50 ? (
            <p className="mt-1 text-[13px] text-muted">…and {rowErrors.length - 50} more.</p>
          ) : null}
          <p className="mt-2 text-[13px]">
            Fix these in the source workbook, save it, and check the file again.
          </p>
        </div>
      ) : null}
      <div role="tablist" aria-label="Change type" className="mb-4 flex flex-wrap">
        {TABS.map((t, i) => {
          const on = t.key === tab;
          const n = changes.filter((c) => inTab(c, t.key)).length;
          return (
            <button
              key={t.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={panelId}
              tabIndex={on ? 0 : -1}
              onClick={() => setTab(t.key)}
              onKeyDown={(e) => onKey(e, i)}
              className={`-mr-px -mb-px min-h-11 cursor-pointer border border-navy px-4 text-[14px] ${on ? "bg-navy font-medium text-cream" : "bg-white"}`}
            >
              {t.label} ({n})
            </button>
          );
        })}
      </div>
      <div id={panelId} role="tabpanel" aria-label={current.label}>
        <TableScroll label={current.label}>
          <table className={`${tableClass} min-w-[640px]`}>
            <caption className="sr-only">{current.label}</caption>
            <thead>
              <tr className={theadRow}>
                <th scope="col" className={`${th} w-20 pl-0`}>
                  Job no.
                </th>
                <th scope="col" className={th}>
                  Project
                </th>
                <th scope="col" className={th}>
                  {current.colA}
                </th>
                <th scope="col" className={th}>
                  {current.colB}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const a = c.type === "MISSING" || c.type === "NEW" ? c.workstreamName : c.before;
                const b = c.after;
                const d = decisions[c.id];
                return (
                  <tr key={c.id} className={tbodyRow}>
                    <td className={`${td} pl-0 font-medium`}>{c.jobNumber}</td>
                    <td className={td}>{c.projectName}</td>
                    <td className={td}>{a}</td>
                    <td className={td}>
                      {c.type === "MISSING" ? (
                        <div
                          role="radiogroup"
                          aria-label={`Decision for ${c.jobNumber}`}
                          className="flex flex-wrap gap-1.5"
                        >
                          {(
                            [
                              ["KEEP", "Keep as is"],
                              ["MARK", 'Mark "No longer in file"'],
                            ] as const
                          ).map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              role="radio"
                              aria-checked={d === value}
                              onClick={() => decide(c.id, value)}
                              className={`min-h-11 cursor-pointer border border-navy px-3.5 text-[13px] ${d === value ? "bg-navy font-medium text-cream" : "bg-white"}`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className={c.field === "percentSpent" ? "font-medium" : ""}>{b}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableScroll>
        {tab === "MISSING" ? (
          <p className="mt-3 text-[13px] text-muted">
            Either way the project stays in the weekly report and lists; &quot;No longer in
            file&quot; is a note only.
          </p>
        ) : null}
      </div>
      <div className="mt-5.5 flex flex-wrap items-center gap-3.5 border-t border-line pt-4.5">
        <Button disabled={!ready || pendingAction} onClick={() => finish("confirmed")}>
          {pendingAction ? "Saving…" : "Confirm upload"}
        </Button>
        <Button variant="secondary" disabled={pendingAction} onClick={() => finish("cancelled")}>
          Cancel
        </Button>
        <span role="status" className={`text-[13px] font-medium ${ready ? "" : "text-overspend"}`}>
          {rowErrors.length
            ? "Confirm is off while the file has rows with errors."
            : ready
              ? `Ready to confirm: ${rowCount} records will replace the current ${clientName} list.`
              : `${pending} missing ${pending === 1 ? "project needs" : "projects need"} a decision before you can confirm.`}
        </span>
        {error ? (
          <p role="alert" className="w-full bg-warning-tint px-4 py-2.5 text-[14px] font-medium">
            {error}
          </p>
        ) : null}
      </div>
    </>
  );
}
