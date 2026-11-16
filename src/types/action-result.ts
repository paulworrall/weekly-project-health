/** Every Server Action returns this shape (CLAUDE.md §5 rule 1). */
export type ErrorCode =
  "UNAUTHENTICATED" | "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "INTERNAL";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string; fieldErrors?: Record<string, string> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(
  code: ErrorCode,
  message: string,
  fieldErrors?: Record<string, string>
): ActionResult<T> {
  return fieldErrors ? { ok: false, code, message, fieldErrors } : { ok: false, code, message };
}
