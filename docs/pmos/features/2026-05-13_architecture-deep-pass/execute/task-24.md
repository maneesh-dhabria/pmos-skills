---
task_number: 24
task_name: "Fixture suite update — legacy-principles-severity fixture + .assert sweep"
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-22T14:27:00Z
completed_at: 2026-05-22T14:40:00Z
commit_sha: bb55a89
files_touched:
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/legacy-principles-severity/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/legacy-principles-severity/.pmos/architecture/principles.yaml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/legacy-principles-severity/src/main.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/l1-security/.assert
---

## Key decisions

- **The "bulk sweep" was already done.** The plan called for renaming
  every retained `.assert` file's `severity:` reference to `disposition:`,
  anticipating widespread residue from the v1→v2 axis swap. In practice,
  the survey across all 45 retained fixtures found exactly TWO surviving
  references: one cosmetic comment in `l1-security/.assert` line 1
  ("U009/U010 block-severity rules fire") and the `--no-adr` rejection
  test in `selector-required/.assert` (which is correct under v2 — the
  flag should be rejected). T1's principles.yaml rename + run-audit.sh
  loader rewrite + T21's two .assert patches (schema-valid +
  selector-required) had together absorbed the rest. The suite at 45/1
  was already coherent.

- **Added the missing `legacy-principles-severity/` fixture (E7
  coverage).** Plan §14.2 lists `legacy-principles-severity` among the
  13 new fixtures expected for v2, but none of T1-T22 ever wrote it.
  The loader at `run-audit.sh:338-346` rejects user-L3 rules that
  carry `severity:` without `disposition:` and the rejection message
  is verbatim per spec E7. Without a fixture covering this path, a
  future loader regression would slip through silently. T24 closes
  the gap with a minimal three-file fixture: `src/main.py` (any
  Python file to scan), `.pmos/architecture/principles.yaml`
  (one rule with `severity: warn`, no `disposition:`), and an
  `.assert` that asserts exit 64 plus the two stderr fragments
  ("legacy 'severity:' key" and "rename to 'disposition:'").

- **Skipped the reviewer round** per the post-T23 checkpoint
  description ("Should be a single implementer round (no reviewer
  round if it's purely a string-replace verified by `tests/run.sh`
  exit)"). The task is mechanical (3 new fixture files + 1-line
  comment rewrite); correctness is end-to-end verified by the suite
  going from 45/1 to 46/1.

## Deviations

None substantive. The plan implied a larger sweep; the survey
revealed the work was already done. The plan-listed
`legacy-principles-severity` fixture was outstanding; this task
shipped it.

## Verification

- `find …/tests/fixtures -maxdepth 1 -mindepth 1 -type d | wc -l`
  → 46 (was 45 before T24).
- `bash plugins/pmos-toolkit/skills/architecture/tests/run.sh` →
  **46 passed, 1 failed** (pre-existing `ts-circular` baseline; the
  new fixture passes on first run).
- `grep -rn --include=.assert -E '"severity"|\.severity\b|severity[[:space:]]*:'
  plugins/pmos-toolkit/skills/architecture/tests/fixtures/` → 0 hits
  (the `l1-security/.assert` comment is the only place the WORD
  `severity` could have remained; renamed).
- `grep -rn --include=.assert -E 'adrs_written|adr_path|adr-template|check-determinism|frontend_declarative_coverage'
  plugins/pmos-toolkit/skills/architecture/tests/fixtures/` → 0 hits.
- `selector-required/.assert` Case 6 still asserts the `--no-adr`
  rejection (FR-67) — intentional and unchanged.

## Review log

- No reviewer round dispatched. The change is mechanical and
  end-to-end verified by the fixture suite. Both spec-compliance
  ("E7 path is now covered") and code-quality ("no new prose, no
  decorative banners, minimal fixture files") concerns are
  satisfied by inspection.

## Open carry to later tasks

- **TN (final verification):** run `skill-eval-check.sh` against the
  architecture skill; reconcile the two pre-existing fail rows
  (`c-asset-layout`, `e-scripts-dir`) — either fix them or document
  as accepted residuals at Phase 6a. Run the book-companion regression
  (manual gate per /verify Phase 7; not part of the fixture suite).
  Confirm the full fixture suite still reports 46/1 with no new
  failures introduced by T22/T23/T24.

## Commits

- `bb55a89` — `test(T24): add legacy-principles-severity fixture + l1-security comment touch-up`

(No Q-fix commit. No reviewer round dispatched per the post-T23
checkpoint's pre-agreed minimal-cycle path for T24.)
