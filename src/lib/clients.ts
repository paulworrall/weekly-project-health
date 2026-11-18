/**
 * Admin › Clients (brief 08): name rules shared by the form and the Server Actions. Pure.
 * Names are unique ignoring case and spacing, including archived clients (a name can't be
 * reused while an archived client holds it: restore that client instead).
 */
import { z } from "zod";

export const CLIENT_NAME_MAX = 80;

export const clientNameSchema = z.object({
  name: z
    .string()
    .transform((s) => s.trim().replace(/\s+/g, " "))
    .pipe(
      z
        .string()
        .min(1, { error: "Enter the client's name." })
        .max(CLIENT_NAME_MAX, { error: `Keep the name under ${CLIENT_NAME_MAX} characters.` })
    ),
});

/** "Northwind  drinks " → "northwind drinks", for comparing names. */
export function nameKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-GB");
}

export interface ExistingClient {
  id: string;
  name: string;
  archivedAt: Date | string | null;
}

/** Why `name` can't be used (for a new client, or for renaming `selfId`), or null. */
export function clientNameProblem(
  name: string,
  existing: readonly ExistingClient[],
  selfId?: string
): string | null {
  const clash = existing.find((c) => c.id !== selfId && nameKey(c.name) === nameKey(name));
  if (!clash) return null;
  return clash.archivedAt
    ? `An archived client is already called "${clash.name}". Restore it instead.`
    : `There is already a client called "${clash.name}".`;
}
