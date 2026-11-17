import { describe, expect, it } from "vitest";
import {
  addWeeks,
  closesAt,
  currentWeek,
  formatWeekParam,
  isClosed,
  isoWeekOf,
  isoWeekOfDate,
  londonOffsetMinutes,
  parseWeekParam,
  weekLabel,
  weekRange,
  weeksBetween,
  weeksInYear,
} from "@/lib/week";

describe("ISO weeks", () => {
  it("finds the ISO week of a date", () => {
    expect(isoWeekOfDate("2026-11-16")).toEqual({ isoYear: 2026, isoWeek: 47 });
    expect(isoWeekOfDate("2026-11-22")).toEqual({ isoYear: 2026, isoWeek: 47 });
    expect(isoWeekOfDate("2026-11-23")).toEqual({ isoYear: 2026, isoWeek: 48 });
  });

  it("handles weeks that straddle the year end", () => {
    expect(isoWeekOfDate("2027-01-01")).toEqual({ isoYear: 2026, isoWeek: 53 });
    expect(isoWeekOfDate("2025-12-29")).toEqual({ isoYear: 2026, isoWeek: 1 });
    expect(weeksInYear(2026)).toBe(53);
    expect(weeksInYear(2025)).toBe(52);
  });

  it("uses the London calendar date, not UTC", () => {
    // 23:30 UTC on Sunday 28 Jun 2026 is already Monday 00:30 in London (BST).
    expect(isoWeekOf(new Date("2026-06-28T23:30:00Z"))).toEqual({ isoYear: 2026, isoWeek: 27 });
    // 23:30 UTC on Sunday 22 Nov 2026 is still Sunday in London (GMT).
    expect(isoWeekOf(new Date("2026-11-22T23:30:00Z"))).toEqual({ isoYear: 2026, isoWeek: 47 });
  });

  it("gives Monday and Friday of a week, and moves between weeks", () => {
    expect(weekRange({ isoYear: 2026, isoWeek: 47 })).toEqual({
      monday: "2026-11-16",
      friday: "2026-11-20",
    });
    expect(addWeeks({ isoYear: 2026, isoWeek: 53 }, 1)).toEqual({ isoYear: 2027, isoWeek: 1 });
    expect(addWeeks({ isoYear: 2026, isoWeek: 1 }, -1)).toEqual({ isoYear: 2025, isoWeek: 52 });
    expect(
      weeksBetween({ isoYear: 2026, isoWeek: 45 }, { isoYear: 2026, isoWeek: 47 })
    ).toHaveLength(3);
  });
});

describe("labels", () => {
  it("formats the week label", () => {
    expect(weekLabel({ isoYear: 2026, isoWeek: 47 })).toBe("Week 47 · 16–20 Nov 2026");
    expect(weekLabel({ isoYear: 2026, isoWeek: 49 })).toBe("Week 49 · 30 Nov – 4 Dec 2026");
    expect(weekLabel({ isoYear: 2026, isoWeek: 1 })).toBe("Week 1 · 29 Dec 2025 – 2 Jan 2026");
  });
});

describe("closesAt: Friday 23:59 Europe/London", () => {
  it("in GMT (winter) is 23:59 UTC", () => {
    expect(closesAt({ isoYear: 2026, isoWeek: 47 }).toISOString()).toBe("2026-11-20T23:59:00.000Z");
  });

  it("in BST (summer) is 22:59 UTC", () => {
    expect(closesAt({ isoYear: 2026, isoWeek: 27 }).toISOString()).toBe("2026-07-03T22:59:00.000Z");
  });

  it("is right for the Fridays just before each clock change", () => {
    // Clocks go forward Sun 29 Mar 2026: Fri 27 Mar is still GMT.
    expect(closesAt({ isoYear: 2026, isoWeek: 13 }).toISOString()).toBe("2026-03-27T23:59:00.000Z");
    // Clocks go back Sun 25 Oct 2026: Fri 23 Oct is still BST.
    expect(closesAt({ isoYear: 2026, isoWeek: 43 }).toISOString()).toBe("2026-10-23T22:59:00.000Z");
    // The Friday after each change.
    expect(closesAt({ isoYear: 2026, isoWeek: 14 }).toISOString()).toBe("2026-04-03T22:59:00.000Z");
    expect(closesAt({ isoYear: 2026, isoWeek: 44 }).toISOString()).toBe("2026-10-30T23:59:00.000Z");
  });

  it("knows the London offset", () => {
    expect(londonOffsetMinutes(new Date("2026-01-15T12:00:00Z"))).toBe(0);
    expect(londonOffsetMinutes(new Date("2026-07-15T12:00:00Z"))).toBe(60);
  });

  it("opens the next week straight after the close", () => {
    const w47 = { isoYear: 2026, isoWeek: 47 };
    expect(isClosed(w47, new Date("2026-11-20T23:58:59Z"))).toBe(false);
    expect(isClosed(w47, new Date("2026-11-20T23:59:30Z"))).toBe(true);
    expect(currentWeek(new Date("2026-11-21T09:00:00Z"))).toEqual({ isoYear: 2026, isoWeek: 48 });
    expect(currentWeek(new Date("2026-11-17T09:00:00Z"))).toEqual(w47);
  });
});

describe("?week= parameter", () => {
  it("parses and formats", () => {
    expect(parseWeekParam("2026-W46")).toEqual({ isoYear: 2026, isoWeek: 46 });
    expect(parseWeekParam("2026-w5")).toEqual({ isoYear: 2026, isoWeek: 5 });
    expect(formatWeekParam({ isoYear: 2026, isoWeek: 5 })).toBe("2026-W05");
  });

  it("rejects invalid values", () => {
    expect(parseWeekParam("2025-W53")).toBeNull();
    expect(parseWeekParam("2026-W0")).toBeNull();
    expect(parseWeekParam("week 46")).toBeNull();
    expect(parseWeekParam(undefined)).toBeNull();
  });
});
