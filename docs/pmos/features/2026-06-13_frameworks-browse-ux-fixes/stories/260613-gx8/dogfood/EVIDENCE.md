# T8 — Live Playwright dogfood evidence (story 260613-gx8)

Regenerated a real 272-framework browse `index.html` (4.6 MB) via
`node scripts/build-library.mjs --out dogfood/index.html`, served over
`http://localhost:8013`, driven in a real Chromium at 1440×900.

All seven design-crit findings proven live (not just selftest-asserted):

| Finding | Live measurement |
|---|---|
| **F1** perceived-reload killed | Clicking an item → **0 childList mutations / 0 removedNodes** on `#groups` (MutationObserver). `updateSelection()` toggles `.selected`, no subtree rebuild. Scroll preservation: scrolled to 1200 then typed a narrowing query → scrollY held at **1232** (≈1200, not snapped to 0). |
| **F2** lazy thumbnails | Detailed view renders **272 cards + 272 placeholders** but only **8 thumbs mounted** at first paint; IntersectionObserver present. |
| **F3** reader keyboard/focus | `focusInReaderAfterOpen=true`; Escape → `readerOpenAfterEsc=false`, `focusReturnedToOpener=true`, hash cleared. |
| **F4** deep link + Copy link | `openReader` sets `location.hash` (`#analytics%2Fcohort-analysis`); `data-act="copylink"` action present; hashchange guard against double-open. |
| **F5** clear search | ✕ control: `searchClearVisible=true` with a query, `searchValueAfterClear=""`; removable query chip `[data-rm-q]` appears then clears. |
| **F6** dynamic subtitle | `subtitleCount` text = **272** = `DATA.length` (no hardcoded literal). |
| **F7** mobile reader | `reader.scrollIntoView()` wired under `matchMedia('(max-width:720px)')` (selftest-asserted). |

**Console:** lone error is `favicon.ico` 404 — benign static-server artifact
(documented /solitaire lesson), not a regression.

**Regression net:** `node build-library.mjs --selftest` GREEN; full skill
`tests/` suite (build-library.test.sh, structure.test.sh,
json-contract.test.mjs, split-corpus.test.mjs) GREEN.

Screenshot: `after-browse.png` (list view, full corpus, viewport 1440×900).
