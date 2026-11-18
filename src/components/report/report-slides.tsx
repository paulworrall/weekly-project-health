/**
 * The weekly report as HTML slides (brief 07; mockups Slide*.dc.html). Each slide is a fixed
 * 1280×720 section; colours come from the shared report palette (the design tokens).
 * Every chart has a text alternative.
 */
import type { CSSProperties, ReactNode } from "react";
import type { Rag } from "@/types/domain";
import type {
  ClientPipelineSlide,
  ClientSummarySlide,
  Report,
  ReportMeta,
  ReportProjectRow,
  ReportSlide,
  SummaryTiles,
  TrendPoint,
  WorkstreamPipelineSlide,
  WorkstreamProjectsSlide,
} from "@/types/report";
import type { RagCounts } from "@/types/views";
import { formatDate, formatDayMonth } from "@/lib/dates";
import { formatDays, formatMoney, formatMoneyCompact, type PipelineSummary } from "@/lib/pipeline";
import {
  COLOUR,
  FOOTER,
  LIKELIHOOD_FILL,
  RAG_FILL,
  RAG_ORDER,
  deltaText,
  deltaWords,
  likelihoodText,
  ragCountsText,
  ragText,
  spendText,
  statusText,
} from "@/lib/report-format";
import { isOverBudget } from "@/lib/spend";
import { LIKELIHOODS } from "@/types/domain";

const hex = (c: string) => `#${c}`;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// ── Building blocks ────────────────────────────────────────────────────────────────────────

function Slide({
  meta,
  slide,
  children,
}: {
  meta: ReportMeta;
  slide: ReportSlide;
  children: ReactNode;
}) {
  return (
    <section
      className="report-slide"
      aria-label={`Slide ${slide.page} of ${slide.pages}: ${slide.title}`}
    >
      <header className="flex h-[52px] items-center justify-between bg-navy px-10 text-white">
        <p className="flex items-center gap-2.5 text-[15px] font-medium">
          <span aria-hidden className="size-3 rounded-full bg-orange" />
          Weekly Project Health
        </p>
        <p className="flex items-center gap-3 text-[13px]">
          {meta.name} · {meta.weekLabel}
          <span className="rounded-full border border-white px-2.5 py-0.5 text-[11px] font-medium tracking-[0.1em]">
            INTERNAL
          </span>
        </p>
      </header>
      <div className="h-[632px] overflow-hidden px-10 pt-6">{children}</div>
      <footer className="flex h-[36px] items-center justify-between border-t border-line px-10 text-[12px] text-muted">
        <span>
          {FOOTER} · {slide.footerNote}
        </span>
        <span>
          Page {slide.page} of {slide.pages}
        </span>
      </footer>
    </section>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[12px] font-medium tracking-[0.12em] text-eyebrow uppercase">{children}</p>
  );
}

function Tile({
  label,
  value,
  sub,
  navy = false,
  span = 1,
  big = false,
  valueClass = "",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  navy?: boolean;
  span?: number;
  big?: boolean;
  valueClass?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-1 p-3.5 ${navy ? "bg-navy text-white" : "border border-line bg-white"}`}
      style={{ gridColumn: `span ${span}` }}
    >
      <p
        className={`text-[11px] font-medium tracking-[0.1em] uppercase ${navy ? "text-orange" : "text-muted"}`}
      >
        {label}
      </p>
      <div
        className={`${big ? "text-[40px]" : "text-[30px]"} leading-tight font-light ${valueClass}`}
      >
        {value}
      </div>
      {sub ? <div className="text-[12px] leading-snug">{sub}</div> : null}
    </div>
  );
}

function Delta({ now, prev }: { now: number; prev: number }) {
  if (now === prev) return null;
  return (
    <span className="ml-1.5 text-[14px] font-medium" aria-label={deltaWords(now, prev)}>
      {deltaText(now, prev)}
    </span>
  );
}

function RagBar({
  counts,
  subject,
  height = 12,
}: {
  counts: RagCounts;
  subject: string;
  height?: number;
}) {
  const total = RAG_ORDER.reduce((a, r) => a + counts[r], 0);
  return (
    <div
      role="img"
      aria-label={`${subject}: ${ragCountsText(counts)}`}
      className="flex w-full"
      style={{ height, background: hex(COLOUR.track) }}
    >
      {total
        ? RAG_ORDER.map((r) => (
            <span
              key={r}
              style={{ width: `${(counts[r] / total) * 100}%`, background: hex(RAG_FILL[r]) }}
            />
          ))
        : null}
    </div>
  );
}

function RagLegend({ counts }: { counts: RagCounts }) {
  return (
    <ul className="mt-2 flex flex-col gap-0.5 text-[12px]">
      {RAG_ORDER.map((r) => (
        <li key={r} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5"
            style={{ background: hex(RAG_FILL[r]), outline: `1px solid ${hex(COLOUR.navy)}` }}
          />
          {counts[r]} {ragText(r)}
        </li>
      ))}
    </ul>
  );
}

function SummaryTileRow({ t, subject }: { t: SummaryTiles; subject: string }) {
  return (
    <div className="grid grid-cols-7 gap-3">
      <Tile navy label="In report" value={t.inReport} sub={t.inReportSub} />
      <Tile
        label="Updated"
        value={
          <>
            {t.submitted} <span className="text-[16px]">of {t.inReport}</span>
          </>
        }
        sub={`${t.notUpdated} shown as Not updated`}
      />
      <Tile
        label="Delivery RAG"
        span={2}
        value={
          <div className="pt-2">
            <RagBar counts={t.rag} subject={`${subject} Delivery RAG`} />
          </div>
        }
        sub={<RagLegend counts={t.rag} />}
      />
      <Tile
        label="Open risks"
        value={
          <>
            {t.risks}
            <Delta now={t.risks} prev={t.risksPrev} />
          </>
        }
        sub={`${t.risksPrev} last week`}
      />
      <Tile
        label="Open issues"
        value={
          <>
            {t.issues}
            <Delta now={t.issues} prev={t.issuesPrev} />
          </>
        }
        sub={`${t.issuesPrev} last week`}
      />
      <Tile
        label="Over budget"
        value={t.overBudget}
        valueClass="text-overspend"
        sub={`${t.noFigure} no spend figure`}
      />
    </div>
  );
}

function RagTrend({ trend, height = 120 }: { trend: TrendPoint[]; height?: number }) {
  const max = Math.max(1, ...trend.map((p) => RAG_ORDER.reduce((a, r) => a + p.rag[r], 0)));
  const first = trend[0];
  const last = trend[trend.length - 1];
  const text = trend.map((p) => `${p.label}: ${ragCountsText(p.rag)}`).join("; ");
  return (
    <figure>
      <figcaption className="flex justify-between text-[12px]">
        <span className="font-medium">
          Delivery RAG · last {plural(trend.length, "week", "weeks")}
        </span>
        <span className="text-muted">
          {RAG_ORDER.map(
            (r: Rag) => `${ragText(r).split(" ·")[0]} ${first.rag[r]} → ${last.rag[r]}`
          ).join(" · ")}
        </span>
      </figcaption>
      <div
        role="img"
        aria-label={`Delivery RAG by week. ${text}`}
        className="mt-2 flex items-end gap-2"
        style={{ height }}
      >
        {trend.map((p) => (
          <div key={p.label} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-col-reverse" style={{ height: height - 18 }}>
              {RAG_ORDER.map((r) => (
                <span
                  key={r}
                  style={{ height: `${(p.rag[r] / max) * 100}%`, background: hex(RAG_FILL[r]) }}
                />
              ))}
            </div>
            <span className="text-[11px] whitespace-nowrap">{p.label}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

function LogTrend({ trend, height = 120 }: { trend: TrendPoint[]; height?: number }) {
  const max = Math.max(1, ...trend.flatMap((p) => [p.risks, p.issues]));
  const first = trend[0];
  const last = trend[trend.length - 1];
  const text = trend.map((p) => `${p.label}: ${p.risks} risks, ${p.issues} issues`).join("; ");
  return (
    <figure>
      <figcaption className="flex justify-between text-[12px]">
        <span className="font-medium">
          Open risks and issues · last {plural(trend.length, "week", "weeks")}
        </span>
        <span className="flex gap-3 text-muted">
          <span className="flex items-center gap-1">
            <span aria-hidden className="size-2.5 bg-navy" />
            Risks {first.risks} → {last.risks}
          </span>
          <span className="flex items-center gap-1">
            <span aria-hidden className="size-2.5" style={{ background: hex(COLOUR.eyebrow) }} />
            Issues {first.issues} → {last.issues}
          </span>
        </span>
      </figcaption>
      <div
        role="img"
        aria-label={`Open risks and issues by week. ${text}`}
        className="mt-2 flex items-end gap-2"
        style={{ height }}
      >
        {trend.map((p) => (
          <div key={p.label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="flex w-full items-end justify-center gap-0.5"
              style={{ height: height - 18 }}
            >
              <span className="w-[40%] bg-navy" style={{ height: `${(p.risks / max) * 100}%` }} />
              <span
                className="w-[40%]"
                style={{ height: `${(p.issues / max) * 100}%`, background: hex(COLOUR.eyebrow) }}
              />
            </div>
            <span className="text-[11px] whitespace-nowrap">{p.label}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

const thc =
  "border-b-2 border-navy px-2 py-1.5 text-left text-[11px] font-medium tracking-[0.06em] uppercase";
const tdc = "border-b border-line px-2 py-1.5 align-top";

function RagPill({ rag }: { rag: Rag | null }) {
  if (!rag) return <span className="text-muted">—</span>;
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-[12px] font-medium whitespace-nowrap"
      style={{ background: hex(RAG_FILL[rag]) }}
    >
      {ragText(rag)}
    </span>
  );
}

function ProjectTable({ rows, caption }: { rows: ReportProjectRow[]; caption: string }) {
  return (
    <table className="w-full border-collapse text-[13px]">
      <caption className="mb-1.5 text-left text-[13px] font-medium">{caption}</caption>
      <thead>
        <tr>
          <th scope="col" className={thc}>
            Job no.
          </th>
          <th scope="col" className={thc}>
            Project
          </th>
          <th scope="col" className={thc}>
            Status
          </th>
          <th scope="col" className={thc}>
            Delivery RAG
          </th>
          <th scope="col" className={`${thc} text-right`}>
            Complete
          </th>
          <th scope="col" className={thc}>
            % spend
          </th>
          <th scope="col" className={`${thc} text-right`}>
            Risks
          </th>
          <th scope="col" className={`${thc} text-right`}>
            Issues
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.jobNumber}>
            <td className={tdc}>{p.jobNumber}</td>
            <td className={`${tdc} max-w-[260px]`}>
              {p.name}
              {p.notUpdatedText ? (
                <span
                  className="mt-0.5 block w-fit px-1.5 text-[11px]"
                  style={{ background: hex(COLOUR.pinned) }}
                >
                  {p.notUpdatedText}
                </span>
              ) : null}
            </td>
            <td className={`${tdc} whitespace-nowrap`}>{statusText(p.status)}</td>
            <td className={tdc}>
              <RagPill rag={p.rag} />
            </td>
            <td className={`${tdc} text-right`}>
              {p.percentComplete === null ? "—" : `${p.percentComplete}%`}
            </td>
            <td
              className={`${tdc} whitespace-nowrap ${isOverBudget(p.spend) ? "font-bold text-overspend" : ""}`}
            >
              {spendText(p.spend)}
            </td>
            <td className={`${tdc} text-right`}>{p.risks}</td>
            <td className={`${tdc} text-right`}>{p.issues}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LikelihoodBar({
  s,
  scale,
  width = 280,
}: {
  s: PipelineSummary;
  scale: number;
  width?: number;
}) {
  return (
    <div
      role="img"
      aria-label={likelihoodWords(s)}
      className="flex h-3"
      style={{ width, background: hex(COLOUR.track) }}
    >
      {LIKELIHOODS.map((l) => (
        <span
          key={l}
          style={{
            width: `${scale ? (s.byLikelihood[l].value / scale) * 100 : 0}%`,
            background: hex(LIKELIHOOD_FILL[l]),
          }}
        />
      ))}
    </div>
  );
}

function likelihoodWords(s: PipelineSummary): string {
  return LIKELIHOODS.map(
    (l) => `${likelihoodText(l)} ${formatMoneyCompact(s.byLikelihood[l].value)}`
  ).join(" · ");
}

function valueChange(now: number, prev: number | null, count: number): string {
  const opps = plural(count, "opportunity", "opportunities");
  if (prev === null) return `${opps} · no figure for last week`;
  if (now === prev) return `${opps} · no change on last week`;
  return `${opps} · ${now > prev ? "▲" : "▼"} ${formatMoneyCompact(Math.abs(now - prev))} on last week`;
}

function LikelihoodTag({ l }: { l: "HIGH" | "MEDIUM" | "LOW" }) {
  const style: CSSProperties =
    l === "HIGH"
      ? { background: hex(COLOUR.navy), color: "#fff" }
      : l === "MEDIUM"
        ? { background: hex(COLOUR.amber) }
        : { border: `1px solid ${hex(COLOUR.navy)}`, background: "#fff" };
  return (
    <span
      className="inline-flex h-6 w-[68px] items-center justify-center text-[11px] font-medium tracking-[0.08em] uppercase"
      style={style}
    >
      {likelihoodText(l)}
    </span>
  );
}

// ── Slides ─────────────────────────────────────────────────────────────────────────────────

function ClientSummary({ meta, s }: { meta: ReportMeta; s: ClientSummarySlide }) {
  return (
    <Slide meta={meta} slide={s}>
      <div className="flex items-end justify-between gap-6">
        <div>
          <Eyebrow>Client summary</Eyebrow>
          <h2 className="text-[40px] leading-tight font-light">{meta.clientName}</h2>
        </div>
        <p className="text-right text-[13px]">
          {plural(s.workstreamCount, "reported workstream", "reported workstreams")} ·{" "}
          {plural(s.tiles.inReport, "project", "projects")} in the weekly report
          <br />
          <span className="text-muted">
            {meta.asOfText} · {meta.spendText}
          </span>
        </p>
      </div>
      <div className="mt-4">
        <SummaryTileRow t={s.tiles} subject={meta.clientName} />
      </div>
      <div className="mt-5 grid grid-cols-[520px_1fr] gap-8">
        <div className="flex flex-col gap-4">
          <RagTrend trend={s.trend} />
          <LogTrend trend={s.trend} />
        </div>
        <div>
          <table className="w-full border-collapse text-[13px]">
            <caption className="mb-1.5 text-left text-[13px] font-medium">
              Workstreams this week
            </caption>
            <thead>
              <tr>
                <th scope="col" className={thc}>
                  Workstream
                </th>
                <th scope="col" className={thc}>
                  Updated
                </th>
                <th scope="col" className={`${thc} text-right`}>
                  Green · On track
                </th>
                <th scope="col" className={`${thc} text-right`}>
                  Amber · At risk
                </th>
                <th scope="col" className={`${thc} text-right`}>
                  Red · Blocked
                </th>
                <th scope="col" className={`${thc} text-right`}>
                  Risks
                </th>
                <th scope="col" className={`${thc} text-right`}>
                  Issues
                </th>
                <th scope="col" className={`${thc} text-right`}>
                  Over budget
                </th>
              </tr>
            </thead>
            <tbody>
              {[...s.rows, s.total].map((r, i) => {
                const total = i === s.rows.length;
                const behind = r.submitted < r.inReport;
                return (
                  <tr key={r.name} className={total ? "font-bold" : ""}>
                    {total ? (
                      <th scope="row" className={`${tdc} text-left`}>
                        {r.name}
                      </th>
                    ) : (
                      <td className={tdc}>{r.name}</td>
                    )}
                    <td
                      className={tdc}
                      style={behind && !total ? { background: hex(COLOUR.pinned) } : undefined}
                    >
                      {r.inReport ? `${r.submitted} of ${r.inReport}` : "None in report"}
                    </td>
                    <td className={`${tdc} text-right`}>{r.rag.GREEN}</td>
                    <td className={`${tdc} text-right`}>{r.rag.AMBER}</td>
                    <td className={`${tdc} text-right`}>{r.rag.RED}</td>
                    <td className={`${tdc} text-right whitespace-nowrap`}>
                      {r.risks}
                      <Delta now={r.risks} prev={r.risksPrev} />
                    </td>
                    <td className={`${tdc} text-right whitespace-nowrap`}>
                      {r.issues}
                      <Delta now={r.issues} prev={r.issuesPrev} />
                    </td>
                    <td className={`${tdc} text-right ${r.overBudget ? "text-overspend" : ""}`}>
                      {r.overBudget}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-[12px] text-muted">
            {s.pipelineNote} Risks and issues count Open and On pause items; ▲▼ = change on last
            week.
          </p>
        </div>
      </div>
    </Slide>
  );
}

function ClientPipeline({ meta, s }: { meta: ReportMeta; s: ClientPipelineSlide }) {
  const scale = Math.max(1, ...s.rows.map((r) => r.summary.value));
  const t = s.summary;
  return (
    <Slide meta={meta} slide={s}>
      <Eyebrow>Client pipeline</Eyebrow>
      <h2 className="text-[30px] leading-tight font-light">{s.headline}</h2>
      <div className="mt-4 grid grid-cols-4 gap-3">
        <Tile
          navy
          big
          label="Pipeline value"
          value={formatMoneyCompact(t.value)}
          sub={valueChange(t.value, s.valuePrev, t.count)}
        />
        <Tile
          label="Value by likelihood"
          value={
            <div className="pt-3">
              <LikelihoodBar s={t} scale={t.value} width={250} />
            </div>
          }
          sub={
            <ul className="mt-1">
              {LIKELIHOODS.map((l) => (
                <li key={l}>
                  {formatMoneyCompact(t.byLikelihood[l].value)} {likelihoodText(l)} (
                  {t.byLikelihood[l].count})
                </li>
              ))}
            </ul>
          }
        />
        <Tile
          big
          label="Could start in 3 months"
          value={formatMoneyCompact(t.nextThreeMonths.value)}
          sub={`${plural(t.nextThreeMonths.count, "opportunity", "opportunities")} with a possible start by ${formatDate(s.horizon)}`}
        />
        <Tile
          big
          label="In pipeline over 90 days"
          valueClass="text-overspend"
          value={formatMoneyCompact(t.longRunning.value)}
          sub={`${plural(t.longRunning.count, "opportunity", "opportunities")} · average time in pipeline ${formatDays(t.averageDays)}`}
        />
      </div>
      <table className="mt-6 w-full border-collapse text-[13px]">
        <caption className="mb-1.5 text-left text-[13px] font-medium">
          Pipeline by workstream
        </caption>
        <thead>
          <tr>
            <th scope="col" className={thc}>
              Workstream
            </th>
            <th scope="col" className={`${thc} text-right`}>
              Value
            </th>
            <th scope="col" className={thc}>
              Value by likelihood
            </th>
            <th scope="col" className={`${thc} text-right`}>
              Opportunities
            </th>
            <th scope="col" className={thc}>
              Average time in pipeline
            </th>
            <th scope="col" className={thc}>
              Over 90 days
            </th>
            <th scope="col" className={thc}>
              Next possible start
            </th>
          </tr>
        </thead>
        <tbody>
          {[...s.rows, s.total].map((r, i) => {
            const total = i === s.rows.length;
            const x = r.summary;
            const empty = x.count === 0;
            return (
              <tr key={r.name} className={total ? "font-bold" : ""}>
                {total ? (
                  <th scope="row" className={`${tdc} text-left`}>
                    {r.name}
                  </th>
                ) : (
                  <td className={tdc}>{r.name}</td>
                )}
                <td className={`${tdc} text-right`}>{empty ? "—" : formatMoneyCompact(x.value)}</td>
                <td className={tdc}>
                  {empty ? (
                    <span className="text-muted">No open opportunities</span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {total ? null : <LikelihoodBar s={x} scale={scale} />}
                      <span className="text-[12px]">{likelihoodWords(x)}</span>
                    </div>
                  )}
                </td>
                <td className={`${tdc} text-right`}>{empty ? "—" : x.count}</td>
                <td className={tdc}>{empty ? "—" : formatDays(x.averageDays)}</td>
                <td className={tdc}>
                  {x.longRunning.count
                    ? `${x.longRunning.count} · ${formatMoneyCompact(x.longRunning.value)}`
                    : "—"}
                </td>
                <td className={tdc}>{r.nextStart ? formatDate(r.nextStart) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Slide>
  );
}

function WorkstreamProjects({ meta, s }: { meta: ReportMeta; s: WorkstreamProjectsSlide }) {
  const multi = s.parts > 1;
  const range = s.inReport ? ` · ${s.range}${s.part > 1 ? " (continued)" : ""}` : "";
  const ad = s.accountDirector ? ` · Account Director ${s.accountDirector}` : "";
  return (
    <Slide meta={meta} slide={s}>
      <div className="flex items-end justify-between gap-6">
        <div>
          <Eyebrow>{s.eyebrow}</Eyebrow>
          <div className="flex items-center gap-3">
            <h2 className="text-[40px] leading-tight font-light">
              {s.part > 1 ? `${s.workstreamName} (continued)` : s.workstreamName}
            </h2>
            {multi ? (
              <span
                className="rounded-full px-3 py-1 text-[12px] font-medium"
                style={{ background: hex(COLOUR.orange) }}
              >
                {s.workstreamName} · page {s.part} of {s.parts}
              </span>
            ) : null}
          </div>
        </div>
        <p className="text-right text-[13px]">
          {meta.clientName}
          {ad} ·{" "}
          {s.part > 1
            ? `${s.from === s.to ? "project" : "projects"} ${s.range} in the weekly report`
            : `${s.inReport} of ${s.totalProjects} projects in the weekly report`}
          <br />
          <span className="text-muted">
            {s.part > 1
              ? `Summary and trends for ${s.workstreamName} are on the previous slide`
              : `${meta.asOfText} · ${meta.spendText}`}
          </span>
        </p>
      </div>
      {s.tiles ? (
        <div className="mt-4">
          <SummaryTileRow t={s.tiles} subject={s.workstreamName} />
        </div>
      ) : null}
      <div className={`mt-5 grid gap-8 ${s.trend ? "grid-cols-[1fr_360px]" : ""}`}>
        <div>
          {s.inReport ? (
            <ProjectTable rows={s.projects} caption={`Projects in the weekly report${range}`} />
          ) : (
            <p className="bg-white px-4 py-3 text-[14px]">No projects in the weekly report yet.</p>
          )}
          {s.continuation ? (
            <p
              className="mt-2 ml-auto w-fit px-2.5 py-1 text-[12px] font-medium"
              style={{ background: hex(COLOUR.pinned) }}
            >
              {s.continuation}
            </p>
          ) : null}
          {s.pipelineNote ? <p className="mt-2 text-[12px] text-muted">{s.pipelineNote}</p> : null}
        </div>
        {s.trend ? (
          <div className="flex flex-col gap-4">
            <RagTrend trend={s.trend} height={110} />
            <LogTrend trend={s.trend} height={110} />
          </div>
        ) : null}
      </div>
    </Slide>
  );
}

function WorkstreamPipeline({ meta, s }: { meta: ReportMeta; s: WorkstreamPipelineSlide }) {
  const t = s.summary;
  const ad = s.accountDirector ? ` · Account Director ${s.accountDirector}` : "";
  return (
    <Slide meta={meta} slide={s}>
      <div className="flex items-end justify-between gap-6">
        <div>
          <Eyebrow>{s.eyebrow}</Eyebrow>
          <h2 className="text-[32px] leading-tight font-light">{s.workstreamName} pipeline</h2>
        </div>
        <p className="text-right text-[13px]">
          {meta.clientName}
          {ad}
          <br />
          <span className="text-muted">
            Time in pipeline = days since the opportunity was added, as of {formatDate(s.asOf)}
          </span>
        </p>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-3">
        <Tile
          navy
          label="Pipeline value"
          value={formatMoneyCompact(t.value)}
          sub={valueChange(t.value, s.valuePrev, t.count)}
        />
        <Tile
          label="Value by likelihood"
          value={
            <span className="text-[13px] leading-snug">
              {LIKELIHOODS.map((l) => (
                <span key={l} className="block">
                  {formatMoneyCompact(t.byLikelihood[l].value)} {likelihoodText(l)} (
                  {t.byLikelihood[l].count})
                </span>
              ))}
            </span>
          }
        />
        <Tile label="Average time in pipeline" value={formatDays(t.averageDays)} />
        <Tile
          label="In pipeline over 90 days"
          valueClass="text-overspend"
          value={t.longRunning.count}
          sub={`${formatMoneyCompact(t.longRunning.value)} · oldest ${formatDays(t.oldestDays)}`}
        />
        <Tile
          label={`Possible start by ${formatDayMonth(s.horizon)}`}
          value={t.nextThreeMonths.count}
          sub={`worth ${formatMoneyCompact(t.nextThreeMonths.value)}`}
        />
      </div>
      <table className="mt-4 w-full border-collapse text-[12px]">
        <caption className="mb-1 text-left text-[13px] font-medium">Opportunities</caption>
        <thead>
          <tr>
            <th scope="col" className={thc}>
              Likelihood
            </th>
            <th scope="col" className={thc}>
              Opportunity
            </th>
            <th scope="col" className={`${thc} text-right`}>
              Value
            </th>
            <th scope="col" className={thc}>
              Possible start
            </th>
            <th scope="col" className={thc}>
              MAP owner
            </th>
            <th scope="col" className={thc}>
              Client owner
            </th>
            <th scope="col" className={thc}>
              Next steps
            </th>
            <th scope="col" className={thc}>
              Time in pipeline
            </th>
          </tr>
        </thead>
        <tbody>
          {s.opportunities.map((o) => (
            <tr key={o.id}>
              <td className={tdc}>
                <LikelihoodTag l={o.likelihood} />
              </td>
              <td className={`${tdc} max-w-[220px]`}>{o.title}</td>
              <td className={`${tdc} text-right whitespace-nowrap`}>
                {formatMoney(o.estimatedValue)}
              </td>
              <td className={`${tdc} whitespace-nowrap`}>
                {o.possibleStart ? formatDate(o.possibleStart) : "Not set"}
              </td>
              <td className={tdc}>{o.mapOwner}</td>
              <td className={tdc}>{o.clientOwner || "—"}</td>
              <td className={`${tdc} max-w-[220px]`}>{o.nextSteps}</td>
              <td className={`${tdc} w-[190px]`}>
                <div
                  aria-hidden
                  className="h-2 w-[170px]"
                  style={{ background: hex(COLOUR.track) }}
                >
                  <div
                    className="h-2"
                    style={{
                      width: `${Math.min(100, (o.days / 200) * 100)}%`,
                      background: hex(o.longRunning ? COLOUR.overspend : COLOUR.navy),
                    }}
                  />
                </div>
                <span className={o.longRunning ? "font-bold text-overspend" : ""}>
                  {formatDays(o.days)}
                  {o.longRunning ? <span className="sr-only"> (over 90 days)</span> : null}
                </span>{" "}
                · added {formatDate(o.addedOn)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <figure className="mt-4">
        <figcaption className="text-[12px] font-medium">
          Possible starts · {s.timeline.label}
        </figcaption>
        <div
          role="img"
          aria-label={
            s.timeline.items.length
              ? `Possible starts, ${s.timeline.label}: ${s.timeline.items.map((i) => `${likelihoodText(i.likelihood)}, ${i.label}`).join("; ")}`
              : `No possible starts between ${s.timeline.label}`
          }
          className="relative mt-2 h-[86px]"
        >
          <div className="absolute top-[62px] right-0 left-0 h-px bg-navy" />
          {s.timeline.months.map((m) => (
            <span
              key={m.label}
              className="absolute top-[66px] text-[11px]"
              style={{ left: `${m.at * 100}%` }}
            >
              {m.label}
            </span>
          ))}
          {s.timeline.items.map((i) => (
            <span
              key={i.id}
              className="absolute flex items-center gap-1 text-[11px] whitespace-nowrap"
              style={{ left: `${i.at * 100}%`, top: i.row ? 30 : 2 }}
            >
              <span
                className="h-[26px] w-px self-start bg-navy"
                style={{ height: i.row ? 32 : 60 }}
              />
              <LikelihoodTag l={i.likelihood} />
              {i.label}
            </span>
          ))}
        </div>
      </figure>
    </Slide>
  );
}

/** Every slide of a report, in order. */
export function ReportSlides({ report }: { report: Report }) {
  return (
    <>
      {report.slides.map((s) => {
        switch (s.kind) {
          case "clientSummary":
            return <ClientSummary key={s.page} meta={report.meta} s={s} />;
          case "clientPipeline":
            return <ClientPipeline key={s.page} meta={report.meta} s={s} />;
          case "workstreamProjects":
            return <WorkstreamProjects key={s.page} meta={report.meta} s={s} />;
          case "workstreamPipeline":
            return <WorkstreamPipeline key={s.page} meta={report.meta} s={s} />;
        }
      })}
    </>
  );
}
