// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { LoginForm } from "@/components/features/login-form";
import type { LoginState } from "@/app/(auth)/login/state";
import { ProjectList, type ListState } from "@/components/features/project-list";
import { RiskIssueTable } from "@/components/features/risk-issue-table";
import { UploadPreview } from "@/components/features/upload-preview";
import { RagSelector, WeeklyUpdateForm } from "@/components/features/weekly-update-form";
import { EMPTY_PROJECT_FILTERS } from "@/lib/filters";
import { DEFAULT_CLIENT_ID, getUploadsView, getWorkstreamOverview } from "@/mocks/repository";
import type { LogItem, Rag } from "@/types/domain";

describe("ProjectList", () => {
  const v = getWorkstreamOverview(DEFAULT_CLIENT_ID, "alpha-eu")!;

  function Harness() {
    const [included, setIncluded] = useState<Record<string, boolean>>(
      Object.fromEntries(v.projects.map((p) => [p.id, p.included]))
    );
    const [state, setState] = useState<ListState>({
      filters: EMPTY_PROJECT_FILTERS,
      page: 1,
      size: 25,
    });
    return (
      <ProjectList
        rows={v.projects}
        included={included}
        onToggle={(id) => setIncluded((s) => ({ ...s, [id]: !s[id] }))}
        state={state}
        onState={setState}
        submitters={v.submitters}
        week={v.week}
        now="2026-11-17T10:30:00Z"
        workstreamName={v.workstream.name}
      />
    );
  }

  it("keeps included projects pinned on page 1", () => {
    render(<Harness />);
    const rows = within(screen.getAllByRole("table")[0]).getAllByRole("row").slice(1);
    const included = v.projects.filter((p) => p.included).length;
    rows.slice(0, included).forEach((r) => expect(within(r).getByRole("checkbox")).toBeChecked());
    expect(within(rows[included]).getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByText("Showing 1–25 of 181")).toBeInTheDocument();
  });

  it("pins a newly ticked project and resets to page 1 when a filter changes", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Page 2" }));
    expect(screen.getByText("Showing 26–50 of 181")).toBeInTheDocument();
    const box = within(screen.getAllByRole("table")[0]).getAllByRole("checkbox")[0];
    const label = box.getAttribute("aria-label")!;
    const name = label.replace(/^Include /, "").replace(/ in the weekly report$/, "");
    await user.click(box);
    await user.click(screen.getByRole("button", { name: "Page 1" }));
    expect(
      screen.getByRole("checkbox", { name: `Remove ${name} from the weekly report` })
    ).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Page 2" }));
    expect(screen.getByText("Showing 26–50 of 181")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("% spend"), "NO_BUDGET");
    expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText(/^Showing 1–/)).toBeInTheDocument();
  });
});

describe("WeeklyUpdateForm", () => {
  const props = {
    submittedAt: null,
    spend: { percentSpent: 1.12, spendStatus: "VALUE" as const },
    readOnly: false,
    dueLabel: "Fri 20 Nov",
    lastSubmissionText: "Last submission: 13 Nov 2026 (week 46).",
    now: "2026-11-17T10:30:00Z",
  };

  it("validates % complete and shows field errors", async () => {
    const user = userEvent.setup();
    render(
      <WeeklyUpdateForm
        {...props}
        initial={{
          status: "IN_PROGRESS",
          rag: "AMBER",
          percentComplete: 45,
          updateText: "",
          state: null,
        }}
      />
    );
    await user.click(screen.getByRole("button", { name: "Submit update" }));
    expect(screen.getByText("Choose % complete.")).toBeInTheDocument();
    expect(screen.getByText("Write this week's update before submitting.")).toBeInTheDocument();
    expect(screen.getByLabelText("% complete")).toHaveAttribute("aria-invalid", "true");

    await user.selectOptions(screen.getByLabelText("% complete"), "50");
    await user.type(screen.getByLabelText("Weekly update"), "Sample update text.");
    await user.click(screen.getByRole("button", { name: "Submit update" }));
    expect(screen.queryByText("Choose % complete.")).not.toBeInTheDocument();
    expect(screen.getByText(/^Submitted at/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit again" })).toBeInTheDocument();
  });

  it("offers % complete only in steps of 10", () => {
    render(
      <WeeklyUpdateForm
        {...props}
        initial={{
          status: "IN_PROGRESS",
          rag: "GREEN",
          percentComplete: 40,
          updateText: "",
          state: null,
        }}
      />
    );
    const options = within(screen.getByLabelText("% complete"))
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(options).toEqual([
      "0%",
      "10%",
      "20%",
      "30%",
      "40%",
      "50%",
      "60%",
      "70%",
      "80%",
      "90%",
      "100%",
    ]);
  });
});

describe("RagSelector", () => {
  it("shows each colour with its meaning and marks the chosen one", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [rag, setRag] = useState<Rag>("GREEN");
      return <RagSelector value={rag} onChange={setRag} />;
    }
    render(<Harness />);
    expect(screen.getByRole("button", { name: "Green · On track" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Amber · At risk" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Red · Blocked" }));
    expect(screen.getByRole("button", { name: "Red · Blocked" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Green · On track" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });
});

describe("RiskIssueTable", () => {
  const item: LogItem = {
    id: "r1",
    kind: "RISK",
    ref: "R-001",
    clientId: "c",
    projectId: "p",
    title: "Sample risk one",
    level: "HIGH",
    owner: "Sample Owner",
    status: "OPEN",
    raisedOn: "2026-11-01",
    dueOn: "2026-11-10",
    action: "Sample mitigation",
    closedOn: null,
    archivedAt: null,
  };

  it("adds, edits and archives items in local state", async () => {
    const user = userEvent.setup();
    render(
      <RiskIssueTable
        kind="RISK"
        initial={[item]}
        projectId="p"
        clientId="c"
        nextSeq={2}
        today="2026-11-17"
        readOnly={false}
        defaultOwner="Sample Owner"
      />
    );
    expect(screen.getByText("Overdue by 7 days")).toBeInTheDocument();

    // Add: a blank title is rejected, then saved with the next ref.
    await user.click(screen.getByRole("button", { name: /Add risk/ }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Enter a title.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Risk title"), "Sample risk two");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("R-002")).toBeInTheDocument();
    expect(screen.getByText("Sample risk two")).toBeInTheDocument();

    // Edit, including the due date.
    await user.click(screen.getByRole("button", { name: "Edit R-001" }));
    const due = screen.getByLabelText("Due date");
    await user.clear(due);
    await user.type(due, "2026-12-01");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("1 Dec 2026")).toBeInTheDocument();
    expect(screen.queryByText(/Overdue by/)).not.toBeInTheDocument();

    // Delete archives.
    await user.click(screen.getByRole("button", { name: /Delete R-001/ }));
    expect(screen.queryByText("Sample risk one")).not.toBeInTheDocument();
    expect(screen.getByText(/1 archived this session/)).toBeInTheDocument();
  });
});

describe("UploadPreview", () => {
  const v = getUploadsView(DEFAULT_CLIENT_ID)!;
  const staged = v.staged!;
  vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {} }) }));

  function actions() {
    return {
      decide: vi.fn(async () => ({ ok: true as const, data: null })),
      confirm: vi.fn(async () => ({ ok: true as const, data: { rows: 636 } })),
      cancel: vi.fn(async () => ({ ok: true as const, data: null })),
    };
  }

  it("enables Confirm only when every missing project has a decision, saving each choice", async () => {
    const user = userEvent.setup();
    const a = actions();
    render(
      <UploadPreview
        uploadId="up-1"
        changes={staged.changes}
        fileChecks={staged.fileChecks}
        clientName="Northwind Drinks"
        rowCount={636}
        actions={a}
      />
    );
    const confirm = screen.getByRole("button", { name: "Confirm upload" });
    expect(confirm).toBeDisabled();
    expect(
      screen.getByText("3 missing projects need a decision before you can confirm.")
    ).toBeInTheDocument();
    const groups = screen.getAllByRole("radiogroup");
    expect(groups).toHaveLength(3);
    groups.forEach((g) =>
      within(g)
        .getAllByRole("radio")
        .forEach((r) => expect(r).toHaveAttribute("aria-checked", "false"))
    );
    await user.click(within(groups[0]).getByRole("radio", { name: "Keep as is" }));
    await user.click(within(groups[1]).getByRole("radio", { name: 'Mark "No longer in file"' }));
    expect(confirm).toBeDisabled();
    await user.click(within(groups[2]).getByRole("radio", { name: "Keep as is" }));
    expect(confirm).toBeEnabled();
    expect(a.decide).toHaveBeenCalledTimes(3);
    expect(a.decide).toHaveBeenNthCalledWith(2, expect.any(String), "MARK");
    await user.click(confirm);
    expect(a.confirm).toHaveBeenCalledWith("up-1");
    expect(await screen.findByText("Upload confirmed.")).toBeInTheDocument();
  });

  it("keeps Confirm off while the file has row errors", () => {
    render(
      <UploadPreview
        uploadId="up-2"
        changes={staged.changes.map((c) =>
          c.type === "MISSING" ? { ...c, decision: "KEEP" as const } : c
        )}
        fileChecks={staged.fileChecks}
        rowErrors={[{ rowNumber: 7, message: "Job Number is empty." }]}
        clientName="Northwind Drinks"
        rowCount={636}
        actions={actions()}
      />
    );
    expect(screen.getByRole("button", { name: "Confirm upload" })).toBeDisabled();
    expect(screen.getByText("Row 7:")).toBeInTheDocument();
    expect(
      screen.getByText("Confirm is off while the file has rows with errors.")
    ).toBeInTheDocument();
  });
});

describe("LoginForm", () => {
  it("shows field errors, then the not-recognised and locked states", async () => {
    const user = userEvent.setup();
    const replies: LoginState[] = [{ status: "not-recognised" }, { status: "locked", minutes: 15 }];
    const action = vi.fn(async (): Promise<LoginState> => replies.shift() ?? { status: "idle" });
    render(<LoginForm action={action} />);

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByText("Enter your work email.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Work email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByText("Enter an email address like name@example.com.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Work email"));
    await user.type(screen.getByLabelText("Work email"), "sample@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Email or password not recognised.")).toBeInTheDocument();
    expect(action).toHaveBeenCalledTimes(1);
    const sent = action.mock.calls[0] as unknown as [LoginState, FormData];
    expect(sent[1].get("email")).toBe("sample@example.com");

    expect(screen.getByLabelText("Work email")).toHaveValue("sample@example.com");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Account locked for 15 minutes.")).toBeInTheDocument();
  });
});
