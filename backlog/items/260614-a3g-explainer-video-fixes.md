---
schema_version: 1
id: 260614-a3g
kind: story
title: "/explainer-video — first-run robustness + caption/watermark/UX fixes"
type: bug
priority: must
status: planned
route: skill
parent: 260614-7g0
dependencies: []
worktree:
plan_doc: docs/pmos/features/2026-06-14_explainer-video-fixes/stories/260614-a3g-explainer-video-fixes/03_plan.html
tasks_file: docs/pmos/features/2026-06-14_explainer-video-fixes/stories/260614-a3g-explainer-video-fixes/tasks.yaml
claimed_by: null
pr:
labels: [explainer-video, pmos-toolkit, retro, captions]
created: 2026-06-14
updated: 2026-06-14
---

## Context

The single in-scope skill for epic `260614-7g0`. Nine findings — four from a `/reflect` retro of one real run, five from direct user feedback — all coherent edits to `/explainer-video`'s `SKILL.md`, three scripts (`narrate.sh`, `assemble.sh`, `ingest.mjs`), and two reference files (`distillation-contract.md`, `figure-inventory.md`).

Epic design (cite by anchor): `docs/pmos/features/2026-06-14_explainer-video-fixes/02_design.html`
Decisions: D1–D9 (`#decisions`). Requirements: FR-1–FR-10 (`#requirements`). Coherence: I1–I3 (`#coherence`). Grill notes: G1–G3 (`#grill-notes`).
Standing acceptance criteria: `plugins/pmos-toolkit/skills/feature-sdlc/reference/skill-patterns.md §A–§L` and the host repo `CLAUDE.md` skill-authoring conventions.

## Acceptance Criteria

- [ ] **FR-1 (D1):** SKILL.md Phase 3 + the contract worked example show the full `{title, length_target, slides:[...]}` wrapper; `narrate.sh` & `assemble.sh` normalise a bare top-level array; new normalisation selftest case in each; existing selftests stay green.
- [ ] **FR-2 (D2):** `ingest.mjs` writes inline `<svg>` figures to `figures/<id>.svg` with `source_ref` → the file; selftest asserts it; `figure-inventory.md` + Phase 2/4 wording match; `<img>`/markdown behaviour unchanged.
- [ ] **FR-3 (D3):** Phase 3 ends with a JSON-validity gate (parse + unescaped-quote guidance); a parse failure stops with a clear message.
- [ ] **FR-4 (D4):** Phase 1/2 document a deterministic source/`@artifact` resolution order; bounded `find` fallback errors on 0/>1 match.
- [ ] **FR-5 (D5):** `assemble.sh` caption `force_style` sets explicit PlayRes 1920×1080 + small bottom-anchored style + wrap bound; selftest asserts the style shape; `--no-captions` still disables.
- [ ] **FR-6 (D6):** Phase 1 resolves captions `cli > lastrun > default(ON)`, persists to `.pmos/explainer-video.lastrun.yaml`, prints `captions: on|off (source: …)`.
- [ ] **FR-7 (D7):** subtle bottom-right `pmos-toolkit` watermark on every slide via deck.html CSS; present in frames; no ffmpeg change (mind G1 caption-overlap).
- [ ] **FR-8 (D8):** Phase 1 prints `est. run time` from length/slide-count (deterministic heuristic); `deep` tier asks a confirm (auto-proceed non-interactive).
- [ ] **FR-9 (D9):** Phase 3→4 outline-approval gate (titles+ideas; approve/edit/delete; edits rewrite deck.json + re-run FR-3; auto-proceed + log headless) — per G3 prompt shape.
- [ ] **FR-10:** all changes pass `skill-eval` ([D]+[J]); `narrate.sh`/`assemble.sh`/`ingest.mjs` `--selftest` green.

## Notes

One `/execute` run (one session, one PR). No dependencies. Ships as one pmos-toolkit release at Loop 3. `tasks.yaml :: spec` → `../../02_design.html`.
