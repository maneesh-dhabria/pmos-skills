---
schema_version: 1
id: 260629-6j0
kind: story
parent: 260629-9ne
title: "/artifact-critique emit-pathway fixes — self-contained HTML fallback (D1), Node-unavailable gate protocol (D2), always-surfaced reviewer line (D3), no-stderr Phase-0 lines (D4)"
type: enhancement
priority: should
route: skill
dependencies: []
plugin: pmos-toolkit
status: planned
feature_folder: docs/pmos/features/2026-06-29_artifact-critique-emit-fixes/
plan_doc: docs/pmos/features/2026-06-29_artifact-critique-emit-fixes/stories/260629-6j0/03_plan.html
tasks: docs/pmos/features/2026-06-29_artifact-critique-emit-fixes/stories/260629-6j0/tasks.yaml
worktree:
claimed_by:
driver_holder:
build_branch:
build_commit:
labels: [pmos-toolkit, artifact-critique, skill, from-feedback]
created: 2026-06-29
updated: 2026-06-29
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260629-6j0 -->

## Context

The whole epic (260629-9ne) is one story: all four FRs revise the single file
`plugins/pmos-toolkit/skills/artifact-critique/SKILL.md` — `## Platform Adaptation` (FR-1/FR-2/FR-4 bullets) and
`## Phase 7` (FR-1/FR-2 cross-references + FR-3 Tier-2 always-emit line). Decisions (D1–D4), FRs (FR-1..FR-4),
finding→FR map, and invariants (INV-1..INV-5) live in the `design_doc:` (`../../02_design.html`). SKILL.md-only —
the `_shared/critique-rubric/` substrate, the `_shared/html-authoring/` substrate, and `scripts/critique-eval.mjs`
are all byte-unchanged. One `/execute` run — see `tasks.yaml`.

## Acceptance Criteria

- [ ] **AC1 (FR-1)** `## Platform Adaptation` carries a self-contained-HTML-fallback bullet matching D1: conditional
  on a first-class platform Artifact/canvas tool; single self-contained HTML (inline CSS/JS, no external asset
  links); **retains the embedded `pmos-critique-findings` block**; comments overlay inlined best-effort; publishes
  in the same phase without a separate user turn; the multi-file `assets/` substrate remains the **default** for
  `--out` / pipeline-folder writes; any overlay loss is named in `## Limits`. The Phase 7 `#emit` text
  cross-references the bullet so both paths are discoverable from the emit phase.
- [ ] **AC2 (FR-2)** `## Platform Adaptation` carries a Node-unavailable bullet matching D2: skip
  `critique-eval.mjs`, manually validate the deterministic E-checks (especially E-quote-in-source, plus
  E-axes-complete, E-applicable-consistency), add a `## Limits` entry ("deterministic gate not run (Node
  unavailable) — findings manually validated"), and proceed; never block, never silently omit. The Phase 7 Tier-1
  text cross-references it.
- [ ] **AC3 (FR-3)** Phase 7 Tier-2 contract requires exactly one always-emitted chat-summary sentence reporting the
  advisory reviewer's outcome regardless of findings:
  `Tier 2 advisory reviewer: ran <inline|subagent> — <N findings | no findings>`. The end-of-Phase-7 chat-print
  instruction includes it.
- [ ] **AC4 (FR-4)** `## Platform Adaptation` carries a no-stderr bullet matching D4: surface the Phase 0 `mode:` and
  `output_format:` resolution lines inline as a brief code block at Phase 0 entry when the harness has no distinct
  stderr channel, then continue.
- [ ] **AC5 (conformance)** `_shared/critique-rubric/`, `_shared/html-authoring/`, and `scripts/critique-eval.mjs`
  are byte-unchanged (INV-1/2/3); the embedded findings block remains on every documented emit path (INV-4);
  `argument-hint` is unchanged and no new flags are introduced (INV-5); `skill-eval-check.sh` `[D]` passes for
  target `claude-code`; the repo lints (`lint-flags-vs-hints.sh`, `lint-phase-refs.sh`, `lint-non-interactive-inline.sh`)
  and `audit-recommended.sh` are green.

**Standing AC** — the revised skill conforms to `reference/skill-patterns.md §A–§L` and the binary `reference/skill-eval.md`
rubric (cited as acceptance criteria; every new Platform Adaptation bullet follows the canonical "No X → do Y" shape).
