"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { afterFailure, afterSuccess, isLocked, minutesLeft } from "@/lib/lockout";
import { landingPath } from "@/lib/permissions";
import { isSessionCookie } from "@/lib/session-cookie";
import { verifyPassword } from "@/server/passwords";
import { fieldErrors, loginSchema } from "@/types/schemas";
import type { LoginState } from "./state";

/**
 * Sign in (brief 03). Checks the password, counts failures (5 lock the account for 15 minutes),
 * then signs in with NextAuth. "Keep me signed in" unticked turns the session cookie into a
 * browser-session cookie; either way the session ends 8 hours after signing in (src/auth.ts).
 * Messages never say whether an email has an account.
 */
export async function signInAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    remember: formData.get("remember") === "on",
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const email = parsed.data.email.toLowerCase();
  const { password, remember } = parsed.data;
  const now = new Date();
  const user = await prisma.user.findUnique({ where: { email } });

  if (user && !user.archivedAt && isLocked(user, now)) {
    return { status: "locked", minutes: minutesLeft(user, now) };
  }

  const ok = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || user.archivedAt || !ok) {
    if (user && !user.archivedAt && user.passwordHash) {
      const next = afterFailure(user, now);
      await prisma.user.update({ where: { id: user.id }, data: next });
      if (next.lockedUntil) return { status: "locked", minutes: minutesLeft(next, now) };
    }
    return { status: "not-recognised" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { ...afterSuccess(), lastSignInAt: now },
  });

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) return { status: "not-recognised" };
    throw e;
  }

  if (!remember) {
    // No expiry date: the browser deletes the cookie when it closes.
    const jar = await cookies();
    for (const c of jar.getAll().filter((x) => isSessionCookie(x.name))) {
      jar.set(c.name, c.value, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: c.name.startsWith("__Secure-"),
      });
    }
  }

  redirect(user.mustChangePassword ? "/change-password" : landingPath({ role: user.role }));
}
