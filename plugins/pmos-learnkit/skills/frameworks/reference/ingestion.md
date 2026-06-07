# Ingestion pipeline — `/frameworks sync`

Two stages: deterministic **Stage-A scripts** (zero-dep Node) and in-session
**Stage-B agent** steps (Notion fetch, LLM field derivation, `/diagram`). The output
is `data/frameworks.json`, `data/diagrams/*.svg`, and a rebuilt `index.html`. A failed
sync never disturbs the shipped corpus.

## Contents

- [Pipeline steps](#pipeline-steps)
- [Notion structure](#notion-structure)
- [The split contract](#the-split-contract)
- [The match-field derivation contract](#the-match-field-derivation-contract)
- [The /diagram batch contract](#the-diagram-batch-contract)
- [Assemble + validate](#assemble--validate)
- [Failure handling](#failure-handling)

## Pipeline steps

1. **Fetch (Stage-B, MCP)** — for each of the 22 category pages, `notion-fetch` →
   raw enhanced-markdown. Large pages exceed the tool token cap → save to a temp file
   and slice; never inline a 100k-char page.
2. **Split (Stage-A, `split-corpus.mjs`)** — each category markdown → per-framework
   raw records. See [the split contract](#the-split-contract).
3. **Derive match-fields (Stage-B LLM + `derive-fields.mjs`)** — per framework emit the
   cached fields; validate + merge. See [the derivation contract](#the-match-field-derivation-contract).
4. **Diagrams (Stage-B, `/diagram` batch)** — one owned SVG per framework at full
   rigor. See [the /diagram batch contract](#the-diagram-batch-contract).
5. **Assemble + validate (Stage-A)** — write `frameworks.json`; `validate-corpus.mjs`
   coverage report; exit 1 on failure.
6. **Build library (Stage-A, `build-library.mjs`)** — `frameworks.json` + diagrams →
   self-contained `index.html`.

## Notion structure

The source is a Notion database where **each row is a category container page** (22 of
them), and **each framework is a `### ` sub-section** within its category page. A
framework sub-section typically carries:

- `### <Framework Name>` — the heading.
- An **Overview** — bullet prose describing the framework (becomes `body_md` verbatim).
- A `- Reference - [Type](url)` line (zero or more) — becomes `references[]`.
- A `- Author - <name>` line (optional) — becomes `author`.
- A trailing **💡 callout** — the curator's take, becomes `commentary` verbatim.

The page title carries the `category` name and its `category_code` (e.g. "Decision
Making 2.4.4"). S3 image URLs in the page are **ignored** — diagrams are owned, never
hot-linked (they expire ~1hr).

## The split contract

`split-corpus.mjs <category.md> [--category-code 2.4.4] [--category "Decision Making"]`
splits on `### ` headings and deterministically extracts, per framework:
`name`, `body_md` (Overview bullets verbatim), `references[]` (parse the Reference
lines), `author`, `commentary` (the 💡 callout), `category`/`category_code` (from args
or the page title), `source_url`, and the derived stable `id`. It emits a JSON array of
**lean-layer-only** records to stdout (cached match-fields absent — added in step 3).
`--selftest` runs against a built-in Decision-Making fixture.

## The match-field derivation contract

Stage-B fans out **parallel subagents, N frameworks each** (per the bulk-lookup
learning: strict output contract, no chat prose). Each subagent receives a batch of
lean records and the registry, and returns, per framework: `problem_tags` (⊆ registry),
`when_to_use`, `when_not_to_use`, `decision_type`, `lifecycle_stage`, `related`,
`summary`, `aliases`. The JSON is piped to:

```
node ${CLAUDE_SKILL_DIR}/scripts/derive-fields.mjs --merge <lean.json> <derived.json>
```

`derive-fields.mjs` validates every enum + tag against the registry (rejecting unknown
values with a non-zero exit and a precise message), merges the cached fields into the
lean records, and emits the full records. Sparse records (LLM returned nothing for a
field) still validate — only the four required lean fields are mandatory.

## The /diagram batch contract

Per framework, at **full rigor**, unattended:

```
/diagram "<name>: <summary>" --source "<body_md>" \
  --non-interactive --approach "<derived framing>" --theme technical \
  --out data/diagrams/<id-flattened>.svg --on-failure ship-with-warning
```

- `--non-interactive` auto-picks framing #1; `--approach "<framing>"` skips the
  brainstorm loop (the agent derives a one-line structural framing per framework —
  e.g. "2×2 matrix", "funnel", "decision tree", "cycle").
- `--theme technical` keeps a consistent visual language across all ~200 SVGs.
- `--on-failure ship-with-warning` isolates a single failure: it logs, keeps the prior
  SVG (or leaves `diagram: null`), and the batch continues (**FR-ING-2**).
- Fan out in waves (one subagent per framework or small batch).
- **`--changed-only`** consults `data/.diagram-hashes.json` (a `{id: sha256(body_md)}`
  map) and **skips** any framework whose `body_md` hash is unchanged since last sync —
  the cheap re-sync path. A full sync regenerates everything and rewrites the cache.

Diagrams are written as owned SVG files and inlined into the library at build time —
**FR-ING-1: sync never hot-links S3.**

## Assemble + validate

Write `data/frameworks.json` (the merged full records), then:

```
node ${CLAUDE_SKILL_DIR}/scripts/validate-corpus.mjs data/frameworks.json data/situations.json
```

Coverage gate (exit 1 on any miss): ≥95% name+body+references coverage, 100% diagram
coverage or logged ship-with-warning exceptions, 0 invalid tags, 0 dangling
`related`/situation refs. The report prints counts + per-field coverage %.

## Failure handling

- **One `/diagram` fails** → log + keep prior SVG / `null`, continue the batch (FR-ING-2).
- **Notion unreachable** → sync fails cleanly; the existing shipped `frameworks.json`
  and diagrams are untouched (FR-ING-3). Never half-write the corpus.
- **A category page won't split** (unexpected structure) → report which page, skip it,
  finish the rest; surface the gap so the taxonomy/parser can be fixed.
