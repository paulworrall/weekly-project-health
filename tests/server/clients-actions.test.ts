/**
 * Brief 08: Admin › Clients. Name rules, Admin-only actions, audit rows in the same
 * transaction, archive and restore. Prisma is replaced by an in-memory stand-in. Synthetic data.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clientNameProblem, clientNameSchema, nameKey } from "@/lib/clients";

type Row = { id: string; name: string; archivedAt: Date | null; archivedById: string | null };

const db = vi.hoisted(() => ({
  clients: [] as Row[],
  audit: [] as Record<string, unknown>[],
  staged: 0,
  viewer: null as null | { id: string; role: "ADMIN" | "UPDATER"; mustChangePassword: boolean },
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/viewer", () => ({ getViewer: async () => db.viewer }));
vi.mock("@/lib/prisma", () => {
  const client = {
    findMany: async () => db.clients.map((c) => ({ ...c })),
    // A copy, as Prisma returns: later updates don't change what was read.
    findUnique: async ({ where }: { where: { id: string } }) => {
      const row = db.clients.find((c) => c.id === where.id);
      return row ? { ...row } : null;
    },
    create: async ({ data }: { data: { name: string } }) => {
      const row = {
        id: `c${db.clients.length + 1}`,
        name: data.name,
        archivedAt: null,
        archivedById: null,
      };
      db.clients.push(row);
      return row;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
      const row = db.clients.find((c) => c.id === where.id)!;
      Object.assign(row, data);
      return row;
    },
  };
  const auditEvent = {
    createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
      db.audit.push(...data);
      return { count: data.length };
    },
  };
  return {
    prisma: {
      client,
      spendUpload: { count: async () => db.staged },
      $transaction: async (fn: (tx: unknown) => unknown) => fn({ client, auditEvent }),
    },
  };
});

const { archiveClientAction, createClientAction, renameClientAction, restoreClientAction } =
  await import("@/app/(app)/admin/clients/actions");

const ADMIN = { id: "u-admin", role: "ADMIN" as const, mustChangePassword: false };

beforeEach(() => {
  db.clients = [{ id: "c1", name: "Sample Foods", archivedAt: null, archivedById: null }];
  db.audit = [];
  db.staged = 0;
  db.viewer = ADMIN;
});

describe("client names", () => {
  it("tidies spacing and needs 1–80 characters", () => {
    expect(clientNameSchema.parse({ name: "  Sample   Drinks " }).name).toBe("Sample Drinks");
    expect(clientNameSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(clientNameSchema.safeParse({ name: "x".repeat(81) }).success).toBe(false);
  });

  it("refuses a name in use, ignoring case and spacing, and points to an archived one", () => {
    const existing = [
      { id: "a", name: "Sample Foods", archivedAt: null },
      { id: "b", name: "Old Sample", archivedAt: "2026-10-01T00:00:00Z" },
    ];
    expect(nameKey(" sample  FOODS ")).toBe("sample foods");
    expect(clientNameProblem("sample foods", existing)).toMatch(/already a client called/);
    expect(clientNameProblem("old sample", existing)).toMatch(/archived client.*Restore it/);
    expect(clientNameProblem("Sample Foods", existing, "a")).toBeNull(); // its own name
    expect(clientNameProblem("New Sample", existing)).toBeNull();
  });
});

describe("Clients actions", () => {
  it("are for the Admin only", async () => {
    db.viewer = { id: "u-up", role: "UPDATER", mustChangePassword: false };
    const r = await createClientAction({ name: "New Sample" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("FORBIDDEN");
    db.viewer = null;
    const s = await archiveClientAction("c1");
    if (!s.ok) expect(s.code).toBe("UNAUTHENTICATED");
    expect(db.clients).toHaveLength(1);
    expect(db.audit).toHaveLength(0);
  });

  it("adds a client with an audit row", async () => {
    const r = await createClientAction({ name: " New  Sample " });
    expect(r).toEqual({ ok: true, data: { id: "c2", name: "New Sample" } });
    expect(db.audit).toEqual([
      expect.objectContaining({
        userId: "u-admin",
        action: "CREATE",
        entity: "Client",
        entityId: "c2",
        newValue: "New Sample",
      }),
    ]);
  });

  it("gives field errors for a blank or duplicate name", async () => {
    const blank = await createClientAction({ name: "" });
    expect(blank.ok === false && blank.fieldErrors?.name).toBe("Enter the client's name.");
    const dup = await createClientAction({ name: "SAMPLE foods" });
    expect(dup.ok === false && dup.code).toBe("CONFLICT");
    expect(dup.ok === false && dup.fieldErrors?.name).toMatch(/already a client/);
    expect(db.audit).toHaveLength(0);
  });

  it("renames with the old and new names recorded", async () => {
    const r = await renameClientAction("c1", { name: "Sample Foods Group" });
    expect(r.ok).toBe(true);
    expect(db.clients[0].name).toBe("Sample Foods Group");
    expect(db.audit).toEqual([
      expect.objectContaining({
        action: "UPDATE",
        entity: "Client",
        field: "name",
        oldValue: "Sample Foods",
        newValue: "Sample Foods Group",
      }),
    ]);
    expect((await renameClientAction("nope", { name: "X" })).ok).toBe(false);
  });

  it("archives and restores, recording both, and won't rename while archived", async () => {
    expect((await archiveClientAction("c1")).ok).toBe(true);
    expect(db.clients[0].archivedAt).toBeInstanceOf(Date);
    expect(db.clients[0].archivedById).toBe("u-admin");
    const rename = await renameClientAction("c1", { name: "Other" });
    expect(rename.ok === false && rename.message).toMatch(/Restore the client/);
    expect((await archiveClientAction("c1")).ok).toBe(true); // second click: no new row
    expect((await restoreClientAction("c1")).ok).toBe(true);
    expect(db.clients[0].archivedAt).toBeNull();
    expect(db.audit.map((a) => a.action)).toEqual(["ARCHIVE", "RESTORE"]);
  });

  it("won't archive a client with a spend upload waiting for review", async () => {
    db.staged = 1;
    const r = await archiveClientAction("c1");
    expect(r.ok === false && r.message).toMatch(/waiting for review/);
    expect(db.clients[0].archivedAt).toBeNull();
  });
});
