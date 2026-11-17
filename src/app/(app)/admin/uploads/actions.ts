"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createRow, updateRows, type AuditRow } from "@/lib/audit";
import { writeAudit } from "@/lib/audit-db";
import { londonDate } from "@/lib/dates";
import { confirmProblem, diffSpendFile, type LiveProject } from "@/lib/spend-diff";
import { adminViewer } from "@/server/guards";
import { parseSpendFile } from "@/services/parsing/spend-file";
import { fail, ok, type ActionResult } from "@/types/action-result";
import type { MissingDecision, Spend } from "@/types/domain";
import { fieldErrors } from "@/types/schemas";

/**
 * Admin › Spend uploads (brief 04): check → preview with decisions → confirm (or cancel), plus
 * the workstream Reported and Account Director settings. Admin-only, checked in every action.
 * Every attempt is kept; nothing is deleted. Parsing is deterministic code (no AI).
 */

const MAX_BYTES = 4 * 1024 * 1024;
const TX = { timeout: 60_000, maxWait: 10_000 };

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function refresh() {
  revalidatePath("/", "layout");
}

const checkSchema = z.object({
  clientId: z.string().min(1, { error: "Choose a client." }),
  extractDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Enter the extract date." }),
});

export type CheckResult = {
  status: "READY_TO_REVIEW" | "REJECTED";
  reason?: string;
  errors: number;
};

/** Step 1 → 2: store the file, check it, compare it with live data, and save the preview. */
export async function checkFileAction(formData: FormData): Promise<ActionResult<CheckResult>> {
  const { viewer, error } = await adminViewer();
  if (error) return error;
  const parsed = checkSchema.safeParse({
    clientId: String(formData.get("clientId") ?? ""),
    extractDate: String(formData.get("extractDate") ?? ""),
  });
  const file = formData.get("file");
  const errs: Record<string, string> = parsed.success ? {} : fieldErrors(parsed.error);
  if (!(file instanceof File) || file.size === 0) errs.fileName = "Choose the spend file.";
  else if (!/\.xlsx$/i.test(file.name)) errs.fileName = "Choose an Excel file (.xlsx).";
  else if (file.size > MAX_BYTES) errs.fileName = "The file is larger than 4 MB.";
  if (parsed.success && parsed.data.extractDate > londonDate(new Date()))
    errs.extractDate = "The extract date can't be in the future.";
  if (Object.keys(errs).length || !parsed.success || !(file instanceof File))
    return fail("VALIDATION", "Check the form.", errs);

  const { clientId, extractDate } = parsed.data;
  const client = await prisma.client.findFirst({ where: { id: clientId, archivedAt: null } });
  if (!client) return fail("VALIDATION", "Check the form.", { clientId: "Choose a client." });

  const bytes = Buffer.from(await file.arrayBuffer());
  const result = await parseSpendFile(bytes);
  const now = new Date();

  // Live data to compare with: projects, their workstream names and the live % spend.
  const [projects, workstreams, liveUpload] = await Promise.all([
    prisma.project.findMany({
      where: { clientId },
      select: { id: true, jobNumber: true, name: true, workstream: { select: { name: true } } },
    }),
    prisma.workstream.findMany({ where: { clientId }, select: { name: true } }),
    prisma.spendUpload.findFirst({
      where: { clientId, status: "LIVE" },
      orderBy: { uploadedAt: "desc" },
      select: { id: true },
    }),
  ]);
  const spends = liveUpload
    ? await prisma.projectSpend.findMany({
        where: { uploadId: liveUpload.id },
        select: { projectId: true, percentSpent: true, spendStatus: true },
      })
    : [];
  const spendBy = new Map<string, Spend>(
    spends.map((s) => [
      s.projectId,
      {
        percentSpent: s.percentSpent === null ? null : Number(s.percentSpent),
        spendStatus: s.spendStatus,
      },
    ])
  );
  const live: LiveProject[] = projects.map((p) => ({
    id: p.id,
    jobNumber: p.jobNumber,
    name: p.name,
    workstreamName: p.workstream.name,
    spend: spendBy.get(p.id) ?? null,
  }));
  const diff = result.ok
    ? diffSpendFile(
        result.rows,
        live,
        workstreams.map((w) => w.name)
      )
    : null;

  await prisma.$transaction(async (tx) => {
    // Only one preview per client: an earlier file still waiting is cancelled (decision 17 Nov).
    const waiting = await tx.spendUpload.findMany({
      where: { clientId, status: "READY_TO_REVIEW" },
      select: { id: true, fileName: true },
    });
    const audit: AuditRow[] = [];
    for (const w of waiting) {
      await tx.spendUpload.update({
        where: { id: w.id },
        data: { status: "CANCELLED", note: "Replaced by a newer file before review." },
      });
      audit.push(
        ...updateRows("SpendUpload", w.id, { status: "READY_TO_REVIEW" }, { status: "CANCELLED" })
      );
    }
    const upload = await tx.spendUpload.create({
      data: {
        clientId,
        uploadedById: viewer.id,
        uploadedAt: now,
        extractDate: day(extractDate),
        fileName: file.name,
        file: bytes,
        status: result.ok ? "READY_TO_REVIEW" : "REJECTED",
        note: result.ok ? null : result.reason,
        rowCount: result.ok ? result.rowCount : null,
        newCount: diff ? diff.counts.new : null,
        changedCount: diff ? diff.counts.renamed + diff.counts.moved + diff.counts.spend : null,
        missingCount: diff ? diff.counts.missing : null,
        errorCount: result.ok ? result.errors.length : 1,
      },
    });
    audit.push(createRow("SpendUpload", upload.id, file.name));
    if (result.ok) {
      await tx.spendUploadRow.createMany({
        data: [
          ...result.rows.map((r) => ({
            uploadId: upload.id,
            rowNumber: r.rowNumber,
            jobNumber: r.jobNumber,
            projectName: r.name,
            workstreamName: r.workstream,
            percentSpent: r.percentSpent,
            spendStatus: r.spendStatus,
          })),
          ...result.errors.map((e) => ({
            uploadId: upload.id,
            rowNumber: e.rowNumber,
            jobNumber: "",
            projectName: "",
            workstreamName: "",
            error: e.message,
          })),
        ],
      });
      await tx.spendUploadChange.createMany({
        data: (diff?.changes ?? []).map((c) => ({
          uploadId: upload.id,
          type: c.type,
          field: c.field ?? null,
          jobNumber: c.jobNumber,
          projectName: c.projectName,
          workstreamName: c.workstreamName,
          before: c.before,
          after: c.after,
        })),
      });
    }
    await writeAudit(tx, viewer.id, audit, now);
  }, TX);

  refresh();
  return ok(
    result.ok
      ? { status: "READY_TO_REVIEW", errors: result.errors.length }
      : { status: "REJECTED", reason: result.reason, errors: 1 }
  );
}

/** Keep as is / Mark "No longer in file" for one missing project. Saved straight away. */
export async function decideAction(
  changeId: string,
  decision: string
): Promise<ActionResult<null>> {
  const { viewer, error } = await adminViewer();
  if (error) return error;
  const d = z.enum(["KEEP", "MARK"]).safeParse(decision);
  if (!d.success) return fail("VALIDATION", "Choose Keep as is or Mark.");
  const change = await prisma.spendUploadChange.findUnique({
    where: { id: String(changeId) },
    include: { upload: { select: { status: true } } },
  });
  if (!change || change.type !== "MISSING")
    return fail("NOT_FOUND", "That change no longer exists.");
  if (change.upload.status !== "READY_TO_REVIEW")
    return fail("CONFLICT", "This upload isn't waiting for review any more.");
  await prisma.$transaction(async (tx) => {
    await tx.spendUploadChange.update({
      where: { id: change.id },
      data: { decision: d.data as MissingDecision },
    });
    await writeAudit(
      tx,
      viewer.id,
      updateRows("SpendUploadChange", change.id, change, { decision: d.data })
    );
  });
  return ok(null);
}

/** Step 3: apply the file to the client's live data in one transaction. */
export async function confirmUploadAction(
  uploadId: string
): Promise<ActionResult<{ rows: number }>> {
  const { viewer, error } = await adminViewer();
  if (error) return error;
  const upload = await prisma.spendUpload.findUnique({
    where: { id: String(uploadId) },
    include: { changes: true, rows: { where: { error: null } } },
  });
  if (!upload) return fail("NOT_FOUND", "That upload no longer exists.");
  const problem = confirmProblem(upload, upload.changes, upload.rows.length);
  if (problem) return fail("CONFLICT", problem);
  const now = new Date();
  const clientId = upload.clientId;

  await prisma.$transaction(async (tx) => {
    const audit: AuditRow[] = [];
    // Workstreams: create the new ones, Hidden (spec).
    const wsByName = new Map(
      (await tx.workstream.findMany({ where: { clientId }, select: { id: true, name: true } })).map(
        (w) => [w.name, w.id]
      )
    );
    for (const name of [...new Set(upload.rows.map((r) => r.workstreamName))]) {
      if (wsByName.has(name)) continue;
      const w = await tx.workstream.create({
        data: { clientId, name, reported: false, firstSeen: upload.extractDate },
      });
      wsByName.set(name, w.id);
      audit.push(createRow("Workstream", w.id, name));
    }
    // Projects: create new ones; rename and move existing ones (the file is the source of truth);
    // a project back in the file clears its "missing" marks.
    const existing = new Map(
      (await tx.project.findMany({ where: { clientId } })).map((p) => [p.jobNumber, p])
    );
    const toCreate = upload.rows.filter((r) => !existing.has(r.jobNumber));
    if (toCreate.length) {
      await tx.project.createMany({
        data: toCreate.map((r) => ({
          clientId,
          workstreamId: wsByName.get(r.workstreamName) as string,
          jobNumber: r.jobNumber,
          name: r.projectName,
        })),
      });
    }
    for (const r of upload.rows) {
      const p = existing.get(r.jobNumber);
      if (!p) continue;
      const patch: Record<string, unknown> = {};
      if (p.name !== r.projectName) patch.name = r.projectName;
      const wsId = wsByName.get(r.workstreamName) as string;
      if (p.workstreamId !== wsId) patch.workstreamId = wsId;
      if (p.missingFromFileSince) patch.missingFromFileSince = null;
      if (p.markedNoLongerInFileAt) patch.markedNoLongerInFileAt = null;
      if (Object.keys(patch).length) {
        await tx.project.update({ where: { id: p.id }, data: patch });
        audit.push(...updateRows("Project", p.id, p, patch));
      }
    }
    const projects = new Map(
      (
        await tx.project.findMany({ where: { clientId }, select: { id: true, jobNumber: true } })
      ).map((p) => [p.jobNumber, p.id])
    );
    for (const r of toCreate) {
      const id = projects.get(r.jobNumber);
      if (id) audit.push(createRow("Project", id, `${r.jobNumber} ${r.projectName}`));
    }
    // % spend from this upload for every project in the file.
    await tx.projectSpend.createMany({
      data: upload.rows.map((r) => ({
        projectId: projects.get(r.jobNumber) as string,
        uploadId: upload.id,
        percentSpent: r.spendStatus === "VALUE" ? r.percentSpent : null,
        spendStatus: r.spendStatus ?? "NO_BUDGET",
      })),
    });
    // Missing projects stay in the report and lists; the marks are information only.
    for (const c of upload.changes.filter((x) => x.type === "MISSING")) {
      const p = existing.get(c.jobNumber);
      if (!p) continue;
      const patch: Record<string, unknown> = {};
      if (!p.missingFromFileSince) patch.missingFromFileSince = upload.extractDate;
      if (c.decision === "MARK" && !p.markedNoLongerInFileAt) patch.markedNoLongerInFileAt = now;
      if (Object.keys(patch).length) {
        await tx.project.update({ where: { id: p.id }, data: patch });
        audit.push(...updateRows("Project", p.id, p, patch));
      }
    }
    // The previous live upload is replaced by this one.
    const previous = await tx.spendUpload.findMany({
      where: { clientId, status: "LIVE", id: { not: upload.id } },
      select: { id: true },
    });
    await tx.spendUpload.updateMany({
      where: { id: { in: previous.map((p) => p.id) } },
      data: { status: "REPLACED" },
    });
    for (const p of previous)
      audit.push(...updateRows("SpendUpload", p.id, { status: "LIVE" }, { status: "REPLACED" }));
    await tx.spendUpload.update({ where: { id: upload.id }, data: { status: "LIVE" } });
    audit.push(
      ...updateRows("SpendUpload", upload.id, { status: "READY_TO_REVIEW" }, { status: "LIVE" })
    );
    await writeAudit(tx, viewer.id, audit, now);
  }, TX);

  refresh();
  return ok({ rows: upload.rows.length });
}

/** Cancel a file waiting for review. It stays in the history as Cancelled. */
export async function cancelUploadAction(uploadId: string): Promise<ActionResult<null>> {
  const { viewer, error } = await adminViewer();
  if (error) return error;
  const upload = await prisma.spendUpload.findUnique({ where: { id: String(uploadId) } });
  if (!upload) return fail("NOT_FOUND", "That upload no longer exists.");
  if (upload.status !== "READY_TO_REVIEW")
    return fail("CONFLICT", "This upload isn't waiting for review any more.");
  await prisma.$transaction(async (tx) => {
    await tx.spendUpload.update({
      where: { id: upload.id },
      data: { status: "CANCELLED", note: "Cancelled at preview." },
    });
    await writeAudit(
      tx,
      viewer.id,
      updateRows("SpendUpload", upload.id, upload, { status: "CANCELLED" })
    );
  });
  refresh();
  return ok(null);
}

/** Workstream Reported on/off. Reported workstreams have pages and appear in reports. */
export async function setReportedAction(
  workstreamId: string,
  reported: boolean
): Promise<ActionResult<null>> {
  const { viewer, error } = await adminViewer();
  if (error) return error;
  const w = await prisma.workstream.findUnique({ where: { id: String(workstreamId) } });
  if (!w) return fail("NOT_FOUND", "That workstream no longer exists.");
  const value = reported === true;
  await prisma.$transaction(async (tx) => {
    await tx.workstream.update({ where: { id: w.id }, data: { reported: value } });
    await writeAudit(tx, viewer.id, updateRows("Workstream", w.id, w, { reported: value }));
  });
  refresh();
  return ok(null);
}

const adSchema = z.string().trim().max(80, { error: "Keep the name under 80 characters." });

/** Free-text Account Director for a workstream (decision 17 Nov). Empty clears it. */
export async function setAccountDirectorAction(
  workstreamId: string,
  name: string
): Promise<ActionResult<{ accountDirector: string | null }>> {
  const { viewer, error } = await adminViewer();
  if (error) return error;
  const parsed = adSchema.safeParse(String(name ?? ""));
  if (!parsed.success)
    return fail("VALIDATION", "Check the name.", {
      accountDirector: parsed.error.issues[0].message,
    });
  const w = await prisma.workstream.findUnique({ where: { id: String(workstreamId) } });
  if (!w) return fail("NOT_FOUND", "That workstream no longer exists.");
  const value = parsed.data || null;
  if (value === w.accountDirector) return ok({ accountDirector: value });
  await prisma.$transaction(async (tx) => {
    await tx.workstream.update({ where: { id: w.id }, data: { accountDirector: value } });
    await writeAudit(tx, viewer.id, updateRows("Workstream", w.id, w, { accountDirector: value }));
  });
  refresh();
  return ok({ accountDirector: value });
}
