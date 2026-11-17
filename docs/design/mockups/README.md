# Mockups — Weekly Project Health

Design mockups of every designed screen, saved unchanged from Paul's Claude Design artifact on 17 Nov 2026 (`project/` folder of `claude.ai/artifact/Db1kSAsyMDAavtDco3FPEW`, version `1794907962-dcb5`).

## Screens

| File | Screen | Route (CLAUDE.md §9) | Who |
|---|---|---|---|
| `Login.dc.html` | Sign in | `/login` | public |
| `Home.dc.html` | Admin home | `/admin` | Admin |
| `Client.dc.html` | Client landing | `/clients/[clientId]` | all |
| `Main.dc.html` | Workstream landing | `/clients/[clientId]/workstreams/[workstreamId]` | all |
| `Project.dc.html` | Project (weekly update) | `/projects/[projectId]` | all |
| `Log.dc.html` | Risk log / Issue log (tabs) | `/clients/[clientId]/risks`, `/clients/[clientId]/issues` | all |
| `Upload.dc.html` | Admin › Spend uploads | `/admin/uploads` | Admin |

Screens with no mockup (CLAUDE.md §9): Change password (`/change-password`, simple form), Users (`/admin/users`), Clients (`/admin/clients`) and Change history (`/admin/history`), all built as simple tables in the same style.

Past weeks use `?week=2026-W46` on the client, workstream, project and log routes.

## How to read the files

- Each file is one screen from the canvas. The markup and inline styles show the layout and copy to reproduce. The `class Component` script at the bottom holds the screen's sample data and interaction logic (filters, sorting, ticks, forms, validation).
- They use canvas-only syntax (`<x-dc>`, `<sc-for>`, `<sc-if>`, `{{value}}`, `./support.js`) and **won't run on their own** in a browser. Treat them as a specification, not code to copy.
- Each file's preview width is 1360px.

## Rules when building from them

- **Where a mockup and `CLAUDE.md` or `docs/decision-log.md` disagree, the decision log wins.** List the differences in the brief's Step 0 report.
- **Colours:** use the tokens in `src/app/globals.css`, not the hex values in the mockups. In particular the mockups' RAG shades (`#C9F2A6`, `#FFC97A`, `#FFC2C2` and the bar colours) differ from the RAG tokens; the tokens win.
- **Sample data only, and it is not all invented.** The client (TCCC) and the reported workstream names (Josefine, Mette, Mike, Nadine EU, Nadine Global) are real; project names, job numbers, initials and every figure are samples for layout. **Never copy any of them into mock data, fixtures, seed data or tests**: invent client, workstream, project and people names instead (CLAUDE.md §11).
- **`Login.dc.html` has prototype-only behaviour:** the "Try in Play" note and the `admin` / `demo` passwords exist only so the canvas can be clicked through. Never build them.
