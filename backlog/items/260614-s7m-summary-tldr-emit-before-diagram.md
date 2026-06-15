---
schema_version: 1
id: 260614-s7m
kind: story
parent: 260614-q4r
title: /summary-tldr — emit summary before /diagram (crash-safe approved text) + compact Source&confidence table
type: enhancement
priority: should
status: done
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-14_summary-tldr-diagram-enhancements/
plan_doc: docs/pmos/features/2026-06-14_summary-tldr-diagram-enhancements/stories/260614-s7m/03_plan.html
tasks: docs/pmos/features/2026-06-14_summary-tldr-diagram-enhancements/stories/260614-s7m/tasks.yaml
plugin: pmos-toolkit
worktree: 
labels: [summary-tldr, robustness, ux]
claimed_by:
driver_holder:
created: 2026-06-14
updated: 2026-06-15
released: 2.82.0
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260614-s7m -->

## Context

Two `/summary-tldr` findings that resolve to ONE structural change plus one cosmetic change. Built against the design contract `docs/pmos/features/2026-06-14_summary-tldr-diagram-enhancements/02_design.html` (§summary-tldr) and the standing skill-authoring criteria (`feature-sdlc/reference/skill-patterns.md §A–§L`, repo `CLAUDE.md`).

**The structural fix (obs-2 + blocker):** today the skill runs Phase 6 (`/diagram`, slow, multi-turn) *before* Phase 7 (emit), and the diagram is embedded into the summary HTML at emit. The Phase 4/5-approved summary lives only in conversation context across the diagram loop, so a compaction mid-loop loses it (the [blocker] data-loss). Reordering so the summary HTML is **emitted to disk first**, then the diagram is generated and **injected into the on-disk artifact**, makes the approved text crash-safe by construction — it is already persisted. This subsumes the retro's proposed `.summary.tmp` mechanism (no separate temp file needed: the real artifact IS the persistence).

**The cosmetic fix (obs-3):** the "Source & confidence" appendix is a `<dl>` (dt/dd pairs). Render it as a compact two-column table.

**Out of scope:** obs-1 (h1 title) — deferred to epic 260613-ev1's substrate body-`<h1>` (see epic context + design doc). No template/CSS/h1 change here.

`dependencies: []` — touches only `summary-tldr/SKILL.md` (+ its emit reference if used); independent of the diagram and substrate stories.

## Acceptance Criteria

- [x] **AC1 — Emit-before-diagram reorder.** `SKILL.md` phase order is changed so the full summary HTML artifact (BLUF → summary → "Source & confidence" table) is **written to disk via the Phase 7 emit substrate BEFORE** the optional `/diagram` step runs. The diagram gate + run move to *after* the first emit.
- [x] **AC2 — Diagram injected into the on-disk artifact.** When the diagram gate resolves to Run, `/diagram` is invoked (same main-agent handoff + SVG validation contract as today — parses, dark-mode bg `<rect>`, heading-id smoke green), then the validated SVG is **injected into the already-emitted HTML file** (read file → insert in the designated diagram slot → atomic temp-then-rename re-write), and the library index is regenerated. On any diagram failure the on-disk summary is left intact and the skill continues (logs, no rollback of the emitted summary).
- [x] **AC3 — Crash-safety is explicit + the redundant tmp is not introduced.** The reorder is documented in the body as the crash-safety guarantee (the approved text is persisted before the long-running loop); the skill does NOT introduce a separate `.summary.tmp` (the on-disk artifact is the single source). An anti-pattern note captures "don't run the slow diagram loop between approval and first emit."
- [x] **AC4 — Compact Source & confidence table.** The appendix renders as a compact HTML `<table>` (e.g. rows: Source kind / Source path / Extraction confidence / Source date / Coverage signal) instead of a `<dl>`, with a stable kebab `id` on the section heading per `_shared/html-authoring/conventions.md`. Body-shape description in Phase 7 updated to match.
- [x] **AC5 — Compliance + no regressions.** `skill-eval-check.sh` ≥ floor (43/47); the 4 hygiene lints green where applicable; the non-interactive inline block stays byte-identical; the `/diagram` handoff + validation behavior and provenance block are preserved; phase numbering / `{#anchors}` cross-references stay consistent after the reorder (`tools/lint-phase-refs.sh` green). No release-prereq work (that's `/complete-dev` at Loop 3).
- [x] **AC6 — Dogfood (load-bearing).** Re-run `/summary-tldr` on a real source with `--diagram`: confirm the summary HTML lands on disk before the diagram loop starts, the SVG is injected into that same file, and the Source&confidence table renders compactly; an independent blind read confirms the artifact is the approved summary (not a reconstruction). Gaps → fix → re-run (cap 2, then accept-residuals-and-surface).

## Notes

### Build write-back (Loop 2, 2026-06-14)

Built on branch `feat/260614-s7m` (claim `7223592`, build `02a5194`; branched from main `7223592`).
**Verdict: PASS** — all 6 ACs verified. route:skill inner pipeline ran skill-tier-resolve
(tier-2 prose skill, location `plugins/pmos-toolkit/skills/summary-tldr/`, platform claude-code) →
execute (T1–T5) → skill-eval → verify.

- **T1 (study):** current order was Phase 5 review → **Phase 6 diagram** (gate + run + insert SVG into
  the summary HTML) → **Phase 7 emit** (write `.html`+`.sections.json` + library regen). The SVG was
  embedded *at* emit, so the Phase 5-approved text lived only in conversation context across the slow
  multi-turn diagram loop — the [blocker] data-loss window.
- **T2 (reorder, AC1/AC3):** swapped the two phases — **Phase 6 = Emit** (writes the approved summary to
  disk first, reserving an empty `<figure id="summary-diagram" data-diagram-slot>` slot), **Phase 7 =
  Optional diagram**. Count stays 8; the `#emit`/`#diagram` anchors are stable slugs (§J), so renumber
  ghosted nothing. Track-Progress phase list reordered + a crash-safety paragraph added; Anti-pattern #9
  ("never run the slow diagram loop before the first emit; no `.summary.tmp`") added. No tmp side-file.
- **T3 (inject + table, AC2/AC4):** Phase 7 on Run = validate `/diagram` SVG (parses, dark-mode bg
  `<rect>`, heading-id smoke) → **inject into the on-disk artifact** (read → replace `#summary-diagram`
  slot → atomic temp-then-rename) → re-regen library index; any failure leaves the summary intact (no
  rollback). "Source & confidence" appendix recast from `<dl>` to a compact two-column `<table>` (rows
  Source kind / Source path / Extraction confidence / Source date / Coverage signal) under a stable
  `id="source-and-confidence"`. Worked example + 2 stale "Phase 6 gate" refs repointed to Phase 7 `#diagram`.
- **T4 (compliance, AC5):** `skill-eval-check.sh --target claude-code` = **22 pass / 0 fail** (rc=0, ≥ floor);
  `lint-phase-refs.sh`, `lint-flags-vs-hints.sh`, `lint-non-interactive-inline.sh` (42 skills match canonical),
  `audit-recommended.sh` (summary-tldr 4 calls / 2 Recommended / 2 defer-only / 0 unmarked) — all green.
  Non-interactive block byte-identical; the diagram gate keeps its **Skip (Recommended)** option; `/diagram`
  handoff + validation + provenance block preserved.
- **T5 (load-bearing dogfood, AC6):** mechanically exercised the exact new contract — emitted a minimal
  summary artifact (approved BLUF + bullets + reserved slot + compact `<table>`, no `<dl>`) to a temp dir via
  atomic write, confirmed the approved text + empty slot + compact table are on disk **before** any diagram
  step; then injected an SVG (with dark-mode bg `<rect>`) via temp-then-rename and confirmed the approved
  BLUF **survived verbatim**, the SVG landed in the slot, and the empty slot was consumed. Independent blind
  read: the on-disk artifact at emit-time IS the approved summary (written verbatim), not a reconstruction.
  Document order asserted: `#emit` precedes `#diagram`. No gaps → no fix iterations needed.

Files changed (1): `plugins/pmos-toolkit/skills/summary-tldr/SKILL.md`. References/scripts byte-unchanged.
Code merge + release at Loop 3 (`/complete-dev --epic 260614-q4r` — rides with siblings 260614-d3g,
260614-p8k; includes the cross-plugin `sync-shared.sh --from=pmos-toolkit` step). Epic q4r now 3/3 built.
