# sourcing.md — verified per-topic shortlists (rank-then-verify)

Shared, skill-agnostic. For each outline topic, produce a short ranked list of
**verified** sources. Inline this file and follow it; it emits one verified shortlist
per topic. **This file knows nothing about which skill inlines it** — one consumer may
render the shortlist as an annotated list, another may read every source and
synthesize; that choice is the calling skill's, not this file's.

## Contents

- The governing rule
- Est-cost log line (before sourcing)
- Rank-then-verify loop (per topic)
- The unit: per-topic shortlist (no flattening)
- Emitted shortlists

## The governing rule

**Rank first, then verify only the survivors** (verification spend scales with output,
not with the candidate pool), and **never emit a source you have not fetched this run.**
The anti-slop hard gate and tier ranking live in `source-tiers.md`; the verification
pass-bar, the free-fetch ladder, curation harvest, book summaries, and signature
writings live in `sourcing-ladder.md`. Read both — they are the load-bearing quality
rules this file orchestrates.

## Est-cost log line (before sourcing)

Before the first fetch, emit one cost-estimate line to chat so a large run is never a
silent surprise:

```
est. ~<topics × sources-per-topic> source verifications across <topics> topics; proceeding
```

At `deep` this matters most (the dial matrix allows 8–12 topics × 5–8 sources). The
depth dial is the sole governor of total cost — there is no separate per-run cap; the
matrix in `intake.md` bounds topics × sources, and `deep` is the user's explicit
thoroughness choice.

## Rank-then-verify loop (per topic)

For each topic in `outline.topics`, sized by the depth row in `intake.md`'s dial matrix
(top-N = 3 / 5 / 5–8):

1. **Gather candidates** from live search + the harvested curations
   (`canon.curations[].recurring_entries`) + — present only when
   `curated-references.json` exists beside this file — the curated-references overlay,
   injected per topic by the curated-references subagent (rarity-weighted prefilter →
   rerank; see `curated-references.md`). Cap the pool at ~3× the links-to-emit, or
   ~3–4× when the overlay contributes (its fetch-verify yield is ~30%, so over-supply
   to absorb the attrition). The overlay's candidates are hard-gated, tier-ranked, and
   fetch-verified by the steps below exactly like live ones — origin makes no
   difference past this step.
2. **Apply the hard gate** from `source-tiers.md` (attributable + plausibly real) —
   discard failures cheaply on metadata, before any fetch.
3. **Tier-rank** survivors (`source-tiers.md` T1–T4); take the top-N for the depth.
4. **Fetch-verify only the top-N** against the pass-bar in `sourcing-ladder.md`
   (reachable + identity-match + annotation grounded in fetched content). On a failure,
   pull the next-ranked candidate and verify it. Stop at N verified, or fewer if the
   topic is genuinely thin (honest under-coverage beats padding).
5. **Record a grounded takeaway** for each survivor from what you actually read (≤2
   sentences) — this is what a list-style consumer annotates from and a synthesis-style
   consumer cites from. Tag tier; tag `paywalled` + free alternative when one exists;
   attach a book summary per `sourcing-ladder.md` for any non-free book.

## The unit: per-topic shortlist (no flattening)

The output unit is **one verified shortlist per topic** — keep it that way. Do not
flatten all topics into a single undifferentiated pool. Keeping the per-topic structure
lets a list consumer render by topic and lets a synthesis consumer map each topic's
shortlist onto the matching section of its artifact. Read + use **every** verified
source in a shortlist; the per-topic size is already bounded by the dial matrix.

## Emitted shortlists

After this file runs, the calling skill holds:

```
sourced = {
  "<topic 1>": [{url, tier, takeaway, paywalled?, free_alt?, book_summary?}, ...],  // ranked, verified
  "<topic 2>": [ ... ],
  ...
}
```

One shortlist per `outline.topics` entry (or an explicit "thin — little quality material
found" note for a genuinely empty topic). The calling skill decides what to do with each
shortlist.
