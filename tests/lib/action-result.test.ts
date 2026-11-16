import { describe, expect, it } from "vitest";
import { fail, ok } from "@/types/action-result";

describe("ActionResult helpers", () => {
  it("builds success and failure results", () => {
    expect(ok({ id: "x" })).toEqual({ ok: true, data: { id: "x" } });
    expect(fail("FORBIDDEN", "Admins only")).toEqual({
      ok: false,
      code: "FORBIDDEN",
      message: "Admins only",
    });
    expect(fail("VALIDATION", "Check the form", { title: "Enter a title" })).toMatchObject({
      fieldErrors: { title: "Enter a title" },
    });
  });
});
