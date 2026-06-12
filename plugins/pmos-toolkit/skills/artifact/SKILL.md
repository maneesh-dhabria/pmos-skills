---
name: artifact
description: Generate, refine, and update structured PM/eng artifacts (PRD, Experiment Design Doc, Engineering Design Doc, Discovery Doc) from existing context plus targeted gap-filling questions. Each artifact passes through a reviewer-subagent + auto-apply loop governed by per-section eval criteria. Ships with 4 built-in templates and 4 writing-style presets (Concise, Tabular, Narrative, Executive); users can author their own at ~/.pmos/artifacts/. Use when the user says "draft a PRD", "create an experiment design", "write a design doc", "generate a discovery doc", "/artifact", or names an artifact type to produce.
user-invocable: true
argument-hint: "[<type> [--depth brief|standard|deep] [--preset <slug>] [--feature <slug>] | refine <path> | update <path> | template add [--quick]|list|remove <slug> | preset add|list|remove <slug>] [--format <html|md>] [--non-interactive | --interactive]"
---

# /artifact

Generate, refine, and update structured PM/eng artifacts (PRD, Experiment Design Doc, Engineering Design Doc, Discovery Doc) with section-level eval criteria, a reviewer-subagent refinement loop, and writing-style presets. Templates ship in this skill; user-defined templates and presets live at `~/.pmos/artifacts/` and survive plugin upgrades.

**Announce at start:** "Using /artifact to {create|refine|update} a {type}."

**Flags are NL-first.** Infer options from the request — "quick draft" ≡ `--depth brief`, "deep doc pipeline" / "full battery" ≡ `--depth deep`, "use the tabular preset" ≡ `--preset tabular`, "markdown output" ≡ `--format md`, "quick template scaffold" ≡ `template add --quick`; an explicit flag overrides the inferred intent. `create <type>` is an accepted synonym of bare `<type>`.

`--depth brief|standard|deep` is the **master dial** — it gates which pipeline stages run (research / persona panel / diagram pass) AND the artifact's section count (the old `--tier` job). Default `standard`. See `#load-context` for resolution and `#create` for the per-stage gates.

<!-- nl-sugar -->
`--tier lite|full` is a retired-but-parsed back-compat alias (not advertised in the hint): `--tier lite` ≡ `--depth brief`, `--tier full` ≡ `--depth standard`. It was never machine-coupled (the orchestrator never passes `--tier` to `/artifact`), so demoting the documented surface is §I-safe; the alias only prevents muscle-memory breakage.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** State your assumption inline, document it in the artifact's frontmatter as `assumed: <field>`, proceed. User reviews after.
- **No subagents:** Run the refinement reviewer inline as the same agent. Same eval.md; same output format. The persona panel (3.5) and research fan-out (7.5) collapse to single-agent passes.
- **`/artifact` is itself running as a subagent (skip-with-note):** skills cannot be invoked by a subagent, so the post-draft pipeline stages that call child skills — **3.7 diagram (`/diagram`), 3.8 polish (`/polish`), 3.9 grill (`/grill`)** — cannot run. When this skill detects it is a subagent (cannot call the `Skill` tool, or the dispatch prompt's `[mode: …]` marker indicates a parent), **skip those stages and emit a `<!-- pmos:deferred-pass: <stage> -->` note in the artifact plus a chat line recommending a manual `/artifact refine` / `/polish` / `/grill` run after the parent completes.** Never hard-fail. (The persona panel 3.5 and research 7.5 also collapse per the "No subagents" bullet.) This keeps `/artifact` usable as a `/feature-sdlc` child without blocking.
- **Task tracking:** Use whatever task tool exists (TaskCreate / update_plan / verbal phase announcements).

## Track Progress

Multi-phase flows (Create: Phases 0–6, with depth-gated post-draft stages 3.5/3.7/3.8/3.9; Refine; Update each have their own). Create one task per phase with your agent's task-tracking tool; mark each completed as soon as it finishes.

## Phase 0: Load Context {#load-context}

1. Follow `../_shared/pipeline-setup.md` Section 0 (canonical inline block) to read `.pmos/settings.yaml`, resolve `{docs_path}`, and load workstream context. If settings.yaml is missing, run first-run setup per Section A.
2. Read `~/.pmos/learnings.md` if it exists. Note entries under `## /artifact` and factor them into this session.
3. Ensure `~/.pmos/artifacts/` exists. If not, create the empty tree `~/.pmos/artifacts/{templates,presets}/`.
4. Determine the subcommand and route to the appropriate phase. Default subcommand is `create`.
5. **Resolve `output_format`.** Read `output_format` from `.pmos/settings.yaml` (default: `html`; valid values: `html`, `md` — a legacy `both` value is treated as `html`; the mixed-format MD sidecar is retired, see lineage). A `--format <html|md>` argument-string flag overrides settings (last flag wins on conflict). Print to stderr exactly: `output_format: <value> (source: <cli|settings|default>)` once at Phase 0 entry. Controls the **feature-folder write phase only**; the template store at `~/.pmos/artifacts/templates/<slug>/template.md` retains MD shape regardless of output_format (template-store carve-out).
6. **Resolve `{depth}`** (the master dial — gates pipeline stages AND section count). Precedence: `--depth brief|standard|deep` flag > `--tier` back-compat alias (`lite`→`brief`, `full`→`standard`) > `.pmos/settings.yaml :: artifact.default_depth` > builtin default **`standard`**. Print to stderr exactly: `depth: <value> (source: <cli|alias|settings|default>)` once at Phase 0 entry. `{depth}` drives: Step 3 section mapping (`brief`→template `lite` set; `standard`/`deep`→`full` set), the Step 7.5 research gate (`deep`), the Phase 3.5 persona gate (`standard`+`deep`), the Phase 3.7 diagram gate (`deep`, or the saved `artifact.diagram_pass` preference), and the Phase 3.9 `/grill --depth` passthrough. The post-draft `/polish` (3.8) and `/grill` (3.9) run at **every** depth.

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

## Phase 1: Subcommand Routing {#routing}

| Argument shape | Route to |
|---|---|
| `(empty)` | Phase 2 (`#create`), step 1 — type picker |
| `<type>` (one word matching a template slug; `create <type>` accepted as synonym) | Phase 2 (`#create`) |
| `refine <path>` | Refine flow (`#refine`) |
| `update <path>` | Update flow (`#update`) |
| `template add` \| `list` \| `remove <slug>` | Template Management (`#template-management`) |
| `preset add` \| `list` \| `remove <slug>` | Preset Management (`#preset-management`) |

If `<type>` doesn't match any template slug (built-in or user), list available templates and offer fuzzy match before erroring.

Recognized flags on create:
- `--depth brief|standard|deep` — the master dial (stage gating + section count); default `standard`
- `--preset <slug>` — bypass default preset selection
- `--feature <slug>` — feature-folder selection (pipeline-wide contract; consumed in step 4)
<!-- nl-sugar -->
- `--tier lite|full` — retired back-compat alias of `--depth` (`lite`→`brief`, `full`→`standard`); parsed, not advertised

## Phase 2: Create Flow {#create}

The same core flow applies to every artifact type — built-in or user-defined. Steps 1.5 (propose-template) and 7.5 (research) are conditional; the post-draft pipeline stages (Phases 3.5 persona panel, 3.7 diagram pass, 3.8 /polish, 3.9 /grill) are gated by `{depth}`.

### Step 1 — Type picker (only when invoked with no `<type>` argument)

<!-- defer-only: free-form -->
Use `AskUserQuestion` to ask which type to create. Build options dynamically by listing all templates from:
- `templates/` in this skill dir (built-in)
- `~/.pmos/artifacts/templates/` (user)

Show source label `[built-in]` / `[user]` next to each. After selection, set `<type>` and proceed to step 2.

### Step 1.5 — Propose a template when none matches

If `<type>` resolves to **no** built-in or user template (the Step 2 lookup would fail), offer to author one instead of erroring:

<!-- defer-only: ambiguous -->
```
question: "No template matches '<type>'. Propose one, or pick an existing template?"
options:
  - Propose a new template (Recommended)
  - Pick an existing template
  - Cancel
```

`(Recommended)` = Propose. On Propose, run the research-grounded authoring flow from `#template-management` (T.1–T.6) **inline** — research subagent + section alignment + eval-gen — graded against `reference/new-template-guidelines.md`. When proposing, also ask for the **`length_target`** (one of the T.4 frontmatter questions; e.g. `~1500 words` / `tight`). The proposed template is used for this run regardless; **saving** it to `~/.pmos/artifacts/templates/` is offered only if it clears the guidelines' save-checklist, and that save prompt's Recommended option is **No** (avoid a junk template library — `new-template-guidelines.md` §save-checklist). On Pick-existing, return to the Step 1 picker; on Cancel, exit.

`--quick` short-circuits the research subagent (scaffold-only), as in `#template-management`.

### Step 2 — Resolve & validate template

1. Look up `<type>` in built-in templates first; if not found, in `~/.pmos/artifacts/templates/`. (Built-in always wins on slug — user templates use unique slugs by construction.) **No match → route to Step 1.5** (propose) rather than erroring.
2. Read `template.md` frontmatter and `eval.md`.
3. **Validate:**
   - Both files exist.
   - Frontmatter parses; required fields present: `name`, `slug`, `description`, `tiers`, `default_preset`, `files_to_read`.
   - Every section ID referenced in `eval.md` (e.g., `## §2`) exists in `template.md`.
   - If validation fails: stop, surface the specific error, do not proceed.

### Step 3 — Section set (from `{depth}`)

The section count is derived from `{depth}` (resolved in `#load-context` step 6) — there is no separate tier prompt. If `template.md` frontmatter `tiers: [lite, full]`:
- `{depth} == brief` → use the template's **`lite`** section set.
- `{depth} ∈ {standard, deep}` → use the **`full`** section set.

This is deterministic — no `AskUserQuestion` (the user already chose via `--depth`, or accepted the `standard` default). If a child auto-detect signal (e.g. a `>1500`-word `01_requirements*` doc with a `brief` depth) strongly contradicts the chosen depth, surface a one-line note (`depth brief but rich upstream context — consider --depth standard`) and proceed with the chosen depth; never override the user's dial.

If `tiers: [single]`, skip this step.

### Step 4 — Resolve feature folder

Follow `../_shared/pipeline-setup.md` Section B (feature-folder rules) with:
- `skill_name=artifact`
- `feature_arg=<value of --feature flag if any>`
- `feature_hint=<short feature name from user input or current type>`

Returned path becomes `{feature_folder}` for the rest of this run.

### Step 5 — Auto-consume upstream artifacts

For each entry in `template.md` frontmatter `files_to_read`:
- If `pattern:`, expand `{feature_folder}` and glob; read every match.
- If `source: product-context`, use the workstream content already loaded in Phase 0.
- If `source: user-args`, treat any file paths in the user's invocation as attached.

Concatenate all read content into a `gathered_context` block, tagged by source label.

### Step 6 — Gap interview

1. Filter `eval.md` items where `kind: precondition` AND the item's `tier:` includes the selected tier (or includes `single`).
2. For each precondition item, do a semantic check: does anything in `gathered_context` satisfy the item's `check`?
   - Use LLM judgment, not regex. Be generous — if the evidence is plausibly present, mark it satisfied.
3. For UNSATISFIED items only, queue the item's `gap_question`.
<!-- defer-only: free-form -->
4. Batch queued questions ≤4 per `AskUserQuestion` call. Use multiple sequential calls if >4.
5. Append answers to `gathered_context` tagged `gap_answer:<criterion_id>`.

### Step 7 — Preset selection

1. If `--preset <slug>` flag, use it.
2. Otherwise read `template.md` frontmatter `default_preset`.
<!-- defer-only: ambiguous -->
3. Confirm with the user via `AskUserQuestion` showing the 4 built-in presets + any user presets, with `default_preset` marked `(default)`.

Load the chosen preset's rendering rules and voice notes for use in step 8.

### Step 7.5 — Research phase (gated on `--depth deep`)

When `{depth} == deep`, run the research stage before drafting per `reference/research-phase.md` — it owns the warrant check (auto-skip when internal context suffices), the user-approved research plan, the `general-purpose` subagent fan-out (verifiable-URLs-only, omit-rather-than-guess), and the save to `<feature_folder>/research/<slug>-research.md` (a loose markdown sidecar — not indexed/commentable). At `brief`/`standard`, skip with `research: skipped (depth=<d>)`. The synthesized research doc is folded into `gathered_context` for Step 8.

### Step 8 — Generate draft

Generate the artifact section-by-section using `template.md` section ordering and per-section guidance comments, the selected preset's rendering rules, and `gathered_context` (auto-read + gap answers + any `research/<slug>-research.md` from Step 7.5, with per-claim citations preserved). When the template carries a `length_target`, treat it as **informational steering** — aim for it but never pad or truncate to hit it (per the /primer word-target learnings; the natural length wins).

**Author the HTML body directly** — no MD→HTML conversion step happens at write time, identical to how `/spec` and `/plan` author HTML from outline. Wrap each `## §N` section as `<section id="...">` containing `<h2 id="...">` per `_shared/html-authoring/conventions.md` §3 (kebab-case ids; level-3 subsections become `<h3 id="...">` inside the same `<section>`). The MD template is the *structural* guide, not a rendered source.

**Emit per the `_shared/html-authoring/README.md` checklist** (substrate at `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/`). Deltas: artifact = `{feature_folder}/{slug}.html` (e.g. `prd.html`, `experiment-design.html`) + companion `{slug}.sections.json` built via `node {feature_folder}/assets/build_sections_json.js {slug}.html.tmp > {slug}.sections.json.tmp`, both written atomic temp-then-rename; `{{pmos_skill}}` = `artifact` — the emitted `<meta name="pmos:skill" content="artifact">` routes `/comments` resolver dispatches, so it MUST be set; save path = `{feature_folder}/`, asset prefix `assets/`. The checklist's idempotent asset copy ships the inline-comments overlay (`comments.js`, `comments.css`, launcher trio) along with the viewer assets — the checklist owns that list; regenerate `{feature_folder}/index.html` per `index-generator.md` after the write.

**Pre-rename assertion:** before the `rename(2)` step of the atomic write, verify every `<h2>`/`<h3>` and every `<section>` wrapper in `{slug}.html.tmp` carries an `id` attribute — heading ids are load-bearing (sections.json, comment anchoring, and `/verify`'s heading-id smoke all depend on them). On a miss: hard-fail the step-8 write and surface the soft-phase failure dialog (Retry / Pause / Abort); Retry re-invokes the LLM with an explicit reminder of conventions.md §3.

Include a frontmatter block at the top of the HTML `<main>` body as a `<script type="application/json" id="pmos-frontmatter">` element carrying the artifact's metadata — fields: `type`, `tier`, `preset`, `generated_at` (`<YYYY-MM-DD>`), `template_version` (`pmos-toolkit@<plugin-version>`), `sources` (e.g. `["01_requirements.html", "workstream:product-x"]`). Legacy MD-only mode: a YAML triple-dash frontmatter block at the top of the .md file with the same fields.

Then proceed to Phase 3.

## Phase 3: Self-Refinement Loop {#refinement-loop}

Dispatcher side of `_shared/reviewer-protocol.md` (chrome-strip input, quote-grounded findings, parent-side validation, 2-loop cap). Mirrors the `/wireframes` refinement-loop pattern.

### Loop iteration

1. **Pre-dispatch input prep.** When primary is HTML, chrome-strip the draft so the reviewer spends its tokens on substance, not toolbar/footer/`<head>` chrome — algorithm and edge cases in `_shared/html-authoring/chrome-strip.md`:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/chrome-strip.js {slug}.html > /tmp/artifact-reviewer-input.html
   ```
   When primary is legacy MD (`output_format=md`), skip this step and pass the raw `.md` file contents instead.

2. **Dispatch reviewer subagent** (`general-purpose`, foreground — findings are needed before proceeding). Inputs: `reviewer-prompt.md` (system instructions — it enforces the JSON contract; never invoke the reviewer with a different prompt), the full `eval.md` for this template, the companion `{slug}.sections.json`, and the chrome-stripped draft (or raw MD for legacy mode). The subagent returns JSON findings, each shaped `{section, criterion_id, severity, finding, suggested_fix, quote}`.

3. **Validate the reviewer return before applying any fix** (parent-side, per `_shared/reviewer-protocol.md`):
   1. Load `{slug}.sections.json`; collect ids into `known_ids`.
   2. Every `finding.section` ∈ `known_ids` (kebab-case match; tolerate trivial §N-stem derivation). On miss: hard-fail `[/artifact] reviewer-return violation: section "{section}" not in sections.json: missing=[…]`.
   3. Every `finding.quote` is a ≥40-char **verbatim substring** of the raw (un-stripped) `{slug}.html` source — substring-grep it. On miss: hard-fail `[/artifact] reviewer-return violation: quote not found in {slug}.html: {quote-prefix-30char}…`.

   On any hard-fail: surface the soft-phase failure dialog (Retry / Pause / Abort). Retry re-dispatches the reviewer with the same prompt (idempotent — the reviewer-prompt.md contract is stable).

4. **Auto-apply** all `high` and `medium` findings via `Edit` against the draft file — the reviewer prompt requires fixes specific enough to apply literally (use the `quote` field as the `old_string` anchor when applicable). **Log** all `low` findings to an in-memory `_residuals` accumulator — never silently fix them.

5. **Post-loop companion re-emit.** After all fixes for this iteration have been applied (and again after all iterations conclude — once is sufficient), re-emit the companion from the live (post-edit) HTML:
   ```bash
   node {feature_folder}/assets/build_sections_json.js {slug}.html > {slug}.sections.json.tmp
   mv {slug}.sections.json.tmp {slug}.sections.json
   ```
   Atomic via temp-then-rename. Failures fall through to the soft-phase failure dialog. (Legacy `output_format=md` path skips this — sections.json is HTML-specific.)

### Loop continuation

If any `high` findings remained AFTER applying loop-1 fixes (should be rare; the reviewer should regenerate the section), run loop 2. Hard cap: **2 loops total** — the protocol default, a cost governor, not a quality gate: cap-hit means surface residuals to the user, never a 3rd loop "just in case".

### Residual presentation

After loop 2 (or loop 1 if no high remain):

<!-- defer-only: ambiguous -->
Present any `high` still remaining + all `medium` from loop 2 + any `low` deemed worth raising per `_shared/findings-dispositions.md` (severity tags, ≤4 findings per `AskUserQuestion` batch, the four dispositions, platform fallback — all canonical there). `/artifact` delta: **Defer** appends the finding to a `## Deferred Improvements` section at the end of the artifact. Apply user-confirmed fixes via `Edit`.

> **Post-draft pipeline stages (Phases 3.5–3.9)** run only on the **create** flow, only in the **main agent** (skills cannot be invoked by a subagent — when `/artifact` itself is dispatched as a subagent, these stages degrade to skip-with-note per `## Platform Adaptation`), and are gated by `{depth}`. Order: persona panel → diagram pass → /polish → /grill.

## Phase 3.5: Persona Panel {#persona-panel}

**Gate:** `{depth} ∈ {standard, deep}` (skipped at `brief`). Multi-stakeholder critique distinct from the Phase 3 eval reviewer — 3–4 personas read the draft in parallel `sonnet` subagents, findings are validated (quote-grounded) and reconciled with the user before the draft updates. The full contract — persona resolution (template `personas:` or recommended), the per-persona subagent brief, parent-side validation, the findings-dispositions reconcile, and the NFR-1 value-signal log line — lives in `reference/persona-panel.md`. Non-interactive: AUTO-PICKs the persona set + Fix-as-proposed for blockers, buffers nits.

## Phase 3.7: Diagram Pass {#diagram-pass}

**Gate:** `{depth} == deep`, OR `.pmos/settings.yaml :: artifact.diagram_pass == true` (skipped otherwise). Propose 1–3 diagrams → user approves → the main agent runs `/diagram --non-interactive --on-failure drop` per diagram → **validate each SVG before inline insert** (parses, has the dark-mode background `<rect>`, and the post-insert heading-id + `build_sections_json.js` + comments-coverage smoke stays green) → insert validated SVGs, drop the rest with a logged note → optionally remember the preference. Full contract in `reference/diagram-pass.md`. Never blind-insert an unvalidated SVG.

## Phase 3.8: Polish {#polish-pass}

**Gate:** always (every `{depth}`). The main agent invokes `/pmos-toolkit:polish <artifact.html> [--non-interactive]` as a finishing pass. `/polish` round-trips the HTML, **auto-applies mechanical findings**, and routes voice-risk/high-risk findings through its own per-finding surface — so "always run" never means "always auto-apply" prose rewrites. Surface the polish summary (mechanical fixes applied, high-risk findings raised). `/polish` is single-doc and cannot be invoked by a subagent — this stage runs only in a main-agent `/artifact` run (see `## Platform Adaptation`).

## Phase 3.9: Grill {#grill-pass}

**Gate:** always (every `{depth}`), scaled by depth. The main agent invokes `/pmos-toolkit:grill <artifact.html> --depth <{depth}> [--non-interactive]`. Interactive → turn-by-turn adversarial interrogation (one light pass at `brief`, deeper at `standard`/`deep`); `--non-interactive` → `/grill` degrades to a written adversarial findings pass (no turn-by-turn) so `/artifact` stays headless-safe. Surface grill's findings; offer high-severity ones as edits via `_shared/findings-dispositions.md`. Grill is mandatory — there is no skip flag (a `brief` depth keeps it to a single light pass).

## Phase 4: Save & Confirm {#save-confirm}

1. The artifact file at `{feature_folder}/{slug}.html` (plus `{slug}.sections.json` companion) already exists from Phase 2 (`#create`) step 8 and was edited in Phase 3.
2. Show the user a one-paragraph summary:
   - Artifact type + tier
   - Preset used
   - Sections written
   - Refinement-loop iterations (1 or 2) and counts: `N high resolved, M medium resolved, K low logged`
   - Residuals deferred (count + names)
3. Offer to `git add` + commit. Do NOT auto-commit. Suggested commit message: `docs({type}): add {tier} {type} for {feature-slug}`.

## Phase 5: Workstream Enrichment {#workstream-enrichment}

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

## Phase 6: Capture Learnings {#capture-learnings}

Read `../_shared/learnings-capture.md` (relative to this skill dir) and follow it. This phase is a **terminal gate** — the skill is not complete until learnings have been processed.

## Refine Flow (`/artifact refine <path>`) {#refine}

Re-run the eval-loop judge on an existing artifact. **Internal QA only — does NOT accept new external feedback.** Refine re-judges *structure and content* against the template's eval.md; for prose/style work (slop, concision, voice), route to `/polish` instead.

<!-- defer-only: ambiguous -->
1. Read the artifact at `<path>`. Parse its frontmatter to determine `type`. If frontmatter is missing or `type` cannot be inferred, ask the user via `AskUserQuestion`.
2. Resolve the template (same lookup + validation as Phase 2 step 2) and load `eval.md`.
<!-- defer-only: destructive -->
3. **Detect primary extension:** `html` or `md` from the filename. Ask the user via `AskUserQuestion`: "Overwrite `<path>` or write to `<path>.refined.<ext>`?" Default = `.refined.<ext>` (safer; mirrors primary format). The refined sibling carries the same shape contract as the primary — `prd.refined.html` gets its own `prd.refined.sections.json` companion; `prd.refined.md` is the legacy path.
4. Run Phase 3 (`#refinement-loop`) against the artifact (or its `.refined.<ext>` copy).
5. Run Phase 4 save & confirm — point at the chosen output path.
6. Skip Phase 5 (no new workstream signals from a re-run).
7. Run Phase 6 learnings capture (terminal gate).

## Update Flow (`/artifact update <path>`) {#update}

Apply stakeholder feedback to an existing artifact. **Distinct from refine — this is a stakeholder loop, not internal QA.**

### Phase U.1 — Accept feedback input

<!-- defer-only: free-form -->
Ask the user via `AskUserQuestion`:
- **Paste comments** — user pastes block of feedback inline.
- **File path** — user provides path to a feedback file (Notion export, email dump, .md notes).
- **Dictate** — user describes feedback conversationally; agent transcribes.

### Phase U.2 — Parse into structured items

Extract each feedback item into the shape `{section, type, content}` — `section` names a `## §N` section, `type` ∈ `edit | expand | trim | question | accept | reject`, `content` is the verbatim feedback or a summary.

<!-- defer-only: free-form -->
For ambiguous items (no clear section, or unclear intent), batch clarifying questions via `AskUserQuestion` (≤4 per call).

For un-mappable items (don't fit any section), append them to a `## General Feedback` section in the artifact and continue.

### Phase U.3 — Apply dispositions

<!-- defer-only: ambiguous -->
Present parsed items per `_shared/findings-dispositions.md` (≤4 per `AskUserQuestion` batch, the four dispositions). Apply approvals via `Edit`. `/artifact` delta: **Defer** appends to `## Deferred Improvements`.

### Phase U.4 — Append Comment Resolution Log

At the bottom of the artifact (inside `<main>`, before any existing `<section id="deferred-improvements">`), append or extend a `<section id="comment-resolution-log">` containing an `<h2 id="comment-resolution-log">Comment Resolution Log</h2>` and a `<table>` with one row per resolved item, columns `Date | Reviewer | Section | Feedback | Resolution` (Resolution = the disposition chosen: Applied / Modified / Skipped / Deferred).

Apply via `Edit` against the HTML file; the post-edit re-emit (Phase 3, step 5) regenerates `sections.json` to include the new id. When primary is legacy MD (`output_format=md`), emit the same table as a markdown `## Comment Resolution Log` section instead.

### Phase U.5 — Optional re-run of refinement / pipeline passes

<!-- defer-only: ambiguous -->
Ask via `AskUserQuestion` (multiSelect): which passes to re-run on the updated artifact — **None (Recommended)** / eval loop (Phase 3) / `/polish` (Phase 3.8) / `/grill` (Phase 3.9). The heavy create-only stages (research 7.5, persona panel 3.5, diagram pass 3.7) are **not** offered here — `update` is a stakeholder-feedback loop, not a re-build (OQ1: the new heavy phases are create-only; `update`/`refine` may re-`/polish` or re-`/grill` only on explicit request). Run each selected pass against the updated artifact.

### Phase U.6 — Save, then learnings capture

Same as Phase 4 + Phase 6 from the create flow (terminal gate).

## Template Management {#template-management}

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
Ask: "Run a dry-run by creating one artifact with this template?" via `AskUserQuestion`. If yes, prompt for a feature folder (or use the most recent), then execute Phase 2 (`#create`) with the new template. User can iterate on sections/evals based on what the dry-run produces.

### `/artifact template list`

Read both built-in (`templates/`) and user (`~/.pmos/artifacts/templates/`) directories. Render a read-only table with columns `Slug | Name | Tiers | Source` (Source = `built-in` / `user`).

### `/artifact template remove <slug>`

1. If `<slug>` is a built-in: refuse with message "Built-in templates cannot be removed."
<!-- defer-only: destructive -->
2. If `<slug>` is a user template: confirm via `AskUserQuestion` (Yes/No), then `rm -rf ~/.pmos/artifacts/templates/<slug>/`. Show the path that was removed.
3. If `<slug>` doesn't exist: list available user templates.

## Preset Management {#preset-management}

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

Write `~/.pmos/artifacts/presets/<slug>.md`: YAML frontmatter (`name`, `description`), then a `# Rendering rules` section (rules from P.2) and a `# Voice` section (rules from P.3) — same shape as the built-in presets in `presets/`.

### `/artifact preset list`

Render built-in + user presets in a table with `Slug | Description | Source`.

### `/artifact preset remove <slug>`

Symmetric to `template remove`. Reject if built-in.

---

## Apply comment-resolver edit {#apply-comment-resolver-edit}

This is the `/artifact` entrypoint that `/comments resolve` dispatches into when walking open threads in an artifact's inline `pmos-comments` JSON block (`<script id="pmos-comments" type="application/json">`). The resolver dispatches a subagent whose tools include this skill's Node shim.

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md` — input/output JSON shapes, resolution order (id-first, then ≥40-char quote-substring fallback), the closed `error_enum`, idempotency rules, subagent invocation convention. Cite it; never restate it.
- **Shim:** `scripts/apply-edit-at-anchor.js` — exports `apply(input)`, returns the contract's success / failure / clarification shapes. Success responses include the optional `applied_artifact` field (full post-edit HTML); the shim's minimal edit inserts an HTML annotation comment immediately before the resolved anchor element — real prose rewriting is deferred to a later feature.
- **Tests:** `tests/apply-edit-at-anchor.test.js` (5 cases: id-first happy, orphan, idempotent, infeasible, clarification) + wrapper `tests/scripts/assert_apply_edit_at_anchor_artifact.sh`.

---

*Spec lineage: `docs/pmos/features/2026-05-02_artifact-skill` (template/eval/preset engine, gap interview, 2-loop cap), `2026-05-13_artifact-html-output` (HTML-output parity FR-1–FR-8 + FR-12 output_format; the pre-rename assertion and reviewer-return validation are grill hardenings D1/D2 there), `2026-05-09_html-artifacts` (emit substrate, index regeneration — that folder's FR-22), `2026-05-23_inline-doc-comments` + `2026-05-28_inline-html-artifacts` (comment resolver — that folder's distinct FR-22, plus FR-30/FR-60 — inline comment persistence, and the retirement of the `output_format=both` MD sidecar per FR-12.1), `2026-05-08_non-interactive-mode` (mode contract). Traceability for individual rules lives in those feature folders, not inline here.*
