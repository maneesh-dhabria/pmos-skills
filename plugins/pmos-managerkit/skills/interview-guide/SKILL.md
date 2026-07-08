---
name: interview-guide
description: Author the interviewer-facing kit for one interview round before it runs — an interviewer reference (what the round tests, strong/weak markers, a probing ladder, common mistakes), a scoring sheet whose dimensions map to the role's competencies and carry machine anchors, and (for case rounds) a candidate-facing case document with a matching reference-solution. Grounded in a bundled corpus of PM round archetypes; no candidate data. Use when setting up a role's interview loop, writing an interviewer guide or brief, building a scoring sheet or scorecard for a round, or drafting a take-home / case-study prompt. Triggers: "write the interviewer guide for <round>", "build a scoring sheet for <role>", "set up the <role> interview loop", "draft a case study for the product-sense round", "make an interviewer brief".
user-invocable: true
argument-hint: "<role / round description…>   [--archetype <id>] [--seniority <level>] [--level-rubric <path>] [--case | --no-case] [--business-context <path>] [--out <path>] [--role-dir <path>] [--non-interactive]"
---

# Interview guide

Author the interviewer-facing kit for **one interview round**, before the round runs — three self-contained, print-friendly HTML artifacts:

- **(a) an interviewer reference** — what this round tests, per-competency strong/average/poor markers, a probing/nudge ladder, common interviewer mistakes, and calibration. Every round.
- **(b) a scoring sheet** — dimensions mapped to the role's stated competencies, each with a scale and green/red flags, plus overall hire criteria — carrying the full `scorecard-skeleton` **machine anchors** so `/interview-feedback score` consumes it verbatim after the round (the interop loop, design D8).
- **(c) a candidate-facing case document** — **case rounds only** — a 1–2 page take-home / case prompt authored from a supplied business context, WITH a matching interviewer reference-solution + rubric authored alongside it.

This skill authors **before** the round; its sibling `/interview-feedback` scores **after** it, and consumes output (b) directly. It grounds every round in the bundled PM-archetype corpus under `../_shared/interview-guidelines/` — it never invents a competency framework from scratch and never handles candidate data.

**Announce at start:** "Using interview-guide — authoring the interviewer reference, scoring sheet, and (case rounds) case document for this round."

This skill follows the SKILLS-standard authoring guide at `../feature-sdlc/reference/skill-patterns.md` (pmos-toolkit) — frontmatter, triggering, progressive disclosure, §H gates, §I flags, §J phases. Reference docs live in `reference/`; scripts in `scripts/`.

## Modes

The skill authors the same three outputs in either of two modes (design D4); the mode is how the round's competencies are *sourced*, not a different output set:

- **round-requirements** — the user supplies the competencies (or points at a role whose competencies are known). The scoring-sheet dimensions and reference areas are built from *their* list.
- **best-practices** — the user names (or accepts) an **archetype** from the bundled corpus; the guide is the canonical archetype guideline, tailored to the role + seniority. This is the default when no explicit competency list is given.

Resolve the mode from the inputs — an explicit `--archetype` (or "use the standard product-sense round") selects best-practices; a supplied competency list selects round-requirements. When both are present, the competency list drives dimensions and the archetype supplies the corpus grounding.

## Flags & natural language

Every option also has a natural-language form — infer it from the request; an explicit flag overrides. Canonical phrasings: "use the <name> round / archetype" ≡ `--archetype <id>`, "this is a senior / staff / new-grad role" ≡ `--seniority <level>`, "use our leveling guide / this rubric for the weights" ≡ `--level-rubric <path>`, "include a case / take-home" ≡ `--case`, "no case, just the reference and sheet" ≡ `--no-case`, "here's the business context / case brief" ≡ `--business-context <path>`, "write it under <path>" ≡ `--out <path>`, "put it in the interview-feedback role at <path>" ≡ `--role-dir <path>`.

Contract flags (machine-coupled, typed, or headless-determinism — §I), shown in `argument-hint`:

- `--archetype <id>` — pin the round archetype (typed value; one of the bundled ids in § Archetypes, or `custom`). Selects best-practices grounding.
- `--seniority <level>` — pin the seniority the guide is tailored to (typed value, e.g. `new-grad`/`senior`/`staff`); shifts the bar in the markers and the scale calibration. For the **work-history** archetype it also selects the competency **weight row** from the level ladder (`../_shared/interview-guidelines/guidelines/work-history/level-ladder.md`), whose full rung set is `apm` · `pm` · `senior-pm` (default) · `group-pm` · `director` · `vp` (with the common aliases mapped in that file's ladder table). The model reads the selected row's weights verbatim — it never computes them (§H).
- `--level-rubric <path>` — **work-history only**; typed path to an operator's own leveling guide (free-form markdown) that overrides the bundled level-ladder weights (design D8). See Phase [Scoring Sheet](#scoring-sheet) for the interpret → sum-gate → refuse/fallback contract; a non-summing override is never emitted.
- `--case` / `--no-case` — force or suppress the case document (headless determinism; overrides the archetype-derived default of Phase [Collect](#collect)). `--case` on a non-case archetype requires a business context (see below); `--no-case` on a case archetype emits only (a)+(b).
- `--business-context <path>` — typed path to the business context the case is authored from (design D7). Without it, a case DEFERs under `--non-interactive` (D11 — never fabricated).
- `--out <path>` — output root override (typed path; default `./interview-guides/`, see Phase [Write](#write)).
- `--role-dir <path>` — typed path to an existing `/interview-feedback` role directory; write the outputs into its `guidelines/<round>/` instead of a standalone tree (design D10), honoring that dir's gitignore guard.
- `--non-interactive` / `--interactive` — see the non-interactive block.

<!-- nl-sugar -->
- `--role <name>` / `--round <id>` / `--competencies <list>` — parsed aliases for values normally inferred from the request; silent.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion` tool:** every prompt below degrades to a numbered free-form question; the non-interactive auto-pick contract still applies (Recommended → AUTO-PICK).
- **No subagents:** authoring and the self-review pass run inline; there is no parallel work to degrade.
- **TaskCreate / TodoWrite missing:** the skill body works without task tracking; the emitted HTML artifacts are the canonical progress record.
- **`.pmos/settings.yaml` missing:** output-root resolution falls through to its built-in default (`./interview-guides/`); mode resolution uses the built-in default (`interactive`).
- **`node` missing:** Phase [Scoring Sheet](#scoring-sheet)'s anchor validator (`scripts/validate-scorecard-anchors.mjs`) cannot run — emit the sheet, warn on stderr that the anchor gate was skipped, and tell the operator to run the validator before wiring the sheet into `/interview-feedback`.

<!-- non-interactive-block:start -->
1. **Mode resolution.** Compute `(mode, source)` with precedence: `cli_flag > parent_marker > settings.default_mode > builtin-default ("interactive")` (FR-01).
   - `cli_flag` is `--non-interactive` or `--interactive` parsed from this skill's argument string. Last flag wins on conflict (FR-01.1).
   - `parent_marker` is set if the original prompt's first line matches `^\[mode: (interactive|non-interactive)\]$` (FR-06.1).
   - `settings.default_mode` is `.pmos/settings.yaml :: default_mode` if present and one of `interactive`/`non-interactive`. Unknown values → warn on stderr `settings: invalid default_mode value '<v>'; ignoring` and fall through (FR-01.3).
   - If `.pmos/settings.yaml` is malformed (not parseable as YAML, or missing `version`): print to stderr `settings.yaml malformed; fix and re-run` and exit 64 (FR-01.5).
   - On Phase 0 entry, always print to stderr exactly: `mode: <mode> (source: <source>)` (FR-01.2).

2. **Per-checkpoint classifier.** Before issuing any `AskUserQuestion` call, classify it (FR-02):
   - The defer-only tag, if present, is the literal previous non-empty line: `<!-- defer-only: <reason> -->` where `<reason>` ∈ {`destructive`, `free-form`, `ambiguous`} (FR-02.5).
   - Decision (in order): tag adjacent → DEFER; multiSelect with 0 Recommended → DEFER; 0 options OR no option label ends in `(Recommended)` → DEFER; else AUTO-PICK the (Recommended) option (FR-02.2).

3. **Buffer + flush.** Maintain an append-only OQ buffer in conversation memory. On each AUTO-PICK or DEFER classification, append one entry per the schema in spec §11.2. At end-of-skill (or in a caught error before exit), flush (FR-03):
   - Primary artifact is single Markdown → append `## Open Questions (Non-Interactive Run)` section with one fenced YAML block per entry; update prose frontmatter (`**Mode:**`, `**Run Outcome:**`, `**Open Questions:** N` where N counts deferred only — see FR-03.4) (FR-03.1).
   - Skill produces multiple artifacts → write a single `_open_questions.md` aggregator at the artifact directory root; primary artifact's frontmatter `**Open Questions:** N — see _open_questions.md` (FR-03.5).
   - Primary artifact is non-MD (SVG, etc.) → write sidecar `<artifact>.open-questions.md` (FR-03.2).
   - No persistent artifact (chat-only) → emit buffer to stderr at end-of-run as a single block prefixed `--- OPEN QUESTIONS ---` (FR-03.3).
   - Mid-skill error → flush partial buffer under heading `## Open Questions (Non-Interactive Run — partial; skill errored)`; set `**Run Outcome:** error`; exit 1 (E13).

4. **Subagent dispatch.** When dispatching a child skill via Task tool or inline invocation, prepend the literal first line: `[mode: <current-mode>]\n` to the child's prompt (FR-06).

5. **Call-site auditing (CI only).** This runtime classifier reads the call it is about to make — it does not run awk. Static/offline auditing of `AskUserQuestion` call sites across SKILL.md files is performed by `tools/audit-recommended.sh`, which sources the shared call-site extractor from Section D of this file (`_shared/non-interactive.md`). Runtime and audit therefore share one decision contract without inlining the extractor into every skill (FR-02.6).

6. **Refusal check.** If this SKILL.md contains a `<!-- non-interactive: refused; ... -->` marker (regex: `<!--[[:space:]]*non-interactive:[[:space:]]*refused`), and `mode` resolved to `non-interactive`: emit refusal per Section A and exit 64 (FR-07).

7. **Pre-rollout BC.** If the `--non-interactive` argument is present BUT this SKILL.md does NOT contain the `<!-- non-interactive-block:start -->` marker (i.e., this skill hasn't been rolled out yet): emit `WARNING: --non-interactive not yet supported by /<skill>; falling back to interactive.` to stderr; continue in interactive mode (FR-08).

8. **End-of-skill summary.** Print to stderr at exit: `pmos-toolkit: /<skill> finished — outcome=<clean|deferred|error>, open_questions=<N>` (NFR-07).
<!-- non-interactive-block:end -->

## Track Progress

This skill has multiple phases. Create one task per phase (Collect → Ground → Interviewer Reference → Scoring Sheet → [Case] → Self-Review → Write) using your agent's task-tracking tool. Mark each in-progress when you start and completed as soon as it finishes — do not batch.

## Phase 0: Setup {#setup-load}

Before the modes run: read `~/.pmos/learnings.md` if present and factor any entries under `## /interview-guide` into your approach (skill body wins on conflict; surface conflicts to the user before applying). Resolve `(mode, source)` per the non-interactive block and print the `mode:` line to stderr.

## Phase: Collect {#collect}

Resolve the round's parameters before authoring anything:

1. **Role + round.** The role (title + one line on the product/team) and which round this is. Inferred from the request or `--role`/`--round`.
2. **Archetype.** Map the round to one of the bundled archetypes (§ Archetypes) or `custom`. `--archetype` pins it. When it must be inferred, confirm — the inferred archetype is the Recommended option, so a non-interactive run AUTO-PICKs it (a round description always maps to a nearest archetype):

   ```
   AskUserQuestion:
     question: "Which round archetype should ground this guide?"
     header: "Archetype"
     options:
       - label: "<inferred> (Recommended)"   # nearest bundled archetype to the round description
         description: "<one line on why the round maps to this archetype>"
       - label: "<second-nearest>"
         description: "<one line on when you'd pick this instead>"
       - label: "custom"
         description: "No bundled archetype fits — build the areas from the supplied competencies."
   ```

3. **Competencies (round-requirements mode).** If the user supplied a competency list, that list drives the scoring-sheet dimensions and reference areas. Otherwise (best-practices mode) the archetype's bundled areas are the starting set; confirm the derived dimension list before authoring (the archetype's own areas are the Recommended set, so this AUTO-PICKs non-interactively):

   ```
   AskUserQuestion:
     question: "Score this round on these dimensions?"
     header: "Dimensions"
     options:
       - label: "<the derived dimension list> (Recommended)"
         description: "Mapped from the <archetype> corpus areas / your competency list."
       - label: "Let me adjust the list"
         description: "Add, drop, or re-weight dimensions before authoring."
   ```

4. **Seniority.** `--seniority` pins the bar; else infer from the role title. Shifts the strong/average/poor markers and the scale calibration.
5. **Case?** Decide whether output (c) is in scope (design D9): case IS authored when the archetype ∈ {`case-study`, `case-presentation`}, OR `--case` is set. `--no-case` suppresses it. When a case is in scope, resolve the **business context** it is authored from: `--business-context <path>` wins; else ask for it. The business context is free-form and only the operator has it — never invent one:

   ```
   <!-- defer-only: free-form -->
   AskUserQuestion:
     question: "What business context should the case be built around? (a product area, a real decision, a dataset, a scenario — paste it or give a file path)"
     header: "Case context"
     options: []
   ```

   Under `--non-interactive` with no `--business-context`, this DEFERs (log an open question; emit (a)+(b) and skip (c) — the case is never fabricated, design D11). Surface in the run summary that the case was deferred for lack of a business context.

## Phase: Ground {#ground}

Load the archetype's bundled corpus from `../_shared/interview-guidelines/` (the 260702-cqf home — never read into `/interview-feedback`'s own dir):

- **`guidelines/<archetype>/interviewer-reference.html`** — the model for output (a): purpose, per-area green/red signals, probes, calibration. When the archetype is one of the 7 bundled ones, this is filled corpus to tailor; for `custom`, instantiate `reference-skeleton.html`.
- **`guidelines/<archetype>/scorecard.html`** (and `scorecard-skeleton.html`, the anchor contract) — the model for output (b).
- **`reference-resolution.md`** — how a round's reference/scorecard resolve (for the `--role-dir` write path).

The corpus is canonical and offline — there is no live-research or citation-refusal gate here (design D3/D6); grounding means *tailoring the bundled archetype guidance to this role*, not fetching sources. The competency areas you author must trace to either the corpus areas or the user's supplied competency list.

## Phase: Interviewer Reference {#reference}

Author output (a) by instantiating `../_shared/interview-guidelines/reference-skeleton.html` (or tailoring the archetype's filled `interviewer-reference.html`). One `<section class="area" data-area="<id>">` per competency, each carrying the reference machine anchors (`data-ref="round"` on `<main>`; `data-area`, `data-signals="green"`/`"red"`, `data-probes="<id>"`) — see `reference/output-shapes.md` for the full anchor list and the section checklist. Each area needs: purpose, ✓ strong / ✕ watch-for signals, a suggested-probe ladder, and a `.calib` good/average/poor line + the common interviewer mistake. **Area ids MUST match the scoring-sheet `data-dim` ids 1:1** so the reference and sheet line up (and so `/interview-feedback`'s questionnaire can lift probes per dimension).

## Phase: Scoring Sheet {#scoring-sheet}

Author output (b) by instantiating `../_shared/interview-guidelines/scorecard-skeleton.html` — **the anchor contract**. One `<section class="dim" data-dim="<id>">` per competency (ids matching the reference areas), each with `data-weight`, a `data-scale` container whose options carry `data-v`, a `data-input="notes:<dim>"` slot, and `data-flags="green"`/`"red"` lists; plus the single overall `data-input="reco"` control with its four `data-reco` options. Weights **must sum to 100** — assign them by competency importance for this role/seniority. Full anchor list + checklist in `reference/output-shapes.md`.

**§H hard gate (deterministic).** After writing the sheet, run:

```
node scripts/validate-scorecard-anchors.mjs <scoring-sheet.html>
```

It asserts every required anchor is present and that the weights are integers summing to 100 (§H: the script owns the arithmetic — never total the weights by hand). A non-zero exit **blocks the run** — fix the sheet and re-run until it passes; surface the script's `✓ scorecard anchors:` line to the operator on pass. (`--selftest` exercises the validator over a good + broken fixture.)

### Work-history weighting (archetype `work-history`) {#work-history-weights}

For the work-history archetype the scoring sheet is the extended one — the 12 Reforge/Mehta competency `data-dim`s plus the `role-evidence` and `trajectory-synthesis` families — and its weights are **selected, not assigned** (design D7/D8):

1. **Default: the level ladder.** Resolve the level from `--seniority` (else infer from the role title; else `senior-pm`) and copy the **matching column** of the weight table in `../_shared/interview-guidelines/guidelines/work-history/level-ladder.md` verbatim into the `data-weight` anchors. Every column is pre-summed to 100 — you read a row, you do not compute one (§H). The checked-in `scorecard.html` ships the `senior-pm` row as its default.
2. **Override: `--level-rubric <path>` (§H hard gate, D8).** When the operator supplies a leveling guide, interpret its free-form markdown into a per-competency integer weight set for the selected level, then gate it deterministically:

   ```
   node scripts/validate-scorecard-anchors.mjs --check-override '{"<competency>": <int>, …}'
   ```

   - **Exit 0** → the set is all non-negative integers summing to 100; use it for the `data-weight` anchors.
   - **Non-zero exit** → the override is **refused** (never emitted). Interactive: re-prompt the operator to fix the rubric (the Recommended option is "fall back to the bundled `<level>` ladder row"). Non-interactive: emit the stderr error and **fall back to the bundled ladder row**, logging an open question. A malformed override never produces a malformed sheet — the ladder is always the safe floor.

   The model never totals the override by hand; `--check-override` owns that arithmetic, exactly as the sheet gate above owns the sum-to-100 check.

## Phase: Case Document {#case}

**Case rounds only** (Phase [Collect](#collect) step 5 resolved case = in-scope with a business context). Author output (c): a candidate-facing case document (1–2 pages) built from the supplied business context, following `reference/case-authoring.md`. Author, in the same pass and grounded in the same context:

- **the candidate case document** — the prompt / brief the candidate receives: the scenario, the deliverable asked for, constraints, and the time window. No solution, no rubric — this is what the candidate sees.
- **a matching interviewer reference-solution + rubric** — what a strong answer looks like, the traps the prompt sets, and how the case maps onto the scoring-sheet dimensions. This is interviewer-only and pairs with output (a).

The case is authored **only** from the operator-supplied business context — never fabricated (design D11). If no context was supplied, this phase does not run (the run emitted (a)+(b) and deferred the case).

## Phase: Self-Review {#self-review}

Score the drafts against `reference/self-eval-rubric.md` — three axes: **completeness** (every competency has a reference area, a weighted sheet dimension, and — case rounds — a case that exercises it), **competency-alignment** (reference `data-area` ids ⇔ sheet `data-dim` ids are 1:1; nothing scored that isn't probed, nothing probed that isn't scored), and **case realism** (case rounds: the case is grounded in the supplied context, has a real decision, and is answerable in the stated window). This is a self-review, not an enforced citation gate (design D6) — surface the gaps and the axis scores for the manager to address; the **manager is the gate**, not the skill. Record the self-review summary as a comment block in the interviewer reference.

## Phase: Write {#write}

Resolve the output location and write the artifacts:

- **Default:** `./interview-guides/<role-kebab>/<round>/` (or `--out <path>` as the root). Files: `interviewer-reference.html`, `scoring-sheet.html`, and (case rounds) `case-document.html` + `case-reference-solution.html`.
- **Into an `/interview-feedback` role (`--role-dir <path>`):** write into that role's `guidelines/<round>/` per `reference-resolution.md` (design D10), so `/interview-feedback score` finds the sheet as the round's scorecard automatically. Honor the role dir's **gitignore guard** — if the target is under a guarded interview-feedback storage root, do not commit the outputs; the guide artifacts are non-confidential but they live alongside candidate data (INV-3, § Confidentiality).

Announce the written paths and the self-review axis scores.

## Phase N: Capture Learnings {#capture-learnings}

After a run, if you discovered something reusable — an archetype-mapping judgment call, a competency-to-dimension weighting pattern, a case-grounding technique — append it under `## /interview-guide` in `~/.pmos/learnings.md` (create the file if absent). Keep entries one or two lines; never record candidate or confidential business-context content.

## Archetypes {#archetypes}

The bundled PM round archetypes (each with a filled `interviewer-reference.html` + `scorecard.html` under `../_shared/interview-guidelines/guidelines/<id>/`):

`recruiter-screen`, `product-sense`, `analytical`, `technical`, `behavioral`, `work-history`, `case-study`, `case-presentation` — `| custom` when none fits (areas built from the supplied competencies). `case-study` and `case-presentation` are the case archetypes that pull in output (c) by default.

**`work-history`** is a **non-case** archetype (emits only (a)+(b) — a `--case` on it still requires a business context, but the round itself is a structured chronological deep-dive, not a case). It is distinctive in two ways, both driven by design D6/D7/D9:

- Its `scorecard.html` carries the additive `role-evidence` (fixed 4 candidate-blind role blocks) and `trajectory-synthesis` (level-verdict) families on top of the 12 Reforge/Mehta competency `data-dim`s — see `../_shared/interview-guidelines/scorecard-skeleton.html`'s documented families.
- Its competency **weights come from the level ladder**, not free assignment: `--seniority` selects the pre-summed weight row (`level-ladder.md`); `--level-rubric <path>` overrides it. Because the ladder rows and the `--check-override` gate own the arithmetic, you never total work-history weights by hand.

## Confidentiality {#confidentiality}

`/interview-guide` handles **no candidate data** — it authors interviewer-facing material before any candidate is evaluated (INV-3). The business context for a case may be confidential; it is used only to author the case and is never sent to an external service. When writing into a `/interview-feedback` role directory (`--role-dir`), honor that dir's gitignore guard — the guide's own outputs are non-confidential, but they sit next to candidate data that must never be committed. The skill never fabricates a case from nothing: absent a supplied business context, it defers rather than invents (design D11).
