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
        possibleStart: "2027-01-11",
        mapOwner: "Sample Owner",
        clientOwner: "",
        nextSteps: "",
      }).success
    ).toBe(true);
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
