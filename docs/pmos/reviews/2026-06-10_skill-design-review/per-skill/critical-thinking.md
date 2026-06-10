# critical-thinking — review

**Grade:** A-
**Size:** SKILL.md 93 lines (93 excluding non-interactive block — it has none); references 3 files / 136 lines (exercise-shapes 51, scorecard-schema 54, grading-rubrics 31); target ~78 lines.

## TL;DR

- **Biggest win available:** the same degradation rule ("don't crash on scorecard I/O, fall back to inline JSON") is stated four times (Phase 0.4, Phase 4.2, Platform Adaptation, Anti-Pattern 7) and the repo-exercise cap is stated three times (Phase 0.3, Phase 2.5, Anti-Pattern 3). Deduplicating to one statement each saves ~12 lines and removes the only register where this skill stops trusting the model.
- **Biggest risk in current design:** the calibration/Brier feature — the scorecard's headline "are you improving" metric — has no realistic path to ever accumulating outcomes for invented scenarios (shape 7 hand-waves "capture {p, outcome} when known"). The feature will sit at `brier: null` for most users forever.
- **Done well, worth keeping:** this is the plugin's best Pocock citizen and the answer to "under-specified?" is no. `grading-rubrics.md` is a textbook philosophy-plus-anti-pattern file (score the moves not the pick; no pure praise; probe instead of just marking down) — the exact structure of Pocock's `tdd` skill. References are one hop deep, loaded per phase; scripts are zero-dep node stdlib with honest degradation; runtime scenario generation (no template bank) keeps the skill durable as models improve.

## Findings

1. **[V] Quadruple-stated scorecard degradation.** Phase 0.4 ("If node is unavailable… fall back to reading… Do NOT crash"), Phase 4.2 ("On node-unavailable, merge + write the JSON yourself"), Platform Adaptation ("No `node`: … read/write the scorecard JSON inline and compute Brier… directly"), and Anti-Pattern 7 ("Crashing on scorecard I/O… Always degrade gracefully") all say the same thing. `scorecard-schema.md` §Degradation says it a fifth time. Why it matters: defensive repetition is the one Pocock-style smell in an otherwise lean file, and it teaches future editors that rules here must be restated to be believed. Fix: keep the Platform Adaptation line as the single canonical statement; reduce Phases 0/4 to "via `scripts/scorecard.js` (degradation: see Platform Adaptation)"; delete Anti-Pattern 7.

2. **[G] Calibration outcomes are structurally uncollectable.** Shape 7 (`exercise-shapes.md` §7) elicits `p` for a *generated fictional* scenario, then says "Outcome is the user's own later judgment or a stated resolution; capture `{p, outcome}` when known." For an invented experiment there is no resolution, and no later-session mechanism revisits open predictions. `calibration.brier` (scorecard-schema.md) will stay `null` indefinitely — yet the description sells "an accumulating per-muscle **+ calibration** scorecard so you can see yourself improve." Fix (small): make shape 7 resolve within the exercise — after the user commits `p`, reveal the scenario's stated resolution (the generator invents one up-front, hidden) and record the pair; or restrict calibration to bring-your-own real predictions and say so. Either is a 3-line edit to exercise-shapes.md §7.

3. **[R] Phase 0.3 contradicts itself and is the densest prose in the file.** One 9-line step mixes README detection, a "propose a reusable README.md (offer to write it)" side quest, and "**Read-only otherwise**" — a sentence that promises read-only three lines after offering a write. The README-propose behavior is a deliberate decision (rework item A2 in `docs/pmos/features/2026-05-29_critical-thinking/RESUME_NOTES.md`, replacing a static problem-archetypes bank), so don't delete it — but a practice-gym skill mutating the host repo is surprising enough that it deserves its own short paragraph with the consent framing first ("offer; never write unasked"), and "read-only otherwise" scoped explicitly to *secrets and everything else*. Fix: split step 3 into "derive framing" (3 lines) + "no README → offer to propose one" (2 lines); move the cap/guardrails into Phase 2 where the cap already lives.

4. **[P] Phase 2 mix engine over-specifies the shuffle.** Five numbered rules including an LRU tie-break ("tie-break by least-recently-used shape from `sessions[].shapes`") and two overlapping no-repeat rules (rule 3's "never repeat until pool exhausted" already implies "no two consecutive" except in marathon overflow). The failure mode being prevented is real and named (Anti-Pattern 5: serving the same 2 shapes every session), but WHAT+WHY would survive better than this pseudo-algorithm: "weight toward the weakest muscles from the scorecard, spread across the three groups, and vary shapes — never the same shape twice in a row, prefer least-recently-used." Same behavior, half the lines, no fake determinism (the "deterministic-with-rotation" label is aspirational anyway — the model is doing the selection).

5. **[S] Zero `_shared/` usage — and that's mostly correct.** The skill touches only `~/.pmos/learnkit/critical-thinking/`, needs no docs_path/output_format (no artifact emit), no topic-research, no html-authoring. Its hand-rolled one-line AskUserQuestion degradation is *cheaper* than a hop to `_shared/interactive-prompts.md`, which playbook pays. One genuine inconsistency at plugin level: frameworks/magazine/primer inline the canonical non-interactive block; critical-thinking and playbook don't, and the lint (`plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh`) only covers pmos-toolkit, so nothing arbitrates. For a practice gym, non-interactive mode is meaningless — the right move is an explicit one-line refusal marker (the toolkit `<!-- non-interactive: refused -->` idiom), not the block. One line buys plugin-wide consistency.

6. **[F] `--no-repo` could be natural language.** It's discoverable (argument-hint) and cheap, but "don't use my repo" works identically and Pocock's no-flags posture (criteria north-star #5) applies cleanly to a skill this conversational. The positional band argument (`quick|standard|deep|marathon`) is good — it's vocabulary, not a flag, and Phase 1 confirms instead of re-asking. Verdict: keep both, but document in the description that plain English works too — zero-cost.

7. **[Ph] Phase structure earns its keep.** Six integer phases mapping to a real session lifecycle (setup → size → plan → loop → summarize → reflect); no fractional phases; Phase 5 (Capture Learnings) is the house convention. Marathon's "uncapped, re-prompt every ~3" looks arbitrary but is a confirmed design decision (D2, `RESUME_NOTES.md` line 166). No change.

## Flags inventory

| Flag | Purpose | Verdict |
|---|---|---|
| `quick\|standard\|deep\|marathon` (positional) | pre-select the time band, skipping the Phase 1 ask | keep — vocabulary, not a flag; confirmed not re-asked |
| `--no-repo` | suppress repo-derived scenario framing | keep, but note natural language ("stay generic") works too |

## Gates & rubrics inventory

| Check | Hard or soft | Failure it catches | Verdict |
|---|---|---|---|
| Universal grading rule (FR-7, grading-rubrics.md): score moves not the pick; always name ≥1 gap; no pure praise | hard (per-answer) | mushy-praise grading that trains nothing — the product's core failure mode | keep-hard; this IS the skill |
| Repo-exercise cap (≤2) + ≥1–2 generic floor | hard | a session hijacked by repo context; biased/unusable scenarios from infra repos | keep-hard, state once (Phase 2) instead of thrice |
| Mix-engine rotation rules (no repeat until pool exhausted; no consecutive same-shape; LRU tie-break) | hard-as-written | rut of repeating the same 2 shapes (Anti-Pattern 5) | soften to principle — keep "never consecutive + weight weak muscles", drop the LRU pseudo-algorithm |
| Scorecard I/O never fatal (reseed on corrupt) | hard | a corrupt JSON killing a practice session | keep-hard, state once; implementation already in scorecard.js `load()` |
| Marathon re-prompt every ~3 | soft | runaway sessions | keep (D2-confirmed) |
| Secrets guardrail (never read .env / echo tokens) | hard | leaking secrets into generated scenarios | keep-hard |

## Fix list

| Fix | Type | Impact | Risk |
|---|---|---|---|
| Deduplicate scorecard-degradation rule to one statement (delete Anti-Pattern 7, trim Phases 0.4/4.2) | quick-win | med | none |
| Resolve calibration outcomes in-exercise (generator pre-commits a hidden resolution) or scope Brier to bring-your-own | structural | high | low — 3-line reference edit, schema unchanged |
| Split Phase 0.3 into framing vs README-offer; scope "read-only" to secrets explicitly | quick-win | med | none |
| Collapse mix engine rules 1–5 into a 3-line principle | quick-win | med | low — behavior preserved; drops fake determinism |
| Add `<!-- non-interactive: refused -->`-style marker for plugin consistency | quick-win | low | none |
