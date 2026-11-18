import type { Metadata } from "next";
import Link from "next/link";
import { TableScroll, tableClass, tbodyRow, td, th, theadRow } from "@/components/features/display";
import { Forbidden } from "@/components/features/forbidden";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { formatDateTime } from "@/lib/dates";
import {
  WHAT_GROUPS,
  historyHref,
  parseHistoryFilters,
  showingText,
  type WhatGroup,
} from "@/lib/history";
import { canAdminister } from "@/lib/permissions";
import { requireViewer } from "@/lib/viewer";
import { loadHistory } from "@/server/history";

export const metadata: Metadata = { title: "Change history" };

const ACTION = {
  CREATE: "Created",
  UPDATE: "Changed",
  ARCHIVE: "Archived",
  RESTORE: "Restored",
  GENERATE: "Generated",
} as const;

const control = "min-h-11 w-full cursor-pointer border border-navy bg-white px-3 text-[14px]";

/** Admin › Change history (brief 08): filter by who, what and dates; 50 changes a page. */
export default async function HistoryPage(props: PageProps<"/admin/history">) {
  const viewer = await requireViewer();
  if (!canAdminister(viewer)) return <Forbidden backHref="/clients" />;
  const f = parseHistoryFilters(await props.searchParams);
  const { rows, info, people } = await loadHistory(f);
  const filtered = !!(f.who || f.what || f.from || f.to);

  return (
    <>
      <PageHeader
        eyebrow="Admin · Change history"
        title="Change history"
        meta="Every change to user-entered data, every report generated and every week close: who, when, what, and the old and new values. Nothing here can be edited."
        internal
      />
      <section aria-labelledby="hist-filters" className="mt-6 bg-white p-5 sm:p-7">
        <h2 id="hist-filters" className="sr-only">
          Filters
        </h2>
        <form method="get" action="/admin/history" className="grid gap-4 md:grid-cols-5">
          <label className="flex flex-col gap-1.5 text-[14px]">
            <span className="lbl">Who</span>
            <select name="who" defaultValue={f.who} className={control}>
              <option value="">Anyone</option>
              <option value="system">System (automatic week close)</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[14px]">
            <span className="lbl">What</span>
            <select name="what" defaultValue={f.what} className={control}>
              <option value="">Everything</option>
              {(Object.keys(WHAT_GROUPS) as WhatGroup[]).map((k) => (
                <option key={k} value={k}>
                  {WHAT_GROUPS[k].label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[14px]">
            <span className="lbl">From</span>
            <input type="date" name="from" defaultValue={f.from ?? ""} className={control} />
          </label>
          <label className="flex flex-col gap-1.5 text-[14px]">
            <span className="lbl">To</span>
            <input type="date" name="to" defaultValue={f.to ?? ""} className={control} />
          </label>
          <div className="flex items-end gap-3">
            <Button type="submit">Show changes</Button>
            {filtered ? (
              <ButtonLink href="/admin/history" variant="ghost">
                Clear
              </ButtonLink>
            ) : null}
          </div>
        </form>
      </section>

      <section aria-labelledby="hist-h" className="mt-6 bg-white p-5 sm:p-7">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="hist-h" className="text-[24px] font-light">
            Changes
          </h2>
          <p role="status" className="text-[14px]">
            {showingText(info, filtered)}
          </p>
        </div>
        {rows.length ? (
          <TableScroll label="Changes">
            <table className={`${tableClass} min-w-[1100px]`}>
              <caption className="sr-only">
                Changes, newest first. {showingText(info, filtered)}
              </caption>
              <thead>
                <tr className={theadRow}>
                  <th scope="col" className={`${th} pl-0`}>
                    When
                  </th>
                  <th scope="col" className={th}>
                    Who
                  </th>
                  <th scope="col" className={th}>
                    What
                  </th>
                  <th scope="col" className={th}>
                    Record
                  </th>
                  <th scope="col" className={th}>
                    Field
                  </th>
                  <th scope="col" className={th}>
                    Old value
                  </th>
                  <th scope="col" className={th}>
                    New value
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className={`${tbodyRow} align-top`}>
                    <td className={`${td} pl-0 whitespace-nowrap`}>{formatDateTime(e.at)}</td>
                    <td className={td}>{e.who}</td>
                    <td className={`${td} whitespace-nowrap`}>
                      {ACTION[e.action]} · {e.entity}
                    </td>
                    <td className={`${td} max-w-[280px] break-words`}>{e.record}</td>
                    <td className={td}>{e.field === "*" ? "—" : e.field}</td>
                    <td className={`${td} max-w-[260px] break-words`}>{e.oldValue ?? "—"}</td>
                    <td className={`${td} max-w-[260px] break-words`}>{e.newValue ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        ) : null}
        {info.pages > 1 ? (
          <nav aria-label="Pages" className="mt-5 flex flex-wrap items-center gap-3 text-[14px]">
            {info.page > 1 ? (
              <Link
                href={historyHref(f, { page: info.page - 1 })}
                className="inline-flex min-h-11 items-center"
              >
                ← Newer
              </Link>
            ) : null}
            <span aria-current="page">
              Page {info.page} of {info.pages}
            </span>
            {info.page < info.pages ? (
              <Link
                href={historyHref(f, { page: info.page + 1 })}
                className="inline-flex min-h-11 items-center"
              >
                Older →
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </>
  );
}
