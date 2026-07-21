# Proposal — pmos-managerkit__interview-guide (FINAL)

**Unit:** `plugins/pmos-managerkit/skills/interview-guide/`
**Status:** CONVERGED — 3 review passes complete (pass 1: 7 findings; pass 2: 5, incl. 1 blocker against the pass-1 F3 spec, amended; pass 3: 5, incl. 1 should-fix against the pass-2 F8 spec, amended), plus a final author closeout. 17/17 accepted, 0 rejected, 0 invalid, 0 open questions. Pass 3's findings were all accepted with amended specs and no subsequent reviewer objection; the last pass surfaced only spec-tightening amendments (1 should-fix, 4 nits), so the loop closed converged. All changes are DESCRIBED, not implemented.

## Finding ledger

| ID | Severity | Disposition |
|---|---|---|
| interview-guide-F1 | Should-fix | Accepted (amended by F12) |
| interview-guide-F2 | Should-fix | Accepted |
| interview-guide-F3 | Should-fix | Accepted (amended by F8, F13, F17) |
| interview-guide-F4 | Nit | Accepted |
| interview-guide-F5 | Nit | Accepted (amended by F11) |
| interview-guide-F6 | Nit | Accepted (plugin-scoped fix) |
| interview-guide-F7 | Nit | Accepted |
| interview-guide-F8 | Blocker | Accepted — pass-1 F3 spec would hard-fail the bundled work-history archetype; its carve-out was a no-op |
| interview-guide-F9 | Should-fix | Accepted — unqualified 1:1 MUST is false for work-history (amended by F15: 4th home) |
| interview-guide-F10 | Should-fix | Accepted — validator never asserts `data-input="notes:reco"` |
| interview-guide-F11 | Nit | Accepted — F5's row→column sweep left residual "row" phrasings |
| interview-guide-F12 | Nit | Accepted — F1's refusal rule was self-contradictory as stated |
| interview-guide-F13 | Should-fix | Accepted — two-file gate must assert sheet↔reference archetype agreement before branching on it |
| interview-guide-F14 | Nit | Accepted — dangling `../feature-sdlc/…skill-patterns.md` cite; shared verbatim with interview-feedback/SKILL.md:19 |
| interview-guide-F15 | Nit | Accepted — reference-skeleton.html is a fourth unqualified home of the 1:1 contract |
| interview-guide-F16 | Nit | Accepted — mark `data-maps-dim` as deliberately ungated (no machine consumer) rather than gate it |
| interview-guide-F17 | Nit | Accepted — state write-before-gate ordering and concrete input paths for the two-file gate |

**Totals:** 1 blocker, 6 should-fix, 10 nits — 17 accepted, 0 rejected, 0 invalid.

Author independently verified across passes: work-history reference `data-area` set = 6 method phases vs sheet `data-dim` = 12 competencies (zero overlap), deliberate per the corpus comment at `guidelines/work-history/interviewer-reference.html:87-88`; the `role-evidence`/`trajectory-synthesis` blocks carry `data-card` not `data-dim`; the validator's reco block has no `notes:reco` check; the single-file WH family check keys on the SHEET's `data-archetype` (`validate-scorecard-anchors.mjs:105`); `plugins/pmos-managerkit/skills/feature-sdlc/` does not exist while `one-on-one/SKILL.md:23` shows the correct cross-plugin cite form; grep shows no `/interview-feedback` machine consumer of `data-maps-dim`; SKILL.md:186 says "After writing the sheet" while output-location resolution lives only in Phase Write (:226). Pass-3 reviewer independently re-proved: all 8 bundled scorecards pass F2's stricter per-dim gate; all 8 references have flat `data-area` sections with signals+probes and exactly one `data-archetype` on `<main>`; F7's four target anchors exist in interview-feedback/SKILL.md; the new `--against` flag appears only in fenced code so `lint-flags-vs-hints.sh` is unaffected. Closeout re-verified pass-3 quote grounding: F14 (SKILL.md:20 + interview-feedback/SKILL.md:19), F15 (reference-skeleton.html:12), F16 (output-shapes.md:86), F17 (the critiqued proposal sentence) — all grounded.

---

## Accepted changes (full detail, cumulative — all amendments folded in)

### F1 + F12 [Should-fix + Nit] — Duration parser must refuse ambiguity; refusal rule stated precisely once
- **File:** `scripts/validate-scorecard-anchors.mjs` — `parseDuration` (~:156-167), its "Handled shapes" doc-comment (~:150-155), `--selftest` fixtures.
- **Before:** unit-labeled tokens are consumed, then ALL leftover bare integers are summed. Verified live: `--check-duration '90-120 mins'` → 210 exit 0 (silent); `'1.5 hours'` → 301; `'45 mins each of 2 parts'` → 47. Violates the script's own contract comment (:504 "exit non-zero when it cannot be parsed unambiguously") and SKILL.md:160 ("re-prompt rather than guessing", INV-6/A1). Wrong values flow into the `data-duration`/`data-budget` machine anchors consumed by `/interview-feedback`.
- **After (intent) — THE rule, stated once (F12 supersedes pass 1's contradictory "exactly ONE number per addend" phrasing):** Split the input on explicit `+` into addends. Per addend: any count of UNIT-LABELED numbers is allowed and summed (`1 hour 30 minutes` → 90); a BARE (unitless) integer is allowed only when it is the addend's SOLE number (`90` → 90); a bare integer coexisting with any other number in the same addend refuses (`90-120 mins` → exit 1; `45 mins each of 2 parts` → exit 1; `1 hour 30` → exit 1, re-prompt); any decimal anywhere refuses (`1.5 hours` → exit 1, whole-minutes contract). Refusals use the existing "ask the operator" stderr message. Preserve accepts: `90`→90, `90 mins`→90, `2 hrs`→120, `90 + 15 buffer`→105, `1 hour 30 minutes`→90. **The `--selftest` fixtures are the normative enumeration** — every accept and refuse case above ships as a fixture; the doc-comment cites the fixtures as spec of record.
- **Rationale:** a §H gate that exists so the model never guesses must not itself guess (F1); an ambiguity-refusing parser specified ambiguously just relocates the guessing to implementation time (F12).
- **Blast radius:** the validator only; SKILL.md:192's selftest-inventory parenthetical gains "duration ambiguity" (shared edit with F2/F3/F10). No other skill calls `--check-duration`. Lints/evals untouched.

### F2 [Should-fix] — Scope per-dimension anchor checks per section; reject duplicate dim ids
- **File:** `scripts/validate-scorecard-anchors.mjs` — core validate (:53-73), a new per-dim block extractor, selftest.
- **Before:** `data-scale`, `data-v`, `data-flags="green"`, `data-flags="red"` are asserted once FILE-WIDE; duplicate `data-dim` ids pass. Verified live: a sheet with two `data-dim="user-empathy"` sections, the second hollow (no scale/notes/flags), prints "✓ scorecard anchors: valid" and exits 0 — despite `reference/output-shapes.md:49` documenting these as per-dim requirements ("per dim: `data-weight=\"<n>\"` … a `data-scale=\"1-4\"`").
- **After (intent):** (1) assert `data-dim` id uniqueness (duplicate → hard failure naming the id); (2) extract each `<section class="dim" data-dim="<id>">…</section>` block (sibling of the existing `extractSections` helper, keyed on `data-dim`; sections are flat so the non-greedy match is exact) and assert PER BLOCK: one `data-weight`, a `data-scale` container with `data-v` options, `data-input="notes:<id>"`, both `data-flags` containers — failure messages naming the dim. Selftest fixtures: duplicate-id sheet and hollow-second-section sheet (both must fail); existing good fixtures re-pass.
- **Rationale:** duplicate/hollow sections are the canonical copy-paste failure of a model authoring N similar blocks; a passing gate here breaks `/interview-feedback score` downstream. §H: the gate must prove the contract it claims to prove.
- **Blast radius:** validator + selftest; the 8 bundled scorecards + skeletons in `_shared/interview-guidelines/` re-verified (pass-3 reviewer confirmed all 8 pass the stricter gate). SKILL.md:192 parenthetical updated. `output-shapes.md` unchanged.

### F3 + F8 + F13 + F17 [Should-fix + Blocker + Should-fix + Nit amendments] — Two-file gate for reference anchors and area↔dim equality, with archetype-agreement assertion, work-history exemption, and explicit write-before-gate wiring
- **Files:** `scripts/validate-scorecard-anchors.mjs` (new two-file mode); `SKILL.md` Phase Interviewer Reference + Phase Scoring Sheet §H gate block (:186-192) + Phase Self-Review + Phase Write; `reference/output-shapes.md`; `reference/self-eval-rubric.md` Axis 2.
- **Before:** SKILL.md:176's 1:1 MUST ("**Area ids MUST match the scoring-sheet `data-dim` ids 1:1**") is enforced only by the non-blocking judgment self-review; output (a)'s anchors (`data-ref="round"`, `data-area`, `data-signals`, `data-probes`) have no script gate while output (b) gets a blocking one.
- **After (intent):** add `validate-scorecard-anchors.mjs <scoring-sheet.html> --against <interviewer-reference.html>`:
  - **Archetype agreement FIRST (F13):** assert sheet `data-archetype` === reference `data-archetype` before any branching (both absent counts as agreement for non-work-history pairs; present-vs-absent or differing values is a hard failure naming both values and both files). Without this, a mistagged pair silently voids the equality gate on one side (exemption keyed on the reference) and skips the WH family checks on the other (single-file checks key on the sheet, `validate-scorecard-anchors.mjs:105`) — a §H exemption keyed on a single unverified attribute in one of two files is spoofable by exactly the error class the gate exists to catch.
  - **Anchor presence (all archetypes):** `data-ref="round"` on the reference `<main>`; per `data-area` block: `data-signals="green"`, `data-signals="red"`, `data-probes="<id>"`.
  - **Set equality (all archetypes EXCEPT work-history):** reference `data-area` id set === sheet `data-dim` id set. **Work-history exemption (F8):** for the agreed archetype `work-history`, SKIP set equality entirely — the reference's six areas (`career-arc-scan` … `management-and-references`) are method phases by documented design (corpus comment `guidelines/work-history/interviewer-reference.html:87-88`: "Competency scoring maps to scorecard.html's data-dim sections, not 1:1 to these areas") — and print an explicit note on pass ("work-history: area↔dim id equality not applicable — method-phase areas by design"). The pass-1 `role-evidence`/`trajectory-synthesis` carve-out is DROPPED — it was a no-op (those blocks carry `data-card`, not `data-dim`).
  - **Write-before-gate wiring (F17):** move output-location resolution (default path / `--out` / `--role-dir`) to the top of Phase Interviewer Reference, stated once — "Resolve the output location NOW (see Phase Write {#write} for the rules); write each artifact to its resolved path as it is authored." The Scoring Sheet §H block then names both concrete inputs: `node scripts/validate-scorecard-anchors.mjs <resolved>/scoring-sheet.html --against <resolved>/interviewer-reference.html` — both exist on disk because each phase wrote its draft on completion. Phase Write reduces to confirm/announce paths, apply the role-dir gitignore guard, report self-review scores; the resolution RULES stay canonically in Phase Write (§K), cited from the reference phase. This removes the only reasonable wrong implementation (relocating the blocking gate to Phase Write, changing F3's semantics — "both outputs exist by then" was an assertion about conversation state, not disk state, and the gate is a script that reads files).
  - Blocking on non-zero exit like the single-file gate.
  - Selftest fixtures: matching non-work-history pair (pass); non-work-history id-set mismatch (fail); work-history pair with non-matching id sets (PASS — the exemption is itself proven); work-history reference missing `data-probes` (fail); mismatched-archetype pair (FAIL — F13). Selftest count must JUMP and be proven.
  - `output-shapes.md` names the two-file gate beside the anchor list; self-eval-rubric Axis 2's deterministic 1:1 item becomes "confirm the script gate ran" (the coverage judgment stays as judgment — see F9).
- **Rationale:** set equality is a textbook §H deterministic check — but the pass-1 spec would have hard-failed EVERY work-history run (reviewer simulated all 8 corpus pairs: 7 pass, work-history fails with zero overlap), and the pass-2 exemption was spoofable via a mistagged pair. Archetype detection is deterministic AND now cross-verified, keeping the exemption inside the §H frame.
- **Blast radius:** validator + selftest; SKILL.md (three phases + :192 parenthetical; the new "see Phase Write" cite uses the `{#write}` slug per §J); output-shapes.md; self-eval-rubric.md; all 8 corpus pairs must pass the new mode **including work-history unmodified** (corpus spot-check: sheet and reference archetype tags agree). Re-run `tools/lint-phase-refs.sh` after SKILL.md edits. No argument-hint change (`--against` is script-internal, appears only in fenced code — `lint-flags-vs-hints.sh` unaffected, reviewer-confirmed). Interlocks with F9/F15: gate exemption and prose qualification land together.

### F9 + F15 [Should-fix + Nit] — Qualify the 1:1 MUST for work-history in ALL FOUR doc homes (§K: one canonical statement)
- **Files:** `reference/output-shapes.md` (:23-24 "**`<id>` MUST match the sheet's `data-dim` id 1:1**" and :47-48 "ids match the reference `data-area` ids"); `SKILL.md:176`; `reference/self-eval-rubric.md` Axis 2 (:23-26); **`_shared/interview-guidelines/reference-skeleton.html` doc-comment (:12, :18-19) — the fourth home F9 originally missed (F15)**.
- **Before:** all four state the 1:1 area↔dim contract unqualified, yet the plugin's own canonical work-history corpus violates it by design — a conformant work-history run can never check the rubric's Axis 2 first box, and a literal reading of SKILL.md:176 steers the model to restructure the reference against the bundled archetype it is told to tailor. The skeleton the model instantiates for custom rounds says ":12 SHOULD map 1:1 to a scorecard data-dim" and closes with the unqualified ":18-19 Pairs with scorecard-skeleton.html (same dimension ids)".
- **After (intent):** the CANONICAL qualified statement lives in `output-shapes.md`: 1:1 holds for every archetype except `work-history`, whose reference areas are the six method phases (probe lifting is per phase; competency scoring maps to the sheet's `data-dim` sections — citing the corpus comment), enforced exactly so by the two-file validator mode. `SKILL.md:176` gains a short parenthetical citing it ("all archetypes except work-history — see reference/output-shapes.md"). Self-eval-rubric Axis 2: the 1:1 and scored-not-probed/probed-not-scored checkboxes get the same qualification; for work-history the judgment check becomes "every sheet dim's evidence is probed by at least one method-phase area (coverage, not 1:1)". **Skeleton (F15):** extend the :12 parenthetical — "(kebab id; maps 1:1 to a scorecard data-dim for every archetype except work-history, whose areas are method phases — see interview-guide/reference/output-shapes.md)" — and soften :18-19 to "Pairs with scorecard-skeleton.html (same dimension ids for 1:1 archetypes)". Qualifier + cite only; the full statement stays in its one canonical home.
- **Rationale:** the corpus proves the contract is conditional; every home must match the (now-exempted) gate or they diverge again — divergence-by-duplication in the skeleton is exactly what the §K consolidation exists to end.
- **Blast radius:** three reference/SKILL docs + one `_shared` skeleton (managerkit-only, no sync-shared ripple; doc-comment prose only, no anchor/markup change; also read by /interview-feedback). `tools/lint-phase-refs.sh` after the SKILL.md edit. No script change beyond F3+F8+F13's.

### F10 [Should-fix] — Validator must assert `data-input="notes:reco"`
- **File:** `scripts/validate-scorecard-anchors.mjs` — validate() section 4 (the reco block, :75-83) + selftest.
- **Before:** `output-shapes.md:45` heads the anchor list "required — validated by `scripts/validate-scorecard-anchors.mjs`" and :53 names the slot ("plus a `data-input=\"notes:reco\"` slot"); `/interview-feedback`'s fill-scorecard.mjs writes into it (`injectInputSlot(out, 'notes:reco', …)`). But validate() checks only `data-input="reco"` + the four `data-reco` options — a sheet missing the notes slot passes the hard gate and breaks the fill downstream. BROKEN_FIXTURE already omits the slot, but the selftest expects no failure for it.
- **After (intent):** add one check: assert `data-input="notes:reco"` present, failure message "missing data-input=\"notes:reco\" (the overall-reco notes slot)". Add the string to the broken-fixture expected-failures list so the selftest proves the check fires. Count bump proven.
- **Rationale:** same gate-weaker-than-contract class as F2, overall-reco anchor family instead of per-dim.
- **Blast radius:** validator + selftest only; folds into the combined validator edit and the SKILL.md:192 inventory sentence. output-shapes.md unchanged.

### F16 [Nit] — Mark `data-maps-dim` as deliberately ungated
- **File:** `reference/output-shapes.md` — the output (c) `data-maps-dim` bullet (:86 "a `data-maps-dim=\"<id>\"` note per section tying the case back to the scoring-sheet").
- **Before:** output (c)'s `data-maps-dim` ids referencing the sheet's `data-dim` set is a deterministic id-subset check asserted only by self-eval Axis 3 judgment (self-eval-rubric.md:37-38); nothing says whether the missing script gate is chosen or missed.
- **After (intent):** add one sentence beside the bullet: "Deliberately ungated — no machine consumer reads `data-maps-dim` (it is interviewer-facing prose linkage); the self-review checks it by judgment. If a machine consumer appears, fold a `--case <path>` compare into the two-file validator mode." The optional third compare mode is recorded as a future fold-in, NOT implemented now.
- **Rationale:** grep confirms no `/interview-feedback` consumer, so a blocking gate would be gold-plating (§H hard gates are for contracts something depends on) — but the asymmetry must read as chosen, not missed, or the finding gets re-filed.
- **Blast radius:** output-shapes.md only (one sentence). No script, SKILL.md, rubric, or selftest change.

### F4 [Nit] — Phantom-flag phrasing "`--no`-duration"
- **File:** `SKILL.md:184`, Phase Scoring Sheet time-budget paragraph.
- **Before → after:** "(deferred, or `--no`-duration)" → "(deferred, or no `--duration`)", converging on the phrasing already used at :178.
- **Rationale:** the backticked token reads as a nonexistent `--no-duration` flag (real parallel: `--no-case`); a model executing could infer a phantom flag.
- **Blast radius:** prose only; re-run `tools/lint-flags-vs-hints.sh` as confirmation.

### F5 + F11 [Nits] — Row/column terminology: exhaustive grep-driven sweep, not a line list
- **Files:** `SKILL.md`; `_shared/interview-guidelines/guidelines/work-history/level-ladder.md`.
- **Rule (F11 supersedes pass 1's five-line list):** run `grep -n '\brow\b'` over both files; every hit denoting a PER-LEVEL WEIGHT SET becomes "column" (rows = competencies, columns = levels — the table's actual orientation); hits genuinely meaning a competency row keep "row". Known conversions: SKILL.md:38 ("weight row" → "weight column"; "selected row's weights" → "selected column's weights"); :198 ("you read a row, you do not compute one" → "you copy a column, you do not compute one" AND the trailing "ships the `senior-pm` row as its default" → "`senior-pm` column"); :206 ("bundled `<level>` ladder row" → "ladder column"); :247 ("pre-summed weight row" → "pre-summed weight column"); level-ladder.md:3, :4-5, :6, :12-13, :19, :33, :101-102 (per the pass-2 response's enumerated pairs).
- **Acceptance check:** post-edit `grep -n '\brow\b'` over both files; every remaining hit must mean a competency row (or the term is removed).
- **Rationale:** a "transcribe verbatim, don't think" (§H) instruction must not force table-orientation disambiguation; a fix that leaves residuals — including in the tail of a sentence it edits — preserves the whiplash it exists to remove.
- **Blast radius:** the two files; `/interview-feedback` has no "weight row" phrasing (re-confirm post-edit); level-ladder.md exists only in pmos-managerkit — no sync-shared ripple.

### F6 [Nit] — Frozen block's `_shared/non-interactive.md` self-cite dangles in this plugin
- **Fix location:** NOT SKILL.md (the block at :81 is frozen byte-identical repo policy; the lint is source of truth). Per the documented sync-shared bootstrap procedure (CLAUDE.md "Bootstrap gap"): place a byte-identical copy of pmos-toolkit's `skills/_shared/non-interactive.md` at `plugins/pmos-managerkit/skills/_shared/non-interactive.md`.
- **Rationale:** managerkit's `_shared/` holds only `interview-guidelines/`, so the frozen block's self-cite is dangling for a standalone managerkit install; all three managerkit skills carry the block — one copied file fixes all. Once placed, the file enters the sync-shared intersection.
- **Blast radius:** one new plugin-level file; future sync-shared runs include it; no SKILL.md/lint/eval changes. `tools/audit-recommended.sh` stays toolkit-hosted by design.

### F14 [Nit] — Dangling cross-plugin `skill-patterns.md` cite (same disease class as F6/F7)
- **Files:** `SKILL.md:20` ("This skill follows the SKILLS-standard authoring guide at `../feature-sdlc/reference/skill-patterns.md` (pmos-toolkit)") and — same defect verbatim — `interview-feedback/SKILL.md:19` (another unit's surface; coordinate or let that unit's proposal absorb it).
- **Before → after:** `../feature-sdlc/reference/skill-patterns.md` (resolves to the nonexistent `plugins/pmos-managerkit/skills/feature-sdlc/`) → `../../../pmos-toolkit/skills/feature-sdlc/reference/skill-patterns.md` — the exact form already proven in-repo by the sibling `one-on-one/SKILL.md:23`. Drop the now-redundant "(pmos-toolkit)" parenthetical.
- **Rationale:** relative path that resolves to nothing from where it is written; the correct form exists three directories over — convergence, not invention. NOT inside the frozen block, so a direct edit is permitted. Do NOT copy skill-patterns.md into managerkit `_shared/` — the cite is authorship provenance, not a runtime dependency, and the toolkit copy is canonical (§K).
- **Blast radius:** two SKILL.md one-liners (interview-guide + interview-feedback). Prose-only; re-run both hygiene lints on both skills (no delta expected — neither lint checks cite file-existence).

### F7 [Nit] — reference-resolution.md's relative links resolve to nothing
- **File:** `plugins/pmos-managerkit/skills/_shared/interview-guidelines/reference-resolution.md` — four links: `../SKILL.md#resolve`, `../SKILL.md#coach` (:3), `../SKILL.md#score` (:15), `../SKILL.md#transcribe` (:25).
- **Before → after:** `../SKILL.md#…` (resolves to the nonexistent `_shared/SKILL.md`) → `../../interview-feedback/SKILL.md#…` (all four anchors verified present in `/interview-feedback`'s SKILL.md — pass-3 reviewer re-confirmed).
- **Rationale:** interview-guide cites this substrate for the `--role-dir` write path; readers following the substrate's own links dead-end, and the phase-refs lint does not scan `_shared/`.
- **Blast radius:** one `_shared` substrate file consumed by both managerkit skills; link-only; no sync-shared ripple.

---

## Rejections

None (all three passes; the final closeout dispositioned nothing new).

## Open questions

None — no unresolved disagreements remain. All 17 findings were accepted (several with author amendments that the subsequent reviewer pass validated or further tightened); no finding was rejected or contested at loop end.

## Implementation notes for whoever executes
- F1/F12, F2, F3/F8/F13, F10 all touch `validate-scorecard-anchors.mjs` and the same SKILL.md:192 selftest-inventory sentence — implement together; update that enumerated list once and grep the count-claim.
- **The work-history corpus is intentionally non-1:1** (F8): the strengthened two-file gate MUST pass the bundled work-history pair unmodified — do NOT 'repair' the corpus. Scorecard-side (single-file) gate failures on any of the 8 bundled sheets would, by contrast, be real latent defects (F2 note; pass-3 reviewer already confirmed all 8 pass F2's stricter gate).
- **The two-file mode's FIRST assertion is archetype agreement** (F13) — sheet `data-archetype` === reference `data-archetype`, hard failure on mismatch — and only then does it branch into the work-history exemption. Fixture for the mismatch case is mandatory.
- F8, F9, and F15 interlock: land the gate exemption and the prose qualification (all FOUR homes, including reference-skeleton.html) together, or the contract and the gate diverge again.
- F17: output-location resolution moves to the top of Phase Interviewer Reference (rules stay canonically in Phase Write, cited via the `{#write}` slug); each phase writes its draft to the resolved path on completion, so both files exist on disk when the Scoring Sheet §H gate runs. Do NOT move the blocking gate to Phase Write.
- The duration parser's selftest fixtures are the normative spec of the accept/refuse boundary (F12) — write the fixtures first, then the parser.
- After SKILL.md edits: `tools/lint-flags-vs-hints.sh`, `tools/lint-phase-refs.sh`, `tools/lint-non-interactive-inline.sh` (F6's copy must be byte-identical), `tools/audit-recommended.sh`, and `skill-eval-check.sh` on the skill dir. The `--against` invocation lives only in fenced code blocks — no argument-hint change (§I untouched).
