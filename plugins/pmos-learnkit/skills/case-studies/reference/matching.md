# Matching — the two-stage ranking + the `--json` contract

How `/case-studies` turns a plain-words topic into a ranked shortlist of real case studies. Two
stages: a **deterministic prefilter** (`scripts/match.mjs`, tested, offline) followed by an
optional **in-session LLM re-rank** on the human path. `--json` returns the prefilter answer as a
machine contract. Mirrors `02_design.html#matching`; keep the two in lockstep.

## Stage 1 — deterministic prefilter (`match.mjs`)

`match.mjs` scores every record in the shipped corpus against the query tokens and returns the
nonzero pool, highest first.

**Tokenization.** Lowercase, split on non-`[a-z0-9]`, drop tokens of length ≤1 and a small
stopword set (articles, pronouns, filler, plus corpus-noise words `case`/`study`/`studies`).

**Scoring (per query token, first hit wins so a token never double-counts):**

| Where the token lands | Weight |
|---|---|
| the record's `topics` (the curated match axis) | **×3** |
| the record's `title` or `company` | **×2** |
| the record's `summary` or `what_they_built` (curated prose) | **×1** |

**Normalization.** `score = min(1, raw / (min(qtokens, 6) × 3))` — the denominator is the max
achievable for an *effective* query of ≤6 tokens (every token a ×3 topic hit), clamped to `[0,1]`.
Capping the denominator keeps a verbose, natural topic statement from being punished for its length
(the input style the skill invites).

**Pool + tie-break.** Sort by score descending, ties broken by `id` ascending (stable, deterministic).
Keep the top ~15 **nonzero** candidates. A **zero-score record is never returned** — a pure-nonsense
query yields an **empty pool**, not fabricated matches.

**Confidence floor (default 0.15).** If the top score `< floor`, the result is flagged
`low_confidence`. The floor caps the *output* (≤2, applied by `toJsonContract` / the caller) — it
**never** shrinks the candidate pool, so an in-session re-rank still sees the full ≤15 to rescue a
verbose query the bag-of-words scorer under-rated.

Exports: `tokenize`, `scoreRecord`, `match`, `toJsonContract`. CLI:
`node match.mjs --query "<topic>" [--json] [--floor N] [--top N] [--corpus <path>]` (`--floor` /
`--top` / `--corpus` are script-level knobs, not surfaced as skill flags). `--selftest` runs the
in-file fixture assertions.

## Stage 2 — in-session re-rank (human path only)

On the chat retrieve path the LLM re-ranks the full nonzero pool against the actual topic, writes a
**≤1-sentence "why it fits"** per pick, and **caps at 5**. On `low_confidence`, present ≤2 closest
with an explicit caveat — **never pad** to five. The re-rank reorders and prunes what the prefilter
surfaced; it **never invents** a study, an abstract, or a URL.

## The `--json` contract

`node match.mjs --query "<topic>" --json` prints **exactly one JSON object** to stdout — no prose,
no library open:

```json
{
  "query": "<the query string>",
  "count": 0,
  "low_confidence": false,
  "reranked": false,
  "matches": [
    {
      "id": "acme-pricing-flip",
      "title": "Acme flips to flat pricing",
      "company": "Acme",
      "why": "matched on topics: pricing-strategy",
      "score": 0.8333,
      "pillar": "business-model",
      "topics": ["pricing-strategy", "packaging"],
      "url": "https://example.com/acme"
    }
  ]
}
```

Field rules:

- `count` == `matches.length`, and is **≤5** (≤2 when `low_confidence`).
- `score` ∈ `[0,1]`, rounded to 4 decimals.
- `url` is **always present and non-empty** (it is a required, unique corpus field).
- `pillar` and `topics` are always present (`topics` an array, possibly empty).
- `reranked` is **`false` from the script alone** (a deterministic prefilter answer). An in-session
  agent that re-ranks the pool before returning the object sets `reranked: true`.
- An empty pool (nonsense query) returns `count: 0`, `matches: []`, `low_confidence: true`.

This is the parity contract other skills consume — same shape and discipline as `/frameworks`'
`--json`. `json-contract.test.mjs` proves the shape, the cap, the score bounds, the always-present
`url`, and the empty-pool-on-nonsense behaviour over a fixture corpus.
