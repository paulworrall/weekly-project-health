/** Brief 07: who can generate a report, Not found for hidden scopes, and the audit row. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const viewer = vi.hoisted(() => ({
  current: null as null | { id: string; name: string; initials: string; role: "ADMIN" | "UPDATER" },
}));
const audit = vi.hoisted(() => ({ rows: [] as unknown[] }));

vi.mock("@/lib/viewer", () => ({
  requireViewer: async () => {
    if (!viewer.current) throw new Error("NEXT_REDIRECT /login");
    return viewer.current;
  },
}));
vi.mock("@/server/repository", async () => {
  const { mockDataset } = await import("@/mocks/repository");
  const { createViews } = await import("@/lib/views");
  return { getRepository: async () => createViews(mockDataset) };
});
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        auditEvent: {
          createMany: async ({ data }: { data: unknown[] }) => {
            audit.rows.push(...data);
            return { count: data.length };
          },
        },
      }),
  },
}));

import { loadReport } from "@/server/report";

beforeEach(() => {
  audit.rows = [];
  viewer.current = { id: "u-updater", name: "Sample Person", initials: "SP", role: "UPDATER" };
});

describe("loadReport", () => {
  it("sends signed-out visitors to sign in", async () => {
    viewer.current = null;
    await expect(loadReport({ clientId: "northwind" }, undefined, "HTML")).rejects.toThrow(
      /NEXT_REDIRECT/
    );
    expect(audit.rows).toHaveLength(0);
  });

  it("lets an Updater generate, and records who, what, week and format", async () => {
    const r = await loadReport(
      { clientId: "northwind", workstreamId: "alpha-eu" },
      undefined,
      "PPTX"
    );
    expect(r?.meta.name).toBe("Alpha EU workstream report");
    expect(audit.rows).toEqual([
      expect.objectContaining({
        userId: "u-updater",
        action: "GENERATE",
        entity: "Report",
        entityId: "northwind/alpha-eu",
        field: "format",
        newValue: "PowerPoint · Alpha EU workstream report · 2026-W47",
      }),
    ]);
  });

  it("lets an Admin generate too", async () => {
    viewer.current = { id: "u-admin", name: "Sample Admin", initials: "SA", role: "ADMIN" };
    expect(await loadReport({ clientId: "northwind" }, "2026-W46", "HTML")).not.toBeNull();
    expect(audit.rows).toEqual([
      expect.objectContaining({ newValue: "HTML · Northwind Drinks weekly report · 2026-W46" }),
    ]);
  });

  it("gives Not found for an unknown client or a hidden workstream, with nothing recorded", async () => {
    expect(await loadReport({ clientId: "nope" }, undefined, "HTML")).toBeNull();
    expect(
      await loadReport({ clientId: "northwind", workstreamId: "unmapped" }, undefined, "HTML")
    ).toBeNull();
    expect(audit.rows).toHaveLength(0);
  });
});
