# Dogfood verdict — story 260616-y9f (/learn-list reference viewer)

**Verdict: SHIP.** The reference viewer was built from the REAL curated-references corpus
(1817 records, PII-scrubbed by story v4h), served over `http://localhost:8801`, and driven
live in a real browser (Playwright MCP). Every load-bearing behaviour and the PII allowlist
contract were asserted against the live DOM.

## Artifact under test

- `library.html` — 1.5 MB, built via
  `node plugins/pmos-learnkit/skills/learn-list/scripts/build-library.mjs --out … --corpus <real corpus>`.
- Built **through the shared library-viewer substrate** (`_shared/library-viewer/lib.mjs`),
  not a forked copy — learn-list supplies only the corpus adapter + facet config.

## Live-driven assertions (all PASS)

| # | What was driven | Result |
|---|---|---|
| (a) | Corpus renders | 1817 cards embedded in `lv-data` AND 1817 rendered in `#groups`; first card real title + `https://` url; masthead `PMOS / Reference Library` |
| (b) | `source_type` facet filters | `article` → 1817 → 1346; applied-filter chip appeared |
| (c) | `year` facet filters | `2026` → 23 cards |
| (c) | `tags` multi-dropdown filters | 511 tag options; one tag → 1 card |
| (d) | Title+summary search narrows live | `pricing` → 31 cards (debounced) |
| (e) | Reader/detail sidebar opens | card click → reader open with title, `source_type · year` pill (`article · 2023`), Published + Summary columns, source link, deep-link hash `#ref_…` |
| (f) | Applied-filter chips + Clear-all reset | filter → chip shown; Clear-all → back to 1817, applied bar empty |

## PII allowlist contract — LIVE DOM (the load-bearing check)

Asserted in the live DOM via `browser_evaluate` (NOT bare-word grep — `workspace`/`snapshot`/
`occurrence` are ordinary English that legitimately appears in summaries; see the field-key note
in `tests/build-library.test.sh`):

- **Keys-subset:** every one of the 1817 embedded cards exposes ONLY allowlist-derived fields
  `{id,title,url,source_type,publication_date,year,tags,grounded,summary,body_html,references}`
  — **0 offenders**.
- **Field-key tokens:** none of `"page_id"`, `"database_id"`, `"occurrence"`, `"snapshot"`,
  `"workspace"`, `"notion_`, `_LEAK_` present anywhere in the serialized DOM — **0 matches**.
- `pii_clean: true`.

## Console

- 1 error: `GET /favicon.ico 404` — browser-auto-requested, NOT emitted by the page (the page
  references no favicon; the `data:,` favicon suppressant lives on the unmerged w1v branch).
  Benign, documented pattern. **0 page-originated errors.**

## Screenshots

- `01-reader-open.png` — reader sidebar open on a real card (title, pill, columns, source link).
- `02-library-grid.png` — full library grid with facets + masthead.

## Graceful degrade (covered by tests, not re-driven live)

`--corpus /nonexistent` → exit 0 + visible `No curated references found` empty-state + 0 cards
(asserted in `build-library.test.sh` T4 and the generator `--selftest`).
