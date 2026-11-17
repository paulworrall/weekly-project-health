import type { Metadata } from "next";
import { Forbidden } from "@/components/features/forbidden";
import { UsersManager } from "@/components/features/users-manager";
import { PageHeader } from "@/components/layout/page-header";
import { canAdminister } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/viewer";
import {
  archiveUserAction,
  changeRoleAction,
  createUserAction,
  resetPasswordAction,
  restoreUserAction,
  unlockAction,
} from "./actions";

export const metadata: Metadata = { title: "Users and access" };

export default async function UsersPage() {
  const viewer = await requireViewer();
  if (!canAdminister(viewer)) return <Forbidden backHref="/clients" />;
  const users = await prisma.user.findMany({
    orderBy: [{ archivedAt: { sort: "asc", nulls: "first" } }, { role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      lastSignInAt: true,
      archivedAt: true,
      lockedUntil: true,
      mustChangePassword: true,
      passwordHash: true,
    },
  });
  return (
    <>
      <PageHeader
        eyebrow="Admin · Users and access"
        title="Users and access"
        meta="Admin and Updaters (Project Managers and Account Directors). Updaters see every client."
        internal
      />
      <UsersManager
        now={new Date().toISOString()}
        actions={{
          create: createUserAction,
          changeRole: changeRoleAction,
          resetPassword: resetPasswordAction,
          unlock: unlockAction,
          archive: archiveUserAction,
          restore: restoreUserAction,
        }}
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          lastSignInAt: u.lastSignInAt?.toISOString() ?? null,
          archivedAt: u.archivedAt?.toISOString() ?? null,
          lockedUntil: u.lockedUntil?.toISOString() ?? null,
          mustChangePassword: u.mustChangePassword,
          hasPassword: !!u.passwordHash,
          isSelf: u.id === viewer.id,
        }))}
      />
    </>
  );
}
