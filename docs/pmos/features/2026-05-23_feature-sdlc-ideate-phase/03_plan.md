# 03 — Plan (streamlined-inline)

**Mode:** skill-feedback · **Tier:** 2 · **execution_mode:** inline.
**Target skill:** `/feature-sdlc` (v2.51.0 → v2.52.0).

## File Map

| File | Action |
|---|---|
| `plugins/pmos-toolkit/skills/feature-sdlc/SKILL.md` | edit (5 surgical inserts) |
| `plugins/pmos-toolkit/skills/feature-sdlc/reference/state-schema.md` | edit (additive entry for 2 modes) |
| `plugins/pmos-toolkit/skills/feature-sdlc/reference/fuzzy-idea-detection.md` | create |

## Wave 1 — sequential tasks (single stream)

| # | Task | Verification |
|---|---|---|
| T1 | Create `reference/fuzzy-idea-detection.md` per spec API contract. | File exists; contains 5 deterministic rules + 3 worked examples. |
| T2 | Edit `reference/state-schema.md`: add `ideate` phase entry to `feature` mode `phases[]` and `skill-new` mode `phases[]`, immediately after `init-state`. Document all fields per spec Schema additions. Add back-compat note. | grep `ideate:` returns 2 matches in the modes section; back-compat note present. |
| T3 | Edit `SKILL.md` frontmatter: append `--no-ideate` to `argument-hint`; append 3 trigger phrases to `description`. | grep frontmatter; assert all 4 strings present. |
| T4 | Edit `SKILL.md` pipeline-position diagram (the ASCII block at the top): insert `[/ideate]` between `[init-state]` line and `/requirements` line, annotated `# Phase 1.5; feature + skill-new only`. | Visual inspection of the updated diagram. |
| T5 | Edit `SKILL.md`: insert new section `## Phase 1.5: /ideate gate (soft; feature + skill-new only)` between Phase 1 and Phase 2 (`## Phase 2: /requirements (hard)`). Section content per spec FR-IDE-01..FR-IDE-10. | Section present; cites `reference/fuzzy-idea-detection.md`; uses `<!-- defer-only: ambiguous -->` adjacency for the AskUserQuestion. |
| T6 | Edit `SKILL.md` Phase 2 `/requirements` section: in the invocation paragraph, add the `[ideate-brief: <path>]` and `[ideate-grill: <path>]` first-lines documentation per FR-IDE-09. | Phase 2 section names both lines. |
| T7 | Edit `SKILL.md` Anti-patterns section: append entry #14 per FR-IDE-14. | Entry #14 present and concrete. |
| T8 | Edit `SKILL.md` Phase 9 final-summary section: artifact-link bullet enumerates `00d_ideate.html` (and `00d-grill_ideate.html` when present). | grep `00d_ideate` in Phase 9. |
| T9 | Edit `SKILL.md` mode × phase table (paraphrase block): add row `1.5 /ideate gate · ✓ · ✓ · —`. | Table row present. |
| T10 | Edit `SKILL.md` "Mode × phase" sub-section and `## Release prerequisites` section: bullet for adding `--no-ideate` to argument-hint already covered by T3 (no /complete-dev-scope new tasks); leave release-prereqs list intact except for adding "trigger phrases include 'half-formed idea' family". | Inspect; ensure no version-bump / changelog / README-row tasks are in this plan (those are /complete-dev's job per learnings). |
| T11 | Self-run `bash plugins/pmos-toolkit/skills/feature-sdlc/tools/skill-eval-check.sh --target claude-code plugins/pmos-toolkit/skills/feature-sdlc` from the worktree root. Expect all `[D]` checks PASS. | Exit code 0. |
| T12 | Commit each task atomically with the canonical message style. | `git log feat/feature-sdlc-ideate-phase --oneline` shows ≥1 commit per logical group. |

## Release prerequisites (NOT in any wave above — `/complete-dev` only)

- Bump `plugins/pmos-toolkit/.claude-plugin/plugin.json` and `plugins/pmos-toolkit/.codex-plugin/plugin.json` from 2.51.0 → 2.52.0.
- Bump `.claude-plugin/marketplace.json` and `.codex-plugin/marketplace.json` `plugins[pmos-toolkit].version` to 2.52.0 (all 4 in sync).
- Add `docs/pmos/changelog.md` entry summarizing the user-facing change: "/feature-sdlc gains an optional /ideate phase before /requirements (auto-detect-fuzzy gate + Tier-3 auto-/grill chain + brief consumed by /requirements)."
- Tag `pmos-toolkit/v2.52.0` after merge.
- Push to `origin` + `gitlab-mirror`.
