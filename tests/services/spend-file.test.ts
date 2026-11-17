/** Parser tests against synthetic workbooks built here (never real client files). */
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { parseSpendFile, SPEND_HEADERS, SPEND_SHEET } from "@/services/parsing/spend-file";

type Cell = ExcelJS.CellValue;

async function workbook(
  rows: Cell[][],
  opts: { sheet?: string; headers?: string[]; extraSheet?: boolean } = {}
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  if (opts.extraSheet) wb.addWorksheet("Notes");
  const ws = wb.addWorksheet(opts.sheet ?? SPEND_SHEET);
  ws.addRow(opts.headers ?? [...SPEND_HEADERS]);
  for (const r of rows) ws.addRow(r);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const f = (result: Cell): Cell => ({ formula: "'[Source.xlsx]Sheet'!A1", result }) as Cell;
const noCache = (): Cell => ({ formula: "'[Source.xlsx]Sheet'!A1" }) as Cell;

describe("spend file parser", () => {
  it("reads plain values and cached formula results", async () => {
    const r = await parseSpendFile(
      await workbook([
        [100001, "SAMPLE_CRM_Journey", "Alpha EU", 0.25],
        [f(100002), f("SAMPLE_Paid Social"), f("Beta Global"), f(1.12)],
        [100003, "SAMPLE_Internal time (non-billable)", "UNMAPPED", "Add budget to Workbook"],
        [800004, "SAMPLE_Travel", "Other", f("No timesheet data")],
      ])
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.errors).toEqual([]);
    expect(r.rowCount).toBe(4);
    expect(r.rows).toEqual([
      {
        rowNumber: 2,
        jobNumber: "100001",
        name: "SAMPLE_CRM_Journey",
        workstream: "Alpha EU",
        percentSpent: 0.25,
        spendStatus: "VALUE",
      },
      {
        rowNumber: 3,
        jobNumber: "100002",
        name: "SAMPLE_Paid Social",
        workstream: "Beta Global",
        percentSpent: 1.12,
        spendStatus: "VALUE",
      },
      {
        rowNumber: 4,
        jobNumber: "100003",
        name: "SAMPLE_Internal time (non-billable)",
        workstream: "UNMAPPED",
        percentSpent: null,
        spendStatus: "NO_BUDGET",
      },
      {
        rowNumber: 5,
        jobNumber: "800004",
        name: "SAMPLE_Travel",
        workstream: "Other",
        percentSpent: null,
        spendStatus: "NO_TIMESHEET",
      },
    ]);
  });

  it("lists row errors without rejecting the file", async () => {
    const r = await parseSpendFile(
      await workbook([
        [100001, "SAMPLE_A", "Alpha EU", noCache()],
        [100001, "SAMPLE_B", "Alpha EU", 0.5],
        ["ABC", "SAMPLE_C", "Alpha EU", 0.5],
        [100004, "", "Alpha EU", 0.5],
        [100005, "SAMPLE_E", "Alpha EU", "Unknown status"],
        [100006, "SAMPLE_F", "Alpha EU", -0.1],
        [100007, "SAMPLE_G", "Alpha EU", 0.1],
      ])
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rows.map((x) => x.jobNumber)).toEqual(["100007"]);
    expect(r.errors.map((e) => e.rowNumber)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(r.errors[0].message).toMatch(/formula has no saved value/);
    expect(r.errors[1].message).toMatch(/also on row 2/);
    expect(r.errors[2].message).toMatch(/isn't a number/);
    expect(r.errors[3].message).toMatch(/Project Name is empty/);
    expect(r.errors[4].message).toMatch(/Unknown status/);
  });

  it("rejects a wrong sheet or wrong headers, saying what was expected", async () => {
    const sheet = await parseSpendFile(await workbook([[1, "A", "B", 0.1]], { sheet: "Sheet1" }));
    expect(sheet).toEqual({
      ok: false,
      reason: 'Sheet: expected "Project Budget Usage", found "Sheet1".',
    });
    const headers = await parseSpendFile(
      await workbook([[1, "A", "B", 0.1]], {
        headers: ["Job Number", "Project Name", "Default Reporting Workstream", "Percent Spent"],
      })
    );
    expect(headers).toEqual({
      ok: false,
      reason: 'Header D1: expected "Percentage Spent to Date", found "Percent Spent".',
    });
  });

  it("accepts other sheets alongside, but not an empty sheet or a non-Excel file", async () => {
    const extra = await parseSpendFile(await workbook([[1, "A", "B", 0.1]], { extraSheet: true }));
    expect(extra.ok).toBe(true);
    expect(await parseSpendFile(await workbook([]))).toEqual({
      ok: false,
      reason: "The sheet has headers but no project rows.",
    });
    const junk = await parseSpendFile(Buffer.from("not a workbook"));
    expect(junk.ok).toBe(false);
  });
});
