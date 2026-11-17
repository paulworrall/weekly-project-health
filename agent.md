# Codebase summary

Rewritten at each checkpoint. Last updated: 17 Nov 2026 (brief 01, front end on sample data).

## State

Every designed screen is built on synthetic sample data, with interactions in local state. No database, no real sign-in: a dev role switch (`?as=admin|updater`, cookie set in `src/proxy.ts`) stands in until brief 03. Nothing persists.

## Where things are

| Path | What |
|---|---|
| `src/app/(auth)/login` | Sign in (form validation and lockout messages only; dev role links). |
| `src/app/(app)/layout.tsx` | Signed-in shell: `requireViewer()` then `AppHeader` with the role's nav. |
| `src/app/(app)/admin` | Admin home; `uploads`, `users`, `clients`, `history` (Admin only, `Forbidden` otherwise). |
| `src/app/(app)/clients/[clientId]` | Client landing; `workstreams/[workstreamId]`; `risks` and `issues` (both render `LogPage`). |
| `src/app/(app)/projects/[projectId]` | Project page. |
| `src/components/features/` | Screen pieces: `display` (RagBar, LevelTag, pills, Delta, SpendCell, TableScroll, table classes), `week` (WeekPicker, ClosedWeekNote), `pagination`, `project-list`, `workstream-body`, `pipeline-section`, `weekly-update-form` (+ RagSelector), `risk-issue-table`, `log-view`/`log-page`, `upload-form`, `upload-preview`, `workstream-settings`, `simple-table`, `login-form`, `forbidden`. |
| `src/components/ui/` | Primitives from brief 00 (+ `rag-badge`, `stat-tile`). |
| `src/components/layout/` | `app-header` (NAV per role), `nav-links` (current page), `breadcrumb`, `page-header`. |
| `src/lib/` | Pure, tested: `week`, `dates`, `spend`, `delta`, `ageing`, `pagination`, `sorting`, `filters`, `logs`, `rollup`, `rag`, `labels`, `permissions`, `links` (`withWeek`). Server-only helpers: `viewer` (`getViewer`/`requireViewer`), `dev-role`. |
| `src/types/` | `domain.ts` (records, enums), `views.ts` (page view models), `schemas.ts` (zod), `action-result.ts`. |
| `src/mocks/` | `data.ts` (seeded synthetic data, fixed clock `MOCK_NOW`), `repository.ts` (the only way pages get data; brief 02 swaps it for Prisma). |
| `tests/` | `lib/` unit tests, `mocks/` repository tests, `components/` jsdom tests, `no-real-names.test.ts` guard. |

## Conventions

- Pages are Server Components; interaction lives in client components that receive view models.
- `?week=YYYY-Www` selects a closed week: `resolveWeek()` gives a `WeekContext` (`closed`, `asOf`), inputs become read-only, links keep the week via `withWeek()`.
- Status is never colour alone: RAG shows word + meaning (+ shape on badges), levels and statuses are words, bars have `role="img"` text alternatives.
- Wide tables sit in `TableScroll` (focusable, `relative` so hidden captions can't widen the page).

## Commands

- `npm run dev` · `npm run lint` · `npm run typecheck` (runs `next typegen`) · `npm test` · `npm run build` · `npm run format`.
- Sample data views: open `/login` and use the Development links, or add `?as=admin` / `?as=updater` to any URL.

## Next

Brief 02: database schema, migrations, synthetic seed, audit write helper; swap `src/mocks/repository.ts` for Prisma queries returning the same view models.
