---
name: artifact
description: Generate, refine, and update structured PM/eng artifacts (PRD, Experiment Design Doc, Engineering Design Doc, Discovery Doc) from existing context plus targeted gap-filling questions. Each artifact passes through a reviewer-subagent + auto-apply loop (max 2 iters) governed by per-section eval criteria. Ships with 4 built-in templates and 4 writing-style presets (Concise, Tabular, Narrative, Executive); users can author their own at ~/.pmos/artifacts/. Use when the user says "draft a PRD", "create an experiment design", "write a design doc", "generate a discovery doc", "/artifact", or names an artifact type to produce.
user-invocable: true
argument-hint: "[ | <type> [--tier lite|full] [--preset <slug>] | create <type> [...] | refine <path> | update <path> | template add|list|remove [<slug>] | preset add|list|remove [<slug>]] [--format <html|md|both>] [--non-interactive | --interactive]"
---

# /artifact

Generate, refine, and update structured PM/eng artifacts (PRD, Experiment Design Doc, Engineering Design Doc, Discovery Doc) with section-level eval criteria, a reviewer-subagent refinement loop (max 2 iterations), and writing-style presets. Templates ship in this skill; user-defined templates and presets live at `~/.pmos/artifacts/` and survive plugin upgrades.

**Announce at start:** "Using /artifact to {create|refine|update} a {type}."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** State your assumption inline, document it in the artifact's frontmatter as `assumed: <field>`, proceed. User reviews after.
- **No subagents:** Run the refinement reviewer inline as the same agent. Same eval.md; same output format.
- **Task tracking:** Use whatever task tool exists (TaskCreate / update_plan / verbal phase announcements).

## Track Progress

This skill has multiple phases per flow. For the Create flow, create one task per phase using your agent's task-tracking tool (`TaskCreate` in Claude Code, equivalents elsewhere): Phase 0 Load Context, Phase 1 Subcommand Routing, Phase 2 Create (with 2.0–2.7 sub-phases), Phase 3 Self-Refinement Loop, Phase 4 Save & Confirm, Phase 5 Workstream Enrichment, Phase 6 Capture Learnings. Refine Flow and Update Flow have their own phase tasks (see flow sections below). Mark each task in-progress when you start it and completed as soon as it finishes — do not batch completions.

## Phase 0 — Load Context

1. Follow `../_shared/pipeline-setup.md` Section 0 (canonical inline block) to read `.pmos/settings.yaml`, resolve `{docs_path}`, and load workstream context. If settings.yaml is missing, run first-run setup per Section A.
2. Read `~/.pmos/learnings.md` if it exists. Note entries under `## /artifact` and factor them into this session.
3. Ensure `~/.pmos/artifacts/` exists. If not, create the empty tree:
   ```
   ~/.pmos/artifacts/
     templates/
     presets/
   ```
4. Determine the subcommand and route to the appropriate phase. Default subcommand is `create`.

### Phase 0 addendum: output_format resolution (FR-12)

5. **Resolve `output_format`.** Read `output_format` from `.pmos/settings.yaml` (default: `html`; valid values: `html`, `md`, `both`). A `--format <html|md|both>` argument-string flag overrides settings (last flag wins on conflict, per FR-12). Print to stderr exactly: `output_format: <value> (source: <cli|settings|default>)` once at Phase 0 entry. Controls the **feature-folder write phase only**; the template store at `~/.pmos/artifacts/templates/<slug>/template.md` retains MD shape regardless of output_format (per runbook edge case row 4 — template-store carve-out).

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

## Phase 1 — Subcommand Routing

| Argument shape | Route to |
|---|---|
| `(empty)` | Phase 2.0 — type picker |
| `<type>` (one word matching a template slug) | Phase 2 — Create flow with `<type>` |
| `create <type> [flags]` | Phase 2 — Create flow |
| `refine <path>` | Refine flow |
| `update <path>` | Update flow |
| `template add` | Template Add flow |
| `template list` | Template List flow |
| `template remove <slug>` | Template Remove flow |
| `preset add` | Preset Add flow |
| `preset list` | Preset List flow |
| `preset remove <slug>` | Preset Remove flow |

If `<type>` doesn't match any template slug (built-in or user), list available templates and offer fuzzy match before erroring.

Recognized flags on `create`:
- `--tier lite|full` — bypass tier auto-detection
- `--preset <slug>` — bypass default preset selection

## Phase 2 — Create Flow

The same 7-step flow applies to every artifact type — built-in or user-defined.

### 2.0 — Type picker (only when invoked with no `<type>` argument)

<!-- defer-only: free-form -->
Use `AskUserQuestion` to ask which type to create. Build options dynamically by listing all templates from:
- `templates/` in this skill dir (built-in)
- `~/.pmos/artifacts/templates/` (user)

Show source label `[built-in]` / `[user]` next to each. After selection, set `<type>` and proceed to 2.1.

### 2.1 — Resolve & validate template

1. Look up `<type>` in built-in templates first; if not found, in `~/.pmos/artifacts/templates/`. (Built-in always wins on slug — user templates use unique slugs by construction.)
2. Read `template.md` frontmatter and `eval.md`.
3. **Validate:**
   - Both files exist.
   - Frontmatter parses; required fields present: `name`, `slug`, `description`, `tiers`, `default_preset`, `files_to_read`.
   - Every section ID referenced in `eval.md` (e.g., `## §2`) exists in `template.md`.
   - If validation fails: stop, surface the specific error, do not proceed.

### 2.2 — Tier detection

If `template.md` frontmatter `tiers: [lite, full]`:
1. If `--tier <value>` flag was given, use it.
2. Otherwise auto-suggest based on signals:
   - Requirements doc richness: word count of `01_requirements*.md` if present (>1500 → suggest Full; <500 → suggest Lite).
   - User input length and tone (>200 chars with strategic terms like "OKR", "rollout", "stakeholders" → Full).
   - Default to Full when ambiguous.
<!-- defer-only: ambiguous -->
3. Confirm with user via `AskUserQuestion` (preview shows the section list per tier).

If `tiers: [single]`, skip this step.

### 2.3 — Resolve feature folder

Follow `../_shared/pipeline-setup.md` Section B (feature-folder rules) with:
- `skill_name=artifact`
- `feature_arg=<value of --feature flag if any>`
- `feature_hint=<short feature name from user input or current type>`

Returned path becomes `{feature_folder}` for the rest of this run.

### 2.4 — Auto-consume upstream artifacts

For each entry in `template.md` frontmatter `files_to_read`:
- If `pattern:`, expand `{feature_folder}` and glob; read every match.
- If `source: product-context`, use the workstream content already loaded in Phase 0.
- If `source: user-args`, treat any file paths in the user's invocation as attached.

Concatenate all read content into a `gathered_context` block, tagged by source label.

### 2.5 — Gap interview

1. Filter `eval.md` items where `kind: precondition` AND the item's `tier:` includes the selected tier (or includes `single`).
2. For each precondition item, do a semantic check: does anything in `gathered_context` satisfy the item's `check`?
   - Use LLM judgment, not regex. Be generous — if the evidence is plausibly present, mark it satisfied.
3. For UNSATISFIED items only, queue the item's `gap_question`.
<!-- defer-only: free-form -->
4. Batch queued questions ≤4 per `AskUserQuestion` call. Use multiple sequential calls if >4.
5. Append answers to `gathered_context` tagged `gap_answer:<criterion_id>`.

### 2.6 — Preset selection

1. If `--preset <slug>` flag, use it.
2. Otherwise read `template.md` frontmatter `default_preset`.
<!-- defer-only: ambiguous -->
3. Confirm with the user via `AskUserQuestion` showing the 4 built-in presets + any user presets, with `default_preset` marked `(default)`.

Load the chosen preset's rendering rules and voice notes for use in 2.7.

### 2.7 — Generate draft

Generate the artifact section-by-section using:
- `template.md` section ordering and per-section guidance comments
- The selected preset's rendering rules (per section type)
- `gathered_context` (auto-read + gap answers)

Write the draft to `{feature_folder}/{slug}.html` (e.g., `prd.html`, `experiment-design.html`) per the substrate at `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/`. The template store at `~/.pmos/artifacts/templates/<slug>/template.md` retains its MD shape and is rendered via the substrate at write time (per runbook edge case row 4).

**Authoring path (FR-1):** author the HTML body directly using `template.md` for section ordering and per-section guidance comments. Wrap each `## §N` section as `<section id="...">` containing `<h2 id="...">` per `_shared/html-authoring/conventions.md` §3 (kebab-case ids; level-3 subsections become `<h3 id="...">` inside the same `<section>`). **No MD→HTML conversion step happens at write time** — the LLM emits substantive HTML directly, identical to how `/spec` and `/plan` author HTML from outline. The MD template is the *structural* guide, not the rendered source.

**Pre-rename assertion (FR-2):** before the `rename(2)` step of the atomic write, run inline checks on `{slug}.html.tmp`:

```bash
# Every <h2>/<h3> carries an id="..." attr
grep -oE '<h[23][^>]*>' {slug}.html.tmp | grep -v 'id="' && \
  { echo "[/artifact] FR-2 violation: <h2>/<h3> without id in {slug}.html.tmp"; exit 1; }
# Every <section> wrapper carries an id="..." attr
grep -oE '<section[^>]*>' {slug}.html.tmp | grep -v 'id="' && \
  { echo "[/artifact] FR-2 violation: <section> without id in {slug}.html.tmp"; exit 1; }
```

On either fail: hard-fail the Phase 2.7 write; surface the soft-phase failure dialog (Retry / Pause / Abort). The Retry path re-invokes the LLM with an explicit reminder of conventions.md §3.

**Atomic write (FR-10.2):** write `{slug}.html` and the companion `{slug}.sections.json` via temp-then-rename — never serve a half-written file. The `sections.json` companion is built by running `node {feature_folder}/assets/build_sections_json.js {slug}.html.tmp > {slug}.sections.json.tmp` and renamed alongside.

**Asset substrate (FR-10):** copy `assets/*` from `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/` to `{feature_folder}/assets/` if not already present. The substrate currently includes `style.css`, `viewer.js`, `serve.js`, `build_sections_json.js`, and the inline-doc-comments substrate (FR-01, FR-40): `comments.js`, `comments.css`, plus the launcher trio `comments-open.command` and `comments-open.sh` (both via `install -m 0755`) and `comments-open.bat` (`cp -n`). New substrate files added in future releases ride along automatically. Idempotent — `cp -n` skips identical files.

**Comments meta tag (FR-01, FR-40):** set `{{pmos_skill}}` to `artifact` when expanding `template.html` so the emitted artifact carries `<meta name="pmos:skill" content="artifact">`. The `/comments` resolver routes apply-edit dispatches via this meta tag, so it MUST be set per-skill.

**Asset prefix (FR-10.1):** `assets/` for top-level feature-folder writes.

**Cache-bust (FR-10.3):** append `?v=<plugin-version>` to all asset URL references emitted into the HTML.

**Heading IDs (FR-03.1, enforced by `/verify`):** every `<h2>` and `<h3>` carries a stable kebab-case `id` per `_shared/html-authoring/conventions.md` §3.

**Index regeneration (FR-22, §9.1):** after the artifact write completes, regenerate `{feature_folder}/index.html` via `_shared/html-authoring/index-generator.md` (manifest inlined as `<script type="application/json" id="pmos-index">`, no on-disk `_index.json`, FR-41).

**Mixed-format sidecar (FR-12.1):** retired — `output_format=both` is treated as `html` until a future feature re-introduces MD export.

Include a frontmatter block at the top of the HTML `<main>` body as a `<script type="application/json" id="pmos-frontmatter">` element carrying the artifact's metadata (FR-3):

```html
<script type="application/json" id="pmos-frontmatter">
{
  "type": "prd",
  "tier": "full",
  "preset": "narrative",
  "generated_at": "2026-05-02",
  "template_version": "pmos-toolkit@2.41.0",
  "sources": ["01_requirements.html", "workstream:product-x"]
}
</script>
```

(Legacy MD-only mode: a YAML triple-dash frontmatter block at the top of the .md file with the same fields.)

Then proceed to Phase 3.

## Phase 3 — Self-Refinement Loop (max 2 iterations)

Mirrors `/wireframes` Phase 4 pattern.

### Loop iteration

0. **Pre-dispatch input prep (FR-4).** When primary is HTML, chrome-strip the draft before dispatch so the reviewer receives only the substantive body (no toolbar, no footer, no `<head>` chrome):
   ```bash
   node {feature_folder}/assets/chrome-strip.js {slug}.html > /tmp/artifact-reviewer-input.html
   ```
   Pass the stripped HTML inline as the reviewer's draft body. When primary is legacy MD (`output_format=md`), skip this step and pass the raw `.md` file contents instead.

1. **Dispatch reviewer subagent.**
   - Subagent type: `general-purpose`.
   - Inputs: `reviewer-prompt.md` (system instructions), the full `eval.md` for this template, the companion `{slug}.sections.json`, and the chrome-stripped draft (or raw MD for legacy mode).
   - Background: false (this is a foreground call; we need findings before proceeding).
   - Subagent returns JSON of the shape defined in `reviewer-prompt.md` — each finding has `section, criterion_id, severity, finding, suggested_fix, quote`.

1a. **Validate reviewer return (FR-5, FR-50/51/52 parity).** Before applying any fix:
   1. Load `{slug}.sections.json`; collect ids into `known_ids`.
   2. For every finding, assert `finding.section` ∈ `known_ids` (kebab-case match; tolerate trivial §N-stem derivation). On miss: hard-fail `[/artifact] FR-5 violation: reviewer returned section "{section}" not in sections.json: missing=[…]`.
   3. For every finding, substring-grep `finding.quote` against the raw `{slug}.html` (un-stripped) source — `quote` must be ≥40 chars and a verbatim substring. On miss: hard-fail `[/artifact] FR-5 violation: reviewer quote not found in {slug}.html: {quote-prefix-30char}…`.

   On any FR-5 hard-fail: surface the soft-phase failure dialog (Retry / Pause / Abort). Retry re-dispatches the reviewer with the same prompt (idempotent — the reviewer-prompt.md contract is stable).

2. **Parse findings.** Each finding has `section, criterion_id, severity, finding, suggested_fix, quote` (post-validation).

3. **Auto-apply** all `high` and `medium` findings via `Edit` against the draft file. Apply the `suggested_fix` literally — the reviewer prompt requires fixes specific enough to apply directly. (Use the `quote` field as the `old_string` anchor for the Edit when applicable.)
4. **Log** all `low` findings to a `_residuals` accumulator (in-memory).

5. **Post-loop companion re-emit (FR-6).** After all fixes for this iteration have been applied (and again after all iterations conclude — once is sufficient), re-emit the companions from the live (post-edit) HTML:
   ```bash
   node {feature_folder}/assets/build_sections_json.js {slug}.html > {slug}.sections.json.tmp
   mv {slug}.sections.json.tmp {slug}.sections.json
   # output_format=both MD-sidecar re-emit retired (FR-12.1).
   ```
   Atomic via temp-then-rename. Failures fall through to the soft-phase failure dialog. (Legacy `output_format=md` path skips both re-emits — sections.json is HTML-specific; MD primary has no sidecar.)

### Loop continuation

- If any `high` findings remained AFTER applying loop-1 (i.e., the auto-fix didn't fully resolve them — should be rare; reviewer should regenerate the section), run loop 2.
- Hard cap: **2 loops total.** No third loop, ever.

### Residual presentation

After loop 2 (or loop 1 if no high remain):

- Surface any `high` still remaining + all `medium` from loop 2 + any `low` deemed worth raising via the **Findings Presentation Protocol**:
  <!-- defer-only: ambiguous -->
  - Batch ≤4 findings per `AskUserQuestion` call.
  - Per finding, options: **Apply as proposed** / **Modify** / **Skip** / **Defer**.
  - Apply user-confirmed fixes via `Edit`. "Defer" appends the finding to a `## Deferred Improvements` section at the end of the artifact.

### Anti-patterns (do NOT)

- Run a 3rd loop "just in case." Diminishing returns are real; surface to user instead.
- Silently fix `low` findings without user input — log them, surface only on request or at handoff.
- Invoke the reviewer with a different prompt than `reviewer-prompt.md`. The prompt enforces the JSON contract.

## Phase 4 — Save & Confirm

1. The artifact file at `{feature_folder}/{slug}.html` (plus `{slug}.sections.json` companion, plus `{slug}.md` sidecar when `output_format=both`) already exists from Phase 2.7 and was edited in Phase 3.
2. Show the user a one-paragraph summary:
   - Artifact type + tier
   - Preset used
   - Sections written
   - Refinement-loop iterations (1 or 2) and counts: `N high resolved, M medium resolved, K low logged`
   - Residuals deferred (count + names)
3. Offer to `git add` + commit. Do NOT auto-commit. Suggested commit message:
   ```
   docs({type}): add {tier} {type} for {feature-slug}
   ```

## Phase 5 — Workstream Enrichment

If a workstream was loaded in Phase 0:

1. Scan the gathered context + the final draft for signals worth persisting to the workstream:
   - New user segments named
   - Metrics with baselines / targets
   - Strategic decisions / OKR links
   - Stakeholders / teams not previously listed
<!-- defer-only: ambiguous -->
2. Surface each candidate addition via `AskUserQuestion` (Apply / Modify / Skip), batched ≤4 per call.
3. Apply approved additions to `~/.pmos/workstreams/{workstream}.md`.

If no workstream is active, skip this phase.

## Phase 6: Capture Learnings

Read `../learnings/learnings-capture.md` (relative to this skill dir) and follow it. This phase is a **terminal gate** — the skill is not complete until learnings have been processed.

## Refine Flow (`/artifact refine <path>`)

Re-run the eval-loop judge on an existing artifact. **Internal QA only — does NOT accept new external feedback.**

<!-- defer-only: ambiguous -->
1. Read the artifact at `<path>`. Parse its frontmatter to determine `type`. If frontmatter is missing or `type` cannot be inferred, ask the user via `AskUserQuestion`.
2. Resolve the template (same 2.1 logic) and load `eval.md`.
<!-- defer-only: destructive -->
3. **Detect primary extension (FR-7):** `EXT=$(basename "$path" | awk -F. '{print $NF}')` — `html` or `md`. Ask the user via `AskUserQuestion`: "Overwrite `<path>` or write to `<path>.refined.<EXT>`?" Default = `.refined.<EXT>` (safer; mirrors primary format). The refined sibling carries the same shape contract as the primary — `prd.refined.html` gets its own `prd.refined.sections.json` companion and (when `output_format=both`) a `prd.refined.md` sidecar; `prd.refined.md` is the legacy path.
4. Run Phase 3 refinement loop against the artifact (or its `.refined.<EXT>` copy).
5. Run Phase 4 save & confirm — point at the chosen output path.
6. Skip Phase 5 (no new workstream signals from a re-run).
7. Run Phase 6 learnings capture (terminal gate).

## Update Flow (`/artifact update <path>`)

Apply stakeholder feedback to an existing artifact. **Distinct from refine — this is a stakeholder loop, not internal QA.**

### Phase U.1 — Accept feedback input

<!-- defer-only: free-form -->
Ask the user via `AskUserQuestion`:
- **Paste comments** — user pastes block of feedback inline.
- **File path** — user provides path to a feedback file (Notion export, email dump, .md notes).
- **Dictate** — user describes feedback conversationally; agent transcribes.

### Phase U.2 — Parse into structured items

Extract each feedback item into the shape:

```json
{
  "section": "§2 Problem & Customer",
  "type": "edit | expand | trim | question | accept | reject",
  "content": "verbatim feedback or summary"
}
```

<!-- defer-only: free-form -->
For ambiguous items (no clear section, or unclear intent), batch clarifying questions via `AskUserQuestion` (≤4 per call).

For un-mappable items (don't fit any section), append them to a `## General Feedback` section in the artifact and continue.

### Phase U.3 — Apply via Findings Presentation Protocol

<!-- defer-only: ambiguous -->
Per parsed item, batch ≤4 per `AskUserQuestion`. Options: **Apply as proposed** / **Modify** / **Skip** / **Defer**. Apply approvals via `Edit`. "Defer" appends to `## Deferred Improvements`.

### Phase U.4 — Append Comment Resolution Log

At the bottom of the artifact (inside `<main>`, before any existing `<section id="deferred-improvements">`), append or extend a `<section id="comment-resolution-log">` with one row per resolved item (FR-8 — HTML primary path):

```html
<section id="comment-resolution-log">
  <h2 id="comment-resolution-log">Comment Resolution Log</h2>
  <table>
    <thead><tr><th>Date</th><th>Reviewer</th><th>Section</th><th>Feedback</th><th>Resolution</th></tr></thead>
    <tbody>
      <tr><td>2026-05-02</td><td>(paste)</td><td>problem</td><td>Add competitor benchmark</td><td>Applied</td></tr>
      <tr><td>2026-05-02</td><td>sarah@</td><td>guardrails</td><td>Tighten guardrails</td><td>Modified</td></tr>
    </tbody>
  </table>
</section>
```

Apply via `Edit` against the HTML file; the post-edit re-emit step (Phase 3 step 5) regenerates `sections.json` to include the new id.

When primary is legacy MD (`output_format=md`), fall back to the markdown table emission:

```markdown
## Comment Resolution Log

| Date | Reviewer | Section | Feedback | Resolution |
|---|---|---|---|---|
| 2026-05-02 | (paste) | §2 | Add competitor benchmark | Applied |
| 2026-05-02 | sarah@ | §5 | Tighten guardrails | Modified |
```

### Phase U.5 — Optional re-run of refinement loop

<!-- defer-only: ambiguous -->
Ask: "Run the eval loop on the updated artifact?" via `AskUserQuestion`. If yes, run Phase 3.

### Phase U.6 — Save, then Phase 6 learnings capture (terminal gate)

Same as Phase 4 + Phase 6 from the create flow.

## Template Management

### `/artifact template add` — research-grounded authoring

`--quick` flag drops to scaffold-only mode (skip phases T.2 and T.3, jump to T.4 with empty proposed sections).

#### T.1 — Intake

<!-- defer-only: free-form -->
Ask via `AskUserQuestion` (one batch ≤4):
- Template **name** + **slug** (slug must not collide with built-in templates: `prd`, `experiment-design`, `eng-design`, `discovery`. Validate at capture time and reject collisions before continuing.)
- **Purpose / when used** (1-2 sentences)
- **Audience**
- **Examples** — links or pasted reference docs (optional)
- **Inspirations / frameworks** to ground in (optional)

#### T.2 — Research subagent (skip if `--quick` or user opts out interactively)

Dispatch a `general-purpose` subagent. Foreground call. Prompt:

```
Research best practices for the artifact class "<name>" (purpose: <purpose>; inspirations: <list>).

Survey canonical sources via WebSearch and WebFetch. Cite each source.

Return a proposal:
- Sections (8-15) with one-line purpose each
- Per-section eval items with kind (precondition|judgment), check, severity (high|medium|low), and gap_question for preconditions
- Frontmatter files_to_read suggestions
- A recommended default_preset (concise|tabular|narrative|executive)
- Cited source links

Do NOT write any files. Output a single markdown report ~600-900 words.
```

#### T.3 — Section-by-section alignment

<!-- defer-only: ambiguous -->
For each proposed section in the research report, ask via `AskUserQuestion` with options:
- **Approve** (preview shows section purpose + eval items)
- **Tweak** (free-text follow-up)
- **Discuss** (free-text follow-up)
- **Drop**

Capture decisions per section. Track which eval items survived.

#### T.4 — Frontmatter authoring

<!-- defer-only: free-form -->
Confirm via `AskUserQuestion` (one batch):
- `tiers`: `[single]` / `[lite, full]`
- `default_preset`: pick from 4 built-in (or "user-defined" if applicable)
- `files_to_read`: confirm list

#### T.5 — Generate the 2 files

Write to `~/.pmos/artifacts/templates/<slug>/`:
- `template.md` — frontmatter + section markdown with embedded guidance per the alignment decisions.
- `eval.md` — per-criterion items per the alignment decisions.

Validate on write:
- Both files present.
- Frontmatter parses; required fields present.
- Every `## §N` in template.md has a matching `## §N` in eval.md.
- If validation fails, surface the specific error and offer to retry or abort.

#### T.6 — Optional dry-run

<!-- defer-only: ambiguous -->
Ask: "Run a dry-run by creating one artifact with this template?" via `AskUserQuestion`. If yes, prompt for a feature folder (or use the most recent), then execute Phase 2 with the new template. User can iterate on sections/evals based on what the dry-run produces.

### `/artifact template list`

Read both built-in (`templates/`) and user (`~/.pmos/artifacts/templates/`) directories. Render a table:

```
| Slug              | Name                      | Tiers       | Source     |
|-------------------|---------------------------|-------------|------------|
| prd               | PRD                       | lite, full  | built-in   |
| experiment-design | Experiment Design Doc     | lite, full  | built-in   |
| eng-design        | Engineering Design Doc    | lite, full  | built-in   |
| discovery         | Discovery Doc             | single      | built-in   |
| okr-doc           | OKR Document              | single      | user       |
```

Read-only.

### `/artifact template remove <slug>`

1. If `<slug>` is a built-in: refuse with message "Built-in templates cannot be removed."
<!-- defer-only: destructive -->
2. If `<slug>` is a user template: confirm via `AskUserQuestion` (Yes/No), then `rm -rf ~/.pmos/artifacts/templates/<slug>/`. Show the path that was removed.
3. If `<slug>` doesn't exist: list available user templates.

## Preset Management

### `/artifact preset add`

#### P.1 — Intake (one interactive batch)

- **Slug** (validate against built-in: `concise`, `tabular`, `narrative`, `executive` — reject collisions)
- **Description** (1-line)
- **Inspiration** (existing preset to fork? other doc style?)

#### P.2 — Rendering rules per section type

<!-- defer-only: free-form -->
Walk through 4 section types, asking the user for the rule per type via `AskUserQuestion` (4 questions batched in 2 calls of 2):

1. **Lists of objects** (metrics, variants, scope items, stories) — table / nested bullets / prose?
2. **Narrative sections** (Problem, User Journey, FAQ) — prose / bulleted / mixed?
3. **Procedural lists** (rollout phases, journey steps) — numbered / unnumbered / table?
4. **Diagrams** — text/ASCII / Mermaid / both / none?

#### P.3 — Voice and tone

Ask: 3-5 voice rules (active vs passive, sentence length cap, hedging, etc.). Free-text or preset list.

#### P.4 — Generate file

Write to `~/.pmos/artifacts/presets/<slug>.md`:

```markdown
---
name: <slug>
description: <line>
---

# Rendering rules

<rules from P.2>

# Voice

<rules from P.3>
```

### `/artifact preset list`

Render built-in + user presets in a table with `Slug | Description | Source`.

### `/artifact preset remove <slug>`

Symmetric to `template remove`. Reject if built-in.

---

## Apply comment-resolver edit (FR-22, FR-30, FR-60)

This phase is the `/artifact` entrypoint that `/comments resolve` (T10) dispatches into when walking open threads in an artifact's `.comments.json` sidecar. The contract — input/output JSON shapes, closed `error_enum` set, idempotency rules, subagent invocation convention — lives in the shared contract doc and is the single source of truth:

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md` (T6).

Per [NFR-08](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#nfr-h), this phase MUST cite that file rather than restate the contract. Anything below is `/artifact`-specific implementation guidance only.

### When invoked

The resolver dispatches a subagent with the §9.1 input JSON. The subagent's tools include this skill's Node shim:

- **Shim:** `plugins/pmos-toolkit/skills/artifact/scripts/apply-edit-at-anchor.js` — exports `apply(input)`, returns one of the three output shapes (success / failure / clarification) per §9.1. Success responses include the optional `applied_artifact` field (full post-edit HTML); the shim's minimal edit inserts an HTML annotation comment immediately before the resolved anchor element — real prose rewriting is deferred to T12+.

### Resolution order

1. **id-first.** Locate `id="<id>"` in the artifact HTML (e.g., `id="problem"`, `id="goals"`). Match → success path, `strategy: "id-first"`, `score: 1.0`.
2. **quote-fallback.** Otherwise (or on id miss), substring-contains match `anchor.quote_anchor.text` (≥40 chars) against the candidate's text content. First exact substring hit wins.
3. **Neither hits** → emit `{ success: false, error_enum: "anchor_orphaned" }`; do NOT mutate the artifact.

### Tests

- Per-skill contract: `plugins/pmos-toolkit/skills/artifact/tests/apply-edit-at-anchor.test.js` (5 cases: id-first happy, orphan, idempotent, infeasible, clarification).
- Wrapper: `tests/scripts/assert_apply_edit_at_anchor_artifact.sh`.
