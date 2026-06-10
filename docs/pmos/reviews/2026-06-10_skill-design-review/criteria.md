# Skill-design review criteria

Shared rubric for the 2026-06-10 architecture & skill-design review of `pmos-toolkit` and `pmos-learnkit`. Every reviewer (human or agent) applies this rubric so findings are comparable across skills.

## The question being asked

The maintainer has built these skills incrementally over months. The worry: incremental edits have accreted into **verbosity, prescriptiveness, and incoherence** — instructions that micromanage the model instead of directing it. The north star is Matt Pocock's skills repo (cloned locally at `~/.cache/pocock-skills/`): minimal, principle-first instructions that stay useful as models improve.

## Style north star (read these before reviewing)

Read at least these exemplars from `~/.cache/pocock-skills/skills/`:

- `engineering/diagnose/SKILL.md` — a 6-phase process skill that stays under 160 lines. Note "**This is the skill.** Everything else is mechanical." — it spends its words on the ONE thing that matters and trusts the model for the rest.
- `engineering/tdd/SKILL.md` — teaches philosophy + one anti-pattern, then a 4-step loop. No gates, no rubric, a 5-item advisory checklist.
- `engineering/prototype/SKILL.md` — routes between two branches with one decision, 6 numbered rules, done.
- `productivity/grill-me/SKILL.md` — five lines. The entire skill.
- `engineering/improve-codebase-architecture/SKILL.md` — shows how he handles a BIG skill: a glossary, principles, 3 process steps, heavy lifting pushed to reference files loaded on demand.

What makes the style work:

1. **States WHAT and WHY; trusts the model with HOW.** Prescribes exact procedure only where deviation is a known failure mode (e.g., TDD's horizontal-slice anti-pattern) — and then explains why.
2. **Small.** Most SKILL.md files are 30–150 lines. His own checklist says "SKILL.md under 100 lines" (aspirational; his biggest is ~190).
3. **Progressive disclosure.** References one level deep, loaded only when the branch is taken.
4. **Durable.** No file paths/line numbers in emitted artifacts, no time-sensitive info, no model-specific hacks. Built so model upgrades make the skill BETTER, not stale.
5. **Config externalized.** No flags. A one-time setup skill writes per-repo docs; other skills read them. Invocation is natural language.
6. **Reads like a clear essay**, not a legal contract. A human can read any skill in 2 minutes and nod.

## Review dimensions (apply all 8 to each skill)

1. **Verbosity** — What fraction of SKILL.md is load-bearing vs ballast? Ballast: restating what any capable model does anyway ("read the file before editing it"), repeated context, defensive over-specification, exhaustive enumerations where one principle + one example would do. Estimate a realistic target line count.
2. **Prescriptiveness** — Where does it dictate HOW when WHAT+WHY would survive model upgrades better? Flag: hardcoded subagent prompts that could be intent statements, exact wording mandates, step sequences that are really just "be sensible", numeric caps (≤2 loops, ≤27 lines) without a stated failure mode they prevent.
3. **Shared-substrate use** — Does it duplicate logic that lives (or should live) in `plugins/*/skills/_shared/`? Look for: tier logic, reviewer-subagent loops, output_format/docs_path resolution, HTML emit boilerplate, interactive-prompt patterns, feature-folder conventions. Name the duplication concretely (which skills share it).
4. **Readability as prose** — Could the maintainer hand this to a colleague and have them follow it? Note incoherence from incremental edits: orphaned references, contradictory instructions, sections that assume context defined elsewhere, register shifts mid-file.
5. **Flags** — List every flag. For each: is it discoverable, well-named, described where users will see it? Could it be natural language instead ("--depth brief" vs "make it brief")? Are there flags that exist only because another skill passes them?
6. **Phases** — Is the phase structure earning its keep, or is it procedure-for-procedure's-sake? Flag fractional/lettered phases (0c, 7.5, 16.5) as incoherence smells — they signal insertion without re-thinking. Could some phases collapse into principles?
7. **Cross-platform** — Would this work on any skills-standard agent (Codex, Copilot, Gemini)? Flag hard dependencies on Claude-Code-only tools (AskUserQuestion, EnterWorktree, TodoWrite) without a degradation path; flag tool-name soup; check the platform-adaptation notes actually match what the skill does.
8. **Gates, rubrics, checks** — Inventory every embedded rubric, hard gate, lint, and self-eval loop. For each: what failure does it actually catch? What does it cost (lines, latency, brittleness, model-version coupling)? Recommend: keep-hard / soften-to-advisory / delete. Machinery is explicitly ON THE TABLE — but recommendations must name the failure mode that becomes possible if removed.

## Repo machinery — don't misflag

These are enforced contracts, not prose ballast. Question them strategically (dimension 8), but don't count them as "verbosity" line-noise:

- The **non-interactive block** (~27 lines between `<!-- non-interactive-block:start/end -->`) is byte-identical across skills by lint (`tools/lint-non-interactive-inline.sh`). Exclude it from verbosity counts; assess it once, globally.
- **`(Recommended)` option / defer-only tags** on AskUserQuestion calls — audited by `tools/audit-recommended.sh`.
- **HTML-artifact emit contract** (inline CSS, pmos-comments block, `<meta name="pmos:skill">`) across 14 surfaces — backed by tests.
- **Canonical path + frontmatter name=dir** — loader requirement.
- Skills were authored via `/skill-sdlc` and scored against `feature-sdlc/reference/skill-eval.md` (39 binary checks). The rubric itself is reviewable, but individual skills conforming to it is not a per-skill defect.

## Per-skill output contract

Write findings to `docs/pmos/reviews/2026-06-10_skill-design-review/per-skill/<skill>.md` with exactly these sections:

```markdown
# <skill> — review

**Grade:** A–F (would a thoughtful reviewer call this well-designed for its job?)
**Size:** SKILL.md <n> lines (<m> excluding non-interactive block); references <n> files / <m> lines; target ~<k> lines.

## TL;DR
3 bullets: biggest win available, biggest risk in current design, one thing done well worth keeping.

## Findings
Numbered, ordered by impact. Each: dimension tag [V|P|S|R|F|Ph|X|G], what+where (quote or section ref), why it matters, concrete fix.

## Flags inventory
Table: flag | purpose | verdict (keep / rename / fold into natural language / delete).

## Gates & rubrics inventory
Table: check | hard or soft | failure it catches | verdict (keep-hard / soften / delete).

## Fix list
Table: fix | type (quick-win / structural) | impact (high/med/low) | risk.
Quick-win = mechanical, no behavior change a user would notice, no contract touched.
```

Grades: A = ship as-is, B = minor trims, C = meaningful rewrite would pay off, D = structure fights the model, F = redesign.

## Calibration

- Be specific. "Too verbose" is useless; "Phase 4's 40-line reviewer prompt could be 6 lines of intent — the model knows how to review" is useful.
- Steelman the existing design first. Many caps/gates exist because something went wrong once (check `docs/pmos/features/` history for the skill when a rule looks arbitrary — cite the feature folder if you find the origin).
- A long skill that is long because the DOMAIN is complex (e.g., complete-dev's release mechanics) is different from a long skill that is long because it doesn't trust the model. Say which.
- Don't propose deleting behavior the pipeline depends on (other skills invoking this one with specific arguments) without flagging the coupling.
