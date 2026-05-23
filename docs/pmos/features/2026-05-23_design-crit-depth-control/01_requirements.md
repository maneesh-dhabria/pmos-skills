---
title: "/design-crit depth control — Requirements"
mode: skill-feedback
tier: 2
target_skill: design-crit
feedback_source: <inline-text>
output_format: md (streamlined-inline override; per learning 2026-05-13)
acceptance_criteria: skill-patterns.md §A–§F
---

## Problem

`/design-crit` silently caps surfaced findings at **12 high+medium per run** in two enforcement points:

- `SKILL.md:262` — reviewer subagent is instructed to truncate its own output at 12, with low-severity findings shunted to an "unsurfaced" appendix.
- `SKILL.md:289` — orchestrator's disposition loop caps at 12 per session; anything beyond is logged to `eval-findings.json` as unsurfaced and never reaches the user.

On complex multi-screen audits the 13th-Nth medium-severity finding never surfaces as a disposition decision. The user only sees them buried in JSON, which in practice means they don't see them at all.

## Inferred rationale for the existing cap

Not stated in current SKILL.md, but plausibly:

- `AskUserQuestion` fatigue — 12 sequential dispositions is already a meaningful amount of user clicks.
- Context-window bloat — keeps the per-session token footprint bounded.
- Forced prioritization — high+medium only, low findings as appendix.

These remain valid concerns at the **default** depth; what's missing is user agency to opt out.

## Solution direction

Introduce a **depth control** with two coexisting surfaces:

1. **`--depth shallow|standard|deep` flag** parsed at Phase 0, alongside `--format` / `--non-interactive`.
   - `shallow` → cap = 5
   - `standard` → cap = 12 (current behaviour — no regression for existing users)
   - `deep` → uncapped (with a reviewer-side safety bound of 50 to keep JSON emissions sane)
   - **Default**: unset → triggers the adaptive gate (below).
2. **Adaptive `AskUserQuestion` gate** at end of Phase 4 reviewer pass, fired only when `--depth` was not set on CLI.
   - Reviewer returns `N` total high+medium findings → prompt: *"Reviewer surfaced N findings. How many to disposition?"*
   - Options: **Top 5** / **Top 12 (Recommended)** / **All N**
   - In `--non-interactive` mode: auto-pick **Top 12 (standard)** per the canonical Recommended-pick contract; log to OQ buffer.

Flag overrides prompt. If the user passes `--depth shallow`, no prompt fires.

## User journeys

**J1 — Power user, complex audit (deep).** User runs `/design-crit https://app.example.com --depth deep`. Reviewer surfaces 27 high+medium findings. All 27 are dispositioned via paginated AskUserQuestion batches. Nothing is hidden in `eval-findings.json` unsurfaced.

**J2 — Quick triage (shallow).** User runs `/design-crit ./wireframes --depth shallow` for a 30-second sanity-check before a demo. 5 dispositions, fast walk-through.

**J3 — Default-path adaptive.** User runs `/design-crit ./prototype` (no flag). Reviewer returns 18 findings. Gate fires: "18 findings. Top 5 / Top 12 (Recommended) / All 18?". User picks "All 18" for this complex prototype but might pick "Top 12" on the next run with a simpler one.

**J4 — Non-interactive CI run.** Caller (a script or wrapping skill) invokes with `--non-interactive`. No flag set. Gate auto-picks Top 12 (standard); the choice is recorded in the OQ buffer so the script's caller can review what was capped.

## Out of scope

- Severity rubric changes (still A/B/C/D rubric per `reference/eval.md`).
- PSYCH/MSF Phase 5 caps (Phase 5 has no equivalent 12-cap; separate concern).
- Reviewer-pass logic itself (only output-cap and disposition-cap are in scope).
- Per-category caps (no "max 3 contrast findings"; we cap on total only).
- Backwards compat: the **default behaviour with no flag and no gate answer** must still produce ≤12 dispositions; this is the prior-art "standard" path. The gate only fires when `--depth` is unset, and standard is the Recommended pick, so the default-default is `standard` even when no one's around.

## Acceptance criteria

The produced skill must conform to `skill-patterns.md §A–§F` (skill-eval will gate). Specifically:

- §A: frontmatter `argument-hint` enumerates `--depth shallow|standard|deep`.
- §B: triggering description unchanged (the depth control is invisible at trigger time).
- §C: progressive disclosure preserved — depth-resolution logic stays in Phase 0/4, not promoted to a separate reference file (too small).
- §F: scripts/tooling unaffected — `assets/capture.mjs` is untouched.

Plus skill-specific acceptance:
- An anti-pattern entry added forbidding **silent capping**: even at `standard` depth, the unsurfaced count MUST be printed to chat (`N findings surfaced, M unsurfaced — see eval-findings.json`) so the user can decide whether to re-run at `deep`.
- The `--non-interactive` auto-pick path MUST log the chosen depth to the OQ buffer.

## Release prerequisites (for /complete-dev, not /execute)

- pmos-toolkit minor version bump (2.51.0 → 2.52.0).
- 4-file manifest version sync (per repo `CLAUDE.md ## Plugin manifest version sync`).
- Changelog entry: "feat(design-crit): add `--depth shallow|standard|deep` flag + adaptive Phase 4 disposition gate; deep mode lifts the 12-finding cap."
- No README row change needed (skill row already exists; behaviour change documented in changelog).
