/**
 * Permissions (CLAUDE.md §6): pure functions over a Viewer, used for UI booleans now and inside
 * every Server Action from brief 03. Hiding a button is a convenience, not the lock.
 */
import type { Viewer } from "@/types/views";

/** Admin-only areas: spend uploads, Reported setting, clients, users, change history. */
export function canAdminister(viewer: Viewer | null): boolean {
  return viewer?.role === "ADMIN";
}

/**
 * Weekly inputs (selection, weekly update, risks, issues, pipeline): any signed-in Admin or
 * Updater, and only in the open week. Closed weeks are never edited.
 */
export function canEditWeek(viewer: Viewer | null, weekClosed: boolean): boolean {
  return !!viewer && !weekClosed;
}

export function canView(viewer: Viewer | null): boolean {
  return !!viewer;
}

/** Where each role lands after signing in: Admin home, or the client list (decision 17 Nov). */
export function landingPath(viewer: Pick<Viewer, "role">): string {
  return viewer.role === "ADMIN" ? "/admin" : "/clients";
}

export type UserAction = "CHANGE_ROLE" | "RESET_PASSWORD" | "UNLOCK" | "ARCHIVE" | "RESTORE";

/**
 * Why the Admin can't do this to this user, or null when they can. Keeps at least one active
 * Admin, and stops the Admin locking themself out.
 */
export function userActionProblem(
  action: UserAction,
  viewer: Viewer,
  target: { id: string; role: "ADMIN" | "UPDATER"; archivedAt: string | Date | null },
  activeAdmins: number,
  newRole?: "ADMIN" | "UPDATER"
): string | null {
  if (!canAdminister(viewer)) return "Only the Admin can manage users.";
  const self = target.id === viewer.id;
  const lastAdmin = target.role === "ADMIN" && !target.archivedAt && activeAdmins <= 1;
  switch (action) {
    case "CHANGE_ROLE":
      if (self) return "You can't change your own role.";
      if (target.archivedAt) return "Restore this user before changing their role.";
      if (newRole === target.role) return "That is already their role.";
      if (lastAdmin && newRole !== "ADMIN") return "There must always be at least one Admin.";
      return null;
    case "ARCHIVE":
      if (self) return "You can't archive yourself.";
      if (target.archivedAt) return "This user is already archived.";
      if (lastAdmin) return "There must always be at least one Admin.";
      return null;
    case "RESTORE":
      return target.archivedAt ? null : "This user isn't archived.";
    case "RESET_PASSWORD":
    case "UNLOCK":
      return target.archivedAt ? "Restore this user first." : null;
  }
}

/** Initials for a new user, e.g. "Sam Sample" → "SS". */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0][1] ?? "");
  return `${first}${last}`.toUpperCase();
}
