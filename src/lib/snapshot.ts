/**
 * Weekly snapshots (brief 06, CLAUDE.md §7 "Week close"). Pure: builds the frozen record of one
 * closed week from the live data, and works out which weeks are due to close. The close job
 * (src/server/close-week.ts) saves what this returns; the views read it back for closed weeks.
 *
 * Decisions (17 Nov 2026): every project in a Reported workstream is recorded, with whether it
 * was in that week's report; no submission by the close carries the last submitted values
 * forward marked "Not updated"; drafts are ignored.
 */
import type {
  IsoDate,
  IsoDateTime,
  LogItem,
  LogKind,
  PipelineOpportunity,
  ProjectStatus,
  ProjectWeek,
  Rag,
  Spend,
} from "@/types/domain";
import type { Dataset } from "./views";
import { isOverdue } from "./ageing";
import { daysBetween } from "./dates";
import { levelsFor } from "./labels";
import { activeAt } from "./logs";
import {
  addWeeks,
  closesAt,
  compareWeeks,
  currentWeek,
  formatWeekParam,
  parseWeekParam,
  weekRange,
  weeksBetween,
  type WeekRef,
} from "./week";

/** Bump when the stored shape changes, so readers can tell old records apart. */
export const SNAPSHOT_VERSION = 1;

/** The values a project showed that week (its own submission, or the last one carried forward). */
export interface SnapshotEntry {
  status: ProjectStatus;
  rag: Rag;
  percentComplete: number;
  updateText: string;
  submittedAt: IsoDateTime | null;
  submittedById: string | null;
}

export interface LogCounts {
  /** Open or On pause at the close, by severity (risks) or priority (issues). */
  open: Record<string, number>;
  overdue: number;
}

export interface ProjectSnapshot {
  v: number;
  workstreamId: string;
  /** "Include in weekly report" at the close. */
  included: boolean;
  /** A genuine submission was made during the week. */
  submittedThisWeek: boolean;
  /** In the report but not submitted this week: values carried forward. */
  notUpdated: boolean;
  entry: SnapshotEntry | null;
  spend: Spend;
  /** Extract date of the upload the % spend came from. */
  spendExtractDate: IsoDate | null;
  risks: LogCounts;
  issues: LogCounts;
}

export interface PipelineSnapshot {
  v: number;
  opportunities: PipelineOpportunity[];
}

export interface LogTotals {
  open: number;
  byLevel: Record<string, number>;
  overdue: number;
  raisedThisWeek: number;
  closedThisWeek: number;
  /** Average age in days of the open items. */
  averageAge: number;
}

export interface LogSnapshot {
  v: number;
  /** Every risk and issue as it stood at the close (not archived by then). */
  items: LogItem[];
  risks: LogTotals;
  issues: LogTotals;
}

export interface WeekSnapshots {
  week: string;
  projects: { projectId: string; data: ProjectSnapshot }[];
  pipelines: { workstreamId: string; data: PipelineSnapshot }[];
  logs: { clientId: string; data: LogSnapshot }[];
}

const after = (at: IsoDateTime | null, instant: Date) =>
  at !== null && new Date(at).getTime() > instant.getTime();

/** Present at the close: not archived, or archived only after it. */
const presentAt = (archivedAt: IsoDateTime | null, close: Date) =>
  archivedAt === null || after(archivedAt, close);

/** A log item as it stood at the end of `friday` (closed later → still open then). */
export function logItemAsAt(l: LogItem, friday: IsoDate): LogItem {
  const closedLater = l.closedOn !== null && daysBetween(l.closedOn, friday) < 0;
  return closedLater ? { ...l, status: "OPEN", closedOn: null } : l;
}

function counts(items: readonly LogItem[], kind: LogKind, friday: IsoDate): LogCounts {
  const open: Record<string, number> = Object.fromEntries(levelsFor(kind).map((l) => [l, 0]));
  let overdue = 0;
  for (const i of items) {
    if (i.kind !== kind || !activeAt(i, friday)) continue;
    open[i.level] = (open[i.level] ?? 0) + 1;
    if (isOverdue(i, friday)) overdue++;
  }
  return { open, overdue };
}

function totals(
  items: readonly LogItem[],
  kind: LogKind,
  monday: IsoDate,
  friday: IsoDate
): LogTotals {
  const c = counts(items, kind, friday);
  const mine = items.filter((i) => i.kind === kind);
  const active = mine.filter((i) => activeAt(i, friday));
  const inWeek = (d: IsoDate | null) =>
    d !== null && daysBetween(monday, d) >= 0 && daysBetween(d, friday) >= 0;
  return {
    open: active.length,
    byLevel: c.open,
    overdue: c.overdue,
    raisedThisWeek: mine.filter((i) => inWeek(i.raisedOn)).length,
    closedThisWeek: mine.filter((i) => inWeek(i.closedOn)).length,
    averageAge: active.length
      ? Math.round(
          active.reduce((s, i) => s + Math.max(0, daysBetween(i.raisedOn, friday)), 0) /
            active.length
        )
      : 0,
  };
}

/** A genuine submission (not a carried-forward record). */
const genuine = (e: ProjectWeek | undefined): e is ProjectWeek =>
  !!e && e.state === "SUBMITTED" && !e.notUpdated;

const toEntry = (e: ProjectWeek): SnapshotEntry => ({
  status: e.status,
  rag: e.rag,
  percentComplete: e.percentComplete,
  updateText: e.updateText,
  submittedAt: e.submittedAt,
  submittedById: e.submittedById,
});

/**
 * The snapshots for week `ref`, built from live data. Reads only the raw weekly entries (never
 * other snapshots), so it gives the same answer whenever it runs, as long as nothing in the
 * week was saved after the close (saves are refused once the week has closed).
 */
export function buildWeekSnapshots(ds: Dataset, ref: WeekRef): WeekSnapshots {
  const week = formatWeekParam(ref);
  const { monday, friday } = weekRange(ref);
  const close = closesAt(ref);
  const weekIndex = ds.allWeeks.findIndex((w) => compareWeeks(w, ref) === 0);
  const earlier = ds.allWeeks.slice(0, Math.max(0, weekIndex)).map(formatWeekParam).reverse();

  const reported = ds.workstreams.filter((w) => w.reported);
  const reportedIds = new Set(reported.map((w) => w.id));
  // Items archived after the close were still there at the close.
  const logs = ds.logItems
    .filter((l) => presentAt(l.archivedAt, close))
    .map((l) => ({ ...l, archivedAt: null }));
  const byProject = new Map<string, LogItem[]>();
  for (const l of logs) byProject.set(l.projectId, [...(byProject.get(l.projectId) ?? []), l]);

  const uploadDate = new Map<string, IsoDate | null>();
  const extractDateFor = (clientId: string): IsoDate | null => {
    if (!uploadDate.has(clientId)) {
      const confirmed = ds.uploads
        .filter((u) => u.clientId === clientId && (u.status === "LIVE" || u.status === "REPLACED"))
        .sort(
          (a, b) =>
            a.extractDate.localeCompare(b.extractDate) || a.uploadedAt.localeCompare(b.uploadedAt)
        );
      const used =
        [...confirmed].reverse().find((u) => u.extractDate <= friday) ?? confirmed[0] ?? null;
      uploadDate.set(clientId, used?.extractDate ?? null);
    }
    return uploadDate.get(clientId) ?? null;
  };

  const projects = ds.projects
    .filter((p) => reportedIds.has(p.workstreamId))
    .map((p) => {
      const own = ds.projectWeeks.get(`${p.id}|${week}`);
      const submittedThisWeek = genuine(own);
      let source: ProjectWeek | undefined = submittedThisWeek ? own : undefined;
      for (const k of earlier) {
        if (source) break;
        const e = ds.projectWeeks.get(`${p.id}|${k}`);
        if (genuine(e)) source = e;
      }
      const items = byProject.get(p.id) ?? [];
      const data: ProjectSnapshot = {
        v: SNAPSHOT_VERSION,
        workstreamId: p.workstreamId,
        included: p.includeInReport,
        submittedThisWeek,
        notUpdated: p.includeInReport && !submittedThisWeek,
        entry: source ? toEntry(source) : null,
        spend: ds.spend[p.id]?.[week] ?? { percentSpent: null, spendStatus: "NO_BUDGET" },
        spendExtractDate: extractDateFor(p.clientId),
        risks: counts(items, "RISK", friday),
        issues: counts(items, "ISSUE", friday),
      };
      return { projectId: p.id, data };
    });

  const pipelines = reported.map((w) => ({
    workstreamId: w.id,
    data: {
      v: SNAPSHOT_VERSION,
      opportunities: ds.pipeline
        .filter(
          (o) =>
            o.workstreamId === w.id &&
            presentAt(o.archivedAt, close) &&
            daysBetween(o.createdOn, friday) >= 0
        )
        .map((o) => ({ ...o, archivedAt: null })),
    },
  }));

  const logSnapshots = ds.clients
    .filter((c) => !c.archivedAt)
    .map((c) => {
      const items = logs
        .filter((l) => l.clientId === c.id && daysBetween(l.raisedOn, friday) >= 0)
        .map((l) => logItemAsAt(l, friday));
      return {
        clientId: c.id,
        data: {
          v: SNAPSHOT_VERSION,
          items,
          risks: totals(items, "RISK", monday, friday),
          issues: totals(items, "ISSUE", monday, friday),
        },
      };
    });

  return { week, projects, pipelines, logs: logSnapshots };
}

/**
 * Closed weeks whose snapshots a page loads, counted back from the week it shows (phase 7):
 * project and pipeline records for the 8-week trends plus the week before; risk and issue logs
 * for the 12-week chart and the 4-month table.
 */
export const SNAPSHOT_WEEKS = { projects: 10, logs: 18 } as const;

export interface SnapshotWindow {
  /** Load periods closing after `from` and no later than `to`. */
  projectsFrom: Date;
  logsFrom: Date;
  to: Date;
}

/**
 * The closes to load for a page showing `weekParam` (the open week when absent, invalid or not
 * closed yet), so an old week reads its own snapshots and those of the weeks before it.
 */
export function snapshotWindow(now: Date, weekParam?: string | string[]): SnapshotWindow {
  const current = currentWeek(now);
  const asked = parseWeekParam(typeof weekParam === "string" ? weekParam : undefined);
  const shown = asked && compareWeeks(asked, current) < 0 ? asked : current;
  return {
    projectsFrom: closesAt(addWeeks(shown, -SNAPSHOT_WEEKS.projects)),
    logsFrom: closesAt(addWeeks(shown, -SNAPSHOT_WEEKS.logs)),
    to: closesAt(shown),
  };
}

/** A reporting period as the close job sees it. */
export interface PeriodState {
  isoYear: number;
  isoWeek: number;
  state: "OPEN" | "CLOSED";
}

/**
 * Weeks due to close at `now`, oldest first: every week up to the one before the open week that
 * isn't Closed yet, from the earliest Open period (or the week after the latest period, so weeks
 * nobody saved in still close). Empty when everything is up to date.
 */
export function weeksToClose(periods: readonly PeriodState[], now: Date): WeekRef[] {
  const lastDue = addWeeks(currentWeek(now), -1);
  if (!periods.length) return [];
  const sorted = [...periods].sort(compareWeeks);
  const firstOpen = sorted.find((p) => p.state === "OPEN");
  const latest = sorted[sorted.length - 1];
  const from: WeekRef = firstOpen
    ? { isoYear: firstOpen.isoYear, isoWeek: firstOpen.isoWeek }
    : addWeeks(latest, 1);
  if (compareWeeks(from, lastDue) > 0) return [];
  const closed = new Set(sorted.filter((p) => p.state === "CLOSED").map(formatWeekParam));
  return weeksBetween(from, lastDue).filter((w) => !closed.has(formatWeekParam(w)));
}
