// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/fields";
import { RagBadge } from "@/components/ui/rag-badge";
import { SegmentedControl } from "@/components/ui/segmented";
import { StatTile } from "@/components/ui/stat-tile";
import { Tabs } from "@/components/ui/tabs";

describe("UI primitives", () => {
  it("Button defaults to type=button and meets the 44px minimum", () => {
    render(<Button>Save</Button>);
    const b = screen.getByRole("button", { name: "Save" });
    expect(b).toHaveAttribute("type", "button");
    expect(b.className).toContain("min-h-11");
  });

  it("RagBadge shows the colour word and meaning, not colour alone", () => {
    render(<RagBadge rag="AMBER" />);
    expect(screen.getByText("Amber · At risk")).toBeInTheDocument();
  });

  it("fields link their label and error", () => {
    render(
      <>
        <TextField label="Title" error="Enter a title" />
        <SelectField label="Status" error="Choose a status">
          <option>In progress</option>
        </SelectField>
      </>
    );
    expect(screen.getByLabelText("Title")).toHaveAccessibleDescription("Enter a title");
    expect(screen.getByLabelText("Status")).toHaveAccessibleDescription("Choose a status");
  });

  it("SegmentedControl marks the selected option with aria-pressed", async () => {
    function Demo() {
      const [v, setV] = useState<"Open" | "Closed">("Open");
      return (
        <SegmentedControl
          label="Show"
          options={["Open", "Closed"] as const}
          value={v}
          onChange={setV}
        />
      );
    }
    render(<Demo />);
    await userEvent.click(screen.getByRole("button", { name: "Closed" }));
    expect(screen.getByRole("button", { name: "Closed" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Open" })).toHaveAttribute("aria-pressed", "false");
  });

  it("Tabs move with the arrow keys", async () => {
    function Demo() {
      const [v, setV] = useState<"risks" | "issues">("risks");
      return (
        <Tabs
          label="Logs"
          tabs={[
            { key: "risks", label: "Risk log" },
            { key: "issues", label: "Issue log" },
          ]}
          value={v}
          onChange={setV}
        >
          <p>{v}</p>
        </Tabs>
      );
    }
    render(<Demo />);
    await userEvent.click(screen.getByRole("tab", { name: "Risk log" }));
    await userEvent.keyboard("{ArrowRight}");
    const issues = screen.getByRole("tab", { name: "Issue log" });
    expect(issues).toHaveAttribute("aria-selected", "true");
    expect(issues).toHaveFocus();
  });

  it("StatTile renders label, value and sub-line", () => {
    render(<StatTile label="Open risks" value="4" sub="Sample" />);
    expect(screen.getByText("Open risks")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});
