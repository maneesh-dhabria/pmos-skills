# Corpus expansion — refresh or grow the bundled snapshot

The 665-record corpus ships pre-built at `data/case-studies.json` (the single source of truth,
INV-2). Runtime is fully offline over it; nothing reads the source repo at runtime. This doc is the
**authoring session** playbook — how to refresh the snapshot from source, hand-add a one-off study,
and pass the validator gate before the change ships. See `corpus-schema.md` for the field contract
and `matching.md` for how the corpus is ranked.

## Path A — re-run the importer (refresh / bulk grow)

The corpus is imported **1:1 from the source YAML** (`case-studies-scraping/case-studies/<pillar>/*.yaml`)
by `scripts/import-corpus.mjs`. To refresh after the source repo changes, or to bulk-import a grown
source set:

```
node scripts/import-corpus.mjs --src <path-to-case-studies-scraping> --out data/case-studies.json
```

- Reads every `*.yaml` under `--src` recursively; imports the 17 source fields verbatim and derives
  the two computed fields (`year`, `quantified` — rules in `corpus-schema.md`).
- **Idempotent**: stable id-sort + atomic temp-then-rename write. Re-running on an unchanged source
  produces a byte-identical file (zero drift) — the safe way to prove a no-op.
- Zero-dep Node ESM; a `--selftest` mode exercises the derivation rules on fixtures.

Then **always** re-validate (Path C) before committing.

## Path B — hand-add a single study (one-off)

For a one-off addition without re-running the whole import, append a record to
`data/case-studies.json` by hand, following `corpus-schema.md` exactly:

1. **Required, non-empty:** `id` (kebab-case, company-prefixed, `==` a notional source filename,
   **unique**), `title`, `url` (**unique**, the verified source link), `company`, `pillar` (∈ the 4
   PILLARS), `topics` (1–5 tags, **each ∈ the 98-tag registry** in `corpus-vocab.mjs`).
2. **Recommended prose (markdown):** `summary` (3–4 sentence curated abstract), `what_they_built`
   (1–2 sentences), `evidence` (outcomes/metrics — put any hard numbers here), `why_it_matters`
   (one-sentence PM transfer). These four compose the reader body; a study with thin prose reads
   poorly even if it validates.
3. **Closed-vocab fields:** `region` ∈ REGIONS, `artifact_type` ∈ ARTIFACT_TYPES, `language` ∈
   LANGUAGES, `published` (`YYYY-MM-DD` / `YYYY-MM` / `YYYY` / `unknown`), `publisher`, `verified_on`.
4. **Derived fields** — set `year` and `quantified` to match the derivation rules (or, cleaner,
   re-run the importer which recomputes them). `year` = 4-digit prefix of `published` or `unknown`;
   `quantified` = `true` iff `evidence` contains a digit.

Ground every field in the primary source — **never fabricate** an abstract, an outcome, or a URL.

## Path C — the validator gate (mandatory before ship)

Every corpus change MUST pass:

```
node scripts/validate-corpus.mjs --corpus data/case-studies.json
```

`validate-corpus.mjs` (exit 1 on any failure) enforces:

- **Required fields** present + non-empty: `id, title, url, company, pillar, topics`.
- `id` uniqueness · `url` uniqueness.
- Every `topics` value ∈ the 98-tag registry (no danglers) · `topics` length 1–5.
- `pillar` ∈ PILLARS · `region` ∈ REGIONS · `artifact_type` ∈ ARTIFACT_TYPES · `language` ∈ LANGUAGES.
- `year` matches `/^\d{4}$/` or is `unknown` · `quantified` is a boolean.

`node scripts/validate-corpus.mjs --selftest` runs the in-file green + broken fixtures (proves the
gate flags dangling topics, duplicate ids, bad pillar, non-boolean `quantified`, and bad `year`).

## Definition of done (a corpus change is shippable when)

1. `validate-corpus.mjs --corpus data/case-studies.json` exits 0.
2. `build-library.mjs --selftest` passes (the viewer still emits a self-contained offline page,
   count == corpus length).
3. `match.mjs --selftest` passes (ranking + `--json` contract intact).
4. A spot-check retrieve (`match.mjs --query "<a topic you added>"`) surfaces the new record.

The closed registries live in `scripts/corpus-vocab.mjs` (`PILLARS`, `TOPICS`, `REGIONS`,
`ARTIFACT_TYPES`, `LANGUAGES` + `is*` validators and `danglingTopics()`) — extend a registry there
first if a genuinely new topic/region is needed, and keep `corpus-schema.md` in lockstep.
