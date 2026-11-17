import { canAdminister } from "@/lib/permissions";
import { getViewer } from "@/lib/viewer";
import { fail, type ActionResult } from "@/types/action-result";
import type { Viewer } from "@/types/views";

/**
 * For Admin-only Server Actions: the signed-in Admin, or the ActionResult to return instead.
 * Checked inside every action (CLAUDE.md §5 rule 2); hiding buttons is only a convenience.
 */
export async function adminViewer(): Promise<
  { viewer: Viewer; error?: undefined } | { viewer?: undefined; error: ActionResult<never> }
> {
  const viewer = await getViewer();
  if (!viewer) return { error: fail("UNAUTHENTICATED", "Sign in again.") };
  if (viewer.mustChangePassword)
    return { error: fail("FORBIDDEN", "Choose your own password first.") };
  if (!canAdminister(viewer)) return { error: fail("FORBIDDEN", "Only the Admin can do this.") };
  return { viewer };
}

/**
 * For weekly-input Server Actions (ticks, weekly update, risks, issues, pipeline): any signed-in
 * Admin or Updater who has chosen their own password (CLAUDE.md §6).
 */
export async function editorViewer(): Promise<
  { viewer: Viewer; error?: undefined } | { viewer?: undefined; error: ActionResult<never> }
> {
  const viewer = await getViewer();
  if (!viewer) return { error: fail("UNAUTHENTICATED", "Your session has ended. Sign in again.") };
  if (viewer.mustChangePassword)
    return { error: fail("FORBIDDEN", "Choose your own password first.") };
  return { viewer };
}
