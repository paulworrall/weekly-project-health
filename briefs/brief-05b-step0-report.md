# Brief 05b — Step 0 report: pipeline value and time in pipeline

18 Nov 2026. Read: `CLAUDE.md`, `docs/decision-log.md`, `briefs/brief-05b-pipeline-value.md` (with its appendix) and the mockups in `docs/design/mockups-update-17nov/`. The screen changes in Build §4 are on the Claude Design canvas, not in the folder, so I'll follow the brief's description of them.

## 1. Schema and migration

`PipelineOpportunity` gains two fields:

```prisma
/// Whole US dollars. Null only for opportunities saved before brief 05b ("Not set").
estimatedValue Int?
/// The date the opportunity entered the pipeline (can be backdated, never in the future).
addedOn        DateTime @db.Date
```

The migration is generated offline with `prisma migrate diff`, then hand-edited and commented. It runs in three steps:

1. Add `estimatedValue` (nullable) and `addedOn` (nullable for now).
2. Backfill `addedOn` from `createdAt` as a London date. `createdAt` is stored as UTC, so the SQL is `(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/London')::date`.
3. Make `addedOn` NOT NULL.

**Rows touched on the live database:** 11 opportunities, all Northwind sample data. They were added between 19 Sep and 6 Nov 2026 and none are archived. TCCC has none. Nothing is deleted or overwritten. I'll ask you before running `npm run db:migrate`.

## 2. Where pipeline figures are today, and what changes

| Where | Today | Change |
|---|---|---|
| `src/lib/rollup.ts` (`workstreamTiles`, `sumTiles`) | Count and High count | Add value, over-90-days count, and "not valued" count, using `pipelineSummary` from the new `src/lib/pipeline.ts`. |
| `src/lib/views.ts` (`pipelineFor`) | Live list, or the week's snapshot for a closed week | Unchanged. Time in pipeline is measured to the week's Friday for a closed week (`week.asOf`). |
| `src/types/schemas.ts` (`pipelineSchema`) | Likelihood, title, start, owners, next steps | Add `estimatedValue` (required; whole dollars; commas allowed; 1 to 100,000,000) and `addedOn` (date, not in the future). |
| `src/server/actions/weekly.ts` (`savePipelineAction`) | Saves and audits each field | Saves and audits the two new fields the same way. The "changed since you opened it" check is unchanged. |
| `PipelineSection` | Table and add/edit form | New summary line. Table gets **Value (USD)** and **In pipeline** columns (over 90 days in bold, with screen-reader text). Form gets **Estimated value (USD)** and **Added to pipeline**. |
| Client page (`clients/[clientId]/page.tsx`) | Pipeline tile shows "4 opportunities · 1 High" | Tile shows the value ("$1.98m"), with "10 opportunities · 3 High · 4 over 90 days" underneath. Each workstream card shows its value with "4 opps · 2 High". |
| Admin home (`admin/page.tsx`) | Client cards show risks and issues | Each client card gets a Pipeline figure (value, "10 opportunities · 3 High"). |
| Money | No helper | One `formatMoney` helper in `src/lib/pipeline.ts`: full (`$450,000`), compact (`$450k`, `$1.98m`, `$1.5m`, `$2m`, `$950`), and "Not set". |

## 3. Sample data

The seed can't change rows that already exist (it only adds missing ones), so:

- **Mock data** (`src/mocks/data.ts`): Northwind's sample opportunities get invented values ($25,000 to $900,000) and added dates spread between 10 and 200 days before the mock date. The tests and a fresh seed then have them too.
- **Live database:** a one-off script, `npm run pipeline:sample-values`, gives the same invented values and dates to Northwind's 11 live opportunities. It matches them by their fixed sample ids and only changes rows that still have no value. It shows what it would do first; `--apply` writes, and I'll ask you before running it. Each change is recorded in the change history.
- **TCCC:** nothing (it has no opportunities).

## 4. Things to flag

1. **Brief 06 is already built.** The brief was written before it, but the order doesn't cause a problem:
   - The pipeline snapshot already stores each opportunity in full, so once this migration is applied, each week's snapshot will automatically include the value and the added date. No change to brief 06's code is needed. I'll put the note for brief 06 in `progress.md` as "already covered".
   - The sample weeks 35–46 were recorded without these fields. Those weeks will show "Not set" for values and use the creation date as the added date. That seems right for sample history.
   - Week 47 closes early on Saturday. If 05b is merged by Friday evening, week 47's pipeline will be recorded with values. If not, it will show "Not set" too.
   - The brief's line "past weeks show the current pipeline (until brief 06)" no longer applies: past weeks already show their own pipeline.
2. **`CLAUDE.md` is out of date in one place.** §7 "Week close" still says "Snapshot per included project". The 17 Nov decision is every project in a Reported workstream. I'll fix it alongside the brief's other `CLAUDE.md` changes.
3. **USD for every client** is marked "to confirm" in the brief's own decision. I'll build USD only, as the brief says. The label "Value (USD)" makes the currency visible, so adding other currencies later wouldn't need a redesign.
4. **Older opportunities:** an opportunity with no value has to be given one the next time someone edits it, because the field is required. Archiving it doesn't need a value.
5. Nothing else contradicts `CLAUDE.md`, the decision log or brief 05.

## Questions for Paul

None blocking. Go-ahead to build?
