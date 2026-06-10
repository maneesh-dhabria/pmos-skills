---
name: feature-sdlc
description: End-to-end SDLC orchestrator. `/feature-sdlc <idea>` turns an initial idea (text or doc) into a shipped feature by driving the pmos-toolkit pipeline — worktree, optional /ideate when the seed is fuzzy, requirements, grill, optional creativity/wireframes/prototype, spec, plan, execute, verify, complete-dev — auto-tiering each stage and persisting resumable state. `/feature-sdlc skill <description>` and `/feature-sdlc skill --from-feedback <text|path|--from-reflect>` drive the same pipeline to author or revise skills, scored against a binary skill-eval rubric before merge. `/feature-sdlc prototype <seed>` drives the discovery half only (requirements → grill → creativity → spec → wireframes → prototype) and stops — no /plan/execute/verify/complete-dev; `/prototype-sdlc` is a thin alias. `/feature-sdlc list` shows in-flight worktrees. Triggers — "build this feature end-to-end", "run the full SDLC", "take this idea through to ship", "feature-sdlc this", "/feature-sdlc", "drive the pipeline for me", "create a skill", "author a new skill", "build me a slash command", "turn this workflow into a skill", "apply this retro feedback to the skill", "I have a half-formed idea", "I want to brainstorm this end-to-end", "prototype this idea end-to-end", "discovery pipeline only", "wireframes + prototype for", "stakeholder-walkable prototype".
user-invocable: true
argument-hint: "[skill [--from-feedback] | prototype] <description|idea> [--from-reflect] [--tier 1|2|3] [--resume] [--no-worktree] [--no-ideate] [--format html|md|both] [--non-interactive | --interactive] [--backlog <id>] [--minimal] [--reset-defaults] | list"
---

# Feature SDLC

Top-level orchestrator that drives the full pmos-toolkit pipeline from an initial idea (or a skill-authoring task) through to ship. Creates a git worktree + branch, runs `/requirements → [/grill] → [/creativity] → [/wireframes → /prototype] → /spec → /plan → /execute → /verify → /complete-dev → [/reflect]` sequentially, auto-tiers each stage, and persists resumable state inside the worktree. The `skill` subcommand picks a **skill mode** — `/feature-sdlc skill <description>` (`skill-new`) or `/feature-sdlc skill --from-feedback <text|path|--from-reflect>` (`skill-feedback`) — driving the same pipeline to author or revise a skill: the UI gates (wireframes/prototype) are not presented, `skill-feedback` adds a `/feedback-triage` phase, both add a `/skill-tier-resolve` phase and a binary skill-eval gate (Phase 6a) before merge. The `prototype` subcommand picks a **prototype mode** — `/feature-sdlc prototype <seed>` — driving the discovery half of the pipeline (`requirements → grill → creativity → spec → wireframes → prototype`) and stopping; no `/plan`, `/execute`, `/skill-eval`, `/verify`, `/complete-dev`, or `/reflect` runs. `/skill-sdlc` and `/prototype-sdlc` are thin aliases for the `skill` and `prototype` subcommands. See `reference/skill-patterns.md` (the authoring guide) and `reference/skill-eval.md` (the rubric).

**Announce at start:** "Using feature-sdlc — orchestrating the full SDLC pipeline for this feature." (In a skill mode: "…for this skill." In prototype mode: "Using feature-sdlc — orchestrating the discovery half of the pipeline for this prototype.")

## Pipeline position

```
/feature-sdlc (this skill)        — four run modes; the subcommand picks one (FR-02):
    └─> [worktree + slug]            • bare  /feature-sdlc <idea>            → pipeline_mode = feature
        └─> [feedback-triage]        • /feature-sdlc skill <description>     → pipeline_mode = skill-new
        └─> [skill-tier-resolve]     • /feature-sdlc skill --from-feedback <text|path|--from-reflect> → skill-feedback
        └─> [/ideate]                • /feature-sdlc prototype <seed>        → pipeline_mode = prototype
        └─> /requirements            (/skill-sdlc, /prototype-sdlc are thin aliases for the skill / prototype subcommands)
              └─> [/grill]                        # Tier 2+, skip if --non-interactive
              └─> [/creativity]                   # always optional, all modes
              └─> [/wireframes]                   # feature mode soft-gate; prototype mode hard
                    └─> [/prototype]              # feature mode soft-gate; prototype mode hard
        └─> /spec                                 # in prototype mode, /spec runs BEFORE /wireframes (reordered)
        └─> /plan                                 # NOT in prototype mode
        └─> /execute                              # NOT in prototype mode
        └─> [/skill-eval]                         # skill modes only — binary rubric gate (Phase 6a)
        └─> /verify                               # NOT in prototype mode
        └─> /complete-dev                         # NOT in prototype mode
        └─> [/reflect]                              # NOT in prototype mode
```

**Mode × phase (paraphrase of spec §6.1):**

| Phase | `feature` | `skill-new` | `skill-feedback` | `prototype` |
|---|---|---|---|---|
| `0c` /feedback-triage | — | — | ✓ (hard) | — |
| `0d` /skill-tier-resolve | — | ✓ (infra) | ✓ (infra) | — |
| `0e` confirm soft-gate defaults | ✓ (2nd-run) | ✓ (2nd-run) | ✓ (2nd-run) | — |
| `1.5` /ideate gate | ✓ (soft) | ✓ (soft) | — | ✓ (soft) |
| `2` /requirements | ✓ | ✓ | ✓ | ✓ |
| `2a` /grill · `3a` /creativity | ✓ | ✓ | ✓ | ✓ |
| `3b` /wireframes · `3c` /prototype | ✓ (soft gates) | — | — | ✓ (hard, always-run) |
| `4` /spec | ✓ | ✓ | ✓ | ✓ |
| `5` /plan · `6` /execute · `7` /verify · `8` /complete-dev · `8a` /reflect | ✓ | ✓ | ✓ | — |
| `6a` /skill-eval | — | ✓ (hard) | ✓ (hard) | — |
| `9` final-summary | ✓ | ✓ | ✓ | ✓ |

In **`prototype` mode** the execution order is reordered: `requirements → grill → creativity → spec → wireframes → prototype → final-summary` — `/spec` runs *before* `/wireframes`, not at its normal Phase 4 slot. See `## Prototype-mode phase ordering` below.

(`/msf-req` and `/simulate-spec` are folded inside `/requirements` and `/spec` respectively — no longer orchestrator phases.)

`/feature-sdlc` is a top-level orchestrator, not a pipeline stage. Standalone — invoke at the moment you have an idea (or a skill to author/revise) and want to ship it end-to-end.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No interactive prompt tool:** Slug confirmation, the Phase 0e soft-gate-defaults confirm, optional-stage gates, compact checkpoint, failure dialog, and resume status table all degrade to numbered free-form prompts per `_shared/interactive-prompts.md`. The non-interactive auto-pick contract still applies (Recommended → AUTO-PICK).
- **No subagents:** Pipeline dispatch is sequential per-phase by design; no parallel work to degrade.
- **No Playwright / MCP:** Not used by this skill — child skills handle their own browser automation.
- **TaskCreate / TodoWrite missing:** Skill body works without task tracking; the pipeline-status table in `00_pipeline.{html,md}` is the canonical progress artifact.
- **`.pmos/settings.yaml` missing:** Run `_shared/pipeline-setup.md` Section A first-run setup before resolving paths.
- **Non-interactive contract:** the canonical `<!-- non-interactive-block -->` below inlines the contract from `_shared/non-interactive.md` byte-for-byte (audit-recommended.sh greps for it).
- **Platform-aware strings:** the resume command in `reference/compact-checkpoint.md` and the `[mode: <current-mode>]` subagent prefix use the per-platform `execute_invocation` mapping in `_shared/platform-strings.md`.
- **Out-of-options replies in any structured ask:** see `_shared/structured-ask-edge-cases.md`. Do not silently pick on the user's behalf.
- **Worktree creation fails (no git, detached HEAD, dirty tree, branch collision):** see Phase 0a — surface the precise git error, offer `--no-worktree` fallback, or trigger the branch-collision dialog.
- **Child skill missing:** see Phase 0 step "Missing-skill detection" and `reference/failure-dialog.md` — present an explicit dialog (Skip / Abort / Pause-to-install). Hard skills omit Skip.

## Track Progress

This skill has multiple phases. Create one task per phase using your agent's task-tracking tool (e.g., `TaskCreate` in Claude Code, `TodoWrite` equivalent in older harnesses). Mark each task in-progress when you start it and completed as soon as it finishes — do not batch completions.

## Phase 0: Pipeline setup + Load Learnings

### Phase 0 Subcommand Dispatch (FR-01, FR-02, FR-03, FR-04, FR-05, FR-L01)

Before running pipeline-setup, resolve `pipeline_mode ∈ {feature, skill-new, skill-feedback, prototype}` from the argument string. This is independent of the `mode ∈ {interactive, non-interactive}` resolution in the non-interactive block below — both are computed at Phase 0 entry; do not conflate them.

**Token-1 disambiguation (FR-02).** Token 1 of the argument string is the *subcommand selector* — i.e., the literal word `skill`, `prototype`, or `list` — **only when** it is exactly one of those three **and** one of: (a) it is the sole token; (b) the next token is a recognised flag (`--from-feedback`, `--from-reflect`, `--tier`, `--resume`, `--no-worktree`, `--no-ideate`, `--format`, `--non-interactive`, `--interactive`, `--backlog`, `--minimal`); (c) the remainder is exactly one quoted argument. Otherwise token 1 is the first word of a feature description (e.g., `/feature-sdlc list of recently changed files` → `feature` mode, seed = the whole string; `/feature-sdlc prototype this in detail` → `feature` mode, seed = `prototype this in detail`). Never infer the run mode from seed text — the subcommand is explicit.

**Dispatch:**

- **`--resume` present (FR-05):** ignore any subcommand token entirely — `pipeline_mode` is read from `state.yaml` (set on the original run). If both `--resume` and a subcommand token are present → stderr warn `subcommand ignored on --resume; mode read from state.yaml` and continue with the state-file value. (No `list` short-circuit on `--resume` — `--resume` always means "resume a pipeline".)
- **`list` selector (FR-L01):** short-circuit — skip pipeline-setup, skip Phase 0a, skip Phase 0b, run the list logic below, exit 0. (`pipeline_mode` is irrelevant here.)
- **`skill` selector, no further description (FR-03):** stderr `usage: /feature-sdlc skill <description> | /feature-sdlc skill --from-feedback <text|path|--from-reflect>`; exit 64.
- **`skill --from-feedback <source>` (FR-04):** `pipeline_mode = skill-feedback`. `<source>` is a quoted text blob, a file path, or `--from-reflect`. `--from-reflect` resolves to the newest `/reflect` artifact (per the `/reflect` skill's output location); if none found → stderr `no /reflect artifact found; pass feedback text or a file path`, exit 64. `skill --from-feedback` with neither a source nor `--from-reflect` → the FR-03 usage error, exit 64.
- **`skill <description>` (no `--from-feedback`):** `pipeline_mode = skill-new`; the description is the seed for Phase 2 `/requirements`.
- **`prototype` selector, no further description (FR-PSDLC-02):** stderr `usage: /feature-sdlc prototype <seed>`; exit 64.
- **`prototype <description>` (FR-PSDLC-02):** `pipeline_mode = prototype`; the description is the seed for Phase 2 `/requirements`. Execution stops after Phase 3c `/prototype`; no `/plan`, `/execute`, `/skill-eval`, `/verify`, `/complete-dev`, or `/reflect` runs (see `## Prototype-mode phase ordering`). The worktree and branch are left intact for the user to extend manually (edit `state.yaml.pipeline_mode` → `feature` and `--resume`) or discard.
- **bare (no subcommand selector):** `pipeline_mode = feature`; the whole argument string (minus recognised flags) is the feature seed.

**NFR-07 — log line.** On Phase 0 entry, log to chat `pipeline_mode: <m> (source: cli|state)` (`cli` for a fresh run, `state` on `--resume`) — analogous to the `mode: <mode> (source: …)` line emitted by the non-interactive block; keep both lines.

### `list` logic (FR-L02–L07)

1. **Run** `git worktree list --porcelain` in the current repo. If git errors (cwd is not a git repo): surface the raw git error and exit 64 (FR-L06).
2. **Parse** each worktree entry's branch field. **Filter to entries whose branch matches `feat/*`** (the main checkout and any non-feature branch worktrees are excluded per FR-L02). Detached worktrees (no branch field) are skipped.
3. **For each remaining worktree**, attempt to read `<worktree>/.pmos/feature-sdlc/state.yaml`. Capture: `slug`, `branch`, `current_phase`, `last_updated`, `worktree_path`, `schema_version`.
4. **Build the rows.** Order by `last_updated` descending; ties broken by `slug` alphabetical ascending; worktrees with no state.yaml sort last (also slug-alphabetical among themselves) (FR-L03).
5. **Emit a single Markdown table to chat:**

   ```
   | Slug | Branch | Phase | Last updated | Worktree |
   |---|---|---|---|---|
   | <slug> | <branch> | <phase> | <last_updated> | <worktree_path> |
   ```

   - For worktrees with `schema_version < 3`: append ` (legacy v1/v2)` to the `Phase` column (FR-L04). Example: `spec (legacy v1/v2)`.
   - For worktrees with no `state.yaml`: `Phase = (no state)` (FR-L05).
   - For worktrees whose path no longer exists on disk: `Phase = (worktree path missing)` (FR-L05 extended).
6. **Empty result** (no `feat/*` worktrees): emit `No in-flight features. Start one with /feature-sdlc <seed>.` — no table (FR-L07).
7. **Stale-detection** (`last_updated` older than N days) is OUT OF SCOPE per FR-L08; emit raw timestamps only.

Exit 0 after table emission.

---

Inline `_shared/pipeline-setup.md` (relative to the skills directory) to:

1. Read `.pmos/settings.yaml`. If missing → run Section A first-run setup before proceeding.
2. Set `{docs_path}` from `settings.docs_path`.
3. Resolve `{feature_folder}` for this run: `{docs_path}/features/{YYYY-MM-DD}_<slug>/`. The `<slug>` is derived in Phase 0a (worktree + slug); placeholder until then.
4. If `settings.workstream` is non-null → load `~/.pmos/workstreams/{workstream}.md` and pass through to every child skill (each child loads workstream itself; we just don't unload it).
5. Read `~/.pmos/learnings.md` if present; note any entries under `## /feature-sdlc` and factor them into your approach. Skill body wins on conflict; surface conflicts to user before applying.

Workstream IS loaded — this is a feature-level orchestrator.

**Load soft-gate defaults.** Read `.pmos/feature-sdlc.lastrun.yaml` from `<main-repo-root>` (resolved via git per `reference/soft-gate-lastrun-schema.md` § Path — NOT the per-feature worktree, so the memory survives worktree cleanup) into an in-memory `soft_gate_defaults` dict: present+valid → seed it (Phase 0e will fire); absent → leave unset (first run — each gate prompts individually); malformed/`version>1` → stderr warn `feature-sdlc.lastrun.yaml malformed or unknown version — falling back to per-gate prompts` and treat as absent; `--reset-defaults` flag → bypass the read, treat as absent. Never error out — this file is advisory.

### Phase 0a: output_format resolution (FR-12)

6. **Resolve `output_format`.** Read `output_format` from `.pmos/settings.yaml` (default: `html`; valid values: `html`, `md`, `both` — `both` is accepted but treated as `html`; the mixed-format MD sidecar is retired per FR-12.1, see Phase 1 step 2). A `--format <html|md|both>` argument-string flag overrides settings (last flag wins on conflict, per FR-12). Print to stderr exactly: `output_format: <value> (source: <cli|settings|default>)` once at Phase 0 entry. Pass the resolved value through to every dispatched child skill via the `[mode: <current-mode>]\n` first-line convention plus an additional `[output_format: <resolved>]\n` line so children inherit without re-reading settings.

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

`{tier}` is set from (in precedence order):

1. `--tier N` flag if passed.
2. **In skill modes only** — the tier resolved by Phase 0d (`/skill-tier-resolve`) from `reference/skill-tier-matrix.md` (for `skill-feedback`: per-skill tiers, run tier = max). This runs *before* `/requirements`, so it's the early-phase default in skill modes. A `--tier N` flag still overrides it (logging a divergence note per E19).
3. After `/requirements` completes — read its auto-tier output.
4. Until the above resolves, gate-recommendation logic uses Tier-3 conservative defaults.

Per FR-TIER-SCOPE / spec §15 G8: `{tier}` drives BOTH child-skill `--tier` passthrough (only for children that accept it: `/requirements`, `/spec`, `/plan`) AND orchestrator gate logic (Phases 2a grill, 3a creativity, 3b wireframes, 3c prototype, 8a retro). The former `msf-req` and `simulate-spec` phases were removed in v2.34.0 — folded into /requirements (its Phase 5a) and /spec (its Phase 6a) respectively. Child skills retain the right to auto-tier-escalate; if a child reports a different tier, log to `state.yaml.phases.<X>.child_tier_divergence` and continue — do not override the child.

### `--minimal` flag + `_minimal_active` sentinel (new in v2.34.0 per W17)

If `--minimal` is present in the argument string, set the directive `_minimal_active = true` (a boolean the orchestrator carries through the run). At Phase 3a (creativity), Phase 3b (wireframes), Phase 3c (prototype), and Phase 8a (retro), if `_minimal_active` is true, the orchestrator MUST log `[orchestrator] phase_minimal_skip: <phase-id>` to chat and proceed to the next phase WITHOUT issuing the gate prompt for that gate. Those four soft-gate prompts are contingent on `_minimal_active` being false. (In skill modes, 3b/3c are already not presented — see Phase 3 — so `--minimal` there only affects 3a creativity and 8a retro.)

This is a sentinel short-circuit at the orchestrator level (per spec D29 / W17). It does NOT use the canonical-block classifier — the gates are never issued, so they are never seen by audit-recommended.sh. `--minimal` is user-explicit (a flag the user passes deliberately) so it does not violate Anti-pattern #4's "auto-running optional stages" rule.

Hard phases (`/requirements`, `/spec`, `/plan`, `/execute`, `/verify`, `/complete-dev`, and — in skill modes — `/feedback-triage` and `/skill-eval`) are NOT affected by `--minimal`. The flag only short-circuits the four enumerated soft gates.

### Missing-skill detection

When a child skill invocation returns "skill not found" / "unknown skill" platform error, present the missing-skill dialog from `reference/failure-dialog.md`. Hard phases omit Skip; soft phases include it. Pause-to-install writes `status: paused, paused_reason: missing_skill, missing_skill: <name>` and exits per the Pause contract.

## Phase 0a: Worktree + Slug + Branch

**Skip if `--no-worktree` was passed** — record `worktree_path: null, branch: null` in `state.yaml` and continue in cwd. (Dirty-tree case: still refuse — see (c) below — even with `--no-worktree`, since `/execute` will commit to the current branch.)

### Step 1 — Derive slug

Apply `reference/slug-derivation.md` rules to the initial-context input. Surface the proposed slug via `AskUserQuestion`:
```
question: "Proposed feature slug: <slug>. Confirm or edit?"
options:
  - Use this slug (Recommended)
  - Edit
  - Cancel
```

### Step 2 — Unified pre-flight (FR-PA01–PA04)

Before `git worktree add`, the skill MUST run all six checks below and, on any collision, surface a single unified dialog:

| Check | Condition | Detection |
|---|---|---|
| (1) cwd is git repo | `git rev-parse --is-inside-work-tree` returns true | abort if false: `not a git repo — cd to your repo or pass --no-worktree` |
| (2) HEAD not detached | `git symbolic-ref -q HEAD` returns 0 | abort if non-zero: `detached HEAD — checkout a branch first or pass --no-worktree` |
| (3) Working tree clean | `git status --porcelain` is empty | abort if non-empty: `dirty tree — commit/stash or pass --no-worktree` |
| (4) Candidate path absent | `<repo-parent>/<repo-name>-<slug>/` directory does NOT exist | collision dialog if exists |
| (5) Branch absent | `git branch --list "feat/<slug>"` is empty | collision dialog if non-empty |
| (6) Worktree-list slot free | `git worktree list --porcelain` has no entry for the candidate path OR the slug | collision dialog if registered |

On (1)–(3) failure: abort with the precise git error and the suggested fix above.

On (4) OR (5) OR (6) collision, present a single `AskUserQuestion`:
- **Use existing branch / worktree (Recommended)** — enters Phase 0b resume mode if state.yaml is present in the existing worktree path; otherwise initializes state.yaml fresh on top of the existing branch with `state.notes` annotated `"reused-existing-branch:<reason>"`.
- **Pick new slug (-N suffix)** — appends `-2`, `-3`, ... to the slug and re-runs the unified pre-flight (idempotent).
- **Abort** — exit 64 with the surfaced collision details.

**Orphan-dir handling (FR-PA04):** if (4) fires (path exists) but (6) does not (path is not in `git worktree list` — git no longer tracks it), the dialog wording MUST include the suffix `(orphan worktree dir detected — git no longer tracks it)` so the user knows manual cleanup may be needed before "Use existing" can succeed.

### Step 2.5 — Base-drift check (FR-PA05)

**Skip if `--no-worktree` was passed** (the user has opted out of worktree creation; the run will inherit the current branch's state).

Before `git worktree add` (Step 3), check whether the local base branch is behind its tracking remote. A worktree branched off a stale local main produces silent damage at merge time — version bumps land below the latest published, changelog entries collide, conflicts surface only at Phase 8.

1. **Resolve the base + remote.**
   - Base ref = the branch currently checked out (typically `main` / `master`). Capture as `<base>`.
   - Tracking remote = the upstream of `<base>` via `git rev-parse --abbrev-ref <base>@{upstream}`. If `<base>` has no upstream → log `base-drift: <base> has no upstream; skipping fetch` and proceed to Step 3 (nothing to be behind of).
   - Capture the remote name from the upstream string (e.g. `origin/main` → `origin`); save as `<remote>`.

2. **Fetch + compute drift.**
   ```bash
   git fetch <remote> <base>
   behind=$(git rev-list --count <base>..<remote>/<base>)
   ```
   On `git fetch` non-zero exit (network down, auth failure, etc.): log `base-drift: fetch failed (<error>); proceeding without drift check` and continue to Step 3 (do NOT block on a flaky network).

3. **If `behind == 0`** → log `base-drift: <base> up-to-date with <remote>/<base>; proceeding` and continue to Step 3 unchanged.

4. **If `behind > 0`** → surface a single `AskUserQuestion` BEFORE creating the worktree (default pick: `Pull latest then branch (Recommended)`):

   ```
   question: "Local <base> is <N> commits behind <remote>/<base>. Pull latest before branching?"
   options:
     - Pull latest then branch (Recommended)
         description: git pull --ff-only <remote> <base>, then create the worktree off the updated base.
     - Branch from current local <base> (record drift)
         description: Continue off the stale base; state.yaml.base_drift records the gap for the run's audit trail.
     - Abort
         description: Exit 64; resolve manually.
   ```

   - **Pull latest then branch (Recommended):** run `git pull --ff-only <remote> <base>`. On non-fast-forward failure (local has diverging commits): surface the raw git error and present a follow-up:
<!-- defer-only: destructive -->
     `AskUserQuestion` — **Abort (Recommended)** / **Branch from current local <base> (record drift)**. Never auto-rebase or auto-merge; the user owns the diverging history.
   - **Branch from current local <base> (record drift):** continue to Step 3. After state.yaml is written (Step 3 substep 3), set `state.base_drift = { behind: <N>, fetched_at: <ISO-8601 now>, remote: '<remote>', base: '<base>', remote_sha: '<short-sha of <remote>/<base>>', local_sha: '<short-sha of local <base>>' }`. The post-phase atomic update protocol (Phase 1) covers this write.
   - **Abort:** exit 64 with `aborted: local <base> is <N> commits behind <remote>/<base>`.

5. **`--non-interactive` mode** — the prompt is deferred per the canonical non-interactive block (tag adjacency would be `<!-- defer-only: destructive -->` semantics: pulling is non-destructive, but branching off stale base has real downstream effects). The buffer entry records the drift; the run continues with **branch-from-current-local-<base>** as the deferred-default (the only option that does not require user judgement) and writes `state.base_drift` accordingly. The OQ log entry flags this for review at end-of-run.

**Observability (NFR-06):** every branch of this step emits a single chat log line — `base-drift: behind=<N> remote=<remote> base=<base> action=<pulled|recorded|skipped|aborted>` — so users can audit why drift handling did what it did.

### Step 3 — Create worktree, write state, try EnterWorktree (FR-W01–W04)

1. **Compute the canonical worktree path:**
   ```bash
   ABS_PATH="$(realpath -- "<repo-parent>/<repo-name>-<slug>")"
   ```
   (Use the canonical-path contract from `_shared/canonical-path.md` — fall back to the python3 oneliner when realpath is unavailable.)
2. **Create the worktree:**
   ```bash
   git worktree add -b feat/<slug> "$ABS_PATH"
   ```
   On non-zero exit, surface the raw git error and abort with exit 64 (this should not normally fire after the unified pre-flight).
3. **Write the initial state.yaml inside the new worktree** per Phase 1 (state-init writes canonical `worktree_path: $ABS_PATH`). The state.yaml MUST exist before the next step so a fallback handoff produces a resumable artifact.
4. **Call `EnterWorktree(path=$ABS_PATH)`.**
   - On success: print to chat exactly `Entered worktree at $ABS_PATH on branch feat/<slug>. Continuing pipeline.` and proceed to Phase 1 onwards (Phase 1 is now a no-op — state.yaml already written).
   - On any error: emit the literal handoff block (FR-W04 below), then a blank line, then the standalone chat line `Status: handoff-required` (no surrounding text — grep-able by wrapper scripts per FR-W02), then exit with code 0. Do NOT inspect the error message; all errors handed off identically per D2.

**Handoff block (FR-W04, plain text, no markup, byte-for-byte):**

```
Worktree created at <ABS_PATH>.
State initialized at <ABS_PATH>/.pmos/feature-sdlc/state.yaml.

To continue the pipeline, run these two commands in a new terminal:

    cd <ABS_PATH>
    claude --resume

Then call /feature-sdlc --resume in the new session.
```

Substitute `<ABS_PATH>` (canonical realpath) in both occurrences — no other interpolation.

**`--no-worktree` bypass (FR-W05):** if the user passed `--no-worktree`, this entire Step 3 (and Steps 1–2 of Phase 0a) is skipped; state path is `./.pmos/feature-sdlc/state.yaml` in the launch cwd; `state.worktree_path: null`, `state.branch: null`. Drift check is bypassed (FR-R03).

## Phase 0b: Resume detection

**Skip if `--resume` was NOT passed AND no `.pmos/feature-sdlc/state.yaml` exists in the current worktree.**

If `--resume` was passed but state.yaml is absent → hard error: `--resume specified but no .pmos/feature-sdlc/state.yaml found in <cwd>. Either cd to the right worktree or omit --resume.` Exit 64.

When state.yaml is present:

1. **Drift check (FR-R02, runs FIRST before any other validation).** Compute `realpath($PWD)` and compare byte-equal to `state.worktree_path` (already canonical per FR-S03 — see `_shared/canonical-path.md`). On mismatch:

   ```
   pre-flight check failed: realpath(pwd) [<actual>] != realpath(state.worktree_path) [<expected>]. Relaunch claude from <expected> and try again.
   ```

   Exit 64.

   **Bypass (FR-R03):** when `state.worktree_path` is `null` (set by `--no-worktree` mode), the drift check is skipped — proceed to step 2.

   **Observability (NFR-06):** before the comparison, log to chat the line `drift check: realpath(pwd)=<a> realpath(state.worktree_path)=<b> result=<pass|fail>` so users can debug unexpected refusals.

   **Origin-moved check (FR-R06).** After the worktree-path drift check passes, re-run the Phase 0a Step 2.5 fetch+behind logic for the recorded base branch — origin may have advanced since the worktree was created. Resolve `<base>` and `<remote>` from `state.base` and `state.remote` if recorded (Phase 1 writes them); otherwise re-derive via `git rev-parse --abbrev-ref <current-branch>@{upstream}` of the *parent* branch the worktree forked from (`state.base` is authoritative when present). Compute `behind_now = git rev-list --count <base>..<remote>/<base>`. If `behind_now > (state.base_drift.behind || 0)`, log `origin-moved-since-worktree-created: behind_now=<N>, behind_at_create=<M>` and update `state.base_drift = { behind: <N>, fetched_at: now, remote, base, remote_sha, local_sha }` (or insert if absent). This is observability-only on resume — do NOT prompt mid-resume; the user already chose to continue this branch. On `git fetch` failure: log and proceed (mirrors Phase 0a Step 2.5 behaviour).

2. **Schema-version check (FR-R04, FR-R05, FR-13):** the current schema version, the abort-on-newer rule, and the full migration chain are defined in `reference/state-schema.md ## schema_version` — that file is the single source of truth; do not hardcode version numbers here.
   - `state.schema_version` newer than the current version → abort: `state file from newer /feature-sdlc version (vN); upgrade pmos-toolkit and retry`. Exit 64.
   - `state.schema_version` older than the current version AND drift check passed → run the migration chain in version order per `state-schema.md` (each step additive/idempotent and emits its own chat log line; pre-2.34.0 files still elide the `msf-req`/`simulate-spec` phase ids before the v4 step — see "Auto-migration of pre-2.34.0 state files" below). Apply the atomic temp-then-rename write protocol; on `rename(2)` failure surface the failure dialog (NFR-08).
   - Same version → no migration.
3. **Validate recorded artifact paths.** For every `phases[].artifact_path` that's non-null, check that the file exists. On any missing required artifact, print the list to chat and ask the user how to proceed.
<!-- defer-only: ambiguous -->
   `AskUserQuestion` — **Continue anyway (treat as orphaned)** / **Abort**.
4. **Print status table** to chat from `00_pipeline.{html,md}` short-form (3 columns: phase | status | artifact). This table is **presentational, not interrogative** — see Anti-pattern below.
5. **Resume cursor:** find the first `phases[]` entry whose status is in `{paused, failed, pending, in_progress}` and jump to that phase. The cursor is **mode-agnostic** — it scans whatever `phases[]` the original run wrote (which is mode-conditional per FR-11: `feature`, `skill-new`, `skill-feedback` each have their own `phases[]` set — see `reference/state-schema.md`); `pipeline_mode` is read back from `state.yaml`, not re-derived (FR-05). If a `paused` or `failed` entry is found first, surface the corresponding dialog (`reference/compact-checkpoint.md` for compact-paused; `reference/failure-dialog.md` for failed/failure-paused).
6. **Skip Phases 0a, 0e, and 1** (and Phase 0c/0d if the mode includes them — they are normal phases recorded in `phases[]`, so the cursor handles them) — worktree, slug, and state.yaml already exist; gate dispositions are already recorded per-phase in `state.yaml`, so the 0e consolidation has nothing to consolidate on resume.

The resume status table is **presentational**, not interrogative — followed by at most a single structured ask (continue / abort) when needed. The orchestrator has no review/refinement loops of its own; every refinement is owned by a child skill. Per spec §15 G9.

### Resume Status panel folded-phase failure re-emit (T12b)

When emitting the Resume Status panel per `reference/compact-checkpoint.md` (T4 deliverable), include the same `Folded-phase failures (N)` subsection format used in Phase 9 (below). Read `state.yaml.phases.<x>.folded_phase_failures[]` across all phases; emit the subsection only when N≥1; otherwise omit. Per FR-52/FR-53 — the user must see the failure history at every resume so they can decide whether to retry, manually patch, or abort.

### Auto-migration of pre-2.34.0 state files

Two phase IDs were removed in v2.34.0:

- `msf-req` — folded into `/requirements` as Phase 5a (W1).
- `simulate-spec` — folded into `/spec` as Phase 6a (W3, delegating to `_shared/sim-spec-heuristics.md`).

When `--resume` reads a pre-2.34.0 `state.yaml` carrying these phase entries, transparently elide them on read (do NOT block, do NOT prompt). The resume cursor advances to the next non-elided phase. See `reference/state-schema.md` Schema v2 auto-migration block for the exact 4-step idempotent migration contract. This back-compat handling is silent on a clean migration; if migration fails (e.g., `rename(2)` error per NFR-08), surface the failure dialog.

## Phase 0c: /feedback-triage (skill-feedback only)

**Runs only when `pipeline_mode == skill-feedback`** (in `feature` and `skill-new` it does not run — a mode-conditional by-design omission, not a skipped gate). Hardness: **hard** — its only clean exit is "no actionable findings / no in-scope skills"; the approval gate is mandatory. Resume: a normal phase (D12) — re-enter from the persisted `0c_feedback_triage.html` draft if present.

**Goal:** turn raw feedback into an approved, per-skill change set + a per-skill tier, persisted as `{feature_folder}/0c_feedback_triage.html`, which Phase 2 (`/requirements`) then seeds from.

1. **Parse the feedback input into findings (FR-20).** Dispatch by input shape:
   - It's a `/reflect` paste-back (or `--from-reflect` resolved to one) → parse it verbatim via `reference/reflect-parser.md` into the canonical finding shape.
   - It's a file path → read the file, then detect findings (a structured list → parse it; free prose → LLM-extract).
   - It's an inline text blob → LLM-extract into the same finding shape.
   The finding shape: `{skill, severity, one_line, evidence (≤2 lines), proposed_fix (verbatim from input)}`.

2. **Resolve the in-scope skill set (FR-21, FR-22).** Map each finding's named skill to the installed-skill list (the host repo's `plugins/*/skills/<name>/SKILL.md`, plus any `.agents/` / `.claude/skills/` per `reference/repo-shape-detection.md`). For ambiguous / unrecognised skill names:
<!-- defer-only: ambiguous -->
   `AskUserQuestion` — present the candidates and let the user map or drop each. **Zero findings OR zero in-scope skills → exit clean with no artifacts** (log `Phase 0c: no actionable findings; nothing to do` and end the run — there is no skill work to drive).

3. **Per-finding critique (FR-23).** For each finding, against the target skill's *current* `SKILL.md` plus only the reference files it cites (do not read the whole `reference/` tree), produce: `already_handled ∈ {yes, no, partial}` · `classification ∈ {bug, ux-friction, new-capability, nit}` · `recommendation ∈ {apply, modify, skip, defer}` + a one-line rationale · `scope_hint ∈ {small, medium, large}`.

4. **Keep/drop approval — Findings Presentation Protocol (FR-24).** One approval prompt per finding (batch ≤4 per call), in finding order:
<!-- defer-only: ambiguous -->
   `AskUserQuestion` — options **Apply as recommended** / **Modify** (user supplies replacement text next turn) / **Skip — drop with reason** / **Defer**. If there are >20 findings, first issue one prompt:
<!-- defer-only: ambiguous -->
   `AskUserQuestion` — **Filter to blockers + friction only (Recommended)** / **Review all N**. Platform fallback (no interactive tool): emit a numbered findings table with a `disposition` column for the user to fill in.

5. **Persist the triage doc (FR-25).** Write `{feature_folder}/0c_feedback_triage.html` via the HTML substrate at `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/` — companion `0c_feedback_triage.sections.json`, asset prefix `assets/`, `?v=<plugin-version>` cache-bust, kebab-case `<h2>`/`<h3>` IDs, index regen — reusing the structure of `reference/triage-doc-template.md`: sections **Findings (parsed)** / **Critique** / **Disposition log** / **Approved changes by skill** / **Per-skill tier**. Record `feedback_source` (resolved input path or `<inline-text>`) and `target_skills: [<name>,…]` on the `feedback-triage` entry in `state.yaml`, with `artifact_path: 0c_feedback_triage.html`.

6. **Hand-off to Phase 2 (FR-27).** The Phase 2 `/requirements` invocation in skill-feedback mode is seeded from `reference/seed-requirements-template.md` — **self-contained, per-skill** (approved findings verbatim + trimmed current-`SKILL.md` excerpts + a one-paragraph proposed direction + out-of-scope + constraints, with `reference/skill-patterns.md` cited as the standing acceptance criteria) — producing **one combined `01_requirements.{html,md}` with a per-skill section**, not one doc per skill.

On failure: hard-phase failure dialog from `reference/failure-dialog.md` (no Skip).

## Phase 0d: /skill-tier-resolve (skill modes only)

**Runs only when `pipeline_mode ∈ {skill-new, skill-feedback}`** (feature mode: not run — by-design omission). Hardness: **infra** — a setup/detection phase like `worktree`/`init-state`; no merge effect of its own.

**Goal:** one repo-shape pass yields three values, all recorded on the `skill-tier-resolve` entry in `state.yaml` (FR-14):

1. **Tier** — via `reference/skill-tier-matrix.md`. In `skill-new`, tier from the described skill's expected shape. In `skill-feedback`, **per-skill tier** from each approved-change-set's size, and the **run tier = max** across skills, shown with the per-skill breakdown (G11). `--tier N` on the CLI overrides the matrix (FR-33) and logs a divergence note to `state.yaml.phases.skill-tier-resolve.child_tier_divergence` (E19) — the matrix recommendation is not silently dropped.
2. **Skill location** — via `reference/repo-shape-detection.md`'s four-rung chain (host `CLAUDE.md`/`AGENTS.md`/`GEMINI.md` rule > `plugins/<p>/.claude-plugin/plugin.json` [if multiple plugins → the prompt below] > `.agents/` > `.claude/skills/`).
3. **Target platform** — `claude-code` / `codex` / `generic` per the same reference file's three outcomes.

If the repo has multiple candidate plugins for rung 2:
<!-- defer-only: ambiguous -->
`AskUserQuestion` — present the plugin list and ask which one owns the new/edited skill. (E18.)

**Confirmation (FR-34).** A single consolidated ask before proceeding:
<!-- defer-only: ambiguous -->
`AskUserQuestion` — `"Detected: tier <N> (<reasons>); skill location <path>; target platform <p>. Confirm or edit?"` options **Confirm all (Recommended)** / **Edit tier** / **Edit location** / **Edit platform**. On any edit, re-prompt for that value, then re-confirm.

`{tier}` (the run tier) is passed down to `/requirements`, `/spec`, `/plan` via the existing `--tier <N>` passthrough.

On failure: surface the failure dialog (infra phase — Retry / Pause / Abort).

## Phase 0e: Confirm soft-gate defaults (2nd-run consolidation; W3)

Collapses the five non-destructive soft gates (`1a` ideate, `3a` creativity, `3b` wireframes, `3c` prototype, `8a` retro) into ONE confirm seeded from the prior run, so the 2nd+ run doesn't re-answer identical choices one at a time. Mirrors `/complete-dev` Phase 0a. Full read/write/field contract: `reference/soft-gate-lastrun-schema.md`.

**Skip this phase entirely (proceed to Phase 1, gates fire individually) when ANY of:** Phase 0b entered resume mode (gate statuses already in `state.yaml`); `soft_gate_defaults` is unset (first run / malformed / `--reset-defaults`); `pipeline_mode == prototype` (its wireframes/prototype are hard, not gated); `--minimal` is active (it already force-skips 4 of the 5 gates — log `Phase 0e skipped (--minimal active)`); `mode == non-interactive` (the canonical block AUTO-PICKs each gate — log `Phase 0e auto-confirmed (non-interactive); defaults source: lastrun`).

Otherwise present the gates that apply to this `pipeline_mode` (feature → all five; `skill-new` → ideate, creativity, retro; `skill-feedback` → creativity, retro — `3b`/`3c` are suppressed in skill modes and ideate is absent in `skill-feedback`):

```
Phase 0e — Confirm soft-gate defaults

  /ideate:      skip
  /creativity:  skip
  /wireframes:  run
  /prototype:   skip
  /reflect:     skip

(Source: .pmos/feature-sdlc.lastrun.yaml — last updated 2026-06-01)
```

```
question: "Use these soft-gate choices? Destructive prompts (slug, base-drift, merge, push, failures) still fire as needed."
options:
  - Confirm all (Recommended)
  - Edit one or more
  - Cancel
```

**On "Confirm all":** set `soft_gates_confirmed = true`. Each gate phase consults `soft_gate_defaults` and short-circuits its prompt (see the "Short-circuit when Phase 0e confirmed" clause in Phases 1a/3a/3b/3c/8a). The destructive/judgement prompts in `reference/soft-gate-lastrun-schema.md` § "never consolidated" always fire.

**On "Edit one or more":**
<!-- defer-only: ambiguous -->
```
question: "Which gates do you want to change?"
multiSelect: true
options:        # present only the gates applicable to this mode
  - /ideate
  - /creativity
  - /wireframes
  - /prototype
  - /reflect
```
For each selected gate, present that gate's own option list (reuse Phase 1a/3a/3b/3c/8a verbatim) to capture the new value, update `soft_gate_defaults`, then re-display the summary and re-ask "Use these soft-gate choices?" — loop until Confirm. Set `soft_gates_confirmed = true` on Confirm.

**On "Cancel":** exit `/feature-sdlc` with no side effects (no worktree was created in this phase; Phase 0a's worktree, if already made, is left for the user — same as any pre-Phase-1 abort).

## Phase 1: Initialize state

**Skip if Phase 0b entered resume mode.**

Atomically (per `reference/pipeline-status-template.md` Update protocol):

1. Write `.pmos/feature-sdlc/state.yaml` from the schema in `reference/state-schema.md`:
   - `schema_version: <the current version — defined in `reference/state-schema.md ## schema_version`>` (FR-10; that file is the single source — never hardcode the number here).
   - `pipeline_mode: <feature | skill-new | skill-feedback | prototype>` — the value resolved by the Phase 0 subcommand dispatch (D16). Distinct from `mode ∈ {interactive, non-interactive}`, which is also set here.
   - top-level fields populated from Phases 0/0a (slug, mode, started_at = now, last_updated = now, worktree_path = realpath(<abs-worktree-path>) per `_shared/canonical-path.md` — `null` when `--no-worktree` (FR-S02), branch — `null` when `--no-worktree`, feature_folder).
   - `tier: null` (set after Phase 2 `/requirements` — or, in skill modes, after Phase 0d `/skill-tier-resolve` — unless `--tier` was passed).
   - `current_phase: <first phase of this mode's `phases[]`>` (the next phase to run — `requirements` in feature mode; `skill-tier-resolve` in `skill-new`; `feedback-triage` in `skill-feedback`).
   - `phases[]` populated in declared order from `state-schema.md` "Phase identifiers + hardness", **mode-conditional per FR-11** (feature = the 2.36.0 set; `skill-new` = that set − `{wireframes, prototype}` + `{skill-tier-resolve, skill-eval}`; `skill-feedback` = the `skill-new` set + `{feedback-triage}` inserted after `init-state`), every status `pending`. Each entry initialized with `started_at: null` AND `folded_phase_failures: []`. The `retro` phase entry MUST be present (between `complete-dev` and `final-summary`) in every mode.
   - `open_questions_log: []`.

### Phase status-transition write contract (FR-57; T13)

When transitioning any phase from `pending` → `in_progress`:

- Set `phases[<id>].status = "in_progress"`.
- If `phases[<id>].started_at` is currently `null`, set it to ISO-8601 `now`. If non-null (a prior /resume), preserve the original timestamp (do NOT overwrite).
- Update top-level `last_updated = now` and `current_phase = <id>`.
- Apply the atomic D31 write protocol: write `.pmos/feature-sdlc/state.yaml.tmp`, then `rename(2)` to `state.yaml`. On rename failure, surface the failure dialog per NFR-08 — never leave a `.tmp` orphan.

The `started_at` write is the cursor `/execute` and folded apply-loops use to detect already-applied work after a /resume (`git log --since=<phase.started_at>`). Never-overwrite semantics are critical: a re-entered phase must not lose its original cursor or duplicate-apply-loop guard fires.
2. Write `<feature_folder>/00_pipeline.html` from the template in `reference/pipeline-status-template.md`, rendered through the substrate at `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/`.

   - **Atomic write (FR-10.2):** temp-then-rename.
   - **Asset substrate (FR-10):** copy `assets/*` from `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/` to `<feature_folder>/assets/` (`cp -n` is idempotent).
   - **Asset prefix (FR-10.1):** `assets/` (top-level feature-folder write).
   - **Cache-bust (FR-10.3):** `?v=<plugin-version>` on all asset URLs.
   - **Heading IDs (FR-03.1):** every `<h2>` and `<h3>` carries a stable kebab-case `id` per `_shared/html-authoring/conventions.md` §3.
   - **No sections.json companion** for orchestrator artifacts (per runbook edge case row 3 — `00_pipeline.html` has no `<h2>`-anchored TOC of substantive content; the status table is the body).
   - **Index regeneration (FR-22, §9.1):** seed `<feature_folder>/index.html` via `_shared/html-authoring/index-generator.md` — at this point the manifest contains a single entry for `00_pipeline.html` (subsequent child-skill writes will trigger their own regenerations to extend the manifest).
   - **Mixed-format sidecar (FR-12.1):** retired — `output_format=both` is treated as `html` until a future feature re-introduces MD export.
   > See "Apply comment-resolver edit" for the required `<meta name="pmos:skill">` bake.
3. Print the in-chat short-form status table.

## Compact checkpoint (recurring micro-phase)

**Not a numbered phase — invoked before a heavy phase, mode-dependent (FR-40 / E8):**

- **feature mode:** before `wireframes` (3b), `prototype` (3c), `execute` (6), `verify` (7).
- **skill modes (`skill-new` / `skill-feedback`):** before `execute` (6) and `verify` (7) **only** — 3b/3c are suppressed in skill modes, and Phase 6a (`skill-eval`) is light (scoring), so no checkpoint fires before 6a.

See `reference/compact-checkpoint.md` for the exact prompt shape and the three-part Pause-resumable exit contract (FR-PAUSE / spec §15 G1). (The former simulate-spec phase is no longer a checkpoint trigger — folded into /spec in v2.34.0.)

Skills cannot trigger `/compact` directly — only the user can. The checkpoint surfaces the choice; "Pause" exits cleanly so the user can `/compact` and re-run with `--resume`.

### Atomic post-phase update protocol

After every phase end (pass / fail / skip / pause), do all three atomically — never partial:

1. Update `state.yaml`.
2. Regenerate `00_pipeline.html` via the atomic-write + cache-bust + asset-prefix rules from Phase 1 step 2. The index regen on each phase-end picks up any sibling artifacts emitted by the just-completed child phase.
3. Print the in-chat short-form status table.

A failed update of any one of these three breaks the resume contract. Rolling back the partial write is the implementor's responsibility.

## Phase 1a: /ideate gate (soft; feature + skill-new only)

**Runs only when `pipeline_mode ∈ {feature, skill-new}`** — in `skill-feedback` it is a mode-conditional by-design non-presentation (per Anti-pattern #4 carve-out; triage doc is already structured). Phase id `ideate` is absent from `phases[]` in skill-feedback (see `reference/state-schema.md`). Hardness: **soft**. **Goal:** when the seed is half-formed, give the user a one-prompt path to brainstorm via `/ideate`; if the brief reads as a big idea (Tier-3), auto-chain `/grill --depth deep`. Brief lands in the feature folder and seeds Phase 2.

1. **`--no-ideate` short-circuit.** If passed, log `[orchestrator] phase 1.5 ideate: --no-ideate flag; skipping`, set `status = skipped-flag`, proceed. Else: apply `reference/fuzzy-idea-detection.md` to the seed text + `doc_attached` flag → `seed_shape ∈ {fuzzy, formed}` (record on `state.yaml.phases.ideate.seed_shape`). `formed` → log `[orchestrator] phase 1.5 ideate: formed seed detected; skipping`, set `status = skipped-formed`, **do NOT present the gate** (auto-skip-on-formed is allowed because the classifier ran — Anti-pattern #14; distinct from `skipped`, explicit user pick at a presented gate). `fuzzy` → present a single gate:

<!-- defer-only: ambiguous -->
`AskUserQuestion` — **Run /ideate (Recommended)** (brainstorm; brief seeds /requirements) / **Skip** (proceed straight to /requirements; pick this if the detector misfired). In `--non-interactive`: deferred per canonical block; default = Skip; `status = skipped-non-interactive` with a log line analogous to /grill's Anti-pattern #7 contract.

**Short-circuit when Phase 0e confirmed (W3):** after the `--no-ideate` and `formed`-seed auto-skips are evaluated (they take precedence), if the gate would otherwise present (a `fuzzy` seed), apply `soft_gate_defaults.ideate` instead — `run` → run /ideate; `skip` → `status = skipped`, proceed. Log `[orchestrator] phase 1.5 ideate: auto-<run|skip> via Phase 0e`. Skip the prompt above.

2. **Run `/ideate`** (Run-picked). Invoke `/pmos-toolkit:ideate` with the seed; prepend `[mode: <current-mode>]\n` + `[output_format: <resolved>]\n` first-lines (FR-06). Copy the brief into the feature folder as `00d_ideate.html` via the atomic-write substrate. Resolve path via `_shared/resolve-input.md` `phase=ideate`; on resolver-miss, fall back to `find {docs_path}/ideate -newer {state.yaml} -name '*.html' | sort | tail -1`. Record `artifact_path: 00d_ideate.html`. On `/ideate` failure: soft-phase failure dialog (Skip SHOWN — proceed without a brief).
3. **Tier-3 auto-chain to `/grill --depth deep`.** Estimate — `ideate_tier_estimate = 3` iff **either** `--tier 3` was explicit **or** the brief satisfies one disjunct: ≥3 user-journey `<section>` blocks (IDs matching `#journey-` / `#scenario-` / `#user-`, case-insensitive) **or** ≥5 pressure-test findings (`class="finding"` or `<li>` under `#pressure-test` / `#premortem`). Otherwise estimate ∈ {1, 2} (default 2). If `== 3`: invoke `/pmos-toolkit:grill --depth deep` against `00d_ideate.html`; capture to `00d-grill_ideate.html`; log `[orchestrator] phase 1.5 ideate: Tier-3 detected (reason=<flag|journeys|findings>); auto-ran /grill --depth deep`; set `grill_deep_chained = true` + `grill_deep_artifact_path`. Else: log `[orchestrator] phase 1.5 ideate: tier estimate <N>; grill --depth deep skipped`. Mark `status = completed` (or the appropriate `skipped-*`); Phase 2 reads `artifact_path` + `grill_deep_artifact_path` and forwards them via `[ideate-brief: …]` / `[ideate-grill: …]` lines (see Phase 2 below). On any unexpected failure: soft-phase failure dialog (Skip SHOWN — the gate is non-blocking).

## Phase 2: /requirements (hard)

Invoke `/pmos-toolkit:requirements` with the seed for this mode:

- **feature:** the initial-context.
- **skill-new:** the `skill <description>` text (from the Phase 0 dispatch).
- **skill-feedback:** the **combined per-skill seed** built in Phase 0c from `reference/seed-requirements-template.md` (one self-contained section per in-scope skill) — see Phase 0c step 6 and the Phase-2 skill-patterns wiring below.

Pass `[mode: <current-mode>]\n` and `[output_format: <resolved>]\n` as the first lines of the child prompt (per FR-06). Pass `--tier <N>` if `{tier}` is set (it is, in skill modes — Phase 0d resolved it). Pass `--backlog <id>` through if it was given to `/feature-sdlc`.

**Ideate brief passthrough (feature + skill-new only, when Phase 1a produced a brief).** If `state.yaml.phases.ideate.artifact_path` is non-null, append `[ideate-brief: <path>]` after the `[output_format: …]` line; if `grill_deep_artifact_path` is also non-null, append `[ideate-grill: <path>]`. `/requirements` reads these as additional seed (brief = framed problem + journeys + pressure-test findings; grill artifact = resolved decisions). Skipped-* states write nothing.

**In skill modes** (FR-61 — fuller wiring in the citation pass): prepend a line citing `reference/skill-patterns.md` as the standing acceptance criteria — "the produced/revised skill must conform to `skill-patterns.md §A–§F`".

After completion:

- Capture artifact path: `<feature_folder>/01_requirements.{html,md}` (resolve via `_shared/resolve-input.md` `phase=requirements` to find whichever extension the child wrote based on the resolved `output_format`). Write to `state.yaml.phases.requirements.artifact_path`. In skill-feedback mode this is the single combined doc with a per-skill section.
- Read auto-tier from the requirements doc frontmatter; if `{tier}` was unset, set it now. If `{tier}` was already set (always so in skill modes), and the auto-tier differs, log `child_tier_divergence: <orchestrator=<N>, child=<M>>` and continue (do not override).
- If `mode == non-interactive`, locate the child's OQ artifact (per the canonical non-interactive block conventions) and append to `state.yaml.open_questions_log[]`.

On failure: present the hard-phase failure dialog from `reference/failure-dialog.md`. No Skip option. Anti-pattern #10 (in spec §12) applies — `/verify` is non-skippable; same principle for hard phases here.

## Phase 2a: /grill (soft, mandatory at Tier 2+, auto-skip in --non-interactive)

**Skip if `{tier}` is 1.** Runs in all modes (the requirements doc is grilled the same way whether it describes a feature or a skill).

**Auto-skip if `mode == non-interactive`** with explicit chat log line — never silent. The line must read:

```
Skipped /grill: --non-interactive flag (Tier <N> normally requires it).
```

Status table records `status: skipped-non-interactive`. Per FR-PHASE-TAGS (spec §15 G5) and Anti-pattern #7 (spec §12).

Otherwise, invoke `/pmos-toolkit:grill` per the **Reviewer-subagent contract (FR-50/51/52, T13a)** below.

**Reviewer-subagent contract (FR-50/51/52, T13a):** before invoking /grill, chrome-strip the artifact via `Bash('node ${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/chrome-strip.js <feature_folder>/01_requirements.html > /tmp/grill-stripped.html')`. Pass the stripped HTML inline to the subagent prompt with the canonical FR-51 template: *"Read this HTML content (the document's `<main>` body — chrome already stripped). First, enumerate every `<section>` id and every `<h2>`/`<h3>` id you can locate — return as `sections_found: [...]`. Then evaluate against the rubric below. For every finding, return `{section_id, severity, message, quote: \"<≥40-char verbatim from source>\"}`."*

After the subagent returns, run FR-52 validation (hard-fail on any miss): (1) read `<feature_folder>/01_requirements.sections.json`; (2) assert `sections_found` set-equality with sections.json `ids[]` — any miss/extra → hard-fail with `[/feature-sdlc] reviewer grill returned sections_found that do not match 01_requirements.sections.json: missing=[...], extra=[...]`; (3) for each finding, substring-grep `quote` against the un-stripped source HTML — any miss → hard-fail with `[/feature-sdlc] reviewer grill returned quote not found in source: <quote-prefix-30char>...`; (4) "no findings" return is allowed only if `sections_found` matches AND the rubric explicitly permits it. On any FR-52 hard-fail, pause with `reference/failure-dialog.md` (soft-phase variant).

After completion:

- Capture artifact path: `<feature_folder>/grills/<YYYY-MM-DD>_01_requirements.{html,md}` (extension follows /grill's resolved `output_format`). Write to `state.yaml`.
- Append OQ artifact to `open_questions_log[]` if non-interactive.

On failure: soft-phase failure dialog from `reference/failure-dialog.md` (Skip option SHOWN).

## Phase 3: Enhancement gates

A container for the optional enhancement stages — `3a` (/creativity, all modes), `3b` (/wireframes, **feature + prototype modes**), `3c` (/prototype, **feature + prototype modes**). In `skill-new` / `skill-feedback` the orchestrator does not present `3b`/`3c` (a skill has no UI to wireframe or prototype) — it logs `[orchestrator] skill-mode: 3b/3c suppressed (no UI)` and proceeds to Phase 4. This is a **mode-conditional by-design non-presentation** — like `--minimal`'s short-circuit, not a silent skip of a presented gate (Anti-Pattern #4 still holds). `3a` is presented in all modes (Recommended Skip).

**In `prototype` mode (FR-PSDLC-04):** `3b` and `3c` are **hard, always-run** — they are the deliverable. No gate prompt is presented; the orchestrator logs `[orchestrator] prototype mode: 3b runs unconditionally (no gate)` and `[orchestrator] prototype mode: 3c runs unconditionally (no gate)`. The compact checkpoint still fires before each. On failure: hard-phase failure dialog (Retry / Pause / Abort — no Skip). Also see `## Prototype-mode phase ordering` below — in prototype mode `/spec` (Phase 4) runs *before* `3b`/`3c`, not after.

## Prototype-mode phase ordering

In `pipeline_mode == prototype` the execution order departs from feature/skill modes:

```
worktree → init-state → ideate → requirements → grill → creativity → SPEC → wireframes → prototype → final-summary
```

i.e. `/spec` (normally Phase 4, post-3c) runs *immediately after* `/creativity` (3a) and *before* `/wireframes` (3b) and `/prototype` (3c). This matches the OQ-1 resolution in the prototype-mode spec — wireframes and prototype consume `/spec`'s technical design.

**Implementation: ordering shim at top of post-3a flow.** When `pipeline_mode == prototype`, after Phase 3a (/creativity) completes:

1. Run Phase 4 (/spec) immediately (skip 3b/3c for now).
2. Then run Phase 3b (/wireframes) — hard per FR-PSDLC-04.
3. Then run Phase 3c (/prototype) — hard per FR-PSDLC-04.
4. Then jump to Phase 9 (final-summary). Phases 5–8a (`/plan`, `/execute`, `/skill-eval`, `/verify`, `/complete-dev`, `/reflect`) are skipped wholesale; each phase section below has a `pipeline_mode == prototype: skip` directive.

The state.yaml `phases[]` for prototype mode lists the entries in *execution order* (per `reference/state-schema.md`'s prototype-mode `phases[]` block), so Phase 0b resume cursor naturally advances correctly without special-casing.

## Phase 3a: /creativity gate (soft, all modes)

`AskUserQuestion`:
```
question: "Run /creativity for non-obvious improvement ideas?"
options:
  - Skip (Recommended)
  - Run /creativity
```

Always optional; Recommended is always Skip. User can opt in.

**Short-circuit when Phase 0e confirmed (W3):** apply `soft_gate_defaults.creativity` — `run` → run /creativity; `skip` → proceed. Log `[orchestrator] phase 3a creativity: auto-<run|skip> via Phase 0e`. Skip the prompt above.

On Run: invoke `/pmos-toolkit:creativity` with the requirements doc. On missing-skill: soft-variant missing-skill dialog.

## Phase 3b: /wireframes gate (feature mode soft / prototype mode hard / skill modes suppressed)

**Not presented in skill modes** — see Phase 3 above.

**In `prototype` mode (FR-PSDLC-04):** the gate is **not presented** — `/wireframes` runs unconditionally. Log `[orchestrator] prototype mode: 3b runs unconditionally (no gate)`. Compact checkpoint still fires first. On failure: hard-phase failure dialog (no Skip).

**In feature mode:** the gate is **always presented** per FR-FRONTEND-GATE / spec §15 G6 — never silent skip.

**Tier-1 override (FR-TIER-SCOPE):** at Tier 1, `(Recommended)` is always `Skip wireframes` regardless of the heuristic — Tier 1 (bug fix) does not warrant wireframes even when UI keywords appear. The gate is still presented; only the recommendation changes.

**Tier 2/3:** apply the heuristic in `reference/frontend-detection.md` to bias which option carries `(Recommended)`:

- Frontend-positive heuristic → `Run wireframes (Recommended)` first; `Skip wireframes` second.
- Frontend-negative heuristic → `Skip wireframes (Recommended)` first; `Run wireframes` second.

```
question: "Detected <UI feature | no UI signal>. Generate wireframes?"
options:
  - Run wireframes                     # (Recommended) on frontend-positive
  - Skip wireframes                    # (Recommended) on frontend-negative
```

**Short-circuit when Phase 0e confirmed (W3):** compute the frontend heuristic class (`positive`/`negative`) as above. If it **equals** `soft_gate_defaults.detected_signals.frontend` (unchanged since lastrun), apply `soft_gate_defaults.wireframes` — `run` → run wireframes; `skip` → proceed — log `[orchestrator] phase 3b wireframes: auto-<run|skip> via Phase 0e (signal unchanged)` and skip the prompt. If the class **changed** (the requirements shifted), the gate **re-fires** normally — log `[orchestrator] phase 3b wireframes: frontend signal changed (<old>→<new>); re-presenting gate`. Tier-1's force-skip still wins regardless.

Before invoking `/pmos-toolkit:wireframes`, run the **compact checkpoint** (the recurring micro-phase) — this is a heavy phase.

On missing-skill: soft-variant missing-skill dialog.

## Phase 3c: /prototype gate (feature mode soft / prototype mode hard / skill modes suppressed)

**Not presented in skill modes** — see Phase 3 above.

**In `prototype` mode (FR-PSDLC-04):** the gate is **not presented** — `/prototype` runs unconditionally. Log `[orchestrator] prototype mode: 3c runs unconditionally (no gate)`. Compact checkpoint still fires first. On failure: hard-phase failure dialog (no Skip). After completion, jump to Phase 9 final-summary (do NOT advance to Phase 5).

**In feature mode:** **if Phase 3b was Skipped, this gate STILL presents but with `Skip (Recommended)` since there are no wireframes to prototype.** Per FR-FRONTEND-GATE / spec §15 G6 ("by extension 3c") — never silent skip, even when the input artifact is missing. The user can still pick Run if they want a prototype built directly from the spec.

`AskUserQuestion`:
```
question: "Build a clickable prototype on top of the wireframes?"
options:
  - Skip (Recommended)
  - Run /prototype
```

Always optional; Recommended is always Skip.

**Short-circuit when Phase 0e confirmed (W3):** apply `soft_gate_defaults.prototype` — `run` → run /prototype; `skip` → proceed. Log `[orchestrator] phase 3c prototype: auto-<run|skip> via Phase 0e`. Skip the prompt above. (The "3b was skipped → Recommended Skip" nuance is moot under a confirmed remembered choice.)

Before invoking `/pmos-toolkit:prototype`, run the **compact checkpoint** (the recurring micro-phase).

On missing-skill: soft-variant missing-skill dialog.

## Phase 4: /spec (hard)

**In `prototype` mode:** this phase runs **immediately after Phase 3a /creativity** (i.e. *before* 3b/3c), per `## Prototype-mode phase ordering` above. The phase body itself is identical; only its position in the execution order changes.

Invoke `/pmos-toolkit:spec` with `<feature_folder>/01_requirements.{html,md}` (resolved primary) and `--tier <N>` (passthrough). Prepend `[mode: <current-mode>]\n` and `[output_format: <resolved>]\n`.

**In skill modes (FR-61):** prepend a line citing `reference/skill-patterns.md` — `/spec` is the generic skill (there is no skill-aware spec template, D14/FR-92), so `skill-patterns.md §A–§F` flows in as requirements: the spec must turn the cited §-sections into concrete FRs (one or more FR per applicable §), so the resulting `03_plan` tasks are testable against them.

After completion:

- Capture artifact path: `<feature_folder>/02_spec.{html,md}` (resolve via `_shared/resolve-input.md` `phase=spec`).
- Append OQ artifact to `open_questions_log[]` if non-interactive.

No compact checkpoint before this phase — `/spec` context is moderate.

On failure: hard-phase failure dialog (no Skip).

## Phase 5: /plan (hard, NOT in prototype mode)

**In `prototype` mode:** skip wholesale. The pipeline ends after Phase 3c /prototype and proceeds straight to Phase 9 final-summary. Log `[orchestrator] prototype mode: Phase 5 /plan skipped (discovery-only pipeline)`.

Invoke `/pmos-toolkit:plan` with `<feature_folder>/02_spec.{html,md}` (resolved primary; the spec is the source of truth; `/plan` will resolve the feature folder from settings + `--feature` if needed). Pass `--tier <N>` (passthrough). Prepend `[mode: <current-mode>]\n` and `[output_format: <resolved>]\n`.

**In skill modes (FR-63 — release-prereq scope discipline; cited from `reference/skill-patterns.md §G`):** prepend a directive line to the `/plan` prompt — *"Skill modes: do NOT include version-bump, CHANGELOG / changelog, README-row, manifest version-sync, or `~/.pmos/learnings.md` header-bootstrap tasks in any `## Wave N` block. List them under the spec's `## Release prerequisites` section only — `/complete-dev` (Phase 8) is the sole writer of those files per repo norms (see this repo's `CLAUDE.md ## Skill-authoring conventions` for the concrete file list)."* `/plan`'s output is graded by Phase 6a checks `g-release-prereqs-scope` `[J]` and `g-plan-grep-clean` `[D]` — a wave containing any release-prerequisite task fails 6a.

After completion: capture `<feature_folder>/03_plan.{html,md}` (resolve via `_shared/resolve-input.md` `phase=plan`). Append OQ artifact if non-interactive.

On failure: hard-phase failure dialog.

## Phase 6: /execute (hard, NOT in prototype mode)

**In `prototype` mode:** skip wholesale. Log `[orchestrator] prototype mode: Phase 6 /execute skipped (discovery-only pipeline)`.

Run the **compact checkpoint** first — `/execute` is heavy (TDD task-by-task implementation).

Invoke `/pmos-toolkit:execute` with the plan. **`/execute` does not accept `--tier`** — it derives tier from the plan's frontmatter.

**Execution mode (`--subagent-driven`).** Read `execution_mode` from the `03_plan.{html,md}` frontmatter (written by Phase 5's `/plan` execution-mode selection). If it is `subagent-driven`, append `--subagent-driven` to the `/execute` invocation (parallel subagent-driven execution). If it is `inline` or absent (a legacy plan, or `/plan` skipped the prompt), invoke `/execute` without the flag — do not re-prompt; absence means inline. `/execute` itself degrades `--subagent-driven` to inline on platforms with no subagent tool.

In **skill modes**, `/execute` is also the **sole writer of the skill** — it creates/edits the `SKILL.md` at the `skill_location` path resolved in Phase 0d, and any `reference/`/`tools/` files. The Phase 6a reviewer (below) never edits — it scores and reports only (D10). Prepend a line citing `reference/skill-patterns.md` as the implementation reference (the `03_plan` tasks were written against the FRs derived from it in Phase 4 — `/execute` consults the patterns file for the *shape* of the change). `/execute` also honours the **host repo's `CLAUDE.md`** for repo-policy bits that are deliberately NOT in `skill-patterns.md` — the canonical skill path, the manifest version-sync rule, the release-entry rule — see the pointer below.

> **Where the conventions live:** `reference/skill-patterns.md` carries the *generic, repo-agnostic* skill-authoring conventions (frontmatter, description triggering, progressive disclosure, body content, scripts, platform-conditional frontmatter — §A–§F). This repo's **`CLAUDE.md ## Skill-authoring conventions`** carries the *pmos-specific* bits: the canonical `plugins/pmos-toolkit/skills/<name>/SKILL.md` path, the synced `plugin.json` version bump, and `/complete-dev` as the release entry point (FR-62). `/execute` (and the Phase 6a + `/verify` evaluators) must satisfy both.

On resume, `/execute` has its own task-level resume semantics — orchestrator re-invokes fresh and `/execute` detects its own state from the worktree's git history + plan-status markers. Per FR-CHILD-RESUME / spec §15 G2. (In skill modes this also covers re-running for a Phase-6a remediation addendum — `/execute`'s task-level resume picks up only the new `## Eval-remediation — iteration N` tasks.)

Cite `_shared/phase-boundary-handler.md` as the related phase-boundary handshake pattern (used by `/execute` between its internal phases — not reused directly here).

On failure: hard-phase failure dialog.

## Phase 6a: /skill-eval (skill modes only, NOT in prototype mode)

**Runs only when `pipeline_mode ∈ {skill-new, skill-feedback}`** (prototype mode skips Phases 6 and 6a wholesale per `## Prototype-mode phase ordering`) — immediately after Phase 6 (`/execute`), before Phase 7 (`/verify`). Hardness: **hard** — a non-skippable quality gate; "accept residuals as known risk" is a documented exit, not a skip; peer of `/verify`. No compact checkpoint fires before 6a (scoring is light); the checkpoint fires before 6 and before 7 only.

**Iteration bookkeeping (FR-41).** Before iteration `n`, record `state.yaml.phases.skill-eval.skill_eval.iterations[n].pre_ref = HEAD` (a git sha). For `n: 1`, `pre_ref` = HEAD after `/execute` Phase 6 completed. For `n: 2`, `pre_ref` = HEAD before iteration 2's remediation commits land. ("Restore iteration 1" — see FR-47 — `git reset` the skill files only to `iterations[2].pre_ref`.)

**Scoring (one iteration):**

1. **Deterministic half (FR-42).** Run `feature-sdlc/tools/skill-eval-check.sh --target <target_platform> <skill_dir>` (the platform resolved in Phase 0d; `<skill_dir>` the location from Phase 0d). It emits a TSV of `check_id\tverdict\tevidence` for the `[D]` checks and exits 0 (all pass) / 1 (≥1 fail) / 2 (script error). On exit 2 — or no bash, or a missing coreutils dep — the `[D]` checks **fall back to LLM-judge** with the logged note `skill-eval-check.sh unavailable (<reason>); <N> deterministic checks fell back to LLM-judge` — never silently skipped (E7).
2. **LLM-judge half (FR-43).** Dispatch a reviewer subagent with: the raw `SKILL.md` text; the raw content of each `reference/` file (path-labelled); and the `[J]` check list from `reference/skill-eval.md` (each: `check_id`, the rule text, the *why*, the *how-to-verify*, the pass-condition). The reviewer **makes no edits** (D10 — `/execute` is the only writer). It runs at `temperature: 0` and returns a JSON array — one object per check, **exactly** the given `check_id` set: `{check_id, verdict: 'pass'|'fail', fix_note: '<concrete edit; required & non-empty on fail>', quote: '<≥40-char verbatim substring of the file the check is about; required>'}`. A `fail` whose `quote` is empty or not a verbatim substring of the named file is **treated as `pass`** (FR-43).
3. **Orchestrator-side validation (FR-44 — the reviewer does NOT self-validate).** (a) The returned `check_id` set must equal the `[J]` set declared in `skill-eval.md` — any miss/extra → hard-fail `reviewer returned check_ids that do not match skill-eval.md: missing=[…], extra=[…]`. (b) Substring-grep every `quote` against the actual file it names — any miss → hard-fail `reviewer quote not found in <file>: <quote-prefix-30char>…`. On any hard-fail, pause with the soft-phase failure dialog (E17).
4. **Compose the iteration result.** `checks_failed(n)` = the union of failed `[D]` verdicts and failed (validated) `[J]` verdicts. Log `skill-eval iteration N: <p> passed, <f> failed [<ids>]` (NFR-07). Record `iterations[n].{checks_failed, result}`.

**Remediation loop (FR-45, FR-46).**

- If `checks_failed(n)` is empty → 6a completes: `iterations[n].result = pass`, `accepted_residuals[]` stays empty (FR-49). Proceed to Phase 7.
- Else if iteration count `< 2` → append a `## Eval-remediation — iteration N` task group to `03_plan.{html,md}` — one task per failed check: the `fix_note`, the `quote`, and for `[D]` checks the exact `skill-eval-check.sh` re-run command. Bump the plan's task-status marker. Record `iterations[N].{addendum_task_ids, pre_ref=HEAD}`. Re-invoke Phase 6 `/execute` (its task-level resume picks up only the new tasks — E20), then re-score (next iteration).
- **Net-worse guard (FR-45):** iteration N is *net-worse* than N−1 if `|checks_failed(N)| > |checks_failed(N−1)|` **OR** `checks_failed(N)` contains a check that passed in N−1. If iteration 2 is net-worse than iteration 1, the post-cap dialog below gains a **Restore iteration 1** option (`git reset` the skill files only to `iterations[2].pre_ref` — E13).

**Cap = 2 remediation iterations (FR-47).** After iteration 2 (or sooner if all pass), if checks still fail:
<!-- defer-only: ambiguous -->
`AskUserQuestion` — **Accept residuals as known risk** (→ append to `accepted_residuals[]` with `{check_id, fix_note, acked_at}`; handed to `/verify` as known — FR-48) / **Iterate manually** (user edits the skill, re-run Phase 6a) / **Restore iteration 1** (only offered if iteration 2 was net-worse) / **Abort** — no silent pass (G15).

**Control flow (§6.2, paraphrased):**
```
/execute (Phase 6) done ──► iter 1: score = [D] check + [J] reviewer
                                │
                       all pass ─┴─ some fail
                          │            │
                          ▼            ▼  (iter count < 2?)
                      Phase 7      yes ─┴─ no
                                    │        │
                       append "Eval-remediation — iter N" tasks    user prompt:
                       to 03_plan, re-run /execute, re-score        Accept residuals / Iterate manually
                                    │                               / Restore iter 1 (if net-worse) / Abort
                                    └──────────┐                          │
                                          (next iter)            Accept ─┴─ Abort
                                                                    │
                                                                    ▼
                                                          accepted_residuals[] → Phase 7
```

On failure (reviewer-validation hard-fail, `/execute` re-run failure, etc.): soft-phase failure dialog from `reference/failure-dialog.md`.

## Phase 7: /verify (hard, non-skippable in feature/skill modes; NOT in prototype mode)

**In `prototype` mode:** skip wholesale. The "non-skippable" rule is scoped to feature/skill modes where the pipeline ships code; prototype mode produces no shippable code (no /execute ran), so /verify has nothing to verify. Log `[orchestrator] prototype mode: Phase 7 /verify skipped (discovery-only pipeline; nothing implemented)`.

Run the **compact checkpoint** first — `/verify` is heavy (multi-agent code review + interactive QA + spec compliance grading).

Invoke `/pmos-toolkit:verify` with the spec path. **`/verify` is non-skippable per the pipeline contract — no Skip option, ever, in any mode** (Anti-pattern #10 in spec §12; mirrored below) (FR-52).

**In skill modes**, prepend a line directing `/verify` to additionally:

- **Re-run `reference/skill-eval.md` fresh** (which scores the skill against `reference/skill-patterns.md §A–§F` — re-run `feature-sdlc/tools/skill-eval-check.sh` for the `[D]` half + a fresh reviewer pass for the `[J]` half — a final idempotent gate, independent of Phase 6a's run) and **reconcile against `state.yaml.phases.skill-eval.skill_eval.accepted_residuals[]`** (FR-50):
  - a residual that is *still failing* → report as `KNOWN / accepted in Phase 6a` — **non-blocking, but surfaced loudly** in the `/verify` report **and** carried into the `/complete-dev` summary;
  - a check that is *newly failing* (not in `accepted_residuals[]`) → **blocks normally**, like any other `/verify` failure;
  - a check that was *previously accepted but now passes* → dropped from the residual set (update `state.yaml`).
- **Best-effort grade the detectable host-repo release prereqs (FR-51), gracefully degrading** if a thing isn't present: manifest version-sync (only if two `plugin.json` manifests exist), a README row for the new/edited skill, changelog presence. These are surfaced as findings in the `/verify` report, not hard blocks (the release-prereq enforcement lives in `/complete-dev`).

`/verify` does not accept `--tier`.

On failure: hard-phase failure dialog (Retry / Pause / Abort — no Skip).

## Phase 8: /complete-dev (hard, NOT in prototype mode)

**In `prototype` mode:** skip wholesale. The discovery branch is left unmerged for the user to extend (`state.yaml.pipeline_mode` → `feature` + `--resume`) or discard. Log `[orchestrator] prototype mode: Phase 8 /complete-dev skipped (discovery-only pipeline; nothing to ship)`.

Invoke `/pmos-toolkit:complete-dev` to merge, capture learnings into CLAUDE.md/AGENTS.md, regenerate changelog, bump versions, deploy per repo norms, tag release, and push to all remotes.

`/complete-dev` does not accept `--tier`.

On failure: hard-phase failure dialog.

## Phase 8a: /reflect gate (soft, Recommended=Skip; NOT in prototype mode)

**In `prototype` mode:** skip wholesale (no merge/release happened; nothing to retro). Log `[orchestrator] prototype mode: Phase 8a /reflect skipped (discovery-only pipeline)`.

After `/complete-dev` lands the release, surface an optional retro gate. The default is Skip — most users ship and move on; retro is opt-in for sessions that surfaced patterns worth analyzing across this and prior runs.

`AskUserQuestion`:
```
question: "Run /reflect to capture cross-session learnings before closing the pipeline?"
options:
  - Skip (Recommended)
    description: Pipeline complete; close out without retro.
  - Run /reflect
    description: Single-session retro on the just-finished /feature-sdlc run.
  - Run /reflect --last 5
    description: Multi-session retro across the last 5 transcripts (recurring patterns + unique findings).
  - Defer
    description: Log to OQ index; user runs /reflect later.
```

**Auto-skip if `_minimal_active` is true** per Phase 0 `--minimal` directive. Log `[orchestrator] phase_minimal_skip: retro` to chat and proceed to Phase 9 final-summary without issuing the gate prompt.

**Short-circuit when Phase 0e confirmed (W3):** apply `soft_gate_defaults.retro` — `skip` → proceed; `run` → `/reflect`; `run-last-5` → `/reflect --last 5`; `defer` → OQ stub. Log `[orchestrator] phase 8a retro: auto-<value> via Phase 0e`. Skip the prompt above.

On Run: invoke `/pmos-utilities:reflect` with the appropriate flags (the `/reflect` skill lives in `pmos-utilities`). The retro phase entry in `state.yaml.phases.retro` is initialized by Phase 1 fresh-init (per `reference/state-schema.md`). On Defer: append a stub entry to `state.yaml.open_questions_log[]` so /feature-sdlc Phase 9 surfaces the deferral.

On missing-skill: soft-variant missing-skill dialog from `reference/failure-dialog.md`. Skip option is the Recommended default.

## Phase 9: Final summary

**Folded-phase failure surfacing (FR-29, FR-52, D17, D34, T12b):** read every `state.yaml.phases.<x>.folded_phase_failures[]`. If any non-empty across all phases: emit a `## Folded-phase failures (N)` subsection per `reference/pipeline-status-template.md` (T3 deliverable) BEFORE the OQ index, where N is the total count across all phases. Format per spec §11.3: `[<phase>] <folded-skill> crashed: <error_excerpt> (ts: <ts>)` — one line per failure entry. If all `folded_phase_failures[]` arrays are empty: omit the subsection entirely (no decoration, no "_(none)_").

Print the full pipeline-status table from `00_pipeline.html`, plus:

- Branch + tag info from `/complete-dev` output.
- Links to every artifact (`01_requirements.{html,md}`, `02_spec.{html,md}`, `03_plan.{html,md}`, plus, in `skill-feedback` mode, `0c_feedback_triage.{html,md}`, plus — when Phase 1a ran — `00d_ideate.{html,md}` and (when Tier-3 chained) `00d-grill_ideate.{html,md}`, plus child-skill sidecars). Use the resolver substrate (or `<feature_folder>/index.html`'s inlined manifest) to find each artifact's actual on-disk extension.
- If `state.yaml.open_questions_log[]` is non-empty: write `<feature_folder>/00_open_questions_index.html` with one section per logged child skill (path + deferred count) per FR-OQ-INDEX / spec §15 G4. Apply the same write-phase rules as `00_pipeline.html` (atomic write, asset prefix `assets/`, cache-bust, heading IDs, no `sections.json` companion per runbook edge case row 3, index regen). Link to the HTML primary in the chat summary.
  > See "Apply comment-resolver edit" for the required `<meta name="pmos:skill">` bake.
- **Write soft-gate lastrun (W3).** Atomically write `.pmos/feature-sdlc.lastrun.yaml` at `<main-repo-root>` (resolved via git per `reference/soft-gate-lastrun-schema.md` § Path — not the worktree cwd) per that file's § "Write contract": record each gate's resolved disposition this run (from a Phase 0e confirm/edit OR an individual gate fire) plus `detected_signals.frontend` (the Phase 3b heuristic class, or `unknown` if 3b never ran). temp-then-rename; on failure log `lastrun write failed: <error>; next run will use per-gate prompts` and continue (the pipeline already shipped). Reaching Phase 9 means the run completed — a failed/aborted/paused run never writes lastrun.
- Final one-liner: `Pipeline complete for <slug>. Branch feat/<slug> merged to main and tagged via /complete-dev.`

**In `prototype` mode (FR-PSDLC-08):** the summary block above is replaced with the discovery-mode variant:

- **No branch + tag info** — no `/complete-dev` ran.
- **Artifact list:** `01_requirements.{html,md}`, `02_spec.{html,md}` (written in prototype mode at the post-3a slot per `## Prototype-mode phase ordering`), `03_wireframes.{html,md}` (from `/wireframes`), `04_prototype.{html,md}` (from `/prototype`), plus the `grills/` subdir (if Phase 2a ran) and (if Phase 1a ran) `00d_ideate.{html,md}`. No `03_plan.*`, no `/execute`/`/verify`/`/complete-dev` artifacts.
- **OQ index:** same rules as above when `state.yaml.open_questions_log[]` is non-empty.
- **No soft-gate lastrun write** — prototype mode's wireframes/prototype are hard (not gated), so writing would memorialise non-choices (per `reference/soft-gate-lastrun-schema.md` § "Write contract").
- **Final one-liner:** `Prototype-mode pipeline complete for <slug>. Branch feat/<slug> contains the discovery artifacts; not merged. To extend to full implementation: cd into the worktree, edit state.yaml.pipeline_mode from 'prototype' to 'feature', then run /feature-sdlc --resume. To discard: git worktree remove <path>.`

## Phase 10: Capture Learnings

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing about `/feature-sdlc` itself — gate prompts that misfired, resume-state edges, child-skill missing-dialog mistakes, places `--tier` propagation got confused, paused-state recovery friction. Proposing zero learnings is a valid outcome; the gate is that the reflection happens, not that an entry is written.

## Release prerequisites

(Surfaced here per Convention 13 + FR-94 / spec §7.11 so the next `/complete-dev` is not surprising. `/complete-dev` is the canonical release skill — not the legacy `/push`.)

- **README** — add a `/skill-sdlc` row under "Pipeline orchestrators"; update the `/feature-sdlc` row + the bottom standalone line + the pipeline-flow note to mention the `skill` subcommand; **remove** the `/update-skills` row from "Pipeline orchestrators" and the `/create-skill` row from "Utilities" (both are archived — point at `archive/skills/README.md`).
- **Both `plugin.json` manifests** — a **minor** version bump (bump *type* only — `/complete-dev` Phase 9 computes the from/to numbers against current `main` at merge time per `reference/skill-patterns.md §G #4`) in BOTH `plugins/pmos-toolkit/.claude-plugin/plugin.json` and `plugins/pmos-toolkit/.codex-plugin/plugin.json`, in one commit, versions kept in sync (pre-push hook enforces). The manifests carry **no per-command description fields**, so FR-95's "byte-identical description" requirement is satisfied vacuously — the `SKILL.md` frontmatter `description` is the single source of truth. (If a future manifest format adds per-command descriptions, mirror this frontmatter — decision P5.)
- **`argument-hint` frontmatter** enumerates every parsed token/flag (FR-06): `skill`, `--from-feedback`, `--from-reflect`, `--tier`, `--resume`, `--no-worktree`, `--no-ideate`, `--format`, `--non-interactive`, `--interactive`, `--backlog`, `--minimal`, `list`.
- **`description` frontmatter** carries ≥5 user-spoken trigger phrases spanning both modes (FR-RELEASE.ii / FR-95): "build this feature end-to-end", "run the full SDLC", "take this idea through to ship", "feature-sdlc this", "/feature-sdlc", "drive the pipeline for me", plus the skill-authoring ones — "create a skill", "author a new skill", "build me a slash command", "turn this workflow into a skill", "apply this retro feedback to the skill", "process this skill feedback end-to-end", plus the fuzzy-idea ones (2.52.0) — "I have a half-formed idea", "this is a rough idea", "I want to brainstorm this end-to-end".
- **`archive/skills/`** — `archive/skills/create-skill/` and `archive/skills/update-skills/` exist (the two old skills, moved verbatim via `git mv`), with an `archive/skills/README.md` explaining the merge. `ls plugins/pmos-toolkit/skills/` shows **neither** `create-skill` nor `update-skills`, but **does** show `skill-sdlc`.
- **`CLAUDE.md`** — gains a `## Skill-authoring conventions` section (the pmos-specific bits: canonical `plugins/pmos-toolkit/skills/<name>/SKILL.md` path, synced `plugin.json` bump, `/complete-dev` as release entry — the generic conventions live in `reference/skill-patterns.md`).
- **Learnings header bootstrap** — add a `## /feature-sdlc` section header to `~/.pmos/learnings.md` (idempotent — only append if missing). **No separate `## /skill-sdlc` header** — the alias rides on `/feature-sdlc`'s learnings (D19 / FR-81).
- No new schema files outside this skill's own `reference/state-schema.md`. No `plugin.json` `skills`-array changes (skills auto-discovered from directory).

## Anti-Patterns (DO NOT)

1. **Triggering `/compact` from the skill.** The harness does not allow it. Surface a checkpoint, write `paused-resumable` state if the user picks Pause, and exit cleanly. Pretending it auto-compacts is a lie that breaks the resume contract.
2. **Skipping the worktree step "because the user knows what they're doing".** Worktree is mandatory unless `--no-worktree` is explicitly passed. Auto-skipping when the user is already on a branch loses isolation and corrupts the resume state file's location semantics. The four worktree edge cases (a) not-a-repo, (b) detached HEAD, (c) dirty tree, (d) branch already exists — all handled in Phase 0a — are non-bypassable; do not auto-stash, auto-rename, or auto-delete to make them go away.
3. **Dispatching child skills with a "see the state file" prompt.** Each child gets a self-contained brief (initial context for `/requirements`; full requirements doc path for `/spec`; etc.). Child skills must not reach into `state.yaml` — that file is the orchestrator's private state.
4. **Auto-running optional stages without the gate.** `/creativity`, `/wireframes`, `/prototype` each have an explicit interactive gate prompt. Recommended-default is fine; silent run is not. (`/msf-req` and `/simulate-spec` no longer have orchestrator gates — they are folded inside `/requirements` Phase 5a and `/spec` Phase 6a respectively, default-on at Tier 3.) Note: `--minimal`-driven Skip on the four soft gates (creativity, wireframes, prototype, retro) is user-explicit and does not violate this rule — see the `_minimal_active` directive. Likewise, skill-mode's **non-presentation** of Phases 3b/3c (a skill has no UI), and the fact that Phase 0c runs only in `skill-feedback` and Phases 0d/6a only in skill modes, are **mode-conditional by-design omissions** keyed off `pipeline_mode` — not silent skips of presented gates.
5. **Frontend-detection by LLM gut-feel.** Use `reference/frontend-detection.md` heuristics deterministically; surface uncertainty via a structured prompt rather than guessing. The gate is always presented (FR-FRONTEND-GATE).
6. **Forgetting to update `state.yaml` after a child-skill completion.** Every phase end must atomically (a) update `state.yaml`, (b) regenerate `00_pipeline.html`, (c) print the in-chat status table. Skipping any of these breaks resume.
7. **Treating `--non-interactive` as "skip /grill silently".** The skill must log `phase: grill / status: skipped-non-interactive / reason: --non-interactive flag` so the user knows what was skipped on review.
8. **Resuming from a state file with stale artifact paths.** On resume (Phase 0b), validate every recorded artifact path still exists; if any required artifact is missing, surface to user before continuing — do not re-invoke a phase silently.
9. **Conflating `--tier` override with per-child auto-tiering.** `--tier` sets the orchestrator's expected scope (drives gates) AND is passed to children that accept it (`/requirements`, `/spec`, `/plan`). Children may auto-tier-escalate; log divergence in `child_tier_divergence` rather than overriding.
10. **Skipping `/verify` because `/execute` looked clean.** Non-skippable per pipeline contract; no opt-out at any tier — and in skill modes, neither is **Phase 6a `/skill-eval`** (peer of `/verify`).
11. **Letting the Phase 6a reviewer make edits.** The reviewer **scores and reports only** — `/execute` (Phase 6) is the sole writer of the skill (D10). A reviewer that "fixes while reviewing" makes the eval result unreproducible and the writer/reviewer separation meaningless.
12. **Treating Phase 6a's "accept residuals as known risk" as a silent pass.** Residuals are recorded in `state.yaml.phases.skill-eval.skill_eval.accepted_residuals[]`, re-checked by `/verify`, and surfaced loudly in both the `/verify` report and the `/complete-dev` summary. Accepting a residual is a logged decision, not a way to make the gate go away. And do not exceed the 2-iteration remediation cap — past it, the only exits are accept / iterate-manually / restore-iteration-1 / abort.
13. **Inferring the run mode from the seed text.** `pipeline_mode` comes from the explicit `skill` subcommand (FR-02), never from sniffing whether the idea "sounds like a skill". A bare `/feature-sdlc <text>` is always `feature` mode, even if the text describes a skill.
14. **Skipping the Phase 1a `/ideate` gate without running the fuzzy-detect classifier first.** `reference/fuzzy-idea-detection.md` runs deterministically on every feature / skill-new run (unless `--no-ideate`). `skipped-formed` is allowed only because the classifier ran; the presented gate (`seed_shape: fuzzy`) is non-bypassable interactive, defers per canonical block non-interactive. Tier-3 grill-chain (Step 4) is similarly deterministic — disjunctive heuristic OR `--tier 3`; no LLM gut-feel.

---

## Apply comment-resolver edit (FR-22, FR-30, FR-62)

This phase is the `/feature-sdlc` orchestrator entrypoint that `/comments resolve` (T10) dispatches into when walking open threads in either orchestrator artifact's `.comments.json` sidecar. The contract — input/output JSON shapes, closed `error_enum` set, idempotency rules, subagent invocation convention — lives in the shared contract doc and is the single source of truth:

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md` (T6).

Per [NFR-08](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#nfr-h), this phase MUST cite that file rather than restate the contract. Anything below is `/feature-sdlc`-specific implementation guidance only.

### Two orchestrator surfaces (FR-62)

`/feature-sdlc` emits TWO HTML artifacts that are comment-enabled. The apply-edit shim differentiates by `artifact_path` basename:

| Artifact | Basename | Edit rules |
|---|---|---|
| Pipeline status table | `00_pipeline.html` | Table-row prose edits ARE feasible. Structural schema changes (add/remove columns, reorder rows, restructure table) return `agent_judged_infeasible` with `system_reply: "Pipeline status table is generated by /feature-sdlc state.yaml — edit state.yaml or re-run /feature-sdlc"`. |
| Open questions index | `00_open_questions_index.html` | Per-OQ note prose edits ARE feasible. Structural changes (reorder sections, restructure OQ groupings) return `agent_judged_infeasible` with a message directing the user to re-run `/feature-sdlc`. |

**Comments meta tag (FR-01, FR-40):** BOTH artifacts MUST carry `<meta name="pmos:skill" content="feature-sdlc">` in the `<head>`. Set this when writing each artifact at Phase 1 step 2 (`00_pipeline.html`) and Phase 9 (`00_open_questions_index.html`). The `/comments` resolver routes apply-edit dispatches via this tag, so it MUST be set byte-exact.

**Asset substrate (FR-40):** when writing either artifact, include `comments.js`, `comments.css`, and the launcher trio (`comments-open.command`, `comments-open.sh`, `comments-open.bat`) in the feature folder's `assets/` directory alongside the rest of the HTML substrate assets. Copy from `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/` using `cp -n` (idempotent). The existing asset copy at Phase 1 step 2 covers both artifacts since they share the same `assets/` prefix.

### When invoked

The resolver dispatches a subagent with the §9.1 input JSON. The subagent's tools include this skill's Node shim:

- **Shim:** `plugins/pmos-toolkit/skills/feature-sdlc/scripts/apply-edit-at-anchor.js` — ONE entrypoint, differentiates by `artifact_path` basename. Exports `apply(input)`, returns one of the three output shapes (success / failure / clarification) per §9.1.

### Resolution order

1. **id-first.** Locate `id="<id>"` in the artifact HTML. Match → success path, `strategy: "id-first"`, `score: 1.0`.
2. **quote-fallback.** Otherwise (or on id miss), substring-contains match `anchor.quote_anchor.text` (≥40 chars) against the candidate's text content. First exact substring hit wins.
3. **Neither hits** → emit `{ success: false, error_enum: "anchor_orphaned" }`; do NOT mutate the artifact.

### Tests

- Orchestrator contract: `plugins/pmos-toolkit/skills/feature-sdlc/tests/apply-edit-at-anchor.test.js` (10 cases: pipeline:5 + oq-index:5).
- Wrapper: `tests/scripts/assert_apply_edit_at_anchor_feature-sdlc.sh`.
