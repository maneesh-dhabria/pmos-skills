# Execute log — story 260708-j79 (PRD template & eval content enhancements)

**Epic:** 260708-esq · **Route:** skill · **Plugin:** pmos-toolkit · **Branch:** feat/260708-j79
**Deps:** none. Touches only `plugins/pmos-toolkit/skills/artifact/templates/prd/{template.md,eval.md}`.

## Waves

### Wave 0 — renumber safety net (D5, INV-2) — done
- **T0.1** Grep for hardcoded PRD §-number refs outside `templates/prd/`: **none found**. The §N hits elsewhere in the artifact skill belong to *other* templates (discovery, experiment-design), the apply-edit spec (`§9.1/§9.2/§9.3` — a different doc's sections), or the generic `## §2` example in SKILL.md:129 (template-agnostic). Nothing hardcodes a PRD section by number → no external edits needed.
- **T0.2** Applied the D5 renumber: MSF inserted as §8; old §8–§14 → §9–§15 across BOTH template.md and eval.md in lockstep. Renumber done first so all additions land in final numbering.

### Wave 1 — §5 Doshi rework (ask 3, D6, INV-3) — done
- **T1.1** §5 body rewritten around exactly Doshi's six categories (Health, Usage, Adoption, Satisfaction, Ecosystem, Outcome — a `guidance` comment names them verbatim with "do not invent categories"); question-first flow (2–3 behaviour/outcome questions per applicable category → proxy metric with full spec); N/A-with-rationale for skipped categories; 3–5 KM + 3–5 LM designation; ≥1 guardrail retained. `tabular_schema` gained `Category` + `Answers question` columns; `Layer` kept as KM|LM|guardrail|counter.
- **T1.2** eval.md §5 added `metrics-doshi-categorized` (high), `metrics-question-first` (high), `km-lm-designated` (medium); retained baseline (precondition), mechanism, ratio, guardrail, owner/instrumentation.

### Wave 2 — §6 alternatives + falsifiable hypothesis (ask 2a, D2) — done
- **T2.1** §6 guidance adds a falsifiable if/then/because hypothesis tied to the §5 primary metric + an "Alternatives considered" element (2–3 incl. do-nothing/buy, each a rejection reason); optional `Alternative | Why rejected` mini-table schema.
- **T2.2** eval.md §6 added `falsifiable-hypothesis-present` (high), `alternatives-considered` (high).

### Wave 3 — NEW §8 MSF (ask 1, D1) — done
- **T3.1** §8 "Motivation, Friction & Satisfaction" inserted after §7 (`tier: both`); three bold sub-heads; guidance comment inlines all 24 considerations from `_shared/msf-heuristics.md` (7/11/6) as a coverage checklist, cites the canonical home (§K, no fork), and carries an explicit "render as narrative, not a 24-row table" instruction (D1).
- **T3.2** eval.md §8 block: `motivation-addressed` (high), `friction-addressed` (high), `satisfaction-addressed` (medium), `msf-narrative-not-table` (low), `msf-grounded-in-segment` (medium).

### Wave 4 — §9 validation mandate + §11 Risks borrows (ask 5, 2b/2c; D8, D2) — done
- **T4.1** §9 (renumbered) gained a "Validation / how we'll test it" column + guidance that every story MUST carry ≥1 concrete executable validation criterion (not a capability restatement).
- **T4.2** eval.md §9 added `every-story-has-testable-ac` (high); retained the existing story items.
- **T4.3** §11 (renumbered Risks) gained pre-mortem guidance (≥3 named failure modes each with a leading indicator) + a conditional AI-risk block (behaviour contract + fallback/kill-switch + eval bar; N/A for non-AI).
- **T4.4** eval.md §11 added `premortem-present` (high), `ai-risk-surface-when-applicable` (high, conditional/N/A).

### Wave 5 — frontmatter flag + validation + dogfood — done
- **T5.1** `user_facing: true` added to template.md frontmatter (Story 2 reads it, D7); `length_target` bumped ~1500→~1900 words for the added sections (INV-6).
- **T5.2** Validation: template↔eval `## §N` lists **1:1 identical** (15 each; full-header diff empty → INV-2); exactly the six Doshi category names present, no 7th (INV-3); frontmatter parses (yaml); no duplicate eval ids; all 13 new eval ids present. Existing artifact tests unchanged & green: `depth-pipeline.sh` PASS, `apply-edit-at-anchor.test.js` 5/5.
- **T5.3** Dogfood (scratchpad only, uncommitted): authored a sample "SmartReply for Support Inbox" PRD against the new template — 14/14 structural checks PASS: §5 Doshi-categorized + question-first + KM/LM + guardrail; §6 if/then/because hypothesis + do-nothing/buy alternatives table; §8 MSF prose under three sub-heads (no table) grounded in the named segment; §9 per-story Given/When/Then validation with a **deliberately weak** capability-restatement story that `every-story-has-testable-ac` flags; §11 pre-mortem (3 failure modes + leading indicators) + applicable AI-risk surface. Final numbering confirmed (§11 = Risks).

## Gates
- skill-eval-check.sh `--target claude-code`: **exit 0** (SKILL.md instruction surface unchanged → trivial pass, as designed for a data-only story). [J] half: SKILL.md byte-unchanged from the released passing state → no new judge findings; substantive gate is the template validation + dogfood. No `accepted_residuals`.
- 4 hygiene lints all PASS: `lint-flags-vs-hints.sh`, `lint-phase-refs.sh`, `audit-recommended.sh` (SKILL.md file; 17 calls, all marked), `lint-non-interactive-inline.sh` (60 skills match canonical).
- Diff scope: only `templates/prd/{template.md,eval.md}` — no file touched outside `plugins/pmos-toolkit/skills/artifact/`; no external renumber hits (T0.1).
- INV-5 backward-compat: additions are guidance + judgment-severity eval items (reviewer surfaces, non-blocking); the one precondition (`primary-metric-baseline`) is pre-existing. A pre-change PRD still validates (§N set unchanged in count-shape from a consumer's view; new items are judgment).

All 8 acceptance criteria satisfied. Story → **done**.
