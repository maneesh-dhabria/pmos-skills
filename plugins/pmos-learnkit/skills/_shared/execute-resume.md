# Execute Resume Resolver Protocol

> **<MUST READ END-TO-END>** Calling skills MUST open and read this file before implementing Phase 0.4 or Phase 0.5. Do not infer resolver behavior from the calling skill's text. The hash normalization rule below is **mandatory** — deviation causes false drift alarms (Risk R1 in the spec). If you're tempted to hash the full task body rather than just the goal line, STOP and re-read the Hash Normalization Rule. </MUST READ END-TO-END>

Shared resolver protocol for `/execute` Phase 0.4 (Feature Disambiguation) and Phase 0.5 (Resume Resolution). Describes the classification algorithm, the Resume Report format, the AskUserQuestion option list, and inlined edge cases.

---

## Hash Normalization Rule

**This rule is mandatory.** Hashing without normalization is the primary source of false `done-but-drifted` alerts (Risk R1).

`task_goal_hash = sha256(normalized(plan_T<N>_goal_sentence))`

Normalization is a 4-step pipeline applied in order:

1. **Trim** — strip leading and trailing whitespace (spaces, tabs, newlines).
2. **Collapse whitespace** — replace every run of internal whitespace with a single space.
3. **Lowercase** — convert the entire string to lowercase.
4. **sha256 hex** — compute SHA-256 of the UTF-8 bytes of the normalized string; store as a lowercase hex string (64 characters).

Hash ONLY the `Goal:` line of the task, not the full task body. Goal lines are short and stable; everything else in the task body is intentionally ignored by the resolver.

The same 4-step normalization applies to `plan_phase_hash` (sha256 of the phase heading text plus all `Goal:` lines of tasks in the phase, normalized as above).

---

## Phase 0.4: Feature Disambiguation

Runs after Phase 0 (workstream + feature folder resolution) and before Phase 0.5. Its purpose is to identify which feature folder to resolve when the user has not provided a plan path or `--feature` argument.

```
function disambiguate_feature(plan_path_arg, feature_arg, repo_root):
    if plan_path_arg is given:
        return derive_feature_folder(plan_path_arg)
    if feature_arg is given:
        return f"{repo_root}/{docs_path}/{feature_arg}"

    # Neither given — scan for in-flight features
    candidates = []
    for folder in glob("{repo_root}/{docs_path}/*/"):
        log_dir = f"{folder}/execute/"
        if not exists(log_dir): continue
        non_done = count_logs_with_status(log_dir, status != "done")
        if non_done > 0:
            candidates.append((folder, non_done, last_modified(log_dir)))

    if len(candidates) == 0: error "no plan path given and no in-flight features found"
    if len(candidates) == 1: return candidates[0].folder
    # Multiple — AskUserQuestion with feature names + last-modified
    return ask_user_to_pick(candidates)
```

Step-by-step prose:

1. If `plan_path_arg` is provided, derive the feature folder directly from it. Return immediately — no scan needed.
2. If `feature_arg` is provided (via `--feature <slug>`), construct the feature folder path and return. No scan needed.
3. If neither is given, glob all subdirectories under `{docs_path}` that contain an `execute/` subdirectory. For each, count log files whose frontmatter `status` is not `done`. Collect any folder with at least one non-done log.
4. If zero candidates: error out — there is nothing to resume and no plan path to start fresh.
5. If exactly one candidate: use it automatically. No prompt needed.
6. If multiple candidates: use `AskUserQuestion` to present each candidate with its feature slug and last-modified time. Wait for the user to pick one before proceeding to Phase 0.5.

**Consumers:** `plugins/pmos-toolkit/skills/execute/SKILL.md` — Phase 0.4.

---

## Phase 0.5: Resume Resolution

Runs after Phase 0.4 has resolved a single feature folder. Classifies every task in the plan and produces a `ResumeReport` that drives the AskUserQuestion confirmation.

```
function resolve_resume(plan_path, feature_folder):
    plan = parse_plan(plan_path)
    # plan.tasks: [{number, name, goal, phase_number_or_null}, ...]
    # plan.phases: [{number, name, task_numbers}, ...] or []

    log_dir = f"{feature_folder}/execute/"
    task_logs = scan_task_logs(log_dir)       # parse each task-NN.md frontmatter
    phase_logs = scan_phase_logs(log_dir)     # parse each phase-N.md frontmatter

    # 1. Sealed phases first — trust phase-level assertion
    sealed_task_numbers = set()
    drifted_phases = []
    for plog in phase_logs where plog.verify_status == "passed":
        current_phase = plan.phases[plog.phase_number]
        if hash(current_phase) == plog.plan_phase_hash:
            sealed_task_numbers |= set(current_phase.task_numbers)
        else:
            drifted_phases.append(plog.phase_number)

    # 2. Per-task classification for the rest
    classification = {}  # task_number -> state
    for task in plan.tasks:
        if task.number in sealed_task_numbers:
            classification[task.number] = "done-sealed"
            continue
        log = task_logs.get(task.number)
        if log is None:
            classification[task.number] = "not-started"
        elif log.status == "done" and log.task_goal_hash == hash(task.goal):
            classification[task.number] = "done"
        elif log.status == "done":
            classification[task.number] = "done-but-drifted"
        elif log.status == "in-flight":
            classification[task.number] = "in-flight"
        elif log.status == "failed":
            classification[task.number] = "failed"

    # 3. Cross-check git commits on the branch
    branch = infer_branch(task_logs, phase_logs)   # take from any log; all must agree
    commit_task_refs = parse_git_log(branch)       # extract T<N> from messages
    for task_number in commit_task_refs:
        if classification.get(task_number) in ["not-started", "in-flight"]:
            classification[task_number] += "-with-commits"

    # 4. Pick resume point: lowest-N task whose state != "done" and != "done-sealed"
    resume_task_index = min(
        t.number for t in plan.tasks
        if classification[t.number] not in ["done", "done-sealed"]
    )

    # 5. Worktree liveness
    worktree_status = check_worktree(branch)
    # → "present" | "missing-but-branch-exists" | "both-gone"

    return ResumeReport(plan_path, branch, worktree_status, classification,
                        resume_task_index, drifted_phases)
```

### Task State Classification Table

| State | Meaning |
|-------|---------|
| `not-started` | No log file exists for this task number. |
| `not-started-with-commits` | No log exists for this task, but `git log` shows commits referencing T<N>. Likely a session that committed but crashed before writing the in-flight log. Default action: prompt to inspect commits or revert. |
| `done` | Log exists, `status: done`, and `task_goal_hash` matches the current plan goal line. |
| `done-sealed` | Task belongs to a phase whose `phase-N.md` has `verify_status: passed` and whose `plan_phase_hash` still matches. Trusted without per-task drift check. |
| `done-but-drifted` | Log exists, `status: done`, but `task_goal_hash` does not match the current plan goal line. The plan was edited after the task completed. |
| `in-flight` | Log exists, `status: in-flight`. Session crashed or was interrupted before the task could be marked done. |
| `in-flight-with-commits` | Log exists with `status: in-flight` AND commits exist on the branch referencing T<N>. Default action: prompt to continue from commits or revert and redo. |
| `failed` | Log exists, `status: failed`. Three-attempt retry budget was exhausted. |

The `-with-commits` suffix is appended to `not-started` or `in-flight` when `git log <branch>` contains a `T<N>` reference for that task number, e.g. `in-flight-with-commits`, `not-started-with-commits`. This signals that real work landed on the branch even though the log was not finalized.

**Consumers:** `plugins/pmos-toolkit/skills/execute/SKILL.md` — Phase 0.5.

---

## Resume Report Rendering

The Resume Report is rendered to chat only — no file is written (Open Question O3 resolved: chat-only).

### Markdown table template

```markdown
**Execute Resume Report**
Plan: {plan_path}
Branch: {branch}  (worktree: {worktree_path} — {worktree_status})

| T# | Phase | Name           | State                       | Notes |
|----|-------|----------------|-----------------------------|-------|
| T1 | P1    | Schema         | done-sealed                 |       |
| T2 | P1    | Migration      | done-sealed                 |       |
| T3 | P2    | API endpoint   | done-but-drifted            | Goal text changed since completion |
| T4 | P2    | UI form        | in-flight-with-commits      | log left open from previous session, 2 commits on branch |
| T5 | P2    | E2E test       | not-started                 |       |

Drifted phases: none.
Recommended resume point: T4 (re-validate, then continue).
```

Fill `Phase` column with `P<N>` when the task belongs to a plan phase, or `—` for flat plans. Fill `Notes` with a brief human-readable explanation whenever the state is not `done`, `done-sealed`, or `not-started`.

### In-flight task body tail

When the report contains at least one task classified as `in-flight` or `in-flight-with-commits`, append a "Last 5 lines from in-flight task body" section beneath the table, with one sub-block per in-flight task in T# order.

**Example rendering:**

```markdown
**Last 5 lines from T17 in-flight body:**

- Wrote failing test for FR-22 (test_orders.py::test_partial_refund)
- Confirmed test fails with current orders.py implementation
- Reading checkout flow to find the right injection point
- About to wire fixtures via tests/fixtures/orders.json
- DEVIATION: plan assumes orders.fee_cents; actual model has fee_amount (decimal)
```

**Tail extraction protocol:**

1. Read `task-NN.md` for the in-flight task.
2. Locate the second `---` line (the YAML frontmatter terminator); the body is everything after it.
3. Strip leading and trailing blank lines from the body.
4. Take the **last 5 non-blank lines** (in original order). If fewer than 5 non-blank lines exist, render whatever exists.
5. Render as a markdown bullet list (one bullet per source line) under a `**Last 5 lines from T<N> in-flight body:**` sub-heading.
6. **If the body has zero non-blank lines after frontmatter:** render the sub-heading and a single bullet `- (no body content recorded)`. Do not omit the sub-heading when the task is in-flight — its absence is itself a signal worth surfacing.

**Omit the entire tail section** (sub-heading + bullets) when no task in the report is `in-flight` or `in-flight-with-commits` (clean fresh-start, all-done resume, or only `not-started` / `done` / `done-sealed` / `done-but-drifted` states present).

The tail is a literal trace, not a summary — a `DEVIATION:` line in the last 5 may be stale if its resolution appeared earlier in the body. The resuming agent reads the full body when deciding how to proceed; the tail is a prompt, not a substitute.

### AskUserQuestion option list

After rendering the table, issue a single `AskUserQuestion` with these options (adapt T# to the actual `resume_task_index`):

- **Resume from T\<N\> (re-validate first)** — Recommended
- Restart T\<N\> from scratch (revert commits)
- Jump to specific task (free-form follow-up)
- Restart from T1 (destructive — double-confirm required)
- Cancel

**Destructive-confirmation requirement:** if the user selects "Restart from T1" (or any restart variant that discards previously-done logs), issue a second `AskUserQuestion` before acting:

> "This will discard prior progress logs (X tasks marked done). Confirm restart from T1?"
> - Confirm restart — I understand this is destructive
> - Cancel — go back

Do NOT proceed with a destructive restart without this explicit second confirmation.

---

## Edge Cases

The full edge-case table (E1–E16) is in the spec at `docs/specs/2026-05-02-execute-resume-resolver-design.md §7`. The six cases most likely to trip up implementers are inlined here:

**E3 — in-flight log, no commits on branch**
Log exists with `status: in-flight` but `git log <branch>` contains no `T<N>` reference for this task. Classify as `in-flight`. Report flags it. Default resume action: re-run the task from scratch (the previous session started but wrote nothing durable to the branch).

**E4 — in-flight log, commits on branch**
Log exists with `status: in-flight` and `git log <branch>` contains one or more commits referencing this task. Classify as `in-flight-with-commits`. Report flags it. Default action: prompt "continue from commits / revert and redo" — do not silently revert work that landed on the branch.

**E6 — done log, hash mismatch**
Log exists with `status: done` but `task_goal_hash` in the log does not match `hash(current_plan_goal_line)`. Classify as `done-but-drifted`. Report flags it with "Goal text changed since completion." AskUserQuestion: treat as done / redo / mark for review. Do NOT silently re-apply the done status.

**E8 — sealed phase, phase hash mismatch**
`phase-N.md` exists with `verify_status: passed` but the current plan's phase hash does not match `plan_phase_hash` in the log. List the phase under "Drifted phases" in the report. Default: drop sealed status and fall back to per-task classification for every task in that phase. Do NOT trust the phase seal when the phase definition has changed.

**E10 — worktree gone, branch exists**
`check_worktree(branch)` returns `"missing-but-branch-exists"`. Recreate the worktree from the branch (`git worktree add <path> <branch>`). Note the recreation in the Resume Report's worktree line. Continue with Phase 0.5 and Phase 1 resume path normally.

**E15 — plan path mismatch**
The `plan_path` stored in the task logs' frontmatter does not match the `plan_path` the user passed as an argument. Refuse to resume. Error: "Plan path mismatch — logs reference `{log_plan_path}`, you passed `{arg_plan_path}`. Use `--restart` to discard prior logs or fix the path." Do not guess which plan is authoritative.

---

## Consumers

- `plugins/pmos-toolkit/skills/execute/SKILL.md` — Phase 0.4 (Feature Disambiguation) + Phase 0.5 (Resume Resolution)
