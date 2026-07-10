---
schema_version: 1
id: 260710-a2b
title: "/case-studies corpus foundation — one-shot importer transforming the 665 source YAMLs into a bundled single-array data/case-studies.json (with derived year + quantified), the closed-vocab module (4 pillars / 98 topics / 9 regions / 5 artifact-types), a validate-corpus.mjs gate, and reference/corpus-schema.md"
type: feature
kind: story
status: planned
route: feature
priority: should
labels: [pmos-learnkit, case-studies, corpus]
created: 2026-07-10
updated: 2026-07-10
claimed_by: "build:0d5e385f-c675-46f6-a126-345344fa277d"
driver_holder: "build:0d5e385f-c675-46f6-a126-345344fa277d"
parent: 260710-4bh
feature_folder: docs/pmos/features/2026-07-10_case-studies-skill/
design_doc: docs/pmos/features/2026-07-10_case-studies-skill/02_design.html
plan_doc: docs/pmos/features/2026-07-10_case-studies-skill/stories/260710-a2b/03_plan.html
tasks_file: docs/pmos/features/2026-07-10_case-studies-skill/stories/260710-a2b/tasks.yaml
worktree: .claude/worktrees/feat-260710-a2b
dependencies: []
---

## Context

Story A of epic 260710-4bh. The data foundation: import the 665 curated case studies from the source repo into a
bundled, offline, single-array JSON corpus, freeze its schema, and gate it with a validator — so Story B
(260710-vdc) can build the SKILL.md + viewer + match against a fixed contract with no cross-story churn.

Independently verifiable (validator green, 665 records, closed vocabs, 0 dangling topics) — hence `route: feature`
(execute→verify, no skill-eval; there is no SKILL.md in this story). Ships together with Story B in one epic
release, so the corpus never lands a half-skill on main.

Coherence contract: `02_design.html` — INV-1..7, D1/D5, schema (frozen), change surface.

## Change surface

- `plugins/pmos-learnkit/skills/case-studies/scripts/import-corpus.mjs`
- `plugins/pmos-learnkit/skills/case-studies/scripts/corpus-vocab.mjs`
- `plugins/pmos-learnkit/skills/case-studies/scripts/validate-corpus.mjs`
- `plugins/pmos-learnkit/skills/case-studies/data/case-studies.json`
- `plugins/pmos-learnkit/skills/case-studies/data/.gitignore`
- `plugins/pmos-learnkit/skills/case-studies/reference/corpus-schema.md`
- `plugins/pmos-learnkit/skills/case-studies/tests/validate-corpus.test.sh` (+ mini fixture)

## Acceptance Criteria

- [ ] `import-corpus.mjs` (zero-dep Node ESM) reads the source YAMLs from a `--src <path>` (default the
  case-studies-scraping `case-studies/` dir), imports the 17 source fields 1:1, derives `year` (first 4 chars of
  `published`, `unknown` passes through) and `quantified` (true iff `evidence` has a digit), and writes a stable,
  sorted `data/case-studies.json` (single flat array of 665 objects) atomically (temp+rename). A YAML parse is
  done without adding a runtime dependency (bundled/vendored mini-parser or a documented dev-only parse). Re-running
  is idempotent.
- [ ] `data/case-studies.json` contains exactly 665 records; 0 duplicate `id`s; 0 duplicate `url`s.
- [ ] `corpus-vocab.mjs` exports the four closed registries — `PILLARS` (4), `TOPICS` (98, from the source
  `topics_vocabulary.json`), `REGIONS` (9), `ARTIFACT_TYPES` (5) — plus `LANGUAGES` and validators. No skill name
  is hard-referenced from vocab (substrate-neutral).
- [ ] `validate-corpus.mjs` hard-gates (exit 1 on any failure): required fields present
  (`id,title,url,company,pillar,topics`); `id`/`url` uniqueness; every `topics` value ⊆ `TOPICS`; `pillar` ∈
  `PILLARS`; `region` ∈ `REGIONS`; `artifact_type` ∈ `ARTIFACT_TYPES`; `year` is 4 digits or `unknown`;
  `quantified` is boolean. Carries a `--selftest`. Green over the real 665-record corpus.
- [ ] `reference/corpus-schema.md` documents the record contract (field table incl. the two derived fields, the
  required set, the closed-vocab pointers) matching `02_design.html#schema`.
- [ ] `data/.gitignore` ignores the regenerable `library.html` (Story B's output).
- [ ] No SVG/diagram/body_md machinery (this corpus has none — schema); no edits to any sibling skill or the shared
  `lib.mjs` (INV-6).
- [ ] `tests/validate-corpus.test.sh` runs the validator over a small green fixture and a deliberately-broken
  fixture (asserts non-zero exit).
