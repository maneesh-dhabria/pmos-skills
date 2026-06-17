# `state.yaml` schema (`/feature-sdlc`)

Single source of truth for the resumable pipeline state file written at `<worktree>/.pmos/feature-sdlc/state.yaml`. SKILL.md prose cites this document rather than redeclaring fields. Companion: `pipeline-status-template.md` (the rendered Markdown view of this same data).

---

## schema_version

`schema_version: 7` is the current version (added with the gated Phase-1 `/shape` problem-shaping front — the `shape` phase is inserted before `ideate` in the feature / skill-new / prototype phase sets; the bump is a cohort marker, and pre-v7 resume states that lack the `shape` entry skip it by absence — see "Back-compat for pre-v7 state files" below). `schema_version: 6` added the three-loop backlog `/feature-sdlc define` and `build` modes — `pipeline_mode ∈ {define, build}` valid values; phases[] gains a define-mode and a build-mode entry set; `epic_id` and `story_id` top-level pointers. Older files are auto-migrated on read, in order, through the chain `v1 → v2 → v3 → v4 → v5 → v6 → v7` (each step additive/idempotent — see the per-version "auto-migration block" sections below). Files written by /feature-sdlc < 2.34.0 carry `schema_version: 1`; files from the 2.34.0–2.37.x cohort carry `2` or `3`; files from the 2.38.0+ cohort carry `4`; the prototype cohort carries `5`; the three-loop-backlog cohort carries `6`.

**Migration policy**:

- `state.schema_version > current code's max supported` (i.e., `> 7`) → abort with: `state file from newer /feature-sdlc version (vN); upgrade pmos-toolkit and retry`.
- `state.schema_version < current code's max` → run each migration step in version order; each is additive (default-fill new fields, never remove/rename/reshape) and idempotent; log every step to chat as `migration: state.schema vM → vN (added: <fields>)`. The pre-2.34.0 phase-id elision (`msf-req`/`simulate-spec` dropped on read — see the note under the phase-id table below, and `SKILL.md#resume` step 2) runs *before* the v4 step.
- Same version → no migration.

Pipeline runs are short-lived (days, not years) so destructive migrations are not anticipated; if ever needed, bump the major schema number and refuse-not-migrate from that boundary.

---

## Top-level fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema_version` | int | yes | `1` in v1 … `7` in v7 (the current version). |
| `slug` | string | yes | LLM-derived kebab-case identifier (per `slug-derivation.md`). |
| `pipeline_mode` | string | yes (v4+) | `feature`, `skill-new`, `skill-feedback`, `prototype` (v5), `define`, or `build` (v6 — the three-loop backlog loops). Resolved by the Phase 0 subcommand dispatch. **Distinct from `mode`** — the naming-collision resolution: `mode` keeps its `interactive`/`non-interactive` meaning; `pipeline_mode` is the run-kind selector. Drives the mode-conditional `phases[]` membership (below). Defaults to `feature` when reading a v1–v3 file. |
| `epic_id` | string \| null | v6, define/build only | The backlog epic id this run defines (define mode) or whose story it builds (build mode). `null` in other modes. |
| `story_id` | string \| null | v6, build only | The backlog story id this build iteration claimed. `null` until Phase `pick`/`claim` set it; `null` in non-build modes. |
| `tier` | int (1\|2\|3) \| null | yes | Set when known: `--tier` flag, or — in skill modes — Phase 0d `/skill-tier-resolve`, or — otherwise — after `/requirements` auto-tier. `null` until then. |
| `mode` | string | yes | `interactive` or `non-interactive`. Resolved per the canonical non-interactive block at Phase 0. (Untouched by v4 — see `pipeline_mode` above for the run-kind selector.) |
| `started_at` | string (ISO-8601) | yes | First creation timestamp. Never updated. |
| `last_updated` | string (ISO-8601) | yes | Updated on every status change. |
| `current_phase` | string | yes | The phase id currently being executed or the most recent paused/failed one. Matches one of the `phases[].id` values below. |
| `worktree_path` | string (abs path) \| null | yes | Absolute path of the worktree directory. `null` only when `--no-worktree` was passed. |
| `branch` | string \| null | yes | Branch name (typically `feat/<slug>`). `null` only when `--no-worktree`. |
| `base` | string \| null | no | Base branch the worktree forked from (typically `main`). Captured at Phase 0a Step 2.5 from the cwd's current branch; `null` when not resolved or `--no-worktree`. Used by Phase 0b origin-moved check. |
| `remote` | string \| null | no | Tracking remote for `base` (e.g. `origin`). Captured at Phase 0a Step 2.5 from `<base>@{upstream}`; `null` when `base` has no upstream. Pairs with `base`. |
| `base_drift` | object \| null | no | Recorded when local base is behind remote at branch time, or when origin advances after the worktree is created. Shape: `{ behind: <int>, fetched_at: <ISO-8601>, remote: <string>, base: <string>, remote_sha: <short-sha>, local_sha: <short-sha> }`. Absent / `null` when no drift observed. Informational record only — kept for the run's audit trail; no other skill reads it. |
| `feature_folder` | string (abs path) | yes | Resolved per `_shared/pipeline-setup.md` Section A — `<docs_path>/features/<YYYY-MM-DD>_<slug>/`. Child skills' artifacts land here. |
| `phases` | list | yes | One entry per pipeline phase, in declared order — **membership is mode-conditional** (per `pipeline_mode`; see "Mode-conditional `phases[]` membership (v4)" below). See entry shape below. |
| `open_questions_log` | list | yes | Initialized `[]`. Appended to in `--non-interactive` mode after each child phase. See entry shape below. |

---

## `phases[]` entries

Every entry has at minimum:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Phase identifier — one of the values listed under "Phase identifiers + hardness" below. |
| `hardness` | string | `hard`, `soft`, or `infra`. Drives failure-dialog construction (see `failure-dialog.md`). |
| `status` | string | One of the values listed under "Status enum" below. |
| `artifact_path` | string (rel path) \| null | Path of the canonical artifact this phase produced (relative to `feature_folder`). `null` when no artifact (e.g., phase `setup`, phase `compact-checkpoint`). |
| `started_at` | string (ISO-8601) \| null | When `status` first became `in_progress`. |
| `completed_at` | string (ISO-8601) \| null | When `status` became `completed`. |
| `paused_at` | string (ISO-8601) \| null | When `status` became `paused`. |
| `paused_reason` | string \| null | Why paused. See enum below. |
| `last_error` | string \| null | One-line error captured on failure-pause. |
| `child_tier` | int \| null | Child-skill auto-tier when it differs from the orchestrator tier. |
| `child_tier_divergence` | string \| null | Free-form note when child reports a different tier. |
| `missing_skill` | string \| null | Set when `paused_reason: missing_skill` — names the missing child skill. |
| `folded_phase_failures` | list | (v2) Append-only list of folded-skill failure records — `{folded_skill, error_excerpt, ts}`. Empty `[]` until a folded child crashes. See "Schema v2" below for dedup rule. |
| `feedback_source` | string \| null | (v4) On the `feedback-triage` entry only — the resolved feedback input: a file path, `<inline-text>`, or `--from-reflect:<artifact>`. |
| `target_skills` | list \| null | (v4) On the `feedback-triage` entry only — the in-scope skill names the triage produced approved changes for. |
| `resolved_tier` / `skill_location` / `target_platform` | int / string / string \| null | (v4) On the `skill-tier-resolve` entry only — the three values that phase resolves (tier; the skill's on-disk location; `claude-code`/`codex`/`generic`). |
| `per_skill_tiers` | object \| null | (v4) On the `skill-tier-resolve` entry, skill-feedback only — `{<skill-name>: <tier-int>}`; the run `tier` is the max. |
| `skill_eval` | object \| null | (v4) On the `skill-eval` entry only — the eval-iteration substructure (see "`skill_eval` substructure (v4)" below). |

### Phase identifiers + hardness

In declared execution order. Membership is mode-conditional (see below); a `—` in the column means the phase is absent from that mode's `phases[]`.

| id | hardness | feature | skill-new | skill-feedback | prototype | notes |
|---|---|---|---|---|---|---|
| `setup` | infra | ✓ | ✓ | ✓ | ✓ | always run; no failure dialog beyond pipeline-setup's own |
| `worktree` | infra | ✓ | ✓ | ✓ | ✓ | worktree creation; G7 dialog inline |
| `init-state` | infra | ✓ | ✓ | ✓ | ✓ | write state.yaml + 00_pipeline.{html,md} |
| `feedback-triage` | **hard** | — | — | ✓ | — | **new in v4.** Only clean exit is "no actionable findings / no in-scope skills"; the approval gate is mandatory → hard. |
| `skill-tier-resolve` | **infra** | — | ✓ | ✓ | — | **new in v4.** A setup/detection phase like `worktree`/`init-state`. |
| `shape` | **soft (tier-gated: auto-skip Tier 1 / hard Tier 2+)** | ✓ | ✓ | — | ✓ | **new in v7.** The gated Phase-1 problem-shaping front (`/shape`), inserted **before** `ideate`. D9 tiering: explicit `--tier 1` → `skipped-tier1`; Tier 2 / Tier 3 / new-bet / unresolved-conservative-3 → **mandatory** (no user skip prompt). Under `--non-interactive` the mandatory gate routes to `/shape`'s autonomous best-effort path (D10 — no deadlock, no hard-refuse). Always available standalone. Omitted in `skill-feedback` (the per-skill triage doc is already a converged problem frame). |
| `ideate` | **soft** | ✓ | ✓ | — | ✓ | **new in v4.1 (2.52.0).** Auto-detects fuzzy-vs-formed seed via `reference/fuzzy-idea-detection.md`; on formed → silent skip with log line; on fuzzy → AskUserQuestion. Consumes a present `shape` brief's frame instead of re-deriving it (`/ideate` `--from-shape`). Tier-3 brief auto-chains `/grill --depth deep`. Mode-conditional non-presentation in `skill-feedback` (the seed is already a structured per-skill finding set). |
| `requirements` | hard | ✓ | ✓ | ✓ | ✓ | Skip HIDDEN in failure dialog |
| `grill` | soft | ✓ | ✓ | ✓ | ✓ | Skip SHOWN; auto-skipped in `--non-interactive` |
| `creativity` | soft | ✓ | ✓ | ✓ | ✓ | gate, Recommended=Skip |
| `wireframes` | soft / **hard in prototype** | ✓ | — | — | ✓ | feature mode soft (gate); prototype mode hard (no gate, always-run — the deliverable). |
| `prototype` | soft / **hard in prototype** | ✓ | — | — | ✓ | feature mode soft (gate); prototype mode hard (no gate, always-run — the deliverable). |
| `spec` | hard | ✓ | ✓ | ✓ | ✓ | in prototype mode, runs **before** `wireframes`/`prototype` (post-3a). |
| `plan` | hard | ✓ | ✓ | ✓ | — | not in prototype mode |
| `execute` | hard | ✓ | ✓ | ✓ | — | not in prototype mode |
| `skill-eval` | **hard** | — | ✓ | ✓ | — | **new in v4.** A non-skippable quality gate; "accept residuals as known risk" is a documented exit, not a skip; peer of `verify`. |
| `verify` | hard | ✓ | ✓ | ✓ | — | non-skippable in feature/skill modes; not in prototype mode (nothing implemented to verify) |
| `complete-dev` | hard | ✓ | ✓ | ✓ | — | not in prototype mode (nothing to ship) |
| `retro` | soft | ✓ | ✓ | ✓ | — | gate, Recommended=Skip; not in prototype mode (no merge happened) |
| `final-summary` | infra | ✓ | ✓ | ✓ | ✓ | prototype-mode variant per SKILL.md Phase 9 |
| `capture-learnings` | infra | ✓ | ✓ | ✓ | ✓ | |

(The removed `msf-req` and `simulate-spec` phase ids — present in pre-2.34.0 state files — are elided on read before the v4 migration step; they are not in any mode's fresh-init `phases[]`.)

#### Mode-conditional `phases[]` membership (v4)

At fresh init (`/feature-sdlc` Phase 1), `phases[]` is built per `pipeline_mode`:

- **`feature`** — the v7 set (with `shape` then `ideate` inserted after `init-state`):
  `setup, worktree, init-state, shape, ideate, requirements, grill, creativity, wireframes, prototype, spec, plan, execute, verify, complete-dev, retro, final-summary, capture-learnings`.
- **`skill-new`** — feature **minus** `{wireframes, prototype}` **plus** `{skill-tier-resolve, skill-eval}`; `shape` then `ideate` sit between `skill-tier-resolve` and `requirements`:
  `setup, worktree, init-state, skill-tier-resolve, shape, ideate, requirements, grill, creativity, spec, plan, execute, skill-eval, verify, complete-dev, retro, final-summary, capture-learnings`.
- **`skill-feedback`** — the `skill-new` set **plus** `{feedback-triage}` inserted **after `init-state`** (before `skill-tier-resolve`), and both `shape` and `ideate` **omitted** (the per-skill triage doc is already a converged, structured seed; nothing to shape or flesh out):
  `setup, worktree, init-state, feedback-triage, skill-tier-resolve, requirements, grill, creativity, spec, plan, execute, skill-eval, verify, complete-dev, retro, final-summary, capture-learnings`.
- **`prototype`** (new in v5) — discovery-half only; declared in *execution* order (the Phase 0b resume cursor walks `phases[]` in order so this matches the SKILL.md `## Prototype-mode phase ordering`); `shape` then `ideate` lead; `/spec` sits between `creativity` and `wireframes`; `plan`/`execute`/`skill-eval`/`verify`/`complete-dev`/`retro` are all omitted; `final-summary` is the prototype-mode variant:
  `setup, worktree, init-state, shape, ideate, requirements, grill, creativity, spec, wireframes, prototype, final-summary, capture-learnings`.
- **`define`** (new in v6 — Loop 1) — epic-level discovery + story split + per-story plan + docs-only merge (SKILL.md `#define-mode`); declared in execution order; `worktree` is the `define/<epic>` branch; `ideate` may auto-skip on an attached brief (D28); `wireframes`/`prototype`/`creativity` stay tier-gated; new phase ids `resolve-epic` (infra), `story-split` (hard), `definition-merge` (hard); `execute`/`verify`/`complete-dev`/`skill-eval`/`retro` omitted (no code ships in Loop 1). **`route: feature|lite`** (default):
  `setup, worktree, init-state, resolve-epic, ideate, requirements, grill, creativity, wireframes, prototype, spec, story-split, plan, definition-merge, final-summary, capture-learnings`.
  **`route: skill`** (G2/G3/G7, SKILL.md `#define-route-skill`) — `spec` is replaced by a `design-build` phase (hard — adopt the design-doc seed, or synthesize `02_design.html` from the triage / `skill-new` requirements); `feedback-triage` (hard) is present when the source is raw feedback; `wireframes`/`prototype`/`creativity` are omitted (skills have no UI); `requirements` runs only for the `skill-new` sub-mode; `grill` runs against `02_design.html`:
  `setup, worktree, init-state, resolve-epic, [feedback-triage], [requirements], ideate, design-build, grill, story-split, plan, definition-merge, final-summary, capture-learnings`.
  (Bracketed phases are sub-mode-conditional; the resume cursor walks whatever the run wrote.)
- **`build`** (new in v6 — Loop 2) — one bounded iteration over one story (SKILL.md `#build-mode`); declared in execution order; new phase ids `reconcile` (infra — the resume-first reconcile-in-flight step 0, D1, `2026-06-12_build-resume-reconcile/02_design.html#decisions`), `pick` (infra), `claim` (infra), `build-worktree` (infra — create-or-reuse + transitive dep-merge, D9/D10/D19), `write-back` (hard — the done/blocked main-checkout write, D11); `requirements`/`grill`/`spec`/`plan` omitted (the epic already defined them); `complete-dev` omitted (release is Loop 3). **The picked story's `route:` selects the inner-pipeline variant** (recorded at `pick`). **`route: feature|lite`**:
  `setup, init-state, reconcile, pick, claim, build-worktree, execute, verify, write-back, final-summary, capture-learnings`.
  **`route: skill`** (D4/G6) — inserts `skill-tier-resolve` (infra) before `execute` and `skill-eval` (hard) after it:
  `setup, init-state, reconcile, pick, claim, build-worktree, skill-tier-resolve, execute, skill-eval, verify, write-back, final-summary, capture-learnings`.

  Build's `init-state` writes the state file in the **main checkout's** `.pmos/feature-sdlc/` until `build-worktree` creates/enters the story worktree, after which state lives in the worktree (the standard location); a `--resume` reads from whichever exists (worktree first). `epic_id`/`story_id` (above) are stamped at `pick`/`claim`. The build `phases[]` variant is fixed once `pick` records the story's `route:` — a resume re-reads it from the persisted `phases[]`, never re-derives it.

  **`reconcile` (step 0) — resume-first reconcile-in-flight.** Runs once at the top of every build iteration, before `pick`, on a clean fall-through path: a no-op when no resumable in-progress story exists, so a clean backlog picks exactly as today (D1). When it resumes a story it does so by **re-entering that story's existing worktree state.yaml via the Phase 0b cursor** (D6) — `reconcile` itself does not get a per-iteration artifact; it either hands control to the resumed story's own `phases[]` (which already records per-inner-phase status) or falls through to `pick`. Because the inner pipeline's `execute` / `skill-eval` / `verify` / `write-back` are **separate `phases[]` entries each carrying independent `status`**, a crash after `/verify` wrote `completed` but before `write-back` resumes straight to `write-back` (idempotent finalize) and never re-runs `/verify` (D6). The cross-tick **poison-guard fields** the reconcile step reads/writes — `resume_attempts`, the `last_progress` marker, and `driver_holder` — are **skill-managed backlog story fields**, not `state.yaml` fields (they must survive a worktree that is recreated fresh, and `reconcile` runs before `build-worktree` exists); their canonical definition lives in `plugins/pmos-toolkit/skills/backlog/schema.md` (§ "Frontmatter — story-only fields") and is cited, never restated, here.

**Back-compat for pre-2.52.0 state files (additive, no `schema_version` bump):** state files written before 2.52.0 have no `ideate` entry in `phases[]`. The resume cursor scans whatever phases the file declares — a missing `ideate` entry is treated as "this phase did not exist when the run started; advance past it" (the same shape as the elision of `msf-req`/`simulate-spec` for pre-2.34.0 files). No on-read migration step is required; runs are not retroactively re-ideated.

**Back-compat for pre-v7 state files (the `shape` phase — absence-skip):** state files written before the v7 `shape` front-gate (`schema_version < 7`) have no `shape` entry in `phases[]`. Even though v7 bumps the cohort marker, the v6→v7 migration is a **pure cohort bump — it does NOT back-fill `shape` into a migrated file's `phases[]`** (the `shape` phase set is only ever produced by a fresh v7 init). The resume cursor advances past the absent phase exactly as for `ideate`: a missing `shape` entry means "this phase did not exist when the run started; advance past it." So an in-flight worktree or an already-defined epic mid-run keeps its old phase order and is never retroactively re-shaped; only a fresh feature/skill-new/prototype run gets the gated `/shape` front.

The resume cursor scans whatever `phases[]` contains — it is **mode-agnostic** (`pipeline_mode` is read back from the state file, never re-derived from a subcommand on `--resume`). `current_phase` at fresh init is the first phase of the mode's set (`requirements` in feature; `skill-tier-resolve` in `skill-new`; `feedback-triage` in `skill-feedback`).

The compact checkpoint (`compact-checkpoint.md`) is a recurring micro-phase, not a `phases[]` entry — when it fires is defined in `compact-checkpoint.md` § "When the checkpoint fires" (the single source). It writes its pause record into the *next* phase's entry (see `compact-checkpoint.md`).

#### `skill_eval` substructure (v4)

On the `skill-eval` phase entry only:

```yaml
skill_eval:
  iterations:
    - n: 1
      pre_ref: <git sha — HEAD after /execute Phase 6 completed>
      addendum_task_ids: [T26a, T26b]      # the "## Eval-remediation — iteration 1" tasks appended to 03_plan (absent if iter 1 passed clean)
      checks_failed: [c-body-size, b-desc-has-when]
      result: fail                          # pass | fail
    - n: 2
      pre_ref: <git sha — HEAD before iteration 2's remediation commits>
      addendum_task_ids: [T26c]
      checks_failed: []
      result: pass
  accepted_residuals:                       # populated only by the post-cap "Accept residuals as known risk" disposition
    - check_id: d-flowcharts-justified
      fix_note: "<the reviewer's concrete-edit note, verbatim>"
      acked_at: <ISO-8601>
```

`iterations[0]` is implicit (the initial `/execute` Phase 6 build); the first recorded entry is `n: 1`. `iterations[n].pre_ref` is HEAD *before* iteration n's remediation commits — so "Restore iteration 1" (offered only when iteration 2 was net-worse) `git reset`s the skill files to `iterations[2].pre_ref`. All writes to this substructure use the atomic temp-then-rename protocol.

#### `ideate` substructure (2.52.0)

On the `ideate` phase entry only (feature + skill-new modes):

```yaml
ideate:
  seed_shape: fuzzy | formed | null              # null until classified by reference/fuzzy-idea-detection.md
  ideate_tier_estimate: null | 1 | 2 | 3          # set after /ideate runs; --tier flag wins
  grill_deep_chained: false | true                # true iff /grill --depth deep auto-ran on the brief
  grill_deep_artifact_path: null | "<feature_folder>/00d-grill_ideate.html"
```

`artifact_path` on the `ideate` entry holds the path to the brief (`<feature_folder>/00d_ideate.html`) when /ideate ran; `null` otherwise. The Tier-3 chain rule: `--tier 3` explicit OR (brief contains ≥3 user-journey sections OR ≥5 pressure-test findings). Skipping records `status ∈ {skipped-formed, skipped-flag, skipped-non-interactive}` per the corresponding gate path.

#### `shape` substructure (v7)

On the `shape` phase entry only (feature + skill-new + prototype modes):

```yaml
shape:
  tier_at_gate: null | 1 | 2 | 3            # the resolved {tier} when the gate evaluated (conservative 3 if unresolved)
  disposition: mandatory | skipped-tier1    # D9: explicit --tier 1 → skipped-tier1; Tier 2/3/new-bet/conservative-3 → mandatory
  non_interactive_path: false | true        # true iff the mandatory gate ran /shape's D10 autonomous best-effort path
  context_bucket: null | "<bucket>"         # the D5 context-classifier bucket that fed the gate, when available
```

`artifact_path` on the `shape` entry holds the path to the problem-brief (`<feature_folder>/00c_shape.html`) when `/shape` ran; `null` when skipped. The downstream passthrough — `/ideate` `--from-shape` and `/requirements`' `[shape-brief: <path>]` — reads `artifact_path`. Skipping records `status: skipped-tier1` (the only skip path; there is no user-facing skip gate at Tier 2+). The non-interactive mandatory run sets `non_interactive_path: true` and records any unresolved items as the brief's Open Questions — it never deadlocks or hard-refuses (D10).

### Status enum

- `pending` — declared but not started.
- `in_progress` — currently executing.
- `completed` — finished cleanly (child skill returned success).
- `paused` — exited cleanly mid-phase per the pause contract (`compact-checkpoint.md`); resumable via `--resume`.
- `failed` — errored; failure dialog will be re-presented on `--resume`.
- `skipped` — user picked Skip at the gate (soft phases only) or `--non-interactive` auto-recommendation chose Skip.
- `skipped-on-failure` — user picked Skip in the failure dialog after an error (soft phases only).
- `skipped-non-interactive` — explicit auto-skip in non-interactive mode (`grill` when `mode == non-interactive`).
- `skipped-unavailable` — child skill not installed and user (or `--non-interactive` auto-pick) chose Skip in the missing-skill dialog (soft phases only).
- `skipped-formed` — (2.52.0, `ideate` phase only) the fuzzy-idea-detection classifier returned `seed_shape: formed`; the gate prompt was not presented per the auto-detect-and-only-then-confirm contract. Distinct from `skipped` (which is an explicit user pick at a presented gate).
- `skipped-flag` — (2.52.0, `ideate` phase only) the user passed `--no-ideate`; the classifier did not run; the gate was bypassed unconditionally.
- `skipped-tier1` — (v7, `shape` phase only) the run resolved to Tier 1 (explicit `--tier 1`), so the gated `/shape` front auto-skips per D9. The only skip path for `shape`; there is no user-facing skip prompt at Tier 2+.

### `paused_reason` enum

- `compact` — user chose Pause-resumable at a compact checkpoint.
- `failure` — user chose Pause-resumable in a failure dialog.
- `user` — user chose Pause-resumable outside a dialog (e.g., interrupted between phases).
- `missing_skill` — user chose Pause-to-install in the missing-skill dialog. `missing_skill` field captures the child skill name.

---

## `open_questions_log[]` entry shape

Append-only; written after each `--non-interactive` child phase that flushed deferred questions.

```yaml
- phase: <phase id>
  child_skill: <e.g., requirements, spec, plan>
  oq_artifact_path: <relative path under feature_folder, e.g., 01_requirements.md or _open_questions.md>
  deferred_count: <int, count of DEFER classifications by the child>
  ts: <ISO-8601 when the entry was appended>
```

At end-of-run AND end-of-pause, `/feature-sdlc` writes `<feature_folder>/00_open_questions_index.md` summarizing every entry in this log with links to each child's OQ artifact.

---

## Schema v2 (added 2026-05-10)

v2 is additive over v1 — no field removals, no rename, no reshape. v1 files are auto-migrated to v2 on read.

### What's new in v2

1. **`phases[].folded_phase_failures: []`** — empty list initialized on every phase entry. Appended to by parent skills (`/requirements`, `/wireframes`, `/spec`) when a folded child phase (msf-req, msf-wf, simulate-spec) crashes. Each entry: `{folded_skill: <name>, error_excerpt: <first-200-chars>, ts: <ISO-8601>}`.
2. **`phases[].started_at`** — timestamp written on the first `pending → in_progress` transition. Already documented in v1 phase entries; v2 makes the write contract explicit (only set if currently null; never overwritten).
3. **`phases[]` includes `retro`** entry — appended after `complete-dev`, before `final-summary`.

### `folded_phase_failures[]` append-dedup rule

When appending a new failure record, compare against existing entries in the same `folded_phase_failures[]` list. If an entry exists with **identical `folded_skill`** AND **identical `error_excerpt`** (byte-for-byte), do NOT append a duplicate; update the existing entry's `ts` to the new timestamp instead. This keeps the list bounded under repeated /resume retries.

### v1 → v2 auto-migration block (4 steps, idempotent)

Performed on read whenever `state.schema_version < 2`:

1. **Set `schema_version: 2`.**
2. **Ensure `folded_phase_failures: []` is present on every `phases[]` entry.** Default to empty list if absent. Same for `started_at: null` on entries that lack the field.
3. **Append the `retro` phase entry** between `complete-dev` and `final-summary` if not already present. Default: `{id: retro, hardness: soft, status: pending, artifact_path: null}`.
4. **Emit chat log line:** `migration: state.schema v1 → v2 (added: folded_phase_failures, started_at on N entries, retro phase)`.

### Atomicity

State writes use **same-directory write-temp-then-rename**: write to `<state.yaml>.tmp` in `.pmos/feature-sdlc/`, then `rename(2)` to `state.yaml` (POSIX atomic on same filesystem). On rename(2) failure, the `.tmp` file is removed and the operation is reported as a hard error — never leave a `.tmp` orphan that a future run could mistake for in-progress state. /plan startup runs a stale-tempfile reaper.

---

## Schema v3 (added 2026-05-10)

v3 is a **pure cohort-marker bump** over v2 — no field additions, no removals, no renames. The only behavioral change is a runtime invariant: `worktree_path` is `realpath()`-canonical at write time, and `/feature-sdlc` performs a drift check (`realpath($PWD) == state.worktree_path`) on every entry that loads the state file.

### What's new in v3

- Nothing structural. `schema_version: 3` is the cohort marker.

### v2 → v3 auto-migration block (1 step, idempotent)

Performed on read whenever `state.schema_version < 3` AND the drift check has passed:

1. Set `schema_version: 3`. Emit chat log line: `migration: state.schema v2 → v3 (cohort-marker bump only; no field changes)`.

If the drift check fails (the v2 file is not in the worktree it claims), `/feature-sdlc --resume` aborts with the relaunch instruction; migration is not attempted.

### `worktree_path` canonicalization (new in v3)

`worktree_path` is written as `realpath(<abs-worktree-path>)` on initial state.yaml init (`/feature-sdlc` Phase 1) and on every status-transition update that touches the field. Reads compare via byte equality against `realpath($PWD)`. See `_shared/canonical-path.md` for the canonical-path contract used by both `/feature-sdlc` and `/complete-dev`.

---

## Schema v4 (added 2026-05-11)

v4 is **additive over v3** — no field removals, no renames, no reshape. It is the schema for the `/feature-sdlc skill` modes. v3 (and v1/v2, via the chain) files are auto-migrated on read.

### What's new in v4

1. **Top-level `pipeline_mode`** — `feature` / `skill-new` / `skill-feedback`. Distinct from `mode ∈ {interactive, non-interactive}` — the naming-collision resolution.
2. **Mode-conditional `phases[]` membership** — see "Mode-conditional `phases[]` membership (v4)" above. The skill-dev phase ids (`feedback-triage`, `skill-tier-resolve`, `skill-eval`) are only ever added by a fresh skill-mode init — never retrofitted onto an older file.
3. **Three new phase ids + hardness** — `feedback-triage` (hard), `skill-tier-resolve` (infra), `skill-eval` (hard). Only present when the run mode includes them.
4. **New optional per-phase fields** — `feedback_source` / `target_skills` (on `feedback-triage`); `resolved_tier` / `skill_location` / `target_platform` / `per_skill_tiers` (on `skill-tier-resolve`); the `skill_eval` substructure (on `skill-eval`). The existing `child_tier_divergence` field is reused for the `--tier`-vs-matrix divergence.

### v3 → v4 auto-migration block (4 steps, idempotent)

Performed on read whenever `state.schema_version < 4` AND the drift check has passed (the pre-2.34.0 `msf-req`/`simulate-spec` elision runs first if the file is that old):

1. **Set `schema_version: 4`.**
2. **Set `pipeline_mode: feature`** if absent (every pre-v4 file was a feature run).
3. **`phases[]` unchanged** — the skill-dev phase ids are only ever added by a fresh skill-mode init, never retrofitted; a migrated v3 file keeps its existing feature-mode phase set.
4. **Emit chat log line:** `migration: state.schema v3 → v4 (added: pipeline_mode=feature; cohort-marker bump)`.

`schema_version > 4` → fall through to the v5, v6, then v7 checks below. On a v1 file, the full `v1 → v2 → v3 → v4 → v5 → v6 → v7` chain runs in order (each step's block above + the v5, v6, and v7 steps below).

---

## Schema v5 (added 2026-05-24)

v5 is **additive over v4** — no field removals, no renames, no reshape. It is the schema for the `/feature-sdlc prototype` mode. v4 (and earlier, via the chain) files are auto-migrated on read.

### What's new in v5

1. **`pipeline_mode` enum widens** — `prototype` becomes a valid value alongside `feature`/`skill-new`/`skill-feedback`.
2. **New mode-conditional `phases[]` membership** — the `prototype` mode's `phases[]` set (see "Mode-conditional `phases[]` membership (v4)" above, the `prototype` bullet). The phase entries are declared in *execution order*, so the resume cursor walks them correctly without special-casing.
3. **No new top-level fields, no new per-phase fields, no new substructures.** All `prototype`-mode metadata is captured in existing fields (`current_phase`, `phases[].status`, etc.).

### v4 → v5 auto-migration block (2 steps, idempotent)

Performed on read whenever `state.schema_version < 5` AND the drift check has passed:

1. **Set `schema_version: 5`.**
2. **Emit chat log line:** `migration: state.schema v4 → v5 (added: pipeline_mode=prototype valid value; cohort-marker bump)`.

(`phases[]` is unchanged — the `prototype`-mode phase set is only ever produced by a fresh `prototype`-mode init; never retrofitted onto an older feature/skill-mode run.)

### v5 → v6 auto-migration block (3 steps, idempotent)

Performed on read whenever `state.schema_version < 6` AND the drift check has passed:

1. **Set `schema_version: 6`.**
2. **Default-fill** `epic_id: null` and `story_id: null` if absent.
3. **Emit chat log line:** `migration: state.schema v5 → v6 (added: pipeline_mode=define|build valid values; epic_id/story_id pointers; cohort-marker bump)`.

(`phases[]` is unchanged — the `define`/`build` phase sets are only ever produced by a fresh `define`/`build` init; never retrofitted onto an older run.)

### v6 → v7 auto-migration block (2 steps, idempotent)

Performed on read whenever `state.schema_version < 7` AND the drift check has passed:

1. **Set `schema_version: 7`.**
2. **Emit chat log line:** `migration: state.schema v6 → v7 (added: shape Phase-1 front-gate as a fresh-init phase; cohort-marker bump)`.

(`phases[]` is unchanged — the `shape` phase is only ever produced by a fresh v7 feature/skill-new/prototype init; **never retrofitted onto an older run.** A migrated v6 file keeps its existing phase set with no `shape` entry, so the resume cursor advances past the absent phase — see "Back-compat for pre-v7 state files" above. This is the additive, version-gated, no-breaking-change guarantee: in-flight worktrees and already-defined epics keep the old phase order.)

`schema_version > 7` → abort: `state file from newer /feature-sdlc version (vN); upgrade pmos-toolkit and retry`, exit 64.

---

## Worked example A — feature mode (Tier-3 mid-pipeline pause)

Captures every field for an `--resume`-ready pause. The pipeline ran cleanly through `requirements` and `grill`, paused at the compact checkpoint before `wireframes`.

```yaml
schema_version: 4
slug: oauth-refresh-tokens
pipeline_mode: feature
tier: 3
mode: interactive
started_at: 2026-05-09T14:22:11Z
last_updated: 2026-05-09T14:48:32Z
current_phase: wireframes
worktree_path: ${REPO_PARENT}/myrepo-oauth-refresh-tokens
branch: feat/oauth-refresh-tokens
feature_folder: ${REPO_PARENT}/myrepo-oauth-refresh-tokens/docs/pmos/features/2026-05-09_oauth-refresh-tokens
phases:
  - id: setup
    hardness: infra
    status: completed
    artifact_path: null
    started_at: 2026-05-09T14:22:11Z
    completed_at: 2026-05-09T14:22:14Z
  - id: worktree
    hardness: infra
    status: completed
    artifact_path: null
    started_at: 2026-05-09T14:22:14Z
    completed_at: 2026-05-09T14:22:31Z
  - id: init-state
    hardness: infra
    status: completed
    artifact_path: 00_pipeline.md
    started_at: 2026-05-09T14:22:31Z
    completed_at: 2026-05-09T14:22:32Z
  - id: requirements
    hardness: hard
    status: completed
    artifact_path: 01_requirements.md
    started_at: 2026-05-09T14:22:32Z
    completed_at: 2026-05-09T14:35:04Z
  - id: grill
    hardness: soft
    status: completed
    artifact_path: grills/2026-05-09_01_requirements.md
    started_at: 2026-05-09T14:35:04Z
    completed_at: 2026-05-09T14:42:18Z
  - id: creativity
    hardness: soft
    status: skipped
    artifact_path: null
  - id: wireframes
    hardness: soft
    status: paused
    artifact_path: null
    started_at: 2026-05-09T14:48:30Z
    paused_at: 2026-05-09T14:48:32Z
    paused_reason: compact
    last_error: null
  - id: prototype
    hardness: soft
    status: pending
  - id: spec
    hardness: hard
    status: pending
  - id: plan
    hardness: hard
    status: pending
  - id: execute
    hardness: hard
    status: pending
  - id: verify
    hardness: hard
    status: pending
  - id: complete-dev
    hardness: hard
    status: pending
  - id: final-summary
    hardness: infra
    status: pending
  - id: capture-learnings
    hardness: infra
    status: pending
open_questions_log: []
```

---

## Worked example B — skill-feedback mode (mid-pipeline, one eval iteration done)

A `/feature-sdlc skill --from-feedback <retro-paste>` run that triaged feedback for two skills (`/polish`, `/wireframes`), tiered the run at 3 (max of per-skill 2 and 3), ran requirements→spec→plan→execute, did one `skill-eval` remediation iteration (one residual accepted), and is now in `verify`.

```yaml
schema_version: 4
slug: polish-wireframes-feedback
pipeline_mode: skill-feedback
tier: 3
mode: interactive
started_at: 2026-05-11T09:01:00Z
last_updated: 2026-05-11T11:40:00Z
current_phase: verify
worktree_path: ${REPO_PARENT}/agent-skills-polish-wireframes-feedback
branch: feat/polish-wireframes-feedback
feature_folder: ${REPO_PARENT}/agent-skills-polish-wireframes-feedback/docs/pmos/features/2026-05-11_polish-wireframes-feedback
phases:
  - id: setup
    hardness: infra
    status: completed
    artifact_path: null
    started_at: 2026-05-11T09:01:00Z
    completed_at: 2026-05-11T09:01:02Z
  - id: worktree
    hardness: infra
    status: completed
    artifact_path: null
    started_at: 2026-05-11T09:01:02Z
    completed_at: 2026-05-11T09:01:20Z
  - id: init-state
    hardness: infra
    status: completed
    artifact_path: 00_pipeline.html
    started_at: 2026-05-11T09:01:20Z
    completed_at: 2026-05-11T09:01:21Z
  - id: feedback-triage
    hardness: hard
    status: completed
    artifact_path: 0c_feedback_triage.html
    started_at: 2026-05-11T09:01:21Z
    completed_at: 2026-05-11T09:18:40Z
    feedback_source: --from-reflect:.pmos/reflects/2026-05-10_run.html
    target_skills: [polish, wireframes]
  - id: skill-tier-resolve
    hardness: infra
    status: completed
    artifact_path: null
    started_at: 2026-05-11T09:18:40Z
    completed_at: 2026-05-11T09:20:05Z
    resolved_tier: 3
    skill_location: plugins/pmos-toolkit/skills
    target_platform: claude-code
    per_skill_tiers: {polish: 2, wireframes: 3}
  - id: requirements
    hardness: hard
    status: completed
    artifact_path: 01_requirements.html
    started_at: 2026-05-11T09:20:05Z
    completed_at: 2026-05-11T09:42:00Z
  - id: grill
    hardness: soft
    status: completed
    artifact_path: grills/2026-05-11_01_requirements.html
    started_at: 2026-05-11T09:42:00Z
    completed_at: 2026-05-11T10:01:00Z
  - id: creativity
    hardness: soft
    status: skipped
    artifact_path: null
  - id: spec
    hardness: hard
    status: completed
    artifact_path: 02_spec.html
    started_at: 2026-05-11T10:01:00Z
    completed_at: 2026-05-11T10:25:00Z
  - id: plan
    hardness: hard
    status: completed
    artifact_path: 03_plan.html
    started_at: 2026-05-11T10:25:00Z
    completed_at: 2026-05-11T10:40:00Z
  - id: execute
    hardness: hard
    status: completed
    artifact_path: null
    started_at: 2026-05-11T10:40:00Z
    completed_at: 2026-05-11T11:15:00Z
  - id: skill-eval
    hardness: hard
    status: completed
    artifact_path: null
    started_at: 2026-05-11T11:15:00Z
    completed_at: 2026-05-11T11:32:00Z
    skill_eval:
      iterations:
        - n: 1
          pre_ref: a1b2c3d4
          addendum_task_ids: [T18a, T18b]
          checks_failed: [c-body-size, d-flowcharts-justified]
          result: fail
        - n: 2
          pre_ref: e5f6a7b8
          addendum_task_ids: []
          checks_failed: [d-flowcharts-justified]
          result: fail
      accepted_residuals:
        - check_id: d-flowcharts-justified
          fix_note: "The /wireframes flowchart in §C is load-bearing (the IA decision tree); a prose-only form would be worse. Keep, but add a one-line caption stating why a diagram is used here."
          acked_at: 2026-05-11T11:32:00Z
  - id: verify
    hardness: hard
    status: in_progress
    artifact_path: null
    started_at: 2026-05-11T11:40:00Z
  - id: complete-dev
    hardness: hard
    status: pending
  - id: retro
    hardness: soft
    status: pending
  - id: final-summary
    hardness: infra
    status: pending
  - id: capture-learnings
    hardness: infra
    status: pending
open_questions_log: []
```

---

*Spec lineage: `docs/pmos/features/2026-05-09_feature-sdlc-skill/` (v1), `2026-05-10_pipeline-consolidation/` (v2), `2026-05-10_feature-sdlc-worktree-resume/` (v3), `2026-05-11_feature-sdlc-skill-mode/` (v4), `2026-05-23_feature-sdlc-ideate-phase/` (ideate substructure), `2026-05-24_prototype-sdlc-skill/` (v5), `2026-06-16_shape-skill/` (v7 — `/shape` Phase-1 front-gate, `shape` substructure).*
