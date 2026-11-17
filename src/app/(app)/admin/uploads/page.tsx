import type { Metadata } from "next";
import { StatTile } from "@/components/ui/stat-tile";
import { Forbidden } from "@/components/features/forbidden";
import {
  TableScroll,
  Tag,
  tableClass,
  tbodyRow,
  td,
  th,
  theadRow,
} from "@/components/features/display";
import { UploadForm } from "@/components/features/upload-form";
import { UploadPreview } from "@/components/features/upload-preview";
import { WorkstreamSettings } from "@/components/features/workstream-settings";
import {
  addDays,
  formatDate,
  formatDateTime,
  formatDayMonth,
  formatTime,
  formatWeekdayDayMonth,
} from "@/lib/dates";
import { canAdminister } from "@/lib/permissions";
import { requireViewer } from "@/lib/viewer";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepository } from "@/server/repository";
import type { UploadStatus } from "@/types/domain";

export const metadata: Metadata = { title: "Spend uploads" };

const STATUS: Record<
  UploadStatus,
  { label: string; tone: "navy" | "warning" | "outline" | "muted" }
> = {
  LIVE: { label: "Confirmed", tone: "navy" },
  REPLACED: { label: "Confirmed", tone: "navy" },
  REJECTED: { label: "Rejected", tone: "warning" },
  CANCELLED: { label: "Cancelled", tone: "outline" },
  CHECKING: { label: "Checking", tone: "muted" },
  READY_TO_REVIEW: { label: "Ready to review", tone: "muted" },
};

export default async function UploadsPage(props: PageProps<"/admin/uploads">) {
  const viewer = await requireViewer();
  const repo = await getRepository();
  if (!canAdminister(viewer)) return <Forbidden backHref="/clients" />;
  const { client } = await props.searchParams;
  const v = repo.getUploadsView(typeof client === "string" ? client : repo.defaultClientId);
  if (!v) notFound();
  const staged = v.staged;
  const week = repo.resolveWeek(undefined);
  const s = v.latestStats;
  const up = v.latest?.upload;
  const changes = (t: string, f?: string) =>
    (staged?.changes ?? []).filter((c) => c.type === t && (!f || c.field === f)).length;
  const dash = (n: number | null) => (n === null ? "—" : n);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0 flex-[1_1_520px]">
          <p className="eyebrow mb-2.5">Admin · Spend uploads · {week.label}</p>
          <h1 className="text-[40px] leading-tight font-light sm:text-[48px]">Spend uploads</h1>
          <p className="mt-2.5 text-[15px]">
            One file per client, each week. Every upload is checked, previewed and confirmed before
            anything is saved. Nothing is deleted.
          </p>
        </div>
        <nav aria-label="Client" className="flex flex-col gap-1.5">
          <span className="lbl">Client</span>
          <ul className="flex flex-wrap">
            {v.clients.map((c) => {
              const on = c.id === v.client.id;
              return (
                <li key={c.id} className="-ml-px first:ml-0">
                  <Link
                    href={`/admin/uploads?client=${c.id}`}
                    aria-current={on ? "page" : undefined}
                    className={`flex min-h-11 items-center border border-navy px-4 text-[14px] no-underline ${on ? "bg-navy font-medium text-cream hover:text-cream" : "bg-white"}`}
                  >
                    {c.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <h2 className="mb-3.5 text-[26px] font-light">Latest upload · {v.client.name}</h2>
      <section
        aria-label="Latest upload"
        className="mb-10 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4"
      >
        <StatTile
          variant="navy"
          label="Uploaded"
          value={
            <span className="text-[28px]">{up ? formatDate(up.uploadedAt.slice(0, 10)) : "—"}</span>
          }
          sub={
            up ? (
              <>
                {formatTime(up.uploadedAt)} by {v.latest?.uploadedByName}
                <br />
                Extract date {formatDate(up.extractDate)} · next due by{" "}
                {formatWeekdayDayMonth(addDays(week.closeDate, 3))}
              </>
            ) : (
              "No upload yet"
            )
          }
        />
        <StatTile
          label="Records"
          value={s.records}
          sub={
            <>
              {s.reportedRecords} in reported workstreams
              <br />
              {s.hiddenRecords} hidden · 0 rejected rows
            </>
          }
        />
        <StatTile
          label="Workstreams"
          value={s.workstreams}
          sub={
            <>
              {s.reportedWorkstreams} reported · {s.workstreams - s.reportedWorkstreams} hidden
              <br />
              {s.newWorkstreams} new this upload
            </>
          }
        />
        <div className="bg-white p-5">
          <p className="lbl">% spend</p>
          <dl className="mt-3 grid gap-1 text-[14px]">
            {(
              [
                ["With a figure", s.withFigure, ""],
                ["Over budget", s.overBudget, "text-overspend"],
                ["Add budget", s.noBudget, ""],
                ["No timesheet data", s.noTimesheet, ""],
              ] as const
            ).map(([k, n, cls]) => (
              <div key={k} className="flex justify-between">
                <dt>{k}</dt>
                <dd className={`font-medium ${cls}`}>{n}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="bg-white p-5">
          <p className="lbl">
            Changes vs {v.previousUploadDate ? formatDayMonth(v.previousUploadDate) : "previous"}
          </p>
          <dl className="mt-3 grid gap-1 text-[14px]">
            {(
              [
                ["New projects", up?.newCount ?? null],
                ["% spend changed", up?.changedCount ?? null],
                ["Missing from file", up?.missingCount ?? null],
              ] as const
            ).map(([k, n]) => (
              <div key={k} className="flex justify-between">
                <dt>{k}</dt>
                <dd className="font-medium">{dash(n)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mb-10 flex flex-wrap gap-4">
        <section aria-labelledby="new-h" className="min-w-0 flex-[1_1_400px] bg-white p-5 sm:p-7">
          <h2 id="new-h" className="mb-1.5 text-[24px] font-light">
            Upload a new file
          </h2>
          <p className="mb-5 text-[14px] text-muted">
            Step 1 of 3: choose the file. Then check the preview and confirm.
          </p>
          <UploadForm clients={v.clients} today={week.asOf} />
        </section>
        <section aria-labelledby="prev-h" className="min-w-0 flex-[2_1_640px] bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2.5">
            <h2 id="prev-h" className="text-[24px] font-light">
              Preview of changes
            </h2>
            <span className="text-[13px] text-muted">Step 2 of 3 · nothing saved yet</span>
          </div>
          {staged ? (
            <>
              <p className="mt-2 text-[14px]">
                {staged.upload.fileName} · checked {formatDateTime(staged.upload.uploadedAt)} ·{" "}
                {changes("NEW")} new, {changes("CHANGED", "name")} renamed, {changes("MOVED")}{" "}
                moved, {changes("CHANGED", "percentSpent")} % spend changed, {changes("MISSING")}{" "}
                missing (sample)
              </p>
              <UploadPreview
                changes={staged.changes}
                fileChecks={staged.fileChecks}
                clientName={v.client.name}
                rowCount={staged.upload.rowCount ?? 0}
              />
            </>
          ) : (
            <p className="mt-4 text-[14px]">
              No file is waiting for review for {v.client.name}. Check a file in step 1 to see its
              changes here.
            </p>
          )}
        </section>
      </div>

      <section aria-labelledby="hist-h" className="mb-6 bg-white p-5 sm:p-7">
        <h2 id="hist-h" className="mb-1.5 text-[24px] font-light">
          Upload history
        </h2>
        <p className="mb-4.5 text-[14px] text-muted">
          Every upload attempt is kept, including cancelled and rejected files.
        </p>
        <TableScroll label="Upload history">
          <table className={`${tableClass} min-w-[1180px]`}>
            <caption className="sr-only">Upload history</caption>
            <thead>
              <tr className={theadRow}>
                <th scope="col" className={`${th} pl-0`}>
                  Uploaded
                </th>
                <th scope="col" className={th}>
                  Client
                </th>
                <th scope="col" className={th}>
                  Extract date
                </th>
                <th scope="col" className={th}>
                  File
                </th>
                <th scope="col" className={th}>
                  By
                </th>
                <th scope="col" className={`${th} text-right`}>
                  Records
                </th>
                <th scope="col" className={`${th} text-right`}>
                  New
                </th>
                <th scope="col" className={`${th} text-right`}>
                  Changed
                </th>
                <th scope="col" className={`${th} text-right`}>
                  Missing
                </th>
                <th scope="col" className={`${th} text-right`}>
                  Errors
                </th>
                <th scope="col" className={th}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {v.history.map(({ upload: h, uploadedByName }) => (
                <tr key={h.id} className={tbodyRow}>
                  <td className={`${td} pl-0 whitespace-nowrap`}>{formatDateTime(h.uploadedAt)}</td>
                  <td className={td}>{v.client.name}</td>
                  <td className={`${td} whitespace-nowrap`}>{formatDate(h.extractDate)}</td>
                  <td className={td}>{h.fileName}</td>
                  <td className={td}>{uploadedByName}</td>
                  <td className={`${td} text-right`}>{dash(h.rowCount)}</td>
                  <td className={`${td} text-right`}>{dash(h.newCount)}</td>
                  <td className={`${td} text-right`}>{dash(h.changedCount)}</td>
                  <td className={`${td} text-right`}>{dash(h.missingCount)}</td>
                  <td className={`${td} text-right`}>{h.errorCount}</td>
                  <td className={td}>
                    <Tag tone={STATUS[h.status].tone}>{STATUS[h.status].label}</Tag>
                    {h.note ? <p className="mt-1.5 max-w-[260px] text-[12px]">{h.note}</p> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </section>

      <WorkstreamSettings clientName={v.client.name} initial={v.workstreams} />
    </>
  );
}
