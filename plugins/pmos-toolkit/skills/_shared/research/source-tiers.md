# source-tiers.md — the anti-slop citation gate

Canonical home (§K) for **which sources may be cited** in a decision-support research
report. A research report is only worth more than a raw search when it filters slop the
way a knowledgeable analyst would. The model cannot "feel" quality reliably, so quality
is a checkable rule, not a vibe. Ported (not cross-cited) from learnkit's
`topic-research/source-tiers.md`; consumers (`/research`, and later `/artifact`'s
research phase) cite this file and state only their own deltas.

## Contents

- [The hard gate (every cited source must pass)](#hard-gate)
- [Tier ranking (orders survivors, informs triangulation)](#tier-ranking)
- [Slop tells (down-rank or drop)](#slop-tells)
- [Recency awareness](#recency)

## The hard gate {#hard-gate}

A source is **never cited** unless it clears BOTH — binary, no exceptions:

1. **Attributable** — a named author OR a recognized publication / practitioner /
   institution / official vendor. Anonymous content-farm posts fail. A named org account
   for a known company counts; "Top 10 Best …" with no byline does not.
2. **Reachable + fetched this run** — the source was actually fetched this run, the
   content matches the claim it supports, and the URL resolves. **Never emit a source you
   have not fetched** — an unfetched-but-plausible URL is a hallucinated citation and is
   the single worst failure mode of a research report.

The gate is binary. Tier ranking (below) only orders sources that already cleared it.
A claim whose only support fails the gate is **dropped or flagged as unverified** — it
does not ship as if cited.

## Tier ranking {#tier-ranking}

Within a sub-question, order surviving sources by tier (higher first), breaking ties by
recency and specificity. Tier also informs **triangulation** (how many independent
sources a key claim needs — see each consumer's verification phase):

| Tier | What | Examples |
|---|---|---|
| T1 — Primary | The thing itself, by who made/measured it | original paper, vendor's official docs, the practitioner's own essay, a maintainer's talk, a company's filing |
| T2 — Practitioner | A working expert explaining from direct experience | a respected engineer's blog, a founder's newsletter, an analyst's first-hand report |
| T3 — Reputable publication | Edited outlet with a quality bar | established trade publication, a well-known tech/industry magazine, a curated analyst note |
| T4 — Aggregator/explainer | Secondhand synthesis, useful for orientation only | a good overview article, a "map of the field" post, a vendor-neutral comparison roundup |

Prefer **fewer, higher-tier** sources over a long flat list. A key claim backed by two
T1/T2 sources beats one backed by six T4 listicles. For a decision-support report, a
recommendation resting on T4-only evidence must say so in its confidence band.

## Slop tells (down-rank, usually drop) {#slop-tells}

- Title patterns: "Top N best …", "The Ultimate Guide to …", "Everything you need to
  know about …" with no named author.
- Content-farm / SEO domains; pages that are mostly ads with thin body text.
- AI-generated listicles (generic phrasing, no specific claims, no first-hand detail).
- Affiliate-driven "review" pages where the recommendation is the monetization — a
  red flag for an *options-comparison* report especially; never let a vendor's own
  affiliate page be the sole evidence for "option X is best".
- Pages that restate the topic definition without adding an analyst's angle.

A page that *looks* on-topic but, when fetched, carries none of a real expert's
specificity is slop even if reachable — drop it.

## Recency awareness {#recency}

- Tag each source's rough vintage; record an access date (it lands in the report's
  source-quality appendix).
- Fast-moving topics (tooling, models, pricing, market structure): prefer recent
  material; flag anything likely stale; surface a "what changed recently" note when the
  picture has visibly shifted.
- Durable topics (foundational theory, established methods): an evergreen primary source
  outranks a newer rehash — do not penalize a canonical older source for its date.
