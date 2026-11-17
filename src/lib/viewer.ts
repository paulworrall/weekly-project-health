import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Viewer } from "@/types/views";
import { isLocked } from "./lockout";
import { prisma } from "./prisma";

/**
 * The signed-in viewer (brief 03): the NextAuth session, checked against the database on every
 * request, so role changes apply at once and an archived or locked account is signed out
 * straight away. Cached per request.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      initials: true,
      role: true,
      archivedAt: true,
      lockedUntil: true,
      failedSignInCount: true,
      mustChangePassword: true,
    },
  });
  if (!u || u.archivedAt || isLocked(u, new Date())) return null;
  return {
    id: u.id,
    name: u.name,
    initials: u.initials,
    role: u.role,
    mustChangePassword: u.mustChangePassword,
  };
});

/**
 * For pages that need a signed-in viewer: sends everyone else to sign in, and anyone still on a
 * temporary password to choose their own (except on the change-password page itself).
 */
export async function requireViewer(
  options: { allowPasswordChange?: boolean } = {}
): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.mustChangePassword && !options.allowPasswordChange) redirect("/change-password");
  return viewer;
}
