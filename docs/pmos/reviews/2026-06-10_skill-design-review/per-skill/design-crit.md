# design-crit — review

**Grade:** C (a genuinely valuable skill with the best rubric reference in the plugin, buried under depth-control state-machine prose and a third re-implementation of PSYCH/MSF that the repo's own 2026-05-08 split was supposed to prevent)
**Size:** SKILL.md 426 lines (397 excluding non-interactive block); references 2 files / 402 lines (`reference/eval.md` 173, `assets/capture.mjs` 229); target ~220 lines.

## TL;DR

- **Biggest win available:** delete Phase 5's inline PSYCH + MSF re-implementation and point at shared substrate. The 2026-05-08 msf-skill-split existed to fix "two implementations, one concept" (PSYCH in both /wireframes and /msf); design-crit, shipped after, re-created a third PSYCH variant and a fourth MSF variant (an unanchored 1–5 scale that shares only a name with `_shared/msf-heuristics.md`). It even cites the canonical format at a path that no longer exists.
- **Biggest risk:** the ~70 lines of FR-DC-DEPTH plumbing (Phase 0b + Phase 4 caps + 4a gate + disposition + echo) encode `depth_source`/`effective_cap`/null-sentinel choreography that a future maintainer — or a better model — will follow literally instead of understanding. The actual contract is four sentences; the rest is implementation detail that will silently drift against the spec it cites.
- **Worth keeping:** `reference/eval.md` is exemplary — a real domain payload (Nielsen/WCAG 2.2/Gestalt/state/field-earns-its-place with severity calibration and "an empty array is a valid output"), properly pushed one level deep, Pocock-style. The packaged `capture.mjs` with a documented exit-3 degradation path is the right way to ship a tool dependency. The anti-padding and don't-invent-measurements rules are the correct trust-calibration for an eval skill.

## Findings

1. **[S] Phase 5 re-implements PSYCH and MSF inline (lines ~290–317).** The PSYCH walkthrough (entry-context constants, ±1..10 element scores, cumulative thresholds, severity legend) duplicates `/msf-wf` Phase 6 + `msf-wf/reference/psych-output-format.md`; the MSF pass is a 3-bullet 1–5 scale that ignores the shared 24-consideration walk in `_shared/msf-heuristics.md` used by /msf-req and /msf-wf. This recreates exactly the defect `docs/pmos/features/2026-05-08_msf-skill-split/01_requirements.md` fixed ("PSYCH duplication: … Two implementations, one concept"). Fix: promote `msf-wf/reference/psych-output-format.md` (plus the scoring rules currently inlined in msf-wf Phase 6) to `_shared/psych-scoring.md`; design-crit Phase 5a becomes "run the PSYCH walkthrough per `_shared/psych-scoring.md` on each captured journey". For 5b, either adopt the `_shared/msf-heuristics.md` considerations or delete it — the rubric's J7 (friction map: interaction/cognitive/emotional) and J8 (drop-off candidates) already cover most of what the 1–5 MSF scores gesture at, and three unanchored 1–5 numbers add no information they don't.
2. **[R] Orphaned reference (Phase 5a):** "Use the table format in `/wireframes/reference/psych-output-format.md` if you have access" — that file moved to `msf-wf/reference/` in the 2026-05-08 split (the file's own header documents the move). `wireframes/reference/` has no such file. The "if you have access; otherwise:" hedge plus the inline fallback table is a symptom: the author wasn't sure where the canonical copy lived, so it got duplicated. Fixed for free by finding 1.
3. **[P] Depth-control plumbing is HOW where WHAT+WHY would do.** Phase 0b (12 lines of flag parsing, exit codes, exact stderr strings), FR-DC-DEPTH-05 reviewer-cap conditionals in Phase 4, the FR-DC-DEPTH-04 adaptive gate, FR-DC-DEPTH-06 disposition slicing, FR-DC-DEPTH-07 echo — ~70 lines total. The origin is real and documented (`2026-05-23_design-crit-depth-control`: the silent cap-at-12 hid findings 13–N from the user), and two rules deserve to stay hard: the surfaced/unsurfaced chat line ("silent capping is forbidden") and the non-interactive auto-pick of standard. Everything else compresses to: *"`--depth` maps shallow→5, standard→12, deep→uncapped. If unset and the reviewer returns more than 5 findings, ask the user how many to disposition (Recommended: top 12). Never cap silently — always report N surfaced / M unsurfaced."* The `depth_source`/`effective_cap`/`null`-sentinel/"deferred-to-gate" variable choreography is implementation detail the model can derive; prescribing it makes the skill brittle against its own spec.
4. **[V/S] HTML emit block (Phase 6, ~15 lines: FR-10/10.1/10.2/10.3, FR-03.1, FR-22, FR-12.1-retired)** is duplicated near-verbatim across 11 SKILL.md files (verified by grep on "Atomic write (FR-10.2)"). The contract is test-backed repo machinery, so not counted as ballast — but its *prose* should live once in `_shared/html-authoring/` (e.g. `emit-contract.md`) with a 1–2 line per-skill pointer naming only the artifact filenames. Cross-skill fix; this skill is one of the three assigned carriers.
5. **[Ph] Lettered sub-phases (0a, 0b, 2a/2b/2c, 3a/3b/3c, 4a, 5a/5b)** — the 0a/0b pair is pure insertion residue from the output-format and depth features; after finding 3 both fold into Phase 0 as two sentences. 2a–2c and 3a–3c are genuine branches (source-type routing) and read fine.
6. **[G] Theater-check escape (Phase 4, 12 lines + verbatim retry prompt).** The failure mode is real (sycophantic "the flow is smooth" journey passes alongside ≥3 per-screen findings) and the 1-retry cap is sane. But the exact suffix wording is a prescription the model doesn't need — state the trigger condition, the re-walk-as-impatient-user intent, and the no-second-retry rule in ~4 lines and trust the model to phrase the prompt.
7. **[R] "Format mirrors `/wireframes` and `/prototype`" (Phase 5 intro)** — stale: /prototype contains no PSYCH (grep: 0 matches) and /wireframes delegated its PSYCH to /msf-wf in the split. The claimed mirrors don't exist.
8. **[F] `--journeys <id1,id2>`** — journeys are given labels, not ids, in Phase 2c; nothing defines what an id is or where a user would learn one. Document (ids = slugs of the Phase 2 proposals, or indices) or accept labels.
9. **[X] Positive:** the Platform Adaptation block actually matches the body — capture.mjs exit-3 → install instructions → manual-screenshot eval-only fallback is a real degradation path, and the no-prompt-tool fallback (numbered table at `eval-findings-review.md`) is honored again in Phase 4a. This is how the section should work everywhere.

## Flags inventory

| flag | purpose | verdict |
|---|---|---|
| `--feature <slug>` | name the output folder | keep |
| `--journeys <id1,id2>` | skip journey approval on re-runs / parent invocation | keep; document what an "id" is |
| `--storage-state <path>` | Playwright auth for gated apps | keep (a file path can't be natural language) |
| `--out <dir>` | escape the workstream/docs_path resolution | keep |
| `--format <html\|md\|both>` | repo-wide output_format override | keep (repo contract) |
| `--depth shallow\|standard\|deep` | finding-volume control | keep — needed for deterministic non-interactive/parent runs; the interactive path already covers the no-flag case via the gate |
| `--non-interactive` / `--interactive` | repo-wide mode contract | keep (repo contract) |

## Gates & rubrics inventory

| check | hard or soft | failure it catches | verdict |
|---|---|---|---|
| `reference/eval.md` rubric (N/V/G/A/S/F/C/J + severity calibration) | soft (guides reviewer) | vague, unevidenced, padded critiques | keep — this is the skill's payload |
| 5-journey cap | hard | rubric dilution across too many flows | soften to advisory (failure mode stated; trust the model + user) |
| Screenshot sanity (one PNG/step, >5 KB) | hard | critiquing a blank/unrendered page | keep-hard — cheap, catches a real silent failure |
| Theater-check 1-retry | hard cap | sycophantic empty friction pass | keep, compress to intent (finding 6) |
| Adaptive depth gate + caps | hard | silent truncation of findings 13–N (documented origin) | keep the never-silent rule + NI auto-pick hard; soften the state machine to 4 sentences |
| Reviewer 50-finding safety bound | hard | unbounded reviewer output blowing context | keep-hard |
| ~400-line report body cap | soft | unreadable deliverable | keep as advisory ("recommendations are the deliverable; long tail → appendix" already says it) |
| Findings Presentation Protocol (no prose dumps) | hard | unactionable wall-of-text triage | keep-hard — repo-wide AskUserQuestion contract |
| PSYCH thresholds (<20 Watch, <0 Bounce, Δ<−20 Cliff) | soft, but feeds dispositions | motivation cliffs invisible in per-screen checks | replace with `_shared` reference (finding 1); assign severity by judgment, numbers as illustration |

## Fix list

| fix | type | impact | risk |
|---|---|---|---|
| Extract PSYCH to `_shared/psych-scoring.md`; Phase 5a points there; drop or substrate-ize the MSF 1–5 pass | structural | high | low — output format already matches msf-wf's; parents don't consume psych-msf.{ext} programmatically |
| Compress depth-control plumbing to the 4-sentence contract, keeping the never-silent echo + NI auto-pick | structural | high | medium — FR-DC-DEPTH ids are cited by the feature's verify docs; keep the FR tags on the two surviving hard rules |
| Fix orphaned `/wireframes/reference/psych-output-format.md` pointer | quick-win | med | none |
| Replace HTML emit block with pointer to a new `_shared/html-authoring/emit-contract.md` | structural (cross-skill) | med | low — contract is test-backed; tests don't read SKILL.md prose |
| Fold 0a/0b into Phase 0; compress theater-check to intent | quick-win | med | none |
| Delete stale "mirrors /wireframes and /prototype" claim; document `--journeys` id format | quick-win | low | none |
