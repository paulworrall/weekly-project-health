/**
 * Reporting weeks (CLAUDE.md §3): ISO weeks, shown Monday–Friday, closing Friday 23:59
 * Europe/London. All week maths happens on London calendar dates; `closesAt` converts the
 * London wall-clock close to a UTC instant, correct across the GMT/BST changes.
 */
import {
  LONDON,
  addDays,
  dayNumber,
  formatDate,
  fromDayNumber,
  londonDate,
  parseIsoDate,
  shortMonth,
} from "./dates";

export interface WeekRef {
  isoYear: number;
  isoWeek: number;
}

/** ISO week of a calendar date. */
export function isoWeekOfDate(iso: string): WeekRef {
  const n = dayNumber(iso);
  const dow = (new Date(n * 86_400_000).getUTCDay() + 6) % 7; // Mon = 0
  const thursday = n - dow + 3;
  const isoYear = new Date(thursday * 86_400_000).getUTCFullYear();
  const jan1 = Math.round(Date.UTC(isoYear, 0, 1) / 86_400_000);
  return { isoYear, isoWeek: Math.floor((thursday - jan1) / 7) + 1 };
}

/** ISO week of an instant, using the London calendar date. */
export function isoWeekOf(at: Date): WeekRef {
  return isoWeekOfDate(londonDate(at));
}

/** Monday of ISO week 1. */
function week1Monday(isoYear: number): number {
  const jan4 = Math.round(Date.UTC(isoYear, 0, 4) / 86_400_000);
  const dow = (new Date(jan4 * 86_400_000).getUTCDay() + 6) % 7;
  return jan4 - dow;
}

export function weeksInYear(isoYear: number): number {
  return (week1Monday(isoYear + 1) - week1Monday(isoYear)) / 7;
}

/** Monday and Friday (calendar dates) of a week. */
export function weekRange(ref: WeekRef): { monday: string; friday: string } {
  const monday = week1Monday(ref.isoYear) + (ref.isoWeek - 1) * 7;
  return { monday: fromDayNumber(monday), friday: fromDayNumber(monday + 4) };
}

export function addWeeks(ref: WeekRef, n: number): WeekRef {
  return isoWeekOfDate(addDays(weekRange(ref).monday, n * 7));
}

export function compareWeeks(a: WeekRef, b: WeekRef): number {
  return a.isoYear - b.isoYear || a.isoWeek - b.isoWeek;
}

export function sameWeek(a: WeekRef, b: WeekRef): boolean {
  return compareWeeks(a, b) === 0;
}

/** "16–20 Nov 2026", "30 Nov – 4 Dec 2026", "29 Dec 2025 – 2 Jan 2026". */
export function weekDates(ref: WeekRef): string {
  const { monday, friday } = weekRange(ref);
  const a = parseIsoDate(monday);
  const b = parseIsoDate(friday);
  if (a.y !== b.y) return `${formatDate(monday)} – ${formatDate(friday)}`;
  if (a.m !== b.m) return `${a.d} ${shortMonth(a.m)} – ${b.d} ${shortMonth(b.m)} ${b.y}`;
  return `${a.d}–${b.d} ${shortMonth(b.m)} ${b.y}`;
}

/** "Week 47 · 16–20 Nov 2026". */
export function weekLabel(ref: WeekRef): string {
  return `Week ${ref.isoWeek} · ${weekDates(ref)}`;
}

/** "W47". */
export function weekShort(ref: WeekRef): string {
  return `W${ref.isoWeek}`;
}

/** Offset of London from UTC, in minutes, at an instant (0 in GMT, 60 in BST). */
export function londonOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUtc - Math.floor(at.getTime() / 60_000) * 60_000) / 60_000);
}

/** Friday 23:59 Europe/London of the week, as a UTC instant. */
export function closesAt(ref: WeekRef): Date {
  const { y, m, d } = parseIsoDate(weekRange(ref).friday);
  const wallAsUtc = Date.UTC(y, m - 1, d, 23, 59);
  // Friday 23:59 is never inside a clock change (those happen early on Sunday morning).
  const offset = londonOffsetMinutes(new Date(wallAsUtc));
  return new Date(wallAsUtc - offset * 60_000);
}

/** A week is closed once its close time has passed. */
export function isClosed(ref: WeekRef, now: Date): boolean {
  return now.getTime() > closesAt(ref).getTime();
}

/** The open reporting week at an instant (the week after a close is open immediately). */
export function currentWeek(now: Date): WeekRef {
  const ref = isoWeekOf(now);
  return isClosed(ref, now) ? addWeeks(ref, 1) : ref;
}

/** "2026-W46". */
export function formatWeekParam(ref: WeekRef): string {
  return `${ref.isoYear}-W${String(ref.isoWeek).padStart(2, "0")}`;
}

/** Parse "2026-W46" (also "2026-w46"); null when invalid. */
export function parseWeekParam(value: string | null | undefined): WeekRef | null {
  const match = /^(\d{4})-[Ww](\d{1,2})$/.exec((value ?? "").trim());
  if (!match) return null;
  const isoYear = Number(match[1]);
  const isoWeek = Number(match[2]);
  if (isoWeek < 1 || isoWeek > weeksInYear(isoYear)) return null;
  return { isoYear, isoWeek };
}

/** Weeks from `from` to `to` inclusive, oldest first. */
export function weeksBetween(from: WeekRef, to: WeekRef): WeekRef[] {
  const out: WeekRef[] = [];
  for (let w = from; compareWeeks(w, to) <= 0; w = addWeeks(w, 1)) out.push(w);
  return out;
}

/** The last calendar day of a week for "as at week end" counts: its Friday. */
export function weekEnd(ref: WeekRef): string {
  return weekRange(ref).friday;
}
