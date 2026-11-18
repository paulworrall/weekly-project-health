/**
 * Audit trail rows (CLAUDE.md §5 rule 4): who, when, entity, field, old value, new value. Pure:
 * works out the rows; the data layer (src/lib/audit-db.ts, brief 02)
 * writes them in the same transaction as the change.
 */

export type AuditAction = "CREATE" | "UPDATE" | "ARCHIVE" | "RESTORE" | "GENERATE";

export interface AuditRow {
  action: AuditAction;
  entity: string;
  entityId: string;
  /** Field name, or "*" for a whole-record create / archive / restore. */
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

/** Stored as text: dates as ISO, arrays joined, objects as JSON, empty as null. */
export function auditValue(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map((x) => auditValue(x) ?? "").join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Fields never audited: bookkeeping the platform sets itself. */
const IGNORED = new Set(["id", "createdAt", "updatedAt", "archivedAt", "archivedById"]);

/**
 * One UPDATE row per field whose stored text changes. Only the fields in `after` are
 * compared, so a partial patch audits just what it touched.
 */
export function updateRows(
  entity: string,
  entityId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>
): AuditRow[] {
  return Object.keys(after)
    .filter((f) => !IGNORED.has(f))
    .sort()
    .flatMap((field) => {
      const oldValue = auditValue(before[field]);
      const newValue = auditValue(after[field]);
      return oldValue === newValue
        ? []
        : [{ action: "UPDATE" as const, entity, entityId, field, oldValue, newValue }];
    });
}

/** A create is one row; `label` is what a person would recognise (e.g. the name). */
export function createRow(entity: string, entityId: string, label: string): AuditRow {
  return { action: "CREATE", entity, entityId, field: "*", oldValue: null, newValue: label };
}

/** "Delete" in the UI archives (CLAUDE.md §5 rule 3); restoring is audited too. */
export function archiveRow(entity: string, entityId: string, label: string): AuditRow {
  return { action: "ARCHIVE", entity, entityId, field: "*", oldValue: label, newValue: null };
}

export function restoreRow(entity: string, entityId: string, label: string): AuditRow {
  return { action: "RESTORE", entity, entityId, field: "*", oldValue: null, newValue: label };
}
