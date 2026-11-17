"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
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

/**
 * Step 2 of 3: preview of changes, tabbed by type. Every project missing from the file needs a
 * decision, with nothing pre-selected (decision 17 Nov); Confirm stays disabled until then.
 */
export function UploadPreview({
  changes,
  fileChecks,
  clientName,
  rowCount,
}: {
  changes: SpendUploadChange[];
  fileChecks: string[];
  clientName: string;
  rowCount: number;
}) {
  const [tab, setTab] = useState<TabKey>("MISSING");
  const [decisions, setDecisions] = useState<Record<string, MissingDecision>>({});
  const [done, setDone] = useState<"" | "confirmed" | "cancelled">("");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const panelId = useId();

  const missing = changes.filter((c) => c.type === "MISSING");
  const pending = missing.filter((c) => !decisions[c.id]).length;
  const ready = allDecided(changes, decisions);
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
        className={`px-4 py-3.5 text-[14px] ${done === "confirmed" ? "bg-success-tint" : "bg-line-soft"}`}
      >
        <p className="font-medium">
          {done === "confirmed"
            ? "Upload confirmed (sample only)."
            : "Upload cancelled (sample only)."}
        </p>
        <p className="mt-1">
          Nothing is saved yet: uploads start working in a later phase. In the real tool this
          {done === "confirmed"
            ? ` replaces the current ${clientName} list.`
            : " is kept in the history as Cancelled."}
        </p>
        <button
          type="button"
          onClick={() => setDone("")}
          className="mt-2 min-h-11 cursor-pointer underline"
        >
          Back to the preview
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        role="status"
        className="mt-4 mb-5 flex flex-wrap gap-x-6 gap-y-2 bg-success-tint px-4 py-3 text-[14px]"
      >
        <span className="font-medium">File checks passed</span>
        {fileChecks.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
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
                              onClick={() => setDecisions((s) => ({ ...s, [c.id]: value }))}
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
        <Button disabled={!ready} onClick={() => setDone("confirmed")}>
          Confirm upload
        </Button>
        <Button variant="secondary" onClick={() => setDone("cancelled")}>
          Cancel
        </Button>
        <span role="status" className={`text-[13px] font-medium ${ready ? "" : "text-overspend"}`}>
          {ready
            ? `Ready to confirm: ${rowCount} records will replace the current ${clientName} list.`
            : `${pending} missing ${pending === 1 ? "project needs" : "projects need"} a decision before you can confirm.`}
        </span>
      </div>
    </>
  );
}
