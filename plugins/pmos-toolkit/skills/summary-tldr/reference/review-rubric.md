# /summary-tldr — First-time-reader review rubric

This rubric is the gate run by the skill's Phase 5 (Review) via a reviewer sub-step before emit. It evaluates a candidate summary as if read by someone who never saw the source, then applies a borrowed slice of `/polish`'s writing checks. The reviewer sub-step is grounded in quoted source spans (see "Reviewer mechanics" below).

## Table of Contents

- Two groups, one split
- Group A — First-time-reader checks
- Group B — Inlined `/polish` writing checks
- The §H deterministic-vs-judge split
- Reviewer mechanics
- Remediation cap and signal surfacing

## Two groups, one split

The rubric has two groups of binary pass/fail checks. **Group A** judges whether the summary is a faithful, complete, standalone, assertive piece of prose. **Group B** is borrowed from `/polish` for surface writing quality. Every check carries a §H tag — `[D] deterministic` (regex/script-metric, auto-applied) or `[J] judge` (model-evaluated, surfaced per `_shared/findings-dispositions.md`). Deterministic checks auto-apply their verdict; judgment checks are surfaced to the user as findings rather than silently enforced.

## Group A — First-time-reader checks

Evaluated from the perspective of a reader with **no access to the original** (design `#review`). All are JUDGE-style except where a regex pre-filter exists.

| Check | Type | How to verify |
|---|---|---|
| Coverage | `[J] judge` | Extract the source keyfacts; for each, decide present/absent in the summary. Report matched-keyfacts / total-keyfacts as the coverage signal. A FAIL must cite the missing keyfact's verbatim source span. |
| Faithfulness | `[J] judge` | For every summary sentence, decide whether it traces to the source by scanning the 7 FineSurE error types (table below). Any sentence exhibiting an error type fails. A FAIL must cite a ≥40-char verbatim source quote. |
| Standalone | `[J] judge` | Read the summary cold: any dangling reference, undefined pronoun, or "as mentioned"-style pointer that needs the original to resolve is a FAIL. |
| Asserts, not describes | `[D]`+`[J]` | Regex-flag meta-description lead-ins; judge confirms. **HARD FAIL** on any meta-description. |
| Coherence | `[J] judge` | Read end-to-end: it must read as organized prose/bullets, not stitched fragments. Abrupt topic jumps or orphaned clauses fail. |

### FineSurE faithfulness error types

Faithfulness scans each summary sentence against these 7 types; any hit fails the sentence.

| # | Error type | One-phrase definition |
|---|---|---|
| 1 | Entity error | a subject/object in the summary is wrong or absent from the source |
| 2 | Predicate error | the relation/verb misstates what the source asserts |
| 3 | Circumstance error | wrong time, place, manner, or condition around an otherwise-correct claim |
| 4 | Coreference error | a pronoun or reference resolves to the wrong (or no) antecedent |
| 5 | Discourse-link error | two clauses joined by a causal/temporal link the source never makes |
| 6 | Grammatical error | the sentence is ungrammatical or unparseable as written |
| 7 | Out-of-context error | a claim with no grounding anywhere in the source (hallucination) |

### Asserts, not describes (HARD FAIL)

Any sentence that *describes the source* instead of *stating its content* is a hard fail. Regex pre-filter on meta lead-in phrases — "this article discusses", "the document explains", "the post covers", "this piece talks about", "the author describes", "in this article" — then judge-confirmed. The fix is to **rewrite to the actual claim**: replace "This article discusses three pricing models" with the three pricing models themselves.

## Group B — Inlined `/polish` writing checks (decision D4)

These checks are **borrowed from `/polish`**; its `polish/reference/rubric.md` is the source of truth and the canonical home for their full definitions. The **voice-PRESERVATION machinery is dropped** here: a summary has no author voice to preserve (the no-author-voice delta), so the `PRESERVE_VOICE_CONFLICT` escape and voice-fidelity checks do not apply. Only the applicable surface-quality checks are inlined below.

### Concision

| Check | Type | How to verify |
|---|---|---|
| Clutter words | `[D] deterministic` | Regex for `very`, `really`, `just`, `actually`, `basically`, `simply`, `in order to`, `the fact that` — each match is a flag. |
| Hedging stacks | `[D] deterministic` | Regex count of hedges per sentence; 2+ in one sentence fails (`might`, `perhaps`, `possibly`, `seems`, `arguably`, `somewhat`, …). |
| Empty transitions | `[D] deterministic` | Regex for paragraph-initial `Furthermore`, `Moreover`, `Additionally`, `In addition`, `That said`. |
| Em-dash overuse | `[D] deterministic` | Script-metric: count em-dashes; cap is ≤1 per 200 words. |

### De-AI-slop

| Check | Type | How to verify |
|---|---|---|
| AI-vocabulary hard-bans | `[D] deterministic` | Regex for `delve`, `tapestry`, `navigate the landscape`, `embark on a journey`, `in the realm of`, `intricate tapestry` — any match fails. |
| Soft-flag vocabulary | `[J] judge` | Flag `robust`, `foster`, `ecosystem`, `holistic`, `leverage`, `seamless`, `intricate`, `multifaceted`; judge concrete-vs-metaphorical use — metaphorical fails. |
| Tricolon overuse | `[J] judge` | Judge for repeated rule-of-three constructions used as filler rhythm. |
| "not just X, it's Y" rhetoric | `[D] deterministic` | Regex for the `not just … , it's …` / `not only … but …` rhetorical frame. |

### Structure and clarity

| Check | Type | How to verify |
|---|---|---|
| Active voice (passive ratio) | `[D] script-metric` | Script computes passive-construction ratio; over threshold flags. |
| Sentence-length variance | `[D] script-metric` | Script computes length distribution; monotone runs flag. |
| Header inflation | `[J] judge` | Judge whether headers outnumber the content they organize. |
| Full-sentence-bullet abuse | `[J] judge` | Judge whether bullets are dense full-sentence paragraphs masquerading as a list. |
| Vague modifiers | `[J] judge` | Judge for unquantified `several`, `many`, `significant`, `various` where a number or concrete noun belongs. |
| Throat-clearing intro | `[J] judge` | The opening must state the bottom line immediately, no filler windup. **Overlaps** the Group-A "asserts, not describes" / front-load-the-conclusion rule — a throat-clearing intro is usually also a meta-description; flag it under both but de-dup the surfaced finding. |

## The §H deterministic-vs-judge split

Per §H, every check is tagged `[D] deterministic` (regex or script-metric) or `[J] judge`. **Deterministic checks auto-apply** — their verdict is computed and enforced without a model call. **Judgment checks are surfaced** to the user as findings per `_shared/findings-dispositions.md` (Fix-as-proposed / Modify / Skip / Defer, with `[Blocker]/[Should-fix]/[Nit]` severity), never silently mutated. The model never does arithmetic a script can do: coverage ratios, passive ratios, em-dash counts, and length variance are computed, not estimated.

## Reviewer mechanics

The Phase 5 reviewer sub-step follows `_shared/reviewer-protocol.md`; only the deltas are stated here.

- **Quote-grounded fails.** Any faithfulness or coverage FAIL must cite a ≥40-char **verbatim** source quote. A fail whose cited quote is not a verbatim substring of the source is treated as a **pass** (ungrounded objections are discarded, not actioned).
- **Section validation** and the reviewer input contract are inherited unchanged from `_shared/reviewer-protocol.md`.

## Remediation cap and signal surfacing

- **≤2-loop cap.** Remediation runs at most 2 loops; after that, residual findings are surfaced, never hidden.
- **Coverage/faithfulness signal.** The matched-keyfacts ratio (and any faithfulness error count) is surfaced to the user as an explicit signal alongside the emit.
- **Residual gaps are surfaced.** Anything still failing after the loop cap is reported to the user per `_shared/findings-dispositions.md`, never silently dropped.
