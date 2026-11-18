/**
 * Database row shapes and the two pure mappings between them and the views' Dataset:
 *   - `rowsFromDataset` (seed: Dataset → rows to insert)
 *   - `datasetFromRows` (site: rows loaded from Prisma → Dataset)
 * Pure, so the round trip is unit-tested without a database (tests/server/rows.test.ts).
 * Field names match prisma/schema.prisma.
 */
import type {
  AuditEvent,
  Client,
  LogItem,
  PipelineOpportunity,
  Project,
  ProjectWeek,
  Spend,
  SpendUpload,
  SpendUploadChange,
  User,
  Workstream,
} from "@/types/domain";
import type { Dataset, SnapshotStore } from "@/lib/views";
import type { LogSnapshot, PipelineSnapshot, ProjectSnapshot } from "@/lib/snapshot";
import { londonDate } from "@/lib/dates";
import {
  closesAt,
  compareWeeks,
  currentWeek,
  formatWeekParam,
  isoWeekOfDate,
  weekRange,
  weeksBetween,
  type WeekRef,
} from "@/lib/week";

/** Prisma returns Decimal objects; Number() reads them. */
type Num = number | { toString(): string };

const d = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
const dOpt = (iso: string | null) => (iso ? d(iso) : null);
const t = (iso: string) => new Date(iso);
const tOpt = (iso: string | null) => (iso ? new Date(iso) : null);
const isoDate = (x: Date) => x.toISOString().slice(0, 10);
const isoDateOpt = (x: Date | null) => (x ? isoDate(x) : null);
const isoTime = (x: Date) => x.toISOString();
const isoTimeOpt = (x: Date | null) => (x ? x.toISOString() : null);
const num = (x: Num | null) => (x === null ? null : Number(x));

export interface DbRows {
  users: {
    id: string;
    name: string;
    initials: string;
    email: string;
    role: User["role"];
    lastSignInAt: Date | null;
    archivedAt: Date | null;
  }[];
  clients: {
    id: string;
    name: string;
    riskSeq: number;
    issueSeq: number;
    archivedAt: Date | null;
  }[];
  workstreams: {
    id: string;
    clientId: string;
    name: string;
    reported: boolean;
    accountDirector: string | null;
    firstSeen: Date;
  }[];
  projects: {
    id: string;
    clientId: string;
    workstreamId: string;
    jobNumber: string;
    name: string;
    includeInReport: boolean;
    missingFromFileSince: Date | null;
    markedNoLongerInFileAt: Date | null;
  }[];
  periods: {
    id: string;
    isoYear: number;
    isoWeek: number;
    startsOn: Date;
    endsOn: Date;
    closesAt: Date;
    state: "OPEN" | "CLOSED";
    closedAt: Date | null;
  }[];
  projectWeeks: {
    id: string;
    projectId: string;
    periodId: string;
    status: ProjectWeek["status"];
    rag: ProjectWeek["rag"];
    percentComplete: number;
    updateText: string;
    state: ProjectWeek["state"];
    submittedAt: Date | null;
    submittedById: string | null;
    notUpdated: boolean;
    updatedAt?: Date;
  }[];
  uploads: {
    id: string;
    clientId: string;
    uploadedById: string;
    uploadedAt: Date;
    extractDate: Date;
    fileName: string;
    status: SpendUpload["status"];
    note: string | null;
    rowCount: number | null;
    newCount: number | null;
    changedCount: number | null;
    missingCount: number | null;
    errorCount: number;
  }[];
  uploadChanges: {
    id: string;
    uploadId: string;
    type: SpendUploadChange["type"];
    field: "name" | "percentSpent" | null;
    jobNumber: string;
    projectName: string;
    workstreamName: string;
    before: string | null;
    after: string | null;
    decision: "KEEP" | "MARK" | null;
  }[];
  /** Row errors of files waiting for review. */
  uploadRowErrors: { uploadId: string; rowNumber: number; error: string | null }[];
  projectSpends: {
    id: string;
    projectId: string;
    uploadId: string;
    percentSpent: Num | null;
    spendStatus: Spend["spendStatus"];
  }[];
  risks: LogRowDb<"RISK">[];
  issues: LogRowDb<"ISSUE">[];
  pipeline: {
    id: string;
    workstreamId: string;
    likelihood: PipelineOpportunity["likelihood"];
    title: string;
    estimatedValue: number | null;
    possibleStart: Date | null;
    addedOn: Date;
    mapOwner: string;
    clientOwner: string;
    nextSteps: string;
    createdAt: Date;
    archivedAt: Date | null;
    updatedAt?: Date;
  }[];
  /** Closed-week snapshots (brief 06); the seed writes none. */
  snapshots?: {
    projects: { periodId: string; projectId: string; data: unknown }[];
    pipelines: { periodId: string; workstreamId: string; data: unknown }[];
    logs: { periodId: string; clientId: string; data: unknown }[];
  };
  auditEvents: {
    id: string;
    at: Date;
    userId: string | null;
    entity: string;
    entityId: string;
    action: AuditEvent["action"];
    field: string;
    oldValue: string | null;
    newValue: string | null;
  }[];
}

interface LogRowDb<K extends "RISK" | "ISSUE"> {
  id: string;
  clientId: string;
  projectId: string;
  ref: string;
  title: string;
  level: K extends "RISK" ? "HIGH" | "MEDIUM" | "LOW" : "BLOCKER" | "HIGH" | "MEDIUM" | "LOW";
  owner: string;
  status: LogItem["status"];
  raisedOn: Date;
  dueOn: Date | null;
  action: string;
  closedOn: Date | null;
  archivedAt: Date | null;
  updatedAt?: Date;
}

const isConfirmed = (s: SpendUpload["status"]) => s === "LIVE" || s === "REPLACED";

// ── Seed: Dataset → rows ─────────────────────────────────────────────────────────────────────

export function rowsFromDataset(ds: Dataset): DbRows {
  const weekKey = formatWeekParam;
  const periods = ds.allWeeks.map((w) => {
    const { monday, friday } = weekRange(w);
    const closed = compareWeeks(w, ds.currentWeek) < 0;
    return {
      id: weekKey(w),
      isoYear: w.isoYear,
      isoWeek: w.isoWeek,
      startsOn: d(monday),
      endsOn: d(friday),
      closesAt: closesAt(w),
      state: closed ? ("CLOSED" as const) : ("OPEN" as const),
      closedAt: closed ? closesAt(w) : null,
    };
  });
  const userByName = new Map(ds.users.map((u) => [u.name, u.id]));
  const allUploads = [...ds.uploads, ...ds.staged.map((s) => s.upload)];
  const projectSpends: DbRows["projectSpends"] = [];
  for (const u of allUploads.filter((x) => isConfirmed(x.status))) {
    const key = weekKey(isoWeekOfDate(u.extractDate));
    for (const p of ds.projects.filter((x) => x.clientId === u.clientId)) {
      const s = ds.spend[p.id]?.[key];
      if (!s) continue;
      projectSpends.push({
        id: `${u.id}|${p.id}`,
        projectId: p.id,
        uploadId: u.id,
        percentSpent: s.percentSpent,
        spendStatus: s.spendStatus,
      });
    }
  }
  const logRow = (l: LogItem) => ({
    id: l.id,
    clientId: l.clientId,
    projectId: l.projectId,
    ref: l.ref,
    title: l.title,
    owner: l.owner,
    status: l.status,
    raisedOn: d(l.raisedOn),
    dueOn: dOpt(l.dueOn),
    action: l.action,
    closedOn: dOpt(l.closedOn),
    archivedAt: tOpt(l.archivedAt),
  });
  return {
    users: ds.users.map((u) => ({
      id: u.id,
      name: u.name,
      initials: u.initials,
      email: u.email,
      role: u.role,
      lastSignInAt: tOpt(u.lastSignInAt),
      archivedAt: tOpt(u.archivedAt),
    })),
    clients: ds.clients.map((c) => ({
      id: c.id,
      name: c.name,
      riskSeq: ds.logSeq[c.id]?.RISK ?? 0,
      issueSeq: ds.logSeq[c.id]?.ISSUE ?? 0,
      archivedAt: tOpt(c.archivedAt),
    })),
    workstreams: ds.workstreams.map((w) => ({
      id: w.id,
      clientId: w.clientId,
      name: w.name,
      reported: w.reported,
      accountDirector: w.accountDirector,
      firstSeen: d(w.firstSeen),
    })),
    projects: ds.projects.map((p) => ({
      id: p.id,
      clientId: p.clientId,
      workstreamId: p.workstreamId,
      jobNumber: p.jobNumber,
      name: p.name,
      includeInReport: p.includeInReport,
      missingFromFileSince: dOpt(p.missingFromFileSince),
      markedNoLongerInFileAt: tOpt(p.markedNoLongerInFileAt),
    })),
    periods,
    projectWeeks: [...ds.projectWeeks.values()].map((e) => ({
      id: `${e.projectId}|${e.week}`,
      projectId: e.projectId,
      periodId: e.week,
      status: e.status,
      rag: e.rag,
      percentComplete: e.percentComplete,
      updateText: e.updateText,
      state: e.state,
      submittedAt: tOpt(e.submittedAt),
      submittedById: e.submittedById,
      notUpdated: !!e.notUpdated,
    })),
    uploads: allUploads.map((u) => ({
      id: u.id,
      clientId: u.clientId,
      uploadedById: u.uploadedById,
      uploadedAt: t(u.uploadedAt),
      extractDate: d(u.extractDate),
      fileName: u.fileName,
      status: u.status,
      note: u.note,
      rowCount: u.rowCount,
      newCount: u.newCount,
      changedCount: u.changedCount,
      missingCount: u.missingCount,
      errorCount: u.errorCount,
    })),
    uploadChanges: ds.staged.flatMap((s) =>
      s.changes.map((c) => ({
        id: `${s.upload.id}|${c.id}`,
        uploadId: s.upload.id,
        type: c.type,
        field: c.field ?? null,
        jobNumber: c.jobNumber,
        projectName: c.projectName,
        workstreamName: c.workstreamName,
        before: c.before,
        after: c.after,
        decision: c.decision ?? null,
      }))
    ),
    uploadRowErrors: [],
    projectSpends,
    risks: ds.logItems
      .filter((l) => l.kind === "RISK")
      .map((l) => ({ ...logRow(l), level: l.level as LogRowDb<"RISK">["level"] })),
    issues: ds.logItems
      .filter((l) => l.kind === "ISSUE")
      .map((l) => ({ ...logRow(l), level: l.level as LogRowDb<"ISSUE">["level"] })),
    pipeline: ds.pipeline.map((o) => ({
      id: o.id,
      workstreamId: o.workstreamId,
      likelihood: o.likelihood,
      title: o.title,
      estimatedValue: o.estimatedValue,
      possibleStart: dOpt(o.possibleStart),
      addedOn: d(o.addedOn),
      mapOwner: o.mapOwner,
      clientOwner: o.clientOwner,
      nextSteps: o.nextSteps,
      createdAt: d(o.createdOn),
      archivedAt: tOpt(o.archivedAt),
    })),
    auditEvents: ds.auditEvents.map((e) => ({
      id: e.id,
      at: t(e.at),
      userId: userByName.get(e.userName) ?? null,
      entity: e.entity,
      entityId: e.entityId,
      action: e.action,
      field: e.field,
      oldValue: e.oldValue,
      newValue: e.newValue,
    })),
  };
}

// ── Site: rows → Dataset ─────────────────────────────────────────────────────────────────────

export function datasetFromRows(rows: DbRows, now: Date): Dataset {
  const today = londonDate(now);
  const open = currentWeek(now);
  const periodWeeks = rows.periods.map((p) => ({ isoYear: p.isoYear, isoWeek: p.isoWeek }));
  const firstWeek = periodWeeks.reduce<WeekRef>(
    (min, w) => (compareWeeks(w, min) < 0 ? w : min),
    open
  );
  const allWeeks = weeksBetween(firstWeek, open);
  const periodKey = new Map(rows.periods.map((p) => [p.id, formatWeekParam(p)]));

  const users: User[] = rows.users.map((u) => ({
    id: u.id,
    name: u.name,
    initials: u.initials,
    email: u.email,
    role: u.role,
    lastSignInAt: isoTimeOpt(u.lastSignInAt),
    archivedAt: isoTimeOpt(u.archivedAt),
  }));
  const admin = users.find((u) => u.role === "ADMIN" && !u.archivedAt);
  if (!admin)
    throw new Error("No active Admin user in the database. Run the seed (npm run db:seed).");

  const uploads: SpendUpload[] = rows.uploads.map((u) => ({
    id: u.id,
    clientId: u.clientId,
    uploadedAt: isoTime(u.uploadedAt),
    uploadedById: u.uploadedById,
    extractDate: isoDate(u.extractDate),
    fileName: u.fileName,
    status: u.status,
    note: u.note,
    rowCount: u.rowCount,
    newCount: u.newCount,
    changedCount: u.changedCount,
    missingCount: u.missingCount,
    errorCount: u.errorCount,
  }));

  // % spend per week: the latest confirmed upload on or before the week's Friday, or the
  // client's earliest upload for weeks before it (decision log: weeks without an upload use
  // the latest confirmed one).
  const spendByUpload = new Map<string, Map<string, Spend>>();
  for (const s of rows.projectSpends) {
    if (!spendByUpload.has(s.uploadId)) spendByUpload.set(s.uploadId, new Map());
    spendByUpload.get(s.uploadId)!.set(s.projectId, {
      percentSpent: s.spendStatus === "VALUE" ? num(s.percentSpent) : null,
      spendStatus: s.spendStatus,
    });
  }
  const spend: Dataset["spend"] = {};
  for (const c of rows.clients) {
    const confirmed = uploads
      .filter((u) => u.clientId === c.id && isConfirmed(u.status))
      .sort(
        (a, b) =>
          a.extractDate.localeCompare(b.extractDate) || a.uploadedAt.localeCompare(b.uploadedAt)
      );
    if (!confirmed.length) continue;
    for (const w of allWeeks) {
      const friday = weekRange(w).friday;
      const upload = [...confirmed].reverse().find((u) => u.extractDate <= friday) ?? confirmed[0];
      const key = formatWeekParam(w);
      for (const [projectId, value] of spendByUpload.get(upload.id) ?? []) {
        (spend[projectId] ??= {})[key] = value;
      }
    }
  }

  const projectWeeks = new Map<string, ProjectWeek>();
  for (const e of rows.projectWeeks) {
    const week = periodKey.get(e.periodId);
    if (!week) continue;
    projectWeeks.set(`${e.projectId}|${week}`, {
      projectId: e.projectId,
      week,
      status: e.status,
      rag: e.rag,
      percentComplete: e.percentComplete,
      updateText: e.updateText,
      state: e.state,
      submittedAt: isoTimeOpt(e.submittedAt),
      submittedById: e.submittedById,
      notUpdated: e.notUpdated,
      ...(e.updatedAt ? { updatedAt: isoTime(e.updatedAt) } : {}),
    });
  }

  const logItem =
    (kind: "RISK" | "ISSUE") =>
    (l: LogRowDb<"RISK"> | LogRowDb<"ISSUE">): LogItem => ({
      id: l.id,
      kind,
      ref: l.ref,
      clientId: l.clientId,
      projectId: l.projectId,
      title: l.title,
      level: l.level,
      owner: l.owner,
      status: l.status,
      raisedOn: isoDate(l.raisedOn),
      dueOn: isoDateOpt(l.dueOn),
      action: l.action,
      closedOn: isoDateOpt(l.closedOn),
      archivedAt: isoTimeOpt(l.archivedAt),
      ...(l.updatedAt ? { updatedAt: isoTime(l.updatedAt) } : {}),
    });

  const userName = new Map(users.map((u) => [u.id, u.name]));
  const changesByUpload = new Map<string, SpendUploadChange[]>();
  for (const c of rows.uploadChanges) {
    const list = changesByUpload.get(c.uploadId) ?? [];
    list.push({
      id: c.id.includes("|") ? c.id.split("|")[1] : c.id,
      type: c.type,
      ...(c.field ? { field: c.field } : {}),
      jobNumber: c.jobNumber,
      projectName: c.projectName,
      workstreamName: c.workstreamName,
      before: c.before,
      after: c.after,
      ...(c.decision ? { decision: c.decision } : {}),
    });
    changesByUpload.set(c.uploadId, list);
  }

  let snapshots: SnapshotStore | undefined;
  if (rows.snapshots) {
    const store = (list: { periodId: string; id: string; data: unknown }[]) => {
      const m = new Map<string, unknown>();
      for (const r of list) {
        const week = periodKey.get(r.periodId);
        if (week) m.set(`${r.id}|${week}`, r.data);
      }
      return m;
    };
    snapshots = {
      projects: store(rows.snapshots.projects.map((r) => ({ ...r, id: r.projectId }))) as Map<
        string,
        ProjectSnapshot
      >,
      pipelines: store(rows.snapshots.pipelines.map((r) => ({ ...r, id: r.workstreamId }))) as Map<
        string,
        PipelineSnapshot
      >,
      logs: store(rows.snapshots.logs.map((r) => ({ ...r, id: r.clientId }))) as Map<
        string,
        LogSnapshot
      >,
    };
  }

  const clients: Client[] = rows.clients.map((c) => ({
    id: c.id,
    name: c.name,
    archivedAt: isoTimeOpt(c.archivedAt),
  }));

  return {
    now,
    today,
    currentWeek: open,
    firstWeek,
    allWeeks,
    users,
    admin,
    clients,
    workstreams: rows.workstreams.map((w): Workstream => ({
      id: w.id,
      clientId: w.clientId,
      name: w.name,
      reported: w.reported,
      accountDirector: w.accountDirector,
      firstSeen: isoDate(w.firstSeen),
    })),
    projects: rows.projects.map((p): Project => ({
      id: p.id,
      clientId: p.clientId,
      workstreamId: p.workstreamId,
      jobNumber: p.jobNumber,
      name: p.name,
      includeInReport: p.includeInReport,
      missingFromFileSince: isoDateOpt(p.missingFromFileSince),
      markedNoLongerInFileAt: isoTimeOpt(p.markedNoLongerInFileAt),
    })),
    projectWeeks,
    spend,
    logItems: [...rows.risks.map(logItem("RISK")), ...rows.issues.map(logItem("ISSUE"))],
    pipeline: rows.pipeline.map((o): PipelineOpportunity => ({
      id: o.id,
      workstreamId: o.workstreamId,
      likelihood: o.likelihood,
      title: o.title,
      estimatedValue: o.estimatedValue,
      possibleStart: isoDateOpt(o.possibleStart),
      addedOn: isoDate(o.addedOn),
      mapOwner: o.mapOwner,
      clientOwner: o.clientOwner,
      nextSteps: o.nextSteps,
      createdOn: isoDate(o.createdAt),
      archivedAt: isoTimeOpt(o.archivedAt),
      ...(o.updatedAt ? { updatedAt: isoTime(o.updatedAt) } : {}),
    })),
    uploads: uploads.filter((u) => u.status !== "READY_TO_REVIEW" && u.status !== "CHECKING"),
    staged: uploads
      .filter((u) => u.status === "READY_TO_REVIEW")
      .map((u) => ({
        upload: u,
        changes: changesByUpload.get(u.id) ?? [],
        rowErrors: rows.uploadRowErrors
          .filter((e) => e.uploadId === u.id && e.error)
          .sort((a, b) => a.rowNumber - b.rowNumber)
          .map((e) => ({ rowNumber: e.rowNumber, message: e.error as string })),
      })),
    auditEvents: rows.auditEvents
      .map((e): AuditEvent => ({
        id: e.id,
        at: isoTime(e.at),
        userName: (e.userId && userName.get(e.userId)) || "System",
        entity: e.entity,
        entityId: e.entityId,
        action: e.action,
        field: e.field,
        oldValue: e.oldValue,
        newValue: e.newValue,
      }))
      .sort((a, b) => b.at.localeCompare(a.at)),
    logSeq: Object.fromEntries(
      rows.clients.map((c) => [c.id, { RISK: c.riskSeq, ISSUE: c.issueSeq }])
    ),
    ...(snapshots ? { snapshots } : {}),
  };
}
