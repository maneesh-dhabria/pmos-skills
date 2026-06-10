# survey-analyse — review

**Grade:** B (well-designed for its job: the deterministic-helpers / LLM-narrates split is the best architecture decision in either survey skill, and the SKILL.md is comparatively tight. Held back from A by one real contract bug — `--weight-col` is documented as helper-implemented but no helper takes a weight — plus an orphaned flag and a duplicated learnings phase.)
**Size:** SKILL.md 216 lines (187 excluding the 29-line non-interactive block); references 4 files / 603 lines; scripts 16 files (13 Python helpers + apply-edit-at-anchor.js + selftest.sh + node test) totaling ~1,700 lines, all selftest-passing (verified: `bash tests/selftest.sh` → "all helpers passed"); target ~150 lines.

## TL;DR

- **Biggest win available:** fix the `--weight-col` vapor contract. `reference/cross-survey-stats.md` §Weighting states "the helper applies the per-respondent weight column when computing percentages" and "trim extreme weights … helper does this automatically" — **no helper accepts a weight parameter** (grep-verified across all 13; the only "weighted" hits are ranking.py's rank-points, unrelated). The likely runtime outcome is the worst one: the LLM, told weighting exists, improvises it inside the per-run `analysis.py` — violating Anti-Pattern #1 / FR-R03, the exact reproducibility contract the skill exists to protect.
- **Biggest risk in current design:** the LLM-authored `analysis.py` is the one open seam in the "numbers are deterministic" story — nothing checks that the generated script only dispatches to helpers and doesn't compute its own stats. Cheap mitigation exists (see finding 3).
- **Done well, worth keeping:** the helper layer itself. Stdlib-only, per-type modules with known-answer `--selftest`s, docstrings that cite the SKILL.md anti-pattern they enforce (nps.py: "Never an average of the 0–10 scores. See SKILL.md Anti-Pattern #4"). And the Anti-Patterns section is the Pocock ideal — nine entries, each a real statistical malpractice + why + which helper prevents it. This is "prescribe exactly where deviation is a known failure mode."

## On the special-attention question

**Rightly separate from /survey-design?** Yes. The two skills serve different lifecycle moments (before fielding vs after), different inputs (intent/draft vs response export), different machinery (subagent critique vs a Python stats layer), and different user requests ("make a survey ready to field" vs "what do these responses say"). The coupling is exactly one explicit, optional interface: `--survey-json` consumes /survey-design's IR as the proposed schema — loose, well-named, and degradable (Phase 2 falls back to `schema.infer` + user confirmation). Merging them would produce a mega-skill whose two halves share almost nothing. The "Sister to /survey-design" framing in both descriptions is the right amount of glue. One coupling note per criteria §Calibration: if /survey-design's `survey.json` schema moves to a reference file (recommended in the sibling review), Phase 2 step 1 here should cite that schema doc rather than assume the shape.

## Findings

1. **[G] `--weight-col` is a vapor contract** (detail in TL;DR). Where: argument-hint, Phase 0 step 2, Phase 7 methodology line, `reference/cross-survey-stats.md` §Weighting. Why it matters: a user who passes the flag gets either unweighted numbers under a methodology section claiming weighting (silently wrong report) or LLM-improvised weighting in `analysis.py` (reproducibility contract broken). Fix: either add `weights=` support to `categorical/multi_select/likert/nps/stats.cross_tab` + a trim helper with selftests, or delete the flag and rewrite the reference section to "weighting is out of scope; state who's missing." Don't ship the middle state.
2. **[F] `--context <path|url>` is parsed and never consumed.** It appears in the argument-hint and Phase 0 step 2; the only other mentions are the slug derivation ("survey title / context doc / responses-filename stem") and Phase 2's *user-asked* purpose/decisions batch — no phase ever says "read the `--context` file." Why it matters: a user who passes their research brief reasonably expects it to seed Phase 2 and the exec summary. Fix: one sentence in Phase 2 — "If `--context` was passed, read it first and pre-fill purpose/decisions/segments; confirm rather than ask cold" — or delete the flag.
3. **[G] The deterministic-numbers gate has an unguarded seam: nothing constrains the generated `analysis.py`.** Phase 4 + Anti-Pattern #1 forbid the LLM computing stats from the CSV, but the per-run script the LLM writes could embed its own arithmetic and still "pass." Cheap fix, in the spirit of the existing selftests: one line in Phase 4 — "analysis.py contains no statistical computation of its own; every per-question number in `per_question.json` is a helper return value verbatim" — optionally backed by a grep for arithmetic on response values in the authored script. Recommend: keep-hard, add the self-check sentence.
4. **[Ph/R] Phase-count incoherence + duplicated learnings phase.** "Track Progress" says "8 sequential phases"; the body runs Phase 0–8 (nine) plus "Phase 9: Capture Learnings" (ten), with the comment-resolver section sandwiched unnumbered between 8 and 9. Worse, Phase 8 ("Workstream / Learnings / Handoff") and Phase 9 both specify the *same* two-line learnings-emission contract — classic insertion-without-rethinking. Fix: delete the learnings bullets from Phase 8 (keep handoff), renumber, and make Track Progress say "phases 0–9" or just "one task per phase below."
5. **[V/P] Phase 9's learnings stanza over-enforces a reflection.** "You MUST emit exactly one of these two lines… Empty reflection counts as unfinished work" — 10 lines policing a one-line output, and a near-duplicate of /survey-design's 4-line "Capture Learnings" (which proves the compact form suffices). Also duplicates `_shared/learnings-capture.md` intent. Fix: adopt the sibling's 4-line version, cite the shared doc.
6. **[R] Stale `.comments.json` sidecar prose** in "Apply comment-resolver edit" (line 158) — the sidecar contract was retired in v2.58.0 in favor of the inline `pmos-comments` block (repo CLAUDE.md). The section also restates the id-first/quote-fallback resolution order immediately after saying it "MUST cite that file rather than restate the contract," and the NFR-08 relative link `../../../docs/...` is one level short (resolves to `plugins/docs/...`). Fix: three quick edits; behavior unaffected (the `_shared/apply-edit-at-anchor.md` contract is correctly normative).
7. **[F] `--format html|md|both` is inert** — Platform Adaptation's own text: "the MD-sidecar emit path was retired in FR-12.1; `output_format=both` is treated as `html`," and Phase 7 step 5 repeats it. A flag whose only documented behavior is "ignored" should not exist. Fix: delete from argument-hint + Phase 0 step 3 (keep the settings-resolution stderr line only if the substrate lint requires it).
8. **[S] Phase 0 is a near-verbatim copy of /survey-design's Phase 0** (settings.yaml read + docs_path default + warn line, flag parse, output_format stderr line, slug-dedupe never-overwrite, TaskCreate-per-phase, learnings read). This standalone-utility preamble likely recurs in every non-pipeline skill. Fix (repo-level): extract `_shared/standalone-utility-setup.md`; each skill keeps ~3 lines (its flags, its folder name).
9. **[V] Both halves of the report's section list are stated twice.** Phase 7's seven-section skeleton duplicates `reference/data-quality-and-reporting.md` Part B "Report skeleton". One should own it; the reference is the natural home (it's loaded in Phase 3 anyway), leaving Phase 7 with the substrate mechanics (atomic write, meta tag, sections.json, index regen) which are genuinely skill-specific. Saves ~10 lines.
10. **[X] Cross-platform posture is the best of the reviewed pair.** The no-Bash degradation ("emit the file path + 'Run this and paste the JSON output back'") and the no-Python stop-with-install-instruction are concrete and match the body. `${CLAUDE_PLUGIN_ROOT}` in Phase 4 is Claude-Code-specific but the text already hedges ("the skill resolves the absolute path at write time"). No change needed.
11. **[P] Mostly healthy prescriptiveness.** Where the skill dictates exactly (Holm by default, respondent-base denominators, T2B+distribution, schema confirmation before analysis), each mandate names the failure it prevents — this is the good kind. The one numeric that lacks a stated failure mode is Phase 5's "chunked at ≤200 per call" (context-window pragmatics; fine, but say "to stay within subagent context" so it survives as a why).

## Flags inventory

| flag | purpose | verdict |
|---|---|---|
| `--responses <path>` | the input file (required) | keep — though also accept a bare path argument / NL ("analyse responses.csv") and treat the flag as the canonical form |
| `--context <path|url>` | research brief / background | **wire it or delete it** — currently parsed, never read (finding 2) |
| `--survey-json <path>` | sister-skill schema handoff | keep — the one inter-skill interface; well-named |
| `--sheet <name\|N>` | XLSX sheet disambiguation | keep — needed for non-interactive determinism |
| `--weight-col <col>` | respondent weighting | **implement or delete** — currently vapor (finding 1) |
| `--raw-p-only` | opt out of Holm correction | keep — legitimate analyst opt-out, implication recorded in methodology |
| `--skip-cleaning` | bypass Phase 3 | keep — legitimate, with methodology warning |
| `--format html\|md\|both` | output_format override | **delete** — inert by its own documentation (finding 7) |
| `--non-interactive` / `--interactive` | repo-wide mode contract | keep (global contract; assess once, globally) |

## Gates & rubrics inventory

| check | hard or soft | failure it catches | verdict |
|---|---|---|---|
| User-confirmed schema before Phase 4 (Anti-Pattern #6) | hard | silent type-miscategorisation cascading into wrong-but-clean-looking analysis (rationale stated inline, Phase 2 step 5) | keep-hard |
| Numbers-from-helpers-only (FR-R03, Anti-Pattern #1) | hard | LLM-hallucinated statistics presented as computed | keep-hard; add the analysis.py self-check (finding 3) |
| Holm correction by default; `--raw-p-only` opt-out recorded | hard | ~5% false-positive "significant" subgroup findings across many tests | keep-hard |
| Likert: distribution + T2B always shown with any mean | hard | ordinal data reported as interval | keep-hard (helper returns both) |
| Multi-select respondent-base denominator + chart label | hard | percentages misread against response base | keep-hard (helper enforces) |
| NPS as integer promoters−detractors | hard | NPS reported as a 0–10 average | keep-hard (helper enforces) |
| Small-N flag (`n < 30`) inline with cells | hard | headlining noise as a subgroup difference | keep-hard |
| PII detect-and-warn, never auto-redact (FR-R05, Anti-Pattern #7) | hard | leaked PII on share / over-eager false-positive redaction | keep-hard (user-confirmed design choice, cited) |
| Theme return-shape validation (response_ids ⊆ input; quote_ids ⊆ theme) | hard | subagent inventing verbatims or cross-wiring quotes | keep-hard |
| `n ≥ 5` threshold for thematic coding | soft | theming noise on tiny open-end columns | keep |
| Never overwrite run folder (Anti-Pattern #9) | hard | destroying the audit trail | keep-hard |
| Atomic report write + `pmos:skill` meta + kebab ids | hard | substrate/comments-routing contract | keep-hard (tested substrate contract) |
| Phase 9 mandatory learnings line ("counts as unfinished work") | hard | a skipped one-line reflection | soften — fold into Phase 8, 4-line form (finding 5) |

## Fix list

| fix | type | impact | risk |
|---|---|---|---|
| Resolve `--weight-col`: implement `weights=` in helpers + selftests, or delete flag + rewrite reference §Weighting | structural | high | med if implementing (touch 5 helpers + tests); none if deleting |
| Wire `--context` into Phase 2 pre-fill, or delete it | quick-win | med | low |
| Add the "analysis.py computes nothing itself" self-check sentence to Phase 4 | quick-win | med | none |
| Merge Phase 8/9 learnings duplication; fix the "8 sequential phases" count | quick-win | med | none |
| Delete `--format` | quick-win | low | low — check substrate lint expectations first |
| Fix stale sidecar prose, restated resolution order, `../../../` link depth | quick-win | low | none |
| Extract `_shared/standalone-utility-setup.md` for the Phase 0 preamble (shared with /survey-design and other utilities) | structural | med | med — cross-skill change, ride one release |
| Move the report skeleton solely into `reference/data-quality-and-reporting.md`; Phase 7 keeps substrate mechanics | quick-win | low | none |
