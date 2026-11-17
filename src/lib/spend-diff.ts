/**
 * Compare a parsed spend file with the client's live data (brief 04). Pure: the check action
 * passes the live projects and their latest % spend, and stores the result as the upload's
 * change list. Types follow SpendUploadChange (NEW / CHANGED name or % spend / MOVED / MISSING).
 */
import type { MissingDecision, Spend, SpendUploadChange } from "@/types/domain";
import type { SpendRow } from "@/services/parsing/spend-file";
import { spendLabel } from "./spend";

export interface LiveProject {
  id: string;
  jobNumber: string;
  name: string;
  workstreamName: string;
  /** Latest confirmed % spend, if any. */
  spend: Spend | null;
}

export interface SpendDiff {
  changes: Omit<SpendUploadChange, "id">[];
  /** Workstream names in the file that the client doesn't have yet (created Hidden). */
  newWorkstreams: string[];
  counts: { new: number; renamed: number; moved: number; spend: number; missing: number };
}

const spendOf = (r: SpendRow): Spend => ({
  percentSpent: r.percentSpent,
  spendStatus: r.spendStatus,
});

export function diffSpendFile(
  rows: readonly SpendRow[],
  live: readonly LiveProject[],
  liveWorkstreams: readonly string[]
): SpendDiff {
  const byJob = new Map(live.map((p) => [p.jobNumber, p]));
  const inFile = new Set(rows.map((r) => r.jobNumber));
  const changes: SpendDiff["changes"] = [];
  for (const r of rows) {
    const p = byJob.get(r.jobNumber);
    const after = spendLabel(spendOf(r));
    if (!p) {
      changes.push({
        type: "NEW",
        jobNumber: r.jobNumber,
        projectName: r.name,
        workstreamName: r.workstream,
        before: null,
        after,
      });
      continue;
    }
    if (p.name !== r.name) {
      changes.push({
        type: "CHANGED",
        field: "name",
        jobNumber: r.jobNumber,
        projectName: r.name,
        workstreamName: r.workstream,
        before: p.name,
        after: r.name,
      });
    }
    if (p.workstreamName !== r.workstream) {
      changes.push({
        type: "MOVED",
        jobNumber: r.jobNumber,
        projectName: r.name,
        workstreamName: r.workstream,
        before: p.workstreamName,
        after: r.workstream,
      });
    }
    // Changed when what people see changes: 112.0% → 113.5%, or a figure ↔ a status.
    const before = p.spend ? spendLabel(p.spend) : null;
    if (before !== after) {
      changes.push({
        type: "CHANGED",
        field: "percentSpent",
        jobNumber: r.jobNumber,
        projectName: r.name,
        workstreamName: r.workstream,
        before,
        after,
      });
    }
  }
  for (const p of live) {
    if (!inFile.has(p.jobNumber)) {
      changes.push({
        type: "MISSING",
        jobNumber: p.jobNumber,
        projectName: p.name,
        workstreamName: p.workstreamName,
        before: null,
        after: null,
      });
    }
  }
  const known = new Set(liveWorkstreams);
  const newWorkstreams = [...new Set(rows.map((r) => r.workstream))]
    .filter((w) => !known.has(w))
    .sort();
  const count = (t: string, f?: string) =>
    changes.filter((c) => c.type === t && (!f || c.field === f)).length;
  return {
    changes,
    newWorkstreams,
    counts: {
      new: count("NEW"),
      renamed: count("CHANGED", "name"),
      moved: count("MOVED"),
      spend: count("CHANGED", "percentSpent"),
      missing: count("MISSING"),
    },
  };
}

/** Why an upload can't be confirmed yet, or null when it can. */
export function confirmProblem(
  upload: { status: string; errorCount: number },
  changes: readonly { type: string; decision?: MissingDecision | null }[],
  storedRows: number
): string | null {
  if (upload.status !== "READY_TO_REVIEW") return "This upload isn't waiting for review any more.";
  if (storedRows === 0)
    return "This preview is a sample with no file behind it. Check a real file to confirm.";
  if (upload.errorCount > 0)
    return `The file has ${upload.errorCount} ${upload.errorCount === 1 ? "row" : "rows"} with errors. Fix the source workbook and check it again.`;
  const pending = changes.filter((c) => c.type === "MISSING" && !c.decision).length;
  if (pending)
    return `${pending} missing ${pending === 1 ? "project needs" : "projects need"} a decision before you can confirm.`;
  return null;
}
