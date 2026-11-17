/**
 * One-off (brief 06, decision 17 Nov 2026): writes snapshots for closed weeks that have none,
 * which are the sample weeks the seed created before the automatic close existed. Each client is
 * left out of weeks that ended before its first confirmed spend upload (it wasn't in the tool
 * yet). "Include in weekly report" and Reported workstreams are taken as they are today, since
 * their history wasn't kept before snapshots.
 *
 * Shows what it would write; add --apply to write it (live database: ask Paul first).
 * Running it again writes nothing.
 *
 *   npm run snapshots:backfill
 *   npm run snapshots:backfill -- --apply
 */
import path from "node:path";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env.local"), quiet: true });
const { prisma } = await import("../src/lib/prisma");
const { loadRows } = await import("../src/server/repository");
const { datasetFromRows } = await import("../src/server/rows");
const { saveSnapshots } = await import("../src/server/close-week");
const { buildWeekSnapshots } = await import("../src/lib/snapshot");
const { formatWeekParam, weekRange } = await import("../src/lib/week");

const apply = process.argv.includes("--apply");
const now = new Date();
const ds = datasetFromRows(await loadRows(), now);

const periods = await prisma.reportingPeriod.findMany({
  where: { state: "CLOSED", projectSnapshots: { none: {} } },
  orderBy: [{ isoYear: "asc" }, { isoWeek: "asc" }],
});

// First confirmed upload per client: weeks ending before it are skipped for that client.
const firstUpload = new Map<string, string>();
for (const u of ds.uploads.filter((x) => x.status === "LIVE" || x.status === "REPLACED")) {
  const prev = firstUpload.get(u.clientId);
  if (!prev || u.extractDate < prev) firstUpload.set(u.clientId, u.extractDate);
}
const projectClient = new Map(ds.projects.map((p) => [p.id, p.clientId]));
const wsClient = new Map(ds.workstreams.map((w) => [w.id, w.clientId]));
const clientName = new Map(ds.clients.map((c) => [c.id, c.name]));

let total = 0;
for (const p of periods) {
  const ref = { isoYear: p.isoYear, isoWeek: p.isoWeek };
  const friday = weekRange(ref).friday;
  const inTool = (clientId: string | undefined) => {
    const first = clientId ? firstUpload.get(clientId) : undefined;
    return !!first && first <= friday;
  };
  const all = buildWeekSnapshots(ds, ref);
  const snaps = {
    ...all,
    projects: all.projects.filter((s) => inTool(projectClient.get(s.projectId))),
    pipelines: all.pipelines.filter((s) => inTool(wsClient.get(s.workstreamId))),
    logs: all.logs.filter((s) => inTool(s.clientId)),
  };
  const clients = snaps.logs.map((l) => clientName.get(l.clientId)).join(", ") || "none";
  console.log(
    `${formatWeekParam(ref)}: ${snaps.projects.length} projects (${snaps.projects.filter((s) => s.data.notUpdated).length} not updated), ${snaps.pipelines.length} pipelines, ${snaps.logs.length} logs · clients: ${clients}`
  );
  if (apply) {
    total += await prisma.$transaction((tx) => saveSnapshots(tx, p.id, snaps), {
      timeout: 60_000,
    });
  }
}
console.log(
  apply
    ? `Written: ${total} snapshot records.`
    : `${periods.length} closed weeks without snapshots. Nothing written (add --apply to write).`
);
await prisma.$disconnect();
