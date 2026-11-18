/**
 * The weekly report (brief 07; decisions 17 Nov 2026 "Generate report", "Report contents and
 * order", "Report slides are 16:9", "Workstreams that need more than one slide", "Client pipeline
 * slide shows summaries only"). One model, built by src/lib/report.ts, rendered as HTML slides
 * and as a PowerPoint file.
 */
import type {
  IsoDate,
  IsoDateTime,
  Likelihood,
  PipelineOpportunity,
  ProjectStatus,
  Rag,
  Spend,
} from "./domain";
import type { RagCounts } from "./views";
import type { PipelineSummary } from "@/lib/pipeline";

export type ReportScope = { clientId: string; workstreamId?: string };
export type ReportFormat = "HTML" | "PPTX";

export interface ReportMeta {
  kind: "client" | "workstream";
  /** "Northwind Drinks weekly report" / "Alpha EU workstream report". */
  name: string;
  clientId: string;
  clientName: string;
  workstreamId: string | null;
  workstreamName: string | null;
  /** "2026-W47". */
  weekKey: string;
  /** "Week 47 · 16–20 Nov 2026". */
  weekLabel: string;
  open: boolean;
  /** "Live figures as of Thu 19 Nov 2026, 14:32" or "Final figures: week closed Fri 20 Nov 2026". */
  asOfText: string;
  /** "spend upload of 16 Nov 2026", or "no spend upload yet". */
  spendText: string;
  /** Download name without extension: "Northwind Drinks weekly report 2026-W47". */
  fileName: string;
  generatedAt: IsoDateTime;
}

/** One week in a trend chart. */
export interface TrendPoint {
  /** "W40", or "W47 live" for an open week. */
  label: string;
  rag: RagCounts;
  risks: number;
  issues: number;
}

/** The summary tiles shared by the client summary and a workstream's first slide. */
export interface SummaryTiles {
  inReport: number;
  /** Sub-text under "In report": "projects · 5 workstreams" / "1 complete · 1 on hold". */
  inReportSub: string;
  submitted: number;
  /** In the report but not submitted this week (shown with last values, "Not updated"). */
  notUpdated: number;
  rag: RagCounts;
  risks: number;
  risksPrev: number;
  issues: number;
  issuesPrev: number;
  overBudget: number;
  noFigure: number;
}

export interface ReportProjectRow {
  jobNumber: string;
  name: string;
  status: ProjectStatus | null;
  rag: Rag | null;
  percentComplete: number | null;
  spend: Spend;
  risks: number;
  issues: number;
  /** "Not updated · last submitted 6 Nov (draft saved)"; null when updated this week. */
  notUpdatedText: string | null;
}

interface SlideBase {
  /** Page number and total, assigned once the slides are assembled. */
  page: number;
  pages: number;
  /** Plain title for screen readers and PowerPoint's slide title. */
  title: string;
  /** Extra footer text after "Internal: not for client distribution". */
  footerNote: string;
}

export interface ClientSummarySlide extends SlideBase {
  kind: "clientSummary";
  workstreamCount: number;
  tiles: SummaryTiles;
  trend: TrendPoint[];
  rows: {
    name: string;
    inReport: number;
    submitted: number;
    rag: RagCounts;
    risks: number;
    risksPrev: number;
    issues: number;
    issuesPrev: number;
    overBudget: number;
  }[];
  total: ClientSummarySlide["rows"][number];
  /** "Pipeline: 10 opportunities, 3 High (details on the next slide)." */
  pipelineNote: string;
}

export interface PipelineRow {
  name: string;
  summary: PipelineSummary;
  /** Earliest possible start on or after the report date. */
  nextStart: IsoDate | null;
}

export interface ClientPipelineSlide extends SlideBase {
  kind: "clientPipeline";
  headline: string;
  summary: PipelineSummary;
  /** Last week's total value; null when there is no figure to compare with. */
  valuePrev: number | null;
  /** The date "could start in 3 months" runs to. */
  horizon: IsoDate;
  rows: PipelineRow[];
  total: PipelineRow;
}

export interface WorkstreamProjectsSlide extends SlideBase {
  kind: "workstreamProjects";
  /** "Workstream 4 of 5" (client report) or "Workstream report". */
  eyebrow: string;
  workstreamName: string;
  accountDirector: string | null;
  /** Projects in the weekly report, and all projects in the workstream. */
  inReport: number;
  totalProjects: number;
  part: number;
  parts: number;
  /** First part only. */
  tiles: SummaryTiles | null;
  trend: TrendPoint[] | null;
  projects: ReportProjectRow[];
  /** 1-based positions of this slide's projects. */
  from: number;
  to: number;
  /** "1–6 of 14", or "7 of 7" for a single project. */
  range: string;
  /** "Continued on the next slide: projects 7–14 of 14 →", "End of X's projects", or null. */
  continuation: string | null;
  /** "Pipeline: 3 opportunities · 1 High · details on the next slide." (first part only). */
  pipelineNote: string | null;
}

export interface PipelineItem extends PipelineOpportunity {
  days: number;
  longRunning: boolean;
}

export interface TimelineItem {
  id: string;
  likelihood: Likelihood;
  label: string;
  date: IsoDate;
  /** Position along the six months, 0–1. */
  at: number;
  /** 0 or 1: two rows so labels don't overlap. */
  row: number;
}

export interface WorkstreamPipelineSlide extends SlideBase {
  kind: "workstreamPipeline";
  eyebrow: string;
  workstreamName: string;
  accountDirector: string | null;
  asOf: IsoDate;
  summary: PipelineSummary;
  valuePrev: number | null;
  horizon: IsoDate;
  opportunities: PipelineItem[];
  timeline: {
    /** "Dec 2026 to May 2027". */
    label: string;
    months: { label: string; at: number }[];
    items: TimelineItem[];
  };
}

export type ReportSlide =
  ClientSummarySlide | ClientPipelineSlide | WorkstreamProjectsSlide | WorkstreamPipelineSlide;

export interface Report {
  meta: ReportMeta;
  slides: ReportSlide[];
}

/** What the Generate report dialog shows before generating. */
export interface ReportReadiness {
  weekKey: string;
  weekLabel: string;
  /** "16–20 Nov 2026". */
  weekDates: string;
  open: boolean;
  /** "Fri 20 Nov at 23:59". */
  closesText: string;
  /** "Thu 19 Nov 2026, 14:32". */
  asOfText: string;
  inReport: number;
  submitted: number;
  draft: number;
  notStarted: number;
  byWorkstream: { name: string; inReport: number; updated: number; notUpdated: number }[];
  notUpdated: {
    jobNumber: string;
    name: string;
    workstreamName: string;
    lastSubmittedAt: IsoDateTime | null;
    lastSubmittedBy: string | null;
    /** Open week: draft saved or not started; closed week: not updated. */
    state: "DRAFT" | "NOT_STARTED" | "NOT_UPDATED";
  }[];
}
