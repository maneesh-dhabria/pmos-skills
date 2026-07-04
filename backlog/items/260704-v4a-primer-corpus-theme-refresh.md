---
schema_version: 1
id: 260704-v4a
title: "Refresh the 61 bundled primer corpus files to the current Editorial Technical theme — new idempotent retheme-corpus.mjs CLI marker-scoped-replaces each corpus file's stale inlined substrate CSS with the current _shared/html-authoring/assets/style.css; body <main> bytes untouched"
type: chore
kind: story
status: planned
route: skill
priority: should
labels: [pmos-learnkit, primer, corpus, html-substrate, theme, skill]
created: 2026-07-04
updated: 2026-07-04
parent: 260704-vde
dependencies: []
design_doc: docs/pmos/features/2026-07-04_library-viewer-substrate-theme/02_design.html
plan_doc: docs/pmos/features/2026-07-04_library-viewer-substrate-theme/stories/260704-v4a/03_plan.html
feature_folder: docs/pmos/features/2026-07-04_library-viewer-substrate-theme/
worktree:
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
