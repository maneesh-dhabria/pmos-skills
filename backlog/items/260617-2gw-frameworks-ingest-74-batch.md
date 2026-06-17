---
schema_version: 1
id: 260617-2gw
kind: story
parent: 260617-4w1
title: "Ingest the 74-framework research batch into the bundled /frameworks corpus (272 → 346) + rebuild library"
type: feature
priority: should
route: skill
dependencies: []
plugin: pmos-learnkit
status: planned
feature_folder: docs/pmos/features/2026-06-17_frameworks-corpus-expansion/
plan_doc: docs/pmos/features/2026-06-17_frameworks-corpus-expansion/stories/260617-2gw/03_plan.html
tasks: docs/pmos/features/2026-06-17_frameworks-corpus-expansion/stories/260617-2gw/tasks.yaml
worktree:
claimed_by:
driver_holder:
labels: [pmos-learnkit, frameworks, corpus, ingest]
created: 2026-06-17
updated: 2026-06-17
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260617-2gw -->

## Context

Deliverable A of epic `260617-4w1`. Merge the 74 ready-to-ingest framework records + paired SVGs (from the
source repo's `learn-magazine/docs/pmos/frameworks/candidates/`) into the bundled corpus. Pre-flight on this
repo is clean (see epic `design_doc:` #preflight) — this is mechanical, gated by `validate-corpus.mjs`. Design
seed (FR-A1..A5, invariants, risks):
`docs/pmos/features/2026-06-17_frameworks-corpus-expansion/02_design.html` (epic `design_doc`).

## Acceptance criteria

1. **74 records merged (FR-A1, D1/D2).** All 74 embedded JSON records from the source candidates are merged into
   `plugins/pmos-learnkit/skills/frameworks/data/frameworks.json` (count 272 → 346) via a deterministic merge
   (a script / `node -e`, never a hand-edited 1.1 MB file), preserving the existing record shape and a stable
   ordering. Records are spliced verbatim (commentary stays `null`); a record is only touched if a gate fails.
2. **74 SVGs copied + tracked (FR-A2, inv-offline).** All 74 paired SVGs land in `data/diagrams/` under the exact
   flattened `<category>__<name>.svg` filenames the records' `diagram`/`diagrams` fields reference, and are
   git-tracked. No `http(s)`/S3 refs in any new SVG.
3. **Validator green on the merged corpus (FR-A3, D3, inv-merge-once).**
   `node scripts/validate-corpus.mjs data/frameworks.json data/situations.json` exits 0 — required fields, every
   `problem_tags` ⊆ registry, `decision_type`/`lifecycle_stage` ∈ enums, `related[]` resolve, every
   `diagram_anchors` present + length-matched + ≥40-char-substring-valid, distribution gate (no value >30%,
   `n/a` ≤5%), ≥95% name+body coverage. Any genuine miss is fixed in the offending record's field, not by
   weakening the gate.
4. **Library rebuilds + renders (FR-A4).** `node scripts/build-library.mjs --out {docs_path}/frameworks/index.html`
   runs; a live spot-check (served + browser) confirms ≥3 of the new frameworks appear as cards and each renders
   its inline SVG at its `diagram_anchors` position (not a broken image).
5. **Existing tests + selftests stay green (inv-runtime).** `validate-corpus.mjs --selftest`, `match.mjs`
   (retrieve/`--json` unaffected), and the shipped `tests/` (build-library, structure, json-contract) pass
   unchanged.
6. **Corpus-count reference updated (FR-A5).** Any hardcoded "272-entry"/corpus-count string in `SKILL.md` or
   reference docs is updated to 346 (the only `SKILL.md` edit in this story; the verb-surface rewrite is story
   `260617-kac`).
7. **Skill-eval + conventions.** Conforms to `skill-patterns.md §A–§L` and host `CLAUDE.md` (canonical path,
   non-interactive inline block byte-identical, every `AskUserQuestion` has a Recommended option or defer-only
   tag). Passes the `[D]` half of `skill-eval.md`. Version bump / changelog / README row / manifest sync are
   **release prerequisites for /complete-dev**, not `/execute` tasks.
