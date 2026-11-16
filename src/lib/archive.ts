/**
 * Archive instead of delete (CLAUDE.md §5 rule 3). Every query of an archivable model goes
 * through `active()` so archived rows are excluded by default; showing them is an explicit
 * opt-in (`includeArchived`).
 */

export const ARCHIVABLE_MODELS = [
  "User",
  "Client",
  "RiskItem",
  "IssueItem",
  "PipelineOpportunity",
] as const;

/** `{ ...where, archivedAt: null }` unless archived rows were asked for. */
export function active<W extends Record<string, unknown>>(
  where: W = {} as W,
  options: { includeArchived?: boolean } = {}
): W & { archivedAt?: null } {
  if (options.includeArchived) return where;
  return { ...where, archivedAt: null };
}

/** The fields an archive writes. */
export function archiveData(actorId: string, at: Date = new Date()) {
  return { archivedAt: at, archivedById: actorId };
}

/** The fields a restore writes. */
export function restoreData() {
  return { archivedAt: null, archivedById: null };
}
