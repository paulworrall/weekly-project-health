"use client";

import Link from "next/link";
import { useId } from "react";
import type { Rag } from "@/types/domain";
import type { ProjectRow, WeekContext } from "@/types/views";
import { formatDateTime, relativeDays } from "@/lib/dates";
import { filterProjects, type ProjectFilters } from "@/lib/filters";
import { pageSlice } from "@/lib/pagination";
import { RAG_VALUES, ragLabel } from "@/lib/rag";
import { sortProjects } from "@/lib/sorting";
import { withWeek } from "@/lib/links";
import { SegmentedControl } from "@/components/ui/segmented";
import { RagBadge } from "@/components/ui/rag-badge";
import { PinIcon } from "@/components/ui/icons";
import { ProjectStatusPill, SpendCell, TableScroll, tableClass, td } from "./display";
import { Pagination } from "./pagination";

const SHOW = { IN: "In report", OUT: "Not in report", ALL: "All" } as const;
const SHOW_BY_LABEL = Object.fromEntries(Object.entries(SHOW).map(([k, v]) => [v, k])) as Record<
  string,
  ProjectFilters["show"]
>;

const selectClass =
  "min-h-11 cursor-pointer border border-navy bg-white px-3 text-[14px] text-navy";

export interface ListState {
  filters: ProjectFilters;
  page: number;
  size: number;
}

/**
 * Project list (decision log: "Project selection lives on the workstream page"): include tick
 * with included projects pinned and highlighted, filters, Clear filters and pagination. Any
 * filter change resets to page 1. State is owned by the parent so the tiles update with the ticks.
 */
export function ProjectList({
  rows,
  included,
  onToggle,
  state,
  onState,
  submitters,
  week,
  now,
  workstreamName,
}: {
  rows: ProjectRow[];
  included: Record<string, boolean>;
  onToggle: (id: string) => void;
  state: ListState;
  onState: (s: ListState) => void;
  submitters: string[];
  week: WeekContext;
  now: string;
  workstreamName: string;
}) {
  const ids = { q: useId(), sub: useId(), rag: useId(), week: useId(), spend: useId() };
  const readOnly = week.closed;
  const withInc = rows.map((r) => ({ ...r, included: included[r.id] ?? r.included }));
  const matches = sortProjects(filterProjects(withInc, state.filters));
  const visible = pageSlice(matches, state.page, state.size);
  const setFilter = <K extends keyof ProjectFilters>(k: K, v: ProjectFilters[K]) =>
    onState({ ...state, filters: { ...state.filters, [k]: v }, page: 1 });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-[26px] font-light">Projects</h2>
        <span className="text-[14px]" role="status">
          {matches.length} match · {rows.length} in this workstream
        </span>
      </div>

      <form
        aria-label="Filter projects"
        onSubmit={(e) => e.preventDefault()}
        className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] items-end gap-4"
      >
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor={ids.q} className="lbl">
            Search
          </label>
          <input
            id={ids.q}
            type="search"
            placeholder="Job number, project or person"
            value={state.filters.q}
            onChange={(e) => setFilter("q", e.target.value)}
            className={`${selectClass} cursor-text`}
          />
        </div>
        <SegmentedControl
          label="Show"
          options={Object.values(SHOW)}
          value={SHOW[state.filters.show]}
          onChange={(v) => setFilter("show", SHOW_BY_LABEL[v])}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.sub} className="lbl">
            Last submitted by
          </label>
          <select
            id={ids.sub}
            value={state.filters.submitter}
            onChange={(e) => setFilter("submitter", e.target.value)}
            className={selectClass}
          >
            <option value="">Anyone</option>
            {submitters.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.rag} className="lbl">
            Delivery RAG
          </label>
          <select
            id={ids.rag}
            value={state.filters.rag}
            onChange={(e) => setFilter("rag", e.target.value as Rag | "")}
            className={selectClass}
          >
            <option value="">Any</option>
            {RAG_VALUES.map((r) => (
              <option key={r} value={r}>
                {ragLabel(r)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.week} className="lbl">
            This week
          </label>
          <select
            id={ids.week}
            value={state.filters.thisWeek}
            onChange={(e) => setFilter("thisWeek", e.target.value as ProjectFilters["thisWeek"])}
            className={selectClass}
          >
            <option value="">Any</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="NOT_SUBMITTED">Not submitted</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.spend} className="lbl">
            % spend
          </label>
          <select
            id={ids.spend}
            value={state.filters.spend}
            onChange={(e) => setFilter("spend", e.target.value as ProjectFilters["spend"])}
            className={selectClass}
          >
            <option value="">Any</option>
            <option value="OVER">Over budget</option>
            <option value="NO_BUDGET">No budget</option>
            <option value="NO_TIMESHEET">No timesheet data</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() =>
            onState({
              ...state,
              page: 1,
              filters: { q: "", show: "ALL", submitter: "", rag: "", thisWeek: "", spend: "" },
            })
          }
          className="min-h-11 cursor-pointer border border-dashed border-navy bg-transparent px-4 text-[14px]"
        >
          Clear filters
        </button>
      </form>

      <div role="note" className="flex items-center gap-2.5 bg-pinned px-4 py-3 text-[14px]">
        <PinIcon aria-hidden="true" />
        <span>
          Projects ticked for the weekly report are pinned to the top. Any Updater can tick or
          untick them; changes are kept in the history.
          {readOnly ? " Ticks can't be changed in a closed week." : ""}
        </span>
      </div>

      <TableScroll label={`Projects in ${workstreamName}`}>
        <table className={`${tableClass} min-w-[1180px] border-t-2 border-navy`}>
          <caption className="sr-only">Projects in the {workstreamName} workstream</caption>
          <thead>
            <tr className="text-left text-[11px] tracking-[0.08em] uppercase">
              <th scope="col" className="w-16 px-2.5 py-3 font-medium">
                Weekly report
              </th>
              <th scope="col" className="px-2.5 py-3 font-medium">
                Job no.
              </th>
              <th scope="col" className="px-2.5 py-3 font-medium">
                Project
              </th>
              <th scope="col" className="px-2.5 py-3 font-medium">
                Last submitted by
              </th>
              <th scope="col" className="px-2.5 py-3 font-medium">
                Last submitted
              </th>
              <th scope="col" className="px-2.5 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-2.5 py-3 font-medium">
                Delivery RAG
              </th>
              <th scope="col" className="px-2.5 py-3 text-right font-medium">
                % complete
              </th>
              <th scope="col" className="px-2.5 py-3 text-right font-medium">
                % spend
              </th>
              <th scope="col" className="px-2.5 py-3 text-right font-medium">
                Risks
              </th>
              <th scope="col" className="px-2.5 py-3 text-right font-medium">
                Issues
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const on = r.included;
              return (
                <tr key={r.id} className={`border-b border-line ${on ? "bg-pinned" : "bg-white"}`}>
                  <td className={td}>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={readOnly}
                      onChange={() => onToggle(r.id)}
                      aria-label={`${on ? "Remove" : "Include"} ${r.name} ${on ? "from" : "in"} the weekly report`}
                      className="size-6 cursor-pointer accent-navy disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className={`${td} font-medium`}>{r.jobNumber}</td>
                  <td className={`${td} max-w-[320px]`}>
                    {on ? <Link href={withWeek(`/projects/${r.id}`, week)}>{r.name}</Link> : r.name}
                  </td>
                  <td className={td}>{on ? (r.lastSubmittedBy ?? "—") : "—"}</td>
                  <td className={td}>
                    {on && r.lastSubmittedAt ? (
                      <>
                        <div>{formatDateTime(r.lastSubmittedAt)}</div>
                        {r.submittedThisWeek ? (
                          <div className="mt-0.5 text-[12px]">
                            {relativeDays(r.lastSubmittedAt, new Date(now))}
                          </div>
                        ) : (
                          <div className="mt-1 inline-block bg-warning-tint px-2 py-0.5 text-[12px] font-medium">
                            {r.notUpdated ? "Not updated · carried forward" : "Not this week"}
                          </div>
                        )}
                      </>
                    ) : on ? (
                      <span className="inline-block bg-warning-tint px-2 py-0.5 text-[12px] font-medium">
                        Never submitted
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={td}>
                    {on && r.status ? <ProjectStatusPill status={r.status} /> : "—"}
                  </td>
                  <td className={td}>{on && r.rag ? <RagBadge rag={r.rag} /> : "—"}</td>
                  <td className={`${td} text-right`}>
                    {on && r.percentComplete !== null ? `${r.percentComplete}%` : "—"}
                  </td>
                  <td className={`${td} text-right`}>
                    <SpendCell spend={r.spend} />
                  </td>
                  <td className={`${td} text-right`}>{on ? r.openRisks : "—"}</td>
                  <td className={`${td} text-right`}>{on ? r.openIssues : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableScroll>
      {matches.length ? (
        <Pagination
          label="Project list pages"
          page={state.page}
          size={state.size}
          total={matches.length}
          onPage={(page) => onState({ ...state, page })}
          onSize={(size) => onState({ ...state, size, page: 1 })}
        />
      ) : (
        <p className="px-2.5 py-6 text-[14px]">No projects match these filters.</p>
      )}
    </>
  );
}
