// @vitest-environment jsdom
/** Brief 07: the Generate report dialog. Synthetic data only. */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { GenerateReport } from "@/components/features/report-dialog";
import type { ReportReadiness } from "@/types/report";

const readiness: ReportReadiness = {
  weekKey: "2026-W47",
  weekLabel: "Week 47 · 16–20 Nov 2026",
  weekDates: "16–20 Nov 2026",
  open: true,
  closesText: "Fri 20 Nov at 23:59",
  asOfText: "Tue 17 Nov 2026, 10:30",
  inReport: 4,
  submitted: 2,
  draft: 1,
  notStarted: 1,
  byWorkstream: [
    { name: "Sample One", inReport: 3, updated: 2, notUpdated: 1 },
    { name: "Sample Two", inReport: 1, updated: 0, notUpdated: 1 },
  ],
  notUpdated: [
    {
      jobNumber: "900001",
      name: "Sample project A",
      workstreamName: "Sample One",
      lastSubmittedAt: "2026-11-12T10:00:00.000Z",
      lastSubmittedBy: "Sample Person",
      state: "DRAFT",
    },
    {
      jobNumber: "900002",
      name: "Sample project B",
      workstreamName: "Sample Two",
      lastSubmittedAt: null,
      lastSubmittedBy: null,
      state: "NOT_STARTED",
    },
  ],
};

function show(r = readiness) {
  render(
    <GenerateReport
      kind="client"
      heading="Sample Client weekly report · Week 47"
      readiness={r}
      htmlHref="/clients/c/report?week=2026-W47"
      pptxHref="/clients/c/report.pptx?week=2026-W47"
    />
  );
}

describe("GenerateReport", () => {
  it("opens a labelled modal, moves focus in, and Escape returns focus to the button", async () => {
    const user = userEvent.setup();
    show();
    const opener = screen.getByRole("button", { name: "Generate report" });
    await user.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Sample Client weekly report · Week 47" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByRole("heading", { level: 2 })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("shows who has updated, by workstream, and who hasn't", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Generate report" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("2 of 4 projects updated this week")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("img", {
        name: "2 submitted, 1 draft saved, 1 not started, of 4 projects in the weekly report",
      })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/still open \(it closes Fri 20 Nov at 23:59\)/)
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("table", { name: "Updates by workstream" })
    ).toBeInTheDocument();
    const list = within(dialog).getByRole("table", { name: "Not updated this week (2)" });
    expect(within(list).getByText("Draft saved")).toBeInTheDocument();
    expect(within(list).getByText("Not started")).toBeInTheDocument();
    expect(within(dialog).getByText(/Drafts aren't used/)).toBeInTheDocument();
  });

  it("switches the button with the format and points at the right report", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Generate report" }));
    const dialog = screen.getByRole("dialog");
    const html = within(dialog).getByRole("link", { name: "Generate report" });
    expect(html).toHaveAttribute("href", "/clients/c/report?week=2026-W47");
    expect(html).toHaveAttribute("target", "_blank");
    await user.click(within(dialog).getByLabelText("PowerPoint (.pptx download)"));
    const pptx = within(dialog).getByRole("link", { name: "Generate PowerPoint" });
    expect(pptx).toHaveAttribute("href", "/clients/c/report.pptx?week=2026-W47");
    expect(pptx).toHaveAttribute("download");
  });

  it("keeps focus inside the dialog and Cancel closes it", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Generate report" }));
    const dialog = screen.getByRole("dialog");
    const generate = within(dialog).getByRole("link", { name: "Generate report" });
    generate.focus();
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says a closed week's figures are final", async () => {
    const user = userEvent.setup();
    show({ ...readiness, open: false, weekKey: "2026-W46", draft: 0, notStarted: 0 });
    await user.click(screen.getByRole("button", { name: "Generate report" }));
    expect(screen.getByText(/Week 46 has closed, so its figures are final/)).toBeInTheDocument();
  });
});
