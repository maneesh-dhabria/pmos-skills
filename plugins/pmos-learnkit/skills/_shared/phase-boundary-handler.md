# Phase Boundary Handler Protocol

> **<MUST READ END-TO-END>** Calling skills MUST open and read this file before implementing Phase 2.5. Do not infer boundary-handler behavior from the calling skill's text. The HALT_FOR_COMPACT return is **mandatory on a green boundary** — skipping it defeats the compact discipline that phase boundaries exist to provide. If you're tempted to emit an advisory and continue executing, STOP and re-read the Compact Behavior section. </MUST READ END-TO-END>

Shared protocol for `/execute` Phase 2.5 (Phase Boundary Handler). Describes the gating conditions, the full algorithm (verbatim from spec §5.6), the phase log frontmatter format (verbatim from spec §5.2), the /verify invocation contract, and compact behavior.

---

## When to Fire

Phase 2.5 runs **after** each task's `done` log is written in Phase 2. It is a gate, not a loop — it fires at most once per completed task and skips immediately under either of these conditions:

1. **No `## Phase N` headings in the plan.** If `plan.phases` is empty (flat T1…TN plan), return `CONTINUE` without reading any phase state. Flat plans incur zero overhead from this handler.

2. **Completed task is not the last task in its phase.** If `completed_task.number != phase.task_numbers[-1]`, the phase is still in progress. Return `CONTINUE`.

When both conditions are clear — the plan has phases AND the completed task is the final task in its phase — proceed to the Algorithm below.

---

## Algorithm

```
function handle_phase_boundary(completed_task, plan, feature_folder):
    phase = plan.phase_containing(completed_task.number)
    if phase is None: return CONTINUE
    if completed_task.number != phase.task_numbers[-1]: return CONTINUE  # not the last task

    # 1. Full /verify, scoped to this phase
    verify_result = invoke_verify(
        scope = "phase",
        feature = feature_folder,
        phase_number = phase.number,
        evidence_dir = f"{feature_folder}/verify/{today}-phase-{phase.number}/"
    )

    # 2. Write phase log
    write_phase_log(
        feature_folder, phase,
        verify_status = "passed" if verify_result.ok else "failed",
        verify_evidence_paths = [verify_result.evidence_dir]
    )

    if not verify_result.ok:
        # 3a. Failure path: do NOT compact, escalate
        return ESCALATE(verify_result.failures)

    # 3b. Success path: hard-stop and instruct user to /compact + re-invoke --resume
    # (hard-stop default per O1 resolution; see Compact Behavior section)
    return HALT_FOR_COMPACT(
        message = f"Phase {phase.number} verified green. "
                  f"Run `/compact` to clear context, then re-invoke "
                  f"`/execute --resume` to continue with phase {phase.number + 1}."
    )
```

**Return values:**

| Return | Meaning |
|--------|---------|
| `CONTINUE` | Phase boundary did not fire; Phase 2 task loop proceeds normally. |
| `ESCALATE(failures)` | /verify failed; surface failures to user; do NOT compact; do NOT continue to next phase. |
| `HALT_FOR_COMPACT(message)` | /verify passed; emit the message; end the /execute turn. User must `/compact` then re-invoke `/execute --resume`. |

---

## Phase Log Frontmatter

`{feature_folder}/execute/phase-N.md` is written by step 2 of the Algorithm whenever a phase boundary fires (regardless of verify outcome). The file has YAML frontmatter followed by a `## Verify Summary` body section.

```yaml
---
phase_number: 1
phase_name: "Schema + migration"
tasks_in_phase: [T1, T2, T3]
verify_status: passed | failed
verify_evidence_paths: ["{feature_folder}/verify/2026-05-02-phase-1/"]
plan_path: "{feature_folder}/03_plan.md"
plan_phase_hash: <sha256(phase_heading + concatenated_task_goal_lines)>
completed_at: 2026-05-02T15:14:00Z
---

## Verify Summary
[Brief: which checks ran, key results, links to evidence]
```

**Field notes:**

- `verify_status` is `passed` when `verify_result.ok` is true; `failed` otherwise. Write the log in both cases — the resume resolver uses `verify_status: failed` to skip the sealed-phase fast-path and fall back to per-task classification.
- `plan_phase_hash` is sha256 of the phase heading text plus all `Goal:` lines of tasks in the phase, normalized using the same 4-step pipeline defined in `_shared/execute-resume.md` (trim → collapse whitespace → lowercase → sha256 hex). The resolver uses this hash to detect phase-level drift in one comparison.
- `verify_evidence_paths` is a list; currently always one element. Reserved for cases where multiple verify runs are recorded against the same phase.
- `completed_at` is the UTC ISO-8601 timestamp at the moment the phase log is written (not the moment the last task completed).
- The `## Verify Summary` body is free-form prose written by the implementer (or the /verify agent). Minimum: which checks ran, whether they passed, and a link or path to the evidence directory.

---

## Verify Invocation Contract

Phase 2.5 invokes /verify in a phase-scoped mode. The call mechanism is the implementer's choice — skill-call, subagent, or harness invocation — as long as the inputs and outputs below are honoured.

**Inputs to /verify (phase-scoped mode):**

| Parameter | Type | Description |
|-----------|------|-------------|
| `scope` | string | Always `"phase"` for this invocation. |
| `feature` | string | Absolute or repo-relative path to the feature folder. |
| `phase_number` | integer | The phase number whose tasks are in scope. |
| `evidence_dir` | string | Path where /verify writes its evidence artifacts (`{feature_folder}/verify/{today}-phase-{N}/`). |

**Outputs from /verify (phase-scoped mode):**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | boolean | `true` if all checks passed; `false` if any check failed. |
| `evidence_dir` | string | Confirmed path where evidence was written (echoes the input path, or overrides if /verify chose a different location). |
| `failures` | list[string] | Human-readable failure summaries. Empty list when `ok` is `true`. |

**Scope semantics:** /verify phase-scoped mode runs the **full /verify checklist** but treats "changed files" as the union of `files_touched` from every per-task log in the phase (see spec §5.1 frontmatter). Evidence is written to `evidence_dir` instead of the default verify evidence location. The existing standalone /verify behavior is unchanged when invoked directly.

---

## Compact Behavior

**Default: hard-stop (per spec Open Question O1 resolved as hard-stop).**

When /verify passes at a phase boundary, Phase 2.5 MUST NOT continue executing. It MUST:

1. Emit the `HALT_FOR_COMPACT` message to the user, e.g.:

   > Phase 1 verified green. Run `/compact` to clear context, then re-invoke `/execute --resume` to continue with phase 2.

2. End the current /execute turn immediately. No further tasks are executed in this session.

**Why hard-stop:** phase boundaries exist precisely to control context growth. Continuing past the boundary — even with an advisory — defeats the purpose and risks the context bloat the user designed the phases to prevent.

**User flow after HALT_FOR_COMPACT:**

1. User runs `/compact` (Claude Code built-in; cannot be triggered programmatically by the skill).
2. User re-invokes `/execute --resume` (or `/execute <plan-path> --resume`).
3. Phase 0.5 (resume resolver) reads the freshly-written `phase-N.md` with `verify_status: passed`, seals all tasks in that phase as `done-sealed`, and sets the resume point to the first task of the next phase.
4. Execution continues from the next phase's first task in the fresh context.

**Alternative (not the default):** advisory-continue — emit the same HALT_FOR_COMPACT message but keep executing. This is cheaper for the user but defeats the compact purpose. Do NOT implement the advisory-continue path unless the plan document or user explicitly overrides O1.

**If /verify fails:** do NOT emit HALT_FOR_COMPACT. Do NOT compact. Surface the failures via `ESCALATE` and wait for user resolution. The phase log is still written with `verify_status: failed` so the resolver correctly excludes the phase from the sealed-phase fast-path on next resume.

---

## Consumers

- `plugins/pmos-toolkit/skills/execute/SKILL.md` — Phase 2.5 (Phase Boundary Check), invoked after step 9 of the Phase 2 task loop (after `status: done` is written to the per-task log).
