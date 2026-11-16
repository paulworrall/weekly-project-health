# Progress

Append-only. Newest at the bottom.

## 16 Nov 2026 — Brief 00: scaffold

- Next.js 16.4.6 (App Router, TypeScript strict, `src/`, `@/*`), React 19.2.8, Tailwind v4 via `@tailwindcss/postcss`.
- Installed: Prisma 7.10.1 (+ `@prisma/adapter-pg`, `pg`), NextAuth 5.0.0-beta.32, `bcryptjs`, zod 4, `exceljs` 4.4.0, `dotenv`. Dev: Vitest 4, Testing Library, jsdom, Prettier, `eslint-config-prettier`, `tsx`. No Anthropic SDK.
- Config: `prisma.config.ts` (works without `DATABASE_URL` so install and CI don't need a database), `prisma/schema.prisma` header with no models, `src/lib/prisma.ts`, `next.config.ts` (10 MB Server Action limit), `vitest.config.mts`, `tests/setup.ts`, `.prettierrc.json`, `.prettierignore`, `eslint.config.mjs`, `.env.local.example`.
- MAP design system: tokens in `src/app/globals.css`, WPP Sans self-hosted, logos in `public/brand/`, `docs/design/README.md` (token differences, licence warning).
- UI primitives copied from the Reporting Hub and adapted (button with 44px minimum and danger variant, fields, pill, segmented, tabs without `InternalStripe`, icons), plus `RagBadge`, `StatTile`, `VisuallyHidden`.
- Layout shell: `AppHeader` (role nav, hard-coded Admin until brief 03), `Breadcrumb`, `PageHeader`. Start page shows them with sample values.
- Foundations: `src/types/action-result.ts`, `src/lib/audit.ts`, `src/lib/archive.ts`, `src/lib/rag.ts`.
- CI: `.github/workflows/ci.yml` (lint, typecheck, test, build on PRs and pushes to main).
- Checks: lint, typecheck, 16 tests and build all pass locally. Start page checked in a browser: WPP Sans loads, colours match the tokens, square corners.

**Not done (needs Paul):** Neon project, Vercel project and its environment variables, preview deployment. The screen mockups aren't in `docs/design/mockups/` yet.
**Not done (follow-up):** the official Prisma agent skills in `.claude/skills/` (from `github.com/prisma/skills`).

## 16 Nov 2026 — Infrastructure

- Neon project `weekly-project-health` (AWS Europe West 2, London), `production` branch only (decision log). Pooled and direct connections tested from `.env.local` with `sslmode=verify-full`.
- Pushed to `github.com/paulworrall/weekly-project-health` (private). CI run #1 passed.
- Vercel project `weekly-project-health` on the MAP team (Hobby plan), environment variables set, live at https://weekly-project-health.vercel.app (checked: MAP header, WPP Sans, RAG labels, `noindex`).
- ⚠️ On Hobby the production address is **public** (no login). It only shows the placeholder page, but don't share the address until the font licence is confirmed and sign-in exists (brief 03).
- Week close on Hobby: Vercel Cron runs at most once a day, so brief 06 schedules it early Saturday UK time (after Friday 23:59 in both GMT and BST).
