/**
 * Seed (brief 02): loads the sample client (Northwind Drinks, invented) and TCCC (from its
 * approved spend file) into the database, as decided on 17 Nov 2026.
 *
 *   npm run db:seed
 *
 * Safe to re-run: every insert uses fixed ids with `skipDuplicates`, so nothing is duplicated
 * and nothing already in the database is overwritten or deleted. Uses DIRECT_URL (unpooled).
 */
import path from "node:path";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { mockDataset } from "../src/mocks/repository";
import { rowsFromDataset } from "../src/server/rows";

config({ path: path.join(process.cwd(), ".env.local"), quiet: true });

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("DIRECT_URL (or DATABASE_URL) is not set in .env.local.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function insert<T>(
  label: string,
  rows: T[],
  write: (chunk: T[]) => Promise<{ count: number }>
) {
  let added = 0;
  for (let i = 0; i < rows.length; i += 1000) added += (await write(rows.slice(i, i + 1000))).count;
  console.log(`${label.padEnd(16)} ${String(added).padStart(6)} added of ${rows.length}`);
}

async function main() {
  const r = rowsFromDataset(mockDataset);
  const s = { skipDuplicates: true } as const;
  await insert("users", r.users, (data) => prisma.user.createMany({ data, ...s }));
  await insert("clients", r.clients, (data) => prisma.client.createMany({ data, ...s }));
  await insert("workstreams", r.workstreams, (data) =>
    prisma.workstream.createMany({ data, ...s })
  );
  await insert("projects", r.projects, (data) => prisma.project.createMany({ data, ...s }));
  await insert("periods", r.periods, (data) => prisma.reportingPeriod.createMany({ data, ...s }));
  await insert("projectWeeks", r.projectWeeks, (data) =>
    prisma.projectWeek.createMany({ data, ...s })
  );
  await insert("uploads", r.uploads, (data) => prisma.spendUpload.createMany({ data, ...s }));
  await insert("uploadChanges", r.uploadChanges, (data) =>
    prisma.spendUploadChange.createMany({ data, ...s })
  );
  const spends = r.projectSpends.map((x) => ({
    ...x,
    percentSpent: x.percentSpent === null ? null : Number(x.percentSpent),
  }));
  await insert("projectSpends", spends, (data) => prisma.projectSpend.createMany({ data, ...s }));
  await insert("risks", r.risks, (data) => prisma.riskItem.createMany({ data, ...s }));
  await insert("issues", r.issues, (data) => prisma.issueItem.createMany({ data, ...s }));
  await insert("pipeline", r.pipeline, (data) =>
    prisma.pipelineOpportunity.createMany({ data, ...s })
  );
  await insert("auditEvents", r.auditEvents, (data) =>
    prisma.auditEvent.createMany({ data, ...s })
  );
}

main()
  .then(() => console.log("Seed finished."))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
