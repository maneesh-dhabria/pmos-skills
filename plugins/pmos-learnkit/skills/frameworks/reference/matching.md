# Matching & the `--json` contract

How `/frameworks "<problem>"` turns a plain-language problem into a ranked, capped set
of frameworks — and the exact JSON shape other skills consume.

## Contents

- [Two paths](#two-paths)
- [The deterministic scorer](#the-deterministic-scorer)
- [The confidence floor](#the-confidence-floor)
- [The LLM re-rank](#the-llm-re-rank)
- [The --json contract](#the-json-contract)
- [Why a deterministic prefilter](#why-a-deterministic-prefilter)

## Two paths

- **Situation path** — the input is (or fuzzy-matches) a known situation label/id in
  `situations.json`. Return that situation's curated `frameworks[]`, ranked by tag
  overlap with the situation's `tags`. High precision, no scorer needed.
- **Free-text path** — anything else. A two-stage rank: a deterministic prefilter
  (`match.mjs`) narrows to ~15 candidates, then an in-session LLM re-rank picks and
  explains the top ≤5.

## The deterministic scorer

`match.mjs --query "<problem>" [--floor N] [--json]` tokenizes the problem (lowercase,
split on non-word, drop stopwords) and scores each record by **weighted token
overlap**:

| Signal | Weight |
|---|---|
| token ∈ `problem_tags` | ×3 |
| token ∈ `name` / `aliases` | ×2 |
| token ∈ `when_to_use` + `summary` keywords | ×1 |

Score is normalized to `[0, 1]`: divide by the max achievable for an **effective query
of ≤6 tokens** (every token a ×3 tag hit), clamped to 1. The capped denominator keeps
verbose natural problem statements — the input style the skill invites — from being
punished for their length. Output: the top ~15 **nonzero** candidates sorted by score,
deterministic tie-break by `id` ascending so ordering is stable across runs. Zero-score
records are never returned — pure-nonsense input yields an empty pool, not fabricated
matches.

## The confidence floor

If the **top** candidate's score is below the floor (default `0.15`, override with
`--floor` — a `match.mjs`-only flag, not a `/frameworks` surface), the query is treated
as a weak match: `low_confidence: true`, and the **output** is capped at the ≤2 closest
candidates with an explicit caveat — never padded to 5 (resolves OQ2; Anti-Pattern:
never fabricate a top-5 for nonsense input). The cap applies to the output only: the
full nonzero candidate pool still flows to the LLM re-rank on the human path, which can
rescue a query the bag-of-words scorer under-rated. When nothing scores at all,
`count` is `0` — zero-score records are never dressed up as matches.

## The LLM re-rank

On the **human path**, the in-session agent re-ranks the ≤15 prefilter candidates
against the full problem statement (the scorer is bag-of-words; the LLM catches intent),
writes a ≤1-sentence "why it fits" per pick, and caps the result at 5. It then prints
the ranked list in chat and opens the library focused on those ids.

On the **`--json` path**, the LLM re-rank is run when session context is available;
when it isn't (a pure programmatic call with no agent), the deterministic prefilter
output stands — it is a *prefilter* answer (bag-of-words ordering can be rough), and
the `why` field is then a templated "matched on: <top signals>" rather than an LLM
sentence. The shape is identical either way; the **`reranked` boolean** tells the
consumer which it got — `match.mjs` always emits `reranked: false`, and an in-session
agent that re-ranks before returning the object sets `reranked: true`.

## The --json contract

The skill surface is `/frameworks "<problem>" --json`; the script surface it wraps is:

```
node ${CLAUDE_SKILL_DIR}/scripts/match.mjs --query "<problem>" --json [--floor N]
```

(`--floor`, `--top`, `--corpus` are script-only flags.) Either emits **only** this
object to stdout (no chat prose, single object, parseable — **FR-JSON-3**):

```json
{
  "query": "<problem>",
  "count": 3,
  "low_confidence": false,
  "reranked": false,
  "matches": [
    {"id": "product/rice", "name": "RICE", "why": "...",
     "score": 0.82, "category": "Product",
     "decision_type": "prioritize",
     "diagram": "/abs/path/to/skill/data/diagrams/product__rice.svg"}
  ]
}
```

- `count` = `matches.length`, always ≤ 5.
- `score` ∈ `[0, 1]`.
- `low_confidence: true` → `matches.length` ≤ 2 and each carries the caveat; `count`
  is `0` when nothing scores (zero-score records are excluded, never fabricated).
- `reranked` — `false` for the deterministic prefilter answer; `true` when an
  in-session agent re-ranked before returning (see [The LLM re-rank](#the-llm-re-rank)).
- `matches[].diagram` is an **absolute path** (the CLI resolves it against the corpus's
  skill directory — consumers don't know `${CLAUDE_SKILL_DIR}`) or `null`
  (ship-with-warning framework).
- `category` and `decision_type` are strings or `null` when absent (`"n/a"` is a real
  corpus value for `decision_type`, distinct from `null` = field missing).

**FR-JSON-2** — `tests/json-contract.test.mjs` asserts this shape (keys, types, cap ≤5,
score range, JSON-only stdout) against `match.mjs` over a fixture corpus. That test is
the "proven contract" standing in for a live consumer; wiring `/ideate` (or any other
skill) to call `--json` is a `/backlog` follow-up.

## Why a deterministic prefilter

Two reasons. **Cost** — an LLM ranking all ~270 records per query is wasteful; the
scorer cuts to ~15 first. **Determinism** — `--json` consumers and the contract test
need a stable, reproducible answer that doesn't depend on sampling. The LLM adds
judgment on top of a deterministic floor, never replaces it.
