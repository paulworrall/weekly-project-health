# Brief 01 — Front end on mock data

Paste this whole brief into Claude Code once brief 00 is merged.

## Goal

Every designed screen built as real Next.js pages and components, driven by typed **synthetic** mock data, with all the agreed interactions working in local state. The derived figures come from pure, tested functions in `src/lib/`; briefs 02–07 will reuse them unchanged when real data replaces the mocks. Nothing persists yet, and there is no real auth.

## Inputs

- `CLAUDE.md`: §3 terms, §6 roles, §7 domain rules, §9 routes.
- `docs/decision-log.md`: authoritative.
- `docs/design/mockups/*.dc.html` (see the README there): each file's markup gives the layout, styles and copy, and its inline script gives the sample data shape and behaviour. They use a small template syntax and won't render on their own. Match their layout, copy, order of sections and behaviour, and use your own invented names in the mocks (see "Mock data"). Colours come from the tokens set up in brief 00, not from the hex values in the mockups.

## Step 0 — Investigate and report back (do not build yet)

Read the inputs and every mockup. Then report:

1. **Screens and routes**: your route and component plan for each screen in `CLAUDE.md` §9. Name the shared components, for example ProjectList, WeeklyUpdateForm, RiskIssueTable, LogSummary, PipelineTable, UploadPreview and StatTile.
2. **View-model types**: the types you will put in `src/types/` and how they map to the data model in `CLAUDE.md` §8.
3. **Pure functions**: the list for `src/lib/`, with their signatures (see "Derived values").
4. **Mismatches**: anything in a mockup that disagrees with the decision log. Examples to check:
   - the client page must not have "Your updates this week"
   - Admin home's outstanding list shows "Last submitted by", not "Updaters"
   - projects missing from the file stay in the report
5. **Questions**: anything you would otherwise have to guess.

Stop and wait for Paul's go-ahead.

## Build

### Mock data (`src/mocks/`)
- **Invented names only.** One client, e.g. "Northwind Drinks".
- **Workstreams:** 13, of which 5 are reported, with invented names such as "Alpha EU" and "Beta Global". Include an `UNMAPPED` workstream (hidden).
- **Projects:** about 180 in one reported workstream, so pagination is exercised, and a realistic mix elsewhere. Job numbers are 6 digits, stored as text.
- **% spend:** a mix of values, including over 100%, plus "Add budget" and "No timesheet data".
- **Weeks:** 12 closed weeks of snapshot-shaped history plus the current open week (Week 47, 16–20 Nov 2026).
- **Risks and issues:** per-client refs (R-001…, I-001…), with every status, every level, some overdue and some closed.
- **Pipeline:** 0–4 opportunities per workstream.
- **Upload history:** one staged upload with a change list (new, renamed, moved, spend changed, missing), plus confirmed, rejected and cancelled history rows.
- **Users:** 1 Admin and about 12 Updaters.

Expose the data through a small `src/mocks/repository.ts`, with functions like `getClientOverview(clientId, week)`, so pages never import fixtures directly. Brief 02 swaps this repository for Prisma queries.

### Derived values (`src/lib/`, pure, each with unit tests in `tests/lib/`)
- `rag.ts`: labels, counts, shares for the RAG bar, and an accessible description.
- `spend.ts`: format a fraction as `112.0%`; `Over budget`; status labels; bands (under 75%, 75–100%, over 100%); counts of projects with no spend figure.
- `delta.ts`: `▲ +2` / `▼ −1` / `No change`, plus screen-reader text ("up 2 on last week").
- `ageing.ts`: age in days; bands (under 14, 14–30, over 30); overdue and "Overdue by N days"; due by the week's close.
- `week.ts`:
  - the ISO week for a date, in Europe/London
  - labels like "Week 47 · 16–20 Nov 2026"
  - `closesAt` = Friday 23:59 Europe/London, correct across the GMT and BST changes
  - parse and format `?week=2026-W46`
- `pagination.ts`: range text ("Showing 1–25 of 181") and page items with gaps (1 2 … 8).
- `sorting.ts`:
  - the project list, with included projects pinned first, then by job number
  - the pipeline, by likelihood then soonest start
  - the logs, by level then oldest first
- `logs.ts`: the log summary figures (open, on pause, by level, average age, oldest, raised and closed this week and month to date, ageing bands, overdue), the week-on-week series and the month-on-month table.
- `rollup.ts`: workstream and client tile figures (in report, updates submitted, RAG mix, risks and issues with deltas, over budget, pipeline counts).

### Screens

Build them in this order. Each is Server Components plus small client islands.

1. **Sign in** (`/login`):
   - fields: email, password with Show/Hide, "Keep me signed in"
   - field-level zod errors, and the "not recognised / attempts left / locked" message states
   - "Ask the Admin" help
   - for now, a dev-only role switch (`?as=admin|updater`) stands in for auth and sends Admin to `/admin` and Updater to the client page
2. **Admin home** (`/admin`):
   - updates outstanding (project, workstream, last submitted by, last submitted, Draft saved / Not started)
   - client card
   - "This week" timeline
   - latest upload
   - users and roles counts
   - log links
3. **Client landing** (`/clients/[clientId]`):
   - client summary tiles
   - a workstream card per reported workstream
   - the Needs attention table
   - the week picker
4. **Workstream landing**:
   - weekly summary tiles
   - Pipeline: add/edit is a form in local state; archive works
   - the project list:
     - include tick, with included projects pinned and highlighted
     - filters: search, Show segmented control, PM, Delivery RAG, This week, % spend
     - Clear filters
     - pagination at 25 / 50 / 100 rows
     - any filter change resets to page 1
5. **Project page**:
   - submission banner states
   - status, % complete (dropdown 0–100% in steps of 10) and the Complete vs spend bars on one row
   - Delivery RAG pill buttons on their own row
   - weekly update text
   - Submit and Save draft
   - the % spend panel with its 8-week chart, and the 8-week Delivery RAG history
   - the risks and issues tables, with inline add, edit (including the due date) and delete (archive) in local state
6. **Risk log / Issue log**:
   - tabs between the two logs, and a workstream filter
   - summary tiles, including Overdue
   - week-on-week chart with raised and closed rows
   - month-on-month table
   - by-workstream table
   - the listing, with search, level, status and age/overdue filters and "Show all"
7. **Spend uploads**:
   - latest upload tiles
   - the upload form (client, extract date, file input and the expected structure; no parsing yet)
   - the preview, tabbed by change type, with Keep / Mark decisions on missing projects
   - Confirm disabled until every missing project has a decision
   - history with status pills and reasons
   - workstream Reported toggles
8. **Admin tables** (Users, Clients, Change history): simple, styled read-only tables from mock data. Their actions arrive in later briefs.

**Past weeks**: `?week=` switches every page to snapshot data. Inputs become read-only, with a "Week 46 is closed" note.

### Accessibility (required)
- **RAG and levels**: Delivery RAG is always colour word + meaning, and severity and priority are always shown as words.
- **Charts and bars**: every chart or bar has an accessible text alternative.
- **Controls**: real buttons, links and labelled inputs; `aria-pressed` on toggles; `aria-current` on the current page; `role="tablist"` / `tab` for the log tabs.
- **Status messages**: in live regions.
- **Focus and contrast**: visible focus, WCAG AA contrast, and 44px minimum targets.
- **Small screens**: wide tables scroll in their own box, and at phone width toolbars wrap and menus stack.

### Tests (Vitest, in `tests/`)
- **Unit tests** for every function in `src/lib/`, including the BST and GMT edge cases in `week.ts`.
- **Component tests** (jsdom):
  - the project list keeps included projects on page 1 and resets the page when a filter changes
  - the weekly update form validates % complete and shows field errors
  - the risk and issue table's add, edit and archive work
  - Upload preview's Confirm is enabled only when every missing project has a decision
  - the login form shows its field errors
  - the RAG selector shows labels with meanings

## Out of scope

Database, real auth, upload parsing, persistence, the HTML report layouts (still to be designed), cron.

## Acceptance

- Each screen matches its mockup's layout, copy and behaviour, apart from the decision-log corrections reported in Step 0.
- No real client, workstream or person names anywhere in the code or mocks.
- All pages work with `?week=` for a closed week (read-only).
- Lint, typecheck, tests and build all pass, and the preview deployment works.
- `progress.md` and `agent.md` are updated.
- Open a PR (regular merge). The description lists the screens, the components, any deviations and the follow-ups for brief 02.
