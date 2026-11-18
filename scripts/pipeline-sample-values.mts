/**
 * One-off (brief 05b): gives Northwind's sample opportunities in the live database the invented
 * values and added dates from the sample data (src/mocks/data.ts). Matches them by their fixed
 * sample ids and only changes opportunities that still have no value. Real clients are never
 * touched (TCCC has no sample opportunities). Each change is recorded in the change history.
 *
 * Shows what it would change; add --apply to write it (live database: ask Paul first).
 * Running it again changes nothing.
 *
 *   npm run pipeline:sample-values
 *   npm run pipeline:sample-values -- --apply
 */
import path from "node:path";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env.local"), quiet: true });
const { prisma } = await import("../src/lib/prisma");
const { PIPELINE } = await import("../src/mocks/data");
const { updateRows } = await import("../src/lib/audit");
const { writeAudit } = await import("../src/lib/audit-db");
const { formatMoney } = await import("../src/lib/pipeline");

const apply = process.argv.includes("--apply");
const sample = new Map(PIPELINE.map((o) => [o.id, o]));
const rows = await prisma.pipelineOpportunity.findMany({
  where: { id: { in: [...sample.keys()] }, estimatedValue: null },
  orderBy: { id: "asc" },
});

for (const row of rows) {
  const s = sample.get(row.id)!;
  console.log(`${row.id}: ${formatMoney(s.estimatedValue)}, added ${s.addedOn} · ${row.title}`);
  if (!apply) continue;
  const data = { estimatedValue: s.estimatedValue, addedOn: new Date(`${s.addedOn}T00:00:00Z`) };
  await prisma.$transaction(async (tx) => {
    await tx.pipelineOpportunity.update({ where: { id: row.id }, data });
    await writeAudit(tx, null, updateRows("PipelineOpportunity", row.id, row, data));
  });
}
console.log(
  apply
    ? `Updated ${rows.length} sample opportunities.`
    : `${rows.length} sample opportunities without a value. Nothing written (add --apply to write).`
);
await prisma.$disconnect();
