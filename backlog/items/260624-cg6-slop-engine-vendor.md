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
status: planned
feature_folder: docs/pmos/features/2026-06-24_design-slop-engine/
plan_doc: docs/pmos/features/2026-06-24_design-slop-engine/stories/260624-cg6/03_plan.md
tasks: docs/pmos/features/2026-06-24_design-slop-engine/stories/260624-cg6/tasks.yaml
worktree:
claimed_by:
driver_holder:
labels: [pmos-toolkit, slop-engine, substrate, vendored, new-substrate]
created: 2026-06-24
updated: 2026-06-24
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
