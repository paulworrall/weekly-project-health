# Operations runbook — Weekly Project Health

How to run the tool day to day, and what is left before go-live. Written in brief 08 (18 Nov 2026). Keep it current: update it whenever a routine changes.

Commands run from the project folder on a computer that has `.env.local` (see `.env.local.example`). **During the pilot there is one database** (Neon `production` branch), so every command below that writes changes live data.

## 1. Every week

| When | What happens | Who checks |
|---|---|---|
| Monday | The Admin uploads one spend file per client (Admin › Spend uploads → check → preview → decide missing projects → Confirm). | Admin |
| Monday–Friday | Updaters tick projects into the weekly report and submit their updates; risks, issues and pipeline kept current. | Updaters; Admin home shows who hasn't updated |
| Friday 23:59 (UK) | Saves for the week stop. | — |
| Saturday 01:00 UTC | Vercel Cron calls `/api/cron/close-week`: closes the week, writes the snapshots, opens the next week. | Admin, Saturday or Monday (below) |

**Checking the close** (2 minutes):
1. Admin › Change history → What: *Week closes*. There should be a "Changed · Week" row by **System** for the week that just ended (state OPEN → CLOSED).
2. Open any client page: the week picker shows last week as closed and the current week as open.
3. If there is no row: Vercel → project → **Cron Jobs** → *close-week* → **Run**. The log line `[close-week] closed: 2026-W47; open: 2026-W48` means it worked. Running it again is safe (it does nothing if the week is already closed).
4. Only if Vercel is unavailable: `npm run week:close` from a computer with `.env.local` does the same.

If a week was missed (for example Vercel was down all weekend), the next run closes every overdue week in order.

## 2. People and clients

- **Add a user:** Admin › Users and access → *Add a user*. Copy the temporary password and give it to them privately; they choose their own at first sign-in.
- **Forgotten password / locked out:** *Reset password* (makes a new temporary one) or *Unlock* (5 wrong attempts lock an account for 15 minutes).
- **Someone leaves:** *Archive*. They can no longer sign in; their history stays.
- **Add a client:** Admin › Clients → *Add a client*, before its first spend upload.
- **Rename / archive a client:** Admin › Clients. Archiving hides the client everywhere and keeps its data; *Restore* brings it back. A client with an upload waiting for review can't be archived until the upload is confirmed or cancelled.
- **The first Admin** (new database only): `npm run user:create-admin`.

## 3. When something goes wrong

- **A page says "Something went wrong" with a reference:** Vercel → project → **Logs**, search for the reference. Most often the database was briefly unreachable; *Try again* fixes it.
- **Sign-in fails for everyone:** check `NEXTAUTH_SECRET` and `NEXTAUTH_URL` in Vercel → Settings → Environment Variables, and Neon's status.
- **A spend upload is rejected:** the reason is in Admin › Spend uploads › history. `npm run upload:dry-run -- <file.xlsx>` previews a file read-only on a computer.
- **Data looks wrong:** Admin › Change history shows who changed what and when, with old and new values. Nothing is ever hard-deleted; archived items can be restored.

## 4. Backups and restoring

- Neon keeps a **point-in-time history** of the database (the restore window depends on the Neon plan: check Neon → project → Settings → *History retention*).
- To look at the data as it was: Neon → **Branches** → *Create branch* from a past time. This leaves live data untouched; point a local `.env.local` at the new branch to inspect it.
- To undo damage: restore the `production` branch to a time before it (Neon → Branches → production → *Restore*). **Everything after that time is lost**, so agree it with Paul first and note it in the decision log.
- Closed weeks are also kept as snapshots inside the database; they are never changed.

## 5. Secrets

Secrets live only in `.env.local` (never committed) and Vercel's environment variables. Never paste them into chat, code or documents.

| Secret | Rotate when | How |
|---|---|---|
| `NEXTAUTH_SECRET` | someone with access leaves, or it may have leaked | `openssl rand -base64 32`, set in Vercel (all environments) and `.env.local`, redeploy. Everyone is signed out. |
| `CRON_SECRET` | as above | Same; Vercel sends the new one to the cron automatically after a redeploy. |
| `DATABASE_URL`, `DIRECT_URL` | Neon password reset | Neon → Roles → reset password, update both values in Vercel and `.env.local`, redeploy. |

## 6. Releasing a change

1. Work on a branch; all tests pass (`npm test`, `npm run lint`, `npm run typecheck`, `npm run build`).
2. If there is a database migration: written offline, reviewed, and **applied with Paul's OK** (`npm run db:migrate`) before the code that needs it is merged. Never `prisma migrate dev` or `migrate reset`.
3. Pull request → regular merge → Vercel deploys main automatically. Check the live site.

## 7. Go-live checklist

The code is ready for real use (brief 08). These four items are outside the code and are Paul's to clear before the tool is used with real users and real data beyond TCCC's approved file.

| # | Item | Why it matters | Owner | Status |
|---|---|---|---|---|
| 1 | **WPP Sans web-embedding licence** confirmed | The fonts are served to every visitor; until it's confirmed the repo stays private and the site isn't shared publicly (CLAUDE.md §4). Fallback: switch the site to Arial in `src/app/layout.tsx`. | Paul (design system owner) | Waiting |
| 2 | **Data governance review** passed | Needed before any real client data other than TCCC's approved spend file (CLAUDE.md §11). | Paul | Waiting |
| 3 | **Vercel plan: move from Hobby to Pro** | Vercel's Hobby plan is for personal, non-commercial use only; a WPP business tool needs Pro. Pro also allows preview deployments to be password-protected and the week close to run more often. | Paul (budget holder) | Waiting |
| 4 | **Separate development database** | Today local work and tests touch the live database (decision 16 Nov). A Neon `development` branch for local work would protect live data. Needs a migration run on the new branch and `.env.local` pointed at it. | Paul to approve; Claude to set up | Waiting |

Also before wider roll-out (not blockers):
- Agree who the second Admin is, so access never depends on one person.
- Decide when to add Microsoft Entra ID single sign-on (sign-in is built to allow it).
- Real client names in data need item 2.
