# Release-notes recipes

Quick recipes for navigating folded-phase commits and the v2.34.0 flag surface when writing release notes (consumed by /changelog in Phase 8, or included directly in the merge commit body).

## Recipe 1 — Filter human-meaningful commits (skip auto-apply)

Folded MSF and simulate-spec phases write per-finding auto-apply commits (T6/T7/T8). To read the human-authored commit history without the auto-apply noise:

```bash
git log --invert-grep --grep='auto-apply' main..HEAD
```

This excludes commits like `requirements: auto-apply msf-req finding F3`, `wireframes: auto-apply msf-wf finding F7`, `spec: auto-apply simulate-spec patch P12`. Useful when scanning for behavior changes.

## Recipe 2 — Discover dependency graph from Depends-on bodies

Auto-apply commits include `Depends-on: F<M>` (or `P<M>`) in the commit body when finding F<N> requires F<M>. To enumerate the dependency graph:

```bash
git log --grep='Depends-on:' --pretty=format:'%h %s%n%b%n---' main..HEAD
```

Useful when reviewing whether folded findings landed in the right order, or when debugging why a re-apply on resume picked the wrong cursor.

## Recipe 3 — Anti-pattern: manual git rebase mid-pipeline

**DO NOT** `git rebase -i` during an in-progress /feature-sdlc run. The orchestrator's resume cursor uses `--since=<phase.started_at>` (T13/FR-57) plus per-finding commit greps to detect already-applied work. Rebasing rewrites timestamps and SHAs, which makes the apply-loop think nothing was applied — leading to duplicate auto-apply commits or skipped findings on resume.

Safe alternative: complete the pipeline (or pause via the compact checkpoint), then rebase in a fresh `/complete-dev` session before merging.

## Recipe 4 — `--help` quick reference for the v2.34.0 flag surface

11 new flags added across the pipeline in v2.34.0:

| Skill | New flags |
|-------|-----------|
| `/feature-sdlc` | `--minimal` (skip 4 soft gates: creativity, wireframes, prototype, retro) |
| `/requirements` | `--skip-folded-msf`, `--msf-auto-apply-threshold N` |
| `/wireframes` | `--skip-folded-msf-wf`, `--msf-auto-apply-threshold N` |
| `/spec` | `--skip-folded-sim-spec` |
| `/reflect` | `--last N`, `--days N`, `--since YYYY-MM-DD`, `--project current\|all`, `--skill <name>`, `--scan-all` |

`--msf-auto-apply-threshold N` defaults to 80 (Tier 3) — sub-threshold findings surface via inline disposition (D14) with `Recommended=Defer`.
