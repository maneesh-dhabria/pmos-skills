# Refactor proposal — pmos-managerkit__interview-feedback

**Unit:** `plugins/pmos-managerkit/skills/interview-feedback/`
**Status:** **CONVERGED** — review loop closed after 3 full reviewer→author passes (F1–F23, 23 accepted / 0 rejected / 0 invalid) plus a final author closeout pass that found no unanswered findings and re-verified quote grounding against the current files. No changes have been implemented; this document describes intended edits only. It is cumulative and self-contained — it is the complete record of the review.

## Dispositions

| Finding | Severity | Disposition |
|---|---|---|
| F1 — SKILL.md vs transcribe.sh contradict on `--force-transcribe` destructiveness | Blocker | Accepted (pass 1; scope amended by F14) |
| F2 — grounding gate passes zero-citation output (no coverage floor) | Should-fix | Accepted (pass 1; spec corrected by F11/F17, extended by F12/F23, fixtures pinned by F17/F22) |
| F3 — mandated gate invocation hardcodes `transcript.refined.txt`; crashes on notes-only runs | Should-fix | Accepted (pass 1; leniency clause removed by F20) |
| F4 — SKILL.md promises `degrade:tier2` signal the script never emits | Should-fix | Accepted (pass 1) |
| F5 — `storage.sh new-candidate` neither copies inputs nor matches documented layout | Should-fix | Accepted (pass 1; amended by F16) |
| F6 — "referenced in reco?" checklist gate is self-satisfying boilerplate | Should-fix | Accepted (pass 1; throw-vs-exit + fixture amendments specified by F19) |
| F7 — submission-block placement keys on CSS class, silent drop on mismatch | Should-fix | Accepted (pass 1) |
| F8 — undocumented `IFB_ROOT` precedence level | Nit | Accepted (pass 1) |
| F9 — frozen block cites `_shared/non-interactive.md`, absent from this plugin's `_shared/` | Nit | Accepted (pass 1) |
| F10 — two phases both named "Setup" | Nit | Accepted (pass 1) |
| F11 — F2's floor trigger keys on `data-input="reco"` label text (non-empty on every skeleton) | Should-fix | Accepted (pass 2 — corrects F2) |
| F12 — F2's floor inert on output (b): zero-citation interviewer-notes still passes INV-1 | Should-fix | Accepted (pass 2 — extends F2) |
| F13 — interviewer-notes-skeleton doc comment cites nonexistent `reference/interviewer-effectiveness.html` | Nit | Accepted (pass 2; path corrected by F21) |
| F14 — transcribe.sh usage/header omit `--force-transcribe` | Nit | Accepted (pass 2 — relaxes F1's "script untouched" for string-only fixes) |
| F15 — degrade nudge says "whisper model not found" even when ffmpeg/whisper-cli is missing | Nit | Accepted (pass 2) |
| F16 — F5's dated layout: no back-compat for existing dirs, no slugification | Nit | Accepted (pass 2 — amends F5) |
| F17 — floor triggers are token-trap-prone: skeleton CSS/doc-comment contain `data-selected`; detection method + PASS fixture unpinned | Should-fix | Accepted (pass 3 — hardens F2/F11/F12 spec) |
| F18 — transcribe.sh silent failures: unguarded ffmpeg dies opaquely; `\|\| true`'d whisper prints empty transcript as success | Should-fix | Accepted (pass 3 — new change, exit-code 4 error path) |
| F19 — F6 as specced breaks the three existing submission fixtures (no `recoRef`); throw-vs-exit unspecified | Should-fix | Accepted (pass 3 — amends F6) |
| F20 — F3's missing-file leniency softens the blocking gate (operator typo → soft pass) | Nit | Accepted (pass 3 — amends F3: `-` sentinel only) |
| F21 — F13's replacement path is off by one level from the file's own directory | Nit | Accepted (pass 3 — corrects F13: `../../_shared/…`) |
| F22 — F12's promised PASS fixture doesn't match the shipped notes skeleton (placeholder-filled, sub-40-char cites) | Nit | Accepted (pass 3 — pins fixtures explicitly, asymmetrically) |
| F23 — floor Trigger A blind to work-history-only fills (`role:`/`trajectory:` prose slots) | Nit | Accepted (pass 3 — extends Trigger A to subjective slots) |

**Rejections: none across all passes** (23/23 accepted; 0 invalid — every quote was verified verbatim against the current files, re-spot-checked at closeout). Within-finding declined alternatives, with argument, are recorded in the "Rejections and declined alternatives" section below.

## Accepted changes (full detail)

### F1 [Blocker] — fix SKILL.md's `--force-transcribe` contract to match the script (script behavior is correct)

- **Files:** `SKILL.md` (flags list, line 39; Phase Transcribe preserve-guard paragraph, line 125). Script BEHAVIOR untouched; F14 adds string-only usage-doc edits.
- **Before:** SKILL.md claims `--force-transcribe` writes to `transcript.whisper.txt` "so the curated file is never clobbered" and "(it still routes to `transcript.whisper.txt`, never over the curated file)". The script does the opposite: `resolve_transcript_target` routes to `transcript.refined.txt` (overwrite) when force=1, and the selftest pins "`--force-transcribe` overwrites refined" (transcribe.sh:94, :264).
- **After (intent):** SKILL.md states the actual contract: WITHOUT the flag, a fresh transcription never clobbers an existing curated `transcript.refined.txt` (preserve guard routes it to `transcript.whisper.txt`); WITH `--force-transcribe`, the new transcription OVERWRITES `transcript.refined.txt` — the overwrite is exactly what makes it destructive-opt-in per §I. Cite `transcribe.sh::resolve_transcript_target` as the single owner of target selection (§K); keep the instruction to surface the script's `preserve:` line.
- **Rationale:** The script's semantics are the only coherent reading — if the flag also routed to whisper.txt it would be a no-op vs the default. Current prose is the dangerous side: it invites operators to pass the flag believing it is safe.
- **Blast radius:** SKILL.md two sentences. Re-run `tools/lint-flags-vs-hints.sh` + `tools/lint-phase-refs.sh` (pmos-toolkit `tools/`).

### F2 [Should-fix; corrected by F11 + F17, extended by F12 + F23, fixtures pinned by F17 + F22] — deterministic citation-coverage floor in check-citations.mjs, covering BOTH gated artifacts

- **Files:** `scripts/check-citations.mjs` (runFiles/checkCitations, ~line 163) + its selftest; one sentence in `SKILL.md` line 15; half a sentence in SKILL.md Phase Coach (line 220).
- **Before:** `return failed === 0 ? 0 : 1` — an artifact with zero `data-cite-tier` elements scores "0 passed, 0 failed" and exits 0, so the blocking INV-1 gate green-lights a completely un-grounded artifact — both output (a) the filled scorecard and output (b) the interviewer notes. Only citation fidelity is enforced, not presence.
- **After (intent):** zero parsed citations → exit 1 with a distinct floor-violation message when EITHER trigger fires:
  - **Trigger A (scorecard; per F11 + F23):** the artifact contains at least one `data-input="notes:…"` element with non-empty text, OR any element carrying a `data-selected` attribute, OR non-empty text in a SUBJECTIVE work-history slot — `data-input="role:scope"`, `role:contribution`, `role:result`, or any `data-input="trajectory:…"` slot. Do NOT key on: `data-input="reco"` text (it is the selection control whose inner text is the four permanent option labels, non-empty on every sheet including the pristine skeleton — skeleton lines 193-198); or the purely factual `role:company|title|tenure` slots (no subjective claim → no cite mandate; SKILL.md:148 scopes the mandate to "subjective per-role/trajectory note"). All the qualifying slots are empty in the shipped skeleton (`notes:` — placeholder is CSS `:empty::before` only; `role:`/`trajectory:` — empty `<div>`s at skeleton lines 161-166).
  - **Trigger B (interviewer notes; per F12):** the artifact root carries `data-output="interviewer-notes"` AND at least one `data-interviewer` section contains a non-empty `<li>` claim. The interviewer-notes skeleton has NO `data-input` attributes anywhere (anchors: `data-output` / `data-interviewer` / `ul.well` / `ul.improve`), so without this the Phase-Coach run of the same INV-1 gate stays inert on exactly the zero-cite failure F2 diagnoses.
  - The two triggers cannot cross-fire: the artifact shapes are disjoint (data-input root vs data-output root).
  - **Detection method (MANDATORY, per F17):** the trigger scan MUST strip HTML comments first (the same `replace(/<!--[\s\S]*?-->/g,'')` pass `parseCitations` already performs) and detect `data-selected` / `data-input` ONLY as attributes inside opening tags (parseCitations-style open-tag scan) — NEVER as raw substrings. The pristine skeleton carries the literal token `data-selected` in three CSS selectors (scorecard-skeleton.html:84/:102/:109) and in doc-comment prose (:14), plus `data-input^="notes"` in CSS (:85); a grep-shaped scan would trip the floor on every sheet ever emitted. This trap class already fired once in this gate (check-citations.mjs:62: "Dogfood-caught: the skeleton's doc-comment tripped the gate.").
  - **Selftest fixtures (PINNED, per F17 + F22 — asymmetric on purpose):**
    - Scorecard-shape PASS case MUST load the SHIPPED `_shared/interview-guidelines/scorecard-skeleton.html` by path (as questionnaire.mjs's selftest already does at questionnaire.mjs:116) — a synthesized fixture without the `<style>` block would let a naive substring scan go green. PASS: shipped skeleton, zero cites → exit 0.
    - Interviewer-notes-shape PASS/FAIL cases MUST use SYNTHESIZED minimal documents (PASS: `data-output="interviewer-notes"` root, one `data-interviewer` section, empty `ul.well`/`ul.improve`, zero cites → 0; FAIL: same with a non-empty prose `<li>`, zero cites → 1). The shipped `reference/interviewer-notes-skeleton.html` is NOT usable as a gate fixture: its template `<li>`s carry `{{strength}}`/`{{improvement}}` placeholder text (reads as "filled") and its two live `<cite data-cite-tier="transcript">` elements hold a ~28-char `{{verbatim ≥40-char quote}}` placeholder — the gate exits 1 on the fidelity length check regardless of the floor. A one-line selftest comment records why. (Declined alternative: making Trigger B `{{…}}`-aware — mustaches never appear in terminal artifacts.)
    - Remaining cases: FAIL — filled scorecard notes, zero cites; FAIL — `data-selected` reco with empty notes, zero cites; FAIL — `role:contribution` filled with prose, everything else empty, zero cites (F23).
- **SKILL.md:** line-15 headline broadened to "…or that carries no citations at all despite filled content"; Phase Coach gains half a sentence noting the coverage floor applies to output (b) too.
- **Rationale:** Presence is trivially deterministic — §H says script it. The pass-2/3 corrections matter: as first drafted the floor would have failed every skeleton (F11), covered only half the gate's mandate (F12), been blind to work-history-only fills (F23), and been implementable as a substring scan that trips on the skeleton's own CSS (F17).
- **Blast radius:** check-citations.mjs + selftest (run-tests.sh picks it up automatically), SKILL.md two small edits. Implement together with F3/F20.

### F3 [Should-fix; amended by F20] — explicit no-transcript invocation form for the gate (notes-only tiers)

- **Files:** `scripts/check-citations.mjs` (runFiles arg handling, lines 156-159; usage text; selftest) + `SKILL.md` Phase Score gate paragraph (line 205) and Phase Coach (line 220).
- **Before:** SKILL.md mandates `check-citations.mjs filled-scorecard.html transcript.refined.txt` unconditionally, but `runFiles` does an unguarded `readFileSync(transcriptPath)` — on a tier-2 notes-only round (no transcript exists) the documented command crashes ENOENT instead of validating notes-tier cites.
- **After (intent):** the script accepts the literal `-` as the transcript positional — an explicit caller declaration of "no transcript" — and treats the transcript as null, symmetric with the existing submission-null handling (lines 117-121): any `data-cite-tier="transcript"` citation then FAILS with "transcript-tier citation but no transcript file was provided"; notes/recalled/submission tiers validate normally. **Per F20, ONLY the literal `-` gets null-transcript behavior:** a supplied path that does not exist remains a HARD error (may be upgraded from a raw ENOENT stack to a clean one-line `error: transcript file not found: <path>` + non-zero exit, but never a soft pass) — auto-nulling a typo'd/never-written path would let a notes-cite-only artifact pass the blocking INV-1 gate on the back of an operator error. Selftest: PASS notes-only with `-`; FAIL transcript-tier cite with `-`; FAIL (hard error) nonexistent transcript path. SKILL.md documents the notes-only form: `scripts/check-citations.mjs filled-scorecard.html - [submission]`.
- **Rationale:** The gate is unconditional in Phase Score/Coach, so the most common degraded path (recruiter screen from notes) must be able to run it. `-` is deliberate; a missing file is an error — hard gates don't auto-degrade an explicitly supplied positional.
- **Blast radius:** check-citations.mjs + selftest, SKILL.md two spots. No other consumer of the script.

### F4 [Should-fix] — SKILL.md degrade prose matches the script's actual (tier3-only) signal

- **Files:** `SKILL.md` Phase Transcribe "Graceful degrade" paragraph (line 127) only.
- **Before:** "exits non-zero with a one-line install nudge and a `degrade:tier2` (notes present) or `degrade:tier3` (no notes) signal on stdout. Honor it:" — but `transcribe.sh::degrade()` hardcodes `echo "degrade:tier3"` and the script never sees the notes.
- **After (intent):** state that the script emits exactly `degrade:tier3` (it cannot see the notes); on receiving it, the MODEL picks the actual tier — interviewer notes present → tier-2 grounding; no notes → tier-3 recall questionnaire (interactive-only; refusal path non-interactively). Cite transcribe.sh's header as the signal-vocabulary owner (§K).
- **Rationale:** Teaching the script about notes would couple transcription to input plumbing for no gain; the prose is the drifted side. F15 improves the stderr nudge but keeps the stdout signal and exit code identical; F18 adds a DISTINCT error exit (4) that is not a degrade — the `degrade:tier3`/exit-3 vocabulary is unchanged.
- **Blast radius:** SKILL.md one paragraph.

### F5 [Should-fix; amended by F16] — storage.sh owns candidate-dir naming AND verbatim input copy, with slugification and back-compat reads

- **Files:** `scripts/storage.sh` (`cmd_new_candidate`, lines 170-183; selftest case 4, lines 267-273) + `SKILL.md` Phase Resolve step 2 (line 115), § Storage layout (line 262), and Phase List prose.
- **Before:** Script builds `<round>-<candidate>` (selftest pins `r1-jane-doe`) and copies nothing — only mkdirs `inputs/` — while SKILL.md documents `<date>-<round>-<candidate>-<lastco>/` and credits the script with copying "each raw input into `inputs/` verbatim". The never-mutate-originals guarantee is unowned prose; `list` globbing the documented layout won't match what the script created. Additionally (F16): no name normalization (`"Jane Doe"` would mint a dir with a space) and no story for old-shape dirs already in users' roots.
- **After (intent):**
  - New signature `new-candidate <role-dir> <round> <candidate> [--lastco <co>] [--date <YYYY-MM-DD>] [input files…]`. The script builds `<date>-<round>-<candidate>[-<lastco>]/` (date defaults to today; lastco omitted when not supplied), mkdirs `inputs/`, and copies each supplied input verbatim into `inputs/` (dies on a missing input; never touches originals).
  - **Slugify (F16a):** round/candidate/lastco segments lowercased, whitespace/underscores → hyphens, non-`[a-z0-9-]` stripped. Selftest asserts `"Jane Doe"` → `jane-doe`.
  - **Back-compat reads (F16b):** SKILL.md § Storage layout + Phase List gain a one-line tolerance: dirs created before the dated layout are `<round>-<candidate>`; `list`/locate walks MUST match both generations (match the `<round>-<candidate>` core; leading `<date>-` and trailing `-<lastco>` optional) and never rename existing dirs — confidential storage roots are user data, not ours to migrate.
  - Selftest case 4 updated to pin the dated slugified name and assert a planted input arrives byte-identical in `inputs/`.
- **Rationale:** Verbatim copy is a deterministic invariant — §H says script + selftest. The dated layout is the correct target (keeps two rounds of the same candidate distinct), so the script moves toward the docs. Tolerant-read + strict-write.
- **Blast radius:** storage.sh (one subcommand + selftest), SKILL.md (3 spots), run-tests.sh picks up the selftest. No other skill calls storage.sh.

### F6 [Should-fix; implementation specified by F19] — the reco-reference line becomes model-authored and script-gated, not boilerplate

- **Files:** `scripts/fill-scorecard.mjs` (submission pass, lines 252-266) + selftest (three fixtures + one new case); `SKILL.md` Phase Score step 3 / submission checklist (lines 197-203).
- **Before:** `fill()` unconditionally injects the fixed sentence "Recommendation accounts for the written-submission assessment above." whenever any submission is passed — the "referenced in reco?" checklist box can never fail. Checkbox theater.
- **After (intent):** the `data-submission-ref` line's text comes from a required `values.submission.recoRef` field — the model-authored one-liner stating HOW the submission moved (or didn't move) the hire/no-hire call.
  - **Gate mechanics (per F19):** the presence gate is `fill()` THROWING (`throw new Error('submission present but values.submission.recoRef is empty — the reco must engage with the submission assessment')`); the CLI `fill` entrypoint catches it and maps to exit 1 with the message on stderr. Library callers (incl. the selftest) get a catchable error; CLI callers get non-zero. **recoRef is NEVER optional-with-warning** — that reinstates the checkbox theater this finding kills.
  - **Fixture amendments (per F19):** the three existing submission fixtures (`filledSub` ~:565, `filledNoBrief` ~:596, `filledPre` ~:622) currently carry no `recoRef` and would break under the gate — each is amended to carry an authored `recoRef` with a sentinel token (`SUB_RECOREF_TOKEN` / `NB_RECOREF_TOKEN` / `PRE_RECOREF_TOKEN`), with an assertion that the token — not boilerplate — lands inside the `data-submission-ref` element. New FAIL case: `fill()` with a submission lacking `recoRef`, in try/catch, asserting the throw.
  - SKILL.md checklist item rewritten to match ("the filler refuses a submission fill without it"); linkage QUALITY remains a model judgment, but the box can now fail.
- **Rationale:** The gate verified the filler's own output. Presence-of-authored-linkage is deterministically checkable; throw-in-library / exit-in-CLI is the only split that keeps both call paths coherent.
- **Blast radius:** fill-scorecard.mjs + selftest, SKILL.md checklist. values.json shape gains one key (documented at the Phase Score call site). Implement together with F7 (same function).

### F7 [Should-fix] — submission-block placement anchors on `data-input="reco"`, loud failure on no-anchor

- **Files:** `scripts/fill-scorecard.mjs` (line 254, `const recoRe = /<section\b[^>]*\bclass\s*=\s*"reco"[^>]*>/;`) + selftest.
- **Before:** the submission-assessment insertion alone anchors on the presentational `class="reco"`; every other pass targets the skeleton's data-* machine anchors (the skeleton declares them THE discovery contract; its reco section carries both). A restyled class → `if (rm)` no match → the whole submission block + reco reference silently vanish.
- **After (intent):** locate the `data-input="reco"` element, walk back to its enclosing `<section>` open tag and insert there; fall back to the `class="reco"` regex for legacy sheets; if NEITHER matches, fail loudly ("no reco anchor found — cannot place the submission assessment") — via the same throw-in-`fill()` / exit-in-CLI mechanics as F6. Selftest: (a) data anchors present, class renamed → block + ref land; (b) no reco anchor → error, not silent omission.
- **Rationale:** Silent drop defeats the "assessed in context?" checklist; data-* is the stated contract.
- **Blast radius:** fill-scorecard.mjs + selftest only. Bundled scorecards carry both anchors — existing behavior unchanged; the mismatch path goes from silent to loud.

### F8 [Nit] — document the `IFB_ROOT` precedence level

- **Files:** `SKILL.md` Phase Resolve step 1 (line 114) only.
- **Before:** documented precedence is `--root` → settings → default; the script implements `--root → IFB_ROOT → settings → default` (storage.sh:147, selftest case 2).
- **After (intent):** insert the env level into the canonical precedence sentence, with a one-line caution that a set-and-forgotten `IFB_ROOT` silently outranks project settings (confidential-data routing) — unset it when not deliberately testing/automating.
- **Rationale:** IFB_ROOT is load-bearing for the selftest and useful for automation; the §K fix is documenting the real precedence in its one home.
- **Blast radius:** SKILL.md one sentence.

### F9 [Nit] — bootstrap `non-interactive.md` into managerkit's `_shared/`

- **Files:** new file `plugins/pmos-managerkit/skills/_shared/non-interactive.md` — byte-identical copy of pmos-toolkit's canonical `skills/_shared/non-interactive.md`. The frozen block in SKILL.md is NOT edited.
- **Before:** the frozen block (SKILL.md:78) cites `_shared/non-interactive.md`, but managerkit's `_shared/` contains only `interview-guidelines/` — the cite dangles within this plugin (also in one-on-one and interview-guide).
- **After (intent):** the file exists in managerkit's `_shared/`, resolving the cite for all three managerkit skills and entering `scripts/sync-shared.sh`'s intersection so it stays aligned thereafter.
- **Rationale:** Exactly the documented bootstrap gap (repo CLAUDE.md: sync-shared is intersection-only; the first cross-plugin copy is placed manually, byte-identical). Rewording the frozen block would require re-freezing it repo-wide — far larger blast radius. The toolkit-rooted `tools/audit-recommended.sh` path inside the block is accepted as-is (frozen; CI-side tool, not a runtime resolve).
- **Blast radius:** one new file; fixes the same dangling cite in one-on-one and interview-guide; sync-shared intersection grows by one file; no lint changes.

### F10 [Nit] — rename the bootstrap phase to remove the Setup name collision (slug stays)

- **Files:** `SKILL.md` heading at line 95 + in-file prose sweep.
- **Before:** two phases both named "Setup": "Phase 0: Setup {#setup-load}" (pre-verb bootstrap) and "Phase: Setup {#setup}" (the setup verb).
- **After (intent):** rename the bootstrap heading to "Phase 0: Load context {#setup-load}" — slug UNCHANGED per §J — and sweep prose so every remaining "Setup" unambiguously means the verb. The secondary integer-numbering suggestion is declined: "Phase 0" / "Phase N" are deliberate ordinal bookends around a verb-routed, non-sequential phase set — numbering between them would be false precision.
- **Blast radius:** SKILL.md one heading + prose sweep; run `tools/lint-phase-refs.sh` afterward.

### F11 [Should-fix] — correction to F2: floor must not key on `data-input="reco"` label text

Folded into F2's Trigger A above. The reco element is the selection control whose inner text is the four permanent option labels — non-empty on every sheet including the pristine skeleton; keying on it would trip the floor on all unfilled scorecards, contradicting F2's own PASS case.

### F12 [Should-fix] — extension to F2: the floor must also cover output (b), interviewer notes

Folded into F2's Trigger B above. Phase Coach mandates the identical INV-1 gate over `interviewer-notes.html`, whose skeleton contains no `data-input` anywhere; without Trigger B a zero-citation coach write-up still exits 0. Fixture specifics per F22 (synthesized, not the shipped skeleton).

### F13 [Nit; path corrected by F21] — fix stale rubric path in interviewer-notes-skeleton doc comment

- **Files:** `reference/interviewer-notes-skeleton.html`, doc comment line 6.
- **Before:** "each scored against reference/interviewer-effectiveness.html." — nothing by that name exists under `reference/` (it holds only the skeleton itself).
- **After (intent, per F21):** "each scored against `../../_shared/interview-guidelines/interviewer-effectiveness.html`." — TWO levels up, because the comment resolves from its own directory (`reference/` → `interview-feedback/` → `skills/` → `_shared/`). The pass-2 draft said `../_shared/…`, copied from SKILL.md/run-tests.sh which resolve from the SKILL ROOT — from `reference/` that lands on nonexistent `interview-feedback/_shared/`. Verify by resolving the path relative to the file before committing.
- **Blast radius:** one comment line; no script/lint/test touches that string.

### F14 [Nit] — transcribe.sh usage strings gain `--force-transcribe` (string-only)

- **Files:** `scripts/transcribe.sh` header Usage comment (line 6) + usage error string (line 326).
- **Before:** both list only `[--model <medium|base>]` while main() parses `--force-transcribe` (line 295) — the script's own doc surface hides its one destructive flag.
- **After (intent):** both strings read `transcribe.sh <recording> <out-dir> [--model <medium|base>] [--force-transcribe]`; header gains "(--force-transcribe OVERWRITES an existing transcript.refined.txt)". No parsing/routing change; selftest unaffected. F1's "script untouched" stance applied to BEHAVIOR and is amended to permit this self-documentation fix.
- **Blast radius:** two strings in transcribe.sh. lint-flags-vs-hints operates on SKILL.md — unaffected.

### F15 [Nit] — degrade nudge names the actually-missing dependency

- **Files:** `scripts/transcribe.sh` degrade() (~lines 108-113) + its call site (line 127); optionally one selftest assertion.
- **Before:** all three missing-dependency conditions (no model / no whisper-cli / no ffmpeg) funnel into the single stderr message "whisper model not found — install whisper.cpp + a ggml model…".
- **After (intent):** the call site passes a cause string into degrade() ("no ggml model under ~/whisper-models/" / "whisper-cli not on PATH — install whisper.cpp" / "ffmpeg not on PATH — install ffmpeg"); degrade() prints the cause-specific nudge on stderr. Stdout stays exactly `degrade:tier3`, exit stays 3 — F4's contract untouched. Optionally extend the degrade selftest to assert the stderr names the missing dependency.
- **Blast radius:** ~6 lines in transcribe.sh; SKILL.md unchanged.

### F16 [Nit] — amendments to F5: slugify on write, tolerate old-shape dirs on read

Folded into F5's After above (slugify pass; both-generations read tolerance; never rename existing confidential dirs).

### F17 [Should-fix] — hardening of F2/F11/F12: mandated tag-scoped, comment-stripped detection + pinned scorecard PASS fixture

Folded into F2's "Detection method" and "Selftest fixtures" above.

- **Why it was needed:** the pristine skeleton contains the literal token `data-selected` in three CSS selectors (scorecard-skeleton.html:84/:102/:109) and doc-comment prose (:14) — a grep-shaped implementation of the floor trips on every sheet ever emitted, and the PASS fixture only guards against this if it is the SHIPPED skeleton (a synthesized minimal fixture without the `<style>` block lets the naive scan go green). This trap class already fired once in this very gate (check-citations.mjs:62: "Dogfood-caught: the skeleton's doc-comment tripped the gate."), so the spec must mandate parseCitations-style open-tag attribute detection after comment-stripping AND pin the PASS fixture by path (as questionnaire.mjs:116 already does).
- **Blast radius:** none beyond F2's files.

### F18 [Should-fix] — transcribe.sh: loud, distinct error path for ffmpeg/whisper failures; never print success on an empty transcript

- **Files:** `scripts/transcribe.sh` — wav extraction (line 139), per-chunk ffmpeg (line 165), whisper invocations (lines 166, 171), final transcript guard, header contract line (line 15), selftest; one clause in `SKILL.md` Phase Transcribe.
- **Before:** header line 15 promises "It never fails hard / never crashes the caller", but under `set -euo pipefail` (line 20) an ffmpeg failure on a corrupt/unsupported recording kills the script with ffmpeg's exit code, NO `degrade:` signal, NO diagnostic (stderr → /dev/null). Conversely every whisper-cli call is `|| true`'d, so a whisper crash yields a ZERO-BYTE `transcript.refined.txt` printed as success (exit 0) — a fabricated-empty grounding source handed to Phase Ground with a green exit.
- **After (intent):**
  - Wrap the wav extraction in an explicit check (`if ! ffmpeg …`); tee ffmpeg stderr to `<out-dir>/ffmpeg.log` instead of /dev/null; on failure print `error: ffmpeg could not decode <recording> — see <out-dir>/ffmpeg.log` on stderr and exit with a NEW distinct code **4** — no `degrade:` signal (a bad input is not a missing dependency). Same guard on per-chunk ffmpeg.
  - Keep per-chunk whisper `|| true` (one bad chunk shouldn't kill a long recording), tee whisper stderr to `<out-dir>/whisper.log`, and add a hard final guard: if the transcript target is empty (`! -s`) after all whisper runs, print `error: whisper produced an empty transcript — see <out-dir>/whisper.log` and exit 4 instead of the success lines.
  - Header line 15 rescoped: "never fails hard" applies to MISSING DEPENDENCIES (degrade:tier3, exit 3); input/transcription failures exit 4 with a diagnostic and no degrade signal.
  - Selftest: PATH-shadow a failing ffmpeg → exit 4 + error line + no degrade signal; PATH-shadow a whisper-cli that writes nothing → exit 4, no success line (bash-3.2-safe PATH shadowing as the existing degrade case).
  - SKILL.md Phase Transcribe gains one clause distinguishing exit 3 (`degrade:tier3` — route tiers) from exit 4 (input/transcription error — surface the log; do NOT degrade).
- **Rationale:** Both silent modes violate the script's own header contract; empty-transcript-as-success is the worse one — it corrupts the skill's core grounding promise. Exit-code separation preserves F4's signal vocabulary and F15's cause nudge exactly.
- **Blast radius:** transcribe.sh (~15 lines) + selftest; one SKILL.md clause. Routing + the degrade path are untouched (F1/F4 stances preserved — this ADDS a previously-undefined error path). Same file as F14/F15 — implement as one transcribe.sh change set.

### F19 [Should-fix] — amendment to F6: throw-in-library / exit-in-CLI, and the three existing fixtures gain `recoRef`

Folded into F6's "Gate mechanics" and "Fixture amendments" above.

- **Why it was needed:** the selftest calls `fill()` directly with three submission fixtures (`filledSub` ~:565, `filledNoBrief` ~:596, `filledPre` ~:622), none carrying `recoRef` — a literal `process.exit` inside fill kills the selftest mid-run; an unhandled throw aborts the fixtures' assertions; and the underspecification invites the one wrong implementation (optional-with-warning recoRef) that reinstates the checkbox theater F6 kills. The cross-cutting "keep existing selftest cases green and extend, don't rewrite" note is amended: fixture INPUTS may be minimally extended to satisfy a newly-gated required field; assertions are extended, not rewritten.
- **Blast radius:** none beyond F6's files.

### F20 [Nit] — amendment to F3: only the literal `-` declares no-transcript; a missing file stays a hard error

Folded into F3's After above. Auto-nulling a typo'd or never-written transcript path would let a notes-cite-only artifact pass the blocking INV-1 gate on the back of an operator error; the sentinel is deliberate, the missing file is not.

### F21 [Nit] — correction to F13: the replacement path needs `../../_shared/…` from the file's own directory

Folded into F13's After above. The pass-2 draft copied SKILL-root-relative `../_shared/` into a file one level deeper — replacing one dangling path with another.

### F22 [Nit] — correction to F12's fixtures: the shipped notes skeleton is not a valid PASS fixture

Folded into F2's "Selftest fixtures" above. The shipped `reference/interviewer-notes-skeleton.html` has placeholder-filled `<li>`s (`{{strength}}`/`{{improvement}}`) and two live sub-40-char transcript-tier cite elements — it exits 1 on the fidelity check regardless of the floor. Notes-shape fixtures are synthesized; the ASYMMETRY vs the scorecard fixture (which MUST be the shipped file, per F17) is deliberate and recorded in a selftest comment. Declined alternative: `{{…}}`-placeholder-aware triggers (no terminal artifact contains mustaches).

### F23 [Nit] — extension to F2's Trigger A: count subjective `role:`/`trajectory:` slots

Folded into F2's Trigger A above. A work-history sheet with subjective prose in `role:scope|contribution|result` / `trajectory:*` slots but empty notes and no selections is a claim-bearing artifact SKILL.md:148 mandates cites for — the floor must see it. Factual `role:company|title|tenure` slots are excluded (no subjective claim). All qualifying slots verified empty in the shipped skeleton (lines 161-166), so the pinned-skeleton PASS case still holds. New FAIL selftest case: `role:contribution` prose only, zero cites.

## Cross-cutting implementation notes (for whoever applies this)

- **check-citations.mjs change set:** F2 + F3 + F11 + F12 + F17 + F20 + F22 + F23 are one coherent edit — implement together. Detection is tag-scoped and comment-stripped (F17); fixtures are pinned asymmetrically (shipped scorecard skeleton by path; synthesized notes-shape docs). Keep existing selftest cases green and extend.
- **fill-scorecard.mjs change set:** F6 + F7 + F19 touch the same `fill()` submission pass — implement together. Gate = throw in `fill()`, exit-1 mapping in the CLI. The three existing submission fixtures gain `recoRef` sentinel tokens (input extension permitted; assertions extended, not rewritten).
- **storage.sh change set:** F5 + F16 are one edit to `cmd_new_candidate` + selftest + SKILL.md storage prose.
- **transcribe.sh change set:** F14 (usage strings) + F15 (degrade cause) + F18 (error path) are one edit. Invariants: stdout `degrade:tier3` + exit 3 byte-identical (F4); routing/preserve-guard behavior untouched (F1); NEW exit 4 = input/transcription error, never a degrade.
- After all SKILL.md edits, run the four hygiene checks: `tools/lint-flags-vs-hints.sh`, `tools/lint-phase-refs.sh`, `tools/lint-non-interactive-inline.sh`, `tools/audit-recommended.sh` (pmos-toolkit `tools/`; the first two take the skill dir, the audit takes the SKILL.md file).
- All script edits must extend the corresponding `--selftest` and stay bash-3.2-safe (storage.sh/transcribe.sh) / zero-dependency Node (mjs files); `tests/run-tests.sh` drives the selftests.

## Rejections and declined alternatives

**Rejected findings: none in any pass** (23/23 accepted; 0 invalid — every ≥40-char quote verified verbatim against the current files, and re-spot-checked at the final closeout: skeleton `data-selected` tokens at :14/:84/:102, check-citations.mjs:62 "Dogfood-caught", transcribe.sh:139 unguarded ffmpeg, fill-scorecard.mjs:575 `liveContext` fixture with zero `recoRef` occurrences).

Declined within-finding alternatives, each argued at acceptance time:

- **F9 alternative (re-freeze the non-interactive block plugin-neutrally):** declined — rewording the frozen block means re-freezing it byte-identically across every plugin in the repo; the documented bootstrap copy into managerkit's `_shared/` achieves the same resolution with a one-file blast radius.
- **F10 secondary suggestion (integer-number all phases):** declined — "Phase 0" / "Phase N" are deliberate ordinal bookends around a verb-routed, non-sequential phase set; numbering between them would be false precision.
- **F22 alternative (make Trigger B `{{…}}`-placeholder-aware):** declined — template mustaches never appear in terminal artifacts, so teaching the gate to recognize them adds scan surface for zero production value; synthesizing the notes-shape fixtures is the cheaper, safer route.

## Open questions

None. No unresolved disagreements remain: every finding was accepted, every declined alternative was a within-finding implementation choice argued inline (F9 / F10 / F22 above), and the final closeout pass found no reviewer finding without an author response.
