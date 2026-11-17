import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: path.join(__dirname, ".env.local"), quiet: true });

// Prisma 7's config has a single datasource URL, used by the CLI (migrate, seed). Migrations need
// Neon's DIRECT (unpooled) connection, so DIRECT_URL wins; the app itself connects through
// @prisma/adapter-pg with the POOLED DATABASE_URL (src/lib/prisma.ts).
//
// `prisma generate` (run on every `npm install`, in CI and on Vercel) doesn't need a database, so
// a missing URL must not break it. Commands that need one fail with Prisma's own error.
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  ...(url ? { datasource: { url } } : {}),
});
