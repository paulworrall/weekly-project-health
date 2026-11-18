import Link from "next/link";
import type { ClientOverview } from "@/types/views";
import { formatDate } from "@/lib/dates";
import { withWeek } from "@/lib/links";
import { tileValue } from "@/lib/pipeline";
import { Delta, RagBar } from "./display";

const linkBtn = "inline-flex min-h-11 items-center px-5 text-[14px] font-medium no-underline";

/** One client's weekly roll-up with links to its workstreams (Admin home and the client list). */
export function ClientCard({ c }: { c: ClientOverview }) {
  const t = c.totals;
  const href = withWeek(`/clients/${c.client.id}`, c.week);
  return (
    <article className="border-t-4 border-navy bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-[30px] font-light">
            <Link href={href} className="no-underline">
              {c.client.name}
            </Link>
          </h3>
          <p className="mt-1.5 text-[14px] text-muted">
            {c.workstreams.length} reported workstreams · {t.inReport} projects in weekly report ·
            spend upload {formatDate(c.latestUpload?.upload.extractDate)}
          </p>
        </div>
        <Link href={href} className={`${linkBtn} bg-navy text-cream hover:text-cream`}>
          Open {c.client.name} overview →
        </Link>
      </div>
      <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4 border-t border-line pt-5">
        <div>
          <p className="lbl">Updates this week</p>
          <p className="mt-1.5 text-[30px] font-light">
            {t.submitted} <span className="text-[16px]">of {t.inReport}</span>
          </p>
        </div>
        <div>
          <p className="lbl">Delivery RAG</p>
          <div className="mt-3">
            <RagBar counts={t.rag} height={10} subject={`${c.client.name} Delivery RAG`} />
          </div>
        </div>
        <div>
          <p className="lbl">Open risks</p>
          <p className="mt-1.5 text-[30px] font-light">
            {t.risks} <Delta now={t.risks} prev={t.risksPrev} className="text-[14px] font-medium" />
          </p>
        </div>
        <div>
          <p className="lbl">Open issues</p>
          <p className="mt-1.5 text-[30px] font-light">
            {t.issues}{" "}
            <Delta now={t.issues} prev={t.issuesPrev} className="text-[14px] font-medium" />
          </p>
        </div>
        <div>
          <p className="lbl">Over budget</p>
          <p className="mt-1.5 text-[30px] font-light text-overspend">{t.spend.over100}</p>
        </div>
        <div>
          <p className="lbl">Pipeline</p>
          <p className="mt-1.5 text-[30px] font-light">
            {tileValue(t.pipelineValue, t.pipeline, t.pipelineNotValued)}
          </p>
          <p className="text-[13px]">
            {t.pipeline} {t.pipeline === 1 ? "opportunity" : "opportunities"} · {t.pipelineHigh}{" "}
            High
          </p>
        </div>
      </div>
      {t.inReport === 0 ? (
        <p className="mt-4 bg-pinned px-4 py-2.5 text-[14px]">
          No projects are in the weekly report yet. Open a workstream and tick the projects to
          report on.
        </p>
      ) : null}
      <nav aria-label={`${c.client.name} workstreams`} className="mt-5 flex flex-wrap gap-2">
        {c.workstreams.map((w) => {
          const all = w.tiles.inReport > 0 && w.tiles.submitted === w.tiles.inReport;
          return (
            <Link
              key={w.workstream.id}
              href={withWeek(`/clients/${c.client.id}/workstreams/${w.workstream.id}`, c.week)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-navy px-4 text-[14px] no-underline"
            >
              {w.workstream.name}
              <span className="text-[12px] text-muted">
                {w.tiles.inReport === 0
                  ? "none in report"
                  : all
                    ? "all updated"
                    : `${w.tiles.submitted} of ${w.tiles.inReport} updated`}
              </span>
            </Link>
          );
        })}
      </nav>
    </article>
  );
}
