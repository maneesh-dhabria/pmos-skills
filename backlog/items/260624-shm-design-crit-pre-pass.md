---
schema_version: 1
id: 260624-shm
kind: story
parent: 260624-3jp
title: "/design-crit — deterministic slop pre-pass: inject the browser detector into the existing Playwright session, surface engine findings ahead of the LLM critique"
type: feature
priority: should
route: skill
dependencies: [260624-cg6]
plugin: pmos-toolkit
status: done
feature_folder: docs/pmos/features/2026-06-24_design-slop-engine/
plan_doc: docs/pmos/features/2026-06-24_design-slop-engine/stories/260624-shm/03_plan.md
tasks: docs/pmos/features/2026-06-24_design-slop-engine/stories/260624-shm/tasks.yaml
worktree: .claude/worktrees/feat-260624-shm
claimed_by: build:6681ff46-e6d7-4cb7-854d-4ca3ea2b44ff
driver_holder: build:6681ff46-e6d7-4cb7-854d-4ca3ea2b44ff
labels: [pmos-toolkit, design-crit, slop-engine, detect]
created: 2026-06-24
updated: 2026-06-25
---

<!-- status: planned at define (Loop 1); route:skill. Build via /skill-sdlc build --story 260624-shm -->

## Context

Consumer story of epic `260624-3jp` (dep: 260624-cg6 — the engine must be present, merged at claim
time per D9). Design contract: `02_design.html#c-design-crit` + `#d-stack` + `#non-duplication`.
`/design-crit` already launches Playwright; this story injects the slop engine into that open page.

## Acceptance criteria

1. `/design-crit` runs a deterministic **slop pre-pass before** its LLM Nielsen/WCAG/PSYCH critique:
   inject `_shared/slop-engine/browser.js`, call `window.pmosDesignScan()`, read findings from
   `.pmos-slop-*` in the DOM (read programmatically, not via screenshot).
2. Engine findings are presented as a **distinct lane** (rule id + snippet + fix guidance), reported
   **first**, with the LLM critique layered after — a reader can tell machine-flagged tells from judged
   UX issues (D-STACK).
3. **Additive + graceful (Inv-5):** if the engine fails to load, `/design-crit` behaves exactly as
   today, with a logged note. No regression to the existing critique flow.
4. Does **not** replace the LLM critique (non-duplication); the engine complements it.
5. `SKILL.md` edit conforms to `skill-patterns.md §A–§L`; passes `skill-eval` (the `[D]` half + judge);
   4 lints + audit clean; no release-prereq tasks in the plan (those are /complete-dev's).
6. Live dogfood: run `/design-crit` against an HTML artifact that contains a known slop tell (e.g. a
   `side-tab` accent border) and confirm the engine lane flags it, then the LLM lane adds judgement.
7. Inv-3 holds: no `impeccable` string introduced into `/design-crit` (engine is referenced by its
   pmos-native paths/globals).

## Build notes (Loop 2 — 2026-06-25)

BUILT on `feat/260624-shm` (branch commit `09832341`). All 7 ACs ✓. Worktree KEPT for Loop-3.

**Deliverable (route:skill inner pipeline):**
- `assets/slop-prepass.mjs` — Phase 3.5 engine-lane helper: drives the open Playwright page (same
  Chromium path as `capture.mjs`), injects `_shared/slop-engine/browser.js`, calls
  `window.pmosDesignScan()`, reads `.pmos-slop-*` findings from the **live DOM programmatically** (not a
  screenshot). Emits `slop-findings.json` `{generated,source,engine,overlaysRendered,findings:[{id,
  category,severity,snippet,selector,section}]}`. Inv-5 graceful degradation (engine-absent → exit 0 +
  stderr skip note + empty file; playwright-missing → exit 3, checked first so the dependency error wins).
- `assets/slop-prepass.test.mjs` — 2 node --test cases (T1 side-tab-only + quoted snippet from DOM +
  phantom-regression guard; T2 engine-absent graceful skip). `assets/__fixtures__/slop-prepass-side-tab.html`.
- `SKILL.md` — Phase 3.5 `{#slop-prepass}` (engine lane, D-STACK first/distinct, Inv-5 fallback,
  complement-not-replace) + Phase 6 `## Deterministic slop findings (machine-flagged)` rendered ahead of
  the byte-unchanged LLM Recommendations sections.

**Fixed two latent cg6 (260624-cg6) engine defects, surfaced by this story — they ride the epic on this branch:**
1. **browser.js SyntaxError** (from the prior tick): cg6's rename produced hyphenated JS identifiers
   (`window.pmos-slopDetect`, `el._pmos-slopOverlay`, `dataset.pmos-slopExtension`) → file was completely
   non-loadable (`node --check` failed). cg6's tests only grepped, never executed browser.js. Fixed via
   camelCase substitution (`pmosSlopDetect` / `_pmosSlopOverlay` / `pmosSlopExtension`).
2. **Engine self-scan phantoms:** `scan()`'s page-level regex clone stripped only the dead pre-rename
   `[id^="pmos-slop-live-"]` selector; the renamed engine's overlays are class-based and the injected
   `<style>` was unmarked → the engine flagged its OWN chrome (`gradient-text` from the label `<style>`,
   `theater-slop-phrase` from rule-description copy). Now strips by `.pmos-slop-*` classes + marks the
   chrome `<style>` `.pmos-slop-style`. **Separately**, the helper's `addScriptTag({path})` left the 200KB
   engine source as a `<script>` in the DOM, which the engine then scanned as page content (its source
   literally contains `background-clip:text`/`gradient`/the `"X theater"` comment) — fixed by removing the
   injected script node after it executes (CSP-safe via CDP injection; globals persist).

**Gates (all green):** helper tests 2/2 · engine tests 6/6 (unregressed) · `node --check` both files OK ·
skill-eval `[D]` EXIT0 (incl. `j-phase-refs-resolve` for Phase 3.5) · lint-non-interactive-inline /
lint-flags-vs-hints / lint-phase-refs / audit-recommended / comments-coverage PASS · Inv-3 grep
(SKILL.md + assets) zero `impeccable` · blind judge **SHIP 5/5/4/4/5** (both should-fixes applied:
Inv-5 dependency-error ordering; Phase 3.5 schema-doc + per-target-loop wording). Live dogfood under
`stories/260624-shm/dogfood/` — genuine gradient-text in real content STILL flagged (phantom fix is
surgical, doesn't over-suppress), Inv-5 degradation variant verified exit 0.

**Next:** Loop-3 `/complete-dev --epic 260624-3jp` (rides cg6 substrate + shm consumer + the two engine
fixes; epic still has consumers y9m + aqb unbuilt).
