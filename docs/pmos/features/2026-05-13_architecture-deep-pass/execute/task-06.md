---
task_number: 6
task_name: "PY005-PY008 ruff additions (C901 / PLR0911-15 / PLR2004 / ARG001-002)"
task_goal_hash: 8304b64193728ee4ae26d647ea9eda1d47d0ffd82d81622907f9f2e4fce51ef6
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-22T03:00:00Z
completed_at: 2026-05-22T03:30:00Z
commit_sha: 67c4204
files_touched:
  - plugins/pmos-toolkit/skills/architecture/principles.yaml
  - plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/py-complexity/src/main.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/py-complexity/pyproject.toml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/py-complexity/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/py-branches/src/main.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/py-branches/pyproject.toml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/py-branches/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/py-magic-values/src/main.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/py-magic-values/pyproject.toml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/py-magic-values/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/py-unused-args/src/main.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/py-unused-args/pyproject.toml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/py-unused-args/.assert
---

## Key decisions

- **PY006 `check:` field is a comma-list of all four PLR codes** —
  mirrors PY003's `ruff:F403,F405` convention. The jq dispatcher map
  emits a single `PY006` rule_id for any of the four codes so callers
  see one logical rule, not four.

- **Per-fixture `pyproject.toml`** — needed for the Phase-1 py stack
  detector (looks for `pyproject.toml / setup.py / requirements*.txt`).
  Minimal in three fixtures; `py-branches` raises
  `[tool.ruff.lint.mccabe] max-complexity = 30` to keep C901 silent so
  PLR0912 fires alone (PLR0912 and C901 are inherently coupled at 13
  branches under ruff's defaults).

- **Two-assertion fixture contract (Q-review)** — every new `.assert`
  now checks (a) the target rule fires exactly once AND (b) no other
  `PY*` rule fires. Locks in fixture minimality so future ruff /
  principles.yaml drift cannot silently re-introduce sibling pollution.
  Guarded inside the FR-32 ruff-available branch — graceful-degrade
  preserved.

- **Identity/type predicates over integer comparisons** in
  `py-complexity` and `py-branches` — exercises C901/PLR0912 cleanly
  without firing PLR2004 from `x == N` magic literals.

## Deviations

None. The plan called for "each `.assert` asserts the rule fires once";
Q-review strengthening to "and no other PY rule fires" is additive,
fully within the spirit of the step.

## Verification

- `bash plugins/pmos-toolkit/skills/architecture/tests/run.sh` →
  **31 passed, 1 failed** (`ts-circular`, pre-existing baseline). T6
  contributed +4 passing fixtures.
- `bash -n plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh`
  → exit 0.
- Spot-check on each fixture (`jq '[.findings[] |
  select(.rule_id | startswith("PY"))] | map(.rule_id) | unique'`):
  - `py-complexity` → `["PY005"]`
  - `py-branches`   → `["PY006"]`
  - `py-magic-values` → `["PY007"]`
  - `py-unused-args`  → `["PY008"]`
- Inline FR-38: `l2_py_count == 8` (was 4 before T6).

## Review log

- **Spec compliance reviewer:** `✅ Spec compliant`. Verified jq
  rule_id ↔ source_citation maps are symmetric across all 8 new codes;
  --select list updated in both header echo and actual invocation;
  principles.yaml field order matches PY001-PY004.
- **Code-quality reviewer:** Changes required — 2 Important + 1 Minor:
  py-complexity and py-branches fixtures triggered sibling PY rules;
  `.assert` did not lock in minimality; `max-complexity = 10` was a
  no-op. All three applied in `67c4204`. PY006 source-URL asymmetry
  and message-length nits not addressed (not worth a churn cycle —
  PY006 inherently covers 4 codes; one URL cannot represent all).

## Commits

- `4418ef6` — `feat(T6): add PY005-PY008 ruff rules`
- `67c4204` — `fix(T6): minimal fixtures + lock minimality in .assert`
