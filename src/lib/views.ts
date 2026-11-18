/**
 * Page views, built from a Dataset (brief 02). The same code serves the sample data
 * (src/mocks, used by tests) and the database (src/server/repository.ts), so both return
 * identical view models (src/types/views.ts). Pure: no I/O; "now" comes from the dataset.
 */
import type {
  AuditEvent,
  Client,
  IsoDate,
  LogItem,
  LogKind,
  PipelineOpportunity,
  Project,
  ProjectWeek,
  Role,
  Spend,
  SpendUpload,
  SpendUploadChange,
  User,
  Workstream,
} from "@/types/domain";
import type {
  AdminHomeView,
  ClientOverview,
  LogData,
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
import { addDays, daysBetween } from "./dates";
import { activeAt } from "./logs";
import type { LogSnapshot, PipelineSnapshot, ProjectSnapshot } from "./snapshot";
import { needsAttention, outstandingUpdates, sumTiles, workstreamTiles } from "./rollup";
import { sortLog, sortPipeline } from "./sorting";
import { hasFigure, isOverBudget } from "./spend";
import {
  addWeeks,
  compareWeeks,
  formatWeekParam,
  parseWeekParam,
  weekLabel,
  weekRange,
  weekShort,
  type WeekRef,
} from "./week";

/** Frozen records of closed weeks (brief 06), keyed by `${id}|${weekKey}`. */
export interface SnapshotStore {
  /** By project id. */
  projects: Map<string, ProjectSnapshot>;
  /** By workstream id. */
  pipelines: Map<string, PipelineSnapshot>;
  /** By client id. */
  logs: Map<string, LogSnapshot>;
}

/** Everything the views need, from the mocks or from the database. */
export interface Dataset {
  now: Date;
  /** London calendar date of `now`. */
  today: IsoDate;
  /** The open reporting week. */
  currentWeek: WeekRef;
  /** Oldest week with data. */
  firstWeek: WeekRef;
  /** firstWeek … currentWeek, oldest first. */
  allWeeks: WeekRef[];
  users: User[];
  /** The Admin the dev role switch signs in as (brief 03 replaces it). */
  admin: User;
  clients: Client[];
  workstreams: Workstream[];
  projects: Project[];
  /** Keyed by `${projectId}|${weekKey}`. */
  projectWeeks: Map<string, ProjectWeek>;
  /** spend[projectId][weekKey]: the latest confirmed upload on or before that week. */
  spend: Record<string, Record<string, Spend>>;
  logItems: LogItem[];
  pipeline: PipelineOpportunity[];
  uploads: SpendUpload[];
  /** Files checked and waiting for review, with their change lists. */
  staged: {
    upload: SpendUpload;
    changes: SpendUploadChange[];
    rowErrors?: { rowNumber: number; message: string }[];
  }[];
  auditEvents: AuditEvent[];
  /** Last risk / issue numbers used, per client. */
  logSeq: Record<string, { RISK: number; ISSUE: number }>;
  /**
   * Snapshots of closed weeks. A closed week reads its snapshot when there is one; without one
   * (the sample data, or the hours between Friday 23:59 and the close job) it is worked out
   * from live data as before.
   */
  snapshots?: SnapshotStore;
}

export function createViews(ds: Dataset) {
  function now(): Date {
    return ds.now;
  }

  // ── Viewer (dev role switch until brief 03) ──────────────────────────────────────────────────

  /** The sample user each role signs in as. */
  function viewerForRole(role: Role): Viewer {
    const u = role === "ADMIN" ? ds.admin : (ds.users.find((x) => x.role === "UPDATER") as User);
    return { id: u.id, name: u.name, initials: u.initials, role: u.role };
  }

  // ── Weeks ────────────────────────────────────────────────────────────────────────────────────

  /** The week a page shows: `?week=` if valid and within the history, otherwise the open week. */
  function resolveWeek(param: string | string[] | undefined): WeekContext {
    const parsed = parseWeekParam(Array.isArray(param) ? param[0] : param);
    const ref =
      parsed && compareWeeks(parsed, ds.firstWeek) >= 0 && compareWeeks(parsed, ds.currentWeek) <= 0
        ? parsed
        : ds.currentWeek;
    const closed = compareWeeks(ref, ds.currentWeek) < 0;
    const { friday } = weekRange(ref);
    return {
      ref,
      key: formatWeekParam(ref),
      label: weekLabel(ref),
      closed,
      asOf: closed ? friday : ds.today,
      closeDate: friday,
    };
  }

  function weekOptions(): WeekOption[] {
    return [...ds.allWeeks].reverse().map((w) => {
      const closed = compareWeeks(w, ds.currentWeek) < 0;
      return {
        key: formatWeekParam(w),
        label: `${weekLabel(w)} (${closed ? "closed" : "open"})`,
        closed,
      };
    });
  }

  // ── Lookups ──────────────────────────────────────────────────────────────────────────────────

  const userName = (id: string | null) => ds.users.find((u) => u.id === id)?.name ?? null;
  const wsById = (id: string) => ds.workstreams.find((w) => w.id === id);

  function getClient(clientId: string): Client | null {
    return ds.clients.find((c) => c.id === clientId) ?? null;
  }

  function getClients(): Client[] {
    return ds.clients;
  }

  function weekIndex(ref: WeekRef): number {
    return ds.allWeeks.findIndex((w) => compareWeeks(w, ref) === 0);
  }

  const isClosedWeek = (ref: WeekRef) => compareWeeks(ref, ds.currentWeek) < 0;

  function projectSnapshot(projectId: string, ref: WeekRef) {
    return isClosedWeek(ref)
      ? ds.snapshots?.projects.get(`${projectId}|${formatWeekParam(ref)}`)
      : undefined;
  }

  function entryFor(projectId: string, ref: WeekRef): ProjectWeek | null {
    const snap = projectSnapshot(projectId, ref);
    if (snap) {
      // The values shown that week; carried-forward values are marked as not a submission.
      if (!snap.entry) return null;
      return {
        projectId,
        week: formatWeekParam(ref),
        ...snap.entry,
        state: "SUBMITTED",
        notUpdated: !snap.submittedThisWeek,
      };
    }
    return ds.projectWeeks.get(`${projectId}|${formatWeekParam(ref)}`) ?? null;
  }

  /** Risks and issues for a client as at the week: the snapshot's for a closed week. */
  function logItemsFor(clientId: string, week: WeekContext): LogItem[] {
    const snap = isClosedWeek(week.ref)
      ? ds.snapshots?.logs.get(`${clientId}|${week.key}`)
      : undefined;
    return snap ? snap.items : ds.logItems;
  }

  /** Latest genuine submission in or before `ref` (or strictly before, when `before` is set). */
  function latestSubmission(projectId: string, ref: WeekRef, before = false): ProjectWeek | null {
    for (let i = weekIndex(ref) - (before ? 1 : 0); i >= 0; i--) {
      const e = entryFor(projectId, ds.allWeeks[i]);
      if (e && e.state === "SUBMITTED" && !e.notUpdated) return e;
    }
    return null;
  }

  function spendFor(projectId: string, ref: WeekRef) {
    const snap = projectSnapshot(projectId, ref);
    if (snap) return snap.spend;
    return (
      ds.spend[projectId]?.[formatWeekParam(ref)] ?? {
        percentSpent: null,
        spendStatus: "NO_BUDGET" as const,
      }
    );
  }

  function activeLogsFor(projectId: string, kind: LogKind, asOf: string): number {
    return ds.logItems.filter(
      (l) => l.projectId === projectId && l.kind === kind && activeAt(l, asOf)
    ).length;
  }

  function projectRow(p: Project, week: WeekContext): ProjectRow {
    const snap = projectSnapshot(p.id, week.ref);
    const entry = entryFor(p.id, week.ref);
    const latest = latestSubmission(p.id, week.ref);
    const shown = entry?.notUpdated ? entry : entry?.state === "SUBMITTED" ? entry : latest;
    const included = snap ? snap.included : p.includeInReport;
    const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
    return {
      id: p.id,
      jobNumber: p.jobNumber,
      name: p.name,
      workstreamId: p.workstreamId,
      workstreamName: wsById(p.workstreamId)?.name ?? "",
      included,
      spend: spendFor(p.id, week.ref),
      status: included ? (shown?.status ?? null) : null,
      rag: included ? (shown?.rag ?? null) : null,
      percentComplete: included ? (shown?.percentComplete ?? null) : null,
      submittedThisWeek: !!entry && entry.state === "SUBMITTED" && !entry.notUpdated,
      draftThisWeek: entry?.state === "DRAFT",
      notUpdated: snap ? snap.notUpdated : !!entry?.notUpdated,
      lastSubmittedAt: latest?.submittedAt ?? null,
      lastSubmittedBy: userName(latest?.submittedById ?? null),
      openRisks: snap ? sum(snap.risks.open) : activeLogsFor(p.id, "RISK", week.asOf),
      openIssues: snap ? sum(snap.issues.open) : activeLogsFor(p.id, "ISSUE", week.asOf),
    };
  }

  function latestUpload(clientId: string, onOrBefore: string): UploadInfo | null {
    const u = ds.uploads
      .filter(
        (x) =>
          x.clientId === clientId &&
          (x.status === "LIVE" || x.status === "REPLACED") &&
          daysBetween(x.extractDate, onOrBefore) >= 0
      )
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0];
    return u ? uploadInfo(u) : null;
  }

  function uploadInfo(u: SpendUpload): UploadInfo {
    return { upload: u, uploadedByName: userName(u.uploadedById) ?? "—" };
  }

  function lastWeekEnd(week: WeekContext): string {
    return addDays(weekRange(week.ref).monday, -3);
  }

  function pipelineFor(workstreamId: string, week: WeekContext) {
    const snap = isClosedWeek(week.ref)
      ? ds.snapshots?.pipelines.get(`${workstreamId}|${week.key}`)
      : undefined;
    if (snap)
      return sortPipeline(
        // Snapshots written before brief 05b have no value or added date.
        snap.opportunities.map((o) => ({
          ...o,
          estimatedValue: o.estimatedValue ?? null,
          addedOn: o.addedOn ?? o.createdOn,
        }))
      );
    return sortPipeline(
      ds.pipeline.filter(
        (o) =>
          o.workstreamId === workstreamId &&
          !o.archivedAt &&
          daysBetween(o.createdOn, week.asOf) >= 0
      )
    );
  }

  function workstreamSummary(wsId: string, week: WeekContext): WorkstreamSummary {
    const workstream = wsById(wsId)!;
    const rows = ds.projects.filter((p) => p.workstreamId === wsId).map((p) => projectRow(p, week));
    return {
      workstream,
      tiles: workstreamTiles(
        rows,
        logItemsFor(workstream.clientId, week),
        pipelineFor(wsId, week),
        week.asOf,
        lastWeekEnd(week)
      ),
    };
  }

  /** A client's reported workstreams, A–Z by name. */
  function reportedWorkstreams(clientId: string) {
    return ds.workstreams
      .filter((w) => w.clientId === clientId && w.reported)
      .sort((a, b) => a.name.localeCompare(b.name, "en-GB", { sensitivity: "base" }));
  }

  function reportedRows(clientId: string, week: WeekContext): ProjectRow[] {
    const reported = new Set(
      ds.workstreams.filter((w) => w.clientId === clientId && w.reported).map((w) => w.id)
    );
    return ds.projects
      .filter((p) => p.clientId === clientId && reported.has(p.workstreamId))
      .map((p) => projectRow(p, week));
  }

  // ── Page views ───────────────────────────────────────────────────────────────────────────────

  function getClientOverview(
    clientId: string,
    weekParam?: string | string[]
  ): ClientOverview | null {
    const client = getClient(clientId);
    if (!client) return null;
    const week = resolveWeek(weekParam);
    const workstreams = reportedWorkstreams(clientId).map((w) => workstreamSummary(w.id, week));
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

  function getWorkstreamOverview(
    clientId: string,
    workstreamId: string,
    weekParam?: string | string[]
  ): WorkstreamOverview | null {
    const client = getClient(clientId);
    const workstream = wsById(workstreamId);
    if (!client || !workstream || workstream.clientId !== clientId || !workstream.reported)
      return null;
    const week = resolveWeek(weekParam);
    const projects = ds.projects
      .filter((p) => p.workstreamId === workstreamId)
      .map((p) => projectRow(p, week))
      .sort((a, b) => a.jobNumber.localeCompare(b.jobNumber));
    const pipeline = pipelineFor(workstreamId, week);
    return {
      client,
      workstream,
      week,
      weeks: weekOptions(),
      tiles: workstreamTiles(
        projects,
        logItemsFor(clientId, week),
        pipeline,
        week.asOf,
        lastWeekEnd(week)
      ),
      pipeline,
      projects,
      logs: sortLog(
        logItemsFor(clientId, week).filter((l) => projects.some((p) => p.id === l.projectId))
      ),
      lastWeekEnd: lastWeekEnd(week),
      submitters: [
        ...new Set(projects.map((p) => p.lastSubmittedBy).filter(Boolean) as string[]),
      ].sort(),
      latestUpload: latestUpload(clientId, week.closeDate),
    };
  }

  function getProjectPage(
    projectId: string,
    weekParam?: string | string[]
  ): ProjectPageView | null {
    const p = ds.projects.find((x) => x.id === projectId);
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
    const trendWeeks = ds.allWeeks.slice(Math.max(0, idx - 7), idx + 1);
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
            weekLabel: weekLabel(ds.allWeeks.find((w) => formatWeekParam(w) === before.week)!),
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
      spendPrev: idx > 0 ? spendFor(p.id, ds.allWeeks[idx - 1]) : null,
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
        logItemsFor(p.clientId, week).filter(
          (l) =>
            l.projectId === p.id &&
            l.kind === "RISK" &&
            !l.archivedAt &&
            daysBetween(l.raisedOn, week.asOf) >= 0
        )
      ),
      issues: sortLog(
        logItemsFor(p.clientId, week).filter(
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

  /** Risks and issues on projects in the client's reported workstreams, as at the viewed week. */
  function getLogData(clientId: string, weekParam?: string | string[]): LogData | null {
    const client = getClient(clientId);
    if (!client) return null;
    const week = resolveWeek(weekParam);
    const workstreams = reportedWorkstreams(clientId);
    const wsIds = new Set(workstreams.map((w) => w.id));
    const projectById = new Map(ds.projects.map((p) => [p.id, p]));
    const items: LogRow[] = logItemsFor(clientId, week)
      .filter((l: LogItem) => {
        const p = projectById.get(l.projectId);
        return (
          p && wsIds.has(p.workstreamId) && !l.archivedAt && daysBetween(l.raisedOn, week.asOf) >= 0
        );
      })
      .map((l) => {
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
      chartWeeks: ds.allWeeks.slice(Math.max(0, idx - 11), idx + 1).map(formatWeekParam),
      workstreams: workstreams.map((w) => ({ id: w.id, name: w.name })),
      items: sortLog(items),
    };
  }

  function getAdminHome(): AdminHomeView {
    const week = resolveWeek(undefined);
    const clients = ds.clients
      .filter((c) => !c.archivedAt)
      .map((c) => getClientOverview(c.id) as ClientOverview)
      .filter((c) => c.workstreams.length > 0);
    const rows = clients.flatMap((c) => reportedRows(c.client.id, week));
    const included = rows.filter((r) => r.included);
    const updaters = ds.users.filter((u) => u.role === "UPDATER" && !u.archivedAt);
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
        admins: ds.users.filter((u) => u.role === "ADMIN" && !u.archivedAt).length,
        updaters: updaters.length,
        neverSignedIn: updaters.filter((u) => !u.lastSignInAt).length,
      },
    };
  }

  /** Clients with at least one reported workstream, for the client list. */
  function getClientList(weekParam?: string | string[]): ClientOverview[] {
    return ds.clients
      .filter((c) => !c.archivedAt)
      .map((c) => getClientOverview(c.id, weekParam) as ClientOverview)
      .filter((c) => c.workstreams.length > 0);
  }

  function getUploadsView(clientId: string): UploadsView | null {
    const client = getClient(clientId);
    if (!client) return null;
    const week = resolveWeek(undefined);
    const latest = latestUpload(clientId, week.closeDate);
    const ws = ds.workstreams.filter((w) => w.clientId === clientId);
    const reportedIds = new Set(ws.filter((w) => w.reported).map((w) => w.id));
    const projects = ds.projects.filter((p) => p.clientId === clientId);
    const spends = projects.map((p) => spendFor(p.id, week.ref));
    const staged = ds.staged.find((s) => s.upload.clientId === clientId) ?? null;
    const previous = ds.uploads
      .filter((u) => u.clientId === clientId && u.status === "REPLACED")
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0];
    return {
      client,
      clients: ds.clients,
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
      staged: staged
        ? {
            upload: staged.upload,
            fileChecks: [
              "Sheet and 4 headers match",
              `${staged.upload.rowCount} rows read · ${staged.upload.errorCount} ${staged.upload.errorCount === 1 ? "error" : "errors"}`,
              ...(staged.upload.errorCount ? [] : ["Job numbers unique"]),
            ],
            changes: staged.changes,
            rowErrors: staged.rowErrors ?? [],
          }
        : null,
      history: ds.uploads
        .filter((u) => u.clientId === clientId)
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
        .slice(0, 8)
        .map(uploadInfo),
      workstreams: ws
        .map((w) => ({
          ...w,
          projectCount: projects.filter((p) => p.workstreamId === w.id).length,
        }))
        .sort((a, b) => b.projectCount - a.projectCount),
      previousUploadDate: previous?.extractDate ?? null,
    };
  }

  function getUsers(): User[] {
    return ds.users;
  }

  function getAuditEvents() {
    return ds.auditEvents;
  }

  function getClientsTable() {
    return ds.clients.map((c) => ({
      ...c,
      workstreams: ds.workstreams.filter((w) => w.clientId === c.id).length,
      reported: ds.workstreams.filter((w) => w.clientId === c.id && w.reported).length,
      projects: ds.projects.filter((p) => p.clientId === c.id).length,
      latestUpload: latestUpload(c.id, ds.today)?.upload.extractDate ?? null,
    }));
  }

  /** Previous week's key, for "Week 46 is closed" links. */
  function previousWeekKey(ref: WeekRef): string | null {
    const prev = addWeeks(ref, -1);
    return compareWeeks(prev, ds.firstWeek) >= 0 ? formatWeekParam(prev) : null;
  }

  return {
    defaultClientId: ds.clients[0]?.id ?? "",
    logSeq: ds.logSeq,
    now,
    viewerForRole,
    resolveWeek,
    weekOptions,
    getClient,
    getClients,
    getClientOverview,
    getWorkstreamOverview,
    getProjectPage,
    getLogData,
    getAdminHome,
    getClientList,
    getUploadsView,
    getUsers,
    getAuditEvents,
    getClientsTable,
    previousWeekKey,
  };
}

export type Views = ReturnType<typeof createViews>;
