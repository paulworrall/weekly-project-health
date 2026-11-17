/**
 * Calendar-date helpers. Calendar dates are ISO strings ("2026-11-16") with no time zone;
 * timestamps are shown in Europe/London. Pure: "today" is always passed in.
 */

export const LONDON = "Europe/London";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface Ymd {
  y: number;
  /** 1–12 */
  m: number;
  d: number;
}

export function parseIsoDate(iso: string): Ymd {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y, m, d };
}

export function toIsoDate({ y, m, d }: Ymd): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Days since 1970-01-01 for a calendar date (no time zone involved). */
export function dayNumber(iso: string): number {
  const { y, m, d } = parseIsoDate(iso);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function fromDayNumber(n: number): string {
  const dt = new Date(n * 86_400_000);
  return toIsoDate({ y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() });
}

export function addDays(iso: string, days: number): string {
  return fromDayNumber(dayNumber(iso) + days);
}

/** Whole days from `a` to `b` (b − a). */
export function daysBetween(a: string, b: string): number {
  return dayNumber(b) - dayNumber(a);
}

/** The calendar date in London for an instant. */
export function londonDate(at: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return toIsoDate({ y: get("year"), m: get("month"), d: get("day") });
}

/** "16 Nov 2026". */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const { y, m, d } = parseIsoDate(iso);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "16 Nov". */
export function formatDayMonth(iso: string): string {
  const { m, d } = parseIsoDate(iso);
  return `${d} ${MONTHS[m - 1]}`;
}

/** "Fri 20 Nov". */
export function formatWeekdayDayMonth(iso: string): string {
  const dow = new Date(dayNumber(iso) * 86_400_000).getUTCDay();
  return `${DAYS[dow]} ${formatDayMonth(iso)}`;
}

export function monthName(m: number): string {
  return MONTHS_LONG[m - 1];
}

export function shortMonth(m: number): string {
  return MONTHS[m - 1];
}

/** "16 Nov 2026, 09:12" in London time. */
export function formatDateTime(isoDateTime: string | null | undefined): string {
  if (!isoDateTime) return "—";
  const at = new Date(isoDateTime);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
  return `${formatDate(londonDate(at))}, ${time}`;
}

/** "09:12" in London time. */
export function formatTime(isoDateTime: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(isoDateTime));
}

/** "Today", "Yesterday", "3 days ago" (calendar days in London). */
export function relativeDays(isoDateTime: string, now: Date): string {
  const days = daysBetween(londonDate(new Date(isoDateTime)), londonDate(now));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}
