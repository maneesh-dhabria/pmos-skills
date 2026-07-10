# Corpus schema — `data/case-studies.json`

The frozen record contract for the bundled case-studies corpus. A single JSON file: a **flat
array of 665 objects** (mirrors `frameworks.json`). Story A (`260710-a2b`) produces this file;
Story B (`260710-vdc`) reads it. This document matches `02_design.html#schema` — the cross-story
coherence contract; keep the two in lockstep.

Fields are imported **1:1 from the source YAML** (`case-studies-scraping/case-studies/<pillar>/*.yaml`)
plus **two derived fields** the viewer/facets need. Nothing is read from the source repo at runtime —
the committed JSON is the single source of truth (INV-2), and every runtime path stays offline +
zero-dependency (INV-1).

## Fields

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | string | YAML | kebab-case, company-prefixed; `==` source filename. **Unique.** Stable card id. |
| `title` | string | YAML | Published title, verbatim. |
| `url` | string | YAML | Verified source link (the link-out target). **Unique.** |
| `company` | string | YAML | Canonical parent company (~136 distinct; free-form-but-canonical). |
| `publisher` | string | YAML | e.g. "Netflix Tech Blog", "KDD 2021". |
| `published` | string | YAML | `YYYY-MM-DD` / `YYYY-MM` / `YYYY` / `unknown` (16 `unknown`). |
| `pillar` | enum(4) | YAML | Closed: `core-pm-craft` / `design-ux` / `platform` / `business-model`. |
| `region` | enum(9) | YAML | Closed set (see `corpus-vocab.mjs :: REGIONS`). |
| `language` | enum(6) | YAML | ISO 639-1 (`en` `ja` `ko` `pt` `vi` `zh`); the `summary` is always English. |
| `topics` | string[] | YAML | 2–5 tags, each ⊆ the 98-tag registry. Primary match axis. |
| `artifact_type` | enum(5) | YAML | `blog_post` / `filing` / `paper` / `talk_writeup` / `handbook`. |
| `summary` | string (md) | YAML | 3–4 sentence curated abstract. |
| `what_they_built` | string (md) | YAML | 1–2 sentences. |
| `evidence` | string (md) | YAML | Outcome / metrics (free text; hard numbers live here). |
| `why_it_matters` | string (md) | YAML | One-sentence PM transfer. |
| `verified_on` | string | YAML | Fetch/verify date. |
| `discovered_via` | string? | YAML | **Optional** provenance (present on 25/665; value `applied-ml`). |
| `year` | string | **derived** | First 4 chars of `published` (the literal `unknown` passes through). Facet + sort key. |
| `quantified` | boolean | **derived** | `true` iff `evidence` contains a digit (~529/665). Facet + "reports hard numbers" filter. |

That is **17 source fields** (`discovered_via` optional) + **2 derived** = 19 keys max per record.

## Derivation rules (owned by `import-corpus.mjs`)

- **`year`** = first 4 chars of `published` when they form a 4-digit year, else `'unknown'` —
  `const y = published.slice(0, 4); year = /^\d{4}$/.test(y) ? y : 'unknown'`. The literal
  `'unknown'`, a missing/blank value, and any non-date string all fold to `'unknown'`, so every
  emitted `year` satisfies the validator gate (`/^\d{4}$/` or `unknown`).
- **`quantified`** = `/\d/.test(evidence)`.

Both are recomputed on every import; the importer is idempotent (stable id sort + atomic
temp-then-rename write).

## Required fields (validator hard-gate)

`validate-corpus.mjs` fails (exit 1) on any record missing a non-empty value for:

```
id, title, url, company, pillar, topics
```

It additionally enforces: `id` uniqueness · `url` uniqueness · every `topics` value ∈ the 98-tag
registry (no danglers) · `pillar` ∈ PILLARS · `region` ∈ REGIONS · `artifact_type` ∈ ARTIFACT_TYPES ·
`language` ∈ LANGUAGES · `topics` length 1..5 · `year` is `/^\d{4}$/` or `unknown` · `quantified`
is boolean.

## Closed-vocabulary pointers

The four closed registries + the language set live in **`scripts/corpus-vocab.mjs`** (`PILLARS`,
`TOPICS`, `REGIONS`, `ARTIFACT_TYPES`, `LANGUAGES`) with per-field `is*` validators and
`danglingTopics()`. That module is substrate-neutral (no skill name referenced) so any consumer of
the corpus can import it. `company` is intentionally **not** a closed vocabulary — it stays
free-form-but-canonical.

## What this corpus does **not** carry

Unlike `/frameworks`, case-study records carry **no owned SVG/diagram** and **no `body_md`** — the
four prose blocks (`summary` / `what_they_built` / `evidence` / `why_it_matters`) compose the reader
body, and reading the original is a link-out (INV-4). No diagram machinery ships with this skill.
