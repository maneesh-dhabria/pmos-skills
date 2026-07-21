---
schema_version: 1
id: 260721-z5n
kind: story
parent: 260721-k1x
title: "/interview-feedback artifact hygiene — completeness gate + draft stamp for unfilled promised sections, and check-citations.mjs --stamp owning the proof-of-pass comment"
type: enhancement
priority: should
route: skill
dependencies: []
plugin: pmos-managerkit
status: done
feature_folder: docs/pmos/features/2026-07-21_interview-scoring-calibration/
plan_doc: docs/pmos/features/2026-07-21_interview-scoring-calibration/stories/260721-z5n/03_plan.html
tasks: docs/pmos/features/2026-07-21_interview-scoring-calibration/stories/260721-z5n/tasks.yaml
worktree:
claimed_by:
driver_holder:
build_branch: feat/260721-z5n
build_commit: 0c131f71
labels: [pmos-managerkit, interview-feedback, hygiene, gates, skill, from-feedback]
created: 2026-07-21
updated: 2026-07-21
released: v0.8.0
---

<!-- status: built at Loop 2 on 2026-07-21; branch feat/260721-z5n @ 0c131f71, UNMERGED/UNPUSHED. /verify verdict PASS — report at docs/pmos/features/2026-07-21_interview-scoring-calibration/stories/260721-z5n/verify/2026-07-21-review.html. Releases with epic 260721-k1x once 1a4 is done. -->

## Context

The retro's **friction** and **nit** findings. Both are artifact-hygiene defects with no dependency on the
calibration work, and they touch different files — split out of `260721-jb6` in the grill so one `skill-eval`
does not have to span a new gate script *and* two unrelated hygiene fixes. Buildable immediately, in parallel
with everything else in the epic.

**F2 [friction] — a promised section shipped empty.** The "Observer's independent read" block shipped with an
unfilled `[ … your observations go here ]` placeholder while the run reported complete, across all three passes —
and the observer had explicitly asked to share their observations. An empty promised section reads as *"nothing to
say"*, which is the opposite of the truth.

**F3 [nit] — a hand-maintained count drifted.** The proof-of-pass comment
`<!-- citations verified: N transcript-tier, M notes-tier, DATE -->` is written by the **model** today, so it went
stale on every correction and was hand-patched 19 -> 22 -> 24. §K one fact, one home: the count cannot drift if no
human ever types it.

Decisions D4 and D5, and FR-9/FR-10, live in the `design_doc:` (`../../02_design.html`).

## Surfaces

- `plugins/pmos-managerkit/skills/interview-feedback/SKILL.md` — Phase Score (`#score`), Phase Coach (`#coach`);
  removes the instruction telling the model to author the citation comment
- `plugins/pmos-managerkit/skills/interview-feedback/scripts/check-citations.mjs` — `--stamp`
- `plugins/pmos-managerkit/skills/interview-feedback/reference/interviewer-notes-skeleton.html` and the scorecard
  skeleton — placeholder/slot conventions the completeness scan reads

## Acceptance Criteria

- [ ] **AC1 (FR-9)** Before either artifact is declared complete, a completeness scan runs over both and detects
  unfilled promised content: bracketed placeholder prose (e.g. `[ … your observations go here ]`), empty
  `data-input` slots, and un-substituted `{{…}}` tokens. A run with the observer block left empty cannot report
  complete.
- [ ] **AC2 (FR-9)** Interactive: the scan prompts to capture the missing content in the same run (the observer's
  independent read is the motivating case). Declined, or under `--non-interactive`: the artifact is stamped
  `draft — pending <slot>` naming the specific unfilled slot.
- [ ] **AC3 (FR-9)** The gate never fabricates the missing content and never silently passes an artifact with a
  hole in it (INV-4). A fully-filled artifact is unaffected — no stamp, no prompt, byte-identical to today.
- [ ] **AC4 (FR-10)** `check-citations.mjs --stamp` writes/patches the
  `<!-- citations verified: <N> transcript-tier, <M> notes-tier[, <K> submission-tier], <YYYY-MM-DD> -->` comment
  into the target HTML itself on exit 0. Idempotent: re-running replaces the existing comment in place rather than
  appending a second one, and a second run on unchanged input produces a byte-identical file.
- [ ] **AC5 (FR-10)** `--stamp` writes **only** on exit 0 — a failing gate leaves the file untouched, so a stale or
  absent comment can never be read as proof of a pass that did not happen.
- [ ] **AC6 (FR-10)** `SKILL.md` invokes the gate with `--stamp` in both phases and no longer instructs the model
  to hand-write the comment; the counts have exactly one home (§K). `--stamp` is a script argument, not a skill CLI
  surface — `argument-hint` is unchanged (INV-7).
- [ ] **AC7** The citation gate's verification semantics are untouched — tier model, ≥40-char verbatim rule,
  blocking STOP-before-done behaviour and existing tests all unchanged; only who writes the proof comment moves
  (INV-3). `--selftest` covers stamp-insert, stamp-replace (idempotence), and no-stamp-on-failure.
- [ ] **AC8** `skill-eval` passes; all four repo hygiene lints green; the frozen non-interactive block
  byte-identical.

## Notes

**Built + verified 2026-07-21 (Loop 2).** Verdict PASS, 8/8 ACs. Branch `feat/260721-z5n` @ `0c131f71`,
UNMERGED/UNPUSHED — releases with epic `260721-k1x`.

Follow-up raised against the epic, deliberately **not** folded into this story: the completeness gate
inspects `data-input` elements, but a dimension's score lives in `<div class="scale"><span data-v="1">…`,
which carries no `data-input`. A scorecard with every slot filled and no dimension scored passes this gate.
AC1 enumerates three shapes and scoring is `260721-jb6`'s surface, so widening z5n would have crossed a
sibling story. Worth checking whether jb6's sweep gate catches a *never-scored* dimension — its rules are
written in terms of "every scored `data-dim`". See `verify/2026-07-21-review.html#followups`.
