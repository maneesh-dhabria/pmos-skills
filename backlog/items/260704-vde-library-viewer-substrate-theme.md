---
schema_version: 1
id: 260704-vde
title: "library-viewer browse pages don't match the shared html-authoring substrate — re-theme the shared library-viewer (BASE_CSS → consume canonical style.css, --pmos-* tokens, light-default + prefers-color-scheme dark) so /frameworks /primer /learn-list browse pages match Editorial Technical, and refresh the 61 bundled primer corpus files to the current theme"
type: chore
kind: epic
status: released
released: 0.34.0
route: skill
priority: should
labels: [pmos-learnkit, library-viewer, html-substrate, theme, styling, skill]
created: 2026-07-04
updated: 2026-07-04
design_doc: docs/pmos/features/2026-07-04_library-viewer-substrate-theme/02_design.html
feature_folder: docs/pmos/features/2026-07-04_library-viewer-substrate-theme/
parent:
dependencies: []
---

## Context

Three pmos-learnkit skills — `/frameworks`, `/primer`, `/learn-list` — render an offline, filterable browse/
library page through one shared substrate: `plugins/pmos-learnkit/skills/_shared/library-viewer/lib.mjs`. That
substrate carries its own hardcoded `BASE_CSS`: a **dark**, blue-accent, system-sans theme with a private token
vocabulary (`--bg:#0f1320`, `--accent:#6ea8fe`) — nothing like the canonical pmos HTML substrate
(`_shared/html-authoring/assets/style.css`, the "Editorial Technical" theme: warm-paper `#f8f5ef`, burnt-orange
`#b8431a`, serif/sans/mono three-voice type, light-default with dark via `prefers-color-scheme`) through which
every individual primer/spec/plan/learn-list artifact already renders. The seam is jarring: a warm-paper light
primer → click "browse" → a dark blue page sharing no visual DNA.

Grounded in the epic `design_doc:` (`02_design.html`), invariants INV-1 (offline / zero-request), INV-2 (single
source of truth — inline canonical style.css, no hand-copied tokens), INV-3 (light-default + prefers-color-scheme
dark, inherited for free), INV-4 (skill-agnostic substrate preserved), INV-5 (idempotent, CSS-region-scoped
corpus refresh), INV-6 (re-skin only, no interaction change).

Decisions settled with the maintainer (three material forks resolved interactively at define time):
- **Architecture (D1):** reuse canonical `style.css` as single source of truth — the substrate reads + inlines
  the sibling `../html-authoring/assets/style.css` and layers component CSS on `--pmos-*` tokens (no hand-port,
  no drift). Rejected: hand-porting theme values into BASE_CSS.
- **Scope (D2):** include re-theming the 61 bundled primer corpus files (the only off-theme *individual* pages —
  live-generated pages already render on the current substrate).
- **Theme mode (D3):** light default + `prefers-color-scheme` dark, matching the substrate exactly (browse page
  changes from always-dark to light-by-default).
- **Split:** two independent stories — 260704-m7f (re-theme the shared library-viewer substrate; all 3 browse
  pages inherit) and 260704-v4a (refresh the 61 bundled primers). No dependency between them (different code
  paths).

## Acceptance Criteria

- [ ] The `library-viewer` substrate (`_shared/library-viewer/lib.mjs`) reads + inlines the sibling
  `_shared/html-authoring/assets/style.css` at build time as the base CSS layer, and its own component CSS
  (masthead, layout, cards, facets, chips, search, reader pane, iframe reader) references **only** `--pmos-*`
  tokens — no hardcoded colors. The old dark `--bg/--panel/--accent` token block is removed (INV-2).
- [ ] All three browse pages (`/frameworks` index.html, `/primer` library.html, `/learn-list` library.html)
  render warm-paper light by default and switch to dark under `@media (prefers-color-scheme: dark)`, inheriting
  both from `style.css` (INV-3). No functional/interaction change — search, faceting, view-switch, reader all
  behave as before (INV-6).
- [ ] The emitted page stays fully offline/self-contained: no external `<link>`, no CDN, no `@import`; style.css
  is inlined at build (INV-1). Consumer tests asserting "no external stylesheet" still pass.
- [ ] `lib.mjs` stays skill-agnostic — `selftest.sh` (skill-agnostic grep + `node --test`) green; style.css path
  resolved via `import.meta.url` with a loud error on absence (INV-4, D6).
- [ ] Any old-token CSS passed by a consumer `build-library.mjs` via `extraHead`/card/reader config is reconciled
  to `--pmos-*` tokens (audit of all 3 consumers — §4.3; a clean finding is acceptable).
- [ ] All **61 bundled corpus primers** (`primer/data/primers/*.html`) have their inlined substrate CSS block
  replaced with the current `style.css` (Editorial Technical); the transform is CSS-region-scoped (body
  `<main>` bytes unchanged) and **idempotent** — a second run is a no-op diff (INV-5, D7).
- [ ] Conforms to `skill-patterns.md §A–§L`; passes `skill-eval` (`[D]`+`[J]`); 4 hygiene lints +
  `audit-recommended` green. Single plugin (pmos-learnkit), one release unit.

## Stories

- **260704-m7f** — re-theme the shared library-viewer substrate: `lib.mjs` reads + inlines the canonical
  `style.css`, remaps all component CSS to `--pmos-*` tokens (light-default + prefers-color-scheme dark), audits
  the 3 consumers' `extraHead`, and updates `lib.test.mjs` / `guidelines.md` / `selftest.sh`. All 3 browse pages
  inherit. No deps.
- **260704-v4a** — refresh the 61 bundled primer corpus files: new idempotent `retheme-corpus.mjs` CLI that
  marker-scoped-replaces each corpus file's inlined substrate CSS with the current `style.css`; body untouched;
  + test. No deps (independent code path from m7f).

## Release prerequisites

- pmos-learnkit `plugin.json` ×2 version bump (appearance change to existing skills → minor).
- Changelog entry; manifest version-sync; no new README row (existing skills).
- All owned by `/complete-dev` (Loop 3) — never in a build wave (§G).
