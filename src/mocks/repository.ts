/**
 * Mock repository (brief 01). Pages read data only through these functions; brief 02 replaces
 * this file with Prisma queries returning the same view models (src/types/views.ts).
 */
import type {
  Client,
  LogItem,
  LogKind,
  Project,
  ProjectWeek,
  Role,
  SpendUpload,
  User,
} from "@/types/domain";
import type {
  AdminHomeView,
  ClientOverview,
  LogRow,
  ProjectPageView,
  ProjectRow,
  UploadInfo,
  UploadsView,
  Viewer,
  WeekContext,
  WeekOption,
  WorkstreamOverview,
  WorkstreamSummary,
} from "@/types/views";
import { addDays, daysBetween } from "@/lib/dates";
import { activeAt } from "@/lib/logs";
import { needsAttention, outstandingUpdates, sumTiles, workstreamTiles } from "@/lib/rollup";
import { sortLog, sortPipeline } from "@/lib/sorting";
import { hasFigure, isOverBudget } from "@/lib/spend";
import {
  addWeeks,
  compareWeeks,
  formatWeekParam,
  parseWeekParam,
  weekLabel,
  weekRange,
  weekShort,
  type WeekRef,
} from "@/lib/week";
import {
  ADMIN,
  ALL_WEEKS,
  AUDIT_EVENTS,
  CLIENTS,
  CURRENT_WEEK,
  FIRST_WEEK,
  LOG_ITEMS,
  MOCK_NOW,
  MOCK_TODAY,
  PIPELINE,
  PROJECTS,
  PROJECT_WEEKS,
  SPEND,
  STAGED_CHANGES,
  STAGED_UPLOAD,
  UPLOADS,
  USERS,
  WORKSTREAMS,
} from "./data";

export const DEFAULT_CLIENT_ID = CLIENTS[0].id;

export function now(): Date {
  return MOCK_NOW;
}

// ── Viewer (dev role switch until brief 03) ──────────────────────────────────────────────────

/** The sample user each role signs in as. */
export function viewerForRole(role: Role): Viewer {
  const u = role === "ADMIN" ? ADMIN : (USERS.find((x) => x.role === "UPDATER") as User);
  return { id: u.id, name: u.name, initials: u.initials, role: u.role };
}

// ── Weeks ────────────────────────────────────────────────────────────────────────────────────

/** The week a page shows: `?week=` if valid and within the history, otherwise the open week. */
export function resolveWeek(param: string | string[] | undefined): WeekContext {
  const parsed = parseWeekParam(Array.isArray(param) ? param[0] : param);
  const ref =
    parsed && compareWeeks(parsed, FIRST_WEEK) >= 0 && compareWeeks(parsed, CURRENT_WEEK) <= 0
      ? parsed
      : CURRENT_WEEK;
  const closed = compareWeeks(ref, CURRENT_WEEK) < 0;
  const { friday } = weekRange(ref);
  return {
    ref,
    key: formatWeekParam(ref),
    label: weekLabel(ref),
    closed,
    asOf: closed ? friday : MOCK_TODAY,
    closeDate: friday,
  };
}

export function weekOptions(): WeekOption[] {
  return [...ALL_WEEKS].reverse().map((w) => {
    const closed = compareWeeks(w, CURRENT_WEEK) < 0;
    return {
      key: formatWeekParam(w),
      label: `${weekLabel(w)} (${closed ? "closed" : "open"})`,
      closed,
    };
  });
}

// ── Lookups ──────────────────────────────────────────────────────────────────────────────────

const userName = (id: string | null) => USERS.find((u) => u.id === id)?.name ?? null;
const wsById = (id: string) => WORKSTREAMS.find((w) => w.id === id);

export function getClient(clientId: string): Client | null {
  return CLIENTS.find((c) => c.id === clientId) ?? null;
}

export function getClients(): Client[] {
  return CLIENTS;
}

function weekIndex(ref: WeekRef): number {
  return ALL_WEEKS.findIndex((w) => compareWeeks(w, ref) === 0);
}

function entryFor(projectId: string, ref: WeekRef): ProjectWeek | null {
  return PROJECT_WEEKS.get(`${projectId}|${formatWeekParam(ref)}`) ?? null;
}

/** Latest genuine submission in or before `ref` (or strictly before, when `before` is set). */
function latestSubmission(projectId: string, ref: WeekRef, before = false): ProjectWeek | null {
  for (let i = weekIndex(ref) - (before ? 1 : 0); i >= 0; i--) {
    const e = entryFor(projectId, ALL_WEEKS[i]);
    if (e && e.state === "SUBMITTED" && !e.notUpdated) return e;
  }
  return null;
}

function spendFor(projectId: string, ref: WeekRef) {
  return (
    SPEND[projectId][formatWeekParam(ref)] ?? {
      percentSpent: null,
      spendStatus: "NO_BUDGET" as const,
    }
  );
}

function activeLogsFor(projectId: string, kind: LogKind, asOf: string): number {
  return LOG_ITEMS.filter((l) => l.projectId === projectId && l.kind === kind && activeAt(l, asOf))
    .length;
}

function projectRow(p: Project, week: WeekContext): ProjectRow {
  const entry = entryFor(p.id, week.ref);
  const latest = latestSubmission(p.id, week.ref);
  const shown = entry?.notUpdated ? entry : entry?.state === "SUBMITTED" ? entry : latest;
  return {
    id: p.id,
    jobNumber: p.jobNumber,
    name: p.name,
    workstreamId: p.workstreamId,
    workstreamName: wsById(p.workstreamId)?.name ?? "",
    included: p.includeInReport,
    spend: spendFor(p.id, week.ref),
    status: p.includeInReport ? (shown?.status ?? null) : null,
    rag: p.includeInReport ? (shown?.rag ?? null) : null,
    percentComplete: p.includeInReport ? (shown?.percentComplete ?? null) : null,
    submittedThisWeek: !!entry && entry.state === "SUBMITTED" && !entry.notUpdated,
    draftThisWeek: entry?.state === "DRAFT",
    notUpdated: !!entry?.notUpdated,
    lastSubmittedAt: latest?.submittedAt ?? null,
    lastSubmittedBy: userName(latest?.submittedById ?? null),
    openRisks: activeLogsFor(p.id, "RISK", week.asOf),
    openIssues: activeLogsFor(p.id, "ISSUE", week.asOf),
  };
}

function latestUpload(clientId: string, onOrBefore: string): UploadInfo | null {
  const u = UPLOADS.filter(
    (x) =>
      x.clientId === clientId &&
      (x.status === "LIVE" || x.status === "REPLACED") &&
      daysBetween(x.extractDate, onOrBefore) >= 0
  ).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0];
  return u ? uploadInfo(u) : null;
}

function uploadInfo(u: SpendUpload): UploadInfo {
  return { upload: u, uploadedByName: userName(u.uploadedById) ?? "—" };
}

function lastWeekEnd(week: WeekContext): string {
  return addDays(weekRange(week.ref).monday, -3);
}

function pipelineFor(workstreamId: string, week: WeekContext) {
  return sortPipeline(
    PIPELINE.filter(
      (o) =>
        o.workstreamId === workstreamId && !o.archivedAt && daysBetween(o.createdOn, week.asOf) >= 0
    )
  );
}

function workstreamSummary(wsId: string, week: WeekContext): WorkstreamSummary {
  const workstream = wsById(wsId)!;
  const rows = PROJECTS.filter((p) => p.workstreamId === wsId).map((p) => projectRow(p, week));
  return {
    workstream,
    tiles: workstreamTiles(rows, LOG_ITEMS, pipelineFor(wsId, week), week.asOf, lastWeekEnd(week)),
  };
}

function reportedRows(clientId: string, week: WeekContext): ProjectRow[] {
  const reported = new Set(
    WORKSTREAMS.filter((w) => w.clientId === clientId && w.reported).map((w) => w.id)
  );
  return PROJECTS.filter((p) => p.clientId === clientId && reported.has(p.workstreamId)).map((p) =>
    projectRow(p, week)
  );
}

// ── Page views ───────────────────────────────────────────────────────────────────────────────

export function getClientOverview(
  clientId: string,
  weekParam?: string | string[]
): ClientOverview | null {
  const client = getClient(clientId);
  if (!client) return null;
  const week = resolveWeek(weekParam);
  const workstreams = WORKSTREAMS.filter((w) => w.clientId === clientId && w.reported).map((w) =>
    workstreamSummary(w.id, week)
  );
  return {
    client,
    week,
    weeks: weekOptions(),
    workstreams,
    totals: sumTiles(workstreams.map((w) => w.tiles)),
    needsAttention: needsAttention(reportedRows(clientId, week)),
    latestUpload: latestUpload(clientId, week.closeDate),
  };
}

export function getWorkstreamOverview(
  clientId: string,
  workstreamId: string,
  weekParam?: string | string[]
): WorkstreamOverview | null {
  const client = getClient(clientId);
  const workstream = wsById(workstreamId);
  if (!client || !workstream || workstream.clientId !== clientId || !workstream.reported)
    return null;
  const week = resolveWeek(weekParam);
  const projects = PROJECTS.filter((p) => p.workstreamId === workstreamId).map((p) =>
    projectRow(p, week)
  );
  const pipeline = pipelineFor(workstreamId, week);
  return {
    client,
    workstream,
    week,
    weeks: weekOptions(),
    tiles: workstreamTiles(projects, LOG_ITEMS, pipeline, week.asOf, lastWeekEnd(week)),
    pipeline,
    projects,
    logs: LOG_ITEMS.filter((l) => projects.some((p) => p.id === l.projectId)),
    lastWeekEnd: lastWeekEnd(week),
    submitters: [
      ...new Set(projects.map((p) => p.lastSubmittedBy).filter(Boolean) as string[]),
    ].sort(),
    latestUpload: latestUpload(clientId, week.closeDate),
  };
}

export function getProjectPage(
  projectId: string,
  weekParam?: string | string[]
): ProjectPageView | null {
  const p = PROJECTS.find((x) => x.id === projectId);
  if (!p) return null;
  const workstream = wsById(p.workstreamId)!;
  if (!workstream.reported) return null;
  const client = getClient(p.clientId)!;
  const week = resolveWeek(weekParam);
  const row = projectRow(p, week);
  const thisWeek = entryFor(p.id, week.ref);
  const before = latestSubmission(p.id, week.ref, true);
  const start = thisWeek ?? before;
  const idx = weekIndex(week.ref);
  const trendWeeks = ALL_WEEKS.slice(Math.max(0, idx - 7), idx + 1);
  const valuesAt = (w: WeekRef) => {
    const e = entryFor(p.id, w);
    return e?.state === "SUBMITTED" ? e : latestSubmission(p.id, w);
  };
  return {
    client,
    workstream,
    project: row,
    week,
    weeks: weekOptions(),
    thisWeek,
    lastSubmission: before
      ? {
          ...before,
          weekLabel: weekLabel(ALL_WEEKS.find((w) => formatWeekParam(w) === before.week)!),
          submittedByName: userName(before.submittedById),
        }
      : null,
    form: {
      status: start?.status ?? "IN_PROGRESS",
      rag: start?.rag ?? "GREEN",
      percentComplete: start?.percentComplete ?? 0,
      updateText: thisWeek?.updateText ?? "",
      state: thisWeek?.notUpdated ? null : (thisWeek?.state ?? null),
    },
    submittedByName: userName(thisWeek?.submittedById ?? null),
    spendPrev: idx > 0 ? spendFor(p.id, ALL_WEEKS[idx - 1]) : null,
    spendTrend: trendWeeks.map((w) => ({
      week: weekShort(w),
      spend: spendFor(p.id, w),
      percentComplete: valuesAt(w)?.percentComplete ?? null,
    })),
    ragHistory: trendWeeks.map((w, i) => ({
      week: weekShort(w),
      rag: valuesAt(w)?.rag ?? null,
      current: i === trendWeeks.length - 1,
    })),
    risks: sortLog(
      LOG_ITEMS.filter(
        (l) =>
          l.projectId === p.id &&
          l.kind === "RISK" &&
          !l.archivedAt &&
          daysBetween(l.raisedOn, week.asOf) >= 0
      )
    ),
    issues: sortLog(
      LOG_ITEMS.filter(
        (l) =>
          l.projectId === p.id &&
          l.kind === "ISSUE" &&
          !l.archivedAt &&
          daysBetween(l.raisedOn, week.asOf) >= 0
      )
    ),
    latestUpload: latestUpload(p.clientId, week.closeDate),
  };
}

export interface LogData {
  client: Client;
  week: WeekContext;
  weeks: WeekOption[];
  /** Up to 12 weeks ending with the viewed week, oldest first (as ?week= keys). */
  chartWeeks: string[];
  workstreams: { id: string; name: string }[];
  items: LogRow[];
}

/** Risks and issues on projects in the client's reported workstreams, as at the viewed week. */
export function getLogData(clientId: string, weekParam?: string | string[]): LogData | null {
  const client = getClient(clientId);
  if (!client) return null;
  const week = resolveWeek(weekParam);
  const workstreams = WORKSTREAMS.filter((w) => w.clientId === clientId && w.reported);
  const wsIds = new Set(workstreams.map((w) => w.id));
  const projectById = new Map(PROJECTS.map((p) => [p.id, p]));
  const items: LogRow[] = LOG_ITEMS.filter((l: LogItem) => {
    const p = projectById.get(l.projectId);
    return (
      p && wsIds.has(p.workstreamId) && !l.archivedAt && daysBetween(l.raisedOn, week.asOf) >= 0
    );
  }).map((l) => {
    const p = projectById.get(l.projectId)!;
    // As at a closed week, an item closed later was still active then.
    const closedLater = l.closedOn && daysBetween(l.closedOn, week.asOf) < 0;
    return {
      ...l,
      status: closedLater ? "OPEN" : l.status,
      closedOn: closedLater ? null : l.closedOn,
      projectJob: p.jobNumber,
      projectName: p.name,
      workstreamId: p.workstreamId,
      workstreamName: wsById(p.workstreamId)!.name,
    };
  });
  const idx = weekIndex(week.ref);
  return {
    client,
    week,
    weeks: weekOptions(),
    chartWeeks: ALL_WEEKS.slice(Math.max(0, idx - 11), idx + 1).map(formatWeekParam),
    workstreams: workstreams.map((w) => ({ id: w.id, name: w.name })),
    items: sortLog(items),
  };
}

export function getAdminHome(): AdminHomeView {
  const week = resolveWeek(undefined);
  const clients = CLIENTS.filter((c) => !c.archivedAt)
    .map((c) => getClientOverview(c.id) as ClientOverview)
    .filter((c) => c.workstreams.length > 0);
  const rows = clients.flatMap((c) => reportedRows(c.client.id, week));
  const included = rows.filter((r) => r.included);
  const updaters = USERS.filter((u) => u.role === "UPDATER" && !u.archivedAt);
  const uploads = clients
    .map((c) => ({ client: c.client, info: c.latestUpload }))
    .filter((u): u is { client: Client; info: UploadInfo } => !!u.info)
    .sort((a, b) => b.info.upload.uploadedAt.localeCompare(a.info.upload.uploadedAt));
  return {
    week,
    outstanding: outstandingUpdates(rows),
    inReport: included.length,
    submitted: included.filter((r) => r.submittedThisWeek).length,
    clients,
    uploads,
    users: {
      admins: USERS.filter((u) => u.role === "ADMIN" && !u.archivedAt).length,
      updaters: updaters.length,
      neverSignedIn: updaters.filter((u) => !u.lastSignInAt).length,
    },
  };
}

/** Clients with at least one reported workstream, for the client list. */
export function getClientList(weekParam?: string | string[]): ClientOverview[] {
  return CLIENTS.filter((c) => !c.archivedAt)
    .map((c) => getClientOverview(c.id, weekParam) as ClientOverview)
    .filter((c) => c.workstreams.length > 0);
}

export function getUploadsView(clientId: string): UploadsView | null {
  const client = getClient(clientId);
  if (!client) return null;
  const week = resolveWeek(undefined);
  const latest = latestUpload(clientId, week.closeDate);
  const ws = WORKSTREAMS.filter((w) => w.clientId === clientId);
  const reportedIds = new Set(ws.filter((w) => w.reported).map((w) => w.id));
  const projects = PROJECTS.filter((p) => p.clientId === clientId);
  const spends = projects.map((p) => spendFor(p.id, week.ref));
  const previous = UPLOADS.filter((u) => u.clientId === clientId && u.status === "REPLACED").sort(
    (a, b) => b.uploadedAt.localeCompare(a.uploadedAt)
  )[0];
  return {
    client,
    clients: CLIENTS,
    latest,
    latestStats: {
      records: projects.length,
      reportedRecords: projects.filter((p) => reportedIds.has(p.workstreamId)).length,
      hiddenRecords: projects.filter((p) => !reportedIds.has(p.workstreamId)).length,
      workstreams: ws.length,
      reportedWorkstreams: reportedIds.size,
      newWorkstreams: 0,
      withFigure: spends.filter(hasFigure).length,
      overBudget: spends.filter(isOverBudget).length,
      noBudget: spends.filter((s) => s.spendStatus === "NO_BUDGET").length,
      noTimesheet: spends.filter((s) => s.spendStatus === "NO_TIMESHEET").length,
    },
    staged:
      STAGED_UPLOAD.clientId !== clientId
        ? null
        : {
            upload: STAGED_UPLOAD,
            fileChecks: [
              "Sheet and 4 headers match",
              `${STAGED_UPLOAD.rowCount} rows read · 0 errors`,
              "Job numbers unique",
            ],
            changes: STAGED_CHANGES,
          },
    history: UPLOADS.filter((u) => u.clientId === clientId)
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
      .slice(0, 8)
      .map(uploadInfo),
    workstreams: ws
      .map((w) => ({ ...w, projectCount: projects.filter((p) => p.workstreamId === w.id).length }))
      .sort((a, b) => b.projectCount - a.projectCount),
    previousUploadDate: previous?.extractDate ?? null,
  };
}

export function getUsers(): User[] {
  return USERS;
}

export function getAuditEvents() {
  return AUDIT_EVENTS;
}

export function getClientsTable() {
  return CLIENTS.map((c) => ({
    ...c,
    workstreams: WORKSTREAMS.filter((w) => w.clientId === c.id).length,
    reported: WORKSTREAMS.filter((w) => w.clientId === c.id && w.reported).length,
    projects: PROJECTS.filter((p) => p.clientId === c.id).length,
    latestUpload: latestUpload(c.id, MOCK_TODAY)?.upload.extractDate ?? null,
  }));
}

/** Previous week's key, for "Week 46 is closed" links. */
export function previousWeekKey(ref: WeekRef): string | null {
  const prev = addWeeks(ref, -1);
  return compareWeeks(prev, FIRST_WEEK) >= 0 ? formatWeekParam(prev) : null;
}

/** Next refs, used when an item is added in local state. */
export { LOG_SEQ } from "./data";
