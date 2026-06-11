---
name: survey-design
description: Design a methodologically sound survey from a rough intent, or refine an existing one — generates a sectioned survey.json, runs a reviewer-critique pass and a simulated-respondent friction walk, renders a fillable preview, and emits import files for Typeform / SurveyMonkey / Google Forms. Triggers on "design a survey", "create a survey", "build a questionnaire", "review my survey", "refine this survey", "make a survey ready to field", "/survey-design".
user-invocable: true
argument-hint: "<survey intent | path to an existing survey> [--export <platform[,platform]>] [--skip-export] [--non-interactive | --interactive]"
---

# Survey Design

Turn a rough research intent (or an existing survey) into a fielded-ready survey: a structured `survey.json`, a human-readable `survey.html`, a fillable `preview.html`, a reviewer critique, a simulated-respondent friction walk, a viewer, and platform import files. The skill bakes in survey-methodology best practices and an anti-pattern catalog so the generated questions don't have the usual defects.

**Announce at start:** "Using the survey-design skill to design and pressure-test a survey."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool (`AskUserQuestion`):** degrade every gate to a numbered free-form prompt per `_shared/interactive-prompts.md`; the non-interactive auto-pick contract still applies (the `(Recommended)` option is auto-picked).
- **No subagents (`Task`/`Agent` tool):** run the Phase-4 reviewer pass and the Phase-6 simulated-respondent pass *sequentially inline* — same prompts, same return contracts, just no fresh-context isolation.
- **No browser automation:** `preview.html` is meant for the user to open by double-click; the skill does not drive it.
- **`TaskCreate`/`TodoWrite` missing:** announce phase transitions verbally; the survey folder's `index.html` is the canonical progress artifact.
- **Missing substrate assets:** apply the two-tier abort/warn rule — canonical statement in Phase 3 (#substrate-assets).

This skill is a **standalone utility** — it is not a pipeline stage. It writes into `{docs_path}/survey-design/{YYYY-MM-DD}_<slug>/`, never into the `/feature-sdlc` feature folders, and it does **not** run `_shared/pipeline-setup.md` first-run setup (see Phase 0).

## Track Progress

This skill runs many phases (0–9). Create one task per phase using your agent's task-tracking tool (e.g., `TaskCreate` in Claude Code). Mark each task `in_progress` when you start it and `completed` when it finishes — never batch completions.

## Reference files (loaded on demand)

The skill loads these from its own `reference/` directory only when the relevant phase needs them — keep them out of working context otherwise (progressive disclosure):

- `reference/survey-json-schema.md` — the authoritative `survey.json` schema: top-level + question object shapes, the 12-type enum (+ `statement`), the schema invariants, and the time-cost constants. Load in Phase 3; the Phase-4 reviewer and `/survey-analyse --survey-json` consume the same contract.
- `reference/survey-best-practices.md` — the methodological backbone applied in Phase 3 generation and the Phase 4 refinement loop (the leading **"Product fit (evaluate this first)"** section, then structure/flow, question types, scales, length/burden, generative-vs-evaluative, bias reduction, question-writing rules, accessibility, ethics/PII).
- `reference/question-antipatterns.md` — the A1–E6 anti-pattern catalog, each entry with a concrete detection signal; the generator (Phase 3) must produce none of these, the reviewer (Phase 4) walks every question against the catalog.
- `reference/platform-export.md` — per-platform import mechanisms, auth/plan requirements, artifact schemas, and the full type-mapping tables the Phase-8 transformer recipes cite.

---

## Phase 0 — Setup {#setup}

1. **Read `.pmos/settings.yaml`.** Take `docs_path` from it. If the file or the key is absent, default `docs_path = docs/pmos/` and print one warning to stderr (`survey-design: no .pmos/settings.yaml; using docs_path=docs/pmos/`). **Do NOT run `_shared/pipeline-setup.md` Section A first-run setup** — this skill is not a pipeline stage and must work in any repo (E13).
2. **Parse flags** from the argument string: `--export <platform[,platform]>` (pre-select export targets), `--skip-export` (skip Phase 8), `--non-interactive` / `--interactive` (the mode contract below). NL-first: a platform named in the request ("…and export it for Google Forms") ≡ `--export`; "don't export" ≡ `--skip-export`; explicit flags override inference.
3. **`output_format` note.** Resolve `output_format` from `.pmos/settings.yaml :: output_format` (default `html`); print to stderr once: `output_format: <value> (source: <settings|default>)`. It governs only feature-folder docs (none here); the survey folder's artifacts are always `survey.json` + `survey.html` (substrate-compliant) + `preview.html` (standalone) + the eval/simulation markdown.
4. **Resolve the run folder.** Derive `<slug>` (lowercase-hyphenated, ASCII) from the survey title or intent; the run folder is `{docs_path}/survey-design/{YYYY-MM-DD}_<slug>/`. If that folder already exists, append `-2`, `-3`, … until unique — **never overwrite** an existing survey folder (E4).
5. **Phase tracking.** If `TaskCreate`/`TodoWrite` is available, create one task per phase (0–9); otherwise announce each phase verbally.
6. **Learnings.** Read `~/.pmos/learnings.md` if present; note any entries under `## /survey-design` and factor them in (skill body wins on conflict; surface conflicts before applying).

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

---

## Phase 1 — Intake {#intake}

The argument is one of: a free-text research intent; a path to an existing survey (`.html` / `.md` / `.txt` / `.json`); or nothing.

- **Nothing** → before doing anything else, use `AskUserQuestion`: ask the research **purpose** and the **audience**. Options for each: a `(Recommended)` first option only when a default genuinely makes sense; for the audience there is no sensible default — tag that one `<!-- defer-only: free-form -->`. Do not invent a purpose (E1).
- **A path** → read the file and best-effort parse it into a `survey.json` skeleton: titles/headings → sections; recognizable question text + options → questions (guess the `type` from the option shape). If nothing recognizable comes out, report that, show what *was* extracted, and offer to treat the file's text as free-text intake instead (E3).
- **Free text** → use it directly as the research brief.

Summarize back what you understood (purpose, audience, any platform mentioned, any time hint) before moving on.

---

## Phase 2 — Variable interpretation {#variables}

Infer the design variables from the brief / existing survey / conversation:

- `audience` — who's being surveyed (role, tenure, usage, plan tier, recruitment source).
- `time_budget_min` — target completion minutes; if the brief gives a range, take the **upper** bound; default ~5 min for a general audience.
- `mode` — `generative` (understand / discover, open-ended-heavy), `evaluative` (validate / measure, closed-ended-heavy), or `hybrid` (a generative section then an evaluative section).
- `max_questions` — an optional hard cap on the question count; default: no cap.
- `response_impact` — what happens to the responses / what the audience gets out of answering (e.g. "decides which onboarding gaps we fix first this quarter"). Inferred from the brief if it says so; otherwise asked once (see below); if the author skips it, `response_impact: null`. It feeds the persuasive WIIFM line in `intro.text` (Phase 3 build step) and travels in the Phase-4 reviewer context.

Present what you inferred back to the user. For each variable that is **not** confidently inferable, ask via a single batched `AskUserQuestion` (one question per missing variable, at most 4 in the call):
- `mode` — options: `Hybrid — understand and validate (Recommended)`, `Generative — understand / discover`, `Evaluative — validate / measure`.
- `time_budget_min` — options: `~5 minutes (Recommended)`, `~3 minutes`, `~10 minutes`, free-form.
- `max_questions` — options: `No cap (Recommended)`, `Cap at 10`, `Cap at 15`, free-form.
- `audience` — no recommended default; this question, if it must be asked, is the one free-form gate.
<!-- defer-only: free-form -->
If the audience is still unclear after the inferences above, ask it on its own via `AskUserQuestion` (free-form answer; no auto-pickable default).
<!-- defer-only: free-form -->
If `response_impact` wasn't stated in the brief, ask it on its own via `AskUserQuestion` (free-form answer; no auto-pickable default — "what happens to these answers / what does your audience get out of it?"). If the author has nothing to say, set `response_impact: null` and proceed (the WIIFM line then falls back to a benefit-framed restatement of `purpose`).

**Hard stop:** if the user cannot articulate a research goal / purpose even after asking, state plainly that a survey can't be designed without one, and stop — do not guess a purpose (E2).

Record the resolved `{purpose, audience, time_budget_min, mode, max_questions, response_impact}` — they go into `survey.json` and into the Phase-4 / Phase-6 subagent prompts.

---

## Phase 3 — Generate the initial design {#generate}

### Build `survey.json` {#build-survey-json}

Load `reference/survey-json-schema.md` (the authoritative shape: 12 question types + `statement`, schema invariants, time-cost constants) and `reference/survey-best-practices.md` now. The invariants most often violated: `anonymous: true` forbids PII; skip logic jumps forward only; scales balanced with a separate opt-out; retrospective stems carry a `reference_period`. Then build:

- An **intro/consent block** (sponsor, purpose, accurate time estimate, what's collected / how used, anonymous vs. confidential stated honestly, voluntary; `consent_required: true` for research contexts). `intro.text` **MUST include a persuasive respondent-motivation / WIIFM sentence** — concrete impact of their answers, audience-specific framing, kept honest (no fake scarcity, no fake urgency, no overclaiming): built from `response_impact` when non-null, else a benefit-framed restatement of `purpose` with no invented downstream-action claim. (See `reference/survey-best-practices.md` §1; a bare "your answers help us improve" is the absence of one and the Phase-4 reviewer flags it `should-fix`.)
- **Sections in funnel order** (general → specific). **Screening / qualifying questions first** (mark `screening: true`); wire their `skip_logic` to bypass downstream sections for non-qualifiers. **Demographics / sensitive items last** (unless used for routing). Warm-up: an easy, non-sensitive item early. Signpost section transitions via `description` and/or `statement` items.
- **Mode-appropriate type mix:** `generative` → mostly `open_long` / `open_short` + a few broad closed items; `evaluative` → mostly closed/comparable (`single_select`, `rating`, `nps`, `forced_choice_grid`); `hybrid` → a generative section ("what happened, in your own words") then an evaluative section ("structured read on the usual suspects"). Always end with an optional open catch-all ("Anything else?"). For every `nps` question, add an `open_short` follow-up ("What's the main reason for your score?").
- **Generate NONE of the `reference/question-antipatterns.md` patterns** — self-check every stem and option set against that catalog's detection signals before committing.

### Trim to budget {#trim-to-budget}

Compute `estimated_minutes` (constants in the schema reference). If it exceeds `time_budget_min` (or the question count exceeds `max_questions`, if set): trim — keep screening + the highest-value items, cut nice-to-haves, prefer shorter question types, collapse near-duplicate items — *before* rendering. Record the final `estimated_minutes` in `survey.json`. If the user has explicitly insisted on keeping items that push it over budget, leave them and flag the over-run prominently in the Phase-9 summary (E10).

### Render the artifacts {#render}

Write all of these into the run folder:

- **`survey.json`** — the schema-reference object; pretty-printed (2-space indent) and deterministic key order.
- **`survey.html`** — substrate-compliant (uses the `_shared/html-authoring/template.html` shape: a toolbar with Copy-Markdown / Copy-link, a `<main>` body, a footer). The `<head>` MUST include `<meta name="pmos:skill" content="survey-design">` — required for `/comments resolve` routing. Body: `<section id="intro">` rendering the intro/consent block; one `<section id="<section-id>">` per survey section with `<h2>` = section title; within each, every question is an `<h3 id="<question-id>">` = stem, help text a `<p>`, options a `<ul>` (opt-out items after a `<hr>` rule), scales/matrix/grid as a small `<table>`; a metadata line `Mode: <mode> · Target: ~<n> min · Estimated: <m> min · <k> questions`. **No inline `<script>` or `<style>` in `<main>`**; assets referenced as `assets/style.css?v=<plugin-version>` and `assets/viewer.js?v=<plugin-version>` (`<plugin-version>` = the `version` from `plugins/pmos-toolkit/.claude-plugin/plugin.json`). Companion **`survey.sections.json`** enumerating `{id, level, title, parent_id}` for every `<section>`, `<h2>`, and `<h3>`.
- **`preview.html`** — a standalone page (intentionally **not** a pmos artifact): a minimal HTML page with `<div id="survey-root">`, a small inline `<style>` (mobile-first; label-adjacent controls; ≥ 4.5:1 contrast; visible focus; text "Question X of Y"; no graphical-only progress bar), an inline `<script type="application/json" id="survey-data">` holding the **full** `survey.json`, and `<script src="survey-preview.js"></script>`. No `fetch()`, no CDN, no external refs — it must work on double-click (`file://`).
- **`survey-preview.js`** — `cp -n` the skill's `assets/survey-preview.js` into the run folder's root (sibling to `preview.html`). Do not regenerate it.
- **`assets/`** in the run folder — `cp -n` `style.css`, `viewer.js`, `serve.js`, `comments.js`, `comments.css`, plus the launcher trio (`comments-open.command`, `comments-open.sh`, `comments-open.bat`) from `_shared/html-authoring/assets/` (idempotent; the comments/launcher assets are needed for `/comments` integration).
- **`index.html`** — seed it via the `_shared/html-authoring/index-generator.md` pattern (a manifest inlined as `<script type="application/json" id="pmos-index">`), listing the artifacts present so far (`survey.html`, `preview.html`); later phases regenerate it to add the eval/simulation/export entries.

### Substrate assets — two tiers {#substrate-assets}

Canonical rule for every `cp -n` source above and in Phase 7. Classify each source asset:
- **Hard-required** — `assets/survey-preview.js` (the standalone preview engine `preview.html` loads), `_shared/html-authoring/assets/style.css`, `_shared/html-authoring/assets/viewer.js` (both referenced by `survey.html`). If a hard-required source is **absent**: ABORT immediately — print exactly `survey-design: missing substrate asset <abs-path> — reinstall the pmos-toolkit plugin` to stderr, exit non-zero, and write **no** `survey.html` / `preview.html` / `index.html` (and no later run-folder artifact) — do **not** improvise a degraded self-contained renderer. (Earlier phases' commits stand; this run just stops.)
- **Convenience** — `_shared/html-authoring/assets/serve.js` (the preview server). If absent: emit one warning `survey-design: convenience asset <path> missing — skipping <dependent feature>` (no preview server when `serve.js` is missing) and **continue** — `survey.html` / `preview.html` are still produced. (The MD-sidecar emit path was retired with the inline-html-artifacts cutover.)

### Commit + re-render policy {#rederive}

`git add` the run folder and `git commit -m "survey-design: initial draft for <slug>"`. If the cwd isn't a git repo or `git commit` fails, print one warning and continue (E11).

**Re-render policy (canonical):** `survey.json` is the single mutation point. Later phases (5, 6, 8) mutate it and then **re-derive** `survey.html` / `survey.sections.json` / `preview.html` / `index.html` from it. Never hand-edit the rendered files.

---

## Phase 4 — Reviewer refinement loop {#reviewer-loop}

Phase 4 is a **bounded generate↔review loop** — at most **2 iterations**, with a **categorical** exit — not a single pass. Each iteration: dispatch a reviewer subagent to *evaluate* the current `survey.json`; if it returns zero product-fit FAILs **and** zero blocker-severity methodology findings, the loop is done; otherwise the **generator** (this skill, not the reviewer) regenerates only the flagged questions and re-derives the artifacts, then loops. After 2 iterations the loop stops regardless, and any residual FAIL/blocker is carried into Phase 5 as a top-of-batch decision. **The reviewer evaluates and recommends edits; it never writes files and never mutates `survey.json` — only the generator applies edits.** Don't extend the loop past 2 iterations or re-run it manually "for extra polish" — the cap is a cost governor; residuals surface in Phase 5.

### Reviewer dispatch (per iteration) {#reviewer-dispatch}

Dispatch **one** reviewer subagent (Task tool, `model: sonnet` — rubric-guided review against a written contract, validated parent-side; or run it sequentially inline if subagents are unavailable). The prompt MUST contain:
- the survey context object `{purpose, audience, time_budget_min, mode, max_questions, estimated_minutes, response_impact}`;
- the full **current** `survey.json` as text;
- the paths (or contents, if the subagent can't read files) of `reference/survey-best-practices.md` + `reference/question-antipatterns.md` — the reviewer evaluates against the **"Product fit (evaluate this first)"** section *first* (the three binary per-question checks + the survey-wide research-goal-coverage check), then the methodology sections, then the anti-pattern catalog;
- on iteration ≥ 2, the prior iteration's `question-eval.md` (so the reviewer can see what was flagged and whether the regeneration fixed it).
In non-interactive runs the prompt's first line is `[mode: non-interactive]`. The prompt MUST state explicitly: **"Do not write any files. Do not modify `survey.json`. Return the two markdown bodies plus the machine block below; the parent applies edits."**

### Reviewer return contract — specify it inside the prompt {#reviewer-return}

The subagent returns **two markdown bodies and one machine block**. The bodies are written for the user; only the machine block is parsed.

- **`question-eval.md`** — one `## <question-id>` section **per question** (clean questions get a section too, so coverage is checkable). Each section: the three product-fit verdicts (`predictability` / `load-bearing` / `scope-match`, each `PASS|FAIL` with one line of evidence — a predictability verdict must include the predicted answer distribution; any FAIL marks the question a kill/rewrite candidate), then the methodology findings, each the structured shape `{target, severity ∈ {blocker, should-fix, nit}, defect, message, proposed_fix}` with the fix concrete. Ends with a cumulative `## Refinement loop changelog`: per iteration, which questions were `rewritten / replaced / cut / kept (flag carried to Phase 5) / reverted` and the reviewer's reason — or `No regeneration — first review met the exit condition.` (E15).
- **`survey-eval.md`** — leads with the trendline `Findings: N (B blocker / S should-fix / K nit) · product-fit FAILs: M` — a progress signal across iterations, never an exit threshold (the exit is categorical, below). Then the survey-wide sections: research-goal coverage / product fit (coverage gaps, redundancy, scope drift), structure & order, length vs. budget, mode fit, scale balance, accessibility, ethics / PII, intro / consent (a missing persuasive WIIFM sentence in `intro.text` is a `should-fix`) — same findings shape, overall verdict line at the end.
- **Machine block** (a fenced ```yaml``` block the parent parses):
```yaml
product_fit_fails: [ { id: q-who-reached-out, checks: [predictability, load-bearing], reason: "open-ended collapses to 'the analytics team'; doesn't address why the wall blocked the upgrade", recommend: cut } ]
blockers: [ ]              # methodology findings at severity=blocker, each {id, defect, message, proposed_fix}
recommended_edits: [ ]     # the flat list of {id, action, proposed_fix} the generator should apply this iteration
```

### Parent side — per iteration {#reviewer-parent}

1. **Validate & handle reviewer failure.** Check `count(## <id> sections in question-eval.md) == count(questions in survey.json)` and that the machine block parses. On a count mismatch or a malformed/missing machine block, re-dispatch **once** naming the gaps; if still off, surface it, **skip auto-regeneration for this run**, keep the committed draft, and degrade to Phase 5 with what was returned — in interactive mode offer (`AskUserQuestion`: `Proceed without further review (Recommended)` / `Retry the reviewer pass`); in non-interactive mode proceed and log (E7, E8).
2. **Write** the two bodies to `survey-eval.md` and `question-eval.md` in the run folder (overwrite each iteration; the `## Refinement loop changelog` is cumulative across iterations).
3. **Exit check (categorical).** If `product_fit_fails == []` **and** `blockers == []` → the loop is done; go to Phase 5. The trendline is informational only.
4. **Cap check.** If this was iteration 2 → stop; go to Phase 5 carrying every residual `product_fit_fails` and `blockers` entry forward as Phase-5 top-of-batch decisions. Note in the changelog: `### Iteration 2 — cap reached; <n> item(s) carried to Phase 5`.
5. **Regenerate (targeted).** Otherwise the **generator** regenerates **only** the questions in `recommended_edits` plus any directly-coupled question (a follow-up depending on a rewritten stem, an `nps` open-follow-up, a screening item whose `skip_logic` references a changed question) — **never the whole survey**. An *author-supplied* question (one parsed in from an existing-survey file or explicitly dictated by the user) is **rewritten only, never auto-cut** — if the reviewer recommends `cut` for it, the generator does its best rewrite instead and flags it `kept (flag carried to Phase 5)` if it still FAILs (E17). Re-run trim-to-budget, re-derive the rendered artifacts (#rederive), append `### Iteration N` to the changelog, and loop back to the dispatch step.
   - **Invalid regeneration (E18).** If the regenerated `survey.json` violates a schema invariant, re-derive once; if still invalid, **revert that iteration** (keep the last valid `survey.json`), note `### Iteration N — reverted (regeneration produced invalid survey.json)` in the changelog, and exit the loop early to Phase 5.

## Phase 5 — Apply the critique {#apply-critique}

**Open with the loop summary.** State plainly: "the refinement loop ran N iteration(s)", summarize each iteration from the `## Refinement loop changelog`, and say whether it exited on the categorical condition or hit the 2-iteration cap.

Then present the remaining findings per **`_shared/findings-dispositions.md`** (severity-ordered batches ≤4, canonical `Fix as proposed (Recommended)` / `Modify` / `Skip` / `Defer` options), with these call-site deltas:

1. **Product-fit FAILs first**, as their own batch shaped to the kill-or-rewrite decision — one question per residual FAIL (the items the loop couldn't/didn't auto-resolve, plus any author-supplied question the loop only rewrote): `question` = `Kill or rewrite Q<id>? — <which checks FAILed + the predicted answer / collapsing theme>`; `options` = `Rewrite as proposed (Recommended)` / `Kill the question` / `Keep with reason` / `Defer`. `Kill the question` is offered even for an author-supplied question (the loop won't auto-kill those, but the *user* may); `Keep with reason` records an explicit override.
2. Then the methodology findings in the standard severity-ordered batches.

In non-interactive mode: auto-pick `Rewrite as proposed` for product-fit FAILs, `Fix as proposed` for `blocker` and `should-fix`, `Defer` for `nit`, logging each to the OQ buffer.

**Cosmetic-only carve-out (canonical; Phase 6 applies the same rule).** A finding is *cosmetic-only* when its `severity` is `nit` **and** its defect class is a wording/title polish with no methodological or product-fit impact (e.g. "section title 'Last bit' is informal" — fix is fine, but it's not worth a decision turn). Cosmetic-only findings are **excluded from the batched dispositions questions** and are instead listed in a single trailing chat line: `Noted, not asked: <Q-id or section> — <one-line polish suggestion>; …`. They are still written into the `## Dispositions` section of the eval files with disposition `noted (cosmetic, not asked)`. (A `nit` that *does* have methodological/product-fit weight — e.g. a slightly leading word — is **not** cosmetic-only; it stays in the `nit` batch.)

Apply the chosen dispositions by mutating `survey.json` and re-deriving the rendered artifacts (#rederive). Append a `## Dispositions` section to both `question-eval.md` and `survey-eval.md` recording each finding's disposition (including the cosmetic-only ones). `git commit -m "survey-design: apply review for <slug>"` (warn-and-continue if not a git repo). If the user defers every finding, record the deferrals in the `## Dispositions` sections and the run summary and commit the survey as-is (E9).

## Phase 6 — Simulated-respondent pass {#simulate}

Dispatch the simulated-respondent subagent (`model: sonnet` — bounded persona walk against a return contract the parent validates) **once per persona** — the default is **one** persona = the stated `audience`; derive a second persona only if the audience is clearly heterogeneous. The prompt contains: the survey content (the rendered question text + options, or `survey.json` as text); the persona description; and a friction-walk rubric — *walk the survey question by question; for each, note friction, confusion, comprehension gaps, and any time pressure; estimate cumulative minutes; flag drop-off-risk points*. `[mode: …]` first line in non-interactive runs.

**Return contract — in the prompt:** `{ persona, estimated_minutes, per_question: [{id, friction: [...], confusion: [...], comprehension_gaps: [...]}], dropoff_risk_points: [{after_id, reason}], overall_notes }` (JSON or markdown the parent can parse).

**Theater-check escape (pattern: `readme/reference/simulated-reader.md` §3).** A persona that returns **empty** findings across every question *and* no `dropoff_risk_points`, while the Phase-4 reviewer produced **≥3 findings**, is likely cooperative-persona theater. Re-dispatch that one persona **once** with an impatient-respondent suffix — spec constraints + bounce conditions, not a biography:

> This survey is optional and you have other things to do. Where do you skim, pick a midpoint just to advance, or abandon partway? If genuinely nothing here would make you drop off, guess, or stall, say so explicitly — but first re-walk it question by question as someone with no patience and no incentive to answer carefully.

Accept the second result as genuine even if it is still empty — no second retry. Log: `survey-design: <persona> re-dispatched (theater-check); <N> findings on retry`.

**Parent side.** Write the report(s) to `simulation.md`. Derive a fix list — each item `{target_question_id_or_survey, problem, proposed_fix}`. Compare `estimated_minutes` to `time_budget_min`: if over, the fix list MUST include concrete **cut** proposals; if the user keeps over-budget questions, the Phase-9 summary prominently flags the expected drop-off + the overage (E10). Present the fix list per `_shared/findings-dispositions.md` (`Fix as proposed` is Recommended for clear comprehension/length fixes); in non-interactive mode auto-pick `Fix as proposed` for comprehension/length fixes, `Defer` otherwise, logging to the OQ buffer. Apply the Phase-5 cosmetic-only carve-out unchanged (trailing `Noted, not asked:` line; recorded in `simulation.md`'s `## Dispositions`). Apply the chosen fixes to `survey.json`, re-derive the rendered artifacts (#rederive), append a `## Dispositions` section to `simulation.md`, `git commit -m "survey-design: apply simulation fixes for <slug>"`. **Near the simulation results, state plainly that this pass is a heuristic stand-in that does NOT replace cognitive interviews or a soft launch.**

## Phase 7 — Viewer {#viewer}

Ensure `style.css` / `viewer.js` (hard-required — `survey.html` references them) and `serve.js` (convenience — the preview server) are copied from `_shared/html-authoring/assets/` into the run folder's `assets/` (idempotent `cp -n`), applying the two-tier rule (#substrate-assets). Regenerate `index.html` via `_shared/html-authoring/index-generator.md` so its manifest now lists `survey.html`, `preview.html`, `survey-eval.md`, `question-eval.md`, `simulation.md`, and any `export/*` present. Tell the user the view command: from the run folder, `node assets/serve.js` (then open the printed URL), or just open `preview.html` / `index.html` directly in a browser.

## Phase 8 — Export {#export}

**Skip entirely if `--skip-export` was passed** — end after Phase 7.

Otherwise ask (`AskUserQuestion`, **multiSelect**): which platform(s) to emit import files for — options `Typeform`, `SurveyMonkey`, `Google Forms (Recommended)`, `Skip export` (and `Qualtrics — stretch` **only if** the `survey.qsf` transformer ships). A platform named in the initial context or via `--export` is pre-selected; the `(Recommended)` default is the named/`--export` platform, else `Google Forms` (lowest-friction import); in non-interactive mode with no `--export` and no named platform, auto-pick the single recommended platform.

For each chosen platform, transform `survey.json` → the platform artifact using the recipe + type-mapping table in `reference/platform-export.md` (load it now). The transformers are **pure functions of `survey.json`** — the same `survey.json` produces byte-identical output. Emit into `export/` in the run folder:
- **Typeform** → `export/typeform.json` (the Create-API body).
- **SurveyMonkey** → `export/surveymonkey.json` **and** `export/surveymonkey-paste.txt` (the plain-text "paste your content" fallback — only `single_select` and `open_short` survive).
- **Google Forms** → `export/build-google-form.gs` (an Apps Script using `FormApp.create()` + the relevant `add*Item()` calls).
- **Qualtrics** (only if shipped) → `export/survey.qsf`.

Each artifact MUST be structurally valid (the JSON parses; the `.gs` is syntactically valid JS). Map unsupported question types **down** per the mapping table; note **every** downgrade in `export/README.md`, and put a comment in the artifact itself for any meaning-changing downgrade.

Write **`export/README.md`** with, per chosen platform: the import steps, the auth / plan requirements, and the downgrade caveats — taken from that platform's section of `reference/platform-export.md` (already loaded; don't improvise commands it doesn't document).

`git commit -m "survey-design: add <platforms> export for <slug>"` (warn-and-continue if not a git repo). If the user names an unsupported platform: list the supported set and offer the closest match, or just `survey.json` + `survey.html`; Qualtrics is not offered unless the transformer is implemented (E12).

## Phase 9 — Summary + capture learnings {#summary}

Print: the run-folder path; the list of commits made (or one line noting commits were skipped because the cwd isn't a git repo); links to every artifact (`survey.json`, `survey.html`, `preview.html`, `index.html`, `survey-eval.md`, `question-eval.md`, `simulation.md`, `export/*`); the view command; and — if the simulated estimate exceeded `time_budget_min` and over-budget questions were kept — a prominent drop-off / overage flag (E10). In non-interactive runs, note the `_open_questions.md` path.

Then run **## Capture Learnings** (below).

---

## Apply comment-resolver edit {#apply-comment-resolver-edit}

The `/survey-design` entrypoint that `/comments resolve` dispatches into when walking open threads in a survey artifact's inline `pmos-comments` JSON block.

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md` — input/output JSON shapes, resolution order (id-first, then ≥40-char quote-substring fallback), the closed `error_enum` (`anchor_orphaned`, `edit_conflicted`, `agent_judged_infeasible`, `agent_errored`), idempotency rules, subagent invocation convention. Cite it; never restate it.
- **Shim:** `scripts/apply-edit-at-anchor.js` — exports `apply(input)`, returns the contract's success / failure / clarification shapes.
- **Skill-specific feasibility:** edits to the form schema (`<form>` field structures generated from `survey.json`) return `agent_judged_infeasible` with `system_reply`: `"Form schema is generated from survey.json — edit survey.json and regenerate via /survey-design."` Detection: anchor `id_anchor` matching `q-*`, `question-*`, `field-*`, or `form`; or `quote_anchor.text` containing form field HTML elements (`<input>`, `<select>`, `<textarea>`, etc.). Prose around the form (intro / outro paragraphs) IS editable via the standard anchor path.
- **Tests:** `tests/apply-edit-at-anchor.test.js` (5 cases) + wrapper `tests/scripts/assert_apply_edit_at_anchor_survey-design.sh`.

---

## Anti-Patterns (DO NOT)

- **Don't call platform APIs.** The skill emits import *files* and instructions — it never hits Typeform / SurveyMonkey / Google / Qualtrics (no network).
- **Don't edit the rendered HTML/JSON directly** — re-render policy (#rederive); `survey.json` is the only mutation point, and only the generator (never the reviewer subagent) mutates it.
- **Don't inline the `reference/*` files into SKILL.md.** Load them on demand in the phase that needs them.

## Capture Learnings

At the end of a run, reflect on whether this session surfaced anything worth capturing under `## /survey-design` in `~/.pmos/learnings.md` — repeated friction (e.g. users overriding the same Recommended option), survey shapes the reviewer kept flagging, mode-inference mistakes, export-recipe gaps. Emit exactly one line: either the new learning appended under that header, or `No new learnings this session because <reason>`. Proposing zero learnings is a valid outcome.

## Edge cases (single-glance index — behaviours are in the phase prose above)

| # | Scenario | Behaviour |
|---|---|---|
| E1 | No argument at all | Ask the user for purpose + audience before anything else (Phase 1). |
| E2 | Intake too thin — no purpose even after asking | State it can't design a survey without a research goal; stop (Phase 2). |
| E3 | Existing-survey file unparseable | Report it; show what was extracted; offer to treat the text as free-text intake (Phase 1). |
| E4 | Folder-slug collision | Append `-2` / `-3` / …; never overwrite (Phase 0). |
| E5 | Mode genuinely ambiguous | Recommend `hybrid` and have the user confirm / pick (Phase 2). |
| E6 | Reviewer finds nothing | Eval files say "no issues" with the checks shown passed; proceed to simulation without forcing edits (Phase 4). |
| E7 | Reviewer subagent fails / malformed | Surface failure; keep the committed draft; offer retry-or-proceed; non-interactive → proceed + log (Phase 4). |
| E8 | Per-question count mismatch | Re-dispatch once naming the missing ids; if still off, surface the gap + proceed without auto-apply (Phase 4). |
| E9 | User defers every finding | Record deferrals in the `## Dispositions` sections + the run summary; survey committed as-is (Phases 5–6). |
| E10 | Length can't fit budget with the questions the user insists on | Field it anyway; prominently flag expected drop-off + the overage in the summary (Phases 3, 6, 9). |
| E11 | Not in a git repo / commit fails | Write the artifacts; warn once that commits were skipped; continue (Phases 3, 5, 6, 8). |
| E12 | Unsupported export platform named | List the supported set; offer the closest match or just `survey.json` + `survey.html`; Qualtrics not offered unless implemented (Phase 8). |
| E13 | `.pmos/settings.yaml` missing | Default `docs_path = docs/pmos/`; warn once; proceed — do not run pipeline first-run setup (Phase 0). |
| E14 | Skip logic targets an earlier section | Schema invariant rejects it; rewrite the jump forward or drop it and note the change (Phase 3). |
| E15 | Phase-4 loop converges on iteration 1 | No regeneration; `## Refinement loop changelog` says "No regeneration — first review met the exit condition" (Phase 4 #reviewer-parent). |
| E16 | Phase-4 loop hits the 2-iteration cap with a residual FAIL/blocker | Loop stops; the residual product-fit FAIL(s)/blocker(s) are carried to Phase 5 as top-of-batch "Kill or rewrite Q<id>?" decisions (Phase 4 #reviewer-parent step 4, Phase 5). |
| E17 | An author-supplied question still FAILs product-fit after 2 rewrites | Never auto-cut; the generator does its best rewrite, flags it `kept (flag carried to Phase 5)`, and Phase 5 surfaces it as a kill candidate the *user* may kill (Phase 4 #reviewer-parent step 5). |
| E18 | Targeted regeneration produces an invalid `survey.json` | Re-derive once; if still invalid, revert that iteration, keep the last valid `survey.json`, note `### Iteration N — reverted` in the changelog, exit the loop early to Phase 5 (Phase 4 #reviewer-parent step 5). |
| E19 | Reviewer returns malformed output mid-loop | Re-dispatch once naming the gaps; if still malformed, skip auto-regeneration for the run, keep the committed draft, degrade to Phase 5 (interactive: offer proceed/retry; non-interactive: proceed + log) (Phase 4 #reviewer-parent step 1, E7). |
| E20 | A hard-required substrate asset (`survey-preview.js` / `style.css` / `viewer.js`) is missing at copy time | ABORT per the two-tier rule (#substrate-assets); write no rendered artifact; never improvise a degraded renderer (Phases 3, 7). |
| E21 | A convenience substrate asset (`serve.js`) is missing at copy time | One warning; skip the dependent extra (preview server); continue per the two-tier rule (#substrate-assets) (Phases 3, 7). |
| E22 | A question / fix whose only finding is a cosmetic nit (wording/title polish, no methodological or product-fit weight) | Excluded from the batched dispositions questions; surfaced in a trailing `Noted, not asked: …` line and recorded in `## Dispositions` as `noted (cosmetic, not asked)` (Phase 5 carve-out, Phase 6). |

---

*Spec lineage: `docs/pmos/features/2026-05-11_survey-design-skill/` (pipeline, survey.json IR, exports, edge-case ids E1–E14), `2026-05-11_update-skills-survey-design-fixes/` (product-fit checks, categorical loop exit, theater check, author-supplied-question protection, E15–E22), `2026-05-23_inline-doc-comments/` + `2026-05-28_inline-html-artifacts/` (comment resolver, inline persistence), `2026-05-08_non-interactive-mode/` (inline mode block). Per-rule FR/D traceability lives in those specs, not inline here.*
