# Codebase summary

Rewritten at each checkpoint. Last updated: 17 Nov 2026 (brief 02, database).

## State

Every page reads the live Neon database (Northwind sample + TCCC) through `src/server/repository.ts`. Interactions are still local state (saving arrives in brief 05). No real sign-in: a dev role switch (`?as=admin|updater`, cookie set in `src/proxy.ts`) stands in until brief 03.

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
| `src/lib/views.ts` | `createViews(dataset)`: every page view model, built from a `Dataset`. Pure. |
| `src/server/repository.ts` | `getRepository()` (React `cache`): loads all rows with Prisma, `datasetFromRows`, `createViews`. Used by every page and `lib/viewer.ts`. |
| `src/server/rows.ts` | `DbRows` shapes, `rowsFromDataset` (seed) and `datasetFromRows` (site). |
| `src/mocks/` | `data.ts` (synthetic Northwind + TCCC from `clients/tccc.json`, fixed clock `MOCK_NOW`), `repository.ts` (`mockDataset` + views, for tests and the seed). |
| `prisma/` | `schema.prisma`, `migrations/` (written offline, applied with `db:migrate` after asking Paul), `seed.ts` (idempotent). |
| `scripts/` | `import-spend-file.mts` (spend file → JSON), `db-check.mts` (read-only live check). |
| `tests/` | `lib/` unit tests (incl. `audit-db`), `mocks/` repository tests, `server/rows.test.ts` round trip, `components/` jsdom tests, `no-real-names.test.ts` guard. |

## Conventions

- Pages are Server Components; interaction lives in client components that receive view models.
- `?week=YYYY-Www` selects a closed week: `resolveWeek()` gives a `WeekContext` (`closed`, `asOf`), inputs become read-only, links keep the week via `withWeek()`.
- Status is never colour alone: RAG shows word + meaning (+ shape on badges), levels and statuses are words, bars have `role="img"` text alternatives.
- Wide tables sit in `TableScroll` (focusable, `relative` so hidden captions can't widen the page).

## Commands

- `npm run dev` · `npm run lint` · `npm run typecheck` (runs `next typegen`) · `npm test` · `npm run build` · `npm run format`.
- Sample data views: open `/login` and use the Development links, or add `?as=admin` / `?as=updater` to any URL.

## Database

- One live Neon database (`production` branch). Never `prisma migrate dev` / `reset`. Migrations: `prisma migrate diff` offline → commit → ask Paul → `npm run db:migrate`.
- `npm run db:seed` (idempotent), `npm run db:check` (read-only), `npm run db:status`.

## Next

Brief 03: sign-in (NextAuth credentials, lockout, first-sign-in password change, role landing), replacing the dev role switch.
