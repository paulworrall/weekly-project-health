/**
 * Dry run of a spend upload (brief 04): parses a file and compares it with a client's live data,
 * printing what the preview would show. Read-only: saves nothing.
 *
 *   npm run upload:dry-run -- --client tccc --file "<path>.xlsx"
 */
import path from "node:path";
import { readFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env.local"), quiet: true });
const { parseSpendFile } = await import("../src/services/parsing/spend-file");
const { diffSpendFile } = await import("../src/lib/spend-diff");
const { prisma } = await import("../src/lib/prisma");

function arg(name: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  if (!v) throw new Error(`Missing --${name}`);
  return v;
}

const clientId = arg("client");
const r = await parseSpendFile(readFileSync(arg("file")));
if (!r.ok) {
  console.log(`Would be REJECTED: ${r.reason}`);
} else {
  console.log(
    `Rows read: ${r.rowCount} · usable: ${r.rows.length} · with errors: ${r.errors.length}`
  );
  for (const e of r.errors.slice(0, 10)) console.log(`  Row ${e.rowNumber}: ${e.message}`);
  const projects = await prisma.project.findMany({
    where: { clientId },
    select: { id: true, jobNumber: true, name: true, workstream: { select: { name: true } } },
  });
  const workstreams = await prisma.workstream.findMany({
    where: { clientId },
    select: { name: true },
  });
  const live = await prisma.spendUpload.findFirst({
    where: { clientId, status: "LIVE" },
    orderBy: { uploadedAt: "desc" },
    select: { id: true, extractDate: true },
  });
  const spends = live ? await prisma.projectSpend.findMany({ where: { uploadId: live.id } }) : [];
  const spendBy = new Map(
    spends.map((s) => [
      s.projectId,
      {
        percentSpent: s.percentSpent === null ? null : Number(s.percentSpent),
        spendStatus: s.spendStatus,
      },
    ])
  );
  const d = diffSpendFile(
    r.rows,
    projects.map((p) => ({
      id: p.id,
      jobNumber: p.jobNumber,
      name: p.name,
      workstreamName: p.workstream.name,
      spend: spendBy.get(p.id) ?? null,
    })),
    workstreams.map((w) => w.name)
  );
  console.log(
    `Compared with the live upload of ${live?.extractDate.toISOString().slice(0, 10) ?? "none"}:`,
    d.counts,
    `· new workstreams: ${d.newWorkstreams.length}`
  );
}
await prisma.$disconnect();
