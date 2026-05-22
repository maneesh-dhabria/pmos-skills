---
task_number: 18
task_name: "--deep subagent dispatch + return-shape validation + dispatch_failed"
task_goal_hash: c4f7a0b3d6e9c2f5a8b1d4e7f0a3c6b9d2e5f8a1c4b7e0d3f6a9c2b5e8d1f4a7
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-22T10:00:00Z
completed_at: 2026-05-22T10:45:00Z
commit_sha: 83e7931
files_touched:
  - plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh
  - plugins/pmos-toolkit/skills/architecture/tools/dispatch-deep-pass.sh
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-validation-fail/
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-happy-path/
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-empty-candidates/
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-malformed/
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-dispatch-failed/
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-finalize-gate/
---

## Key decisions

- **`dispatch-deep-pass.sh` is a prompt assembler, not a Task
  dispatcher.** The wrapper reads the payload tmpfile and writes a
  `<payload>.prompt` sidecar with system prompt = vocab body + return
  shape + instructions. The SKILL.md orchestrator (T23) reads the
  sidecar, calls the actual Task tool, and writes the response to
  `<payload>.result`. This split keeps the bash side simple (no
  Task-tool integration from bash) and makes the SKILL/run-audit
  contract obvious. The wrapper exits 64 if
  `reference/deepening-vocabulary.md` is missing (T22 ships it) so
  the dependency is loud.

- **NFR-09 layer 2 (subagent Read-call interception) is
  architecturally infeasible from a bash wrapper** and documented in
  the dispatch script header as the spec's NFR-09 degradation path
  ("where the harness platform does not expose mid-tool-call
  interception"). T17's layer-1 (denylist filter at metadata build)
  remains the binding contract; layer-2 advisory text lives in the
  Task subagent's system prompt.

- **`--deep-finalize-result <path>` is the production flag.**
  `--deep-finalize-from <path>` is a test-only alias gated behind
  `FIXTURE=1`. Plan L697 (Loop 2 N2) requires both the gate and an
  Anti-Pattern doc note in SKILL.md (T23).

- **FR-25 validation in a single Python heredoc that always exits 0.**
  Graceful failure paths (E5 malformed JSON, E5b dispatch_failed,
  E6 no_candidates, FR-26 validation_failed) emit a complete
  `deep_pass` JSON block to stdout + a one-line stderr warning naming
  the violation. The bash side consumes the JSON without `set -e`
  gymnastics.

- **`skipped_detail` field added beyond strict FR-29 enum.** FR-29
  fixes the `skipped_reason` enum (machine-readable signal);
  `skipped_detail` is a separate optional human-readable field naming
  the specific failure. Per Q-reviewer adjudication: load-bearing for
  debugging, not a YAGNI violation. Should be documented in the
  schema section of the spec (follow-up).

- **Plan L698 (any miss) supersedes spec §6.1 L156 ">50%").** FR-26
  itself at L347 says "any" — plan and FR-26 are consistent; the L156
  prose is doc drift. Implementation follows the strict "any miss"
  contract.

- **Q-fix #1: dropped unused `DEEP_FINALIZE_PAYLOAD` flag.** The
  parser captured `--deep-finalize-payload <tmpfile>` but no
  downstream code read it. The payload tmpfile is consumed entirely
  by `dispatch-deep-pass.sh` / SKILL.md before run-audit.sh's
  finalize step. YAGNI; removed three lines.

- **Q-fix #2: hoisted `seed_hint_json` + collapsed fallback.**
  Original had three computations of `seed_hint_json` (in --deep-prep,
  in finalize, in outer fallback) and an inner-else "T17 transitional"
  block that duplicated the outer default. Hoisted the computation to
  the top of `if [ "$DEEP" = "1" ]`; dropped the two redundant
  recomputes; dropped the inner-else (subsumed by the outer
  default). Net -12 LOC + clearer control flow.

- **Validation-fail fixture uses `src/nonexistent_hallucinated.py`**
  rather than `/etc/passwd` (which exists on macOS — would pass check
  (a)). Host-independent failure mode.

- **Happy-path fixture's evidence is a non-trivial Python literal**
  (`db.execute("SELECT * FROM users")`) that exercises the
  fixed-string grep across quoted text. Confirms `grep -F -q --`
  handles embedded quotes correctly.

## Deviations

- `tools/dispatch-deep-pass.sh` writes a `.prompt` sidecar rather
  than directly invoking the Task tool. Reason: bash cannot call
  Task; SKILL.md (T23) is the actual dispatcher. The split is
  documented in the wrapper header.

## Verification

- `bash -n plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh`,
  `bash -n .../dispatch-deep-pass.sh` → exit 0.
- `bash plugins/pmos-toolkit/skills/architecture/tests/run.sh` →
  **52 passed, 1 failed** (`ts-circular`, pre-existing baseline).
  +6 over T17's 46 passed (deep-pass-validation-fail, happy-path,
  empty-candidates, malformed, dispatch-failed, finalize-gate).
- Smoke (validation-fail): `FIXTURE=1 audit . --deep --deep-finalize-from mock.result`
  → `deep_pass.skipped_reason == "validation_failed"` + stderr warning
  naming the hallucinated module. Mechanical findings present.
- Smoke (happy-path): candidate preserved verbatim with
  `classification: "leaky"`, `skipped_reason: null`, `dispatched_at`
  ISO-8601 UTC.
- Smoke (finalize-gate): without `FIXTURE=1` →
  `ERROR: unknown flag: --deep-finalize-from` + exit 64.

## Review log

- **Spec compliance reviewer:** `✅ Spec compliant`. All 10 contract
  points pass: dispatch wrapper present + executable + degradation
  documented; paired flags + boundary checks; FIXTURE gate;
  FR-25 four checks (path, evidence grep, classification enum,
  outcome enum); FR-26 hard-fail on any miss with stderr detail;
  E5/E5b/E6 all surface as graceful skipped_reason values; happy
  path preserves candidates verbatim with ISO-8601 dispatched_at;
  no T19 promotion leak; fixtures non-trivial. Informational:
  usage string drift (handled in Q-fix).
- **Code-quality reviewer:** `🛠 Changes required` — 2 Minor:
  - **Minor #1** unused `DEEP_FINALIZE_PAYLOAD` flag — applied
    (dropped entirely; YAGNI).
  - **Minor #2** duplicate fallback at the bottom of the --deep
    block — applied (hoisted seed_hint_json; collapsed inner-else
    into the outer default).
  - Accepted as-is: stderr+detail duplication (different audiences),
    grep subprocess (fine at this scale), 5-line WHY comment at
    finalize intro (non-obvious graceful-failure contract),
    `skipped_detail` extension (load-bearing for debugging).

## Open carry to later tasks

- **T19:** wire DEEP_LEAKY / DEEP_SHALLOW promotion + size-class
  demotion (U001/U002/PY005/PY006 → wont_fix + deep_pass_cleared:true)
  on `deep+reappears` candidates. Consume `deep_pass.candidates[]`
  already validated by T18.
- **T22:** ship `reference/deepening-vocabulary.md`. Today the
  dispatch wrapper exits 64 if it's missing — the SKILL.md side will
  surface this loud.
- **T23:** wire SKILL.md to invoke `dispatch-deep-pass.sh` →
  Task subagent → `run-audit.sh --deep-finalize-result <path>`.
- **Spec doc drift:** L156 says ">50% threshold" but FR-26 says
  "any miss". Plan + implementation follow "any miss"; a future
  spec patch should align the prose.
- **`skipped_detail` field** should be added to the schema section
  of the spec so it stops looking like an undeclared field.

## Commits

- `aa37b8d` — `feat(T18): --deep subagent dispatch wrapper + return-shape validation`
- `83e7931` — `fix(T18): drop unused --deep-finalize-payload + collapse fallback per Q-review`
