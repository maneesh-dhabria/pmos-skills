---
schema_version: 1
id: 260616-v4h
kind: story
parent: 260616-tqf
title: Curated-references overlay engine — ship scrubbed corpus + IDF prefilter + research-phase subagent + sourcing.md patch
type: feature
priority: should
status: done
released: 0.27.0
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-16_curated-references-overlay/
plan_doc: docs/pmos/features/2026-06-16_curated-references-overlay/stories/260616-v4h/03_plan.html
tasks: docs/pmos/features/2026-06-16_curated-references-overlay/stories/260616-v4h/tasks.yaml
worktree:
claimed_by:
driver_holder:
labels: [pmos-learnkit, topic-research, curated-references, sourcing]
created: 2026-06-16
updated: 2026-06-17
---

<!-- status: done at build (Loop 2, 2026-06-17, holder build:cron-v4h, branch feat/260616-v4h @ c115907). All 10 TDD tasks green; skill-eval EXIT 0 (primer + learn-list); lint-flags-vs-hints + lint-phase-refs + lint-non-interactive-inline + audit-recommended all PASS; live dogfood on the real 1817-record corpus (pricing→70 INJECT, beekeeping→0 SKIP+log, PII planted-fail proven, 209 bot-wall + 1 forbes filtered). Worktree KEPT for Loop-3 (/complete-dev --epic 260616-tqf). -->

## Context

Deliverable A of epic `260616-tqf`: the curated-references overlay, landed entirely in the
shared `_shared/topic-research/` substrate so `/primer` and `/learn-list` improve **indirectly**
with no trust regression. Builds against `02_design.html` (anchors `#deliverable-a-overlay-h`,
`#a-overlay-file`, `#a-prefilter`, `#a-subagent`, `#a-integration`, `#a-coverage-gate`, `#a-flag`,
`#pii-gate`, `#junk-policy`) and the standing skill-authoring criteria
(`feature-sdlc/reference/skill-patterns.md §A–§L`, repo `CLAUDE.md`). Corpus source: the spike
export at `notion-writing-backup/spikes/curated-references/curated-references.yaml` (1821 refs).
JSON not YAML (D-TOOL: zero-dep, Python-free).

## Acceptance Criteria

(Carries epic AC1–AC4.)

- [x] AC1 — `curated-references.json` ships under `_shared/topic-research/`, scrubbed to the field allowlist with content-derived ids (`ref_`+sha(url)) + generic `meta.source`, DEAD entries excluded; the deterministic scrub-gate test fails on any planted notion-specific field.
- [x] AC2 — `curated-references-match.mjs` (zero-dep) returns top-K by rarity-weighted tag overlap (IDF `w=log(N/(1+df))`), pre-rejects bot-wall titles, down-weights `summary_grounded:false`, skips hard-blocked domains; determinism + correctness tests green.
- [x] AC3 — a new skill-agnostic `_shared/topic-research/curated-references.md` documents the one research-phase subagent (tag pick → prefilter → rerank → coverage gate → candidates[]); `sourcing.md` step 1 adds the overlay as an optional *if-present* third source, pool cap raised to ~3–4×; `assert_substrate_skill_agnostic.sh` stays green.
- [x] AC4 — coverage gate skips + logs low-coverage topics; `--no-curated` / `curated_references` settings suppress; `intake.md` notes the curated slice rides the same dials; `/primer` + `/learn-list` SKILL.md each gain the one-line sourcing note (the ONLY skill-file edits).

## Notes

Plan + `tasks.yaml` authored at define (10 tasks, TDD): scrub-gate test (RED) → importer →
prefilter test (RED) → `curated-references-match.mjs` → subagent doc → `sourcing.md` patch →
`intake.md` note → D12 agnostic assert → the two skill-file notes → load-bearing live dogfood
(real-corpus prefilter + coverage gate pricing-vs-devrel + planted scrub-fail). No deps — pickable
immediately. Build via `/feature-sdlc build --story 260616-v4h` (or `build --next`).
