# Chunking + lock zones

## Lock zones (computed in Phase 1)

Record byte ranges that must remain byte-identical after polish:

| Lock zone                                       | Detection rule                                              |
|--------------------------------------------------|-------------------------------------------------------------|
| Fenced code blocks                               | Lines between matching ` ``` ` or `~~~` markers              |
| Inline code                                      | Any backtick span: `` `...` ``                              |
| HTML blocks                                      | Lines starting with `<` that match an HTML element pattern  |
| YAML/TOML frontmatter                            | Top-of-file `---...---` or `+++...+++` blocks                |
| Link URLs                                        | The `(url)` portion of `[text](url)` — text is polishable    |
| Footnote references and definitions              | `[^id]` and `[^id]: ...`                                     |
| Short table cells (<8 words)                     | Cells in markdown tables with word count <8                 |
| Polishable table cells (≥8 words)                | Polished as prose; cell boundaries (`|`) stay locked        |
| Notion non-prose placeholders                    | `<!-- NOTION_BLOCK type=... id=... -->`                     |

**Two consequences:**
1. **Detection skips locked zones** — the rubric never fires inside a lock. No false positives the user can't act on.
2. **Patches that intersect locked zones are rejected** before review (treated as patch failure → retry).

## Format-aware lock zones

The table above is the **markdown** lock-zone set (used for markdown files, URL inputs, Notion inputs, and inline text — URL/Notion HTML is page chrome, not an authored artifact, so it is normalized to markdown). When `doc_format == html` (a local `.html`/`.htm` input — see SKILL.md Phase 1), apply these **additional** HTML lock zones, recorded as byte ranges exactly like the markdown ones. Only text *between* tags (element bodies) is polishable.

| Lock zone (HTML)                          | Detection rule                                                                                  |
|--------------------------------------------|-------------------------------------------------------------------------------------------------|
| Element tags + attributes                  | Every `<tag …>` / `</tag>` — the markup itself, all attribute names and values                  |
| `<script>` / `<style>` contents            | Everything between the open and close tag, and the tags                                          |
| `<pre>` / `<code>` contents                | Same as fenced code blocks — locked                                                              |
| HTML comments                              | `<!-- … -->` spans (this also covers `<!-- POLISH: … -->` defer markers — they stay put)         |
| `<!DOCTYPE>` + `<head>…</head>`            | The whole region — titles/meta are not prose to polish                                           |
| `<a href>` / `<img src>` etc.              | Covered by "tags + attributes" — the link *text* (element body) is still polishable              |
| Short table cells (<8 words)               | `<td>`/`<th>` bodies under 8 words — same rule as markdown                                        |

For HTML, "polishable words" = total words − words inside locked zones, computed identically; this is the visible prose text of body elements. The rubric and all patches operate on extracted prose text either way — no rubric check is markdown- or HTML-specific.

## Polishable words — definition

**Polishable words = total words − words inside locked zones.**

This is the count that drives every size and chunking decision. Compute it after lock zones are detected (Phase 1) and before size bucketing. Total word count is misleading for table-heavy docs (PRDs, strategic memos): a 16,000-word doc dominated by tables may have only ~3,000 polishable words and should be treated as a single-chunk run.

The `low_confidence: true` voice-sampling flag triggers at <200 **polishable** words, not total.

## Size buckets (Phase 1)

Measured on **polishable prose only** — lock-zone bytes are excluded from the word count.

| Polishable words | Behavior                                                                    |
|-------------------|-----------------------------------------------------------------------------|
| < 4,000           | No chunking — process whole doc as one unit                                |
| 4,000 – 25,000    | Chunked patch generation; global checks always run on whole doc            |
| > 25,000          | Refuse with: *"Doc too large for a single polish run. Split into sections and polish individually, or use `--dry-run` for a rubric report only."* |

**Iteration depth is uniform across all sizes.** A small dense doc gets the same 2-iteration convergence loop (the Phase 7 cap) as a large doc. Size only governs chunking.

## Chunking algorithm

When polishable words ≥ 4,000:

1. **Primary chunk boundary = H1/H2 headings.** Walk the doc top-to-bottom, start a new chunk at each H1 or H2. When `doc_format == html`, the boundary is an `<h1>` or `<h2>` open tag (the HTML analogue).
2. **Never split mid-paragraph or mid-list.** A chunk boundary must land on a blank line OR a heading (for HTML: immediately before an `<h1>`/`<h2>` open tag).
3. **Oversized sections (>4,000 words):** if a single H2 section exceeds 4,000 words, split it on H3 boundaries (`<h3>` for HTML). If it still exceeds, split on paragraph (`<p>` for HTML) boundaries with a **200-word read-only overlap** between adjacent chunks. Overlap is context only — do NOT re-patch overlap regions.
4. **Voice markers are sampled ONCE from the whole doc** (Phase 1) and shared across all chunks. No per-chunk re-sampling.
5. **Local checks** (1, 5, 6a, 6b, 8, 9, 10, 13) run per-chunk and may run in parallel.
6. **Global checks** (2, 3, 4, 7, 11, 12, 14) ALWAYS run on the whole doc — never per-chunk — because they need full-doc context (lede, header structure, density-per-N-words).
7. **Patch generation** is per-chunk; patches from different chunks never overlap by construction.
8. **Stitch-back** (Phase 8): reassemble chunks in original order. Verify chunk boundary lines are byte-identical to the original. For HTML, additionally verify that *all* non-prose bytes (the whole markup skeleton + locked-zone contents) are byte-identical — if not, keep the output but surface the best-effort-HTML warning (see `reference/editorial-pass.md` §6). For markdown, if a boundary line was modified, fail the run with a clear error rather than corrupt the doc.

> **Editorial pass + chunking ordering.** When the [editorial reduction pass](editorial-pass.md) runs on a doc with ≥ 4,000 polishable words, it chunks and reduces *first*; the resulting reduced doc is then re-measured against the size buckets above for the rubric / patch phase (it may now be small enough to skip chunking). Voice markers are still sampled once, from the original doc, in Phase 1.

## Budget formula (with chunking)

```
calls = chunks × per_chunk_local_calls
      + global_check_count
      + (×2 if iteration 2 triggers)
```

For sub-4,000-word docs, `chunks = 1` (the trivial case).

## Final-Write sizing (Phase 8)

Chunked **patch generation** is one concern; the **final Write** of the polished file is another. Use this table to decide whether to write the polished file in one shot or to stitch via multiple Edits per H1:

| Polishable words | Expected patches | Final-Write strategy                                              |
|-------------------|------------------|-------------------------------------------------------------------|
| < 4,000           | ~5–20            | Single `Write` of the whole polished doc                          |
| 4,000 – 10,000    | ~20–50           | Single `Write` is fine; chunked-rubric still applies              |
| 10,000 – 25,000   | ~50–150          | **MUST** chunk the Write — emit one `Write` of the new file then per-H1 `Edit` calls, OR assemble in memory and `Write` once if the agent can hold the full polished doc reliably |

The 10k+ rule exists because a single Write of a 60k-character file with 80+ inline edits is where agents tend to drop fixes silently. Per-H1 chunking gives the user a visible patch log.

## Hard ceiling

If polishable prose exceeds 25,000 words, refuse with the message above. Do not attempt to polish — the cost and runtime become unbounded, and the user is better served by manual sectioning.
