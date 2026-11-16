# Brief 00 — Scaffold, docs, design tokens and CI

Paste this whole brief into Claude Code, in the root of the new `weekly-project-health` repository.

## Before you start (Paul)

1. Create the GitHub repo `weekly-project-health` (private), the Neon project (with a `development` branch) and the Vercel project. Keep secrets out of chat.
2. Unzip the handover bundle into the repo root. It holds `CLAUDE.md`, `briefs/`, `docs/decision-log.md`, `docs/project-overview.md`, `docs/excel-file-spec.md` and `docs/design/mockups/`.
3. Copy the Reporting Hub tech-stack doc to `docs/tech-stack.md`.
4. Put the Reporting Hub handover pack's `2-shared-patterns/` and `3-map-design-system/` folders somewhere Claude Code can read them (for example `../reporting-hub-handover/`), or have a local clone of the Reporting Hub repo. Tell Claude Code the path when asked.
5. Check the MAP `tokens.json` against the Claude Design system republished on 16 Nov, and replace it if it's out of date.
6. Create `.env.local` from `.env.local.example` once Step 3 below has written it.

## Goal

An empty but production-shaped Next.js app: the agreed stack, config, MAP design tokens and fonts, base UI primitives, the app shell, CI, and the docs in place. It deploys to a Vercel preview. No database models, no auth and no feature screens yet.

## Step 0 — Investigate and report back (do not build yet)

Read `CLAUDE.md`, `docs/tech-stack.md`, `docs/decision-log.md` and `docs/project-overview.md`. Then report:

1. What is in the repo now, and the Node and npm versions.
2. The versions you will install, checked against `docs/tech-stack.md`. Flag any version with a known security advisory, and any newer patch release you recommend instead.
3. In the handover pack's `3-map-design-system/` (ask Paul for the path): the token file, the token names and values, type scale, spacing, the WPP Sans font files and logos, and how the fonts are loaded. List anything that differs from `CLAUDE.md` §4. Note: no font licence has been found, so flag it if you find one.
4. In `2-shared-patterns/`: confirm `audit.ts`, `archive.ts` and the UI primitives (button, fields, pill, segmented, tabs, icons) are there with their tests, and list what they import. Confirm you'll copy them as `CLAUDE.md` §5 describes (tabs without `InternalStripe`; no `MockStoreProvider` or `PrototypeLabel`).
5. Anything in this brief that contradicts `CLAUDE.md` or the decision log.

Stop and wait for Paul's go-ahead.

## Build

1. **Scaffold** with `create-next-app@<agreed version>` (TypeScript, Tailwind, ESLint, App Router, `src/`, alias `@/*`). The repo isn't empty, so scaffold into a temporary folder and move the files in without overwriting the bundle. Package name: `weekly-project-health`.
2. **Dependencies** as in `docs/tech-stack.md` §2, with two changes: leave out `@anthropic-ai/sdk`, and add `exceljs`. Add the `package.json` scripts from §2, plus `"typecheck": "tsc --noEmit"`.
3. **Config** as in `docs/tech-stack.md` §4:
   - `prisma.config.ts` and the `prisma/schema.prisma` header, with no models yet
   - `src/lib/prisma.ts`
   - `next.config.ts` with a 10 MB Server Action body limit
   - `vitest.config.mts` and `tests/setup.ts`
   - `.prettierrc.json` and `eslint.config.mjs`
   - `.env.local.example` with `DATABASE_URL` (pooled), `DIRECT_URL` (unpooled, for migrations), `NEXTAUTH_SECRET`, `NEXTAUTH_URL` and `CRON_SECRET`, each commented. No Anthropic key.
4. **Docs**: confirm `docs/` holds the five source documents listed in `CLAUDE.md` §2. Copy the MAP design system guidance and `tokens.json` from `3-map-design-system/` into `docs/design/`. Add a note there that the WPP Sans licence is unconfirmed.
5. **Design tokens** in `src/app/globals.css`, as CSS variables on `:root` mapped with `@theme inline`. Include:
   - brand: navy, cream, orange
   - text: muted `#3D3D73`, eyebrow orange `#B34F00`
   - surfaces: border `#D6D6E0`, track `#E6E6EE`, pinned `#FFF1C9`, warning tint `#FFE3C2`, success tint `#E3F5D3`
   - overspend text `#A03A00`
   - Delivery RAG fills: the Reporting Hub's proposed tokens, Green `#B4FF64`, Amber `#F9BD5D`, Red `#FFB4B4` (not yet signed off; one token each so they can change in one place), with a darker variant of each for bars if contrast needs it
   - severity: Blocker `#7A1010`
   - a focus ring

   Where the Reporting Hub's MAP tokens differ, the Reporting Hub wins: list the differences in your report. Self-host WPP Sans with `next/font/local` (fonts from `3-map-design-system/`). Square corners by default; only pills are fully rounded.
6. **UI primitives** in `src/components/ui/`. Copy the Reporting Hub's button, fields, pill, segmented, tabs and icons with their tests, removing `InternalStripe` from tabs. Then add whatever the list below still needs:
   - Button: primary navy, secondary outline, dashed "Clear", danger outline. Minimum height 44px.
   - Input, Select, Textarea, Label, FormError
   - Pill
   - StatTile: eyebrow label, big number, sub-line, optional navy variant
   - SegmentedControl, using `aria-pressed`
   - VisuallyHidden

   All need a visible `:focus-visible` ring.
7. **Layout shell** in `src/components/layout/`:
   - AppHeader: navy bar, orange dot and app name. Nav takes a role variant: Admin gets Admin home, Clients, Risks and issues, Spend uploads, Users. Updater gets Clients, Workstreams, Risks and issues. It also shows "Signed in as …".
   - Breadcrumb
   - PageHeader: orange eyebrow, H1, meta line, optional INTERNAL pill, optional actions slot

   The start page renders the shell with placeholder content. Use a hard-coded role for now; auth arrives in brief 03.
8. **Shared foundations**:
   - `src/types/action-result.ts` with `ActionResult<T>` and `ErrorCode` (`UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION`, `NOT_FOUND`, `CONFLICT`, `INTERNAL`)
   - copy the Reporting Hub's `src/lib/audit.ts` (row builder) and `src/lib/archive.ts` with their tests. The database write helper comes in brief 02.
   - `src/lib/rag.ts` with the RAG values, labels ("Green · On track" and so on) and tokens, plus `tests/lib/rag.test.ts`
9. **CI**: a GitHub Actions workflow on pull requests that runs `npm ci`, `lint`, `typecheck`, `test` and `build`.
10. **Claude Code set-up**:
    - `.claude/launch.json` with `dev` and `prod` on port 3000
    - the official Prisma agent skills in `.claude/skills/`, as in Project Brain
    - `progress.md`, started with today's entry
    - `agent.md`, the codebase summary
11. **Vercel**: link the project, set the environment variables for Development, Preview and Production, and confirm a preview deployment builds.

## Out of scope

Prisma models, auth, mock data, feature screens, upload parsing.

## Acceptance

- `npm run lint`, `typecheck`, `test` and `build` all pass locally and in CI.
- The start page shows the MAP header and page header in WPP Sans. Tab focus is visible, and contrast passes WCAG AA.
- No Anthropic dependency or key anywhere.
- The copied Reporting Hub files keep their tests, and those tests pass.
- The repo is private, and the font licence note is in `docs/design/`.
- `docs/` is complete, and `progress.md` and `agent.md` exist.
- The preview deployment URL works.
- Open a PR into `main` (regular merge, not squash). The PR description lists what changed, anything that differs from this brief, and the follow-ups.
