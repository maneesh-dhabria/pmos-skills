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

Grounding is enforced, not asserted. A deterministic gate (`scripts/check-citations.mjs`) refuses any output whose transcript-tier citation is not a verbatim ≥40-char substring of the refined transcript. Completeness is enforced the same way: `scripts/check-completeness.mjs` refuses to let either artifact be declared complete while a promised section is still empty (`#completeness-gate`).

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

**Work-history round (per-role evidence + trajectory).** When the round's scorecard carries the `data-card="role-evidence"` / `data-card="trajectory-synthesis"` families (the `work-history` archetype), `fill-scorecard.mjs` runs an additional **presence-guarded pass** on top of the competency `data-dim` pass: for each `role-evidence` block it fills the six `data-input="role:<slot>"` slots (company/title/tenure/scope/contribution/result), marks the `data-field="result-measured"` verdict (`yes`/`unclear`/`no`), and appends per-role green/red flags; for the single `trajectory-synthesis` block it fills the three `data-input="trajectory:<slot>"` slots (scope-arc/patterns/level-fit) and marks the `data-field="level-verdict"` (`below`/`at`/`above`). `level-verdict` **feeds** the overall `reco` but is scored as its own input, not derived from it (design D9). Pass these via the `values.json`'s `roles: [{role, company, …, measured, flags}]` and `trajectory: {scopeArc, patterns, levelFit, verdict}` keys. The pass is inert (byte-identical output) on any scorecard lacking those families, so the other seven archetypes are unaffected. Every subjective per-role/trajectory note carries the same `<cite data-cite-tier=…>` grounding the competency notes do.

**Foreign scorecard (no anchors).** If the round's scorecard lacks the anchors, infer the dimensions/scales from its DOM, then: interactive → echo the inferred structure for confirmation before filling; non-interactive → fill but log every inference as an open question. Never silently guess.

**Confirm the round duration before time-sensitive scoring (F2 / INV-3 / D3).** Coverage, talk-time, and pace are scored *relative to how long the round was meant to run* — so the intended duration is the denominator for those dimensions and MUST be confirmed with the interviewer, never silently trusted (a stale header field is exactly what mis-scored an on-time 90-min round as a 2× overrun — epic 260707-rbc). **Read the by-design duration where the round's scorecard now provides it:** the `data-card="scorecard"` element may carry a root `data-duration="<int>"` anchor, written at authoring time by `/interview-guide` (story 260709-qfn). When present, that anchor — not a stale header or a transcript-inferred guess — is the **proposed** value: a better-informed proposal, **not** an authority, so the interviewer still confirms it (INV-3). When absent, fall back to the header/inferred proposal exactly as before, with no new behavior (INV-5). Before scoring any time-sensitive dimension, **flag any transcript-length vs. by-design-length mismatch** in the output, and confirm the by-design duration.

<!-- defer-only: free-form -->
Confirm the round's intended duration via `AskUserQuestion` — the **proposed** value (the `data-duration` anchor when the scorecard carries one, else the header/inferred value) is the Recommended option (a confident interviewer confirms in one keystroke), but the `defer-only: free-form` tag makes this a genuine interviewer-judgement input with **no safe default**, so under `--non-interactive` it **DEFERs** (never AUTO-PICKs the proposal — the anchor informs, it never authorises):

```
question: "What was this round's intended duration? Coverage/talk-time/pace are scored against it; the scorecard's by-design anchor (or header) may still need confirming."
header: "Duration"
options:
  - label: "<proposed> min (Recommended)"   # the data-duration anchor when present, else the header/transcript-inferred value
    description: "Use this as the by-design duration for time-based scoring."
  - label: "Enter the correct by-design duration"
    description: "Override the proposal with the interviewer-confirmed round length."
```

On DEFER (non-interactive): log an open question, surface the transcript-vs-by-design mismatch, and score the affected dimensions against the flagged (unconfirmed) proposal — the `data-duration` anchor when present, else the header/inferred value — while marking them provisional. **When the interviewer confirms a value that disagrees with the `data-duration` anchor, the confirmed answer wins** and the existing mismatch flag records the disagreement — the anchor is never authority (INV-3). The confirmed value is the denominator for coverage/talk-time/pace.

**Ground per-dimension coverage on the authored budget where present (D8, A3).** Each `data-dim` section of the round's scorecard may carry a `data-budget="<int>"` anchor — the minutes `/interview-guide` authored for that dimension. Where a dimension carries `data-budget`, score its **coverage against that per-dimension budget**, not against the round total: a dimension the guide budgeted 10 minutes for is not under-covered for taking 10 minutes of a 90-minute round. Where `data-budget` is absent on some or all dimensions, fall back to the round-total behavior for those dimensions — partial anchoring is valid. Do **not** total the budgets by hand (§H): `/interview-guide`'s `validate-scorecard-anchors.mjs` already gated the per-dim sum ≤ `data-duration` at authoring time; read each dimension's own anchor and score against it.

### The scoring method (D2) {#scoring-method}

Score each dimension on its own scale with grounded notes + flags, then set the overall `reco` — in **this order**, by **this method**. The four clauses are not advisory: each one closes a defect that shipped a wrong recommendation on real evidence, and three of them are enforced by the calibration gate below.

**(a) Reading order — sweep the whole transcript, then score.** For each dimension, sweep the **entire** transcript and collect **every** instance before assigning any number: early and late, prompted and unprompted, each with its timestamp. Record them in that dimension's `<details data-card="evidence-sweep">` block (`fill-scorecard.mjs` renders it collapsed, under the notes). **Every swept instance carries a `<cite data-cite-tier="transcript">`** (or `"submission"` for one drawn from a written artifact) — a timestamp alone can be invented, so the gate rejects an instance without one and `check-citations.mjs` then verifies the quote verbatim. The `notes` and `recalled` tiers are **not** accepted here: they are exempt from that verbatim check, so a sweep grounded on them is satisfiable without reading the transcript. A swept instance is a moment *in the transcript*; cite it as one. **Tier-2 exception:** in a round with **no transcript at all** — graded from interviewer notes per Phase [Ground](#ground) — no transcript-tier citation can exist, so the gate accepts `notes` when the run **declares** the downgrade (see the [calibration gate](#score) below). `recalled` is never accepted at either setting. Only once the sweep is complete does a score get chosen. **Do not score linearly while reading** — an eventual insight cannot be credited if it has not been collected yet, and scoring the first probed answer is exactly how a candidate who got there on the second probe gets marked down for it.

**(b) Quote the bar — score against the sheet's own wording, not your own.** Read the dimension's `data-level` descriptors from the resolved scorecard and **quote the descriptor of the level under consideration verbatim** in the note, then score against *that* wording. The bar is per-dimension. "Unprompted", "up front", "led with it", "without being asked" belong to the **top** level — they may **not** be borrowed down to the pass line, which permits prompting. The rules governing the attribute live in `../_shared/interview-guidelines/scorecard-skeleton.html`'s `data-level` contract comment — cite it; do not restate it. A sheet whose dimensions carry **no** descriptors does not get scored uncalibrated: it routes to [rubric materialization](#rubric-materialization) first (INV-1).

**(c) Floor/ceiling split — prompting caps, it never zeroes.** Two separate questions:
- *"Did they demonstrate it at all, at any point?"* — this sets the **floor**.
- *"How much nudging did it take?"* — this caps the **ceiling**: heavy or repeated prompting → 2; one pointed nudge → 3; none → 4.

  A genuine demonstration that needed a probe is a **capped** score, never a zeroed one. Collapsing these two questions into one is the bar-inflation defect.

**(d) Untested ≠ failed.** A competency the round never probed is **tagged** `data-untested`, not scored below bar. An untested dimension leaves the weighted-score denominator entirely and the remaining weights renormalize — the gate does that arithmetic and reports untested-weight-% as a coverage figure (D7). Never invent a score for evidence that does not exist, and never score an untested dimension "neutral" (INV-4, calibration design).

**Record the note-vs-score reading as you write the note (D10).** For each dimension set `data-note-matches-level="<n>"` — the level whose descriptor your **prose actually describes**. This is your judgement; the **comparison is the script's**. When it differs from the score you assigned, that is a legitimate outcome (a red flag can drag a number below what the prose alone implies) and the gate asks only for a non-empty `data-score-rationale` naming why. Do **not** rewrite the note to match the number — the whole point of the anchor is to make that gap visible.

Every below-bar score additionally carries a non-empty `data-rebuttal`: **the strongest case that this dimension is actually at bar.** Write it before you settle the score, not to justify one already chosen.

**No arithmetic here.** Modal score, weighted score, renormalized weights, untested-weight-%, and the reco band are all computed by `scripts/check-scoring-calibration.mjs`. Read its numbers; never compute, average, total, or weight anything by hand (§H, INV-2 calibration design).

### Rubric materialization — a dimension with no bar (D8) {#rubric-materialization}

**The trigger is per-dimension, not per-sheet.** Any dimension whose scale carries **no** `data-level` descriptors — whether that is every dimension on the sheet or one of twelve — **is not scored uncalibrated.** That degrade path is **retired**: scoring against a bar that exists only in the scorer's head *is* the bar-inflation defect (INV-1, calibration design).

Partial anchoring is legal *across* dimensions and refused *within* one (the `data-level` contract's all-or-none rule, enforced by `validate-scorecard-anchors.mjs`), so a **mixed sheet is the expected state** while the corpus is backfilled: the anchored dimensions take the `authored` path and quote their own wording, and the un-anchored ones run the three steps below. Reading the trigger as sheet-level is the hole this invariant closes — on a mixed sheet a sheet-level test never fires and the un-anchored dimensions get scored against nothing. **No gate catches this**: no script reads `data-level` on the scoring side, so this rule is the only thing standing between a half-backfilled sheet and an uncalibrated score. Materialize the bar for each such dimension first:

1. **Derive** descriptors for every option of each un-anchored dimension from the round's own materials — the interviewer reference's strong/weak signals and its `.calib` line, the archetype corpus, and the seniority. Follow the `data-level` contract in `../_shared/interview-guidelines/scorecard-skeleton.html` (behavioural, all-or-none per dimension, non-empty, ceiling language reserved for the top level) — cite it; do not restate it.
2. **Write them into the sheet** as real `data-level` anchors. This is what makes the fix persistent rather than per-run: the sheet becomes self-describing and the **next** run against it inherits the same bar and takes the `authored` path.
3. **Present them for agreement — blocking.** No dimension is scored against an unagreed bar:

   ```
   AskUserQuestion:
     question: "<N> of this round's dimensions carry no level descriptors, so there is no bar to score them against. I derived one per un-anchored dimension from the interviewer reference and the archetype. Use it?"
     header: "Rubric"
     options:
       - label: "Use the derived rubric (Recommended)"
         description: "Writes the descriptors into the sheet and scores against them; the next run inherits the same bar."
       - label: "Edit it first"
         description: "Review the derived descriptors dimension by dimension before anything is scored."
   ```

   Ask **once for the whole sheet**, listing the un-anchored dimensions by name — not once per dimension. On a mixed sheet the already-anchored dimensions are not in scope for this question; their bar is already agreed by whoever authored it.

   Under `--non-interactive` this **AUTO-PICKs** the derived rubric (it carries a Recommended option and is deliberately **not** `defer-only`-tagged). That is an explicit maintainer override of the safer defer-and-mark-provisional shape, trading a guarantee for unattended throughput; the residual risk — a headless run scoring against a bar no human ever saw — is accepted and named in the design's Accepted risks.

4. **Stamp `data-rubric-provenance` unconditionally, on every path including failures** — `authored` (the sheet already carried descriptors), `synthesized-agreed` (derived and human-agreed), `synthesized-auto` (derived and AUTO-PICKed headless). The stamp is the **only** mitigation for the accepted risk above, so it is never skipped and never guessed: a reader must always be able to tell whose bar was scored against. **On a mixed sheet the stamp is weakest-link, not majority:** if *any* dimension was synthesized this run, the sheet stamps `synthesized-agreed` / `synthesized-auto` — `authored` is reserved for a sheet where every dimension arrived anchored. A reader must never infer from `authored` that a bar they never saw was in play.

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

**Grounding hard gate (blocking STOP-before-done, INV-1).** Run `scripts/check-citations.mjs --stamp filled-scorecard.html transcript.refined.txt` — appending the submission file as a **third positional** when one is present (`… transcript.refined.txt <submission-path>`) so `data-cite-tier="submission"` quotes are verified verbatim too. Any transcript- or submission-tier citation that is not a verbatim ≥40-char substring of its source fails the run.

This gate is a **hard STOP, not an assertion**: `filled-scorecard.html` is NOT presented as complete — and the run does NOT declare done — until `check-citations.mjs` **exits 0** over it.

- **Non-zero exit:** report the failing citations verbatim to the operator, repair each (re-extract the quote as a contiguous single-speaker span from the normalized single-line view per Phase Ground's citation authoring rules, or drop the claim to a lower tier), then **re-run the gate**. Never present the artifact or move to Coach while the gate is non-zero; a non-passing gate blocks completion regardless of run mode.
- **Passing exit (exit 0):** only then surface the script's `✓ citations:` line to the operator. `--stamp` makes the **script** write the one-line proof-of-pass comment into `filled-scorecard.html` — inside its own exit-0 branch, replacing any prior comment in place. §K: the script computes the counts *and* writes them, so no model and no human ever transcribes a number that can drift. Never author or edit that comment by hand.

Then run the completeness gate (`#completeness-gate`) over `filled-scorecard.html` and apply its disposition. `filled-scorecard.html` is presented as complete only when **both** gates have been satisfied.

### Completeness gate (blocking STOP-before-done, INV-4, calibration design) {#completeness-gate}

Canonical for **both** artifacts — Phase Score runs it over `filled-scorecard.html`, Phase Coach over `interviewer-notes.html`. It runs **before** either artifact is declared complete, after the citation gate.

Run `scripts/check-completeness.mjs <artifact.html>`. It flags unfilled promised content — bracketed ghost text, empty `data-input` slots, un-substituted `{{…}}` tokens — deliberately narrowly, so that ordinary prose and an artifact's unused optional blocks are not flagged: a false "draft" on a complete artifact is its own credibility failure. The exact detection rules live in the script's header comment and nowhere else (§K); do not restate or second-guess them here.

**Exit 0** — nothing unfilled; proceed. **Exit 1** — the artifact is NOT presented as complete and the run does NOT declare done until one of these two dispositions has been applied:

Interactive only — under `--non-interactive` this prompt is **not issued**: there is no operator to capture from, so the run goes straight to the stamp disposition below.

```
AskUserQuestion:
  question: "<slot> is still empty. Capture it now?"
  header: "Unfilled"
  options:
    - label: "Capture it now (Recommended)"
      description: "You dictate the content for <slot>; it goes into the artifact and the gate re-runs."
    - label: "Ship as draft"
      description: "The artifact is stamped `draft — pending <slot>` and presented as a draft, not as complete."
```

- **Captured** — write what the operator supplies into the named slot, then **re-run the gate**.
- **Declined, or `--non-interactive`** — run `scripts/check-completeness.mjs --stamp-draft <artifact.html>`; the script stamps `draft — pending <slot>` naming the specific unfilled slots, and the artifact is presented as a **draft**, never as complete.

**Never fabricate the missing content.** There is no "write it for them" path: the observer's independent read is theirs. The gate captures or it stamps — an empty promised section reads as *"nothing to say"*, which is the opposite of the truth, and inventing a read would be worse than either.

**Calibration hard gate (the second blocking STOP-before-done gate, D3).** The citation gate proves a quote is *real*. It does not prove the score *follows from* that evidence at the sheet's own bar — that surface is what mis-scored a round twice on unchanged evidence. So run **both**:

```
node scripts/check-scoring-calibration.mjs filled-scorecard.html
```

It enforces the four gates on the anchors [the scoring method](#scoring-method) emits — evidence-sweep presence, below-bar rebuttal presence, the note-vs-score integer comparison, and the reco-vs-computed-band/coverage check — and it is the **sole source** of the modal score, the weighted score, the renormalized untested arithmetic, and the untested-weight-% (§H, INV-2).

Ahead of those four it asserts the arithmetic's precondition: **every dimension resolves to exactly one of scored or `data-untested`** — never both, and never neither. A dimension left as neither is the *forgotten* one, and its weight would otherwise leave both totals at once, shrinking the denominator and inflating the result — the defect class the untested rule (clause **(d)**) exists to close.

This gate has exactly the same status as the citation gate: **a hard STOP, not an assertion.** `filled-scorecard.html` is NOT presented as complete — and the run does NOT declare done — until it **exits 0**.

- **Non-zero exit:** the message names the dimension and what is missing. Fix that dimension (complete its sweep, write the rebuttal, correct or defend the note-vs-score gap, defend the reco), then **re-run the gate**. Never present the artifact or move to Coach while either gate is non-zero, in any run mode.
- **Passing exit (exit 0):** surface the script's `✓ calibration:` line alongside the `✓ citations:` line.

The two gates are independent and both must pass; the calibration gate **does not replace** the citation gate and does not touch what it verifies (INV-3, calibration design).

**Tier-2 rounds (no transcript) run a different pair.** A round graded from interviewer notes has no transcript file, and the citation gate takes one as a required positional — so the documented invocation above cannot run. **Do not hand it a placeholder or an unrelated file to get past that.** `check-citations.mjs` never reads the transcript argument for a `notes`-tier citation, so any file at all would produce a green `✓ citations:` line: a pass bought with a dummy, which is the exact ritual shape these gates exist to refuse. Instead:

```
node scripts/check-scoring-calibration.mjs filled-scorecard.html --no-transcript
```

`--no-transcript` is a **declaration about the round**, not a convenience: it is **refused (exit 2)** when a transcript is found in or above the scorecard's directory, and it makes the calibration gate take over the two checks the citation gate would still have been making — no `transcript`-tier citation may appear anywhere (in a round with no transcript, one is a lie by construction), and every `<cite>` must name a non-empty `data-source`. The refusal is deliberately **eager**: it matches any filename *containing* `transcript` with a `.txt/.md/.vtt/.srt/.json` extension, case-insensitively, searching the scorecard's directory and up to three levels above it — because a false refusal costs the operator seconds while a missed transcript is silent. If it fires on a file that is genuinely not this round's transcript, move that file out of the round folder rather than working around the gate.

**A transcript-less round that still has a written submission** grounds on `submission`-tier quotes, which *are* verifiable — a submission's existence has nothing to do with whether the live portion was recorded. Run both gates, passing the submission file in **both** positional slots:

```
node scripts/check-citations.mjs filled-scorecard.html <submission-path> <submission-path>
node scripts/check-scoring-calibration.mjs filled-scorecard.html --no-transcript
```

This is not the placeholder trick above — every check that runs is a real one. The second positional is the transcript source, and it goes unread precisely because the calibration gate has already made a `transcript`-tier citation impossible on this path; the third is what verifies the `submission`-tier quotes verbatim. Skip the citation gate **only** when the round has neither a transcript nor a submission, i.e. when there is genuinely nothing for it to verify.

**What a green pair does not prove (named residuals, not silent ones).** Between them the gates prove each cited quote is *real* and each number is *defended*. Three things they do not prove:

- **Completeness** — that the sweep found every instance rather than the first one. A presence check cannot tell one representative instance from the only one you looked at.
- **Relevance** — that a quote supports the claim built on it. A genuine transcript span can sit under invented interpretive prose. (A lexical-overlap floor between quote and note was considered and **rejected**: good notes paraphrase, so it would fail honest analytical prose while passing keyword-padded fabrication, and it would pressure the author to copy transcript words into the note — the same rewrite-to-match pathology clause **(d)**'s note-vs-score anchor exists to refuse.)
- **That the gate saw the real round** — the tier-2 declaration is corroborated against the filesystem around the scorecard, eagerly (any filename containing `transcript`, three levels up), so a false declaration fails loudly on the documented layout and on the near misses. But the veto can only read where it is pointed: a caller who puts the sheet somewhere no transcript is reachable, and declares the downgrade, defeats it. No gate that reads only the files it is handed can defend against a caller who chooses what to hand it.

The first two are judgement, not arithmetic, so per §H they stay with the method above and with the reviewer; the third is the operator's sight of the round folder. A passing gate is a floor, never a sign-off.

## Phase: Coach {#coach}

**The same reading-order discipline applies here — as method, not as machinery (D11).** Output (b) makes below-bar claims about *interviewers* from the same transcript, so it carries the same two biases Phase Score's method exists to correct:

- **Sweep, then conclude.** Collect every relevant instance across the **whole** transcript for an interviewer before writing any below-bar conclusion about them. A question they eventually asked cannot be counted against them as unasked.
- **Adversarial pass.** For each below-bar claim, answer *"what is the strongest case this was actually fine?"* before you write the claim down.

`interviewer-notes-skeleton.html` carries **no** scoring anchors — no `data-dim`, no `data-v`, no `data-selected` — so `check-scoring-calibration.mjs` structurally cannot run against output (b), and it is **not** invoked here. Do **not** add scoring anchors to (b) to create something to check: giving (b) its own scoring surface is deliberately deferred. Fix the bias everywhere; add machinery only where there is something to check.

Emit **interviewer-effectiveness notes** (output b), one section per interviewer, scored against `../_shared/interview-guidelines/interviewer-effectiveness.html` (the bundled researched rubric — structured/consistent questioning, probing depth, leading-question avoidance, talk-time balance, coverage, bias mitigation, note quality, calibration). Each interviewer's lead/shadow/panel role (from `role.json`) sets expectations. Subjective claims carry the same `data-cite-tier`; per-interviewer claims that could not be attributed are flagged with attribution-confidence. Re-run `check-citations.mjs --stamp interviewer-notes.html transcript.refined.txt` over this output too — the **same blocking STOP-before-done gate applies (INV-1)**: the effectiveness notes are not presented as complete until the gate exits 0 over them; on a non-zero exit, repair the failing citations and re-run before declaring done. The proof-of-pass comment is the script's to write here as well. Then run the completeness gate (`#completeness-gate`) over `interviewer-notes.html` — the observer's independent read is exactly the block that has shipped empty before — and apply its disposition before declaring done.

**Tier-2 rounds (no transcript) here too.** The invocation above takes a transcript as a required positional, so on a notes-graded round it cannot run — and the tier-2 escape hatch Phase [Score](#score) uses (`check-scoring-calibration.mjs --no-transcript`) is unavailable to output (b), which has no scoring anchors to check. **Do not hand the citation gate a placeholder** to manufacture a green line; the reasoning is identical to Phase [Score](#score)'s. Instead:

- **No transcript, but a written submission exists** → run it exactly as Phase [Score](#score) does, submission in both positional slots: `node scripts/check-citations.mjs --stamp interviewer-notes.html <submission-path> <submission-path>`.
- **Neither transcript nor submission** → there is genuinely nothing verbatim to verify, so skip the citation gate and say so in the run summary rather than implying it passed. The one check that still has teeth is deterministic, so run it in the gate's place: `grep -c 'data-cite-tier="transcript"' interviewer-notes.html` must return **0** — in a round with no transcript a `transcript`-tier citation is a lie by construction, and this is the assertion `--no-transcript` would have made for you on output (a).

The completeness gate reads only the artifact, so it runs unchanged on every tier. Both gates exit **2** with the offending path when an input is unreadable — that is an argument to fix, never a reason to route around the gate.

## Phase: Setup {#setup}

Scaffold a role's interview process. Compile the JD + process into `role/00_jd-and-process.html`; define the rounds (each an archetype from the 8 bundled PM round types or `custom`); for each round, attach the provided interviewer-reference + scorecard or generate them by instantiating `../_shared/interview-guidelines/reference-skeleton.html` + `../_shared/interview-guidelines/scorecard-skeleton.html`. Write `role.json` (§ role.json). `setup` runs unattended under `--non-interactive` (round/archetype choices AUTO-PICK their Recommended option; genuinely missing inputs DEFER).

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

`archetype ∈` {`recruiter-screen`, `product-sense`, `analytical`, `technical`, `behavioral`, `case-study`, `case-presentation`, `work-history`} (the 8 bundled PM round types) `| custom`. `interviewers[].role ∈` {`lead`, `shadow`, `panel`}.

`work-history` is the **non-case** archetype (a chronological Topgrading-style deep-dive, `guidelines_path: guidelines/work-history/`): its bundled scorecard adds the per-role `data-card="role-evidence"` blocks and the single `data-card="trajectory-synthesis"` block on top of the usual competency `data-dim` sections. `fill-scorecard.mjs` fills those extra families with a presence-guarded pass (Phase: Score `{#score}`), so the same scoring flow covers it end-to-end.

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
