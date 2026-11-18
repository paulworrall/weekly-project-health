/**
 * Builds the weekly report model (brief 07) from the same views the pages use, so a report always
 * shows what the site shows for that week: live values for the open week (last submitted values
 * marked Not updated, drafts never used) and the snapshots for a closed week. Pure.
 */
import type { IsoDate, PipelineOpportunity } from "@/types/domain";
import type {
  ClientPipelineSlide,
  ClientSummarySlide,
  PipelineRow,
  Report,
  ReportMeta,
  ReportProjectRow,
  ReportReadiness,
  ReportScope,
  ReportSlide,
  SummaryTiles,
  TimelineItem,
  TrendPoint,
  WorkstreamPipelineSlide,
  WorkstreamProjectsSlide,
} from "@/types/report";
import type {
  ClientOverview,
  ProjectRow,
  WorkstreamOverview,
  WorkstreamTiles,
} from "@/types/views";
import type { Views } from "./views";
import {
  daysBetween,
  formatDate,
  formatDayMonth,
  formatTime,
  formatWeekdayDayMonth,
  londonDate,
  parseIsoDate,
  shortMonth,
  toIsoDate,
} from "./dates";
import {
  addMonths,
  daysInPipeline,
  formatMoneyCompact,
  isLongRunning,
  pipelineSummary,
  sumSummaries,
  type PipelineSummary,
} from "./pipeline";
import { sortPipeline } from "./sorting";
import { weekDates, weekShort, parseWeekParam } from "./week";

export const FIRST_SLIDE_PROJECTS = 6;
export const MORE_SLIDE_PROJECTS = 12;
export const TREND_WEEKS = 8;
const FOOTER_NOTUPDATED = "Not updated = last week's submitted values carried forward";

// ── Small helpers ──────────────────────────────────────────────────────────────────────────

/** Splits `count` projects over slides: 6 on the first, then 12 per slide; 0 still gets one. */
export function paginateProjects(
  count: number,
  { first = FIRST_SLIDE_PROJECTS, rest = MORE_SLIDE_PROJECTS } = {}
): { from: number; to: number }[] {
  const out = [{ from: count ? 1 : 0, to: Math.min(count, first) }];
  for (let from = first + 1; from <= count; from += rest)
    out.push({ from, to: Math.min(count, from + rest - 1) });
  return out;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "1–6 of 14", or "7 of 7" when the range is one project. */
export function projectRange(from: number, to: number, of: number): string {
  return `${from === to ? from : `${from}–${to}`} of ${of}`;
}

/** "Thu 19 Nov 2026, 14:32". */
export function formatAsOf(now: Date): string {
  const day = londonDate(now);
  return `${formatWeekdayDayMonth(day)} ${parseIsoDate(day).y}, ${formatTime(now.toISOString())}`;
}

function tilesFrom(t: WorkstreamTiles, inReportSub: string): SummaryTiles {
  return {
    inReport: t.inReport,
    inReportSub,
    submitted: t.submitted,
    notUpdated: t.inReport - t.submitted,
    rag: t.rag,
    risks: t.risks,
    risksPrev: t.risksPrev,
    issues: t.issues,
    issuesPrev: t.issuesPrev,
    overBudget: t.spend.over100,
    noFigure: t.spend.noFigure,
  };
}

function projectRow(r: ProjectRow, open: boolean): ReportProjectRow {
  const last = r.lastSubmittedAt ? formatDayMonth(londonDate(new Date(r.lastSubmittedAt))) : null;
  return {
    jobNumber: r.jobNumber,
    name: r.name,
    status: r.status,
    rag: r.rag,
    percentComplete: r.percentComplete,
    spend: r.spend,
    risks: r.openRisks,
    issues: r.openIssues,
    notUpdatedText: r.submittedThisWeek
      ? null
      : `Not updated · ${last ? `last submitted ${last}` : "never submitted"}${open && r.draftThisWeek ? " (draft saved)" : ""}`,
  };
}

/** Week keys for a trend: up to 8 weeks ending with `weekKey`, oldest first. */
function trendKeys(views: Views, weekKey: string): string[] {
  const all = views.weekOptions().map((w) => w.key); // newest first
  const i = all.indexOf(weekKey);
  return all.slice(i, i + TREND_WEEKS).reverse();
}

function trendLabel(key: string, open: boolean, last: boolean): string {
  const ref = parseWeekParam(key)!;
  return `${weekShort(ref)}${open && last ? " live" : ""}`;
}

/** Earliest possible start on or after `asOf`. */
function nextStart(opps: readonly PipelineOpportunity[], asOf: IsoDate): IsoDate | null {
  return (
    opps
      .map((o) => o.possibleStart)
      .filter((d): d is IsoDate => !!d && daysBetween(asOf, d) >= 0)
      .sort()[0] ?? null
  );
}

/** A previous week's total value, or null when it has no figure to compare with. */
function previousValue(summaries: (PipelineSummary | null)[]): number | null {
  const known = summaries.filter(
    (s): s is PipelineSummary => !!s && !(s.count > 0 && s.notValued === s.count)
  );
  if (!known.length) return null;
  return known.reduce((a, s) => a + s.value, 0);
}

function timeline(opps: readonly PipelineOpportunity[], asOf: IsoDate) {
  const { y, m } = parseIsoDate(asOf);
  const start = addMonths(toIsoDate({ y, m, d: 1 }), 1);
  const end = addMonths(start, 6);
  const span = daysBetween(start, end);
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = addMonths(start, i);
    const p = parseIsoDate(d);
    return {
      label: p.m === 1 || i === 0 ? `${shortMonth(p.m)} ${p.y}` : shortMonth(p.m),
      at: daysBetween(start, d) / span,
    };
  });
  const items: TimelineItem[] = opps
    .filter(
      (o) =>
        o.possibleStart &&
        daysBetween(start, o.possibleStart) >= 0 &&
        daysBetween(o.possibleStart, end) > 0
    )
    .sort((a, b) => a.possibleStart!.localeCompare(b.possibleStart!))
    .map((o, i) => ({
      id: o.id,
      likelihood: o.likelihood,
      label: `${o.title.length > 28 ? `${o.title.slice(0, 27).trimEnd()}…` : o.title} · ${formatDayMonth(o.possibleStart!)}`,
      date: o.possibleStart!,
      at: daysBetween(start, o.possibleStart!) / span,
      row: i % 2,
    }));
  const last = parseIsoDate(addMonths(start, 5));
  const first = parseIsoDate(start);
  return {
    label: `${shortMonth(first.m)} ${first.y} to ${shortMonth(last.m)} ${last.y}`,
    months,
    items,
  };
}

// ── Slides ─────────────────────────────────────────────────────────────────────────────────

function workstreamSlides(
  views: Views,
  ov: WorkstreamOverview,
  open: boolean,
  eyebrow: string
): ReportSlide[] {
  const name = ov.workstream.name;
  const included = ov.projects
    .filter((p) => p.included)
    .sort((a, b) => a.jobNumber.localeCompare(b.jobNumber));
  const rows = included.map((r) => projectRow(r, open));
  const parts = paginateProjects(rows.length);
  const opps = ov.pipeline;
  const summary = pipelineSummary(opps, ov.week.asOf);
  const hasPipeline = opps.length > 0;
  const trend = trendKeys(views, ov.week.key).map((key, i, all): TrendPoint => {
    const w = views.getWorkstreamOverview(ov.client.id, ov.workstream.id, key)!;
    return {
      label: trendLabel(key, open, i === all.length - 1),
      rag: w.tiles.rag,
      risks: w.tiles.risks,
      issues: w.tiles.issues,
    };
  });
  const slides: ReportSlide[] = parts.map((part, i): WorkstreamProjectsSlide => {
    const lastPart = i === parts.length - 1;
    return {
      kind: "workstreamProjects",
      page: 0,
      pages: 0,
      title: i === 0 ? name : `${name} (continued)`,
      footerNote: FOOTER_NOTUPDATED,
      eyebrow,
      workstreamName: name,
      accountDirector: ov.workstream.accountDirector,
      inReport: ov.tiles.inReport,
      totalProjects: ov.tiles.total,
      part: i + 1,
      parts: parts.length,
      tiles:
        i === 0
          ? tilesFrom(ov.tiles, `${ov.tiles.complete} complete · ${ov.tiles.onHold} on hold`)
          : null,
      trend: i === 0 ? trend : null,
      projects: rows.slice(Math.max(0, part.from - 1), part.to),
      from: part.from,
      to: part.to,
      range: projectRange(part.from, part.to, rows.length),
      continuation: !lastPart
        ? `Continued on the next slide: ${parts[i + 1].from === rows.length ? "project" : "projects"} ${projectRange(parts[i + 1].from, rows.length, rows.length)} →`
        : parts.length > 1
          ? `End of ${name}'s projects${hasPipeline ? " · pipeline on the next slide" : ""}`
          : null,
      pipelineNote:
        i === 0
          ? hasPipeline
            ? `Pipeline: ${plural(summary.count, "opportunity", "opportunities")} · ${summary.byLikelihood.HIGH.count} High · details on the next slide.`
            : "Pipeline: no open opportunities."
          : null,
    };
  });
  if (hasPipeline) {
    const prevKey = trendKeys(views, ov.week.key).at(-2);
    const prev = prevKey
      ? views.getWorkstreamOverview(ov.client.id, ov.workstream.id, prevKey)
      : null;
    const asOf = ov.week.asOf;
    slides.push({
      kind: "workstreamPipeline",
      page: 0,
      pages: 0,
      title: `${name} pipeline`,
      footerNote:
        "Sorted by likelihood, then soonest start · Over 90 days in bold · Values are estimated fees in USD",
      eyebrow: `${eyebrow} · Pipeline`,
      workstreamName: name,
      accountDirector: ov.workstream.accountDirector,
      asOf,
      summary,
      valuePrev: previousValue([
        prev && prevKey !== ov.week.key ? pipelineSummary(prev.pipeline, prev.week.asOf) : null,
      ]),
      horizon: addMonths(asOf, 3),
      opportunities: sortPipeline(opps).map((o) => {
        const days = daysInPipeline(o.addedOn, asOf);
        return { ...o, days, longRunning: isLongRunning(days) };
      }),
      timeline: timeline(opps, asOf),
    } satisfies WorkstreamPipelineSlide);
  }
  return slides;
}

function clientSlides(views: Views, c: ClientOverview, open: boolean): ReportSlide[] {
  const name = c.client.name;
  const wsViews = c.workstreams.map((w) =>
    views.getWorkstreamOverview(c.client.id, w.workstream.id, c.week.key)!
  );
  const keys = trendKeys(views, c.week.key);
  const trend = keys.map((key, i): TrendPoint => {
    const o = views.getClientOverview(c.client.id, key)!;
    return {
      label: trendLabel(key, open, i === keys.length - 1),
      rag: o.totals.rag,
      risks: o.totals.risks,
      issues: o.totals.issues,
    };
  });
  const row = (label: string, t: WorkstreamTiles) => ({
    name: label,
    inReport: t.inReport,
    submitted: t.submitted,
    rag: t.rag,
    risks: t.risks,
    risksPrev: t.risksPrev,
    issues: t.issues,
    issuesPrev: t.issuesPrev,
    overBudget: t.spend.over100,
  });
  const t = c.totals;
  const summary: ClientSummarySlide = {
    kind: "clientSummary",
    page: 0,
    pages: 0,
    title: `${name}: client summary`,
    footerNote: "Delivery RAG shown as counts, no roll-up RAG",
    workstreamCount: c.workstreams.length,
    tiles: tilesFrom(t, `projects · ${plural(c.workstreams.length, "workstream", "workstreams")}`),
    trend,
    rows: c.workstreams.map((w) => row(w.workstream.name, w.tiles)),
    total: row(`${name} total`, t),
    pipelineNote: t.pipeline
      ? `Pipeline: ${plural(t.pipeline, "opportunity", "opportunities")}, ${t.pipelineHigh} High (details on the next slide).`
      : "Pipeline: no open opportunities.",
  };

  const asOf = c.week.asOf;
  const rows: PipelineRow[] = wsViews.map((w) => ({
    name: w.workstream.name,
    summary: pipelineSummary(w.pipeline, asOf),
    nextStart: nextStart(w.pipeline, asOf),
  }));
  const total = sumSummaries(rows.map((r) => r.summary));
  const prevKey = keys.length > 1 ? keys[keys.length - 2] : null;
  const valuePrev = prevKey
    ? previousValue(
        wsViews.map((w) => {
          const p = views.getWorkstreamOverview(c.client.id, w.workstream.id, prevKey);
          return p ? pipelineSummary(p.pipeline, p.week.asOf) : null;
        })
      )
    : null;
  const pipeline: ClientPipelineSlide = {
    kind: "clientPipeline",
    page: 0,
    pages: 0,
    title: `${name}: client pipeline`,
    footerNote:
      "Values are estimated fees in USD · Each opportunity is listed on its workstream's pipeline slide",
    headline: total.count
      ? `${formatMoneyCompact(total.value)} in the ${name} pipeline across ${plural(total.count, "opportunity", "opportunities")}, with ${formatMoneyCompact(total.byLikelihood.HIGH.value)} rated High`
      : `No open opportunities in the ${name} pipeline`,
    summary: total,
    valuePrev,
    horizon: addMonths(asOf, 3),
    rows,
    total: {
      name: `${name} total`,
      summary: total,
      nextStart:
        rows
          .map((r) => r.nextStart)
          .filter((d): d is IsoDate => !!d)
          .sort()[0] ?? null,
    },
  };

  return [
    summary,
    pipeline,
    ...wsViews.flatMap((w, i) =>
      workstreamSlides(views, w, open, `Workstream ${i + 1} of ${wsViews.length}`)
    ),
  ];
}

// ── Report ─────────────────────────────────────────────────────────────────────────────────

/** The report for a client or one reported workstream, or null when there is no such scope. */
export function buildReport(
  views: Views,
  scope: ReportScope,
  weekParam: string | string[] | undefined,
  now: Date
): Report | null {
  const c = views.getClientOverview(scope.clientId, weekParam);
  if (!c) return null;
  const week = c.week;
  const open = !week.closed;
  let slides: ReportSlide[];
  let ws: WorkstreamOverview | null = null;
  if (scope.workstreamId) {
    ws = views.getWorkstreamOverview(scope.clientId, scope.workstreamId, week.key);
    if (!ws) return null;
    slides = workstreamSlides(views, ws, open, "Workstream report");
  } else {
    slides = clientSlides(views, c, open);
  }
  slides.forEach((s, i) => {
    s.page = i + 1;
    s.pages = slides.length;
  });
  const upload = (ws ?? c).latestUpload;
  const friday = week.closeDate;
  const name = ws ? `${ws.workstream.name} workstream report` : `${c.client.name} weekly report`;
  const meta: ReportMeta = {
    kind: ws ? "workstream" : "client",
    name,
    clientId: c.client.id,
    clientName: c.client.name,
    workstreamId: ws?.workstream.id ?? null,
    workstreamName: ws?.workstream.name ?? null,
    weekKey: week.key,
    weekLabel: week.label,
    open,
    asOfText: open
      ? `Live figures as of ${formatAsOf(now)}`
      : `Final figures: week closed ${formatWeekdayDayMonth(friday)} ${parseIsoDate(friday).y} at 23:59`,
    spendText: upload
      ? `spend upload of ${formatDate(upload.upload.extractDate)}`
      : "no spend upload yet",
    fileName: ws
      ? `${c.client.name} ${ws.workstream.name} report ${week.key}`
      : `${c.client.name} weekly report ${week.key}`,
    generatedAt: now.toISOString(),
  };
  return { meta, slides };
}

/** What the Generate report dialog shows: who has updated this week. */
export function reportReadiness(
  views: Views,
  scope: ReportScope,
  weekParam: string | string[] | undefined,
  now: Date
): ReportReadiness | null {
  const c = views.getClientOverview(scope.clientId, weekParam);
  if (!c) return null;
  const week = c.week;
  const open = !week.closed;
  const wsIds = scope.workstreamId
    ? [scope.workstreamId]
    : c.workstreams.map((w) => w.workstream.id);
  const views_ = wsIds.map((id) => views.getWorkstreamOverview(c.client.id, id, week.key));
  if (views_.some((v) => !v)) return null;
  const byWorkstream: ReportReadiness["byWorkstream"] = [];
  const notUpdated: ReportReadiness["notUpdated"] = [];
  let inReport = 0;
  let submitted = 0;
  let draft = 0;
  for (const v of views_ as WorkstreamOverview[]) {
    const included = v.projects
      .filter((p) => p.included)
      .sort((a, b) => a.jobNumber.localeCompare(b.jobNumber));
    const done = included.filter((p) => p.submittedThisWeek);
    inReport += included.length;
    submitted += done.length;
    byWorkstream.push({
      name: v.workstream.name,
      inReport: included.length,
      updated: done.length,
      notUpdated: included.length - done.length,
    });
    for (const p of included.filter((x) => !x.submittedThisWeek)) {
      const state = !open ? "NOT_UPDATED" : p.draftThisWeek ? "DRAFT" : "NOT_STARTED";
      if (state === "DRAFT") draft++;
      notUpdated.push({
        jobNumber: p.jobNumber,
        name: p.name,
        workstreamName: v.workstream.name,
        lastSubmittedAt: p.lastSubmittedAt,
        lastSubmittedBy: p.lastSubmittedBy,
        state,
      });
    }
  }
  return {
    weekKey: week.key,
    weekLabel: week.label,
    weekDates: weekDates(week.ref),
    open,
    closesText: `${formatWeekdayDayMonth(week.closeDate)} at 23:59`,
    asOfText: formatAsOf(now),
    inReport,
    submitted,
    draft,
    notStarted: open ? inReport - submitted - draft : 0,
    byWorkstream,
    notUpdated,
  };
}
