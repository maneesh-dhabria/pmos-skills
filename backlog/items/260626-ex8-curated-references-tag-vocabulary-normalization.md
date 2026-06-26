---
schema_version: 1
id: 260626-ex8
kind: story
title: "curated-references — closed tag vocabulary + synonym normalization"
type: tech-debt
priority: should
status: planned
route: skill
parent: 260626-j5k
dependencies: [260626-af6]
worktree:
plan_doc: docs/pmos/features/2026-06-26_learn-list-corpus-hygiene/stories/260626-ex8/03_plan.html
tasks_file: docs/pmos/features/2026-06-26_learn-list-corpus-hygiene/stories/260626-ex8/tasks.yaml
claimed_by:
pr:
labels: [learn-list, primer, pmos-learnkit, skill, corpus]
created: 2026-06-26
updated: 2026-06-26
---

## Context

The tag-rationalization half of epic `260626-j5k`. The corpus
`plugins/pmos-learnkit/skills/_shared/topic-research/curated-references.json` carries 511 distinct tags — 57%
appear ≤2 times, 42% exactly once, only ~99 appear ≥10 times. The browse-viewer facet list is unusable at
this width. Define a closed ~120-tag vocabulary plus a synonym/plural → canonical map, apply it at import
time, and re-tag the corpus.

Depends on `260626-af6`: that pass re-summarizes ungrounded records, and those re-summaries should be
re-tagged under the new vocabulary in the same generation rather than tagged twice.

## Acceptance Criteria

- [ ] A closed canonical tag vocabulary (~120 tags) is defined as data (single source of truth), covering the ~99 high-frequency tags plus deliberately-kept mid-tail topics
- [ ] A synonym/plural → canonical map collapses variants: `startup(s)`, `a/b-testing`/`ab-testing`/`a-b-testing`, `system-design`/`systems-design`, `prioriti[sz]ation`, `organi[sz]ation`, `org-design`/`organizational-design`, `api(s)`, `book(s)`, `framework(s)`, `platform(s)`, `tool(s)`, `llm(s)`, `prompt-engineering`/`prompting`/`prompts`, `pmf`↔`product-market-fit`, `plg`↔`product-led-growth`, `gtm`↔`go-to-market`, `ecommerce`/`e-commerce` (non-exhaustive)
- [ ] Brand/company/product-name tags dropped or folded into a topic: amazon, netflix, airbnb, apple, microsoft, openai, anthropic, claude, notion, tiktok, figma, kafka, redis, kubernetes, …
- [ ] Single-use long-tail tags either map to a canonical tag or are dropped; a tag never outside the closed vocabulary survives into the shipped corpus
- [ ] Normalization applied in `import-curated-references.mjs` (or a clearly-owned tag-normalize step it calls) so a future refresh stays clean; unknown-tag count after normalization is reported and gated
- [ ] Final distinct-tag count lands at ~100–150; every shipped tag is in the closed vocabulary
- [ ] T1 PII scrub gate passes GREEN; `/learn-list browse` + `/primer` facet filters verified against the regenerated corpus; `curated-references-match.mjs` IDF prefilter still functions (re-check tag weights)
- [ ] Conforms to `skill-patterns.md §A–§L`; passes `skill-eval.md`

## Notes

Run after `260626-af6` (declared dependency). Vocabulary should be authored as a reviewable data file
(e.g. `tag-vocabulary.json` + `tag-synonyms.json`) under the topic-research substrate, not buried in script
logic, so it can be tuned without code changes.
