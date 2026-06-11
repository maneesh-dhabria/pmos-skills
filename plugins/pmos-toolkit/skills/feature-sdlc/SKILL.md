---
name: feature-sdlc
description: End-to-end SDLC orchestrator. `/feature-sdlc <idea>` turns an idea into a shipped feature via the pmos-toolkit pipeline — worktree, optional /ideate, requirements, grill, optional creativity/wireframes/prototype, spec, plan, execute, verify, complete-dev — auto-tiering each stage with resumable state. `/feature-sdlc skill <description>` / `skill --from-feedback <text|path|--from-reflect>` authors or revises skills the same way, scored against the binary skill-eval rubric before merge. `/feature-sdlc prototype <seed>` runs the discovery half only. `/feature-sdlc list` shows in-flight worktrees. `/skill-sdlc` and `/prototype-sdlc` are thin aliases. Triggers — "build this feature end-to-end", "run the full SDLC", "take this idea through to ship", "drive the pipeline for me", "create a skill", "author a new skill", "build me a slash command", "turn this workflow into a skill", "apply this retro feedback to the skill", "I have a half-formed idea", "prototype this idea end-to-end", "stakeholder-walkable prototype".
user-invocable: true
argument-hint: "[skill [--from-feedback] | prototype] <description|idea> [--from-reflect] [--tier 1|2|3] [--resume] [--no-worktree] [--format html|md] [--non-interactive | --interactive] [--backlog <id>] [--minimal] [--reset-defaults] | list"
---

# Feature SDLC

Top-level orchestrator that drives the full pmos-toolkit pipeline from an initial idea (or a skill-authoring task) through to ship. Creates a git worktree + branch, runs the child skills sequentially, auto-tiers each stage, and persists resumable state inside the worktree. Four run modes share the machinery; the subcommand picks one. `/skill-sdlc` and `/prototype-sdlc` are thin aliases for the `skill` and `prototype` subcommands. See `reference/skill-patterns.md` (the authoring guide) and `reference/skill-eval.md` (the rubric) for the skill modes' acceptance criteria.

**Announce at start:** "Using feature-sdlc — orchestrating the full SDLC pipeline for this feature." (In a skill mode: "…for this skill." In prototype mode: "Using feature-sdlc — orchestrating the discovery half of the pipeline for this prototype.")

## Pipeline position

```
/feature-sdlc (this skill)        — four run modes; the subcommand picks one:
    └─> [worktree + slug]            • bare  /feature-sdlc <idea>            → pipeline_mode = feature
        └─> [feedback-triage]        • /feature-sdlc skill <description>     → pipeline_mode = skill-new
        └─> [skill-tier-resolve]     • /feature-sdlc skill --from-feedback <text|path|--from-reflect> → skill-feedback
        └─> [/ideate]                • /feature-sdlc prototype <seed>        → pipeline_mode = prototype
        └─> /requirements            (/skill-sdlc, /prototype-sdlc are thin aliases)
              └─> [/grill] └─> [/creativity] └─> [/wireframes └─> /prototype]
        └─> /spec → /plan → /execute → [/skill-eval] → /verify → /complete-dev → [/reflect]
```

**Mode × phase** (presentation: which gates present per mode — execution order and hardness live in `reference/state-schema.md` § "Phase identifiers + hardness", the single source for `phases[]` membership):

| Phase | `feature` | `skill-new` | `skill-feedback` | `prototype` |
|---|---|---|---|---|
| `0c` /feedback-triage | — | — | ✓ (hard) | — |
| `0d` /skill-tier-resolve | — | ✓ (infra) | ✓ (infra) | — |
| `0e` confirm soft-gate defaults | ✓ (2nd-run) | ✓ (2nd-run) | ✓ (2nd-run) | — |
| `1a` /ideate gate | ✓ (soft) | ✓ (soft) | — | ✓ (soft) |
| `2` /requirements · `2a` /grill · `3a` /creativity | ✓ | ✓ | ✓ | ✓ |
| `3b` /wireframes · `3c` /prototype | ✓ (soft gates) | — | — | ✓ (hard, always-run) |
| `4` /spec | ✓ | ✓ | ✓ | ✓ (runs before 3b — see `#prototype-ordering`) |
| `5` /plan · `6` /execute · `7` /verify · `8` /complete-dev · `8a` /reflect | ✓ | ✓ | ✓ | — |
| `6a` /skill-eval | — | ✓ (hard) | ✓ (hard) | — |
| `9` final-summary | ✓ | ✓ | ✓ | ✓ |

(`/msf-req` and `/simulate-spec` are folded inside `/requirements` (`#folded-msf`) and `/spec` (`#folded-sim-spec`) — no longer orchestrator phases.)

`/feature-sdlc` is a top-level orchestrator, not a pipeline stage. Standalone — invoke at the moment you have an idea (or a skill to author/revise) and want to ship it end-to-end.

## Flags & natural language

Every option also has a natural-language form — infer it from the request; an explicit flag overrides. Canonical phrasings: "resume the pipeline" ≡ `--resume`, "skip all the optional stages" ≡ `--minimal`, "don't bother with a worktree" ≡ `--no-worktree`, "forget my saved gate answers" ≡ `--reset-defaults`. Two spellings stay parsed for back-compat but are deliberately not advertised:

<!-- nl-sugar -->
- `--no-ideate` — pre-skips the Phase 1a gate; redundant with the deterministic fuzzy-seed classifier (which auto-skips formed seeds) and the gate's own Skip option.
<!-- nl-sugar -->
- `--format both` — retired value, treated as `html` (the mixed-format MD sidecar is retired); `--format <html|md>` is the documented contract.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No interactive prompt tool:** Slug confirmation, the Phase 0e soft-gate-defaults confirm, optional-stage gates, compact checkpoint, failure dialog, and resume status table all degrade to numbered free-form prompts per `_shared/interactive-prompts.md`. The non-interactive auto-pick contract still applies (Recommended → AUTO-PICK).
- **No subagents:** Pipeline dispatch is sequential per-phase by design; no parallel work to degrade.
- **TaskCreate / TodoWrite missing:** Skill body works without task tracking; the pipeline-status table in `00_pipeline.{html,md}` is the canonical progress artifact.
- **`.pmos/settings.yaml` missing:** Run `_shared/pipeline-setup.md` Section A first-run setup before resolving paths.
- **Non-interactive contract:** the canonical `<!-- non-interactive-block -->` below inlines the contract from `_shared/non-interactive.md` byte-for-byte (audit-recommended.sh greps for it).
- **Platform-aware strings:** the resume command in `reference/compact-checkpoint.md` and the `[mode: <current-mode>]` subagent prefix use the per-platform `execute_invocation` mapping in `_shared/platform-strings.md`.
- **Out-of-options replies in any structured ask:** see `_shared/structured-ask-edge-cases.md`. Do not silently pick on the user's behalf.
- **Worktree creation fails (no git, detached HEAD, dirty tree, branch collision):** see Phase 0a — surface the precise git error, offer `--no-worktree` fallback, or trigger the branch-collision dialog.
- **Child skill missing:** present the missing-skill dialog from `reference/failure-dialog.md` (Skip / Abort / Pause-to-install; hard phases omit Skip). Pause-to-install writes `status: paused, paused_reason: missing_skill, missing_skill: <name>` and exits per the pause contract.

## Track Progress

This skill has multiple phases. Create one task per phase using your agent's task-tracking tool (e.g., `TaskCreate` in Claude Code, `TodoWrite` equivalent in older harnesses). Mark each task in-progress when you start it and completed as soon as it finishes — do not batch completions.

## Phase 0: Pipeline setup + Load Learnings {#pipeline-setup}

### Subcommand dispatch {#dispatch}

Before running pipeline-setup, resolve `pipeline_mode ∈ {feature, skill-new, skill-feedback, prototype}` from the argument string. This is independent of the `mode ∈ {interactive, non-interactive}` resolution in the non-interactive block below — both are computed at Phase 0 entry; do not conflate them.

**The dispatch principle:** the first token selects the mode **only** when it is exactly `skill`, `prototype`, or `list`; everything after the selector is the seed (quoting is not required — the whole remainder is one seed). Never infer the run mode from seed *content* — a bare description is always `feature` mode, even if the text describes a skill or says "prototype". The genuinely tricky cases:

- `/feature-sdlc prototype this in detail` → `prototype` mode, seed = `this in detail` (token 1 is a selector; the rest is the seed — if the user meant a feature *about* prototyping, they rephrase or quote the whole string).
- `/feature-sdlc list of recently changed files` → token 1 is `list` but a seed follows; `list` takes no seed → treat as `feature` mode with the whole string as seed. `list` selects only when it is the sole token.
- `/feature-sdlc skill` alone → usage error (below), not a feature run with seed "skill".

**Dispatch:**

- **`--resume` present:** ignore any subcommand token entirely — `pipeline_mode` is read from `state.yaml` (set on the original run). If both `--resume` and a subcommand token are present → stderr warn `subcommand ignored on --resume; mode read from state.yaml` and continue with the state-file value. (The aliases forward `--resume` without their subcommand prefix for exactly this reason.)
- **`list` (sole token):** short-circuit — skip pipeline-setup, Phase 0a, and Phase 0b; run the `list` logic below; exit 0.
- **`skill` with no further description:** stderr `usage: /feature-sdlc skill <description> | /feature-sdlc skill --from-feedback <text|path|--from-reflect>`; exit 64.
- **`skill --from-feedback <source>`:** `pipeline_mode = skill-feedback`. `<source>` is a quoted text blob, a file path, or `--from-reflect` (resolves to the `/reflect` output present in the current conversation — `/reflect` writes no artifact file; none present → stderr `no /reflect output in this conversation; pass feedback text or a file path`, exit 64). Neither a source nor `--from-reflect` → the usage error above, exit 64.
- **`skill <description>`:** `pipeline_mode = skill-new`; the description is the seed for Phase 2.
- **`prototype` with no seed:** stderr `usage: /feature-sdlc prototype <seed>`; exit 64.
- **`prototype <seed>`:** `pipeline_mode = prototype`. Execution stops after Phase 3c (see `#prototype-ordering`); the worktree and branch are left intact to extend manually (edit `state.yaml.pipeline_mode` → `feature` and `--resume`) or discard.
- **bare (no selector):** `pipeline_mode = feature`; the whole argument string (minus recognised flags — the list lives in `reference/fuzzy-idea-detection.md` § Inputs) is the feature seed.

On Phase 0 entry, log to chat `pipeline_mode: <m> (source: cli|state)` (`cli` fresh, `state` on `--resume`) — alongside the `mode: <mode> (source: …)` line from the non-interactive block; keep both lines.

### `list` logic {#list}

Run `git worktree list --porcelain` (git error → surface it, exit 64). Filter to worktrees whose branch matches `feat/*` (detached entries skipped); read each `<worktree>/.pmos/feature-sdlc/state.yaml`. Emit one Markdown table — columns `Slug | Branch | Phase | Last updated | Worktree` — ordered by `last_updated` descending (ties: slug ascending; no-state rows last). Degradations in the `Phase` column: `schema_version < 3` → append ` (legacy v1/v2)`; no state.yaml → `(no state)`; recorded path missing on disk → `(worktree path missing)`. No `feat/*` worktrees → emit `No in-flight features. Start one with /feature-sdlc <seed>.` and no table. Raw timestamps only — no stale-detection. Exit 0.

### Setup

Inline `_shared/pipeline-setup.md` (relative to the skills directory) to:

1. Read `.pmos/settings.yaml`. If missing → run Section A first-run setup before proceeding.
2. Set `{docs_path}`; resolve `{feature_folder}` = `{docs_path}/features/{YYYY-MM-DD}_<slug>/` (slug derived in Phase 0a; placeholder until then).
3. If `settings.workstream` is non-null → load `~/.pmos/workstreams/{workstream}.md` and pass through to every child skill. Workstream IS loaded — this is a feature-level orchestrator.
4. Read `~/.pmos/learnings.md` if present; note any entries under `## /feature-sdlc` and factor them into your approach. Skill body wins on conflict; surface conflicts to user before applying.

**Load soft-gate defaults.** Read `.pmos/feature-sdlc.lastrun.yaml` from `<main-repo-root>` (resolved via git per `reference/soft-gate-lastrun-schema.md` § Path — NOT the per-feature worktree, so the memory survives worktree cleanup) into an in-memory `soft_gate_defaults` dict: present+valid → seed it (Phase 0e will fire); absent → leave unset (first run — each gate prompts individually); malformed/`version>1` → stderr warn `feature-sdlc.lastrun.yaml malformed or unknown version — falling back to per-gate prompts` and treat as absent; `--reset-defaults` → bypass the read, treat as absent. Never error out — this file is advisory.

### output_format resolution

Read `output_format` from `.pmos/settings.yaml` (default `html`; valid `html`/`md`; `both` accepted but treated as `html` — the mixed-format MD sidecar is retired). A `--format` flag overrides settings (last flag wins). Print to stderr exactly `output_format: <value> (source: <cli|settings|default>)` once at Phase 0 entry. Pass the resolved value to every dispatched child via an `[output_format: <resolved>]\n` line after the `[mode: <current-mode>]\n` first line, so children inherit without re-reading settings.

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

### Tier resolution

`{tier}` is set from (in precedence order): (1) `--tier N`; (2) in skill modes, Phase 0d's matrix resolution (a `--tier` flag still overrides, logging a divergence note); (3) `/requirements`' auto-tier output after Phase 2; (4) until resolved, gate-recommendation logic uses Tier-3 conservative defaults.

`{tier}` drives BOTH child-skill `--tier` passthrough (only `/requirements`, `/spec`, `/plan` accept it) AND orchestrator gate logic (Phases 2a, 3a, 3b, 3c, 8a). Children retain the right to auto-tier-escalate; if a child reports a different tier, log it to `state.yaml.phases.<X>.child_tier_divergence` and continue — do not override the child.

### `--minimal` sentinel

If `--minimal` is present, set `_minimal_active = true` for the run. At Phases 3a, 3b, 3c, and 8a, when true, log `[orchestrator] phase_minimal_skip: <phase-id>` to chat and proceed WITHOUT issuing that gate prompt. This is an orchestrator-level short-circuit — the gates are never issued, so the classifier never sees them; `--minimal` is user-explicit, so it does not violate Anti-pattern #4. Hard phases are unaffected. (In skill modes 3b/3c are already not presented, so it affects only 3a and 8a.)

## Phase 0a: Worktree + Slug + Branch {#worktree}

**Skip if `--no-worktree` was passed** — record `worktree_path: null, branch: null` in `state.yaml` and continue in cwd; state path is `./.pmos/feature-sdlc/state.yaml`; the base-drift check is bypassed. (Dirty-tree case: still refuse — see check (3) — since `/execute` will commit to the current branch.)

### Step 1 — Derive slug

Apply `reference/slug-derivation.md` to the initial-context input. Surface the proposed slug:
```
question: "Proposed feature slug: <slug>. Confirm or edit?"
options:
  - Use this slug (Recommended)
  - Edit
  - Cancel
```

### Step 2 — Unified pre-flight

Before `git worktree add`, run all six checks; on any collision surface a single unified dialog:

| Check | Condition | On failure |
|---|---|---|
| (1) cwd is git repo | `git rev-parse --is-inside-work-tree` | abort: `not a git repo — cd to your repo or pass --no-worktree` |
| (2) HEAD not detached | `git symbolic-ref -q HEAD` returns 0 | abort: `detached HEAD — checkout a branch first or pass --no-worktree` |
| (3) Working tree clean | `git status --porcelain` empty | abort: `dirty tree — commit/stash or pass --no-worktree` |
| (4) Candidate path absent | `<repo-parent>/<repo-name>-<slug>/` does not exist | collision dialog |
| (5) Branch absent | `git branch --list "feat/<slug>"` empty | collision dialog |
| (6) Worktree slot free | `git worktree list --porcelain` has no entry for path or slug | collision dialog |

On (4)/(5)/(6), one `AskUserQuestion`: **Use existing branch / worktree (Recommended)** (enters Phase 0b resume mode if state.yaml is present there; otherwise initializes fresh state on the existing branch with `state.notes` annotated `"reused-existing-branch:<reason>"`) / **Pick new slug (-N suffix)** (append `-2`, `-3`, … and re-run the pre-flight) / **Abort** (exit 64 with the collision details). If (4) fired but (6) did not (git no longer tracks the dir), the dialog wording MUST include `(orphan worktree dir detected — git no longer tracks it)`.

### Step 2.5 — Base-drift check

A worktree branched off a stale local main produces silent damage at merge time — version bumps land below the latest published, changelog entries collide, conflicts surface only at Phase 8. So, before `git worktree add`:

1. Resolve `<base>` = the branch currently checked out; `<remote>` from `git rev-parse --abbrev-ref <base>@{upstream}`. No upstream → log `base-drift: <base> has no upstream; skipping fetch` and proceed to Step 3.
2. `git fetch <remote> <base>`; `behind=$(git rev-list --count <base>..<remote>/<base>)`. Fetch failure → log `base-drift: fetch failed (<error>); proceeding without drift check` and continue (do NOT block on a flaky network).
3. `behind == 0` → log `base-drift: <base> up-to-date with <remote>/<base>; proceeding`.
<!-- defer-only: destructive -->
4. `behind > 0` → one `AskUserQuestion` BEFORE creating the worktree:

   ```
   question: "Local <base> is <N> commits behind <remote>/<base>. Pull latest before branching?"
   options:
     - Pull latest then branch (Recommended)     # git pull --ff-only <remote> <base>, then branch
     - Branch from current local <base> (record drift)   # state.yaml.base_drift records the gap
     - Abort                                      # exit 64; resolve manually
   ```

   On a non-fast-forward pull failure (local has diverging commits): surface the raw git error and present a follow-up:
<!-- defer-only: destructive -->
   `AskUserQuestion` — **Abort (Recommended)** / **Branch from current local <base> (record drift)**. Never auto-rebase or auto-merge; the user owns the diverging history.

   On record-drift: after state.yaml is written (Step 3), set `state.base_drift` per the shape in `reference/state-schema.md`.
5. **`--non-interactive`:** the prompt is deferred per the canonical block; the run continues with branch-from-current-local-`<base>` as the deferred default (the only option requiring no user judgement), writes `state.base_drift`, and the OQ entry flags it for end-of-run review.

Every branch of this step emits one chat log line: `base-drift: behind=<N> remote=<remote> base=<base> action=<pulled|recorded|skipped|aborted>`.

### Step 3 — Create worktree, write state, try EnterWorktree

1. `ABS_PATH="$(realpath -- "<repo-parent>/<repo-name>-<slug>")"` — canonical-path contract from `_shared/canonical-path.md`; fall back to the python3 oneliner when `realpath` is unavailable.
2. `git worktree add -b feat/<slug> "$ABS_PATH"` — on non-zero exit, surface the raw git error and abort (exit 64).
3. Write the initial state.yaml inside the new worktree per Phase 1 (canonical `worktree_path: $ABS_PATH`). It MUST exist before the next step so a fallback handoff produces a resumable artifact.
4. Call `EnterWorktree(path=$ABS_PATH)`.
   - Success: print to chat exactly `Entered worktree at $ABS_PATH on branch feat/<slug>. Continuing pipeline.` and proceed (Phase 1 is now a no-op — state already written).
   - Any error: emit the literal handoff block below, then a blank line, then the standalone line `Status: handoff-required` (no surrounding text — grep-able by wrapper scripts), then exit 0. Do NOT inspect the error message; all errors hand off identically.

**Handoff block (plain text, byte-for-byte; substitute `<ABS_PATH>` in both occurrences, no other interpolation):**

```
Worktree created at <ABS_PATH>.
State initialized at <ABS_PATH>/.pmos/feature-sdlc/state.yaml.

To continue the pipeline, run these two commands in a new terminal:

    cd <ABS_PATH>
    claude --resume

Then call /feature-sdlc --resume in the new session.
```

## Phase 0b: Resume detection {#resume}

**Skip if `--resume` was NOT passed AND no `.pmos/feature-sdlc/state.yaml` exists in the current worktree.** `--resume` with no state.yaml → hard error `--resume specified but no .pmos/feature-sdlc/state.yaml found in <cwd>. Either cd to the right worktree or omit --resume.` Exit 64.

When state.yaml is present:

1. **Drift check (FIRST, before any other validation).** Compute `realpath($PWD)` (same canonical-path contract + fallback as Phase 0a Step 3) and compare byte-equal to `state.worktree_path`. Before comparing, log `drift check: realpath(pwd)=<a> realpath(state.worktree_path)=<b> result=<pass|fail>`. On mismatch, exit 64 with:

   ```
   pre-flight check failed: realpath(pwd) [<actual>] != realpath(state.worktree_path) [<expected>]. Relaunch claude from <expected> and try again.
   ```

   Bypass: `state.worktree_path: null` (`--no-worktree` runs) skips the check.

   **Origin-moved check.** After the drift check passes, re-run the Step 2.5 fetch+behind logic for `state.base`/`state.remote` (re-derive via upstream if unrecorded). If `behind_now > (state.base_drift.behind || 0)`, log `origin-moved-since-worktree-created: behind_now=<N>, behind_at_create=<M>` and update/insert `state.base_drift`. Observability-only — do NOT prompt mid-resume; the user already chose to continue this branch. Fetch failure: log and proceed.

2. **Schema-version check.** The current version, abort-on-newer rule, and migration chain live in `reference/state-schema.md ## schema_version` — the single source; never hardcode version numbers here. Newer → abort `state file from newer /feature-sdlc version (vN); upgrade pmos-toolkit and retry` (exit 64). Older → run the migration chain in version order (additive, idempotent, each step logs to chat; pre-2.34.0 files first elide the removed `msf-req`/`simulate-spec` phase ids on read — those folded into `/requirements` `#folded-msf` and `/spec` `#folded-sim-spec` — silently on success). Atomic temp-then-rename write; on `rename(2)` failure surface the failure dialog.
3. **Validate recorded artifact paths.** For every non-null `phases[].artifact_path`, check the file exists. On any missing required artifact, print the list to chat and ask:
<!-- defer-only: ambiguous -->
   `AskUserQuestion` — **Continue anyway (treat as orphaned)** / **Abort**.
4. **Print the Resume Status panel** per `reference/compact-checkpoint.md` § "Resume Status panel" — one consolidated block: status table + `Folded-phase failures (N)` subsection (same format as Phase 9; omit when N=0) + OQ index line. The panel is **presentational, not interrogative** — followed by at most one structured ask (continue / abort) when needed; the orchestrator has no review loops of its own.
5. **Resume cursor:** jump to the first `phases[]` entry whose status ∈ `{paused, failed, pending, in_progress}`. The cursor is mode-agnostic — it scans whatever `phases[]` the original run wrote (mode-conditional per `reference/state-schema.md`); `pipeline_mode` is read back from state, never re-derived. A `paused`/`failed` entry first → surface the corresponding dialog (`reference/compact-checkpoint.md` for compact-paused; `reference/failure-dialog.md` for failed).
6. **Skip Phases 0a, 0e, and 1** (0c/0d are normal `phases[]` entries — the cursor handles them) — worktree, slug, state, and gate dispositions already exist.

## Phase 0c: /feedback-triage (skill-feedback only) {#feedback-triage}

**Runs only when `pipeline_mode == skill-feedback`** (mode-conditional by-design omission elsewhere). Hardness: **hard** — the only clean exit is "no actionable findings / no in-scope skills"; the approval gate is mandatory. Resume: a normal phase — re-enter from the persisted draft if present.

**Goal:** turn raw feedback into an approved, per-skill change set + per-skill tier, persisted as `{feature_folder}/0c_feedback_triage.html`, which Phase 2 seeds from.

1. **Parse the feedback into findings.** `/reflect` paste-back (or `--from-reflect`) → parse verbatim via `reference/reflect-parser.md`; file path → read it (structured list → parse; free prose → LLM-extract); inline text → LLM-extract. Finding shape: `{skill, severity, one_line, evidence (≤2 lines), proposed_fix (verbatim from input)}`.
2. **Resolve the in-scope skill set.** Map each finding's named skill to the installed-skill list (per `reference/repo-shape-detection.md`). Ambiguous / unrecognised names:
<!-- defer-only: ambiguous -->
   `AskUserQuestion` — present candidates; user maps or drops each. **Zero findings OR zero in-scope skills → exit clean with no artifacts** (log `Phase 0c: no actionable findings; nothing to do` and end the run).
3. **Per-finding critique** against the target skill's *current* `SKILL.md` plus only the reference files it cites: `already_handled ∈ {yes, no, partial}` · `classification ∈ {bug, ux-friction, new-capability, nit}` · `recommendation ∈ {fix-as-proposed, modify, skip, defer}` + one-line rationale · `scope_hint ∈ {small, medium, large}`.
4. **Keep/drop approval.** Present per `_shared/findings-dispositions.md` (the four dispositions — Fix as proposed / Modify / Skip / Defer — severity-ordered batches ≤4, one finding per question, platform fallback = numbered table with a disposition column). Call-site delta: if there are >20 findings, first ask:
<!-- defer-only: ambiguous -->
   `AskUserQuestion` — **Filter to blockers + friction only (Recommended)** / **Review all N**.
5. **Persist the triage doc** at `{feature_folder}/0c_feedback_triage.html` via the HTML substrate (`${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/` — companion `.sections.json`, asset prefix `assets/`, cache-bust, kebab heading ids, index regen), structured per `reference/triage-doc-template.md`. Record `feedback_source` + `target_skills: […]` and `artifact_path` on the `feedback-triage` state entry.
6. **Hand off to Phase 2.** Build the `/requirements` seed from `reference/seed-requirements-template.md` — self-contained, per-skill (approved findings verbatim + trimmed current-`SKILL.md` excerpts + proposed direction + out-of-scope + constraints, with `reference/skill-patterns.md` cited as standing acceptance criteria) — producing **one combined requirements doc with a per-skill section**, not one doc per skill.

On failure: hard-phase failure dialog (no Skip).

## Phase 0d: /skill-tier-resolve (skill modes only) {#skill-tier-resolve}

**Runs only when `pipeline_mode ∈ {skill-new, skill-feedback}`.** Hardness: **infra**. One repo-shape pass yields three values, recorded on the `skill-tier-resolve` state entry:

1. **Tier** — via `reference/skill-tier-matrix.md`. `skill-new`: from the described skill's expected shape. `skill-feedback`: per-skill tiers from each approved-change-set's size; run tier = max, shown with the breakdown. `--tier N` overrides the matrix and logs a divergence note to `child_tier_divergence` — the matrix recommendation is never silently dropped.
2. **Skill location** — via `reference/repo-shape-detection.md`'s four-rung chain. Multiple candidate plugins at rung 2:
<!-- defer-only: ambiguous -->
   `AskUserQuestion` — which plugin owns the new/edited skill.
3. **Target platform** — `claude-code` / `codex` / `generic` per the same reference file.

**Confirmation** — a single consolidated ask:
<!-- defer-only: ambiguous -->
`AskUserQuestion` — `"Detected: tier <N> (<reasons>); skill location <path>; target platform <p>. Confirm or edit?"` options **Confirm all (Recommended)** / **Edit tier** / **Edit location** / **Edit platform**. On any edit, re-prompt for that value, then re-confirm.

On failure: failure dialog (infra — Retry / Pause / Abort).

## Phase 0e: Confirm soft-gate defaults (2nd-run consolidation) {#soft-gate-defaults}

Collapses the five non-destructive soft gates (`1a` ideate, `3a` creativity, `3b` wireframes, `3c` prototype, `8a` retro) into ONE confirm seeded from the prior run. Mirrors `/complete-dev` Phase 0a. Full read/write/field contract: `reference/soft-gate-lastrun-schema.md`.

**Skip this phase entirely (gates fire individually) when ANY of:** Phase 0b entered resume mode; `soft_gate_defaults` unset (first run / malformed / `--reset-defaults`); `pipeline_mode == prototype` (its 3b/3c are hard, not gated); `--minimal` active (log `Phase 0e skipped (--minimal active)`); `mode == non-interactive` (the canonical block AUTO-PICKs each gate — log `Phase 0e auto-confirmed (non-interactive); defaults source: lastrun`).

Otherwise present the gates applicable to this `pipeline_mode` (feature → all five; `skill-new` → ideate, creativity, retro; `skill-feedback` → creativity, retro) as a summary block (each gate's remembered `run`/`skip` + `(Source: .pmos/feature-sdlc.lastrun.yaml — last updated <date>)`), then:

```
question: "Use these soft-gate choices? Destructive prompts (slug, base-drift, merge, push, failures) still fire as needed."
options:
  - Confirm all (Recommended)
  - Edit one or more
  - Cancel
```

- **Confirm all:** set `soft_gates_confirmed = true`. Each gate phase consults `soft_gate_defaults` and short-circuits its prompt (the "Short-circuit when Phase 0e confirmed" clauses below). The destructive/judgement prompts listed in `reference/soft-gate-lastrun-schema.md` § "never consolidated" always fire.
- **Edit one or more:**
<!-- defer-only: ambiguous -->
  `AskUserQuestion` (multiSelect, only the gates applicable to this mode) — which gates to change; for each selected gate present that gate's own option list (reuse the Phase 1a/3a/3b/3c/8a prompts verbatim), update `soft_gate_defaults`, re-display the summary, re-ask — loop until Confirm.
- **Cancel:** exit with no side effects (any Phase 0a worktree is left for the user — same as any pre-Phase-1 abort).

## Phase 1: Initialize state {#init-state}

**Skip if Phase 0b entered resume mode.** Atomically (per `reference/pipeline-status-template.md` Update protocol):

1. Write `.pmos/feature-sdlc/state.yaml` from `reference/state-schema.md` — that file is the single source for the current `schema_version` value, all field shapes, and the mode-conditional `phases[]` membership. Populate: `schema_version` (current), `pipeline_mode` (from dispatch — distinct from `mode`), top-level fields from Phases 0/0a (slug, mode, started_at, last_updated, canonical `worktree_path` — `null` on `--no-worktree`, branch, feature_folder), `tier: null` unless already resolved, `current_phase` = the first phase of this mode's `phases[]`, `phases[]` in declared order with every status `pending` + `started_at: null` + `folded_phase_failures: []`, `open_questions_log: []`.
2. Write `<feature_folder>/00_pipeline.html` from `reference/pipeline-status-template.md`, rendered through `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/`: atomic temp-then-rename; copy `assets/*` (`cp -n`, idempotent — includes `comments.js`, `comments.css`, and the launcher trio for the inline-comments overlay); asset prefix `assets/`; `?v=<plugin-version>` cache-bust; kebab-case `<h2>`/`<h3>` ids; **no sections.json companion** for orchestrator artifacts (the status table is the body); seed `<feature_folder>/index.html` via `_shared/html-authoring/index-generator.md`; bake `<meta name="pmos:skill" content="feature-sdlc">` (see `#comment-resolver`).
3. Print the in-chat short-form status table.

### Phase status-transition write contract

On any `pending` → `in_progress` transition: set the status; set `started_at = now` **only if currently null** (a re-entered phase keeps its original timestamp); update top-level `last_updated` + `current_phase`; write atomically (temp-then-rename; on rename failure surface the failure dialog — never leave a `.tmp` orphan). The `started_at` value is the cursor `/execute` and folded apply-loops use to detect already-applied work after a resume (`git log --since=<phase.started_at>`) — overwriting it breaks the duplicate-apply guard.

### Atomic post-phase update protocol

After every phase end (pass / fail / skip / pause), do all three atomically — never partial: (1) update `state.yaml`; (2) regenerate `00_pipeline.html` (same write rules as step 2; the index regen picks up sibling artifacts from the just-completed child); (3) print the in-chat short-form status table. A partial update breaks the resume contract.

## Compact checkpoint (recurring micro-phase)

Not a numbered phase. When it fires (mode- and tier-dependent), the prompt shape, and the three-part pause-resumable exit contract all live in `reference/compact-checkpoint.md` — the single source. Skills cannot trigger `/compact` — only the user can; the checkpoint surfaces the choice, and "Pause" exits cleanly so the user can `/compact` and re-run with `--resume`.

## Phase 1a: /ideate gate (soft; feature + skill-new + prototype) {#ideate-gate}

**Not presented in `skill-feedback`** (the triage doc is already structured — phase id `ideate` is absent from its `phases[]`). Hardness: **soft**. **Goal:** when the seed is half-formed, give the user a one-prompt path to brainstorm via `/ideate`; a Tier-3-sized brief auto-chains `/grill --depth deep`.

1. **Classify.** If `--no-ideate` was passed, log `[orchestrator] phase 1a ideate: --no-ideate flag; skipping`, set `status = skipped-flag`, proceed. Else apply `reference/fuzzy-idea-detection.md` to the seed + `doc_attached` flag → `seed_shape ∈ {fuzzy, formed}` (record on the `ideate` state entry). `formed` → log `[orchestrator] phase 1a ideate: formed seed detected; skipping`, `status = skipped-formed` — auto-skip is allowed because the classifier ran (Anti-pattern #14). `fuzzy` → present the gate:

<!-- defer-only: ambiguous -->
   `AskUserQuestion` — **Run /ideate (Recommended)** (brainstorm; brief seeds /requirements) / **Skip** (proceed straight to /requirements; pick this if the detector misfired). In `--non-interactive`: deferred per canonical block; default = Skip; `status = skipped-non-interactive` with an explicit log line (Anti-pattern #7).

   **Short-circuit when Phase 0e confirmed:** after the flag and `formed` auto-skips (they take precedence), a would-present `fuzzy` gate applies `soft_gate_defaults.ideate` instead — log `[orchestrator] phase 1a ideate: auto-<run|skip> via Phase 0e`, skip the prompt.

2. **Run `/ideate`** (Run picked): invoke `/pmos-toolkit:ideate` with the seed (`[mode: …]` + `[output_format: …]` first lines). Copy the brief into the feature folder as `00d_ideate.html` (atomic-write substrate); resolve via `_shared/resolve-input.md` `phase=ideate`, falling back to `find {docs_path}/ideate -newer {state.yaml} -name '*.html' | sort | tail -1`. Record `artifact_path`. On `/ideate` failure: soft-phase failure dialog (Skip SHOWN — proceed without a brief).
3. **Tier-3 auto-chain.** `ideate_tier_estimate = 3` iff `--tier 3` was explicit OR the brief has ≥3 user-journey `<section>` blocks (ids matching `#journey-`/`#scenario-`/`#user-`, case-insensitive) OR ≥5 pressure-test findings (`class="finding"` or `<li>` under `#pressure-test`/`#premortem`); else 2 (default). If 3: invoke `/pmos-toolkit:grill --depth deep` against `00d_ideate.html` → `00d-grill_ideate.html`; log `[orchestrator] phase 1a ideate: Tier-3 detected (reason=<flag|journeys|findings>); auto-ran /grill --depth deep`; set `grill_deep_chained = true` + `grill_deep_artifact_path`. Else log `[orchestrator] phase 1a ideate: tier estimate <N>; grill --depth deep skipped`. Mark `status = completed` (or the appropriate `skipped-*`). On unexpected failure: soft-phase failure dialog.

## Phase 2: /requirements (hard) {#requirements}

Invoke `/pmos-toolkit:requirements` with the seed for this mode (feature/prototype: the initial context; `skill-new`: the `skill <description>` text; `skill-feedback`: the combined per-skill seed built in Phase 0c step 6). Prepend `[mode: <current-mode>]\n` + `[output_format: <resolved>]\n`; pass `--tier <N>` if set (always so in skill modes) and `--backlog <id>` if given.

- **Ideate passthrough:** if `state.yaml.phases.ideate.artifact_path` is non-null, append `[ideate-brief: <path>]`; if `grill_deep_artifact_path` too, append `[ideate-grill: <path>]`. Skipped-* states write nothing.
- **In skill modes:** prepend a line citing `reference/skill-patterns.md` as the standing acceptance criteria — "the produced/revised skill must conform to `skill-patterns.md §A–§L`".

After completion: capture `<feature_folder>/01_requirements.{html,md}` (resolve via `_shared/resolve-input.md` `phase=requirements`) to the state entry — in skill-feedback mode this is the single combined doc with per-skill sections. Read the doc's auto-tier; if `{tier}` was unset, set it; if set and divergent, log `child_tier_divergence: <orchestrator=<N>, child=<M>>` and continue. If non-interactive, append the child's OQ artifact to `open_questions_log[]`.

On failure: hard-phase failure dialog (no Skip).

## Phase 2a: /grill (soft, mandatory at Tier 2+) {#grill}

**Skip if `{tier}` is 1.** Runs in all modes. **Auto-skip if `mode == non-interactive`** — never silent; the log line must read:

```
Skipped /grill: --non-interactive flag (Tier <N> normally requires it).
```

with `status: skipped-non-interactive` in the status table.

Otherwise invoke `/pmos-toolkit:grill` as a reviewer per `_shared/reviewer-protocol.md` (the dispatcher side): chrome-strip `01_requirements.html` via `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/chrome-strip.js`, pass the stripped slice inline, require `sections_found` + `{section_id, severity, message, quote ≥40 chars}` findings; then validate parent-side — set-equality of `sections_found` against `01_requirements.sections.json` (miss/extra → hard-fail `[/feature-sdlc] reviewer grill returned sections_found that do not match 01_requirements.sections.json: missing=[...], extra=[...]`), substring-grep every `quote` against the un-stripped source (miss → hard-fail `[/feature-sdlc] reviewer grill returned quote not found in source: <quote-prefix-30char>...`); a "no findings" return is allowed only with matching `sections_found` and a rubric that permits it. On any validation hard-fail, pause with the soft-phase failure dialog.

After completion: capture `<feature_folder>/grills/<YYYY-MM-DD>_01_requirements.{html,md}` to state; append OQ artifact if non-interactive. On failure: soft-phase failure dialog (Skip SHOWN).

## Phase 3: Enhancement gates {#enhancement-gates}

Container for the optional stages — `3a` (/creativity, all modes), `3b` (/wireframes), `3c` (/prototype). In skill modes the orchestrator does not present `3b`/`3c` (a skill has no UI) — log `[orchestrator] skill-mode: 3b/3c suppressed (no UI)` and proceed to Phase 4. A **mode-conditional by-design non-presentation**, not a silent skip of a presented gate.

## Prototype-mode phase ordering {#prototype-ordering}

In `pipeline_mode == prototype` the execution order is:

```
worktree → init-state → ideate → requirements → grill → creativity → SPEC → wireframes → prototype → final-summary
```

`/spec` runs immediately after `/creativity` and *before* 3b/3c — wireframes and prototype consume the spec's technical design. The state.yaml `phases[]` for prototype mode lists entries in this execution order (per `reference/state-schema.md`'s prototype-mode block), so the Phase 0b resume cursor advances correctly with no special-casing. Two rules replace any per-phase conditionals:

- **3b/3c are hard, always-run — they are the deliverable.** No gate prompt; log `[orchestrator] prototype mode: 3b runs unconditionally (no gate)` and `[orchestrator] prototype mode: 3c runs unconditionally (no gate)`. Compact checkpoint still fires before each. On failure: hard-phase failure dialog (no Skip).
- **Phases 5–8a never run.** After 3c, jump to Phase 9 final-summary, logging one line per skipped phase, exactly: `[orchestrator] prototype mode: Phase 5 /plan skipped (discovery-only pipeline)` · `[orchestrator] prototype mode: Phase 6 /execute skipped (discovery-only pipeline)` · `[orchestrator] prototype mode: Phase 7 /verify skipped (discovery-only pipeline; nothing implemented)` · `[orchestrator] prototype mode: Phase 8 /complete-dev skipped (discovery-only pipeline; nothing to ship)` · `[orchestrator] prototype mode: Phase 8a /reflect skipped (discovery-only pipeline)`. ("Non-skippable /verify" is scoped to modes that ship code; nothing was implemented here.)

The discovery branch is left unmerged — extend via `state.yaml.pipeline_mode` → `feature` + `--resume`, or discard.

## Phase 3a: /creativity gate (soft, all modes) {#creativity-gate}

`AskUserQuestion`:
```
question: "Run /creativity for non-obvious improvement ideas?"
options:
  - Skip (Recommended)
  - Run /creativity
```

Always optional; Recommended is always Skip. **Short-circuit when Phase 0e confirmed:** apply `soft_gate_defaults.creativity`; log `[orchestrator] phase 3a creativity: auto-<run|skip> via Phase 0e`; skip the prompt. On Run: invoke `/pmos-toolkit:creativity` with the requirements doc. On missing-skill: soft-variant missing-skill dialog.

## Phase 3b: /wireframes gate (feature soft / prototype hard / skill modes suppressed) {#wireframes-gate}

Not presented in skill modes (Phase 3); unconditional in prototype mode (`#prototype-ordering`). **In feature mode the gate is always presented** — never silently skipped:

- **Tier 1:** `(Recommended)` is always `Skip wireframes` regardless of the heuristic — a bug fix does not warrant wireframes even when UI keywords appear. The gate still presents; only the recommendation changes.
- **Tier 2/3:** apply `reference/frontend-detection.md` to bias which option carries `(Recommended)` — frontend-positive → `Run wireframes (Recommended)` first; frontend-negative → `Skip wireframes (Recommended)` first.

```
question: "Detected <UI feature | no UI signal>. Generate wireframes?"
options:
  - Run wireframes                     # (Recommended) on frontend-positive
  - Skip wireframes                    # (Recommended) on frontend-negative
```

**Short-circuit when Phase 0e confirmed:** compute the heuristic class first. If it equals `soft_gate_defaults.detected_signals.frontend`, apply `soft_gate_defaults.wireframes` and log `[orchestrator] phase 3b wireframes: auto-<run|skip> via Phase 0e (signal unchanged)`; if the class changed, re-fire the gate and log `[orchestrator] phase 3b wireframes: frontend signal changed (<old>→<new>); re-presenting gate`. Tier-1's force-skip recommendation still wins.

Run the **compact checkpoint** before invoking `/pmos-toolkit:wireframes` (heavy phase). On missing-skill: soft-variant dialog.

## Phase 3c: /prototype gate (feature soft / prototype hard / skill modes suppressed) {#prototype-gate}

Not presented in skill modes; unconditional in prototype mode (after it completes there, jump to Phase 9). **In feature mode, if Phase 3b was Skipped this gate STILL presents** with `Skip (Recommended)` — never silent skip even when the input artifact is missing; the user can build a prototype directly from the spec.

`AskUserQuestion`:
```
question: "Build a clickable prototype on top of the wireframes?"
options:
  - Skip (Recommended)
  - Run /prototype
```

**Short-circuit when Phase 0e confirmed:** apply `soft_gate_defaults.prototype`; log `[orchestrator] phase 3c prototype: auto-<run|skip> via Phase 0e`; skip the prompt. Run the **compact checkpoint** before invoking `/pmos-toolkit:prototype`. On missing-skill: soft-variant dialog.

## Phase 4: /spec (hard) {#spec}

(In prototype mode this runs at the post-3a slot — `#prototype-ordering`; the phase body is identical.)

Invoke `/pmos-toolkit:spec` with `01_requirements.{html,md}` (resolved primary), `--tier <N>`, and the `[mode: …]`/`[output_format: …]` first lines. **In skill modes:** prepend a line citing `reference/skill-patterns.md` — `/spec` has no skill-aware template, so `skill-patterns.md §A–§L` flows in as requirements: the spec must turn the cited §-sections into concrete FRs so the plan's tasks are testable against them.

After completion: capture `02_spec.{html,md}` (resolver `phase=spec`); append OQ artifact if non-interactive. No compact checkpoint before this phase — `/spec` context is moderate. On failure: hard-phase failure dialog.

## Phase 5: /plan (hard) {#plan}

Invoke `/pmos-toolkit:plan` with `02_spec.{html,md}` and `--tier <N>` (+ the standard first lines). **In skill modes**, prepend the release-prereq scope directive (per `reference/skill-patterns.md §G`): *"Skill modes: do NOT include version-bump, CHANGELOG / changelog, README-row, manifest version-sync, or `~/.pmos/learnings.md` header-bootstrap tasks in any `## Wave N` block. List them under the spec's `## Release prerequisites` section only — `/complete-dev` (Phase 8) is the sole writer of those files per repo norms."* `/plan`'s output is graded by Phase 6a's `g-release-prereqs-scope` and `g-plan-grep-clean` checks — a wave containing a release-prerequisite task fails 6a.

After completion: capture `03_plan.{html,md}` (resolver `phase=plan`); append OQ artifact if non-interactive. On failure: hard-phase failure dialog.

## Phase 6: /execute (hard) {#execute}

Run the **compact checkpoint** first — `/execute` is heavy.

Invoke `/pmos-toolkit:execute` with the plan. `/execute` does not accept `--tier` (it reads the plan frontmatter). Read `execution_mode` from the plan frontmatter: `subagent-driven` → append `--subagent-driven`; `inline` or absent → invoke without the flag, do not re-prompt.

In **skill modes**, `/execute` is the **sole writer of the skill** — it creates/edits the `SKILL.md` at the Phase 0d `skill_location` plus any `reference/`/`tools/` files; the Phase 6a reviewer never edits (scores and reports only). Prepend a line citing `reference/skill-patterns.md` as the implementation reference. `/execute` also honours the **host repo's `CLAUDE.md`** for the repo-policy bits deliberately NOT in skill-patterns: the canonical skill path, the manifest version-sync rule, the release entry point (`CLAUDE.md ## Skill-authoring conventions`). The Phase 6a and `/verify` evaluators grade against both.

On resume, `/execute` has its own task-level resume — the orchestrator re-invokes fresh and `/execute` detects its own state from git history + plan-status markers. (In skill modes that also covers re-running for a Phase-6a remediation addendum: only the new `## Eval-remediation — iteration N` tasks are picked up.)

On failure: hard-phase failure dialog.

## Phase 6a: /skill-eval (skill modes only) {#skill-eval}

**Runs only when `pipeline_mode ∈ {skill-new, skill-feedback}`**, immediately after Phase 6, before Phase 7. Hardness: **hard** — a non-skippable quality gate, peer of `/verify`; "accept residuals as known risk" is a documented exit, not a skip. No compact checkpoint before 6a (scoring is light). The `[J]` judge half runs **once, here** — Phase 7 re-runs only the deterministic `[D]` half and reconciles residuals (fresh `[J]` re-runs only re-found already-accepted residuals).

**Iteration bookkeeping.** Before iteration `n`, record `state.yaml.phases.skill-eval.skill_eval.iterations[n].pre_ref = HEAD` (for `n: 1`, HEAD after Phase 6 completed; field shapes in `reference/state-schema.md` § `skill_eval`).

**Scoring (one iteration):**

1. **Deterministic half.** Run `feature-sdlc/tools/skill-eval-check.sh --target <target_platform> <skill_dir>` (both values from Phase 0d). It emits a `check_id\tverdict\tevidence` TSV for the `[D]` checks; exits 0 (all pass) / 1 (≥1 fail) / 2 (script error). On exit 2 — or no bash / missing coreutils — the `[D]` checks **fall back to LLM-judge** with the logged note `skill-eval-check.sh unavailable (<reason>); <N> deterministic checks fell back to LLM-judge` — never silently skipped.
2. **LLM-judge half.** Dispatch a reviewer subagent (temperature 0) with: the *paths* of the skill's `SKILL.md` and each cited `reference/` file (paths, not pastes — subagents share the filesystem, and step 3's quote validation greps the orchestrator's own read of each file), plus the `[J]` check list from `reference/skill-eval.md` (each: `check_id`, rule, why, how-to-verify, pass-condition). The reviewer **makes no edits** and returns a JSON array — one object per check, exactly the given `check_id` set: `{check_id, verdict: 'pass'|'fail', fix_note: '<concrete edit; required & non-empty on fail>', quote: '<≥40-char verbatim substring of the file the check is about; required>'}`. A `fail` whose `quote` is empty or not a verbatim substring of the named file is **treated as `pass`** — the same quote-grounding stance as `_shared/reviewer-protocol.md`.
3. **Orchestrator-side validation** (the reviewer does NOT self-validate): (a) returned `check_id` set must equal the `[J]` set declared in `skill-eval.md` — miss/extra → hard-fail `reviewer returned check_ids that do not match skill-eval.md: missing=[…], extra=[…]`; (b) substring-grep every `quote` against the file it names — miss → hard-fail `reviewer quote not found in <file>: <quote-prefix-30char>…`. On any hard-fail, pause with the soft-phase failure dialog.
4. **Compose.** `checks_failed(n)` = failed `[D]` ∪ failed (validated) `[J]`. Log `skill-eval iteration N: <p> passed, <f> failed [<ids>]`. Record `iterations[n].{checks_failed, result}`.

**Remediation loop:**

- `checks_failed(n)` empty → 6a completes (`result = pass`, `accepted_residuals[]` stays empty). Proceed to Phase 7.
- Else if iteration count `< 2` → append a `## Eval-remediation — iteration N` task group to `03_plan.{html,md}` — one task per failed check (the `fix_note`, the `quote`, and for `[D]` checks the exact re-run command). Record `iterations[N].{addendum_task_ids, pre_ref=HEAD}`. Re-invoke Phase 6 `/execute` (task-level resume picks up only the new tasks), then re-score.
- **Net-worse guard:** iteration N is *net-worse* than N−1 if `|checks_failed(N)| > |checks_failed(N−1)|` OR it fails a check that passed in N−1. If iteration 2 is net-worse, the post-cap dialog gains **Restore iteration 1** (`git reset` the skill files only to `iterations[2].pre_ref`).
- **Cap = 2 remediation iterations** (a cost governor — see `_shared/reviewer-protocol.md` § Loop cap). If checks still fail after iteration 2:
<!-- defer-only: ambiguous -->
  `AskUserQuestion` — **Accept residuals as known risk** (append to `accepted_residuals[]` as `{check_id, fix_note, acked_at}`; handed to `/verify` as known) / **Iterate manually** (user edits the skill, re-run 6a) / **Restore iteration 1** (only if iteration 2 was net-worse) / **Abort**. No silent pass.

On failure (reviewer-validation hard-fail, `/execute` re-run failure, …): soft-phase failure dialog.

## Phase 7: /verify (hard, non-skippable) {#verify}

Run the **compact checkpoint** first — `/verify` is heavy.

Invoke `/pmos-toolkit:verify` with the spec path. **Non-skippable per the pipeline contract — no Skip option, ever** (Anti-pattern #10). `/verify` does not accept `--tier`.

**In skill modes**, prepend a line directing `/verify` to additionally:

- **Re-run the `[D]` half of `reference/skill-eval.md`** (`feature-sdlc/tools/skill-eval-check.sh` — a final idempotent deterministic gate; the `[J]` half is NOT re-dispatched) and **reconcile against `accepted_residuals[]`**: still-failing residual → report as `KNOWN / accepted in Phase 6a` — non-blocking but surfaced loudly in the `/verify` report AND the `/complete-dev` summary; newly-failing check → blocks normally; previously-accepted-now-passing → dropped from the residual set (update state).
- **Best-effort grade the detectable host-repo release prereqs**, gracefully degrading when absent: manifest version-sync (only if two `plugin.json` manifests exist), a README row for the skill, changelog presence. Findings, not hard blocks — release-prereq enforcement lives in `/complete-dev`.

On failure: hard-phase failure dialog (Retry / Pause / Abort — no Skip).

## Phase 8: /complete-dev (hard) {#complete-dev}

Invoke `/pmos-toolkit:complete-dev` to merge, capture learnings, regenerate changelog, bump versions, deploy per repo norms, tag, and push to all remotes. It does not accept `--tier`. On failure: hard-phase failure dialog.

## Phase 8a: /reflect gate (soft, Recommended=Skip) {#retro-gate}

After `/complete-dev` lands the release, surface an optional retro gate — most users ship and move on; retro is opt-in.

`AskUserQuestion`:
```
question: "Run /reflect to capture cross-session learnings before closing the pipeline?"
options:
  - Skip (Recommended)        # pipeline complete; close out without retro
  - Run /reflect              # single-session retro on this run
  - Run /reflect --last 5     # multi-session retro across the last 5 transcripts
  - Defer                     # log to OQ index; user runs /reflect later
```

**Auto-skip if `_minimal_active`** — log `[orchestrator] phase_minimal_skip: retro` and proceed. **Short-circuit when Phase 0e confirmed:** apply `soft_gate_defaults.retro` (`skip`/`run`/`run-last-5`/`defer`); log `[orchestrator] phase 8a retro: auto-<value> via Phase 0e`; skip the prompt.

On Run: invoke `/pmos-utilities:reflect` (the skill lives in pmos-utilities). On Defer: append a stub to `open_questions_log[]` so Phase 9 surfaces it. On missing-skill: soft-variant dialog (Skip is the Recommended default).

## Phase 9: Final summary {#final-summary}

**Folded-phase failure surfacing:** read every `phases[].folded_phase_failures[]`; if any non-empty, emit a `## Folded-phase failures (N)` subsection per `reference/pipeline-status-template.md` BEFORE the OQ index — one line per record: `[<phase>] <folded-skill> crashed: <error_excerpt> (ts: <ts>)`. All empty → omit the subsection entirely.

Print the full pipeline-status table from `00_pipeline.html`, plus:

- Branch + tag info from `/complete-dev` output.
- Links to every artifact (requirements, spec, plan, plus mode-conditional extras: `0c_feedback_triage`, `00d_ideate`, `00d-grill_ideate`, child sidecars). Use the resolver substrate (or `<feature_folder>/index.html`'s manifest) to find each artifact's on-disk extension.
- If `open_questions_log[]` is non-empty: write `<feature_folder>/00_open_questions_index.html` — one section per logged child (path + deferred count) — with the same write rules as `00_pipeline.html` (atomic, asset prefix, cache-bust, heading ids, no sections.json, index regen, `pmos:skill` meta — see `#comment-resolver`). Link the HTML primary in the chat summary.
- **Write soft-gate lastrun.** Atomically write `.pmos/feature-sdlc.lastrun.yaml` at `<main-repo-root>` per `reference/soft-gate-lastrun-schema.md` § "Write contract": each gate's resolved disposition this run plus `detected_signals.frontend` (the Phase 3b heuristic class, or `unknown`). On write failure log `lastrun write failed: <error>; next run will use per-gate prompts` and continue. Only a completed run writes lastrun — failed/aborted/paused runs never do.
- Final one-liner: `Pipeline complete for <slug>. Branch feat/<slug> merged to main and tagged via /complete-dev.`

**In `prototype` mode** the summary is the discovery variant: no branch+tag info (nothing merged); artifact list = requirements, spec, `03_wireframes.*`, `04_prototype.*`, plus `grills/` and `00d_ideate.*` when those phases ran — no plan/execute/verify artifacts; same OQ-index rules; **no lastrun write** (3b/3c were hard, not gated — writing would memorialise non-choices); final one-liner: `Prototype-mode pipeline complete for <slug>. Branch feat/<slug> contains the discovery artifacts; not merged. To extend to full implementation: cd into the worktree, edit state.yaml.pipeline_mode from 'prototype' to 'feature', then run /feature-sdlc --resume. To discard: git worktree remove <path>.`

## Phase 10: Capture Learnings {#capture-learnings}

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing about `/feature-sdlc` itself — gate prompts that misfired, resume-state edges, missing-dialog mistakes, `--tier` propagation confusion, paused-state recovery friction. Proposing zero learnings is a valid outcome; the gate is that the reflection happens.

## Anti-Patterns (DO NOT)

1. **Triggering `/compact` from the skill.** The harness does not allow it. Surface the checkpoint, write paused state if the user picks Pause, exit cleanly.
2. **Skipping the worktree step "because the user knows what they're doing".** Worktree is mandatory unless `--no-worktree` is explicit. The Phase 0a pre-flight failures are non-bypassable; do not auto-stash, auto-rename, or auto-delete to make them go away.
3. **Dispatching child skills with a "see the state file" prompt.** Each child gets a self-contained brief. Children must not reach into `state.yaml` — it is the orchestrator's private state.
4. **Auto-running optional stages without the gate.** Recommended-default is fine; silent run is not. The sanctioned exceptions are all explicit: `--minimal`'s user-explicit short-circuit, and the mode-conditional by-design omissions keyed off `pipeline_mode` (skill modes' 3b/3c non-presentation, 0c/0d/6a membership) — those are not silent skips of presented gates.
5. **Frontend-detection by LLM gut-feel.** Use `reference/frontend-detection.md` deterministically; the 3b gate is always presented in feature mode.
6. **Forgetting the atomic post-phase update.** Every phase end updates state.yaml + `00_pipeline.html` + chat table together; skipping any breaks resume.
7. **Treating `--non-interactive` as "skip /grill silently".** Log the exact skip line so the user sees what was skipped on review.
8. **Resuming past stale artifact paths.** Phase 0b validates every recorded path; missing required artifacts go to the user — never re-invoke a phase silently.
9. **Conflating `--tier` override with per-child auto-tiering.** `--tier` sets orchestrator scope and passes to children that accept it; children may escalate — log `child_tier_divergence`, don't override.
10. **Skipping `/verify` because `/execute` looked clean.** Non-skippable at any tier — and in skill modes, so is Phase 6a `/skill-eval`.
11. **Letting the Phase 6a reviewer make edits.** The reviewer scores and reports only; `/execute` is the sole writer. A reviewer that fixes while reviewing makes the eval unreproducible.
12. **Treating "accept residuals" as a silent pass.** Residuals are recorded, re-checked by `/verify`, and surfaced in the `/verify` report and `/complete-dev` summary. And never exceed the 2-iteration cap — past it, the only exits are the four post-cap options.
13. **Inferring the run mode from seed text.** `pipeline_mode` comes from the explicit subcommand token, never from sniffing whether the idea "sounds like a skill". A bare `/feature-sdlc <text>` is always feature mode.
14. **Skipping the Phase 1a gate without running the classifier.** `reference/fuzzy-idea-detection.md` runs deterministically on every eligible run (unless `--no-ideate`); `skipped-formed` is legitimate only because the classifier ran. The Tier-3 grill-chain heuristic is likewise deterministic — no LLM gut-feel.

---

## Apply comment-resolver edit {#comment-resolver}

The `/feature-sdlc` entrypoint that `/comments resolve` dispatches into when walking open threads in either orchestrator artifact's inline `pmos-comments` JSON block. The contract — input/output JSON shapes, closed `error_enum` set, idempotency rules, subagent invocation convention — lives in `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md` (normative; cite, don't restate). Below is `/feature-sdlc`-specific guidance only.

**Two orchestrator surfaces** — the apply-edit shim differentiates by `artifact_path` basename:

| Artifact | Basename | Edit rules |
|---|---|---|
| Pipeline status table | `00_pipeline.html` | Table-row prose edits ARE feasible. Structural schema changes (columns, row order, table shape) → `agent_judged_infeasible` with `system_reply: "Pipeline status table is generated by /feature-sdlc state.yaml — edit state.yaml or re-run /feature-sdlc"`. |
| Open questions index | `00_open_questions_index.html` | Per-OQ note prose edits ARE feasible. Structural changes (section order, OQ groupings) → `agent_judged_infeasible` directing the user to re-run `/feature-sdlc`. |

**Meta tag:** BOTH artifacts MUST carry `<meta name="pmos:skill" content="feature-sdlc">` in the `<head>` — set at Phase 1 step 2 (`00_pipeline.html`) and Phase 9 (`00_open_questions_index.html`), byte-exact (the `/comments` resolver routes by this tag). **Assets:** the comments overlay assets (`comments.js`, `comments.css`, launcher trio) ride the Phase 1 step 2 `cp -n` substrate copy; both artifacts share the `assets/` prefix.

**Shim:** `scripts/apply-edit-at-anchor.js` — one entrypoint, differentiates by basename; exports `apply(input)`, returns success / failure / clarification. Resolution order: (1) **id-first** — locate `id="<id>"`; match → `strategy: "id-first"`, `score: 1.0`; (2) **quote-fallback** — substring-contains `anchor.quote_anchor.text` (≥40 chars), first exact hit wins; (3) neither → `{ success: false, error_enum: "anchor_orphaned" }`, do NOT mutate.

**Tests:** `tests/apply-edit-at-anchor.test.js` (10 cases: pipeline:5 + oq-index:5); wrapper `tests/scripts/assert_apply_edit_at_anchor_feature-sdlc.sh` (repo root).

---

*Spec lineage: `docs/pmos/features/2026-05-09_feature-sdlc-skill/` (orchestrator, gates, failure dialogs), `2026-05-10_feature-sdlc-worktree-resume/` (worktree + resume contract), `2026-05-11_feature-sdlc-skill-mode/` (skill modes, skill-eval loop), `2026-05-23_feature-sdlc-ideate-phase/` (Phase 1a), `2026-05-23_inline-doc-comments/` + `2026-05-28_inline-html-artifacts/` (comment-resolver surfaces), `2026-05-24_prototype-sdlc-skill/` (prototype mode), `2026-05-10_pipeline-consolidation/` (folded phases, `--minimal`, Phase 0e soft-gate defaults).*
