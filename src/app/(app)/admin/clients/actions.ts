"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { archiveData, restoreData } from "@/lib/archive";
import { archiveRow, createRow, restoreRow, updateRows } from "@/lib/audit";
import { writeAudit } from "@/lib/audit-db";
import { clientNameProblem, clientNameSchema } from "@/lib/clients";
import { adminViewer } from "@/server/guards";
import { fail, ok, type ActionResult } from "@/types/action-result";
import { fieldErrors } from "@/types/schemas";

/**
 * Admin › Clients (brief 08, CLAUDE.md §6). Admin only, checked here on the server. Each change
 * is saved with its audit row in one transaction. Archiving hides the client everywhere (lists,
 * pages, uploads, reports) and keeps everything; restoring brings it back as it was.
 */

function done() {
  for (const p of ["/admin/clients", "/admin", "/clients", "/admin/uploads"]) revalidatePath(p);
}

async function allClients() {
  return prisma.client.findMany({ select: { id: true, name: true, archivedAt: true } });
}

export async function createClientAction(input: {
  name: string;
}): Promise<ActionResult<{ id: string; name: string }>> {
  const { viewer, error } = await adminViewer();
  if (error) return error;
  const parsed = clientNameSchema.safeParse({ name: String(input?.name ?? "") });
  if (!parsed.success) return fail("VALIDATION", "Check the form.", fieldErrors(parsed.error));
  const problem = clientNameProblem(parsed.data.name, await allClients());
  if (problem) return fail("CONFLICT", "Check the form.", { name: problem });
  const client = await prisma.$transaction(async (tx) => {
    const c = await tx.client.create({ data: { name: parsed.data.name } });
    await writeAudit(tx, viewer.id, [createRow("Client", c.id, c.name)]);
    return c;
  });
  done();
  return ok({ id: client.id, name: client.name });
}

export async function renameClientAction(
  clientId: string,
  input: { name: string }
): Promise<ActionResult<{ name: string }>> {
  const { viewer, error } = await adminViewer();
  if (error) return error;
  const target = await prisma.client.findUnique({ where: { id: String(clientId) } });
  if (!target) return fail("NOT_FOUND", "That client no longer exists.");
  if (target.archivedAt) return fail("CONFLICT", "Restore the client before renaming it.");
  const parsed = clientNameSchema.safeParse({ name: String(input?.name ?? "") });
  if (!parsed.success) return fail("VALIDATION", "Check the form.", fieldErrors(parsed.error));
  if (parsed.data.name === target.name) return ok({ name: target.name });
  const problem = clientNameProblem(parsed.data.name, await allClients(), target.id);
  if (problem) return fail("CONFLICT", "Check the form.", { name: problem });
  await prisma.$transaction(async (tx) => {
    await tx.client.update({ where: { id: target.id }, data: { name: parsed.data.name } });
    await writeAudit(
      tx,
      viewer.id,
      updateRows("Client", target.id, target, { name: parsed.data.name })
    );
  });
  done();
  revalidatePath(`/clients/${target.id}`);
  return ok({ name: parsed.data.name });
}

export async function archiveClientAction(clientId: string): Promise<ActionResult<null>> {
  return setArchived(clientId, true);
}

export async function restoreClientAction(clientId: string): Promise<ActionResult<null>> {
  return setArchived(clientId, false);
}

async function setArchived(clientId: string, archive: boolean): Promise<ActionResult<null>> {
  const { viewer, error } = await adminViewer();
  if (error) return error;
  const target = await prisma.client.findUnique({ where: { id: String(clientId) } });
  if (!target) return fail("NOT_FOUND", "That client no longer exists.");
  if (!!target.archivedAt === archive) return ok(null); // already done (e.g. a second click)
  if (archive) {
    const staged = await prisma.spendUpload.count({
      where: { clientId: target.id, status: { in: ["CHECKING", "READY_TO_REVIEW"] } },
    });
    if (staged)
      return fail(
        "CONFLICT",
        "This client has a spend upload waiting for review. Confirm or cancel it first."
      );
  }
  await prisma.$transaction(async (tx) => {
    await tx.client.update({
      where: { id: target.id },
      data: archive ? archiveData(viewer.id) : restoreData(),
    });
    await writeAudit(tx, viewer.id, [
      archive
        ? archiveRow("Client", target.id, target.name)
        : restoreRow("Client", target.id, target.name),
    ]);
  });
  done();
  revalidatePath(`/clients/${target.id}`);
  return ok(null);
}
