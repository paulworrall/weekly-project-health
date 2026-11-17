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
