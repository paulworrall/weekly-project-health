# Weekly Project Health — project overview

You are helping design and build Weekly Project Health, an internal reporting tool for WPP Enterprise Solutions (MAP). It is a separate application from the Reporting Hub, but it uses the same architecture, tech stack, conventions and ways of working. Treat this project as the source of truth for requirements, data model, access, report designs and build decisions. Development happens in Claude Code. Keep the CLAUDE.md in the repository aligned with decisions made here.

## What the tool does

- Gives a weekly view of the health of projects across clients and workstreams.
- **Internal only.** Clients never see it, so there is no client-facing view, no visibility flag and no client report.
- An Excel file is uploaded each week. It holds each project's job number, name, workstream and % of budget spent.
- PMs choose which of their projects appear in the weekly report. For each one they add the week's inputs: status, RAG, % complete, updates, risks, issues and so on.
- Every week is stored in the database, so trends can be tracked over time: RAG movement, spend progression, and how risk and issue counts change.

## Taxonomy (always use these terms, in the UI and in code)

Client > Workstream > Project.

- **Client**: a client account. Has its own list of workstreams.
- **Workstream**: a reporting grouping within a client, run by an Account Director.
- **Project**: a job, keyed by its **job number** from the Excel file. Owned by one or more Project Managers. A PM can work across several workstreams and clients.
- The workstream for each project comes from the Excel file. It is not edited in the tool.

## How it works (same pattern as the Reporting Hub)

### 1. Weekly Excel upload (spend and project list)
- Columns: job number, project name, workstream, % of budget spent. **[to confirm: client column, extract date, any other fields]**
- The file has a fixed structure. The upload checks the sheet and column names and rejects the file if they don't match, listing what was expected and what was found.
- A **preview of changes** compares the file with the live data (new projects, changed names, workstream moves, % spend changes, projects missing from the file). Nothing is saved until the uploader confirms.
- Each upload is a complete list and replaces the previous one. A project that is missing from a new file needs a decision before saving: it stays as it is, or it is marked "No longer in file". Nothing is deleted.
- Excel fields are read-only in the tool. Corrections are made in the source and arrive with the next upload.
- Parsing is deterministic code. The AI model never parses files.
- Who uploads: **[to confirm: Admin only, as in the Reporting Hub]**

### 2. PM selection
- Every project in the file appears automatically. There is no "Add project" step.
- PMs (and the Account Director for the workstream) tick **"Include in weekly report"** for the projects they want reported. Selected projects are pinned to the top of the list and can be filtered on.
- The selection carries over from week to week until someone changes it. **[to confirm]**

### 3. PM weekly inputs
For each selected project, the PM records:
- Status, RAG (set by the PM, never calculated) and % complete
- Weekly update / commentary
- Risks and issues (living logs; closing or archiving an item replaces deleting it). Counts include open and on-pause items only.
- **[to confirm: milestones, actions, decisions, changes]**

PMs submit their update. There is no approval step: a submission goes into the report straight away. PMs can edit and submit again during the week, and the latest submission is what the report shows.

### 4. Weekly periods, snapshots and trends
- Each week is a reporting period. At the end of the week the period **closes**, and the latest submitted values (including the uploaded % spend) are frozen as an immutable snapshot.
- Current-week views read live submitted data. Past weeks read their snapshots, so history never changes.
- Snapshots provide the trend data: week-on-week RAG, % spend over time, and risk and issue counts with their trend.
- Week close day: **[to confirm, e.g. Sunday]**

### 5. Reports and views
- **Project**: the project's health for the week, plus its trend.
- **Workstream**: selected projects with RAG mix, % spend, % complete, and risk and issue counts with trends.
- **Client**: workstream roll-up.
- Reports render as HTML. **[to confirm: export to PPTX or PDF needed?]**
- RAG roll-up rules for workstream and client: **[to confirm]**

## Data rules (carried over from the Reporting Hub)

1. Uploaded file fields are read-only in the tool.
2. Nothing is hard-deleted. "Delete" archives the item (archivedAt, archivedById), and queries exclude archived rows by default.
3. Every change to PM data is audited: who, when, entity, field, old value, new value. The audit write happens in the same transaction as the change.
4. Closed-week snapshots are never modified.
5. Excel is an input route, never the system of record. Every upload goes through validation, then a preview, then confirmation.
6. Derived values (counts, bands, trends, roll-ups) come from pure functions in src/lib/ that the server and the UI share, with unit tests.

## Access

- Roles: Admin, Account Director, Project Manager, Internal Viewer. **[to confirm]**
- Access is assigned at a level (client or workstream) and inherited downward. PM access is granted per project. A project can have more than one PM.
- Permission checks run inside every Server Action, in src/lib/permissions.ts. Hiding a button is a convenience, not security.

## Data model outline (to confirm in each build phase's Step 0)

- Client, Workstream — hierarchy
- User, RoleAssignment, ProjectManager (user ↔ project)
- SpendUpload (uploaded by, file, extract date, status, row counts) with staged rows and a change list
- Project — job number, name, workstream, includeInReport flag, removedFromFileAt
- ProjectSpend — % of budget spent per project per upload
- ReportingPeriod — week + state (open / closed)
- ProjectWeek — weekly PM inputs (status, RAG, % complete, update) with state (draft / submitted)
- RiskLogItem, IssueLogItem (and any other logs confirmed)
- WeekSnapshot — immutable JSON per project per period, written when the week closes
- AuditEvent

## Tech stack (same as the Reporting Hub and Project Brain)

TypeScript (strict), Next.js 16 App Router with Server Components and Server Actions, React 19, Tailwind v4, PostgreSQL on Neon, Prisma 7 with @prisma/adapter-pg, NextAuth v5 (credentials, JWT, kept SSO-upgradeable), zod v4, exceljs for Excel parsing, Vercel hosting, GitHub PRs (regular merges), Vitest + Testing Library.

- Use the Reporting Hub's tech-stack document (copy reporting-hub-tech-stack.md into this project) for versions, scaffold, config, folder structure and known gotchas. Follow it over your defaults.
- Styling: the WPP Enterprise Solutions | MAP design system (Navy #000050, Cream #FAFAF0, Orange #FF7800, WPP Sans, square corners, rounded pills only). RAG is never shown by colour alone and always appears with the word. WCAG AA.
- Server Actions return ActionResult<T>. Every input is validated with a zod schema shared by client and server, and errors are shown per field.
- AI (Anthropic API) is not in scope for v1 unless decided otherwise.
- **Separate infrastructure:** own GitHub repo, Vercel project, Neon database and NEXTAUTH_SECRET (and Anthropic API key if AI is added). Never point at the Reporting Hub's database.

## Ways of working

- Design screens first, build the front end on mock data, then wire up the database, upload, permissions and snapshots.
- Every build brief starts with **Step 0: investigate and report back**. Stop and flag anything that contradicts this overview, the decision log or the brief.
- Every feature ships with Vitest tests, and the full suite passes before a PR.
- Build and test with dummy data only until a data governance review is done.
- Keep progress.md (append-only) and agent.md (codebase summary) up to date.
- Record decisions as short entries: date, decision, reason, alternatives rejected.
- When a requirement is ambiguous, ask before designing around it.
- Prefer simple, maintainable designs a small team can run.
- Use UK English.

## Open questions

- Exact Excel columns, and whether there is one file for all clients or one per client
- Who uploads the file
- Which PM inputs beyond status, RAG, % complete, updates, risks and issues
- Whether the project selection carries over each week
- Week close day and handling of missed submissions
- RAG roll-up rules
- Export format (HTML only, PPTX or PDF)
- Roles and access matrix
- SSO (Microsoft Entra ID)
