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
    expect(WORKSTREAMS).toHaveLength(13);
    expect(WORKSTREAMS.filter((w) => w.reported)).toHaveLength(5);
    expect(WORKSTREAMS.some((w) => w.name === "UNMAPPED" && !w.reported)).toBe(true);
    expect(PROJECTS.filter((p) => p.workstreamId === "alpha-eu")).toHaveLength(181);
    expect(new Set(PROJECTS.map((p) => p.jobNumber)).size).toBe(PROJECTS.length);
    expect(PROJECTS.every((p) => /^\d{6}$/.test(p.jobNumber))).toBe(true);
    expect(USERS.filter((u) => u.role === "ADMIN")).toHaveLength(1);
    expect(USERS.filter((u) => u.role === "UPDATER")).toHaveLength(12);
    expect(CLIENTS[0].name).toBe("Northwind Drinks");
    for (const w of WORKSTREAMS.filter((x) => x.reported)) {
      expect(PIPELINE.filter((o) => o.workstreamId === w.id).length).toBeLessThanOrEqual(4);
    }
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
    expect(logs.chartWeeks).toHaveLength(12);
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
    expect(up.staged.changes.filter((c) => c.type === "MISSING")).toHaveLength(3);
    expect(new Set(up.history.map((h) => h.upload.status))).toEqual(
      new Set(["LIVE", "REPLACED", "REJECTED", "CANCELLED"])
    );
  });
});
