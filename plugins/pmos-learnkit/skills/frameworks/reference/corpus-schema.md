# Corpus schema — `data/frameworks.json`

The shipped corpus is a JSON **array of framework records**, maintained by **direct
authoring** (see `reference/corpus-expansion.md`). Each record has two layers: **core
fields** (the framework's prose, references, and owned diagram) and **match-fields**
(the tags, decision-type, and when-to-use metadata that drive retrieval). Both are
authored into the record and then validated by `validate-corpus.mjs`; runtime reads
the match-fields, never recomputes them.

## Contents

- [Record shape](#record-shape)
- [Field reference](#field-reference)
- [super_category map](#super_category-map)
- [Enums](#enums)
- [The diagram_anchors contract](#the-diagram_anchors-contract)
- [Validation rules](#validation-rules)
- [The id contract](#the-id-contract)

## Record shape

```json
{
  "id": "decision-making/regret-minimization",
  "name": "Regret Minimization Framework",
  "aliases": ["Regret Minimization"],
  "category": "Decision Making",
  "category_code": "2.4.4",
  "super_category": "People, Personal & Career",
  "summary": "≤160-char one-liner — what the framework is, in plain words.",
  "body_md": "<the framework's Overview markdown — authored in full, nothing dropped>",
  "references": [{"type": "Article", "url": "https://..."}],
  "author": "Jeff Bezos",
  "commentary": "<verbatim 💡 callout text — the curator's 'PM's take'>",
  "diagram": "data/diagrams/decision-making__regret-minimization.svg",
  "diagrams": ["data/diagrams/decision-making__regret-minimization.svg"],
  "diagram_anchors": ["Imagine yourself at 80 looking back and minimize future regret"],
  "source_url": "https://example.com/<framework-reference>",
  "last_synced": "2026-06-07",

  "problem_tags": ["irreversible-decision", "high-stakes"],
  "when_to_use": "≤1 sentence.",
  "when_not_to_use": "≤1 sentence.",
  "decision_type": "decide",
  "lifecycle_stage": ["any"],
  "related": ["decision-making/one-way-vs-two-way-doors"]
}
```

## Field reference

| Field | Layer | How it's set | Notes |
|---|---|---|---|
| `id` | core | derived from name+category | `<category-slug>/<name-slug>`, stable across revisions (see [the id contract](#the-id-contract)). |
| `name` | core | authored | the framework's name, verbatim. **Required.** |
| `aliases` | core | authored | other names the framework goes by; `[]` if none. |
| `category` | core | authored | e.g. "Decision Making". **Required.** |
| `category_code` | core | authored | e.g. `2.4.4`; drives `super_category`. May be `null` if the record has no code. |
| `super_category` | core | derived from `category_code` | see [map](#super_category-map). `null` if no code. |
| `summary` | match | authored | ≤160 chars; falls back to the first sentence of `body_md` if omitted. |
| `body_md` | core | authored | the framework's Overview markdown — authored in full, **never dropped or paraphrased.** **Required.** |
| `references` | core | authored | array of `{type, url}`; `[]` if none. |
| `author` | core | authored | string or `null`. |
| `commentary` | core | authored | the "PM's take" callout shown in the library — string or `null`. |
| `diagram` | core | owned SVG | repo-relative path to the **primary** owned SVG, or `null` (ship-with-warning). Kept as the back-compat single-diagram field — the `--json` match contract returns this. |
| `diagrams` | core | owned SVGs | array of repo-relative SVG paths, `[primary, ...extras]`. Always starts with `diagram` when non-null. Extra entries (`<flat>__2.svg`, `<flat>__3.svg`) exist only for frameworks carrying **multiple distinct structural** sub-concepts. `[]` when `diagram` is `null`. The library inlines **every** entry; `--json` consumers read `diagram` (primary) only. |
| `diagram_anchors` | match | authored | array **parallel and equal-length to `diagrams`**. Entry `i` marks where diagram `i` belongs inside `body_md`: a **≥40-char verbatim substring of this record's `body_md`**, or `null` (no good in-body location → the renderer falls back to top-of-body for that one diagram). `[]` when `diagrams` is `[]`. See [the diagram_anchors contract](#the-diagram_anchors-contract). |
| `source_url` | core | authored | deep link to the framework's reference material. |
| `last_synced` | core | authored | ISO date `YYYY-MM-DD` the record was last authored or revised. |
| `problem_tags` | match | authored | ⊆ the closed registry in `situations.json`. Drives matching weight ×3. |
| `when_to_use` | match | authored | ≤1 sentence. |
| `when_not_to_use` | match | authored | ≤1 sentence. |
| `decision_type` | match | authored | one of the [enum](#enums). |
| `lifecycle_stage` | match | authored | array, subset of the [enum](#enums). |
| `related` | match | authored | array of other corpus `id`s; validated for danglers. |

## super_category map

Derived from the leading `2.x` of `category_code`:

| `category_code` prefix | `super_category` |
|---|---|
| `2.1.x` | Strategy & Business |
| `2.2.x` | Product |
| `2.3.x` | Analytics, Design & Finance |
| `2.4.x` | People, Personal & Career |

A record with no `category_code` gets `super_category: null` and is grouped under an
"Uncategorized" bucket in the library.

## Enums

- `decision_type` — the **cognitive job** the framework helps a PM do (one value):
  `prioritize` | `decide` | `diagnose` | `estimate` | `strategize` | `design` | `communicate` | `frame` | `n/a`
- `lifecycle_stage` (array, subset): `discovery` | `definition` | `delivery` | `growth` | `any`

`validate-corpus.mjs` (via the `corpus-vocab.mjs` enums) rejects any value outside these
enums and any `problem_tags` entry outside the registry. The pre-v0.18 enum
(`judgment`/`analysis`/`prioritization`/`framing`/`estimation`) is **retired** — a clean
break (no migration). Those values are now rejected.

### decision_type — per-value definition

This is the classification rubric to apply when authoring a record. Classify by the
framework's **primary** cognitive job from `body_md`:

| Value | The job | Examples |
|---|---|---|
| `prioritize` | rank & sequence what to work on | RICE, MoSCoW, Kano, Eisenhower, OKRs-as-focus |
| `decide` | commit to a choice under uncertainty; bets, go/no-go | regret-min, one-way doors, expected value |
| `diagnose` | analyze data, measure, find root cause | funnel/cohort analysis, 5 Whys, metric trees, growth accounting |
| `estimate` | size & forecast the unknown | market sizing/TAM, Fermi, financial projection |
| `strategize` | set direction, position, model the business | Porter, Wardley, Blue Ocean, business-model & pricing frameworks |
| `design` | shape the product, UX, or an experiment | design heuristics, UX laws, experiment design, discovery methods |
| `communicate` | align stakeholders, persuade, lead, narrate | RACI, stakeholder mapping, narrative/comms frameworks |
| `frame` | apply a mental model / lens to understand a problem | JTBD, first principles, systems thinking, behavioral lenses |
| `n/a` | residual only — no single job dominates | target <3% of corpus |

**Distribution gate:** `validate-corpus.mjs` exits 1 if any value > 30% of records, or if
`n/a` > 5%. This is the guard against a `framing`-style mega-bucket re-forming.

## The diagram_anchors contract

`diagram_anchors[]` runs parallel to `diagrams[]` — entry `i` is the anchor for diagram `i`.

```json
"diagrams":        ["data/diagrams/x.svg", "data/diagrams/x__2.svg"],
"diagram_anchors": ["Reach × Impact × Confidence ÷ Effort is the core RICE formula", null]
```

- Each non-null entry is a **≥40-char verbatim substring of this record's `body_md`** —
  the renderer places the diagram immediately after the rendered block (paragraph / list /
  blockquote) whose source contains that substring. **First exact occurrence wins** when the
  substring appears more than once (deterministic, matches the comment-anchor convention).
- `null` (or an anchor that no longer resolves) → that diagram falls back to the **top-of-body**
  leading group. Never dropped, never a broken render.
- `[]` when `diagrams` is `[]`.
- Authored alongside the record by reading `body_md` (see `reference/corpus-expansion.md`).

## Validation rules

Enforced by `validate-corpus.mjs`:

- **FR-SCHEMA-1** — `body_md` preserved verbatim; extraction never drops prose.
- **FR-SCHEMA-2** — only `id`, `name`, `category`, `body_md` are **required**. A sparse
  record (missing author, references, commentary, or any cached field) still validates.
- **FR-SCHEMA-3** — every `problem_tags` value ⊆ the registry; every `related` id and
  every situation→framework reference resolves to an existing record (no danglers).
- **FR-SCHEMA-4** (`decision_type`) — every non-null value ∈ the 8-value enum (old enum
  rejected). **Distribution gate:** no single value > 30% of records; `n/a` ≤ 5%. Exit 1
  on failure — this is the structural guard against a mega-bucket facet.
- **FR-SCHEMA-5** (`diagram_anchors`) — present on **every** record; `diagram_anchors.length`
  must equal `diagrams.length`; every non-null entry must be ≥40 chars **and** a verbatim
  substring of that record's `body_md`. Violations → exit 1.
- **Coverage gate** — corpus-level: ≥95% of records have non-empty `name`+`body_md`+
  `references`; 100% have a `diagram` **or** a logged `ship-with-warning` exception;
  0 invalid tags; 0 dangling refs. Exit 1 on failure.

## The id contract

`id = <category-slug>/<name-slug>` where both halves are kebab-cased ASCII (lowercase,
spaces→`-`, punctuation dropped). The id is **stable**: re-authoring or revising the same
framework must keep the same id so diagrams, `related[]`, and situation mappings stay valid.
The diagram filename flattens the id with `__` (slash→double-underscore) because a
filesystem path can't carry the slash: `decision-making/regret-minimization` →
`data/diagrams/decision-making__regret-minimization.svg`. Second-pass extra diagrams
suffix the flattened id with `__2` / `__3` before `.svg` (e.g.
`data/diagrams/decision-making__regret-minimization__2.svg`).
