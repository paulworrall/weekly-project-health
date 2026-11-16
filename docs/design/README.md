# Design reference — Weekly Project Health

WPP Enterprise Solutions | MAP design system, taken from the Reporting Hub handover pack (16 Nov 2026).

## What is here

| Path | What it is |
|---|---|
| `ds/wppesmap/tokens.json` | Full MAP token set exported from Claude Design. |
| `mockups/*.dc.html` | **Not added yet.** The screen mockups (Login, Home, Client, Main, Project, Log, Upload) are on a Claude Design canvas. Add them here before brief 01. They use canvas-only template syntax and won't run on their own: treat them as a specification, not code. |

The fonts are in `public/fonts/` (WPP Thin, Light, Regular, Medium, Bold), loaded with `next/font/local` in `src/app/layout.tsx`. The logos are in `public/brand/` (navy for light backgrounds, white for Navy).

## How the tokens are used

All colours are CSS variables in `src/app/globals.css`, mapped to Tailwind with `@theme inline`. Change a colour there, in one place.

- Navy `#000050`, Cream `#FAFAF0` (page background), Orange `#FF7800` (dots, accent, focus ring).
- Square corners everywhere. Only pills are fully rounded. No shadows.
- Focus ring: 3px Orange, 2px offset. `prefers-reduced-motion` is respected.
- **Delivery RAG**: Green `#B4FF64`, Amber `#F9BD5D`, Red `#FFB4B4`, always with Navy text, a shape (circle, triangle, square) and the words "Green · On track", "Amber · At risk", "Red · Blocked" (`src/lib/rag.ts`, `RagBadge`). These are **proposed, not signed off** by the design system owner.

## Differences from the Reporting Hub's tokens

| Token | Reporting Hub | Here | Why |
|---|---|---|---|
| Eyebrow, link hover, form errors | Orange 800 `#D94E0E` | `--eyebrow` `#B34F00` | `#D94E0E` on Cream is below WCAG AA for small text (CLAUDE.md §4). `--orange-dark` is kept for large text and decoration. |
| Extra tokens | — | `--track`, `--pinned` `#FFF1C9`, `--warning-tint` `#FFE3C2`, `--success-tint` `#E3F5D3`, `--overspend` `#A03A00`, `--blocker` `#7A1010` | From brief 00. |
| `--amber`, `--sky`, internal stripes | present | removed | Amber is `--rag-amber`. Nothing here uses sky or the internal stripes (the whole tool is internal). |
| Muted text, lines | `#59598D`, `#D9D9E5` | same | Brief 00 suggested `#3D3D73` / `#D6D6E0`; the Reporting Hub values win (brief 00 step 5). |

## Font licence: unconfirmed ⚠️

No licence for web-embedding the WPP typeface has been found. Keep this repository **private** and do not deploy the app publicly until the licence is confirmed with the design system owner or WPP brand.

## Freshness

The Claude Design system was republished on 16 Nov 2026. `tokens.json` here is the Reporting Hub's copy from early November: check it against the republished system before locking the tokens.
