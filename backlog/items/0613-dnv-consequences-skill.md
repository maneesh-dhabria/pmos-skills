---
schema_version: 1
id: 0613-dnv
kind: epic
title: /consequences — simulate 1st/2nd/3rd-order effects of a proposal (Futures Wheel), then grill the user to refine it
type: feature
priority: should
status: defined
route: skill
feature_folder: docs/pmos/features/2026-06-13_consequences-skill/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-13_consequences-skill/02_design.html
labels: [pmos-toolkit, consequences, review, foresight, grill-family]
created: 2026-06-13
updated: 2026-06-13
released:
---

## Context

A new pmos-toolkit skill in the same adversarial-review family as `/grill`. Given a proposal document (a file path, a pipeline-doc stem like `01_requirements`/`02_spec`, or inline text), `/consequences` **simulates the downstream effects of the proposal** — first-order, second-order, and third-order — using the **Futures Wheel / Implications Wheel** method (Jerome Glenn, 1971) and recursive second-order "and then what?" thinking across a product lens set, then **uses the surfaced consequences to interrogate the user** one question at a time (grill-style, each with a recommended answer) to help them refine and de-risk the proposal.

Where `/grill` walks a proposal's *internal* decision tree ("is this defensible?"), `/consequences` walks its *external* ripple tree ("and then what?"). Siblings, orthogonal to the pipeline, usable on any artifact at any time.

Singleton epic (D18) wrapping one build story — a single brand-new skill. Route: skill.

Design contract: `docs/pmos/features/2026-06-13_consequences-skill/02_design.html`.

### Maintainer decisions captured at define (2026-06-13)

- **Name** (D0): `/consequences` — chosen over `/nth-order-effects` (the original proposal), `/ripple`, and `/and-then-what`. Self-explanatory for a cold invocation.
- **Prioritization** (D1): *score every notable effect, then grill broadly* — tag each effect likelihood (H/M/L) × impact (H/M/L) × desirability (good/bad/mixed); order the interrogation by leverage but do NOT aggressively filter to a top-N. Chosen over raw LLM-judgment and over top-risk-only filtering.
- **Visual output** (D2): *tree-only, no SVG Futures-Wheel diagram* — the nested consequence list is the reliable primary; headless SVG generation is fragile (per prior `/logos`, `/frameworks` learnings).
- **Grill relationship** (D3): *standalone sibling, own interrogation loop, no `_shared/` extraction in v1* — cites `/grill` as prior art; keeps a 1-skill epic a 1-skill epic. Future DRY extraction noted out-of-scope.
- **Method** (D4): Futures Wheel + recursive "and then what?" across an adapted-STEEP product lens set (Users, Business, Team/Org, Technical, Market, Ethics/Risk).
- **Depth dial** (D5): reuse `/grill`'s `--depth brief|standard|deep` (branching breadth) plus `--orders 1|2|3` default 3 (recursion ceiling).
- **Keep it lean** (D6): the shipped `SKILL.md` must be as simple/short as `/grill`'s (~184 lines) — describe the method at a high level and rely on model intelligence to simulate. NO verbose step-by-step simulation recipe, scoring formula, or enumerated procedure in the skill body. The design doc holds the rationale; the skill stays terse.

## Acceptance Criteria

- [ ] A registered, eval-passing pmos-toolkit skill `/consequences` exists at `plugins/pmos-toolkit/skills/consequences/SKILL.md` (passes `skill-eval.md`, floor 43/47; frontmatter `name: consequences` matches dir; argument-hint flags all handled in the body).
- [ ] **Intake** accepts a file path, a pipeline-doc stem (resolved via `_shared/resolve-input.md`), or inline text/URL (ask-for-paste fallback); the skill summarizes the proposal in 3–5 bullets and confirms the read before simulating.
- [ ] **Simulation** (Futures Wheel): generates first-order effects across the adapted-STEEP product lens set, then recursively derives second- and third-order effects via "and then what?", capped by `--orders` (default 3) with breadth governed by `--depth` (brief/standard/deep, same semantics as `/grill`); convergent chains are merged.
- [ ] **Scoring**: every notable effect is tagged likelihood (H/M/L) × impact (H/M/L) × desirability (good/bad/mixed); the interrogation is ordered by leverage (high-impact + uncertain/negative first) but surfaces every notable effect, not a filtered top-N (D1). No numeric arithmetic (qualitative tags only).
- [ ] **Consequence map** is presented to the user (chat + saved report) BEFORE interrogation, as a scored nested 1st→2nd→3rd-order tree.
- [ ] **Grill loop**: one `AskUserQuestion` per notable effect (leverage-ordered), each tying the ripple to a refinement (mitigate / accept / design-around / invalidate) with a recommended answer + alternatives + Elaborate + Skip; branches on the answer (a mitigation can spawn a new chain; a surprise can insert a missed effect); code-answerable questions are resolved by grep/read, not asked; deep mode has no question budget (same stop rules as `/grill`).
- [ ] **Report** (optional save, `--save`/`--no-save` + `output_format`): a single self-contained HTML doc — scored consequence tree + interrogation transcript + refinements/residual-risks summary — authored through `_shared/html-authoring/` (inline-comments overlay, `pmos:skill` meta, asset prefix, cache-bust, kebab heading ids, sections.json, index regen). **Tree-only — no SVG diagram** (D2).
- [ ] **Conventions**: `--non-interactive` honored per the W14 contract (canonical inline block; per-consequence questions are `defer-only` like `/grill`'s free-form questions); §H–§L satisfied; §L dispatch documented (inline default + optional code-explore helper). Release prerequisites listed under the spec's `## Release prerequisites` only, NOT as `/execute` wave tasks.
- [ ] **Lean body** (D6): the SKILL.md is comparable in length and simplicity to `/grill`'s (~184 lines); it describes the simulation method at a high level and relies on model intelligence rather than transcribing a step-by-step algorithm, scoring formula, or enumerated procedure. A bloated, over-specified body fails this AC even if functionally complete.

## Stories

- `0613-fzy` — Author the `/consequences` skill end-to-end (singleton build story). route: skill.
