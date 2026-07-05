---
schema_version: 1
id: 260704-6rq
title: "/primer enrichment engine — enrich-references.mjs + `/primer enrich` verb: per-primer, prefilter the curated corpus for the primer's topics, fetch-verify candidates this run, weave survivors into prose + sources.json, regenerate References via 260704-rgt, rubric-gate/revert"
type: feature
kind: story
status: in-progress
route: skill
priority: should
labels: [pmos-learnkit, primer, references, corpus, enrichment, skill]
created: 2026-07-04
updated: 2026-07-05
parent: 260704-dgq
dependencies: [260704-rgt]
design_doc: docs/pmos/features/2026-07-04_primer-references-enrichment/02_design.html
plan_doc: docs/pmos/features/2026-07-04_primer-references-enrichment/stories/260704-6rq/03_plan.html
feature_folder: docs/pmos/features/2026-07-04_primer-references-enrichment/
worktree: .claude/worktrees/feat-260704-6rq
claimed_by: build:59524b3c-a9d3-48f5-a42f-6cc442f3afc3
driver_holder: build:59524b3c-a9d3-48f5-a42f-6cc442f3afc3
---

## Context

The capability half of epic 260704-dgq: build the per-primer enrichment engine and the `/primer enrich` verb.
Grounded in `02_design.html` §4 (engine architecture), §4.1 (per-primer procedure), decisions D1/D2/D4/D7,
invariants INV-1/INV-2/INV-3/INV-4/INV-6. The corpus backfill is the sibling story 260704-e3b, which runs this
engine over all 61 primers.

**Depends on 260704-rgt** for `injectReferences` (`scripts/references-section.mjs`) — D9 claim-time merge brings
it into this worktree before build. This story reuses the existing `curated-references-match.mjs` prefilter and
`sourcing.md` fetch-verify loop (INV-1/INV-2) — it does not fork a second relevance or verification mechanism.

## Acceptance Criteria

- [ ] **AC1 — engine module.** New `plugins/pmos-learnkit/skills/primer/scripts/enrich-references.mjs` (zero-dep
  Node ESM for the deterministic parts) exposes a per-primer enrich orchestration: given a primer's `.html` +
  `.sources.json` path, run steps 1–7 of design §4.1 and return an outcome record `{considered, verified, added,
  skipped_topics, reverted}` without writing when invoked in dry-run.
- [ ] **AC2 — topic recovery + prefilter (INV-1).** Recover topics from `sources.json[].topic`; for each topic
  pick query tags from the corpus tag-vocabulary and call `curated-references-match.mjs` `match({tags, corpus,
  k, scoreFloor})` for top-K candidates. **Exclude** any candidate whose `url` is already a verbatim member of
  the primer's `sources.json` (dedup, INV-5). Reuse the overlay coverage gate (`T=3`, `S=0`); a fully-skipped
  primer is a logged no-op.
- [ ] **AC3 — fetch-verify + cap (INV-2/D4).** Surviving candidates pass `sourcing.md`'s hard-gate + fetch-verify
  this run; unverified candidates are dropped. Admitted new sources are **capped per primer** (default ~4–6 /
  the depth-floor delta, configurable). No corpus record is written on trust.
- [ ] **AC4 — weave + append (INV-4/D7).** For each verified new source, weave a grounded sentence/pointer into
  the H2 whose `topic` matches, and append the entry `{url, takeaway, topic, tier, paywalled?}` to
  `sources.json`. **Additive only** — existing prose and sources are never rewritten or deleted.
- [ ] **AC5 — regenerate References (INV-3).** After mutation, call 260704-rgt's `injectReferences(html,
  sources)` so `## References` reflects the enriched set. This story never hand-authors a References list.
- [ ] **AC6 — rubric gate / revert (INV-6/D5).** Re-score the enriched primer against `reference/rubric.md`
  (R1 citation-membership, R11 References, trust-tier). Pass → write atomically (temp-then-rename for both
  `.html` and `.sources.json`). Fail → **revert this primer** to its pre-enrichment bytes and record the
  failure in the outcome. A failing primer is never shipped.
- [ ] **AC7 — SKILL.md verb.** New `/primer enrich` verb documented (natural-language: "enrich the bundled
  primers with curated sources"), dispatching the engine; Anti-patterns gains "don't add a curated source
  without fetch-verifying it this run" (mirrors trust anti-pattern #1). Forward generate path + `--no-curated`
  unchanged (D8).
- [ ] **AC8 — tests.** Unit tests for the deterministic parts: topic recovery, dedup against existing
  `sources.json`, coverage-gate no-op, cap enforcement, and revert-on-rubric-fail (using a stub reviewer +
  fixture primer). One integration-style fixture proves an added-and-verified source lands in both prose and
  References and passes R1/R11. Runs with `node --test` (or the repo's script-test convention); green.
- [ ] **AC9 — release-prereq scope (§G).** No version-bump / changelog / README / manifest / learnings tasks in
  any build wave — those are `/complete-dev`'s (Loop 3). List them under the plan's Release prerequisites only.
- [ ] Conforms to `skill-patterns.md §A–§L`; `skill-eval` (`[D]`+`[J]`) passes; 4 hygiene lints +
  `audit-recommended` green.
