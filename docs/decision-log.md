# Decision log

Short entries: date, decision, reason, alternatives rejected. Newest at the bottom. File-specific decisions are detailed in `excel-file-spec.md`.

## 16 Nov 2026 — One spend file per client
Uploader picks the client; the upload replaces that client's project list only. Reason: each client's workbook is produced separately. Rejected: one combined file with a client column.

## 16 Nov 2026 — Accept files with or without formulas
Parser reads cached formula results or plain values; a formula with no cached value is a row error. Reason: no extra weekly step for the uploader. Rejected: requiring a values-only export.

## 16 Nov 2026 — Uploader enters the extract date
Required on the upload screen, defaults to today. Reason: the file has no date. Rejected: file modified date.

## 16 Nov 2026 — UNMAPPED rows load as a normal workstream
No warning, no blocking. Reason: they can safely be ignored. Rejected: rejecting rows or blocking the upload.

## 16 Nov 2026 — Non-billable and internal jobs stay in
No filtering. Reason: simple parser, file is the single source. Rejected: filtering by name or job-number range.

## 16 Nov 2026 — Workstream is never overridden in the tool
The tool always uses "Default Reporting Workstream" from the file. Reason: the source workbook is the system of record for project mapping. Rejected: an in-tool override.

## 16 Nov 2026 — Report landing pages for five workstreams (TCCC)
Landing pages for Josefine, Mette, Mike, Nadine EU and Nadine Global. A `reported` flag on Workstream, set by Admin, drives which workstreams have pages. Reason: only these workstreams are reported; the others in the file group internal, business development or invoicing jobs. Rejected: hard-coding workstream names.

## 16 Nov 2026 — Workstream names as in the file
The page is "Nadine EU", matching the file. No separate display name. Reason: one name everywhere, nothing to keep in sync. Rejected: a display name ("Nadine EUR").

## 16 Nov 2026 — Non-reported workstreams are hidden
Projects in non-reported workstreams (115 of 869 in the TCCC sample) are stored but hidden from Updaters and all reports. Reason: they are not project work to report on. Rejected: selectable without a landing page.

## 16 Nov 2026 — Client roll-up covers reported workstreams only
The TCCC client page rolls up the five reported workstreams. Reason: consistent with hiding the rest. Rejected: all workstreams in the file.

## 16 Nov 2026 — Three page levels
A client landing page, a workstream landing page and a page per project. Reason: matches the Client > Workstream > Project taxonomy. Rejected: a single combined report.

## 16 Nov 2026 — Project selection lives on the workstream page
The workstream landing page has the project list, modelled on the Reporting Hub's Projects list: an "Include in weekly report" tick per project, ticked projects pinned to the top, filters, pagination (25 / 50 / 100 rows) and changes kept in the history. The list shows only that workstream's projects. Reason: Updaters select in the context they report in; reuses a pattern the team already knows. Rejected: a separate cross-workstream selection screen.

## 16 Nov 2026 — Any Updater can tick any project
Any Updater (PM or Account Director) can include or exclude any project in a reported workstream. Every change is audited. Reason: keeps selection quick and avoids blocking on PM-to-project assignment. Rejected: PMs limited to projects they are assigned to.

## 16 Nov 2026 — Project status values
In progress, On hold, Complete. Reason: agreed from the workstream page design. Rejected: none considered.

## 16 Nov 2026 — Workstream weekly summary
The workstream landing page opens with a weekly summary modelled on the Reporting Hub's workstream overview: in weekly report, % spend bands, no spend figure, complete, delivery RAG mix, open risks and issues with change on last week, and updates submitted this week. Tiles cover projects in the weekly report only. Reason: one glanceable view per week, reusing a known pattern. Rejected: a summary across all projects in the file.

## 16 Nov 2026 — Workstream pipeline
The workstream page has a Pipeline section below the weekly summary, modelled on the Reporting Hub's pipeline. Each opportunity has likelihood (High / Medium / Low), opportunity, possible start, MAP owner, client owner and next steps. Sorted by likelihood, then soonest start. Any Updater or Admin can add, edit and archive opportunities; archiving replaces deleting and every change is audited. The pipeline is frozen in the weekly snapshot, so past weeks show it as it was, and it rolls up to the client page. Reason: one place for the forward view next to delivery health. Rejected: a separate pipeline page; limiting edits to Account Directors.

## 16 Nov 2026 — Project page
One page per project. The Updater edits this week's status, Delivery RAG, % complete and weekly update, then submits (or saves a draft). Risks and issues are added, edited and deleted on the page; "Delete" archives the item and keeps it in the history. % spend is shown read-only from the latest upload, with a % spend vs % complete trend and an 8-week Delivery RAG history. Reason: everything updated weekly in one place. Rejected: separate edit screens per item.

## 16 Nov 2026 — Risk and issue fields
Risk: ID, title, severity (High / Medium / Low), owner, status (Open / On pause / Closed), raised date, due date, mitigation. Issue: ID, title, priority (Blocker / High / Medium / Low), owner, status, raised date, due date, next step. Age = days since raised. Overdue = past due date and still Open or On pause. Counts include Open and On pause only. Reason: matches the Reporting Hub's labels; due dates let the logs show overdue items. Rejected: age only, no due date.

## 16 Nov 2026 — Risk log and issue log
One log page with Risk log and Issue log tabs, scoped to the client with a workstream filter. Summary: open count with change on last week and on 4 weeks ago, split by severity or priority, average age (and change on last month), oldest item, raised and closed this week and month to date, ageing bands (under 14, 14–30, over 30 days), and overdue count with share of open and how many fall due by the week's close. Trends: 12 weeks week on week (open at week end, raised, closed) from snapshots, and month on month (open at month end, change, raised, closed, average age). Then a by-workstream table and the full filterable listing, including due date and an overdue filter. Items are edited on the project page, not in the log. Reason: one place to see volume, severity, age and trend across the client. Rejected: separate pages per log.

## 16 Nov 2026 — % complete in 10% steps
% complete is a dropdown: 0%, 10%, 20% … 100%. Stored as an integer multiple of 10 (zod-validated). Reason: quick, consistent input. Rejected: free number entry and a slider.

## 16 Nov 2026 — "Delivery RAG" with meanings, on every page
The RAG is labelled "Delivery RAG" everywhere. Each value is always shown with its colour word and meaning: Green · On track, Amber · At risk, Red · Blocked. Reason: makes the judgement explicit and keeps RAG readable without colour. Rejected: colour word alone.

## 16 Nov 2026 — Admin uploads the spend file and manages access
The Admin (Paul Worrall) uploads the weekly spend file and maintains users and roles. Reason: one accountable owner while the tool is small. Rejected: Account Directors uploading their own client's file.

## 16 Nov 2026 — The week closes on Friday
A reporting week runs Monday to Friday (e.g. week 47 = 16–20 Nov 2026). The period closes at the end of Friday and the snapshot is written then; updates are due by Friday. Reason: matches the working week. Rejected: Sunday close.

## 16 Nov 2026 — Admin › Spend uploads page
Admin-only page per client. Latest upload tiles: uploaded at and by, extract date, records (in reported vs hidden workstreams, rejected rows), workstreams (reported vs hidden, new), % spend breakdown (with figure, over budget, no budget, no timesheet data), and changes vs the previous upload (new, renamed, moved, % spend changed, missing). Upload flow in three steps: choose client, extract date and file (with the expected structure shown), check the file, then a preview of changes by type; every "missing from file" project needs a decision (Keep as is / Mark "No longer in file") before Confirm is enabled. Upload history keeps every attempt, including rejected (with the reason) and cancelled files. The Reported setting for each workstream is managed here. Reason: one admin screen for the weekly routine and its audit trail. Rejected: a bare upload form without history.

## 16 Nov 2026 — Two roles: Admin and Updater
Roles are Admin and Updater. Updater covers Project Managers and Account Directors. Admin can do everything an Updater can, plus spend uploads, the Reported setting on workstreams, clients, users and roles, and the change history. Updaters select projects for the weekly report, submit weekly updates, manage risks and issues, and edit the pipeline; they never see spend uploads or user admin. Permission checks run in every Server Action (src/lib/permissions.ts). Reason: simple model for a small team. Rejected: separate PM, Account Director and Internal Viewer roles.

## 16 Nov 2026 — Updaters see all clients
Every Updater can see and update every client, workstream and project in reported workstreams. There are no per-client or per-workstream access assignments; a user's role is the only access setting. This replaces the overview's "access assigned at client or workstream level and inherited downward". Reason: small internal team; simpler to run. Rejected: per-client and per-workstream assignment.

## 16 Nov 2026 — Landing page by role
After sign-in, Admin lands on Admin home; Updaters land on the client landing page (TCCC today). Admin home shows: updates outstanding this week across all reported workstreams (project, workstream, last submitted by, last submitted, draft or not started), the client card with weekly roll-up and workstream links, the "This week" timeline, the latest upload, users and roles counts, and links to the logs. The client page has no personal "Your updates this week" section: Updaters find their projects through the workstream pages. Updater pages have no Spend uploads link. Reason: each role starts where its weekly job is. Rejected: one Home for everyone; a personal to-do list on the client page. Open: the landing page once there is more than one client (proposed: a client picker, or the last-viewed client).

## 16 Nov 2026 — Missed submissions carry forward
If a project in the weekly report has no submission by the Friday close, its snapshot carries forward last week's submitted values (status, Delivery RAG, % complete, update) marked "Not updated". % spend still comes from the latest upload, and risk and issue counts are taken from the live logs at close. An unsubmitted draft is not used. Reason: keeps trends continuous and makes gaps visible. Rejected: blank values for the week.

## 16 Nov 2026 — Week close is automatic
The week closes automatically at 23:59 Europe/London every Friday (DST-aware). A scheduled job (Vercel Cron) checks for open periods past their close time and closes them; closing is idempotent. Edits made after the close go into the next week, which opens straight away. No manual "Close week" button. Reason: no weekly admin step. Rejected: manual close; a manual fallback button.

## 16 Nov 2026 — Spend upload on Mondays; gaps use the latest upload
The spend file is uploaded on Mondays. If a week has no confirmed upload, its snapshot uses the latest confirmed upload, and the reports show that upload's extract date. Reason: spend changes slowly; reports never go blank. Rejected: blocking the week until an upload arrives.

## 16 Nov 2026 — "Last submitted by" instead of assigning people to projects
Admin home's outstanding list shows who last submitted each project. There is no assignment of people to projects (no ProjectManager table). Reason: no admin overhead; the submitter is known from the data. Rejected: assigning PMs to projects in the tool; a PM column in the source workbook.

## 16 Nov 2026 — Selection carries over
"Include in weekly report" stays as set from week to week until someone changes it. Each weekly snapshot records whether the project was included that week. Reason: most projects are reported every week. Rejected: re-selecting every week.

## 16 Nov 2026 — Weekly inputs: core only
The weekly inputs are status, Delivery RAG, % complete and the update text, plus the living risk and issue logs. Milestones, actions, decisions and changes are out of scope for this project. Reason: keep the weekly update quick. Rejected: extra logs.

## 16 Nov 2026 — Projects missing from a file stay in the report
The workbook extract includes all historical jobs, so a project should not drop out of the file. If one does, the upload preview still flags it (as a safeguard), the default decision is "Keep as is", and the project stays in the weekly report and lists. "Mark No longer in file" is kept as an option for Admin but does not remove the project from the report. Reason: the file is complete; the check catches extract errors. Rejected: dropping missing projects from the report.

## 16 Nov 2026 — Risk and issue IDs run per client
IDs are numbered per client: R-001, R-002 … and I-001, I-002 …, from counters on the Client record, assigned in the same transaction as the insert. IDs are never reused, including after an item is archived. Reason: stable, readable references across the client's logs. Rejected: per-project or global numbering. Assumed (to confirm): risk and issue owner, and the pipeline's MAP owner and client owner, are free text.

## 16 Nov 2026 — Reports as HTML layouts (design to follow)
Reports will be generated as HTML layouts. Their design is still to come and is not part of the first build phases. RAG roll-ups on screens show counts (Green · On track, Amber · At risk, Red · Blocked), with no single rolled-up RAG. Reason: report design is a separate step. Rejected: PPTX or PDF export for v1.

## 16 Nov 2026 — Sign-in and accounts
Admin creates each user with a temporary password that must be changed on first sign-in, and resets passwords. Five failed attempts lock the account for 15 minutes. Sessions last 8 hours. No self sign-up. NextAuth v5 credentials, kept SSO-ready (Microsoft Entra ID later). Taken as agreed from the proposal on 16 Nov.

## 16 Nov 2026 — Undesigned admin screens built as simple tables
Users and roles, Clients (Admin adds a client before its first upload) and the change history (audit) are built by Claude Code as simple tables in the same style, without a separate design pass. Taken as agreed from the proposal on 16 Nov.

## 16 Nov 2026 — No email reminders in v1
No email reminders or notifications in v1. Admin home's outstanding list is the chase tool. Taken as agreed from the proposal on 16 Nov.

## 16 Nov 2026 — No AI in v1
The Anthropic SDK is not installed in v1, and there is no Anthropic API key. Reason: the overview puts AI out of scope. Rejected: carrying the Reporting Hub's AI set-up over unused.

## 16 Nov 2026 — Owners are free text (confirmed)
Risk and issue owners, and the pipeline's MAP owner and client owner, are typed-in names, not picked from users. Reason: owners can include client-side people with no login; simplest. Rejected: picking from the tool's users.

## 16 Nov 2026 — Prisma 7.10.1 instead of 7.9.1
`npm audit` flagged four high-severity advisories in Prisma 7.9.1's dependencies (deepmerge-ts, mysql2); 7.10.1 fixes them. `prisma`, `@prisma/client` and `@prisma/adapter-pg` are pinned to 7.10.1. Reason: brief 00 asks for patched versions where advisories exist. Rejected: staying on 7.9.1 to match the tech-stack doc. Still open: two moderate advisories via exceljs's `uuid` (only affects uuid v3/v5/v6 with a buffer, which exceljs doesn't use); revisit when exceljs updates.

## 16 Nov 2026 — Match the Reporting Hub's set-up over the Next.js 16.4.6 starter defaults
React pinned to 19.2.8 (the starter installs 19.3.0); Tailwind via `@tailwindcss/postcss` (the starter uses a Turbopack CSS loader); no `cacheComponents` or `partialPrefetching`. Reason: same stack and behaviour as the Reporting Hub, as CLAUDE.md §4 asks. Rejected: the starter's defaults.

## 16 Nov 2026 — Small orange text uses #B34F00
Eyebrows, link hover and form errors use `--eyebrow` `#B34F00`, not the Reporting Hub's Orange 800 `#D94E0E`, which is below WCAG AA for small text on Cream. Muted text and line colours keep the Reporting Hub's values. Differences are listed in `docs/design/README.md`. Reason: accessibility (CLAUDE.md §4). Rejected: copying the Reporting Hub's eyebrow colour.

## 16 Nov 2026 — First commit straight to main
The scaffold is the repository's first commit, made directly on `main` at Paul's request (an empty repository has no base branch for a pull request). From brief 01 on, work goes through pull requests with regular merges. Rejected: a PR for the first commit.

## 16 Nov 2026 — One database for the pilot (production only)
The Neon project `weekly-project-health` (AWS Europe West 2, London) has only its default `production` branch. Local development, the Vercel deployment and migrations all use it. Reason: this is a pilot; one database is simpler to run. Consequences: anything run locally (migrations, seed, manual testing) changes the live data, so seed only synthetic data, run migrations deliberately, and never run destructive scripts locally. Rejected: a separate `development` branch, as brief 00 proposed. Revisit before wider roll-out.

## 17 Nov 2026 — "Last submitted by" replaces PM on screens
The workstream project list (column and filter), the client page's Needs attention table and the project page header show "Last submitted by" instead of the mockups' PM. Reason: consistent with "no assignment of people to projects" (16 Nov). Rejected: a PM field typed on the project page.

## 17 Nov 2026 — Account Director on workstreams, typed by the Admin
Each workstream gets an optional free-text Account Director, edited by the Admin in Spend uploads › Workstreams and shown on workstream cards and the workstream header. Reason: the mockups show it; free text keeps it simple. Rejected: leaving it out; linking to a user.

## 17 Nov 2026 — Missing-from-file decisions start empty
In the upload preview, no decision is pre-selected for projects missing from the file; Confirm stays disabled until each has "Keep as is" or "Mark No longer in file". Supersedes "the default decision is Keep as is" (16 Nov, "Projects missing from a file stay in the report"); the rest of that entry stands. Reason: the check is a safeguard against a bad extract, so a deliberate choice makes the Admin notice. Rejected: pre-selecting Keep.

## 17 Nov 2026 — "Keep me signed in" tick box
The sign-in page keeps the mockup's tick box. Ticked: the session cookie lasts the full 8 hours, even after the browser closes. Unticked: it ends when the browser closes (and after 8 hours at most). Reason: safer on shared computers. Rejected: always 8 hours.

## 17 Nov 2026 — TCCC's spend file approved for use on the site
Paul (Admin) approved loading TCCC's real spend file (`TCCC_Weekly_Helath_Check_In_V1.xlsx`, 869 rows, extract date taken as 16 Nov 2026) into the site, including the public Vercel address, stating it contains no sensitive information. It holds only job numbers, project names, workstream names and % spend. It is converted once with `scripts/import-spend-file.mts` into `src/mocks/clients/tccc.json`, which is committed; the .xlsx is not. Nothing is invented for TCCC's real projects: no weekly updates, RAGs, risks, issues or pipeline, and no project is in the weekly report until someone ticks it. Supersedes "synthetic data only" (CLAUDE.md §11, excel-file-spec "Data governance") for this file only; everything else stays synthetic, and the guard test still bans real names outside `src/mocks/clients/`. Reason: see real projects on the site before uploads are built. Rejected: waiting for brief 04 uploads; inventing weekly data for real projects.

## 17 Nov 2026 — Client list once there is more than one client
With two clients, Updaters land on a client list (`/clients`) and "Clients" in the menu goes there; "Workstreams" and "Risks and issues" go to the client being viewed, or to the list. Admin home shows a card per client, and Spend uploads has a client switcher. Settles the open point in "Landing page by role" (16 Nov). Rejected: landing on the last-viewed client (needs storage; revisit with sign-in in brief 03).

## 17 Nov 2026 — Seed the live database with Northwind (sample) and TCCC
The single Neon database is seeded with Northwind Drinks (invented sample client, to practise on; archive it later in Admin › Clients) and TCCC (from its approved spend file). Reason: the site keeps looking as it does now. Rejected: TCCC only.

## 17 Nov 2026 — Brief 02 is read-only; saving stays in brief 05
After brief 02 every page reads from the database, but edits are still local until brief 05 (after sign-in in brief 03 and uploads in brief 04), so nobody can change live data on the public site without signing in. Migrations are written offline (`prisma migrate diff`) and applied with `prisma migrate deploy` only after asking Paul; `migrate dev` and `migrate reset` are never used on the live database. Rejected: bringing saving forward before sign-in.

## 17 Nov 2026 — Sessions: fixed 8 hours from sign-in
A session ends 8 hours after signing in, even if the person is active; activity does not extend it. "Keep me signed in" ticked keeps the cookie for those 8 hours; unticked, it ends when the browser closes. Reason: simpler and safer; keeps "Keep me signed in" reliable. Rejected: a session that resets while active.

## 17 Nov 2026 — Password rule
New passwords (first sign-in change, and the Admin's temporary passwords) need at least 8 characters with an upper-case letter, a lower-case letter, a number and a symbol. Reason: Paul's choice. Rejected: 12+ characters with any mix.

## 17 Nov 2026 — Paul's Admin account created by a script he runs
The first real Admin account (Paul's WPP work email) is created with `scripts/create-admin.mts`, run in Paul's own terminal, which prints the temporary password there only. The email is not stored in the code or Git. The invented sample users have no password and can't sign in. Reason: keep credentials out of chat and the repository. Rejected: seeding the account.

## 17 Nov 2026 — Sign-in messages don't reveal whether an account exists
A wrong email or password shows "Email or password not recognised. … After 5 failed attempts in a row the account is locked for 15 minutes." without the mockup's "N attempts left", which would show that the email has an account. Unknown emails take as long to check as real ones. The "locked" message is unchanged. Reason: don't help anyone guess which emails have accounts. Rejected: the mockup's attempts-left count.

## 17 Nov 2026 — TCCC's weekly spend files approved for upload
Paul approved uploading TCCC's weekly spend files through Spend uploads on the live site; the file is stored in the database for the audit trail. Extends the 17 Nov approval of the first file. Other clients' real data still needs Paul's approval. Test fixtures stay synthetic. Reason: the weekly routine needs real files. Rejected: waiting for the data governance review.

## 17 Nov 2026 — A newer file cancels one still waiting for review
Checking a new spend file cancels any earlier file for the same client that is still Ready to review; it stays in the history as Cancelled ("Replaced by a newer file before review"). Reason: only one preview per client, no dead ends. Rejected: blocking the new file until the earlier one is confirmed or cancelled.

## 17 Nov 2026 — Warn when someone else saved first
Saving a weekly update, risk, issue or pipeline opportunity is refused if someone else changed it since the page was opened ("This was changed by … at … since you opened it"), and the latest values are shown so the change can be re-applied. "Include in weekly report" ticks are a single on/off, so the last tick wins. Reason: nobody's changes are silently overwritten. Rejected: last save wins.

## 17 Nov 2026 — The open week is created on first save
Weekly inputs are saved against the open reporting week, which is created in the database on first save if it doesn't exist yet (state Open, closing Friday 23:59 London). Saves for a week whose close time has passed are refused even before the close job runs. Reason: the automatic close (brief 06) isn't built yet, and the Hobby cron runs once a day. Rejected: creating weeks in advance.

## 17 Nov 2026 — Snapshots record every project in a Reported workstream
At each close, every project in a Reported workstream is recorded, with whether it was in that week's report; projects in Hidden workstreams are not. Each record holds the week's values (or the last submitted ones carried forward, marked "Not updated" when the project was in the report), % spend with its upload's extract date, and open and overdue risk and issue counts. Each Reported workstream's pipeline and each client's full risk and issue log (as they stood at the close, with totals) are recorded too. Reason: history exists for a project before it is first ticked, and past weeks stay exactly as they were. Rejected: ticked projects only; every project including Hidden workstreams.

## 17 Nov 2026 — The sample past weeks become snapshots once
Weeks 35–46 (the sample weeks the seed created) are turned into snapshots by a one-off script, so every closed week is read the same way. Each client is left out of weeks that ended before its first spend upload (TCCC joined in week 47). "Include in weekly report" and Reported workstreams are taken as they are today, as their history wasn't kept before snapshots. Reason: one way of reading closed weeks. Rejected: working the old weeks out from live data indefinitely.

## 17 Nov 2026 — The close job runs daily at 01:00 UTC
Vercel Cron calls the close job every day at 01:00 UTC (01:00 GMT or 02:00 BST, always after Friday 23:59 London time), which is the most the Hobby plan allows. It closes any week whose close time has passed, oldest first, including weeks nobody saved in, then opens the next. Running it again does nothing. The close appears in Change history as made by "System". Because saves are refused from Friday 23:59, the snapshot records the week as it was even though the job runs a little later. Reason: no weekly admin step, and a missed run catches up. Rejected: a Saturday-only schedule (a missed run would wait a week).

## 17 Nov 2026 — Pages load the last 13 weeks of snapshots
Each page loads the snapshots of the 13 most recent closed weeks, enough for every trend (12 weeks of log history, 8 of project history). A closed week older than that is worked out from live data until brief 07 loads the snapshots of the week a page shows. Reason: loading every week on every page would grow all year (about 560 records a week for the sample client alone). Rejected: loading all snapshots.

## 17 Nov 2026 — Generate report from the client and workstream pages
Client and workstream landing pages get a "Generate report" button for Admins and Updaters. It opens a confirm dialog: the week (the one chosen in the week picker), whether it is open or closed, how many projects in the weekly report are updated (submitted / draft saved / not started), a by-workstream table on the client version, and the list of projects not updated with when they were last submitted. It notes that those projects appear with their last submitted values marked "Not updated", and that drafts are never used. The user picks HTML or PowerPoint (.pptx) and generates, or cancels. Supersedes "Reports as HTML layouts (design to follow)" (16 Nov) and its rejection of PPTX. Reason: one click from where people work, with a check on completeness first. Rejected: a separate reports page; generating without a check.

## 17 Nov 2026 — Report contents and order
Client report: (1) client summary, (2) client pipeline summary, then for each reported workstream (A–Z, as on the site) its project slide(s) followed by its pipeline slide. Workstream report: that workstream's project slide(s) and pipeline slide. A workstream with no open opportunities has no pipeline slide. Only projects in the weekly report appear. Trends cover 8 weeks: up to 7 closed weeks from snapshots plus the chosen week (live if open). Reason: summary first, details per workstream. Rejected: one slide per project.

## 17 Nov 2026 — Report slides are 16:9, 1280×720
Every slide is 1280×720 px, PowerPoint's default 16:9 (13.333 × 7.5 in), so the HTML and PowerPoint versions share one layout. Each slide has the navy header (report name, week, INTERNAL), a footer "Internal: not for client distribution" and "Page n of N". Delivery RAG always as word + meaning; no text under 12 px (9 pt). Reason: one design for both formats. Rejected: A4 pages.

## 17 Nov 2026 — Workstreams that need more than one slide
A workstream's first slide holds its summary tiles, trends and up to 6 projects. More projects continue on extra slides (table only, up to 12 projects each). Every slide of such a workstream shows "‹Workstream› · page x of y" next to the title; the table is headed "Projects 1–6 of 14", the first slide ends "Continued on the next slide: projects 7–14 of 14 →", and the last ends "End of ‹Workstream›'s projects". Reason: readers can tell a workstream continues. Rejected: shrinking text to fit.

## 17 Nov 2026 — Pipeline value
Each opportunity has an estimated value, in whole US dollars, required when adding or editing. It is shown on the workstream pipeline, the client page, Admin home and the report, with totals and splits by likelihood. Opportunities saved before this change show "Not set" until edited. Currency is USD for every client (to confirm). No weighted value in v1. Reason: show the size of the prize. Rejected: a weighted value (High 75%, Medium 50%, Low 25%) until Paul confirms the weights; a currency per client.

## 17 Nov 2026 — Time in pipeline
Each opportunity has an "Added to pipeline" date: today by default, editable so opportunities discussed before the tool can be backdated, never in the future. Time in pipeline = days from that date to today (to the week's Friday for a closed week). Over 90 days is flagged in bold and in words for screen readers. Averages and the oldest are shown per workstream and client. Existing opportunities take their creation date. Reason: shows opportunities that are stalling. Rejected: using the creation date only (can't be backdated).

## 17 Nov 2026 — Client pipeline slide shows summaries only
The client report's pipeline slide has no opportunity lines: a headline ("$1.98m in the TCCC pipeline across 10 opportunities, with $1.07m rated High"), tiles (pipeline value with change on last week, value by likelihood, value that could start in the next 3 months, value in the pipeline over 90 days with the average time), and a table by workstream (value, value by likelihood bar, opportunities, average time in pipeline, over 90 days, next possible start) with a client total. Each opportunity is listed on its workstream's pipeline slide, with likelihood, opportunity, value, possible start, owners, next steps and time in pipeline, plus a timeline of possible starts for the next 6 months. Reason: the client view is for the headline; detail lives with the workstream. Rejected: listing every opportunity on the client slide.

## 17 Nov 2026 — PowerPoint built in code, not from screenshots
The .pptx is generated on the server with `pptxgenjs` from the same report data as the HTML: native text, tables and shapes (bars drawn as shapes), so it can be edited in PowerPoint. Arial is used in the .pptx until the WPP Sans licence is confirmed. Reports are generated on demand and not stored; each generation is recorded in the change history (who, scope, week, format). Reason: editable, consistent, no browser on the server. Rejected: screenshots of the HTML; a headless browser; storing every report.

## 18 Nov 2026 — Pipeline snapshots already carry value and added date
Brief 06 (built before 05b) stores each opportunity in full in the weekly pipeline snapshot, so estimated value and added date are recorded from the first close after the 05b migration. The sample weeks 35–46 were recorded before these fields existed: they show "Not set" and use the creation date as the added date. Reason: no change to the close needed. Rejected: rewriting the sample snapshots (snapshots are never modified).

## 18 Nov 2026 — Report generations are recorded as "Generate"
The change history gains a "Generate" action. Each HTML view or PowerPoint download of a report records who, the client (and workstream), the week and the format; the report itself isn't stored. Reason: a clear audit trail of who produced which report. Rejected: recording it as "Create" of a Report.

## 18 Nov 2026 — Report details the mockups left open
Built as the mockups and the 17 Nov decisions, with these settled in brief 07's Step 0: up to 6 projects on a workstream's first slide (the brief's "tiles and trends only" was superseded by the decision log); the client summary has separate Open risks and Open issues tiles and the risk and issue trend is clustered bars; a workstream pipeline slide has five tiles (value, by likelihood, average time, over 90 days, possible start within 3 months); "· pipeline on the next slide" is left off when no pipeline slide follows; pipeline "change on last week" says "no figure for last week" when last week has no values; the possible-starts timeline covers the six months after the report date's month; a closed week's dialog says its figures are final. In the PowerPoint the two trend charts are native PowerPoint charts (editable, with alt text) rather than shapes, because PowerPoint only supports alt text on charts and images; smaller bars are shapes with their figures written beside them. Reason: match the mockups and keep the PowerPoint accessible. Rejected: drawing the trend charts as shapes with no alt text.
