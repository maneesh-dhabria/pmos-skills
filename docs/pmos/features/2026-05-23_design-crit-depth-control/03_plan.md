---
title: "/design-crit depth control — Plan"
mode: skill-feedback
tier: 2
output_format: md (streamlined-inline override)
execution_mode: inline
input: 02_spec.md
---

## Wave 1 — SKILL.md edits (single commit; mechanical change set)

All edits live in `plugins/pmos-toolkit/skills/design-crit/SKILL.md`.

- **T1** (FR-DC-DEPTH-08): Edit frontmatter L5 `argument-hint` — insert `[--depth shallow|standard|deep]` between `[--format <html|md|both>]` and `[--non-interactive | --interactive]`.
- **T2** (FR-DC-DEPTH-09): Edit "## Platform Adaptation" section (around L33) — add the `**No interactive prompt tool: depth defaults to standard...**` bullet to the existing list.
- **T3** (FR-DC-DEPTH-01, 02, 03): Add a new sub-section between "### Phase 0 addendum: output_format resolution (FR-12)" (ends ~L59) and the non-interactive block (starts L62). Title: `### Phase 0 addendum: depth resolution (FR-DC-DEPTH-01..03)`. Body documents the flag parsing, `effective_cap` map, stderr log line, and the `depth_source` carry-through to Phase 4.
- **T4** (FR-DC-DEPTH-05): Edit "## Phase 4" step 1 (L262) — replace the hardcoded "12" cap with the parameterised cap directive per FR-DC-DEPTH-05's three-branch behaviour. Keep the "low findings go in an 'unsurfaced' appendix" clause unchanged.
- **T5** (FR-DC-DEPTH-04, 06): Edit "### 4a. Findings Presentation Protocol" — insert the adaptive gate block BEFORE the existing "Issue multiple sequential AskUserQuestion calls" sentence (currently L289). Also replace the hardcoded "12" in that sentence with `effective_cap` (with the `null → all` semantics). Carries the canonical `<!-- defer-only: ambiguous -->` adjacent tag on the new AskUserQuestion gate (the depth choice is ambiguous in the canonical-block sense — no Recommended for `deep`, plus the Recommended `standard` differs from what a power-user might want; tag forces DEFER in non-interactive mode, where FR-DC-DEPTH-04 specifies the auto-pick).
- **T6** (FR-DC-DEPTH-07): Append after the Phase 4a section the FR-DC-DEPTH-07 chat-line directive — a short paragraph: *"After Phase 4a completes, print to chat: `<N_surfaced> findings surfaced for disposition, <M_unsurfaced> unsurfaced — see {out_dir}/eval-findings.json`. Fires in all modes."*
- **T7** (FR-DC-DEPTH-10): Edit "## Anti-patterns" (L422 area) — append the silent-capping anti-pattern entry.

All T1–T7 land in **one commit** with message:

```
feat(design-crit): add --depth flag + adaptive Phase 4 gate; lift 12-finding silent cap

- New --depth shallow|standard|deep flag (default unset → adaptive gate)
- Phase 4 reviewer cap parameterised (effective_cap or 50 safety bound)
- Phase 4a disposition loop honours effective_cap; deep = uncapped
- Anti-pattern entry forbidding silent capping (always print surfaced/unsurfaced)
- Frontmatter argument-hint enumerates --depth
```

## Wave 2 — Phase 6a /skill-eval gate (orchestrator-driven)

Re-run `tools/skill-eval-check.sh --target claude-code plugins/pmos-toolkit/skills/design-crit/` for `[D]` checks. Dispatch `[J]` reviewer subagent over the edited SKILL.md against `skill-eval.md` rubric.

Expected: all checks pass first iteration. If not, append `## Eval-remediation — iteration 1` tasks to this plan.

## Wave 3 — Phase 7 /verify + Phase 8 /complete-dev (orchestrator-driven)

`/verify` re-runs skill-eval fresh and grades release prereqs. `/complete-dev` does:
- Merge feat/design-crit-depth-control → main (squash, fast-forward, or merge per repo norms).
- Bump version 2.51.0 → 2.52.0 across all four manifest files.
- Append changelog entry to `docs/pmos/changelog.md`.
- Tag `pmos-toolkit/v2.52.0`.
- Push to origin + gitlab-mirror.

## Release prerequisites — out of /execute scope

Per `skill-patterns.md §G` and repo `CLAUDE.md ## Plugin manifest version sync`, no version-bump / changelog / manifest-sync tasks appear in any Wave above. They are listed here for /complete-dev's reference only:
- 4-file version sync 2.51.0 → 2.52.0 (per-plugin claude + codex; marketplace claude + codex).
- `docs/pmos/changelog.md` entry.
- No CLAUDE.md update needed.
- No README row change (skill already listed).
- No `~/.pmos/learnings.md ## /design-crit` header bootstrap needed (assume already present; check at /complete-dev time).
