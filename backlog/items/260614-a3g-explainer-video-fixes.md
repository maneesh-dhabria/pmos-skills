---
schema_version: 1
id: 260614-a3g
kind: story
title: "/explainer-video — first-run robustness + caption/watermark/UX fixes"
type: bug
priority: must
status: done
route: skill
parent: 260614-7g0
dependencies: []
worktree: feat/260614-a3g
plan_doc: docs/pmos/features/2026-06-14_explainer-video-fixes/stories/260614-a3g-explainer-video-fixes/03_plan.html
tasks_file: docs/pmos/features/2026-06-14_explainer-video-fixes/stories/260614-a3g-explainer-video-fixes/tasks.yaml
claimed_by: build:explainer-a3g-loop
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

- [x] **FR-1 (D1):** SKILL.md Phase 3 + the contract worked example show the full `{title, length_target, slides:[...]}` wrapper; `narrate.sh` & `assemble.sh` normalise a bare top-level array; new normalisation selftest case in each; existing selftests stay green.
- [x] **FR-2 (D2):** `ingest.mjs` writes inline `<svg>` figures to `figures/<id>.svg` with `source_ref` → the file; selftest asserts it; `figure-inventory.md` + Phase 2/4 wording match; `<img>`/markdown behaviour unchanged.
- [x] **FR-3 (D3):** Phase 3 ends with a JSON-validity gate (parse + unescaped-quote guidance); a parse failure stops with a clear message.
- [x] **FR-4 (D4):** Phase 1/2 document a deterministic source/`@artifact` resolution order; bounded `find` fallback errors on 0/>1 match.
- [x] **FR-5 (D5):** `assemble.sh` caption `force_style` sets explicit PlayRes 1920×1080 + small bottom-anchored style + wrap bound; selftest asserts the style shape; `--no-captions` still disables.
- [x] **FR-6 (D6):** Phase 1 resolves captions `cli > lastrun > default(ON)`, persists to `.pmos/explainer-video.lastrun.yaml`, prints `captions: on|off (source: …)`.
- [x] **FR-7 (D7):** subtle bottom-right `pmos-toolkit` watermark on every slide via deck.html CSS; present in frames; no ffmpeg change (mind G1 caption-overlap).
- [x] **FR-8 (D8):** Phase 1 prints `est. run time` from length/slide-count (deterministic heuristic); `deep` tier asks a confirm (auto-proceed non-interactive).
- [x] **FR-9 (D9):** Phase 3→4 outline-approval gate (titles+ideas; approve/edit/delete; edits rewrite deck.json + re-run FR-3; auto-proceed + log headless) — per G3 prompt shape.
- [x] **FR-10:** all changes pass `skill-eval` ([D]+[J]); `narrate.sh`/`assemble.sh`/`ingest.mjs` `--selftest` green.

## Notes

One `/execute` run (one session, one PR). No dependencies. Ships as one pmos-toolkit release at Loop 3. `tasks.yaml :: spec` → `../../02_design.html`.

### Build write-back (Loop 2, 2026-06-14)

Built on branch `feat/260614-a3g` (commits `124bac7` claim, `004a948` T2–T5 execute, `1823a32` T7 skill-eval remediation). **Verdict: PASS** — all 10 FRs verified with evidence; 3 script selftests + `render-slides.mjs --selftest` green; all 4 repo lints green.

- **skill-eval Phase 6a:** `[D]` 24/24 pass; `[J]` 45/47 gated pass (floor 43), 1 remediation iteration (fixed `k-one-fact-one-home` — length-calibration now cites `distillation-contract.md#length-calibration`).
- **Browser-evidence gate:** live dogfood produced a 34.6s `.mp4`; self-check 5/5; visual judge confirmed the three retro/feedback surfaces — small bottom-anchored captions (FR-5), faint bottom-right watermark (FR-7), and a reused embedded SVG figure (FR-2).
- **accepted_residuals[] (2, both `[J]`, non-blocking, pre-existing):** `a-name-verb-or-gerund` (the `explainer-video` artifact-name-as-action convention matches the rubric's own `wireframes` pass example; renaming a shipped slash command is out of scope), `j-phase-slug-anchors` (all 7 phase headings carry `{#slug}` anchors and `j-phase-refs-resolve` is green; remaining bare "Phase N" mentions are narrative prose, the repo-wide convention).

Code merge + release happen at Loop 3 (`/complete-dev --epic 260614-7g0`).
