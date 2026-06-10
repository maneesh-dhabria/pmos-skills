# Compact checkpoint + Pause-resumable contract (`/feature-sdlc`)

`/feature-sdlc` cannot directly trigger `/compact` — that's a harness limitation; only the user can. So before each context-heavy phase, the skill surfaces a checkpoint via `AskUserQuestion`. If the user picks Pause, the skill exits cleanly and the user runs `/compact` and re-invokes the skill with `--resume`.

The exit contract is precise — without that precision, resume can't be tested or trusted.

---

## When the checkpoint fires

Mode- and tier-dependent:

- **feature + prototype modes:** before `wireframes` (Phase 3b), `prototype` (Phase 3c), `execute` (Phase 6), `verify` (Phase 7) — the last two only in modes that run them.
- **skill modes (`skill-new` / `skill-feedback`):** before `execute` (Phase 6) and `verify` (Phase 7) **only** — Phases 3b/3c are not presented in skill modes, and Phase 6a (`skill-eval`) is light (scoring), so no checkpoint fires before 6a.
- **Tier 1 runs skip the checkpoint entirely** — a bug-fix-scope run is short; four interrupts cost more than the context risk they hedge (and auto-compact covers the residual). Tier 2+ fires as listed.

(The former `simulate-spec` phase was a trigger pre-v2.34.0; it has since been folded into `/spec`.)

Phases not listed here run without a checkpoint — their context cost is light enough that interrupting flow is the bigger cost.

---

## The `AskUserQuestion`

```
question: "About to enter <phase>. This phase is context-heavy. Compact your context window before continuing, continue without compacting, or pause to compact and resume later?"
options:
  - Continue (Recommended)
    description: Proceed with current context. Pick this if you compacted recently or you're confident the context window has headroom.
  - Pause to /compact, then resume
    description: I'll exit cleanly with state.yaml saved. You run /compact yourself, then re-invoke with --resume.
  - Continue without compacting
    description: Same as Continue — included for cases where the user explicitly wants to acknowledge they're not compacting.
```

Note: "Pause to /compact" is the only option that exits the skill. The other two continue execution.

This is **not** a Findings Presentation Protocol prompt — it's a single-turn structured ask with a clear `(Recommended)`. It does not need the protocol.

---

## Pause-resumable exit contract

When the user picks **Pause to /compact, then resume**, do exactly three things, in order:

### 1. Update `state.yaml`

In the `phases[]` entry for the phase about to start (the one the checkpoint precedes), set:

```yaml
- id: <phase>
  status: paused
  paused_at: <ISO-8601 now>
  paused_reason: compact
  last_error: null
```

Also update top-level `current_phase: <phase>` and `last_updated: <ISO-8601 now>`. Regenerate `00_pipeline.{html,md}` per `pipeline-status-template.md` "Update protocol".

### 2. Print the resume command to chat — verbatim

Emit exactly this line (substituting the worktree's absolute path and the phase id):

```
Paused at phase <phase-id>. To resume: cd <worktree-abs-path> && /pmos-toolkit:feature-sdlc --resume
```

The platform-aware variant of `/pmos-toolkit:feature-sdlc` comes from `_shared/platform-strings.md` (`execute_invocation`-style mapping). Use the platform-correct form.

### 3. Exit normally

- Exit code 0 (this is a clean pause, not an error).
- No thrown error or stack trace.
- No further phases run.

The next invocation of the skill (with `--resume`, or no-arg in a worktree containing a `paused` state.yaml) re-enters at Phase 0b, surfaces the status table, and resumes from the paused phase. Resuming re-invokes the child skill from scratch — orchestrator state is phase-level only; child task-level resume is the child's responsibility.

---

## Failure-pause variant

The same exit contract applies when the user picks `Pause-resumable` from a **failure dialog** (see `failure-dialog.md`), with two differences:

- `paused_reason: failure` (instead of `compact`).
- `last_error: <one-line summary>` populated from the failure that triggered the dialog.

Resume re-presents the failure dialog (Retry / [Skip on soft] / Pause-resumable / Abort) so the user can pick a different disposition.

---

## Resume Status panel

When the user re-invokes /feature-sdlc with `--resume` (or detects an existing `paused` state.yaml in the worktree), the skill emits a **single chat block** consolidating status table + folded-phase-failures + OQ index. This replaces the multi-print pattern used in earlier versions (one block, one read).

Block format (verbatim — substitute placeholder values from `state.yaml`):

```text
=== Resume Status ===

Slug:        <slug>
Tier:        <1|2|3>
Mode:        <interactive|non-interactive>
Branch:      <feat/<slug>>
Worktree:    <abs path>
Paused:      <ISO-8601> (<paused_reason>)

| Phase | Status | Artifact |
|-------|--------|----------|
| <phase> | <status> | <artifact_path or —> |
| ... |

<!-- Folded-phase failures subsection — emit only when ≥1 phase has non-empty folded_phase_failures[]; otherwise omit entirely. Format per pipeline-status-template.md "Folded-phase failures (N)". -->

Folded-phase failures (N):
[<phase>] <folded-skill> crashed: <error_excerpt> (ts: <ts>)
...

<!-- Open-questions subsection — emit only when state.yaml.open_questions_log[] is non-empty; otherwise omit. -->

Open questions index: <feature_folder>/00_open_questions_index.md (N deferred)

Resume cursor lands on: Phase <N> /<phase-id>

=== End Resume Status ===
```

Emission rules:

1. The block is emitted exactly once per `--resume` invocation, BEFORE the orchestrator surfaces any new prompt or dispatches the next child skill.
2. The status table includes all non-`pending` phases plus the next pending phase (same rule as the in-chat short-form table from `pipeline-status-template.md`).
3. The "Folded-phase failures (N)" line uses the same N-counting and same per-failure format as the Phase-9 emission; when N=0 across all phases, omit the entire subsection.
4. The "Open questions index" line is emitted only when `open_questions_log[]` is non-empty.

This single-block contract is what /feature-sdlc Phase 0b and Phase 9 both render; they share this template.

---

## Anti-patterns

- **Don't auto-trigger /compact.** Skills cannot. Pretending otherwise breaks the resume contract — the next invocation finds inconsistent state.
- **Don't skip step 2.** The chat resume command is what makes the pause discoverable; without it the user doesn't know how to come back.
- **Don't write `paused_reason: compact` for every pause.** Failure-pauses use `failure`; user-initiated mid-phase pauses use `user`; missing-skill pauses use `missing_skill`. Drift here makes resume telemetry meaningless.
- **Don't update `state.yaml` and skip `00_pipeline.{html,md}`.** Both must agree at every read — atomic-write rule from `pipeline-status-template.md`.

---

*Spec lineage: `docs/pmos/features/2026-05-09_feature-sdlc-skill/` (pause-resumable contract), `2026-05-10_feature-sdlc-worktree-resume/` (Resume Status panel, single-block rule).*
