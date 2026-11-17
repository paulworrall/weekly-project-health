"use client";

import { useState } from "react";
import type { Workstream } from "@/types/domain";
import { formatDate } from "@/lib/dates";
import { TableScroll, tableClass, tbodyRow, th, theadRow } from "./display";

/**
 * Admin › Workstreams: the Reported setting and the free-text Account Director (decision
 * 17 Nov). Local state until brief 04.
 */
export function WorkstreamSettings({
  clientName,
  initial,
}: {
  clientName: string;
  initial: (Workstream & { projectCount: number })[];
}) {
  const [rows, setRows] = useState(initial);
  const [message, setMessage] = useState("");

  function update(id: string, patch: Partial<Workstream>, msg: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setMessage(msg);
  }

  return (
    <section aria-labelledby="ws-h" className="bg-white p-5 sm:p-7">
      <h2 id="ws-h" className="mb-1.5 text-[24px] font-light">
        Workstreams · {clientName}
      </h2>
      <p className="mb-4.5 text-[14px] text-muted">
        Workstreams come from the file. Only reported workstreams get a landing page and appear in
        reports; the rest are stored but hidden. The Account Director is shown on the workstream
        pages.
      </p>
      <p role="status" className="sr-only">
        {message}
      </p>
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
                      onChange={() =>
                        update(
                          w.id,
                          { reported: !w.reported },
                          `${w.name} is now ${w.reported ? "hidden" : "reported"}.`
                        )
                      }
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
                    aria-label={`Account Director for ${w.name}`}
                    onChange={(e) => update(w.id, { accountDirector: e.target.value || null }, "")}
                    onBlur={() => setMessage(`Account Director for ${w.name} updated.`)}
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
