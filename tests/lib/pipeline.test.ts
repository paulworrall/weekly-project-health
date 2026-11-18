/** Brief 05b: pipeline value and time in pipeline. Synthetic figures only. */
import { describe, expect, it } from "vitest";
import {
  addMonths,
  daysInPipeline,
  formatDays,
  formatMoney,
  formatMoneyCompact,
  isLongRunning,
  pipelineSummary,
  sumSummaries,
} from "@/lib/pipeline";
import type { PipelineOpportunity } from "@/types/domain";

type Opp = Pick<PipelineOpportunity, "likelihood" | "estimatedValue" | "addedOn" | "possibleStart">;
const opp = (o: Partial<Opp>): Opp => ({
  likelihood: "MEDIUM",
  estimatedValue: 100_000,
  addedOn: "2026-11-01",
  possibleStart: null,
  ...o,
});

describe("time in pipeline", () => {
  it("counts whole calendar days, unaffected by the clocks changing", () => {
    // BST ends on Sun 25 Oct 2026.
    expect(daysInPipeline("2026-10-20", "2026-10-30")).toBe(10);
    // BST starts on Sun 28 Mar 2027.
    expect(daysInPipeline("2027-03-25", "2027-04-01")).toBe(7);
    expect(daysInPipeline("2026-11-18", "2026-11-18")).toBe(0);
    expect(daysInPipeline("2026-11-20", "2026-11-18")).toBe(0); // never negative
  });

  it("flags over 90 days, not 90 itself", () => {
    expect(isLongRunning(90)).toBe(false);
    expect(isLongRunning(91)).toBe(true);
    expect(isLongRunning(daysInPipeline("2026-08-20", "2026-11-18"))).toBe(false); // 90
    expect(isLongRunning(daysInPipeline("2026-08-19", "2026-11-18"))).toBe(true); // 91
  });

  it("says day or days", () => {
    expect(formatDays(1)).toBe("1 day");
    expect(formatDays(57)).toBe("57 days");
  });
});

describe("addMonths", () => {
  it("keeps the day, or uses the last day of a shorter month", () => {
    expect(addMonths("2026-11-18", 3)).toBe("2027-02-18");
    expect(addMonths("2026-11-30", 3)).toBe("2027-02-28");
    expect(addMonths("2027-11-30", 3)).toBe("2028-02-29"); // leap year
    expect(addMonths("2026-10-31", 3)).toBe("2027-01-31");
    expect(addMonths("2026-12-31", 2)).toBe("2027-02-28");
  });
});

describe("pipelineSummary", () => {
  const asOf = "2026-11-18";
  const list: Opp[] = [
    opp({
      likelihood: "HIGH",
      estimatedValue: 450_000,
      addedOn: "2026-09-23",
      possibleStart: "2027-01-11",
    }),
    opp({
      likelihood: "HIGH",
      estimatedValue: 120_000,
      addedOn: "2026-06-01",
      possibleStart: "2027-02-18",
    }),
    opp({
      likelihood: "MEDIUM",
      estimatedValue: 340_000,
      addedOn: "2026-11-08",
      possibleStart: "2027-02-19",
    }),
    opp({ likelihood: "LOW", estimatedValue: null, addedOn: "2026-08-19", possibleStart: null }),
  ];
  const s = pipelineSummary(list, asOf);

  it("totals count and value, leaving unvalued ones out of the value only", () => {
    expect(s.count).toBe(4);
    expect(s.value).toBe(910_000);
    expect(s.notValued).toBe(1);
    expect(s.byLikelihood.HIGH).toEqual({ count: 2, value: 570_000 });
    expect(s.byLikelihood.MEDIUM).toEqual({ count: 1, value: 340_000 });
    expect(s.byLikelihood.LOW).toEqual({ count: 1, value: 0 });
  });

  it("works out average and oldest time, and those over 90 days", () => {
    // 56, 170, 10 and 91 days.
    expect(s.averageDays).toBe(82);
    expect(s.oldestDays).toBe(170);
    expect(s.longRunning).toEqual({ count: 2, value: 120_000 });
  });

  it("counts possible starts up to 3 calendar months ahead, not those without a start", () => {
    // Horizon 18 Feb 2027: 11 Jan and 18 Feb count, 19 Feb doesn't.
    expect(s.nextThreeMonths).toEqual({ count: 2, value: 570_000 });
  });

  it("is all zeros when empty", () => {
    const e = pipelineSummary([], asOf);
    expect(e).toMatchObject({ count: 0, value: 0, averageDays: 0, oldestDays: 0, notValued: 0 });
  });

  it("adds workstreams up to a client", () => {
    const a = pipelineSummary(list.slice(0, 2), asOf);
    const b = pipelineSummary(list.slice(2), asOf);
    const t = sumSummaries([a, b]);
    expect(t.count).toBe(4);
    expect(t.value).toBe(910_000);
    expect(t.byLikelihood.HIGH.value).toBe(570_000);
    expect(t.oldestDays).toBe(170);
    expect(t.longRunning.count).toBe(2);
    expect(t.averageDays).toBe(82);
  });
});

describe("money", () => {
  it("shows the full figure in tables and forms", () => {
    expect(formatMoney(450_000)).toBe("$450,000");
    expect(formatMoney(1_980_000)).toBe("$1,980,000");
    expect(formatMoney(950)).toBe("$950");
    expect(formatMoney(null)).toBe("Not set");
  });

  it("shows a compact figure on tiles and slides", () => {
    expect(formatMoneyCompact(950)).toBe("$950");
    expect(formatMoneyCompact(450_000)).toBe("$450k");
    expect(formatMoneyCompact(12_500)).toBe("$13k");
    expect(formatMoneyCompact(2_500)).toBe("$2.5k");
    expect(formatMoneyCompact(1_980_000)).toBe("$1.98m");
    expect(formatMoneyCompact(1_500_000)).toBe("$1.5m");
    expect(formatMoneyCompact(2_000_000)).toBe("$2m");
    expect(formatMoneyCompact(999_600)).toBe("$1m");
    expect(formatMoneyCompact(0)).toBe("$0");
    expect(formatMoneyCompact(null)).toBe("Not set");
  });
});
