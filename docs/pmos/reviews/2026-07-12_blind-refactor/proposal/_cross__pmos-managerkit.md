# Cumulative proposal — pmos-managerkit__cross (FINAL)

**Unit:** pmos-managerkit__cross (whole plugin: `plugins/pmos-managerkit/skills/` — interview-feedback, interview-guide, one-on-one, `_shared/interview-guidelines/`)
**Status:** CAPPED — 5 passes completed when the review loop terminated; the final pass (pass 5) still surfaced a material [Should-fix] (F19), so convergence to a nits-only/empty pass was not demonstrated before the cap. All findings are nonetheless accepted with described fixes; nothing is contested.
**Tally:** 22 findings → 22 accepted / 0 rejected / 0 invalid.

This document is self-contained and final: it describes every proposed change in full, with all pass-2/3/4/5 amendments folded into the relevant change descriptions. Nothing has been implemented — all changes below are intent, not diffs.

## Finding table

| ID | Severity | Disposition | Notes |
|---|---|---|---|
| F1 | Should-fix | Accepted | trigger collision; amended by F8 |
| F2 | Should-fix | Accepted | ungated setup scorecard path; amended by F9, F12, F15, F16, F22 |
| F3 | Should-fix | Accepted | dangling skill-patterns.md cite ×2 |
| F4 | Should-fix | Accepted | one-skill manifests/README/charter; amended by F11, F14; F17 rides its README edit |
| F5 | Should-fix | Accepted | §K archetype enumeration; amended by F10; sweep extended by F13, F18, F21 |
| F6 | Nit | Accepted | dead `../SKILL.md` back-links; extended by F20 (script path) |
| F7 | Nit | Accepted (fix in canonical substrate, pmos-toolkit-owned) | frozen-block pmos-toolkit-isms |
| F8 | Should-fix | Accepted (amends F1 — fix both directions) | |
| F9 | Should-fix | Accepted (amends F2 — consumption-point gate) | |
| F10 | Should-fix | Accepted (amends F5 — two-way lockstep contract) | |
| F11 | Nit | Accepted (amends F4 — keywords too) | |
| F12 | Should-fix | Accepted (amends F2 — anchors-present scoping) | |
| F13 | Should-fix | Accepted (extends F5's §K sweep to the effectiveness rubric) | |
| F14 | Nit | Accepted (sharpens F4 — charter preamble retained) | |
| F15 | Should-fix | Accepted (amends F2 — fallback firing condition pinned; headless uses primary path) | |
| F16 | Should-fix | Accepted (amends F2 — fallback cites interview-guide's weighting protocol, §K) | |
| F17 | Nit | Accepted (rides F4's README edit — "interviewer-effectiveness notes" rename) | |
| F18 | Nit | Accepted (extends F5's §K sweep — scorecard anchor set, cite-the-skeleton) | |
| F19 | Should-fix | Accepted (harden guard-write failure to hard stop + document why postures differ) | pass 5 |
| F20 | Nit | Accepted (extends F6 — repoint the dangling `scripts/` path on the same line) | pass 5 |
| F21 | Nit | Accepted (broadens the §K sweep to "any bundled enumerated set"; drops literal "12") | pass 5 |
| F22 | Nit | Accepted (pins F15's fallback condition — operator-decline + dispatch-unresolvable) | pass 5 |

---

## F1 + F8 [Should-fix] — Trigger collision between interview-feedback `setup` and interview-guide, resolved in BOTH directions

**Defect (F1).** interview-feedback/SKILL.md:3 (frontmatter description) claims trigger "set up the interview loop for \<role\>"; interview-guide/SKILL.md:3 claims "Use when setting up a role's interview loop… set up the \<role\> interview loop". A user saying "set up the interview loop for Senior PM" matches both with no disambiguation rule; the router picks nondeterministically.

**Defect (F8, pass 2).** F1's original plan removed the loop phrase only from interview-feedback and merely appended a NOT-for to interview-guide — leaving interview-guide's positive loop claims intact. But interview-guide's own body (SKILL.md:8) scopes it to "the interviewer-facing kit for **one interview round**"; a "loop" is the whole multi-round process, which is exactly what interview-feedback `setup` scaffolds. Fixing only one side would deterministically route whole-loop requests to the wrong (single-round) skill.

**Change (described, not implemented).**
- `plugins/pmos-managerkit/skills/interview-feedback/SKILL.md` line 3, frontmatter `description`:
  - Reword the setup clause to what setup actually does: "scaffolding a role's interview process storage (rounds, role.json)".
  - Replace trigger phrase "set up the interview loop for \<role\>" with "scaffold the interview process for \<role\>" — interview-feedback `setup` remains the rightful home of whole-loop/process-scaffolding language.
  - Append a NOT-for boundary (pattern from /shape's description): "NOT for authoring one round's interviewer kit — reference, scoring sheet, case doc (/interview-guide)."
- `plugins/pmos-managerkit/skills/interview-guide/SKILL.md` line 3, frontmatter `description` (F8 amendment):
  - Reword "Use when setting up a role's interview loop" → "Use when authoring a round's interviewer kit within a role's interview loop".
  - Retire the trigger "set up the \<role\> interview loop" entirely — the remaining triggers ("write the interviewer guide for \<round\>", "build a scoring sheet for \<role\>", "draft a case study for the product-sense round", "make an interviewer brief") already cover the skill's real per-round scope.
  - Append the mirror boundary: "NOT for scaffolding the role's process storage or scoring a candidate (/interview-feedback setup / score)."

**Rationale.** The skills genuinely divide the work (guide = one round's kit + its §H validator; feedback setup = role storage + role.json). Post-change, whole-loop language routes to interview-feedback setup, per-round language to interview-guide, and both carry explicit mirror boundaries.

**Blast radius.** Two frontmatter descriptions; skill-eval description/triggering checks re-run on both skills; no scripts/lints/tests. README + plugin.json prose swept for the retired phrases as part of F4's edit.

---

## F2 + F9 + F12 + F15 + F16 + F22 [Should-fix ×5 + Nit] — Ungated scorecard paths: setup authoring AND score-time consumption bypass the anchor validator; gate scoped to anchored sheets; fallback firing condition pinned and made implementable; fallback weighting protocol cited

**Defect (F2).** Setup phase (interview-feedback/SKILL.md ~line 224) generates scorecards by instantiating `../_shared/interview-guidelines/scorecard-skeleton.html` directly, bypassing `interview-guide/scripts/validate-scorecard-anchors.mjs` (weights-sum-to-100 / anchor-set / data-budget≤data-duration hard gate — exists only on the guide path; script verified to exist). Two authoring paths for the same machine-anchored artifact, one gated, one not.

**Defect (F9, pass 2).** Gating setup is not enough: the `score` verb accepts a round's scorecard directly as input, and `fill-scorecard.mjs` reads `data-weight` values but never asserts they sum to 100 (independently re-verified by grep — no weight-sum/100 assertion exists). The documented "Foreign scorecard (no anchors)" DOM-inference fallback triggers only when anchors are **absent**, not when they are present-but-invalid. So a malformed anchored sheet handed in at score time is filled silently — nothing bites at all.

**Defect (F12, pass 3).** F2's setup gate as originally specified ("every generated **or user-attached** scorecard must pass the validator … never proceed") had no carve-out for anchor-less sheets — but Setup is exactly where an operator attaches their company's OWN scorecard, which may legitimately carry no `data-card="scorecard"` anchors. The plugin supports that artifact end-to-end (SKILL.md:150's foreign-scorecard path; reference-resolution.md:15 routes it through `fill-scorecard.mjs parse` with `anchored:false`). A carve-out-free setup gate would hard-fail a supported workflow the score verb still honors.

**Defect (F15, pass 4).** The fallback's firing condition read "(for --non-interactive / degradation parity)" — vague enough that an implementer would route EVERY headless `setup` around the primary /interview-guide path. But interview-guide fully supports `--non-interactive` (verified: `--non-interactive` in its argument-hint at SKILL.md:5, frozen non-interactive block at :60, DEFER contracts for duration/case/business-context at :42), so headless mode is not a valid fallback reason; leaving it unpinned silently defeats F2's rationale (guide owns kit authoring + validator; interop design D8) on the most common unattended path.

**Defect (F16, pass 4).** The gated fallback carried zero weighting guidance: the sum-to-100 assignment discipline and the work-history rule that "weights are **selected, not assigned** (design D7/D8)" (interview-guide/SKILL.md:196; ladder-copy protocol at {#work-history-weights}, :194–198, copying verbatim from the seniority-selected row of `guidelines/work-history/level-ladder.md`) live only in interview-guide. A fallback setup of a `work-history` round would either loop on gate failure with no repair recipe, or free-assign weights that happen to sum to 100 — passing the validator while violating the D7/D8 contract the validator cannot see.

**Defect (F22, pass 5).** F15's pinned condition "skill not installed / not resolvable" was unimplementable as written: both skills ship in the same plugin (installing one installs both), making "not installed" a near-dead branch, and the accompanying "child-skill availability probe" was undefined — an implementer would most likely test for the SKILL.md file on disk, which always succeeds, silently reducing the fallback to operator-decline-only without the spec saying so. It also appeared to contradict F16's cite-the-file-on-disk recipe until dispatch-resolution and file-reading were named as different things.

**Change.** `plugins/pmos-managerkit/skills/interview-feedback/SKILL.md`:
1. **Setup phase {#setup} — primary path:** "invoke /interview-guide for the round" becomes the primary kit-generation path (that skill owns kit authoring and its validator; enforces interop design D8 rather than duplicating it). **F15 amendment — headless dispatch:** `--non-interactive` setup still uses the primary path, dispatching interview-guide with `[mode: non-interactive]` prepended per the frozen block's child-dispatch rule.
2. **Fallback firing condition (F15, pinned by F22):** the skeleton-instantiation fallback fires ONLY in two defined cases: (a) **operator-decline** — the operator explicitly declines the primary path for a round (the common branch); (b) **dispatch-unresolvable** — the platform's Skill/dispatch mechanism cannot resolve `interview-guide` as an invocable skill (the Platform Adaptation case: hosts that load skills individually rather than per-plugin). The probe is "attempt the dispatch, fall back on resolution failure" — NOT a SKILL.md-on-disk check; no separate probe primitive exists or is invented (the dispatch attempt IS the probe; the "child-skill availability probe" phrase is struck from this change's blast radius). Non-interactive mode is NOT a fallback trigger. "Degradation parity" is re-scoped to node-less environments, which degrade per item 5's wording on either path.
3. **Setup fallback gate (F12-scoped):** the fallback carries an explicit §H hard gate that runs **only on sheets that carry the machine anchors** (`data-card="scorecard"` present — generated sheets always do, since the skeleton bakes anchors in): `node ../interview-guide/scripts/validate-scorecard-anchors.mjs <sheet>`; non-zero exit → repair and re-run, never proceed. An **anchor-less user-attached** scorecard takes the documented foreign-scorecard path (DOM inference; interactive confirm / non-interactive open-question logging) and is written into the role with an `anchored:false` note — never hard-refused. Present-but-invalid anchors still hard-fail (that IS the F2 defect: "anchored implies valid", not "everything must be anchored"). **F16 amendment — weighting protocol, §K cite-don't-restate:** the fallback spec adds one line: "when instantiating a scoring sheet, follow interview-guide's weighting protocol — `../interview-guide/SKILL.md#scoring-sheet`, and for `work-history` rounds `../interview-guide/SKILL.md#work-history-weights` (weights are copied verbatim from the seniority-selected row of `../_shared/interview-guidelines/guidelines/work-history/level-ladder.md`, never free-assigned — design D7/D8)." The cite works even when the /interview-guide skill is dispatch-unresolvable (item 2 case b), because it is a *reading* dependency on a file on disk in the same plugin, not a dispatch dependency.
4. **Consumption-point gate (F9), Phase: Resolve {#resolve} / Score {#score}:** before `fill-scorecard.mjs` runs on any sheet that **carries the machine anchors**, run the same validator. Exit 0 → proceed. Non-zero → interactive: surface the validator's failure list and repair (or have the user fix) before filling; non-interactive: refuse to fill and report the failures (a mis-weighted sheet silently mis-weights the whole scorecard — no safe default). The anchor-less foreign-scorecard DOM-inference path is untouched.
5. **Degradation:** node-missing wording matching interview-guide/SKILL.md:58 at both gates (emit + stderr warn; at score time, proceed with the model flagging visible weight/anchor inconsistencies as open questions).

**Rationale.** One validator for one artifact contract, run at both the authoring and consumption points, scoped identically at both (anchors-present only); the primary authoring path is the skill that owns the protocol, on every mode including headless; the fallback fires only on two defined, implementable conditions and carries a cite to the weighting discipline the validator can't check. `fill-scorecard.mjs` itself stays unchanged (gate runs before it — validation stays out of the fill script).

**Blast radius.** interview-feedback Setup + Resolve/Score phases + degradation section; new same-plugin cross-skill script dependency (`../interview-guide/scripts/validate-scorecard-anchors.mjs`, path verified, script unchanged); two new cross-skill anchor cites ({#scoring-sheet}, {#work-history-weights} — both verified present in interview-guide/SKILL.md) enter lint-phase-refs.sh's scan surface → re-run the lint after the edit; skill-eval §H and §L wording re-checked on interview-feedback; fill-scorecard.mjs and the foreign-scorecard path untouched; interop design D8 doc unchanged (this enforces it).

---

## F3 [Should-fix] — Dangling skill-patterns.md cite in two of three skills

**Defect.** interview-feedback/SKILL.md:19 and interview-guide/SKILL.md:20 cite `../feature-sdlc/reference/skill-patterns.md`, which resolves to `plugins/pmos-managerkit/skills/feature-sdlc/` — verified nonexistent. one-on-one/SKILL.md:23 has the correct form.

**Change.** In both files, replace the path with the verified-resolving cross-plugin form used by one-on-one: `../../../pmos-toolkit/skills/feature-sdlc/reference/skill-patterns.md`.

**Blast radius.** Two one-line edits; lint-phase-refs.sh doesn't validate this path shape; no tests.

---

## F4 + F11 + F14 + F17 [Should-fix + 3 Nits] — Manifests (description AND keywords) + README + charter row describe a one-skill plugin (three shipped); charter preamble retained; README output-(b) term renamed

**Defect (F4).** `.claude-plugin/plugin.json:4` and `.codex-plugin/plugin.json:4` (verified identical): "Ships /interview-feedback, which…". README.md:6–7: "The first skill is `/interview-feedback`; more manager skills (team reviews, 1:1 prep, calibration) will land here over time" — but /one-on-one and /interview-guide have shipped; README "## Skills" documents only interview-feedback (0 grep hits for the other two — verified). Repo-root CLAUDE.md:15 charter row has the same single-skill parenthetical.

**Defect (F11, pass 2).** The manifests' `keywords` arrays also fossilize the one-skill era: all 7 entries (manager, hiring, interview, scorecard, feedback, coaching, transcription — verified) describe /interview-feedback's domain; nothing surfaces /one-on-one or /interview-guide's authoring side, so marketplace search keeps advertising a one-skill plugin even after the description fix.

**Defect (F14, pass 3).** The F4 replacement text was specified starting at "Ships /interview-feedback (…)" with no statement about the leading charter sentence ("Manager kit — skills that help you do manager work: hiring, team, and reviews.") — an implementer following the proposal literally could drop it, severing the description's mirror of the repo-root CLAUDE.md charter row.

**Defect (F17, pass 4).** README.md:19 names output (b) "**interviewer-performance notes**" — a term used nowhere in the skill; the canonical name is "interviewer-effectiveness notes" (verified: interview-feedback/SKILL.md:13 and :220; rubric file `interviewer-effectiveness.html`). F4's README scope (intro fossil + two missing sections) would let this pre-existing drift in the surviving `### /interview-feedback` section ride through.

**Change.**
- Both plugin.json `description` fields (F14 amendment): the charter preamble sentence "Manager kit — skills that help you do manager work: hiring, team, and reviews." is **retained verbatim**; only the "Ships …" clause that follows it is rewritten, to one clause per skill: "Ships /interview-feedback (grounded candidate scorecard + interviewer coaching notes), /interview-guide (per-round interviewer kit: reference, anchored scoring sheet, case docs), and /one-on-one (1:1 prep, notes, and follow-up tracking)." Final shape = preamble sentence + new three-skill sentence, identical in both manifests.
- Both plugin.json `keywords` arrays (F11 amendment) → keep the existing 7 (still accurate), add "one-on-one", "1:1", "interviewer-guide", "case-study", "interview-loop". Verify the .codex-plugin manifest carries a `keywords` field before editing; add only where the field exists (no schema invention).
- `plugins/pmos-managerkit/README.md` → three-skill intro sentence replacing the "first skill" fossil; add `### /interview-guide` and `### /one-on-one` sections under "## Skills"; and (F17 amendment) in the surviving `### /interview-feedback` section, rename output (b) at line 19 from "interviewer-performance notes" to "interviewer-effectiveness notes" (README is the only home of the drifted term — verified by grep).
- Repo-root `CLAUDE.md:15` charter row parenthetical → name all three skills.
- Per repo policy, the paired plugin.json edits (description + keywords together) ride the next managerkit release commit (no standalone version bump; no `version` fields added to marketplace.json).

**Blast radius.** Both manifests (paired edit), README.md, repo-root CLAUDE.md; no SKILL.md files, no lints/evals/tests.

---

## F5 + F10 + F13 + F18 + F21 [Should-fix ×3 + Nit ×2] — §K enumeration drift: 8-archetype list, 8-dimension effectiveness rubric, scorecard anchor set, AND the 12-competency work-history set; canonical homes with two-way lockstep contracts; sweep broadened to "any bundled enumerated set"

**Defect (F5).** interview-feedback/SKILL.md:252 and interview-guide/SKILL.md:242 each hand-copy the full 8-archetype list plus the count "the 8 bundled PM round types"; ground truth is the 8 dirs under `skills/_shared/interview-guidelines/guidelines/` (verified), which neither cites. Archetype #9 requires hand-syncing two lists and two counts — the exact drift that caused the first-ever red [J] gate (2026-07-09).

**Defect (F10, pass 2).** F5's originally proposed README rule ("the archetype set IS this directory's subdir listing; adding a dir adds an archetype") contradicts the inline role.json enum F5 deliberately retains: adding a 9th subdir does NOT make role.json accept the new id until the retained enum is hand-edited. An authoritative-sounding doc asserting a one-file invariant that is actually a two-file invariant would recreate the drift class it exists to kill.

**Defect (F13, pass 3).** Same §K class for the interviewer-effectiveness rubric: interview-feedback/SKILL.md ~:220 (Phase Coach) hand-restates the full 8-dimension list, and reference-resolution.md:21 hand-count-claims it ("all 8 dimensions in `interviewer-effectiveness.html`"). F5's original sweep ("literal \"8\" count-claims in both skills") misses both. The canonical home is the bundled HTML rubric itself.

**Defect (F18, pass 4).** Third instance: the scorecard anchor set. interview-feedback/SKILL.md:146 re-enumerates the anchors inline ("`data-dim`, `data-weight`, `data-scale`, `data-v`, `data-input=\"notes:<dim>\"`, `data-flags`, `data-input=\"reco\"`") and output-shapes.md:45–52 restates the full list — and the two prose copies have already drifted (verified: :146 omits `data-duration`/`data-budget`, which surface only later at ~:152 and which output-shapes.md documents; output-shapes.md:49 hardcodes `data-scale="1-4"` where :146 says bare `data-scale`). The skeleton HTML + validator are the real enforcers.

**Defect (F21, pass 5).** Fourth instance, escaping the sweep by construction: the work-history competency count "12 Reforge/Mehta" is hand-restated at interview-guide/SKILL.md:196 and :246 plus twice in the corpus `guidelines/work-history/scorecard.html` comments (:11, :198). The sweep as scoped named "the three sets", so set #4 survived; the next reviewer would have to re-find set #5. Ground truth is `level-ladder.md`'s weight table / the shipped scorecard's `data-dim` set.

**Change.**
- Create canonical home `plugins/pmos-managerkit/skills/_shared/interview-guidelines/guidelines/README.md`: the bundled archetypes one per line with a one-phrase gloss, plus (F10 amendment) a **two-way contract** instead of the one-file rule: "the archetype set is defined by this directory's subdirs; adding one requires (1) the new `guidelines/<id>/` dir and (2) updating the `archetype ∈` enum in interview-feedback/SKILL.md § role.json {#storage} — the two MUST stay in lockstep", followed by a short adding-archetype-#9 checklist. (Managerkit-local `_shared` — not in the cross-plugin sync intersection; no sync-shared.sh implications.)
- interview-feedback/SKILL.md:252: keep the inline enum (role.json schema is load-bearing for validation) but drop the literal count in favor of "(the bundled PM round types — canonical list: `../_shared/interview-guidelines/guidelines/README.md`)", and (F10 amendment) add an adjacent back-pointer marker HTML comment — `<!-- archetype-enum: keep in lockstep with ../_shared/interview-guidelines/guidelines/README.md -->` — which the README names, so the two homes cite each other.
- interview-guide/SKILL.md:242: replace the restated list with a cite to the same README plus only per-skill deltas (case-type archetypes; work-history's non-case note).
- Effectiveness rubric (F13 amendment, same commit, same §K shape):
  - interview-feedback/SKILL.md Phase Coach (~:220): drop the inline 8-dimension enumeration in favor of citing the canonical home: "scored against `../_shared/interview-guidelines/interviewer-effectiveness.html` (the bundled researched rubric — the dimension set is defined there)".
  - reference-resolution.md:21: drop the literal count → "holds the lead to the **full** rubric in `interviewer-effectiveness.html`".
  - reference-resolution.md:22's shadow reduced set (note-quality, calibration, bias-mitigation) is **kept** — a per-consumer delta (a behaviorally meaningful subset selection), which §K permits at the call site — but gains a lockstep note naming the rubric file as the home of the dimension ids.
- Scorecard anchor set (F18 amendment, same commit, same §K shape):
  - interview-feedback/SKILL.md:146 keeps its framing sentence — "`../_shared/interview-guidelines/scorecard-skeleton.html` is the contract" — and drops the parenthetical re-enumeration in favor of "(the anchor set is defined by the skeleton; `validate-scorecard-anchors.mjs` is its enforcer)".
  - interview-guide/reference/output-shapes.md's copy stays (it is interview-guide's authoring-side emit contract) but gains a one-line lockstep note naming the skeleton as ground truth.
- Work-history competency set (F21 amendment, same commit, same §K shape):
  - interview-guide/SKILL.md:196 and :246 drop the literal "12" in favor of "the Reforge/Mehta competency `data-dim`s (the set is defined by `../_shared/interview-guidelines/guidelines/work-history/scorecard.html`; weights by `level-ladder.md`)".
  - The corpus `scorecard.html`'s own comments (:11, :198) are **kept** as-is — self-describing comments inside the ground-truth file itself; in-home counts are not the drift class, cross-file ones are (same judgment as retaining the load-bearing role.json enum).
- Sweep instruction (broadened by F21): sweep both skills AND `_shared/interview-guidelines/*.md` for any literal enumeration/count restatement of **ANY bundled enumerated set** (archetypes, effectiveness dimensions, scorecard anchors, work-history competencies, …) — ground truth is always the bundled artifact/directory; prose cites it.

**Blast radius.** One new `_shared` file; SKILL.md edits at three touch-points in interview-feedback (:252 enum, Coach ~:220, Score :146) + three in interview-guide (:242, :196, :246); reference-resolution.md two lines; output-shapes.md one added note; corpus HTML, interviewer-effectiveness.html, scorecard-skeleton.html, validate-scorecard-anchors.mjs, fill-scorecard.mjs, questionnaire.mjs all untouched (inline role.json enum retained); the next release's [J] coherence gate is the enforcement backstop for the lockstep claims; lint-phase-refs unaffected.

---

## F6 + F20 [Nit ×2] — `_shared/interview-guidelines/reference-resolution.md` fossilizes its pre-move location: dead SKILL.md back-links AND a dangling script path

**Defect (F6).** Lines 3, 15, 25 link `../SKILL.md#resolve|#coach|#score|#transcribe`, which resolve to `skills/_shared/SKILL.md` — verified nonexistent. The doc fossilizes its pre-move (epic 260702-cqf) location. lint-phase-refs.sh doesn't scan reference-doc back-links.

**Defect (F20, pass 5).** The same line 15 carries a third pre-move fossil F6's original edit missed: "`scripts/fill-scorecard.mjs parse`" resolves relative to the doc's home as `_shared/interview-guidelines/scripts/fill-scorecard.mjs` — verified nonexistent (the directory contains no `scripts/`, re-confirmed at closeout); the script lives at `skills/interview-feedback/scripts/fill-scorecard.mjs` (verified). Implementing F6 as originally written would repair the anchor link and ship the dangling script path in the same sentence.

**Change.** Repoint **every pre-move relative path in the file — SKILL.md anchors AND script paths** — to the doc's post-move resolution: `../SKILL.md#…` → `../../interview-feedback/SKILL.md#…` (lines 3, 15, 25; verify each target anchor {#resolve} {#coach} {#score} {#transcribe} exists in interview-feedback/SKILL.md as part of the edit), and line 15's `scripts/fill-scorecard.mjs parse` → `../../interview-feedback/scripts/fill-scorecard.mjs parse`.

**Blast radius.** One reference doc; line 15 gets two repoints instead of one. Non-blocking follow-up suggestion (out of unit): extend pmos-toolkit's lint-phase-refs.sh to scan `_shared/**/*.md` back-links.

---

## F7 [Nit] — Frozen non-interactive block bakes pmos-toolkit-isms into managerkit copies

**Defect.** The byte-identical frozen block (e.g. interview-feedback/SKILL.md:78, 84) contains (a) a cite "(`_shared/non-interactive.md`)" that only resolves in pmos-toolkit — `plugins/pmos-managerkit/skills/_shared/non-interactive.md` verified nonexistent — and (b) a hardcoded stderr prefix "pmos-toolkit: /\<skill\> finished". The byte-identity lint actively enforces the defect; no consumer plugin can fix it locally.

**Change (lands in the canonical substrate, NOT in managerkit).**
- Canonical file `plugins/pmos-toolkit/skills/_shared/non-interactive.md`:
  - Step 5 cite becomes an explicit plugin-neutral pointer: "pmos-toolkit's `skills/_shared/non-interactive.md` (the block's canonical owner)" — reads as a pointer, not a resolvable relative path.
  - Step 8 stderr prefix becomes plugin-neutral: "pmos: /\<skill\> finished — outcome=…".
- Then a single repo-wide re-paste commit into every consumer skill across all 5 plugins. lint-non-interactive-inline.sh's source of truth is the canonical file, so it flips automatically and fails every stale copy until re-pasted (the desired forcing function). Managerkit's three copies (byte-identical today, verified) simply take the re-paste.
- Before landing: grep for any consumer parsing the "pmos-toolkit:" stderr prefix (NFR-07 contract).

**Blast radius.** LARGE, cross-plugin: canonical `_shared/non-interactive.md`, every user-invocable SKILL.md in all 5 plugins, lint-non-interactive-inline.sh (re-run, not edited). Recommend shipping as its own dedicated substrate commit, not folded into a managerkit story. Severity stays Nit.

---

## F19 [Should-fix] — Divergent confidentiality posture for same-class people data across the plugin

**Defect.** one-on-one takes the hard posture — records live under `~/.pmos/one-on-ones/`, outside any repo, and `scripts/record-lib.mjs` REFUSES to write in a working tree (one-on-one/SKILL.md:104, INV-4 — verified verbatim). interview-feedback handles equally sensitive people data (candidate recordings, transcripts, scores) yet defaults storage to `./interviews/` INSIDE the repo, protected only by a best-effort gitignore guard whose failure mode is soft: interview-feedback/SKILL.md:114 — "if the guard cannot be written, warn and continue (the operator is responsible — see § Confidentiality)" (verified verbatim). Same plugin, same class of confidential people data, opposite default locations and opposite failure modes. One accidental `git add interviews/` after a failed guard write commits candidate PII.

**Change.**
1. `plugins/pmos-managerkit/skills/interview-feedback/SKILL.md` · Phase: Resolve step 1 (~:114) + § Confidentiality: the guard-write failure mode becomes a **hard stop**, not a warn. If `storage.sh` cannot install/refresh the gitignore guard inside a git repo, do NOT write candidate inputs there — interactive: stop and offer (a) fix permissions and retry, (b) choose a `--root` outside the repo, or (c) explicit operator override "proceed unguarded" (destructive-class confirm, never a default); non-interactive: DEFER (log the open question; do not write candidate data into an unguarded working tree — no safe default). The default root stays `./interviews/` — NOT relocated (see rationale).
2. BOTH skills' Confidentiality/Store sections gain a mirror paragraph documenting WHY the postures intentionally differ, each citing the other: one-on-one records are personal per-report content with no repo-side consumers → hard out-of-repo (INV-4); interview-feedback's store is a role-team workflow tree (role.json, round guidelines, scorecards) whose non-PII scaffolding legitimately lives with the repo, so the boundary is the gitignore guard — which is exactly why the guard must be load-bearing (hard), not advisory.

**Rationale.** The reviewer's failure mode is real, and the soft failure mode makes the plugin's two confidentiality guarantees incoherent. But relocating interview-feedback's default root out of the repo would break the role-scaffolding workflow (the guidelines/round layout is designed to be shared with the hiring team) and every existing install; hardening the guard to blocking + documenting the intentional divergence closes the coherence gap at far smaller blast radius. This takes both halves of the reviewer's own "either… or…" remedy.

**Blast radius.** interview-feedback/SKILL.md Resolve step 1 + § Confidentiality; one-on-one/SKILL.md § Store & privacy (one added mirror paragraph; INV-4 unchanged); `scripts/storage.sh` behavior contract sharpened in prose — implementer must verify whether storage.sh's exit code already distinguishes guard-write failure; if not, storage.sh may need a one-line change (non-zero exit on guard failure) — flagged to implementer; non-interactive DEFER classification consistent with the frozen block; skill-eval §H checks re-run on interview-feedback.

---

## Rejections

None. All 22 findings across five passes were verified grounded (verbatim ≥40-char quotes + file:line spot-checked against the repo) and accepted. Verification notes: F9's central claim (fill-scorecard.mjs has no weight-sum/anchor-validity assertion) independently re-verified by grep; F12's foreign-scorecard quote confirmed at interview-feedback/SKILL.md:150 and reference-resolution.md:15; F13's rubric enumeration confirmed at the Coach phase and reference-resolution.md:21–22; F14's charter preamble confirmed verbatim at plugin.json:4; F15's premise (interview-guide fully supports `--non-interactive` — argument-hint :5, frozen block :60, DEFER contracts :42) independently re-verified; F16's weighting-protocol location confirmed at interview-guide/SKILL.md:194–198 ({#work-history-weights}) with "selected, not assigned" verbatim at :196; F17's drifted term confirmed unique to README.md:19; F18's drift claim (interview-feedback:146 omits `data-duration`/`data-budget`; output-shapes.md:49 hardcodes `data-scale="1-4"`) independently re-verified; F19's quotes confirmed verbatim at one-on-one/SKILL.md:104 and interview-feedback/SKILL.md:114 (re-checked at closeout); F20's dangling path re-verified at closeout (`_shared/interview-guidelines/` contains no `scripts/`; the script lives at `interview-feedback/scripts/fill-scorecard.mjs`); F21's "12 Reforge/Mehta" confirmed at interview-guide/SKILL.md:196 and :246 (re-checked at closeout); F22's quote confirmed verbatim in the pre-closeout proposal (line 70).

## Open questions

None. No unresolved disagreements remain — every finding was accepted with a described fix, and no reviewer position was contested. (Status is CAPPED only because the final pass still surfaced a material finding when the loop terminated, so a nits-only convergence pass was never observed.)
