# Ingestion pipeline — `/frameworks sync`

Two stages: deterministic **Stage-A scripts** (zero-dep Node) and in-session
**Stage-B agent** steps (Notion fetch, LLM field derivation, direct SVG generation). The output
is `data/frameworks.json`, `data/diagrams/*.svg`, and a rebuilt `index.html`. A failed
sync never disturbs the shipped corpus.

## Contents

- [Pipeline steps](#pipeline-steps)
- [Notion structure](#notion-structure)
- [The split contract](#the-split-contract)
- [The match-field derivation contract](#the-match-field-derivation-contract)
- [The diagram generation contract](#the-diagram-generation-contract)
- [The diagram_anchors derivation contract](#the-diagram_anchors-derivation-contract)
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
4. **Diagrams (Stage-B, direct generation)** — one owned SVG per framework. See
   [the diagram generation contract](#the-diagram-generation-contract).
5. **Derive `diagram_anchors` (Stage-B + `apply-rederive.mjs`)** — per diagram, the
   `body_md` substring it sits next to. See [the diagram_anchors derivation contract](#the-diagram_anchors-derivation-contract).
6. **Assemble + validate (Stage-A)** — write `frameworks.json`; `validate-corpus.mjs`
   coverage + distribution + anchor report; exit 1 on failure.
7. **Build library (Stage-A, `build-library.mjs`)** — `frameworks.json` + diagrams →
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
learning: strict output contract, no chat prose; `model: haiku` — `derive-fields.mjs`
validates every enum + tag). Each subagent receives a batch of
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

**`decision_type` is the 8-value cognitive-job taxonomy** (`prioritize·decide·diagnose·
estimate·strategize·design·communicate·frame` + `n/a`) — classify by each framework's
*primary* job, preferring the more specific value (a pricing framework is `strategize`,
not `frame`; a metric is `diagnose`, not `frame`). The pre-v0.18 enum
(`judgment`/`analysis`/`prioritization`/`framing`/`estimation`) is retired and rejected.
`validate-corpus.mjs` enforces a **distribution gate** (no value > 30%, `n/a` ≤ 5%) so
no value re-forms a mega-bucket — see `reference/corpus-schema.md`.

## The diagram generation contract

Per framework, an **owned, self-contained SVG** is generated **directly** by a Stage-B
agent (fanned out in waves, one small batch per agent). This is a deliberate
mechanism choice (see the box below): the literal `/diagram` skill cannot run
unattended at corpus scale — invoked from a subagent it only injects its 8-phase
interactive instructions (it needs `AskUserQuestion` brainstorm/findings loops and a
nested vision-review subagent a subagent cannot spawn). Direct generation meets every
diagram **requirement** — owned, consistent, inlined, never hot-linked — at scale.

> **Mechanism note (execute-time correction of D5).** The requirements/spec named
> `/diagram --non-interactive` as the batch tool; a probe proved that infeasible
> headless (structural interactive loops + nested subagent). The *intent* of D5 — an
> owned SVG for every framework, generated automatically with no per-diagram approval
> — is unchanged and fully satisfied. `/diagram` remains the right tool for a one-off
> hero diagram a user elaborates by hand.

**SVG style guide (keep all ~272 diagrams consistent):**

- Root: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" role="img" aria-label="<name> diagram">`. No `width`/`height` (responsive). The library renders SVGs on a **white** card, so design for a light background with dark ink.
- Palette: background `#ffffff` or `#f4f7ff`; ink `#1d2438`; muted `#5b6680`; accent `#2563eb`; secondary accents `#0ea5a4`, `#f59e0b`, `#ef4444`. Stick to this set so the corpus reads as one family.
- Pick the **structural archetype** that actually fits the framework, e.g.: 2×2 matrix, funnel, pyramid, cycle/loop, flow / decision tree, staged ladder, Venn, list-with-icon-rows, gauge/scale. Do not force every framework into a box list.
- A short title (the framework name), legible labels on every part, and ≤ a few sentences of embedded text. Must read at small size.
- **Self-contained:** inline shapes + text only. No `<image>`, no external/`http(s)` refs, **no `amazonaws.com`** (the source S3 images are dead). Target < 40 KB (most are 2–6 KB).
- Write to `data/diagrams/<id-flattened>.svg` where `<id-flattened>` = the record `id` with `/` → `__` (e.g. `decision-making__one-way-vs-two-way-doors.svg`).

- **Failure isolation (FR-ING-2):** if a single SVG can't be produced, log it, leave
  `diagram: null` (ship-with-warning), and continue the batch — never abort.
- **`--changed-only`** consults `data/.diagram-hashes.json` (a `{id: sha256(body_md)}`
  map) and **skips** any framework whose `body_md` hash is unchanged since last sync —
  the cheap re-sync path. A full sync regenerates everything and rewrites the cache.

Diagrams are written as owned SVG files and inlined into the library at build time —
**FR-ING-1: sync never hot-links S3.**

## The diagram_anchors derivation contract

`diagram_anchors[]` tells the library **where inside `body_md`** each diagram belongs,
so the renderer can place it inline next to the prose it illustrates instead of dumping
all diagrams at the top. It runs **after** `diagrams[]` is known (the anchors array is
parallel + equal-length to it).

Stage-B fans out **parallel subagents, a slice of frameworks each** (strict output
contract, no chat prose; `model: haiku` — `apply-rederive.mjs` re-checks every anchor
+ enum). Each subagent receives, per framework, `id`, `name`,
`body_md`, and `diagrams[]` (filenames, for count + order), and returns:

```json
{ "id": "...", "decision_type": "<one of 8 | n/a>",
  "diagram_anchors": ["<≥40-char verbatim body_md substring>" | null, ...] }
```

Rules (the subagent prompt enforces these; `apply-rederive.mjs` re-checks them):

- `diagram_anchors.length` MUST equal `diagrams.length`.
- Each non-null entry is a **verbatim ≥40-char substring** of that record's `body_md` —
  copied exactly (preserve unicode like `×` `÷` and curly quotes). Pick the sentence /
  bullet the diagram illustrates; the primary (`diagrams[0]`) usually anchors to the
  framework's defining block, extras to the distinct later blocks they depict.
- Use `null` only when no block fits — the renderer falls back to top-of-body for it.

Merge + validate with:

```
node ${CLAUDE_SKILL_DIR}/scripts/apply-rederive.mjs --in <derived.json>
```

`apply-rederive.mjs` is **incremental + idempotent**: it applies the valid entries and
exits 1 listing any record whose anchor isn't a real substring or whose enum is invalid,
so you fix just those ids and re-run until clean. It is also the **offline re-derive
path** — to re-classify an existing shipped corpus over its own `body_md` (no Notion),
slice `data/frameworks.json` into per-framework `{id, name, body_md, diagrams}` inputs,
run the Stage-B classification, collect to a scratch JSON, and apply it. (Platform note:
with no `Task` subagent, the slices run sequentially in-session — identical output.)

## Assemble + validate

Write `data/frameworks.json` (the merged full records), then:

```
node ${CLAUDE_SKILL_DIR}/scripts/validate-corpus.mjs data/frameworks.json data/situations.json
```

Coverage gate (exit 1 on any miss): ≥95% name+body coverage, 100% diagram coverage or
logged ship-with-warning exceptions, 0 invalid tags, 0 dangling `related`/situation
refs, every `diagram_anchors` present + length-matched + substring-valid, and the
`decision_type` distribution gate (no value > 30%, `n/a` ≤ 5%). The report prints counts
+ per-field coverage % + the decision_type distribution.

## Failure handling

- **One diagram generation fails** → log + keep prior SVG / `null`, continue the batch (FR-ING-2).
- **Notion unreachable** → sync fails cleanly; the existing shipped `frameworks.json`
  and diagrams are untouched (FR-ING-3). Never half-write the corpus.
- **A category page won't split** (unexpected structure) → report which page, skip it,
  finish the rest; surface the gap so the taxonomy/parser can be fixed.
