import { describe, expect, it } from "vitest";
import { updateRows } from "@/lib/audit";
import { writeAudit, type AuditTx } from "@/lib/audit-db";

function fakeTx() {
  const written: unknown[] = [];
  const tx: AuditTx = {
    auditEvent: {
      createMany: async ({ data }) => {
        written.push(...data);
        return { count: data.length };
      },
    },
  };
  return { tx, written };
}

describe("writeAudit", () => {
  const at = new Date("2026-11-17T10:00:00Z");

  it("writes one event per changed field, with the actor and time", async () => {
    const { tx, written } = fakeTx();
    const rows = updateRows("Project", "p1", { includeInReport: false }, { includeInReport: true });
    expect(await writeAudit(tx, "u1", rows, at)).toBe(1);
    expect(written).toEqual([
      {
        userId: "u1",
        entity: "Project",
        entityId: "p1",
        action: "UPDATE",
        field: "includeInReport",
        oldValue: "false",
        newValue: "true",
        at,
      },
    ]);
  });

  it("writes nothing when nothing changed", async () => {
    const { tx, written } = fakeTx();
    expect(await writeAudit(tx, "u1", [], at)).toBe(0);
    expect(written).toEqual([]);
  });
});
