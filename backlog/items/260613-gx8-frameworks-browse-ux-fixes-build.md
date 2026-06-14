---
schema_version: 1
id: 260613-gx8
kind: story
parent: 260613-fc7
title: Fix the /frameworks browse-view design-crit findings (F1–F7) in build-library.mjs + tests + live dogfood
type: bug
priority: should
status: done
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
build_commit: b46998f
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260613-gx8 -->

## Context

The single (singleton-wrap, D18) build story for epic `260613-fc7`. All seven design-crit findings (F1–F7) live in one generator file — `plugins/pmos-learnkit/skills/frameworks/scripts/build-library.mjs` — which emits the browse `index.html` client JS and carries that JS's inline behavioral assertions. There is no separable substrate, so the natural unit is one vertical story = one `/execute` run = one PR: the generator edits + its inline tests + the skill's `tests/`, validated by a live Playwright dogfood on a regenerated artifact.

Built against the design contract `docs/pmos/features/2026-06-13_frameworks-browse-ux-fixes/02_design.html` (decisions D1–D8) and the standing skill-authoring criteria (`feature-sdlc/reference/skill-patterns.md §A–§L`, repo `CLAUDE.md`).

### No dependency

`dependencies: []` — pmos-learnkit / `/frameworks` already exist on `main`; the build loop can pick this story immediately.

## Acceptance Criteria

- [x] **AC-F1 — Perceived reload killed.** `openReader()`/`closeReader()` toggle selection via a new `updateSelection()` (no full `#groups` rebuild); search input is debounced (~120 ms); `render()` preserves/restores `window.scrollY` so narrowing the result set no longer snaps the page to the top. Verified live: clicking an item does not wholesale-replace the `#groups` subtree.
- [x] **AC-F2 — Lazy thumbnails (D1).** Detailed-view SVG thumbnails mount via IntersectionObserver as cards approach the viewport; not all 272 SVGs are in the DOM at initial render.
- [x] **AC-F3 — Reader keyboard/focus (D5).** With the reader open and no dropdown open, Esc closes the reader; opening moves focus into the reader; closing returns focus to the triggering item; `aria-hidden`/roles stay consistent.
- [x] **AC-F4 — Deep link + Copy link (D2).** `openReader()` sets `location.hash` (the `hashchange` handler guarded against double-opening the current id); refresh re-opens the framework; a new "Copy link" action copies the deep URL; "Share" still copies social text.
- [x] **AC-F5 — Clear search (D6).** A clear (✕) control empties the search; applied-bar "Clear all" also resets the text query; a non-empty query shows as a removable chip.
- [x] **AC-F6 — Dynamic subtitle (D7).** The masthead subtitle's count equals `DATA.length` (no hardcoded "272").
- [x] **AC-F7 — Mobile reader (D8).** At ≤720px, opening a framework calls `reader.scrollIntoView()`.
- [x] **AC-tests — Regression net.** `build-library.mjs` inline assertions + the skill's `tests/` pass; the old scroll-hack assertion (~L608) is replaced with assertions for updateSelection, debounce, hash-on-open, Esc-closes-reader, lazy-mount wiring, and dynamic subtitle.
- [x] **AC-dogfood (load-bearing, TN−1).** Regenerate a real browse `index.html` from the live corpus, serve over http, drive it in a real browser (Playwright): confirm no full-list rebuild on click, lazy thumbnails, Esc-closes-reader, hash-on-open + refresh-persistence, no scroll-snap on narrowing. Capture before/after evidence. This task is REQUIRED and runs at TN−1.
- [x] **AC-standing.** Conforms to `skill-patterns.md §A–§L` and host `CLAUDE.md` (canonical skill path, manifest version-sync at release, /complete-dev release entry point). No release-prerequisite tasks in the plan waves (skill-patterns §G).

## Notes

Zero new runtime deps (IntersectionObserver is built-in); artifact stays a single `file://`-openable HTML; clipboard keeps its execCommand fallback.

## Build Notes (Loop 2 — 2026-06-14)

BUILT on `feat/260613-gx8`, build commit `b46998f`. route:skill. All 9 ACs verified.

- **Single file touched:** `plugins/pmos-learnkit/skills/frameworks/scripts/build-library.mjs` (the generator that emits the browse `index.html` client JS + inline assertions). All seven F-findings + the inline-test rewrite live there; no separable substrate (D18 singleton).
- **F1–F7 implementation:** `updateSelection()` toggles `.open`/`.selected` without rebuilding `#groups`; `render()` snapshots/restores `window.scrollY`; search `input` debounced ~120 ms; `thumbHtml()` emits empty `data-thumb` placeholders, `mountThumbs()` lazy-injects via IntersectionObserver (rootMargin 200px, eager fallback if no IO); `openReader()`/`closeReader()` manage `location.hash` (hashchange guarded), focus into/out of reader, mobile `scrollIntoView` under `matchMedia(max-width:720px)`; ✕ clear control + applied-bar query chip + Clear-all reset `state.q`; subtitle count bound to `DATA.length`.
- **Phase 6a /skill-eval (route:skill, hard):** all [D] deterministic checks **PASS** (SKILL.md untouched → fully green, no residuals). a-name-matches-dir, body-size, phase-refs, flag-contract all pass.
- **Phase 7 /verify GREEN:** `node build-library.mjs --selftest` PASS (old scroll-hack assertion replaced with updateSelection / debounce / hash-on-open / Esc-closes / lazy-mount / dynamic-subtitle checks); full `tests/` suite — build-library.test.sh, structure.test.sh, json-contract.test.mjs, split-corpus.test.mjs — all PASS.
- **AC-dogfood (load-bearing, live Playwright @1440×900):** regenerated a real 272-framework `index.html`, served over `http://localhost:8013`, drove it in Chromium. Proved live: **0 childList mutations / 0 removedNodes** on item open (no `#groups` rebuild); detailed view renders 272 cards + 272 placeholders but only **8 thumbs mounted** at first paint; Esc closes reader + focus returns to opener; `location.hash` set on open; ✕ clears query + chip; subtitle = 272 = `DATA.length`; scrollY held at **1232** (≈1200, not snapped to 0) when narrowing a tall list. Lone console error = `favicon.ico` 404 (benign). Evidence: `stories/260613-gx8/dogfood/EVIDENCE.md` + `after-browse.png` (4.6 MB regenerated `index.html` left untracked — regenerable via `--out`).

**Next (Loop 3):** `/complete-dev --epic 260613-fc7` — pmos-learnkit release (single-plugin diff).
