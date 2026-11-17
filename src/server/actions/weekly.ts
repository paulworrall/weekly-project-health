"use server";

/**
 * Weekly inputs (brief 05): "Include in weekly report" ticks, the weekly update, risks, issues
 * and pipeline opportunities. Every action: a signed-in Admin or Updater, the open week only
 * (decided by the London clock), input checked with the shared zod schemas, the change and its
 * audit rows saved in one transaction, and a "changed since you opened it" check on records
 * people edit (decision 17 Nov). Nothing is deleted: "Delete" archives.
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { archiveData } from "@/lib/archive";
import { archiveRow, createRow, updateRows } from "@/lib/audit";
import { writeAudit } from "@/lib/audit-db";
import { londonDate } from "@/lib/dates";
import {
  closedOnAfter,
  conflictMessage,
  formatRef,
  sameVersion,
  weekEditProblem,
} from "@/lib/weekly-rules";
import { editorViewer } from "@/server/guards";
import { ensureOpenPeriod } from "@/server/periods";
import { fail, ok, type ActionResult } from "@/types/action-result";
import type {
  IsoDate,
  LogItem,
  LogKind,
  PipelineOpportunity,
  ProjectStatus,
  Rag,
  UpdateState,
} from "@/types/domain";
import {
  fieldErrors,
  issueSchema,
  pipelineSchema,
  riskSchema,
  weeklySubmitSchema,
  weeklyUpdateSchema,
} from "@/types/schemas";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const isoDay = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

function refresh() {
  revalidatePath("/", "layout");
}

/** Who last changed a record, for the conflict message. */
async function lastChange(entity: string, entityId: string) {
  const e = await prisma.auditEvent.findFirst({
    where: { entity, entityId },
    orderBy: { at: "desc" },
    select: { at: true, user: { select: { name: true } } },
  });
  return conflictMessage(e?.user?.name ?? null, e?.at ?? null);
}

/** A project in a reported workstream (the only ones with pages). */
async function reportedProject(projectId: string) {
  const p = await prisma.project.findUnique({
    where: { id: String(projectId) },
    include: { workstream: { select: { reported: true } } },
  });
  return p && p.workstream.reported ? p : null;
}

// ── Include in weekly report ─────────────────────────────────────────────────────────────────

export async function setIncludedAction(
  projectId: string,
  included: boolean,
  weekKey: string
): Promise<ActionResult<{ included: boolean }>> {
  const { viewer, error } = await editorViewer();
  if (error) return error;
  const closed = weekEditProblem(String(weekKey), new Date());
  if (closed) return fail("CONFLICT", closed);
  const p = await reportedProject(projectId);
  if (!p) return fail("NOT_FOUND", "That project isn't in a reported workstream.");
  const value = included === true;
  if (p.includeInReport !== value) {
    await prisma.$transaction(async (tx) => {
      await tx.project.update({ where: { id: p.id }, data: { includeInReport: value } });
      await writeAudit(tx, viewer.id, updateRows("Project", p.id, p, { includeInReport: value }));
    });
    refresh();
  }
  return ok({ included: value });
}

// ── Weekly update ────────────────────────────────────────────────────────────────────────────

export interface WeeklyUpdateResult {
  state: UpdateState;
  submittedAt: string | null;
  submittedByName: string | null;
  version: string;
}

export async function saveWeeklyUpdateAction(input: {
  projectId: string;
  weekKey: string;
  kind: UpdateState;
  version: string | null;
  values: { status: string; rag: string; percentComplete: number; updateText: string };
}): Promise<ActionResult<WeeklyUpdateResult>> {
  const { viewer, error } = await editorViewer();
  if (error) return error;
  const now = new Date();
  const closed = weekEditProblem(String(input.weekKey), now);
  if (closed) return fail("CONFLICT", closed);
  const kind: UpdateState = input.kind === "SUBMITTED" ? "SUBMITTED" : "DRAFT";
  const parsed = (kind === "SUBMITTED" ? weeklySubmitSchema : weeklyUpdateSchema).safeParse(
    input.values
  );
  if (!parsed.success)
    return fail("VALIDATION", "Check the fields marked.", fieldErrors(parsed.error));
  const p = await reportedProject(input.projectId);
  if (!p) return fail("NOT_FOUND", "That project isn't in a reported workstream.");

  const existing = await prisma.projectWeek.findFirst({
    where: { projectId: p.id, period: { id: input.weekKey } },
  });
  if (!sameVersion(input.version, existing?.updatedAt ?? null)) {
    return fail(
      "CONFLICT",
      existing ? await lastChange("ProjectWeek", existing.id) : conflictMessage(null, null)
    );
  }
  if (existing?.state === "SUBMITTED" && kind === "DRAFT") {
    return fail(
      "CONFLICT",
      "This week's update is already submitted. Use Submit again to change it."
    );
  }

  const values = {
    status: parsed.data.status as ProjectStatus,
    rag: parsed.data.rag as Rag,
    percentComplete: parsed.data.percentComplete,
    updateText: parsed.data.updateText,
    state: kind,
    ...(kind === "SUBMITTED" ? { submittedAt: now, submittedById: viewer.id } : {}),
  };
  const saved = await prisma.$transaction(async (tx) => {
    const period = await ensureOpenPeriod(tx, input.weekKey);
    if (existing) {
      const row = await tx.projectWeek.update({ where: { id: existing.id }, data: values });
      await writeAudit(
        tx,
        viewer.id,
        updateRows("ProjectWeek", existing.id, existing, values),
        now
      );
      return row;
    }
    const row = await tx.projectWeek.create({
      data: { projectId: p.id, periodId: period.id, ...values },
    });
    await writeAudit(
      tx,
      viewer.id,
      [createRow("ProjectWeek", row.id, `${p.jobNumber} ${input.weekKey} ${kind.toLowerCase()}`)],
      now
    );
    return row;
  });
  refresh();
  return ok({
    state: saved.state,
    submittedAt: saved.submittedAt?.toISOString() ?? null,
    submittedByName: saved.submittedAt ? viewer.name : null,
    version: saved.updatedAt.toISOString(),
  });
}

// ── Risks and issues ─────────────────────────────────────────────────────────────────────────

type LogInput = {
  title: string;
  level: string;
  owner: string;
  status: string;
  dueOn: string;
  action: string;
};

function toLogItem(
  kind: LogKind,
  r: {
    id: string;
    ref: string;
    clientId: string;
    projectId: string;
    title: string;
    level: string;
    owner: string;
    status: string;
    raisedOn: Date;
    dueOn: Date | null;
    action: string;
    closedOn: Date | null;
    archivedAt: Date | null;
    updatedAt: Date;
  }
): LogItem {
  return {
    id: r.id,
    kind,
    ref: r.ref,
    clientId: r.clientId,
    projectId: r.projectId,
    title: r.title,
    level: r.level as LogItem["level"],
    owner: r.owner,
    status: r.status as LogItem["status"],
    raisedOn: isoDay(r.raisedOn) as IsoDate,
    dueOn: isoDay(r.dueOn),
    action: r.action,
    closedOn: isoDay(r.closedOn),
    archivedAt: r.archivedAt?.toISOString() ?? null,
    updatedAt: r.updatedAt.toISOString(),
  };
}

const entityOf = (kind: LogKind) => (kind === "RISK" ? "RiskItem" : "IssueItem");

export async function createLogItemAction(input: {
  kind: LogKind;
  projectId: string;
  weekKey: string;
  values: LogInput;
}): Promise<ActionResult<LogItem>> {
  const { viewer, error } = await editorViewer();
  if (error) return error;
  const now = new Date();
  const closed = weekEditProblem(String(input.weekKey), now);
  if (closed) return fail("CONFLICT", closed);
  const kind: LogKind = input.kind === "ISSUE" ? "ISSUE" : "RISK";
  const parsed = (kind === "RISK" ? riskSchema : issueSchema).safeParse(input.values);
  if (!parsed.success)
    return fail("VALIDATION", "Check the fields marked.", fieldErrors(parsed.error));
  const p = await reportedProject(input.projectId);
  if (!p) return fail("NOT_FOUND", "That project isn't in a reported workstream.");
  const today = londonDate(now);
  const d = parsed.data;

  const item = await prisma.$transaction(async (tx) => {
    // The next per-client number, taken in the same transaction and never reused.
    const client = await tx.client.update({
      where: { id: p.clientId },
      data: kind === "RISK" ? { riskSeq: { increment: 1 } } : { issueSeq: { increment: 1 } },
      select: { riskSeq: true, issueSeq: true },
    });
    const ref = formatRef(kind, kind === "RISK" ? client.riskSeq : client.issueSeq);
    const data = {
      clientId: p.clientId,
      projectId: p.id,
      ref,
      title: d.title,
      owner: d.owner,
      status: d.status,
      raisedOn: day(today),
      dueOn: d.dueOn ? day(d.dueOn) : null,
      action: d.action,
      closedOn: d.status === "CLOSED" ? day(today) : null,
    };
    const row =
      kind === "RISK"
        ? await tx.riskItem.create({
            data: { ...data, level: d.level as "HIGH" | "MEDIUM" | "LOW" },
          })
        : await tx.issueItem.create({
            data: { ...data, level: d.level as "BLOCKER" | "HIGH" | "MEDIUM" | "LOW" },
          });
    await writeAudit(tx, viewer.id, [createRow(entityOf(kind), row.id, `${ref} ${d.title}`)], now);
    return row;
  });
  refresh();
  return ok(toLogItem(kind, item));
}

export async function updateLogItemAction(input: {
  kind: LogKind;
  id: string;
  weekKey: string;
  version: string | null;
  values: LogInput;
}): Promise<ActionResult<LogItem>> {
  const { viewer, error } = await editorViewer();
  if (error) return error;
  const now = new Date();
  const closed = weekEditProblem(String(input.weekKey), now);
  if (closed) return fail("CONFLICT", closed);
  const kind: LogKind = input.kind === "ISSUE" ? "ISSUE" : "RISK";
  const parsed = (kind === "RISK" ? riskSchema : issueSchema).safeParse(input.values);
  if (!parsed.success)
    return fail("VALIDATION", "Check the fields marked.", fieldErrors(parsed.error));
  const existing =
    kind === "RISK"
      ? await prisma.riskItem.findUnique({ where: { id: String(input.id) } })
      : await prisma.issueItem.findUnique({ where: { id: String(input.id) } });
  if (!existing || existing.archivedAt) return fail("NOT_FOUND", "That item no longer exists.");
  if (!sameVersion(input.version, existing.updatedAt))
    return fail("CONFLICT", await lastChange(entityOf(kind), existing.id));
  const d = parsed.data;
  const today = londonDate(now);
  const closedOn = closedOnAfter(
    { status: existing.status, closedOn: isoDay(existing.closedOn) },
    d.status,
    today
  );
  const patch = {
    title: d.title,
    level: d.level,
    owner: d.owner,
    status: d.status,
    dueOn: d.dueOn ? day(d.dueOn) : null,
    action: d.action,
    closedOn: closedOn ? day(closedOn) : null,
  };
  const saved = await prisma.$transaction(async (tx) => {
    const row =
      kind === "RISK"
        ? await tx.riskItem.update({
            where: { id: existing.id },
            data: { ...patch, level: d.level as "HIGH" | "MEDIUM" | "LOW" },
          })
        : await tx.issueItem.update({
            where: { id: existing.id },
            data: { ...patch, level: d.level as "BLOCKER" | "HIGH" | "MEDIUM" | "LOW" },
          });
    await writeAudit(tx, viewer.id, updateRows(entityOf(kind), existing.id, existing, patch), now);
    return row;
  });
  refresh();
  return ok(toLogItem(kind, saved));
}

export async function archiveLogItemAction(input: {
  kind: LogKind;
  id: string;
  weekKey: string;
  version: string | null;
}): Promise<ActionResult<null>> {
  const { viewer, error } = await editorViewer();
  if (error) return error;
  const now = new Date();
  const closed = weekEditProblem(String(input.weekKey), now);
  if (closed) return fail("CONFLICT", closed);
  const kind: LogKind = input.kind === "ISSUE" ? "ISSUE" : "RISK";
  const existing =
    kind === "RISK"
      ? await prisma.riskItem.findUnique({ where: { id: String(input.id) } })
      : await prisma.issueItem.findUnique({ where: { id: String(input.id) } });
  if (!existing || existing.archivedAt) return fail("NOT_FOUND", "That item no longer exists.");
  if (!sameVersion(input.version, existing.updatedAt))
    return fail("CONFLICT", await lastChange(entityOf(kind), existing.id));
  await prisma.$transaction(async (tx) => {
    const data = archiveData(viewer.id, now);
    if (kind === "RISK") await tx.riskItem.update({ where: { id: existing.id }, data });
    else await tx.issueItem.update({ where: { id: existing.id }, data });
    await writeAudit(tx, viewer.id, [archiveRow(entityOf(kind), existing.id, existing.ref)], now);
  });
  refresh();
  return ok(null);
}

// ── Pipeline ─────────────────────────────────────────────────────────────────────────────────

type PipelineInput = {
  likelihood: string;
  title: string;
  possibleStart: string;
  mapOwner: string;
  clientOwner: string;
  nextSteps: string;
};

function toOpportunity(r: {
  id: string;
  workstreamId: string;
  likelihood: string;
  title: string;
  possibleStart: Date | null;
  mapOwner: string;
  clientOwner: string;
  nextSteps: string;
  createdAt: Date;
  archivedAt: Date | null;
  updatedAt: Date;
}): PipelineOpportunity {
  return {
    id: r.id,
    workstreamId: r.workstreamId,
    likelihood: r.likelihood as PipelineOpportunity["likelihood"],
    title: r.title,
    possibleStart: isoDay(r.possibleStart),
    mapOwner: r.mapOwner,
    clientOwner: r.clientOwner,
    nextSteps: r.nextSteps,
    createdOn: isoDay(r.createdAt) as IsoDate,
    archivedAt: r.archivedAt?.toISOString() ?? null,
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function savePipelineAction(input: {
  workstreamId: string;
  id: string | null;
  weekKey: string;
  version: string | null;
  values: PipelineInput;
}): Promise<ActionResult<PipelineOpportunity>> {
  const { viewer, error } = await editorViewer();
  if (error) return error;
  const now = new Date();
  const closed = weekEditProblem(String(input.weekKey), now);
  if (closed) return fail("CONFLICT", closed);
  const parsed = pipelineSchema.safeParse(input.values);
  if (!parsed.success)
    return fail("VALIDATION", "Check the fields marked.", fieldErrors(parsed.error));
  const d = parsed.data;
  const data = {
    likelihood: d.likelihood,
    title: d.title,
    possibleStart: d.possibleStart ? day(d.possibleStart) : null,
    mapOwner: d.mapOwner,
    clientOwner: d.clientOwner,
    nextSteps: d.nextSteps,
  };

  if (!input.id) {
    const ws = await prisma.workstream.findUnique({ where: { id: String(input.workstreamId) } });
    if (!ws || !ws.reported) return fail("NOT_FOUND", "That workstream isn't reported.");
    const row = await prisma.$transaction(async (tx) => {
      const created = await tx.pipelineOpportunity.create({
        data: { workstreamId: ws.id, ...data },
      });
      await writeAudit(tx, viewer.id, [createRow("PipelineOpportunity", created.id, d.title)], now);
      return created;
    });
    refresh();
    return ok(toOpportunity(row));
  }

  const existing = await prisma.pipelineOpportunity.findUnique({ where: { id: String(input.id) } });
  if (!existing || existing.archivedAt)
    return fail("NOT_FOUND", "That opportunity no longer exists.");
  if (!sameVersion(input.version, existing.updatedAt))
    return fail("CONFLICT", await lastChange("PipelineOpportunity", existing.id));
  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.pipelineOpportunity.update({ where: { id: existing.id }, data });
    await writeAudit(
      tx,
      viewer.id,
      updateRows("PipelineOpportunity", existing.id, existing, data),
      now
    );
    return updated;
  });
  refresh();
  return ok(toOpportunity(row));
}

export async function archivePipelineAction(input: {
  id: string;
  weekKey: string;
  version: string | null;
}): Promise<ActionResult<null>> {
  const { viewer, error } = await editorViewer();
  if (error) return error;
  const now = new Date();
  const closed = weekEditProblem(String(input.weekKey), now);
  if (closed) return fail("CONFLICT", closed);
  const existing = await prisma.pipelineOpportunity.findUnique({ where: { id: String(input.id) } });
  if (!existing || existing.archivedAt)
    return fail("NOT_FOUND", "That opportunity no longer exists.");
  if (!sameVersion(input.version, existing.updatedAt))
    return fail("CONFLICT", await lastChange("PipelineOpportunity", existing.id));
  await prisma.$transaction(async (tx) => {
    await tx.pipelineOpportunity.update({
      where: { id: existing.id },
      data: archiveData(viewer.id, now),
    });
    await writeAudit(
      tx,
      viewer.id,
      [archiveRow("PipelineOpportunity", existing.id, existing.title)],
      now
    );
  });
  refresh();
  return ok(null);
}
