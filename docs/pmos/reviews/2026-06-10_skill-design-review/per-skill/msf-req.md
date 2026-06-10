# msf-req — review

**Grade:** B (a thin, coherent, substrate-respecting skill whose ~45 lines of actual substance are wrapped in ~120 lines of repo contract tax; its real defects are two stale facts left behind by other features' refactors)
**Size:** SKILL.md 166 lines (166 — carries the `non-interactive: refused` marker instead of the inline block); references 0 files / 0 lines (substance lives in `_shared/msf-heuristics.md` 78 + `_shared/persona-journey-alignment.md` 37, shared with /msf-wf and /creativity); target ~100 lines.

## TL;DR

- **Biggest win available:** fix the two stale facts. The Input Contract names `/feature-sdlc` as the invoking parent, but feature-sdlc folded msf-req into `/requirements` Phase 5a (feature-sdlc/SKILL.md:349: "msf-req — folded into /requirements as Phase 5a (W1)"); and the standalone save path is still the colliding `msf-findings.html` that the folded path explicitly renamed away (requirements/SKILL.md:600: "`msf-req-findings.md` — NOT the legacy `msf-findings.md` … prevents the slug clash with /msf-wf").
- **Biggest risk:** the skill's body is now mostly machinery (pipeline-setup block, ~22-line HTML emit block, learnings gate, anti-patterns) around a core that is almost entirely "follow `_shared/msf-heuristics.md` and `_shared/persona-journey-alignment.md`". That's the *right* factoring — but every machinery block added since has landed verbatim, so the ratio will keep degrading unless the emit block is substrate-ized.
- **Worth keeping:** this is what good substrate use looks like — persona ceremony, MSF considerations, and the executive-summary template all live once in `_shared/` and are consumed by reference. The recommendations-only contract ("never edits the source", terminate after summary) directly encodes the lesson from the 2026-05-08 msf-skill-split (the old /msf's "self-grading writes" defect) and should never be softened.

## Findings

1. **[R] Stale parent attribution (Input Contract, Phase 1).** "When a parent orchestrator (currently `/feature-sdlc`) invokes this skill as a reviewer subagent…" — /feature-sdlc removed its msf-req phase; the orchestration moved into `/requirements` Phase 5a. Anyone tracing the FR-50/51/52 contract from this file lands in the wrong parent. Fix the name; better, say "the invoking parent (see /requirements Phase 5a)" so the next refactor can't strand it again.
2. **[R/G] Findings filename collision (Phase 6).** Standalone saves `{feature_folder}/msf-findings.html` — same path /msf-wf writes. Run /msf-req then /msf-wf on one feature and the first is overwritten (E4 `.bak` lasts one cycle). The folded path already writes `msf-req-findings.md`, so the same analysis gets a different filename depending on invocation route. Align the standalone on `msf-req-findings.html`. (Coupling: anything reading the old name — check /spec inputs and index-generator — should be greped in the same pass.)
3. **[V/S] Contract-tax ratio.** Of 166 lines, the skill-specific substance (wrong-input guard, tier check, Phases 3–5 bindings, summary overrides, terminate rule) is ~45 lines. The rest: pipeline-setup sentinel block (shared, fine), HTML emit block (~22 lines, duplicated across 11 skills — see the design-crit review for the `_shared/html-authoring/emit-contract.md` recommendation), learnings gate, announce line, ASCII pipeline diagram. None is individually wrong; collectively they bury a good thin skill. The emit-block substrate-ization alone gets this to ~115; trimming restated substrate (finding 5) reaches ~100.
4. **[P] Tombstone flag rejections (Anti-Patterns).** "Do NOT accept the flags `--apply-edits`, `--wireframes`, `--skip-psych`, or `--default-scope`" — four retired /msf flags enumerated negatively. Defensible one month post-split; replace with one line ("retired /msf flags → reject, point at argument-hint") and delete when the migration window closes. Same residue exists in /msf-wf.
5. **[V] Phases 3–4 restate the substrate they cite.** Phase 3's bullets (extract-before-invent, propose-for-confirmation, 2–5 personas / ≤2 scenarios, mandatory confirmation) are a paraphrase of `_shared/persona-journey-alignment.md` Step 1; Phase 4 likewise wraps Step 2. Collapse to one phase: "Persona & journey alignment — follow `_shared/persona-journey-alignment.md` with `source` = the requirements doc." The substrate already owns the rules; restating them creates two places to drift.
6. **[X] Non-interactive asymmetry — question, not defect.** msf-req refuses non-interactive ("free-form persona inference and journey confirmation") while msf-wf, which runs the *identical* mandatory confirmation ceremony, supports NI via DEFER classification. Either the refusal is over-cautious (msf-wf proves the ceremony degrades fine to deferred open questions) or msf-wf is under-cautious. Worth one deliberate decision; also note the refusal marker's "alternative: run /wireframes --apply-edits via parent flow" is a non-sequitur as an alternative to *requirements-doc* analysis.
7. **[G] Tier-check warning (E1)** — a one-line advisory ("MSF is best-suited to Tier 3 … proceeding anyway") that warns without blocking. Correct posture; keep.
8. **[S] Merge verdict (the three-skill question).** msf-req and msf-wf share persona ceremony, MSF considerations, summary template, save-path logic, wrong-input guards that route to each other, and near-identical Phase 0/emit/learnings scaffolding — they are one concept routed by input type, which Pocock's `prototype` exemplar handles as one skill with two reference branches. But the 2026-05-08 split was a deliberate, documented fix (flag-driven branching + self-grading writes), the parents differ (/requirements folds msf-req; /wireframes folds msf-wf with `--apply-edits`), and the genuinely shared DNA already lives in `_shared/`. Recommendation: **stay separate; deepen the substrate instead** — the remaining duplication (emit block, save-path rules, retired-flag tombstones) should move to `_shared/`, not force a re-merge. The third sibling, design-crit, is the actual violation: it re-implements PSYCH/MSF inline rather than consuming the substrate (see its review, finding 1).

## Flags inventory

| flag | purpose | verdict |
|---|---|---|
| `--format <html\|md\|both>` | repo-wide output_format override | keep (repo contract) |
| `--feature <slug>` (Phase 0 step 4 honors it; absent from argument-hint) | resolve feature folder for ad-hoc runs | either add to argument-hint or drop from Phase 0 — currently undiscoverable |
| `--apply-edits`, `--wireframes`, `--skip-psych`, `--default-scope` (rejected) | tombstones for retired /msf flags | collapse to one line; delete after migration window |

## Gates & rubrics inventory

| check | hard or soft | failure it catches | verdict |
|---|---|---|---|
| Wrong-input guard (directory → /msf-wf) | hard | wrong analysis mode on wrong artifact | keep-hard |
| Mandatory persona confirmation | hard | generic ungrounded findings | keep-hard (lives in substrate) |
| Recommendations-only / never edit source / terminate after summary | hard | the original /msf self-grading-writes defect | keep-hard — the skill's core contract |
| `non-interactive: refused` marker | hard | unattended runs of a confirmation-centric skill | revisit (finding 6) — msf-wf shows a degradation path exists |
| Tier-1 warning (E1) | soft | over-engineered findings on tiny scopes | keep advisory |
| Overwrite protection (E4 `.bak`) | hard | clobbering prior findings | keep-hard |
| 200-line chat summary cap | soft | chat dump | keep advisory |
| "No actionable findings" terminal state | hard | padded recommendation tables | keep-hard |

## Fix list

| fix | type | impact | risk |
|---|---|---|---|
| Rename standalone output to `msf-req-findings.html` | quick-win | high | low — grep downstream readers of the old name in the same pass |
| Fix stale `/feature-sdlc` parent attribution | quick-win | med | none |
| Emit block → `_shared/html-authoring/emit-contract.md` pointer (cross-skill) | structural | med | low |
| Collapse Phases 3–4 into one substrate-pointing phase | quick-win | med | none |
| Decide the NI posture deliberately (align with msf-wf or document why not) | structural | low | low |
| Collapse tombstone flag list to one line; surface or drop `--feature` | quick-win | low | none |
