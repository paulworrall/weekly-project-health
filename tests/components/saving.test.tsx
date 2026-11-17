// @vitest-environment jsdom
/** Brief 05: components saving through (fake) server actions. */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: () => {} }) }));

import { RiskIssueTable } from "@/components/features/risk-issue-table";
import { WeeklyUpdateForm } from "@/components/features/weekly-update-form";
import type { LogItem } from "@/types/domain";

const base = {
  spend: { percentSpent: 0.5, spendStatus: "VALUE" as const },
  readOnly: false,
  dueLabel: "Fri 20 Nov",
  lastSubmissionText: "No earlier submission.",
  now: "2026-11-17T10:30:00Z",
  submittedAt: null,
};
const initial = {
  status: "IN_PROGRESS" as const,
  rag: "GREEN" as const,
  percentComplete: 40,
  updateText: "Sample update.",
  state: null,
};

describe("WeeklyUpdateForm saving", () => {
  it("submits with the opened version and then offers Submit again (no draft)", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => ({
      ok: true as const,
      data: { state: "SUBMITTED" as const, submittedAt: "2026-11-17T10:42:00Z", version: "v2" },
    }));
    render(<WeeklyUpdateForm {...base} initial={initial} version="v1" onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Submit update" }));
    expect(onSave).toHaveBeenCalledWith(
      "SUBMITTED",
      { status: "IN_PROGRESS", rag: "GREEN", percentComplete: 40, updateText: "Sample update." },
      "v1"
    );
    expect(await screen.findByText("Submitted at 10:42.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit again" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save draft" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit again" }));
    expect(onSave).toHaveBeenLastCalledWith("SUBMITTED", expect.any(Object), "v2");
  });

  it("warns when someone else saved first, with a reload", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => ({
      ok: false as const,
      code: "CONFLICT" as const,
      message:
        "This was changed by Sample Person at 10:40 since you opened it, so your change wasn't saved.",
    }));
    render(<WeeklyUpdateForm {...base} initial={initial} version="v1" onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByText(/changed by Sample Person at 10:40/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reload the latest" }));
    expect(refresh).toHaveBeenCalled();
  });
});

describe("RiskIssueTable saving", () => {
  it("adds through the server, which assigns the ref", async () => {
    const user = userEvent.setup();
    const saved: LogItem = {
      id: "r9",
      kind: "RISK",
      ref: "R-031",
      clientId: "c",
      projectId: "p",
      title: "Sample new risk",
      level: "MEDIUM",
      owner: "Sample Owner",
      status: "OPEN",
      raisedOn: "2026-11-17",
      dueOn: "2026-11-27",
      action: "",
      closedOn: null,
      archivedAt: null,
      updatedAt: "2026-11-17T10:45:00.000Z",
    };
    const actions = {
      create: vi.fn(async () => ({ ok: true as const, data: saved })),
      update: vi.fn(),
      archive: vi.fn(),
    };
    render(
      <RiskIssueTable
        kind="RISK"
        initial={[]}
        projectId="p"
        clientId="c"
        nextSeq={1}
        today="2026-11-17"
        readOnly={false}
        defaultOwner="Sample Owner"
        actions={actions}
      />
    );
    await user.click(screen.getByRole("button", { name: /Add risk/ }));
    expect(screen.getByText("New")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Risk title"), "Sample new risk");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(actions.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Sample new risk" })
    );
    expect(await screen.findByText("R-031")).toBeInTheDocument();
  });
});
