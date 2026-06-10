# msf-wf — review

**Grade:** B (the best substrate citizen of the three MSF-DNA skills — shared heuristics, shared persona ceremony, caps with named failure modes — held back by a stale reference file, a filename collision the folded paths already fixed, and the same silent cap-at-12 its sibling got a whole feature to remove)
**Size:** SKILL.md 276 lines (247 excluding non-interactive block); references 1 file / 127 lines (`reference/psych-output-format.md`); target ~150 lines.

## TL;DR

- **Biggest win available:** back-port the findings-filename fix. Standalone /msf-wf and /msf-req both write `{feature_folder}/msf-findings.html` — running both on one feature silently overwrites (the E4 `.bak` survives exactly one cycle). The folded paths already renamed to `msf-req-findings` / `msf-wf-findings` to "prevent the slug clash" (requirements/SKILL.md:600, W4 dogfood) but the standalone skills never got the rename — so the *same skill* now writes different filenames depending on who invoked it.
- **Biggest risk:** `reference/psych-output-format.md` has rotted in place — it titles itself for `msf-findings.md` then says "Every `psych-findings.md` starts with" (the pre-split artifact name), cites a "Phase 6g" that doesn't exist (apply-edits is Phase 8), and is the only place the 12-finding cap's "Unsurfaced findings" contract is defined. A model following the reference literally will emit pre-2.22 headers.
- **Worth keeping:** the serial-journeys rule is a model cap done right — "concurrent subagent edits cause merge corruption (this is a recurring sharp edge)" states the failure mode, and the origin is documented in the 2026-05-08 msf-skill-split. Also the honest epistemic framing of PSYCH ("directional indicators, not scientific measurements"; "No false precision" in the reference) and the no-padding terminal state ("no actionable findings" with empty tables).

## Findings

1. **[R/G] Findings filename collision (Phase 7).** Saves `{feature_folder}/msf-findings.html` — byte-identical path to /msf-req Phase 6's output. requirements/SKILL.md:600 documents the fix ("`msf-req-findings.md` — NOT the legacy `msf-findings.md` … prevents the slug clash with /msf-wf") and wireframes/SKILL.md:529 uses `msf-wf-findings…` in the folded path, but lines 562/618 of wireframes still say `msf-findings.md` and this skill's standalone path was never updated. Fix: rename standalone output to `msf-wf-findings.html`; reconcile the wireframes-side stragglers in the same pass. (Coupling: wireframes Phase 6 delegates here with `--apply-edits` and later git-adds the findings doc by name.)
2. **[R] `reference/psych-output-format.md` is stale in three places:** legacy `psych-findings.md` filename in the "File header" section; "After dispositions are applied (Phase 6g)" — no such phase exists in this skill; and "Findings beyond the 12-finding AskUserQuestion cap" defines the unsurfaced contract for a cap that actually lives in SKILL.md Phase 9. One source of truth per rule: cap and its consequence should sit together.
3. **[G] Silent cap-at-12 (Phase 9).** "Cap surfaced findings at 12; rest are logged in the findings doc under 'Unsurfaced findings'" — no mandated chat line telling the user the cap fired. This is the identical defect that earned design-crit a feature (`2026-05-23_design-crit-depth-control`: "the original design's silent cap-at-12 is what motivated the depth control in the first place"). Don't port the depth machinery — port the one hard rule: print `N surfaced, M unsurfaced — see <findings doc>` whenever M > 0.
4. **[V/S] HTML emit block (Phase 7, ~30 lines)** — same 11-skill duplication flagged in the design-crit review; replace with a pointer to a single `_shared/html-authoring/emit-contract.md`, keeping only the skill-specific lines (save path, overwrite protection, file structure A–D).
5. **[S] PSYCH should be promoted to `_shared/`.** This skill owns the canonical PSYCH (per the msf-skill-split decision), yet design-crit re-implemented it inline and still points at the pre-split `/wireframes/reference/` path. Promote `reference/psych-output-format.md` + the Phase 6 scoring rules (entry contexts, ±1..10, thresholds, driver palette — currently split between SKILL.md and the reference, with the driver lists duplicated verbatim in both) to `_shared/psych-scoring.md`; both consumers reference it. This also de-duplicates within this skill: Phase 6's +Psych/−Psych driver bullets are a copy of the reference's "Driver palette".
6. **[G] PSYCH numeric scoring — meaningful or false precision?** Split verdict. The per-element ± walkthrough is *meaningful as a forcing function*: it forces enumeration of concrete UI elements in attention order, grounded citation, and ranked drivers — a bare "find friction" prompt reliably produces vaguer output. The *arithmetic layer* is false precision: entry constants (60/40/25), summed deltas, and cumulative thresholds (<20 Watch, <0 Bounce, Δ<−20 Cliff) treat LLM-assigned magnitudes as stable quantities; they aren't — across runs and model versions the same screen will land on either side of 20, and the thresholds do drive behavior (danger-zone entries in the Phase 9 summary; design-crit dispositions fire on Watch/Cliff). The maintainer already deferred calibration in the split's non-goals and softened language to "directional" — finish the thought: keep the walkthrough, ± direction, and driver palette; assign Watch/Bounce/Cliff *by judgment* ("would a medium-intent user stall or bounce here?") with the running total as illustration, not trigger. Cheap framing change, removes the model-version coupling.
7. **[P] Anti-pattern flag list is self-contradictory:** "Do NOT accept the flags `--default-scope`, `--wireframes`, or `--skip-psych`. The only flag recognized is `--apply-edits`" — but the argument-hint and body also recognize `--format`, `--non-interactive`, `--interactive`. The retired-/msf-flag rejection was sensible one month post-split; rewrite as one accurate line ("retired /msf flags — reject with a pointer to this skill's argument-hint") or delete once the migration window closes.
8. **[Ph] Phases 3 and 4 are one ceremony.** Both just bind `source` and follow `_shared/persona-journey-alignment.md` Steps 1–2. Collapse into one "Persona & journey alignment" phase with a single substrate pointer — the substrate file already covers extract-before-invent, the 2–5/≤2 bounds, and mandatory confirmation, all of which Phase 3 restates.
9. **[X] Positive:** the parent-invoked Input Contract (chrome-stripped slices, `sections_found`, FR-51/52, "the skill MUST NOT self-validate — the contract lives in the parent") is a clean ownership split, and the wrong-input guard's redirect to /msf-req is a good 3-line router. The merge question: the reciprocal guards show msf-req/msf-wf are one concept routed by input type (Pocock's `prototype` does exactly this inside one skill with LOGIC.md/UI.md branches) — but the 2026-05-08 split was a deliberate fix for flag-soup and self-grading writes, the two have different output contracts and different parents, and the shared DNA already lives in `_shared/`. Verdict: stay separate; the guards are the cheap residual cost of the split.

## Flags inventory

| flag | purpose | verdict |
|---|---|---|
| `--apply-edits` | unlock Phase 8 inline HTML edits (parent-invoked from /wireframes Phase 6) | keep — it's a write-permission grant, exactly what should be explicit rather than natural language |
| `--format <html\|md\|both>` | repo-wide output_format override | keep (repo contract) |
| `--non-interactive` / `--interactive` | repo-wide mode contract | keep (repo contract) |
| `--default-scope`, `--wireframes`, `--skip-psych` (rejected) | tombstones for retired /msf flags | delete the enumeration once migration window closes; until then one accurate line |

## Gates & rubrics inventory

| check | hard or soft | failure it catches | verdict |
|---|---|---|---|
| Wrong-input guard (.md → /msf-req) | hard | wrong analysis mode on wrong artifact | keep-hard — 3 lines, real router |
| Mandatory persona confirmation | hard | generic, ungrounded findings | keep-hard — failure mode stated; lives in substrate |
| Serial journeys (no parallel subagents) | hard | findings-doc merge corruption (documented recurring bug) | keep-hard — exemplary cap |
| PSYCH thresholds (20/0/Δ−20) | soft-ish (feeds summary top-issues) | motivation cliffs invisible to per-screen checks | soften — judgment-assigned severity, numbers as illustration (finding 6) |
| 12-finding surfaced cap (Phase 9) | hard | AskUserQuestion fatigue | keep, but add the mandatory surfaced/unsurfaced chat line (finding 3) |
| 200-line chat summary cap | soft | unreadable chat dump | keep advisory |
| Overwrite protection (E4 `.bak`) | hard | clobbering prior findings | keep-hard (and it matters more while the filename collision exists) |
| No-edits-without-`--apply-edits` | hard | diagnostic skill silently mutating sources (the original /msf defect) | keep-hard — this is the split's core contract |
| "No actionable findings" terminal state | hard | padded Must/Should/Nice tables | keep-hard |

## Fix list

| fix | type | impact | risk |
|---|---|---|---|
| Rename standalone output to `msf-wf-findings.html` (+ fix wireframes:562/618 stragglers) | quick-win | high | low — but touch /wireframes git-add line in the same commit (coupling) |
| Promote PSYCH (reference + scoring rules) to `_shared/psych-scoring.md`; de-dupe driver palette | structural | high | low — design-crit becomes second consumer, fixing its orphaned pointer |
| Update stale internals of psych-output-format.md (legacy filename, Phase 6g, cap location) | quick-win | med | none |
| Add mandatory surfaced/unsurfaced chat line to Phase 9 | quick-win | med | none |
| Collapse Phases 3+4 into one substrate-pointing phase; emit block → `_shared` pointer | structural | med | low |
| Soften PSYCH thresholds to judgment-assigned severity | quick-win | med | low — output tables unchanged; only the trigger rule rewords |
| Fix self-contradictory "only flag recognized" anti-pattern line | quick-win | low | none |
