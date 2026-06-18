# Situation taxonomy & tag registry — `data/situations.json`

Skill-owned and directly authored. Two things live here: the **closed
`problem_tags` registry** that constrains `frameworks.json` matching, and a set of
**~15–25 recognizable PM situations** pre-mapped to framework ids — the "I don't know
what to search for" entry point.

## Contents

- [File shape](#file-shape)
- [The problem_tags registry](#the-problem_tags-registry)
- [Situations](#situations)
- [Why closed](#why-closed)
- [Validation rules](#validation-rules)

## File shape

```json
{
  "version": 1,
  "problem_tags": ["prioritization", "north-star-metric", "irreversible-decision",
                   "pricing", "positioning", "stakeholder-alignment", "estimation"],
  "situations": [
    {"id": "prioritize-roadmap",
     "label": "I need to prioritize a roadmap",
     "super_category": "Product",
     "tags": ["prioritization"],
     "frameworks": ["product/rice", "product/kano", "product/moscow"]},
    {"id": "reversible-decision",
     "label": "I'm stuck on a reversible decision",
     "super_category": "People, Personal & Career",
     "tags": ["irreversible-decision"],
     "frameworks": ["decision-making/one-way-vs-two-way-doors",
                    "decision-making/regret-minimization"]}
  ]
}
```

## The problem_tags registry

A **flat, closed** list of ~25–40 lowercase-kebab tags spanning the four
super-categories. Tags name the *problem* a framework addresses, not the framework
itself — `prioritization`, `pricing`, `positioning`, `north-star-metric`,
`irreversible-decision`, `stakeholder-alignment`, `estimation`, `user-research`,
`retention`, `activation`, `experiment-design`, `team-health`, `career-growth`, etc.

The registry is the **single source of truth** for the `problem_tags` field on every
framework record. `validate-corpus.mjs` rejects any framework tag not in this list, so
the vocabulary cannot drift framework-by-framework. Growing the vocabulary is a
deliberate edit here, then a re-validate.

## Situations

Each situation is a plain-language thing a PM actually says ("I need to prioritize a
roadmap", "I'm trying to size a market", "my team keeps missing estimates"), carrying:

- `id` — stable kebab id.
- `label` — the spoken phrasing, used for fuzzy matching on the Retrieve path.
- `super_category` — one of the four; drives grouped display in `/frameworks situations`.
- `tags` — registry tags this situation implies (used to rank its frameworks).
- `frameworks` — the curated framework ids that answer it, best-first.

Situations are authored directly — aim for ~15–25 that cover the common PM jobs
without exploding into one-per-framework. They give the matcher a high-precision
shortcut: an input that matches a situation label skips the free-text scorer entirely.

## Why closed

A closed tag registry + a curated situation set is what makes matching *precise*
instead of a fuzzy embedding guess. The cost is maintenance (new frameworks may need a
new tag), paid deliberately when authoring. This resolves OQ3 (taxonomy shape): flat
tags, situations grouped under the four super-categories for display only.

## Validation rules

Enforced by `validate-corpus.mjs` once the corpus exists:

- **FR-TAX-1** — every `situations[].frameworks[]` id resolves to an existing record in
  `frameworks.json` (0 danglers).
- **FR-TAX-2** — every `situations[].tags[]` and every framework `problem_tags[]` value
  is in `problem_tags`.
- `version` is present and an integer.
