# Brief 03 — Step 0 report (17 Nov 2026)

There is no `briefs/brief-03-*.md`. Scope is taken from `CLAUDE.md` §6 (roles, accounts), §9 (routes), §10 phase 3 ("Auth and roles: sign-in, lockout, first-sign-in password change, role landing, permissions") and the decision log ("Sign-in and accounts", 16 Nov; "Keep me signed in", 17 Nov). Answers to §6 are recorded at the bottom.

## 1. Scope

**In:**
- **NextAuth v5 sign-in:** email and password (bcrypt). The dev role switch (`?as=`) is removed everywhere.
- **Lockout:** 5 failed attempts lock the account for 15 minutes, with the "attempts left" and "locked" messages already designed.
- **First sign-in:** `mustChangePassword` sends the user to `/change-password` until they choose their own password.
- **Sessions:** 8 hours. "Keep me signed in" ticked keeps the cookie for those 8 hours; unticked, it ends when the browser closes.
- **Role landing:** Admin goes to `/admin`, Updater to `/clients`. Every page, and every Server Action from now on, checks permissions on the server.
- **Admin › Users and access becomes live:** create user (with a temporary password shown once to the Admin), change role, reset password, unlock, archive and restore. Every change is audited (`writeAudit`), and every action returns `ActionResult` with zod field errors.
- **Sign out.**
- **Your Admin account:** created with a one-off script that you run in your own terminal, so the temporary password appears only there, never in chat or Git.

**Out:** Microsoft single sign-on (kept possible: nothing assumes passwords are the only way in), email (none in v1), saving weekly inputs (brief 05).

## 2. Findings

- **next-auth 5.0.0-beta.32** supports Next.js 16 (`peerDependencies: next ^16`). It reads `AUTH_SECRET`, or `NEXTAUTH_SECRET` as a fallback, which is the name already in `.env.local` and Vercel.
- **Session renewal:** with JWT sessions, Auth.js re-issues the cookie (with a fresh 8-hour expiry) only when its session endpoint is called, for example by `useSession`. Server Components can't set cookies, so if the app never calls that endpoint the cookie set at sign-in is the one that lasts. That gives us:
  - **Unticked:** after signing in, re-set the cookie with no expiry date, so the browser deletes it when it closes.
  - **8 hours either way:** the token records when you signed in and is refused once 8 hours have passed (an absolute limit, not reset by activity). The cookie itself also expires at 8 hours.
- **Locked, archived and password-change checks happen on every request:** the signed-in user is looked up in the database (the repository already loads all users). An archived or locked user is signed out straight away, without waiting for the cookie to expire.
- **`src/proxy.ts`** (currently the role switch) becomes a light check that sends signed-out visitors to `/login`. The real check stays in every page and action (CLAUDE.md §5 rule 2).
- **Seeded sample users** (invented names) have no password, so they can't sign in. They stay as the people who "submitted" Northwind's sample history.

## 3. Build plan

| Piece | Where |
|---|---|
| Auth config (credentials provider, JWT callbacks with id, role, signedInAt) | `src/auth.ts` |
| Sign-in action: zod, lockout counters, `lastSignInAt`, remember-me cookie | `src/app/(auth)/login/actions.ts`, `LoginForm` now posts to it |
| Viewer from the session + database check (archived, locked, must change password) | `src/lib/viewer.ts` |
| Change password (current password, new password, confirm; rules below) | `/change-password` page and action |
| Users and access: table plus Create, Change role, Reset password, Unlock, Archive/Restore, all audited | `/admin/users`, `src/app/(app)/admin/users/actions.ts` |
| Password rules and hashing (pure, tested) | `src/lib/passwords.ts` |
| Create your Admin account (prints a temporary password in your terminal only) | `scripts/create-admin.mts` |
| Tests | Lockout maths, password rules, permission checks on every action, form errors, remember-me cookie handling (pure parts) |

No database migration is needed: `User` already has `passwordHash`, `mustChangePassword`, `failedSignInCount`, `lockedUntil` and `lastSignInAt`.

## 4. Order and safety

1. Build and test locally against the live database. Sign-in only reads, apart from your own Admin account and sign-in counters.
2. You run `scripts/create-admin.mts` yourself, then sign in locally to check.
3. Merge. From then on the live site needs a real sign-in; the `?as=` links stop working.

## 5. Questions

1. Which email for your Admin account?
2. 8-hour session: a fixed limit from sign-in, or one that resets while you're active?
3. Password rule for new passwords.

## Answers (Paul, 17 Nov 2026)

1. **Admin account:** Paul's WPP work email. The address is typed into the script in his terminal; it isn't stored in the code or Git.
2. **Session:** a fixed 8 hours from signing in, not reset by activity.
3. **Passwords:** at least 8 characters, with an upper-case letter, a lower-case letter, a number and a symbol.

Waiting for Paul's go-ahead to build.
