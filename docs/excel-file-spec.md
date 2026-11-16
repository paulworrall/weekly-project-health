# Weekly spend upload — file specification

Source: a TCCC sample workbook reviewed 16 Nov 2026. Status: agreed. Decisions are also recorded in `decision-log.md`.

## Structure

- One sheet: `Project Budget Usage`. No other sheets.
- Header row 1, data from row 2. No merged cells, no blank rows. 869 data rows in the sample.

| Column | Header (exact) | Type in sample | Notes |
|---|---|---|---|
| A | Job Number | Integer, 6 digits | Unique in the sample. Key for Project (unique per client). Store as text. |
| B | Project Name | Text | Prefixed with the client code in the sample. |
| C | Default Reporting Workstream | Text | 13 distinct values in the sample. Mostly Account Director names, plus buckets such as "Other", "Ways of Working", investment and intercompany invoicing. Source formula falls back to `UNMAPPED`. Never overridden in the tool. |
| D | Percentage Spent to Date | Number **or** text | Fraction (0.25 = 25%), formatted 0.0%. Can exceed 1 (44 rows over 100%, max ~1800%). Or one of two text values: `Add budget to Workbook` (517 rows), `No timesheet data` (252 rows). Only 100 of 869 rows had a number. |

## Rules

- **One file per client.** The Admin picks the client at upload; the upload replaces the project list for that client only.
- **Formulas.** Every cell in the sample is a formula linked to an external workbook. The parser reads the cached value of a formula cell (exceljs `cell.value.result`) and treats a plain value the same way. A formula cell with no cached value is a row error. The uploader must refresh the source workbook before saving; the tool cannot detect stale values (the preview's % spend changes are the check).
- **Extract date.** Not in the file. Required on the upload screen, default today, stored on SpendUpload.
- **% spend status.** ProjectSpend has `percentSpent` (decimal, nullable) and `spendStatus` (`VALUE` / `NO_BUDGET` / `NO_TIMESHEET`). Over 100% is valid and is shown as "Over budget", never capped. Any other text in column D is a row error.
- **Workstreams.** Created on first appearance per client (shown in the preview as "new workstream"), Hidden by default; Admin switches them to Reported. `UNMAPPED` is loaded as a normal workstream, no warning.
- **Non-billable and internal jobs** (travel, admin, onboarding, 800xxx job numbers) load like any project.
- **Missing projects.** The extract includes all historical jobs, so a project should not drop out. If one does, the preview flags it, the default decision is "Keep as is", and the project stays in the report and lists either way.
- **Upload day.** Mondays. If a week has no confirmed upload, reports and snapshots use the latest confirmed upload.

## Validation

- Client selected and extract date entered before the file is parsed.
- Sheet named `Project Budget Usage` exists; headers in A1:D1 match exactly (trimmed, case-sensitive). On mismatch: reject the file, list expected vs found.
- Job Number required, numeric, unique within the file.
- Project Name required.
- Workstream required (`UNMAPPED` is valid).
- % spend: number ≥ 0, or one of the two known text values.
- Formula cells must have a cached value.
- Row-level errors are listed in the preview; the upload cannot be confirmed while errors exist.

## Data governance

The sample is real client data (client and staff names). Do not commit it to the repo or use it as a test fixture. Build a synthetic fixture with the same shape: same sheet and headers, mixed numeric and text spend values, values over 100%, an UNMAPPED row, non-billable and 800xxx jobs, formula cells with cached values, plain-value cells, and a formula cell without a cached value.
