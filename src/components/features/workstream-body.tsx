"use client";

import type { ActionResult } from "@/types/action-result";
import type { PipelineActions } from "./pipeline-section";
import { useMemo, useState } from "react";
import type { WorkstreamOverview } from "@/types/views";
import { formatWeekdayDayMonth } from "@/lib/dates";
import { EMPTY_PROJECT_FILTERS } from "@/lib/filters";
import { workstreamTiles } from "@/lib/rollup";
import { StatTile } from "@/components/ui/stat-tile";
import { Delta, RagBar } from "./display";
import { PipelineSection } from "./pipeline-section";
import { ProjectList, type ListState } from "./project-list";

/**
 * Workstream landing body: weekly summary tiles, pipeline and project list. The include ticks
 * live here so the tiles recount as projects are ticked (local state until brief 05).
 */
export interface WorkstreamActions {
  setIncluded: (
    projectId: string,
    included: boolean
  ) => Promise<ActionResult<{ included: boolean }>>;
  pipeline: PipelineActions;
}

export function WorkstreamBody({
  v,
  now,
  actions,
}: {
  v: WorkstreamOverview;
  now: string;
  /** Saves on the server (brief 05); omitted in a closed week. */
  actions?: WorkstreamActions;
}) {
  const [problem, setProblem] = useState("");
  const [included, setIncluded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(v.projects.map((p) => [p.id, p.included]))
  );
  const [list, setList] = useState<ListState>({
    filters: EMPTY_PROJECT_FILTERS,
    page: 1,
    size: 25,
  });
  const [announce, setAnnounce] = useState("");

  const rows = useMemo(
    () => v.projects.map((p) => ({ ...p, included: included[p.id] })),
    [v.projects, included]
  );
  const t = workstreamTiles(rows, v.logs, v.pipeline, v.week.asOf, v.lastWeekEnd);

  function toggle(id: string) {
    const p = v.projects.find((x) => x.id === id);
    const next = !included[id];
    setIncluded((s) => ({ ...s, [id]: next }));
    setAnnounce(`${p?.name} ${next ? "included in" : "removed from"} the weekly report.`);
    setProblem("");
    if (!actions) return;
    void actions.setIncluded(id, next).then((r) => {
      if (!r.ok) {
        // Put the tick back and say why.
        setIncluded((s) => ({ ...s, [id]: !next }));
        setAnnounce("");
        setProblem(`${p?.name}: ${r.message}`);
      }
    });
  }

  return (
    <>
      <p role="status" className="sr-only">
        {announce}
      </p>
      {problem ? (
        <p role="alert" className="mb-4 bg-warning-tint px-4 py-3 text-[14px] font-medium">
          {problem}
        </p>
      ) : null}
      <section
        aria-label="Weekly summary"
        className="mb-9 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4"
      >
        <StatTile
          variant="navy"
          label="In weekly report"
          value={t.inReport}
          sub="projects selected"
        />
        <StatTile
          label="Projects in workstream"
          value={t.total}
          sub={`${t.total - t.inReport} not in report`}
        />
        <div className="bg-white p-5 sm:col-span-2">
          <p className="lbl">% spend, projects in report</p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <p className="text-[36px] font-light">{t.spend.under75}</p>
              <p className="mt-1.5 text-[14px]">under 75%</p>
            </div>
            <div>
              <p className="text-[36px] font-light">{t.spend.from75to100}</p>
              <p className="mt-1.5 text-[14px]">75–100%</p>
            </div>
            <div>
              <p className="text-[36px] font-light text-overspend">{t.spend.over100}</p>
              <p className="mt-1.5 text-[14px] font-medium text-overspend">over budget</p>
            </div>
          </div>
        </div>
        <StatTile
          label="No spend figure"
          value={t.spend.noFigure}
          sub={`${t.spend.noBudget} no budget · ${t.spend.noTimesheet} no timesheet data`}
        />
        <div className="bg-white p-5">
          <p className="lbl">Delivery RAG</p>
          <div className="mt-4">
            <RagBar counts={t.rag} subject={`${v.workstream.name} Delivery RAG`} />
          </div>
        </div>
        <StatTile
          label="Open risks"
          value={
            <>
              {t.risks}{" "}
              <Delta now={t.risks} prev={t.risksPrev} className="text-[15px] font-medium" />
            </>
          }
          sub={`${t.risksPrev} last week`}
        />
        <StatTile
          label="Open issues"
          value={
            <>
              {t.issues}{" "}
              <Delta now={t.issues} prev={t.issuesPrev} className="text-[15px] font-medium" />
            </>
          }
          sub={`${t.issuesPrev} last week`}
        />
        <StatTile
          label="Updates this week"
          value={
            <>
              {t.submitted} <span className="text-[18px]">of {t.inReport}</span>
            </>
          }
          sub={v.week.closed ? "week closed" : `due ${formatWeekdayDayMonth(v.week.closeDate)}`}
        />
        <StatTile label="Complete" value={t.complete} sub={`${t.onHold} on hold`} />
      </section>

      <PipelineSection
        workstreamId={v.workstream.id}
        workstreamName={v.workstream.name}
        initial={v.pipeline}
        readOnly={v.week.closed}
        today={v.week.asOf}
        actions={actions?.pipeline}
      />

      <ProjectList
        rows={v.projects}
        included={included}
        onToggle={toggle}
        state={list}
        onState={setList}
        submitters={v.submitters}
        week={v.week}
        now={now}
        workstreamName={v.workstream.name}
      />

      <p className="mt-4 text-[12px]">
        Job number, project name, workstream and % spend come from the weekly spend upload and
        can&apos;t be edited here. Status, RAG and % complete are each project&apos;s latest
        submission. Risk and issue counts include open and on-pause items only.
      </p>
    </>
  );
}
