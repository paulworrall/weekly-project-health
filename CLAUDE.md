# CLAUDE.md — Weekly Project Health

Implementation guide for Claude Code. Read this first, every session. Where this file and your defaults disagree, follow this file. Where this file and `docs/decision-log.md` disagree, the decision log wins and this file is out of date: flag it.

## 1. What we are building

Weekly Project Health is an **internal** WPP Enterprise Solutions (MAP) tool that gives a weekly view of project health across clients and workstreams. Clients never see it.

- Each Monday the Admin uploads one spend file per client (.xlsx): job number, project name, workstream, % of budget spent.
- Updaters tick which projects go into the weekly report and, for each one, submit the week's status, Delivery RAG, % complete and update, and keep the project's risk and issue logs current.
- Each workstream has a pipeline of opportunities.
- Every Friday at 23:59 UK time the week closes automatically and an immutable snapshot is written, so trends (RAG, spend, risk and issue counts) can be tracked week on week and month on month.
- From the client or workstream page, Admins and Updaters can generate the weekly report as 16:9 slides: an HTML page or a PowerPoint (.pptx) download.

It is a separate application from the Reporting Hub but uses the same stack, conventions and ways of working.

## 2. Source documents (in `docs/`)

| File | What it is |
|---|---|
| `docs/project-overview.md` | Original requirements. Some points are superseded by the decision log. |
| `docs/decision-log.md` | Every decision made so far. **Authoritative.** |
| `docs/excel-file-spec.md` | The spend file: sheet, columns, values, validation. |
| `docs/tech-stack.md` | Stack, versions, scaffold, config, gotchas (copied from the Reporting Hub). |
| `docs/design/mockups/*.dc.html` | Design mockups of every designed screen (added 17 Nov 2026; see the README there for the file → screen → route map): markup for layout and copy, inline script for data shape and behaviour. Reference only, not production code. The client and workstream names in them are real; project names and figures are samples. Never copy any of them into data. |
| `docs/design/README.md` | MAP design system notes: tokens, differences from the Reporting Hub, font licence warning. Tokens in `docs/design/ds/wppesmap/tokens.json`; fonts in `public/fonts/`, logos in `public/brand/`. |
| `progress.md`, `agent.md` | Progress log (append-only) and codebase summary (rewritten at checkpoints). |
| `docs/operations.md` | Runbook: weekly routine, checking the close, users and clients, backups, secrets, releases, go-live checklist. |

## 3. Terms (use these words in the UI and in code)

- **Client > Workstream > Project.** A project is a job, keyed by its **job number** from the spend file. The workstream comes from the file's "Default Reporting Workstream" and is never edited in the tool.
- **Reported workstream**: a workstream the Admin has switched on. Only reported workstreams have pages and appear in reports. Others are stored but hidden.
- **Admin** and **Updater** are the only roles. Updater = Project Managers and Account Directors.
- **Delivery RAG**: always shown as colour word + meaning, never colour alone: **Green · On track**, **Amber · At risk**, **Red · Blocked**.
- **Status**: In progress, On hold, Complete.
- **Reporting week** (period): ISO week, shown Monday–Friday (e.g. "Week 47 · 16–20 Nov 2026"). Closes Friday 23:59 Europe/London.
- **Snapshot**: the frozen record of a closed week. Never modified.
- **% spend**: from the latest confirmed upload. A number (can exceed 100%: "Over budget") or a status: **Add budget** (no budget in workbook) or **No timesheet data**.
- UK English everywhere.

## 4. Stack

Follow `docs/tech-stack.md` exactly for versions, scaffold, folder structure and config, with these overrides:

- **App name / repo**: `weekly-project-health`.
- **No AI in v1**: do not install `@anthropic-ai/sdk`, no `src/lib/anthropic.ts`, no `src/services/agents/`, no `ANTHROPIC_API_KEY`.
- **Install `exceljs`** (spend file parsing).
- **Install `pptxgenjs` in brief 07** (PowerPoint report); check its version for advisories in Step 0.
- **Versions actually installed** (brief 00, see the decision log): Next.js 16.4.6, React 19.2.8, **Prisma 7.10.1** (not 7.9.1: security advisories), NextAuth 5.0.0-beta.32, exceljs 4.4.0, Vitest 4, Node 24 in CI. Tailwind v4 via `@tailwindcss/postcss` (not the starter's Turbopack loader), and no `cacheComponents`.
- **`npm run typecheck`** runs `next typegen` before `tsc` (route types such as `LayoutProps` are generated).
- **`prisma.config.ts`** uses `DIRECT_URL` (falling back to `DATABASE_URL`) for the CLI, and only when set, so `npm install` (which runs `prisma generate`) works without a database. Prisma 7's config has no `directUrl`: the CLI uses the direct URL, the app the pooled one via `@prisma/adapter-pg`.
- **Database workflow (one live database):** write migrations offline with `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script -o prisma/migrations/<timestamp>_<name>/migration.sql`, review, commit, then **ask Paul** before `npm run db:migrate` (`prisma migrate deploy`). Apply before merging the code that needs it. **Never** `prisma migrate dev` or `prisma migrate reset`. `npm run db:seed` is idempotent (fixed ids, `skipDuplicates`); `npm run db:check` is read-only; `npm run db:status` shows pending migrations.
- **Scaffold from `docs/tech-stack.md` §2, not from the Reporting Hub's `package.json`** (the Reporting Hub is still in Stage B and doesn't yet have Prisma, NextAuth or the SDK installed).
- **Styling**: WPP Enterprise Solutions | MAP design system from the Reporting Hub handover pack (`docs/design/`, `tokens.json`), not the Project Brain tokens or Geist. Navy `#000050`, Cream `#FAFAF0`, Orange `#FF7800`, WPP Sans (self-hosted with `next/font/local`). Square corners everywhere; fully rounded pills only. WCAG AA: small text never uses Orange on Cream (use the darker orange `#B34F00` for eyebrow labels, as in the mockups).
- **RAG colours**: use the Reporting Hub's proposed RAG tokens (Red `#FFB4B4`, Amber `#F9BD5D`, Green `#B4FF64`), always with the word and meaning. They are not yet signed off by the design system owner: keep them as tokens so they can change in one place. (The mockups use slightly different shades; the tokens win.)
- **Fonts**: the WPP Sans web-embedding licence is unconfirmed. Keep the repo private and don't deploy publicly until it's confirmed.
- **No sign-up screen**: `(auth)/login` only.
- **Timezone**: all week maths in `Europe/London`; store timestamps in UTC.

## 5. Architecture rules

**Reuse from the Reporting Hub** (handover pack `2-shared-patterns/`): copy `audit.ts` (audit row builder) and `archive.ts` as they are, plus the UI primitives (button, fields, pill, segmented, tabs, icons) with `InternalStripe` removed from tabs. Don't copy `MockStoreProvider` or `PrototypeLabel`. Take the *pattern* of `permissions.ts` (pure functions over a `Viewer`, used both for UI booleans and inside every Server Action) but not its content: drop `Assignment`, `covers()`, `hasRoleAt()` and the Client User rules. Take the *pattern* of `workbook-extract.ts` / `workbook-diff.ts`: parse → stage → diff into change rows → review with decisions → one audited save.

1. **Server Actions return `ActionResult<T>`** (shape in `docs/tech-stack.md` §6), defined in `src/types/action-result.ts` with `ErrorCode` = `UNAUTHENTICATED | FORBIDDEN | VALIDATION | NOT_FOUND | CONFLICT | INTERNAL`. Every input validated by a zod schema in `src/types/`, shared by client and server. Field-level errors, never a generic "Invalid input".
2. **Permissions** live in `src/lib/permissions.ts` and are checked inside every Server Action and every page that loads data. Hiding a button is a convenience, not the lock. Pass permissions to the client as booleans.
3. **Nothing is hard-deleted.** "Delete" sets `archivedAt` and `archivedById`. Queries exclude archived rows by default.
4. **Every change to user-entered data is audited** (who, when, entity, entity id, field, old value, new value) in an `AuditEvent` written **in the same transaction** as the change. Use one helper (`src/lib/audit.ts`).
5. **Uploaded file fields are read-only** in the tool (job number, project name, workstream, % spend). Corrections come with the next upload.
6. **Excel is an input route, never the system of record.** Every upload goes validate → preview → confirm. Parsing is deterministic code in `src/services/parsing/`; no AI.
7. **Closed-week snapshots are never modified.** Past weeks read snapshots; the current week reads live data.
8. **Derived values** (RAG counts, spend bands, deltas, ages, overdue, roll-ups, pagination maths) are pure functions in `src/lib/` with unit tests, shared by server and UI.
9. After a mutation, `revalidatePath` the affected pages.
10. Server Components by default; client components only for interaction (filters, ticks, forms, tabs, pagination).

## 6. Roles and permissions

| Action | Admin | Updater |
|---|---|---|
| View clients, reported workstreams, projects, logs, pipeline, past weeks | ✓ | ✓ |
| Tick / untick "Include in weekly report" | ✓ | ✓ |
| Save draft / submit the weekly update (status, Delivery RAG, % complete, update) | ✓ | ✓ |
| Add, edit, close, delete (archive) risks and issues | ✓ | ✓ |
| Add, edit, archive pipeline opportunities | ✓ | ✓ |
| Spend uploads (upload, preview, confirm, cancel, history) | ✓ | ✗ |
| Switch a workstream to Reported / Hidden | ✓ | ✗ |
| Clients (create, rename, archive) | ✓ | ✗ |
| Users (create, set role, reset password, unlock, archive) | ✓ | ✗ |
| Generate report (HTML or PowerPoint) for a client or workstream | ✓ | ✓ |
| Change history (audit) view | ✓ | ✗ |
| Edit a closed week | ✗ | ✗ |

Updaters see **all** clients; there are no per-client or per-workstream assignments. Projects in hidden workstreams are invisible to Updaters.

**Landing after sign-in**: Admin → Admin home (`/admin`). Updater → client list (`/clients`) (decision 17 Nov).

**Accounts**: Admin creates users with a temporary password; `mustChangePassword` forces a change on first sign-in. Admin resets passwords. 5 failed attempts lock the account for 15 minutes. JWT sessions last 8 hours; "Keep me signed in" ticked keeps the cookie for those 8 hours, unticked makes it end when the browser closes. Keep auth SSO-ready (Microsoft Entra ID later).

## 7. Domain rules

**Spend upload** (full spec in `docs/excel-file-spec.md`)
- One file per client. Admin picks the client and enters the extract date (default today).
- Sheet `Project Budget Usage`, headers A1:D1 exactly: Job Number, Project Name, Default Reporting Workstream, Percentage Spent to Date. Mismatch → reject, listing expected vs found.
- Read cached formula results or plain values. A formula with no cached value is a row error.
- Column D: number ≥ 0 (fraction, 0.25 = 25%, may exceed 1) or exactly `Add budget to Workbook` / `No timesheet data`. Anything else is a row error.
- `UNMAPPED` is a normal workstream. Non-billable and internal jobs load like any project.
- New workstreams are created on first appearance, Hidden by default.
- Preview compares with live data: new projects, renamed, moved workstream, % spend changed, missing from file. Nothing is saved until Admin confirms. Confirm is disabled while row errors exist or any missing project lacks a decision.
- Missing projects: decision "Keep as is" or "Mark No longer in file", nothing pre-selected (the Admin must choose each). Either way the project **stays in the weekly report and lists**; the mark is informational.
- Every attempt is kept in the history: Confirmed, Cancelled, Rejected (with reason).
- If a week has no confirmed upload, reports and snapshots use the latest confirmed upload and show its extract date.

**Weekly update**
- Inputs: status, Delivery RAG, % complete (0–100 in steps of 10), update text. Draft or Submitted. No approval step. Edit and resubmit until close; the latest submission counts.
- "Include in weekly report" carries over week to week until changed.

**Week close** (automatic)
- Vercel Cron runs a close job often enough to catch Friday 23:59 Europe/London in both GMT and BST (on the Hobby plan crons run at most daily: schedule it early Saturday UK time); the job closes any open period whose `closesAt` has passed. Idempotent. The next period opens immediately; edits after close belong to the next week.
- Snapshot per project in a Reported workstream (decision 17 Nov): included flag, status, Delivery RAG, % complete, update, submitted by/at, `notUpdated` flag, % spend + spend status + upload extract date, open risk and issue counts by level, overdue counts.
- No submission by close → carry forward last week's submitted values, `notUpdated: true`. Unsubmitted drafts are ignored.
- Also snapshot each reported workstream's pipeline (each opportunity in full, including its estimated value and added date), and per client the risk and issue log (items and totals) needed for the week-on-week and month-on-month trends.

**Risks and issues**
- Risk: ref, title, severity (High / Medium / Low), owner, status (Open / On pause / Closed), raised date, due date, mitigation.
- Issue: ref, title, priority (Blocker / High / Medium / Low), owner, status, raised date, due date, next step.
- Refs run **per client**: `R-001`, `I-001`, from counters on Client, assigned in the insert transaction, never reused.
- Counts include Open and On pause only. Age = days since raised. Overdue = past due date and not Closed.
- Owners are free text (confirmed 16 Nov 2026), as are the pipeline's MAP owner and client owner.

**Pipeline** (per workstream): likelihood (High / Medium / Low), opportunity, estimated value (whole US dollars, required; "Not set" for older ones), possible start, added to pipeline (date, default today, can be backdated, not future), MAP owner, client owner, next steps. Time in pipeline = days since added; over 90 days flagged. Sorted by likelihood, then soonest start. Archive, never delete.

**Reports** (brief 07; decisions 17 Nov): a "Generate report" button on the client and workstream pages opens a confirm dialog (week, open or closed, how many projects are updated, those not updated), then generates HTML or PowerPoint. Client report: client summary, client pipeline summary, then per reported workstream (A–Z) its project slide(s) and pipeline slide; workstream report: its project slide(s) and pipeline slide. Only projects in the weekly report; trends over 8 weeks. Slides are 1280×720 (16:9) with navy header and "Internal: not for client distribution" footer; a workstream's first slide holds up to 6 projects, extra slides up to 12, with "page x of y". HTML and .pptx (built with `pptxgenjs`, Arial until the WPP Sans licence is confirmed) come from one report model, aren't stored, and each generation is audited.

## 8. Data model (target; confirm in each phase's Step 0)

- `User` — name, email (unique), passwordHash, role (ADMIN | UPDATER), mustChangePassword, failedSignInCount, lockedUntil, lastSignInAt, archivedAt.
- `Client` — name, riskSeq, issueSeq, archivedAt.
- `Workstream` — client, name (as in file; unique per client), reported (default false), accountDirector (optional free text, set by Admin).
- `Project` — client, workstream, jobNumber (unique per client, stored as text), name, includeInReport, missingFromFileSince, markedNoLongerInFileAt.
- `SpendUpload` — client, uploadedBy, uploadedAt, extractDate, fileName, file (Bytes in Postgres; no blob storage needed at ~870 rows), status following the Reporting Hub lifecycle (Checking → Rejected; Ready to review → Cancelled; Live → Replaced), rejectionReason, row / new / changed / missing / error counts. The UI words are Confirmed / Rejected / Cancelled as in the mockup.
- `SpendUploadRow` — staged parsed rows with row-level errors.
- `SpendUploadChange` — preview change list: type NEW | CHANGED (name or % spend) | MOVED (workstream) | MISSING, project, before, after, decision. No UNALLOCATED or EXCLUDED types.
- `ProjectSpend` — project × confirmed upload: percentSpent (Decimal, nullable), spendStatus (VALUE | NO_BUDGET | NO_TIMESHEET).
- `ReportingPeriod` — isoYear, isoWeek, startsOn, endsOn, closesAt, state (OPEN | CLOSED), closedAt.
- `ProjectWeek` — project × period: status, rag, percentComplete, updateText, state (DRAFT | SUBMITTED), submittedAt, submittedBy.
- `RiskItem`, `IssueItem` — fields in §7, plus client, project, closedAt, archivedAt, archivedById.
- `PipelineOpportunity` — workstream + fields in §7 (`estimatedValue` Int, nullable for old rows; `addedOn` Date), archivedAt, archivedById.
- `ProjectWeekSnapshot`, `PipelineWeekSnapshot`, `LogWeekSnapshot` — immutable JSON per closed period.
- `AuditEvent` — at, user, entity, entityId, action, field, oldValue, newValue.

## 9. Screens and routes

| Screen | Route | Who | Mockup |
|---|---|---|---|
| Sign in | `/login` | public | `Login.dc.html` |
| Change password (first sign-in) | `/change-password` | signed in | — (simple form) |
| Admin home | `/admin` | Admin | `Home.dc.html` |
| Client landing | `/clients/[clientId]` | all | `Client.dc.html` |
| Workstream landing | `/clients/[clientId]/workstreams/[workstreamId]` | all | `Main.dc.html` |
| Project | `/projects/[projectId]` | all | `Project.dc.html` |
| Risk log / Issue log | `/clients/[clientId]/risks`, `/clients/[clientId]/issues` | all | `Log.dc.html` |
| Spend uploads | `/admin/uploads` | Admin | `Upload.dc.html` |
| Users | `/admin/users` | Admin | — (simple table) |
| Clients | `/admin/clients` | Admin | — (simple table) |
| Change history | `/admin/history` | Admin | — (simple table) |
| Generate report dialog | on client and workstream pages | all | `ReportDialogClient.dc.html`, `ReportDialogWorkstream.dc.html` |
| Client report (HTML) | `/clients/[clientId]/report?week=` | all | `SlideClientSummary`, `SlidePipelineClient`, `SlideWorkstream`, `SlideWorkstreamMike`, `SlidePipelineWorkstream` |
| Workstream report (HTML) | `/clients/[clientId]/workstreams/[workstreamId]/report?week=` | all | `ReportWorkstreamOnly`, `ReportWorkstreamOnlyPipeline` |
| Report (PowerPoint) | `/clients/[clientId]/report.pptx?week=&workstream=` | all | as above |

Past weeks: `?week=2026-W46` on client, workstream, project and log routes.

## 10. Implementation sequence

Each phase has its own brief in `briefs/`. Every brief starts with **Step 0: investigate and report back**; stop and flag anything that contradicts this file, the decision log or the brief.

0. Scaffold, docs, design tokens, CI. **Done 16 Nov 2026**, including Neon, GitHub and Vercel (live at weekly-project-health.vercel.app; public on the Hobby plan, so share nothing real until sign-in exists). Still to do: the Prisma agent skills.
1. Front end on mock data (all screens). **Done 17 Nov 2026.**
2. Database schema, migrations, seed (synthetic), audit helper. **Done 17 Nov 2026**: pages read the live database through `src/server/repository.ts`; edits stay local until brief 05.
3. Auth and roles: sign-in, lockout, first-sign-in password change, role landing, permissions. **Done 17 Nov 2026**: NextAuth v5 (`src/auth.ts`), sign-in action with lockout, `requireViewer()` checks the database on every request, Users and access actions (audited). First Admin via `npm run user:create-admin` (run by Paul).
4. Spend upload: parser, validation, preview, decisions, confirm, history, Reported flag. **Done 17 Nov 2026**: `src/services/parsing/spend-file.ts`, `src/lib/spend-diff.ts`, actions in `src/app/(app)/admin/uploads/actions.ts`; `npm run upload:dry-run` previews a file read-only.
5. Weekly inputs: selection, weekly update, risks, issues, pipeline (all audited). **Done 17 Nov 2026**: actions in `src/server/actions/weekly.ts`, rules in `src/lib/weekly-rules.ts`; saves only in the open week; a save made over someone else's newer change is refused with a warning and a reload.
5b. Pipeline value and time in pipeline (brief 05b).
6. Periods and snapshots: automatic close, carry-forward, snapshots. **Done 17 Nov 2026**: rules in `src/lib/snapshot.ts`, job in `src/server/close-week.ts`, cron `/api/cron/close-week` daily at 01:00 UTC (`vercel.json`, needs `CRON_SECRET` in Vercel); `npm run week:close` closes by hand, `npm run snapshots:backfill` converted the sample weeks.
7. Reports and logs: aggregations, trends, past weeks; Generate report (HTML and PowerPoint) — brief 07. **Done 18 Nov 2026.** Log trends read each week's snapshot (`history` in `src/lib/logs.ts`); pages load the snapshots around the week they show (`snapshotWindow`, `getRepository(week)`). Generate report: model in `src/lib/report.ts`, dialog `src/components/features/report-dialog.tsx`, HTML pages in `src/app/(report)/`, PowerPoint in `src/services/documents/report-pptx.ts`; each generation audited as GENERATE.
8. Hardening and go-live: accessibility, error states, admin tables, production deploy. **Code done 18 Nov 2026** (brief 08): error and loading pages, Admin › Clients actions, Change history filters, axe and contrast tests, security headers. Go-live waits on the checklist in `docs/operations.md` §7 (font licence, data governance, Vercel Pro, development database).

## 11. Ways of working

- Design screens first (done), build the front end on mock data, then wire up data.
- **Synthetic data only** until the data governance review. Never commit or seed real client files or names of real client contacts. **One exception** (decision log, 17 Nov 2026): TCCC's spend file, approved by Paul for use on the site, converted to `src/mocks/clients/tccc.json` (the .xlsx is never committed). Invent nothing for real projects. This applies to mocks, fixtures, seed data and tests: invent client, workstream, project and people names (the decision log mentions the real client and workstreams; never copy them into data).
- **Never hardcode secrets.** They live in `.env.local` (git-ignored) and in Vercel's environment variables; `.env.local.example` lists the names only. Never paste a secret into chat, code, tests or docs.
- Paul is not a developer: explain choices in plain English and ask one question at a time.
- Every feature ships with Vitest tests in `tests/`; the full suite passes before a PR. GitHub PRs, regular merges (not squash).
- Keep `progress.md` (append-only, at each checkpoint) and `agent.md` (codebase summary, rewritten at checkpoints).
- Record new decisions in `docs/decision-log.md`: date, decision, reason, alternatives rejected.
- When a requirement is ambiguous, ask before designing around it. Prefer simple, maintainable designs a small team can run.
- Separate infrastructure: own GitHub repo, Vercel project, Neon project and `NEXTAUTH_SECRET`. Never point at the Reporting Hub's or Project Brain's database.
- **One database during the pilot**: the Neon `production` branch is used locally and on Vercel (decision log, 16 Nov). Local migrations, seeds and tests that touch the database change live data: seed synthetic data only, ask Paul before running a migration, and never run destructive scripts.
