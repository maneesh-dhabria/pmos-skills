# Enrichment authoring contract — the anti-slop bar (D6 understanding layer)

The **one home** for *how* the queued LLM pass fills the nullable enriched sidecar fields. Cited from
`SKILL.md` (`#add`, `#sync`, `#curate`); never restated there. The **field set, types, and nullability**
live in `sidecar-schema.md` — this file is the **authoring quality bar** for the values that go into
them, not a second declaration of the shape (skill-patterns.md §K).

The enriched fields are the *understanding layer* (D6): derived, re-derivable, cited, never hand-edited.
They are what makes the wiki worth more than the raw mirror. Slop here — generic abstracts, restated
headings, padded glossaries — makes the whole wiki untrustworthy, so the bar is **specific or absent**:
a `null` field is always better than a filler one.

## The fields, and the bar for each

Per `sidecar-schema.md` § "Enriched fields". Each is independently nullable — fill only what you can
fill *well*; leave the rest `null` (a half-enriched doc is valid and greppable).

| Field | Author it to be… | Slop to reject |
|---|---|---|
| `summary` | what *this* document decides / contains that a sibling does not — the 2–4 sentences a reader needs to skip the full read | "This document covers X." restating the title; boilerplate that fits any doc |
| `section_summaries[].summary` | the section's *specific* claim/output, one per H1/H2 heading present | echoing the heading back as a sentence; "This section discusses…" |
| `glossary_terms[]` | terms a *new teammate* wouldn't know — project/domain jargon with a definition grounded in how the doc uses it | dictionary words; terms defined nowhere in the body; padding to hit a count |
| `external_links[]` | the Figma / Sheets / Docs / ticket refs actually present in the body (via `extract-links`, `mcp-protocol.md`) | invented URLs; links not in the source |
| `llm_title` | a precise descriptive title when `original_title` is vague (`"Untitled"`, `"Doc 3"`); else leave `null` so the viewer keeps the original | rephrasing an already-good title for its own sake |
| `workstream` + `workstream_confidence` | the inferred bucket **only when evidence supports it** — see `#workstream-inference` in SKILL.md (hub provenance + tag overlap); low confidence → leave `null` (viewer shows *uncategorized*, never a wrong bucket) | forcing every doc into a bucket; high confidence with thin evidence |
| `citation_anchors[]` | the heading-path anchors (`<doc_id>#<block_id|slug>`) this doc's enriched text actually references | anchors to sections that don't exist |

## Grounding rules (non-negotiable)

1. **Ground every value in the verbatim body** — the mirror under `sources/<src>/<id>` is the source of
   truth. Never enrich from the title or the URL alone.
2. **`null` over filler.** If a specific value isn't supported by the body, the field stays `null`. The
   queue (`scripts/queue.mjs`) treats a doc as done once its deterministic fields are written; enrichment
   is best-effort on top, so skipping a field never blocks the run.
3. **Re-derivation, not re-authoring** (D6 / `sidecar-schema.md` § "Two layers"). When a document drifts
   (`driftVerdict` → `drifted`, `hash.mjs`), the enriched fields for that doc are **recomputed from the
   fresh body**, never hand-patched. `derived/` (topic pages, primer, glossary, entity index) is rebuilt
   from the current sidecars — it cannot drift because nothing in it is separately authored.
4. **Incremental** (`SKILL.md#sync`, §7): only drifted documents are re-enriched; unchanged docs keep
   their sidecars untouched, so `sync` cost scales with what changed, not corpus size.

## Why sidecar-only, not the body (the retrieval tie-in)

`scripts/retrieval.mjs :: buildIndex` indexes **these enriched fields plus the titles — never `body_md`**
(see its header comment). That is deliberate: Q&A (`SKILL.md#ask`) ranks over distilled *meaning*, so a
weak summary doesn't just look bad in the viewer — it degrades retrieval. The anti-slop bar here is what
keeps `ask` grounded and its citations trustworthy.
