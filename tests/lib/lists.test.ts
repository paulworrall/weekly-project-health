import { describe, expect, it } from "vitest";
import { EMPTY_LOG_FILTERS, EMPTY_PROJECT_FILTERS, filterLog, filterProjects } from "@/lib/filters";
import { byWorkstream, logSummary, monthOnMonth, weekOnWeek } from "@/lib/logs";
import { needsAttention, outstandingUpdates, sumTiles, workstreamTiles } from "@/lib/rollup";
import { sortLog, sortPipeline, sortProjects } from "@/lib/sorting";
import { weeksBetween } from "@/lib/week";
import type { LogItem } from "@/types/domain";
import type { LogRow, ProjectRow } from "@/types/views";

function row(p: Partial<ProjectRow> & { jobNumber: string }): ProjectRow {
  return {
    id: `p-${p.jobNumber}`,
    name: `Sample ${p.jobNumber}`,
    workstreamId: "ws-a",
    workstreamName: "Alpha EU",
    included: false,
    spend: { percentSpent: 0.5, spendStatus: "VALUE" },
    status: null,
    rag: null,
    percentComplete: null,
    submittedThisWeek: false,
    draftThisWeek: false,
    notUpdated: false,
    lastSubmittedAt: null,
    lastSubmittedBy: null,
    openRisks: 0,
    openIssues: 0,
    ...p,
  };
}

function item(p: Partial<LogItem> & { ref: string }): LogItem {
  return {
    id: p.ref,
    kind: "RISK",
    clientId: "c",
    projectId: "p-100001",
    title: `Sample ${p.ref}`,
    level: "MEDIUM",
    owner: "Sample Owner",
    status: "OPEN",
    raisedOn: "2026-11-01",
    dueOn: null,
    action: "",
    closedOn: null,
    archivedAt: null,
    ...p,
  };
}

const lr = (i: LogItem, ws = "ws-a"): LogRow => ({
  ...i,
  projectJob: "100001",
  projectName: "Sample project",
  workstreamId: ws,
  workstreamName: ws,
});

describe("sorting", () => {
  it("pins included projects, then sorts by job number", () => {
    const sorted = sortProjects([
      row({ jobNumber: "300000" }),
      row({ jobNumber: "200000", included: true }),
      row({ jobNumber: "100000" }),
      row({ jobNumber: "400000", included: true }),
    ]);
    expect(sorted.map((r) => r.jobNumber)).toEqual(["200000", "400000", "100000", "300000"]);
  });

  it("sorts the pipeline by likelihood, then soonest start", () => {
    const sorted = sortPipeline([
      { likelihood: "LOW", possibleStart: "2027-01-01" },
      { likelihood: "HIGH", possibleStart: null },
      { likelihood: "HIGH", possibleStart: "2027-02-01" },
      { likelihood: "MEDIUM", possibleStart: "2026-12-01" },
    ] as const);
    expect(sorted.map((o) => `${o.likelihood} ${o.possibleStart}`)).toEqual([
      "HIGH 2027-02-01",
      "HIGH null",
      "MEDIUM 2026-12-01",
      "LOW 2027-01-01",
    ]);
  });

  it("sorts logs by level, then oldest first", () => {
    const sorted = sortLog([
      item({ ref: "I-003", kind: "ISSUE", level: "HIGH", raisedOn: "2026-11-10" }),
      item({ ref: "I-001", kind: "ISSUE", level: "LOW", raisedOn: "2026-09-01" }),
      item({ ref: "I-002", kind: "ISSUE", level: "BLOCKER", raisedOn: "2026-11-15" }),
      item({ ref: "I-004", kind: "ISSUE", level: "HIGH", raisedOn: "2026-10-01" }),
    ]);
    expect(sorted.map((i) => i.ref)).toEqual(["I-002", "I-004", "I-003", "I-001"]);
  });
});

describe("filters", () => {
  const rows = [
    row({
      jobNumber: "100001",
      included: true,
      rag: "RED",
      submittedThisWeek: true,
      lastSubmittedBy: "Kit Varga",
    }),
    row({
      jobNumber: "100002",
      included: true,
      rag: "GREEN",
      spend: { percentSpent: 1.2, spendStatus: "VALUE" },
    }),
    row({ jobNumber: "100003", spend: { percentSpent: null, spendStatus: "NO_BUDGET" } }),
  ];

  it("shows everything with no filters", () => {
    expect(filterProjects(rows, EMPTY_PROJECT_FILTERS)).toHaveLength(3);
  });

  it("filters by inclusion, search, submitter, RAG, this week and spend", () => {
    const f = EMPTY_PROJECT_FILTERS;
    expect(filterProjects(rows, { ...f, show: "OUT" }).map((r) => r.jobNumber)).toEqual(["100003"]);
    expect(filterProjects(rows, { ...f, q: "kit" }).map((r) => r.jobNumber)).toEqual(["100001"]);
    expect(filterProjects(rows, { ...f, submitter: "Kit Varga" })).toHaveLength(1);
    expect(filterProjects(rows, { ...f, rag: "GREEN" }).map((r) => r.jobNumber)).toEqual([
      "100002",
    ]);
    expect(
      filterProjects(rows, { ...f, thisWeek: "NOT_SUBMITTED" }).map((r) => r.jobNumber)
    ).toEqual(["100002"]);
    expect(filterProjects(rows, { ...f, spend: "OVER" }).map((r) => r.jobNumber)).toEqual([
      "100002",
    ]);
    expect(filterProjects(rows, { ...f, spend: "NO_BUDGET" }).map((r) => r.jobNumber)).toEqual([
      "100003",
    ]);
  });

  it("filters logs by status, level, age and overdue", () => {
    const today = "2026-11-17";
    const items = [
      lr(item({ ref: "R-001", raisedOn: "2026-11-10", dueOn: "2026-11-15" })),
      lr(item({ ref: "R-002", raisedOn: "2026-09-01", level: "HIGH", status: "ON_PAUSE" })),
      lr(item({ ref: "R-003", raisedOn: "2026-10-01", status: "CLOSED", closedOn: "2026-11-02" })),
    ];
    const f = EMPTY_LOG_FILTERS;
    expect(filterLog(items, f, today).map((i) => i.ref)).toEqual(["R-001", "R-002"]);
    expect(filterLog(items, { ...f, status: "ALL" }, today)).toHaveLength(3);
    expect(filterLog(items, { ...f, level: "HIGH" }, today).map((i) => i.ref)).toEqual(["R-002"]);
    expect(filterLog(items, { ...f, age: "OVERDUE" }, today).map((i) => i.ref)).toEqual(["R-001"]);
    expect(filterLog(items, { ...f, age: "OVER_30" }, today).map((i) => i.ref)).toEqual(["R-002"]);
    expect(filterLog(items, { ...f, q: "r-002" }, today)).toHaveLength(1);
  });
});

describe("log figures", () => {
  const w47 = { isoYear: 2026, isoWeek: 47 };
  const today = "2026-11-17";
  const items = [
    item({ ref: "R-001", raisedOn: "2026-08-20", level: "HIGH" }),
    item({ ref: "R-002", raisedOn: "2026-10-20", status: "ON_PAUSE", dueOn: "2026-11-10" }),
    item({ ref: "R-003", raisedOn: "2026-11-16", dueOn: "2026-11-20" }),
    item({ ref: "R-004", raisedOn: "2026-10-01", status: "CLOSED", closedOn: "2026-11-16" }),
    item({ ref: "R-005", raisedOn: "2026-10-01", archivedAt: "2026-11-01T10:00:00Z" }),
    item({ ref: "I-001", kind: "ISSUE", raisedOn: "2026-11-01" }),
  ];

  it("summarises the open log", () => {
    const s = logSummary(items, "RISK", w47, today);
    expect(s.open).toBe(3);
    expect(s.onPause).toBe(1);
    expect(s.byLevel).toEqual({ HIGH: 1, MEDIUM: 2, LOW: 0 });
    expect(s.oldest).toEqual({ ref: "R-001", days: 89 });
    expect(s.raisedThisWeek).toBe(1);
    expect(s.closedThisWeek).toBe(1);
    expect(s.overdue).toBe(1);
    expect(s.overdueShare).toBe(33);
    expect(s.dueByClose).toBe(1);
    expect(s.openLastWeek).toBe(3); // R-001, R-002, R-004 at Fri 13 Nov
    expect(s.ageing).toEqual({ UNDER_14: 1, "14_TO_30": 1, OVER_30: 1 });
  });

  it("builds week-on-week and month-on-month series", () => {
    const weeks = weeksBetween({ isoYear: 2026, isoWeek: 46 }, w47);
    const wow = weekOnWeek(items, "RISK", weeks, today);
    expect(wow.map((w) => [w.label, w.open, w.raised, w.closed, w.current])).toEqual([
      ["W46", 3, 0, 0, false],
      ["W47", 3, 1, 1, true],
    ]);
    const mom = monthOnMonth(items, "RISK", today, 2);
    expect(mom.map((m) => [m.month, m.open, m.change, m.raised, m.closed, m.toDate])).toEqual([
      ["October", 3, null, 2, 0, false],
      ["November", 3, 0, 1, 1, true],
    ]);
  });

  it("splits by workstream", () => {
    const rows = [
      { ...items[0], workstreamId: "a" },
      { ...items[2], workstreamId: "b" },
    ];
    const t = byWorkstream(
      rows,
      "RISK",
      [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      w47,
      today
    );
    expect(t.map((r) => [r.name, r.open, r.byLevel, r.openLastWeek])).toEqual([
      ["A", 1, [1, 0, 0], 1],
      ["B", 1, [0, 1, 0], 0],
    ]);
  });
});

describe("roll-ups", () => {
  const rows = [
    row({
      jobNumber: "100001",
      included: true,
      rag: "RED",
      status: "IN_PROGRESS",
      submittedThisWeek: true,
    }),
    row({
      jobNumber: "100002",
      included: true,
      rag: "GREEN",
      status: "COMPLETE",
      spend: { percentSpent: 1.2, spendStatus: "VALUE" },
    }),
    row({
      jobNumber: "100003",
      included: true,
      rag: "AMBER",
      status: "ON_HOLD",
      draftThisWeek: true,
      spend: { percentSpent: null, spendStatus: "NO_TIMESHEET" },
    }),
    row({ jobNumber: "100004" }),
  ];
  const logs = [
    item({ ref: "R-001", projectId: "p-100001" }),
    item({ ref: "R-002", projectId: "p-100004" }),
    item({ ref: "I-001", kind: "ISSUE", projectId: "p-100002", raisedOn: "2026-11-16" }),
  ];

  it("computes workstream tiles for projects in the report only", () => {
    const t = workstreamTiles(
      rows,
      logs,
      [{ likelihood: "HIGH" }, { likelihood: "LOW" }],
      "2026-11-17",
      "2026-11-13"
    );
    expect(t).toMatchObject({
      inReport: 3,
      total: 4,
      submitted: 1,
      complete: 1,
      onHold: 1,
      rag: { GREEN: 1, AMBER: 1, RED: 1 },
      risks: 1,
      risksPrev: 1,
      issues: 1,
      issuesPrev: 0,
      pipeline: 2,
      pipelineHigh: 1,
    });
    expect(t.spend).toMatchObject({ under75: 1, over100: 1, noFigure: 1, noTimesheet: 1 });
    expect(sumTiles([t, t]).inReport).toBe(6);
  });

  it("lists projects needing attention, with reasons", () => {
    const list = needsAttention(rows);
    expect(list.map((r) => [r.jobNumber, r.reasons])).toEqual([
      ["100001", ["Blocked"]],
      ["100002", ["Over budget", "Not updated this week"]],
      ["100003", ["Not updated this week"]],
    ]);
  });

  it("lists outstanding updates, drafts first", () => {
    expect(outstandingUpdates(rows).map((r) => r.jobNumber)).toEqual(["100003", "100002"]);
  });
});
