/**
 * Audit write helper (CLAUDE.md §5 rule 4): turns the pure audit rows from src/lib/audit.ts into
 * AuditEvent inserts, using the caller's transaction so the change and its history are saved
 * together or not at all.
 *
 *   await prisma.$transaction(async (tx) => {
 *     const before = await tx.project.findUniqueOrThrow({ where: { id } });
 *     await tx.project.update({ where: { id }, data: patch });
 *     await writeAudit(tx, viewer.id, updateRows("Project", id, before, patch));
 *   });
 */
import type { AuditRow } from "./audit";

/** The slice of a Prisma transaction client this helper needs (easy to fake in tests). */
export interface AuditTx {
  auditEvent: {
    createMany(args: {
      data: {
        userId: string | null;
        entity: string;
        entityId: string;
        action: AuditRow["action"];
        field: string;
        oldValue: string | null;
        newValue: string | null;
        at?: Date;
      }[];
    }): Promise<{ count: number }>;
  };
}

/** Writes the rows; returns how many were written (0 when nothing changed). */
export async function writeAudit(
  tx: AuditTx,
  actorId: string | null,
  rows: readonly AuditRow[],
  at: Date = new Date()
): Promise<number> {
  if (!rows.length) return 0;
  const { count } = await tx.auditEvent.createMany({
    data: rows.map((r) => ({
      userId: actorId,
      entity: r.entity,
      entityId: r.entityId,
      action: r.action,
      field: r.field,
      oldValue: r.oldValue,
      newValue: r.newValue,
      at,
    })),
  });
  return count;
}
