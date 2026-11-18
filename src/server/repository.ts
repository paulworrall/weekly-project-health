/**
 * Database repository (brief 02): loads the data from Neon with Prisma and builds the same view
 * models as the sample data (src/lib/views.ts). Pages call `await getRepository()` once per
 * request; React's `cache` shares one load between the layout and the page.
 *
 * Saves go through Server Actions (src/server/actions, brief 05); closed weeks read their
 * snapshots (brief 06). Loading everything per request is fine at pilot size (~1,500 projects);
 * brief 07 moves the heavier aggregations into queries.
 */
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { snapshotWindow } from "@/lib/snapshot";
import { createViews, type Views } from "@/lib/views";
import { datasetFromRows, type DbRows } from "./rows";

/**
 * Loads everything, with the closed-week snapshots around the week being shown (`weekParam`,
 * the open week by default): see `snapshotWindow`.
 */
export async function loadRows(
  now: Date = new Date(),
  weekParam?: string | string[]
): Promise<DbRows> {
  const win = snapshotWindow(now, weekParam);
  const projectPeriods = { closesAt: { gt: win.projectsFrom, lte: win.to } };
  const logPeriods = { closesAt: { gt: win.logsFrom, lte: win.to } };
  const [
    users,
    clients,
    workstreams,
    projects,
    periods,
    projectWeeks,
    uploads,
    uploadChanges,
    uploadRowErrors,
    projectSpends,
    risks,
    issues,
    pipeline,
    auditEvents,
    projectSnapshots,
    pipelineSnapshots,
    logSnapshots,
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
        updatedAt: true,
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
        decision: true,
      },
    }),
    prisma.spendUploadRow.findMany({
      where: { error: { not: null }, upload: { status: "READY_TO_REVIEW" } },
      select: { uploadId: true, rowNumber: true, error: true },
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
        estimatedValue: true,
        possibleStart: true,
        addedOn: true,
        mapOwner: true,
        clientOwner: true,
        nextSteps: true,
        createdAt: true,
        archivedAt: true,
        updatedAt: true,
      },
    }),
    // The change history is queried on its own page (src/server/history.ts, brief 08).
    Promise.resolve([] as DbRows["auditEvents"]),
    // Closed-week snapshots (brief 06) for the weeks the shown week's trends need (phase 7).
    prisma.projectWeekSnapshot.findMany({
      where: { period: projectPeriods },
      select: { periodId: true, projectId: true, data: true },
    }),
    prisma.pipelineWeekSnapshot.findMany({
      where: { period: projectPeriods },
      select: { periodId: true, workstreamId: true, data: true },
    }),
    prisma.logWeekSnapshot.findMany({
      where: { period: logPeriods },
      select: { periodId: true, clientId: true, data: true },
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
    uploadRowErrors,
    projectSpends,
    risks,
    issues,
    pipeline,
    auditEvents,
    snapshots: { projects: projectSnapshots, pipelines: pipelineSnapshots, logs: logSnapshots },
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
  updatedAt: true,
} as const;

const load = cache(async (week: string | undefined): Promise<Views> => {
  const now = new Date();
  return createViews(datasetFromRows(await loadRows(now, week), now));
});

/**
 * The views over the live database, loaded once per request. Pass the page's `?week=` so a
 * past week reads its own snapshots and those its trends need.
 */
export function getRepository(week?: string | string[]): Promise<Views> {
  return load(typeof week === "string" ? week : undefined);
}
