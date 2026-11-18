# Brief 07 — Generate report (HTML and PowerPoint)

Paste this whole brief into Claude Code **once briefs 05, 05b and 06 (periods and snapshots) are merged.** The report's trends and closed weeks read the weekly snapshots from brief 06.

## Inputs
- `CLAUDE.md` and `docs/decision-log.md`: the 17 Nov 2026 entries on Generate report, report contents and order, 16:9 slides, multi-slide workstreams, pipeline value, time in pipeline, the client pipeline slide, and PowerPoint built in code. **Authoritative.**
- Mockups in `docs/design/mockups/` (see the README map): `ReportDialogClient`, `ReportDialogWorkstream`, `SlideClientSummary`, `SlidePipelineClient`, `SlideWorkstream` (prop `mode`), `SlideWorkstreamMike` (prop `page`), `SlidePipelineWorkstream` (prop `mode`), and the `ReportWorkstreamOnly*` wrappers. Match their layout, copy and order of sections; colours come from the tokens. Figures and names in them are samples.
- `src/lib/pipeline.ts` (brief 05b) for pipeline summaries and money formatting; `rollup.ts`, `logs.ts`, `week.ts` and the snapshot readers from brief 06.

## Step 0 — Investigate and report back (do not build yet)

1. **Dependencies**: confirm briefs 05, 05b and 06 are merged and snapshots exist. Pick the `pptxgenjs` version: latest stable, checked for advisories; confirm it runs in a Next.js route handler on Vercel (Node runtime) and whether it needs `serverExternalPackages`.
2. **Report model**: the types you'll add (`src/types/report.ts`) and the pure builder (`src/lib/report.ts`) — see "Report model" below — and how they reuse existing view functions rather than re-querying.
3. **Data for each week type**: how the builder gets an open week (live submitted values, last submitted values for projects not updated, drafts ignored) and a closed week (snapshots), and the 8-week trend series. What happens when fewer than 8 weeks of snapshots exist.
4. **Audit**: how a generation is recorded (does `AuditAction` need a new value such as `GENERATE`? If so the migration, for Paul's OK).
5. **Size**: the number of slides and generation time for TCCC and Northwind today.
6. **Questions and mismatches** with the decision log or the mockups.

Stop and wait for Paul's go-ahead.

## Build

### 1. Report model (`src/types/report.ts`, `src/lib/report.ts`, pure and unit-tested)
- `buildReport({ scope: { clientId } | { clientId, workstreamId }, week, asOf, data })` returns `{ meta, slides }`, where `meta` has the report name, client, workstream (if any), week label, whether the week is open, the "as of" time (open week) and the spend upload's extract date.
- Slide kinds:
  - `clientSummary`: tiles (in report, updated, Delivery RAG mix, open risks and issues with change on last week, over budget and no spend figure), the Delivery RAG and risks-and-issues trends (8 weeks), and one row per reported workstream (updated x of y, Green / Amber / Red counts, risks and issues with change, over budget) plus a client total.
  - `clientPipeline`: the headline sentence, the four tiles and the by-workstream table from `pipelineSummary` (brief 05b). No opportunity lines.
  - `workstreamProjects`: workstream tiles, both trends and the project table (job no., project, status, Delivery RAG, % complete, % spend, risks, issues; "Not updated · last submitted ‹date›" under a project not updated) — first slide only has tiles and trends; `part` and `parts` for "page x of y".
  - `workstreamPipeline`: workstream pipeline tiles, every open opportunity (likelihood, opportunity, value, possible start, MAP owner, client owner, next steps, time in pipeline with added date) and the possible-starts timeline for the next 6 months (opportunities without a possible start are listed but not on the timeline).
- Order: client report = clientSummary, clientPipeline, then per reported workstream A–Z: its `workstreamProjects` slides, then its `workstreamPipeline` (left out when it has no open opportunities). Workstream report = that workstream's `workstreamProjects` slides, then its `workstreamPipeline`.
- Pagination: `paginateProjects(projects, { first: 6, rest: 12 })`. Projects sorted by job number. A workstream with no projects in the report still gets one slide saying so.
- Page numbers ("Page n of N") are assigned after the slides are assembled.
- Readiness for the dialog: `reportReadiness(scope, week)` → in report, submitted, draft saved, not started, by workstream, and the not-updated list (job no., project, workstream, last submitted, by whom, state).

### 2. Generate report dialog (client island)
- A "Generate report" button (primary) after "Issues report" in the client and workstream page headers, as in the mockups, for Admin and Updater.
- The dialog shows the readiness for the week chosen in the week picker. An open week says it is still open, when it closes, and that the report uses the latest submitted updates as of now. A closed week says its figures are final.
- The note about projects not updated, the format choice (HTML report / PowerPoint), and Cancel / Generate. The button reads "Generate PowerPoint" when PowerPoint is chosen.
- Accessible modal: `role="dialog"`, `aria-modal`, labelled by its heading, focus moves in and is trapped, Escape and Cancel close it and return focus to the button.
- Generate: HTML opens the report page in a new tab. PowerPoint starts the download (an ordinary link to the .pptx route), with a status message in a live region.

### 3. HTML report pages
- Routes: `/clients/[clientId]/report?week=` and `/clients/[clientId]/workstreams/[workstreamId]/report?week=`. Server Components, outside the app shell (no site header), each slide a fixed 1280×720 `<section>` with an `<h1>`/`<h2>`, stacked on a neutral background, scaled to fit narrow windows.
- A small toolbar (Download PowerPoint, Print) that is hidden when printing. Print CSS: `@page { size: 13.333in 7.5in; margin: 0 }` with a page break after each slide, so Print → Save as PDF gives one slide per page.
- Tables with real headers; every bar or chart has a text alternative (as in the mockups).

### 4. PowerPoint (`src/services/documents/report-pptx.ts`, server only)
- Renders the same report model with `pptxgenjs`: `LAYOUT_WIDE` (13.333 × 7.5 in); position everything from the 1280×720 design at 96 px per inch.
- Native text boxes, tables and shapes (bars and stacked bars as rectangles; no images of the HTML). Arial throughout (WPP Sans licence unconfirmed). Same colours as the tokens. Each slide gets a title for accessibility, and charts get alt text.
- Route handler: `GET /clients/[clientId]/report.pptx?week=&workstream=` → attachment named `‹Client› weekly report 2026-W47.pptx` or `‹Client› ‹Workstream› report 2026-W47.pptx`. Node runtime.

### 5. Security and audit
- Every route (HTML pages and the .pptx handler) calls `requireViewer()` and the permission check; a hidden workstream or an unknown client returns Not found; Updaters and Admins both allowed.
- Each generation writes an audit event (who, client, workstream if any, week, format). Nothing else is stored.

## Tests
- `report.ts`: slide order for client and workstream reports; pipeline slide left out with no opportunities; pagination (0, 6, 7, 18, 19 projects → 1, 1, 2, 2, 3 slides) and "page x of y" text; page numbering; open week uses last submitted values with "Not updated" and ignores drafts; closed week reads snapshots; trends with fewer than 8 weeks.
- `reportReadiness`: counts and the not-updated list.
- Dialog component: focus, Escape, format switch changes the button label, Generate targets.
- `report-pptx.ts`: generates a file for a sample report; unzip it (jszip, already a pptxgenjs dependency) and check the slide count and key text (titles, "page 1 of 2", totals).
- Routes: signed-out redirected; hidden workstream not found; audit written.

## Out of scope
Storing reports, emailing or scheduling them, client-branded templates, a weighted pipeline value, PDF other than the browser's Print.

## Acceptance
- From the TCCC and Northwind client pages and any reported workstream page, the dialog shows the right readiness and generates both formats; the .pptx opens in PowerPoint with editable text and tables, one slide per mockup slide, and page numbers that match the HTML.
- A workstream with more than 6 projects shows "page x of y" on each of its slides.
- Past weeks (`?week=`) generate from snapshots.
- Lint, typecheck, tests and build pass; `progress.md` and `agent.md` updated; PR (regular merge) listing screens, deviations and follow-ups.
