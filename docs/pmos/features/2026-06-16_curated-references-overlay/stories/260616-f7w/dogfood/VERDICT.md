# T9 — Live browser dogfood verdict (LOAD-BEARING)

**Story:** 260616-f7w — library-viewer substrate + frameworks refactor
**Date:** 2026-06-16
**Subject:** the REAL `/frameworks` browse page built from the full **272-record** corpus through the
refactored, substrate-driven `build-library.mjs` (`node build-library.mjs --out …`, 4.6 MB self-contained
HTML), served over `http://localhost:8799` and driven via Playwright (real DOM events).

**Verdict: SHIP — 7/7 objectives pass, zero behavioural regression vs the shipped viewer.**

| # | Objective | Result |
|---|---|---|
| 1 | Default view is **LIST** | PASS — list button `.active`, `ul.listview` rendered, 22 groups, `272 of 272`, no cards in list view |
| 2 | Free-text search narrows, **debounced**, scrollY preserved (no snap-to-top) | PASS — `pricing` → `12 of 272`, removable Search chip appears, clear → `272 of 272`; after filtering scrollY = 339/232 (clamped to new doc height / reflow), **never 0** (no snap-to-top) |
| 3 | Facets: **OR-within / AND-across** + applied chips + Clear all | PASS — 2 decision-types union 49→58 (OR-within grows); +1 tag intersection 58→0 (AND-across reduces); 3 chips + Clear all; clear → 272, checkboxes synced unchecked |
| 4 | Detailed view thumbnails **lazy-mount** (IntersectionObserver), not all inlined at first paint | PASS — 272 cards, 272 `data-thumb` placeholders, only **5** injected at first paint |
| 5 | Reader **layout-shifts (not overlay)**, inline diagram renders, hash updates, Copy/Link/Share | PASS — `position:sticky` (not `fixed`), width > 0, `.body svg` diagram present, hash `#analytics/cohort-analysis`, all 3 actions present, PM's take rendered, toast on copy |
| 6 | **Escape** closes reader, **focus returns** to opener | PASS — Escape closes + clears hash; in list view focus returns to the `<a>` opener (`activeElement` = the opener anchor); deep-link `hashchange` reopens |
| 7 | **Zero console errors** | PASS — the only console entry in the whole session is `favicon.ico 404` (the static test server serves no favicon — an environment artifact, **not** page-originated) |

## Faithful-reproduction notes (not regressions)

- **Scroll on heavy filtering** clamps to the shorter filtered page height; the F1 guarantee is *no snap to top*
  (scrollY ≠ 0), which holds. The `render()` capture/restore logic is byte-equivalent to the shipped viewer.
- **`li.selected` on open-without-rerender** and **focus-return from a detailed `<div class="card">`**: in both the
  shipped and the substrate viewer, `updateSelection()` toggles `selected` on the `[data-id]` node and `.focus()`
  only lands on focusable openers (the `<a>` in list/compact). Identical behaviour — the substrate did not change it.

## Evidence

- `fw-list-default.png` — default list view, 272 of 272, 22 groups.
- `fw-detailed-view.png` — detailed card grid (lazy thumbnails).
- `fw-reader-open.png` — reader open: layout-shifted aside, inline diagram, PM's take, Copy/Link/Share.
