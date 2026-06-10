# /plan contract — what /execute reads from a plan document

Loaded by `execute/SKILL.md` (Phase 1 step 2 and the per-task loop) when a plan carries
v2 frontmatter or per-task fields. Field names here are the contract with `/plan`'s emit
side — keep them byte-identical when editing either skill.

## Plan frontmatter

- `commit_cadence` — defaults to `per-task`. Other recognized values: `per-phase`
  (commit only at phase boundary), `manual` (defer commits to user). Honor whichever
  is set.
- `contract_version` — version-skew shim:
  - Absent OR < 1: the plan was written by /plan v1 — emit a per-run `WARN:` line on
    stderr: `[/execute] Plan contract_version missing or < 1 — running back-compat shim.
    Some new task fields will be ignored. Re-generate plan with /plan v2 to consume the
    full contract.` Continue execution; do not halt.
  - Greater than the highest version this /execute knows: halt with platform-aware
    error: `[/execute] Plan contract_version=<n> is newer than this skill supports
    (max=<m>). Upgrade the pmos-toolkit plugin.`

## Per-task fields

/plan v2 emits per-task fields beyond the legacy `**Goal:** / **Spec refs:** /
**Files:** / **Steps:**`. /execute reads them as follows; on missing-but-optional
fields, emit a per-task `WARN:` line on stderr (back-compat shim) and continue:

- `**Depends on:**` — task IDs whose completion gates this task. /execute refuses to
  start the task while any dependency is `not-started` / `in-flight` / `failed`. (If
  absent, /execute assumes sequential ordering by task index.)
- `**Idempotent:**` — `yes` or `no — recovery: <substep>`. `no` without a recovery
  substep → halt with error (an un-resumable task crashing mid-way must have a
  recovery path).
- `**Requires state from:**` — task IDs whose runtime artifacts (DB rows, generated
  files) this task consumes. /execute refuses to run the task if any cited task lacks
  a `done` log.
- `**TDD:**` — three-valued `yes — new-feature` / `yes — bug-fix` / `no — <reason>`.
  Bug-fix path uses the 4-step shape (regression test → fail → fix → pass). The plan
  body's `**Bug-fix TDD shape**` paragraph is informational; /execute follows the
  per-task value.
- `**Data:**` — fixtures / seed rows / mock payloads the task consumes; /execute
  surfaces these as part of the in-flight log's `body` section.
- `**Wireframe refs:**` — UI screens this task implements; /execute uses them in the
  runtime-evidence step (Playwright navigation targets).

## Suffixed task IDs

/plan v2 may emit suffixed IDs like `T26a`, `T29c`, `T43a` (split history from review
loops). /execute parses the regex `T([0-9]+)([a-z]?)` against task headings; per-task
log files use `task-<N><suffix>.md` (e.g., `task-26a.md`); the frontmatter
`task_number` accepts a string when a suffix is present and an integer otherwise.

## Defect handoff

When a task cannot be implemented because the plan itself is defective (e.g., `Files:`
references don't exist, a prerequisite task produced a contract this task can't
consume), /execute writes a defect file at
`{feature_folder}/03_plan_defect_<task-id>.md`:

```markdown
---
task_id: T<N>[<suffix>]
detected_at: <ISO timestamp>
detected_by: /execute (this run)
---

## Defect

[One paragraph stating what the plan got wrong.]

## Suggested fix

[What /plan should do differently. Be specific — file paths, function signatures, the
contract that needs to change.]

## Reproducer

[Bash command(s) that show the contradiction.]
```

The user resumes by running `/plan --fix-from <task-id>`. /execute deletes the defect
file when the previously-defective task succeeds in a subsequent /execute run — the
deletion confirms the fix landed.

---

*Spec lineage: extracted 2026-06-10 (skill-design review P1/P2) from `execute/SKILL.md`'s
inline /plan-v2 contract block. Field semantics, the back-compat shim, suffixed IDs, and
the defect lifecycle trace to `docs/pmos/features/2026-05-08_plan-skill-redesign/` (T34–T37,
FR-35, FR-56, FR-100b, FR-104, FR-110, decisions P5/P11, spec §7.5).*
