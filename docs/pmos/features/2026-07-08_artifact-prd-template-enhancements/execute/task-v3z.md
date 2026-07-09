# Execute log — story 260709-v3z (§2 problem-framing blocks)

**Epic:** 260708-esq · **Route:** skill · **Plugin:** pmos-toolkit · **Branch:** feat/260709-v3z
**Dep:** [260708-j79] (`done`) — merged into this worktree first (D9) so the post-j79 renumbered §1–§15 base
(§8 = "Motivation, Friction & Satisfaction") is present. Disjoint from 260708-9xh (§2 vs §6/SKILL.md).
Touches only `plugins/pmos-toolkit/skills/artifact/templates/prd/{template.md,eval.md}`.

## Tasks (serial T1→T5)

- **T1 study** — confirmed the dep-merge landed the renumbered base (§8 = MSF), pinned the §2 insertion point
  (after JTBD, before §3), captured the §8-MSF guidance voice + the §2 eval item schema.
- **T2 HMW block** — retitled §2 → "Problem, Customer & Framing"; added a **How Might We** sub-head (`tier: both`)
  with guidance: 1–3 "How might we…" reframes that open a solution space, one worked good/bad micro-example, the
  "no solution in the HMW" rule, a single-line lite variant. References /shape's FRAME discipline (§K), does not
  restate it. Segment/JTBD line kept intact.
- **T3 WAYRTTD block** — added a **What are you really trying to do?** sub-head (`tier: both`): assumed solution →
  climb to real goal → re-test → one-word proceed/reconsider/pivot verdict, one compact paragraph; a two-sentence
  lite variant. References that /wayrttd runs the ladder live upstream (§K), does not restate it.
- **T4 eval mirror** — retitled eval §2 heading in lockstep (INV-2); added `hmw-present` + `wayrttd-gutcheck`
  (both `kind: judgment`, `severity: medium`, `tier: [lite, full]`) after `no-solution-language`; kept
  `segment-and-jtbd`. No §N≥3 eval heading changed.
- **T5 verify** — see Gates.

## Gates
- **INV-2** template ↔ eval `## §N` heading lists **1:1 identical** (15 each; full-header diff empty). Only the §2
  heading text changed, in both files in lockstep; no §N≥3 heading touched → no renumber (AC4, D10). 9xh's §6
  back-link untouched (§6 heading byte-unchanged).
- **Eval** both new ids present, `kind: judgment`; no duplicate eval ids; file parses.
- **Diff scope** only `templates/prd/{template.md,eval.md}` (+ this execute log). `artifact/SKILL.md`, `_shared/`,
  `skills/shape/`, `skills/wayrttd/` all **byte-unchanged**.
- **skill-eval** `[D]` `skill-eval-check.sh --target claude-code`: **exit 0** (trivial pass — SKILL.md unchanged).
  `[J]` half: SKILL.md byte-unchanged from the released passing state → no instruction surface to judge, trivial
  pass. No `accepted_residuals`. (`audit-recommended` reads 17 calls / 0 Recommended here — v3z's base is main,
  which predates 9xh's Phase 3.6 Recommended prompt; expected, not a regression, since v3z touches no SKILL.md.)
- **4 hygiene lints** all PASS: `lint-phase-refs.sh`, `lint-flags-vs-hints.sh`, `audit-recommended.sh` (SKILL.md
  file), `lint-non-interactive-inline.sh` (60 skills match canonical).
- **Dogfood** (scratchpad only): good §2 renders HMW + WAYRTTD + retained JTBD; a solution-shaped HMW trips
  `hmw-present`, a non-climbing gut-check and a missing gut-check each trip `wayrttd-gutcheck`; lite variants render
  compact. All AC scenarios resolve.

All 7 acceptance criteria satisfied. Story → **done**.
