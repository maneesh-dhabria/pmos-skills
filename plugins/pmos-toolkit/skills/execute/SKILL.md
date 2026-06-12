---
name: execute
description: Execute an implementation plan end-to-end — task-by-task TDD implementation with deploy verification, frontend testing, and manual spot checks. Supports git worktree isolation. Use when the user says "implement the plan", "start building", "execute this", "code this up", or has a plan doc ready for implementation.
user-invocable: true
argument-hint: "<path-to-plan-doc> [--feature <slug>] [--backlog <id>] [--resume | --restart | --from T<N>] [--no-halt] [--subagent-driven] [--non-interactive | --interactive]"
---

# Plan Executor

Execute an implementation plan end-to-end with strict verification. Supports git worktree isolation when available, but works without it.

Infer options from the request; an explicit `--flag` overrides. "Run the tasks in parallel with subagents" ≡ `--subagent-driven`; "pick up where we left off" ≡ `--resume`.

**Announce at start:** "Using the execute skill to implement the plan in an isolated worktree."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** State your assumption, document it in the output, and proceed. The user reviews after completion.
- **No subagents:** Perform research and analysis sequentially as a single agent. If `--subagent-driven` was passed on a platform with no subagent tool, emit `WARNING: --subagent-driven requested but no subagent tool available; running inline.` and proceed with inline execution — never error out.
- **No Playwright MCP:** Note browser-based verification as a manual step for the user.
- **Task tracking:** Use your available task tracking tool (e.g., `TaskCreate`/`TaskUpdate` in Claude Code, `update_plan` in Codex, or equivalent). If none is available, track via the `T<N>`-bearing commit subjects and the per-task logs, and report status verbally.

---

## Backlog Bridge

This skill optionally integrates with `/backlog`. See `plugins/pmos-toolkit/skills/backlog/pipeline-bridge.md`.

**At skill start:**
- If `--backlog <id>` was passed: invoke `/backlog set {id} status=in-progress`. On failure, warn and continue.

**At skill end:**
- No automatic status change here; `/verify` owns the `done`/`blocked` transition (unchanged).

**Three-loop posture (story items):** under `--backlog`, the backlog item file is mutated in the **main checkout**, never the worktree — per `backlog/pipeline-bridge.md` "Three-loop write-back rules". This skill only writes the start-of-run `in-progress` stamp through that bridge; the story's `tasks.yaml` (see "Task Queue" below) is the branch-local, in-worktree artifact this skill reads and writes directly.

---

## Phase 0: Pipeline Setup (inline — do not skip)

Use workstream context (loaded by step 3 below) passively — it informs implementation decisions and deviation assessments. This skill consumes `03_plan.md` (via resolve-input.md) and writes per-task logs under `{feature_folder}/execute/`.

<!-- pipeline-setup-block:start -->
1. **Read `.pmos/settings.yaml`.**
   - If missing → you MUST invoke the `Read` tool on `_shared/pipeline-setup.md` Section A and run first-run setup before proceeding. (Skipping this Read is the most common cause of folder-naming defects.)
2. Set `{docs_path}` from `settings.docs_path`.
3. If `settings.workstream` is non-null → load `~/.pmos/workstreams/{workstream}.md` as context preamble; if frontmatter `type` is `charter` or `feature` and a `product` field exists, also load `~/.pmos/workstreams/{product}.md` read-only.
4. Resolve `{feature_folder}`:
   - If `--feature <slug>` was passed → glob `{docs_path}/features/*_<slug>/`. **Exactly 1 match required**; on 0 or 2+ → you MUST `Read` `_shared/pipeline-setup.md` Section B before acting.
   - Else if `settings.current_feature` is set AND `{docs_path}/features/{current_feature}/` exists → use it.
   - Else → ask user (offer: create new with derived slug, pick existing from folder list, or specify via Other...).
5. **Edge cases — you MUST `Read` `_shared/pipeline-setup.md` Section B before acting:** slug collision, slug validation failure, legacy date-less folder encountered, ambiguous `--feature` lookup, any folder creation.
6. Read `~/.pmos/learnings.md` if present; note entries under `## /<this-skill-name>` and factor them into approach (skill body wins on conflict; surface conflicts to user before applying).
<!-- pipeline-setup-block:end -->

---

<!-- non-interactive-block:start -->
1. **Mode resolution.** Compute `(mode, source)` with precedence: `cli_flag > parent_marker > settings.default_mode > builtin-default ("interactive")` (FR-01).
   - `cli_flag` is `--non-interactive` or `--interactive` parsed from this skill's argument string. Last flag wins on conflict (FR-01.1).
   - `parent_marker` is set if the original prompt's first line matches `^\[mode: (interactive|non-interactive)\]$` (FR-06.1).
   - `settings.default_mode` is `.pmos/settings.yaml :: default_mode` if present and one of `interactive`/`non-interactive`. Unknown values → warn on stderr `settings: invalid default_mode value '<v>'; ignoring` and fall through (FR-01.3).
   - If `.pmos/settings.yaml` is malformed (not parseable as YAML, or missing `version`): print to stderr `settings.yaml malformed; fix and re-run` and exit 64 (FR-01.5).
   - On Phase 0 entry, always print to stderr exactly: `mode: <mode> (source: <source>)` (FR-01.2).

2. **Per-checkpoint classifier.** Before issuing any `AskUserQuestion` call, classify it (FR-02):
   - The defer-only tag, if present, is the literal previous non-empty line: `<!-- defer-only: <reason> -->` where `<reason>` ∈ {`destructive`, `free-form`, `ambiguous`} (FR-02.5).
   - Decision (in order): tag adjacent → DEFER; multiSelect with 0 Recommended → DEFER; 0 options OR no option label ends in `(Recommended)` → DEFER; else AUTO-PICK the (Recommended) option (FR-02.2).

3. **Buffer + flush.** Maintain an append-only OQ buffer in conversation memory. On each AUTO-PICK or DEFER classification, append one entry per the schema in spec §11.2. At end-of-skill (or in a caught error before exit), flush (FR-03):
   - Primary artifact is single Markdown → append `## Open Questions (Non-Interactive Run)` section with one fenced YAML block per entry; update prose frontmatter (`**Mode:**`, `**Run Outcome:**`, `**Open Questions:** N` where N counts deferred only — see FR-03.4) (FR-03.1).
   - Skill produces multiple artifacts → write a single `_open_questions.md` aggregator at the artifact directory root; primary artifact's frontmatter `**Open Questions:** N — see _open_questions.md` (FR-03.5).
   - Primary artifact is non-MD (SVG, etc.) → write sidecar `<artifact>.open-questions.md` (FR-03.2).
   - No persistent artifact (chat-only) → emit buffer to stderr at end-of-run as a single block prefixed `--- OPEN QUESTIONS ---` (FR-03.3).
   - Mid-skill error → flush partial buffer under heading `## Open Questions (Non-Interactive Run — partial; skill errored)`; set `**Run Outcome:** error`; exit 1 (E13).

4. **Subagent dispatch.** When dispatching a child skill via Task tool or inline invocation, prepend the literal first line: `[mode: <current-mode>]\n` to the child's prompt (FR-06).

5. **Call-site auditing (CI only).** This runtime classifier reads the call it is about to make — it does not run awk. Static/offline auditing of `AskUserQuestion` call sites across SKILL.md files is performed by `tools/audit-recommended.sh`, which sources the shared call-site extractor from Section D of this file (`_shared/non-interactive.md`). Runtime and audit therefore share one decision contract without inlining the extractor into every skill (FR-02.6).

6. **Refusal check.** If this SKILL.md contains a `<!-- non-interactive: refused; ... -->` marker (regex: `<!--[[:space:]]*non-interactive:[[:space:]]*refused`), and `mode` resolved to `non-interactive`: emit refusal per Section A and exit 64 (FR-07).

7. **Pre-rollout BC.** If the `--non-interactive` argument is present BUT this SKILL.md does NOT contain the `<!-- non-interactive-block:start -->` marker (i.e., this skill hasn't been rolled out yet): emit `WARNING: --non-interactive not yet supported by /<skill>; falling back to interactive.` to stderr; continue in interactive mode (FR-08).

8. **End-of-skill summary.** Print to stderr at exit: `pmos-toolkit: /<skill> finished — outcome=<clean|deferred|error>, open_questions=<N>` (NFR-07).
<!-- non-interactive-block:end -->

### Phase 0a: execution-strategy resolution {#execution-strategy}

Resolve `execution_strategy ∈ {inline, subagent-driven}` once, at Phase 0 entry:

<!-- nl-sugar -->
- `--subagent-driven` and `--inline` are parsed from this skill's argument string (`--inline` is back-compat sugar, absent from the argument-hint). They are mutually exclusive; **last flag wins** on conflict; **neither present ⇒ `inline`**.
- If `subagent-driven` resolved but the platform has **no subagent/Agent tool** (Codex, Gemini, or any harness without it): emit `WARNING: --subagent-driven requested but no subagent tool available; running inline.` to stderr and set `execution_strategy = inline`. Never error.
- Print to stderr exactly once: `execution_strategy: <inline|subagent-driven> (source: cli|default)`.

`execution_strategy` selects the Phase 2 path (see "Phase 2 — Execution Strategy" below). It does **not** change any other phase: Phase 0/0b/0c setup + resume, Phase 1 setup, Phase 2a phase-boundary handling, the runtime-evidence gate, the per-task / per-phase logs, and Phases 3–7 all run identically in both strategies.

## Phase 0b: Feature Disambiguation {#feature-disambiguation}

<!-- defer-only: destructive -->
**If `--restart` was passed:** before doing anything else, count the existing `done` task logs under `{feature_folder}/execute/` (or all candidate feature folders if no plan path was given). Issue `AskUserQuestion`: "Restart will discard prior progress logs (X tasks marked done across N feature(s)). Confirm restart from scratch?" with options **Confirm restart** / **Cancel**. On Cancel, abort the /execute invocation immediately. On Confirm, skip the rest of Phase 0b and Phase 0c entirely and proceed to Phase 1 as a fresh start.

<!-- defer-only: ambiguous -->
Otherwise: if no `<path-to-plan-doc>` and no `--feature` were provided, follow `../_shared/execute-resume.md` Phase 0b to scan the repo for in-flight features (folders under `{docs_path}/` with non-`done` task logs in their `execute/` subdir). If multiple candidates exist, present them via `AskUserQuestion` and let the user pick. If exactly one, use it. If none, error out — there is nothing to resume and no plan to execute.

Skip this phase entirely if the plan path was given (no ambiguity).

---

## Phase 0c: Resume Resolution {#resume-resolution}

Follow `../_shared/execute-resume.md` Phase 0c end-to-end — it owns the algorithm: parse the plan's `[T1...TN]`, scan the `task-*.md` / `phase-*.md` logs, classify every task (`not-started` → `failed`, with the git-log and `task_goal_hash` drift cross-checks), pick the resume point, and check worktree liveness. Then:

<!-- defer-only: destructive -->
1. Render the **Resume Report** to chat (markdown table per the substrate's "Resume Report Rendering"), then confirm via `AskUserQuestion` (Resume / Restart task / Jump to specific / Restart from T1 / Cancel).
2. Set `resume_mode = (mode, resume_task_index)` for Phase 1.

**Skip this phase entirely** if `--restart` was passed, or if no logs exist under `{feature_folder}/execute/` (fresh execution). If `--from T<N>` was passed, skip the resolver and set `resume_mode = ("manual", N)` directly. Tasks in phases entirely before T<N> are treated as implicitly sealed by the manual override — no retroactive phase verify is run. If `--resume` was passed, force this phase even if the resolver would otherwise skip.

---

## Phase 1: Setup {#setup}

**Branch on `resume_mode` from Phase 0c:**
- **Fresh start** (`resume_mode` unset, or mode == `"restart"`): run all steps below.
- **Resume** (mode in `{"resume", "manual"}`): skip steps 3, 4, and the baseline test run inside step 3. Worktree must be present (Phase 0c verified or recreated it). Cd into the worktree from the previous session's logs (`worktree_path` field). Skip directly to step 5 (verify verification tooling) — it must re-run, since dev servers / Playwright / type-checkers may not be running in this fresh shell.

1. **Locate the plan.** Follow `_shared/resolve-input.md` with `phase=plan`, `label="plan"`.
2. **Read the plan and its upstream spec end-to-end.** Understand the "Done when" criteria and final verification task.

   **Read plan frontmatter:** `commit_cadence` (defaults to `per-task`; also `per-phase`, `manual` — honor whichever is set) and `contract_version` (warn-and-continue on v1 plans, halt if newer than this skill supports — exact shim messages in `reference/plan-contract.md`).
3. **Isolate the work:**
   - **Worktree (preferred):** Check for existing `.worktrees/` or `worktrees/` directory. If neither exists, create `.worktrees/`. Verify the directory is gitignored (`git check-ignore -q .worktrees`); if not, add it to `.gitignore` and commit. Then:
     ```bash
     git worktree add .worktrees/<branch-name> -b <branch-name>
     cd .worktrees/<branch-name>
     ```
   - **Fallback:** `git checkout -b feature/<name>` if worktrees aren't practical.
   - **Setup:** Auto-detect and install dependencies (`npm install`, `pip install -r requirements.txt`, `cargo build`, etc.). Run the test suite to establish a clean baseline before starting work.
4. **Check for environment conflicts.** If using Docker with parallel stacks, ensure ports and project names don't collide.
5. **Verify verification tooling (hard gate).** Before starting Task 1, produce evidence that your verification tools work:
   - If the plan has backend API tasks: start the dev server, run a request, paste the output.
   - If the plan has frontend tasks: open a page via Playwright MCP, paste the screenshot. If Playwright fails, establish the fallback now and paste its output instead (build check, type check, curl).
   - If any tool is unavailable, document the failure and the alternative.

   Do NOT proceed to Task 1 without this evidence. This is a gate, not a checklist item.
6. **Create task list.** Extract every task from the plan and create a tracked task for each, using your available task tracking tool: task name/number, key files, dependencies, and the task's verification criteria as its "done" signal. Update each to in-progress when you start it and completed as soon as it's done — do not batch completions. This is the live progress view the user watches; for multi-session runs, the per-task `task-NN.md` and per-phase `phase-N.md` logs are the canonical durable record (the resume resolver reads them).

---

## Phase 2: Execute Tasks {#execute-tasks}

### Phase 2 — Execution Strategy

Branch on `execution_strategy` (resolved in Phase 0):

- **`inline`** (default) — run the **per-task loop** below as a single agent, in plan order. Optionally, when an Agent/subagent tool is available, use the lightweight per-task subagent variant under "Inline mode: optional per-task subagents" — that is *not* the parallel mode.
- **`subagent-driven`** (`--subagent-driven`) — skip the single-agent per-task loop and run **"Parallel Subagent-Driven Execution"** below instead: a fresh implementer subagent per task, independent tasks in parallel waves, every completed task through a two-stage review. Fully self-contained (`SKILL.md` + the sibling `subagent-driven.md`); `superpowers:subagent-driven-development` is the inspiration, not a dependency.

Everything that is **not** the per-task implementation loop is shared by both strategies and runs identically: Phase 0/0b/0c (setup + resume), Phase 1 (worktree, dependency install, **verification-tooling hard gate**, task list), the plan contract and defect handoff (below), **Phase 2a phase-boundary `/verify` + its opt-outs**, the per-task `task-NN.md` and per-phase `phase-N.md` logs, the runtime-evidence gate, and Phases 3–7. The subagent-driven path **must** keep producing the same `T<N>`-bearing commit subjects the Phase 0c resume resolver greps for — see its commit step below.

### Plan contract (/plan v2) {#plan-contract}

Plans may carry per-task fields that gate ordering, TDD shape, and state dependencies — `**Depends on:**`, `**Idempotent:**`, `**Requires state from:**`, `**TDD:**`, `**Data:**`, `**Wireframe refs:**` — plus suffixed task IDs (`T26a`). When you see them, read `reference/plan-contract.md` for the full semantics (field-by-field behavior, the back-compat WARN shim, suffixed-ID parsing, the defect-file template). The facts the loop needs:

- Do not start a task while any task it `**Depends on:**` / `**Requires state from:**` has not completed (no `done`/`done-sealed` log) — exact refusal conditions in the contract.
- `**TDD:**` is three-valued (`yes — new-feature` / `yes — bug-fix` / `no — <reason>`); follow the per-task value.
- A defective plan (broken `Files:` refs, unconsumable upstream contract) gets a defect file at `{feature_folder}/03_plan_defect_<task-id>.md` per that contract and a `/plan --fix-from <task-id>` handoff.

### Task queue: tasks.yaml {#task-queue}

When the plan was emitted by /plan ≥ the three-loop change, a sibling `tasks.yaml` is the **single home of task state** (the story's `tasks_file`; shape owned by `backlog/schema.md` §"tasks.yaml — single home of task state"). It is the work queue this skill consumes, and **/execute is its sole `status:` writer**.

- **Source of truth, with fallback.** If a `tasks.yaml` exists beside the plan (or at the story's `tasks_file`), read `id`/`title`/`deps`/`parallel`/`acceptance`/`status` from it — both the per-task loop and the wave planner take their task list and ordering from it. If it is **absent** (legacy plans), fall back to the prose-parse of the plan's `T<N>` headings (Plan contract above) and emit `[/execute] no tasks.yaml; falling back to prose-parsed plan tasks` to stderr. Never require both.
- **Readiness is derived, never stored (D21).** A task is "ready" when its `status` is `pending` AND every id in its `deps` is `done`. Compute this at read time — both here and in the wave planner. Do not write a `ready` status; the enum is exactly `pending | in-progress | done | skipped`.
- **Sole status writer.** As each task moves `pending → in-progress → done` (or `skipped`), write the new `status` back to `tasks.yaml` (branch-local, in the worktree — never the main checkout; that rule is for the backlog *item*, per `backlog/pipeline-bridge.md`). Record `evidence:` (test name / commit sha / screenshot path) when the task completes. Whole-file temp-then-rename write so a crash never half-writes the queue.
- **Resume.** On a re-pickup (build-mode worktree reuse, D19), `tasks.yaml` status IS the resume state — `done` tasks stay done; start at the first `pending` task whose deps are satisfied. This composes with the per-task log resume (Phase 0c): the logs and `tasks.yaml` agree because /execute writes both.

### Discovered-work routing {#discovered-work}

Work that surfaces mid-execution is routed by ONE deterministic test — **is it needed to satisfy the story's existing acceptance criteria?** (D29)

- **(a) Needed for the existing ACs** → /execute MAY append a `discovered: true` task to `tasks.yaml` and continue (the one exception to "/plan is the only creator"; /execute remains the sole status writer; the append is self-logging via the `discovered:` flag). Give it the next free `T<N>` id, set its `deps` to whatever it actually needs, `status: pending`. No prompt — the AC test is deterministic.
- **(b) Beyond the ACs** → never built inline. Auto-capture it as a `draft` story in the **same epic** via `/backlog add --epic <parent-id> "<title>"` (D16/D29b), so it lands in `/backlog groom` for a human to triage. Do not gold-plate the current story with it.

The AC boundary makes the call without a judgement prompt; when genuinely unsure whether a discovery is in-scope, prefer (b) (capture, don't build) — a missed task resurfaces at /verify; silent scope creep doesn't.

### Per-task loop {#per-task-loop}

Work through the queue's tasks in order (from `tasks.yaml` when present, else the prose-parsed plan — see `#task-queue`). For each task:

1. **Mark task as in-progress** — in your task tracker AND, when reading from `tasks.yaml`, write its `status: in-progress` (sole-writer rule, `#task-queue`).
2. **Read the task** — understand goal, files, spec refs, and steps.
3. **Follow TDD** — write failing test, verify it fails, implement, verify it passes. Test quality per the "Test quality" block below.
4. **Run the verify-fix loop** (see below).
5. **Produce runtime evidence before committing:**
   - **API tasks:** curl every new/modified endpoint against the running dev server. Paste the output.
   - **UI tasks:** open the affected page in Playwright MCP (or fallback). Paste screenshot or programmatic output.
   - If you cannot produce runtime evidence for an API or UI task, the task is not done. Do not commit.
6. **Commit** — small, focused commit per task. Not one giant commit at the end. **Commit subject MUST contain the task number in the form `T<N>`** (e.g., `feat(T5): add audit-log migration` or `T5: add audit-log migration`). The Phase 0c resolver greps `\bT[0-9]+\b` from `git log` to detect mid-task interruption — without `T<N>` in the subject, in-flight detection degrades.
7. **Maintain the per-task log** at `{feature_folder}/execute/task-{NN}.md` (zero-padded 2 digits). The log has a structured frontmatter and a free-form body. Lifecycle:

   - **At task start** (before TDD work begins): write the file with `status: in-flight`, populated frontmatter (see schema below), and an empty body. This is the "in-flight marker" that resume detects if the session crashes.
   - **As files are touched:** append paths to `files_touched` in the frontmatter (used by phase-scoped /verify in Phase 2a).
   - **At task completion** (verify-fix loop passed AND runtime evidence produced): update `status: done`, set `completed_at`, and write the body (key decisions, deviations, runtime evidence, verification outcome).
   - **At task failure** (3-attempt budget exhausted): update `status: failed`, set `completed_at`, write the body with the failure mode.

   **Frontmatter schema:**

   ```yaml
   ---
   task_number: 5
   task_name: "Add audit-log migration"
   task_goal_hash: <sha256 of plan T<N> Goal: line, normalized — see ../_shared/execute-resume.md "Hash Normalization Rule">
   plan_path: "{feature_folder}/03_plan.md"
   branch: "feature/audit-log"
   worktree_path: ".worktrees/audit-log"
   status: in-flight | done | failed
   started_at: 2026-05-02T14:32:11Z
   completed_at: 2026-05-02T14:48:30Z   # only when status != in-flight
   files_touched:
     - src/migrations/0042_add_audit_log.py
     - tests/test_migration_0042.py
   ---
   ```

   Overwrite the file's body on a re-run; preserve `started_at` from the first attempt.
8. **Mark task as completed** in your task tracker AND, when reading from `tasks.yaml`, write its `status: done` + `evidence:` (sole-writer rule, `#task-queue`). A task abandoned as out-of-scope gets `status: skipped`.
9. **Move to next task** — only after verification passes, evidence is produced, and task is marked complete. Before moving on, run **Phase 2a: Phase Boundary Check** (below) — it may halt the session.

### Test quality {#test-quality}

The TDD loop above is mechanics; this is what makes a test worth writing. (The subagent-driven implementer template pastes this block verbatim — one home, two consumers.)

- Test behavior through public interfaces, not implementation. A test that breaks when you rename a private function or reorder internals was testing implementation — it would not survive a refactor, so it protects nothing.
- Build vertically: one behavior end-to-end (test → minimal implementation → pass), then the next. The horizontal-slice anti-pattern — scaffolding all the mocks/shapes first — produces many green tests and no working feature.
- A mock-verifying or shape-asserting test that passes while the feature is broken is worse than no test: it launders a false claim. Assert observable outcomes.
- Never refactor while red. Get back to green first, then improve structure with the tests as the net.

### Phase 2a: Phase Boundary Check {#phase-boundary-check}

Skip this phase entirely if the plan has no `## Phase N` headings (flat plan). Otherwise, after each task's done-log is written, follow `../_shared/phase-boundary-handler.md` — it owns the algorithm and the `phase-N.md` log schema: detect whether the just-completed task closes its `## Phase N` group; if so, invoke /verify with `--scope phase --feature <slug> --phase <N>` (evidence to `{feature_folder}/verify/<YYYY-MM-DD>-phase-<N>/`), write `{feature_folder}/execute/phase-N.md`, then on **failure** ESCALATE (do NOT compact, do NOT continue — the `verify_status: failed` log lets the next session's resolver pick up at the failed task), and on **green** emit `HALT_FOR_COMPACT` and end the /execute turn — the next session's resolver sees the sealed phase log and resumes at the next phase's first task.

**Halt suppression — opt-out semantics** (the user-explicit override the handler's hard-stop rule reserves). Skip the HALT message AND continue directly into Phase N+1's first task when EITHER:

- `--no-halt` was passed at this /execute invocation (per-invocation; does NOT persist across runs). This is the headless/orchestrated form — interactively, the directive below covers the same ground.
- The session-sticky `continue_through_phases` flag was set earlier in this conversation. Any unambiguous imperative to continue without halting sets it ("no halts", "continue without compacting", …); the literal escape token `[continue_through_phases]` anywhere in a user message also sets it (kept for programmatic callers). The flag is per-session — it resets when the conversation ends and is NOT persisted to settings or session-state files.

  <!-- defer-only: ambiguous -->
  When a directive's interpretation is ambiguous (descriptive prose vs. imperative directive), confirm via a single `AskUserQuestion` before flipping the flag rather than silently assuming.

When halt is suppressed, log a one-line summary instead: `Phase N verified green; --no-halt set (or session-sticky continuation directive honored), continuing to Phase N+1.`

**Failure escalation is unaffected by either opt-out.** If verify fails, escalate regardless of `--no-halt` or the session flag — neither suppresses the failure path.

This is a hard-stop on green by default. The opt-outs above let the user trade context-cache freshness for end-to-end throughput when they explicitly choose to.

### Verify-Fix Loop (per task)

Do not move to the next task until the current task's verification passes. This is a bounded loop, not a hope:

```
attempt = 0
while verification fails AND attempt < 3:
    1. Read the failure output carefully
    2. Diagnose root cause (not symptoms)
    3. Fix
    4. Re-run the FULL verification (not just the part that failed)
    attempt += 1

if still failing after 3 attempts:
    STOP — escalate to user with:
    - What the task requires
    - What verification command fails
    - What you tried and why it didn't work
    - Your best guess at the underlying issue
```

**Rules:**
- Each retry must change something — never re-run the same code hoping for a different result.
- Re-run the full task verification, not just the failing subset. A fix in one place can break another.
- The bound (3 attempts) prevents thrashing. If you can't fix it in 3 tries, a human needs to look.

### Inline mode: optional per-task subagents (lightweight, sequential)

Part of **`inline`** mode — not the parallel mode. When an Agent/subagent tool is available you may dispatch a fresh subagent per task, **one at a time** (fresh context prevents confusion from accumulated state), then run the same **two-stage review** as the parallel path: spec-compliance first (does the code match the spec? missing requirements, scope creep), then code quality (bugs, inconsistencies, conventions per CLAUDE.md). If either reviewer finds issues, the implementer fixes and the reviewer re-reviews — do not proceed to the next task with open issues. Implementer status: Done → review; Needs context → provide it and re-dispatch; Blocked → change something (context, model, task size) or escalate — never retry unchanged.

> For the **parallel** variant — fan independent tasks out across subagents in waves, with the same two-stage review — run `/execute --subagent-driven` and follow "Parallel Subagent-Driven Execution" below instead.

### Parallel Subagent-Driven Execution (`--subagent-driven`) {#subagent-driven}

Selected when `execution_strategy == subagent-driven` (see Phase 0). This **replaces** the per-task single-agent loop above; all the *shared* machinery from "Phase 2 — Execution Strategy" still applies. The four subagent prompt templates live in `subagent-driven.md` (sibling to this file) — read it, including its **Red flags** list (the single home for this path's never-do rules), before dispatching.

You (the controller) coordinate; subagents do the work. Implementer subagents **never inherit your context** — you hand them exactly the task text + scene-setting context they need. Implementer subagents **implement and test but never `git commit`** — the controller commits, serially, after the wave (this avoids `.git/index` races between concurrent subagents and keeps the `T<N>` commit subjects the resume resolver depends on).

#### Step A — Wave planning (deterministic)

1. **Collect tasks.** From `tasks.yaml` when present (`id`/`deps`/`parallel`/`status` — see `#task-queue`), else the Phase 0c prose-parse: every `T<N>[<suffix>]` task with its `**Goal:**`, `**Files:**`, `**Depends on:**`, `**Requires state from:**`, and `## Phase N` grouping. **Exclude** tasks already `done` / `done-sealed` (resume resolver, or `status: done` in `tasks.yaml`). If nothing remains → report "nothing to execute" and stop.
2. **Compute any wave schedule that satisfies both hard constraints**, then **print it to chat** before starting (e.g. `Wave 1: T1, T3, T4 | Wave 2: T2 | Wave 3: T5, T6`):
   - **Dependency order** — a task's dependencies (every task id in its `**Depends on:**` *or* `**Requires state from:**`) are all in earlier waves. Violation = wrong execution order.
   - **File-disjointness** — no wave contains two tasks whose `**Files:**` path sets intersect (normalize paths; `Create` / `Modify` / `Test` entries all count), even when no dependency connects them. Violation = concurrent edits colliding.
3. **Degenerate-case fallback.** If there is a dependency cycle, a reference to an unknown task id, or the plan's tasks lack the v2 per-task fields entirely (legacy plan) ⇒ fall back to **all-singleton waves** (= fully sequential) and log: `[/execute] subagent-driven: wave planning fell back to sequential (<reason>).` Do not halt.

#### Step B — Per-wave loop

For each wave, in order:

1. **Dispatch implementer subagents in parallel.** One Agent call per task in the wave, **all in a single assistant message** (the dispatching-parallel-agents pattern). Each call uses the *implementer* template from `subagent-driven.md`, populated with: the task's full text from the plan (paste it — do **not** make the subagent read the plan file), scene-setting context (where the task fits, what upstream tasks produced, relevant conventions), the worktree path, and the explicit instruction: **"implement and test (TDD per the task's `**TDD:**` value), but do NOT `git commit` — leave your changes in the working tree and report the exact files you changed and your test results."** Pick the model per the model-selection guidance in `subagent-driven.md` and name it via the Task tool's `model` parameter (`haiku` for mechanical 1–2-file tasks; `sonnet` for integration; inherit for design/judgement).
   - Per the known stall pattern: if a task is "one component → desktop AND mobile"-shaped (multiple large outputs), dispatch it as two narrower subagents from the start rather than one.
2. **Collect results.** For each returned implementer status:
   - **DONE** / **DONE_WITH_CONCERNS** — proceed (read concerns first; if a concern is about correctness or scope, resolve it before review; if it's an observation, note and proceed).
   - **NEEDS_CONTEXT** — provide the missing context, re-dispatch that one subagent.
   - **BLOCKED** — assess the blocker: more context → re-dispatch same model; needs more reasoning → re-dispatch a more capable model; too large → split into smaller tasks; plan is wrong → write the defect file (see "Defect handoff" above) and escalate. **Never** re-dispatch the same model with nothing changed. A blocked task stalls only its dependents — already-done tasks stay done.
   - **Stall** (no return / timeout) — re-dispatch that single task focused (focused single-file re-dispatches recover fast).
3. **Per task, in task-index order — the CONTROLLER (not subagents):**
   1. **Commit / stage.** `git add` the task's reported file-set, then — honoring the plan's `commit_cadence` — `commit_cadence: per-task` (default) ⇒ `git commit` now with a `T<N>`-bearing subject (`feat(T<N>): …` / `T<N>: …`); `per-phase` ⇒ leave it staged and commit the whole phase at the phase boundary; `manual` ⇒ leave it staged for the user. The `T<N>` subject (when a commit is made) is mandatory — the Phase 0c resolver greps `\bT[0-9]+\b` from `git log`. The diff handed to the reviewers in step 3 is the per-task commit (`git show <sha>`) when one exists, otherwise the task's staged/working-tree change for its file-set (`git diff --staged -- <files>` / `git diff -- <files>`).
   2. **Write the per-task log** `{feature_folder}/execute/task-NN.md` per the schema above (`status: done`, `files_touched`, body = decisions / deviations / runtime evidence / verification outcome). Honor the runtime-evidence gate: an API/UI task with no runtime evidence is **not done** — re-dispatch the implementer to produce it.
   3. **Two-stage review (this order, no skipping):**
      - **(i) Spec-compliance reviewer subagent** — dispatch with the *spec-reviewer* template from `subagent-driven.md`: the task requirements + the implementer's claims + the diff (`git show <sha>` / base→head SHAs). It verifies by reading code, not by trusting the report. On `❌` → re-dispatch the **same implementer subagent** with the reviewer's findings to fix → controller commits (or, under `per-phase`/`manual` cadence, re-stages) the fix as `fix(T<N>): address spec-review gap` → re-review. Loop until `✅`.
      - **(ii) Code-quality reviewer subagent** — only after spec `✅`: dispatch with the *code-quality-reviewer* template from `subagent-driven.md`: the diff + project conventions (`CLAUDE.md`). On Critical/Important findings → implementer fixes → controller commits / re-stages `fix(T<N>): …` → re-review → loop until approved. Minor findings: note and proceed.
      - Reviewer subagents are read-only; you may dispatch the spec-reviewers for several wave tasks concurrently, but the spec→quality **order per task** is mandatory, and code-quality review never starts before that task's spec review is `✅`.
   4. **Mark the task complete** in your task tracker.
4. **Phase 2a phase-boundary check.** If the wave's last task completes a `## Phase N` group, run **Phase 2a** exactly as in inline mode (`/verify --scope phase`, `phase-N.md` log, `HALT_FOR_COMPACT` unless `--no-halt` / the session-sticky continuation flag). Unchanged.
5. **Next wave.**

#### Step C — Final review

After the last wave: dispatch one **whole-implementation reviewer subagent** (the *final-reviewer* template in `subagent-driven.md`) with the full diff range (base SHA → HEAD) and the spec — this is the subagent form of Phase 4's compliance pass. Address any gaps it finds (implementer subagent fixes; controller commits). Then run **Phase 3** (Deploy & Verify) and **Phase 5** (Commit & Report) exactly as in inline mode — Phase 5 still ends by invoking `/pmos-toolkit:verify`.

### Execution Rules

- **Test in smaller chunks.** Verify after each task. Do NOT batch all testing to the end.
- **Update documentation** as part of relevant tasks (CLAUDE.md, changelogs, etc.).
- **Log plan deviations.** When the actual codebase differs from what the plan assumes (e.g., model fields don't exist, method signatures differ, enum values are different), log it inline: `DEVIATION: Plan assumes X, actual codebase has Y`. Adapt the implementation to reality but do NOT silently adjust — the deviation log helps catch plan quality issues for future sessions.

---

## Phase 3: Deploy & Verify {#deploy-verify}

After all tasks are complete, run the plan's final verification task. If the plan doesn't have one, construct it from this checklist — each item is an intent; use the host repo's own commands (read its README/CLAUDE.md/CI config for the conventions):

### Verification Checklist

Run every applicable item. Do NOT skip verification steps. Do NOT rely solely on tests passing.

- [ ] **Lint & format:** run the repo's linter and format check; expect zero errors.
- [ ] **Full test suite:** run it end-to-end — expect no regressions, not just "my new tests pass".
- [ ] **Database migrations:** if any were added, apply them with the repo's migration tool against the dev database.
- [ ] **Deploy to an isolated stack:** bring the app up from the worktree (compose stack, dev server, whatever the repo uses) with ports/project names that don't collide with other running stacks.
- [ ] **API verification:** Use `curl` or CLI commands to verify every new/modified endpoint returns the expected payload shape as defined in the spec.
- [ ] **Frontend verification** (fallback ladder — use the first level that works):
  1. **Playwright MCP** (preferred): authenticate, navigate to each affected page, walk through every user journey from the spec, check for console errors, take screenshots.
  2. **If Playwright fails**: attempt recovery once (clear cache, new tab). If still dead, move to level 3.
  3. **Programmatic fallback**: `curl` the dev server routes (expect 200), verify the JS bundle contains expected component imports (`curl <bundle-url> | grep`), run type checks (`vue-tsc`, `tsc --noEmit`) and build (`npm run build`).
  4. **Suggest tooling fix**: propose concrete commands to restore browser testing. Do NOT ask the user to manually test features — that defeats the purpose of automated verification.

  Never skip frontend verification entirely. Never fall back to "please check manually."
- [ ] **Manual spot check:** Run actual scenarios in the development environment. Verify functionality by interacting with the system as a user would. Do NOT only rely on automated tests.
- [ ] **Seed data:** if seed/fixture data files changed, re-seed per the repo's conventions before spot-checking.

### Verification Failures

When verification reveals issues:
1. Fix the issue
2. Add a test that would have caught it (expand the automated test suite)
3. Re-run the relevant verification steps
4. Continue until all checks pass

---

## Phase 4: Spec Compliance Review {#spec-compliance}

After verification passes, do a final compliance check:

1. **Re-read the spec.** Go through every section and FR-ID. Confirm each requirement is implemented and verified.
2. **Re-read the plan.** Check every task's "Done when" criteria. Confirm nothing was skipped.
3. **List any gaps** between the spec/plan and the final implementation. If gaps exist, fix them before proceeding.

---

## Phase 5: Commit & Report {#commit-report}

1. **Commit all changes** with a clear commit message referencing the plan.
2. **Report to the user:**
   - What was implemented (task summary)
   - Verification results (which checks passed)
   - Any gaps found and how they were resolved
   - Any new tests added from discovered issues
   - Worktree location and deployed-stack status

Do NOT tear down the worktree's stack — the user may want to inspect it. Include the exact teardown command for the stack you brought up in the report.

3. **Invoke `/pmos-toolkit:verify`** to run the full post-implementation verification gate. This is the next pipeline stage (`/execute → /verify`). Do NOT consider execution complete until /verify has run.

---

## Evidence Before Claims

Every verification claim must have fresh evidence. Run the command, read the output, THEN make the claim.

| Claim | Required | Not Sufficient |
|-------|----------|----------------|
| "Tests pass" | Test output: "X passed, 0 failed" | Previous run, "should pass" |
| "Lint clean" | Linter output: 0 errors | "I didn't change style" |
| "Build succeeds" | Build output: exit 0 | "Linter passed" |
| "Bug fixed" | Test original symptom: passes | "Code changed, assumed fixed" |

**Never use:** "should pass", "looks correct", "probably fine". If you haven't run the command in this step, you cannot claim the result.

---

## When to Stop

**Stop executing and escalate immediately when:**
- A dependency is missing or unavailable
- A test fails repeatedly after attempted fixes
- An instruction in the plan is unclear or contradictory
- Verification fails in a way you can't diagnose
- The plan itself appears to have a bug (e.g., task references a file that doesn't exist)

**Ask rather than guess.** A wrong guess costs more than a pause for clarification.

---

## Phase 6: Workstream Enrichment {#workstream-enrichment}

**Skip if no workstream was loaded in Phase 0.** Otherwise, follow `_shared/pipeline-setup.md` Section C. For this skill, the signals to look for are:

- Key implementation decisions → workstream `## Key Decisions`

This phase is mandatory whenever Phase 0 loaded a workstream — do not skip it just because the core deliverable is complete.

---

## Phase 7: Capture Learnings {#capture-learnings}

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing — surprising behaviors, repeated corrections, non-obvious decisions. Proposing zero learnings is a valid outcome for a smooth session; the gate is that the reflection happens, not that an entry is written.

---

## Anti-Patterns (DO NOT)

- Do NOT claim implementation is complete without running ALL verification steps
- Do NOT rely only on tests passing — manual verification is mandatory
- Do NOT skip Playwright MCP frontend testing when there are UI changes
- Do NOT deploy to the shared/main stack — use the worktree's isolated stack
- Do NOT leave discovered issues as "known gaps" — fix them and add tests
- Do NOT stop at the first passing test run — re-read the spec for completeness
- Do NOT silently re-do tasks marked `done` in `task-NN.md` without checking the `task_goal_hash` against the current plan — drift detection exists for a reason; surface `done-but-drifted` to the user instead of either skipping or quietly redoing

The subagent-driven path's never-do rules live in one place: `subagent-driven.md` → "Red flags".

---

*Spec lineage: the resume resolver and per-task/phase log schemas trace to `docs/pmos/features/2026-05-02_execute-resume-resolver/`; the phase-boundary `/verify` + compact handshake to `docs/pmos/features/2026-05-08_update-skills-retro-pipeline-friction/`; the /plan v2 contract (fields, shim, defect handoff) to `docs/pmos/features/2026-05-08_plan-skill-redesign/` (see `reference/plan-contract.md`); the wave planner, two-stage review, and controller-commits rules to `docs/pmos/features/2026-05-13_execute-subagent-mode/`.*
