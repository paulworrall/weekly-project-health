"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { archiveData, restoreData } from "@/lib/archive";
import { archiveRow, createRow, restoreRow, updateRows, type AuditRow } from "@/lib/audit";
import { writeAudit } from "@/lib/audit-db";
import { temporaryPassword } from "@/lib/passwords";
import { canAdminister, initialsFor, userActionProblem, type UserAction } from "@/lib/permissions";
import { getViewer } from "@/lib/viewer";
import { hashPassword } from "@/server/passwords";
import { fail, ok, type ActionResult } from "@/types/action-result";
import { fieldErrors } from "@/types/schemas";

/**
 * Admin › Users and access (brief 03). Every action checks the Admin on the server, validates
 * its input, saves in one transaction with its audit rows, and returns ActionResult.
 * Temporary passwords are returned once for the Admin to pass on; they are never stored or
 * logged in plain text.
 */

const ROLE = z.enum(["ADMIN", "UPDATER"], { error: "Choose a role." });

const createSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Enter the person's name." })
    .max(80, { error: "Keep the name under 80 characters." }),
  email: z
    .string()
    .trim()
    .min(1, { error: "Enter their work email." })
    .pipe(z.email({ error: "Enter an email address like name@example.com." })),
  role: ROLE,
});

async function adminViewer() {
  const viewer = await getViewer();
  if (!viewer) return { error: fail<never>("UNAUTHENTICATED", "Sign in again.") };
  if (viewer.mustChangePassword)
    return { error: fail<never>("FORBIDDEN", "Choose your own password first.") };
  if (!canAdminister(viewer))
    return { error: fail<never>("FORBIDDEN", "Only the Admin can manage users.") };
  return { viewer };
}

function done() {
  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export async function createUserAction(input: {
  name: string;
  email: string;
  role: string;
}): Promise<ActionResult<{ name: string; email: string; temporaryPassword: string }>> {
  const { viewer, error } = await adminViewer();
  if (error) return error;
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "Check the form.", fieldErrors(parsed.error));
  const email = parsed.data.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return fail("CONFLICT", "Check the form.", {
      email: "Someone already has an account with this email.",
    });
  }
  const password = temporaryPassword();
  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: parsed.data.name,
        initials: initialsFor(parsed.data.name),
        email,
        role: parsed.data.role,
        passwordHash,
        mustChangePassword: true,
      },
    });
    await writeAudit(tx, viewer.id, [createRow("User", user.id, `${user.name} (${user.role})`)]);
  });
  done();
  return ok({ name: parsed.data.name, email, temporaryPassword: password });
}

async function loadTarget(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

async function activeAdmins() {
  return prisma.user.count({ where: { role: "ADMIN", archivedAt: null } });
}

async function guard(action: UserAction, userId: string, newRole?: "ADMIN" | "UPDATER") {
  const { viewer, error } = await adminViewer();
  if (error) return { error };
  const target = await loadTarget(String(userId));
  if (!target) return { error: fail<never>("NOT_FOUND", "That user no longer exists.") };
  const problem = userActionProblem(action, viewer, target, await activeAdmins(), newRole);
  if (problem) return { error: fail<never>("FORBIDDEN", problem) };
  return { viewer, target };
}

export async function changeRoleAction(
  userId: string,
  role: string
): Promise<ActionResult<{ role: string }>> {
  const parsedRole = ROLE.safeParse(role);
  if (!parsedRole.success) return fail("VALIDATION", "Choose a role.", { role: "Choose a role." });
  const g = await guard("CHANGE_ROLE", userId, parsedRole.data);
  if (g.error) return g.error;
  const { viewer, target } = g;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: target.id }, data: { role: parsedRole.data } });
    await writeAudit(
      tx,
      viewer.id,
      updateRows("User", target.id, target, { role: parsedRole.data })
    );
  });
  done();
  return ok({ role: parsedRole.data });
}

export async function resetPasswordAction(
  userId: string
): Promise<ActionResult<{ name: string; temporaryPassword: string }>> {
  const g = await guard("RESET_PASSWORD", userId);
  if (g.error) return g.error;
  const { viewer, target } = g;
  const password = temporaryPassword();
  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: { passwordHash, mustChangePassword: true, failedSignInCount: 0, lockedUntil: null },
    });
    await writeAudit(tx, viewer.id, [
      {
        action: "UPDATE",
        entity: "User",
        entityId: target.id,
        field: "password",
        oldValue: null,
        newValue: "reset by Admin",
      },
    ]);
  });
  done();
  return ok({ name: target.name, temporaryPassword: password });
}

export async function unlockAction(userId: string): Promise<ActionResult<null>> {
  const g = await guard("UNLOCK", userId);
  if (g.error) return g.error;
  const { viewer, target } = g;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: { failedSignInCount: 0, lockedUntil: null },
    });
    await writeAudit(tx, viewer.id, updateRows("User", target.id, target, { lockedUntil: null }));
  });
  done();
  return ok(null);
}

export async function archiveUserAction(userId: string): Promise<ActionResult<null>> {
  return setArchived(userId, true);
}

export async function restoreUserAction(userId: string): Promise<ActionResult<null>> {
  return setArchived(userId, false);
}

async function setArchived(userId: string, archive: boolean): Promise<ActionResult<null>> {
  const g = await guard(archive ? "ARCHIVE" : "RESTORE", userId);
  if (g.error) return g.error;
  const { viewer, target } = g;
  const rows: AuditRow[] = [
    archive
      ? archiveRow("User", target.id, target.name)
      : restoreRow("User", target.id, target.name),
  ];
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: archive ? archiveData(viewer.id) : restoreData(),
    });
    await writeAudit(tx, viewer.id, rows);
  });
  done();
  return ok(null);
}
