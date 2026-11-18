import { describe, expect, it } from "vitest";
import {
  fieldErrors,
  loginSchema,
  pipelineSchema,
  riskSchema,
  weeklySubmitSchema,
  weeklyUpdateSchema,
} from "@/types/schemas";
import { canAdminister, canEditWeek, landingPath } from "@/lib/permissions";

describe("weekly update schema", () => {
  const ok = { status: "IN_PROGRESS", rag: "GREEN", percentComplete: 40, updateText: "Sample" };

  it("accepts % complete in steps of 10 from 0 to 100", () => {
    expect(weeklyUpdateSchema.safeParse(ok).success).toBe(true);
    expect(weeklyUpdateSchema.safeParse({ ...ok, percentComplete: 0 }).success).toBe(true);
    expect(weeklyUpdateSchema.safeParse({ ...ok, percentComplete: 100 }).success).toBe(true);
  });

  it("rejects other values with a field message", () => {
    const r = weeklyUpdateSchema.safeParse({ ...ok, percentComplete: 45 });
    expect(r.success).toBe(false);
    if (!r.success)
      expect(fieldErrors(r.error).percentComplete).toBe("Choose % complete in steps of 10%.");
    expect(weeklyUpdateSchema.safeParse({ ...ok, percentComplete: 110 }).success).toBe(false);
  });

  it("needs update text to submit, not to save a draft", () => {
    expect(weeklyUpdateSchema.safeParse({ ...ok, updateText: "" }).success).toBe(true);
    const r = weeklySubmitSchema.safeParse({ ...ok, updateText: "  " });
    expect(r.success).toBe(false);
    if (!r.success)
      expect(fieldErrors(r.error).updateText).toBe("Write this week's update before submitting.");
  });
});

describe("other schemas", () => {
  it("validates the sign-in form field by field", () => {
    const r = loginSchema.safeParse({ email: "nope", password: "", remember: false });
    expect(r.success).toBe(false);
    if (!r.success)
      expect(fieldErrors(r.error)).toEqual({
        email: "Enter an email address like name@example.com.",
        password: "Enter your password.",
      });
  });

  it("validates risks and pipeline opportunities", () => {
    const r = riskSchema.safeParse({
      title: "",
      owner: "",
      status: "OPEN",
      level: "BLOCKER",
      action: "",
    });
    expect(r.success).toBe(false);
    if (!r.success)
      expect(Object.keys(fieldErrors(r.error)).sort()).toEqual(["level", "owner", "title"]);
    expect(
      pipelineSchema.safeParse({
        likelihood: "HIGH",
        title: "Sample opportunity",
        estimatedValue: "450,000",
        possibleStart: "2027-01-11",
        addedOn: "2026-10-01",
        mapOwner: "Sample Owner",
        clientOwner: "",
        nextSteps: "",
      }).success
    ).toBe(true);
  });
});

describe("pipeline value and added date (brief 05b)", () => {
  const base = {
    likelihood: "HIGH",
    title: "Sample opportunity",
    estimatedValue: "450000",
    possibleStart: "",
    addedOn: "2026-10-01",
    mapOwner: "Sample Owner",
    clientOwner: "",
    nextSteps: "",
  };
  const value = (v: unknown) => pipelineSchema.safeParse({ ...base, estimatedValue: v });
  const err = (r: ReturnType<typeof value>) => (r.success ? null : fieldErrors(r.error));

  it("accepts whole dollars, with commas, spaces or a $", () => {
    for (const v of ["450000", "450,000", "$450,000", " 1 000 ", 100_000_000, 1]) {
      const r = value(v);
      expect(r.success, String(v)).toBe(true);
    }
    const r = value("$1,980,000");
    expect(r.success && r.data.estimatedValue).toBe(1_980_000);
  });

  it("requires a value and explains each problem", () => {
    expect(err(value(""))?.estimatedValue).toBe("Enter the estimated value in US dollars.");
    expect(err(value(undefined))?.estimatedValue).toBe("Enter the estimated value in US dollars.");
    expect(err(value("lots"))?.estimatedValue).toMatch(/number of dollars/);
    expect(err(value("1500.50"))?.estimatedValue).toBe("Use whole dollars, with no cents.");
    expect(err(value("0"))?.estimatedValue).toBe("Enter a value from $1 to $100,000,000.");
    expect(err(value(100_000_001))?.estimatedValue).toBe("Enter a value from $1 to $100,000,000.");
  });

  it("needs an added date that isn't in the future", () => {
    const date = (d: unknown) => pipelineSchema.safeParse({ ...base, addedOn: d });
    expect(date("2020-01-01").success).toBe(true);
    const missing = date("");
    expect(missing.success ? null : fieldErrors(missing.error).addedOn).toBe(
      "Enter the date it was added to the pipeline."
    );
    const future = date("2999-01-01");
    expect(future.success ? null : fieldErrors(future.error).addedOn).toBe(
      "The added date can't be in the future."
    );
  });
});

describe("permissions", () => {
  const admin = { id: "u1", name: "A", initials: "A", role: "ADMIN" as const };
  const updater = { ...admin, role: "UPDATER" as const };

  it("limits admin areas to the Admin and edits to open weeks", () => {
    expect(canAdminister(admin)).toBe(true);
    expect(canAdminister(updater)).toBe(false);
    expect(canAdminister(null)).toBe(false);
    expect(canEditWeek(updater, false)).toBe(true);
    expect(canEditWeek(admin, true)).toBe(false);
    expect(landingPath(admin)).toBe("/admin");
    expect(landingPath(updater)).toBe("/clients");
  });
});
