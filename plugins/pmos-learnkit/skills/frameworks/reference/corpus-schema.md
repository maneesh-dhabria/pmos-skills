# Corpus schema — `data/frameworks.json`

The shipped corpus is a JSON **array of framework records**. Each record has two
layers: **lean fields** extracted deterministically from Notion by `split-corpus.mjs`,
and **cached match-fields** derived once by an LLM at `sync` time and validated by
`derive-fields.mjs`. Runtime never recomputes the cached fields — it reads them.

## Contents

- [Record shape](#record-shape)
- [Field reference](#field-reference)
- [super_category map](#super_category-map)
- [Enums](#enums)
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
  "body_md": "<verbatim Overview markdown from Notion — nothing dropped>",
  "references": [{"type": "Article", "url": "https://..."}],
  "author": "Jeff Bezos",
  "commentary": "<verbatim 💡 callout text — the curator's 'PM's take'>",
  "diagram": "data/diagrams/decision-making__regret-minimization.svg",
  "source_url": "https://notion.so/<page>#<framework>",
  "last_synced": "2026-06-07",

  "problem_tags": ["irreversible-decision", "high-stakes"],
  "when_to_use": "≤1 sentence.",
  "when_not_to_use": "≤1 sentence.",
  "decision_type": "judgment",
  "lifecycle_stage": ["any"],
  "related": ["decision-making/one-way-vs-two-way-doors"]
}
```

## Field reference

| Field | Layer | Source | Notes |
|---|---|---|---|
| `id` | lean | derived | `<category-slug>/<name-slug>`, stable across syncs (see [the id contract](#the-id-contract)). |
| `name` | lean | Notion `### ` heading | verbatim. **Required.** |
| `aliases` | lean | LLM/derive | other names the framework goes by; `[]` if none. |
| `category` | lean | page title | e.g. "Decision Making". **Required.** |
| `category_code` | lean | page title | e.g. `2.4.4`; drives `super_category`. May be `null` if the page has no code. |
| `super_category` | lean | derived from `category_code` | see [map](#super_category-map). `null` if no code. |
| `summary` | cached | LLM | ≤160 chars; falls back to the first sentence of `body_md` if the LLM step is skipped. |
| `body_md` | lean | Notion Overview | verbatim markdown — **never dropped or paraphrased.** **Required.** |
| `references` | lean | `- Reference - [Type](url)` lines | array of `{type, url}`; `[]` if none. |
| `author` | lean | `- Author -` line | string or `null`. |
| `commentary` | lean | trailing 💡 callout | verbatim string or `null`. The "PM's take" shown in the library. |
| `diagram` | build | `/diagram` | repo-relative path to the owned SVG, or `null` (ship-with-warning). |
| `source_url` | lean | Notion | deep link to the framework within its page. |
| `last_synced` | lean | `sync` run | ISO date `YYYY-MM-DD`. |
| `problem_tags` | cached | LLM | ⊆ the closed registry in `situations.json`. Drives matching weight ×3. |
| `when_to_use` | cached | LLM | ≤1 sentence. |
| `when_not_to_use` | cached | LLM | ≤1 sentence. |
| `decision_type` | cached | LLM | one of the [enum](#enums). |
| `lifecycle_stage` | cached | LLM | array, subset of the [enum](#enums). |
| `related` | cached | LLM | array of other corpus `id`s; validated for danglers. |

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

- `decision_type`: `judgment` | `analysis` | `prioritization` | `framing` | `estimation` | `n/a`
- `lifecycle_stage` (array, subset): `discovery` | `definition` | `delivery` | `growth` | `any`

`derive-fields.mjs` rejects any value outside these enums and any `problem_tags` entry
outside the registry.

## Validation rules

Enforced by `validate-corpus.mjs`:

- **FR-SCHEMA-1** — `body_md` preserved verbatim; extraction never drops prose.
- **FR-SCHEMA-2** — only `id`, `name`, `category`, `body_md` are **required**. A sparse
  record (missing author, references, commentary, or any cached field) still validates.
- **FR-SCHEMA-3** — every `problem_tags` value ⊆ the registry; every `related` id and
  every situation→framework reference resolves to an existing record (no danglers).
- **Coverage gate** — corpus-level: ≥95% of records have non-empty `name`+`body_md`+
  `references`; 100% have a `diagram` **or** a logged `ship-with-warning` exception;
  0 invalid tags; 0 dangling refs. Exit 1 on failure.

## The id contract

`id = <category-slug>/<name-slug>` where both halves are kebab-cased ASCII (lowercase,
spaces→`-`, punctuation dropped). The id is **stable**: a re-sync of the same framework
must produce the same id so diagrams, `related[]`, and situation mappings stay valid.
The diagram filename flattens the id with `__` (slash→double-underscore) because a
filesystem path can't carry the slash: `decision-making/regret-minimization` →
`data/diagrams/decision-making__regret-minimization.svg`.
