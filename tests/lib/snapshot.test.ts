/** Brief 06: weekly snapshots and which weeks are due to close. Synthetic data only. */
import { describe, expect, it } from "vitest";
import type { LogItem, PipelineOpportunity, ProjectWeek } from "@/types/domain";
import { buildWeekSnapshots, weeksToClose } from "@/lib/snapshot";
import { createViews, type Dataset, type SnapshotStore } from "@/lib/views";
import { weeksBetween } from "@/lib/week";

const W = (isoWeek: number) => ({ isoYear: 2026, isoWeek });

function entry(projectId: string, week: string, over: Partial<ProjectWeek> = {}): ProjectWeek {
  return {
    projectId,
    week,
    status: "IN_PROGRESS",
    rag: "GREEN",
    percentComplete: 40,
    updateText: `Update for ${week}`,
    state: "SUBMITTED",
    submittedAt: "2026-11-06T10:00:00.000Z",
    submittedById: "u1",
    ...over,
  };
}

function log(over: Partial<LogItem> & Pick<LogItem, "id" | "kind" | "level">): LogItem {
  return {
    ref: over.id,
    clientId: "c1",
    projectId: "p1",
    title: `Sample ${over.id}`,
    owner: "Sample Owner",
    status: "OPEN",
    raisedOn: "2026-11-10",
    dueOn: null,
    action: "",
    closedOn: null,
    archivedAt: null,
    ...over,
  };
}

function opp(id: string, workstreamId: string, createdOn: string): PipelineOpportunity {
  return {
    id,
    workstreamId,
    likelihood: "HIGH",
    title: `Sample opportunity ${id}`,
    estimatedValue: 100_000,
    possibleStart: null,
    addedOn: createdOn,
    mapOwner: "Sample Owner",
    clientOwner: "Sample Client Owner",
    nextSteps: "",
    createdOn,
    archivedAt: null,
  };
}

/** Week 48 is open (Tue 24 Nov 2026); week 47 has just closed. */
function dataset(): Dataset {
  const user = {
    id: "u1",
    name: "Sample Person",
    initials: "SP",
    email: "sample@example.com",
    role: "ADMIN" as const,
    lastSignInAt: null,
    archivedAt: null,
  };
  const projectWeeks = new Map<string, ProjectWeek>();
  const add = (e: ProjectWeek) => projectWeeks.set(`${e.projectId}|${e.week}`, e);
  add(entry("p1", "2026-W45", { rag: "AMBER" }));
  add(entry("p1", "2026-W46", { state: "DRAFT", rag: "RED", submittedAt: null }));
  add(entry("p2", "2026-W47", { rag: "RED", submittedAt: "2026-11-19T09:00:00.000Z" }));
  return {
    now: new Date("2026-11-24T10:00:00Z"),
    today: "2026-11-24",
    currentWeek: W(48),
    firstWeek: W(45),
    allWeeks: weeksBetween(W(45), W(48)),
    users: [user],
    admin: user,
    clients: [{ id: "c1", name: "Sample Client", archivedAt: null }],
    workstreams: [
      {
        id: "w1",
        clientId: "c1",
        name: "Sample Reported",
        reported: true,
        accountDirector: null,
        firstSeen: "2026-11-01",
      },
      {
        id: "w2",
        clientId: "c1",
        name: "Sample Hidden",
        reported: false,
        accountDirector: null,
        firstSeen: "2026-11-01",
      },
    ],
    projects: [
      {
        id: "p1",
        workstreamId: "w1",
        jobNumber: "900001",
        name: "Sample One",
        includeInReport: true,
      },
      {
        id: "p2",
        workstreamId: "w1",
        jobNumber: "900002",
        name: "Sample Two",
        includeInReport: false,
      },
      {
        id: "p3",
        workstreamId: "w2",
        jobNumber: "900003",
        name: "Sample Three",
        includeInReport: true,
      },
    ].map((p) => ({
      ...p,
      clientId: "c1",
      missingFromFileSince: null,
      markedNoLongerInFileAt: null,
    })),
    projectWeeks,
    spend: { p1: { "2026-W47": { percentSpent: 0.5, spendStatus: "VALUE" } } },
    logItems: [
      log({ id: "R-001", kind: "RISK", level: "HIGH", dueOn: "2026-11-18" }),
      log({ id: "R-002", kind: "RISK", level: "LOW", status: "CLOSED", closedOn: "2026-11-23" }),
      log({ id: "R-003", kind: "RISK", level: "MEDIUM", archivedAt: "2026-11-22T09:00:00.000Z" }),
      log({ id: "I-001", kind: "ISSUE", level: "BLOCKER", archivedAt: "2026-11-19T09:00:00.000Z" }),
      log({ id: "I-002", kind: "ISSUE", level: "HIGH", raisedOn: "2026-11-23" }),
    ],
    pipeline: [
      opp("o1", "w1", "2026-11-01"),
      opp("o2", "w1", "2026-11-23"),
      opp("o3", "w2", "2026-11-01"),
    ],
    uploads: [],
    staged: [],
    auditEvents: [],
    logSeq: { c1: { RISK: 3, ISSUE: 2 } },
  };
}

describe("buildWeekSnapshots", () => {
  const snaps = buildWeekSnapshots(dataset(), W(47));
  const project = (id: string) => snaps.projects.find((s) => s.projectId === id)?.data;

  it("records every project in a Reported workstream, ticked or not, and no hidden ones", () => {
    expect(snaps.week).toBe("2026-W47");
    expect(snaps.projects.map((s) => s.projectId).sort()).toEqual(["p1", "p2"]);
    expect(project("p1")?.included).toBe(true);
    expect(project("p2")?.included).toBe(false);
  });

  it("carries the last submission forward as Not updated, ignoring drafts", () => {
    const p1 = project("p1")!;
    expect(p1.submittedThisWeek).toBe(false);
    expect(p1.notUpdated).toBe(true);
    expect(p1.entry?.rag).toBe("AMBER"); // week 45's submission, not week 46's RED draft
  });

  it("keeps a submission made during the week", () => {
    const p2 = project("p2")!;
    expect(p2.submittedThisWeek).toBe(true);
    expect(p2.notUpdated).toBe(false); // not in the report, so never "Not updated"
    expect(p2.entry?.rag).toBe("RED");
  });

  it("records % spend and risk and issue counts as at Friday", () => {
    const p1 = project("p1")!;
    expect(p1.spend).toEqual({ percentSpent: 0.5, spendStatus: "VALUE" });
    // R-001 open and overdue; R-002 closed after Friday (still open then); R-003 archived later.
    expect(p1.risks).toEqual({ open: { HIGH: 1, MEDIUM: 1, LOW: 1 }, overdue: 1 });
    // I-001 archived before the close; I-002 raised after Friday.
    expect(p1.issues.open).toEqual({ BLOCKER: 0, HIGH: 0, MEDIUM: 0, LOW: 0 });
  });

  it("freezes the pipeline of Reported workstreams as at the close", () => {
    expect(snaps.pipelines.map((s) => s.workstreamId)).toEqual(["w1"]);
    expect(snaps.pipelines[0].data.opportunities.map((o) => o.id)).toEqual(["o1"]);
  });

  it("freezes each client's log as it stood, with totals", () => {
    const l = snaps.logs[0].data;
    expect(l.items.map((i) => i.ref).sort()).toEqual(["R-001", "R-002", "R-003"]);
    const r2 = l.items.find((i) => i.ref === "R-002")!;
    expect(r2.status).toBe("OPEN");
    expect(r2.closedOn).toBeNull();
    expect(l.items.every((i) => i.archivedAt === null)).toBe(true);
    expect(l.risks).toMatchObject({ open: 3, overdue: 1, raisedThisWeek: 0, closedThisWeek: 0 });
    expect(l.issues.open).toBe(0);
  });
});

describe("closed weeks read their snapshot", () => {
  function store(ds: Dataset): SnapshotStore {
    const s = buildWeekSnapshots(ds, W(47));
    return {
      projects: new Map(s.projects.map((x) => [`${x.projectId}|${s.week}`, x.data])),
      pipelines: new Map(s.pipelines.map((x) => [`${x.workstreamId}|${s.week}`, x.data])),
      logs: new Map(s.logs.map((x) => [`${x.clientId}|${s.week}`, x.data])),
    };
  }

  it("shows the week as it was, even after later changes", () => {
    const before = dataset();
    const snapshots = store(before);
    // After the close: p1 unticked, a new opportunity, R-001 archived.
    const later: Dataset = {
      ...before,
      projects: before.projects.map((p) => (p.id === "p1" ? { ...p, includeInReport: false } : p)),
      pipeline: [...before.pipeline, opp("o4", "w1", "2026-11-02")],
      logItems: before.logItems.map((l) =>
        l.id === "R-001" ? { ...l, archivedAt: "2026-11-24T09:00:00.000Z" } : l
      ),
      snapshots,
    };
    const v = createViews(later).getWorkstreamOverview("c1", "w1", "2026-W47")!;
    const p1 = v.projects.find((p) => p.id === "p1")!;
    expect(p1.included).toBe(true);
    expect(p1.notUpdated).toBe(true);
    expect(p1.rag).toBe("AMBER");
    expect(p1.openRisks).toBe(3);
    expect(v.pipeline.map((o) => o.id)).toEqual(["o1"]);

    // The open week reads live data.
    const open = createViews(later).getWorkstreamOverview("c1", "w1")!;
    expect(open.projects.find((p) => p.id === "p1")!.included).toBe(false);
    expect(open.pipeline.map((o) => o.id).sort()).toEqual(["o1", "o2", "o4"]);
  });

  it("works the week out from live data when there is no snapshot", () => {
    const v = createViews(dataset()).getWorkstreamOverview("c1", "w1", "2026-W47")!;
    expect(v.projects.find((p) => p.id === "p1")!.included).toBe(true);
  });
});

describe("weeksToClose", () => {
  const periods = [
    { ...W(46), state: "CLOSED" as const },
    { ...W(47), state: "OPEN" as const },
  ];

  it("waits until Friday 23:59 London time (GMT)", () => {
    expect(weeksToClose(periods, new Date("2026-11-20T23:58:00Z"))).toEqual([]);
    expect(weeksToClose(periods, new Date("2026-11-21T01:00:00Z"))).toEqual([W(47)]);
  });

  it("uses British Summer Time when it applies", () => {
    const bst = [{ ...W(43), state: "OPEN" as const }];
    expect(weeksToClose(bst, new Date("2026-10-23T22:58:00Z"))).toEqual([]);
    expect(weeksToClose(bst, new Date("2026-10-23T23:00:00Z"))).toEqual([W(43)]);
  });

  it("catches up on missed runs and weeks nobody saved in, oldest first", () => {
    const onlyClosed = [{ ...W(45), state: "CLOSED" as const }];
    expect(weeksToClose(onlyClosed, new Date("2026-12-03T10:00:00Z"))).toEqual([
      W(46),
      W(47),
      W(48),
    ]);
  });

  it("has nothing to do once everything is closed, or with no weeks at all", () => {
    const done = [
      { ...W(47), state: "CLOSED" as const },
      { ...W(48), state: "OPEN" as const },
    ];
    expect(weeksToClose(done, new Date("2026-11-21T01:00:00Z"))).toEqual([]);
    expect(weeksToClose([], new Date("2026-11-21T01:00:00Z"))).toEqual([]);
  });
});
