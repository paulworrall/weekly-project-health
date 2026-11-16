# Codebase summary

Rewritten at each checkpoint. Last updated: 16 Nov 2026 (brief 00, scaffold).

## State

An empty but production-shaped Next.js app. No database models, no auth, no feature screens. The start page (`src/app/page.tsx`) renders the shell with sample values.

## Where things are

| Path | What |
|---|---|
| `src/app/layout.tsx` | Root layout, WPP Sans via `next/font/local`, `lang="en-GB"`, no indexing. |
| `src/app/globals.css` | MAP tokens (CSS variables + `@theme inline`), base styles, `.lbl`, `.eyebrow`. |
| `src/components/ui/` | Primitives: `button` (Button, ButtonLink, IconButton), `fields` (TextField, TextareaField, SelectField, SearchField, FieldLabel, FormError), `pill`, `segmented`, `tabs`, `icons`, `rag-badge`, `stat-tile`, `visually-hidden`. |
| `src/components/layout/` | `app-header` (role nav in `NAV`), `breadcrumb`, `page-header`. |
| `src/lib/` | `prisma.ts` (client), `audit.ts` (pure audit row builder), `archive.ts` (`active()`, archive/restore data), `rag.ts` (RAG values, labels, counts). |
| `src/types/action-result.ts` | `ActionResult<T>`, `ErrorCode`, `ok()`, `fail()`. |
| `src/generated/prisma/` | Generated Prisma client (git-ignored, made on `npm install`). |
| `prisma/` | `schema.prisma` header only. |
| `tests/` | Vitest: `lib/` (audit, archive, rag, action result), `components/` (UI primitives, jsdom). |
| `.github/workflows/ci.yml` | lint, typecheck, test, build. |
| `docs/`, `briefs/` | Requirements, decision log, spend file spec, tech stack, design notes, build briefs. |

## Commands

- `npm run dev`: local server on port 3000.
- `npm run lint`, `npm run typecheck` (runs `next typegen` first), `npm test`, `npm run build`.
- `npm run format` / `format:check` (Prettier; docs, briefs and Markdown are ignored).

## Next

Brief 01: front end on mock data (needs the mockups in `docs/design/mockups/`).
