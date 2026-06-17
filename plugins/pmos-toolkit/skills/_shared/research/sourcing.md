# sourcing.md — rank-then-verify per sub-question

Canonical home (§K) for **how a research worker gathers evidence** for one sub-question:
rank candidates first, fetch-verify only the survivors, never emit an unfetched source.
Shared and skill-agnostic — this file knows nothing about which skill inlines it. Ported
(not cross-cited) from learnkit's `topic-research/sourcing.md`, adapted from
reading-list curation to decision-support evidence-gathering.

## Contents

- [The governing rule](#governing-rule)
- [Est-cost log line (before sourcing)](#est-cost)
- [Rank-then-verify loop (per sub-question)](#rank-then-verify)
- [The unit: per-sub-question evidence set (no flattening)](#unit)

## The governing rule {#governing-rule}

**Rank first, then verify only the survivors** (verification spend scales with what you
cite, not with the candidate pool), and **never cite a source you have not fetched this
run.** The anti-slop hard gate and tier ranking live in [`source-tiers.md`](source-tiers.md)
— read it; it is the load-bearing quality rule this file orchestrates. The difference
from list-curation: here each survivor yields **grounded claims for synthesis**, not an
annotation for a reading list.

## Est-cost log line (before sourcing) {#est-cost}

Before the first fetch in a fan-out, the orchestrator emits one cost-estimate line so a
large run is never a silent surprise:

```
est. ~<sub-questions × sources-per-sub-question> source verifications across <N> sub-questions; proceeding
```

The depth dial (`_shared/tier-matrix.md` + the consumer's depth matrix) is the sole
governor of total cost — there is no separate per-run cap. `deep` is the user's explicit
thoroughness choice.

## Rank-then-verify loop (per sub-question) {#rank-then-verify}

For each sub-question, sized by the depth row of the consumer's matrix:

1. **Gather candidates** from live web search (+ any approved connected sources / user
   files) — cap the pool at ~3× the sources-to-cite.
2. **Apply the hard gate** from `source-tiers.md` (attributable + plausibly real) —
   discard failures cheaply on metadata, before any fetch.
3. **Tier-rank** survivors (T1–T4); take the top-N for the depth.
4. **Fetch-verify only the top-N**: fetch each, confirm it is reachable, that its content
   actually supports the claim you will draw from it, and record an access date. On a
   failure, pull the next-ranked candidate and verify it. Stop at N verified — or fewer
   if the sub-question is genuinely thin (**honest under-coverage beats padding**; say so
   in the findings).
5. **Extract grounded claims**: for each survivor, record the specific claim(s) it
   supports, each with a ≥40-char verbatim quote or a tight paraphrase + locator, its
   tier, and the access date. This is what the worker returns as structured findings and
   what synthesis cites.

## The unit: per-sub-question evidence set (no flattening) {#unit}

The output unit is **one verified evidence set per sub-question** — keep it that way; do
not flatten all sub-questions into one undifferentiated pool. The per-sub-question
structure lets synthesis map each set onto the matching report section and lets the
verification phase triangulate key claims within a sub-question. The calling skill (its
[`fan-out.md`](fan-out.md) protocol) decides how workers and the orchestrator consume
these sets.
