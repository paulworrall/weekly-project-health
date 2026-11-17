/**
 * One-off: convert a client's weekly spend file (.xlsx, docs/excel-file-spec.md) into a JSON data
 * file the seed loads. Real weekly files go through Admin › Spend uploads (brief 04); this script
 * is kept for preparing seed data. Deterministic; no AI.
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
import { readFileSync } from "node:fs";
import { parseSpendFile } from "../src/services/parsing/spend-file";

function arg(name: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  if (!v) throw new Error(`Missing --${name}`);
  return v;
}

const file = arg("file");
const extractDate = arg("extract-date");
if (!/^\d{4}-\d{2}-\d{2}$/.test(extractDate)) throw new Error("--extract-date must be YYYY-MM-DD");

// Same parser as Admin › Spend uploads (src/services/parsing/spend-file.ts).
const result = await parseSpendFile(readFileSync(file));
if (!result.ok) throw new Error(result.reason);
if (result.errors.length) {
  console.error(`${result.errors.length} row errors:`);
  for (const e of result.errors.slice(0, 20)) console.error(`Row ${e.rowNumber}: ${e.message}`);
  process.exit(1);
}
const rows = result.rows.map((r) => ({
  jobNumber: r.jobNumber,
  name: r.name,
  workstream: r.workstream,
  percentSpent: r.percentSpent,
  spendStatus: r.spendStatus,
}));

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
