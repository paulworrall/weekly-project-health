# Brief 08 — Step 0 report: hardening and go-live

18 Nov 2026. There is no brief file for phase 8. The scope comes from CLAUDE.md §10 item 8 ("accessibility, error states, admin tables, production deploy") and the follow-ups left by earlier briefs (`agent.md`, `progress.md`). Branch: `brief-08-hardening`.

## 1. What I found

**Error states**
- There are no custom error pages anywhere (no `not-found.tsx`, `error.tsx`, `global-error.tsx` or `loading.tsx`).
- A wrong link or an unexpected failure shows Next.js's plain default page: no MAP header, no way back, and no UK wording.
- Form errors are already handled: every save returns field-level messages, and a save over someone else's change is refused with a reload.

**Admin tables**
- **Users and access:** complete (create, role, reset password, unlock, archive and restore, all audited).
- **Clients:** a read-only table. CLAUDE.md §6 says Admins can **create, rename and archive** clients, but none of that exists yet. Today a new client can only be added by a script, and the spend upload needs the client to exist first.
- **Change history:** shows only the latest 200 changes, with no filters, page numbers or search. It's loaded with every page, even though only this page uses it.

**Accessibility**
- Already good:
  - a skip link;
  - `lang="en-GB"`;
  - RAG always shown with the word and its meaning;
  - labelled forms;
  - an accessible report dialog;
  - alt text on the report charts.
- No automated accessibility checks in the tests, and no full keyboard pass across every screen yet.

**Security and housekeeping**
- No security headers. These are standard browser instructions, for example "don't let other sites put this page in a frame" and "always use HTTPS".
- Search engines are already told not to index the site (`noindex`).
- `npm audit` shows 2 moderate warnings: `exceljs` uses an old `uuid` package. We never call the affected function, but it can be cleared by pinning a newer `uuid`, the same way we cleared the warning for `pptxgenjs`.

**Speed**
- About 0.2–0.3 s per page load once connected (measured in phase 7). No change needed now.

**Going live**
- The site already runs at weekly-project-health.vercel.app behind sign-in. "Production" here means it's ready for real users and real data.
- These are outside the code, so I can't settle them:
  1. **WPP Sans web licence:** unconfirmed (CLAUDE.md §4: keep the repo private and don't deploy publicly until confirmed).
  2. **Data governance review:** needed before real client data beyond TCCC's approved file (CLAUDE.md §11).
  3. **Vercel plan:** the project is on the **Hobby** plan. Vercel's terms allow Hobby for personal, non-commercial use only, so a WPP business tool should move to **Pro**. Pro also allows a more frequent week-close schedule and password-protecting preview deployments.
  4. **Database:** one Neon database is used for everything during the pilot (decision 16 Nov). A separate development database before wider use would stop local work touching live data.

## 2. Proposal

**A. Error pages**
- A branded "Page not found" page and a "Something went wrong" page with *Try again* and a link home, inside the MAP layout.
- A last-resort page if the layout itself fails.
- "Loading…" placeholders on the heavier pages (client, workstream, log).
- The two report pages get the same treatment, without the app header.

**B. Admin tables**
- **Clients:** create, rename, archive and restore. Each change is audited and a name must be unique. An archived client disappears from the lists, uploads and reports, but nothing is deleted, and it can be restored.
- **Change history:** filters for who, what (users, clients, uploads, weekly updates, risks, issues, pipeline, reports) and a date range, with 50 rows per page. It will be queried on this page only, so other pages stop loading it.

**C. Accessibility**
- Automated checks (`axe-core`, a dev-only package) on every screen in the component tests.
- A test that every colour pair we use for text passes WCAG AA contrast.
- A keyboard and screen-reader pass in the browser on the main screens.
- Fix whatever these turn up.

**D. Security and housekeeping**
- Security headers on every page.
- Pin `uuid` for `exceljs`, then check that upload parsing still passes its tests.

**E. Go-live pack** (`docs/operations.md`, a short runbook)
- How to check the weekly close and run it by hand.
- Adding users and resetting passwords.
- Restoring the database from Neon's backups.
- Rotating secrets.
- A go-live checklist with the four items above, each marked done or waiting, and who owns it.

**Not included:** Microsoft Entra ID single sign-on (planned for later), and moving sums into database queries (not needed at this size).

## 3. Tests

- Error pages render, with the right links and wording.
- Clients actions: permissions (Admin only), a duplicate name is refused, audit rows are written, archive and restore work.
- Change history filters and page numbers (pure functions).
- axe on every screen, and contrast on the colour tokens.
- Security headers present on a sample page and on the report download.
- Parsing tests still pass after the `uuid` pin.

## 4. Nothing contradicts CLAUDE.md or the decision log

The Clients actions fill a gap against CLAUDE.md §6. The Vercel plan point isn't covered in the docs yet; I'll record your answer in the decision log.

## 5. Question (answered 18 Nov: ready to go live, plus checklist)

**Going live:** should brief 08 stop at "ready to go live", that is, everything in the code done plus a checklist of the four outside items for you to clear (recommended)? Or do you want me to also make the switch in this brief, for example moving to Vercel Pro and setting up a separate development database? That would need your go-ahead and access for each step.

**Answer (Paul, 18 Nov):** stop at "ready to go live", with a checklist. The checklist is in `docs/operations.md` §7.
