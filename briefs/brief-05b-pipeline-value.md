# Brief 05b — Pipeline value and time in pipeline

Paste this whole brief into Claude Code **once brief 05 (weekly inputs, including saving the pipeline) is merged.**

## Before you start (Paul)

1. Brief 05 is merged into `main` and the site saves pipeline changes.
2. The updated designs are in `docs/design/mockups-update-17nov/` (added from Claude Design on 17 Nov 2026). Step 1 below moves them into `docs/design/mockups/`.

## Goal

Every pipeline opportunity carries an **estimated value** and the **date it was added to the pipeline**, so the site (and, in brief 07, the report) can show the size of the prize and how long each opportunity has been waiting. Values and time in pipeline appear on the workstream page, the client page and Admin home. Decisions for this brief and brief 07 are recorded in the docs first.

## Step 0 — Investigate and report back (do not build yet)

Read `CLAUDE.md`, `docs/decision-log.md`, this brief (including the appendix) and the new mockups in `docs/design/mockups-update-17nov/` (especially `SlidePipelineClient.dc.html` and `SlidePipelineWorkstream.dc.html`). The small changes to the workstream page, client page and Admin home are described in Build §4 (they are on the Claude Design canvas, not in the folder). Then report:

1. **Schema and migration**: the exact change to `PipelineOpportunity`, the migration SQL (generated offline with `prisma migrate diff`, then hand-edited for the backfill described below), and how many rows it touches on the live database.
2. **Where pipeline figures are computed and shown today** (`src/lib/rollup.ts`, `src/lib/views.ts`, `PipelineSection`, client cards, Admin home) and what changes in each.
3. **Sample data**: how you'll give Northwind's sample opportunities values and added dates (TCCC has no opportunities; invent nothing for it).
4. **Anything in this brief that contradicts `CLAUDE.md`, the decision log or what brief 05 built.**

Stop and wait for Paul's go-ahead.

## Build

### 1. Docs first
- Move the files from `docs/design/mockups-update-17nov/` into `docs/design/mockups/` (they are all new files; the existing ones stay) and add the new screens to the README's file → screen → route map (see the appendix, "New mockups").
- Append the decisions in the appendix to `docs/decision-log.md`, and make the `CLAUDE.md` changes listed there.

### 2. Data
- `PipelineOpportunity` gains:
  - `estimatedValue Int?` — whole US dollars. Required when adding or editing (zod); null only for opportunities saved before this change, shown as "Not set".
  - `addedOn DateTime @db.Date` — the date the opportunity entered the pipeline. **Not null.**
- Migration: `prisma migrate diff` will add `addedOn` as NOT NULL without a value, which fails on existing rows. Hand-edit it: add the column as nullable, backfill `addedOn` from `createdAt` converted to the Europe/London date, then set NOT NULL. Comment the steps in the SQL. **Ask Paul before `npm run db:migrate`.**
- Sample data: Northwind opportunities get invented values and added dates spread between 10 and 200 days ago (a one-off script in `scripts/`, run after asking Paul, or an idempotent seed update; say which in Step 0). TCCC: nothing.

### 3. Rules (`src/lib/pipeline.ts`, pure, unit-tested)
- `daysInPipeline(addedOn, asOf)`: whole days, Europe/London dates. For a closed week, `asOf` is that week's Friday.
- `isLongRunning(days)`: more than 90 days.
- `pipelineSummary(opportunities, asOf)` for a workstream or a client: count, total value, value and count by likelihood, average and oldest days in pipeline, over-90-days count and value, "could start in the next 3 months" count and value (possible start on or before `asOf` + 3 calendar months; no possible start = not counted), and the number with no value ("not valued"). Opportunities without a value count everywhere except the value totals.
- Money formatting (one helper, used everywhere):
  - tables and forms: full figure, `$450,000`
  - tiles and slides: compact, `$450k`, `$1.98m` (millions to two decimals with trailing zeros trimmed: `$1.5m`, `$2m`), `$950` under a thousand
  - no value: "Not set"
- Extend `rollup.ts` so workstream and client tiles carry the pipeline value (and over-90-days count) alongside the existing counts.

### 4. Screens (as on the Claude Design canvas, 17 Nov)
- **Workstream page › Pipeline**:
  - summary line: "3 opportunities worth $910,000 · 1 High · 1 Medium · 1 Low" (plus "· 1 not valued" when any)
  - table columns: Likelihood, Opportunity, **Value (USD)**, Possible start, **In pipeline** ("57 days" with "added 23 Sep 2026" underneath; over 90 days in bold `#A03A00` with screen-reader text "over 90 days"), MAP owner, Client owner, Next steps, actions
  - add/edit form: **Estimated value (USD)** (required, whole dollars, commas allowed, 1 to 100,000,000) and **Added to pipeline** (date, defaults to today, can be backdated, not in the future). Field-level errors as elsewhere.
- **Client page**: the Pipeline tile shows the value ("$1.98m") with "10 opportunities · 3 High · 4 over 90 days"; each workstream card's Pipeline figure shows its value with "4 opps · 2 High".
- **Admin home**: each client card gets a Pipeline figure (value, "10 opportunities · 3 High").
- Past weeks: until brief 06's snapshots exist, past weeks show the current pipeline (known limitation, already noted in brief 05).

### 5. Saving and audit
- The pipeline actions from brief 05 accept and validate the two new fields with the same zod schema as the form; every change is audited field by field (`estimatedValue`, `addedOn`) in the same transaction, with the "changed since you opened it" check unchanged.

### 6. For brief 06 (note in `progress.md`)
- The weekly pipeline snapshot must include each open opportunity's `estimatedValue` and `addedOn`, so closed weeks and the report's trends show value and time in pipeline as they were.

## Tests
- `pipeline.ts`: days across GMT/BST changes, the 90-day boundary (90 = not over, 91 = over), summaries with and without values, the 3-month window (month ends, leap year), money formatting (including `$1.98m`, `$1.5m`, `$2m`, `$950`, Not set).
- zod: value required, whole dollars, commas accepted, limits; added date not in the future.
- Components: the pipeline table shows value and time in pipeline; the form shows field errors for value and date.
- Actions: value and added date saved and audited; Updater and Admin allowed; closed-week rules unchanged.

## Out of scope
Generate report (brief 07), a weighted pipeline value, currencies other than USD, snapshots (brief 06).

## Acceptance
- Migration applied (after Paul's OK) with every existing opportunity given an added date; no data lost.
- Value and time in pipeline show on the workstream page, client page and Admin home, matching the mockups.
- Lint, typecheck, tests and build pass; `progress.md` and `agent.md` updated.
- PR (regular merge) listing what changed, any deviations and the note for brief 06.

---

## Appendix — decisions and doc changes (17 Nov 2026)

### Decisions to append to `docs/decision-log.md`

**17 Nov 2026 — Generate report from the client and workstream pages**
Client and workstream landing pages get a "Generate report" button for Admins and Updaters. It opens a confirm dialog: the week (the one chosen in the week picker), whether it is open or closed, how many projects in the weekly report are updated (submitted / draft saved / not started), a by-workstream table on the client version, and the list of projects not updated with when they were last submitted. It notes that those projects appear with their last submitted values marked "Not updated", and that drafts are never used. The user picks HTML or PowerPoint (.pptx) and generates, or cancels. Supersedes "Reports as HTML layouts (design to follow)" (16 Nov) and its rejection of PPTX. Reason: one click from where people work, with a check on completeness first. Rejected: a separate reports page; generating without a check.

**17 Nov 2026 — Report contents and order**
Client report: (1) client summary, (2) client pipeline summary, then for each reported workstream (A–Z, as on the site) its project slide(s) followed by its pipeline slide. Workstream report: that workstream's project slide(s) and pipeline slide. A workstream with no open opportunities has no pipeline slide. Only projects in the weekly report appear. Trends cover 8 weeks: up to 7 closed weeks from snapshots plus the chosen week (live if open). Reason: summary first, details per workstream. Rejected: one slide per project.

**17 Nov 2026 — Report slides are 16:9, 1280×720**
Every slide is 1280×720 px, PowerPoint's default 16:9 (13.333 × 7.5 in), so the HTML and PowerPoint versions share one layout. Each slide has the navy header (report name, week, INTERNAL), a footer "Internal: not for client distribution" and "Page n of N". Delivery RAG always as word + meaning; no text under 12 px (9 pt). Reason: one design for both formats. Rejected: A4 pages.

**17 Nov 2026 — Workstreams that need more than one slide**
A workstream's first slide holds its summary tiles, trends and up to 6 projects. More projects continue on extra slides (table only, up to 12 projects each). Every slide of such a workstream shows "‹Workstream› · page x of y" next to the title; the table is headed "Projects 1–6 of 14", the first slide ends "Continued on the next slide: projects 7–14 of 14 →", and the last ends "End of ‹Workstream›'s projects". Reason: readers can tell a workstream continues. Rejected: shrinking text to fit.

**17 Nov 2026 — Pipeline value**
Each opportunity has an estimated value, in whole US dollars, required when adding or editing. It is shown on the workstream pipeline, the client page, Admin home and the report, with totals and splits by likelihood. Opportunities saved before this change show "Not set" until edited. Currency is USD for every client (to confirm). No weighted value in v1. Reason: show the size of the prize. Rejected: a weighted value (High 75%, Medium 50%, Low 25%) until Paul confirms the weights; a currency per client.

**17 Nov 2026 — Time in pipeline**
Each opportunity has an "Added to pipeline" date: today by default, editable so opportunities discussed before the tool can be backdated, never in the future. Time in pipeline = days from that date to today (to the week's Friday for a closed week). Over 90 days is flagged in bold and in words for screen readers. Averages and the oldest are shown per workstream and client. Existing opportunities take their creation date. Reason: shows opportunities that are stalling. Rejected: using the creation date only (can't be backdated).

**17 Nov 2026 — Client pipeline slide shows summaries only**
The client report's pipeline slide has no opportunity lines: a headline ("$1.98m in the TCCC pipeline across 10 opportunities, with $1.07m rated High"), tiles (pipeline value with change on last week, value by likelihood, value that could start in the next 3 months, value in the pipeline over 90 days with the average time), and a table by workstream (value, value by likelihood bar, opportunities, average time in pipeline, over 90 days, next possible start) with a client total. Each opportunity is listed on its workstream's pipeline slide, with likelihood, opportunity, value, possible start, owners, next steps and time in pipeline, plus a timeline of possible starts for the next 6 months. Reason: the client view is for the headline; detail lives with the workstream. Rejected: listing every opportunity on the client slide.

**17 Nov 2026 — PowerPoint built in code, not from screenshots**
The .pptx is generated on the server with `pptxgenjs` from the same report data as the HTML: native text, tables and shapes (bars drawn as shapes), so it can be edited in PowerPoint. Arial is used in the .pptx until the WPP Sans licence is confirmed. Reports are generated on demand and not stored; each generation is recorded in the change history (who, scope, week, format). Reason: editable, consistent, no browser on the server. Rejected: screenshots of the HTML; a headless browser; storing every report.

### Changes to `CLAUDE.md`
- §1: add "From the client or workstream page, Admins and Updaters can generate the weekly report as 16:9 slides: an HTML page or a PowerPoint (.pptx) download."
- §4: add "Install `pptxgenjs` in brief 07 (PowerPoint report); check its version for advisories in Step 0."
- §6: add a row "Generate report (HTML or PowerPoint) for a client or workstream | ✓ | ✓".
- §7 **Pipeline**: "likelihood (High / Medium / Low), opportunity, estimated value (whole US dollars, required; 'Not set' for older ones), possible start, added to pipeline (date, default today, can be backdated, not future), MAP owner, client owner, next steps. Time in pipeline = days since added; over 90 days flagged. Sorted by likelihood, then soonest start. Archive, never delete."
- §7 **Week close**: the pipeline snapshot includes each opportunity's estimated value and added date.
- §7: add a **Reports** paragraph summarising the decisions above (contents and order, 1280×720 slides, 6 then 12 projects per slide with "page x of y", HTML and .pptx from one report model, not stored, audited).
- §8: `PipelineOpportunity` — add `estimatedValue (Int, nullable for old rows)`, `addedOn (Date)`.
- §9: add rows:
  - Generate report dialog | on client and workstream pages | all | `ReportDialogClient.dc.html`, `ReportDialogWorkstream.dc.html`
  - Client report (HTML) | `/clients/[clientId]/report?week=` | all | `SlideClientSummary`, `SlidePipelineClient`, `SlideWorkstream`, `SlideWorkstreamMike`, `SlidePipelineWorkstream`
  - Workstream report (HTML) | `/clients/[clientId]/workstreams/[workstreamId]/report?week=` | all | `ReportWorkstreamOnly`, `ReportWorkstreamOnlyPipeline`
  - Report (PowerPoint) | `/clients/[clientId]/report.pptx?week=&workstream=` | all | as above
- §10: add "5b. Pipeline value and time in pipeline (brief 05b)" and change 7 to "Reports and logs: aggregations, trends, past weeks; Generate report (HTML and PowerPoint) — brief 07."

### New mockups (for the README map)

| File | Screen |
|---|---|
| `ReportDialogClient.dc.html` | Generate report — confirm dialog on the client page |
| `ReportDialogWorkstream.dc.html` | Generate report — confirm dialog on the workstream page |
| `SlideClientSummary.dc.html` | Client report, slide 1: client summary |
| `SlidePipelineClient.dc.html` | Client report, slide 2: pipeline summary by workstream |
| `SlideWorkstream.dc.html` | Workstream slide that fits on one slide (prop `mode`: client report / workstream report) |
| `SlideWorkstreamMike.dc.html` | Workstream slide needing two slides (prop `page`: 1 or 2) |
| `SlideWorkstreamMikeP2.dc.html` | Page 2 of the above (wrapper) |
| `SlidePipelineWorkstream.dc.html` | Workstream pipeline slide (prop `mode`) |
| `ReportWorkstreamOnly.dc.html`, `ReportWorkstreamOnlyPipeline.dc.html` | Workstream report pages 1 and 2 (wrappers) |

The figures and names in these mockups are samples; the client and workstream names are real (never copy them into data).
