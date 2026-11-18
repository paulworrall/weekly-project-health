/**
 * Risk and issue log figures (decision log: "Risk log and issue log"). Pure functions over
 * log items. "Active" = Open or On pause; archived items never count. Counts "at" a date use
 * the raised and closed dates.
 *
 * Earlier weeks and months read `history`: the items as they stood at each week's close (its
 * snapshot; the open week's live items). A later archive or change of level never alters a
 * closed week's figures, and a week with no record is left out (phase 7). Without `history`
 * the current items are used for every week, as for data with no snapshots at all.
 */
import type { IsoDate, LogItem, LogKind, LogLevel } from "@/types/domain";
import { ageBand, ageInDays, dueByClose, isOverdue, type AgeBand } from "./ageing";
import { addDays, daysBetween, monthName, parseIsoDate, toIsoDate } from "./dates";
import { levelsFor } from "./labels";
import { addWeeks, closeWeekFor, weekRange, weekShort, type WeekRef } from "./week";

type Item = Pick<
  LogItem,
  "kind" | "ref" | "level" | "status" | "raisedOn" | "closedOn" | "dueOn" | "archivedAt"
>;

/** The items as they stood at a week's close (the open week: live); null when no record exists. */
export type ItemsAt<T extends Item = Item> = (week: WeekRef) => readonly T[] | null;

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

/** Active items of `kind` at the end of `date`, read from the record of the close covering it. */
function activeFrom(history: ItemsAt, kind: LogKind, date: IsoDate): Item[] | null {
  const items = history(closeWeekFor(date));
  return items ? items.filter((i) => i.kind === kind && !i.archivedAt && activeAt(i, date)) : null;
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
  /** Null when there is no record for that date (as for the other comparisons below). */
  avgAgeLastMonth: number | null;
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
  openLastWeek: number | null;
  open4WeeksAgo: number | null;
}

/**
 * Summary for one log as at `today` within the reporting `week` (today is the real day for the
 * open week, the Friday for a closed week).
 */
export function logSummary(
  items: readonly Item[],
  kind: LogKind,
  week: WeekRef,
  today: IsoDate,
  history: ItemsAt = () => items
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
  const lastMonth = activeFrom(history, kind, lastMonthEnd);
  const lastWeek = activeFrom(history, kind, weekRange(addWeeks(week, -1)).friday);
  const fourAgo = activeFrom(history, kind, weekRange(addWeeks(week, -4)).friday);
  return {
    open: active.length,
    onPause,
    openOnly: active.length - onPause,
    byLevel,
    avgAge: avgAge(active, today),
    avgAgeLastMonth: lastMonth ? avgAge(lastMonth, lastMonthEnd) : null,
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
    openLastWeek: lastWeek?.length ?? null,
    open4WeeksAgo: fourAgo?.length ?? null,
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
 * closed during the week (Monday–Sunday, up to today), each week from its own record. Weeks
 * with no record are left out.
 */
export function weekOnWeek(
  items: readonly Item[],
  kind: LogKind,
  weeks: readonly WeekRef[],
  today: IsoDate,
  history: ItemsAt = () => items
): WeekPoint[] {
  return weeks.flatMap((w) => {
    const record = history(w);
    if (!record) return [];
    const all = record.filter((i) => i.kind === kind && !i.archivedAt);
    const { monday, friday } = weekRange(w);
    const current = daysBetween(monday, today) >= 0 && daysBetween(today, friday) >= 0;
    const end = current ? today : friday;
    const sunday = current ? today : addDays(monday, 6);
    return [
      {
        label: weekShort(w),
        open: all.filter((i) => activeAt(i, end)).length,
        raised: all.filter((i) => inRange(i.raisedOn, monday, sunday)).length,
        closed: all.filter((i) => inRange(i.closedOn, monday, sunday)).length,
        current,
      },
    ];
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

/**
 * Month-on-month table: the last `count` months up to the month containing `today` (month to
 * date). Each finished month is worked out for its last day from the record of the first close
 * on or after it (decision 18 Nov); months with no record are left out.
 */
export function monthOnMonth(
  items: readonly Item[],
  kind: LogKind,
  today: IsoDate,
  count = 4,
  history: ItemsAt = () => items
): MonthPoint[] {
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
  return months.flatMap((mo, idx) => {
    const record = history(closeWeekFor(mo.end));
    if (!record) {
      prev = null;
      return [];
    }
    const all = record.filter((i) => i.kind === kind && !i.archivedAt);
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
    return [point];
  });
}

export interface WorkstreamLogRow {
  workstreamId: string;
  name: string;
  open: number;
  byLevel: number[];
  avgAge: number;
  openLastWeek: number | null;
}

/** By-workstream table for one log kind. */
export function byWorkstream(
  items: readonly (Item & { workstreamId: string })[],
  kind: LogKind,
  workstreams: readonly { id: string; name: string }[],
  week: WeekRef,
  today: IsoDate,
  history: ItemsAt<Item & { workstreamId: string }> = () => items
): WorkstreamLogRow[] {
  const levels = levelsFor(kind) as readonly LogLevel[];
  const lastFriday = weekRange(addWeeks(week, -1)).friday;
  const lastWeek = history(addWeeks(week, -1));
  return workstreams.map((w) => {
    const mine = items.filter((i) => i.kind === kind && i.workstreamId === w.id && !i.archivedAt);
    const active = mine.filter((i) => activeAt(i, today));
    return {
      workstreamId: w.id,
      name: w.name,
      open: active.length,
      byLevel: levels.map((l) => active.filter((i) => i.level === l).length),
      avgAge: avgAge(active, today),
      openLastWeek: lastWeek
        ? lastWeek.filter(
            (i) =>
              i.kind === kind && i.workstreamId === w.id && !i.archivedAt && activeAt(i, lastFriday)
          ).length
        : null,
    };
  });
}
