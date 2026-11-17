import { describe, expect, it } from "vitest";
import { ageBand, ageInDays, ageText, dueByClose, isOverdue, overdueText } from "@/lib/ageing";
import { addDays, daysBetween, formatDate, formatDateTime, relativeDays } from "@/lib/dates";
import { deltaSrText, deltaText, pointsDeltaText } from "@/lib/delta";
import { pageCount, pageItems, pageSlice, rangeText } from "@/lib/pagination";
import { ragDescription, ragShares } from "@/lib/rag";
import {
  formatPercent,
  isOverBudget,
  spendAheadBy,
  spendBand,
  spendCounts,
  spendLabel,
  spendPointsChange,
} from "@/lib/spend";
import type { Spend } from "@/types/domain";

const v = (p: number): Spend => ({ percentSpent: p, spendStatus: "VALUE" });
const NB: Spend = { percentSpent: null, spendStatus: "NO_BUDGET" };
const NT: Spend = { percentSpent: null, spendStatus: "NO_TIMESHEET" };

describe("spend", () => {
  it("formats and labels", () => {
    expect(formatPercent(1.12)).toBe("112.0%");
    expect(formatPercent(0.048)).toBe("4.8%");
    expect(spendLabel(v(0.25))).toBe("25.0%");
    expect(spendLabel(NB)).toBe("Add budget");
    expect(spendLabel(NT)).toBe("No timesheet data");
  });

  it("bands at 75% and 100%", () => {
    expect(spendBand(v(0.7499))).toBe("UNDER_75");
    expect(spendBand(v(0.75))).toBe("75_TO_100");
    expect(spendBand(v(1))).toBe("75_TO_100");
    expect(spendBand(v(1.001))).toBe("OVER_100");
    expect(spendBand(NB)).toBeNull();
    expect(isOverBudget(v(1.12))).toBe(true);
    expect(isOverBudget(NT)).toBe(false);
  });

  it("counts bands and missing figures", () => {
    expect(spendCounts([v(0.1), v(0.8), v(1.3), NB, NB, NT])).toEqual({
      under75: 1,
      from75to100: 1,
      over100: 1,
      withFigure: 3,
      noBudget: 2,
      noTimesheet: 1,
      noFigure: 3,
    });
  });

  it("compares spend with completion and with last week", () => {
    expect(spendAheadBy(v(1.12), 80)).toBe(32);
    expect(spendAheadBy(NB, 80)).toBeNull();
    expect(spendPointsChange(v(1.12), v(1.05))).toBe(7);
    expect(spendPointsChange(v(1.12), NB)).toBeNull();
  });
});

describe("delta", () => {
  it("shows change with arrows and screen-reader text", () => {
    expect(deltaText(36, 34)).toBe("▲ +2");
    expect(deltaText(3, 4)).toBe("▼ −1");
    expect(deltaText(5, 5)).toBe("No change");
    expect(deltaSrText(36, 34)).toBe("up 2 on last week");
    expect(deltaSrText(3, 4, "on 4 weeks ago")).toBe("down 1 on 4 weeks ago");
    expect(pointsDeltaText(7)).toBe("▲ +7.0 pts");
  });
});

describe("ageing", () => {
  const today = "2026-11-17";
  it("ages and bands", () => {
    expect(ageInDays("2026-11-17", today)).toBe(0);
    expect(ageInDays("2026-10-17", today)).toBe(31);
    expect(ageBand(13)).toBe("UNDER_14");
    expect(ageBand(14)).toBe("14_TO_30");
    expect(ageBand(30)).toBe("14_TO_30");
    expect(ageBand(31)).toBe("OVER_30");
    expect(ageText(0)).toBe("Today");
    expect(ageText(1)).toBe("1 day");
  });

  it("is overdue only past the due date and not closed", () => {
    expect(isOverdue({ status: "OPEN", dueOn: "2026-11-16" }, today)).toBe(true);
    expect(isOverdue({ status: "OPEN", dueOn: "2026-11-17" }, today)).toBe(false);
    expect(isOverdue({ status: "ON_PAUSE", dueOn: "2026-11-01" }, today)).toBe(true);
    expect(isOverdue({ status: "CLOSED", dueOn: "2026-11-01" }, today)).toBe(false);
    expect(isOverdue({ status: "OPEN", dueOn: null }, today)).toBe(false);
    expect(overdueText({ status: "OPEN", dueOn: "2026-11-14" }, today)).toBe("Overdue by 3 days");
    expect(overdueText({ status: "OPEN", dueOn: "2026-11-16" }, today)).toBe("Overdue by 1 day");
  });

  it("counts items due by the week's close", () => {
    expect(dueByClose({ status: "OPEN", dueOn: "2026-11-20" }, today, "2026-11-20")).toBe(true);
    expect(dueByClose({ status: "OPEN", dueOn: "2026-11-21" }, today, "2026-11-20")).toBe(false);
    expect(dueByClose({ status: "OPEN", dueOn: "2026-11-16" }, today, "2026-11-20")).toBe(false);
  });
});

describe("pagination", () => {
  it("gives range text and page counts", () => {
    expect(rangeText(1, 25, 181)).toBe("Showing 1–25 of 181");
    expect(rangeText(8, 25, 181)).toBe("Showing 176–181 of 181");
    expect(rangeText(1, 25, 0)).toBe("Showing 0 of 0");
    expect(pageCount(181, 25)).toBe(8);
    expect(pageCount(0, 25)).toBe(1);
    expect(pageSlice([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
  });

  it("gives page items with gaps", () => {
    expect(pageItems(1, 8)).toEqual([1, 2, "gap", 8]);
    expect(pageItems(5, 8)).toEqual([1, "gap", 4, 5, 6, "gap", 8]);
    expect(pageItems(2, 3)).toEqual([1, 2, 3]);
  });
});

describe("RAG bar", () => {
  it("gives shares and a text alternative", () => {
    expect(ragShares({ GREEN: 2, AMBER: 1, RED: 1 })).toEqual({ GREEN: 50, AMBER: 25, RED: 25 });
    expect(ragShares({ GREEN: 0, AMBER: 0, RED: 0 })).toEqual({ GREEN: 0, AMBER: 0, RED: 0 });
    expect(ragDescription({ GREEN: 3, AMBER: 2, RED: 1 })).toBe(
      "Delivery RAG: 3 Green, on track; 2 Amber, at risk; 1 Red, blocked"
    );
  });
});

describe("dates", () => {
  it("does calendar maths and formats", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(daysBetween("2026-11-01", "2026-11-17")).toBe(16);
    expect(formatDate("2026-11-16")).toBe("16 Nov 2026");
    expect(formatDateTime("2026-11-16T09:12:00Z")).toBe("16 Nov 2026, 09:12");
    expect(formatDateTime("2026-07-16T09:12:00Z")).toBe("16 Jul 2026, 10:12");
    expect(relativeDays("2026-11-13T17:30:00Z", new Date("2026-11-16T10:00:00Z"))).toBe(
      "3 days ago"
    );
  });
});
