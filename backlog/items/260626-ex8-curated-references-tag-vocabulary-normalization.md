---
schema_version: 1
id: 260626-ex8
kind: story
title: "curated-references — closed tag vocabulary + synonym normalization"
type: tech-debt
priority: should
status: released
route: skill
parent: 260626-j5k
dependencies: [260626-af6]
worktree:
plan_doc: docs/pmos/features/2026-06-26_learn-list-corpus-hygiene/stories/260626-ex8/03_plan.html
tasks_file: docs/pmos/features/2026-06-26_learn-list-corpus-hygiene/stories/260626-ex8/tasks.yaml
claimed_by: build:e385ea38
driver_holder: build:e385ea38
pr:
labels: [learn-list, primer, pmos-learnkit, skill, corpus]
created: 2026-06-26
updated: 2026-06-27
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

### Build outcome (2026-06-27, build:e385ea38) — DONE

Shipped under `_shared/topic-research/`: NEW `tag-vocabulary.json` (142 closed canonical tags — the ~97
high-freq spine + deliberately-kept mid-tail topics) + `tag-synonyms.json` (358 variant→canonical mappings +
a 1-entry drop list) as reviewable data (D2). NEW `scripts/normalize-tags.mjs`: pure `normalizeTags()` +
`validateVocabModel()` + a corpus CLI carrying the **D7 unknown-tag build-fail gate**. Wired into
`import-curated-references.mjs` at the per-record tag-write point (single enforcement point, D3). NEW
`tests/normalize_tags_unit.mjs` (17/0).

- **Tag count 511 → 142 distinct** (AC6 ~100–150 ✓); every shipped tag is a vocabulary member; brand tags
  folded (amazon→ecommerce, netflix→media, kafka/kubernetes→infrastructure, …) or dropped; plurals/spelling
  drift collapsed (startup(s), a/b-testing×3, system(s)-design, prioriti[sz]ation, pmf↔product-market-fit, …).
- Applied to the af6-backfilled corpus as a **pure tag-only in-place transform** (titles/summaries/ids/counts
  untouched — same in-place pattern af6 used for dedupeById, no destructive re-import). 1797 records unchanged;
  tag-assignments 7494 → 7261; 2 already-tag-poor records (one empty pre-ex8, one `["article"]`-only → dropped).

**All ACs met.** Gates: normalize unit 17/0 (incl negative-control = gate fires on a planted out-of-vocab tag,
+ real-corpus 0-unknown coverage) · backfill unit 35/0 (regress) · PII scrub gate PASS (1797) · prefilter PASS
\+ live sample (ubiquitous `product` df=1182 → IDF weight 0.418 > 0, C3 functional) · skill-agnostic PASS ·
`/learn-list browse` live-DOM: Tags facet **511 → 142 checkboxes**, click `ab-testing (12)` → 12 entries (C2) ·
build-library shipped test PASS · 4 lints + audit + skill-eval [D] EXIT0 (learn-list/primer/book-summary).
No SKILL.md changed, no new deps, no schema change. Impl `6f39999a` on `feat/260626-ex8` (worktree kept).
**COMPLETES epic `260626-j5k` (2/2)** → Loop-3 `/complete-dev --epic 260626-j5k`.
