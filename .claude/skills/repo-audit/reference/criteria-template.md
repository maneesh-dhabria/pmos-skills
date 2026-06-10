# Skill-design review criteria — TEMPLATE

Instantiate this into the run folder as `criteria.md`. Replace every `<...>` placeholder; verify every named file/lint still exists at audit time (these go stale between audits). The 2026-06-10 instantiation lives at `docs/pmos/reviews/2026-06-10_skill-design-review/criteria.md` if you want a filled-in example.

---

# Skill-design review criteria

Shared rubric for the <DATE> architecture & skill-design review of <PLUGINS>. Every reviewer (human or agent) applies this rubric so findings are comparable across skills.

## The question being asked

<One paragraph: the maintainer's actual worry, in their words. This frames every reviewer's judgment. Include the aggressiveness decision: style-only, or machinery-on-the-table.>

## Style north star (read these before reviewing)

Read at least these exemplars from <NORTH_STAR_CLONE_PATH>:

- <3–5 exemplar files, each with one line on WHY it's an exemplar — e.g. "a 6-phase process skill under 160 lines that spends its words on the ONE thing that matters", "how a BIG skill stays small: glossary + principles + heavy lifting in reference files loaded on demand", "five lines; the entire skill">

What makes the style work:

1. **States WHAT and WHY; trusts the model with HOW.** Prescribes exact procedure only where deviation is a known failure mode — and then explains why.
2. **Small.** Target SKILL.md sizes and the reference repo's own norms: <fill in>.
3. **Progressive disclosure.** References one level deep, loaded only when the branch is taken.
4. **Durable.** No stale-prone details; built so model upgrades make the skill BETTER, not stale.
5. **Config externalized / natural-language invocation** over flag surfaces.
6. **Reads like a clear essay**, not a legal contract.

## Review dimensions (apply all 8 to each skill)

1. **Verbosity** — load-bearing vs ballast fraction; estimate a realistic target line count. Ballast: restating what a capable model does anyway, repeated context, defensive over-specification.
2. **Prescriptiveness** — where HOW is dictated when WHAT+WHY would survive model upgrades better: hardcoded subagent prompts, exact wording mandates, numeric caps with no stated failure mode, prose state machines the model can't execute.
3. **Shared-substrate use** — duplicated logic that lives (or should live) in `_shared/`. Name the duplication concretely: which skills, how many lines, has it drifted.
4. **Readability as prose** — could the maintainer hand this to a colleague? Note incoherence from incremental edits: orphaned references, contradictions, register shifts.
5. **Flags** — list every flag: discoverable? well-named? could it be natural language? dead?
6. **Phases** — structure earning its keep? Fractional/lettered insertions (0c, 7.5) are accretion smells. Could phases collapse into principles?
7. **Cross-platform** — works on any skills-standard agent? Hard tool dependencies without degradation paths? Do platform-adaptation notes match what the skill actually does?
8. **Gates, rubrics, checks** — inventory each: what failure does it catch, what does it cost, verdict keep-hard / soften-to-advisory / delete / move-to-script. Recommendations must name the failure mode that becomes possible if removed. Policy line that has held up: *deterministic = hard gate, judgment = advisory, arithmetic = script*.

## Repo machinery — don't misflag

<List the repo's enforced contracts that are NOT prose ballast, each with its enforcing lint/test, VERIFIED to exist at audit time. As of 2026-06: the inline non-interactive block (lint: plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh), (Recommended)/defer-only markers (plugins/pmos-toolkit/tools/audit-recommended.sh), the HTML-artifact emit contract (fanout.test.sh / check-comments-coverage.sh), canonical path + name=dir. Question them strategically under dimension 8, but don't count them as verbosity.>

## Per-skill output contract

Write findings to `<RUN_FOLDER>/per-skill/<skill>.md` with exactly these sections:

```markdown
# <skill> — review

**Grade:** A–F (would a thoughtful reviewer call this well-designed for its job?)
**Size:** SKILL.md <n> lines (<m> excluding enforced contract blocks); references <n> files / <m> lines; target ~<k> lines.

## TL;DR
3 bullets: biggest win available, biggest risk in current design, one thing done well worth keeping.

## Findings
Numbered, ordered by impact. Each: dimension tag [V|P|S|R|F|Ph|X|G], what+where (quote or section ref), why it matters, concrete fix.

## Flags inventory
Table: flag | purpose | verdict (keep / rename / fold into natural language / delete).

## Gates & rubrics inventory
Table: check | hard or soft | failure it catches | verdict (keep-hard / soften / delete / move-to-script).

## Fix list
Table: fix | type (quick-win / structural) | impact (high/med/low) | risk.
Quick-win = mechanical, no behavior change a user would notice, no contract touched.
```

Grades: A = ship as-is, B = minor trims, C = meaningful rewrite would pay off, D = structure fights the model, F = redesign.

## Calibration

- Be specific. "Too verbose" is useless; "Phase 4's 40-line reviewer prompt could be 6 lines of intent" is useful.
- Steelman the existing design first. Check `docs/pmos/features/` for a rule's origin when it looks arbitrary — cite the feature folder if found.
- A skill that is long because the DOMAIN is complex is different from one that is long because it doesn't trust the model. Say which.
- Don't propose deleting behavior the pipeline depends on (other skills invoking this one with specific arguments) without flagging the coupling.
