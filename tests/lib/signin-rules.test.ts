import { describe, expect, it } from "vitest";
import { afterFailure, afterSuccess, isLocked, minutesLeft, type LockState } from "@/lib/lockout";
import { passwordError, passwordProblems, temporaryPassword } from "@/lib/passwords";

describe("password rule", () => {
  it("needs 8+ characters with upper, lower, number and symbol", () => {
    expect(passwordProblems("Sample-pass1")).toEqual([]);
    expect(passwordProblems("Ab1!")).toEqual(["at least 8 characters"]);
    expect(passwordProblems("sample-pass1")).toEqual(["an upper-case letter"]);
    expect(passwordProblems("SAMPLE-PASS1")).toEqual(["a lower-case letter"]);
    expect(passwordProblems("Sample-pass")).toEqual(["a number"]);
    expect(passwordProblems("Samplepass1")).toEqual(["a symbol"]);
  });

  it("refuses the email as the password and explains in one sentence", () => {
    expect(passwordProblems("Sam.Ple1@example.com", "sam.ple1@example.com")).toContain(
      "something other than your email"
    );
    expect(passwordError("abc")).toBe(
      "The password needs at least 8 characters, an upper-case letter, a number and a symbol."
    );
    expect(passwordError("Sample-pass1")).toBeNull();
  });

  it("makes temporary passwords that always pass", () => {
    for (let i = 0; i < 200; i++) {
      const p = temporaryPassword();
      expect(p).toHaveLength(14);
      expect(passwordProblems(p)).toEqual([]);
      expect(p).not.toMatch(/[0O1lI]/);
    }
  });
});

describe("lockout", () => {
  const now = new Date("2026-11-17T10:00:00Z");
  const fresh: LockState = { failedSignInCount: 0, lockedUntil: null };

  it("locks for 15 minutes on the 5th failure", () => {
    let s: LockState = fresh;
    for (let i = 1; i <= 4; i++) {
      s = afterFailure(s, now);
      expect(s).toEqual({ failedSignInCount: i, lockedUntil: null });
    }
    s = afterFailure(s, now);
    expect(s.failedSignInCount).toBe(0);
    expect(s.lockedUntil?.toISOString()).toBe("2026-11-17T10:15:00.000Z");
    expect(isLocked(s, now)).toBe(true);
    expect(minutesLeft(s, new Date("2026-11-17T10:14:30Z"))).toBe(1);
    expect(isLocked(s, new Date("2026-11-17T10:15:01Z"))).toBe(false);
  });

  it("starts counting again after a lock expires, and clears on success", () => {
    const expired = { failedSignInCount: 0, lockedUntil: new Date("2026-11-17T09:00:00Z") };
    expect(afterFailure(expired, now)).toEqual({ failedSignInCount: 1, lockedUntil: null });
    expect(afterSuccess()).toEqual(fresh);
  });
});
