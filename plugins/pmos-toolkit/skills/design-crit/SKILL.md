---
name: design-crit
description: Critique an existing application, wireframes, or prototype on overall user experience — identifies journeys, captures flow screenshots via packaged Playwright script, evaluates against a Nielsen + WCAG 2.2 + visual-hierarchy + Gestalt + journey-friction rubric, then runs a PSYCH/MSF pass and synthesises prioritized UX recommendations. Standalone utility — does not require the requirements→spec→plan pipeline. Use when the user says "critique this UI", "design review", "audit this app", "UX review", "review the wireframes", "evaluate this prototype", "what's wrong with this UX", or provides a URL/HTML files and asks for a design crit.
user-invocable: true
argument-hint: "<URL or path-to-wireframes-folder or path-to-prototype-folder> [--feature <slug>] [--journeys <id1,id2>] [--storage-state <path>] [--out <dir>] [--format <html|md|both>] [--depth shallow|standard|deep] [--non-interactive | --interactive]"
---

# Design Crit

Critique an existing user experience — application, wireframes, or prototype — and produce a concise, prioritized UX recommendations report.

The skill is **standalone**. It works on three source types:

1. **Live application URL** (with optional auth via Playwright `storageState` or basic-auth)
2. **Wireframes folder** (HTML files produced by `/wireframes` or hand-authored)
3. **Prototype folder** (HTML files produced by `/prototype` or any single-file React prototype)

It captures screenshots, applies a hybrid rubric (`reference/eval.md`), runs a lightweight PSYCH + MSF pass on captured journeys, and writes a single recommendations report.

```
                          (standalone utility — runs independently of the pipeline)
/requirements → [/wireframes] → [/prototype] → /spec → /plan → /execute → /verify
                                              ↑
                                         /design-crit  ← can review any of these artifacts or a live app
```

**Announce at start:** "Using design-crit to evaluate the source, capture flow screenshots, and produce a UX recommendations report."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No interactive prompt tool:** State your assumption (default = critique top 3 inferred journeys), document it in the report, and proceed. Findings dispositions fall back to a numbered table the user reviews after. Depth defaults to `standard` (cap=12 high+medium findings) unless `--depth` was explicitly set on CLI.
- **No subagents:** Run the heuristic eval, PSYCH pass, and friction pass sequentially in the main agent rather than dispatching parallel reviewers.
- **No Playwright:** If `playwright` is missing on the host (`assets/capture.mjs` exits with code 3), instruct the user to install via `npm i -g playwright && npx playwright install chromium`, then resume. If install isn't possible, ask the user to take screenshots manually and place them in the screenshots folder; proceed with eval-only mode and label the report accordingly.

## Track Progress

This skill has multiple phases. Create one task per phase using your agent's task-tracking tool (e.g., `TaskCreate` in Claude Code, `TodoWrite` in older harnesses, equivalent elsewhere). Mark each task in-progress when you start it and completed as soon as it finishes — do not batch completions.

## Load Learnings

Read `~/.pmos/learnings.md` if it exists. Note any entries under `## /design-crit` and factor them into your approach for this session.

---

## Phase 0: Load workstream context (optional)

If the user has linked a workstream for this repo via `/product-context`, load it. Specifically resolve `docs_path` — the report will be written to `{docs_path}/{YYYY-MM-DD}_{feature_slug}/design-crit/`.

Fallback when no workstream is linked: write to `./docs/{YYYY-MM-DD}_{feature_slug}/design-crit/` in the current repo root. If the user passed `--out <path>`, honour that and skip workstream resolution.

<!-- defer-only: ambiguous -->
If `--feature <slug>` is not provided, propose a slug from the source (URL hostname or folder name) and confirm with the user via `AskUserQuestion`.

### Phase 0 addendum: output_format resolution (FR-12)

**Resolve `output_format`.** Read `output_format` from `.pmos/settings.yaml` (default: `html`; valid values: `html`, `md`, `both`). A `--format <html|md|both>` argument-string flag overrides settings (last flag wins on conflict, per FR-12). Print to stderr exactly: `output_format: <value> (source: <cli|settings|default>)` once at Phase 0 entry. Controls the format of all four artifacts written under `{out_dir}/`: `source.{ext}`, `journeys.{ext}`, `psych-msf.{ext}`, and the main `design-crit.{ext}` recommendations report. The `eval-findings-review.md` platform-fallback artifact (Phase 4) is read-back-and-edited by the user, so it stays MD regardless of `output_format`.

### Phase 0 addendum: depth resolution (FR-DC-DEPTH-01..03)

**Resolve `depth` and `effective_cap`.** Parse `--depth <shallow|standard|deep>` from the argument string. Last flag wins on conflict. Unknown value → print to stderr `--depth must be one of: shallow, standard, deep (got '<v>')` and exit 64.

Map the resolved value to `effective_cap`:

- `shallow` → `effective_cap = 5`
- `standard` → `effective_cap = 12`
- `deep` → `effective_cap = null` (sentinel: uncapped; reviewer-side safety bound of 50 still applies per FR-DC-DEPTH-05)
- *(absent on CLI)* → `depth_source = "default"`, `effective_cap = null` for now; the adaptive gate in Phase 4 (FR-DC-DEPTH-04) resolves it after the reviewer returns

Set `depth_source` to `"cli"` if the flag was present, else `"default"`. Carry both `depth_source` and `effective_cap` through to Phase 4.

Print to stderr exactly: `depth: <value|unset> (source: <cli|default>) -> cap=<N|uncapped|deferred-to-gate>` once at Phase 0 entry.

---

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

## Phase 1: Identify and access the source

Determine the source type from the argument:

- Starts with `http://` or `https://` → **URL mode**
- Path containing `index.html` or multiple `*.html` files at the root → **wireframes/prototype mode** (treat both the same — they're just static HTML)
- Path with `runtime.js` + `*-device.html` at root → **prototype mode** (subset of static HTML; use the device files as the screen list)

Validate access:

<!-- defer-only: ambiguous -->
- **URL mode:** `curl -sSI <url> | head -1` to confirm reachability. If 401/403, ask the user via `AskUserQuestion` for auth method (storage-state JSON / basic-auth / cookies). If unreachable, abort with a clear message.
- **HTML mode:** confirm the folder exists and contains at least one HTML file. List the discovered files for the user.

Save what you found to `{out_dir}/source.{ext}` (extension follows `output_format`: `.html` when html/both, `.md` when md):

```markdown
# Source
- Type: <url | wireframes | prototype>
- Location: <url-or-path>
- Files / routes discovered: <count + list>
- Auth: <none | storage-state | basic-auth>
```

---

## Phase 2: Discover and approve journeys

Identify candidate user journeys to critique. The strategy depends on source type:

### 2a. URL mode — try inference, fall back to user-described

Run an exploratory crawl with `assets/capture.mjs --mode crawl --depth 1 --max 20` against the entry URL. Inspect the resulting `manifest.json` and dump the page titles + URL paths. If at least 5 distinct routes were captured AND no auth wall was hit, propose 3-5 candidate journeys grouped by intent (e.g., "browse → detail → action", "auth → onboarding → first task").

If the crawl returns < 5 routes, hits a redirect loop to a login page, or lands on a single-page app where everything routes through `/`, **fall back** to asking the user to describe journeys plus any auth steps in plain language. Capture their description in `{out_dir}/journeys.{ext}`.

### 2b. Wireframes / prototype mode — read the artifact

For wireframes, read each HTML file's `<title>` and any annotation layer / state-switcher tabs to infer screen purpose. For prototypes, read `runtime.js` for the route table.

Cross-reference with the workstream's `req-doc.md` if available — pull declared journeys directly. Otherwise propose 3-5 inferred journeys grouped by user intent.

### 2c. User approval of journey set

Present candidates and capture which to critique:

```
<!-- defer-only: ambiguous -->
AskUserQuestion (multiSelect):
  question: "Which journeys should I critique? (Pick up to 5 — more produces shallow output.)"
  header: "Journeys"
  options:
    - <journey-1 label> — <one-line description>
    - <journey-2 label> — <one-line description>
    - ...
```

If `--journeys <id1,id2>` was passed, skip the question and use those.

**Cap: 5 journeys per session.** More dilutes the rubric pass.

For each selected journey, define the step-by-step click path (URL or selector per step). For URL mode this becomes a journey-config JSON consumed by the capture script in Phase 3; for HTML mode it's just the ordered list of files.

Save to `{out_dir}/journeys.{ext}` with one section per chosen journey, including step path and entry context (cold visitor / signed-in user / error recovering).

---

## Phase 3: Capture flow screenshots

Run the packaged Playwright script `assets/capture.mjs` (full usage in the file header). Output goes to `{out_dir}/screenshots/`.

### 3a. URL mode

Build a journey config from Phase 2c and run:

```
node {skill_dir}/assets/capture.mjs \
  --mode journey \
  --config {out_dir}/journeys.json \
  --out {out_dir}/screenshots \
  [--storage-state <path>] [--basic-auth user:pass] \
  --viewport 1440x900
```

<!-- defer-only: ambiguous -->
Repeat per device variant if multi-device crit is requested (default: desktop only; ask the user via `AskUserQuestion` if mobile should be added).

### 3b. Wireframes / prototype mode

```
node {skill_dir}/assets/capture.mjs \
  --mode files \
  --files <comma-separated absolute paths from journeys.{html,md}> \
  --out {out_dir}/screenshots \
  --viewport 1440x900
```

### 3c. Verify capture quality

Read `{out_dir}/screenshots/manifest.json`. Check:

- One PNG per declared step (no missing journey steps)
- No fatal errors recorded
- File sizes > 5 KB (a 1 KB PNG usually means the page didn't render)

If anything failed, surface the error to the user and decide together: retry with adjusted selectors, skip the journey, or proceed with partial coverage and note the gap in the report.

---

## Phase 4: Heuristic evaluation against the rubric

Read `reference/eval.md` (canonical rubric) into context.

Dispatch a **reviewer subagent** (or run inline if subagents unavailable) per scope:

1. **Per-screen pass** — one subagent receives all screenshots + the rubric, returns the JSON array described in `eval.md`. Cap the reviewer's output per FR-DC-DEPTH-05: when `depth_source == "cli"`, instruct the reviewer to cap at `effective_cap` high+medium findings (or 50 when `effective_cap == null`, i.e. `--depth deep`); when `depth_source == "default"`, instruct the reviewer to cap at 50 high+medium findings as a safety bound (the orchestrator slices further after the FR-DC-DEPTH-04 gate fires). Low findings go in an "unsurfaced" appendix regardless of depth.
2. **Per-component pass** — one subagent identifies recurring components (button, card, input, modal) across all screens and scores once per component class.
3. **Per-journey pass** — one subagent per journey walks the screenshot sequence step-by-step, counts clicks / keystrokes / decisions / modal interrupts, and applies J1 thresholds.

Save raw output to `{out_dir}/eval-findings.json`.

### 4a. Findings Presentation Protocol

<!-- defer-only: ambiguous -->
**Do not dump findings as prose.** Group findings by category and present each via `AskUserQuestion` so the user can disposition each one structurally.

<!-- defer-only: ambiguous -->
For every batch of up to 4 findings (the `AskUserQuestion` per-call cap):

```
<!-- defer-only: ambiguous -->
AskUserQuestion:
  question: "<one-sentence finding> — proposed fix: <one-sentence concrete fix>"
  header: "<short category — e.g., 'A1 contrast'>"
  options:
    - "Apply as proposed" — recommendation enters the report as a high-confidence fix
    - "Modify" — recommendation enters with the user's edit; capture in notes
    - "Skip" — finding is marked "won't-fix" and excluded from the report's recommendations
    - "Defer" — finding moves to a "Deferred" section as known-but-not-now
```

#### Adaptive depth gate (FR-DC-DEPTH-04)

After the Phase 4 reviewer subagent returns and before the disposition loop begins, resolve the final `effective_cap`:

- If `depth_source == "cli"` → skip the gate; the Phase 0 `effective_cap` applies as-is.
- If `N_returned ≤ 5` → skip the gate; set `effective_cap = N_returned` (nothing would be capped).
- Else (gate fires):
  - If `mode == non-interactive` → auto-pick **Top 12 (standard, Recommended)** per the canonical Recommended-pick contract. Append one entry to the OQ buffer recording `{question, chosen: "standard", N_returned}` so the wrapping skill or script can audit what was capped.
  - Else → issue one `AskUserQuestion`:
<!-- defer-only: ambiguous -->
    ```
    AskUserQuestion:
      question: "Reviewer surfaced <N_returned> findings. How many to disposition?"
      header: "Depth"
      options:
        - "Top 5 (shallow)" — disposition the 5 highest-severity findings; rest logged as unsurfaced
        - "Top 12 (standard, Recommended)" — current default behaviour; preserves no-regression path
        - "All <N_returned> (deep)" — disposition every high+medium finding the reviewer returned
    ```
  - Map the user pick: `shallow → effective_cap = 5`, `standard → effective_cap = 12`, `deep → effective_cap = null`.

#### Disposition loop (FR-DC-DEPTH-06)

<!-- defer-only: ambiguous -->
Sort the returned findings by `severity desc, then file-order`. Take the first `effective_cap` entries (or all entries when `effective_cap == null`, i.e. deep). Issue multiple sequential `AskUserQuestion` calls until all selected findings are dispositioned. Findings beyond `effective_cap` are logged in `eval-findings.json` as unsurfaced.

#### Surfaced/unsurfaced report (FR-DC-DEPTH-07)

After the disposition loop completes, print to chat exactly: `<N_surfaced> findings surfaced for disposition, <M_unsurfaced> unsurfaced — see {out_dir}/eval-findings.json` (substitute the actual counts and `{out_dir}` value). `M_unsurfaced` is 0 in deep mode and whenever `N_returned ≤ effective_cap`. This line MUST fire in all modes including `--non-interactive` — silent capping is forbidden (see Anti-patterns).

**Platform fallback** (no interactive prompt tool): emit a numbered findings table with `disposition` column blank, save to `{out_dir}/eval-findings-review.md`, and ask the user to fill it in. Do NOT silently auto-apply. The depth resolution still applies — the table's row count respects `effective_cap` (default `standard`/12 in this fallback unless `--depth` was set).

**Anti-pattern:** A wall of prose ending in "Let me know what you'd like to fix." Always structure the ask.

---

## Phase 5: PSYCH and MSF pass

Apply a lightweight psychology + Motivation/Satisfaction/Friction pass to the captured journeys. Format mirrors `/wireframes` and `/prototype`:

### 5a. PSYCH walkthrough

For each chosen journey, assign each visible element an integer in [+1..+10] or [-10..-1] indicating its psychological pull. Sum to a screen Δ; track cumulative from an entry-context default (40 = medium-intent). Use the table format in `/wireframes/reference/psych-output-format.md` if you have access; otherwise:

```markdown
## Journey: <name> (start: 40, Medium-intent)

| Step | Screen          | Previous | Δ   | Cumulative | Severity | Top 2 Drivers                  |
| ---- | --------------- | -------- | --- | ---------- | -------- | ------------------------------ |
| 1    | 01-landing      | 40       | -3  | 37         | OK       | -3 (form density)              |
| 2    | 02-signup       | 37       | -8  | 29         | Watch    | -8 (5 required fields)         |
```

Severity legend: cumulative `< 0` → Bounce risk; `< 20` → Watch; single-step Δ `< -20` → Cliff.

### 5b. MSF pass

For each journey, score on a 1-5 scale:

- **Motivation** — does the entry point clearly answer "why am I here, why now"?
- **Satisfaction** — does the journey deliver a clear payoff, with confirmation moments?
- **Friction** — interaction (clicks/keystrokes), cognitive (decisions/jargon), emotional (interruptions/mode switches). Quote the click/keystroke totals from Phase 4's per-journey pass.

Save both passes to `{out_dir}/psych-msf.{ext}` (extension follows `output_format`). Apply Phase 4a's Findings Presentation Protocol to any "Watch", "Cliff", or score ≤ 2 finding.

---

## Phase 6: Synthesise the recommendations report

Write `{out_dir}/design-crit.html` per the substrate at `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/` — the single-source report. Keep it concise; recommendations are the deliverable, raw findings are appendices.

**Atomic write (FR-10.2):** write `design-crit.html` and the companion `design-crit.sections.json` via temp-then-rename — never serve a half-written file.

**Asset substrate (FR-10):** copy `assets/*` from `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/` to `{out_dir}/assets/` (or `{feature_folder}/assets/` if `{out_dir}` resolves under a pipeline feature folder, sharing the substrate with sibling artifacts) if not already present. The substrate currently includes `style.css`, `viewer.js`, `serve.js`, `build_sections_json.js`, `comments.js`, `comments.css`, and the launcher trio (`comments-open.command`, `comments-open.sh`, `comments-open.bat`); new substrate files added in future releases ride along automatically. Idempotent — `cp -n` skips identical files.

**Asset prefix (FR-10.1):** when `{out_dir}` is a top-level feature-folder write, `assets/`; when nested under a feature folder (`{feature_folder}/design-crit/`), `../assets/`.

**Cache-bust (FR-10.3):** append `?v=<plugin-version>` to all asset URL references emitted into the HTML.

**Heading IDs (FR-03.1, enforced by `/verify`):** every `<h2>` and `<h3>` carries a stable kebab-case `id` per `_shared/html-authoring/conventions.md` §3.

**Index regeneration (FR-22, §9.1):** when `{out_dir}` is a sub-folder of a pipeline feature folder, regenerate `{feature_folder}/index.html` via `_shared/html-authoring/index-generator.md` (manifest inlined as `<script type="application/json" id="pmos-index">`, no on-disk `_index.json`, FR-41). Standalone `--out` invocations outside the pipeline do NOT regenerate an index.

**Mixed-format sidecar (FR-12.1):** retired — `output_format=both` is treated as `html` until a future feature re-introduces MD export.

Structure:

```markdown
# Design Crit — <feature slug>

Generated: YYYY-MM-DD
Source: <url-or-path> (<type>)
Journeys reviewed: <count>
Screens captured: <count>

## TL;DR (top 5 recommendations)

1. **[high] <one-line headline>** — <one-line "why" tied to evidence>. <one-line concrete fix>.
2. ...

## Recommendations by journey

### Journey: <name>

- **[high] <finding> ([N5])** — <evidence>. Fix: <concrete fix>.
- **[medium] <finding> ([V1])** — <evidence>. Fix: <concrete fix>.
- ...

(Friction stats: clicks=N, keystrokes=N, decisions=N, est. time=Ns, threshold breach=<yes/no>)

## Recommendations by component

- **Primary button** — <finding(s)>. Fix: <concrete fix>.
- ...

## Cross-cutting patterns

Findings that recur across ≥ 2 journeys / screens (highest leverage).

## Deferred

Findings the user chose to defer; logged for future review.

## Appendix A — PSYCH journey scores

(Tables from psych-msf.{html,md})

## Appendix B — Raw findings

Pointer to `eval-findings.json`.
```

Each recommendation must:

- Cite the rubric ID it came from (e.g., `[N5]`, `[A1]`, `[J1]`)
- Reference observable evidence (region of a screenshot, click count, contrast value)
- Propose a concrete fix, not a vague direction

Cap the body at ~400 lines; if there are more findings than that, push the long tail into the appendix with a count.

---

## Phase 7: Workstream Enrichment

**Skip if no workstream was loaded in Phase 0.** Otherwise, follow `_shared/pipeline-setup.md` Section C. For this skill, the signals to look for are:

- Recurring high-severity heuristic IDs across journeys → workstream `## Known UX Friction`
- Validated journeys + their entry contexts → workstream `## Journeys` (extend, don't replace)
- Component classes flagged for rework → workstream `## Design System Debt`
- PSYCH/MSF "Cliff" or "Bounce risk" steps → workstream `## Drop-off Risks`

This phase is mandatory whenever Phase 0 loaded a workstream — do not skip it just because the report is written.

---

## Phase 8: Capture Learnings

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing — surprising behaviors, repeated corrections, non-obvious decisions about journey selection, capture failures, or rubric blind spots. Proposing zero learnings is a valid outcome for a smooth session; the gate is that the reflection happens, not that an entry is written.

---

## Anti-patterns

- **Skipping the capture step** because "I can read the HTML." The rubric explicitly grades visual hierarchy, contrast, and Gestalt — those need pixels, not source.
- **Critiquing a single screenshot in isolation.** Per-journey J-checks and friction thresholds need the full step sequence; per-component C-checks need cross-screen comparison.
- **Padding the findings list.** An empty heuristic finding is fine — pad-to-look-thorough produces noise the user has to triage.
- **"Improve hierarchy" / "make it cleaner" / "consider better UX"** — vague recommendations the user can't act on. Every recommendation must reference the offending element/region and propose a concrete change.
<!-- defer-only: ambiguous -->
- **Dumping findings as prose.** Always structure dispositions via `AskUserQuestion` (Phase 4a); prose dumps force the user to hand-write triage and lose structure.
- **Inventing measurements.** If you didn't compute the contrast ratio or click count, don't state one. Cite "Stark says 3.2:1" only if Stark actually returned that value.
- **Critiquing > 5 journeys.** Output dilutes; rubric becomes shallow. Cap at 5 per session.
- **Treating analytical-only friction as live-walk friction.** If Playwright capture failed and you're inferring friction from the HTML alone, label the report accordingly and warn the user the numbers are estimates.
- **Silently capping findings.** Even at `standard` depth, the FR-DC-DEPTH-07 surfaced/unsurfaced chat line MUST fire so the user can decide whether to re-run at `deep`. Treating the cap as a quiet truncation hides medium-severity friction that the rubric explicitly flagged — the original design's silent cap-at-12 is what motivated the depth control in the first place.
