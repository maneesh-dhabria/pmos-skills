---
name: survey-design
description: Design a methodologically sound survey from a rough intent, or refine an existing one — generates a sectioned survey.json, runs a reviewer-critique pass and a simulated-respondent friction walk, renders a fillable preview, and emits import files for Typeform / SurveyMonkey / Google Forms. Triggers on "design a survey", "create a survey", "build a questionnaire", "review my survey", "refine this survey", "make a survey ready to field", "/survey-design".
user-invocable: true
argument-hint: "<survey intent | path to an existing survey> [--export <platform[,platform]>] [--skip-export] [--format html|md|both] [--non-interactive | --interactive]"
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
- **Missing substrate assets (two tiers):** the `cp -n` sources in Phases 3.6 and 7 are classified hard-required (`survey-preview.js`, `style.css`, `viewer.js`) vs. convenience (`serve.js`; the turndown trio / `html-to-md.js` only if an `.md` sidecar is ever needed). A missing **hard-required** source ⇒ abort with `survey-design: missing substrate asset <abs-path> — reinstall the pmos-toolkit plugin` and write no degraded artifact; a missing **convenience** source ⇒ one warning, skip the dependent extra, continue. Never improvise a self-contained renderer in place of the substrate.

This skill is a **standalone utility** — it is not a pipeline stage. It writes into `{docs_path}/survey-design/{YYYY-MM-DD}_<slug>/`, never into the `/feature-sdlc` feature folders, and it does **not** run `_shared/pipeline-setup.md` first-run setup (see Phase 0).

## Reference files (loaded on demand)

The skill loads these from its own `reference/` directory only when the relevant phase needs them — keep them out of working context otherwise (progressive disclosure):

- `reference/survey-best-practices.md` — the methodological backbone applied in Phase 3 generation and the Phase 4 refinement loop (the leading **"Product fit (evaluate this first)"** section + the 0–100 scoring rubric, then structure/flow, question types, scales, length/burden, generative-vs-evaluative, bias reduction, question-writing rules, accessibility, ethics/PII).
- `reference/question-antipatterns.md` — the A1–E6 anti-pattern catalog, each entry with a concrete detection signal; the generator (Phase 3) must produce none of these, the reviewer (Phase 4) walks every question against the catalog.
- `reference/platform-export.md` — per-platform import mechanisms, artifact schemas, and the full type-mapping tables the Phase-8 transformer recipes cite.

---

## Phase 0 — Setup

1. **Read `.pmos/settings.yaml`.** Take `docs_path` from it. If the file or the key is absent, default `docs_path = docs/pmos/` and print one warning to stderr (`survey-design: no .pmos/settings.yaml; using docs_path=docs/pmos/`). **Do NOT run `_shared/pipeline-setup.md` Section A first-run setup** — this skill is not a pipeline stage and must work in any repo (E13, FR-07).
2. **Parse flags** from the argument string: `--export <platform[,platform]>` (pre-select export targets), `--skip-export` (skip Phase 8), `--format <html|md|both>` (only affects any feature-folder doc the skill writes — it normally writes none; the runtime survey folder is always HTML + JSON), `--non-interactive` / `--interactive` (the mode contract below).
3. **`output_format` note.** Resolve `output_format` from `.pmos/settings.yaml :: output_format` (default `html`), `--format` overrides (last flag wins); print to stderr once: `output_format: <value> (source: <cli|settings|default>)`. It governs only feature-folder docs (none here); the survey folder's artifacts are always `survey.json` + `survey.html` (substrate-compliant) + `preview.html` (standalone) + the eval/simulation markdown.
4. **Resolve the run folder.** Derive `<slug>` (lowercase-hyphenated, ASCII) from the survey title or intent; the run folder is `{docs_path}/survey-design/{YYYY-MM-DD}_<slug>/`. If that folder already exists, append `-2`, `-3`, … until unique — **never overwrite** an existing survey folder (E4, FR-24).
5. **Phase tracking.** If `TaskCreate`/`TodoWrite` is available, create one task per phase (0–9); otherwise announce each phase verbally (FR-08).
6. **Learnings.** Read `~/.pmos/learnings.md` if present; note any entries under `## /survey-design` and factor them in (skill body wins on conflict; surface conflicts before applying).

<!-- non-interactive-block:start -->
1. **Mode resolution.** Compute `(mode, source)` with precedence: `cli_flag > parent_marker > settings.default_mode > builtin-default ("interactive")` (FR-01).
   - `cli_flag` is `--non-interactive` or `--interactive` parsed from this skill's argument string. Last flag wins on conflict (FR-01.1).
   - `parent_marker` is set if the original prompt's first line matches `^\[mode: (interactive|non-interactive)\]$` (FR-06.1).
   - `settings.default_mode` is `.pmos/settings.yaml :: default_mode` if present and one of `interactive`/`non-interactive`. Unknown values → warn on stderr `settings: invalid default_mode value '<v>'; ignoring` and fall through (FR-01.3).
   - If `.pmos/settings.yaml` is malformed (not parseable as YAML, or missing `version`): print to stderr `settings.yaml malformed; fix and re-run` and exit 64 (FR-01.5).
   - On Phase 0 entry, always print to stderr exactly: `mode: <mode> (source: <source>)` (FR-01.2).

2. **Per-checkpoint classifier.** Before issuing any `AskUserQuestion` call, classify it (FR-02):
   - Use the awk extractor below to find the line of this call's `question:` key in the live SKILL.md (FR-02.6).
   - The defer-only tag, if present, is the literal previous non-empty line: `<!-- defer-only: <reason> -->` where `<reason>` ∈ {`destructive`, `free-form`, `ambiguous`} (FR-02.5).
   - Decision (in order): tag adjacent → DEFER; multiSelect with 0 Recommended → DEFER; 0 options OR no option label ends in `(Recommended)` → DEFER; else AUTO-PICK the (Recommended) option (FR-02.2).

3. **Buffer + flush.** Maintain an append-only OQ buffer in conversation memory. On each AUTO-PICK or DEFER classification, append one entry per the schema in spec §11.2. At end-of-skill (or in a caught error before exit), flush (FR-03):
   - Primary artifact is single Markdown → append `## Open Questions (Non-Interactive Run)` section with one fenced YAML block per entry; update prose frontmatter (`**Mode:**`, `**Run Outcome:**`, `**Open Questions:** N` where N counts deferred only — see FR-03.4) (FR-03.1).
   - Skill produces multiple artifacts → write a single `_open_questions.md` aggregator at the artifact directory root; primary artifact's frontmatter `**Open Questions:** N — see _open_questions.md` (FR-03.5).
   - Primary artifact is non-MD (SVG, etc.) → write sidecar `<artifact>.open-questions.md` (FR-03.2).
   - No persistent artifact (chat-only) → emit buffer to stderr at end-of-run as a single block prefixed `--- OPEN QUESTIONS ---` (FR-03.3).
   - Mid-skill error → flush partial buffer under heading `## Open Questions (Non-Interactive Run — partial; skill errored)`; set `**Run Outcome:** error`; exit 1 (E13).

4. **Subagent dispatch.** When dispatching a child skill via Task tool or inline invocation, prepend the literal first line: `[mode: <current-mode>]\n` to the child's prompt (FR-06).

5. **Awk extractor.** The classifier and `tools/audit-recommended.sh` MUST both use the function below. Loaded at script init time; sourcing differs per consumer.

<!-- awk-extractor:start -->
```awk
# Find AskUserQuestion call sites and their adjacent defer-only tags.
# Input: a SKILL.md file (stdin or argv).
# Output (TSV): <line_no>\t<has_recommended:0|1>\t<defer_only_reason or "-">
# A "call site" is a line referencing `AskUserQuestion` in the SKILL's own prose
# (backtick mentions, prose instructions, multi-line invocation hints).
# `(Recommended)` is detected on the call site line OR any subsequent non-blank
# line (the option-list block) until a blank line, defer-only tag, or another
# AskUserQuestion call closes the pending call. Lines inside the inlined
# `<!-- non-interactive-block:... -->` region are canonical contract text and
# never count as call sites.
function emit_pending() {
  if (pending_call > 0) {
    out_tag = (pending_call_tag != "") ? pending_call_tag : "-";
    printf "%d\t%d\t%s\n", pending_call, pending_has_recc, out_tag;
    pending_call = 0;
    pending_has_recc = 0;
    pending_call_tag = "";
  }
}
/^<!-- non-interactive-block:start -->$/ { in_inlined=1; next }
/^<!-- non-interactive-block:end -->$/   { in_inlined=0; next }
in_inlined { next }
/^[[:space:]]*<!--[[:space:]]*defer-only:[[:space:]]*([a-z-]+)[[:space:]]*-->/ {
  emit_pending();
  match($0, /defer-only:[[:space:]]*[a-z-]+/);
  pending_tag = substr($0, RSTART + 12, RLENGTH - 12);
  sub(/^[[:space:]]+/, "", pending_tag);
  pending_line = NR;
  next;
}
/^[[:space:]]*$/ {
  emit_pending();
  pending_tag = "";
  next;
}
/AskUserQuestion/ {
  emit_pending();
  pending_call = NR;
  pending_has_recc = ($0 ~ /\(Recommended\)/) ? 1 : 0;
  pending_call_tag = (pending_tag != "" && NR == pending_line + 1) ? pending_tag : "";
  pending_tag = "";
  next;
}
{
  if (pending_call > 0 && $0 ~ /\(Recommended\)/) {
    pending_has_recc = 1;
  }
}
END { emit_pending() }
```
<!-- awk-extractor:end -->

6. **Refusal check.** If this SKILL.md contains a `<!-- non-interactive: refused; ... -->` marker (regex: `<!--[[:space:]]*non-interactive:[[:space:]]*refused`), and `mode` resolved to `non-interactive`: emit refusal per Section A and exit 64 (FR-07).

7. **Pre-rollout BC.** If the `--non-interactive` argument is present BUT this SKILL.md does NOT contain the `<!-- non-interactive-block:start -->` marker (i.e., this skill hasn't been rolled out yet): emit `WARNING: --non-interactive not yet supported by /<skill>; falling back to interactive.` to stderr; continue in interactive mode (FR-08).

8. **End-of-skill summary.** Print to stderr at exit: `pmos-toolkit: /<skill> finished — outcome=<clean|deferred|error>, open_questions=<N>` (NFR-07).
<!-- non-interactive-block:end -->

---

## Phase 1 — Intake

The argument is one of: a free-text research intent; a path to an existing survey (`.html` / `.md` / `.txt` / `.json`); or nothing.

- **Nothing** → before doing anything else, use `AskUserQuestion`: ask the research **purpose** and the **audience**. Options for each: a `(Recommended)` first option only when a default genuinely makes sense; for the audience there is no sensible default — tag that one `<!-- defer-only: free-form -->`. (E1, FR-10.) Do not invent a purpose.
- **A path** → read the file and best-effort parse it into a `survey.json` skeleton: titles/headings → sections; recognizable question text + options → questions (guess the `type` from the option shape). If nothing recognizable comes out, report that, show what *was* extracted, and offer to treat the file's text as free-text intake instead (E3, FR-11).
- **Free text** → use it directly as the research brief.

Summarize back what you understood (purpose, audience, any platform mentioned, any time hint) before moving on.

---

## Phase 2 — Variable interpretation

Infer the design variables from the brief / existing survey / conversation:

- `audience` — who's being surveyed (role, tenure, usage, plan tier, recruitment source).
- `time_budget_min` — target completion minutes; if the brief gives a range, take the **upper** bound; default ~5 min for a general audience.
- `mode` — `generative` (understand / discover, open-ended-heavy), `evaluative` (validate / measure, closed-ended-heavy), or `hybrid` (a generative section then an evaluative section).
- `max_questions` — an optional hard cap on the question count; default: no cap.
- `response_impact` — what happens to the responses / what the audience gets out of answering (e.g. "decides which onboarding gaps we fix first this quarter"). Inferred from the brief if it says so; otherwise asked once (see below); if the author skips it, `response_impact: null`. It feeds the persuasive WIIFM line in `intro.text` (Phase 3.4) and travels in the Phase-4 reviewer context.

Present what you inferred back to the user. For each variable that is **not** confidently inferable, ask via a single batched `AskUserQuestion` (one question per missing variable, at most 4 in the call):
- `mode` — options: `Hybrid — understand and validate (Recommended)`, `Generative — understand / discover`, `Evaluative — validate / measure`.
- `time_budget_min` — options: `~5 minutes (Recommended)`, `~3 minutes`, `~10 minutes`, free-form.
- `max_questions` — options: `No cap (Recommended)`, `Cap at 10`, `Cap at 15`, free-form.
- `audience` — no recommended default; this question, if it must be asked, is the one free-form gate.
<!-- defer-only: free-form -->
If the audience is still unclear after the inferences above, ask it on its own via `AskUserQuestion` (free-form answer; no auto-pickable default).
<!-- defer-only: free-form -->
If `response_impact` wasn't stated in the brief, ask it on its own via `AskUserQuestion` (free-form answer; no auto-pickable default — "what happens to these answers / what does your audience get out of it?"). If the author has nothing to say, set `response_impact: null` and proceed (the WIIFM line then falls back to a benefit-framed restatement of `purpose`).

**Hard stop:** if the user cannot articulate a research goal / purpose even after asking, state plainly that a survey can't be designed without one, and stop — do not guess a purpose (E2, FR-14).

Record the resolved `{purpose, audience, time_budget_min, mode, max_questions, response_impact}` — they go into `survey.json` and into the Phase-4 / Phase-6 subagent prompts.

---

## Phase 3 — Generate the initial design

### 3.1 The `survey.json` schema (authoritative — the skill writes exactly this shape)

```json
{
  "schema_version": 2,                         // (req) int
  "title": "Trial conversion — exit survey",   // (req) string
  "purpose": "Understand why recent trial users did not upgrade.",  // (req) string — the research goal
  "mode": "generative",                        // (req) "generative" | "evaluative" | "hybrid"
  "audience": "People who started a trial in the last 30 days and did not upgrade.",  // (req) string
  "time_budget_min": 3,                        // (req) int — target completion minutes
  "estimated_minutes": 2.7,                    // (req) number — the skill's estimate (time constants below)
  "max_questions": null,                       // int | null
  "intro": {                                   // (req)
    "text": "Thanks for trying <Product>. We're figuring out which gaps actually block people who try a paid plan — your answers (about 3 minutes) decide which ones we fix first this quarter. Responses are confidential.",  // (req) string — MUST carry a persuasive, honest WIIFM sentence (Phase 3.4)
    "response_impact": "decides which trial-blocking gaps we fix first this quarter",  // string | null — the Phase-2 intake variable; null when the author didn't state it
    "consent_required": false,                 // bool — if true, an explicit "I agree" gate precedes Q1
    "anonymous": false,                        // bool — MUST be false if any PII question exists
    "estimated_seconds": 15,                   // number
    "thankyou": "Thanks — your feedback helps."  // string | null — shown on the final screen
  },
  "sections": [                                // (req) array, >= 1
    {
      "id": "screening",                       // (req) kebab id, unique
      "title": "First, a quick check",         // (req) string
      "description": null,                     // string | null — signpost text
      "randomize_questions": false,            // bool — never true for screening / ordinal-dependent sections
      "questions": [ /* question objects, see 3.2 */ ]   // (req) array, >= 1
    }
  ]
}
```

**Schema version & migration.** Current `schema_version` is `2`. A `schema_version: 1` `survey.json` (or one parsed from an existing-survey file) is still valid **input** — the skill reads it, then writes `schema_version: 2` on the next re-derive. v2 **removes no v1 field**; the only additions over v1 are `intro.response_impact` (here in §3.1) and the `multi_field_open` question type (added to the §3.2 `type` enum, with a `fields[]` array — see §3.2/§3.3).

### 3.2 The question object

```json
{
  "id": "q-hoped-to-do",            // (req) kebab id, unique across the whole survey
  "type": "open_long",              // (req) one of the type enum below
  "stem": "What were you hoping to accomplish when you started the trial?",  // (req) string
  "help_text": null,                // string | null — shown under the stem
  "required": false,                // (req) bool
  "reference_period": null,         // string | null — e.g. "in the past 7 days"; REQUIRED for retrospective/frequency questions
  "screening": false,               // bool — true => the answer drives skip logic; screening questions come first
  "skip_logic": null,               // null | { "on_value": <choice-value or [values]>, "action": "skip_to" | "end_survey", "target_section_id": <id|null> }
  "randomize_options": false,       // bool — true only for nominal (unordered) option lists; never for ordinal scales

  "options": [                      // for single_select / multi_select / forced_choice_grid (rows live in `rows`) / ranking
    { "value": "price", "label": "The price was too high" }
  ],
  "other_option": false,            // bool — appends an "Other (please specify)" free-text option
  "opt_out_options": [],            // array of {value,label} appended & visually separated, e.g. [{"value":"na","label":"Not applicable"},{"value":"dk","label":"Don't know"},{"value":"pnts","label":"Prefer not to say"}]

  "scale": {                        // for rating / nps
    "points": 5,                    // int — 5 or 7 default; NPS implies 11 (0..10)
    "min": 1, "max": 5,             // ints — NPS: 0..10
    "labels": { "min": "Not at all satisfied", "mid": "Neither", "max": "Extremely satisfied" },  // pole labels; "mid" only for odd scales
    "balanced": true                // bool — equal #positive/#negative around the midpoint (MUST be true unless `purpose` forces a forced-choice even scale)
  },

  "rows": [ { "id": "r-ease", "label": "Ease of use" } ],   // for forced_choice_grid / matrix — the items being rated
  "columns": [ { "value": "poor", "label": "Poor" } ],      // for matrix — the shared scale columns

  "constant_sum_total": 100,        // for constant_sum

  "fields": [                       // for multi_field_open ONLY — one single-line free-text input per field
    { "id": "daily", "label": "Daily active users", "placeholder": "e.g. 1,200" }   // id kebab & unique within the question; placeholder string | null
  ]
}
```

**`type` enum:** `single_select` (radio, pick one — MECE options, ~4–5 for attitudinal, `opt_out_options` recommended); `multi_select` (checkboxes — discouraged where per-item prevalence matters; if used, `randomize_options: true`); `forced_choice_grid` (Yes/No per item; the recommended replacement for "select all that apply"; columns implicitly Yes/No, optionally + "N/A"); `rating` (Likert / unipolar scale — construct-specific labels, *not* agree/disagree; balanced, poles labeled, opt-out separate); `nps` (0–10 recommend-likelihood; the skill SHOULD add an open follow-up automatically); `dichotomous` (Yes/No single — add a "Don't know" opt-out when uncertainty is plausible; don't force a binary on a continuum); `open_short` (single-line free text — `help_text` SHOULD hint the expected length); `open_long` (multi-line free text — the generative workhorse, keep to a few per survey); `ranking` (rank a short list — ≤ 5–7 items; for longer lists emit a "top-3 pick" `multi_select` instead); `matrix` (rate many items on a shared scale — ≤ ~7 rows, consider splitting, randomize rows, per-item on mobile); `constant_sum` (allocate N points across items — cognitively heavy, small item count); `multi_field_open` (a shared stem + one single-line free-text input **per field** — the recommended shape for "metrics by cadence"–style items, e.g. one labeled input each for daily / weekly / monthly active users; uses a `fields: [{id,label,placeholder}]` array, not `options`/`scale`/`rows`/`columns`/`constant_sum_total`; `opt_out_options` may still apply to the whole group; counts as **one** question toward `max_questions` and the progress counter; not a routable question — `skip_logic`/`screening` must stay null/false); `statement` (display-only — section intro / instructions; not a question; `required` ignored; not counted toward `max_questions` or the time estimate).

**Schema invariants** (the skill enforces these on write, and any consumer may re-check): all `id`s kebab-case and unique across the whole survey; `intro.anonymous: true` forbids any PII question; rating/nps scales `balanced: true` unless `purpose` explicitly justifies a forced even scale; ordinal types (`rating`, `nps`, `matrix` with an ordinal scale) never have `randomize_options: true`; `skip_logic.target_section_id` (when `action` is `skip_to`) MUST reference an existing **later** section — if a generated or parsed survey has a backward jump, rewrite it forward or drop it and note the change (E14); retrospective/frequency stems MUST set `reference_period`; `required: true` on a sensitive item (income, health, demographics, politics, anything PII-adjacent) MUST be accompanied by an `opt_out_options` entry; `multi_field_open` MUST carry a `fields` array of length ≥ 1 with kebab-case `id`s unique within that question, and MUST NOT carry `options` / `scale` / `rows` / `columns` / `constant_sum_total`, nor a non-null `skip_logic` or `screening: true` (no other type carries `fields`).

### 3.3 Time-cost constants (for `estimated_minutes`; FR-21 — tunable)

Per-question seconds: `open_short` / `open_long` = 30; `single_select` / `multi_select` / `dichotomous` = 8; `rating` / `nps` = 6; `matrix` / `forced_choice_grid` = 5 **per row**; `ranking` = 5 per item; `constant_sum` = 8 per item; `multi_field_open` = 30 **per field** (each field is costed like an `open_short`); `statement` = 5 (read time). Plus the intro/consent screen = `intro.estimated_seconds` (default 15). `estimated_minutes` = (Σ of the above) ÷ 60, rounded to one decimal.

### 3.4 Build `survey.json`

Apply `reference/survey-best-practices.md` (load it now):
- An **intro/consent block** (sponsor, purpose, accurate time estimate, what's collected / how used, anonymous vs. confidential stated honestly, voluntary; `consent_required: true` for research contexts). `intro.text` **MUST include a persuasive respondent-motivation / WIIFM sentence** — concrete impact of their answers, audience-specific framing, kept honest (no fake scarcity, no fake urgency, no overclaiming): built from `response_impact` when non-null, else a benefit-framed restatement of `purpose` with no invented downstream-action claim. (See `reference/survey-best-practices.md` §1 "Persuasive respondent-motivation (WIIFM) line — required"; a bare "your answers help us improve" is the absence of one and the Phase-4 reviewer's intro/consent dimension flags it `should-fix`.)
- **Sections in funnel order** (general → specific). **Screening / qualifying questions first** (mark `screening: true`); wire their `skip_logic` to bypass downstream sections for non-qualifiers. **Demographics / sensitive items last** (unless used for routing). Warm-up: an easy, non-sensitive item early. Signpost section transitions via `description` and/or `statement` items.
- **Mode-appropriate type mix:** `generative` → mostly `open_long` / `open_short` + a few broad closed items; `evaluative` → mostly closed/comparable (`single_select`, `rating`, `nps`, `forced_choice_grid`); `hybrid` → a generative section ("what happened, in your own words") then an evaluative section ("structured read on the usual suspects"). Always end with an optional open catch-all ("Anything else?").
- **Scales:** balanced, poles (and midpoint on odd scales) labeled, a separate visually-offset opt-out (`opt_out_options`); construct-specific labels (never agree/disagree); 5-point default, 7-point for nuanced/employee research. For every `nps` question, add an `open_short` follow-up ("What's the main reason for your score?").
- **Generate NONE of the `reference/question-antipatterns.md` patterns** — self-check every stem and option set against that catalog's detection signals before committing (FR-22).

### 3.5 Trim to budget

Compute `estimated_minutes`. If it exceeds `time_budget_min` (or the question count exceeds `max_questions`, if set): trim — keep screening + the highest-value items, cut nice-to-haves, prefer shorter question types, collapse near-duplicate items — *before* rendering. Record the final `estimated_minutes` in `survey.json`. If the user has explicitly insisted on keeping items that push it over budget, leave them and flag the over-run prominently in the Phase-9 summary (E10).

### 3.6 Render the artifacts

Write all of these into the run folder:

- **`survey.json`** — the object above; pretty-printed (2-space indent) and deterministic key order.
- **`survey.html`** — substrate-compliant (uses the `_shared/html-authoring/template.html` shape: a toolbar with Copy-Markdown / Copy-link, a `<main>` body, a footer). The `<head>` MUST include `<meta name="pmos:skill" content="survey-design">` — required for `/comments resolve` routing (FR-01, FR-40). Body: `<section id="intro">` rendering the intro/consent block; one `<section id="<section-id>">` per survey section with `<h2>` = section title; within each, every question is an `<h3 id="<question-id>">` = stem, help text a `<p>`, options a `<ul>` (opt-out items after a `<hr>` rule), scales/matrix/grid as a small `<table>`; a metadata line `Mode: <mode> · Target: ~<n> min · Estimated: <m> min · <k> questions`. **No inline `<script>` or `<style>` in `<main>`**; assets referenced as `assets/style.css?v=<plugin-version>` and `assets/viewer.js?v=<plugin-version>` (`<plugin-version>` = the `version` from `plugins/pmos-toolkit/.claude-plugin/plugin.json`). Companion **`survey.sections.json`** enumerating `{id, level, title, parent_id}` for every `<section>`, `<h2>`, and `<h3>`.
- **`preview.html`** — a standalone page (intentionally **not** a pmos artifact — D4): a minimal HTML page with `<div id="survey-root">`, a small inline `<style>` (mobile-first; label-adjacent controls; ≥ 4.5:1 contrast; visible focus; text "Question X of Y"; no graphical-only progress bar), an inline `<script type="application/json" id="survey-data">` holding the **full** `survey.json`, and `<script src="survey-preview.js"></script>`. No `fetch()`, no CDN, no external refs — it must work on double-click (`file://`).
- **`survey-preview.js`** — `cp -n` the skill's `assets/survey-preview.js` into the run folder's root (sibling to `preview.html`). Do not regenerate it.
- **`assets/`** in the run folder — `cp -n` `style.css`, `viewer.js`, `serve.js`, `comments.js`, `comments.css`, `diff-match-patch.js`, `launcher.js`, `launcher.css`, `launcher-config.js` from `_shared/html-authoring/assets/` (idempotent; `style.css` and `viewer.js` are hard-required; the comments/launcher assets are needed for `/comments` integration; `serve.js` is convenience).
- **`index.html`** — seed it via the `_shared/html-authoring/index-generator.md` pattern (a manifest inlined as `<script type="application/json" id="pmos-index">`), listing the artifacts present so far (`survey.html`, `preview.html`); later phases regenerate it to add the eval/simulation/export entries.

**Substrate-asset handling — two tiers (applies to every `cp -n` source above and in Phase 7).** Before each copy, classify the source asset:
- **Hard-required** — `assets/survey-preview.js` (the standalone preview engine that `preview.html` loads), `_shared/html-authoring/assets/style.css`, `_shared/html-authoring/assets/viewer.js` (both referenced by `survey.html`). If a hard-required source is **absent**: ABORT immediately — print exactly `survey-design: missing substrate asset <abs-path> — reinstall the pmos-toolkit plugin` to stderr, exit non-zero, and write **no** `survey.html` / `preview.html` / `index.html` (and no later run-folder artifact) — do **not** improvise a degraded self-contained renderer. (Earlier phases' commits stand; this run just stops.)
- **Convenience** — `_shared/html-authoring/assets/serve.js` (the preview server), plus `html-to-md.js` and the turndown trio (`turndown.umd.js`, `turndown-plugin-gfm.umd.js`, `LICENSE.turndown.txt`) **only if a later phase ever needs an `.md` sidecar** — none of the survey-design artifacts do, so this skill normally only touches `serve.js`. If a convenience source is **absent**: emit one warning `survey-design: convenience asset <path> missing — skipping <dependent feature>` (no preview server when `serve.js` is missing; no `.md` sidecar when the turndown trio / `html-to-md.js` is missing) and **continue** — `survey.html` / `preview.html` are still produced.

### 3.7 Commit

`git add` the run folder and `git commit -m "survey-design: initial draft for <slug>"`. If the cwd isn't a git repo or `git commit` fails, print one warning and continue (E11, FR-24, D9).

**Re-render policy:** later phases (5, 6, 8) mutate `survey.json` and then **re-derive** `survey.html` / `survey.sections.json` / `preview.html` / `index.html` from it. Never hand-edit the rendered files (D5).

---

## Phase 4 — Reviewer refinement loop

Phase 4 is a **bounded generate↔review loop** — at most **2 iterations**, with a **categorical** exit — not a single pass. Each iteration: dispatch a reviewer subagent to *evaluate* the current `survey.json`; if it returns zero product-fit FAILs **and** zero blocker-severity methodology findings, the loop is done; otherwise the **generator** (this skill, not the reviewer) regenerates only the flagged questions and re-derives the artifacts, then loops. After 2 iterations the loop stops regardless, and any residual FAIL/blocker is carried into Phase 5 as a top-of-batch decision. **The reviewer evaluates and recommends edits; it never writes files and never mutates `survey.json` — only the generator applies edits.**

### 4.1 Reviewer dispatch contract (per iteration)

Dispatch **one** reviewer subagent (Task tool; or run it sequentially inline if subagents are unavailable). The prompt MUST contain:
- the survey context object `{purpose, audience, time_budget_min, mode, max_questions, estimated_minutes, response_impact}`;
- the full **current** `survey.json` as text;
- the contents (or, if the subagent can read files, the paths) of `reference/survey-best-practices.md` + `reference/question-antipatterns.md` — the reviewer evaluates against that file's **"Product fit (evaluate this first)"** section *first* (the three binary per-question checks + the survey-wide research-goal-coverage check), then the methodology sections, then the anti-pattern catalog;
- on iteration ≥ 2, the prior iteration's `question-eval.md` (so the reviewer can see what was flagged and whether the regeneration fixed it).
In non-interactive runs the prompt's first line is `[mode: non-interactive]`. The prompt MUST state explicitly: **"Do not write any files. Do not modify `survey.json`. Return the two markdown bodies plus the machine block below; the parent applies edits."**

### 4.2 Reviewer return contract — specify it inside the prompt

The subagent returns **two markdown bodies and one machine block**.

**`question-eval.md` body** — one `## <question-id>` section **per question** (keyed by `question.id`; a clean question is expected and allowed). Each section, in order:
1. a **`**Product fit:**`** lead line — the three binary verdicts and their evidence: `predictability: PASS|FAIL — <predicted answer distribution / expected themes>`, `load-bearing: PASS|FAIL — <one line>`, `scope-match: PASS|FAIL — <one line>`. Any FAIL ⇒ append `→ kill/rewrite candidate`.
2. the methodology verdict line (`Verdict: no issues` or `Verdict: N finding(s)`), with the stem quoted;
3. the findings table — columns `Severity | Defect | Message | Proposed fix`; each finding the structured shape `{target` (the question id, or a field like "options" / "scale")`, severity ∈ {blocker, should-fix, nit}, defect` (the catalog id or a short label)`, message` (1–2 sentences)`, proposed_fix` (concrete)`}`.

Plus, once at the end of the file, a `## Refinement loop changelog` section: one `### Iteration N` table per regeneration round — columns `| Q id | action | reviewer reason | score Δ |` (`action` ∈ {`rewritten`, `replaced`, `cut`, `kept (flag carried to Phase 5)`, `reverted`}); or, if the first review met the exit condition, the single line `No regeneration — first review met the exit condition.`

**`survey-eval.md` body** — leads with `Score: N/100 (product-fit P/30, structure S/15, length L/10, mode M/10, scale Sc/10, accessibility A/10, ethics E/10, intro I/5)` computed per the `reference/survey-best-practices.md` "Scoring rubric" — **informational only, a progress signal, never an exit threshold** (the loop exit is categorical, see 4.3). Then a `## Research-goal coverage / product fit` section (coverage gaps, redundancy, scope drift — the survey-wide checks). Then one section each for **Structure & order** (funnel), **Length vs. budget**, **Mode fit**, **Scale balance**, **Accessibility**, **Ethics / PII**, **Intro / consent** — each with the same findings-table shape *and* its own `sub-score: x/weight` line. The **Intro / consent** section flags a missing persuasive WIIFM sentence in `intro.text` as a `should-fix` finding (see `reference/survey-best-practices.md` §1 intro guidance). Ends with an overall verdict line.

**Machine block** (a fenced ```yaml``` block the parent parses):
```yaml
score: 80
sub_scores: { product_fit: 12, structure: 15, length: 10, mode: 10, scale: 7.5, accessibility: 10, ethics: 10, intro: 5 }
product_fit_fails: [ { id: q-who-reached-out, checks: [predictability, load-bearing], reason: "open-ended collapses to 'the analytics team'; doesn't address why the wall blocked the upgrade", recommend: cut } ]
blockers: [ ]              # methodology findings at severity=blocker, each {id, defect, message, proposed_fix}
recommended_edits: [ ]     # the flat list of {id, action, proposed_fix} the generator should apply this iteration
```

### 4.3 Parent side — per iteration

1. **Validate & handle reviewer failure.** Check `count(## <id> sections in question-eval.md) == count(questions in survey.json)` and that the machine block parses. On a count mismatch or a malformed/missing machine block, re-dispatch **once** naming the gaps; if still off, surface it, **skip auto-regeneration for this run**, keep the committed draft, and degrade to Phase 5 with what was returned — in interactive mode offer (`AskUserQuestion`: `Proceed without further review (Recommended)` / `Retry the reviewer pass`); in non-interactive mode proceed and log (E7, E8, FR-32, FR-35).
2. **Write** the two bodies to `survey-eval.md` and `question-eval.md` in the run folder (overwrite each iteration; the `## Refinement loop changelog` is cumulative across iterations).
3. **Exit check (categorical).** If `product_fit_fails == []` **and** `blockers == []` → the loop is done; go to Phase 5. The `score` is **not** consulted.
4. **Cap check.** If this was iteration 2 → stop; go to Phase 5 carrying every residual `product_fit_fails` and `blockers` entry forward as Phase-5 top-of-batch decisions. Note in the changelog: `### Iteration 2 — cap reached; <n> item(s) carried to Phase 5`.
5. **Regenerate (targeted).** Otherwise the **generator** regenerates **only** the questions in `recommended_edits` plus any directly-coupled question (a follow-up depending on a rewritten stem, an `nps` open-follow-up, a screening item whose `skip_logic` references a changed question) — **never the whole survey**. Honor **D10**: an *author-supplied* question (one parsed in from an existing-survey file or explicitly dictated by the user) is **rewritten only, never auto-cut** — if the reviewer recommends `cut` for it, the generator does its best rewrite instead and flags it `kept (flag carried to Phase 5)` if it still FAILs. Re-run §3.5 trim-to-budget, re-derive `survey.html` / `survey.sections.json` / `preview.html` / `index.html`, append `### Iteration N` to the changelog, and loop back to 4.1.
   - **D12 — invalid regeneration.** If the regenerated `survey.json` violates a §3.2 schema invariant, re-derive once; if still invalid, **revert that iteration** (keep the last valid `survey.json`), note `### Iteration N — reverted (regeneration produced invalid survey.json)` in the changelog, and exit the loop early to Phase 5.

## Phase 5 — Apply the critique

**Open with the loop summary.** State plainly: "the refinement loop ran N iteration(s)", summarize each iteration from the `## Refinement loop changelog`, and say whether it exited on the categorical condition or hit the 2-iteration cap.

Then present the remaining findings as batched interactive questions (per the `_shared/interactive-prompts.md` findings/dispositions protocol), in this order:

1. **Product-fit FAILs first** — one `AskUserQuestion` per residual product-fit FAIL (the items the loop couldn't/didn't auto-resolve, plus any author-supplied question the loop only rewrote):
   - `question`: `Kill or rewrite Q<id>? — <which checks FAILed + the predicted answer / collapsing theme>`
   - `options`: `Rewrite as proposed (Recommended)` / `Kill the question` / `Keep with reason` / `Defer to a later pass` — `Kill the question` is offered even for an author-supplied question (the loop won't auto-kill those, but the *user* may); `Keep with reason` records an explicit override.
2. then the methodology findings in batches by severity — `blocker` → `should-fix` → `nit`, at most 4 questions per call, one question per finding, severity-tagged (`[Blocker] …` / `[Should-fix] …` / `[Nit] …`), options `Fix as proposed (Recommended)` / `Modify the fix` / `Skip this finding` / `Defer to a later pass`.

In non-interactive mode: auto-pick `Rewrite as proposed` for product-fit FAILs, `Fix as proposed` for `blocker` and `should-fix`, `Defer` for `nit`, logging each to the OQ buffer.

**Cosmetic-only carve-out.** A finding is *cosmetic-only* when its `severity` is `nit` **and** its defect class is a wording/title polish with no methodological or product-fit impact (e.g. "section title 'Last bit' is informal" — fix is fine, but it's not worth a decision turn). Cosmetic-only findings are **EXCLUDED from the batched dispositions questions** (they are never offered as a finding to disposition) and are instead listed in a single trailing chat line: `Noted, not asked: <Q-id or section> — <one-line polish suggestion>; …`. They are still written into the `## Dispositions` section of `question-eval.md` / `survey-eval.md` with disposition `noted (cosmetic, not asked)`. (A `nit` that *does* have methodological/product-fit weight — e.g. a slightly leading word — is **not** cosmetic-only; it stays in the `nit` batch.)

Apply the chosen dispositions by **mutating `survey.json`** (never editing the rendered files), then re-derive `survey.html` / `survey.sections.json` / `preview.html` / `index.html` from it. Append a `## Dispositions` section to both `question-eval.md` and `survey-eval.md` recording each finding's disposition (including the cosmetic-only ones, marked `noted (cosmetic, not asked)`). `git commit -m "survey-design: apply review for <slug>"` (warn-and-continue if not a git repo). If the user defers every finding, record the deferrals in the `## Dispositions` sections and the run summary and commit the survey as-is (E9).

## Phase 6 — Simulated-respondent pass

Dispatch the simulated-respondent subagent **once per persona** — the default is **one** persona = the stated `audience`; derive a second persona only if the audience is clearly heterogeneous (D18). The prompt contains: the survey content (the rendered question text + options, or `survey.json` as text); the persona description; and a friction-walk rubric — *walk the survey question by question; for each, note friction, confusion, comprehension gaps, and any time pressure; estimate cumulative minutes; flag drop-off-risk points*. `[mode: …]` first line in non-interactive runs.

**Return contract — in the prompt:** `{ persona, estimated_minutes, per_question: [{id, friction: [...], confusion: [...], comprehension_gaps: [...]}], dropoff_risk_points: [{after_id, reason}], overall_notes }` (JSON or markdown the parent can parse).

**Parent side.** Write the report(s) to `simulation.md`. Derive a fix list — each item `{target_question_id_or_survey, problem, proposed_fix}`. Compare `estimated_minutes` to `time_budget_min`: if over, the fix list MUST include concrete **cut** proposals; if the user keeps over-budget questions, the Phase-9 summary prominently flags the expected drop-off + the overage (E10, FR-42). Present the fix list via batched `AskUserQuestion` (same protocol; options `Apply (Recommended)` / `Modify the fix` / `Skip this fix` / `Defer to a later pass`; `Apply` is recommended for clear comprehension/length fixes); in non-interactive mode auto-pick `Apply` for comprehension/length fixes, `Defer` otherwise, logging to the OQ buffer. Apply the **same cosmetic-only carve-out as Phase 5** — a fix that is purely a wording/title polish with no comprehension/length/methodology weight is not asked; it goes into a trailing `Noted, not asked: …` line and into `simulation.md`'s `## Dispositions` as `noted (cosmetic, not asked)`. Apply the chosen fixes to `survey.json`, re-derive all rendered artifacts, append a `## Dispositions` section to `simulation.md`, `git commit -m "survey-design: apply simulation fixes for <slug>"`. **Near the simulation results, state plainly that this pass is a heuristic stand-in that does NOT replace cognitive interviews or a soft launch** (FR-44 — it's a Non-Goal to replace fielded pretesting).

## Phase 7 — Viewer

Ensure `style.css` / `viewer.js` (hard-required — `survey.html` references them) and `serve.js` (convenience — the preview server) are copied from `_shared/html-authoring/assets/` into the run folder's `assets/` (idempotent `cp -n`), applying the **two-tier handling from §3.6**: a missing hard-required source ⇒ ABORT with `survey-design: missing substrate asset <abs-path> — reinstall the pmos-toolkit plugin`; a missing `serve.js` ⇒ one warning, skip the preview-server line below, continue (FR-50). Regenerate `index.html` via `_shared/html-authoring/index-generator.md` so its manifest now lists `survey.html`, `preview.html`, `survey-eval.md`, `question-eval.md`, `simulation.md`, and any `export/*` present (FR-51). Tell the user the view command: from the run folder, `node assets/serve.js` (then open the printed URL), or just open `preview.html` / `index.html` directly in a browser.

## Phase 8 — Export

**Skip entirely if `--skip-export` was passed** — end after Phase 7 (FR-64).

Otherwise ask (`AskUserQuestion`, **multiSelect**): which platform(s) to emit import files for — options `Typeform`, `SurveyMonkey`, `Google Forms (Recommended)`, `Skip export` (and `Qualtrics — stretch` **only if** the `survey.qsf` transformer ships). A platform named in the initial context or via `--export` is pre-selected; the `(Recommended)` default is the named/`--export` platform, else `Google Forms` (lowest-friction import); in non-interactive mode with no `--export` and no named platform, auto-pick the single recommended platform.

For each chosen platform, transform `survey.json` → the platform artifact using the recipe + type-mapping table in `reference/platform-export.md` (load it now). The transformers are **pure functions of `survey.json`** — the same `survey.json` produces byte-identical output (NFR-05). Emit into `export/` in the run folder:
- **Typeform** → `export/typeform.json` (the Create-API body: `title`, `type`, `settings`, `welcome_screens[]`, `fields[]`, `logic[]`, `thankyou_screens[]`).
- **SurveyMonkey** → `export/surveymonkey.json` (`title`, `language`, `pages[].questions[]` with `family`/`subtype`) **and** `export/surveymonkey-paste.txt` (the plain-text "paste your content" fallback — only `single_select` and `open_short` survive).
- **Google Forms** → `export/build-google-form.gs` (an Apps Script using `FormApp.create()` + the relevant `add*Item()` calls).
- **Qualtrics** (only if shipped) → `export/survey.qsf`.

Each artifact MUST be structurally valid (the JSON parses; the `.gs` is syntactically valid JS). Map unsupported question types **down** per the mapping table (Google Forms: `nps` → `addScaleItem` 0–10; `ranking` → `addGridItem` 1..N; `matrix` / `forced_choice_grid` → `addGridItem`; `constant_sum` → N×`addTextItem` + a help-text note — SurveyMonkey and Typeform are native for rank/NPS/matrix); note **every** downgrade in `export/README.md`, and put a comment in the artifact itself for any meaning-changing downgrade.

Write **`export/README.md`** with, per chosen platform: the import steps (Typeform: `curl -X POST https://api.typeform.com/forms -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d @typeform.json`; SurveyMonkey: `POST /v3/surveys` with the JSON, or paste `surveymonkey-paste.txt` into the UI on a free plan; Google Forms: open script.google.com → New project → paste `build-google-form.gs` → Run → approve the prompt → the form URL is logged); the auth / plan requirements (Typeform: personal access token, `forms:write` scope; SurveyMonkey: OAuth token + a paid Team/Enterprise plan for API write; Google Forms: just sign-in authorization in the Apps Script editor); and the downgrade caveats.

`git commit -m "survey-design: add <platforms> export for <slug>"` (warn-and-continue if not a git repo). If the user names an unsupported platform: list the supported set and offer the closest match, or just `survey.json` + `survey.html`; Qualtrics is not offered unless the transformer is implemented (E12, FR-65).

## Phase 9 — Summary + capture learnings

Print: the run-folder path; the list of commits made (or one line noting commits were skipped because the cwd isn't a git repo); links to every artifact (`survey.json`, `survey.html`, `preview.html`, `index.html`, `survey-eval.md`, `question-eval.md`, `simulation.md`, `export/*`); the view command; and — if the simulated estimate exceeded `time_budget_min` and over-budget questions were kept — a prominent drop-off / overage flag (E10, FR-42). In non-interactive runs, note the `_open_questions.md` path (NFR-06).

Then run **## Capture Learnings** (below).

---

## Apply comment-resolver edit

This phase is the `/survey-design` entrypoint that `/comments resolve` dispatches into when walking open threads in a survey artifact's `.comments.json` sidecar. The contract — input/output JSON shapes, closed `error_enum` set, idempotency rules, subagent invocation convention — lives in the shared contract doc and is the single source of truth:

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md`

Per [NFR-08](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#nfr-h), this phase MUST cite that file rather than restate the contract. Anything below is `/survey-design`-specific implementation guidance only.

### When invoked

The resolver dispatches a subagent with the §9.1 input JSON. The subagent's tools include this skill's Node shim:

- **Shim:** `plugins/pmos-toolkit/skills/survey-design/scripts/apply-edit-at-anchor.js` — exports `apply(input)`, returns one of the three output shapes (success / failure / clarification) per §9.1.

### Resolution order

Per the contract:

1. **id-first.** If `anchor.id_anchor` is set, locate `id="<id>"` in the artifact HTML. Match → success path, `strategy: "id-first"`, `score: 1.0`.
2. **quote-fallback.** Otherwise (or on id miss), run diff-match-patch Bitap against `anchor.quote_anchor.text`. Accept when the normalized score ≥ 0.7.
3. **Neither hits** → emit `{ success: false, error_enum: "anchor_orphaned" }`; do NOT mutate the artifact.

### Skill-specific feasibility

Edits to the form schema (`<form>` field structures generated from `survey.json`) return `agent_judged_infeasible` with `system_reply`: `"Form schema is generated from survey.json — edit survey.json and regenerate via /survey-design."` Detection: anchor `id_anchor` matching `q-*`, `question-*`, `field-*`, or `form`; or `quote_anchor.text` containing form field HTML elements (`<input>`, `<select>`, `<textarea>`, etc.).

Prose around the form (intro / outro paragraphs) IS editable via the standard anchor path.

### Closed error_enum

`anchor_orphaned`, `edit_conflicted`, `agent_judged_infeasible`, `agent_errored`.

### Tests

- Per-skill contract: `plugins/pmos-toolkit/skills/survey-design/tests/apply-edit-at-anchor.test.js` (5 cases: id-first prose happy, orphan, idempotent, infeasible form schema edit, clarification).
- Wrapper: `tests/scripts/assert_apply_edit_at_anchor_survey-design.sh`.

---

## Anti-Patterns (DO NOT)

- **Don't edit the rendered HTML/JSON directly.** Mutate `survey.json` and re-derive `survey.html` / `survey.sections.json` / `preview.html` / `index.html` from it (D5).
- **Don't guess a research purpose.** If the user can't articulate one, say a survey can't be designed without it and stop (FR-14, E2).
- **Don't generate any catalogued anti-pattern.** Self-check every stem and option set against `reference/question-antipatterns.md` (FR-22).
- **Don't claim "anonymous" while collecting an identifier.** `intro.anonymous: true` forbids any PII question; say "confidential" if you can re-identify.
- **Don't prompt the user for variables already clear in the context** (FR-13). Infer first; ask only the genuine gaps.
- **Don't dump reviewer / simulation findings as a wall of prose.** Always present them as batched, structured questions with `Fix / Modify / Skip / Defer` options — and don't pad the dispositions batch with cosmetic-only nits either: list those in a trailing `Noted, not asked:` line (still recorded in `## Dispositions`).
- **The Phase-4 loop is bounded — cap 2 iterations, categorical exit.** Don't extend it past 2, don't re-run it manually "for extra polish", and don't gate it on the 0–100 score (that score is a progress signal, not a threshold) (D20).
- **Don't have the reviewer mutate `survey.json`.** The reviewer evaluates and recommends edits; only the generator (the skill itself) applies them and re-derives the artifacts.
- **Don't call platform APIs.** The skill emits import *files* and instructions — it never hits Typeform / SurveyMonkey / Google / Qualtrics (Non-Goal, NFR-01: no network).
- **Don't overwrite an existing survey folder.** Dedupe the slug with `-2` / `-3` / … (FR-24, E4).
- **Don't inline the `reference/*` files into SKILL.md.** Load them on demand in the phase that needs them (FR-73).

## Release prerequisites

- The canonical skill path is `plugins/pmos-toolkit/skills/survey-design/SKILL.md` — anywhere else and the skill silently doesn't register (lowercase-hyphenated dir name).
- A **minor** version bump in **both** `plugins/pmos-toolkit/.claude-plugin/plugin.json` and `plugins/pmos-toolkit/.codex-plugin/plugin.json`, kept byte-identical (the pre-push hook enforces sync).
- The two manifests' `description` fields stay byte-identical to each other (this skill doesn't change the plugin description).
- A README row under **### Utilities** (this is a standalone utility, not a pipeline stage).
- The `description` frontmatter carries ≥ 5 user-spoken trigger phrases; the `argument-hint` enumerates every parsed flag.
- The non-interactive block is inlined verbatim (the lint diffs the marked region against `_shared/non-interactive.md`); the findings/dispositions protocol is present in Phases 5 and 6.
- A `## /survey-design` section header in `~/.pmos/learnings.md` (idempotent — append only if missing).
- A CHANGELOG entry for the release.
- The release entry point is `/complete-dev` (not the legacy `/push`).
- No change to any `plugin.json` `skills` array — skills are auto-discovered from `plugins/pmos-toolkit/skills/`.

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
| E6 | Reviewer finds nothing | Eval files say "no issues" with the rubric shown passed; proceed to simulation without forcing edits (Phase 4). |
| E7 | Reviewer subagent fails / malformed | Surface failure; keep the committed draft; offer retry-or-proceed; non-interactive → proceed + log (Phase 4). |
| E8 | Per-question count mismatch | Re-dispatch once naming the missing ids; if still off, surface the gap + proceed without auto-apply (Phase 4). |
| E9 | User defers every finding | Record deferrals in the `## Dispositions` sections + the run summary; survey committed as-is (Phases 5–6). |
| E10 | Length can't fit budget with the questions the user insists on | Field it anyway; prominently flag expected drop-off + the overage in the summary (Phases 3, 6, 9). |
| E11 | Not in a git repo / commit fails | Write the artifacts; warn once that commits were skipped; continue (Phases 3, 5, 6, 8). |
| E12 | Unsupported export platform named | List the supported set; offer the closest match or just `survey.json` + `survey.html`; Qualtrics not offered unless implemented (Phase 8). |
| E13 | `.pmos/settings.yaml` missing | Default `docs_path = docs/pmos/`; warn once; proceed — do not run pipeline first-run setup (Phase 0). |
| E14 | Skip logic targets an earlier section | Schema invariant rejects it; rewrite the jump forward or drop it and note the change (Phase 3). |
| E15 | Phase-4 loop converges on iteration 1 | No regeneration; `## Refinement loop changelog` says "No regeneration — first review met the exit condition" (Phase 4.3). |
| E16 | Phase-4 loop hits the 2-iteration cap with a residual FAIL/blocker | Loop stops; the residual product-fit FAIL(s)/blocker(s) are carried to Phase 5 as top-of-batch "Kill or rewrite Q<id>?" decisions (Phase 4.3 step 4, Phase 5). |
| E17 | An author-supplied question still FAILs product-fit after 2 rewrites | Never auto-cut (D10); the generator does its best rewrite, flags it `kept (flag carried to Phase 5)`, and Phase 5 surfaces it as a kill candidate the *user* may kill (Phase 4.3 step 5). |
| E18 | Targeted regeneration produces an invalid `survey.json` | Re-derive once; if still invalid, revert that iteration, keep the last valid `survey.json`, note `### Iteration N — reverted` in the changelog, exit the loop early to Phase 5 (Phase 4.3, D12). |
| E19 | Reviewer returns malformed output mid-loop | Re-dispatch once naming the gaps; if still malformed, skip auto-regeneration for the run, keep the committed draft, degrade to Phase 5 (interactive: offer proceed/retry; non-interactive: proceed + log) (Phase 4.3 step 1, E7). |
| E20 | A hard-required substrate asset (`survey-preview.js` / `style.css` / `viewer.js`) is missing at copy time | ABORT with `survey-design: missing substrate asset <abs-path> — reinstall the pmos-toolkit plugin`; write no `survey.html` / `preview.html` / `index.html`; do not improvise a degraded renderer (Phases 3.6, 7). |
| E21 | A convenience substrate asset (`serve.js`; turndown trio / `html-to-md.js`) is missing at copy time | One warning `survey-design: convenience asset <path> missing — skipping <dependent feature>`; skip the dependent extra (preview server / `.md` sidecar); continue — `survey.html` / `preview.html` still produced (Phases 3.6, 7). |
| E22 | A question / fix whose only finding is a cosmetic nit (wording/title polish, no methodological or product-fit weight) | Excluded from the batched dispositions questions; surfaced in a trailing `Noted, not asked: …` line and recorded in `## Dispositions` as `noted (cosmetic, not asked)` (Phases 5, 6). |
