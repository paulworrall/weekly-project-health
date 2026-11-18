/** Brief 08: Change history filters, the database filter they make, and page numbers. */
import { describe, expect, it } from "vitest";
import {
  EMPTY_HISTORY_FILTERS,
  historyHref,
  historyWhere,
  londonMidnight,
  pageInfo,
  parseHistoryFilters,
  showingText,
} from "@/lib/history";

describe("parseHistoryFilters", () => {
  it("reads the query string and ignores what it doesn't understand", () => {
    expect(parseHistoryFilters({})).toEqual(EMPTY_HISTORY_FILTERS);
    expect(
      parseHistoryFilters({
        who: "u-admin",
        what: "risks",
        from: "2026-11-01",
        to: "2026-11-17",
        page: "3",
      })
    ).toEqual({ who: "u-admin", what: "risks", from: "2026-11-01", to: "2026-11-17", page: 3 });
    expect(
      parseHistoryFilters({ who: "a b;drop", what: "nope", from: "2026-02-30", page: "-2" })
    ).toEqual(EMPTY_HISTORY_FILTERS);
    expect(parseHistoryFilters({ who: ["x", "y"] }).who).toBe("");
  });

  it("swaps the dates when From is after To", () => {
    const f = parseHistoryFilters({ from: "2026-11-17", to: "2026-11-01" });
    expect([f.from, f.to]).toEqual(["2026-11-01", "2026-11-17"]);
  });
});

describe("historyWhere", () => {
  it("filters nothing by default", () => {
    expect(historyWhere(EMPTY_HISTORY_FILTERS)).toEqual({});
  });

  it("filters by person, the System, record types and London days", () => {
    const f = { ...EMPTY_HISTORY_FILTERS, who: "u-1", what: "uploads" as const };
    expect(historyWhere(f)).toEqual({
      userId: "u-1",
      entity: { in: ["SpendUpload", "SpendUploadChange"] },
    });
    expect(historyWhere({ ...EMPTY_HISTORY_FILTERS, who: "system" })).toEqual({ userId: null });
    // Summer (BST): 1 Jul starts at 23:00 UTC on 30 Jun; the To day is included in full.
    expect(
      historyWhere({ ...EMPTY_HISTORY_FILTERS, from: "2026-07-01", to: "2026-07-01" })
    ).toEqual({
      at: {
        gte: new Date("2026-06-30T23:00:00Z"),
        lt: new Date("2026-07-01T23:00:00Z"),
      },
    });
  });

  it("finds London midnight across the clock changes", () => {
    expect(londonMidnight("2026-01-15").toISOString()).toBe("2026-01-15T00:00:00.000Z");
    expect(londonMidnight("2026-03-29").toISOString()).toBe("2026-03-29T00:00:00.000Z"); // clocks go forward later that night
    expect(londonMidnight("2026-03-30").toISOString()).toBe("2026-03-29T23:00:00.000Z");
    expect(londonMidnight("2026-10-25").toISOString()).toBe("2026-10-24T23:00:00.000Z"); // still BST at midnight
    expect(londonMidnight("2026-10-26").toISOString()).toBe("2026-10-26T00:00:00.000Z");
  });
});

describe("page numbers", () => {
  it("works out pages and keeps the page in range", () => {
    expect(pageInfo(0, 1)).toEqual({ page: 1, pages: 1, first: 0, last: 0, total: 0, skip: 0 });
    expect(pageInfo(120, 2)).toEqual({
      page: 2,
      pages: 3,
      first: 51,
      last: 100,
      total: 120,
      skip: 50,
    });
    expect(pageInfo(120, 9).page).toBe(3);
    expect(pageInfo(120, 9).last).toBe(120);
  });

  it("says what is shown", () => {
    expect(showingText(pageInfo(1234, 2), false)).toBe("Showing 51–100 of 1,234 changes");
    expect(showingText(pageInfo(1, 1), true)).toBe("Showing 1–1 of 1 change");
    expect(showingText(pageInfo(0, 1), true)).toBe("No changes match these filters.");
    expect(showingText(pageInfo(0, 1), false)).toBe("No changes yet.");
  });

  it("links to other pages keeping the filters", () => {
    const f = { ...EMPTY_HISTORY_FILTERS, who: "system", from: "2026-11-01" };
    expect(historyHref(f, { page: 2 })).toBe("/admin/history?who=system&from=2026-11-01&page=2");
    expect(historyHref(f, { page: 1 })).toBe("/admin/history?who=system&from=2026-11-01");
    expect(historyHref(EMPTY_HISTORY_FILTERS)).toBe("/admin/history");
  });
});
