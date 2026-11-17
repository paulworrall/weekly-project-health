import { describe, expect, it } from "vitest";
import { initialsFor, userActionProblem } from "@/lib/permissions";

const admin = { id: "a1", name: "Sample Admin", initials: "SA", role: "ADMIN" as const };
const updater = { ...admin, id: "u1", role: "UPDATER" as const };
const activeUpdater = { id: "u2", role: "UPDATER" as const, archivedAt: null };
const self = { id: "a1", role: "ADMIN" as const, archivedAt: null };

describe("user admin rules", () => {
  it("lets only the Admin manage users", () => {
    expect(userActionProblem("UNLOCK", updater, activeUpdater, 1)).toBe(
      "Only the Admin can manage users."
    );
    expect(userActionProblem("UNLOCK", admin, activeUpdater, 1)).toBeNull();
  });

  it("stops the Admin changing or archiving themself", () => {
    expect(userActionProblem("CHANGE_ROLE", admin, self, 2, "UPDATER")).toBe(
      "You can't change your own role."
    );
    expect(userActionProblem("ARCHIVE", admin, self, 2)).toBe("You can't archive yourself.");
  });

  it("always keeps one active Admin", () => {
    const otherAdmin = { id: "a2", role: "ADMIN" as const, archivedAt: null };
    expect(userActionProblem("CHANGE_ROLE", admin, otherAdmin, 1, "UPDATER")).toBe(
      "There must always be at least one Admin."
    );
    expect(userActionProblem("CHANGE_ROLE", admin, otherAdmin, 2, "UPDATER")).toBeNull();
    expect(userActionProblem("ARCHIVE", admin, otherAdmin, 1)).toBe(
      "There must always be at least one Admin."
    );
  });

  it("handles archived users", () => {
    const archived = { id: "u3", role: "UPDATER" as const, archivedAt: new Date() };
    expect(userActionProblem("RESTORE", admin, archived, 1)).toBeNull();
    expect(userActionProblem("RESTORE", admin, activeUpdater, 1)).toBe("This user isn't archived.");
    expect(userActionProblem("RESET_PASSWORD", admin, archived, 1)).toBe(
      "Restore this user first."
    );
    expect(userActionProblem("CHANGE_ROLE", admin, activeUpdater, 1, "UPDATER")).toBe(
      "That is already their role."
    );
  });

  it("makes initials", () => {
    expect(initialsFor("Sam Sample")).toBe("SS");
    expect(initialsFor("  Sam  Middle  Sample ")).toBe("SS");
    expect(initialsFor("Cher")).toBe("CH");
  });
});
