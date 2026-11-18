// @vitest-environment jsdom
/** Brief 05b: the pipeline table and form show and save value and time in pipeline. */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {} }) }));

import { PipelineSection } from "@/components/features/pipeline-section";
import type { PipelineOpportunity } from "@/types/domain";

const opp = (o: Partial<PipelineOpportunity>): PipelineOpportunity => ({
  id: "o1",
  workstreamId: "w1",
  likelihood: "HIGH",
  title: "Sample opportunity",
  estimatedValue: 450_000,
  possibleStart: "2027-01-11",
  addedOn: "2026-09-23",
  mapOwner: "Sample Owner",
  clientOwner: "Sample Client Owner",
  nextSteps: "Sample next step",
  createdOn: "2026-09-23",
  archivedAt: null,
  ...o,
});

const initial = [
  opp({}),
  opp({
    id: "o2",
    likelihood: "MEDIUM",
    title: "Sample older opportunity",
    estimatedValue: 460_000,
    addedOn: "2026-06-01",
  }),
  opp({ id: "o3", likelihood: "LOW", title: "Sample unvalued opportunity", estimatedValue: null }),
];

function show(actions?: Parameters<typeof PipelineSection>[0]["actions"]) {
  render(
    <PipelineSection
      workstreamId="w1"
      workstreamName="Sample Workstream"
      initial={initial}
      readOnly={false}
      today="2026-11-18"
      actions={actions}
    />
  );
}

describe("PipelineSection value and time in pipeline", () => {
  it("summarises the value and lists value and days for each opportunity", () => {
    show();
    expect(
      screen.getByText("3 opportunities worth $910,000 · 1 High · 1 Medium · 1 Low · 1 not valued")
    ).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Value (USD)" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "In pipeline" })).toBeInTheDocument();
    const first = within(table).getByRole("row", { name: /^High Sample opportunity/ });
    expect(within(first).getByText("$450,000")).toBeInTheDocument();
    expect(within(first).getByText("56 days")).toBeInTheDocument();
    expect(within(first).getByText("added 23 Sep 2026")).toBeInTheDocument();
    // Over 90 days: bold and said in words.
    const older = within(table).getByRole("row", { name: /Sample older opportunity/ });
    expect(within(older).getByText("(over 90 days)")).toHaveClass("sr-only");
    const unvalued = within(table).getByRole("row", { name: /Sample unvalued opportunity/ });
    expect(within(unvalued).getByText("Not set")).toBeInTheDocument();
  });

  it("shows field errors for value and added date", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: /Add opportunity/ }));
    const form = screen.getByRole("form", { name: "Add opportunity" });
    expect(within(form).getByLabelText(/Added to pipeline/)).toHaveValue("2026-11-18");
    await user.type(within(form).getByLabelText("Opportunity"), "Sample new opportunity");
    await user.type(within(form).getByLabelText("MAP owner"), "Sample Owner");
    await user.clear(within(form).getByLabelText(/Added to pipeline/));
    await user.click(within(form).getByRole("button", { name: "Add opportunity" }));
    expect(within(form).getByText("Enter the estimated value in US dollars.")).toBeInTheDocument();
    expect(
      within(form).getByText("Enter the date it was added to the pipeline.")
    ).toBeInTheDocument();
    expect(within(form).getByLabelText(/Estimated value/)).toHaveAttribute("aria-invalid", "true");
  });

  it("sends the value and added date to the server", async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({
      ok: true as const,
      data: opp({ id: "o9", title: "Sample new opportunity", estimatedValue: 75_000 }),
    }));
    show({ save, archive: vi.fn() });
    await user.click(screen.getByRole("button", { name: /Add opportunity/ }));
    const form = screen.getByRole("form", { name: "Add opportunity" });
    await user.type(within(form).getByLabelText("Opportunity"), "Sample new opportunity");
    await user.type(within(form).getByLabelText(/Estimated value/), "75,000");
    await user.type(within(form).getByLabelText("MAP owner"), "Sample Owner");
    await user.click(within(form).getByRole("button", { name: "Add opportunity" }));
    expect(save).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ estimatedValue: 75_000, addedOn: "2026-11-18" }),
      null
    );
    expect(await screen.findByText("$75,000")).toBeInTheDocument();
  });
});
