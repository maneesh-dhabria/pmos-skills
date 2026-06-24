# Wiki sidecar / data-model schema (the engine contract)

Frozen here per `docs/pmos/features/2026-06-24_wiki/02_design.html#data-model` (§4) and `#decisions`
(D6). **This file is the single home** for the per-document record shape: Story A's helper scripts
(`scripts/*.mjs`) write it, Story B's skill verbs read it, and the bundled viewer
(`reference/wiki-viewer.html`) renders it. Story B (`260624-rmq`) **cites this file** — it never
re-declares the field set (skill-patterns.md §K, one-fact-one-home).

## Two layers (the spine)

Only the first layer is durable ground truth (D6):

| Layer | Path | Role |
|---|---|---|
| **Document** | `sources/<src>/<id>` (verbatim mirror) + `index/<src>/<id>` (this sidecar) | the skim/browse + resume unit; the only stored ground truth |
| **Understanding** | `derived/` (topic pages, primer, glossary, entity index) | regenerable, cited, never hand-edited; re-derived on change |

Freshness is **re-derive**, not re-sync two stores — nothing in `derived/` is separately authored, so
it can never drift from the documents.

## The sidecar record

One JSON object per document. **Deterministic fields land at ingest** (computed free, so an
interrupted run still yields a greppable wiki). **Enriched fields are filled by the queued LLM pass
and are individually nullable** — a half-enriched doc (all enriched fields `null`) is **valid**.

### Deterministic fields (always present after ingest)

| Field | Type | Notes |
|---|---|---|
| `src` | string | source-platform id (`notion`, `gdocs`, `github`, `figma`, …) |
| `id` | string | stable document id within `src` |
| `source_hash` | string | normalized content hash (`scripts/hash.mjs`) — strips fetch timestamp, sorts frontmatter, collapses whitespace |
| `created` | string\|null | ISO-8601 creation time from the source |
| `last_edited` | string\|null | ISO-8601 last-edit time; **may be null** → drift degrades to hash-only (D10) |
| `length_tier` | `"short"`\|`"medium"`\|`"long"` | substance signal (also feeds the thin-doc `exclude` heuristic) |
| `ancestor_path` | string[] | source-platform nesting (hub → sub-hub → doc); a classification + crawl-candidate signal |
| `original_title` | string | the title verbatim from the source |
| `section_offsets` | object[] | `{heading, level, offset}` per H1/H2 — the skim/section-summary + citation-anchor backbone |

### Enriched fields (nullable — filled by the queued enrichment pass)

| Field | Type | Notes |
|---|---|---|
| `summary` | string\|null | document abstract (skim mode) |
| `section_summaries` | object[]\|null | `{heading, level, summary}` per H1/H2 |
| `glossary_terms` | object[]\|null | `{term, definition}` promoted into the glossary section |
| `external_links` | object[]\|null | `{label, url}` — Figma / Sheets / Docs links extracted from the body |
| `llm_title` | string\|null | LLM-generated title; the viewer toggles it against `original_title` |
| `workstream` | string\|null | inferred workstream tag (D7), user-correctable |
| `workstream_confidence` | number\|null | 0.0–1.0 confidence for `workstream` |
| `exclude` | object\|null | non-null ⇒ hidden by default; shape `{reason: string}` (D-thin-doc / "mark irrelevant"). `null` ⇒ shown |
| `citation_anchors` | object[]\|null | `{anchor, doc_id}` — heading-path anchors this doc's enriched text cites |

`exclude` truthiness rule (viewer + scripts agree): a doc is excluded iff `exclude != null`. The
reason travels with the flag so the viewer can show "hidden — `<reason>`, restore?".

## The corpus JSON (what the viewer renders)

The bundled viewer reads **one embedded corpus object** — sidecars joined with their verbatim body so
both skim (summary) and full (body) render offline:

```jsonc
{
  "generated": "<ISO-8601>",          // when the corpus was emitted
  "config":   { "workstreams": [], "exclude_patterns": [] },   // optional, from substrate config
  "vocab":    [ "<tag>", … ],          // optional controlled vocabulary
  "docs": [
    {
      …all sidecar fields above…,
      "body_md": "<verbatim markdown mirror>",   // the DOCUMENT layer body, rendered in full mode
      "comments": [ … ]                          // optional inline-comment threads (persist in the HTML)
    }
  ]
}
```

`tests/fixtures/corpus.sample.json` is the canonical example: ≥1 fully-enriched doc and ≥1
half-enriched doc (enriched fields `null`).

## Two-factor drift (D10)

`scripts/hash.mjs :: driftVerdict(prev, fresh)`:

1. Both `prev.last_edited` and `fresh.last_edited` present → **two-factor**: `last_edited` is the cheap
   pre-filter. Equal ⇒ not drifted (no hash needed). Changed ⇒ confirm with the normalized hash (a
   touched-but-reverted edit is *not* drift).
2. Either `last_edited` absent → **hash-only**: compare `source_hash` against the fresh normalized hash.

## Resumable ingest (D9)

`scripts/queue.mjs` is smallest-first, checkpointed after each doc; a rate-limit halt exits clean and
resumable with no duplicate processing. The verbatim mirror + deterministic sidecar are written
**before** any LLM work, so an interruption never loses a fetched document.
