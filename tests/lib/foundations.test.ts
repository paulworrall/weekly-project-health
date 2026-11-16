// Audit and archive tests, adapted from the Reporting Hub handover pack. Synthetic values only.
import { describe, expect, it } from "vitest";
import { active, archiveData, restoreData } from "@/lib/archive";
import { archiveRow, auditValue, createRow, restoreRow, updateRows } from "@/lib/audit";

describe("audit rows", () => {
  it("writes one row per changed field, ignoring bookkeeping fields", () => {
    const rows = updateRows(
      "ProjectWeek",
      "pw1",
      { rag: "GREEN", percentComplete: 40, updatedAt: new Date(0) },
      { rag: "AMBER", percentComplete: 50, updatedAt: new Date() }
    );
    expect(rows).toEqual([
      {
        action: "UPDATE",
        entity: "ProjectWeek",
        entityId: "pw1",
        field: "percentComplete",
        oldValue: "40",
        newValue: "50",
      },
      {
        action: "UPDATE",
        entity: "ProjectWeek",
        entityId: "pw1",
        field: "rag",
        oldValue: "GREEN",
        newValue: "AMBER",
      },
    ]);
  });

  it("audits only the fields a patch touched", () => {
    const before = { name: "Sample project", includeInReport: false };
    expect(updateRows("Project", "p1", before, { includeInReport: true })).toHaveLength(1);
    expect(updateRows("Project", "p1", before, { name: "Sample project" })).toEqual([]);
  });

  it("stores values as text", () => {
    expect(auditValue(null)).toBeNull();
    expect(auditValue(undefined)).toBeNull();
    expect(auditValue(new Date("2026-11-13T10:00:00Z"))).toBe("2026-11-13T10:00:00.000Z");
    expect(auditValue(["Sample One", "Sample Two"])).toBe("Sample One, Sample Two");
    expect(auditValue({ a: 1 })).toBe(JSON.stringify({ a: 1 }));
    expect(auditValue(false)).toBe("false");
  });

  it("records create, archive and restore as whole-record rows", () => {
    expect(createRow("RiskItem", "r1", "R-001")).toMatchObject({
      action: "CREATE",
      field: "*",
      newValue: "R-001",
    });
    expect(archiveRow("RiskItem", "r1", "R-001")).toMatchObject({
      action: "ARCHIVE",
      oldValue: "R-001",
      newValue: null,
    });
    expect(restoreRow("RiskItem", "r1", "R-001")).toMatchObject({
      action: "RESTORE",
      newValue: "R-001",
    });
  });
});

describe("archive filter", () => {
  it("excludes archived rows unless asked", () => {
    expect(active({ clientId: "c" })).toEqual({ clientId: "c", archivedAt: null });
    expect(active()).toEqual({ archivedAt: null });
    expect(active({ clientId: "c" }, { includeArchived: true })).toEqual({ clientId: "c" });
    const at = new Date("2026-11-13T10:00:00Z");
    expect(archiveData("u1", at)).toEqual({ archivedAt: at, archivedById: "u1" });
    expect(restoreData()).toEqual({ archivedAt: null, archivedById: null });
  });
});
