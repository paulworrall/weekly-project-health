// @vitest-environment jsdom
/**
 * Brief 08: automated accessibility checks (axe-core, WCAG 2.2 A and AA rules) on every main
 * screen's components, rendered with the synthetic sample data. Colour contrast can't be
 * measured in jsdom, so it is checked on the colour tokens in tests/lib/contrast.test.ts.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
  usePathname: () => "/clients",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { ClientCard } from "@/components/features/client-card";
import { ClientsManager } from "@/components/features/clients-manager";
import { Forbidden } from "@/components/features/forbidden";
import { LoginForm } from "@/components/features/login-form";
import { LogView } from "@/components/features/log-view";
import { PipelineSection } from "@/components/features/pipeline-section";
import { GenerateReport } from "@/components/features/report-dialog";
import { RiskIssueTable } from "@/components/features/risk-issue-table";
import { UploadForm } from "@/components/features/upload-form";
import { UploadPreview } from "@/components/features/upload-preview";
import { UsersManager } from "@/components/features/users-manager";
import { WeeklyUpdateForm } from "@/components/features/weekly-update-form";
import { WorkstreamBody } from "@/components/features/workstream-body";
import { ReportSlides } from "@/components/report/report-slides";
import NotFound from "@/app/(app)/not-found";
import { buildReport, reportReadiness } from "@/lib/report";
import {
  DEFAULT_CLIENT_ID,
  getClientList,
  getClients,
  getLogData,
  getUploadsView,
  getWorkstreamOverview,
  mockDataset,
} from "@/mocks/repository";
import { createViews } from "@/lib/views";

const ok = async () => ({ ok: true as const, data: null });

/** Every axe violation as "rule: what · element", so a failure says what to fix. */
async function violations(node: Element): Promise<string[]> {
  const result = await axe.run(node, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    rules: { "color-contrast": { enabled: false } },
  });
  return result.violations.flatMap((v) =>
    v.nodes.map((n) => `${v.id}: ${v.help} · ${n.html.slice(0, 120)}`)
  );
}

async function expectAccessible(ui: ReactNode) {
  const { container } = render(<main>{ui}</main>);
  expect(await violations(container)).toEqual([]);
}

describe("accessibility (axe)", () => {
  it("the check itself catches problems", async () => {
    const { container } = render(
      <main>
        <input type="text" />
        <button type="button" />
      </main>
    );
    const found = await violations(container);
    expect(found.some((v) => v.startsWith("label:"))).toBe(true);
    expect(found.some((v) => v.startsWith("button-name:"))).toBe(true);
  });

  it("sign in", async () => {
    await expectAccessible(<LoginForm action={async () => ({ status: "idle" })} />);
  });

  it("client card (Admin home and client list)", async () => {
    await expectAccessible(<ClientCard c={getClientList()[0]} />);
  });

  it("workstream page: tiles, project list and pipeline", async () => {
    await expectAccessible(
      <WorkstreamBody
        v={getWorkstreamOverview(DEFAULT_CLIENT_ID, "alpha-eu")!}
        now="2026-11-17T10:30:00Z"
      />
    );
  });

  it("project page: weekly update form and risk table", async () => {
    await expectAccessible(
      <>
        <WeeklyUpdateForm
          submittedAt={null}
          spend={{ percentSpent: 1.12, spendStatus: "VALUE" }}
          readOnly={false}
          dueLabel="Fri 20 Nov"
          lastSubmissionText="Last submission: 13 Nov 2026 (week 46)."
          now="2026-11-17T10:30:00Z"
          version={null}
          initial={{
            status: "IN_PROGRESS",
            rag: "AMBER",
            percentComplete: 40,
            updateText: "",
            state: null,
          }}
        />
        <RiskIssueTable
          kind="RISK"
          initial={mockDataset.logItems.filter((l) => l.kind === "RISK").slice(0, 3)}
          projectId="p"
          clientId={DEFAULT_CLIENT_ID}
          nextSeq={99}
          today="2026-11-17"
          readOnly={false}
          defaultOwner="Sample Owner"
        />
      </>
    );
  });

  it("risk and issue log", async () => {
    await expectAccessible(
      <LogView data={getLogData(DEFAULT_CLIENT_ID)!} kind="RISK" initialWs="" />
    );
  });

  it("pipeline with the add form open", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <main>
        <PipelineSection
          workstreamId="alpha-eu"
          workstreamName="Alpha EU"
          initial={mockDataset.pipeline.slice(0, 3)}
          readOnly={false}
          today="2026-11-17"
        />
      </main>
    );
    const add = screen.queryByRole("button", { name: /add an opportunity/i });
    if (add) await user.click(add);
    expect(await violations(container)).toEqual([]);
  });

  it("spend uploads: form and preview", async () => {
    const v = getUploadsView(DEFAULT_CLIENT_ID)!;
    await expectAccessible(
      <>
        <UploadForm
          clients={getClients()}
          clientId={DEFAULT_CLIENT_ID}
          today="2026-11-17"
          check={async () => ({ ok: true, data: { status: "READY_TO_REVIEW", errors: 0 } })}
        />
        <UploadPreview
          uploadId="up-1"
          changes={v.staged!.changes}
          fileChecks={v.staged!.fileChecks}
          clientName={v.client.name}
          rowCount={636}
          actions={{
            decide: ok,
            confirm: async () => ({ ok: true, data: { rows: 636 } }),
            cancel: ok,
          }}
        />
      </>
    );
  });

  it("generate report dialog, open", async () => {
    const user = userEvent.setup();
    const views = createViews(mockDataset);
    const { container } = render(
      <main>
        <GenerateReport
          kind="client"
          heading="Northwind Drinks weekly report · Week 47"
          readiness={reportReadiness(
            views,
            { clientId: DEFAULT_CLIENT_ID },
            undefined,
            mockDataset.now
          )!}
          htmlHref="/clients/northwind/report?week=2026-W47"
          pptxHref="/clients/northwind/report.pptx?week=2026-W47"
        />
      </main>
    );
    await user.click(screen.getByRole("button", { name: "Generate report" }));
    expect(await violations(container)).toEqual([]);
  });

  it("report slides", async () => {
    const views = createViews(mockDataset);
    const report = buildReport(views, { clientId: DEFAULT_CLIENT_ID }, undefined, mockDataset.now)!;
    await expectAccessible(<ReportSlides report={report} />);
  });

  it("admin: clients and users", async () => {
    await expectAccessible(
      <>
        <ClientsManager
          clients={[
            {
              id: "c1",
              name: "Sample Foods",
              workstreams: 3,
              reported: 2,
              projects: 40,
              latestUpload: "2026-11-16",
              archivedAt: null,
            },
            {
              id: "c2",
              name: "Old Sample",
              workstreams: 1,
              reported: 0,
              projects: 2,
              latestUpload: null,
              archivedAt: "2026-10-01T09:00:00.000Z",
            },
          ]}
          actions={{
            create: async () => ({ ok: true, data: { id: "c3", name: "New" } }),
            rename: async () => ({ ok: true, data: { name: "New" } }),
            archive: ok,
            restore: ok,
          }}
        />
        <UsersManager
          now="2026-11-17T10:30:00Z"
          actions={{
            create: async () => ({
              ok: true,
              data: { name: "A", email: "a@example.com", temporaryPassword: "x" },
            }),
            changeRole: async () => ({ ok: true, data: { role: "ADMIN" } }),
            resetPassword: async () => ({ ok: true, data: { name: "A", temporaryPassword: "x" } }),
            unlock: ok,
            archive: ok,
            restore: ok,
          }}
          users={[
            {
              id: "u1",
              name: "Sample Admin",
              email: "admin@example.com",
              role: "ADMIN",
              lastSignInAt: "2026-11-17T09:00:00.000Z",
              archivedAt: null,
              lockedUntil: null,
              mustChangePassword: false,
              hasPassword: true,
              isSelf: true,
            },
            {
              id: "u2",
              name: "Sample Updater",
              email: "updater@example.com",
              role: "UPDATER",
              lastSignInAt: null,
              archivedAt: null,
              lockedUntil: "2099-01-01T00:00:00.000Z",
              mustChangePassword: true,
              hasPassword: true,
              isSelf: false,
            },
          ]}
        />
      </>
    );
  });

  it("not found and no access", async () => {
    await expectAccessible(
      <>
        <NotFound />
        <Forbidden backHref="/clients" />
      </>
    );
  });
});
