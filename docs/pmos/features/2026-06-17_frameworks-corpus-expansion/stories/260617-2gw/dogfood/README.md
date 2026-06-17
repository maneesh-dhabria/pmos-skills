# Dogfood — `/frameworks` corpus ingest 272 → 346 (story 260617-2gw)

Deliverable A of epic `260617-4w1`: merge the 74-framework research batch (records + paired
SVGs) into the bundled corpus, then prove the corpus still validates and the rebuilt library
renders the new frameworks' inline diagrams.

## T1/T2 — merge + SVGs (mechanical, gated)

- 74 embedded JSON records spliced verbatim into `data/frameworks.json` via the deterministic
  one-shot `execute/merge-batch.mjs` (fence-extract → collision-guard against corpus + within
  batch → append sorted by id → assert 346 + unique ids → temp-then-rename, byte-stable
  `JSON.stringify(…, null, 2) + "\n"`). Count **272 → 346**.
- 74 paired SVGs copied into `data/diagrams/` under their exact `<category>__<name>.svg` names and
  git-tracked. No remote refs: the only `http` hit in any new SVG is the `xmlns` namespace decl
  (`http://www.w3.org/2000/svg`, never network-resolved); 0 `<image href="http">` / `url(http)` /
  S3 references.

## T3 — validator green on the merged corpus

`node scripts/validate-corpus.mjs data/frameworks.json data/situations.json` → **PASS (exit 0)**.

```
corpus: 346 frameworks · name+body 100% · with-refs 94.2% · diagram 100% (0 exceptions)
warnings: 1 (ship-with-warning diagrams)   # references coverage 94.2% — 20 frameworks have
                                            # no source reference (optional per schema)

decision_type distribution (gate: no value >30%, n/a ≤5%):
  strategize    85 (24.6%)      prioritize   33 ( 9.5%)
  communicate   64 (18.5%)      decide       13 ( 3.8%)
  design        63 (18.2%)      estimate      7 ( 2.0%)
  diagnose      40 (11.6%)      n/a           3 ( 0.9%)
  frame         38 (11.0%)
```

Distribution gate clears with margin — top bucket `strategize` at 24.6% (< 30%), `n/a` at 0.9%
(≤ 5%). Every `problem_tags` ⊆ registry, `decision_type`/`lifecycle_stage` ∈ enums, `related[]`
resolve, every `diagram_anchors` present + length-matched + ≥40-char-substring-valid. The single
warning is the optional references-coverage advisory (ship-with-warning, not a gate) — no record
was edited to satisfy a gate (inv-merge-once held).

## T4 — library rebuilds + renders (live, Playwright @1280×800)

`node scripts/build-library.mjs --out {docs_path}/frameworks/index.html` →
`wrote … (346 frameworks)`, exit 0. (The built `index.html` is a 5.5 MB generated artifact —
evidence only, not committed.) Served zero-dep (`python3 -m http.server`) and driven in a real
browser:

- Library is the `_shared/library-viewer` substrate: search box + faceted `listview`, full record
  bodies (incl. inline diagram SVG) rendered on demand from the `#lv-data` island. Header reads
  **"346 PM thinking tools"**.
- **Three new frameworks opened + their inline SVG renders at the diagram anchor** (not a broken
  image), each `viewBox="0 0 640 400"`, `getBoundingClientRect().width > 0`:

  | New framework | Detail hash | Inline SVG rendered |
  |---|---|---|
  | Cynefin Framework | `#decision-making/cynefin-framework` | ✓ |
  | Wardley Mapping | `#business-strategy/wardley-mapping` | ✓ |
  | The Mom Test | `#product-discovery-and-delivery/the-mom-test` | ✓ |

- **Zero console errors.**

### Screenshots

- `2gw-cynefin-detail.png` — Cynefin detail panel with its inline sense-making SVG.
- `2gw-mom-test-detail.png` — The Mom Test detail panel with its inline SVG.

Generated against pmos-learnkit (corpus 346).
