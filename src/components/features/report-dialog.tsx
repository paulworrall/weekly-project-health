"use client";

/**
 * Generate report (brief 07; mockups ReportDialogClient / ReportDialogWorkstream): a button that
 * opens an accessible modal showing who has updated this week, then generates the HTML report
 * (new tab) or the PowerPoint (download).
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { ReportReadiness } from "@/types/report";
import { formatDayMonth, formatDate, londonDate } from "@/lib/dates";
import { buttonClasses } from "@/components/ui/button";
import { TableScroll, tableClass, tbodyRow, td, th, theadRow } from "./display";

type Format = "HTML" | "PPTX";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

function initialsOf(name: string | null): string {
  if (!name) return "—";
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

export function GenerateReport({
  kind,
  heading,
  context,
  readiness,
  htmlHref,
  pptxHref,
}: {
  kind: "client" | "workstream";
  /** "Northwind Drinks weekly report · Week 47". */
  heading: string;
  /** Text before the week dates on the workstream dialog: the client name. */
  context?: string;
  readiness: ReportReadiness;
  htmlHref: string;
  pptxHref: string;
}) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<Format>("HTML");
  const [status, setStatus] = useState("");
  const opener = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const r = readiness;
  const notUpdated = r.inReport - r.submitted;

  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLElement>("h2")?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    opener.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== "Tab" || !panel.current) return;
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (
      e.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === panel.current?.querySelector("h2"))
    ) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const share = (n: number) => (r.inReport ? (n / r.inReport) * 100 : 0);
  const lastSubmitted = (at: string | null, withYear: boolean) =>
    at
      ? withYear
        ? formatDate(londonDate(new Date(at)))
        : formatDayMonth(londonDate(new Date(at)))
      : "Never";

  return (
    <>
      <button
        ref={opener}
        type="button"
        className={buttonClasses("primary", "md")}
        onClick={() => {
          setStatus("");
          setOpen(true);
        }}
      >
        Generate report
      </button>
      <p role="status" className="sr-only">
        {status}
      </p>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/60 px-4 py-8"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            onKeyDown={onKeyDown}
            className={`w-full ${kind === "client" ? "max-w-[1080px]" : "max-w-[760px]"} border-t-4 border-orange bg-white p-6 text-navy sm:p-8`}
          >
            <p className="eyebrow mb-2">Generate report</p>
            <h2
              id={headingId}
              tabIndex={-1}
              className="text-[30px] leading-tight font-light outline-none"
            >
              {heading}
            </h2>
            <p className="mt-2 text-[15px]">
              {context ? `${context} · ` : ""}
              {r.weekDates}.{kind === "workstream" ? " Covers this workstream only." : ""}{" "}
              {r.open
                ? `The week is still open (it closes ${r.closesText}), so the report uses the latest submitted updates as of now: ${r.asOfText}.`
                : `Week ${r.weekKey.slice(-2).replace(/^0/, "")} has closed, so its figures are final. The report shows them as they were at the close.`}
            </p>

            <div
              className={`mt-6 grid gap-8 ${kind === "client" ? "lg:grid-cols-[1fr_1.1fr]" : ""}`}
            >
              <div>
                <p className="text-[18px] font-medium">
                  {r.submitted} of {r.inReport} projects updated this week
                </p>
                <div
                  role="img"
                  aria-label={
                    r.open
                      ? `${r.submitted} submitted, ${r.draft} draft saved, ${r.notStarted} not started, of ${r.inReport} projects in the weekly report`
                      : `${r.submitted} updated and ${notUpdated} not updated, of ${r.inReport} projects in the weekly report`
                  }
                  className="mt-3 flex h-3 w-full bg-track"
                >
                  <span className="bg-navy" style={{ width: `${share(r.submitted)}%` }} />
                  <span className="bg-rag-amber" style={{ width: `${share(r.draft)}%` }} />
                </div>
                <p className="mt-2 text-[13px]">
                  {r.open
                    ? `${r.submitted} submitted · ${r.draft} draft saved, not submitted · ${r.notStarted} not started`
                    : `${r.submitted} updated · ${notUpdated} not updated`}
                </p>

                {kind === "client" ? (
                  <TableScroll label="Updates by workstream">
                    <table className={`${tableClass} mt-5`}>
                      <caption className="lbl mb-2 text-left">Updates by workstream</caption>
                      <thead>
                        <tr className={theadRow}>
                          <th scope="col" className={`${th} pl-0`}>
                            Workstream
                          </th>
                          <th scope="col" className={`${th} text-right`}>
                            In report
                          </th>
                          <th scope="col" className={`${th} text-right`}>
                            Updated
                          </th>
                          <th scope="col" className={th}>
                            Not updated
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.byWorkstream.map((w) => (
                          <tr key={w.name} className={tbodyRow}>
                            <td className={`${td} pl-0`}>{w.name}</td>
                            <td className={`${td} text-right`}>{w.inReport}</td>
                            <td className={`${td} text-right`}>{w.updated}</td>
                            <td className={td}>
                              {w.inReport === 0
                                ? "—"
                                : w.notUpdated === 0
                                  ? "All updated"
                                  : w.notUpdated}
                            </td>
                          </tr>
                        ))}
                        <tr className="font-medium">
                          <td className={`${td} pl-0`}>Total</td>
                          <td className={`${td} text-right`}>{r.inReport}</td>
                          <td className={`${td} text-right`}>{r.submitted}</td>
                          <td className={td}>{notUpdated === 0 ? "All updated" : notUpdated}</td>
                        </tr>
                      </tbody>
                    </table>
                  </TableScroll>
                ) : null}
              </div>

              <div>
                {r.notUpdated.length ? (
                  <>
                    <TableScroll label={`Not updated this week (${r.notUpdated.length})`}>
                      <table className={tableClass}>
                        <caption className="lbl mb-2 text-left">
                          Not updated this week ({r.notUpdated.length})
                        </caption>
                        <thead>
                          <tr className={theadRow}>
                            <th scope="col" className={`${th} pl-0`}>
                              Project
                            </th>
                            {kind === "workstream" ? (
                              <th scope="col" className={th}>
                                Last submitted by
                              </th>
                            ) : null}
                            <th scope="col" className={th}>
                              Last submitted
                            </th>
                            <th scope="col" className={th}>
                              This week
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.notUpdated.map((p) => (
                            <tr key={p.jobNumber} className={tbodyRow}>
                              <td className={`${td} pl-0`}>
                                <span className="font-medium">{p.jobNumber}</span> {p.name}
                                {kind === "client" ? (
                                  <span className="block text-[12px] text-muted">
                                    {p.workstreamName} · {initialsOf(p.lastSubmittedBy)}
                                  </span>
                                ) : null}
                              </td>
                              {kind === "workstream" ? (
                                <td className={td}>{initialsOf(p.lastSubmittedBy)}</td>
                              ) : null}
                              <td className={`${td} whitespace-nowrap`}>
                                {lastSubmitted(p.lastSubmittedAt, kind === "workstream")}
                              </td>
                              <td className={td}>
                                <span
                                  className={`inline-flex min-h-7 items-center rounded-full px-3 text-[12px] font-medium whitespace-nowrap ${
                                    p.state === "DRAFT"
                                      ? "border border-navy bg-pinned"
                                      : "bg-warning-tint"
                                  }`}
                                >
                                  {p.state === "DRAFT"
                                    ? "Draft saved"
                                    : p.state === "NOT_STARTED"
                                      ? "Not started"
                                      : "Not updated"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </TableScroll>
                    <p className="mt-4 bg-pinned px-4 py-3 text-[14px]">
                      {r.notUpdated.length === 1
                        ? "This project appears in the report with its last submitted values, marked Not updated."
                        : `These ${r.notUpdated.length} projects appear in the report with their last submitted values, marked Not updated.`}
                      {kind === "client"
                        ? r.open
                          ? " Drafts aren't used. To include their latest news, ask the PMs to submit first, then generate the report again."
                          : " Drafts aren't used."
                        : ""}
                    </p>
                  </>
                ) : (
                  <p className="bg-success-tint px-4 py-3 text-[14px]">
                    {r.inReport
                      ? "Every project in the weekly report has been updated this week."
                      : "No projects are in the weekly report yet."}
                  </p>
                )}
              </div>
            </div>

            <fieldset className="mt-6 border-t border-line pt-5">
              <legend className="lbl mb-3">Format</legend>
              <div className="flex flex-wrap gap-6 text-[15px]">
                <label className="flex min-h-11 items-center gap-2.5">
                  <input
                    type="radio"
                    name="report-format"
                    value="HTML"
                    checked={format === "HTML"}
                    onChange={() => setFormat("HTML")}
                    className="size-5 accent-navy"
                  />
                  {kind === "client" ? "HTML report (opens in a new tab)" : "HTML report"}
                </label>
                <label className="flex min-h-11 items-center gap-2.5">
                  <input
                    type="radio"
                    name="report-format"
                    value="PPTX"
                    checked={format === "PPTX"}
                    onChange={() => setFormat("PPTX")}
                    className="size-5 accent-navy"
                  />
                  {kind === "client" ? "PowerPoint (.pptx download)" : "PowerPoint (.pptx)"}
                </label>
              </div>
            </fieldset>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" className={buttonClasses("secondary", "md")} onClick={close}>
                Cancel
              </button>
              {format === "HTML" ? (
                <a
                  href={htmlHref}
                  target="_blank"
                  rel="noopener"
                  className={buttonClasses("primary", "md")}
                  onClick={() => {
                    setStatus("The report has opened in a new tab.");
                    close();
                  }}
                >
                  Generate report
                </a>
              ) : (
                <a
                  href={pptxHref}
                  download
                  className={buttonClasses("primary", "md")}
                  onClick={() => {
                    setStatus("Your PowerPoint is downloading.");
                    close();
                  }}
                >
                  Generate PowerPoint
                </a>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
