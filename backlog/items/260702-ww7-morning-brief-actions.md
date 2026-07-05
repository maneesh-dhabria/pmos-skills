---
schema_version: 1
id: 260702-ww7
title: "/morning-brief action lane — batch-review one-confirm, /mytasks task creation with dedupe, source-native dismissals, observe+correct rule capture"
type: feature
kind: story
status: done
released: 2.101.0
route: skill
priority: should
labels: [pmos-toolkit, morning-brief, mytasks, actions, skill]
created: 2026-07-02
updated: 2026-07-05
parent: 260702-kck
dependencies: [260702-b6q]
design_doc: docs/pmos/features/2026-07-02_morning-brief/02_design.html
plan_doc: docs/pmos/features/2026-07-02_morning-brief/stories/260702-ww7/03_plan.html
feature_folder: docs/pmos/features/2026-07-02_morning-brief/
worktree:
branch: feat/260702-ww7
build_commit: 2c610f57
---

## Build result (2026-07-05)

**PASS** — /morning-brief action lane built on feat/260702-ww7 (b6q dep-merged). All 7 ACs met.

- **AC1 batch confirm** — Phases 8–10 (confirm→act→correct); one numbered editable proposal
  {create/dismiss/leave}, confirmed once; proposal printed in the brief (render-brief marker).
- **AC2 create + dedupe** — `scripts/create-task.mjs` mints via /mytasks' own lib (byte-compatible id/shape/serializer, source link in `links` + body); `scripts/dedupe.mjs` exact source-link match + SKILL-layer title-similarity judgment.
- **AC3 source-native dismissals** — Phase 9 step 2: runtime-resolved connector actions per §4; per-action verbatim report; failure derives back next run (INV-1).
- **AC4 observe+correct** — Phase 10: diff confirm-step edits → synthesize → per-rule approval → `lib.appendRuleToStore`.
- **AC5 NI defer** — `#defer` contract; both mutation asks tagged `defer-only: destructive`; NI-defer fixture proof 6/6.
- **AC6 tests** — dedupe selftest 10/0; b6q read-only lane regression-free (lib 40/0, render-brief 18/0); create-task 15/0.
- **AC7 conformance** — skill-eval `[D]` all pass + `[J]` all pass (independent reviewer, no residuals); 4 hygiene lints + audit-recommended (4 calls, 4 defer-only) green.

INV-5 added to the invariants; description/verbs/§H updated; phases renumbered 4–12.
**Next: Loop-3 `/complete-dev --epic 260702-kck`** merges b6q + ww7 (both feat branches unmerged).

## Context

The mutation half of `/morning-brief`: after the brief is emitted (story 260702-b6q), the run proposes one
editable action set, confirms once, acts, and captures corrections as candidate rules. Grounded in the epic
`design_doc:` (`02_design.html`) §6 steps 5–7, §9 interop, §10 defer paths, decisions D1/D4. Invariants
INV-1 (a failed/skipped action derives back next run), INV-5 (confirm-gated mutations), INV-6 (`/mytasks`
sole system of record) bind here. Extends the SAME `SKILL.md` + scripts as b6q — hence the dependency
(claim-time D9 merge makes b6q's code present in this story's worktree).

## Acceptance Criteria

- [ ] **AC1 — batch confirm.** The bare run continues past brief emission into §6 step 5: one numbered
  editable proposal {create-task[], dismiss[], leave[]}, edited by number, confirmed ONCE (`/mytasks
  import` preview→confirm shape, D4). Nothing executes unconfirmed (INV-5); the proposal is also printed
  in the brief for reference (§8).
- [ ] **AC2 — task creation + dedupe.** Confirmed creates go through `/mytasks`' own lib/grammar so minted
  items are byte-compatible, each carrying a source link (INV-6). Dedupe before proposing: exact
  source-link match (script, §H) then title-similarity (judgment); matches are downgraded to
  "already tracked" and shown in the lane.
- [ ] **AC3 — source-native dismissals.** Confirmed dismissals execute each source's declared native action
  (§4: archive email / respond invite / resolve comment). Per-action success/failure reported verbatim; a
  failed dismissal leaves the item to derive back as carryover next run (INV-1).
- [ ] **AC4 — observe + correct.** User re-tiering / re-categorization during the confirm step is offered
  back as candidate rules; approved ones append to `rules.md` (FR-9). No silent rule writes.
- [ ] **AC5 — non-interactive defer.** Under `--non-interactive` the confirm is `defer-only: destructive`:
  the proposed set lands in the brief + OQ flush, zero mutations execute, rule capture defers (§10).
- [ ] **AC6 — tests.** Dedupe exact-match script selftest green; b6q's suites still green un-edited
  (no regressions to the read-only lane).
- [ ] **AC7 — conformance.** `skill-patterns.md §A–§L`; `skill-eval` `[D]`+`[J]` pass (or residuals proven
  pre-existing); 4 hygiene lints + `audit-recommended.sh` green.
