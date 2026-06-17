# Dogfood — `/summary-tldr --mode shorts` (story 260617-wf6)

Live, end-to-end exercise of the shorts carousel: derive ≤140-char cards from grounded keyfacts →
pair relevant existing media (source figures **and** this-run artifacts) → emit a self-contained
sibling `<slug>-shorts.html` through the `_shared/html-authoring` substrate → drive it in a real
browser (Playwright over `http://localhost`).

## Inputs (a realistic source)

- `cards-model.json` — 5 grounded card candidates from a "Remote Work, Two Years On" research brief
  (each carries the Phase-4 `keyfact` it was derived from, per D3/D7/D12).
- `figure-inventory.json` — the figure inventory shape `/explainer-video`'s `ingest.mjs` emits (INV5,
  no new extractor): two figures that genuinely match cards (costs chart, review-latency chart) + one
  unrelated decoy (an offsite team photo).
- `extra-media.json` — a this-run artifact (the `--mode mindmap` SVG), proving extra-media pairing.
- `assets/*.png`, `remote-work-mindmap.svg` — visible placeholder media so the pairing is legible in
  the screenshots.

## Pipeline run (all deterministic, §H)

```
node scripts/shorts.js --derive-cards            < cards-model.json     > cards.json          # exit 0
node scripts/shorts.js --pair-media \
     --inventory figure-inventory.json --extra extra-media.json < cards.json > cards-paired.json
node scripts/shorts.js --emit --cards cards-paired.json --meta meta.json --out remote-work-shorts.html
```

Pairing result (each figure used at most once; unrelated never force-attached):

| Card | Takeaway (≤140) | Paired media |
|---|---|---|
| 1 | Office real-estate costs fell 40% after the company went remote-first. | `costs-chart.png` (source figure) |
| 2 | Median code-review turnaround grew from 4 hours to 11 hours. | `review-latency.png` (source figure) |
| 3 | Engineer-reported focus time rose to 3.2 deep-work hours per day. | *(text-only — no relevant figure)* |
| 4 | Two of nine teams missed their quarterly OKRs, both newly formed. | *(text-only)* |
| 5 | Adopt a hybrid 3-day-anchor schedule to protect review latency. | `remote-work-mindmap.svg` (this-run artifact) |

The unrelated "team photo" decoy was **never** attached to any card (D8 — a clean text card beats a
misleading image).

## Live browser checks (Playwright, `http://localhost:8791`)

- **Renders self-contained:** `<meta name="pmos:skill" content="summary-tldr">` present, rides
  `main.pmos-artifact-body`, inline CSS+JS, no external `<link rel=stylesheet>`, inline
  `pmos-comments` block present → `/comments`-compatible.
- **5 slides, accessible carousel:** track is `role="region"` / `aria-roledescription="carousel"`;
  card counter reads `1 / 5`.
- **Keyboard nav:** `→→` advanced `1/5 → 3/5`; `←` returned to `2/5`. Pointer/scroll-snap swipe is
  the native track behaviour.
- **Boundaries:** at `1/5` Prev is disabled; at `5/5` Next is disabled.
- **Media pairing visible:** card 1 shows the costs chart, card 5 shows the this-run mindmap (see
  screenshots).
- **Zero console errors.**

### Regression caught + fixed during this dogfood

The first emit produced **2 console errors** (`Unexpected identifier 'tokens'`). Root cause:
`template.html` opens with a documentation comment that lists the token names literally, and
`renderArtifact` does a blanket `replaceAll` across the whole string — so `{{inline_comments_json}}`
expanded **inside that comment** to a sentinel block containing `-->`, closing the doc-comment early
and leaking `Other tokens (…)` annotation text as a stray `<script>`. Skills that call
`renderArtifact` inline strip this comment by hand; `shorts.js` (a programmatic caller) now strips it
too via `stripLeadingDocComment()`, with two selftest guards (no leaked annotation; document starts
at `<!DOCTYPE`). Re-emit → **zero console errors**, document starts at `<!DOCTYPE html>`.

## Screenshots

- `shorts-card1-costs-chart.png` — card 1 with its paired source figure; Prev disabled, counter `1/5`.
- `shorts-card5-mindmap-recommendation.png` — card 5 with the this-run mindmap; Next disabled, `5/5`.

Generated against pmos-toolkit 2.86.0.
