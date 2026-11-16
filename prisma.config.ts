import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: path.join(__dirname, ".env.local"), quiet: true });

// `prisma generate` (run on every `npm install`, in CI and on Vercel) doesn't need a database,
// so a missing DATABASE_URL must not break it. Commands that do need one (migrate, db seed)
// fail with Prisma's own "no datasource URL" error.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  ...(process.env.DATABASE_URL ? { datasource: { url: process.env.DATABASE_URL } } : {}),
});
