# Summary pipeline — grounded hybrid extract-then-generate

The faithfulness contract of `/summary-tldr`. Phase 4 (Summarize) cites this file. The pipeline is **extract-then-generate**: pull a keyfact list out of the source first, then write a summary whose only job is to cover and assert those keyfacts. Grounding is achieved by construction, not by post-hoc hope.

## Table of Contents

- The pipeline (ordered steps)
- Map-reduce chunking
- Grounding invariants (I1/I2)
- Model tier for chunk-summarize
- Worked examples
- Hand-off

## The pipeline (ordered steps)

Run these in order. Step 2 is conditional on source length.

1. **Preprocess to clean text.** Transcribe audio/video, OCR-read scanned pages, dedup quoted email threads, stitch tweet threads into linear text. This is **not** done here — it is owned by the input dispatcher (see `reference/input-dispatcher.md`), which normalizes whatever the user handed in into one clean text body before this pipeline sees it. Phase 4 assumes clean text on entry.

2. **Chunk if long (map-reduce).** If the clean text is too large for one focused pass, segment it, summarize each segment independently, then synthesize the segment summaries into one. See "Map-reduce chunking" below for the trigger and mechanics. Short sources skip this step and go straight to a single extract+generate pass.

3. **Extract a keyfact list.** Walk the source (or, for long sources, the synthesized segment summaries) and pull out the concrete load-bearing content: claims, numbers/statistics, named conclusions, and named entities (people, products, orgs, dates). This list is **grounding-by-construction** — it is the contract the generated summary must cover, and the exact checklist the Phase 5 review pass scores the summary against. Capture the source's own phrasing of its thesis here.

4. **Generate the summary.** Write prose that **covers and asserts** every keyfact at the chosen compression band and style. Each keyfact should be traceable to a sentence (or part of one) in the output. State the source's claims directly — do not narrate that the source makes them.

5. **Hand off.** Pass the summary plus the keyfact list to the Phase 5 review pass, which checks coverage (no dropped keyfact) and faithfulness (no meta-description, no invented claim), and runs the inlined writing checks. Failures route back to step 4 for a targeted rewrite.

## Map-reduce chunking

Single-pass summarization of a long source suffers from **positional bias** — the well-documented "lost in the middle" effect where facts in the middle of a long context get under-weighted or dropped while the head and tail dominate. Map-reduce defeats this: every segment gets its own focused pass, so a fact buried at 60% depth gets the same attention as one in the opening paragraph.

**Trigger.** Chunk when the source exceeds what fits comfortably in one focused pass — on the order of **a few thousand words**. Below that, a single extract+generate pass covers the whole source without positional loss, so don't pay the chunking tax. Above it, chunk.

**Mechanics:**

- **Segment (map).** Split on natural boundaries — sections, speakers, chapters, post boundaries — not blind byte counts, so each segment is self-coherent.
- **Summarize each segment (map).** Summarize segments independently. These are dispatched to subagents (see model tier below); independent segments run in parallel.
- **Synthesize (reduce).** Combine the segment summaries into one body, de-duplicating overlapping facts and reconciling any tension between segments. The keyfact extraction in step 3 then runs over this synthesized body (plus the segment summaries as backstop) so no segment's facts are silently lost in the reduce.

Never collapse a long source into a single pass to "save a step" — that reintroduces exactly the coverage gap chunking exists to prevent.

## Grounding invariants (I1/I2)

These are the skill's central constraint. The review pass enforces them as hard gates.

**I1 — Assert, don't describe.** The summary conveys the source's **actual** claims, numbers, and conclusions, stated directly. Meta-description — "This article discusses X", "the document explains Y", "the author talks about Z", "the post covers the topic of W" — is a **HARD FAIL**. It tells the reader a conversation happened without transferring any of its content. Every such sentence must be rewritten to the underlying claim.

**I2 — No claim absent from the source.** Every sentence in the summary traces to source content **fetched or extracted this run**. Nothing comes from model memory, prior knowledge, or plausible-sounding inference. If a fact is not in the keyfact list extracted from this source, it does not belong in the summary.

Supporting rules:

- **Preserve exact numbers, named entities, and named conclusions** verbatim. "40%" stays "40%", not "a large fraction". A named framework, person, or product keeps its name.
- **Prefer the source's own framing of its thesis.** When the source states its main point in its own words, mirror that framing rather than substituting a paraphrase that drifts.
- **Long sources: chunk-and-synthesize, never single-pass** — restating step 2 as an invariant, because skipping it silently violates I2-adjacent coverage.

## Model tier for chunk-summarize

Per `skill-patterns.md` §L (subagent dispatch & model selection): the map-reduce chunk-summarize subagent runs with **`model: sonnet`**. Summarizing one bounded, already-segmented chunk against an explicit instruction — with the parent reduce/extract steps validating coverage downstream — is bounded, parent-validated work, **not** a frontier-judgment role. Sonnet is the correct tier; do not escalate to a frontier model for per-chunk work, and do not drop to haiku, which lacks the comprehension headroom for dense source material. State the tier explicitly in the dispatch.

## Worked examples

Each pair shows a meta-description sentence (I1 violation) and its grounded rewrite that asserts the source's actual content.

✗ "This article discusses the trade-offs of remote work."
✓ "Remote work cut the company's office costs 40% but lengthened average code-review turnaround from 4 to 11 hours."

✗ "The author talks about why the migration was risky."
✓ "The Postgres-to-DynamoDB migration broke three reporting queries and was rolled back after 6 days."

✗ "The document explains the team's hiring plan for next year."
✓ "The team plans to hire 12 engineers in 2026, front-loading 8 into Q1 to staff the payments rewrite."

In each case the rewrite preserves the exact numbers and named entities (I2), states the claim directly (I1), and would survive the Phase 5 review because every fact traces to the keyfact list.

## Hand-off

The completed summary and its keyfact list flow to Phase 5 (review). A summary that drops a keyfact fails coverage; a sentence that meta-describes or asserts an unsourced claim fails faithfulness. Both route back here to step 4 for a bounded rewrite, then re-review.
