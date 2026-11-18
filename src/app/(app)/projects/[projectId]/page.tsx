import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RiskIssueTable } from "@/components/features/risk-issue-table";
import { ClosedWeekNote, WeekPicker } from "@/components/features/week";
import { WeeklyUpdateForm } from "@/components/features/weekly-update-form";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { InternalPill } from "@/components/ui/pill";
import { RagBadge } from "@/components/ui/rag-badge";
import { pointsDeltaText } from "@/lib/delta";
import { formatDate, formatWeekdayDayMonth } from "@/lib/dates";
import { withWeek } from "@/lib/links";
import { canEditWeek } from "@/lib/permissions";
import { hasFigure, isOverBudget, spendLabel, spendPointsChange } from "@/lib/spend";
import { requireViewer } from "@/lib/viewer";
import { getRepository } from "@/server/repository";
import {
  archiveLogItemAction,
  createLogItemAction,
  saveWeeklyUpdateAction,
  updateLogItemAction,
} from "@/server/actions/weekly";
import type { LogActions } from "@/components/features/risk-issue-table";
import type { LogKind } from "@/types/domain";
import type { ProjectPageView } from "@/types/views";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectPage(props: PageProps<"/projects/[projectId]">) {
  const viewer = await requireViewer();
  const { week } = await props.searchParams;
  const repo = await getRepository(week);
  const { projectId } = await props.params;
  const v = repo.getProjectPage(projectId, week);
  if (!v) notFound();
  const p = v.project;
  const readOnly = !canEditWeek(viewer, v.week.closed);
  const weekKey = v.week.key;
  // Saving is only offered in the open week; the actions check again on the server.
  const onSave = readOnly
    ? undefined
    : async (
        kind: "DRAFT" | "SUBMITTED",
        values: { status: string; rag: string; percentComplete: number; updateText: string },
        version: string | null
      ) => {
        "use server";
        return saveWeeklyUpdateAction({ projectId, weekKey, kind, version, values });
      };
  const logActions = (kind: LogKind): LogActions | undefined =>
    readOnly
      ? undefined
      : {
          create: async (values) => {
            "use server";
            return createLogItemAction({ kind, projectId, weekKey, values });
          },
          update: async (id, values, version) => {
            "use server";
            return updateLogItemAction({ kind, id, weekKey, version, values });
          },
          archive: async (id, version) => {
            "use server";
            return archiveLogItemAction({ kind, id, weekKey, version });
          },
        };
  const clientHref = withWeek(`/clients/${v.client.id}`, v.week);
  const wsHref = withWeek(`/clients/${v.client.id}/workstreams/${v.workstream.id}`, v.week);
  const last = v.lastSubmission;
  const lastText = last
    ? `Last submission: ${formatDate(last.submittedAt?.slice(0, 10))} (week ${last.week.slice(-2).replace(/^0/, "")})${last.submittedByName ? ` by ${last.submittedByName}` : ""}.`
    : "No earlier submission.";
  const closedText = v.thisWeek?.notUpdated
    ? 'No update was submitted by the close, so last week\'s values were carried forward, marked "Not updated".'
    : v.thisWeek?.state === "SUBMITTED"
      ? `Submitted${v.submittedByName ? ` by ${v.submittedByName}` : ""}. This is the snapshot saved at the close.`
      : "No update in this week's snapshot.";

  return (
    <>
      <Breadcrumb
        items={[
          { label: v.client.name, href: clientHref },
          { label: v.workstream.name, href: wsHref },
          { label: p.jobNumber },
        ]}
      />
      <ClosedWeekNote week={v.week} basePath={`/projects/${p.id}`} />
      <div className="mt-2 mb-5 flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0 flex-[1_1_600px]">
          <p className="eyebrow mb-2.5">Project · {v.week.label}</p>
          <h1 className="text-[32px] leading-tight font-light break-words sm:text-[40px]">
            {p.name}
          </h1>
          <p className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[15px]">
            <span>
              Job {p.jobNumber} · {v.workstream.name} · {v.client.name}
              {p.lastSubmittedBy ? ` · Last submitted by ${p.lastSubmittedBy}` : ""} ·
            </span>
            {p.included ? (
              <span className="inline-flex h-6 items-center rounded-full border border-navy bg-pinned px-3 text-[12px] font-medium">
                In weekly report
              </span>
            ) : (
              <span className="inline-flex h-6 items-center rounded-full border border-navy bg-white px-3 text-[12px] font-medium">
                Not in weekly report
              </span>
            )}
            <InternalPill />
          </p>
        </div>
        <WeekPicker weeks={v.weeks} value={v.week.key} />
      </div>

      <div className="mb-9 flex flex-wrap gap-4">
        <section className="min-w-0 flex-[999_1_560px] bg-white p-5 sm:p-7">
          <WeeklyUpdateForm
            initial={v.form}
            submittedAt={v.thisWeek?.state === "SUBMITTED" ? v.thisWeek.submittedAt : null}
            spend={p.spend}
            readOnly={readOnly}
            dueLabel={formatWeekdayDayMonth(v.week.closeDate)}
            lastSubmissionText={lastText}
            closedText={closedText}
            now={repo.now().toISOString()}
            version={v.thisWeek?.updatedAt ?? null}
            onSave={onSave}
          />
        </section>
        <aside
          aria-label="Spend and RAG history"
          className="flex min-w-0 flex-[1_1_360px] flex-col gap-4"
        >
          <SpendPanel v={v} />
          <section aria-labelledby="ragh-h" className="bg-white p-6">
            <h2 id="ragh-h" className="lbl mb-3.5">
              Delivery RAG, last {v.ragHistory.length} weeks
            </h2>
            <ol className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
              {v.ragHistory.map((h) => (
                <li key={h.week} className="flex flex-col gap-1 text-[11px]">
                  <span>
                    {h.week}
                    {h.current ? (v.week.closed ? " (this week)" : " (now)") : ""}
                  </span>
                  {h.rag ? (
                    <RagBadge rag={h.rag} className="self-start !text-[12px]" />
                  ) : (
                    <span>No update</span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      <RiskIssueTable
        kind="RISK"
        initial={v.risks}
        projectId={p.id}
        clientId={v.client.id}
        nextSeq={(repo.logSeq[v.client.id]?.RISK ?? 0) + 1}
        today={v.week.asOf}
        readOnly={readOnly}
        defaultOwner={viewer.name}
        actions={logActions("RISK")}
      />
      <RiskIssueTable
        kind="ISSUE"
        initial={v.issues}
        projectId={p.id}
        clientId={v.client.id}
        nextSeq={(repo.logSeq[v.client.id]?.ISSUE ?? 0) + 1}
        today={v.week.asOf}
        readOnly={readOnly}
        defaultOwner={viewer.name}
        actions={logActions("ISSUE")}
      />
    </>
  );
}

/** % of budget spent, change on last week, and the 8-week spend vs complete chart. */
function SpendPanel({ v }: { v: ProjectPageView }) {
  const spend = v.project.spend;
  const over = isOverBudget(spend);
  const change = spendPointsChange(spend, v.spendPrev);
  const max = 1.2;
  const h = (x: number) => `${Math.min((x / max) * 100, 100)}%`;
  const described = v.spendTrend
    .map(
      (t) =>
        `${t.week}: spend ${hasFigure(t.spend) ? spendLabel(t.spend) : "no figure"}, complete ${t.percentComplete === null ? "no update" : `${t.percentComplete}%`}`
    )
    .join("; ");
  return (
    <section aria-labelledby="spend-h" className="bg-white p-6">
      <h2 id="spend-h" className="lbl">
        % of budget spent
      </h2>
      <div className="mt-2.5 flex flex-wrap items-baseline gap-3">
        <span className={`text-[44px] font-light ${over ? "text-overspend" : ""}`}>
          {spendLabel(spend)}
        </span>
        {over || change !== null ? (
          <span className={`text-[14px] font-medium ${over ? "text-overspend" : ""}`}>
            {over ? "Over budget" : ""}
            {over && change !== null ? " · " : ""}
            {change !== null ? `${pointsDeltaText(change)} on last week` : ""}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[13px] text-muted">
        From the spend upload of {formatDate(v.latestUpload?.upload.extractDate)}. Can&apos;t be
        edited here; corrections arrive with the next upload.
      </p>
      <div className="mt-5">
        <div aria-hidden="true" className="mb-2 flex gap-4 text-[12px]">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 bg-orange" />% spend
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 bg-navy" />% complete
          </span>
        </div>
        <div
          role="img"
          aria-label={`% spend and % complete by week. ${described}.`}
          className="relative flex h-[140px] items-end gap-1.5 border-b border-navy"
        >
          <div
            aria-hidden="true"
            className="absolute inset-x-0 border-t border-dashed border-muted"
            style={{ bottom: h(1) }}
          />
          {v.spendTrend.map((t) => (
            <div key={t.week} className="flex h-full flex-1 items-end justify-center gap-0.5">
              <div
                className="w-[40%] bg-orange"
                style={{ height: hasFigure(t.spend) ? h(t.spend.percentSpent as number) : "0%" }}
              />
              <div
                className="w-[40%] bg-navy"
                style={{ height: h((t.percentComplete ?? 0) / 100) }}
              />
            </div>
          ))}
        </div>
        <div aria-hidden="true" className="mt-1.5 flex gap-1.5">
          {v.spendTrend.map((t) => (
            <span key={t.week} className="flex-1 text-center text-[11px]">
              {t.week}
            </span>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-muted">
          Dashed line = 100% of budget.
          {hasFigure(spend) ? "" : " No spend figure in the upload, so there are no spend bars."}
        </p>
      </div>
    </section>
  );
}
