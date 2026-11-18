# Progress

Append-only. Newest at the bottom.

## 16 Nov 2026 — Brief 00: scaffold

- Next.js 16.4.6 (App Router, TypeScript strict, `src/`, `@/*`), React 19.2.8, Tailwind v4 via `@tailwindcss/postcss`.
- Installed: Prisma 7.10.1 (+ `@prisma/adapter-pg`, `pg`), NextAuth 5.0.0-beta.32, `bcryptjs`, zod 4, `exceljs` 4.4.0, `dotenv`. Dev: Vitest 4, Testing Library, jsdom, Prettier, `eslint-config-prettier`, `tsx`. No Anthropic SDK.
- Config: `prisma.config.ts` (works without `DATABASE_URL` so install and CI don't need a database), `prisma/schema.prisma` header with no models, `src/lib/prisma.ts`, `next.config.ts` (10 MB Server Action limit), `vitest.config.mts`, `tests/setup.ts`, `.prettierrc.json`, `.prettierignore`, `eslint.config.mjs`, `.env.local.example`.
- MAP design system: tokens in `src/app/globals.css`, WPP Sans self-hosted, logos in `public/brand/`, `docs/design/README.md` (token differences, licence warning).
- UI primitives copied from the Reporting Hub and adapted (button with 44px minimum and danger variant, fields, pill, segmented, tabs without `InternalStripe`, icons), plus `RagBadge`, `StatTile`, `VisuallyHidden`.
- Layout shell: `AppHeader` (role nav, hard-coded Admin until brief 03), `Breadcrumb`, `PageHeader`. Start page shows them with sample values.
- Foundations: `src/types/action-result.ts`, `src/lib/audit.ts`, `src/lib/archive.ts`, `src/lib/rag.ts`.
- CI: `.github/workflows/ci.yml` (lint, typecheck, test, build on PRs and pushes to main).
- Checks: lint, typecheck, 16 tests and build all pass locally. Start page checked in a browser: WPP Sans loads, colours match the tokens, square corners.

**Not done (needs Paul):** Neon project, Vercel project and its environment variables, preview deployment. The screen mockups aren't in `docs/design/mockups/` yet.
**Not done (follow-up):** the official Prisma agent skills in `.claude/skills/` (from `github.com/prisma/skills`).

## 16 Nov 2026 — Infrastructure

- Neon project `weekly-project-health` (AWS Europe West 2, London), `production` branch only (decision log). Pooled and direct connections tested from `.env.local` with `sslmode=verify-full`.
- Pushed to `github.com/paulworrall/weekly-project-health` (private). CI run #1 passed.
- Vercel project `weekly-project-health` on the MAP team (Hobby plan), environment variables set, live at https://weekly-project-health.vercel.app (checked: MAP header, WPP Sans, RAG labels, `noindex`).
- ⚠️ On Hobby the production address is **public** (no login). It only shows the placeholder page, but don't share the address until the font licence is confirmed and sign-in exists (brief 03).
- Week close on Hobby: Vercel Cron runs at most once a day, so brief 06 schedules it early Saturday UK time (after Friday 23:59 in both GMT and BST).

## 17 Nov 2026 — Mockups

- Seven mockups saved unchanged from Paul's Claude Design artifact into `docs/design/mockups/` (checksums match the artifact), with a README mapping each file to its screen and route.
- Noted in the README: real client and workstream names appear in the mockups (never copy into data), the Login mockup's demo passwords are prototype-only, and the RAG tokens win over the mockups' shades.

## 17 Nov 2026 — Brief 01: front end on sample data (branch `brief-01-frontend`)

- Step 0 report and Paul's four answers: `briefs/brief-01-step0-report.md`, decision log (17 Nov).
- **Screens** (Server Components with client islands): sign in, Admin home, client landing, workstream landing (tiles, pipeline, project list), project page (weekly update, % spend chart, RAG history, risks and issues), risk log / issue log, spend uploads (latest tiles, upload form, preview with decisions, history, workstream Reported + Account Director), Users, Clients, Change history, change password (visual only).
- **Past weeks**: `?week=2026-W46` on every page shows that week read-only with a "Week 46 is closed" note.
- **Dev role switch**: `?as=admin` / `?as=updater` (cookie set in `src/proxy.ts`), "Sign out" clears it. Stands in for auth until brief 03.
- **Sample data** (`src/mocks/`): invented client "Northwind Drinks", 13 workstreams (5 reported, UNMAPPED hidden), 633 projects (181 in Alpha EU), 12 closed weeks + week 47, risks and issues with every status and level, pipeline, upload history and a staged upload. Pages read only through `src/mocks/repository.ts`.
- **Pure functions** (`src/lib/`): week (Europe/London, Friday 23:59 close across GMT/BST), dates, spend, delta, ageing, pagination, sorting, filters, logs, rollup, rag, labels, permissions. zod schemas in `src/types/schemas.ts`.
- **Tests**: 74 passing (unit tests for every lib function incl. BST/GMT close, repository tests, component tests from the brief, and a guard that fails if real names from the mockups appear in code).
- **Checked in the browser**: every screen loads for Admin; ticks update tiles, filters reset to page 1, pagination, pipeline/risk validation, add/edit/archive, Confirm gating, closed weeks read-only, Updater blocked from admin pages, no sideways scroll at 375px.
- **Fixed during checks**: hidden table captions widened pages at phone width (scroll boxes now `relative`); "Over budget" ran into the figure; closed risks showed an age instead of the close date; draft-after-submit banner wording.

**Not done / follow-ups:**
- Preview deployment of this branch not checked yet (needs the branch pushed).
- Nothing persists: every change is local state until briefs 02–05.
- The mock "today" is fixed at Tue 17 Nov 2026 10:30 so figures don't drift.
- Prisma agent skills still to install.

## 17 Nov 2026 — TCCC added as a second client (Paul's approval)

- TCCC's spend file checked against `docs/excel-file-spec.md`: one sheet, exact headers, 869 rows, no duplicate jobs, every formula has a cached value, % spend only numbers or the two known phrases (100 figures, 44 over budget, 517 Add budget, 252 No timesheet data).
- `scripts/import-spend-file.mts` converts it to `src/mocks/clients/tccc.json` (committed; the .xlsx isn't). The mock repository loads it as client "TCCC" with its 13 workstreams, 5 reported (as in the decision log), and one confirmed upload dated 16 Nov 2026.
- Nothing invented for real projects: none in the weekly report, no updates, risks, issues or pipeline.
- Multi-client: `/clients` list (Updater landing), client-aware menu, a card per client on Admin home, client switcher on Spend uploads, risk/issue refs per client.
- Decisions recorded (17 Nov); CLAUDE.md and the spend file spec updated. 76 tests pass.

## 17 Nov 2026 — Brief 02: database (branch `brief-02-database`)

- Step 0 report and answers: `briefs/brief-02-step0-report.md` (no brief 02 file existed; scope from CLAUDE.md). Decisions: seed Northwind (sample) + TCCC; brief 02 is read-only.
- `prisma/schema.prisma`: every §8 model (17 tables) plus `Workstream.accountDirector` and `ProjectWeek.notUpdated` (closed-week carry-forward, until brief 06 snapshots).
- Migration `20261117120000_init` written offline (`prisma migrate diff`), applied to the live Neon database with `prisma migrate deploy` after Paul's OK.
- Seed (`prisma/seed.ts`, idempotent): 13 users, 2 clients, 26 workstreams, 1,502 projects, 13 periods, 370 weekly entries, 17 uploads (incl. one awaiting review), 9,098 % spend figures, 66 risks, 23 issues, 11 opportunities, 8 audit events. Re-running adds nothing.
- Page logic moved into `src/lib/views.ts` (`createViews(dataset)`), shared by the sample data (`src/mocks/repository.ts`, tests) and the database (`src/server/repository.ts`, the site). `src/server/rows.ts` maps rows ↔ dataset; a round-trip test proves database-shaped data gives identical pages.
- Every page now reads the live database (one load per request, ~0.15–0.4 s locally). The clock is real (Europe/London), not the fixed mock date.
- `src/lib/audit-db.ts`: `writeAudit(tx, actorId, rows)` for use inside transactions from brief 04/05.
- Scripts: `db:migrate`, `db:seed`, `db:check` (read-only), `db:status`. 82 tests pass; lint, typecheck, build pass.

**Follow-ups:** saving edits (brief 05, after sign-in in 03); snapshots and automatic close (06); move heavy aggregations into queries if pages slow down (07).

## 17 Nov 2026 — Brief 03: sign-in (branch `brief-03-signin`)

- Step 0 report and answers: `briefs/brief-03-step0-report.md`. Decisions (17 Nov): fixed 8-hour sessions, password rule 8+ with upper, lower, number and symbol, Admin account via a script Paul runs, sign-in messages that don't reveal whether an email has an account.
- NextAuth v5 credentials sign-in (`src/auth.ts`), sign-in action with lockout (5 attempts → 15 minutes), "Keep me signed in" (unticked = browser-session cookie), first-sign-in password change, Sign out, Change password link.
- `requireViewer()` checks the session against the database on every request: role changes apply at once; archived or locked accounts are signed out. Forged cookies are refused (checked).
- Dev role switch (`?as=`) removed. `src/proxy.ts` sends signed-out visitors to `/login`.
- Users and access: create (temporary password shown once), change role, reset password, unlock, archive, restore; all audited, all checked on the server, with rules that keep at least one Admin and stop the Admin changing or archiving themself.
- Paul created his Admin account with `npm run user:create-admin`, signed in locally and chose his own password (audited).
- 92 tests pass; lint, typecheck, build pass. Found and fixed: the sign-in form cleared the email after a failed attempt.

## 17 Nov 2026 — Brief 04: spend uploads (branch `brief-04-uploads`)

- Step 0 report and answers: `briefs/brief-04-step0-report.md`. Decisions (17 Nov): TCCC weekly files approved for upload; a newer file cancels one still waiting for review.
- Parser `src/services/parsing/spend-file.ts` (exceljs, cached formula results, structure rejection with expected/found, row errors), compare-with-live `src/lib/spend-diff.ts`, Confirm rules `confirmProblem`.
- Actions: check (stores the file, rejected or ready, cancels an earlier waiting file), decide (Keep/Mark saved per click), confirm (one transaction: new Hidden workstreams, new/renamed/moved projects, % spend per project, missing marks, previous upload Replaced, audit), cancel, Reported, Account Director. All Admin-only on the server.
- Upload form, preview (row errors, decisions, Confirm/Cancel) and workstream settings wired to the actions.
- `scripts/import-spend-file.mts` now uses the same parser; new `npm run upload:dry-run` (read-only).
- Real TCCC file: parses with 0 errors; uploading it corrected 6 % spend figures by 0.1 point (rounding in the hand conversion of 17 Nov). Paul checked and confirmed it locally: new upload Live (869 rows, file stored), previous Replaced, audit written.
- 100 tests pass (parser on synthetic workbooks, diff, Confirm rules, preview component); lint, typecheck, build pass.

## 17 Nov 2026 — Brief 05: saving the weekly inputs (branch `brief-05-weekly`)

- Step 0 report and answers: `briefs/brief-05-step0-report.md`. Decisions (17 Nov): when two people edit the same thing, the second save is refused with "changed by X at HH:MM" and a Reload button; the open reporting week is created on first save.
- Server actions (`src/server/actions/weekly.ts`): include tick, weekly update (Save draft / Submit; no draft after a submission), risks and issues (add with per-client ref from the Client counter, edit, close, delete = archive), pipeline (add, edit, archive). Every one checks the person on the server, refuses closed weeks, writes audit rows in the same transaction and refreshes the pages.
- Pure rules in `src/lib/weekly-rules.ts` with tests. Forms show save problems in a box; a failed tick is put back with a message.
- Paul tested on the local copy: ticks, weekly update, risks and pipeline all saved (Northwind sample data only).
- 107 tests pass; lint, typecheck, build pass.

## 17 Nov 2026 — Brief 06: automatic week close and snapshots (branch `brief-06-close`)

- Step 0 report and answers: `briefs/brief-06-step0-report.md`. Decisions (17 Nov): snapshots record every project in a Reported workstream (with its tick); the sample weeks 35–46 become snapshots once; brief 06 before 05b so week 47 closes on time.
- `src/lib/snapshot.ts` (pure, tested): `buildWeekSnapshots` (project, pipeline and log snapshots as at Friday; carry-forward marked Not updated; drafts ignored) and `weeksToClose` (GMT/BST, catch-up, weeks nobody saved in).
- `src/server/close-week.ts`: closes each due week in one transaction (Open → Closed only once, snapshots, audit as System), then opens the next. `/api/cron/close-week` (needs `CRON_SECRET`), `vercel.json` cron daily at 01:00 UTC, `npm run week:close` by hand.
- Closed weeks now read their snapshots (project rows, % spend, risk and issue counts, pipeline, logs); without one they are worked out from live data as before. Pages load the last 13 weeks of snapshots.
- `npm run snapshots:backfill` (dry run by default, `--apply` writes): weeks 35–46, Northwind only, 559 projects a week.
- No migration needed. 119 tests pass; lint, typecheck, build pass.

## 18 Nov 2026 — Brief 05b: pipeline value and time in pipeline (branch `brief-05b-pipeline`)

- Step 0 report: `briefs/brief-05b-step0-report.md` (no blocking questions; brief 06 already built, so its snapshot note is covered).
- Docs: report mockups moved into `docs/design/mockups/` with the README map; the brief's eight 17 Nov decisions appended to the decision log, plus one on pipeline snapshots; `CLAUDE.md` updated (pipeline fields, reports, routes, permissions, phases; §7 snapshot scope corrected to "every project in a Reported workstream").
- `PipelineOpportunity.estimatedValue` (Int, nullable for old rows) and `addedOn` (Date). Migration `20261118100000_pipeline_value` hand-edited: add nullable, backfill `addedOn` from `createdAt` as a London date, then NOT NULL. Touches 11 sample opportunities.
- `src/lib/pipeline.ts` (pure, tested): days in pipeline, over 90 days, summaries (value, by likelihood, average and oldest, over 90 days, next 3 months, not valued), money formats (`$450,000`, `$450k`, `$1.98m`, "Not set").
- Form: Estimated value (USD) required (commas allowed, $1 to $100,000,000) and Added to pipeline (default today, not future). Saved and audited per field. Table: Value (USD) and In pipeline columns, summary line with value. Tiles carry value, over-90-days and not-valued counts: client page Pipeline tile and workstream cards, and a Pipeline figure on the client cards (Admin home and client list).
- Note for brief 06: already covered. The weekly pipeline snapshot stores each opportunity in full, so value and added date are recorded from the first close after the migration. Older snapshots read as "Not set" and the creation date.
- `npm run pipeline:sample-values` (dry run; `--apply` writes): invented values and dates for Northwind's 11 sample opportunities.
- 136 tests pass; lint, typecheck, build pass.

## 18 Nov 2026 — Brief 07: Generate report, HTML and PowerPoint (branch `brief-07-report`)

- Step 0 report and answer: `briefs/brief-07-step0-report.md` (Paul: add a Generate action to the change history).
- `pptxgenjs` 4.0.1 (latest), with `image-size` overridden to 2.1.0 to clear two advisories in a dependency pptxgenjs never loads; listed in `serverExternalPackages`. `npm audit --omit=dev` still shows two moderate advisories in `exceljs`'s `uuid` (brief 04, not reachable from our parsing; follow-up).
- Report model `src/types/report.ts` and `src/lib/report.ts` (pure, tested): `buildReport` from the same views the pages use (open week live, last submitted values marked Not updated, drafts never used; closed weeks from snapshots), `paginateProjects` (6, then 12), trends over up to 8 weeks, `reportReadiness`.
- Generate report dialog (`src/components/features/report-dialog.tsx`) on the client and workstream pages: readiness, open or closed week wording, HTML (new tab) or PowerPoint (download); accessible modal (focus moves in and is kept there, Escape and Cancel return focus).
- HTML report pages in the `(report)` route group, outside the app shell: 1280×720 slides, scaled to fit, toolbar (Download PowerPoint, Print), print CSS one slide per page.
- PowerPoint `src/services/documents/report-pptx.ts` and `GET /clients/[clientId]/report.pptx?week=&workstream=`: native text, tables and shapes, real slide titles, native trend charts with alt text, Arial.
- `src/server/report.ts`: sign-in and permission checks, Not found for unknown clients and hidden workstreams, a GENERATE audit row per generation. Migration `20261118140000_audit_generate` (adds the enum value).
- Live data today: Northwind 12 slides, TCCC 7; building takes about 0.2 s after the usual page data load.
- 164 tests pass; lint, typecheck, build pass.

## 18 Nov 2026 — Phase 7 completed: log trends from snapshots, snapshots for the week shown (branch `phase-07-trends`)

- Step 0 report and answer: `briefs/phase-07b-step0-report.md` (Paul: month-end figures for the exact last day).
- `src/lib/logs.ts`: `logSummary`, `weekOnWeek`, `monthOnMonth` and `byWorkstream` take an optional `history` (the items as at each week's close). Weeks and months with no record are left out; comparisons with no record are `null` ("No earlier figure"). `closeWeekFor(date)` in `src/lib/week.ts`.
- `src/lib/views.ts` `getLogData`: works out the trends on the server for all reported workstreams and for each one (`LogData.trends`), from each closed week's log snapshot and the open week's live items. The log page uses them; the chart says how many earlier weeks have no record.
- `snapshotWindow` in `src/lib/snapshot.ts`; `getRepository(week)` and `loadRows(now, week)` load project and pipeline snapshots for 10 closes and log snapshots for 18 closes up to the week shown. Client, workstream, project, log and report pages pass `?week=`.
- Checked read-only against the live database: Northwind's closed weeks now keep the items archived on 5 Nov (1–2 more open per week than before); TCCC shows week 47 only (no earlier records). Loading takes about 0.2–0.3 s once connected.
- Not changed: database queries for the heavy sums. Pages are fast enough at pilot size; revisit in brief 08 if needed.
- No migration. 176 tests pass; lint and typecheck pass.

## 18 Nov 2026 — Brief 08: hardening and go-live readiness (branch `brief-08-hardening`)

- Step 0 report and answer: `briefs/brief-08-step0-report.md` (Paul: stop at "ready to go live", with a checklist).
- Error states: `not-found.tsx` (signed-in area, unknown addresses, reports), `error.tsx` (signed-in area and reports: Try again, a link home and a reference), `global-error.tsx`, `loading.tsx`. Shared `StatusPanel` and `BrandBar` (`src/components/features/status-page.tsx`); `Forbidden` uses the same panel.
- Admin › Clients: add, rename, archive, restore (`src/app/(app)/admin/clients/actions.ts`, `src/components/features/clients-manager.tsx`, name rules in `src/lib/clients.ts`). All audited. Archived clients are hidden from views (`getClient`), uploads and reports, and weekly inputs for them are refused.
- Admin › Change history: filters (who, what, dates), 50 a page, record names (`src/lib/history.ts`, `src/server/history.ts`). The repository no longer loads audit events for every page. The unused `SimpleTablePage` was removed.
- Accessibility: `axe-core` 4.14.0 (dev only) checks 11 screens in `tests/components/accessibility.test.tsx`; `tests/lib/contrast.test.ts` checks the colour tokens. No violations found.
- Security: headers in `src/lib/security-headers.ts`, applied in `next.config.ts` (`poweredByHeader: false`). `uuid` pinned to 11.1.1 for `exceljs`: `npm audit` now reports 0 vulnerabilities.
- `docs/operations.md`: weekly routine, checking the close, people and clients, problems, backups, secrets, releasing, and the go-live checklist (font licence, data governance, Vercel Pro, development database).
- No migration.
