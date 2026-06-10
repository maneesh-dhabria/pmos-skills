# repo-shape-detection.md — skill-location & target_platform resolver

`/feature-sdlc` Phase 0d runs this resolver once per skill-authoring run and produces
two of the three resolved values — the **skill-location path** (where the new/revised
`SKILL.md` lives) and the **target_platform** (which `skill-eval.md` group-10.F
checks apply, and what `--target` to pass `skill-eval-check.sh`). The third value, the
**tier**, is `skill-tier-matrix.md`. Both outputs read the same one-time repo-shape
probe (a glob of the host repo root + a check for a `CLAUDE.md`/`AGENTS.md`/`GEMINI.md`
skill-path rule).

## (b) Skill-location path — detection order (first match wins)

1. **Host repo `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` has an explicit skill-path
   rule** → use it verbatim. (This repo's `CLAUDE.md` does — see the "Canonical skill
   path" section: `plugins/pmos-toolkit/skills/<name>/SKILL.md`.)
2. **A `plugins/<p>/.claude-plugin/plugin.json` is present** → the skill goes to
   `plugins/<p>/skills/<name>/SKILL.md`. If more than one plugin directory matches,
   `AskUserQuestion` which plugin: one option per plugin (path + last-modified
   time), plus `Other…`; carry `(Recommended)` on the most-recently-modified plugin.
3. **A `.agents/` dir is present** → `.agents/skills/<name>/SKILL.md`.
4. **Else** (a `.claude/skills/` dir, or nothing) → `.claude/skills/<name>/SKILL.md`,
   with a noted assumption recorded in the `skill-tier-resolve` phase entry (E16 — no
   hard failure; the user can correct it).

## (c) target_platform — from the same probe

- A `plugins/<p>/.claude-plugin/` shape, or a `.claude/` shape → `claude-code`.
- A `.agents/` dir plus an `agents/openai.yaml` (or a Codex-style `agents.md`
  convention) → `codex`.
- Ambiguous, or a bare repo with none of the above → `generic`.

The resolved `target_platform` is mirrored into the `--target` flag passed down to
`skill-eval-check.sh` and gates `skill-eval.md` group 10.F: `claude-code` → the
`f-cc-*` checks apply; `codex` → `f-codex-sidecar` applies; `generic` → group 10.F is
skipped entirely (intersection-only).

## Dogfooding note

Inside the pmos-toolkit repo the probe sees both signals: `CLAUDE.md` carries the
explicit canonical-path rule (rung 1 wins) → `plugins/pmos-toolkit/skills/<name>/SKILL.md`,
and the `plugins/pmos-toolkit/.claude-plugin/plugin.json` shape → `target_platform:
claude-code`. `/execute` additionally reads this repo's `CLAUDE.md` for the
two-manifest version-sync rule and the `/complete-dev` release-entry rule. There is no
conflict — rung 1 (the explicit `CLAUDE.md` rule) and the plugin-manifest probe agree.

## Output

Both resolved values — skill-location path and `target_platform` — are recorded in the
`skill-tier-resolve` phase entry of `state.yaml`, and surfaced together with
the resolved tier in the single Phase-0d confirmation prompt. The user can
override either in that prompt.
