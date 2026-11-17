"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Workstream } from "@/types/domain";
import type { ActionResult } from "@/types/action-result";
import { formatDate } from "@/lib/dates";
import { TableScroll, tableClass, tbodyRow, th, theadRow } from "./display";

export interface WorkstreamActions {
  setReported: (workstreamId: string, reported: boolean) => Promise<ActionResult<null>>;
  setAccountDirector: (
    workstreamId: string,
    name: string
  ) => Promise<ActionResult<{ accountDirector: string | null }>>;
}

/**
 * Admin › Workstreams: the Reported setting and the free-text Account Director (decision
 * 17 Nov). Each change saves straight away and is recorded in the change history.
 */
export function WorkstreamSettings({
  clientName,
  initial,
  actions,
}: {
  clientName: string;
  initial: (Workstream & { projectCount: number })[];
  actions: WorkstreamActions;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [rows, setRows] = useState(initial);
  const [saved, setSaved] = useState(() =>
    Object.fromEntries(initial.map((w) => [w.id, w.accountDirector ?? ""]))
  );
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const patch = (id: string, p: Partial<Workstream>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  function toggle(w: Workstream) {
    const next = !w.reported;
    patch(w.id, { reported: next });
    start(async () => {
      const r = await actions.setReported(w.id, next);
      if (r.ok) {
        setMessage({ tone: "ok", text: `${w.name} is now ${next ? "reported" : "hidden"}.` });
        router.refresh();
      } else {
        patch(w.id, { reported: !next });
        setMessage({ tone: "bad", text: r.message });
      }
    });
  }

  function saveAd(w: Workstream) {
    const value = (w.accountDirector ?? "").trim();
    if (value === saved[w.id]) return;
    start(async () => {
      const r = await actions.setAccountDirector(w.id, value);
      if (r.ok) {
        setSaved((s) => ({ ...s, [w.id]: r.data.accountDirector ?? "" }));
        setMessage({
          tone: "ok",
          text: r.data.accountDirector
            ? `Account Director for ${w.name} saved.`
            : `Account Director for ${w.name} cleared.`,
        });
        router.refresh();
      } else {
        setMessage({ tone: "bad", text: r.fieldErrors?.accountDirector ?? r.message });
      }
    });
  }

  return (
    <section aria-labelledby="ws-h" className="bg-white p-5 sm:p-7">
      <h2 id="ws-h" className="mb-1.5 text-[24px] font-light">
        Workstreams · {clientName}
      </h2>
      <p className="mb-4.5 text-[14px] text-muted">
        Workstreams come from the file. Only reported workstreams get a landing page and appear in
        reports; the rest are stored but hidden. The Account Director is shown on the workstream
        pages. Changes save straight away.
      </p>
      {message ? (
        <p
          role={message.tone === "bad" ? "alert" : "status"}
          className={`mb-4 px-4 py-2.5 text-[14px] ${message.tone === "bad" ? "bg-warning-tint font-medium" : "bg-success-tint"}`}
        >
          {message.text}
        </p>
      ) : null}
      <TableScroll label="Workstreams">
        <table className={`${tableClass} min-w-[860px]`}>
          <caption className="sr-only">
            Workstreams, whether they are reported, and their Account Director
          </caption>
          <thead>
            <tr className={theadRow}>
              <th scope="col" className={`${th} pl-0`}>
                Workstream (as in file)
              </th>
              <th scope="col" className={`${th} text-right`}>
                Projects
              </th>
              <th scope="col" className={th}>
                First seen
              </th>
              <th scope="col" className={th}>
                Reported
              </th>
              <th scope="col" className={th}>
                Account Director
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id} className={tbodyRow}>
                <th scope="row" className="py-2.5 pr-2.5 text-left font-normal">
                  {w.name}
                </th>
                <td className="px-2.5 py-2.5 text-right">{w.projectCount}</td>
                <td className="px-2.5 py-2.5">{formatDate(w.firstSeen)}</td>
                <td className="px-2.5 py-1.5">
                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={w.reported}
                      onChange={() => toggle(w)}
                      aria-label={`${w.name}: reported`}
                      className="size-5.5 accent-navy"
                    />
                    <span>{w.reported ? "Reported" : "Hidden"}</span>
                  </label>
                </td>
                <td className="px-2.5 py-1.5">
                  <input
                    type="text"
                    value={w.accountDirector ?? ""}
                    placeholder="Not set"
                    maxLength={80}
                    aria-label={`Account Director for ${w.name}`}
                    onChange={(e) => patch(w.id, { accountDirector: e.target.value })}
                    onBlur={() => saveAd(w)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                    className="min-h-11 w-full max-w-[240px] border border-line-strong bg-white px-3 text-[14px]"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </section>
  );
}
