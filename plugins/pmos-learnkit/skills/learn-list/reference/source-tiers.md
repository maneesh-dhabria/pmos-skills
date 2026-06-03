# source-tiers.md — the anti-slop rubric

This is the differentiator vs. plain search. A reading list is only worth more than
a Google query if it filters slop the way a knowledgeable practitioner would. The
model cannot "feel" quality reliably, so quality is enforced with explicit, checkable
rules — not vibes.

## Contents

- The hard gate (every emitted link must pass)
- Tier ranking (orders survivors within a topic)
- Slop tells (down-rank or drop)
- Recency awareness
- Per-format reputation notes

## The hard gate

A candidate link is **dropped outright** unless it clears BOTH:

1. **Attributable** — it has a **named author** OR is published by a recognized
   publication / practitioner / institution. Anonymous content-farm posts fail.
   (A named org account for a known company counts; "Top 10 Best …" with no byline
   does not.)
2. **Real & reachable** — passes the verification pass-bar in `sourcing-ladder.md`
   (reachable, identity-matches, annotation grounded). An unreachable or
   mismatched link never ships, regardless of how authoritative it looks.

The hard gate is binary. Tier ranking only orders the links that already cleared it.

## Tier ranking

Within a topic, order surviving links by tier (higher first), breaking ties by
recency and specificity:

| Tier | What | Examples |
|---|---|---|
| T1 — Primary | The thing itself, by the person who made/discovered it | original paper, the practitioner's own essay, official docs, a maintainer's talk |
| T2 — Practitioner | A working expert explaining from direct experience | a respected engineer's blog, a founder's newsletter, a researcher's thread |
| T3 — Reputable publication | Edited outlet with a quality bar | established trade publication, a well-known tech magazine, a curated newsletter issue |
| T4 — Aggregator/explainer | Secondhand synthesis, still useful for orientation | a good overview article, a syllabus entry, a "map of the field" post |

Prefer **fewer, higher-tier** links over a long flat list. A topic with two T1/T2
links beats one with six T4 links.

## Slop tells (down-rank, usually drop)

- Title patterns: "Top N best …", "The Ultimate Guide to …", "Everything you need to
  know about …" with no named author.
- Content-farm / SEO domains; pages that are mostly ads with thin body text.
- AI-generated listicles (generic phrasing, no specific claims, no first-hand detail,
  citation-free).
- Affiliate-driven "review" pages where the recommendation is the monetization.
- Pages that restate the topic definition without adding a practitioner's angle.

A page that *looks* on-topic but, when fetched, carries none of a real expert's
specificity is slop even if it's reachable — drop it.

## Recency awareness

- Tag each link's rough vintage when known.
- For fast-moving topics (tooling, models, frameworks), prefer recent material and
  flag anything likely stale; surface a "what changed recently" note when the canon
  has visibly shifted.
- For durable topics (foundational theory, classic essays), evergreen primary sources
  outrank a newer rehash — do not penalize a canonical 2008 essay for its date.

## Per-format reputation notes

- **Books** → prefer the canonical text; source a *summary* link separately (see
  `sourcing-ladder.md`), don't pretend the book itself is a quick read.
- **X / tweets** → only threads/posts from a named practitioner with standing on the
  topic; never an anonymous viral take.
- **LinkedIn** → practitioner posts only; skip engagement-bait.
- **YouTube / podcasts** → talks/interviews featuring a T1/T2 source; skip reaction
  and summary channels.
- **Newsletters** → the issue or the subscribe page of a practitioner-run newsletter,
  not a directory listing.
