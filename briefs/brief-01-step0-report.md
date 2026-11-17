# Brief 01 — Step 0 report (17 Nov 2026)

Inputs read: `briefs/brief-01-frontend-mock-data.md`, all seven mockups in `docs/design/mockups/`, `CLAUDE.md`, `docs/decision-log.md`. Answers to the questions in §5 are recorded at the bottom once Paul has given them.

## 1. Screens, routes and components

All pages are Server Components that read from `src/mocks/repository.ts`; interaction lives in small client islands. Every page takes `?week=2026-W46` (closed week → snapshot data, inputs read-only, "Week 46 is closed" note). The dev role switch `?as=admin|updater` sets a cookie that stands in for the session until brief 03.

| Screen | Route | Main components |
|---|---|---|
| Sign in | `src/app/(auth)/login/page.tsx` | `LoginForm` (client), `LoginIntro` |
| Admin home | `src/app/(app)/admin/page.tsx` | `OutstandingUpdatesTable`, `ClientCard`, `WeekTimeline`, `LatestUploadPanel`, `UsersPanel`, `LogLinks` |
| Client landing | `src/app/(app)/clients/[clientId]/page.tsx` | `WeekPicker` (client), `StatTile`, `RagBar`, `WorkstreamCard`, `NeedsAttentionTable` |
| Workstream landing | `…/clients/[clientId]/workstreams/[workstreamId]/page.tsx` | `WorkstreamSummary`, `PipelineTable` + `PipelineForm` (client), `ProjectList` (client: `ProjectFilters`, `Pagination`) |
| Project | `src/app/(app)/projects/[projectId]/page.tsx` | `SubmissionBanner`, `WeeklyUpdateForm` (client: `RagSelector`, `CompleteVsSpend`), `SpendPanel` + `SpendTrendChart`, `RagHistory`, `RiskIssueTable` (client, used twice) |
| Risk log / Issue log | `…/clients/[clientId]/risks`, `…/issues` (one `LogPage`; the tabs switch route) | `LogTabs`, `LogSummary`, `WeekOnWeekChart`, `MonthOnMonthTable`, `ByWorkstreamTable`, `LogListing` (client) |
| Spend uploads | `src/app/(app)/admin/uploads/page.tsx` | `LatestUploadTiles`, `UploadForm` (client), `UploadPreview` (client: change-type tabs, Keep/Mark decisions, Confirm), `UploadHistoryTable`, `WorkstreamReportedTable` (client) |
| Users, Clients, Change history | `/admin/users`, `/admin/clients`, `/admin/history` | `SimpleTable` (read-only) |
| Change password | `/change-password` | `ChangePasswordForm` (visual only; works in brief 03) |

Shared: `AppHeader`, `Breadcrumb`, `PageHeader` (brief 00), `StatTile`, `RagBadge`, `RagBar` (stacked bar + text alternative), `LevelTag` (severity/priority as words), `StatusPill`, `DeltaText`, `SpendText`, `ClosedWeekNote`, `Pagination`, `EmptyState`.

## 2. View-model types (`src/types/`)

Domain enums (mirror CLAUDE.md §8): `Role`, `Rag`, `ProjectStatus` (In progress, On hold, Complete), `UpdateState` (Draft, Submitted), `RiskSeverity`, `IssuePriority`, `LogStatus` (Open, On pause, Closed), `Likelihood`, `SpendStatus` (VALUE, NO_BUDGET, NO_TIMESHEET), `UploadStatus`, `ChangeType` (NEW, CHANGED, MOVED, MISSING), `MissingDecision` (KEEP, MARK).

Records (one per §8 model; ids are strings, dates ISO): `User`, `Client`, `Workstream`, `Project`, `ProjectSpend`, `ReportingPeriod`, `ProjectWeek`, `RiskItem`, `IssueItem`, `PipelineOpportunity`, `SpendUpload`, `SpendUploadChange`, `ProjectWeekSnapshot`, `PipelineWeekSnapshot`, `LogWeekSnapshot`, `AuditEvent`.

Page view models (what the repository returns): `AdminHomeView`, `ClientOverview`, `WorkstreamOverview`, `ProjectRow`, `ProjectPageView`, `LogView`, `UploadsView`, `WeekRef` (`{ isoYear, isoWeek, closed }`).

zod schemas (shared client/server, used in brief 05 too): `weeklyUpdateSchema` (% complete integer 0–100, multiple of 10), `riskSchema`, `issueSchema`, `pipelineSchema`, `loginSchema`, `uploadFormSchema`.

## 3. Pure functions (`src/lib/`, each unit-tested)

- `rag.ts` (extend): `ragShares(counts) → { GREEN, AMBER, RED }` (percentages), `ragDescription(counts, subject?) → string`.
- `spend.ts`: `formatPercent(fraction) → "112.0%"`, `spendLabel(spend) → string`, `isOverBudget(spend)`, `spendBand(spend) → "under75" | "75to100" | "over100" | null`, `spendBandCounts(spends)`, `noSpendCounts(spends) → { noBudget, noTimesheet, total }`.
- `delta.ts`: `deltaText(now, prev) → "▲ +2" | "▼ −1" | "No change"`, `deltaSrText(now, prev, period) → "up 2 on last week"`.
- `ageing.ts`: `ageInDays(raised, today)`, `ageBand(days)`, `isOverdue(item, today)`, `overdueText(due, today) → "Overdue by 3 days"`, `dueByClose(item, closesAt)`.
- `week.ts`: `isoWeekOf(date) → WeekRef` (Europe/London), `weekRange(ref) → { monday, friday }`, `weekLabel(ref) → "Week 47 · 16–20 Nov 2026"`, `closesAt(ref) → Date` (Fri 23:59 London, as UTC), `parseWeekParam("2026-W46")`, `formatWeekParam(ref)`, `currentWeek(now)`.
- `pagination.ts`: `pageCount(total, size)`, `rangeText(page, size, total) → "Showing 1–25 of 181"`, `pageItems(page, pages) → (number | "gap")[]`.
- `sorting.ts`: `sortProjects(rows)` (included first, then job number), `sortPipeline(opps)` (likelihood, then soonest start), `sortLog(items)` (level, then oldest first).
- `filters.ts`: `filterProjects(rows, filters)`, `filterLog(items, filters)` (kept pure so the list tests can check them without rendering).
- `logs.ts`: `logSummary(items, today, period)`, `weekOnWeek(snapshots)`, `monthOnMonth(snapshots, items, today)`, `byWorkstream(items, prevCounts)`.
- `rollup.ts`: `workstreamTiles(projects, weeks, logs, pipeline)`, `clientTiles(workstreams)`, `needsAttention(projects)`, `outstandingUpdates(projects)`.

## 4. Mismatches between the mockups and the decision log / CLAUDE.md

Where they disagree, the decision log wins. These I'll just fix (no decision needed):

| Mockup | What it shows | What I'll build |
|---|---|---|
| Home | Outstanding list column "Updaters" | "Last submitted by" (decision 16 Nov) |
| Home, Client, Main, Project | Admin nav adds "Workstreams" and "Users and access"; brief 00 nav differs | Follow the mockups' nav. "Workstreams" opens the client page's workstream cards (there is no workstreams index route). "Users and access" goes to `/admin/users`. |
| Main | Pipeline note "Kept up to date by the Account Director" | "Any Updater can add, edit and archive" (decision: workstream pipeline) |
| Main | "View weekly report" link | Left out until the HTML report layouts are designed (out of scope) |
| Main | Link hover in bright orange `#FF7800` | Token `--eyebrow` `#B34F00` (AA) |
| All | RAG fills and bar colours (`#C9F2A6`, `#7FCB3F`…) | RAG tokens |
| Project | Selected RAG button uses an inset shadow | A thicker Navy border (no shadows rule) |
| Upload | Rejected status pill uses the RAG red fill | Warning tint `#FFE3C2` with the word "Rejected", so red keeps its RAG meaning |
| All | Real client, workstream and person names (incl. the Admin's name as uploader) | Invented names only (e.g. client "Northwind Drinks", workstreams "Alpha EU" etc.) |
| Login | "Try in Play" note and `admin` / `demo` passwords | Not built; the dev role switch replaces them |

Checked and consistent: the client page has no "Your updates this week"; missing projects stay in the report; Delivery RAG always shows word + meaning; % complete in 10% steps; per-client risk and issue IDs; counts include Open and On pause only.

## 5. Questions (need Paul)

1. **PM on project lists.** The workstream list (column + filter), the Needs attention table and the project page header show each project's PM ("PMs MR, AK"). The decision log says there is no assignment of people to projects, only "Last submitted by".
2. **Account Director on workstreams.** Workstream cards and the workstream header show "Account Director …". The data model has no such field.
3. **Missing-from-file decision.** The decision log says the default is "Keep as is"; the mockup and brief start with no choice and keep Confirm disabled until each missing project has one.
4. **"Keep me signed in" on the sign-in page.** Sessions last 8 hours by decision; the mockup adds a tick box.

## 6. Plan notes

- Work on a branch (`brief-01-frontend`) and open a pull request, as the decision log says from brief 01 on.
- The dev role switch also works on the Vercel site. All data on it is invented, so nothing real is exposed; it's removed when sign-in arrives in brief 03.
- Week-on-week chart: 12 bars (11 closed weeks + the open week), as in the mockup.

## Answers (Paul, 17 Nov 2026)

1. **PM → "Last submitted by".** The project list shows a "Last submitted by" column and filter instead of PM; the Needs attention table and the project page header do the same. No PM data.
2. **Account Director: Admin types it in.** New optional free-text `accountDirector` on Workstream, edited by the Admin in Spend uploads › Workstreams. Shown on workstream cards and the workstream header when set.
3. **Missing from file: make the Admin choose.** No decision pre-selected; Confirm stays disabled until every missing project has Keep or Mark. (Replaces the decision log's "default Keep as is".)
4. **"Keep me signed in": keep the tick box.** Ticked: session cookie persists for 8 hours. Unticked: browser-session cookie, still capped at 8 hours.

Waiting for Paul's go-ahead to build.
