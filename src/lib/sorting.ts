/** Sort orders agreed in the designs. All return new arrays. */
import type { LogKind, LogLevel, PipelineOpportunity } from "@/types/domain";
import { dayNumber } from "./dates";
import { levelRank } from "./labels";

/** Projects: included in the weekly report first, then by job number. */
export function sortProjects<T extends { included: boolean; jobNumber: string }>(
  rows: readonly T[]
): T[] {
  return [...rows].sort(
    (a, b) => Number(b.included) - Number(a.included) || a.jobNumber.localeCompare(b.jobNumber)
  );
}

const LIKELIHOOD_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;

/** Pipeline: likelihood (High first), then soonest possible start (no date last). */
export function sortPipeline<T extends Pick<PipelineOpportunity, "likelihood" | "possibleStart">>(
  opps: readonly T[]
): T[] {
  const start = (o: T) => (o.possibleStart ? dayNumber(o.possibleStart) : Number.MAX_SAFE_INTEGER);
  return [...opps].sort(
    (a, b) => LIKELIHOOD_RANK[a.likelihood] - LIKELIHOOD_RANK[b.likelihood] || start(a) - start(b)
  );
}

/** Logs: level (most serious first), then oldest raised first, then ref. */
export function sortLog<
  T extends { kind: LogKind; level: LogLevel; raisedOn: string; ref: string },
>(items: readonly T[]): T[] {
  return [...items].sort(
    (a, b) =>
      levelRank(a.kind, a.level) - levelRank(b.kind, b.level) ||
      dayNumber(a.raisedOn) - dayNumber(b.raisedOn) ||
      a.ref.localeCompare(b.ref)
  );
}
