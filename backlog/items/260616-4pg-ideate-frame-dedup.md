---
schema_version: 1
id: 260616-4pg
kind: story
parent: 260616-bq9
title: "/ideate frame-dedup — Frame phase consumes /shape's HMW+JTBD problem-brief when present instead of re-deriving it"
type: enhancement
priority: should
route: skill
dependencies: [260616-p7b]
plugin: pmos-toolkit
status: done
released: 2.85.0
feature_folder: docs/pmos/features/2026-06-16_shape-skill/
plan_doc:
tasks: docs/pmos/features/2026-06-16_shape-skill/stories/260616-4pg/tasks.yaml
worktree: /Users/maneeshdhabria/Desktop/Projects/agent-skills-260616-4pg
claimed_by:
driver_holder:
labels: [pmos-toolkit, shape, ideate, frame-dedup]
created: 2026-06-16
updated: 2026-06-17
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260616-4pg. DEP: 260616-p7b (/shape's frame must exist). Independent of 260616-xqm. -->

## Context

Third story of epic `260616-bq9` (depends on `260616-p7b`; independent of `260616-xqm` — buildable
in parallel once `/shape` lands). `/ideate`'s Frame phase currently re-derives the HMW + JTBD
framing from scratch. When a `/shape` problem-brief is present (passed by the pipeline or
discoverable), `/ideate` should **consume that frame** instead of re-deriving it — no duplicated
framing work, and the solution-exploration step inherits the problem shape `/shape` converged on.

Absence of a `/shape` frame must be a clean fallback: `/ideate` re-derives as it does today, so the
skill remains usable standalone.

## Scope (this story)

- `plugins/pmos-toolkit/skills/ideate/SKILL.md` — Frame phase: detect + adopt a `/shape`
  problem-brief (HMW + JTBD + chosen framing) when present; fall back to deriving when absent.
- Cross-reference contract with `/shape`'s artifact (what fields `/ideate` reads).

## Acceptance Criteria

- `/ideate` consumes `/shape`'s HMW+JTBD frame when a problem-brief is present instead of
  re-deriving it; the framing is not duplicated.
- When no `/shape` frame is present, `/ideate` falls back to deriving the frame as today (standalone
  usability preserved).
- `/ideate` still passes `skill-eval.md`.

## Build outcome (2026-06-17, Loop-2)

**BUILT — all ACs met.** Branch `feat/260616-4pg` @ `075e71d` (worktree
`agent-skills-260616-4pg`, branched from main + merged dep `feat/260616-p7b` to bring `/shape` in;
KEPT for Loop-3). Single-file instruction edit to `plugins/pmos-toolkit/skills/ideate/SKILL.md`
Phase 1 (`#frame`) + one dogfood harness.

- [x] AC1 — `/ideate`'s Frame phase ADOPTS a present `/shape` brief's frame instead of re-deriving:
  detection = `<meta name="pmos:skill" content="shape">` (via `--from-shape <path>` for the pipeline,
  else feature-folder discovery); reads HMW + JTBD (`#felt-problem`), chosen framing (`#framings`),
  sharpest problem (`#tldr`), and skips step 1's derivation → no duplicated framing work. Cites
  `/shape`'s artifact contract (§K — reads the fields, does not re-shape the problem).
- [x] AC2 — clean fall-back: no brief resolves → derive the frame exactly as standalone (the
  existing numbered steps 1–3 are untouched; the `defer-only` AskUserQuestion adjacency preserved →
  `audit-recommended` still 8 calls / 6 Recommended / 2 defer-only / 0 unmarked).
- [x] AC3 — `/ideate` still passes skill-eval: `skill-eval-check.sh --target claude-code` **EXIT 0**,
  all 22 applicable [D] checks pass, **zero residuals** (`--from-shape` hinted + body-handled →
  `i-hint-contract-only` pass; desc 962 chars). 4 repo lints green.

**Dogfood (load-bearing, both paths against `/shape`'s REAL p7b brief):** ADOPT extracts all four
contract fields and the adopted HMW matches `/shape`'s framing verbatim-ish (genuinely reused, not
re-derived); FALL-BACK correctly rejects a non-`/shape` (`pmos:skill=ideate`) artifact → derives as
today. Harness `stories/260616-4pg/dogfood/frame-adopt-dogfood.mjs` EXIT 0 — it fails on any drift in
`/shape`'s section ids or field labels, so it pins the cross-skill contract. **Verdict: SHIP.**

**Next:** Loop-3 `/complete-dev --epic 260616-bq9` rides this + `p7b` + `xqm` (once `xqm` is built —
the `/feature-sdlc` front-gate rewiring is the only remaining bq9 story).
