# Phase 7 (rest) — Step 0 report: log trends from snapshots, past weeks

18 Nov 2026. There is no separate brief for this. The scope comes from CLAUDE.md §10 item 7 ("aggregations, trends, past weeks") and the follow-ups noted in `agent.md` and the decision log (17 Nov, "Each page loads the snapshots of the 13 most recent closed weeks"; brief 07 Step 0 point 10).

## 1. What already works

- **Project, workstream and client pages and the report:** every closed week reads its own snapshot (brief 06). The 8-week Delivery RAG, % spend and risk and issue trends use the snapshot of each week.
- **Past weeks** (`?week=2026-W46`) are read-only, with the "Week 46 is closed" note.

## 2. What is missing

1. **The risk and issue log charts don't use the weekly snapshots.** The log page takes *one* list of items (today's list, or the snapshot list of the week being viewed) and works backwards from raised and closed dates to draw:
   - the 12-week chart;
   - the month-on-month table;
   - "change on last week" and "on 4 weeks ago";
   - last month's average age.

   So if someone later archives an item, or changes its severity or priority, the history changes with it. An item archived on 5 Nov drops out of every earlier week's figures, even though the 30 Oct snapshot recorded it. That breaks the rule that closed weeks never change.
2. **Pages only load the snapshots of the 13 most recent closed weeks.** If you look at a week older than that, it (and the trend weeks before it) is worked out from live data instead of its snapshot. The report has the same limit for a week more than 5 weeks back. This doesn't matter yet: the oldest snapshot is week 35, 12 weeks ago. But it will after Christmas.

## 3. Proposal

**A. Log trends read each week's snapshot** (`src/lib/logs.ts`, pure and tested)
- **Each closed week in the 12-week chart:** open, raised and closed come from *that week's* snapshot items. The workstream filter still works because the snapshot keeps every item with its project. The current open week stays live.
- **Change on last week and on 4 weeks ago:** from the snapshots of those weeks.
- **Month-on-month table:** each finished month uses the snapshot of the **last week that closed in that month**. The current month is month to date (live), as now. See question below.
- **By-workstream table, "last week" column:** from last week's snapshot.
- **No snapshot for a week** (before a client's first upload, or before week 35): the week is left off the chart rather than shown as zero. It works the same way as the report trends.

**B. Load the snapshots a page needs, not "the last 13 weeks"** (`src/server/repository.ts`)
- Pages and the report pass the week being viewed. The repository loads the snapshots from about 4 months before that week up to it, enough for the 12-week chart and the 4-month table. Pages without `?week=` load the same as today.
- No database change.

**C. Speed: measure, don't change yet**
- A page loads everything per request. That took about 6 s from this computer to Neon, mostly network distance. I'll time the live site before and after B. Moving sums into database queries would be a bigger rewrite, so I'd only do it in brief 08 if the live pages feel slow.

## 4. Tests

- `logs.ts`:
  - an item archived or re-graded after a close leaves earlier weeks unchanged;
  - weeks with no snapshot are left off;
  - the workstream filter on snapshot weeks;
  - month-end figures from the last close of the month, including a month whose last Friday is the 31st, and one where the month ends mid-week.
- Repository: the snapshot window follows the viewed week.

## 5. Nothing contradicts CLAUDE.md or the decision log

One clarification to record: the decision log says the month-on-month table shows "open at month end". Snapshots only exist for Fridays, so I need a rule for that (the question below).

## 6. Question (answered 18 Nov: exact month end)

**Month-end figures:** for a finished month, should "open at month end" be the figure from the **last Friday close in that month** (recommended: a real frozen figure, at most 6 days before the month ends), or worked out for the exact last day of the month from that close's items (exact date, but partly worked out rather than frozen)?

**Answer (Paul, 18 Nov):** the exact month end. Built as: each finished month's figures are worked out for its last day from the items recorded at the first Friday close on or after it (that close includes everything raised up to the month end); the open week's live items if that close hasn't happened yet.
