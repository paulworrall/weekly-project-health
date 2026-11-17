# Brief 05 — Step 0 report (17 Nov 2026)

There is no `briefs/brief-05-*.md`. Scope is taken from `CLAUDE.md` §6 (who can do what), §7 (weekly update, risks and issues, pipeline), §10 phase 5 ("selection, weekly update, risks, issues, pipeline (all audited)") and the decision log (16–17 Nov: any Updater can tick any project, selection carries over, statuses, % complete in steps of 10, Delivery RAG, project page, risk and issue fields, refs per client, pipeline). Answers to §5 are recorded at the bottom.

## 1. What starts saving

Every change below is saved to the database with an audit row in the same transaction, checked on the server for a signed-in Admin or Updater, and only allowed in the **open week** (CLAUDE.md §6: a closed week is never edited).

| Screen | What saves |
|---|---|
| Workstream page | **Include in weekly report** tick (carries over week to week); **pipeline** add, edit, archive |
| Project page | **Weekly update**: status, Delivery RAG, % complete (0–100 in steps of 10), update text. **Save draft** or **Submit** (submit needs update text; resubmitting until the close replaces it). **Risks and issues**: add (next per-client ref, R-001… / I-001…, assigned in the same transaction and never reused), edit (including due date), close/reopen, delete (= archive) |

The screens already behave this way in local state; brief 05 swaps local state for Server Actions returning `ActionResult` with field errors, then refreshes the page.

## 2. Findings

- **The open week must exist in the database before anything is saved against it.** Only weeks 35–47 exist. From Monday 23 Nov (week 48) there is no row, so saving would fail. Brief 05 creates the open week on first save if it's missing (`OPEN`, closing Friday 23:59 London). Brief 06 adds the automatic close and snapshots.
- **"Closed" is decided by the clock:** after Friday 23:59 London, saves for that week are refused even before the close job runs (Hobby crons run once a day). Edits then belong to the next week, as decided on 16 Nov.
- **Past weeks still show today's ticks** until brief 06 writes snapshots: unticking a project now would also hide it from earlier weeks' views. The data is safe (weekly entries are kept); only the past-week display is affected until snapshots exist.
- **Closing a risk or issue** sets `closedOn` to today; reopening clears it, so counts and "closed this week" stay right.
- **Raised date** is set on creation and not editable (as in the mockup).
- No database migration is needed: every table and field already exists.

## 3. Build plan

| Piece | Where |
|---|---|
| Actions: set included; save draft / submit weekly update; add / edit / archive risk or issue; add / edit / archive opportunity | `src/app/(app)/actions/weekly.ts` |
| Rules (pure, tested): open-week check, which period to save to, next ref, closedOn on status change | `src/lib/weekly-rules.ts` |
| Open week created on demand | `src/server/periods.ts` |
| Wire `ProjectList`, `WeeklyUpdateForm`, `RiskIssueTable`, `PipelineSection` to the actions (optimistic update, undo on error, live-region messages) | existing components |
| Tests | Rules, schemas, components with fake actions, permission and closed-week refusals |

## 4. Order

Build and test locally against the live database, on sample client Northwind (invented data, for practising), then you try it, then merge. TCCC data is only touched if you choose to tick or edit its projects.

## 5. Question

1. **Two people editing at once:** if two people have the same project open and both save, should the second be warned that it changed since they opened it (and shown the latest), or should the last save simply win?

## Answers (Paul, 17 Nov 2026)

1. **Two people editing at once:** warn the second person. Saves of the weekly update, risks, issues and opportunities carry the version the person opened (`updatedAt`); if the record changed since, the save is refused with who changed it and when, and the page shows the latest values. Ticks are a single on/off, so the last tick wins.

Waiting for Paul's go-ahead to build.
