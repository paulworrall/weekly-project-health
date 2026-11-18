import { describe, expect, it } from "vitest";
import {
  DEFAULT_CLIENT_ID,
  getAdminHome,
  getClientOverview,
  getLogData,
  getProjectPage,
  getUploadsView,
  getWorkstreamOverview,
  resolveWeek,
} from "@/mocks/repository";
import { CLIENTS, PIPELINE, PROJECTS, USERS, WORKSTREAMS } from "@/mocks/data";

describe("mock data", () => {
  it("has the agreed shape", () => {
    const nw = WORKSTREAMS.filter((w) => w.clientId === "northwind");
    expect(nw).toHaveLength(13);
    expect(nw.filter((w) => w.reported)).toHaveLength(5);
    expect(nw.some((w) => w.name === "UNMAPPED" && !w.reported)).toBe(true);
    expect(PROJECTS.filter((p) => p.workstreamId === "alpha-eu")).toHaveLength(181);
    const nwProjects = PROJECTS.filter((p) => p.clientId === "northwind");
    expect(new Set(nwProjects.map((p) => p.jobNumber)).size).toBe(nwProjects.length);
    expect(PROJECTS.every((p) => /^\d{6}$/.test(p.jobNumber))).toBe(true);
    expect(USERS.filter((u) => u.role === "ADMIN")).toHaveLength(1);
    expect(USERS.filter((u) => u.role === "UPDATER")).toHaveLength(12);
    expect(CLIENTS[0].name).toBe("Northwind Drinks");
    expect(PROJECTS.filter((p) => p.clientId === "northwind")).toHaveLength(633);
    for (const w of WORKSTREAMS.filter((x) => x.reported)) {
      expect(PIPELINE.filter((o) => o.workstreamId === w.id).length).toBeLessThanOrEqual(4);
    }
  });
});

describe("client from a spend file", () => {
  it("loads every row of the approved file as a second client", () => {
    const client = CLIENTS.find((c) => c.id === "tccc")!;
    expect(client).toBeDefined();
    const ws = WORKSTREAMS.filter((w) => w.clientId === client.id);
    expect(ws).toHaveLength(13);
    expect(ws.filter((w) => w.reported)).toHaveLength(5);
    const projects = PROJECTS.filter((p) => p.clientId === client.id);
    expect(projects).toHaveLength(869);
    expect(projects.every((p) => !p.includeInReport)).toBe(true);
    expect(new Set(PROJECTS.map((p) => p.id)).size).toBe(PROJECTS.length);
  });

  it("lists reported workstreams A–Z on the client page and in the logs", () => {
    for (const id of ["tccc", "northwind"]) {
      const names = getClientOverview(id)!.workstreams.map((w) => w.workstream.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en-GB")));
      expect(getLogData(id)!.workstreams.map((w) => w.name)).toEqual(names);
    }
  });

  it("invents nothing for its real projects", () => {
    const overview = getClientOverview("tccc")!;
    expect(overview.totals.inReport).toBe(0);
    expect(overview.totals.risks + overview.totals.issues + overview.totals.pipeline).toBe(0);
    expect(overview.latestUpload?.upload.rowCount).toBe(869);
    const up = getUploadsView("tccc")!;
    expect(up.staged).toBeNull();
    expect(up.latestStats).toMatchObject({
      records: 869,
      overBudget: 44,
      noBudget: 517,
      noTimesheet: 252,
    });
  });
});

describe("mock repository", () => {
  it("resolves weeks, falling back to the open week", () => {
    expect(resolveWeek(undefined)).toMatchObject({
      key: "2026-W47",
      closed: false,
      asOf: "2026-11-17",
    });
    expect(resolveWeek("2026-W46")).toMatchObject({
      key: "2026-W46",
      closed: true,
      asOf: "2026-11-13",
    });
    expect(resolveWeek("2026-W50").key).toBe("2026-W47");
    expect(resolveWeek("2026-W20").key).toBe("2026-W47");
    expect(resolveWeek("nonsense").key).toBe("2026-W47");
  });

  it("builds the client and workstream views", () => {
    const client = getClientOverview(DEFAULT_CLIENT_ID)!;
    expect(client.workstreams).toHaveLength(5);
    expect(client.totals.inReport).toBe(29);
    expect(client.needsAttention.every((r) => r.included && r.reasons.length > 0)).toBe(true);
    const ws = getWorkstreamOverview(DEFAULT_CLIENT_ID, "alpha-eu", "2026-W46")!;
    expect(ws.projects).toHaveLength(181);
    expect(ws.week.closed).toBe(true);
    expect(getWorkstreamOverview(DEFAULT_CLIENT_ID, "unmapped")).toBeNull();
    expect(getClientOverview("nope")).toBeNull();
  });

  it("builds the project page with 8 weeks of history", () => {
    const included = PROJECTS.find((p) => p.includeInReport)!;
    const page = getProjectPage(included.id)!;
    expect(page.spendTrend).toHaveLength(8);
    expect(page.ragHistory).toHaveLength(8);
    expect(page.ragHistory.at(-1)?.current).toBe(true);
    const hidden = PROJECTS.find((p) => p.workstreamId === "unmapped")!;
    expect(getProjectPage(hidden.id)).toBeNull();
  });

  it("builds the logs with every status", () => {
    const logs = getLogData(DEFAULT_CLIENT_ID)!;
    // Sample data has no snapshots, so every week is worked out from the current items.
    expect(logs.trends[""].RISK.weeks).toHaveLength(12);
    expect(logs.trends[""].ISSUE.months).toHaveLength(4);
    expect(Object.keys(logs.trends)).toEqual(["", ...logs.workstreams.map((w) => w.id)]);
    expect(logs.items.length).toBeGreaterThan(20);
    expect(new Set(logs.items.map((i) => i.status))).toEqual(
      new Set(["OPEN", "ON_PAUSE", "CLOSED"])
    );
    expect(logs.items.every((i) => /^[RI]-\d{3}$/.test(i.ref))).toBe(true);
  });

  it("builds admin home and uploads", () => {
    const home = getAdminHome();
    expect(home.outstanding.length).toBe(home.inReport - home.submitted);
    const up = getUploadsView(DEFAULT_CLIENT_ID)!;
    expect(up.staged!.changes.filter((c) => c.type === "MISSING")).toHaveLength(3);
    expect(new Set(up.history.map((h) => h.upload.status))).toEqual(
      new Set(["LIVE", "REPLACED", "REJECTED", "CANCELLED"])
    );
  });
});
