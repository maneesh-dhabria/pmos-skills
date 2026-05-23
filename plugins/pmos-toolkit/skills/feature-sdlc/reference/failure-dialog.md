# Failure dialog + missing-skill dialog (`/feature-sdlc`)

## Contents

- [Failure dialog (child skill errored)](#failure-dialog-child-skill-errored)
- [Missing-skill dialog (child skill not installed)](#missing-skill-dialog-child-skill-not-installed)
- [Construction algorithm](#construction-algorithm)
- [Free-form / edge-case replies](#free-form--edge-case-replies)
- [Anti-patterns](#anti-patterns)

---

When a child skill errors mid-phase, or when a child skill is not installed at invocation time, surface the situation to the user via `AskUserQuestion`. Option lists are constructed from the phase's `hardness` tag (per `state-schema.md`) so this contract has a single source of truth — never per-phase if/else in SKILL.md prose.

Free-form / out-of-options replies are handled per `_shared/structured-ask-edge-cases.md`.

---

## Failure dialog (child skill errored)

Triggered after the child skill's invocation returns with an error or exits without producing the expected artifact.

### Hard phases — Skip option HIDDEN

Per FR-PHASE-TAGS (spec §15 G5). Hard phases: `requirements`, `spec`, `plan`, `execute`, `verify`, `complete-dev`.

```
question: "<phase> failed: <one-line error>. How to proceed?"
options:
  - Retry this phase (Recommended)
    description: Re-invoke the child skill from scratch.
  - Pause-resumable
    description: Exit cleanly; re-run with --resume after fixing the underlying issue.
  - Abort pipeline
    description: Stop the entire /feature-sdlc run. State is preserved; no automatic cleanup.
```

`status` written: `failed` (Retry → re-invokes; success on retry overwrites to `completed`). `Pause-resumable` writes `status: paused, paused_reason: failure, last_error: <summary>` per `compact-checkpoint.md` Failure-pause variant. `Abort` writes `status: failed` and exits with non-zero code 2.

### Soft phases — Skip option SHOWN

Soft phases: `grill`, `msf-req`, `creativity`, `wireframes`, `prototype`, `simulate-spec`.

```
question: "<phase> failed: <one-line error>. How to proceed?"
options:
  - Retry this phase (Recommended)
    description: Re-invoke the child skill from scratch.
  - Skip this stage
    description: Mark the stage skipped-on-failure and continue to the next phase. Optional stages only.
  - Pause-resumable
    description: Exit cleanly; re-run with --resume after fixing the underlying issue.
  - Abort pipeline
    description: Stop the entire /feature-sdlc run.
```

`Skip this stage` writes `status: skipped-on-failure` and continues.

### Infra phases

Infra phases (`setup`, `worktree`, `init-state`, `final-summary`, `capture-learnings`) do not use this dialog — failures here are bugs in `/feature-sdlc` itself or in the host environment (e.g., git not installed). Surface the underlying error directly and abort with a fix-it-and-retry message; do not present a multi-option dialog.

---

## Missing-skill dialog (child skill not installed)

Detected via the platform's "skill not found" / "unknown skill" error after attempting to invoke the child. Pre-flight detection at Phase 0 is best-effort only — the source of truth is the invocation-time response.

Per FR-MISSING-SKILL / spec §15 G10.

### Hard phase missing — no Skip

```
question: "Skill /pmos-toolkit:<name> is not installed. /<name> is a required phase. How to proceed?"
options:
  - Abort pipeline (Recommended)
    description: Stop the run. Install the skill (e.g., `pmos-toolkit` plugin upgrade) and re-invoke /feature-sdlc.
  - Pause to install
    description: Exit cleanly; install the skill, then re-run with --resume.
```

`Pause to install` writes `status: paused, paused_reason: missing_skill, missing_skill: <name>`. `Abort` writes `status: failed` with `last_error: missing_skill: <name>`.

### Soft phase missing — Skip allowed

```
question: "Skill /pmos-toolkit:<name> is not installed. <name> is an optional stage. How to proceed?"
options:
  - Skip stage (Recommended)
    description: Mark the stage skipped-unavailable and continue.
  - Abort pipeline
    description: Stop the run.
  - Pause to install
    description: Exit cleanly; install the skill, then re-run with --resume.
```

`Skip stage` writes `status: skipped-unavailable`.

---

## Construction algorithm

```
on phase failure or missing-skill:
  hardness = state-schema lookup for phase.id
  if dialog == "failure":
    if hardness == "hard":  options = [Retry(R), Pause, Abort]
    if hardness == "soft":  options = [Retry(R), Skip, Pause, Abort]
    if hardness == "infra": no dialog — bubble error and abort
  if dialog == "missing-skill":
    if hardness == "hard":  options = [Abort(R), Pause-to-install]
    if hardness == "soft":  options = [Skip(R), Abort, Pause-to-install]
```

`(R)` = `(Recommended)`.

---

## Free-form / edge-case replies

Out-of-options replies (user picks `Other` or types a free-form reply) are handled per `_shared/structured-ask-edge-cases.md`. The default fallback for any unrecognized reply is to re-issue the same dialog after summarizing what was said — never silently pick an option on the user's behalf.

---

## Anti-patterns

- **Don't show the Skip option on hard phases.** That's the silent-skip footgun the contract was designed to prevent.
- **Don't auto-skip a missing soft skill** without surfacing the dialog. Even on `Recommended=Skip`, the user must see the choice (the auto-pick path applies only in `--non-interactive` mode and is logged with reason).
- **Don't omit `last_error`** when writing `status: failed` or `paused_reason: failure`. Resume needs it to re-present the dialog meaningfully.
