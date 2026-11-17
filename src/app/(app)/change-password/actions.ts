"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit-db";
import { passwordError } from "@/lib/passwords";
import { landingPath } from "@/lib/permissions";
import { requireViewer } from "@/lib/viewer";
import { hashPassword, verifyPassword } from "@/server/passwords";
import { fieldErrors } from "@/types/schemas";
import type { ChangePasswordState } from "./state";

const schema = z.object({
  current: z.string().min(1, { error: "Enter your current password." }),
  next: z.string().min(1, { error: "Choose a new password." }),
  confirm: z.string().min(1, { error: "Type the new password again." }),
});

/** Change your own password (forced after a temporary password). Audited, without the values. */
export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const viewer = await requireViewer({ allowPasswordChange: true });
  const parsed = schema.safeParse({
    current: String(formData.get("current") ?? ""),
    next: String(formData.get("next") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };
  const { current, next, confirm } = parsed.data;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: viewer.id } });
  const errors: Record<string, string> = {};
  if (!(await verifyPassword(current, user.passwordHash)))
    errors.current = "That isn't your current password.";
  const rule = passwordError(next, user.email);
  if (rule) errors.next = rule;
  else if (next === current) errors.next = "Choose a password different from the current one.";
  if (!errors.next && confirm !== next) errors.confirm = "The two new passwords don't match.";
  if (Object.keys(errors).length) return { status: "error", fieldErrors: errors };

  const passwordHash = await hashPassword(next);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });
    await writeAudit(tx, user.id, [
      {
        action: "UPDATE",
        entity: "User",
        entityId: user.id,
        field: "password",
        oldValue: null,
        newValue: "changed",
      },
    ]);
  });
  redirect(landingPath(user));
}
