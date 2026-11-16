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
