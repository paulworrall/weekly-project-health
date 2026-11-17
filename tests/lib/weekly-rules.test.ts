import { describe, expect, it } from "vitest";
import {
  closedOnAfter,
  conflictMessage,
  formatRef,
  sameVersion,
  weekEditProblem,
} from "@/lib/weekly-rules";

describe("weekly rules", () => {
  it("allows saving only in the open week, by the London clock", () => {
    const tue = new Date("2026-11-17T10:00:00Z");
    expect(weekEditProblem("2026-W47", tue)).toBeNull();
    expect(weekEditProblem("2026-W46", tue)).toMatch(/^Week 46 has closed/);
    // Friday 23:59 London has passed: week 47 is closed, week 48 is open.
    const afterClose = new Date("2026-11-21T00:00:30Z");
    expect(weekEditProblem("2026-W47", afterClose)).toMatch(/work in week 48/);
    expect(weekEditProblem("2026-W48", afterClose)).toBeNull();
    expect(weekEditProblem("nonsense", tue)).toMatch(/isn't valid/);
  });

  it("formats per-client refs", () => {
    expect(formatRef("RISK", 7)).toBe("R-007");
    expect(formatRef("ISSUE", 1234)).toBe("I-1234");
  });

  it("sets the closed date on close and clears it on reopen", () => {
    const today = "2026-11-17";
    expect(closedOnAfter(null, "CLOSED", today)).toBe(today);
    expect(closedOnAfter({ status: "OPEN", closedOn: null }, "CLOSED", today)).toBe(today);
    expect(closedOnAfter({ status: "CLOSED", closedOn: "2026-11-02" }, "CLOSED", today)).toBe(
      "2026-11-02"
    );
    expect(closedOnAfter({ status: "CLOSED", closedOn: "2026-11-02" }, "OPEN", today)).toBeNull();
  });

  it("compares versions and explains a conflict", () => {
    const at = new Date("2026-11-17T10:42:00Z");
    expect(sameVersion(at.toISOString(), at)).toBe(true);
    expect(sameVersion(null, null)).toBe(true);
    expect(sameVersion(null, at)).toBe(false);
    expect(sameVersion("2026-11-17T10:00:00.000Z", at)).toBe(false);
    expect(conflictMessage("Sample Person", at)).toBe(
      "This was changed by Sample Person at 10:42 since you opened it, so your change wasn't saved. Reload to see the latest, then make your change again."
    );
    expect(conflictMessage(null, null)).toMatch(/^This was changed since you opened it/);
  });
});
