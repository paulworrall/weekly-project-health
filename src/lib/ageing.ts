/**
 * Risk and issue ageing (CLAUDE.md §7): age = days since raised; bands under 14, 14–30,
 * over 30 days; overdue = past its due date and not Closed.
 */
import type { IsoDate, LogStatus } from "@/types/domain";
import { daysBetween } from "./dates";

export type AgeBand = "UNDER_14" | "14_TO_30" | "OVER_30";

export const AGE_BAND_LABEL: Record<AgeBand, string> = {
  UNDER_14: "Under 14 days",
  "14_TO_30": "14–30 days",
  OVER_30: "Over 30 days",
};

export const AGE_BAND_SHORT: Record<AgeBand, string> = {
  UNDER_14: "Under 14d",
  "14_TO_30": "14–30d",
  OVER_30: "Over 30d",
};

export function ageInDays(raisedOn: IsoDate, today: IsoDate): number {
  return Math.max(0, daysBetween(raisedOn, today));
}

export function ageBand(days: number): AgeBand {
  if (days < 14) return "UNDER_14";
  if (days <= 30) return "14_TO_30";
  return "OVER_30";
}

/** "Today", "1 day", "12 days". */
export function ageText(days: number): string {
  if (days === 0) return "Today";
  return `${days} ${days === 1 ? "day" : "days"}`;
}

interface Dated {
  status: LogStatus;
  dueOn: IsoDate | null;
}

/** Past its due date and still Open or On pause. */
export function isOverdue(item: Dated, today: IsoDate): boolean {
  return item.status !== "CLOSED" && item.dueOn !== null && daysBetween(item.dueOn, today) > 0;
}

export function daysOverdue(item: Dated, today: IsoDate): number {
  return isOverdue(item, today) ? daysBetween(item.dueOn as string, today) : 0;
}

/** "Overdue by 3 days". */
export function overdueText(item: Dated, today: IsoDate): string {
  const n = daysOverdue(item, today);
  return `Overdue by ${n} ${n === 1 ? "day" : "days"}`;
}

/** Not yet overdue, still active, and due on or before the week's close date. */
export function dueByClose(item: Dated, today: IsoDate, closeDate: IsoDate): boolean {
  if (item.status === "CLOSED" || item.dueOn === null) return false;
  return daysBetween(today, item.dueOn) >= 0 && daysBetween(item.dueOn, closeDate) >= 0;
}
