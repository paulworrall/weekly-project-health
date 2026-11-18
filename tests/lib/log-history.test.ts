/**
 * Phase 7: the risk and issue log trends read each closed week's snapshot, so later archives or
 * changes never alter a closed week; weeks with no record are left out; the snapshot window
 * follows the week a page shows. Synthetic data only.
 */
import { describe, expect, it } from "vitest";
import { byWorkstream, logSummary, monthOnMonth, weekOnWeek, type ItemsAt } from "@/lib/logs";
import { snapshotWindow } from "@/lib/snapshot";
import { createViews, type Dataset } from "@/lib/views";
import { closeWeekFor, closesAt, formatWeekParam, weeksBetween, type WeekRef } from "@/lib/week";
import { DEFAULT_CLIENT_ID, mockDataset } from "@/mocks/repository";
import type { LogItem } from "@/types/domain";

function item(p: Partial<LogItem> & { ref: string }): LogItem {
  return {
    id: p.ref,
    kind: p.ref.startsWith("I") ? "ISSUE" : "RISK",
    clientId: "c",
    projectId: "p",
    title: "Sample item",
    level: "MEDIUM",
    owner: "Sample Owner",
    status: "OPEN",
    raisedOn: "2026-09-01",
    dueOn: null,
    action: "",
    closedOn: null,
    archivedAt: null,
    updatedAt: "2026-09-01T09:00:00Z",
    ...p,
  };
}

const w = (isoWeek: number): WeekRef => ({ isoYear: 2026, isoWeek });
const key = (ref: WeekRef) => formatWeekParam(ref);

/** History from a map of week key → items; anything missing has no record. */
function historyOf(records: Record<string, LogItem[]>): ItemsAt {
  return (ref) => records[key(ref)] ?? null;
}

describe("closeWeekFor", () => {
  it("is the date's own week on a weekday and the next week at a weekend", () => {
    expect(closeWeekFor("2026-10-30")).toEqual(w(44)); // Friday
    expect(closeWeekFor("2026-10-31")).toEqual(w(45)); // Saturday → Fri 6 Nov
    expect(closeWeekFor("2026-11-01")).toEqual(w(45)); // Sunday
    expect(closeWeekFor("2026-11-30")).toEqual(w(49)); // Monday
    expect(closeWeekFor("2026-12-31")).toEqual(w(53)); // Thursday, ISO week 53 of 2026
  });
});

describe("log trends from each week's record", () => {
  const today = "2026-11-17"; // Tue, week 47 open
  const a = item({ ref: "R-001", raisedOn: "2026-09-01" });
  const b = item({ ref: "R-002", raisedOn: "2026-10-05" });
  // B was archived on 12 Nov and A re-graded to High: the live list shows only the new state.
  const live = [
    { ...a, level: "HIGH" as const },
    { ...b, archivedAt: "2026-11-12T10:00:00Z" },
  ];
  const records = {
    [key(w(44))]: [a, b],
    [key(w(45))]: [a, b],
    [key(w(46))]: [{ ...a, level: "HIGH" as const }],
    [key(w(47))]: live,
  };
  const history = historyOf(records);

  it("keeps a closed week's open count after a later archive", () => {
    const wow = weekOnWeek(live, "RISK", weeksBetween(w(44), w(47)), today, history);
    expect(wow.map((p) => [p.label, p.open])).toEqual([
      ["W44", 2],
      ["W45", 2],
      ["W46", 1],
      ["W47", 1],
    ]);
    // Worked out from today's list alone, B would vanish from weeks 44 and 45.
    expect(weekOnWeek(live, "RISK", weeksBetween(w(44), w(45)), today).map((p) => p.open)).toEqual([
      1, 1,
    ]);
  });

  it("leaves out weeks with no record", () => {
    const wow = weekOnWeek(live, "RISK", weeksBetween(w(40), w(47)), today, history);
    expect(wow.map((p) => p.label)).toEqual(["W44", "W45", "W46", "W47"]);
  });

  it("compares with last week and 4 weeks ago from their records, or gives no figure", () => {
    const s = logSummary(live, "RISK", w(47), today, history);
    expect(s.open).toBe(1);
    expect(s.openLastWeek).toBe(1); // week 46's record
    expect(s.open4WeeksAgo).toBeNull(); // week 43 has no record
    const t = logSummary(live, "RISK", w(46), "2026-11-13", history);
    expect(t.openLastWeek).toBe(2); // week 45 still had B
  });

  it("gives each workstream's last-week figure from last week's record", () => {
    const tagged = (xs: LogItem[]) => xs.map((x) => ({ ...x, workstreamId: "ws-1" }));
    const rows = byWorkstream(
      tagged(live),
      "RISK",
      [{ id: "ws-1", name: "Sample One" }],
      w(46),
      "2026-11-13",
      (ref) => (records[key(ref)] ? tagged(records[key(ref)]) : null)
    );
    expect(rows[0].openLastWeek).toBe(2);
    const none = byWorkstream(
      tagged(live),
      "RISK",
      [{ id: "ws-1", name: "S" }],
      w(44),
      "2026-10-30",
      () => null
    );
    expect(none[0].openLastWeek).toBeNull();
  });
});

describe("month on month at the exact month end", () => {
  it("works out the last day of a month from the first close on or after it", () => {
    // October 2026 ends on a Saturday: its figures come from week 45's close (Fri 6 Nov).
    const c = item({
      ref: "R-003",
      raisedOn: "2026-10-30",
      status: "CLOSED",
      closedOn: "2026-11-02",
    });
    const d = item({ ref: "R-004", raisedOn: "2026-10-31" }); // raised on the Saturday
    const e = item({ ref: "R-005", raisedOn: "2026-09-10" });
    const records = {
      [key(w(40))]: [e], // closes Fri 2 Oct, the first close after 30 Sep (a Wednesday)
      [key(w(45))]: [c, d, e],
      [key(w(47))]: [d, e],
    };
    const mom = monthOnMonth([d, e], "RISK", "2026-11-17", 3, historyOf(records));
    expect(mom.map((m) => [m.month, m.open, m.change, m.raised, m.closed, m.toDate])).toEqual([
      ["September", 1, null, 1, 0, false],
      ["October", 3, 2, 2, 0, false], // C (closed 2 Nov) and D were open at 31 Oct
      ["November", 2, -1, 0, 0, true],
    ]);
  });

  it("leaves out a month with no record and starts the change again", () => {
    const e = item({ ref: "R-005", raisedOn: "2026-09-10" });
    const mom = monthOnMonth([e], "RISK", "2026-11-17", 3, historyOf({ [key(w(47))]: [e] }));
    expect(mom.map((m) => [m.month, m.change])).toEqual([["November", null]]);
  });
});

describe("log page data", () => {
  const client = DEFAULT_CLIENT_ID;
  const target = mockDataset.logItems.find(
    (l) =>
      l.clientId === client &&
      l.kind === "RISK" &&
      !l.archivedAt &&
      l.closedOn === null &&
      l.raisedOn < "2026-09-01"
  )!;

  /** Snapshots for weeks `from`–46 holding the items as they are now (none archived). */
  function withSnapshots(ds: Dataset, from: number): Dataset {
    const logs = new Map();
    for (const ref of weeksBetween(w(from), w(46)))
      logs.set(`${client}|${key(ref)}`, {
        v: 1,
        items: mockDataset.logItems.filter((l) => l.clientId === client && !l.archivedAt),
        risks: {},
        issues: {},
      });
    return { ...ds, snapshots: { projects: new Map(), pipelines: new Map(), logs } };
  }

  it("keeps closed weeks' figures when an item is archived today", () => {
    const before = createViews(withSnapshots(mockDataset, 36)).getLogData(client)!;
    const archived = {
      ...mockDataset,
      logItems: mockDataset.logItems.map((l) =>
        l.id === target.id ? { ...l, archivedAt: "2026-11-17T09:00:00Z" } : l
      ),
    };
    const after = createViews(withSnapshots(archived, 36)).getLogData(client)!;
    const opens = (d: typeof before) => d.trends[""].RISK.weeks.map((p) => p.open);
    expect(opens(after).slice(0, -1)).toEqual(opens(before).slice(0, -1));
    expect(opens(after).at(-1)).toBe(opens(before).at(-1)! - 1);
    expect(after.trends[""].RISK.openLastWeek).toBe(before.trends[""].RISK.openLastWeek);
  });

  it("charts only the weeks that have a snapshot, for every workstream filter", () => {
    const d = createViews(withSnapshots(mockDataset, 44)).getLogData(client)!;
    for (const scope of Object.keys(d.trends))
      expect(d.trends[scope].ISSUE.weeks.map((p) => p.label)).toEqual(["W44", "W45", "W46", "W47"]);
    expect(d.trends[""].RISK.open4WeeksAgo).toBeNull();
  });
});

describe("snapshotWindow", () => {
  const now = new Date("2026-11-17T10:30:00Z"); // week 47 open

  it("counts back from the open week by default", () => {
    const win = snapshotWindow(now);
    expect(win.to).toEqual(closesAt(w(47)));
    expect(win.projectsFrom).toEqual(closesAt(w(37)));
    expect(win.logsFrom).toEqual(closesAt(w(29)));
  });

  it("counts back from a past week a page shows", () => {
    const win = snapshotWindow(now, "2026-W30");
    expect(win.to).toEqual(closesAt(w(30)));
    expect(win.logsFrom).toEqual(closesAt(w(12)));
  });

  it("ignores a future or invalid week", () => {
    expect(snapshotWindow(now, "2026-W50").to).toEqual(closesAt(w(47)));
    expect(snapshotWindow(now, "nonsense").to).toEqual(closesAt(w(47)));
    expect(snapshotWindow(now, ["2026-W30"]).to).toEqual(closesAt(w(47)));
  });
});
