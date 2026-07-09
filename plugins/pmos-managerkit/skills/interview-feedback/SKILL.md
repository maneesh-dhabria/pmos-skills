---
name: interview-feedback
description: Turn a candidate's interview inputs (recording or transcript, interviewer notes, the round's scorecard and brief) into two grounded artifacts — a filled scorecard and per-interviewer effectiveness notes — where every subjective claim is tagged by evidence tier and transcript citations are verified verbatim. Use when scoring a candidate after an interview round, writing up interview feedback, filling an interview scorecard, evaluating how an interviewer ran a round, or setting up a role's interview process and round guidelines. Triggers: "score this candidate", "fill the interview scorecard", "write up interview feedback", "how did the interviewer do", "set up the interview loop for <role>".
user-invocable: true
argument-hint: "setup [role] | <candidate inputs…> (score) | list   [--root <path>] [--reference <path>] [--model <medium|base>] [--no-transcribe] [--force-transcribe] [--written-submission <path>] [--submission-type <post-live|pre-live>] [--non-interactive]"
---

# Interview feedback

Turn the raw inputs from one interview round into two grounded, self-contained HTML artifacts:

- **(a) a filled scorecard** — every dimension scored on the sheet's own scale, green/red flags ticked, qualitative notes written, and an overall hire/no-hire recommendation — with **every subjective claim carrying an evidence-tier citation**.
- **(b) interviewer-effectiveness notes** — per interviewer, scored against a bundled researched rubric: what they did well, what to improve.

Grounding is enforced, not asserted. A deterministic gate (`scripts/check-citations.mjs`) refuses any output whose transcript-tier citation is not a verbatim ≥40-char substring of the refined transcript.

**Announce at start:** "Using interview-feedback — turning this round's inputs into a grounded scorecard and interviewer notes." (In `setup`: "…— scaffolding this role's interview process." In `list`: omit; just print the table.)

This skill follows the SKILLS-standard authoring guide at `../feature-sdlc/reference/skill-patterns.md` (pmos-toolkit) — frontmatter, triggering, progressive disclosure, §H gates, §I flags, §J phases. Reference docs live in `reference/`; scripts in `scripts/`; tests in `tests/`.

## Verbs

The first token selects the verb **only** when it is exactly `setup` or `list`; everything else is candidate input for the default **score** verb.

- **`setup [role]`** — scaffold a role: compile the JD + interview process into `role/`, define the rounds, attach or generate each round's interviewer reference + scorecard. Writes `role.json` (§ role.json). → Phase [Setup](#setup).
- **`<candidate inputs…>`** (bare, the default = **score**) — evaluate one candidate in one round from whatever inputs are supplied (recording, transcript, notes, the round's scorecard + brief). → Phases [Resolve](#resolve) → [Transcribe](#transcribe) → [Ground](#ground) → [Score](#score) → [Coach](#coach).
- **`list`** (sole token) — print the roles and candidates under the storage root as a table, then exit 0. → Phase [List](#list).

## Flags & natural language

Every option also has a natural-language form — infer it from the request; an explicit flag overrides. Canonical phrasings: "store it under <path>" ≡ `--root <path>`, "use this scorecard/brief" ≡ `--reference <path>`, "don't transcribe / I already have the transcript" ≡ `--no-transcribe`, "use the base model" ≡ `--model base`, "re-transcribe / transcribe again" ≡ `--force-transcribe`, "here's the take-home / written submission" ≡ `--written-submission <path>`, "treat it as a post-live / pre-live submission" ≡ `--submission-type <post-live|pre-live>`.

Contract flags (machine-coupled, typed, or headless-determinism — §I), shown in `argument-hint`:

- `--root <path>` — storage root override (typed path; resolution order in Phase [Resolve](#resolve)).
- `--reference <path>` — explicit per-round interviewer-reference/scorecard override (§ Reference resolution).
- `--model <medium|base>` — pin the whisper model rather than auto-resolving (typed value).
- `--no-transcribe` — skip transcription; expect a transcript among the inputs (headless determinism).
- `--force-transcribe` — re-transcribe even when a curated `transcript.refined.txt` already exists; the new transcription is written to `transcript.whisper.txt` so the curated file is never clobbered (destructive-opt-in; forwarded verbatim to `scripts/transcribe.sh`, Phase [Transcribe](#transcribe)).
- `--written-submission <path>` — explicit path to the candidate's written submission (take-home, design doc, writing sample); typed path. Without it, a submission is auto-detected by filename in `inputs/` (Phase [Score](#score)).
- `--submission-type <post-live|pre-live>` — override the auto-classified submission scenario (typed value; the two scenarios drive different assessment frames in Phase [Score](#score)).
- `--non-interactive` / `--interactive` — see the non-interactive block.

<!-- nl-sugar -->
- `--candidate <name>` / `--round <id>` — parsed aliases for values normally inferred from the inputs/folder; silent.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion` tool:** every prompt below degrades to a numbered free-form question; the non-interactive auto-pick contract still applies (Recommended → AUTO-PICK).
- **No subagents:** the verified-source research in Phase [Setup](#setup) and the rubric authoring run inline; no parallel work to degrade.
- **TaskCreate / TodoWrite missing:** the skill body works without task tracking; the on-disk artifacts are the canonical progress record.
- **`ffmpeg` / `whisper-cli` missing:** Phase [Transcribe](#transcribe) degrades gracefully to interviewer-notes (tier 2) or an emitted recall questionnaire (tier 3) — it never blocks and never fabricates.
- **`.pmos/settings.yaml` missing:** storage-root resolution falls through to its built-in default (`./interviews/`); mode resolution uses the built-in default (`interactive`).

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

> **Tier-3 questionnaire is interactive-only by contract.** The score path can fall through to an *interviewer-recall questionnaire* (Phase [Ground](#ground), tier 3) when there is no transcript and no usable notes. That questionnaire is a back-and-forth that only a present interviewer can answer; under `--non-interactive` the skill **emits the blank questionnaire form to disk and refuses to fabricate answers** rather than inventing a candidate's responses. This is a scoped, per-path refusal — `setup`, `score` with a transcript or notes, and `list` all run unattended normally.
>
> <!-- non-interactive: refused; the tier-3 interviewer-recall questionnaire (score path with no transcript and no notes) requires interactive answers and must never be auto-filled — emit the blank form and stop -->

## Track Progress

This skill has multiple phases. On the `score` path, create one task per phase (Resolve → Transcribe → Ground → Score → Coach) using your agent's task-tracking tool. Mark each in-progress when you start and completed as soon as it finishes — do not batch.

## Phase 0: Setup {#setup-load}

Before the verb runs: read `~/.pmos/learnings.md` if present and factor any entries under `## /interview-feedback` into your approach (skill body wins on conflict; surface conflicts to the user before applying). Resolve `(mode, source)` per the non-interactive block and print the `mode:` line to stderr.

## Phase: Resolve {#resolve}

Resolve the **storage root** and the **inputs**.

0. **URL inputs — probe before relying on them.** When any input is a URL rather than a local path/pasted content (a recording link, a notes doc, a written submission), it must be fetched to a local file before grounding can use it. Known auth-walled hosts — `drive.google.com`, `docs.google.com`, `dropbox.com`, `notion.so`, `*.sharepoint.com`, any host behind SSO — typically 403/redirect to a login page for an unauthenticated fetch; treat a fetch that returns a login/permission page (not the artifact) as inaccessible. For any inaccessible URL, emit **exactly** this line and do not silently substitute the login page as content:

   ```
   Can't access <url> — please provide a local file path or paste the content.
   ```

   Interactive: ask the interviewer for a local path or pasted content. Under `--non-interactive`, an inaccessible URL **DEFERs** (log an open question; the affected input is treated as absent and grounding falls to the next available tier) — there is no safe default to AUTO-PICK:

   <!-- defer-only: free-form -->
   - what to substitute for an inaccessible URL is free-form (a path or pasted text only the operator has) — never guess.

1. **Root.** Precedence: `--root <path>` → `.pmos/settings.yaml :: managerkit.interview_root` → built-in default `./interviews/`. Call `scripts/storage.sh resolve-root` (it applies the same precedence and prints the absolute root). Inside a git repo, `storage.sh` installs/refreshes a **gitignore guard** so confidential candidate data is never committed; if the guard cannot be written, warn and continue (the operator is responsible — see § Confidentiality).
2. **Locate the round.** From the inputs (or `--round`/`--candidate`), resolve the round folder under the role per the storage layout (§ Storage). New candidate → `scripts/storage.sh new-candidate <role> <round> <candidate>` creates the folder and copies each raw input into `inputs/` verbatim (never mutate originals).
3. **Reference resolution.** Resolve the round's interviewer-reference + scorecard: `--reference <path>` wins; else the round-level guideline under `guidelines/<round>/`; else fall back to the role-level default. Under `--non-interactive`, if resolution is ambiguous, **DEFER** (log an open question) rather than guessing — see the non-interactive block. (Full precedence + the interviewer model lead/shadow/panel wiring live in `../_shared/interview-guidelines/reference-resolution.md`.)
4. **Candidate brief (F1 / D4).** Resolve the candidate-facing brief for the round **through the same reference-resolution mechanism above** — a brief among the round inputs, else under `guidelines/<round>/`, else the role-level default — introducing **no new input-plumbing convention** (D4): it rides the existing precedence, not a dedicated flag. Make it available to Phase Score as the submission-bucketing baseline (the neutral "structure published in the brief" bucket). If no brief resolves, record it as absent — Phase Score's fourth bucket degrades to "not published" and is **never fabricated**.

## Phase: Transcribe {#transcribe}

Only on the `score` path, and only if a recording is present and `--no-transcribe` is not set.

Run `scripts/transcribe.sh <recording> <out-dir> [--force-transcribe]`. It extracts audio with `ffmpeg` (`-vn -ar 16000 -ac 1`), resolves a whisper model (`~/whisper-models/`, `~/.pmos/managerkit/models/`, `./models`; `ggml-medium.bin` then `ggml-base.bin`; `--model` pins one), transcribes with `whisper-cli` (timestamped, chunked for long audio), and writes `transcript.refined.txt`. **Speaker attribution:** the refined transcript carries timestamps only; an LLM-refine pass may *propose provisional* speaker labels from explicit self-introductions but must never guess — unattributable per-interviewer claims fall to tier 3 and are flagged in output (b).

**Never clobber a curated transcript (preserve guard).** `transcribe.sh` picks its own output target: when `transcript.refined.txt` already exists (e.g. an operator hand-curated speaker labels) it writes the fresh machine transcription to `transcript.whisper.txt` instead and prints a `preserve:` line naming both files and whether the kept file is speaker-attributed — the curated file survives byte-identical. Forward `--force-transcribe` to re-run the transcription against an already-present recording (it still routes to `transcript.whisper.txt`, never over the curated file). Surface the script's `preserve:` line to the operator so the chosen grounding source is explicit. (Target-selection + attribution detection are unit-tested in `transcribe.sh --selftest` — §K: do not restate the rule here.)

**Graceful degrade (never fail the run).** No model / no `whisper-cli` / no `ffmpeg` → `transcribe.sh` exits non-zero with a one-line install nudge and a `degrade:tier2` (notes present) or `degrade:tier3` (no notes) signal on stdout. Honor it: drop to interviewer-notes grounding, or to the recall questionnaire (interactive-only — see the refusal note above).

## Phase: Ground {#ground}

Establish the evidence basis before scoring. Three tiers (best first):

1. **transcript** — verbatim ≥40-char quotes from the transcript. **Source selection:** when both a speaker-attributed transcript (`transcript.refined.txt`, carrying `Name:` speaker prefixes) and a timestamped-only machine transcript (`transcript.whisper.txt`, from the preserve guard) are present, ground on the **speaker-attributed** one — per-interviewer claims need attribution — and surface which file was chosen. The whisper file remains available to corroborate verbatim wording. With only the timestamped transcript, per-interviewer attribution falls to tier 3 and is flagged in output (b).
2. **interviewer-notes** — the interviewer's own written notes (must name the note source).
3. **interviewer-recalled** — answers captured via the emitted recall questionnaire (must name the interviewer).

Every subjective claim in either output carries `<cite data-cite-tier="transcript|notes|recalled" data-source="…">`. When the only available basis is tier 3 and the run is non-interactive, emit the blank questionnaire (`scripts/questionnaire.mjs` derives it from the scorecard dimensions + reference) and stop the score path with the refusal above — do not fabricate.

**Citation authoring rules (transcript tier).** A transcript-tier citation MUST be:

- **A contiguous single-speaker span (INV-4).** Quote a contiguous run of ONE speaker's utterance — never stitch text across `Name:` speaker labels into a single quote, and never append words that are not in the source. If two speakers' words belong to the point, cite them as two separate quotes, each attributed to its speaker. A stitched or padded quote is a fabricated citation and fails the grounding gate.
- **Extracted from the whitespace-normalized single-line view (F4).** The transcript has mid-utterance line breaks, but `scripts/check-citations.mjs::normalize()` collapses whitespace on *both* sides before comparing (`\s+`→single space, then trim). So before selecting the ≥40-char window, apply that same transform to the source span — collapse every run of whitespace (newlines included) to a single space and trim — then pick the quote from that single-line view. The authored quote then matches byte-for-byte what the gate sees. (Authoring discipline only — `check-citations.mjs` is unchanged; it already normalizes both sides.)

## Phase: Score {#score}

Fill the scorecard. Read the round's scorecard via its machine anchors (`../_shared/interview-guidelines/scorecard-skeleton.html` is the contract: `data-dim`, `data-weight`, `data-scale`, `data-v`, `data-input="notes:<dim>"`, `data-flags`, `data-input="reco"`). `scripts/fill-scorecard.mjs` parses the anchors → dimensions/scales/flags and produces `filled-scorecard.html`.

**Foreign scorecard (no anchors).** If the round's scorecard lacks the anchors, infer the dimensions/scales from its DOM, then: interactive → echo the inferred structure for confirmation before filling; non-interactive → fill but log every inference as an open question. Never silently guess.

**Confirm the round duration before time-sensitive scoring (F2 / INV-3 / D3).** Coverage, talk-time, and pace are scored *relative to how long the round was meant to run* — so the intended duration is the denominator for those dimensions and MUST be confirmed with the interviewer, **not** trusted from the scorecard header (a stale header field is exactly what mis-scored an on-time 90-min round as a 2× overrun). Before scoring any time-sensitive dimension, **flag any transcript-length vs. scorecard-design-length mismatch** in the output, and confirm the by-design duration.

<!-- defer-only: free-form -->
Confirm the round's intended duration via `AskUserQuestion` — the header/inferred value is the Recommended option (a confident interviewer confirms in one keystroke), but the `defer-only: free-form` tag makes this a genuine interviewer-judgement input with **no safe default**, so under `--non-interactive` it **DEFERs** (never AUTO-PICKs the stale header):

```
question: "What was this round's intended duration? Coverage/talk-time/pace are scored against it; the scorecard header may be stale."
header: "Duration"
options:
  - label: "<header/inferred> min (Recommended)"   # the scorecard-header or transcript-inferred value
    description: "Use this as the by-design duration for time-based scoring."
  - label: "Enter the correct by-design duration"
    description: "Override the header with the interviewer-confirmed round length."
```

On DEFER (non-interactive): log an open question, surface the transcript-vs-header mismatch, and score the affected dimensions against the flagged (unconfirmed) value while marking them provisional. The confirmed value is the denominator for coverage/talk-time/pace.

Score each dimension on its own scale with grounded notes + flags, then set the overall `reco`.

**Written submission (take-home / design doc / writing sample).** A round may include a candidate-authored written artifact alongside the live conversation. Detect it: `--written-submission <path>` wins; else auto-detect a submission file in `inputs/` (filename predicate — `*submission*`, `*take-home*`/`*takehome*`, `*design-doc*`, `*writing-sample*`, or an obvious doc among the inputs that is neither the recording, transcript, nor interviewer notes). When one is present:

1. **Classify the scenario once.** The two scenarios assess *different things* and must never be conflated:
   - **post-live** — the candidate produced the artifact *during/around* a live round; the live conversation is the primary signal and the submission is assessed across four buckets: **structure published in the brief**, what was **discussed**, what was **interviewer-directed**, and what was **independent** — a submission that only restates the live discussion is WEAK, not strong.

     **Read the candidate brief first (F1 / INV-2).** Before bucketing, read the candidate-facing brief (resolved in Phase Resolve). Structure, phases, focus areas, success-metrics, or risk framing that the **brief itself published** is the **expected baseline** — attribute it to the neutral fourth bucket "structure published in the brief". Brief-published structure is NEVER read back as interviewer-seeded ("assigned homework") and NEVER penalized as unoriginal — filling in the brief's own scaffold is exactly what was asked. Only structure that is *not* in the brief is a candidate/interviewer contribution to be sorted into discussed / interviewer-directed / independent. If no brief was resolved, the fourth bucket degrades to "not published" (never fabricated).
   - **pre-live** — the candidate submitted the artifact *before* any live round (e.g. a screening take-home); assess its **intrinsic quality** and the candidate's **live defense** of it.

   `--submission-type <post-live|pre-live>` pins it. Otherwise infer from the timeline in the inputs and confirm (the inferred scenario is the Recommended option, so a non-interactive run AUTO-PICKs it rather than deferring — classification is always resolvable from the inputs' timeline):

   ```
   AskUserQuestion:
     question: "Is this written submission post-live (produced during/around the live round) or pre-live (submitted before any live round)?"
     header: "Submission"
     options:
       - label: "<inferred> (Recommended)"   # the scenario inferred from the inputs' timeline
         description: "<one line on why the inputs point to this scenario>"
       - label: "<the other scenario>"
         description: "<one line on what that would imply>"
   ```

   An explicit `--submission-type` skips this ask entirely.

2. **Assess it in context, in its own block.** `fill-scorecard.mjs` injects a `data-card="submission-assessment"` block (scenario-stamped) ahead of the recommendation when a submission is passed — post-live → published-in-brief (neutral baseline) / discussed / interviewer-directed / independent + live-context note; pre-live → intrinsic quality + live defense. Quotes from the submission carry `data-cite-tier="submission"`.
3. **Reference it in the recommendation.** The `reco` must account for the submission assessment (a `data-submission-ref` note ties them) — a submission that is assessed but not reflected in the hire/no-hire call is an incomplete run.

**Submission checklist gate** (run when a submission is present; every box must be ticked):
- present? — the submission file was located (flag or auto-detect).
- classified? — scenario resolved to exactly one of `post-live` / `pre-live`.
- assessed in context? — the `submission-assessment` block exists and uses the scenario-appropriate frame.
- referenced in reco? — the recommendation cites the submission assessment.

**Grounding hard gate (blocking STOP-before-done, INV-1).** Run `scripts/check-citations.mjs filled-scorecard.html transcript.refined.txt` — appending the submission file as a **third positional** when one is present (`… transcript.refined.txt <submission-path>`) so `data-cite-tier="submission"` quotes are verified verbatim too. Any transcript- or submission-tier citation that is not a verbatim ≥40-char substring of its source fails the run.

This gate is a **hard STOP, not an assertion**: `filled-scorecard.html` is NOT presented as complete — and the run does NOT declare done — until `check-citations.mjs` **exits 0** over it.

- **Non-zero exit:** report the failing citations verbatim to the operator, repair each (re-extract the quote as a contiguous single-speaker span from the normalized single-line view per Phase Ground's citation authoring rules, or drop the claim to a lower tier), then **re-run the gate**. Never present the artifact or move to Coach while the gate is non-zero; a non-passing gate blocks completion regardless of run mode.
- **Passing exit (exit 0):** only then surface the script's `✓ citations:` line to the operator and append the one-line audit comment to `filled-scorecard.html`. The audit comment is written **only on a passing gate** — it is the proof-of-pass, never an assertion written ahead of the check:

```
<!-- citations verified: <N> transcript-tier, <M> notes-tier[, <K> submission-tier], <YYYY-MM-DD> -->
```

(Counts come from the script's per-tier output — §K: the script owns the counting; do not recompute by hand. The submission-tier clause appears only when K > 0.)

## Phase: Coach {#coach}

Emit **interviewer-effectiveness notes** (output b), one section per interviewer, scored against `../_shared/interview-guidelines/interviewer-effectiveness.html` (the bundled researched rubric — structured/consistent questioning, probing depth, leading-question avoidance, talk-time balance, coverage, bias mitigation, note quality, calibration). Each interviewer's lead/shadow/panel role (from `role.json`) sets expectations. Subjective claims carry the same `data-cite-tier`; per-interviewer claims that could not be attributed are flagged with attribution-confidence. Re-run `check-citations.mjs` over this output too — the **same blocking STOP-before-done gate applies (INV-1)**: the effectiveness notes are not presented as complete until the gate exits 0 over them; on a non-zero exit, repair the failing citations and re-run before declaring done.

## Phase: Setup {#setup}

Scaffold a role's interview process. Compile the JD + process into `role/00_jd-and-process.html`; define the rounds (each an archetype from the 7 bundled PM round types or `custom`); for each round, attach the provided interviewer-reference + scorecard or generate them by instantiating `../_shared/interview-guidelines/reference-skeleton.html` + `../_shared/interview-guidelines/scorecard-skeleton.html`. Write `role.json` (§ role.json). `setup` runs unattended under `--non-interactive` (round/archetype choices AUTO-PICK their Recommended option; genuinely missing inputs DEFER).

## Phase: List {#list}

Walk the storage root; print one table — `Role | Round | Candidate | Scored?` — ordered by role then candidate. Empty root → `No roles yet. Scaffold one with /interview-feedback setup <role>.` Exit 0.

## role.json {#role-json}

`scripts/storage.sh` reads/writes the canonical role manifest (design §16.5):

```json
{
  "role": "Senior Product Manager",
  "team": "Marketplace",
  "date": "2026-06-17",
  "rounds": [
    {
      "id": "product-sense",
      "name": "Product sense / design",
      "archetype": "product-sense",
      "guidelines_path": "guidelines/product-sense/",
      "additional_docs": [],
      "interviewers": [{ "name": "…", "role": "lead" }]
    }
  ]
}
```

`archetype ∈` {`recruiter-screen`, `product-sense`, `analytical`, `technical`, `behavioral`, `case-study`, `case-presentation`} (the 7 bundled PM round types) `| custom`. `interviewers[].role ∈` {`lead`, `shadow`, `panel`}.

## Storage {#storage}

```
<root>/<date>-<role-kebab>-<team>/
  role/{ 00_jd-and-process.html, role.json }
  guidelines/<round>/{ interviewer-reference.html, scorecard.html, additional/ }
  <date>-<round>-<candidate>-<lastco>/
    inputs/                 (raw inputs, copied verbatim — never mutated)
    transcript.refined.txt
    filled-scorecard.html   (output a)
    interviewer-notes.html  (output b)
```

## Phase N: Capture Learnings {#capture-learnings}

After a run, if you discovered something reusable — a transcription gotcha, a foreign-scorecard inference pattern, a grounding-tier judgment call — append it under `## /interview-feedback` in `~/.pmos/learnings.md` (create the file if absent). Keep entries one or two lines; never record candidate content (it is confidential — see § Confidentiality).

## Confidentiality {#confidentiality}

Candidate data is confidential. The storage root carries a gitignore guard installed by `scripts/storage.sh`; the skill never commits candidate content and never sends it to an external service. Transcription is fully local (`ffmpeg` + `whisper.cpp`). Out of scope (design §15): no comments/overlay substrate, no multi-candidate comparison, no ATS integration, no markdown companion — the HTML artifacts are self-contained and standalone.
