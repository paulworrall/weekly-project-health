/**
 * Rules for saving weekly inputs (brief 05). Pure, so the Server Actions and the tests share them.
 */
import type { IsoDate, LogKind, LogStatus } from "@/types/domain";
import { formatTime } from "./dates";
import { currentWeek, formatWeekParam, parseWeekParam } from "./week";

/** Why a save for `weekKey` isn't allowed now, or null when that week is the open one. */
export function weekEditProblem(weekKey: string, now: Date): string | null {
  const open = currentWeek(now);
  if (weekKey === formatWeekParam(open)) return null;
  const ref = parseWeekParam(weekKey);
  if (!ref) return "That week isn't valid. Reload the page.";
  return `Week ${ref.isoWeek} has closed, so it can't be changed. Your change wasn't saved: reload the page to work in week ${open.isoWeek}.`;
}

/** "R-007" / "I-012". */
export function formatRef(kind: LogKind, n: number): string {
  return `${kind === "RISK" ? "R" : "I"}-${String(n).padStart(3, "0")}`;
}

/** The closed date after a status change: set when an item closes, cleared when it reopens. */
export function closedOnAfter(
  before: { status: LogStatus; closedOn: IsoDate | null } | null,
  nextStatus: LogStatus,
  today: IsoDate
): IsoDate | null {
  if (nextStatus !== "CLOSED") return null;
  if (before?.status === "CLOSED" && before.closedOn) return before.closedOn;
  return today;
}

/** Whether the version the person opened is still the latest (both null = never saved). */
export function sameVersion(
  opened: string | null | undefined,
  latest: Date | string | null
): boolean {
  const a = opened ?? null;
  const b = latest === null ? null : typeof latest === "string" ? latest : latest.toISOString();
  return a === b;
}

/** "This was changed by Kit Varga at 10:42 since you opened it. …" */
export function conflictMessage(who: string | null, at: Date | null): string {
  const by = who ? ` by ${who}` : "";
  const when = at ? ` at ${formatTime(at.toISOString())}` : "";
  return `This was changed${by}${when} since you opened it, so your change wasn't saved. Reload to see the latest, then make your change again.`;
}
