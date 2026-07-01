---
released: 0.2.0
schema_version: 1
id: 260629-jfz
kind: story
parent: 260629-bm9
title: "/interview-feedback robustness — URL-input fallback, non-clobbering transcribe, scenario-aware written-submission, visible citation gate"
type: enhancement
priority: should
route: skill
dependencies: []
plugin: pmos-managerkit
status: done
feature_folder: docs/pmos/features/2026-06-29_interview-feedback-robustness/
plan_doc: docs/pmos/features/2026-06-29_interview-feedback-robustness/stories/260629-jfz/03_plan.html
tasks: docs/pmos/features/2026-06-29_interview-feedback-robustness/stories/260629-jfz/tasks.yaml
worktree:
claimed_by:
driver_holder:
build_branch: feat/260629-jfz
build_commit: e9c6493f
labels: [pmos-managerkit, interview-feedback, hiring, skill, from-feedback]
created: 2026-06-29
updated: 2026-07-01
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260629-jfz -->

## Context

The whole epic (260629-bm9) is one story: all five findings revise the single skill
`plugins/pmos-managerkit/skills/interview-feedback/` — its `SKILL.md` (Phases Resolve/Transcribe/Ground/Score/
Coach) plus the scripts `transcribe.sh`, `check-citations.mjs`, and `fill-scorecard.mjs`. Decisions, FRs, and
invariants live in the `design_doc:` (`../../02_design.html`). One `/execute` run.

The three script edits are independent of one another (T2 transcribe-guard, T3 check-citations submission tier,
T4 fill-scorecard submission block) and converge at the SKILL.md orchestration (T5). F3 and F4 fuse into the
scenario-aware written-submission assessment: the submission is classified once as **(A) post-live** — judged on
whether the candidate used the live-discussion context to structure & complete the missing parts (restate-only =
weak signal) — or **(B) pre-live-then-present** — judged on the first submission's intrinsic quality + clarity
of thought AND how the candidate defends it / reacts to probes / adjusts live. It is never scored in isolation.

## Acceptance Criteria

- [x] **AC1 (F1)** Phase [Resolve] classifies http(s) inputs at the top: known auth-walled hosts
  (`drive.google.com`, `docs.google.com`) and any 401/403/404/timeout emit exactly `Can't access <url> — please
  provide a local file path or paste the content.` and stop that input — no fall-through. A reachable URL
  downloads into `inputs/` verbatim. Under `--non-interactive` an inaccessible URL DEFERs (free-form).
- [x] **AC2 (F2)** `transcribe.sh` never overwrites an existing `transcript.refined.txt` by default — whisper
  output goes to `transcript.whisper.txt`, with a stdout signal naming both files + which has speaker
  attribution; `--force-transcribe` restores overwrite; Phase [Ground] selects the speaker-attributed transcript
  when both exist and surfaces the choice. A `tests/run-tests.sh` case covers the guard.
- [x] **AC3 (F3)** Phase [Score] detects a written submission (filename predicate or `--written-submission
  <path>`); a mandatory written-submission assessment block is rendered and the overall reco references it; a
  checklist gate (present? → classified? → assessed in context? → referenced in reco?) must pass before Score
  closes. A reco produced without the block when a submission was supplied fails the gate.
- [x] **AC4 (F4)** The submission is assessed by scenario, never in isolation: (A) post-live → three buckets vs
  the transcript (discussed / interviewer-directed / independently reached) + the judgment of whether the live
  context was used to structure & complete the missing parts, restate-only flagged WEAK; (B)
  pre-live-then-present → intrinsic quality + clarity of thought AND live defend/probe-response/adjust-on-the-fly
  from the transcript. The block shows how it shaped the dimension scores + reco.
- [x] **AC5 (F5/D5)** `check-citations.mjs` gains a `submission` known tier + an optional 3rd positional
  (submission file) verified verbatim ≥40 chars (a submission-tier citation with no file or non-verbatim quote
  FAILS); on pass it prints `✓ citations: N transcript, M notes[, K submission]`; the skill appends
  `<!-- citations verified: N transcript-tier, M notes-tier[, K submission-tier], <YYYY-MM-DD> -->` atop each
  output. Selftest covers the submission tier.
- [x] **AC6 (no-regression)** A run with a local transcript, no submission, no URL inputs converts
  byte-identically (INV-4); `check-citations.mjs` + `fill-scorecard.mjs` selftests + `tests/run-tests.sh` green
  with new assertions (INV-3); non-interactive block + tier-3 refusal marker byte-identical (INV-2/INV-5).
- [x] **AC7 (conformance)** Conforms to `skill-patterns.md §A–§L`; passes `skill-eval.md` (`[D]`+`[J]`); 4
  hygiene lints (`lint-non-interactive-inline`, `lint-flags-vs-hints` — the three new flags hinted + handled,
  `lint-phase-refs`, `audit-recommended` — scenario ask has a Recommended option, URL-fallback ask is defer-only
  tagged) green. No release-prerequisite tasks in waves (§G — `/complete-dev` owns those).

## Notes

- Build sequence: the three script edits (T2/T3/T4) are the parallel core; the SKILL.md orchestration (T5) cites
  the now-final scripts; T6 is conformance + byte-identical no-regression + skill-eval + lints. See `tasks.yaml`
  waves.
- Confidentiality: candidate data is confidential — every test/fixture is synthetic; never commit candidate
  content (INV-5).

## Build outcome (2026-06-30)

BUILT — singleton epic `260629-bm9` now 1/1, awaiting Loop-3. All 5 FRs landed in
`plugins/pmos-managerkit/skills/interview-feedback/`; every change additive + signal-gated (no-submission/no-URL
run byte-identical, INV-4):

- **F1** Phase[Resolve] step 0 URL-classification — auth-walled hosts emit the exact
  `Can't access <url> — please provide a local file path or paste the content.` line; non-interactive DEFERs
  (`<!-- defer-only: free-form -->`).
- **F2** `transcribe.sh` preserve guard (`resolve_transcript_target` → `transcript.whisper.txt`, never clobbers a
  curated `transcript.refined.txt`) + `--force-transcribe`; Phase[Ground] selects the speaker-attributed source.
- **F3/F4** Phase[Score] detects a submission (`--written-submission` or filename), classifies the scenario once
  (post-live vs pre-live; Recommended→AUTO-PICK; `--submission-type` override), injects a scenario-stamped
  `data-card="submission-assessment"` block (`fill-scorecard.mjs`) + a 4-box checklist gate + reco reference —
  never assessed in isolation.
- **F5** `check-citations.mjs` submission tier (verbatim ≥40 chars, 3rd positional) + visible `✓ citations:` line
  + one-line `<!-- citations verified: … -->` audit comment.

Selftests: transcribe 13/13, check-citations 7/7, fill-scorecard 28/28, run-tests 9/9. skill-eval [D] EXIT0;
lint-non-interactive / audit-recommended / lint-flags-vs-hints / lint-phase-refs PASS. [J] judge VERDICT PASS
(all 7 ACs, 0 blockers, 3 cosmetic nits — 1 told-not-shown nit fixed). INV-2 byte-frozen (NI block + tier-3
refusal marker unchanged). impl `e9c6493f` on `feat/260629-jfz` (worktree kept). Next: Loop-3
`/complete-dev --epic 260629-bm9`.
