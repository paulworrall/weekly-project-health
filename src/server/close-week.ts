/**
 * Automatic week close (brief 06, CLAUDE.md §7). Run by Vercel Cron through
 * /api/cron/close-week, and by hand with `npm run week:close`.
 *
 * For each week due to close (oldest first), in one transaction: mark the period Closed (only
 * if it is still Open, so a second run does nothing), write the project, pipeline and log
 * snapshots, and record the close in the change history. Then make sure the open week exists.
 * Saves for a week are already refused once its Friday 23:59 has passed (brief 05), so the
 * snapshot records the week as it was at the close even if the job runs hours later.
 */
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit-db";
import { buildWeekSnapshots, weeksToClose, type WeekSnapshots } from "@/lib/snapshot";
import { currentWeek, formatWeekParam, type WeekRef } from "@/lib/week";
import { ensureOpenPeriod } from "./periods";
import { loadRows } from "./repository";
import { datasetFromRows } from "./rows";

const json = (x: unknown) => x as Prisma.InputJsonValue;

export interface CloseResult {
  /** Weeks closed by this run, e.g. ["2026-W47"]. */
  closed: string[];
  /** The open week after the run. */
  open: string;
}

/** Saves one week's snapshots in a transaction (used by the close and the one-off backfill). */
export async function saveSnapshots(
  tx: Prisma.TransactionClient,
  periodId: string,
  snaps: WeekSnapshots
): Promise<number> {
  const a = await tx.projectWeekSnapshot.createMany({
    data: snaps.projects.map((s) => ({ periodId, projectId: s.projectId, data: json(s.data) })),
    skipDuplicates: true,
  });
  const b = await tx.pipelineWeekSnapshot.createMany({
    data: snaps.pipelines.map((s) => ({
      periodId,
      workstreamId: s.workstreamId,
      data: json(s.data),
    })),
    skipDuplicates: true,
  });
  const c = await tx.logWeekSnapshot.createMany({
    data: snaps.logs.map((s) => ({ periodId, clientId: s.clientId, data: json(s.data) })),
    skipDuplicates: true,
  });
  return a.count + b.count + c.count;
}

async function closeOne(ref: WeekRef, snaps: WeekSnapshots, now: Date): Promise<boolean> {
  const key = formatWeekParam(ref);
  return prisma.$transaction(
    async (tx) => {
      const period = await ensureOpenPeriod(tx, key);
      const { count } = await tx.reportingPeriod.updateMany({
        where: { id: period.id, state: "OPEN" },
        data: { state: "CLOSED", closedAt: now },
      });
      if (count === 0) return false; // already closed by another run
      await saveSnapshots(tx, period.id, snaps);
      await writeAudit(
        tx,
        null,
        [
          {
            action: "UPDATE",
            entity: "ReportingPeriod",
            entityId: period.id,
            field: "state",
            oldValue: "OPEN",
            newValue: "CLOSED",
          },
        ],
        now
      );
      return true;
    },
    { timeout: 60_000, maxWait: 10_000 }
  );
}

/** Closes every week due at `now`. Safe to run any number of times. */
export async function closeDueWeeks(now: Date = new Date()): Promise<CloseResult> {
  const periods = await prisma.reportingPeriod.findMany({
    select: { isoYear: true, isoWeek: true, state: true },
  });
  const due = weeksToClose(periods, now);
  const closed: string[] = [];
  if (due.length) {
    // One load serves every due week: each snapshot is worked out as at its own Friday.
    const ds = datasetFromRows(await loadRows(now), now);
    for (const ref of due) {
      if (await closeOne(ref, buildWeekSnapshots(ds, ref), now)) closed.push(formatWeekParam(ref));
    }
  }
  const open = formatWeekParam(currentWeek(now));
  await prisma.$transaction((tx) => ensureOpenPeriod(tx, open));
  return { closed, open };
}
