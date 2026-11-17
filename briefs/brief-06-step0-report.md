# Brief 06 — Step 0 report: automatic week close and snapshots

17 Nov 2026. There is no brief 06 file, so the scope below comes from CLAUDE.md §7 (Week close) and the decision log (16 Nov: the week closes on Friday; missed submissions carry forward; the close is automatic; the spend file is used as at the latest confirmed upload; the include tick carries over).

## What is there today

- **Database**: the snapshot tables already exist (`ProjectWeekSnapshot`, `PipelineWeekSnapshot`, `LogWeekSnapshot`, one JSON record each, unique per week). They are empty. **No migration is needed** for this brief.
- **Weeks**: 13 reporting weeks in the database. Weeks 35–46 are sample weeks, already marked Closed by the seed. Week 47 is Open and closes Fri 20 Nov 23:59 London time. The stored close times are correct for both BST and GMT.
- **Past weeks on the site** are worked out on the fly from live data:
  - weekly entries for that week (the seed marks 28 of them "Not updated");
  - risks and issues "as they were" on that Friday;
  - **today's** pipeline (a known gap).
- **Saving** is already refused once Friday 23:59 has passed (brief 05), even before any close job runs. So the close job mostly *records*; it doesn't need to lock anything.
- **No cron yet**: there is no `vercel.json` and no close route. `CRON_SECRET` is already listed in `.env.local.example`.

## Plan

1. **Close job** (`src/server/close-week.ts`). For each open week whose close time has passed, in one transaction:
   - write the snapshots;
   - mark the week Closed;
   - create the next week as Open;
   - write an audit row.
   
   Running it twice does nothing the second time. If a run is missed, the next run catches up, oldest week first.
2. **Project snapshot**:
   - included flag, status, Delivery RAG, % complete, update, submitted by/at, "Not updated";
   - % spend, spend status and the extract date of the latest confirmed upload;
   - open risk and issue counts by level, and overdue counts.
   
   No submission → last week's submitted values carried forward, marked Not updated. Drafts are ignored.
3. **Pipeline snapshot** per reported workstream: every open opportunity as it was.
4. **Log snapshot** per client: the totals the log trends need (open by level, raised and closed that week, overdue, average age). These cover both week-on-week and month-on-month trends.
5. **Reading**: a closed week reads its snapshots; the open week keeps reading live data. (Built: a week counts as closed from Friday 23:59 by the clock, as saving does; until the job has run it is worked out from live data.)
6. **Schedule**: Vercel Cron calls `/api/cron/close-week` once a day at 01:00 UTC. That is 01:00 on Saturday in winter and 02:00 in summer, so it is always after Friday 23:59 London time. On the Hobby plan a cron runs at most once a day, so this is the best we can get. The route only works with the `CRON_SECRET`.
7. Tests for the close rules (carry-forward, idempotence, catching up, BST/GMT) and for reading snapshots.

## Things to flag

- **Order with brief 05b.** Your brief 07 expects 05b (pipeline value) before 06, and 05b wants the pipeline snapshot to include each opportunity's value and added date. Doing 06 first is still the right call: week 47 closes this Friday, and a late close would record risks and pipeline as they are on the day the job runs, not as they were on Friday. The only cost is that week 47's pipeline snapshot won't have values. From 05b onwards they will.
- **One thing for you to do on Vercel**: add a `CRON_SECRET` environment variable before merging. I'll give you a command to generate it and the exact steps when we get there.
- The first real close will be **week 47, early on Sat 21 Nov**, on the live database.

## Questions for Paul

1. Which projects get a weekly snapshot?
2. Should the sample past weeks (35–46, Northwind) be turned into snapshots once, so every closed week is read the same way?

## Answers

1. **Every project in a Reported workstream**, with whether it was ticked that week (Paul, 17 Nov). Projects in Hidden workstreams aren't recorded.
2. **Yes, convert the sample weeks 35–46 once** with a one-off script, run on the live database only after Paul's OK (Paul, 17 Nov).

Order: brief 06 now, 05b next (so week 47's close on Sat 21 Nov is recorded on time).
