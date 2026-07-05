---
schema_version: 1
id: 260704-m7f
title: "Re-theme the shared library-viewer substrate — lib.mjs reads + inlines the canonical _shared/html-authoring/assets/style.css and remaps all component CSS (masthead, layout, cards, facets, chips, search, reader, iframe reader) onto --pmos-* tokens, light-default + prefers-color-scheme dark; /frameworks /primer /learn-list browse pages inherit Editorial Technical"
type: chore
kind: story
status: done
route: skill
priority: should
labels: [pmos-learnkit, library-viewer, html-substrate, theme, skill]
created: 2026-07-04
updated: 2026-07-05
parent: 260704-vde
dependencies: []
design_doc: docs/pmos/features/2026-07-04_library-viewer-substrate-theme/02_design.html
plan_doc: docs/pmos/features/2026-07-04_library-viewer-substrate-theme/stories/260704-m7f/03_plan.html
feature_folder: docs/pmos/features/2026-07-04_library-viewer-substrate-theme/
worktree: agent-skills-260704-m7f
branch: feat/260704-m7f
---

## Context

The core story of epic 260704-vde: re-theme the shared `library-viewer` substrate so all three browse/library
pages (`/frameworks`, `/primer`, `/learn-list`) inherit the canonical "Editorial Technical" look. Grounded in
`02_design.html` §2 (consumers), §3 (invariants), §4 (this story), decisions D1/D3/D4/D5/D6/D8, invariants
INV-1/INV-2/INV-3/INV-4/INV-6. The bundled-corpus refresh is the sibling story 260704-v4a (independent).

Because the three consumers call `emitHtml()` and do not hand-author CSS, this one substrate change propagates
to all three pages automatically — provided no consumer smuggles old-token CSS through `extraHead` (AC5 audit).

## Acceptance Criteria

- [ ] **AC1 — inline the canonical stylesheet.** `emitHtml()` reads `../html-authoring/assets/style.css`
  (resolved relative to `lib.mjs` via `import.meta.url`) at build time and inlines it as the **base** layer of
  the emitted `<style>` block, ahead of the library-viewer's component CSS. On a missing/unreadable file it
  throws a clear error naming the expected path — **no** silent fallback to the old dark CSS (INV-1, INV-2, D5,
  D6). The output stays a single self-contained page: no external `<link>`, no CDN, no `@import` (INV-1).
- [ ] **AC2 — component CSS on `--pmos-*` tokens.** The library-viewer's own component rules — masthead/`header`,
  `.layout`/`.listing`, cards + view modes (compact/detailed/list), single-select + multi-dropdown facets,
  applied-filter chips, search box, `.reader` sidebar + its transition, and `IFRAME_READER_CSS` — reference
  **only** `--pmos-*` tokens (surface/border/rule/text/muted/accent/accent-bg + spacing/radius/font tokens).
  Every hardcoded color and the old `--bg/--panel/--card/--accent/--line` `:root` block are removed (INV-2). The
  three-voice type system is applied (sans controls/headings, serif reader body, mono structural chrome).
- [ ] **AC3 — light default + dark inherited.** All three browse pages render warm-paper light by default and
  switch to dark under `@media (prefers-color-scheme: dark)` with **no library-viewer-specific dark rules** — the
  flip comes entirely from `style.css`'s token overrides because every component color is a `--pmos-*` token
  (INV-3). No component hardcodes a dark-only value.
- [ ] **AC4 — no interaction change (INV-6).** Search, faceting, view-switch, reader pane, and iframe/card-link
  modes behave identically to before; class names and DOM structure are unchanged. This is a re-skin only.
- [ ] **AC5 — consumer `extraHead` audit.** Inspect all three `build-library.mjs` (`/frameworks`, `/primer`,
  `/learn-list`) for skill-specific CSS (via `extraHead` or card/reader config) that hardcodes old-theme colors;
  reconcile any to `--pmos-*` tokens. Record the finding for each consumer (a "clean, nothing to change" outcome
  is acceptable; the audit itself is required).
- [ ] **AC6 — substrate guards updated.** `_shared/library-viewer/tests/lib.test.mjs` (frozen public-API tests)
  and `guidelines.md` are updated from the old-CSS assertions to the new contract: inlines `style.css`, uses
  `--pmos-*` tokens, still emits no external stylesheet (offline preserved). `selftest.sh` (skill-agnostic grep +
  `node --test`) stays green (INV-4). The public API surface (`emitHtml` + named exports) is unchanged.
- [ ] **AC7 — live render evidence.** Build all three browse pages and verify in a browser (both color schemes):
  warm-paper light + prefers-color-scheme dark, legible contrast (card borders/chips visible on warm paper),
  serif reader body, correct accent — no dark-blue remnants, no missing borders. Satisfies `/verify`'s
  browser-evidence gate.
- [ ] **AC8 — release-prereq scope (§G).** No version-bump / changelog / README / manifest / learnings tasks in
  any build wave — those are `/complete-dev`'s (Loop 3). List them under the plan's Release prerequisites only.
- [ ] Conforms to `skill-patterns.md §A–§L`; `skill-eval` (`[D]`+`[J]`) passes; 4 hygiene lints +
  `audit-recommended` green.

## Notes

Built 2026-07-05 via `/feature-sdlc build` (route:skill) on branch `feat/260704-m7f` (commit `eac92a5d`,
unmerged — awaits Loop-3 `/complete-dev --epic 260704-vde`). Six files: substrate `lib.mjs` + `guidelines.md`
+ `tests/lib.test.mjs` + regenerated golden, and the `primer` / `learn-list` consumer `build-library.mjs`
extraHead reconciliations. `frameworks` build-library was clean (nothing to change).

All 8 ACs met:
- **AC1** — `emitHtml()` reads `../html-authoring/assets/style.css` via `import.meta.url` and inlines it as the
  base `<style>` layer; **fail-loud** verified by a manual `style.css` rename (throws naming the path, no silent
  fallback). Output stays single-file: no external `<link>`/CDN/`@import` (only a comment in style.css mentions
  the word "@import" — zero real at-rules).
- **AC2** — component CSS references only `--pmos-*` tokens; old `--bg/--panel/--card/--accent/--line` `:root`
  block + all hardcoded hex removed (grep-clean; sole match is the doc comment documenting the constraint).
  Three-voice type applied (sans chrome, mono structural, serif reader body).
- **AC3** — light default, dark inherited entirely from `style.css`'s `prefers-color-scheme` override; **no**
  library-viewer-specific dark rules.
- **AC4** — no interaction change: the columns-mode golden diff showed **only** the `<style>` block changed;
  DOM + in-page JS are byte-identical.
- **AC5** — consumer extraHead audit: `frameworks` clean; `primer` (curated/yours badges + pills) and
  `learn-list` (grounded badge) reconciled onto `--pmos-*` (this fixed a latent correctness bug — removing the
  old `:root` block had left `var(--accent)`/`var(--muted)` undefined in those two consumers).
- **AC6** — `lib.test.mjs` gained an inline-style.css contract assertion (`--pmos-*` tokens + JetBrains Mono
  `@font-face` + no external stylesheet/`@import`); `guidelines.md` documents the read-and-inline contract;
  `readBaseCss` kept internal so the public API surface is unchanged. `selftest.sh` green (15 node tests + grep).
- **AC7** — all 3 browse pages built and screenshotted in both schemes (warm-paper light + dark): correct
  burnt-orange accent, legible borders/chips, serif reader body, no dark-blue remnants.
- **AC8** — §G clean: diff touches zero `plugin.json`/`marketplace.json`/CHANGELOG/README/learnings files;
  release-prereqs are Loop-3's job.

Gates: skill-eval `[D]` green on `/primer` (regression guard — diff touches **no** SKILL.md, so `[D]`+`[J]`
cannot regress); viewer hygiene lints (`lint-no-modules-in-viewer`, `lint-no-dot-shared`, `lint-js-stack-preambles`)
green; all 3 consumer `--selftest` green.
