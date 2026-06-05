# `.pmos/feature-sdlc.lastrun.yaml` — soft-gate defaults schema

Per-developer, per-repo memory of the **non-destructive soft-gate** choices made on the most recent `/feature-sdlc` run. Read in Phase 0; consulted by Phase 0e's "Confirm soft-gate defaults" prompt; written at the end of Phase 9 once the pipeline finishes.

This mirrors `complete-dev/reference/lastrun-schema.md` (the `.pmos/complete-dev.lastrun.yaml` pattern) — same intent (collapse repeated 2nd-run prompts into one confirm), same atomic write protocol, same destructive-allowlist discipline. One deliberate divergence (see "First-run behaviour" below): feature-sdlc's gate recommendations depend on artifacts produced *mid-pipeline* (fuzzy-idea detection for `/ideate`, frontend detection for `/wireframes`), so the consolidated confirm only fires when a prior lastrun exists.

**Gitignored** — personal state, not team-shared (one developer ships UI-heavy work and always runs wireframes; another never does).

## Path

`<main-repo-root>/.pmos/feature-sdlc.lastrun.yaml` — anchored to the **main checkout's root**, NOT the per-feature worktree (which `/complete-dev` deletes at Phase 16a). This is what makes the memory persist across worktrees.

**Resolve `<main-repo-root>` via git (do not rely on cwd — after `EnterWorktree`, cwd is the linked worktree):**

```bash
main_root="$(cd "$(git rev-parse --git-common-dir)/.." && pwd)"   # parent of the shared .git
```

`git rev-parse --git-common-dir` returns the shared `.git` (the main checkout's, even from inside a linked worktree); its parent is the main repo root. In `--no-worktree` mode this resolves to the launch cwd (same place), so the one rule covers both. On a `--resume` launched from inside the worktree, the same resolution still finds the main root.

## Schema (v1)

```yaml
version: 1
last_updated: 2026-06-05T14:23:00Z   # ISO-8601 UTC; bumped on every successful Phase 9 write
defaults:
  ideate: skip        # Phase 1a. run | skip
  creativity: skip    # Phase 3a. run | skip
  wireframes: run     # Phase 3b. run | skip
  prototype: skip     # Phase 3c. run | skip
  retro: skip         # Phase 8a. skip | run | run-last-5 | defer
detected_signals:
  frontend: positive  # Phase 3b heuristic class last run (positive | negative | unknown). Informational —
                      # drives the wireframes signal-change re-fire (see Field reference).
```

The five `defaults` keys map 1:1 to the five non-destructive soft gates. `retro` carries four values because Phase 8a offers four options; the other four gates are binary run/skip.

## Read contract

Read once in Phase 0 (after the learnings load), into an in-memory `soft_gate_defaults` dict:

- **File present + valid:** seed `soft_gate_defaults`. Phase 0e fires the consolidated confirm.
- **File absent (first run in this repo):** `soft_gate_defaults` stays unset; **Phase 0e does NOT fire** — each gate runs its own per-phase prompt with its own computed recommendation (see "First-run behaviour"). The lastrun is written at Phase 9 so the *next* run can consolidate.
- **File present but malformed** (not parseable YAML; missing `version`; `version > 1`): stderr warn `feature-sdlc.lastrun.yaml malformed or unknown version — falling back to per-gate prompts` and treat as absent. Never error out; this file is advisory.
- **`--reset-defaults` flag:** bypass the read; treat as absent (gates fire individually this run; Phase 9 overwrites with the new choices).

## First-run behaviour (divergence from complete-dev)

complete-dev seeds Phase 0a from built-in defaults even on the first run, because every signal it needs (detected deploy path, merge guard, current version) is available at Phase 0. feature-sdlc's soft gates are different: two of them carry recommendations that can only be computed from artifacts produced later in the pipeline —

- `/ideate` (Phase 1a) recommends Run/Skip from `reference/fuzzy-idea-detection.md` applied to the seed.
- `/wireframes` (Phase 3b) recommends Run/Skip from `reference/frontend-detection.md` applied to the **requirements doc**, which does not exist until Phase 2.

A consolidated first-run prompt would therefore have to *guess* those recommendations before the evidence exists — worse than letting each gate fire with its real heuristic. So there are **no built-in defaults**: with no lastrun, Phase 0e is skipped and each gate behaves exactly as it did before this feature. Consolidation is a pure 2nd-run-onward optimisation.

## Write contract

Written at the **end of Phase 9 (final summary)** — after the pipeline has run far enough to know every gate's actual disposition. Record the value each gate *resolved to this run*, whether via a Phase 0e confirm, a Phase 0e edit, or an individual gate prompt (first run / `--reset-defaults` / signal-change re-fire).

- **Modes:** `feature`, `skill-new`, `skill-feedback` only. **Skip in `prototype` mode** — its wireframes/prototype phases are hard (no gate), so a write would memorialise non-choices.
- **Atomicity:** write `.pmos/feature-sdlc.lastrun.yaml.tmp`, then `rename(2)` → `.pmos/feature-sdlc.lastrun.yaml`. On rename failure, log `lastrun write failed: <error>; next run will use per-gate prompts` and continue — the pipeline has already shipped; this is not a blocking error.
- A **failed / aborted / paused** run does NOT write lastrun — we do not memorialise broken or partial runs.
- `detected_signals.frontend` records the Phase 3b heuristic class observed this run (or `unknown` if 3b never ran, e.g. skill modes — in which case `wireframes` is written as its prior value or `skip`).

## Field reference

| Field | Phase | Effect when Phase 0e confirmed |
|---|---|---|
| `ideate: run` / `skip` | 1a | Gate prompt suppressed; remembered disposition applied. The `--no-ideate` flag and the `formed`-seed auto-skip still take precedence (they are evaluated first); only a `fuzzy` seed that would otherwise present the gate is short-circuited. |
| `creativity: run` / `skip` | 3a | Gate prompt suppressed; remembered disposition applied. |
| `wireframes: run` / `skip` | 3b | Gate prompt suppressed **iff** the recomputed frontend heuristic class equals `detected_signals.frontend` (unchanged). If the class **changed** since lastrun, the gate **re-fires** (the requirements shifted — the prior choice may be wrong). Tier-1's force-skip still wins regardless (existing rule). |
| `prototype: run` / `skip` | 3c | Gate prompt suppressed; remembered disposition applied. |
| `retro: skip` / `run` / `run-last-5` / `defer` | 8a | Gate prompt suppressed; remembered disposition applied (`run-last-5` → `/reflect --last 5`; `defer` → OQ stub). |

## Destructive / judgement prompts — never consolidated (always fire)

Phase 0e confirmation NEVER short-circuits these — they are destructive, free-form, or environment-sensitive, exactly as in complete-dev's allowlist:

- Phase 0a Step 1 slug confirmation (free-form edit path).
- Phase 0a Step 2 worktree/branch collision dialog (destructive).
- Phase 0a Step 2.5 base-drift dialog (destructive — pull / branch-off-stale / abort).
- Any child-skill **missing-skill** dialog (`reference/failure-dialog.md`).
- Any **failure dialog** (soft- or hard-phase) raised mid-pipeline.
- Phase 0b resume's orphaned-artifact / continue-or-abort prompt.
- Phase 6a's residual-acceptance prompt (skill modes) — a quality-gate judgement, not a soft gate.

## Non-interactive mode

Phase 0e fires only in interactive mode. In `--non-interactive`, the canonical `<!-- non-interactive-block -->` AUTO-PICKs each gate's Recommended option (equivalent to Phase 0e "Confirm all" with per-gate recommendations). lastrun is still **read** (it can refine the dispositions the buffer records) but the confirm is skipped; chat logs `Phase 0e auto-confirmed (non-interactive); defaults source: <lastrun|none>`.

## `--minimal` interaction

`--minimal` force-skips creativity (3a), wireframes (3b), prototype (3c), and retro (8a) before their gates are issued. With four of the five gates already forced, Phase 0e is **skipped** under `--minimal` (only `/ideate` would remain, and a one-gate "consolidation" is noise). Log `Phase 0e skipped (--minimal active)`.

## `--reset-defaults` flag

Pass `--reset-defaults` to ignore the on-disk lastrun and run each gate individually this run (useful when defaults have drifted — e.g. you stopped doing UI work). The file is not deleted; Phase 9 overwrites it with this run's choices.
