/**
 * Spend file parser (brief 04, docs/excel-file-spec.md). Deterministic code, never AI.
 *
 * - One sheet, "Project Budget Usage"; headers A1:D1 exactly (trimmed, case-sensitive). Anything
 *   else rejects the whole file with "expected … found …".
 * - Formula cells are read from their cached result; a formula with no cached value is a row
 *   error (the uploader must refresh and save the source workbook).
 * - Column D: a number ≥ 0 (fraction, 0.25 = 25%, may exceed 1) or exactly
 *   "Add budget to Workbook" / "No timesheet data".
 * - Job numbers: numeric, unique within the file, stored as text. UNMAPPED is a normal workstream.
 */
import ExcelJS from "exceljs";
import type { SpendStatus } from "@/types/domain";

export const SPEND_SHEET = "Project Budget Usage";
export const SPEND_HEADERS = [
  "Job Number",
  "Project Name",
  "Default Reporting Workstream",
  "Percentage Spent to Date",
] as const;
const TEXT_STATUS: Record<string, Exclude<SpendStatus, "VALUE">> = {
  "Add budget to Workbook": "NO_BUDGET",
  "No timesheet data": "NO_TIMESHEET",
};

export interface SpendRow {
  rowNumber: number;
  jobNumber: string;
  name: string;
  workstream: string;
  /** Fraction (0.25 = 25%); null unless spendStatus is VALUE. */
  percentSpent: number | null;
  spendStatus: SpendStatus;
}

export interface RowError {
  rowNumber: number;
  message: string;
}

export type ParseResult =
  | { ok: false; reason: string }
  | { ok: true; rows: SpendRow[]; errors: RowError[]; rowCount: number };

const NO_CACHE = Symbol("formula without cached value");

/** A cell's value with formulas resolved to their cached result and rich text flattened. */
function cellValue(v: ExcelJS.CellValue): unknown {
  if (v && typeof v === "object") {
    if ("formula" in v || "sharedFormula" in v) {
      const r = (v as ExcelJS.CellFormulaValue).result;
      if (r === undefined || r === null) return NO_CACHE;
      if (typeof r === "object" && r !== null && "error" in r) return NO_CACHE;
      return r;
    }
    if ("richText" in v)
      return (v as ExcelJS.CellRichTextValue).richText.map((t) => t.text).join("");
    if ("text" in v && "hyperlink" in v) return (v as ExcelJS.CellHyperlinkValue).text;
  }
  return v;
}

const asText = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

/** Parse an .xlsx spend file. Never throws for bad content; an unreadable file is a rejection. */
export async function parseSpendFile(data: ArrayBuffer | Buffer): Promise<ParseResult> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(data as ArrayBuffer);
  } catch {
    return { ok: false, reason: "The file couldn't be read as an Excel workbook (.xlsx)." };
  }
  const ws = wb.getWorksheet(SPEND_SHEET);
  if (!ws) {
    const found = wb.worksheets.map((w) => `"${w.name}"`).join(", ") || "no sheets";
    return { ok: false, reason: `Sheet: expected "${SPEND_SHEET}", found ${found}.` };
  }
  const found = SPEND_HEADERS.map((_, i) => asText(cellValue(ws.getRow(1).getCell(i + 1).value)));
  const wrong = SPEND_HEADERS.map((h, i) => ({ h, f: found[i], col: "ABCD"[i] })).filter(
    (x) => x.h !== x.f
  );
  if (wrong.length) {
    return {
      ok: false,
      reason: wrong
        .map((x) => `Header ${x.col}1: expected "${x.h}", found ${x.f ? `"${x.f}"` : "nothing"}.`)
        .join(" "),
    };
  }

  const rows: SpendRow[] = [];
  const errors: RowError[] = [];
  const seen = new Map<string, number>();
  let rowCount = 0;
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return;
    const raw = [1, 2, 3, 4].map((c) => cellValue(row.getCell(c).value));
    if (raw.every((v) => v === null || v === undefined || v === "")) return;
    rowCount++;
    const problems: string[] = [];
    if (raw.some((v) => v === NO_CACHE))
      problems.push("a formula has no saved value (refresh the source workbook and save it)");
    const [job, name, workstream, spend] = raw;
    const jobNumber = job === NO_CACHE ? "" : asText(job);
    if (job !== NO_CACHE) {
      if (!jobNumber) problems.push("Job Number is empty");
      else if (!/^\d+$/.test(jobNumber)) problems.push(`Job Number "${jobNumber}" isn't a number`);
      else if (seen.has(jobNumber))
        problems.push(`Job Number ${jobNumber} is also on row ${seen.get(jobNumber)}`);
    }
    if (jobNumber && !seen.has(jobNumber)) seen.set(jobNumber, n);
    const projectName = name === NO_CACHE ? "" : asText(name);
    if (name !== NO_CACHE && !projectName) problems.push("Project Name is empty");
    const ws = workstream === NO_CACHE ? "" : asText(workstream);
    if (workstream !== NO_CACHE && !ws) problems.push("Default Reporting Workstream is empty");
    let percentSpent: number | null = null;
    let spendStatus: SpendStatus = "NO_BUDGET";
    if (spend !== NO_CACHE) {
      if (typeof spend === "number" && Number.isFinite(spend) && spend >= 0) {
        percentSpent = Math.round(spend * 1_000_000) / 1_000_000;
        spendStatus = "VALUE";
      } else if (typeof spend === "string" && TEXT_STATUS[spend.trim()]) {
        spendStatus = TEXT_STATUS[spend.trim()];
      } else {
        problems.push(
          `Percentage Spent to Date "${asText(spend)}" isn't a number or "Add budget to Workbook" / "No timesheet data"`
        );
      }
    }
    if (problems.length) {
      errors.push({ rowNumber: n, message: `${problems.join("; ")}.` });
      return;
    }
    rows.push({
      rowNumber: n,
      jobNumber,
      name: projectName,
      workstream: ws,
      percentSpent,
      spendStatus,
    });
  });
  if (rowCount === 0) return { ok: false, reason: "The sheet has headers but no project rows." };
  return { ok: true, rows, errors, rowCount };
}
