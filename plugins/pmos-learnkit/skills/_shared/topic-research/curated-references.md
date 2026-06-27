# curated-references.md — the curated-references overlay subagent (skill-agnostic)

Shared, skill-agnostic. Describes the **one** research-phase subagent that augments a
run's candidate pool with sources from a pre-curated reference corpus, when that corpus
is shipped beside this substrate. Inline this file from the sourcing step and follow it.
**This file knows nothing about which skill inlines it** — it returns a per-topic
candidate map; the calling skill never sees the corpus, only the survivors that the
existing verification loop in `sourcing.md` admits.

## When this runs (present-only)

The overlay is a **pluggable layer**: it exists only if the corpus file
`curated-references.json` (sibling of this file) is present. Absent → this subagent does
not run and `sourcing.md` proceeds with live search + harvested curations exactly as
before. The skills that inline this substrate stay general and shippable; the corpus is
something the substrate owner ships or doesn't.

A run also skips the overlay when the caller suppresses it — see "Suppression" below.

## How the corpus is generated (D3 pipeline)

The shipped `curated-references.json` is produced by a two-step, re-runnable pre-pass —
not edited by hand. A refresh from a fresh export is always **import → backfill**:

1. **Import** (`scripts/import-curated-references.mjs`) scrubs the raw export into the
   7-field PII-safe shape with content-derived ids — titles/summaries verbatim from the
   crawl, dead pages excluded. It also **normalizes every tag to the closed vocabulary**
   (`scripts/normalize-tags.mjs`, reading `tag-vocabulary.json` + `tag-synonyms.json`):
   variants/plurals/spelling drift collapse to a canonical member and brand/noise tags
   drop, so the facet list stays usably narrow. A tag that resolves to nothing in the
   closed set is a **build-time failure** listing the offender — the taxonomy cannot
   silently re-sprawl on a refresh.
2. **Backfill** (`scripts/backfill-titles.mjs`) recovers real titles for junk-title
   records (bot-wall / error / host-only) and re-summarizes ungrounded ones over a
   throttled headless-Chromium pass (Playwright is a **build-time tool only** — never a
   runtime dependency of any skill that inlines this file). It is idempotent: only
   records still carrying a junk title or an ungrounded summary are re-touched, and a
   confirmed-dead page (rendered 404 after the full escalation ladder) is dropped. ids
   re-mint when a record's canonical URL changes; the run report lists every remint.

This generation pipeline is invisible to the overlay at runtime — consumers read only the
finished corpus. See the script headers for the D5/D6/D8/D9 recovery contract.

## Contents

- When this runs (present-only)
- The dispatch (one subagent, all topics)
- The per-topic procedure
- Coverage gate (no domain classifier)
- Suppression
- What it returns

## The dispatch (one subagent, all topics)

Dispatch **exactly one** subagent for the whole research phase — not one per topic. It
receives every outline topic and returns a `topic → candidates[]` map in a single pass
(one dispatch is cheaper than N and the prefilter is the same corpus scan for all
topics). Per `skill-patterns.md` §L this is a sonnet-tier research dispatch: it reasons
over a few dozen prefiltered records per topic, reranks, and drops residual junk — no
fetching, no writes. The fetch-verify spend stays in `sourcing.md`'s existing loop, which
treats curated survivors identically to live-search candidates.

Inputs handed to the subagent:

- `outline.topics` — the topics to source for.
- the corpus tag-vocabulary — the closed canonical tag set in `tag-vocabulary.json`
  (sibling of this file), which equals the distinct `tags[]` values across
  `curated-references.json` by construction (every shipped tag is normalized to a member at
  import time). The subagent picks query tags from this controlled vocabulary, not free text.
- the resolved `depth` (from `intake.md`) so the per-topic target count matches the dial
  matrix — the curated slice rides the **same** top-N / depth dials as live sourcing
  (one fact, one home: the matrix lives in `intake.md`; do not restate it here).

## The per-topic procedure

For each topic the subagent:

1. **Picks ~5–8 query tags** from the corpus tag-vocabulary that best match the topic.
   Prefer specific tags; rarity weighting (below) already discounts near-useless generic
   tags present on most of the corpus, so a generic tag costs little but adds little.
2. **Runs the deterministic prefilter** — `curated-references-match.mjs` (sibling
   script) — over the corpus with those tags, taking the top ~K (default 30). The
   prefilter is a pure, zero-dep, no-LLM rarity-weighted (IDF) tag-overlap matcher:
   `score = Σ over matched tags of log(N / (1 + df(tag)))`. It pre-rejects bot-wall /
   4xx-5xx titles, down-weights `summary_grounded:false` records, and skips a small
   hard-blocked-domain list — so the subagent never reasons over obvious junk. (~1,800
   records is too large to scan reliably in-context; the prefilter narrows to a few dozen
   that fit.)
3. **Reranks** the ~30 prefiltered candidates for relevance / authority / recency and
   **drops residual junk** the regex prefilter could not catch.
4. **Hands the survivors** into `sourcing.md`'s "Rank-then-verify loop" step 1 candidate
   pool. From there they are hard-gated, tier-ranked, fetch-verified, and grounded by the
   existing loop — exactly like live-search candidates. Steps 2–5 of that loop are
   origin-agnostic and already enforce the trust contract; nothing about curated
   candidates bypasses verification. A curated source is never emitted unless it is
   fetched and verified this run, same as any other.

Over-supply on purpose: the curated slice's fetch-verify yield is ~30%, so the pool cap
that `sourcing.md` step 1 applies is ~3–4× the links-to-emit (not 3×) when the overlay
contributes — the extra candidates absorb the verification attrition.

## Coverage gate (no domain classifier)

There is **no "is this a PM topic?" classifier.** The corpus's own coverage decides, per
topic: if the prefilter returns fewer than `T` candidates above score `S` for a topic,
the subagent **skips injection for that topic and logs the skip** to chat (e.g.
`curated overlay: skipped "<topic>" — N candidates above score S (< T)`), leaving that
topic to live search alone. An off-domain topic naturally yields few low-scoring
candidates and is skipped without any brittle domain check; an on-domain topic clears the
gate. Defaults: `T = 3`, `S = 0` (the prefilter already filters score ≤ 0). The caller
may tighten `T`/`S`; it never needs to loosen them to dodge a classifier.

## Suppression

Even when the corpus is present, the overlay is suppressed when the caller asks for it —
a `--no-curated` natural-language/flag control, or a `curated_references: off` settings
key. Suppressed → this subagent does not run; the run proceeds on live search +
harvested curations only. Suppression is a per-run choice the calling skill resolves and
passes in; this file only honors it.

## What it returns

After this subagent runs, the calling skill's sourcing step holds, for the topics that
cleared the coverage gate:

```
curated = {
  "<topic 1>": [{id, url, title, source_type, publication_date, tags, summary, summary_grounded}, ...],
  "<topic 2>": [ ... ],
  // topics skipped by the coverage gate are absent (and were logged)
}
```

These are **candidates, not verified sources** — they enter `sourcing.md` step 1's pool
and earn their place only by passing the same hard gate, tier rank, and fetch-verify the
loop applies to every candidate. The calling skill does nothing overlay-specific
downstream; the merge is invisible past step 1.
