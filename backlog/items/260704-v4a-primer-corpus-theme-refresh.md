---
schema_version: 1
id: 260704-v4a
title: "Refresh the 61 bundled primer corpus files to the current Editorial Technical theme — new idempotent retheme-corpus.mjs CLI marker-scoped-replaces each corpus file's stale inlined substrate CSS with the current _shared/html-authoring/assets/style.css; body <main> bytes untouched"
type: chore
kind: story
status: done
route: skill
priority: should
labels: [pmos-learnkit, primer, corpus, html-substrate, theme, skill]
created: 2026-07-04
updated: 2026-07-05
parent: 260704-vde
dependencies: []
design_doc: docs/pmos/features/2026-07-04_library-viewer-substrate-theme/02_design.html
plan_doc: docs/pmos/features/2026-07-04_library-viewer-substrate-theme/stories/260704-v4a/03_plan.html
feature_folder: docs/pmos/features/2026-07-04_library-viewer-substrate-theme/
worktree: agent-skills-260704-v4a
branch: feat/260704-v4a
claimed_by: "build:b0e236c5-8aab-4a88-8bd7-4d40d8d8e0bc"
driver_holder: "build:b0e236c5-8aab-4a88-8bd7-4d40d8d8e0bc"
---

## Context

The individual-pages half of epic 260704-vde: refresh the 61 bundled primer corpus files
(`plugins/pmos-learnkit/skills/primer/data/primers/*.html`) whose *inlined* substrate CSS is a stale "Mono
Minimal" snapshot (`#fafafa` stone / `#c2410c`), not the current warm-paper "Editorial Technical" theme
(`#f8f5ef`). The bundled primers are deliberately self-contained (CSS inlined, not linked to an `assets/` dir),
so the fix must preserve inlining. No inline/freeze script exists today — this story builds one. Grounded in
`02_design.html` §5, decisions D2/D7, invariant INV-5.

Independent of story 260704-m7f (that story re-themes the library-viewer *browse* substrate; this touches the
individual bundled primer docs — different code path, no shared code). Coordination with in-flight primer epics
260704-rgt (References) and 260704-dgq (enrichment) is handled by CSS-region scoping + idempotence (INV-5,
§6) — no hard dependency.

## Acceptance Criteria

- [ ] **AC1 — re-theme CLI.** New `plugins/pmos-learnkit/skills/primer/scripts/retheme-corpus.mjs` (zero-dep Node
  ESM, mirroring the established backfill-CLI convention). For each `data/primers/*.html`, it replaces the
  **inlined substrate CSS block(s)** with the current `_shared/html-authoring/assets/style.css` content (and
  `comments.css` if the corpus files inline it too). The block is located by the substrate header-comment marker
  (`/* pmos-toolkit html-authoring substrate … */`), **not** a naive "first `<style>`" — so only the substrate
  style is touched.
- [ ] **AC2 — CSS-region-scoped (INV-5).** The diff for each file touches only the matched `<style>`/CSS region;
  the primer body (`<main>` … `</main>`) is byte-for-byte unchanged. Assert this (e.g. extract + compare the
  `<main>` span before/after).
- [ ] **AC3 — idempotent (INV-5, D7).** Running the CLI a second time produces a no-op diff (byte-identical
  output) for every file.
- [ ] **AC4 — full corpus.** All 61 files under `data/primers/*.html` are processed; the CLI reports a
  per-file changed/unchanged summary and exits non-zero on any file where the substrate marker can't be located
  (fail loud, don't silently skip).
- [ ] **AC5 — tests.** A unit/integration test on a small fixture asserting: (a) the marker-matched block is
  replaced with current `style.css`; (b) body bytes unchanged; (c) second run is byte-idempotent; (d) a file
  missing the marker triggers a loud error. Runnable via `node --test` (or the repo's script-test convention);
  green. Wire into the primer skill's test runner.
- [ ] **AC6 — the 61 files re-themed.** After running the CLI, the committed corpus files carry the current
  Editorial Technical `:root` (`--pmos-bg:#f8f5ef`, `--pmos-accent:#b8431a`), not the stale Mono Minimal
  snapshot. (This story's build re-runs the CLI and commits the refreshed files.)
- [ ] **AC7 — release-prereq scope (§G).** No version-bump / changelog / README / manifest / learnings tasks in
  any build wave — those are `/complete-dev`'s (Loop 3). List them under the plan's Release prerequisites only.
- [ ] Conforms to `skill-patterns.md §A–§L`; `skill-eval` (`[D]`+`[J]`) passes; 4 hygiene lints +
  `audit-recommended` green.

## Notes

Built 2026-07-05 via `/feature-sdlc build` (route:skill) on branch `feat/260704-v4a` (commit
`b95ba4ad`, UNMERGED — awaits Loop-3 `/complete-dev --epic 260704-vde`). Two new files
(`scripts/retheme-corpus.mjs`, `tests/retheme-corpus.test.sh`) + all 61 refreshed
`data/primers/*.html`. SKILL.md untouched.

All 7 ACs met:
- **AC1** — new zero-dep ESM `retheme-corpus.mjs`. Locates the substrate `<style>` block by its
  header-comment marker (`/* pmos-toolkit html-authoring substrate` — NOT the first `<style>`) and
  rebuilds it with render.js's exact assembly (`<style>\n{style.css}\n/* --- comments.css --- */\n{comments.css}\n</style>`),
  reading the current `_shared/html-authoring/assets/style.css` + `comments.css` via `import.meta.url`.
- **AC2** — CSS-region-scoped: replacing only the matched `<style>` span leaves everything else
  verbatim. Verified across all 61 files that `<main>…</main>` is byte-identical to HEAD (a prose
  `#f8f5ef` in a fixture body proved the CLI never touches non-CSS text).
- **AC3** — idempotent: a second run over all 61 is a byte-for-byte no-op (0 changed).
- **AC4** — full corpus (61/61), per-file changed/unchanged summary, **fail-loud** (non-zero exit
  naming the file) on any missing marker; never silently skips.
- **AC5** — `tests/retheme-corpus.test.sh` (primer convention): the four cases (marker block replaced
  with current style.css; body bytes unchanged; second run idempotent; missing-marker fails loud)
  via the CLI's in-memory `--selftest` + an on-disk stale fixture, plus an AC6 guard that `--check`
  over the shipped corpus reports zero pending changes. Green alongside `structure` + `build-library`
  tests. (Live-dogfood catch: the first test draft assumed the shipped corpus stays stale — false
  after this story re-themes it; rewrote to build its own stale fixture + assert the shipped corpus
  is current.)
- **AC6** — all 61 committed files carry the current Editorial Technical `:root`
  (`--pmos-bg #f8f5ef`, `--pmos-accent #b8431a`); zero stale `#fafafa` / "Mono Minimal" remnants;
  the re-themed substrate block byte-matches the canonical render.js assembly verbatim. Offline
  preserved (no external `<link>`/`<script>`/`@import` introduced, INV-1).
- **AC7 / §G** — diff touches zero `plugin.json`/`marketplace.json`/CHANGELOG/README/learnings;
  release-prereqs are Loop-3's job.

Gates: `skill-eval` `[D]` all pass on `/primer` (regression guard — diff touches **no** SKILL.md, so
`[D]`+`[J]` cannot regress from main); `lint-flags-vs-hints`, `lint-phase-refs`, `audit-recommended`
(9 calls, all marked), `lint-non-interactive-inline` (56 skills) all green.

With m7f (built) + v4a (this), epic 260704-vde is fully built and ready for Loop-3
`/complete-dev --epic 260704-vde` (merges both unmerged feat branches).
