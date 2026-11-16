# Reporting Hub — Tech Stack (mirrors Project Brain)

> **Weekly Project Health note:** copied from the Reporting Hub's tech-stack document. Where this file and `CLAUDE.md` §4 disagree (app name, no Anthropic SDK, `exceljs`, MAP styling), `CLAUDE.md` wins.

Reporting Hub uses the same stack, versions and conventions as Project Brain
(`github.com/paulworrall/Project_Brain`). This file is the source of truth for
Claude Code when scaffolding and building Reporting Hub. Where this file and
your defaults disagree, follow this file.

Taken from Project Brain's `main` branch on 5 Nov 2026.

---

## 1. Core stack

| Layer | Choice | Version in Project Brain |
|---|---|---|
| Language | TypeScript (strict mode) | ^5 |
| Framework | Next.js, App Router, Server Components + Server Actions | 16.4.6 (Reporting Hub; Project Brain was on 16.3.5, which has critical advisories) |
| UI runtime | React / React DOM | 19.2.8 |
| Styling | Tailwind CSS v4 via `@tailwindcss/postcss`, design tokens as CSS variables | ^4 |
| Database | PostgreSQL hosted on **Neon** | — |
| ORM | **Prisma 7** with the `@prisma/adapter-pg` driver adapter + `pg` | 7.9.1 |
| Auth | **NextAuth v5 (Auth.js)**, Credentials provider (email + password), JWT sessions, `bcryptjs` hashing | 5.0.0-beta.32 |
| Validation | **zod v4** (shared by client and server; also used for Claude structured output) | ^4.4.3 |
| AI | **Anthropic API** via `@anthropic-ai/sdk`, direct calls, no orchestration framework | ^0.115.0 |
| Hosting | **Vercel** (production + preview deployments from GitHub) | — |
| Source control | GitHub, PR-based, regular merges (not squash) | — |
| Testing | **Vitest** + Testing Library (React, user-event, jest-dom) + jsdom | vitest ^4.1.10 |
| Lint / format | ESLint 9 flat config (`eslint-config-next` + `eslint-config-prettier`), Prettier 3 | — |
| Script runner | `tsx` (seed + one-off `.mts` scripts in `scripts/`) | ^4.23.9 |
| Fonts | Geist + Geist Mono via `next/font/google` | — |

Project Brain also uses these document libraries. Add them to Reporting Hub only if it needs them:

- `exceljs` — read and write .xlsx (likely useful for reporting exports)
- `docx` — generate Word documents
- `officeparser` — extract text from uploaded .docx / .pdf / .pptx / .xlsx

## 2. Scaffold

```bash
npx create-next-app@16.4.6 reporting-hub --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
cd reporting-hub

npm i @prisma/client@7.9.1 prisma@7.9.1 @prisma/adapter-pg pg dotenv \
      next-auth@5.0.0-beta.32 bcryptjs zod @anthropic-ai/sdk

npm i -D vitest jsdom @testing-library/react @testing-library/user-event \
         @testing-library/jest-dom tsx prettier eslint-config-prettier \
         @types/pg @types/bcryptjs
```

`package.json` scripts (same as Project Brain):

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "test": "vitest run",
  "test:watch": "vitest",
  "postinstall": "prisma generate"
}
```

`postinstall: prisma generate` matters: Vercel runs it on every deploy so the
generated client exists at build time.

## 3. Folder structure

```
reporting-hub/
├── src/
│   ├── app/
│   │   ├── (auth)/login, (auth)/signup   # public auth screens
│   │   ├── (dashboard)/...                # signed-in app, one folder per area
│   │   └── api/auth/[...nextauth]/        # NextAuth route handler
│   ├── components/
│   │   ├── ui/          # small reusable primitives: Button, Card, Input, Label, Modal, Toast, FormError
│   │   ├── features/    # feature-specific components
│   │   └── layout/      # shell, nav, sidebar
│   ├── services/
│   │   ├── agents/      # one file per Claude agent (*-agent.ts)
│   │   ├── documents/   # deterministic file generation (xlsx/docx)
│   │   └── parsing/     # file → text utilities
│   ├── lib/             # prisma.ts, auth.ts, anthropic.ts, permissions.ts, pure helpers
│   ├── hooks/           # client hooks (useFocusTrap, usePrefersReducedMotion, …)
│   ├── types/           # shared types + zod schemas
│   └── generated/prisma # Prisma client output (generated, git-ignored)
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── prisma.config.ts
├── scripts/             # one-off backfills / smoke tests (*.mts, run with tsx)
├── tests/               # all tests live here, not next to source
│   ├── setup.ts
│   └── helpers/
├── CLAUDE.md            # implementation guide for Claude Code
├── progress.md          # agent-maintained progress log (append-only)
├── agent.md             # agent-maintained codebase summary (rewritten at checkpoints)
└── .env.local.example
```

Path alias: `@/*` → `./src/*` (in `tsconfig.json` and `vitest.config.mts`).

## 4. Configuration files to copy

### `prisma/schema.prisma` (header)

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

- IDs: `String @id @default(cuid())`, plus `createdAt @default(now())` and `updatedAt @updatedAt`.
- Uploaded files are stored in Postgres as `Bytes` columns (no separate blob storage).
- Constraints Prisma can't express (e.g. partial unique indexes) go in the migration as raw SQL, with a comment in `schema.prisma`.

### `prisma.config.ts`

```ts
import path from "node:path";
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ path: path.join(__dirname, ".env.local") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: env("DATABASE_URL") },
});
```

### `src/lib/prisma.ts`

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### `src/lib/anthropic.ts`

```ts
import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export const CLAUDE_MODEL = "claude-opus-5"; // one constant; every agent imports it
```

### `src/lib/auth.ts` (shape)

NextAuth v5 with `Credentials`, `bcrypt.compare` against `user.passwordHash`,
`session: { strategy: "jwt" }`, `pages: { signIn: "/login" }`, `trustHost: true`,
and `jwt`/`session` callbacks that copy `role` and `id` onto the session. Keep
it SSO-upgradeable: nothing should assume credentials are the only provider.

### `next.config.ts`

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "10mb" }, // default 1MB is too small for real uploads
  },
  // Only if officeparser is used: Turbopack bundling breaks it on Vercel.
  // serverExternalPackages: ["officeparser"],
};

export default nextConfig;
```

### `vitest.config.mts`

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",                 // component tests opt in with // @vitest-environment jsdom
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
});
```

`tests/setup.ts` loads `.env.local` with dotenv, imports
`@testing-library/jest-dom/vitest`, runs `cleanup` after each test, and
polyfills `window.matchMedia` for jsdom.

### `.prettierrc.json`

```json
{ "semi": true, "singleQuote": false, "trailingComma": "es5", "printWidth": 100 }
```

### `eslint.config.mjs`

`eslint-config-next/core-web-vitals` + `eslint-config-next/typescript` +
`eslint-config-prettier`, with `@typescript-eslint/no-unused-vars` set to warn
and ignore names starting with `_` (Server Actions used with `useActionState`
must keep the `(prevState, formData)` signature).

### `.env.local.example`

```bash
# Neon Postgres — pooled connection string for the app
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"

# Anthropic API key (console.anthropic.com → API Keys). Use a separate key from Project Brain.
ANTHROPIC_API_KEY="sk-ant-..."

# NextAuth secret: openssl rand -base64 32
NEXTAUTH_SECRET="replace-with-generated-secret"

# App base URL
NEXTAUTH_URL="http://localhost:3000"
```

Set the same variables in Vercel for Production, Preview and Development.

## 5. Styling conventions

> **Reporting Hub override:** use the WPP Enterprise Solutions | MAP design system (D-020) instead of the Project Brain tokens and Geist fonts below. See the styling rule in `CLAUDE.md` and `docs/design/`.

- Tailwind v4: `globals.css` starts with `@import "tailwindcss";`, defines
  tokens as CSS variables on `:root`, and maps them with `@theme inline`.
- Project Brain's tokens: background `#f8fafc`, foreground `#0f172a`, surface
  `#ffffff`, border `#e2e8f0`, muted text `#64748b`, primary indigo `#4338ca`
  (hover `#3730a3`), accent tint `#eef2ff`, focus ring `#6366f1`, plus
  success / warning / danger pairs. Reuse them so both apps look like one family.
- No component library and no icon package: primitives live in
  `src/components/ui`, icons are inline SVG.
- Accessibility is a requirement: status never shown by colour alone (icon +
  text), visible `:focus-visible` rings, ARIA live regions for async status,
  focus traps in modals, `prefers-reduced-motion` respected, WCAG AA contrast.

## 6. Architecture rules (carried over from Project Brain)

**AI agents**
- Each agent is a small, dedicated, testable module in `src/services/agents/`.
- Agents return **structured JSON validated by a zod schema**, using the SDK's
  `zodOutputFormat` helper (`@anthropic-ai/sdk/helpers/zod`). Never parse free text.
- Multi-step logic is split into separate sequential Claude calls, not one big prompt.
- Each agent throws its own typed error class (e.g. `XAgentError`).
- Rendering files (xlsx/docx) is a separate, deterministic step in
  `src/services/documents/`, never done by the model.
- Anything client-facing that the AI produces is a draft; the app never sends on a user's behalf.

**Data and security**
- Data isolation (e.g. per project or per client) is enforced in the database
  query (`where` filter), never by prompting alone.
- Permission checks live in one module, `src/lib/permissions.ts`, and are
  enforced inside every Server Action. Hiding a button is a convenience, not
  the lock. Pass the user's permissions to the client as booleans.
- Server Actions return a typed result:
  ```ts
  type ActionResult<T> =
    | { ok: true; data: T }
    | { ok: false; code: ErrorCode; message: string; fieldErrors?: Record<string, string> };
  ```
- Validate every input with a zod schema shared by client and server; show
  field-level errors, never a generic "Invalid input".
- Derived state (status, etc.) comes from one pure function used by both server and UI.
- After a mutation, `revalidatePath` the affected page.

**Database migrations**
- `npx prisma migrate dev` locally; `npx prisma migrate deploy` for staging/production.
- Run migrations with Neon's **direct (unpooled)** connection string; the app
  uses the **pooled** one.
- Staging first, then production, in a low-traffic window. Prefer additive migrations.

## 7. Ways of working with Claude Code

- Keep a `CLAUDE.md` at the repo root (project overview, stack, architecture
  decisions, file structure, implementation sequence), plus agent-maintained
  `progress.md` (append-only, updated at checkpoints) and `agent.md`
  (codebase summary, rewritten at checkpoints).
- Every build brief starts with a **Step 0: investigate and report back**
  before building, and stops to flag anything that contradicts the brief.
- Every feature ships with Vitest tests; the full suite must pass before a PR.
- Project Brain has the official Prisma agent skills installed
  (`.claude/skills/prisma-*`, from `github.com/prisma/skills`). Install the
  same set in Reporting Hub.
- Use `.claude/launch.json` with `dev` (`npm run dev`) and `prod`
  (`npm run start`) configurations on port 3000.

## 8. Separate per project

Reporting Hub shares the stack but **not** the infrastructure. Create new:

- GitHub repository
- Vercel project (and its environment variables)
- Neon project/database (do not point at Project Brain's database)
- Anthropic API key (named e.g. `reporting-hub`, with its expiry in a calendar)
- `NEXTAUTH_SECRET`

## 9. Known gotchas from Project Brain

- **Prisma 7** uses `prisma.config.ts`, a generated client in
  `src/generated/prisma`, and a driver adapter (`@prisma/adapter-pg`). Older
  Prisma tutorials (`url = env(...)` in the schema, `@prisma/client` default
  import) don't apply.
- **Server Action body limit** defaults to 1MB; raise it if users upload files.
- **Turbopack bundling** can break packages with dynamic requires or WASM on
  Vercel even when `next dev` works. Add them to `serverExternalPackages`.
- **Vercel env changes** only apply to new deployments; redeploy after changing one.
- Project Brain's `CLAUDE.md` still lists `mammoth` / `pdf-parse`, but the code
  actually uses `officeparser`. Use `officeparser` if Reporting Hub needs file parsing.
