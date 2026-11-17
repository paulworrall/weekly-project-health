"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { LogKind, LogLevel } from "@/types/domain";
import type { LogData } from "@/types/views";
import {
  AGE_BAND_LABEL,
  AGE_BAND_SHORT,
  ageInDays,
  ageText,
  isOverdue,
  overdueText,
  type AgeBand,
} from "@/lib/ageing";
import { formatDate, formatWeekdayDayMonth } from "@/lib/dates";
import { deltaText } from "@/lib/delta";
import { EMPTY_LOG_FILTERS, filterLog, type LogFilters } from "@/lib/filters";
import { LEVEL_LABEL, LOG_STATUS_LABEL, levelHeading, levelsFor } from "@/lib/labels";
import { withWeek } from "@/lib/links";
import { byWorkstream, logSummary, monthOnMonth, weekOnWeek } from "@/lib/logs";
import { sortLog } from "@/lib/sorting";
import { parseWeekParam, type WeekRef } from "@/lib/week";
import {
  Delta,
  LevelTag,
  LogStatusPill,
  TableScroll,
  tableClass,
  tbodyRow,
  td,
  th,
  theadRow,
} from "./display";
import { WeekPicker } from "./week";

const BAR: Record<LogLevel, string> = {
  BLOCKER: "bg-blocker",
  HIGH: "bg-navy",
  MEDIUM: "bg-rag-amber",
  LOW: "bg-disabled",
};

const selectClass = "min-h-11 cursor-pointer border border-navy bg-white px-3 text-[14px]";
const PREVIEW = 12;

/** Risk log / Issue log (decision log: "Risk log and issue log"). Items are edited on project pages. */
export function LogView({
  data,
  kind,
  initialWs,
}: {
  data: LogData;
  kind: LogKind;
  initialWs: string;
}) {
  const router = useRouter();
  const ids = { ws: useId(), q: useId(), lvl: useId(), st: useId(), age: useId() };
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [ws, setWs] = useState(data.workstreams.some((w) => w.id === initialWs) ? initialWs : "");
  const [filters, setFilters] = useState<LogFilters>(EMPTY_LOG_FILTERS);
  const [all, setAll] = useState(false);

  const isRisk = kind === "RISK";
  const name = isRisk ? "Risks" : "Issues";
  const lower = name.toLowerCase();
  const levelHead = levelHeading(kind);
  const levels = levelsFor(kind) as readonly LogLevel[];
  const today = data.week.asOf;
  const ref = data.week.ref;
  const clientBase = `/clients/${data.client.id}`;

  const scoped = data.items.filter((i) => i.kind === kind && (!ws || i.workstreamId === ws));
  const s = logSummary(scoped, kind, ref, today);
  const chartWeeks = data.chartWeeks.map((k) => parseWeekParam(k) as WeekRef);
  const wow = weekOnWeek(scoped, kind, chartWeeks, today);
  const mom = monthOnMonth(scoped, kind, today, 4);
  const wsRows = byWorkstream(
    data.items.filter((i) => i.kind === kind),
    kind,
    data.workstreams.filter((w) => !ws || w.id === ws),
    ref,
    today
  );
  const list = sortLog(filterLog(scoped, filters, today));
  const shown = all ? list : list.slice(0, PREVIEW);
  const maxOpen = Math.max(1, ...wow.map((w) => w.open));
  const wsName = data.workstreams.find((w) => w.id === ws)?.name;
  const prevMonth = mom.length > 1 ? mom[mom.length - 2] : null;

  function go(k: LogKind) {
    const path = `${clientBase}/${k === "RISK" ? "risks" : "issues"}${ws ? `?ws=${ws}` : ""}`;
    router.push(withWeek(path, data.week));
  }

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>) {
    // Two tabs: the arrow keys move to the other one; Home and End go to the first and last.
    const target: LogKind | null =
      e.key === "ArrowRight" || e.key === "ArrowLeft"
        ? isRisk
          ? "ISSUE"
          : "RISK"
        : e.key === "Home"
          ? "RISK"
          : e.key === "End"
            ? "ISSUE"
            : null;
    if (!target) return;
    e.preventDefault();
    tabRefs.current[target === "RISK" ? 0 : 1]?.focus();
    if (target !== kind) go(target);
  }

  const setF = <K extends keyof LogFilters>(k: K, v: LogFilters[K]) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setAll(false);
  };

  return (
    <>
      <div className="mt-2 mb-5 flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0 flex-[1_1_520px]">
          <p className="eyebrow mb-2.5">
            {isRisk ? "Risk log" : "Issue log"} · {data.week.label}
          </p>
          <h1 className="text-[40px] leading-tight font-light sm:text-[48px]">
            {isRisk ? "Risk log" : "Issue log"}
          </h1>
          <p className="mt-2.5 text-[15px]">
            {wsName
              ? `${wsName} · ${data.client.name}`
              : `${data.client.name} · all ${data.workstreams.length} reported workstreams`}{" "}
            · {scoped.length} {lower} logged, {s.open} open
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div role="tablist" aria-label="Log" className="flex">
            {(["RISK", "ISSUE"] as const).map((k, i) => {
              const on = k === kind;
              return (
                <button
                  key={k}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls="log-panel"
                  tabIndex={on ? 0 : -1}
                  onClick={() => !on && go(k)}
                  onKeyDown={onTabKey}
                  className={`-ml-px min-h-11 cursor-pointer border border-navy px-5.5 text-[14px] font-medium first:ml-0 ${on ? "bg-navy text-cream" : "bg-white"}`}
                >
                  {k === "RISK" ? "Risk log" : "Issue log"}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={ids.ws} className="lbl">
              Workstream
            </label>
            <select
              id={ids.ws}
              value={ws}
              onChange={(e) => {
                setWs(e.target.value);
                setAll(false);
              }}
              className={selectClass}
            >
              <option value="">All reported workstreams</option>
              {data.workstreams.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <WeekPicker weeks={data.weeks} value={data.week.key} stacked />
        </div>
      </div>

      <div id="log-panel" role="tabpanel" aria-label={isRisk ? "Risk log" : "Issue log"}>
        <section
          aria-label="Summary"
          className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4"
        >
          <div className="bg-navy p-5 text-cream">
            <p className="text-[13px] font-medium tracking-[0.1em] uppercase">Open</p>
            <p className="mt-2.5 text-[40px] leading-none font-light">{s.open}</p>
            <p className="mt-1 text-[14px]">
              {s.openOnly} open · {s.onPause} on pause
            </p>
            <p className="mt-2.5 text-[13px] font-medium">
              <Delta now={s.open} prev={s.openLastWeek} period="on last week" showPeriod />
            </p>
            <p className="mt-0.5 text-[13px] font-medium">
              <Delta now={s.open} prev={s.open4WeeksAgo} period="on 4 weeks ago" showPeriod />
            </p>
          </div>
          <div className="bg-white p-5 sm:col-span-2">
            <p className="lbl">{levelHead}</p>
            <div
              role="img"
              aria-label={`${name} by ${levelHead.toLowerCase()}: ${levels.map((l) => `${s.byLevel[l]} ${LEVEL_LABEL[l]}`).join(", ")}`}
              className="mt-4 flex h-4 bg-track"
            >
              {levels.map((l) => (
                <div
                  key={l}
                  className={BAR[l]}
                  style={{ width: `${s.open ? (s.byLevel[l] / s.open) * 100 : 0}%` }}
                />
              ))}
            </div>
            <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-2" aria-hidden="true">
              {levels.map((l) => (
                <div key={l} className="flex items-center gap-2 text-[14px]">
                  <LevelTag level={l} />
                  <span className="text-[22px] font-light">{s.byLevel[l]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-5">
            <p className="lbl">Average age</p>
            <p className="mt-2.5 text-[40px] leading-none font-light">
              {s.avgAge} <span className="text-[16px]">days</span>
            </p>
            <p className="mt-1 text-[14px]">
              <Delta
                now={s.avgAge}
                prev={s.avgAgeLastMonth}
                period={`days on ${prevMonth?.month ?? "last month"}`}
                showPeriod
              />
            </p>
            <p className="mt-2 text-[13px] text-muted">
              Oldest: {s.oldest ? `${s.oldest.ref}, ${s.oldest.days} days` : "—"}
            </p>
          </div>
          <div className="bg-white p-5">
            <p className="lbl">This week</p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <div>
                <p className="text-[32px] font-light">{s.raisedThisWeek}</p>
                <p className="text-[13px]">raised</p>
              </div>
              <div>
                <p className="text-[32px] font-light">{s.closedThisWeek}</p>
                <p className="text-[13px]">closed</p>
              </div>
            </div>
            <p className="mt-2 text-[13px] text-muted">
              {mom.at(-1)?.month} to date: {s.raisedMonthToDate} raised · {s.closedMonthToDate}{" "}
              closed
            </p>
          </div>
          <div className="bg-white p-5">
            <p className="lbl">Ageing</p>
            <div className="mt-3 grid gap-1.5 text-[14px]">
              {(Object.keys(s.ageing) as AgeBand[]).map((b) => (
                <div key={b} className="flex items-center gap-2">
                  <span className="w-[78px]">{AGE_BAND_SHORT[b]}</span>
                  <div className="h-2.5 flex-1 bg-track" aria-hidden="true">
                    <div
                      className={`h-full ${b === "OVER_30" ? "bg-overspend" : "bg-navy"}`}
                      style={{ width: `${s.open ? (s.ageing[b] / s.open) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-6 text-right font-medium">{s.ageing[b]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-5">
            <p className="lbl">Overdue</p>
            <p className="mt-2.5 text-[40px] leading-none font-light text-overspend">{s.overdue}</p>
            <p className="mt-1 text-[14px]">
              {s.open ? `${s.overdueShare}% of open ${lower}` : "None open"}
            </p>
            <p className="mt-2 text-[13px] text-muted">
              {data.week.closed
                ? `${s.dueByClose} were due by the close`
                : `${s.dueByClose} more due by ${formatWeekdayDayMonth(data.week.closeDate)}`}
            </p>
          </div>
        </section>

        <div className="mb-6 flex flex-wrap gap-4">
          <section aria-labelledby="wow-h" className="min-w-0 flex-[3_1_560px] bg-white p-6">
            <div className="flex flex-wrap justify-between gap-2">
              <h2 id="wow-h" className="text-[20px] font-light">
                Week on week
              </h2>
              <span aria-hidden="true" className="inline-flex items-center gap-1.5 text-[12px]">
                <span className="size-2.5 bg-navy" />
                Open at week end
              </span>
            </div>
            <div
              role="img"
              aria-label={`Open ${lower} at the end of each week, ${wow[0]?.label} to ${wow.at(-1)?.label}: ${wow.map((w) => `${w.label} ${w.open}`).join(", ")}`}
              className="mt-4.5 flex h-[170px] items-end gap-2 border-b border-navy"
            >
              {wow.map((w) => (
                <div
                  key={w.label}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                >
                  <span className="text-[12px] font-medium">{w.open}</span>
                  <div
                    className={`w-[70%] ${w.current ? "bg-orange" : "bg-navy"}`}
                    style={{ height: `${(w.open / maxOpen) * 80}%` }}
                  />
                </div>
              ))}
            </div>
            <TableScroll label="Raised and closed per week">
              <table className="mt-1.5 w-full table-fixed border-collapse text-[12px]">
                <caption className="sr-only">Raised and closed per week</caption>
                <tbody>
                  {(["label", "raised", "closed"] as const).map((rowKey) => (
                    <tr key={rowKey}>
                      <th scope="row" className="w-16 py-1 text-left font-normal text-muted">
                        {rowKey === "label" ? "Week" : rowKey === "raised" ? "Raised" : "Closed"}
                      </th>
                      {wow.map((w) => (
                        <td key={w.label} className="py-1 text-center">
                          {w[rowKey]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <p className="mt-2.5 text-[12px] text-muted">
              {data.week.closed
                ? "From closed-week figures."
                : `From closed-week figures; week ${ref.isoWeek} is live until the week closes.`}
            </p>
          </section>
          <section aria-labelledby="mom-h" className="min-w-0 flex-[2_1_400px] bg-white p-6">
            <h2 id="mom-h" className="mb-3.5 text-[20px] font-light">
              Month on month
            </h2>
            <TableScroll label="Month on month">
              <table className={tableClass}>
                <thead>
                  <tr className={theadRow}>
                    <th scope="col" className={`${th} pl-0`}>
                      Month
                    </th>
                    <th scope="col" className={`${th} text-right`}>
                      Open at end
                    </th>
                    <th scope="col" className={`${th} text-right`}>
                      Change
                    </th>
                    <th scope="col" className={`${th} text-right`}>
                      Raised
                    </th>
                    <th scope="col" className={`${th} text-right`}>
                      Closed
                    </th>
                    <th scope="col" className={`${th} text-right`}>
                      Avg age
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mom.map((m) => (
                    <tr key={m.month} className={tbodyRow}>
                      <th scope="row" className="py-2.5 pr-2 text-left font-normal">
                        {m.month}
                      </th>
                      <td className="px-2 py-2.5 text-right font-medium">{m.open}</td>
                      <td className="px-2 py-2.5 text-right">
                        {m.change === null ? "—" : deltaText(m.open, m.open - m.change)}
                      </td>
                      <td className="px-2 py-2.5 text-right">{m.raised}</td>
                      <td className="px-2 py-2.5 text-right">{m.closed}</td>
                      <td className="px-2 py-2.5 text-right">{m.avgAge} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <p className="mt-2.5 text-[12px] text-muted">{mom.at(-1)?.month} is month to date.</p>
          </section>
        </div>

        <section aria-labelledby="byws-h" className="mb-6 bg-white p-6">
          <h2 id="byws-h" className="mb-3.5 text-[20px] font-light">
            By workstream
          </h2>
          <TableScroll label="By workstream">
            <table className={`${tableClass} min-w-[760px]`}>
              <thead>
                <tr className={theadRow}>
                  <th scope="col" className={`${th} pl-0`}>
                    Workstream
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    Open
                  </th>
                  {levels.map((l) => (
                    <th key={l} scope="col" className={`${th} text-right`}>
                      {LEVEL_LABEL[l]}
                    </th>
                  ))}
                  <th scope="col" className={`${th} text-right`}>
                    Avg age
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    vs last week
                  </th>
                </tr>
              </thead>
              <tbody>
                {wsRows.map((r) => (
                  <tr key={r.workstreamId} className={tbodyRow}>
                    <th scope="row" className="py-2.5 pr-2 text-left font-normal">
                      <Link
                        href={withWeek(`${clientBase}/workstreams/${r.workstreamId}`, data.week)}
                      >
                        {r.name}
                      </Link>
                    </th>
                    <td className="px-2 py-2.5 text-right font-medium">{r.open}</td>
                    {r.byLevel.map((n, i) => (
                      <td key={levels[i]} className="px-2 py-2.5 text-right">
                        {n}
                      </td>
                    ))}
                    <td className="px-2 py-2.5 text-right">{r.avgAge} days</td>
                    <td className="px-2 py-2.5 text-right">
                      <Delta now={r.open} prev={r.openLastWeek} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </section>

        <section aria-labelledby="list-h" className="bg-white p-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="list-h" className="text-[24px] font-light">
              All {lower}
            </h2>
            <span role="status" className="text-[14px]">
              Showing {shown.length} of {list.length}
            </span>
          </div>
          <form
            aria-label="Filter the log"
            onSubmit={(e) => e.preventDefault()}
            className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] items-end gap-4"
          >
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor={ids.q} className="lbl">
                Search
              </label>
              <input
                id={ids.q}
                type="search"
                value={filters.q}
                onChange={(e) => setF("q", e.target.value)}
                placeholder="ID, title, project or owner"
                className={`${selectClass} cursor-text`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={ids.lvl} className="lbl">
                {levelHead}
              </label>
              <select
                id={ids.lvl}
                value={filters.level}
                onChange={(e) => setF("level", e.target.value as LogLevel | "")}
                className={selectClass}
              >
                <option value="">Any</option>
                {levels.map((l) => (
                  <option key={l} value={l}>
                    {LEVEL_LABEL[l]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={ids.st} className="lbl">
                Status
              </label>
              <select
                id={ids.st}
                value={filters.status}
                onChange={(e) => setF("status", e.target.value as LogFilters["status"])}
                className={selectClass}
              >
                <option value="ACTIVE">Open and on pause</option>
                <option value="OPEN">{LOG_STATUS_LABEL.OPEN}</option>
                <option value="ON_PAUSE">{LOG_STATUS_LABEL.ON_PAUSE}</option>
                <option value="CLOSED">{LOG_STATUS_LABEL.CLOSED}</option>
                <option value="ALL">All</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={ids.age} className="lbl">
                Age and due
              </label>
              <select
                id={ids.age}
                value={filters.age}
                onChange={(e) => setF("age", e.target.value as LogFilters["age"])}
                className={selectClass}
              >
                <option value="">Any</option>
                {(Object.keys(AGE_BAND_LABEL) as AgeBand[]).map((b) => (
                  <option key={b} value={b}>
                    {AGE_BAND_LABEL[b]}
                  </option>
                ))}
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>
          </form>
          <TableScroll label={`All ${lower}`}>
            <table className={`${tableClass} min-w-[1300px]`}>
              <caption className="sr-only">All {lower}</caption>
              <thead>
                <tr className={theadRow}>
                  <th scope="col" className={`${th} w-16 pl-0`}>
                    ID
                  </th>
                  <th scope="col" className={th}>
                    {isRisk ? "Risk" : "Issue"}
                  </th>
                  <th scope="col" className={th}>
                    Project
                  </th>
                  <th scope="col" className={th}>
                    Workstream
                  </th>
                  <th scope="col" className={th}>
                    {levelHead}
                  </th>
                  <th scope="col" className={th}>
                    Owner
                  </th>
                  <th scope="col" className={th}>
                    Status
                  </th>
                  <th scope="col" className={th}>
                    Raised
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    Age
                  </th>
                  <th scope="col" className={th}>
                    Due
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((i) => (
                  <tr key={i.id} className={tbodyRow}>
                    <td className={`${td} pl-0 font-medium`}>{i.ref}</td>
                    <td className={`${td} max-w-[320px]`}>{i.title}</td>
                    <td className={`${td} max-w-[240px]`}>
                      <Link href={withWeek(`/projects/${i.projectId}`, data.week)}>
                        {i.projectJob}
                      </Link>
                      <div className="text-[12px] text-muted">{i.projectName}</div>
                    </td>
                    <td className={td}>{i.workstreamName}</td>
                    <td className={td}>
                      <LevelTag level={i.level} />
                    </td>
                    <td className={td}>{i.owner}</td>
                    <td className={td}>
                      <LogStatusPill status={i.status} />
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{formatDate(i.raisedOn)}</td>
                    <td className={`${td} text-right whitespace-nowrap`}>
                      {ageText(ageInDays(i.raisedOn, today))}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      <div>{i.dueOn ? formatDate(i.dueOn) : "No due date"}</div>
                      {isOverdue(i, today) ? (
                        <span className="mt-1 inline-block bg-warning-tint px-2 py-0.5 text-[12px] font-medium">
                          {overdueText(i, today)}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          {!list.length ? <p className="py-5 text-[14px]">Nothing matches these filters.</p> : null}
          {!all && list.length > PREVIEW ? (
            <button
              type="button"
              onClick={() => setAll(true)}
              className="mt-4 min-h-11 cursor-pointer border border-navy bg-white px-5 text-[14px] font-medium"
            >
              Show all {list.length}
            </button>
          ) : null}
          <p className="mt-4 text-[13px] text-muted">
            Sorted by {levelHead.toLowerCase()}, then oldest first. Overdue means past its due date
            and still open or on pause. Items are added and edited on each project&apos;s page.
            Counts include open and on-pause items only.
          </p>
        </section>
      </div>
    </>
  );
}
