/**
 * The weekly report as a PowerPoint file (brief 07; decision 17 Nov 2026 "PowerPoint built in
 * code"). Renders the same report model as the HTML slides with pptxgenjs: native text boxes,
 * tables and shapes, so everything can be edited in PowerPoint. The two trend charts are native
 * PowerPoint charts (editable, with alt text); small bars are shapes with their figures written
 * beside them. Positions come from the 1280×720 design at 96 px per inch. Arial throughout until
 * the WPP Sans licence is confirmed. Server only.
 */
import PptxGenJS from "pptxgenjs";
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
import { LIKELIHOODS } from "@/types/domain";
import { formatDate, formatDayMonth } from "@/lib/dates";
import { formatDays, formatMoney, formatMoneyCompact, type PipelineSummary } from "@/lib/pipeline";
import {
  COLOUR,
  FOOTER,
  LIKELIHOOD_FILL,
  RAG_FILL,
  RAG_ORDER,
  deltaText,
  likelihoodText,
  ragCountsText,
  ragText,
  spendText,
  statusText,
} from "@/lib/report-format";
import { isOverBudget } from "@/lib/spend";

const FONT = "Arial";
const px = (n: number) => n / 96;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

type Slide = PptxGenJS.Slide;
type Cell = PptxGenJS.TableCell;

interface TextOpts {
  size?: number;
  bold?: boolean;
  color?: string;
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
  fill?: string;
  caps?: boolean;
}

/** Text box at design pixels; font size in px (converted to points). */
function text(
  s: Slide,
  value: string | PptxGenJS.TextProps[],
  x: number,
  y: number,
  w: number,
  h: number,
  o: TextOpts = {}
) {
  s.addText(value, {
    x: px(x),
    y: px(y),
    w: px(w),
    h: px(h),
    fontFace: FONT,
    fontSize: Math.max(9, Math.round((o.size ?? 14) * 0.75)),
    bold: o.bold ?? false,
    color: o.color ?? COLOUR.navy,
    align: o.align ?? "left",
    valign: o.valign ?? "top",
    margin: 0,
    fill: o.fill ? { color: o.fill } : undefined,
    fit: "shrink",
  });
}

function rect(s: Slide, x: number, y: number, w: number, h: number, fill: string, line?: string) {
  if (w <= 0 || h <= 0) return;
  s.addShape("rect", {
    x: px(x),
    y: px(y),
    w: px(w),
    h: px(h),
    fill: { color: fill },
    line: line ? { color: line, width: 0.75 } : { type: "none" },
  });
}

function hbar(
  s: Slide,
  x: number,
  y: number,
  w: number,
  h: number,
  parts: { value: number; fill: string }[],
  scale?: number
) {
  rect(s, x, y, w, h, COLOUR.track);
  const total = scale ?? parts.reduce((a, p) => a + p.value, 0);
  if (!total) return;
  let at = x;
  for (const p of parts) {
    const width = (p.value / total) * w;
    rect(s, at, y, width, h, p.fill);
    at += width;
  }
}

// ── Frame ──────────────────────────────────────────────────────────────────────────────────

function frame(
  pptx: PptxGenJS,
  meta: ReportMeta,
  slide: ReportSlide,
  eyebrow: string,
  title: string,
  titleSize = 40
): Slide {
  const s = pptx.addSlide({ masterName: "REPORT" });
  s.background = { color: COLOUR.cream };
  rect(s, 0, 0, 1280, 52, COLOUR.navy);
  s.addShape("ellipse", {
    x: px(40),
    y: px(20),
    w: px(12),
    h: px(12),
    fill: { color: COLOUR.orange },
    line: { type: "none" },
  });
  text(s, "Weekly Project Health", 60, 16, 300, 20, {
    size: 15,
    bold: true,
    color: COLOUR.white,
    valign: "middle",
  });
  text(s, `${meta.name} · ${meta.weekLabel}`, 600, 16, 540, 20, {
    size: 13,
    color: COLOUR.white,
    align: "right",
    valign: "middle",
  });
  s.addText("INTERNAL", {
    x: px(1152),
    y: px(14),
    w: px(88),
    h: px(24),
    fontFace: FONT,
    fontSize: 9,
    bold: true,
    color: COLOUR.white,
    align: "center",
    valign: "middle",
    margin: 0,
    line: { color: COLOUR.white, width: 0.75 },
    shape: "roundRect",
    rectRadius: 0.12,
  });
  text(s, eyebrow.toUpperCase(), 40, 70, 800, 18, { size: 12, bold: true, color: COLOUR.eyebrow });
  // The slide title (a real title placeholder, so PowerPoint and screen readers know it).
  s.addText(title, {
    placeholder: "title",
    x: px(40),
    y: px(88),
    w: px(760),
    h: px(titleSize + 12),
    fontFace: FONT,
    fontSize: Math.round(titleSize * 0.75),
    color: COLOUR.navy,
    margin: 0,
    valign: "top",
    fit: "shrink",
  });
  rect(s, 0, 684, 1280, 1, COLOUR.line);
  text(s, `${FOOTER} · ${slide.footerNote}`, 40, 694, 1000, 18, {
    size: 12,
    color: COLOUR.muted,
    valign: "middle",
  });
  text(s, `Page ${slide.page} of ${slide.pages}`, 1080, 694, 160, 18, {
    size: 12,
    color: COLOUR.muted,
    align: "right",
    valign: "middle",
  });
  return s;
}

function metaLines(s: Slide, line1: string, line2: string) {
  text(
    s,
    [
      { text: line1, options: { breakLine: true } },
      { text: line2, options: { color: COLOUR.muted } },
    ],
    820,
    92,
    420,
    40,
    { size: 13, align: "right" }
  );
}

// ── Tiles and charts ───────────────────────────────────────────────────────────────────────

function tile(
  s: Slide,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  sub: string,
  o: { navy?: boolean; valueColor?: string; valueSize?: number } = {}
) {
  if (o.navy) rect(s, x, y, w, h, COLOUR.navy);
  else rect(s, x, y, w, h, COLOUR.white, COLOUR.line);
  const fg = o.navy ? COLOUR.white : COLOUR.navy;
  text(s, label.toUpperCase(), x + 12, y + 10, w - 24, 16, {
    size: 11,
    bold: true,
    color: o.navy ? COLOUR.orange : COLOUR.muted,
  });
  if (value)
    text(s, value, x + 12, y + 28, w - 24, (o.valueSize ?? 30) + 8, {
      size: o.valueSize ?? 30,
      color: o.valueColor ?? fg,
    });
  if (sub) text(s, sub, x + 12, y + h - 40, w - 24, 32, { size: 12, color: fg, valign: "bottom" });
}

function summaryTiles(s: Slide, t: SummaryTiles, y: number) {
  const w = 160;
  const gap = 12;
  const x = (i: number) => 40 + i * (w + gap);
  const h = 118;
  const delta = (now: number, prev: number) => (now === prev ? "" : `  ${deltaText(now, prev)}`);
  tile(s, x(0), y, w, h, "In report", String(t.inReport), t.inReportSub, { navy: true });
  tile(
    s,
    x(1),
    y,
    w,
    h,
    "Updated",
    `${t.submitted} of ${t.inReport}`,
    `${t.notUpdated} shown as Not updated`
  );
  // Delivery RAG spans two tiles: a stacked bar with the counts written out.
  tile(s, x(2), y, w * 2 + gap, h, "Delivery RAG", "", "");
  hbar(
    s,
    x(2) + 12,
    y + 34,
    w * 2 + gap - 24,
    12,
    RAG_ORDER.map((r) => ({ value: t.rag[r], fill: RAG_FILL[r] }))
  );
  text(
    s,
    RAG_ORDER.map((r) => `${t.rag[r]} ${ragText(r)}`).join("\n"),
    x(2) + 12,
    y + 54,
    w * 2 - 12,
    56,
    { size: 12 }
  );
  tile(
    s,
    x(4),
    y,
    w,
    h,
    "Open risks",
    `${t.risks}${delta(t.risks, t.risksPrev)}`,
    `${t.risksPrev} last week`,
    { valueSize: 26 }
  );
  tile(
    s,
    x(5),
    y,
    w,
    h,
    "Open issues",
    `${t.issues}${delta(t.issues, t.issuesPrev)}`,
    `${t.issuesPrev} last week`,
    { valueSize: 26 }
  );
  tile(s, x(6), y, w, h, "Over budget", String(t.overBudget), `${t.noFigure} no spend figure`, {
    valueColor: COLOUR.overspend,
  });
}

function trends(
  pptx: PptxGenJS,
  s: Slide,
  trend: TrendPoint[],
  x: number,
  y: number,
  w: number,
  h: number
) {
  const labels = trend.map((p) => p.label);
  const first = trend[0];
  const last = trend[trend.length - 1];
  const weeks = plural(trend.length, "week", "weeks");
  text(s, `Delivery RAG · last ${weeks}`, x, y, w, 16, { size: 12, bold: true });
  text(
    s,
    RAG_ORDER.map((r) => `${ragText(r).split(" ·")[0]} ${first.rag[r]} → ${last.rag[r]}`).join(
      " · "
    ),
    x,
    y + 16,
    w,
    16,
    { size: 12, color: COLOUR.muted }
  );
  s.addChart(
    pptx.ChartType.bar,
    RAG_ORDER.map((r) => ({ name: ragText(r), labels, values: trend.map((p) => p.rag[r]) })),
    {
      x: px(x),
      y: px(y + 34),
      w: px(w),
      h: px(h),
      barDir: "col",
      barGrouping: "stacked",
      chartColors: RAG_ORDER.map((r) => RAG_FILL[r]),
      showLegend: false,
      catAxisLabelFontSize: 9,
      catAxisLabelFontFace: FONT,
      valAxisHidden: true,
      valGridLine: { style: "none" },
      catAxisLabelColor: COLOUR.navy,
      altText: `Delivery RAG by week. ${trend.map((p) => `${p.label}: ${ragCountsText(p.rag)}`).join("; ")}`,
    }
  );
  const y2 = y + h + 46;
  text(s, `Open risks and issues · last ${weeks}`, x, y2, w, 16, { size: 12, bold: true });
  text(
    s,
    `Risks ${first.risks} → ${last.risks} · Issues ${first.issues} → ${last.issues}`,
    x,
    y2 + 16,
    w,
    16,
    { size: 12, color: COLOUR.muted }
  );
  s.addChart(
    pptx.ChartType.bar,
    [
      { name: "Risks", labels, values: trend.map((p) => p.risks) },
      { name: "Issues", labels, values: trend.map((p) => p.issues) },
    ],
    {
      x: px(x),
      y: px(y2 + 34),
      w: px(w),
      h: px(h),
      barDir: "col",
      barGrouping: "clustered",
      chartColors: [COLOUR.navy, COLOUR.eyebrow],
      showLegend: false,
      catAxisLabelFontSize: 9,
      catAxisLabelFontFace: FONT,
      valAxisHidden: true,
      valGridLine: { style: "none" },
      catAxisLabelColor: COLOUR.navy,
      altText: `Open risks and issues by week. ${trend.map((p) => `${p.label}: ${p.risks} risks, ${p.issues} issues`).join("; ")}`,
    }
  );
}

// ── Tables ─────────────────────────────────────────────────────────────────────────────────

const HEAD: PptxGenJS.TableCellProps = {
  bold: true,
  fontSize: 9,
  color: COLOUR.navy,
  fontFace: FONT,
  border: [{ type: "none" }, { type: "none" }, { pt: 1.5, color: COLOUR.navy }, { type: "none" }],
};
const BODY: PptxGenJS.TableCellProps = {
  fontSize: 9,
  color: COLOUR.navy,
  fontFace: FONT,
  valign: "top",
  border: [{ type: "none" }, { type: "none" }, { pt: 0.5, color: COLOUR.line }, { type: "none" }],
};
const head = (t: string, align: "left" | "right" = "left"): Cell => ({
  text: t.toUpperCase(),
  options: { ...HEAD, align },
});
const cell = (t: string, o: PptxGenJS.TableCellProps = {}): Cell => ({
  text: t,
  options: { ...BODY, ...o },
});

function table(
  s: Slide,
  rows: Cell[][],
  x: number,
  y: number,
  w: number,
  colW: number[],
  caption: string
) {
  text(s, caption, x, y, w, 18, { size: 13, bold: true });
  const total = colW.reduce((a, b) => a + b, 0);
  s.addTable(rows, {
    x: px(x),
    y: px(y + 22),
    w: px(w),
    colW: colW.map((c) => px((c / total) * w)),
    margin: 0.04,
    autoPage: false,
  });
}

function projectRows(rows: ReportProjectRow[]): Cell[][] {
  return [
    [
      head("Job no."),
      head("Project"),
      head("Status"),
      head("Delivery RAG"),
      head("Complete", "right"),
      head("% spend"),
      head("Risks", "right"),
      head("Issues", "right"),
    ],
    ...rows.map((p) => [
      cell(p.jobNumber),
      p.notUpdatedText
        ? {
            text: [
              { text: p.name, options: { breakLine: true } },
              { text: p.notUpdatedText, options: { fontSize: 8, highlight: COLOUR.pinned } },
            ],
            options: BODY,
          }
        : cell(p.name),
      cell(statusText(p.status)),
      cell(ragText(p.rag), p.rag ? { fill: { color: RAG_FILL[p.rag] } } : {}),
      cell(p.percentComplete === null ? "—" : `${p.percentComplete}%`, { align: "right" }),
      cell(
        spendText(p.spend),
        isOverBudget(p.spend) ? { bold: true, color: COLOUR.overspend } : {}
      ),
      cell(String(p.risks), { align: "right" }),
      cell(String(p.issues), { align: "right" }),
    ]),
  ];
}

const likelihoodWords = (x: PipelineSummary) =>
  LIKELIHOODS.map(
    (l) => `${likelihoodText(l)} ${formatMoneyCompact(x.byLikelihood[l].value)}`
  ).join(" · ");

function valueChange(now: number, prev: number | null, count: number): string {
  const opps = plural(count, "opportunity", "opportunities");
  if (prev === null) return `${opps} · no figure for last week`;
  if (now === prev) return `${opps} · no change on last week`;
  return `${opps} · ${now > prev ? "▲" : "▼"} ${formatMoneyCompact(Math.abs(now - prev))} on last week`;
}

// ── Slides ─────────────────────────────────────────────────────────────────────────────────

function clientSummary(pptx: PptxGenJS, meta: ReportMeta, sl: ClientSummarySlide) {
  const s = frame(pptx, meta, sl, "Client summary", meta.clientName);
  metaLines(
    s,
    `${plural(sl.workstreamCount, "reported workstream", "reported workstreams")} · ${plural(sl.tiles.inReport, "project", "projects")} in the weekly report`,
    `${meta.asOfText} · ${meta.spendText}`
  );
  summaryTiles(s, sl.tiles, 146);
  trends(pptx, s, sl.trend, 40, 284, 500, 110);
  const delta = (now: number, prev: number) =>
    now === prev ? `${now}` : `${now} ${deltaText(now, prev)}`;
  const rows: Cell[][] = [
    [
      head("Workstream"),
      head("Updated"),
      head("Green · On track", "right"),
      head("Amber · At risk", "right"),
      head("Red · Blocked", "right"),
      head("Risks", "right"),
      head("Issues", "right"),
      head("Over budget", "right"),
    ],
    ...[...sl.rows, sl.total].map((r, i) => {
      const total = i === sl.rows.length;
      const b = total ? { bold: true } : {};
      return [
        cell(r.name, b),
        cell(r.inReport ? `${r.submitted} of ${r.inReport}` : "None in report", {
          ...b,
          ...(r.submitted < r.inReport && !total ? { fill: { color: COLOUR.pinned } } : {}),
        }),
        cell(String(r.rag.GREEN), { ...b, align: "right" }),
        cell(String(r.rag.AMBER), { ...b, align: "right" }),
        cell(String(r.rag.RED), { ...b, align: "right" }),
        cell(delta(r.risks, r.risksPrev), { ...b, align: "right" }),
        cell(delta(r.issues, r.issuesPrev), { ...b, align: "right" }),
        cell(String(r.overBudget), {
          ...b,
          align: "right",
          ...(r.overBudget ? { color: COLOUR.overspend } : {}),
        }),
      ];
    }),
  ];
  table(s, rows, 580, 284, 660, [150, 70, 70, 70, 70, 60, 60, 60], "Workstreams this week");
  text(
    s,
    `${sl.pipelineNote} Risks and issues count Open and On pause items; ▲▼ = change on last week.`,
    580,
    640,
    660,
    34,
    { size: 12, color: COLOUR.muted }
  );
}

function clientPipeline(pptx: PptxGenJS, meta: ReportMeta, sl: ClientPipelineSlide) {
  const s = frame(pptx, meta, sl, "Client pipeline", sl.headline, 30);
  const t = sl.summary;
  const w = 290;
  const x = (i: number) => 40 + i * (w + 13);
  tile(
    s,
    x(0),
    150,
    w,
    130,
    "Pipeline value",
    formatMoneyCompact(t.value),
    valueChange(t.value, sl.valuePrev, t.count),
    { navy: true, valueSize: 40 }
  );
  tile(s, x(1), 150, w, 130, "Value by likelihood", "", "");
  hbar(
    s,
    x(1) + 12,
    182,
    w - 24,
    12,
    LIKELIHOODS.map((l) => ({ value: t.byLikelihood[l].value, fill: LIKELIHOOD_FILL[l] }))
  );
  text(
    s,
    LIKELIHOODS.map(
      (l) =>
        `${formatMoneyCompact(t.byLikelihood[l].value)} ${likelihoodText(l)} (${t.byLikelihood[l].count})`
    ).join("\n"),
    x(1) + 12,
    204,
    w - 24,
    66,
    { size: 12 }
  );
  tile(
    s,
    x(2),
    150,
    w,
    130,
    "Could start in 3 months",
    formatMoneyCompact(t.nextThreeMonths.value),
    `${plural(t.nextThreeMonths.count, "opportunity", "opportunities")} with a possible start by ${formatDate(sl.horizon)}`,
    { valueSize: 40 }
  );
  tile(
    s,
    x(3),
    150,
    w,
    130,
    "In pipeline over 90 days",
    formatMoneyCompact(t.longRunning.value),
    `${plural(t.longRunning.count, "opportunity", "opportunities")} · average time in pipeline ${formatDays(t.averageDays)}`,
    { valueSize: 40, valueColor: COLOUR.overspend }
  );
  const rows: Cell[][] = [
    [
      head("Workstream"),
      head("Value", "right"),
      head("Value by likelihood"),
      head("Opportunities", "right"),
      head("Average time in pipeline"),
      head("Over 90 days"),
      head("Next possible start"),
    ],
    ...[...sl.rows, sl.total].map((r, i) => {
      const total = i === sl.rows.length;
      const b = total ? { bold: true } : {};
      const x2 = r.summary;
      const empty = x2.count === 0;
      return [
        cell(r.name, b),
        cell(empty ? "—" : formatMoneyCompact(x2.value), { ...b, align: "right" }),
        cell(empty ? "No open opportunities" : likelihoodWords(x2), b),
        cell(empty ? "—" : String(x2.count), { ...b, align: "right" }),
        cell(empty ? "—" : formatDays(x2.averageDays), b),
        cell(
          x2.longRunning.count
            ? `${x2.longRunning.count} · ${formatMoneyCompact(x2.longRunning.value)}`
            : "—",
          b
        ),
        cell(r.nextStart ? formatDate(r.nextStart) : "—", b),
      ];
    }),
  ];
  table(s, rows, 40, 304, 1200, [200, 110, 330, 110, 170, 130, 150], "Pipeline by workstream");
}

function workstreamProjects(pptx: PptxGenJS, meta: ReportMeta, sl: WorkstreamProjectsSlide) {
  const title = sl.part > 1 ? `${sl.workstreamName} (continued)` : sl.workstreamName;
  const s = frame(pptx, meta, sl, sl.eyebrow, title);
  if (sl.parts > 1) {
    s.addText(`${sl.workstreamName} · page ${sl.part} of ${sl.parts}`, {
      x: px(560),
      y: px(100),
      w: px(240),
      h: px(26),
      fontFace: FONT,
      fontSize: 9,
      bold: true,
      color: COLOUR.navy,
      align: "center",
      valign: "middle",
      margin: 0,
      fill: { color: COLOUR.orange },
      shape: "roundRect",
      rectRadius: 0.15,
    });
  }
  const ad = sl.accountDirector ? ` · Account Director ${sl.accountDirector}` : "";
  metaLines(
    s,
    `${meta.clientName}${ad} · ${sl.part > 1 ? `${sl.from === sl.to ? "project" : "projects"} ${sl.range} in the weekly report` : `${sl.inReport} of ${sl.totalProjects} projects in the weekly report`}`,
    sl.part > 1
      ? `Summary and trends for ${sl.workstreamName} are on the previous slide`
      : `${meta.asOfText} · ${meta.spendText}`
  );
  const top = sl.tiles ? 284 : 150;
  if (sl.tiles) summaryTiles(s, sl.tiles, 146);
  const w = sl.trend ? 800 : 1200;
  const range = sl.inReport ? ` · ${sl.range}${sl.part > 1 ? " (continued)" : ""}` : "";
  if (sl.inReport) {
    table(
      s,
      projectRows(sl.projects),
      40,
      top,
      w,
      [60, 230, 80, 110, 60, 120, 45, 45],
      `Projects in the weekly report${range}`
    );
  } else {
    text(s, "No projects in the weekly report yet.", 40, top, w, 40, {
      size: 14,
      fill: COLOUR.white,
      valign: "middle",
    });
  }
  const y = 640;
  if (sl.continuation)
    text(s, sl.continuation, 40 + w - 420, 616, 420, 22, {
      size: 12,
      bold: true,
      fill: COLOUR.pinned,
      align: "center",
      valign: "middle",
    });
  if (sl.pipelineNote)
    text(s, sl.pipelineNote, 40, y + 10, w, 20, { size: 12, color: COLOUR.muted });
  if (sl.trend) trends(pptx, s, sl.trend, 880, top, 360, 100);
}

function workstreamPipeline(pptx: PptxGenJS, meta: ReportMeta, sl: WorkstreamPipelineSlide) {
  const s = frame(pptx, meta, sl, sl.eyebrow, `${sl.workstreamName} pipeline`, 32);
  const ad = sl.accountDirector ? ` · Account Director ${sl.accountDirector}` : "";
  metaLines(
    s,
    `${meta.clientName}${ad}`,
    `Time in pipeline = days since the opportunity was added, as of ${formatDate(sl.asOf)}`
  );
  const t = sl.summary;
  const w = 230;
  const x = (i: number) => 40 + i * (w + 12.5);
  tile(
    s,
    x(0),
    140,
    w,
    104,
    "Pipeline value",
    formatMoneyCompact(t.value),
    valueChange(t.value, sl.valuePrev, t.count),
    { navy: true }
  );
  tile(s, x(1), 140, w, 104, "Value by likelihood", "", "");
  text(
    s,
    LIKELIHOODS.map(
      (l) =>
        `${formatMoneyCompact(t.byLikelihood[l].value)} ${likelihoodText(l)} (${t.byLikelihood[l].count})`
    ).join("\n"),
    x(1) + 12,
    168,
    w - 24,
    66,
    { size: 13 }
  );
  tile(s, x(2), 140, w, 104, "Average time in pipeline", formatDays(t.averageDays), "");
  tile(
    s,
    x(3),
    140,
    w,
    104,
    "In pipeline over 90 days",
    String(t.longRunning.count),
    `${formatMoneyCompact(t.longRunning.value)} · oldest ${formatDays(t.oldestDays)}`,
    { valueColor: COLOUR.overspend }
  );
  tile(
    s,
    x(4),
    140,
    w,
    104,
    `Possible start by ${formatDayMonth(sl.horizon)}`,
    String(t.nextThreeMonths.count),
    `worth ${formatMoneyCompact(t.nextThreeMonths.value)}`
  );
  const rows: Cell[][] = [
    [
      head("Likelihood"),
      head("Opportunity"),
      head("Value", "right"),
      head("Possible start"),
      head("MAP owner"),
      head("Client owner"),
      head("Next steps"),
      head("Time in pipeline"),
    ],
    ...sl.opportunities.map((o) => [
      cell(likelihoodText(o.likelihood).toUpperCase(), {
        bold: true,
        align: "center",
        ...(o.likelihood === "HIGH"
          ? { fill: { color: COLOUR.navy }, color: COLOUR.white }
          : o.likelihood === "MEDIUM"
            ? { fill: { color: COLOUR.amber } }
            : {}),
      }),
      cell(o.title),
      cell(formatMoney(o.estimatedValue), { align: "right" }),
      cell(o.possibleStart ? formatDate(o.possibleStart) : "Not set"),
      cell(o.mapOwner),
      cell(o.clientOwner || "—"),
      cell(o.nextSteps),
      cell(
        `${formatDays(o.days)}${o.longRunning ? " (over 90 days)" : ""} · added ${formatDate(o.addedOn)}`,
        o.longRunning ? { bold: true, color: COLOUR.overspend } : {}
      ),
    ]),
  ];
  table(s, rows, 40, 262, 1200, [80, 210, 90, 100, 120, 130, 250, 180], "Opportunities");

  // Possible-starts timeline: an axis with month ticks and a flag per opportunity.
  const tx = 40;
  const tw = 1200;
  const ty = 560;
  text(s, `Possible starts · ${sl.timeline.label}`, tx, ty, tw, 18, { size: 12, bold: true });
  const axis = ty + 92;
  rect(s, tx, axis, tw, 1.5, COLOUR.navy);
  for (const m of sl.timeline.months)
    text(s, m.label, tx + m.at * tw, axis + 4, 120, 16, { size: 11 });
  if (!sl.timeline.items.length)
    text(s, `No possible starts between ${sl.timeline.label}.`, tx, ty + 30, tw, 18, {
      size: 12,
      color: COLOUR.muted,
    });
  for (const i of sl.timeline.items) {
    const ix = tx + i.at * tw;
    const iy = i.row ? ty + 52 : ty + 24;
    rect(s, ix, iy, 1, axis - iy, COLOUR.navy);
    text(s, `${likelihoodText(i.likelihood)} · ${i.label}`, ix + 4, iy, 260, 16, { size: 11 });
  }
}

/** Renders the report as a .pptx file. */
export async function renderReportPptx(report: Report): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = `${report.meta.name} · ${report.meta.weekLabel}`;
  pptx.company = "WPP Enterprise Solutions | MAP";
  pptx.author = "Weekly Project Health";
  pptx.defineSlideMaster({
    title: "REPORT",
    background: { color: COLOUR.cream },
    objects: [
      {
        placeholder: {
          options: { name: "title", type: "title", x: px(40), y: px(88), w: px(760), h: px(52) },
          text: "",
        },
      },
    ],
  });
  for (const sl of report.slides) {
    switch (sl.kind) {
      case "clientSummary":
        clientSummary(pptx, report.meta, sl);
        break;
      case "clientPipeline":
        clientPipeline(pptx, report.meta, sl);
        break;
      case "workstreamProjects":
        workstreamProjects(pptx, report.meta, sl);
        break;
      case "workstreamPipeline":
        workstreamPipeline(pptx, report.meta, sl);
        break;
    }
  }
  const out = await pptx.write({ outputType: "nodebuffer" });
  return out as Buffer;
}
