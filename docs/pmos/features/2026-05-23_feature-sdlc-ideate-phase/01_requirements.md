# 01 — Requirements (streamlined-inline)

**Mode:** skill-feedback · **Tier:** 2 · **Target skill:** `/feature-sdlc`
**Standing acceptance:** `reference/skill-patterns.md §A–§F`.

## Problem

`/feature-sdlc` today runs `/requirements` as the first content-producing phase. When the user has a half-formed idea, `/requirements` is the wrong starting point — it expects a problem statement, not a brainstorm seed. Users currently work around this by running `/ideate` manually, then re-feeding the brief into `/feature-sdlc`. Friction: extra step, lost worktree continuity, two-step muscle memory.

## Solution direction

Insert an optional **Phase 1.5: `/ideate` gate** between Phase 1 (init-state) and Phase 2 (`/requirements`). The gate auto-detects whether the seed is fuzzy or formed; on fuzzy, prompts to run `/ideate`; on Tier-3 ideas, auto-chains `/grill --deep` on the brief; persists the brief into the feature folder and passes it to `/requirements` as additional seed context.

## Functional requirements

| FR | Statement | Verification |
|---|---|---|
| FR-IDE-01 | Phase 1.5 runs in `pipeline_mode ∈ {feature, skill-new}` only; in `skill-feedback` it is a mode-conditional by-design non-presentation (not a silent skip). | Skill-eval `[J]` — read SKILL.md, find Phase 1.5; assert presence of the mode-conditional clause and the citation of Anti-pattern #4 carve-out. |
| FR-IDE-02 | Phase 1.5 classifies the seed via `reference/fuzzy-idea-detection.md` into `seed_shape ∈ {fuzzy, formed}`. The heuristic is deterministic: word-count threshold + vagueness-marker grep + presence-of-doc check. | Inspect `reference/fuzzy-idea-detection.md`; confirm three checks documented + a worked example per outcome. |
| FR-IDE-03 | When `seed_shape == formed`: log to chat exactly `[orchestrator] phase 1.5 ideate: formed seed detected; skipping`. Phase status in `state.yaml` recorded as `skipped-formed`. No prompt shown. | Manual run with a formed seed → grep chat log + state.yaml. |
| FR-IDE-04 | When `seed_shape == fuzzy`: issue a single `AskUserQuestion` — `Run /ideate (Recommended)` / `Skip`. In `--non-interactive`, deferred per the canonical block; deferred-default = Skip. | Manual run with a fuzzy seed; observe prompt. |
| FR-IDE-05 | On user-chosen Run: invoke `/pmos-toolkit:ideate` with the seed; pass `[mode: <current-mode>]\n` + `[output_format: <resolved>]\n` first-line. After completion, locate the brief via `_shared/resolve-input.md` `phase=ideate` and copy it to `{feature_folder}/00d_ideate.html` (+ `.md` sidecar when `output_format=both`). | After a fuzzy-seed run with Run picked, assert `00d_ideate.html` exists in feature folder. |
| FR-IDE-06 | Post-`/ideate`, classify the brief as Tier-3 if either: (a) `--tier 3` was explicit, OR (b) the brief contains ≥3 user-journey sections OR ≥5 pressure-test findings. Record `ideate_tier_estimate` on the phase entry. | Inspect SKILL.md Phase 1.5 step; verify the disjunctive heuristic is spelled out. |
| FR-IDE-07 | When `ideate_tier_estimate == 3`: automatically invoke `/pmos-toolkit:grill --deep` on `00d_ideate.html`. Capture output to `00d-grill_ideate.html`. Log `[orchestrator] phase 1.5 ideate: Tier-3 detected; auto-ran /grill --deep`. Set `state.yaml.phases.ideate.grill_deep_chained = true`. | Run with a Tier-3-shaped seed; assert grill artifact exists + state field set. |
| FR-IDE-08 | When `ideate_tier_estimate ∈ {1, 2}`: skip the grill chain silently (log line only). | Run with a Tier-2-shaped seed; assert no grill artifact + log line present. |
| FR-IDE-09 | Phase 2 `/requirements` invocation passes the ideate brief path as an additional seed via the child prompt: a line `[ideate-brief: <path>]` appended after the existing `[mode: …]` / `[output_format: …]` lines. The grilled-brief path is passed similarly when present (`[ideate-grill: <path>]`). | Inspect SKILL.md Phase 2 invocation block; verify the new lines are documented. |
| FR-IDE-10 | `argument-hint` frontmatter gains `--no-ideate` (bypass flag). When `--no-ideate` is present, Phase 1.5 is skipped unconditionally with log `[orchestrator] phase 1.5 ideate: --no-ideate flag; skipping`. Phase status = `skipped-flag`. | Inspect frontmatter + Phase 1.5 step. |
| FR-IDE-11 | `description` frontmatter gains ≥3 fuzzy-idea trigger phrases: "I have a half-formed idea", "this is a rough idea", "I want to brainstorm this end-to-end". | grep frontmatter description field. |
| FR-IDE-12 | `state.yaml` schema (v4 additive) gains an `ideate` phase entry for `feature` + `skill-new` modes only. Schema doc updated; back-compat note added for pre-v2.52.0 state files (the entry is absent → resume cursor skips it; no migration needed). | Inspect `reference/state-schema.md`. |
| FR-IDE-13 | Pipeline-position diagram at the top of SKILL.md updated to show `[/ideate]` between `[init-state]` and `/requirements` with a `feature + skill-new only` annotation. | Visual inspection. |
| FR-IDE-14 | Anti-pattern #14 added: "Skipping the `/ideate` gate without running the fuzzy-detect classifier first" — silent skip is forbidden; auto-skip-on-formed is allowed because the classifier ran. Phase-status enum gains `skipped-formed`, `skipped-flag`, `skipped-non-interactive` for this phase. | Inspect Anti-pattern section + state-schema enum. |
| FR-IDE-15 | Phase 9 final-summary includes the ideate brief path (and grill artifact if present) in the artifact-link list. | Inspect Phase 9 section. |

## Non-functional

- **NFR-IDE-01** — All log lines use the existing `[orchestrator] ...` prefix convention.
- **NFR-IDE-02** — No new sub-skill dependencies beyond `/pmos-toolkit:ideate` and `/pmos-toolkit:grill` (both already in the plugin).
- **NFR-IDE-03** — Back-compat: pre-2.52.0 state files (no `ideate` phase entry) resume cleanly; cursor sees no entry, skips, proceeds to next phase. No migration step required.

## Out of scope

- Modifying `/ideate` itself.
- Adding ideate to `skill-feedback` mode.
- Surfacing the brief in `/complete-dev` release notes (artifact-link list in Phase 9 is sufficient).

## Release prerequisites (handled by /complete-dev — NOT by /execute)

- Bump 4 manifest files to 2.52.0 (in sync).
- Add changelog entry under `docs/pmos/changelog.md`.
- Add `## /feature-sdlc` learnings header if missing (already present per Phase 0 read).
- Tag as `pmos-toolkit/v2.52.0`.
