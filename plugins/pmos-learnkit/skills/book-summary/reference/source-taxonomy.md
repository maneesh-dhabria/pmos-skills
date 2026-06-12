# Source taxonomy — trust tiers, anti-slop gate, AV text-proxy rule

## Contents

- [Trust tiers](#trust-tiers) — T1 / T2 / T3
- [Anti-slop hard gate](#anti-slop-hard-gate) — pre-fetch attributability
- [Grounding rule](#grounding-rule) — what a takeaway may rest on
- [AV text-proxy rule](#av-text-proxy-rule) — podcasts & YouTube
- [Channels to search](#channels-to-search)

`/book-summary` reuses the shared anti-slop rubric in `_shared/topic-research/source-tiers.md` (the hard gate + tier-ranking philosophy + slop tells). This file states only the **book-specific deltas** — the unit is a *book*, not a topic, so a source's tier turns on its relationship to the book's author.

## Trust tiers

The shared `source-tiers.md` ranks sources by attribution strength generically. For a book, map that onto three named tiers keyed to the canonical author identity (from SKILL.md Phase 2):

| Tier | What it is | Trust |
|---|---|---|
| **T1 — primary** | The author's own words about the book: author interviews (text or transcribed-and-published), author talks/keynotes with a transcript, author essays/posts, the official book site, the publisher's summary, the author's own threads. | Highest. A takeaway should rest on T1 wherever the idea is the author's framing. |
| **T2 — reputable secondary** | Established outlets' reviews/summaries, recognized practitioners' book-notes, academic or industry analyses that characterize or critique the book. | Trusted to characterize and critique. |
| **T3 — corroborating social** | LinkedIn posts, Twitter/X threads, YouTube creator summaries, Blinkist/Goodreads-style digests. | Surfaces angles and corroborates — **never** the sole evidence for a takeaway. |

An author podcast interview with a published transcript is **T1**; a YouTube creator's summary video is **T3** (see the AV rule below).

## Anti-slop hard gate

Applied **pre-fetch**, exactly as in `_shared/topic-research/source-tiers.md` § "The hard gate". A candidate must be **attributable** (named author OR recognized publication/channel) AND **plausibly real** (sane metadata) before it is fetched. Book delta: "attributable" includes the publisher and the book's author themselves. Failures are discarded on metadata, **never fetched**.

## Grounding rule

This is the maintainer's D2 decision made mechanical: **every shipped takeaway is grounded in ≥1 fetched T1 or T2 source.** A would-be takeaway supported only by T3 social material is either:

- **flagged** — shipped with an explicit "social-sourced, unverified against the author" label, or
- **dropped** —

never silently shipped as if author-confirmed. The reviewer pass (`reference/eval-rubric.md`) enforces this.

## AV text-proxy rule

Decision D6: the skill runs WebSearch/WebFetch and **cannot transcribe audio**. Podcasts and YouTube therefore enter **only as text proxies**:

- Read **show notes, published episode transcripts, and YouTube captions/descriptions** — and written articles *about* the appearance.
- **Never** treat raw audio/video as a source.
- An AV item with **no usable public text** is **skipped and logged** in the `*.sources.json` ledger (`verification: "skipped — no usable text"`) — never guessed at from the title.

(A future story could integrate `/magazine`'s whisper worker; out of scope here.)

## Channels to search

Phase 3 fans out across these channels, scaled by `--depth` (see `reference/audience-presets.md` for the depth dial):

- **Author-primary** (→ T1): author interviews, talks, essays, official site, publisher page, author's threads.
- **Reputable-secondary** (→ T2): outlet reviews, practitioner book-notes, academic/industry analyses.
- **Corroborating-social** (→ T3): LinkedIn, Twitter/X, YouTube creator summaries, digest sites.

Rank candidates by tier + relevance from metadata **before** fetching; fetch only the top survivors per channel (the verification-first contract lives in `_shared/topic-research/sourcing-ladder.md` § "The verification pass-bar").
