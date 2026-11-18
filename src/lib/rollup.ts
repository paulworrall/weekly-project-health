/**
 * Workstream and client tile figures (decision log: "Workstream weekly summary"). Tiles cover
 * projects in the weekly report only; risk and issue counts include open and on-pause items
 * on those projects.
 */
import type { IsoDate, LogItem, PipelineOpportunity } from "@/types/domain";
import type { ProjectRow, WorkstreamTiles } from "@/types/views";
import { activeAt } from "./logs";
import { pipelineSummary } from "./pipeline";
import { ragCounts } from "./rag";
import { isOverBudget, spendCounts } from "./spend";

type LogLike = Pick<
  LogItem,
  | "kind"
  | "projectId"
  | "level"
  | "status"
  | "raisedOn"
  | "closedOn"
  | "dueOn"
  | "ref"
  | "archivedAt"
>;

export function workstreamTiles(
  rows: readonly ProjectRow[],
  logs: readonly LogLike[],
  pipeline: readonly Pick<
    PipelineOpportunity,
    "likelihood" | "estimatedValue" | "addedOn" | "possibleStart"
  >[],
  asOf: IsoDate,
  lastWeekEnd: IsoDate
): WorkstreamTiles {
  const included = rows.filter((r) => r.included);
  const ids = new Set(included.map((r) => r.id));
  const mine = logs.filter((l) => ids.has(l.projectId));
  const count = (kind: LogLike["kind"], date: IsoDate) =>
    mine.filter((l) => l.kind === kind && activeAt(l, date)).length;
  const spend = spendCounts(included.map((r) => r.spend));
  const pipe = pipelineSummary(pipeline, asOf);
  return {
    inReport: included.length,
    total: rows.length,
    submitted: included.filter((r) => r.submittedThisWeek).length,
    complete: included.filter((r) => r.status === "COMPLETE").length,
    onHold: included.filter((r) => r.status === "ON_HOLD").length,
    rag: ragCounts(included.map((r) => r.rag)),
    spend: {
      under75: spend.under75,
      from75to100: spend.from75to100,
      over100: spend.over100,
      noFigure: spend.noFigure,
      noBudget: spend.noBudget,
      noTimesheet: spend.noTimesheet,
    },
    risks: count("RISK", asOf),
    risksPrev: count("RISK", lastWeekEnd),
    issues: count("ISSUE", asOf),
    issuesPrev: count("ISSUE", lastWeekEnd),
    pipeline: pipe.count,
    pipelineHigh: pipe.byLikelihood.HIGH.count,
    pipelineValue: pipe.value,
    pipelineLongRunning: pipe.longRunning.count,
    pipelineNotValued: pipe.notValued,
  };
}

/** Client roll-up: the sum of its reported workstreams' tiles. */
export function sumTiles(tiles: readonly WorkstreamTiles[]): WorkstreamTiles {
  const zero: WorkstreamTiles = {
    inReport: 0,
    total: 0,
    submitted: 0,
    complete: 0,
    onHold: 0,
    rag: { GREEN: 0, AMBER: 0, RED: 0 },
    spend: { under75: 0, from75to100: 0, over100: 0, noFigure: 0, noBudget: 0, noTimesheet: 0 },
    risks: 0,
    risksPrev: 0,
    issues: 0,
    issuesPrev: 0,
    pipeline: 0,
    pipelineHigh: 0,
    pipelineValue: 0,
    pipelineLongRunning: 0,
    pipelineNotValued: 0,
  };
  return tiles.reduce<WorkstreamTiles>(
    (a, t) => ({
      inReport: a.inReport + t.inReport,
      total: a.total + t.total,
      submitted: a.submitted + t.submitted,
      complete: a.complete + t.complete,
      onHold: a.onHold + t.onHold,
      rag: {
        GREEN: a.rag.GREEN + t.rag.GREEN,
        AMBER: a.rag.AMBER + t.rag.AMBER,
        RED: a.rag.RED + t.rag.RED,
      },
      spend: {
        under75: a.spend.under75 + t.spend.under75,
        from75to100: a.spend.from75to100 + t.spend.from75to100,
        over100: a.spend.over100 + t.spend.over100,
        noFigure: a.spend.noFigure + t.spend.noFigure,
        noBudget: a.spend.noBudget + t.spend.noBudget,
        noTimesheet: a.spend.noTimesheet + t.spend.noTimesheet,
      },
      risks: a.risks + t.risks,
      risksPrev: a.risksPrev + t.risksPrev,
      issues: a.issues + t.issues,
      issuesPrev: a.issuesPrev + t.issuesPrev,
      pipeline: a.pipeline + t.pipeline,
      pipelineHigh: a.pipelineHigh + t.pipelineHigh,
      pipelineValue: a.pipelineValue + t.pipelineValue,
      pipelineLongRunning: a.pipelineLongRunning + t.pipelineLongRunning,
      pipelineNotValued: a.pipelineNotValued + t.pipelineNotValued,
    }),
    zero
  );
}

/** Why a project in the report needs attention: Red, over budget, not updated this week. */
export function attentionReasons(row: ProjectRow): string[] {
  if (!row.included) return [];
  const reasons: string[] = [];
  if (row.rag === "RED") reasons.push("Blocked");
  if (isOverBudget(row.spend)) reasons.push("Over budget");
  if (!row.submittedThisWeek) reasons.push("Not updated this week");
  return reasons;
}

/** Needs attention: Red first, then over budget, then not updated; then job number. */
export function needsAttention(
  rows: readonly ProjectRow[]
): (ProjectRow & { reasons: string[] })[] {
  const rank = (r: ProjectRow) => (r.rag === "RED" ? 0 : isOverBudget(r.spend) ? 1 : 2);
  return rows
    .map((r) => ({ ...r, reasons: attentionReasons(r) }))
    .filter((r) => r.reasons.length > 0)
    .sort((a, b) => rank(a) - rank(b) || a.jobNumber.localeCompare(b.jobNumber));
}

/** Projects in the report with no submission this week; drafts first, then workstream and job. */
export function outstandingUpdates(rows: readonly ProjectRow[]): ProjectRow[] {
  return rows
    .filter((r) => r.included && !r.submittedThisWeek)
    .sort(
      (a, b) =>
        Number(b.draftThisWeek) - Number(a.draftThisWeek) ||
        a.workstreamName.localeCompare(b.workstreamName) ||
        a.jobNumber.localeCompare(b.jobNumber)
    );
}
