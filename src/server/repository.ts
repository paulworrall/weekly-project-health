/**
 * Database repository (brief 02): loads the data from Neon with Prisma and builds the same view
 * models as the sample data (src/lib/views.ts). Pages call `await getRepository()` once per
 * request; React's `cache` shares one load between the layout and the page.
 *
 * Read-only for now: saving edits arrives in brief 05 (decision log, 17 Nov 2026). Loading
 * everything per request is fine at pilot size (~1,500 projects); brief 07 moves the heavier
 * aggregations into queries.
 */
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { createViews, type Views } from "@/lib/views";
import { datasetFromRows, type DbRows } from "./rows";

export async function loadRows(): Promise<DbRows> {
  const [
    users,
    clients,
    workstreams,
    projects,
    periods,
    projectWeeks,
    uploads,
    uploadChanges,
    projectSpends,
    risks,
    issues,
    pipeline,
    auditEvents,
  ] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        initials: true,
        email: true,
        role: true,
        lastSignInAt: true,
        archivedAt: true,
      },
    }),
    prisma.client.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, riskSeq: true, issueSeq: true, archivedAt: true },
    }),
    prisma.workstream.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        clientId: true,
        name: true,
        reported: true,
        accountDirector: true,
        firstSeen: true,
      },
    }),
    prisma.project.findMany({
      orderBy: { jobNumber: "asc" },
      select: {
        id: true,
        clientId: true,
        workstreamId: true,
        jobNumber: true,
        name: true,
        includeInReport: true,
        missingFromFileSince: true,
        markedNoLongerInFileAt: true,
      },
    }),
    prisma.reportingPeriod.findMany({
      orderBy: [{ isoYear: "asc" }, { isoWeek: "asc" }],
      select: {
        id: true,
        isoYear: true,
        isoWeek: true,
        startsOn: true,
        endsOn: true,
        closesAt: true,
        state: true,
        closedAt: true,
      },
    }),
    prisma.projectWeek.findMany({
      select: {
        id: true,
        projectId: true,
        periodId: true,
        status: true,
        rag: true,
        percentComplete: true,
        updateText: true,
        state: true,
        submittedAt: true,
        submittedById: true,
        notUpdated: true,
      },
    }),
    prisma.spendUpload.findMany({
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true,
        clientId: true,
        uploadedById: true,
        uploadedAt: true,
        extractDate: true,
        fileName: true,
        status: true,
        note: true,
        rowCount: true,
        newCount: true,
        changedCount: true,
        missingCount: true,
        errorCount: true,
      },
    }),
    prisma.spendUploadChange.findMany({
      where: { upload: { status: "READY_TO_REVIEW" } },
      orderBy: { id: "asc" },
      select: {
        id: true,
        uploadId: true,
        type: true,
        field: true,
        jobNumber: true,
        projectName: true,
        workstreamName: true,
        before: true,
        after: true,
      },
    }),
    prisma.projectSpend.findMany({
      select: { id: true, projectId: true, uploadId: true, percentSpent: true, spendStatus: true },
    }),
    prisma.riskItem.findMany({
      orderBy: { ref: "asc" },
      select: logSelect,
    }),
    prisma.issueItem.findMany({
      orderBy: { ref: "asc" },
      select: logSelect,
    }),
    prisma.pipelineOpportunity.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        workstreamId: true,
        likelihood: true,
        title: true,
        possibleStart: true,
        mapOwner: true,
        clientOwner: true,
        nextSteps: true,
        createdAt: true,
        archivedAt: true,
      },
    }),
    prisma.auditEvent.findMany({
      orderBy: { at: "desc" },
      take: 200,
      select: {
        id: true,
        at: true,
        userId: true,
        entity: true,
        entityId: true,
        action: true,
        field: true,
        oldValue: true,
        newValue: true,
      },
    }),
  ]);
  return {
    users,
    clients,
    workstreams,
    projects,
    periods,
    projectWeeks,
    uploads,
    uploadChanges,
    projectSpends,
    risks,
    issues,
    pipeline,
    auditEvents,
  };
}

const logSelect = {
  id: true,
  clientId: true,
  projectId: true,
  ref: true,
  title: true,
  level: true,
  owner: true,
  status: true,
  raisedOn: true,
  dueOn: true,
  action: true,
  closedOn: true,
  archivedAt: true,
} as const;

/** The views over the live database, loaded once per request. */
export const getRepository = cache(async (): Promise<Views> => {
  const rows = await loadRows();
  return createViews(datasetFromRows(rows, new Date()));
});
