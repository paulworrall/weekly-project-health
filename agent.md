# Codebase summary

Rewritten at each checkpoint. Last updated: 17 Nov 2026 (brief 06, week close and snapshots).

## State

Every page reads the live Neon database (Northwind sample + TCCC) through `src/server/repository.ts`. Everything people enter now saves: include ticks, weekly updates (draft / submit), risks, issues, pipeline (brief 05), Users and access, and Spend uploads. Closed weeks are read-only and read their snapshots (brief 06); a cron closes each week early on Saturday. Real sign-in with NextAuth v5 (email + password, fixed 8-hour sessions, lockout); `src/proxy.ts` sends visitors without a session cookie to `/login`.

## Where things are

| Path | What |
|---|---|
| `src/auth.ts` | NextAuth config: credentials provider, JWT callbacks (uid, role, signedInAt; refused after 8 h). `src/app/api/auth/[...nextauth]` exposes its handlers. |
| `src/app/(auth)/login` | Sign in page, `actions.ts` (lockout, lastSignInAt, remember-me cookie), `state.ts`. |
| `src/app/(app)/change-password` | Choose your own password (forced while `mustChangePassword`). |
| `src/app/(app)/admin/uploads` | Spend uploads: page + `actions.ts` (check file → preview → decisions → confirm in one transaction; cancel; Reported; Account Director). |
| `src/services/parsing/spend-file.ts` | Spend file parser (exceljs; structure rejection, row errors). `src/lib/spend-diff.ts`: compare with live data; `confirmProblem`. |
| `src/server/guards.ts` | `adminViewer()` for Admin-only actions, `editorViewer()` for actions any signed-in person may take. |
| `src/server/actions/weekly.ts` | Weekly inputs: include tick, weekly update, risk/issue create/update/archive (refs from Client counters in the same transaction), pipeline save/archive. All audited, open week only, version check (`updatedAt`) against overwriting someone else's change. Pages bind them in inline `"use server"` closures. |
| `src/lib/snapshot.ts` | Week close rules (pure): `buildWeekSnapshots` (project, pipeline, log snapshots as at Friday) and `weeksToClose`. Views read snapshots for closed weeks through `Dataset.snapshots`. |
| `src/server/close-week.ts` | `closeDueWeeks()`: closes due weeks (one transaction each, idempotent), writes snapshots and audit, opens the next week. Called by `src/app/api/cron/close-week/route.ts` (Bearer `CRON_SECRET`; schedule in `vercel.json`). |
| `src/server/periods.ts` | `ensureOpenPeriod(tx, weekKey)`: creates the open ReportingPeriod on first save. |
| `src/app/(app)/admin/users` | Users and access: page + `actions.ts` (create, change role, reset password, unlock, archive, restore; audited). |
| `src/app/(app)/layout.tsx` | Signed-in shell: `requireViewer()` then `AppHeader` with the role's nav. |
| `src/app/(app)/admin` | Admin home; `uploads`, `users`, `clients`, `history` (Admin only, `Forbidden` otherwise). |
| `src/app/(app)/clients/[clientId]` | Client landing; `workstreams/[workstreamId]`; `risks` and `issues` (both render `LogPage`). |
| `src/app/(app)/projects/[projectId]` | Project page. |
| `src/components/features/` | Screen pieces: `display` (RagBar, LevelTag, pills, Delta, SpendCell, TableScroll, table classes), `week` (WeekPicker, ClosedWeekNote), `pagination`, `project-list`, `workstream-body`, `pipeline-section`, `weekly-update-form` (+ RagSelector), `risk-issue-table`, `log-view`/`log-page`, `upload-form`, `upload-preview`, `workstream-settings`, `simple-table`, `login-form`, `forbidden`. |
| `src/components/ui/` | Primitives from brief 00 (+ `rag-badge`, `stat-tile`). |
| `src/components/layout/` | `app-header` (NAV per role), `nav-links` (current page), `breadcrumb`, `page-header`. |
| `src/lib/` | `viewer.ts`: `getViewer()` (session + database check, cached) and `requireViewer({ allowPasswordChange })`. `passwords.ts` (rule, temporary passwords), `lockout.ts`, `session-cookie.ts`. Pure, tested: `week`, `dates`, `spend`, `delta`, `ageing`, `pagination`, `sorting`, `filters`, `logs`, `rollup`, `rag`, `labels`, `permissions`, `links` (`withWeek`), `weekly-rules` (week-open check, refs, closed date, version, conflict message). Server-only helpers: `viewer` (`getViewer`/`requireViewer`), `dev-role`. |
| `src/types/` | `domain.ts` (records, enums), `views.ts` (page view models), `schemas.ts` (zod), `action-result.ts`. |
| `src/lib/views.ts` | `createViews(dataset)`: every page view model, built from a `Dataset`. Pure. |
| `src/server/repository.ts` | `getRepository()` (React `cache`): loads all rows with Prisma, `datasetFromRows`, `createViews`. Used by every page and `lib/viewer.ts`. |
| `src/server/rows.ts` | `DbRows` shapes, `rowsFromDataset` (seed) and `datasetFromRows` (site). |
| `src/mocks/` | `data.ts` (synthetic Northwind + TCCC from `clients/tccc.json`, fixed clock `MOCK_NOW`), `repository.ts` (`mockDataset` + views, for tests and the seed). |
| `prisma/` | `schema.prisma`, `migrations/` (written offline, applied with `db:migrate` after asking Paul), `seed.ts` (idempotent). |
| `scripts/` | `import-spend-file.mts` (spend file → JSON), `db-check.mts` (read-only live check). |
| `tests/` | `lib/` unit tests (incl. `audit-db`), `mocks/` repository tests, `server/rows.test.ts` round trip, `components/` jsdom tests, `no-real-names.test.ts` guard. |

## Conventions

- Pages are Server Components; interaction lives in client components that receive view models.
- `?week=YYYY-Www` selects a closed week: `resolveWeek()` gives a `WeekContext` (`closed`, `asOf`), inputs become read-only, links keep the week via `withWeek()`.
- Status is never colour alone: RAG shows word + meaning (+ shape on badges), levels and statuses are words, bars have `role="img"` text alternatives.
- Wide tables sit in `TableScroll` (focusable, `relative` so hidden captions can't widen the page).

## Commands

- `npm run dev` · `npm run lint` · `npm run typecheck` (runs `next typegen`) · `npm test` · `npm run build` · `npm run format`.
- Run the built site locally: `npm run build` then `npm run start` (port 3000), signed in with your own account.

## Database

- One live Neon database (`production` branch). Never `prisma migrate dev` / `reset`. Migrations: `prisma migrate diff` offline → commit → ask Paul → `npm run db:migrate`.
- `npm run db:seed` (idempotent), `npm run db:check` (read-only), `npm run db:status`.

## Accounts

- `npm run user:create-admin` (scripts/create-admin.mts): creates or recovers an Admin and prints a temporary password in the terminal only. Paul runs it himself.
- Sample users (invented) have no password and can't sign in; Paul's Admin account is real.

## Uploads

- `npm run upload:dry-run -- --client <id> --file <path>`: what a file would change, read-only.
- `npm run week:close`: runs the close by hand (live database). `npm run snapshots:backfill`: shows closed weeks without snapshots; `-- --apply` writes them.
- Real TCCC weekly files are approved for upload (decision 17 Nov); other clients' real data needs Paul's OK. Tests build synthetic workbooks in memory.

## Next

Brief 05b (`briefs/brief-05b-pipeline-value.md`): pipeline value and time in pipeline; add both to the pipeline snapshot. Then brief 07 (`briefs/brief-07-generate-report.md`): reports, which should load the snapshots of the week a page shows instead of the last 13 weeks.
