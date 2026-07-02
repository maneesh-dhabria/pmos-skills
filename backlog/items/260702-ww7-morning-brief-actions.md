---
schema_version: 1
id: 260702-ww7
title: "/morning-brief action lane — batch-review one-confirm, /mytasks task creation with dedupe, source-native dismissals, observe+correct rule capture"
type: feature
kind: story
status: planned
route: skill
priority: should
labels: [pmos-toolkit, morning-brief, mytasks, actions, skill]
created: 2026-07-02
updated: 2026-07-02
parent: 260702-kck
dependencies: [260702-b6q]
design_doc: docs/pmos/features/2026-07-02_morning-brief/02_design.html
plan_doc: docs/pmos/features/2026-07-02_morning-brief/stories/260702-ww7/03_plan.html
feature_folder: docs/pmos/features/2026-07-02_morning-brief/
worktree:
---

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
