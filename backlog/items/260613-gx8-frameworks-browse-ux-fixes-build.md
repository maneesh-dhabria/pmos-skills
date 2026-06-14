---
schema_version: 1
id: 260613-gx8
kind: story
parent: 260613-fc7
title: Fix the /frameworks browse-view design-crit findings (F1–F7) in build-library.mjs + tests + live dogfood
type: bug
priority: should
status: in-progress
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-13_frameworks-browse-ux-fixes/
plan_doc: docs/pmos/features/2026-06-13_frameworks-browse-ux-fixes/stories/260613-gx8/03_plan.html
tasks: docs/pmos/features/2026-06-13_frameworks-browse-ux-fixes/stories/260613-gx8/tasks.yaml
labels: [pmos-learnkit, frameworks, browse-ux, design-crit, a11y]
worktree: feat/260613-gx8
claimed_by: build:explainer-a3g-loop
driver_holder: build:explainer-a3g-loop
created: 2026-06-13
updated: 2026-06-14
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260613-gx8 -->

## Context

The single (singleton-wrap, D18) build story for epic `260613-fc7`. All seven design-crit findings (F1–F7) live in one generator file — `plugins/pmos-learnkit/skills/frameworks/scripts/build-library.mjs` — which emits the browse `index.html` client JS and carries that JS's inline behavioral assertions. There is no separable substrate, so the natural unit is one vertical story = one `/execute` run = one PR: the generator edits + its inline tests + the skill's `tests/`, validated by a live Playwright dogfood on a regenerated artifact.

Built against the design contract `docs/pmos/features/2026-06-13_frameworks-browse-ux-fixes/02_design.html` (decisions D1–D8) and the standing skill-authoring criteria (`feature-sdlc/reference/skill-patterns.md §A–§L`, repo `CLAUDE.md`).

### No dependency

`dependencies: []` — pmos-learnkit / `/frameworks` already exist on `main`; the build loop can pick this story immediately.

## Acceptance Criteria

- [ ] **AC-F1 — Perceived reload killed.** `openReader()`/`closeReader()` toggle selection via a new `updateSelection()` (no full `#groups` rebuild); search input is debounced (~120 ms); `render()` preserves/restores `window.scrollY` so narrowing the result set no longer snaps the page to the top. Verified live: clicking an item does not wholesale-replace the `#groups` subtree.
- [ ] **AC-F2 — Lazy thumbnails (D1).** Detailed-view SVG thumbnails mount via IntersectionObserver as cards approach the viewport; not all 272 SVGs are in the DOM at initial render.
- [ ] **AC-F3 — Reader keyboard/focus (D5).** With the reader open and no dropdown open, Esc closes the reader; opening moves focus into the reader; closing returns focus to the triggering item; `aria-hidden`/roles stay consistent.
- [ ] **AC-F4 — Deep link + Copy link (D2).** `openReader()` sets `location.hash` (the `hashchange` handler guarded against double-opening the current id); refresh re-opens the framework; a new "Copy link" action copies the deep URL; "Share" still copies social text.
- [ ] **AC-F5 — Clear search (D6).** A clear (✕) control empties the search; applied-bar "Clear all" also resets the text query; a non-empty query shows as a removable chip.
- [ ] **AC-F6 — Dynamic subtitle (D7).** The masthead subtitle's count equals `DATA.length` (no hardcoded "272").
- [ ] **AC-F7 — Mobile reader (D8).** At ≤720px, opening a framework calls `reader.scrollIntoView()`.
- [ ] **AC-tests — Regression net.** `build-library.mjs` inline assertions + the skill's `tests/` pass; the old scroll-hack assertion (~L608) is replaced with assertions for updateSelection, debounce, hash-on-open, Esc-closes-reader, lazy-mount wiring, and dynamic subtitle.
- [ ] **AC-dogfood (load-bearing, TN−1).** Regenerate a real browse `index.html` from the live corpus, serve over http, drive it in a real browser (Playwright): confirm no full-list rebuild on click, lazy thumbnails, Esc-closes-reader, hash-on-open + refresh-persistence, no scroll-snap on narrowing. Capture before/after evidence. This task is REQUIRED and runs at TN−1.
- [ ] **AC-standing.** Conforms to `skill-patterns.md §A–§L` and host `CLAUDE.md` (canonical skill path, manifest version-sync at release, /complete-dev release entry point). No release-prerequisite tasks in the plan waves (skill-patterns §G).

## Notes

Zero new runtime deps (IntersectionObserver is built-in); artifact stays a single `file://`-openable HTML; clipboard keeps its execCommand fallback.
