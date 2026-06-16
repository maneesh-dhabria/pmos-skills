# T9 — live Playwright dogfood (260616-w1v primer browse retrofit)

Built `library.html` against the shipped 61-primer corpus + 1 seeded *Yours* primer
(`2026-01-01_seeded-yours-primer.html`), served from `http://localhost` (file:// is blocked
in the MCP browser), driven in a real Chromium.

## Verdict: PASS

| Check | Result |
|---|---|
| Both Collection sections present | `Curated` + `Yours` (`#groups .group > h3`) ✓ |
| Masthead subtitle (dual-population count) | `61 curated · 1 of yours — search or filter the library` ✓ |
| All five facet dropdowns | `f-collection`, `f-super`, `f-category`, `f-audience`, `f-depth` all present ✓ |
| Card titles **link out** (not in-page reader) | first card `h4.name a[href]` → `…/<id>.html` (no `#hash` interception) ✓ |
| Curated/Yours badge per card | 62 badges, distinct values `{Curated, Yours}` ✓ |
| Metarow pill set | e.g. `all-pms · deep · 15 sources · 3,741 words · 2026-06-14` (audience/depth/sources/words+thousands/date) ✓ |
| Facet filter → applied chip | Collection=Yours → `1 of 62`, only `Yours` section, chip `Collection: Yours ✕` ✓ |
| Clear all | resets to `62 of 62`, control value `''`, 0 chips ✓ |
| Free-text search (debounced) | `pricing` → `1 of 62`, all visible cards match, chip `Search: pricing ✕` ✓ |
| Clear search | resets to `62 of 62` ✓ |
| **Console** | 0 errors, 0 warnings ✓ |
| **Network requests** | exactly 1 (the document); no `favicon.ico`, no external CSS/JS/img/font — the `data:,` favicon prevents the favicon request ✓ |

Screenshots: `w1v-primer-library-full.png` (full page, both sections), `w1v-primer-library-filtered-curated.png` (Collection=Curated filter applied).

## R3 resolution note (coordination)

The frozen S2 substrate (`_shared/library-viewer/lib.mjs`) shipped a reader-centric card model
with no card-render/link-out seam, but the plan's `api-expectations` listed a *"per-skill
card-extras hook (badges, pills, non-linked titles)"* as an expected substrate capability.
Per R3 ("re-open S2 to add the capability — never fork the engine inside primer's script"),
an **additive, default-off, skill-agnostic** `config.card` seam (badge / link-out / metarow
pills) + a universal `data:,` favicon were added to the substrate. Frameworks passes no
`config.card` → byte-inert (substrate `lib.test.mjs` 12/12, frameworks `--selftest` +
`build-library.test.sh` both green; D12 grep clean — no skill names in `lib.mjs`).
