---
title: "/design-crit depth control — Spec"
mode: skill-feedback
tier: 2
output_format: md (streamlined-inline override)
input: 01_requirements.md
---

## FRs (derived from skill-patterns.md §A–§F + requirements doc)

### FR-DC-DEPTH-01 — flag parsing
Parse `--depth <shallow|standard|deep>` from the argument string at Phase 0, after `--format` resolution and before the existing non-interactive block runs. Last flag wins on conflict (mirrors `--format` / `--non-interactive` convention). Unknown value → stderr `--depth must be one of: shallow, standard, deep (got '<v>')`, exit 64. Absent flag → `depth_source = "default"` (the gate in FR-DC-DEPTH-04 fires later).

### FR-DC-DEPTH-02 — effective_cap resolution
Resolve `effective_cap` from the resolved depth value:
- `shallow` → 5
- `standard` → 12
- `deep` → `null` (sentinel meaning "uncapped")

### FR-DC-DEPTH-03 — stderr log line
At Phase 0 entry, after `output_format:` and `mode:` lines, print exactly: `depth: <value|unset> (source: cli|default) -> cap=<N|uncapped>` once.

### FR-DC-DEPTH-04 — adaptive Phase 4 gate
At the end of Phase 4 reviewer pass, after the reviewer subagent returns and before the disposition loop begins:
- If `depth_source == "cli"` → skip the gate; the resolved `effective_cap` from FR-DC-DEPTH-02 applies directly.
- Else (`depth_source == "default"`):
  - Count `N = high+medium findings returned by the reviewer`.
  - If `mode == non-interactive` → auto-pick `standard` per the canonical Recommended-pick contract; append an entry to the OQ buffer with the deferred choice.
  - Else → issue one `AskUserQuestion`:
    - **question**: `"Reviewer surfaced <N> findings. How many to disposition?"`
    - **header**: `"Depth"`
    - **options** (in order): `"Top 5 (shallow)"` / `"Top 12 (standard, Recommended)"` / `"All <N> (deep)"`
  - User pick → set `effective_cap` accordingly (5 / 12 / null).
- `N ≤ 5` → skip the gate regardless; `effective_cap = N` (no need to ask when nothing would be capped).

### FR-DC-DEPTH-05 — cap application (reviewer-side bound)
The Phase 4 reviewer subagent prompt must be parameterised so it instructs the reviewer to:
- When `effective_cap` is resolved before reviewer dispatch (i.e., `depth_source == "cli"`) → "cap output at `<effective_cap>` high+medium findings".
- When `effective_cap` is not yet resolved (`depth_source == "default"`, gate will fire after) → "cap output at 50 high+medium findings" (a generous safety bound; the orchestrator slices further once the user picks a depth).
- When `effective_cap == null` (deep, resolved at CLI) → "cap output at 50" (same safety bound — keeps reviewer JSON emissions sane; in deep mode 50 is rarely hit and effectively means uncapped).

### FR-DC-DEPTH-06 — cap application (orchestrator side, Phase 4a)
The Phase 4a disposition loop applies `effective_cap` to the surfaced-to-AskUserQuestion set:
- Sort returned findings by `severity desc, then by file-order`.
- Take first `effective_cap` entries (or all entries when `effective_cap == null`).
- Log the rest as unsurfaced in `eval-findings.json` (preserve current behaviour).

### FR-DC-DEPTH-07 — anti-silent-cap chat line
After Phase 4a completes, print to chat exactly: `<N_surfaced> findings surfaced for disposition, <M_unsurfaced> unsurfaced — see {out_dir}/eval-findings.json` where `M_unsurfaced` may be 0 (in deep mode, or when N ≤ effective_cap). Must fire in all modes including `--non-interactive`.

### FR-DC-DEPTH-08 — frontmatter `argument-hint`
SKILL.md frontmatter `argument-hint` extends with `[--depth shallow|standard|deep]` in the conventional position (between `--format` and `--non-interactive`).

### FR-DC-DEPTH-09 — Platform Adaptation
"## Platform Adaptation" gains a bullet: `**No interactive prompt tool:** depth defaults to standard (cap=12) when --depth is not explicitly set on CLI.`

### FR-DC-DEPTH-10 — Anti-pattern entry
"## Anti-patterns" gains an entry: `**Silently capping findings.** Even at standard depth, the FR-DC-DEPTH-07 surfaced/unsurfaced chat line MUST fire so the user can decide whether to re-run at deep. Treating the cap as a quiet truncation hides medium-severity friction that the rubric explicitly flagged.`

## Files touched
- `plugins/pmos-toolkit/skills/design-crit/SKILL.md` (frontmatter line 5; Phase 0 between L58 and the non-interactive block; Phase 4 L262; Phase 4a L289; Platform Adaptation L33 area; Anti-patterns L422 area).
- No `reference/` changes. No `assets/` changes.

## Test surface (informal — no fixture suite for /design-crit; relying on skill-eval + /verify)
- `skill-eval-check.sh` `[D]` checks must continue to pass (frontmatter shape, body shape, learnings phase, etc.).
- `skill-eval` `[J]` checks pass: §A frontmatter argument-hint enumeration; §C progressive disclosure preserved.
- Manual: invoke `/design-crit --depth garbage` → expect exit 64.
- Manual: invoke `/design-crit --depth shallow` → expect cap=5, no gate fires.
- Manual: invoke `/design-crit` (no flag) → expect gate to fire after reviewer pass.

## Release prerequisites
Per `01_requirements.md` § Release prerequisites — pmos-toolkit 2.51.0 → 2.52.0; 4-file manifest sync; changelog entry. `/complete-dev` writes these, not `/execute`.
