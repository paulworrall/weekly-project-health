# Brief 07 — Step 0 report: Generate report (HTML and PowerPoint)

18 Nov 2026. Read: `CLAUDE.md`, `docs/decision-log.md` (the 17 Nov report decisions), `briefs/brief-07-generate-report.md`, and all ten report mockups in `docs/design/mockups/`.

## 1. Dependencies

- **Briefs 05, 05b and 06 are merged** (pull requests #7, #8 and #9).
- **Snapshots:** they exist for weeks 35–46 (Northwind sample, converted once). The first real close is week 47, early on Sat 21 Nov, and it will include pipeline values.
- **`pptxgenjs` 4.0.1** is the latest stable release (June 2025).
  - `npm audit` reports two high advisories in one of its dependencies, `image-size` 1.2.1 (an infinite loop when *reading* certain image formats). pptxgenjs never actually loads that package: its image-sizing code asks for a different module name. In any case, our report adds no images.
  - To keep the audit clean anyway, I'll pin `image-size` to the patched 2.1.0 with an npm `overrides` entry. pptxgenjs's other dependency, `jszip`, has no advisories.
- **Vercel:** it runs in a Node route handler. I'll list it under `serverExternalPackages` in `next.config.ts` so Next doesn't try to bundle its optional Node-only `require`s, and I'll confirm with a real build.

## 2. Report model

- `src/types/report.ts`: `ReportMeta` and one type per slide kind (`clientSummary`, `clientPipeline`, `workstreamProjects`, `workstreamPipeline`).
- `src/lib/report.ts` (pure, tested): `buildReport`, `paginateProjects` (6 on the first slide, then 12 per slide), `reportReadiness` and the trend series.
- **No new queries.** The builder takes the `Views` object the pages already use (`getRepository()`). It calls:
  - `getWorkstreamOverview(…, week)` for the project rows and tiles;
  - `getClientOverview` for the client totals;
  - the same functions for each earlier week, to build the trends.

  So the report shows exactly what the site shows for that week.

## 3. Data for each kind of week

- **Open week:**
  - the latest submitted values;
  - for a project with no submission this week, its last submitted values, marked "Not updated · last submitted ‹date›" (with "(draft saved)" when a draft exists, as in the mockup);
  - drafts are never used.

  This is the site's existing logic.
- **Closed week:** that week's snapshots, through the same views (built in brief 06).
- **Trends:** up to 8 weeks, the chosen week plus up to 7 before it. Each closed week reads its snapshot; the chosen week is live if it's open (labelled "W47 live"). With fewer than 8 weeks of history, the charts show the weeks that exist, with no empty bars. Week 1 of a new client would show a single bar.

## 4. Audit

The change history's action list has only Create, Update, Archive and Restore. A generation is none of these, so I'd add **Generate**. That needs a one-line database change (adding a value to a list, with nothing touched or lost). I'll ask you before applying it.

Each generation records who, client, workstream (if any), week and format (HTML or PowerPoint).

## 5. Size today

| Report | Slides |
|---|---|
| **Northwind**, client report | **12**: summary, pipeline, then per workstream its projects and pipeline. The workstream with 7 projects in the report has 2 project slides; the one with no opportunities has no pipeline slide. |
| **TCCC**, client report | **7**: summary, pipeline, and 5 workstream slides. Only 1 project is in TCCC's weekly report so far, so 4 workstream slides will say "No projects in the weekly report yet". TCCC has no opportunities, so there are no workstream pipeline slides, and its pipeline summary slide will say so. |

Generation is in memory from data the page already loads. I expect it to take well under 2 seconds on Vercel, and I'll measure it.

## 6. Mismatches and how I'd settle them

1. **First workstream slide:** the brief says it "only has tiles and trends". The decision log and mockups put **up to 6 projects** on it, with tiles and trends. I'll follow the log and mockups.
2. **Client summary tiles:** the mockups show 7 tiles, with Open risks and Open issues as two separate tiles. The risk and issue trend is a set of **clustered bars**, not a line. I'll follow the mockups.
3. **Workstream pipeline slide:** the brief doesn't list its tiles. The mockup has five: value, value by likelihood, average time, over 90 days, possible start within 3 months. I'll follow the mockup.
4. **"Page x of y" and end text:** the mockups show an orange pill "‹Workstream› · page 1 of 2", a second slide titled "‹Workstream› (continued)", and "End of ‹Workstream›'s projects · pipeline on the next slide". I'll drop "· pipeline on the next slide" when no pipeline slide follows.
5. **Pipeline value "change on last week":** this compares with the previous closed week's snapshot. When last week has no value to compare with, I'll say "no figure for last week" instead of a misleading "no change". That will happen for week 47, because the sample weeks predate 05b.
6. **Possible-starts timeline:** the 6 months starting the month after the report date. For week 47 that's Dec 2026 to May 2027, as in the mockup. Opportunities with no start, a past start or a later start are listed in the table but not on the timeline.
7. **"6 of 181 projects in the weekly report":** the second number is all the projects in that workstream from the spend file, as in the mockup.
8. **A closed week in the dialog:** neither mockup shows one, so I'll write it: "Week 46 has closed, so its figures are final. The report shows them as they were at the close."
9. **"Generate report" button:** it goes next to the existing "Issues report" link in the client and workstream page headers.
10. **Older weeks:** pages load the last 13 weeks of snapshots (brief 06). An 8-week report is always covered for the current week. A report for a week more than 5 weeks back would have trend weeks older than that worked out from live data. A follow-up can load exactly the weeks needed; this is not needed for the pilot.

## Questions for Paul

1. May I add **Generate** to the change history's actions (a one-line database change)?

## Answers

1. **Yes, add Generate** (Paul, 18 Nov). The migration is applied only after Paul's OK.

The mismatches in section 6 are settled as described (mockups and decision log win).
