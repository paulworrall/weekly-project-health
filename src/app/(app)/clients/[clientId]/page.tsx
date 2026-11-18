import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Delta,
  RagBar,
  SpendCell,
  TableScroll,
  Tag,
  tableClass,
  tbodyRow,
  td,
  th,
  theadRow,
} from "@/components/features/display";
import { ClosedWeekNote, WeekPicker } from "@/components/features/week";
import { RagBadge } from "@/components/ui/rag-badge";
import { StatTile } from "@/components/ui/stat-tile";
import { InternalPill } from "@/components/ui/pill";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { formatDate, formatWeekdayDayMonth } from "@/lib/dates";
import { reportLinks, withWeek } from "@/lib/links";
import { reportReadiness } from "@/lib/report";
import { GenerateReport } from "@/components/features/report-dialog";
import { tileValue } from "@/lib/pipeline";
import { requireViewer } from "@/lib/viewer";
import { getRepository } from "@/server/repository";

export const metadata: Metadata = { title: "Client overview" };

const btnOutline =
  "inline-flex min-h-11 items-center border border-navy bg-white px-4.5 text-[14px] font-medium no-underline";

export default async function ClientPage(props: PageProps<"/clients/[clientId]">) {
  await requireViewer();
  const { week: weekParam } = await props.searchParams;
  const repo = await getRepository(weekParam);
  const { clientId } = await props.params;
  const v = repo.getClientOverview(clientId, weekParam);
  if (!v) notFound();
  const t = v.totals;
  const base = `/clients/${v.client.id}`;
  const readiness = reportReadiness(repo, { clientId: v.client.id }, v.week.key, repo.now());
  const links = reportLinks(v.client.id, v.week.key);

  return (
    <>
      <Breadcrumb items={[{ label: "Clients" }, { label: v.client.name }]} />
      <ClosedWeekNote week={v.week} basePath={base} />
      <div className="mt-2 mb-6 flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0 flex-[1_1_520px]">
          <p className="eyebrow mb-2.5">Client overview · {v.week.label}</p>
          <h1 className="text-[40px] leading-tight font-light sm:text-[48px]">{v.client.name}</h1>
          <p className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[15px]">
            <span>
              {v.workstreams.length} reported workstreams · {t.inReport} projects in weekly report ·
              Spend upload {formatDate(v.latestUpload?.upload.extractDate)} ·
            </span>
            <InternalPill />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <WeekPicker weeks={v.weeks} value={v.week.key} />
          <Link href={withWeek(`${base}/risks`, v.week)} className={btnOutline}>
            Risks report
          </Link>
          <Link href={withWeek(`${base}/issues`, v.week)} className={btnOutline}>
            Issues report
          </Link>
          {readiness ? (
            <GenerateReport
              kind="client"
              heading={`${v.client.name} weekly report · Week ${v.week.ref.isoWeek}`}
              readiness={readiness}
              htmlHref={links.html}
              pptxHref={links.pptx}
            />
          ) : null}
        </div>
      </div>

      <section
        aria-label="Client weekly summary"
        className="mb-10 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4"
      >
        <StatTile
          variant="navy"
          label="In weekly report"
          value={t.inReport}
          sub={`projects across ${v.workstreams.length} workstreams`}
        />
        <StatTile
          label="Updates this week"
          value={
            <>
              {t.submitted} <span className="text-[18px]">of {t.inReport}</span>
            </>
          }
          sub={v.week.closed ? "week closed" : `due ${formatWeekdayDayMonth(v.week.closeDate)}`}
        />
        <div className="bg-white p-5">
          <p className="lbl">Delivery RAG</p>
          <div className="mt-4">
            <RagBar counts={t.rag} subject={`${v.client.name} Delivery RAG`} />
          </div>
        </div>
        <StatTile
          label="Open risks"
          value={
            <>
              {t.risks}{" "}
              <Delta now={t.risks} prev={t.risksPrev} className="text-[15px] font-medium" />
            </>
          }
          sub={`${t.risksPrev} last week`}
        />
        <StatTile
          label="Open issues"
          value={
            <>
              {t.issues}{" "}
              <Delta now={t.issues} prev={t.issuesPrev} className="text-[15px] font-medium" />
            </>
          }
          sub={`${t.issuesPrev} last week`}
        />
        <StatTile
          label="Over budget"
          value={<span className="text-overspend">{t.spend.over100}</span>}
          sub={`${t.spend.noFigure} with no spend figure`}
        />
        <StatTile
          label="Pipeline"
          value={tileValue(t.pipelineValue, t.pipeline, t.pipelineNotValued)}
          sub={`${t.pipeline} ${t.pipeline === 1 ? "opportunity" : "opportunities"} · ${t.pipelineHigh} High · ${t.pipelineLongRunning} over 90 days`}
        />
      </section>

      <div
        id="workstreams"
        className="mb-4 flex scroll-mt-4 flex-wrap items-baseline justify-between gap-3"
      >
        <h2 className="text-[26px] font-light">Workstreams</h2>
        <span className="text-[14px]">
          Projects in the weekly report only · open a workstream for its projects and pipeline
        </span>
      </div>
      <section
        aria-label="Workstreams"
        className="mb-10 grid grid-cols-[repeat(auto-fill,minmax(min(100%,400px),1fr))] gap-4"
      >
        {v.workstreams.map(({ workstream: w, tiles: wt }) => {
          const href = withWeek(`${base}/workstreams/${w.id}`, v.week);
          const all = wt.submitted === wt.inReport;
          return (
            <article
              key={w.id}
              className="flex flex-col gap-4.5 border-t-4 border-navy bg-white p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[24px] font-light">
                    <Link href={href} className="no-underline">
                      {w.name}
                    </Link>
                  </h3>
                  <p className="mt-1 text-[13px] text-muted">
                    {w.accountDirector ? `Account Director ${w.accountDirector} · ` : ""}
                    {wt.inReport} of {wt.total} projects in report
                  </p>
                </div>
                <Tag tone={all ? "navy" : "warning"}>
                  {all ? "All updated" : `${wt.submitted} of ${wt.inReport} updated`}
                </Tag>
              </div>
              <div>
                <p className="lbl mb-2 !text-[11px]">Delivery RAG</p>
                <RagBar counts={wt.rag} height={12} inline subject={`${w.name} Delivery RAG`} />
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
                <div>
                  <p className="lbl !text-[11px]">Risks</p>
                  <p className="mt-1 text-[26px] font-light">{wt.risks}</p>
                  <Delta
                    now={wt.risks}
                    prev={wt.risksPrev}
                    showPeriod
                    className="text-[12px] font-medium"
                  />
                </div>
                <div>
                  <p className="lbl !text-[11px]">Issues</p>
                  <p className="mt-1 text-[26px] font-light">{wt.issues}</p>
                  <Delta
                    now={wt.issues}
                    prev={wt.issuesPrev}
                    showPeriod
                    className="text-[12px] font-medium"
                  />
                </div>
                <div>
                  <p className="lbl !text-[11px]">Over budget</p>
                  <p
                    className={`mt-1 text-[26px] font-light ${wt.spend.over100 ? "text-overspend" : ""}`}
                  >
                    {wt.spend.over100}
                  </p>
                  <p className="text-[12px]">{wt.spend.noFigure} no figure</p>
                </div>
                <div>
                  <p className="lbl !text-[11px]">Pipeline</p>
                  <p className="mt-1 text-[26px] font-light">
                    {tileValue(wt.pipelineValue, wt.pipeline, wt.pipelineNotValued)}
                  </p>
                  <p className="text-[12px]">
                    {wt.pipeline} {wt.pipeline === 1 ? "opp" : "opps"} · {wt.pipelineHigh} High
                  </p>
                </div>
              </div>
              <Link
                href={href}
                className="inline-flex min-h-11 items-center self-start border border-navy px-4.5 text-[14px] font-medium no-underline"
              >
                Open {w.name} →
              </Link>
            </article>
          );
        })}
      </section>

      <section aria-labelledby="attn-h" className="bg-white p-5 sm:p-7">
        <h2 id="attn-h" className="text-[26px] font-light">
          Needs attention
        </h2>
        <p className="mt-2 mb-4.5 text-[14px] text-muted">
          Projects in the weekly report that are Red (Blocked), over budget or not yet updated this
          week, across all workstreams.
        </p>
        {v.needsAttention.length ? (
          <TableScroll label="Needs attention">
            <table className={`${tableClass} min-w-[960px]`}>
              <caption className="sr-only">
                Projects needing attention across {v.client.name}
              </caption>
              <thead>
                <tr className={theadRow}>
                  <th scope="col" className={`${th} pl-0`}>
                    Job no.
                  </th>
                  <th scope="col" className={th}>
                    Project
                  </th>
                  <th scope="col" className={th}>
                    Workstream
                  </th>
                  <th scope="col" className={th}>
                    Last submitted by
                  </th>
                  <th scope="col" className={th}>
                    Delivery RAG
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    % spend
                  </th>
                  <th scope="col" className={th}>
                    Why it&apos;s here
                  </th>
                </tr>
              </thead>
              <tbody>
                {v.needsAttention.map((p) => (
                  <tr key={p.id} className={tbodyRow}>
                    <td className={`${td} pl-0 font-medium`}>{p.jobNumber}</td>
                    <td className={td}>
                      <Link href={withWeek(`/projects/${p.id}`, v.week)}>{p.name}</Link>
                    </td>
                    <td className={td}>{p.workstreamName}</td>
                    <td className={td}>{p.lastSubmittedBy ?? "—"}</td>
                    <td className={td}>{p.rag ? <RagBadge rag={p.rag} /> : "—"}</td>
                    <td className={`${td} text-right`}>
                      <SpendCell spend={p.spend} stacked={false} />
                    </td>
                    <td className={td}>{p.reasons.join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        ) : (
          <p className="text-[14px]">Nothing needs attention this week.</p>
        )}
      </section>

      <p className="mt-4 text-[12px]">
        Covers the {v.workstreams.length} reported workstreams only. Each workstream&apos;s RAG mix
        is shown as counts; a single roll-up RAG per workstream or client is not shown until the
        roll-up rules are agreed.
      </p>
    </>
  );
}
