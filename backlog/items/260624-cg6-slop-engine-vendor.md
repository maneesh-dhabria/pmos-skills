---
schema_version: 1
id: 260624-cg6
kind: story
parent: 260624-3jp
title: "Vendor the design-slop engine into _shared/slop-engine/ — pmos-native registry + verbatim checks + jsdom-free Node adapter + browser adapter + rules generator + NOTICE + fixtures"
type: feature
priority: should
route: skill
dependencies: []
plugin: pmos-toolkit
status: done
released: v2.89.0
feature_folder: docs/pmos/features/2026-06-24_design-slop-engine/
plan_doc: docs/pmos/features/2026-06-24_design-slop-engine/stories/260624-cg6/03_plan.md
tasks: docs/pmos/features/2026-06-24_design-slop-engine/stories/260624-cg6/tasks.yaml
worktree:
claimed_by: build:6681ff46-e6d7-4cb7-854d-4ca3ea2b44ff
driver_holder: build:6681ff46-e6d7-4cb7-854d-4ca3ea2b44ff
labels: [pmos-toolkit, slop-engine, substrate, vendored, new-substrate]
created: 2026-06-24
updated: 2026-06-25
---

<!-- status: planned at define (Loop 1); route:skill. Build via /skill-sdlc build --story 260624-cg6 -->

## Context

Foundational substrate story of epic `260624-3jp`. Vendors impeccable's deterministic engine
(Apache-2.0) into `plugins/pmos-toolkit/skills/_shared/slop-engine/` as the single source of truth
the three consumer stories (B/C/D) read. Design contract: `02_design.html` — see
`#engine-internals`, `#naming`, `#d-deps`, `#decisions`. No consumer may fork the rules (Inv-1).

## Acceptance criteria

1. `_shared/slop-engine/registry.mjs` exports `SLOP_RULES` — ~44 rules ported **verbatim** from
   impeccable (all of them, per grill), each `{ id, category: 'slop'|'quality', name, description,
   skillSection, skillGuideline }`; `skillSection` ∈ the 8 allowed sections.
2. `_shared/slop-engine/checks.mjs` ports the pure `checkXxx()` logic **verbatim** (contrast/border/
   font/spacing math); no DOM access in the pure functions.
3. **D-DEPS = option (a):** the Node/static path (`detect.mjs`) parses HTML + computed CSS via a
   **vendored MIT parser stack** (htmlparser2 + css-select + css-tree), pre-bundled, **no `npm install`
   at runtime, no jsdom at runtime**. jsdom, if used, is a **test-only** devDependency. Any check the
   vendored parsers cannot reproduce degrades to browser-only and is **skipped on the Node path with a
   logged note** — never silently dropped (Inv-5).
4. `_shared/slop-engine/browser.js` is the self-contained browser adapter exposing
   `window.pmosDesignScan()`, rendering `.pmos-slop-overlay` / `.pmos-slop-label`.
5. **D-NAMING:** a case-insensitive grep for `impeccable` across `slop-engine/**` returns hits **only**
   in `NOTICE` (Inv-3). All identifiers/globals/CSS/strings are pmos-native.
6. `_shared/slop-engine/NOTICE` reproduces the Apache-2.0 attribution to `pbakaus/impeccable`.
7. A generator (`_shared/slop-engine/gen-rules-doc.mjs` or similar) emits the prevention-reference
   markdown from `SLOP_RULES.skillGuideline` grouped by `skillSection` (consumed by story D).
8. Ported two-column flag/pass **fixtures + tests** (Node path) pass, including **pass-cases for pmos's
   own artifacts** (the comment-overlay chrome + editorial template) → zero false positives on them.
9. `detect.mjs` exports a clean public API (`detectHtml(path|string)` → findings array) consumed by
   /verify (story C); `browser.js` consumed by /design-crit (story B).
10. Conforms to `skill-patterns.md §A–§L` (substrate, not a SKILL.md) + host `CLAUDE.md` (canonical
    path, no version/changelog tasks here — release prereqs are /complete-dev's).

## Build notes (Loop 2 — 2026-06-25)

Built on `feat/260624-cg6` (commit `08cfefa6`). Substrate story, **no SKILL.md → skill-eval N/A**;
quality gate is `node --test tests/` + the Inv-3 content grep.

- **AC1** ✓ `registry.mjs` exports `SLOP_RULES` (44 rules); upstream `Copy`/`Imagery`/`Color & Theme`
  sections normalized onto the 8 allowed (`UX Writing`/`Visual Details`/`Color & Contrast`).
- **AC2** ✓ `checks.mjs` exports 70 pure check fns (checkBorders/Colors/Motion/… verbatim).
- **AC3 / D-DEPS = (a)** ✓ `detect.mjs` runs fully offline over `vendor/parsers.mjs` (esbuild bundle of
  htmlparser2+css-select+css-tree+domutils) — **no npm, no jsdom at runtime**. css-tree imported from
  its prebuilt `dist/csstree.esm` (the bare entry's `createRequire('../data/patch.json')` breaks esbuild).
- **AC4** ✓ `browser.js` exposes `window.pmosDesignScan()` + `.pmos-slop-overlay/-label`.
- **AC5 / Inv-3** ✓ case-insensitive `impeccable` grep across `slop-engine/**` → hits **only** `NOTICE`
  (+ `LICENSE-impeccable.txt`). Test constructs the needle as `'imp'+'eccable'` so it isn't a self-hit.
- **AC6** ✓ `NOTICE` carries the Apache-2.0 attribution to `pbakaus/impeccable` + the D-NAMING table.
- **AC7** ✓ `gen-rules-doc.mjs` idempotent (pure fn of registry, fixed section order, id-sorted).
- **AC8** ✓ two-column fixture: flag column fires side-tab/low-contrast/gradient-text, pass column clean;
  **pmos's own editorial template + comment-overlay chrome → ZERO findings** (correctness gate).
- **AC9** ✓ `detectHtml(path|string)` (inline-HTML shim) returns stable findings shape
  `{antipattern,name,description,severity,file,line,snippet}`. Plus exported `BROWSER_ONLY_RULES`.
- **AC10** ✓ canonical `_shared/` path; no version/changelog/README/manifest tasks.
- **Inv-4/Inv-5 coverage map** (03_plan.md): **40/44 rules fully fire on the Node path; 4 degrade to
  browser-only** (icon-tile-stack, oversized-h1, body-text-viewport-edge, image-hover-transform — all
  rendered-geometry tests). `detectHtml()` emits a **one-time stderr note** listing them — never dropped.

**Tests:** `node --test tests/` → **6/6 pass**. **Inv-3 standalone grep → clean.**
Branch kept for Loop-3. **Next:** consumer stories shm (`/design-crit`) · y9m (`/verify`) · aqb
(prevention+drift-lint) all depend on this substrate; then `/complete-dev --epic 260624-3jp`.
