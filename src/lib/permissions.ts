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
export function landingPath(viewer: Viewer): string {
  return viewer.role === "ADMIN" ? "/admin" : "/clients";
}
