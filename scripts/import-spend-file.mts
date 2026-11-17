/**
 * One-off: convert a client's weekly spend file (.xlsx, docs/excel-file-spec.md) into a JSON data
 * file the mock repository loads, until real uploads arrive in brief 04. Deterministic; no AI.
 *
 * Usage:
 *   npx tsx scripts/import-spend-file.mts --file "<path>.xlsx" --client-id tccc --client-name TCCC \
 *     --extract-date 2026-11-16 --reported "Name A,Name B" --out src/mocks/clients/tccc.json
 *
 * The .xlsx itself is never committed (.gitignore). Only use real client data with the Admin's
 * approval (decision log, 17 Nov 2026).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";

const SHEET = "Project Budget Usage";
const HEADERS = [
  "Job Number",
  "Project Name",
  "Default Reporting Workstream",
  "Percentage Spent to Date",
];
const TEXT_STATUS: Record<string, "NO_BUDGET" | "NO_TIMESHEET"> = {
  "Add budget to Workbook": "NO_BUDGET",
  "No timesheet data": "NO_TIMESHEET",
};

function arg(name: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  if (!v) throw new Error(`Missing --${name}`);
  return v;
}

/** Cached result of a formula cell, or the plain value. `undefined` = formula without a cached value. */
function cellValue(v: ExcelJS.CellValue): unknown {
  if (v && typeof v === "object" && "formula" in v) return (v as ExcelJS.CellFormulaValue).result;
  if (v && typeof v === "object" && "sharedFormula" in v)
    return (v as ExcelJS.CellSharedFormulaValue).result;
  return v;
}

const file = arg("file");
const extractDate = arg("extract-date");
if (!/^\d{4}-\d{2}-\d{2}$/.test(extractDate)) throw new Error("--extract-date must be YYYY-MM-DD");

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);
const ws = wb.getWorksheet(SHEET);
if (!ws)
  throw new Error(
    `Sheet "${SHEET}" not found. Found: ${wb.worksheets.map((w) => w.name).join(", ")}`
  );
const found = HEADERS.map((_, i) => String(ws.getRow(1).getCell(i + 1).value ?? "").trim());
if (found.join("|") !== HEADERS.join("|")) {
  throw new Error(
    `Headers don't match.\nExpected: ${HEADERS.join(" | ")}\nFound:    ${found.join(" | ")}`
  );
}

const errors: string[] = [];
const seen = new Set<string>();
const rows: {
  jobNumber: string;
  name: string;
  workstream: string;
  percentSpent: number | null;
  spendStatus: "VALUE" | "NO_BUDGET" | "NO_TIMESHEET";
}[] = [];

ws.eachRow((row, n) => {
  if (n === 1) return;
  const [job, name, workstream, spend] = [1, 2, 3, 4].map((c) => cellValue(row.getCell(c).value));
  if ([job, name, workstream, spend].some((x) => x === undefined)) {
    errors.push(`Row ${n}: a formula has no saved value (refresh the source workbook and save).`);
    return;
  }
  const jobNumber = String(job ?? "").trim();
  if (!/^\d+$/.test(jobNumber)) errors.push(`Row ${n}: Job Number "${jobNumber}" is not a number.`);
  else if (seen.has(jobNumber)) errors.push(`Row ${n}: Job Number ${jobNumber} appears twice.`);
  seen.add(jobNumber);
  const projectName = String(name ?? "").trim();
  if (!projectName) errors.push(`Row ${n}: Project Name is empty.`);
  const ws = String(workstream ?? "").trim();
  if (!ws) errors.push(`Row ${n}: Default Reporting Workstream is empty.`);
  let percentSpent: number | null = null;
  let spendStatus: "VALUE" | "NO_BUDGET" | "NO_TIMESHEET";
  if (typeof spend === "number" && spend >= 0) {
    percentSpent = Math.round(spend * 10000) / 10000;
    spendStatus = "VALUE";
  } else if (typeof spend === "string" && TEXT_STATUS[spend.trim()]) {
    spendStatus = TEXT_STATUS[spend.trim()];
  } else {
    errors.push(
      `Row ${n}: Percentage Spent to Date "${String(spend)}" is not a number or a known status.`
    );
    return;
  }
  rows.push({ jobNumber, name: projectName, workstream: ws, percentSpent, spendStatus });
});

if (errors.length) {
  console.error(`${errors.length} row errors:\n${errors.slice(0, 20).join("\n")}`);
  process.exit(1);
}

const reported = arg("reported")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const names = new Set(rows.map((r) => r.workstream));
const unknown = reported.filter((r) => !names.has(r));
if (unknown.length) throw new Error(`Reported workstreams not in the file: ${unknown.join(", ")}`);

const out = arg("out");
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(
  out,
  `${JSON.stringify(
    {
      client: { id: arg("client-id"), name: arg("client-name") },
      extractDate,
      fileName: path.basename(file),
      reported,
      rows: rows.sort((a, b) => a.jobNumber.localeCompare(b.jobNumber)),
    },
    null,
    1
  )}\n`
);
console.log(
  `Wrote ${rows.length} rows, ${names.size} workstreams (${reported.length} reported) to ${out}`
);
