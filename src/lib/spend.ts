/**
 * % spend (CLAUDE.md §3): a fraction from the latest confirmed upload (0.25 = 25%, may exceed 1),
 * or a status: "Add budget" (no budget in the workbook) or "No timesheet data".
 */
import type { Spend, SpendStatus } from "@/types/domain";

export const SPEND_STATUS_LABEL: Record<Exclude<SpendStatus, "VALUE">, string> = {
  NO_BUDGET: "Add budget",
  NO_TIMESHEET: "No timesheet data",
};

/** 1.12 → "112.0%". */
export function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}

/** What the % spend cell shows: "112.0%", "Add budget" or "No timesheet data". */
export function spendLabel(spend: Spend): string {
  if (spend.spendStatus === "VALUE" && spend.percentSpent !== null) {
    return formatPercent(spend.percentSpent);
  }
  return spend.spendStatus === "NO_TIMESHEET"
    ? SPEND_STATUS_LABEL.NO_TIMESHEET
    : SPEND_STATUS_LABEL.NO_BUDGET;
}

export function hasFigure(spend: Spend): boolean {
  return spend.spendStatus === "VALUE" && spend.percentSpent !== null;
}

/** Over budget: a figure above 100%. */
export function isOverBudget(spend: Spend): boolean {
  return hasFigure(spend) && (spend.percentSpent as number) > 1;
}

export type SpendBand = "UNDER_75" | "75_TO_100" | "OVER_100";

/** Bands: under 75%, 75–100% (inclusive), over 100%. Null when there is no figure. */
export function spendBand(spend: Spend): SpendBand | null {
  if (!hasFigure(spend)) return null;
  const p = spend.percentSpent as number;
  if (p < 0.75) return "UNDER_75";
  if (p <= 1) return "75_TO_100";
  return "OVER_100";
}

export interface SpendCounts {
  under75: number;
  from75to100: number;
  over100: number;
  withFigure: number;
  noBudget: number;
  noTimesheet: number;
  /** noBudget + noTimesheet. */
  noFigure: number;
}

export function spendCounts(spends: readonly Spend[]): SpendCounts {
  const c: SpendCounts = {
    under75: 0,
    from75to100: 0,
    over100: 0,
    withFigure: 0,
    noBudget: 0,
    noTimesheet: 0,
    noFigure: 0,
  };
  for (const s of spends) {
    const band = spendBand(s);
    if (band === "UNDER_75") c.under75++;
    else if (band === "75_TO_100") c.from75to100++;
    else if (band === "OVER_100") c.over100++;
    if (band) c.withFigure++;
    else if (s.spendStatus === "NO_TIMESHEET") c.noTimesheet++;
    else c.noBudget++;
  }
  c.noFigure = c.noBudget + c.noTimesheet;
  return c;
}

/** Points between spend and completion, e.g. spend 112% vs 80% complete → 32. Null without a figure. */
export function spendAheadBy(spend: Spend, percentComplete: number): number | null {
  if (!hasFigure(spend)) return null;
  return Math.round((spend.percentSpent as number) * 100 - percentComplete);
}

/** Change in percentage points between two spends, e.g. "+7.0 pts". Null if either has no figure. */
export function spendPointsChange(now: Spend, prev: Spend | null): number | null {
  if (!prev || !hasFigure(now) || !hasFigure(prev)) return null;
  return Math.round(((now.percentSpent as number) - (prev.percentSpent as number)) * 1000) / 10;
}
