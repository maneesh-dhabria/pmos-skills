# sourcing-ladder.md — finding & verifying content per format

How to turn a topic into real, verified links across formats. The governing rule:
**rank first, then verify only the survivors** (verification spend scales with output,
not with the candidate pool), and **never emit a URL you have not fetched this run.**

## Contents

- The verification pass-bar (what "verified" means)
- Rank-then-verify loop
- Curation-of-curations harvest
- Per-format sourcing
- The free-fetch ladder (X / LinkedIn / paywalled)
- Book summaries
- Signature writings (no fabricated citation counts)
- Paywalled sources

## The verification pass-bar

A link counts as **verified** — and may be emitted — only if all three hold after an
actual fetch this run:

1. **Reachable** — resolves to real content; not a 404, parking page, or hard
   login-wall with no free alternative.
2. **Identity match** — the fetched page is the content you named: title/author line
   up with what the annotation claims. A redirect to an unrelated page fails.
3. **Annotation grounded** — the ≤2-sentence "why included" is supported by what the
   page actually says. If you cannot ground the annotation in the fetched text, drop
   the link rather than guess. This is the anti-hallucination teeth.

Failing any of the three → drop the link. Dropping is always preferable to emitting a
plausible-but-unverified link.

## Rank-then-verify loop (per topic, Phase 4)

1. **Gather candidates** from live web search (and the harvested curations) — cap the
   pool at ~3× the links-to-emit for the mode.
2. **Apply the hard gate** from `source-tiers.md` (attributable + plausibly real);
   discard failures cheaply, on metadata, before any fetch.
3. **Tier-rank** the survivors; take the top-N for the mode.
4. **Fetch-verify** only those top-N against the pass-bar above. For each that fails,
   pull up the next-ranked candidate and verify it. Stop at N verified links (or fewer
   if the topic is genuinely thin — honest under-coverage beats padding).
5. **Annotate** each survivor from the fetched content (≤2 sentences, ~≤240 chars).

## Curation-of-curations harvest (Phase 2)

Before deriving the outline, search for material other curators already built:
"best <topic> resources / reading list / syllabus", "awesome-<topic>", "<topic> from
first principles", practitioner "what to read" posts. Harvest 2–4, extract their
recurring entries, and **dedupe** — an item that recurs across independent curations is
a strong signal. These both seed the outline and pre-stock candidate links (still
subject to the pass-bar).

## Per-format sourcing

- **Articles / essays** → search the practitioner + topic; prefer their own domain.
- **Newsletters** → find the practitioner-run newsletter; link the relevant issue or
  the subscribe page.
- **Books** → name the canonical text; source a *summary* separately (below).
- **X / threads** → named practitioners only; use the free-fetch ladder to read them.
- **LinkedIn** → practitioner posts; free-fetch ladder for member-only content.
- **Podcasts / YouTube** → episodes/talks featuring a T1/T2 source.

## The free-fetch ladder (X / LinkedIn / paywalled-ish)

To read social/JS-heavy content with `WebFetch` (no login), try in order and stop at
the first that returns the real content:

1. The canonical URL directly.
2. A reader/unroll mirror — e.g. an `r.jina.ai/<url>` reader proxy, a thread-unroll
   service, or the publication's AMP/print view.
3. A cache/snapshot (search cache, web archive snapshot).

If none of the rungs yield readable, identity-matching content, **drop the candidate**
rather than emit an unverified social link. (This mirrors `/primer`'s social-sourcing
approach; if a Playwright/browser tool is available it can serve as a last rung, but it
is never required.)

## Book summaries

**Every emitted book that is not free carries a summary reference — wherever it appears**
(reading-list-by-topic, adjacent rabbit holes, *and* the follow-list), not just the
follow-list. This is the book-equivalent of the paywalled-source rule below: a paid book
*is* a paywall, so the user gets a way to skim the high-level ideas without buying it.
Attach the summary inline next to the book, the same shape as a paywalled source's
free-alternative line.

For each such book, source the **most authoritative** *summary* available and verify it
against the pass-bar like any link — in rough priority order: the author's own précis or
talk → a reputable long-form review or chapter-level breakdown by a named practitioner →
a well-known summary-site entry. "Most authoritative" means closest to the author and the
canonical framing, not merely the first summary search returns.

Exemptions and the honest escape:
- A genuinely **free** book (full text legitimately readable online) needs no summary
  reference — link the book itself.
- A cheap book is still not free: attach a summary if a good one exists.
- Never invent a summary. If no quality summary exists, emit the book with an explicit
  "no good summary found — read the book" note (e.g. *The Mom Test*, ~$15). Saying so is
  the honest outcome, not a missing reference.

## Signature writings (no fabricated citation counts)

There is no citation-graph API. Do **not** invent "most-cited" metrics. Instead surface
each practitioner's **signature writing(s)** on the topic — the piece that search
ranking and the harvested curations consistently surface as the one to read. Label it
"signature / most-referenced," grounded in that observed consensus, not a number.

## Paywalled sources

Include a paywalled canonical source with a `paywalled` tag **and** surface a free
alternative when one exists — the author's blog version, a conference talk, an
ungated summary, or a preprint. If no free alternative exists, keep the tagged
paywalled entry (its existence is still useful signal) but say a free version wasn't
found.
