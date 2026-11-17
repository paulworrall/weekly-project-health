# Brief 02 — Step 0 report (17 Nov 2026)

There is no `briefs/brief-02-*.md` in the repo. Scope is taken from `CLAUDE.md` §10 phase 2 ("Database schema, migrations, seed (synthetic), audit helper"), §8 (data model), and brief 01's hand-over notes ("Brief 02 swaps this repository for Prisma queries"). Answers to §6 are recorded at the bottom once Paul has given them.

## 1. Scope

**In:**
- Prisma schema for every §8 model.
- The first migration, applied to the Neon `production` branch (the only database, decision 16 Nov).
- A seed script.
- The audit write helper (`src/lib/audit-db.ts`), writing in the same transaction as the change.
- Swapping `src/mocks/repository.ts` for a Prisma repository that returns the same view models, so every page reads from the database. Screens and view models don't change.

**Out:**
- Saving edits. Ticks, weekly updates, risks, issues, pipeline and the Reported / Account Director settings stay in local state until brief 05, which comes after sign-in (brief 03). Saving earlier would let anyone on the public site change live data.
- Sign-in (brief 03), upload parsing (brief 04), the automatic week close and snapshots job (brief 06).

## 2. Current state

- Neon database `neondb`: empty (no tables). The role `neondb_owner` can create databases.
- Prisma 7.10.1 is installed and the client generates from an empty schema.
- **Prisma 7's config has only `datasource.url`; there is no `directUrl`.** CLI commands (migrate, seed) use that URL, while the app connects through `@prisma/adapter-pg` with its own string. So the config will use `DIRECT_URL` (unpooled, for migrations) and the app will keep using `DATABASE_URL` (pooled).

## 3. Data model (`prisma/schema.prisma`)

IDs: `String @id @default(cuid())`, plus `createdAt` and `updatedAt`. Enums mirror `src/types/domain.ts`.

| Model | Fields (beyond id / timestamps) | Constraints |
|---|---|---|
| `User` | name, initials, email, passwordHash?, role, mustChangePassword, failedSignInCount, lockedUntil?, lastSignInAt?, archivedAt?, archivedById? | email unique |
| `Client` | name, riskSeq, issueSeq, archivedAt?, archivedById? | name unique |
| `Workstream` | clientId, name, reported, accountDirector?, firstSeen | (clientId, name) unique |
| `Project` | clientId, workstreamId, jobNumber, name, includeInReport, missingFromFileSince?, markedNoLongerInFileAt? | (clientId, jobNumber) unique |
| `SpendUpload` | clientId, uploadedById, uploadedAt, extractDate, fileName, file Bytes?, status, note?, row / new / changed / missing / error counts | index (clientId, uploadedAt) |
| `SpendUploadRow` | uploadId, rowNumber, jobNumber, projectName, workstreamName, percentSpent?, spendStatus, error? | |
| `SpendUploadChange` | uploadId, type, field?, jobNumber, projectName, workstreamName, before?, after?, decision? | |
| `ProjectSpend` | projectId, uploadId, percentSpent Decimal?, spendStatus | (projectId, uploadId) unique |
| `ReportingPeriod` | isoYear, isoWeek, startsOn, endsOn, closesAt, state, closedAt? | (isoYear, isoWeek) unique |
| `ProjectWeek` | projectId, periodId, status, rag, percentComplete, updateText, state, submittedAt?, submittedById? | (projectId, periodId) unique |
| `RiskItem` / `IssueItem` | clientId, projectId, ref, title, level, owner, status, raisedOn, dueOn?, action, closedOn?, archivedAt?, archivedById? | (clientId, ref) unique |
| `PipelineOpportunity` | workstreamId, likelihood, title, possibleStart?, mapOwner, clientOwner, nextSteps, archivedAt?, archivedById? | index workstreamId |
| `ProjectWeekSnapshot`, `PipelineWeekSnapshot`, `LogWeekSnapshot` | periodId + (projectId / workstreamId / clientId), data Json | one per period and subject; never updated |
| `AuditEvent` | at, userId?, entity, entityId, action, field, oldValue?, newValue? | index (entity, entityId), index at |

The 12 weeks of history are seeded as `ProjectWeek` rows and closed periods, as brief 01's mocks are. Snapshot tables are created now but filled by the week close in brief 06.

## 4. How migrations run (one live database)

- **Never `prisma migrate dev` or `prisma migrate reset`.** `reset` deletes all data, and `dev` needs a temporary "shadow" database.
- Write each migration offline with `prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script`, review it, commit it, then apply it with `prisma migrate deploy`. Applying is a deliberate step that **I'll ask you before running each time** (CLAUDE.md §11).
- Vercel builds don't migrate. A deploy only works once its migration has been applied, so the order is: apply the migration, then merge.

## 5. Seed, repository, audit, tests

- **Seed** (`prisma/seed.ts`, `npm run db:seed`): idempotent (upserts keyed on unique fields), so re-running doesn't duplicate anything. What goes into the live database depends on question 1.
- **Repository:** `src/server/repository.ts` with the same function names and return types as `src/mocks/repository.ts`, using `prisma` and the pure functions in `src/lib/`. Pages switch their import; the mocks stay as test fixtures.
- **"Today":** the database version uses the real clock (Europe/London), not the fixed Tue 17 Nov. The current week moves on by itself; past weeks come from the seeded history until brief 06 writes real snapshots.
- **Audit:** `writeAudit(tx, actorId, rows)` turns `audit.ts` rows into `AuditEvent` inserts inside the caller's `prisma.$transaction`. Unit-tested with a fake transaction; first used for real in brief 04/05.
- **Tests:** CI has no database and there is only the live one, so tests don't touch a database. Mapping from database rows to view models is pure and unit-tested. A read-only smoke script (`npm run db:check`) checks the live data after seeding (counts per client, one page view each).

## 6. Questions (need Paul)

1. **What goes into the live database?** Northwind Drinks (invented sample) and TCCC, or TCCC only.
2. **Expectation check:** after brief 02 the site reads from the database, but edits are still not saved (that's brief 05, after sign-in). Is that OK, or should the order change?

## Answers (Paul, 17 Nov 2026)

1. **Live database:** seed Northwind Drinks (invented sample, can be archived later) and TCCC.
2. **Order kept:** brief 02 reads from the database only; saving edits stays in brief 05, after sign-in (brief 03) and uploads (brief 04).

Waiting for Paul's go-ahead to build. Each migration is applied only after asking.
