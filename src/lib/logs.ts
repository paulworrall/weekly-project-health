/**
 * Risk and issue log figures (decision log: "Risk log and issue log"). Pure functions over
 * log items. "Active" = Open or On pause; archived items never count. Counts "at" a date use
 * the raised and closed dates, so the same functions give the live week and past weeks
 * (brief 06 swaps the history for snapshot series of the same shape).
 */
import type { IsoDate, LogItem, LogKind, LogLevel } from "@/types/domain";
import { ageBand, ageInDays, dueByClose, isOverdue, type AgeBand } from "./ageing";
import { addDays, daysBetween, monthName, parseIsoDate, toIsoDate } from "./dates";
import { levelsFor } from "./labels";
import { weekRange, weekShort, type WeekRef } from "./week";

type Item = Pick<
  LogItem,
  "kind" | "ref" | "level" | "status" | "raisedOn" | "closedOn" | "dueOn" | "archivedAt"
>;

/** Active (open or on pause) at the end of `date`. */
export function activeAt(item: Item, date: IsoDate): boolean {
  if (item.archivedAt) return false;
  if (daysBetween(item.raisedOn, date) < 0) return false;
  return item.closedOn === null || daysBetween(item.closedOn, date) < 0;
}

function inRange(date: IsoDate | null, from: IsoDate, to: IsoDate): boolean {
  return date !== null && daysBetween(from, date) >= 0 && daysBetween(date, to) >= 0;
}

function avgAge(items: readonly Item[], date: IsoDate): number {
  if (!items.length) return 0;
  return Math.round(items.reduce((s, i) => s + ageInDays(i.raisedOn, date), 0) / items.length);
}

function endOfPreviousMonth(date: IsoDate): IsoDate {
  const { y, m } = parseIsoDate(date);
  return addDays(toIsoDate({ y, m, d: 1 }), -1);
}

function startOfMonth(date: IsoDate): IsoDate {
  const { y, m } = parseIsoDate(date);
  return toIsoDate({ y, m, d: 1 });
}

export interface LogSummary {
  open: number;
  onPause: number;
  /** Open only (not on pause). */
  openOnly: number;
  byLevel: Record<string, number>;
  avgAge: number;
  avgAgeLastMonth: number;
  oldest: { ref: string; days: number } | null;
  raisedThisWeek: number;
  closedThisWeek: number;
  raisedMonthToDate: number;
  closedMonthToDate: number;
  ageing: Record<AgeBand, number>;
  overdue: number;
  /** Whole percent of active items that are overdue. */
  overdueShare: number;
  dueByClose: number;
  openLastWeek: number;
  open4WeeksAgo: number;
}

/**
 * Summary for one log as at `today` within the reporting `week` (today is the real day for the
 * open week, the Friday for a closed week).
 */
export function logSummary(
  items: readonly Item[],
  kind: LogKind,
  week: WeekRef,
  today: IsoDate
): LogSummary {
  const all = items.filter((i) => i.kind === kind && !i.archivedAt);
  const active = all.filter((i) => activeAt(i, today));
  const { monday, friday } = weekRange(week);
  const byLevel: Record<string, number> = {};
  for (const l of levelsFor(kind)) byLevel[l] = active.filter((i) => i.level === l).length;
  const ageing: Record<AgeBand, number> = { UNDER_14: 0, "14_TO_30": 0, OVER_30: 0 };
  for (const i of active) ageing[ageBand(ageInDays(i.raisedOn, today))]++;
  const oldestItem = [...active].sort((a, b) => daysBetween(b.raisedOn, a.raisedOn))[0];
  const overdue = active.filter((i) => isOverdue(i, today)).length;
  const lastMonthEnd = endOfPreviousMonth(today);
  const monthStart = startOfMonth(today);
  const onPause = active.filter((i) => i.status === "ON_PAUSE").length;
  return {
    open: active.length,
    onPause,
    openOnly: active.length - onPause,
    byLevel,
    avgAge: avgAge(active, today),
    avgAgeLastMonth: avgAge(
      all.filter((i) => activeAt(i, lastMonthEnd)),
      lastMonthEnd
    ),
    oldest: oldestItem
      ? { ref: oldestItem.ref, days: ageInDays(oldestItem.raisedOn, today) }
      : null,
    raisedThisWeek: all.filter((i) => inRange(i.raisedOn, monday, today)).length,
    closedThisWeek: all.filter((i) => inRange(i.closedOn, monday, today)).length,
    raisedMonthToDate: all.filter((i) => inRange(i.raisedOn, monthStart, today)).length,
    closedMonthToDate: all.filter((i) => inRange(i.closedOn, monthStart, today)).length,
    ageing,
    overdue,
    overdueShare: active.length ? Math.round((overdue / active.length) * 100) : 0,
    dueByClose: active.filter((i) => dueByClose(i, today, friday)).length,
    openLastWeek: all.filter((i) => activeAt(i, addDays(monday, -3))).length,
    open4WeeksAgo: all.filter((i) => activeAt(i, addDays(monday, -24))).length,
  };
}

export interface WeekPoint {
  label: string;
  open: number;
  raised: number;
  closed: number;
  current: boolean;
}

/**
 * Week-on-week series: open at week end (Friday; "today" for the week containing it), raised and
 * closed during the week (Monday–Sunday, up to today).
 */
export function weekOnWeek(
  items: readonly Item[],
  kind: LogKind,
  weeks: readonly WeekRef[],
  today: IsoDate
): WeekPoint[] {
  const all = items.filter((i) => i.kind === kind && !i.archivedAt);
  return weeks.map((w) => {
    const { monday, friday } = weekRange(w);
    const current = daysBetween(monday, today) >= 0 && daysBetween(today, friday) >= 0;
    const end = current ? today : friday;
    const sunday = current ? today : addDays(monday, 6);
    return {
      label: weekShort(w),
      open: all.filter((i) => activeAt(i, end)).length,
      raised: all.filter((i) => inRange(i.raisedOn, monday, sunday)).length,
      closed: all.filter((i) => inRange(i.closedOn, monday, sunday)).length,
      current,
    };
  });
}

export interface MonthPoint {
  month: string;
  open: number;
  /** Change in open on the previous month; null for the first month. */
  change: number | null;
  raised: number;
  closed: number;
  avgAge: number;
  toDate: boolean;
}

/** Month-on-month table: the last `count` months up to the month containing `today` (month to date). */
export function monthOnMonth(
  items: readonly Item[],
  kind: LogKind,
  today: IsoDate,
  count = 4
): MonthPoint[] {
  const all = items.filter((i) => i.kind === kind && !i.archivedAt);
  const { y, m } = parseIsoDate(today);
  const months: { start: IsoDate; end: IsoDate; m: number }[] = [];
  for (let k = count - 1; k >= 0; k--) {
    const mm = (((m - 1 - k) % 12) + 12) % 12;
    const yy = y + Math.floor((m - 1 - k) / 12);
    const start = toIsoDate({ y: yy, m: mm + 1, d: 1 });
    const nextStart = toIsoDate({ y: mm === 11 ? yy + 1 : yy, m: mm === 11 ? 1 : mm + 2, d: 1 });
    const end = k === 0 ? today : addDays(nextStart, -1);
    months.push({ start, end, m: mm + 1 });
  }
  let prev: number | null = null;
  return months.map((mo, idx) => {
    const active = all.filter((i) => activeAt(i, mo.end));
    const open = active.length;
    const point: MonthPoint = {
      month: monthName(mo.m),
      open,
      change: prev === null ? null : open - prev,
      raised: all.filter((i) => inRange(i.raisedOn, mo.start, mo.end)).length,
      closed: all.filter((i) => inRange(i.closedOn, mo.start, mo.end)).length,
      avgAge: avgAge(active, mo.end),
      toDate: idx === months.length - 1,
    };
    prev = open;
    return point;
  });
}

export interface WorkstreamLogRow {
  workstreamId: string;
  name: string;
  open: number;
  byLevel: number[];
  avgAge: number;
  openLastWeek: number;
}

/** By-workstream table for one log kind. */
export function byWorkstream(
  items: readonly (Item & { workstreamId: string })[],
  kind: LogKind,
  workstreams: readonly { id: string; name: string }[],
  week: WeekRef,
  today: IsoDate
): WorkstreamLogRow[] {
  const levels = levelsFor(kind) as readonly LogLevel[];
  const lastWeek = addDays(weekRange(week).monday, -3);
  return workstreams.map((w) => {
    const mine = items.filter((i) => i.kind === kind && i.workstreamId === w.id && !i.archivedAt);
    const active = mine.filter((i) => activeAt(i, today));
    return {
      workstreamId: w.id,
      name: w.name,
      open: active.length,
      byLevel: levels.map((l) => active.filter((i) => i.level === l).length),
      avgAge: avgAge(active, today),
      openLastWeek: mine.filter((i) => activeAt(i, lastWeek)).length,
    };
  });
}
