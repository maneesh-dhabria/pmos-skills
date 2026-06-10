# Subagent-Driven Execution — prompt templates & model selection

Loaded by `execute/SKILL.md` → "Parallel Subagent-Driven Execution (`--subagent-driven`)".
**Self-contained:** no `../_shared/*` or `superpowers:*` reference is load-bearing. Written
with Claude Code tool names (`Task` dispatch, general-purpose agent); on platforms with no
subagent tool the path degrades to inline per `SKILL.md` Phase 0a and these templates are
not used.

## Model selection

Use the least powerful model that can do the job — conserves cost, increases throughput.
Name the tier explicitly via the Task tool's `model` parameter — qualitative sizing with no
pin converts to inherit-frontier in practice.

| Task shape | `model` |
|---|---|
| Touches 1–2 files, complete spec, mechanical (most well-specified plan tasks) | `haiku` |
| Multiple files, integration concerns, pattern-matching, debugging | `sonnet` |
| Architecture / design judgement / broad codebase understanding | inherit (omit the param) |

Review roles split by what checks them: the spec-compliance reviewer verifies code against a
written task spec — bounded, rubric-guided → `sonnet`; the code-quality and final
whole-implementation reviewers are design judgement over a full diff → inherit. Implementer
subagents are sized per the task.

---

## 1. Implementer subagent

Dispatch one per task in the wave, **all in a single message** (parallel). Each gets only what
it needs — never your session context.

```
Task tool (general-purpose, model per the table above):
  description: "Implement Task <N>: <task name>"
  prompt: |
    You are implementing Task <N>: <task name>, as part of a larger plan.

    ## Task (full text from the plan — do not look for a plan file, this is it)

    <PASTE the complete task block: Goal, Spec refs, Depends on, Idempotent,
     Requires state from, TDD, Data, Files, Steps>

    ## Context

    <Scene-setting: where this task fits in the feature; what upstream tasks already
     produced (files, interfaces, DB state) that this task builds on; the host repo's
     relevant conventions (point at CLAUDE.md sections); the worktree you are working in.>

    Work from: <worktree path>

    ## Before you begin

    If anything about the requirements, approach, dependencies, or assumptions is unclear,
    ask now (report NEEDS_CONTEXT) rather than guessing.

    ## Your job

    1. Implement exactly what the task specifies — nothing more (YAGNI), nothing less. Follow
       the file structure the task specifies and the codebase's established patterns; do not
       restructure things outside your task.
    2. Follow TDD per the task's `**TDD:**` value:
       - `yes — new-feature`: failing test → see it fail → minimal implementation → see it pass.
       - `yes — bug-fix`: regression test reproducing the bug → see it fail → fix → see it pass.
       - `no — <reason>`: no test-first; still verify behavior however the task says.

       ## Test quality

       <PASTE the "Test quality" block from execute/SKILL.md verbatim>
    3. Run the task's verification (the `Steps:` commands). If it fails, diagnose the root
       cause and fix — bounded to 3 attempts; each attempt must change something. If still
       failing after 3 attempts, stop and report BLOCKED with what you tried.
    4. Produce runtime evidence if the task is an API or UI task (curl the endpoint against
       the running dev server / open the page in the browser tool) and paste it. No runtime
       evidence for an API/UI task ⇒ the task is not done.
    5. **Do NOT `git commit`.** Leave your changes in the working tree. The controller commits
       after the wave. Report the exact list of files you created/modified.
    6. Self-review before reporting — completeness (every requirement, edge cases), discipline
       (no overbuilding, existing patterns followed), tests (verify real behavior, not just
       mocks). Fix what you find first.

    ## When you're in over your head

    Bad work is worse than no work — you will not be penalized for escalating. STOP and report
    BLOCKED or NEEDS_CONTEXT when the task needs an architectural decision with multiple valid
    approaches, you can't get clarity on code beyond what was provided, the task involves
    restructuring the plan didn't anticipate, or you're churning without progress. If a file
    you're creating is growing well beyond the task's intent, report DONE_WITH_CONCERNS — do
    not split files on your own without plan guidance.

    ## Report format

    - **Status:** DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
    - What you implemented (or attempted, if blocked)
    - What you tested and the results (paste key output)
    - Runtime evidence (if API/UI task)
    - Files created/modified — exact paths
    - Self-review findings (if any)
    - Concerns / blockers (if any)

    Use DONE_WITH_CONCERNS if you finished but have doubts about correctness. BLOCKED if you
    cannot complete it. NEEDS_CONTEXT if you're missing information that wasn't provided. Never
    silently produce work you're unsure about.
```

---

## 2. Spec-compliance reviewer subagent

Dispatch **after** the implementer reports DONE/DONE_WITH_CONCERNS and the controller has
committed the task. Read-only. `model: sonnet` — bounded review against a written task spec.

```
Task tool (general-purpose, model: sonnet):
  description: "Spec-compliance review — Task <N>"
  prompt: |
    You are reviewing whether an implementation matches its specification. Verify everything
    yourself by reading the code — do NOT trust the implementer's report.

    ## What was requested

    <PASTE the task's full text from the plan>

    ## What the implementer claims they built

    <PASTE the implementer's report>

    ## The change to inspect

    In <worktree path>: the per-task commit `git show <sha>` (when `commit_cadence: per-task`),
    or — under `per-phase`/`manual` cadence, before the phase commit — the task's staged /
    working-tree change: `git diff --staged -- <files>` (or `git diff -- <files>`).

    ## Your job — verify by reading the actual code

    - Missing requirements: anything skipped, or claimed-but-not-actually-implemented?
    - Extra / unrequested work: things not in the task, over-engineering, "nice to haves"?
    - Misunderstandings: a requirement interpreted differently than intended — right
      feature, wrong way?

    ## Report

    - `✅ Spec compliant` — everything matches after code inspection, nothing extra; OR
    - `❌ Issues found` — list each one specifically, with `file:line` references and whether
      it's "missing" or "extra".
```

The `❌` → fix → re-review loop is owned by `SKILL.md` Step B (3.iii).

---

## 3. Code-quality reviewer subagent

Dispatch **only after spec-compliance is `✅`**. Read-only. Judgement over a full diff →
inherit the session model (omit `model`).

```
Task tool (general-purpose, inherit — omit `model`):
  description: "Code-quality review — Task <N>"
  prompt: |
    You are reviewing the quality of an implementation. Read the actual diff.

    ## Change to review

    Task <N> from <plan path>. Commit(s): <SHA(s)> (range <base>..<head>). Worktree: <path>.
    Implementer's summary: <paste>.

    ## Project conventions

    <Point at CLAUDE.md / AGENTS.md sections relevant to these files; paste key rules.>

    ## Check

    Standard code-quality concerns (bugs, correctness, error handling, naming, tests that
    verify behavior, security, no dead code), plus:
    - Does each file have one clear responsibility with a well-defined interface?
    - Are units decomposed so they can be understood and tested independently?
    - Does this change follow the file structure the plan specified?
    - Did this change create files that are already large, or significantly grow existing
      files? (Don't flag pre-existing file sizes — only what this change contributed.)

    ## Report

    - **Strengths:** …
    - **Issues:** grouped Critical / Important / Minor, each with `file:line` and a concrete fix.
    - **Assessment:** Approved | Changes required.
```

The Critical/Important → fix → re-review loop is owned by `SKILL.md` Step B (3.iii).

---

## 4. Final whole-implementation reviewer subagent

Dispatch once, after the last wave. Read-only. Whole-implementation judgement → inherit the
session model (omit `model`). This is the subagent form of
`SKILL.md` Phase 4 (spec compliance review).

```
Task tool (general-purpose, inherit — omit `model`):
  description: "Final review — whole implementation"
  prompt: |
    You are doing a final review of a completed implementation against its spec.

    ## Spec

    <PASTE the spec, or point at 02_spec.{html,md} and paste the FR list + "Done when".>

    ## The full change

    Range: <base SHA>..<HEAD> in <worktree path>. Run `git diff <base>..<HEAD>` and read it.

    ## Check

    - Every spec section / FR-ID: implemented and verified? Any gaps?
    - Every plan task's "Done when": met? Anything skipped?
    - Cross-cutting: consistency, no regressions, no leftover debug code / temp files,
      docs/changelog updated where the plan said so.

    ## Report

    - Per-FR status table (FR-ID → implemented? verified? notes).
    - Gaps (if any), each with what's missing and where.
    - Overall: ready to hand to /verify | needs fixes first.
```

Gap handling and the hand-off to Phases 3/5 are owned by `SKILL.md` Step C.

---

## Red flags (subagent-driven path)

- Starting implementation on `main`/`master` without explicit user consent.
- Dispatching two implementer subagents in parallel for tasks that share a file or have a
  dependency edge between them.
- Letting implementer subagents `git commit` (controller commits, serially, with `T<N>` subjects).
- Skipping a review, running code-quality before spec-compliance is `✅`, or moving to the next
  wave with a task's review still open.
- Making a subagent read the plan file, or leaking your session context into a subagent prompt.
- Accepting "close enough" on spec compliance, or letting an implementer's self-review replace
  the actual reviewer.
- Re-dispatching the same model on a BLOCKED/NEEDS_CONTEXT report without changing anything.
- Treating `--subagent-driven` as mandatory — it degrades to inline on platforms without subagents.
