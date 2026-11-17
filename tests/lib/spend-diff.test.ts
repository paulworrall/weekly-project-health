import { describe, expect, it } from "vitest";
import { confirmProblem, diffSpendFile, type LiveProject } from "@/lib/spend-diff";
import type { SpendRow } from "@/services/parsing/spend-file";

const row = (
  jobNumber: string,
  name: string,
  workstream: string,
  pct: number | null
): SpendRow => ({
  rowNumber: 2,
  jobNumber,
  name,
  workstream,
  percentSpent: pct,
  spendStatus: pct === null ? "NO_BUDGET" : "VALUE",
});
const live = (
  jobNumber: string,
  name: string,
  workstreamName: string,
  pct: number | null
): LiveProject => ({
  id: `p-${jobNumber}`,
  jobNumber,
  name,
  workstreamName,
  spend:
    pct === null
      ? { percentSpent: null, spendStatus: "NO_BUDGET" }
      : { percentSpent: pct, spendStatus: "VALUE" },
});

describe("diffSpendFile", () => {
  const d = diffSpendFile(
    [
      row("1", "SAMPLE_Same", "Alpha", 0.5),
      row("2", "SAMPLE_Renamed now", "Alpha", 0.5),
      row("3", "SAMPLE_Moved", "Beta", 0.5),
      row("4", "SAMPLE_Spend", "Alpha", 0.62),
      row("5", "SAMPLE_Tiny", "Alpha", 0.50004),
      row("7", "SAMPLE_New", "Gamma", null),
    ],
    [
      live("1", "SAMPLE_Same", "Alpha", 0.5),
      live("2", "SAMPLE_Renamed", "Alpha", 0.5),
      live("3", "SAMPLE_Moved", "Alpha", 0.5),
      live("4", "SAMPLE_Spend", "Alpha", 0.5),
      live("5", "SAMPLE_Tiny", "Alpha", 0.5),
      live("6", "SAMPLE_Missing", "Alpha", 0.2),
    ],
    ["Alpha", "Beta"]
  );

  it("finds each kind of change", () => {
    expect(d.counts).toEqual({ new: 1, renamed: 1, moved: 1, spend: 1, missing: 1 });
    expect(d.changes.find((c) => c.type === "NEW")).toMatchObject({
      jobNumber: "7",
      after: "Add budget",
      workstreamName: "Gamma",
    });
    expect(d.changes.find((c) => c.field === "name")).toMatchObject({
      before: "SAMPLE_Renamed",
      after: "SAMPLE_Renamed now",
    });
    expect(d.changes.find((c) => c.type === "MOVED")).toMatchObject({
      before: "Alpha",
      after: "Beta",
    });
    expect(d.changes.find((c) => c.field === "percentSpent")).toMatchObject({
      jobNumber: "4",
      before: "50.0%",
      after: "62.0%",
    });
    expect(d.changes.find((c) => c.type === "MISSING")).toMatchObject({
      jobNumber: "6",
      workstreamName: "Alpha",
    });
  });

  it("ignores spend changes too small to show, and lists new workstreams", () => {
    expect(d.changes.some((c) => c.jobNumber === "5")).toBe(false);
    expect(d.newWorkstreams).toEqual(["Gamma"]);
  });
});

describe("confirmProblem", () => {
  const ready = { status: "READY_TO_REVIEW", errorCount: 0 };
  it("needs a ready upload with stored rows, no errors and every missing project decided", () => {
    expect(confirmProblem(ready, [{ type: "MISSING", decision: "KEEP" }], 10)).toBeNull();
    expect(confirmProblem({ ...ready, status: "LIVE" }, [], 10)).toMatch(/isn't waiting/);
    expect(confirmProblem(ready, [], 0)).toMatch(/sample/);
    expect(confirmProblem({ ...ready, errorCount: 2 }, [], 10)).toMatch(/2 rows with errors/);
    expect(
      confirmProblem(ready, [{ type: "MISSING" }, { type: "MISSING", decision: null }], 10)
    ).toBe("2 missing projects need a decision before you can confirm.");
  });
});
