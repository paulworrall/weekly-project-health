import { describe, expect, it } from "vitest";
import { createViews } from "@/lib/views";
import { mockDataset } from "@/mocks/repository";
import { datasetFromRows, rowsFromDataset } from "@/server/rows";

describe("database rows round trip", () => {
  const rows = rowsFromDataset(mockDataset);
  const back = datasetFromRows(rows, mockDataset.now);
  const a = createViews(mockDataset);
  const b = createViews(back);

  it("seeds every record", () => {
    expect(rows.clients).toHaveLength(2);
    expect(rows.projects).toHaveLength(mockDataset.projects.length);
    expect(rows.periods).toHaveLength(13);
    expect(rows.periods.filter((p) => p.state === "OPEN")).toHaveLength(1);
    expect(rows.projectWeeks).toHaveLength(mockDataset.projectWeeks.size);
    expect(rows.risks.length + rows.issues.length).toBe(mockDataset.logItems.length);
    expect(rows.uploads.filter((u) => u.status === "READY_TO_REVIEW")).toHaveLength(1);
    expect(new Set(rows.projectSpends.map((s) => s.id)).size).toBe(rows.projectSpends.length);
    expect(rows.clients.find((c) => c.id === "northwind")?.riskSeq).toBeGreaterThan(0);
  });

  it("loads back into the same dataset", () => {
    expect(back.currentWeek).toEqual(mockDataset.currentWeek);
    expect(back.allWeeks).toEqual(mockDataset.allWeeks);
    expect(back.projects).toEqual(mockDataset.projects);
    expect(back.workstreams).toEqual(mockDataset.workstreams);
    expect([...back.projectWeeks.entries()].sort()).toEqual(
      [...mockDataset.projectWeeks.entries()]
        .map(([k, v]) => [k, { ...v, notUpdated: !!v.notUpdated }])
        .sort()
    );
    expect(back.logSeq).toEqual(mockDataset.logSeq);
  });

  it("gives identical page views", () => {
    for (const id of ["northwind", "tccc"]) {
      expect(b.getClientOverview(id)).toEqual(a.getClientOverview(id));
      expect(b.getClientOverview(id, "2026-W44")).toEqual(a.getClientOverview(id, "2026-W44"));
      expect(b.getLogData(id)).toEqual(a.getLogData(id));
    }
    expect(b.getWorkstreamOverview("northwind", "alpha-eu")).toEqual(
      a.getWorkstreamOverview("northwind", "alpha-eu")
    );
    const included = mockDataset.projects.find((p) => p.includeInReport)!;
    expect(b.getProjectPage(included.id, "2026-W46")).toEqual(
      a.getProjectPage(included.id, "2026-W46")
    );
    expect(b.getAdminHome()).toEqual(a.getAdminHome());
    expect(b.getUploadsView("northwind")).toEqual(a.getUploadsView("northwind"));
    expect(b.getUploadsView("tccc")).toEqual(a.getUploadsView("tccc"));
  });
});
