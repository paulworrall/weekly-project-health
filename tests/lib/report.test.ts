/** Brief 07: the report model, built from the synthetic sample data. */
import { describe, expect, it } from "vitest";
import { mockDataset } from "@/mocks/repository";
import { createViews, type Dataset, type SnapshotStore } from "@/lib/views";
import { buildReport, paginateProjects, reportReadiness } from "@/lib/report";
import { buildWeekSnapshots } from "@/lib/snapshot";
import type { WorkstreamProjectsSlide } from "@/types/report";

const NOW = mockDataset.now;
const views = createViews(mockDataset);
const kinds = (r: ReturnType<typeof buildReport>) =>
  r!.slides.map((s) =>
    s.kind === "workstreamProjects" ? `${s.workstreamName}:${s.part}/${s.parts}` : s.kind
  );

describe("paginateProjects", () => {
  it("puts 6 on the first slide and 12 on each further slide", () => {
    const n = (count: number) => paginateProjects(count).length;
    expect([0, 6, 7, 18, 19].map(n)).toEqual([1, 1, 2, 2, 3]);
    expect(paginateProjects(0)).toEqual([{ from: 0, to: 0 }]);
    expect(paginateProjects(19)).toEqual([
      { from: 1, to: 6 },
      { from: 7, to: 18 },
      { from: 19, to: 19 },
    ]);
  });
});

describe("client report", () => {
  const r = buildReport(views, { clientId: "northwind" }, undefined, NOW)!;

  it("orders the slides: summary, pipeline, then each workstream A–Z", () => {
    expect(kinds(r)).toEqual([
      "clientSummary",
      "clientPipeline",
      "Alpha EU:1/2",
      "Alpha EU:2/2",
      "workstreamPipeline",
      "Beta Global:1/1",
      "workstreamPipeline",
      "Delta Retail:1/1", // no opportunities: no pipeline slide
      "Epsilon Data:1/1",
      "workstreamPipeline",
      "Gamma Nordics:1/2",
      "Gamma Nordics:2/2",
      "workstreamPipeline",
    ]);
  });

  it("numbers the pages after assembling", () => {
    expect(r.slides.map((s) => s.page)).toEqual(r.slides.map((_, i) => i + 1));
    expect(r.slides.every((s) => s.pages === 13)).toBe(true);
  });

  it("names the report and the week", () => {
    expect(r.meta).toMatchObject({
      kind: "client",
      name: "Northwind Drinks weekly report",
      weekKey: "2026-W47",
      open: true,
      fileName: "Northwind Drinks weekly report 2026-W47",
    });
    expect(r.meta.asOfText).toBe("Live figures as of Tue 17 Nov 2026, 10:30");
  });

  it("shows a workstream over two slides with page x of y and continuation text", () => {
    const [a, b] = r.slides.filter(
      (s): s is WorkstreamProjectsSlide =>
        s.kind === "workstreamProjects" && s.workstreamName === "Alpha EU"
    );
    expect(a.eyebrow).toBe("Workstream 1 of 5");
    expect(a.projects).toHaveLength(6);
    expect(a.tiles).not.toBeNull();
    expect(a.trend).toHaveLength(8);
    expect(a.continuation).toBe("Continued on the next slide: projects 7–8 of 8 →");
    expect(b.title).toBe("Alpha EU (continued)");
    expect(b.tiles).toBeNull();
    expect([b.from, b.to]).toEqual([7, 8]);
    expect(b.continuation).toBe("End of Alpha EU's projects · pipeline on the next slide");
  });

  it("uses last submitted values for projects not updated, never drafts", () => {
    const ov = views.getWorkstreamOverview("northwind", "alpha-eu")!;
    const drafted = ov.projects.filter((p) => p.included && p.draftThisWeek);
    expect(drafted.length).toBeGreaterThan(0);
    const rows = r.slides
      .filter((s): s is WorkstreamProjectsSlide => s.kind === "workstreamProjects")
      .flatMap((s) => s.projects);
    for (const p of drafted) {
      const row = rows.find((x) => x.jobNumber === p.jobNumber)!;
      expect(row.rag).toBe(p.rag); // the last submitted value shown on the site
      expect(row.notUpdatedText).toMatch(/^Not updated · .*\(draft saved\)$/);
    }
  });

  it("summarises the pipeline across workstreams", () => {
    const p = r.slides[1];
    if (p.kind !== "clientPipeline") throw new Error("expected the client pipeline slide");
    expect(p.summary.count).toBe(11);
    expect(p.rows.map((x) => x.name)).toHaveLength(5);
    expect(p.headline).toMatch(
      /^\$[\d.]+[km] in the Northwind Drinks pipeline across 11 opportunities/
    );
  });
});

describe("workstream report", () => {
  it("has the workstream's project slides then its pipeline", () => {
    const r = buildReport(
      views,
      { clientId: "northwind", workstreamId: "gamma-nordics" },
      undefined,
      NOW
    )!;
    expect(kinds(r)).toEqual(["Gamma Nordics:1/2", "Gamma Nordics:2/2", "workstreamPipeline"]);
    expect(r.meta.name).toBe("Gamma Nordics workstream report");
    expect(r.meta.fileName).toBe("Northwind Drinks Gamma Nordics report 2026-W47");
    expect(r.slides[0].kind === "workstreamProjects" && r.slides[0].eyebrow).toBe(
      "Workstream report"
    );
  });

  it("leaves out the pipeline slide when there are no opportunities", () => {
    const r = buildReport(
      views,
      { clientId: "northwind", workstreamId: "delta-retail" },
      undefined,
      NOW
    )!;
    expect(kinds(r)).toEqual(["Delta Retail:1/1"]);
  });

  it("returns null for an unknown or hidden workstream", () => {
    expect(
      buildReport(views, { clientId: "northwind", workstreamId: "nope" }, undefined, NOW)
    ).toBeNull();
    expect(buildReport(views, { clientId: "nope" }, undefined, NOW)).toBeNull();
  });
});

describe("past weeks and trends", () => {
  it("shows the weeks that exist when there are fewer than 8", () => {
    const r = buildReport(views, { clientId: "northwind" }, "2026-W37", NOW)!;
    const s = r.slides[0];
    if (s.kind !== "clientSummary") throw new Error("expected the client summary");
    expect(s.trend.map((t) => t.label)).toEqual(["W35", "W36", "W37"]);
    expect(r.meta.open).toBe(false);
    expect(r.meta.asOfText).toBe("Final figures: week closed Fri 11 Sep 2026 at 23:59");
  });

  it("labels the open week as live", () => {
    const r = buildReport(views, { clientId: "northwind" }, undefined, NOW)!;
    const s = r.slides[0];
    if (s.kind !== "clientSummary") throw new Error("expected the client summary");
    expect(s.trend.at(-1)?.label).toBe("W47 live");
    expect(s.trend[0].label).toBe("W40");
  });

  it("reads a closed week from its snapshot", () => {
    const snaps = buildWeekSnapshots(mockDataset, { isoYear: 2026, isoWeek: 46 });
    const store: SnapshotStore = {
      projects: new Map(snaps.projects.map((x) => [`${x.projectId}|${snaps.week}`, x.data])),
      pipelines: new Map(snaps.pipelines.map((x) => [`${x.workstreamId}|${snaps.week}`, x.data])),
      logs: new Map(snaps.logs.map((x) => [`${x.clientId}|${snaps.week}`, x.data])),
    };
    // After the close, every project is taken out of the report.
    const later: Dataset = {
      ...mockDataset,
      projects: mockDataset.projects.map((p) => ({ ...p, includeInReport: false })),
      snapshots: store,
    };
    const before = buildReport(views, { clientId: "northwind" }, "2026-W46", NOW)!;
    const after = buildReport(createViews(later), { clientId: "northwind" }, "2026-W46", NOW)!;
    const inReport = (x: typeof before) =>
      x.slides[0].kind === "clientSummary" ? x.slides[0].tiles.inReport : -1;
    expect(inReport(after)).toBe(inReport(before));
    expect(inReport(after)).toBeGreaterThan(0);
  });
});

describe("reportReadiness", () => {
  it("counts submitted, draft saved and not started, and lists those not updated", () => {
    const r = reportReadiness(views, { clientId: "northwind" }, undefined, NOW)!;
    expect(r.open).toBe(true);
    expect(r.inReport).toBe(29);
    expect(r.submitted).toBe(17);
    expect(r.draft).toBe(5);
    expect(r.notStarted).toBe(7);
    expect(r.notUpdated).toHaveLength(12);
    expect(r.byWorkstream[0]).toEqual({ name: "Alpha EU", inReport: 8, updated: 4, notUpdated: 4 });
    expect(r.closesText).toBe("Fri 20 Nov at 23:59");
    expect(r.notUpdated.filter((p) => p.state === "DRAFT")).toHaveLength(5);
  });

  it("marks everyone not updated in a closed week as Not updated", () => {
    const r = reportReadiness(views, { clientId: "northwind" }, "2026-W46", NOW)!;
    expect(r.open).toBe(false);
    expect(r.draft).toBe(0);
    expect(r.notUpdated.every((p) => p.state === "NOT_UPDATED")).toBe(true);
  });

  it("covers one workstream for a workstream report", () => {
    const r = reportReadiness(
      views,
      { clientId: "northwind", workstreamId: "beta-global" },
      undefined,
      NOW
    )!;
    expect(r.byWorkstream.map((w) => w.name)).toEqual(["Beta Global"]);
    expect(r.inReport).toBe(6);
  });
});
