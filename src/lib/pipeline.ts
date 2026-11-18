/**
 * Pipeline value and time in pipeline (brief 05b; decisions 17 Nov 2026 "Pipeline value" and
 * "Time in pipeline"). Pure: shared by the pages, the tiles and (brief 07) the report.
 */
import type { IsoDate, Likelihood, PipelineOpportunity } from "@/types/domain";
import { LIKELIHOODS } from "@/types/domain";
import { daysBetween, parseIsoDate, toIsoDate } from "./dates";

/** More than this many days in the pipeline is flagged. */
export const LONG_RUNNING_DAYS = 90;

type Opp = Pick<PipelineOpportunity, "likelihood" | "estimatedValue" | "addedOn" | "possibleStart">;

/** Whole days from the added date to `asOf` (both London calendar dates); never negative. */
export function daysInPipeline(addedOn: IsoDate, asOf: IsoDate): number {
  return Math.max(0, daysBetween(addedOn, asOf));
}

/** Over 90 days (90 itself is not over). */
export function isLongRunning(days: number): boolean {
  return days > LONG_RUNNING_DAYS;
}

/** The same day `n` calendar months later, clamped to the month's end (30 Nov + 3 = 28 Feb). */
export function addMonths(iso: IsoDate, n: number): IsoDate {
  const { y, m, d } = parseIsoDate(iso);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return toIsoDate({ y: ny, m: nm, d: Math.min(d, last) });
}

export interface CountValue {
  count: number;
  /** Total of the opportunities that have a value. */
  value: number;
}

export interface PipelineSummary extends CountValue {
  byLikelihood: Record<Likelihood, CountValue>;
  /** Average whole days in the pipeline (0 when empty). */
  averageDays: number;
  /** The longest time in the pipeline (0 when empty). */
  oldestDays: number;
  /** Over 90 days. */
  longRunning: CountValue;
  /** Possible start on or before `asOf` + 3 calendar months (no possible start = not counted). */
  nextThreeMonths: CountValue;
  /** Opportunities with no value ("Not set"): counted everywhere except value totals. */
  notValued: number;
}

const add = (a: CountValue, o: Opp): CountValue => ({
  count: a.count + 1,
  value: a.value + (o.estimatedValue ?? 0),
});
const zero = (): CountValue => ({ count: 0, value: 0 });

export function pipelineSummary(opps: readonly Opp[], asOf: IsoDate): PipelineSummary {
  const byLikelihood = Object.fromEntries(LIKELIHOODS.map((l) => [l, zero()])) as Record<
    Likelihood,
    CountValue
  >;
  let total = zero();
  let longRunning = zero();
  let nextThreeMonths = zero();
  let notValued = 0;
  let days = 0;
  let oldestDays = 0;
  const horizon = addMonths(asOf, 3);
  for (const o of opps) {
    total = add(total, o);
    byLikelihood[o.likelihood] = add(byLikelihood[o.likelihood], o);
    const d = daysInPipeline(o.addedOn, asOf);
    days += d;
    oldestDays = Math.max(oldestDays, d);
    if (isLongRunning(d)) longRunning = add(longRunning, o);
    if (o.possibleStart && daysBetween(o.possibleStart, horizon) >= 0)
      nextThreeMonths = add(nextThreeMonths, o);
    if (o.estimatedValue === null) notValued++;
  }
  return {
    ...total,
    byLikelihood,
    averageDays: opps.length ? Math.round(days / opps.length) : 0,
    oldestDays,
    longRunning,
    nextThreeMonths,
    notValued,
  };
}

/** Sum of summaries (a client from its workstreams); averages weighted by count. */
export function sumSummaries(list: readonly PipelineSummary[]): PipelineSummary {
  const plus = (a: CountValue, b: CountValue) => ({
    count: a.count + b.count,
    value: a.value + b.value,
  });
  const count = list.reduce((s, x) => s + x.count, 0);
  return {
    count,
    value: list.reduce((s, x) => s + x.value, 0),
    byLikelihood: Object.fromEntries(
      LIKELIHOODS.map((l) => [l, list.reduce((s, x) => plus(s, x.byLikelihood[l]), zero())])
    ) as Record<Likelihood, CountValue>,
    averageDays: count
      ? Math.round(list.reduce((s, x) => s + x.averageDays * x.count, 0) / count)
      : 0,
    oldestDays: list.reduce((s, x) => Math.max(s, x.oldestDays), 0),
    longRunning: list.reduce((s, x) => plus(s, x.longRunning), zero()),
    nextThreeMonths: list.reduce((s, x) => plus(s, x.nextThreeMonths), zero()),
    notValued: list.reduce((s, x) => s + x.notValued, 0),
  };
}

export const emptySummary = (): PipelineSummary => sumSummaries([]);

/** "$450,000" (tables and forms), or "Not set". */
export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return "Not set";
  return `$${Math.round(value).toLocaleString("en-GB")}`;
}

/** "$950", "$450k", "$12.5k", "$1.98m", "$1.5m", "$2m" (tiles and slides), or "Not set". */
export function formatMoneyCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return "Not set";
  const v = Math.round(value);
  const trim = (n: number, dp: number) => String(Number(n.toFixed(dp)));
  if (v < 1000) return `$${v}`;
  const k = v < 10_000 ? Number((v / 1000).toFixed(1)) : Math.round(v / 1000);
  if (k < 1000) return `$${trim(k, 1)}k`;
  return `$${trim(v / 1_000_000, 2)}m`;
}

/** A tile's value: "Not set" when every opportunity is unvalued, otherwise compact. */
export function tileValue(value: number, count: number, notValued: number): string {
  return count > 0 && notValued === count ? "Not set" : formatMoneyCompact(value);
}

/** "57 days", "1 day". */
export function formatDays(days: number): string {
  return `${days} ${days === 1 ? "day" : "days"}`;
}
