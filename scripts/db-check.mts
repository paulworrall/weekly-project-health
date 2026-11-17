/**
 * Read-only check of the live database (brief 02): counts per client and one page view each,
 * built exactly as the site builds them. Changes nothing.
 *
 *   npm run db:check
 */
import path from "node:path";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env.local"), quiet: true });

const { loadRows } = await import("../src/server/repository");
const { datasetFromRows } = await import("../src/server/rows");
const { createViews } = await import("../src/lib/views");
const { prisma } = await import("../src/lib/prisma");

const rows = await loadRows();
const views = createViews(datasetFromRows(rows, new Date()));

console.log(Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, (v as unknown[]).length])));
for (const c of views.getClients()) {
  const o = views.getClientOverview(c.id);
  console.log(
    `${c.name}: ${o?.workstreams.length} reported workstreams, ${o?.totals.total} projects in them, ` +
      `${o?.totals.inReport} in report, ${o?.totals.submitted} submitted, open risks ${o?.totals.risks}, ` +
      `latest upload ${o?.latestUpload?.upload.extractDate ?? "none"}`
  );
}
console.log(`Open week: ${views.resolveWeek(undefined).label}`);
await prisma.$disconnect();
