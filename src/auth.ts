/**
 * Sign-in (brief 03): NextAuth v5, email + password, JWT sessions.
 *
 * - Sessions last a fixed 8 hours from signing in (decision 17 Nov): the token records when the
 *   person signed in and is refused after 8 hours, whatever their activity.
 * - Lockout counting happens in the sign-in action (src/app/(auth)/login/actions.ts), which
 *   checks the password before calling signIn(); `authorize` checks it again so the provider is
 *   safe on its own.
 * - Kept SSO-ready: nothing below assumes credentials are the only provider (Microsoft Entra ID
 *   can be added to `providers` later).
 * - Secret: AUTH_SECRET, or NEXTAUTH_SECRET as already set in .env.local and Vercel.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { isLocked } from "@/lib/lockout";
import { verifyPassword } from "@/server/passwords";
import type { Role } from "@/types/domain";

export const SESSION_HOURS = 8;
const SESSION_MS = SESSION_HOURS * 60 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: SESSION_HOURS * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.archivedAt || isLocked(user, new Date())) return null;
        if (!(await verifyPassword(password, user.passwordHash))) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id as string;
        token.role = (user as { role: Role }).role;
        token.signedInAt = Date.now();
      }
      // Fixed 8 hours from signing in.
      if (typeof token.signedInAt !== "number" || Date.now() - token.signedInAt > SESSION_MS) {
        return null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
});
