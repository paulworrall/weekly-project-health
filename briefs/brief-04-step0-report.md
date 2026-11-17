# Brief 04 — Step 0 report (17 Nov 2026)

There is no `briefs/brief-04-*.md`. Scope is taken from `CLAUDE.md` §7 "Spend upload" and §10 phase 4 ("parser, validation, preview, decisions, confirm, history, Reported flag"), `docs/excel-file-spec.md`, and the decision log (16–17 Nov: one file per client, accept formulas, extract date entered, UNMAPPED is normal, workstream never overridden, missing projects stay in the report, decisions start empty, Account Director typed by the Admin, Admin-only uploads page).

## 1. The flow

1. **Step 1 · Choose:** client, extract date (default today, not in the future) and the .xlsx file. "Check file" uploads it.
2. **Check (on the server, deterministic, no AI):**
   - **Structure:** the sheet must be `Project Budget Usage` with headers A1:D1 exactly as specified. If not, the attempt is saved as **Rejected** with "expected … found …", and the file is kept in the history.
   - **Rows:** job number numeric and unique; name and workstream present; % spend a number ≥ 0 or `Add budget to Workbook` / `No timesheet data`; every formula has a cached value. Row errors are listed and block Confirm.
   - **Compared with the client's live data:**
     - new projects;
     - renamed projects;
     - projects moved to another workstream;
     - % spend changed (by 0.1 points or more);
     - projects missing from the file;
     - new workstreams (created **Hidden**).
   - Saved as **Ready to review**, with the file, the parsed rows and the change list.
3. **Step 2 · Preview:** the existing tabbed preview, now with the real changes. Each missing project needs Keep as is or Mark "No longer in file" (nothing pre-selected). Decisions are saved as you click.
4. **Step 3 · Confirm:** one database transaction:
   - creates new workstreams (Hidden) and new projects;
   - updates renamed and moved projects (the file is the source of truth);
   - writes a % spend figure for every project from this upload;
   - records `missingFromFileSince` for missing projects, plus `markedNoLongerInFileAt` where marked;
   - clears both if a project comes back;
   - sets the previous live upload to **Replaced** and this one to **Live** (shown as Confirmed);
   - writes audit rows.

   Nothing is deleted. Missing projects stay in the report and lists.
5. **Cancel** marks the attempt **Cancelled** (kept in the history).
6. **Workstreams table:** the Reported switch and Account Director now save (audited). Turning a workstream on or off changes which pages and reports include it straight away.

All of this is Admin-only, checked on the server in every action (CLAUDE.md §5).

## 2. Where things go

| Piece | Where |
|---|---|
| Parser (exceljs; structure and row checks; returns rows + problems) | `src/services/parsing/spend-file.ts` (also used by `scripts/import-spend-file.mts`) |
| Compare with live data (pure) | `src/lib/spend-diff.ts` |
| Actions: check, decide, confirm, cancel, set Reported, set Account Director | `src/app/(app)/admin/uploads/actions.ts` |
| Preview and form wired to the actions | `UploadForm`, `UploadPreview`, `WorkstreamSettings` |
| Tests | Parser against **synthetic** .xlsx fixtures built in the test (formulas with and without cached values, bad headers, bad values, duplicates, UNMAPPED, 800xxx jobs); diff cases; confirm-gate rules; action permission checks |

No database migration is needed: the upload tables from brief 02 already have everything (file bytes, staged rows, change list with decisions, % spend per upload).

## 3. Limits and safety

- File size: ~185 KB today. Vercel accepts request bodies up to 4.5 MB, so files up to ~4 MB will work.
- Confirm runs as one transaction, with a longer time limit (869 rows in well under a second locally), so it either all saves or nothing does.
- Real TCCC files go into the database (the file is stored for the audit trail). Test files are synthetic and are never committed (CLAUDE.md §11).

## 4. Questions

1. **Real TCCC files on the site:** your 17 Nov approval covered the first file. Does it also cover TCCC's weekly spend files uploaded through the site from now on?
2. **Two files waiting:** if you check a new file while an earlier one for the same client is still waiting for review, should the earlier one be cancelled automatically?

## Answers (Paul, 17 Nov 2026)

1. **Real TCCC files:** approved. TCCC's weekly spend files may be uploaded through the site, and the file is kept in the database. Other clients' real data still needs Paul's approval.
2. **Two files waiting:** checking a new file cancels the earlier one still waiting for review for that client, which stays in the history as Cancelled ("Replaced by a newer file before review").

Waiting for Paul's go-ahead to build.
