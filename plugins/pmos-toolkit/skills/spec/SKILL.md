---
name: spec
description: Create a detailed technical specification from a requirements document — architecture, API contracts, DB schema, frontend design, testing strategy, verification plan. Second stage in the requirements -> spec -> plan pipeline. Auto-tiers by scope. Use when the user says "write the technical design", "design the system", "create the spec", "how should this work technically", or has a requirements doc ready for detailed design.
user-invocable: true
argument-hint: "<path-to-requirements-doc or requirements text> [--feature <slug>] [--backlog <id>] [--skip-folded-sim-spec] [--format <html|md|both>] [--non-interactive | --interactive]"
---

# Technical Specification Generator

Create a comprehensive technical specification from a requirements document. The spec defines HOW we're building it — architecture, API contracts, database design, frontend components, and verification strategy. This is the SECOND stage in a 3-stage pipeline:

```
/requirements  →  [/msf-req, /creativity]  →  /spec  →  [/simulate-spec]  →  /plan  →  /execute  →  /verify
                   optional enhancers     (this skill)    optional validator
```

A spec is prescriptive about WHAT and WHY, but leaves room for engineering judgment on internal implementation details. It should be detailed enough that a competent engineer with subject expertise could implement it from the doc alone.

**Announce at start:** "Using the spec skill to create a detailed technical specification."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** State your assumption, document it in the output, and proceed. The user reviews after completion.
- **No subagents:** Perform research and analysis sequentially as a single agent.
- **No Playwright MCP:** Note browser-based verification as a manual step for the user.

---

## Backlog Bridge

This skill optionally integrates with `/backlog`. See `plugins/pmos-toolkit/skills/backlog/pipeline-bridge.md`.

**At skill start:**
- If `--backlog <id>` was passed: load the item file as supplementary context.
- If no argument provided AND `<repo>/backlog/items/` has items with status=ready: run the auto-prompt flow.

**At skill end (after writing the spec doc):**
- If `<id>` was set, invoke `/backlog set {id} spec_doc={doc_path}`, then `/backlog set {id} status=spec'd` (only if current status is `inbox` or `ready`). On failure, warn and continue.

---

## Phase 0: Pipeline Setup (inline — do not skip)

Use workstream context (loaded by step 3 below) to inform technical decisions — product constraints, tech stack, and stakeholder concerns shape architecture choices. The skill supports users who enter the pipeline at `/spec` (folder will be created in step 4 if needed).

<!-- pipeline-setup-block:start -->
1. **Read `.pmos/settings.yaml`.**
   - If missing → you MUST invoke the `Read` tool on `_shared/pipeline-setup.md` Section A and run first-run setup before proceeding. (Skipping this Read is the most common cause of folder-naming defects.)
2. Set `{docs_path}` from `settings.docs_path`.
3. If `settings.workstream` is non-null → load `~/.pmos/workstreams/{workstream}.md` as context preamble; if frontmatter `type` is `charter` or `feature` and a `product` field exists, also load `~/.pmos/workstreams/{product}.md` read-only.
4. Resolve `{feature_folder}`:
   - If `--feature <slug>` was passed → glob `{docs_path}/features/*_<slug>/`. **Exactly 1 match required**; on 0 or 2+ → you MUST `Read` `_shared/pipeline-setup.md` Section B before acting.
   - Else if `settings.current_feature` is set AND `{docs_path}/features/{current_feature}/` exists → use it.
   - Else → ask user (offer: create new with derived slug, pick existing from folder list, or specify via Other...).
5. **Edge cases — you MUST `Read` `_shared/pipeline-setup.md` Section B before acting:** slug collision, slug validation failure, legacy date-less folder encountered, ambiguous `--feature` lookup, any folder creation.
6. Read `~/.pmos/learnings.md` if present; note entries under `## /<this-skill-name>` and factor them into approach (skill body wins on conflict; surface conflicts to user before applying).
<!-- pipeline-setup-block:end -->

### Phase 0 addendum: output_format resolution (FR-12)

7. **Resolve `output_format`.** Read `output_format` from `.pmos/settings.yaml` (default: `html`; valid values: `html`, `md`, `both`). A `--format <html|md|both>` argument-string flag overrides settings (last flag wins on conflict, per FR-12). Print to stderr exactly: `output_format: <value> (source: <cli|settings|default>)` once at Phase 0 entry. The numbering continues from the pipeline-setup-block above (which ends at step 6).

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

## Phase 1: Intake & Tier Detection

1. **Locate the requirements.** Follow `_shared/resolve-input.md` with `phase=requirements`, `label="requirements doc"`.
2. **Read the requirements end-to-end.** Confirm understanding with the user — summarize the problem, goals, non-goals, and key decisions already made.
3. **Check for existing spec.** Use `_shared/resolve-input.md` with `phase=spec`, `label="prior spec"` to locate either `{feature_folder}/02_spec.html` (preferred) or `{feature_folder}/02_spec.md` (legacy fallback).
   - If found: read it, ask the user if this is an update or fresh start.
   - If not found: proceed.
<!-- defer-only: ambiguous -->
4. **Detect the tier.** If the requirements doc has a `Tier:` tag in its frontmatter or header, **carry it forward without asking**. If it is untagged, OR the user entered the pipeline at `/spec` without a requirements doc, assess the tier from the table below and **confirm with the user via `AskUserQuestion`** before proceeding (recommend the assessed tier as option 1).

| Tier | Scope | Sections | Length |
|------|-------|----------|--------|
| **Tier 1: Bug Fix / Minor Enhancement** | Isolated fix or small change | Problem, Root Cause Analysis, Fix Approach, Decision Log (lightweight), Edge Cases, Testing Strategy | ~1-2 pages |
| **Tier 2: Enhancement / UX Overhaul** | Improving existing behavior, adding to existing surface | Problem, Goals, Decision Log, Relevant FR tables, API changes (if any), Frontend Design (if any), Edge Cases, Testing Strategy | ~3-6 pages |
| **Tier 3: Feature / New System** | New capability, new surface, major redesign | ALL sections mandatory including Architecture diagrams, Sequence diagrams, Full FR/NFR tables, API contracts, DB schema (SQL), Frontend design, Feature flags, Rollout strategy | ~6-15 pages |

**Announce:** "This looks like a Tier N spec. Using the [tier name] template." (When the tier was carried forward from a tagged requirements doc, no confirmation question is needed — just announce.)

5. **Detect the `type:`.** Set the spec's `type` frontmatter (per the templates) using this precedence (FR-05, FR-112):
   - **`--backlog <id>` was passed** → read the backlog item's `type:` field and map to a spec `type`: `bug → bugfix`, `feature → feature`, `enhancement → enhancement`, `chore → enhancement`, `docs → enhancement`, `spike → feature`. Carry forward without asking.
   - **Requirements doc has a `type:` tag** in frontmatter → carry forward without asking.
   <!-- defer-only: ambiguous -->
   - **Otherwise** → confirm with the user via `AskUserQuestion` with options `bugfix` / `enhancement` / `feature` (recommend the option implied by the tier: Tier 1 → bugfix, Tier 2 → enhancement, Tier 3 → feature).

   Persist `type` into the spec frontmatter (per the Tier N Template above). /plan FR-104a permits per-task TDD overrides keyed off this `type` and logs them as decisions.

**Gate:** Do not proceed until you have confirmed understanding of the requirements and (where required) the user has confirmed the tier and `type`.

---

## Phase 2: Research

**Tier 1:** Read the specific files/functions involved in the bug. No broader research needed.

**Tier 2-3: Dispatch up to 2 subagents in parallel.** Each has an explicit return contract:

### Subagent A — Existing Implementation & Patterns
**Always run for Tier 2-3.** Returns:
- File paths + 1-line summaries of code areas the spec will impact
- Current architecture patterns, data models, API conventions in use
- Test patterns from adjacent features (file paths)
- Reusable components/utilities/infrastructure already available

### Subagent B — Industry Research & Alternatives
**Tier 3: always run.** **Tier 2: run only when the design has a non-obvious architectural choice** (e.g., queue vs. webhook vs. polling; relational vs. document; sync vs. async; new infrastructure component). Skip for routine UX overhauls and additive enhancements on an established stack — state explicitly in the spec why you skipped.

Returns:
- **Comparables table:** 2–4 (T3) or 2 (T2) named examples — products, OSS projects, engineering blog posts. Architecture used + documented trade-offs.
- **Alternatives table:** 3+ (T3) or 2 (T2) materially different design shapes with trade-offs (complexity, latency, cost, failure modes, operational burden).
- Established patterns / frameworks / standards that apply, with a build-vs-adopt recommendation.
- Known failure modes / anti-patterns from comparable systems (scaling cliffs, consistency bugs, migration pain).
- For Tier 3: explicit recommendation + rejected-alternatives section.

### Reconciliation
After both subagents return, reconcile any conflicts (e.g., A says "we already have a queue" but B recommends webhooks) explicitly in the Decision Log of the spec — do not silently pick one.

Track all sources in the Research Sources table of the spec.

---

## Phase 3: Multi-Role Interview

<!-- defer-only: ambiguous -->
Act as each role IN SEQUENCE. For each role, identify gaps, risks, and missing details. Use AskUserQuestion to ask questions — batch related questions from the same role into a single call (up to 4), but do not mix questions across roles.

**Do NOT ask questions for the sake of asking.** Only ask what genuinely helps create the specification. State assumptions rather than asking obvious questions. The number of questions per role should match the number of genuine gaps — zero is fine (announce the role and state why), five is fine if all five matter.

**Tier 1:** Skip this phase — bug fixes don't need multi-role review.

**Tier 2:** Use 2-3 relevant roles.

**Tier 3:** Use all applicable roles.

### Roles, Ordering & Focus Areas

Run roles in this order. Each role's decisions inform the next — architecture constrains schema, schema constrains APIs, APIs constrain frontend, user flows validate the full stack, deployment wraps everything.

| Order | Role | Focus | Skip if... |
|-------|------|-------|------------|
| 1 | **Principal Architect** | System boundaries, service interactions, data flow, deployment model | No new services or data flows |
| 2 | **Database Administrator** | Schema design, migrations, indexes, query patterns, data integrity | No DB changes |
| 3 | **Principal Designer** | UI components, state management, design tokens, user interactions, responsive behavior | No frontend changes |
| 4 | **Product Director** | User personas, user flows, edge cases, empty states, first-time experience | Already thorough in requirements |
| 5 | **DevOps Engineer** | Deployment, configuration, feature flags, monitoring, rollout strategy | Tier 1-2 |
| 6 | **Senior Analyst** | Functional & non-functional requirements coverage, acceptance criteria, success metrics — final gap sweep | Tier 1 |

**Why this order:** Architect establishes the system shape (containers, protocols, service boundaries). DBA designs the schema within those boundaries. Designer builds the frontend knowing what data and APIs exist. Product Director validates that the technical decisions serve user flows. DevOps wraps deployment around the full picture. Analyst does a final coverage check.

### Data Flow Trace (conditional)

**When the feature involves a write→read pipeline** (search indexing, background processing, sync, export, import, caching, aggregation — anything where data written in one flow is consumed in another), the Architect role must produce a data flow trace:

1. Name the **write entry point** (e.g., `add_book()`)
2. Name the **storage target** (e.g., `search_index` table, cache key, queue)
3. Name the **read entry point** (e.g., `SearchService.search()`)
4. **Verify each link exists** in the current codebase with a grep or file read — not assumption
5. If any link is missing, flag it as a **gap to implement** in the spec

**Trigger (property-based):** Run the data flow trace whenever the feature has the property *"data persisted by one code path is consumed by a different code path."* This includes — but is not limited to — search/indexing, notifications, feeds, digests, audit logs, sync, export, import, queues, caches, aggregations, and report generation. Skip for purely CRUD-on-a-single-entity features or purely UI/UX changes that don't introduce new persistence-to-read flows. When in doubt, run the trace — it's cheap.

**When to adjust:** If the project is primarily a frontend/UX change with minimal backend work, move Designer to position 2 (before DBA) — the UX may drive what data needs to be stored. State your reordering rationale when you announce the first role.

For Tier 2 (2-3 roles), pick from this list in order — don't jump to role 5 while skipping role 2.

### Role Protocol (MANDATORY for Tier 2-3)

For each role with **at least one genuine question or stated assumption**:
1. **Announce:** "Speaking as [Role]:"
<!-- defer-only: ambiguous -->
2. Ask 1-2 specific questions via `AskUserQuestion` (batch up to 4 within the same role) OR state the assumption you're proceeding with as a Decision-Log entry.
3. Note answers or stated assumptions as decisions for the spec.
<!-- defer-only: ambiguous -->
4. **If the user picks a non-recommended option** in any `AskUserQuestion` you issued for this role, before moving to the next role ask: "Does this choice change any existing invariant or contract? If yes, capture it as a Decision-Log entry with the trade-off explicit." See `../_shared/structured-ask-edge-cases.md` §2.

For roles with **no genuine questions** — do NOT announce inline. Instead, at the end of Phase 3, emit a single **"Roles considered, no questions"** block:

```text
Silent roles considered:
- DBA — no schema changes; covered by §X of requirements
- DevOps — Tier 2, deployment unchanged
- Senior Analyst — FR coverage already validated by Architect role
```

Each silent-role entry MUST cite the specific reason (which requirements section, or which earlier role's answer, makes this role's concerns moot). The user gets the same audit trail without per-role chat noise.

**Anti-pattern:** Silently skipping a role with no entry in the silent-roles block. The "Skip if..." column in the role table is the ONLY valid reason to omit a role from BOTH the inline interview AND the silent-roles block.

---

## Phase 4: Verification Plan Sketch

Before writing the spec, sketch HOW each major requirement will be verified, and **emit the sketch in chat for the user to confirm or push back on**. This is a CORE part of the spec, not an afterthought — surfacing it as a chat artifact (rather than a thinking-only step) catches under-thought verification when it's still cheap to fix.

Format:

```markdown
**Verification plan sketch (Phase 4):**

| Requirement | Verification approach |
|-------------|----------------------|
| FR-01 | Unit test: assert X given Y; integration test: hit /endpoint and verify Z |
| FR-02 | Playwright flow: log in → navigate → assert visible element |
| NFR-01 (perf) | k6 script targeting /api/foo at 100 RPS; assert p95 < 200ms |
```

Good verification patterns to draw from:
- Automated unit + integration tests with specific assertions
- CLI scripts to verify APIs before building frontend
- Playwright MCP for end-to-end frontend flow testing
- Linting and static analysis checks
- Synthetic data scenarios that exercise edge cases
- Before/after comparison reports

**Gate:** Wait for user acknowledgment of the sketch before moving to Phase 5. If the user pushes back on an approach, revise inline; do not write the spec until the sketch is accepted.

---

## Phase 5: Write the Spec

Save to `{feature_folder}/02_spec.html` per the substrate at `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/`.

**Atomic write (FR-10.2):** write `02_spec.html` and the companion `02_spec.sections.json` via temp-then-rename — never serve a half-written file.

**Asset substrate (FR-10):** copy `assets/*` from `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/` to `{feature_folder}/assets/` if not already present. The substrate currently includes `style.css`, `viewer.js`, `serve.js`, `build_sections_json.js`, and the inline-doc-comments substrate (FR-01, FR-40): `comments.js`, `comments.css` (via `cp -n`), plus the launcher trio `comments-open.command` and `comments-open.sh` (both via `install -m 0755` so the bits survive the copy) and `comments-open.bat` (`cp -n`). New substrate files added in future releases ride along automatically without per-skill prose updates. Idempotent — `cp -n` (no-clobber) or `rsync --update` skips identical files; on initial setup an unconditional `cp assets/* feature_folder/assets/` is fine.

**Comments meta tag (FR-01, FR-40):** set `{{pmos_skill}}` to `spec` when expanding `template.html` so the emitted artifact carries `<meta name="pmos:skill" content="spec">`. The `/comments` resolver routes apply-edit dispatches via this meta tag, so it MUST be set per-skill.

Per-file copy posture for the comments substrate (each on its own line so the cp/install invocation is unambiguous):

```bash
cp -n  "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments.js"          "{feature_folder}/assets/"
cp -n  "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments.css"         "{feature_folder}/assets/"
install -m 0755 "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments-open.command" "{feature_folder}/assets/comments-open.command"
install -m 0755 "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments-open.sh"      "{feature_folder}/assets/comments-open.sh"
cp -n  "${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/comments-open.bat"    "{feature_folder}/assets/comments-open.bat"
```

**Asset prefix (FR-10.1):** the per-folder relative asset prefix for top-level feature-folder artifacts is `assets/`.

**Cache-bust (FR-10.3):** append `?v=<plugin-version>` to all asset URL references emitted into the HTML (the substrate `template.html` already does this for the loader pair; skill-emitted inline `<link>` / `<script>` references must follow suit).

**Heading IDs (FR-03.1):** every `<h2>` and `<h3>` MUST carry a stable kebab-case `id`. See "Templates → Heading IDs" below.

**Index regeneration (FR-22, §9.1):** after the artifact write completes, regenerate `{feature_folder}/index.html` by inlining the manifest per `_shared/html-authoring/index-generator.md` (no on-disk `_index.json` is written; the manifest is inlined as `<script type="application/json" id="pmos-index">`, FR-41). Honour the §9.1 phase-rank ordering policy.

**Mixed-format sidecar (FR-12.1):** retired — `output_format=both` is treated as `html` until a future feature re-introduces MD export.

**Before overwriting an existing spec:** if `{feature_folder}/02_spec.html` (or legacy `02_spec.md`) exists AND has uncommitted changes (check `git status --porcelain "{feature_folder}/02_spec.{html,md}"`), commit it first:

```bash
git add "{feature_folder}/02_spec.html" "{feature_folder}/02_spec.sections.json" "{feature_folder}/02_spec.md"
git commit -m "docs: snapshot prior spec before /spec rewrite"
```

(`git add` on a non-existent path is a no-op, so legacy MD-only folders still snapshot cleanly.)

This makes git the backup; the rewrite then proceeds normally with `Write` (no `.bak` files needed). If the file exists but is already committed, no pre-commit is needed — just proceed.

### Status Field Lifecycle

All templates start at `**Status:** Draft`. The status is promoted to `**Status:** Ready for Plan` only on user confirmation in Phase 7 (see that phase). Downstream skills (`/simulate-spec`, `/plan`) check this field and warn the user if invoked against a `Draft` spec.

### Heading IDs

**Heading IDs (FR-03.1, enforced by `/verify`).** Every `<h2>` and `<h3>` carries a stable kebab-case `id`. Compute via `_shared/html-authoring/conventions.md` §3 — lowercase the heading text, replace every non-alphanumeric run with a single `-`, trim leading/trailing `-`, dedupe collisions with `-2`/`-3`/... suffixes. Stable IDs let cross-doc anchors (`02_spec.html#fr-10`, `03_plan.html#t8`) resolve deterministically across regenerations. `assert_heading_ids.sh` (T22) blocks any artifact missing an id. The `<h1>` is emitted by `template.html` and never appears inside `{{content}}` — do not add an id to it. The Tier templates below render to HTML via the substrate; when output_format resolves to `html`, the `## ` markdown headings become `<h2 id="...">` per the algorithm above.

### Diagram Emission via `/diagram` Subagent (FR-60..FR-65, D2)

Architecture diagrams (§6.1) and sequence diagrams (§6.2) are emitted by dispatching `/pmos-toolkit:diagram` as a **blocking Task subagent** — never authored inline as a first attempt. The subagent renders Mermaid source to SVG via the upstream renderer and writes to `{docs_path}/diagrams/<slug>.svg`; the spec's HTML body references that SVG via `<img>` (or inlines it). This isolates rendering failure modes (network timeouts, mermaid-cli crashes) from the spec writer.

**Per-diagram dispatch (FR-60, FR-61):**

```
Task tool dispatch:
  skill: /pmos-toolkit:diagram
  args:
    --theme technical
    --rigor medium
    --out {docs_path}/diagrams/<slug>.svg
    --on-failure exit-nonzero
  blocking: true
  per-call timeout: 300s
```

**Retry loop (FR-62):** up to 2 retries on per-call timeout or non-zero exit (3 attempts total per diagram). Each retry re-dispatches the same args; do not mutate the prompt between attempts.

**Inline-SVG fallback (FR-63):** after 3 failed attempts on a single diagram, author the SVG inline via this skill's own prompt as a last resort. Mark the figcaption explicitly so reviewers know the provenance.

**Wall-clock cap (FR-64):** maintain a per-skill-run accumulator `diagram_subagent_state` in skill state with fields `{elapsed_s: 0, attempts: {}, cap_hit: false}`. Increment `elapsed_s` after every dispatch (success or failure) by the wall-clock seconds spent. When `elapsed_s >= 1800` (30 min) the cap is hit: skip remaining diagrams' subagent dispatch and fall directly to inline-SVG for any remaining diagrams in the run. The accumulator resets per /spec invocation — never persist across runs.

**Provenance (FR-65):** every emitted `<figure>` MUST carry a `<figcaption>` documenting how the SVG was authored:

- Subagent success: `<figcaption>Authored via /diagram subagent (attempt N).</figcaption>` (N ∈ {1, 2, 3})
- Inline fallback: `<figcaption>Diagram authored inline (subagent failed after 3 attempts).</figcaption>`
- Cap-hit fallback: `<figcaption>Diagram authored inline (30-min subagent cap reached).</figcaption>`

This pattern is canonical across `/spec` and `/plan`. Per spec D2 the blocking-subagent shape (vs. fire-and-forget) is required so the writer doesn't proceed past §6 with a missing diagram.

### Tier 1 Template: Bug Fix / Minor Enhancement

```markdown
---
tier: 1
type: bugfix
feature: <slug>
date: YYYY-MM-DD
status: Draft
requirements: <path-to-01_requirements.{html,md}>
---

# <Bug/Fix Name> — Spec

## 1. Problem Statement
[What's broken, the impact, how to reproduce]

## 2. Root Cause Analysis
[Why it's happening — trace through the code]

## 3. Fix Approach
[What changes, why this approach over alternatives]

## 4. Decision Log
[Lightweight — 1–3 rows expected. Capture the fix-approach choice and any rejected alternatives. Skip the table entirely only if there was exactly one obvious fix with no alternatives considered.]

| # | Decision | Options Considered | Rationale |
|---|----------|-------------------|-----------|
| D1 | [What was decided] | (a) ..., (b) ... | [Why] |

## 5. Edge Cases

| # | Scenario | Condition | Expected Behavior |
|---|----------|-----------|-------------------|
| E1 | [Name] | [Trigger] | [What happens] |

## 6. Testing Strategy
[Exact tests to write, exact verification commands]
```

### Tier 2 Template: Enhancement / UX Overhaul

```markdown
---
tier: 2
type: enhancement
feature: <slug>
date: YYYY-MM-DD
status: Draft
requirements: <path-to-01_requirements.{html,md}>
---

# <Feature Name> — Spec

## 1. Problem Statement
[Restate from requirements + primary success metric]

## 2. Goals

| # | Goal | Success Metric |
|---|------|---------------|
| G1 | [Outcome] | [Measurement] |

## 3. Non-Goals
- [Exclusion] — because [reason]

## 4. Decision Log

| # | Decision | Options Considered | Rationale |
|---|----------|-------------------|-----------|
| D1 | [What] | (a) ..., (b) ... | [Why] |

## 5. User Journeys
[Key flows with diagrams if 3+ branches]

## 6. Functional Requirements

### 6.1 [Area]

| ID | Requirement |
|----|-------------|
| FR-01 | [Specific, testable] |

## 7. API Changes (if any)
[Endpoint, request, response, errors]

## 8. Frontend Design (if any)
[Component hierarchy, state, interactions]

## 9. Edge Cases

| # | Scenario | Condition | Expected Behavior |
|---|----------|-----------|-------------------|

## 10. Testing & Verification Strategy
[What to test, how, exact commands]

<!-- Required only when /spec Phase 6.6 auto-upgrade fires (a previously-unseen module was declared) -->
## 11. Modules (optional at Tier-2)

<section id="modules">

| Module | Owner | Purpose |
|--------|-------|---------|
| <module-name> | <team or path> | <one-line purpose> |

</section>

<!-- Required only when /spec Phase 6.6 auto-upgrade fires -->
## 12. Architectural Assertions (optional at Tier-2)

<section id="architectural-assertions">

- <module-name> MUST <invariant phrased as a checkable rule>.
- <module-name> MUST NOT <forbidden coupling or escape hatch>.

</section>
```

### Tier 3 Template: Feature / New System

```markdown
---
tier: 3
type: feature
feature: <slug>
date: YYYY-MM-DD
status: Draft
requirements: <path-to-01_requirements.{html,md}>
---

# <Feature Name> — Spec

---

## 1. Problem Statement
[Restate from requirements. 2-4 sentences. Include the primary success metric.]

---

## 2. Goals

| # | Goal | Success Metric |
|---|------|---------------|
| G1 | [Observable outcome] | [How measured] |

---

## 3. Non-Goals
- [Explicit exclusion] — because [reason]

---

## 4. Decision Log

| # | Decision | Options Considered | Rationale |
|---|----------|-------------------|-----------|
| D1 | [What was decided] | (a) ..., (b) ..., (c) ... | [Why — include trade-offs] |

---

## 5. User Personas & Journeys

### 5.1 [Persona Name] (primary)
[Context, goals, constraints]

### 5.2 User Journey: [Journey Name]
[Step-by-step flow. Use Mermaid for complex flows with 3+ branches.]

---

## 6. System Design

### 6.1 Architecture Overview
[ASCII or Mermaid diagram showing components and data flow. Use C4 Level 1-2.]

### 6.2 Sequence Diagrams
[Mermaid sequence diagrams for key interactions. One diagram per flow — do NOT combine multiple scenarios. Include error paths alongside happy paths.]

---

## 7. Functional Requirements

### 7.1 [Feature Area]

| ID | Requirement |
|----|-------------|
| FR-01 | [Specific, testable requirement] |
| FR-02 | ... |

### 7.2 [Feature Area 2]
...

---

## 8. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | [Specific threshold] |
| NFR-02 | Accessibility | ... |

---

## 9. API Contracts

### 9.1 [Endpoint Name]

```
METHOD /path
```

**Request:**
```json
{ "field": "type — description" }
```

**Response (200):**
```json
{ "field": "type — description" }
```

**Error responses:** [status codes and shapes]

---

## 10. Database Design

### 10.1 Schema Changes

```sql
CREATE TABLE ... (
    ...
);
```

### 10.2 Migration Notes
[Forward/backward compatibility, data backfill, rollback strategy]

### 10.3 Indexes & Query Patterns
[Key queries and supporting indexes]

---

## 11. Frontend Design

### 11.1 Component Hierarchy
[Tree showing nesting]

### 11.2 State Management
[What state lives where — component / store / URL / server]

### 11.3 UI Specifications
[Per-component: layout, states, interactions, responsive behavior]

---

## 12. Edge Cases

| # | Scenario | Condition | Expected Behavior |
|---|----------|-----------|-------------------|
| E1 | [Name] | [Trigger] | [What happens] |

---

## 13. Configuration & Feature Flags

| Variable | Default | Purpose |
|----------|---------|---------|
| `ENV_VAR` | value | [What it controls] |

---

## 14. Testing & Verification Strategy

### 14.1 Unit Tests
[What to test, specific assertions]

### 14.2 Integration Tests
[API contract tests, DB integration]

### 14.3 End-to-End Tests
[Playwright flows, CLI verification, manual spot checks]

### 14.4 Verification Commands
[Exact commands with expected output]

---

## 15. Rollout Strategy
[Feature flags, migration order, rollback plan, graceful degradation]

---

## 16. Modules

<section id="modules">

| Module | Owner | Purpose |
|--------|-------|---------|
| <module-name> | <team or path> | <one-line purpose> |

</section>

[Required at Tier-3. Every module the spec introduces or touches gets a row. Names must resolve in the host repo (basename match OR full-path resolves in git HEAD) so /architecture's auto-upgrade detector does not flag false positives. See `plugins/pmos-toolkit/skills/architecture/scripts/auto-upgrade-detector.sh` for the matching contract.]

---

## 17. Architectural Assertions

<section id="architectural-assertions">

- <module-name> MUST <invariant phrased as a checkable rule>.
- <module-name> MUST NOT <forbidden coupling or escape hatch>.

</section>

[Required at Tier-3. Each assertion is one sentence, testable by an LLM judge against the codebase. Cite the §6 architecture diagram or §5 user journey that motivates each assertion. /architecture --from-spec emits findings per assertion via the §13-schema triplet.]

---

## 18. Research Sources

| Source | Type | Key Takeaway |
|--------|------|-------------|
| [path or URL] | Existing code / External | [What we learned] |
```

### Anchor Emission Rule

Specs emit stable kebab-case anchors on every H2 and H3 so downstream artifacts (`/plan` Phase 4 broken-ref hard-fail per FR-31a, requirements traceability tools) can deep-link without brittle line numbers.

**Auto-derivation (resolves spec Open Question #1; recorded in /plan plan §Decision Log P3):**

1. Lowercase the heading text after the `## ` or `### ` marker.
2. Replace any run of non-alphanumeric characters with a single hyphen.
3. Strip leading/trailing hyphens.
4. **Collision dedupe** — if the derived slug already appeared earlier in the same document, append `-2`, `-3`, ... in document order. The first occurrence keeps the bare slug.

Emit the anchor as a trailing `{#kebab-anchor}` token on the heading line.

Example:

```markdown
## Decision Log {#decision-log}
## Edge Cases {#edge-cases}
### Edge Cases {#edge-cases-2}    ← second "Edge Cases" anywhere in the doc
```

**Why:** `/plan` v2 Phase 4 hard-fails on broken `02_spec.{html,md}#anchor` refs (FR-31a). Heading renames remain a known break — surface them by re-running /plan or via the FR-31a check, not by silently letting refs rot.

---

### Document Guidelines (all tiers)
- Use numbered FR-XX IDs for functional requirements — they're referenced in the plan
- Sequence diagrams are REQUIRED (Tier 3) when 3+ components interact — one diagram per flow
- API contracts must show request AND response shapes AND error responses
- DB schema must show actual SQL, not prose descriptions
- Edge cases must have specific conditions and expected behaviors
- Non-goals distinguish scope exclusions from negated goals ("We won't support multi-region" is a non-goal; "the system should not crash" is NOT)
- Keep each section as concise as possible while remaining unambiguous — over-specification is an anti-pattern

---

## Phase 6: Review Loops

**Loop count is emergent — there is no minimum or maximum.** Run review loops until the universal exit checklist (below) is satisfied: every applicable item is `pass` and the user has confirmed no further concerns. A single clean loop is a valid stopping point; a Tier 3 spec may need four. The exit criteria are the contract, not the loop count.

### Two Types of Review

Each loop runs BOTH checks:

**A. Structural Checklist** (catches missing/incomplete sections):
1. Every requirement from the requirements doc mapped to a spec section?
2. API contracts have request + response + error shapes?
3. DB schema is actual SQL, not prose?
4. Sequence diagrams present for 3+ component interactions?
5. Edge cases have specific conditions + expected behavior?
6. Testing strategy has exact verification commands?
7. Verification plan is concrete enough to execute?

**B. Design-Level Self-Critique** (catches wrong/shallow decisions):
1. **Reviewer perspective:** If you were sent this document for review, what comments would you add? Read it as a critical reviewer, not the author — flag implicit decisions not in the Decision Log, vague interface contracts, missing error paths, and architectural assumptions that aren't justified.
2. Would a different engineer reading this spec ask "but what about X?" — identify the Xs.
3. Are there areas where the spec says WHAT but not HOW (or vice versa)? The spec should be prescriptive about interfaces and flexible about internals.
4. Are there cross-cutting concerns (theming, error handling, loading states, auth) that are mentioned once but affect many components?

The structural checklist catches omissions. The design critique catches shallow thinking. Both are needed — a spec can be structurally complete but architecturally weak.

### Loop Protocol

1. Run BOTH checklists above
2. Log findings in the Review Log table:
   ```
   | Loop | Findings | Changes Made |
   |------|----------|-------------|
   ```
<!-- defer-only: ambiguous -->
3. **Present findings via `AskUserQuestion` — do NOT dump them as prose.** Findings shown as text force the user to hand-write dispositions; batching them as structured questions is faster, clearer, and produces a reviewable audit trail. See "Findings Presentation Protocol" below.
4. Apply the user's dispositions (Fix as proposed / Modify / Skip / Defer) — see protocol below
5. Fix issues inline — do NOT create a new file
6. Commit: `git commit -m "docs: spec review loop N for <feature>"`

### Findings Presentation Protocol

For every loop that produces findings (structural or design-critique):

1. **Group findings by category** (e.g., "Missing API error shapes", "Unclear component boundaries", "Undocumented decisions"). Small categories can be merged; never present more than 4 findings in a single batch.
<!-- defer-only: ambiguous -->
2. **One question per finding** via `AskUserQuestion`. Use this shape:
   - `question`: **prefix with severity tag `[Blocker]`, `[Should-fix]`, or `[Nit]`**, then a one-sentence restatement of the finding + the proposed fix. Example: `[Blocker] Add 409 response for duplicate email to POST /users` or `[Nit] Rename §6.2 heading from 'DB' to 'Database Design' for consistency`. Severity definitions: **Blocker** = spec cannot ship without this fix (missing requirement coverage, broken contract); **Should-fix** = real defect, ship-blocker absent good reason to defer; **Nit** = cosmetic or stylistic.
   - `options` (up to 4):
     - **Fix as proposed** — agent applies the stated change via `Edit`
     - **Modify** — user edits the proposal (free-form reply expected next turn)
     - **Skip** — not an issue; drop it (note briefly in Review Log)
     - **Defer** — log in the Review Log with rationale; must be resolved (decided OR split into a follow-up spec) before exit, since Open Questions are forbidden in the published spec
3. **Batch up to 4 questions per interactive-prompt call.** If there are more findings, issue multiple calls sequentially, one category per call.
4. **Skip the interactive prompt only for findings that need open-ended input** (e.g., "what retry policy should the worker use?"). For those, ask inline as a normal follow-up after the batch — do not shoehorn into options.
5. **After dispositions arrive,** apply them in order, update the Review Log row to cite dispositions, then ask the user if they see additional gaps before declaring the loop complete.

**Platform fallback (no interactive prompt tool):** list findings as a numbered table with columns [Finding | Proposed Fix | Options: Fix/Modify/Skip/Defer]; ask the user to reply with the disposition numbers. Do NOT silently self-fix.

**Anti-pattern:** A wall of prose ending in "Let me know what you'd like to fix." This forces the user to re-state each finding in their reply. Always structure the ask.

**Edge cases of structured asks:** when a user reply slips outside the offered options (free-form text, a non-recommended pick that may break an invariant, or leftover findings that don't share a category), follow `../_shared/structured-ask-edge-cases.md`.

### Escape Hatch: Structural Findings

A finding that requires re-architecting (not an inline fix) — e.g., "the whole event-driven approach is wrong, this should be transactional" — does NOT belong in the standard Fix/Modify/Skip/Defer flow. The "fix issues inline" rule of the Loop Protocol assumes local edits.

**When you detect a structural finding:**
1. Pause the loop immediately. Do not batch it with other findings.
<!-- defer-only: ambiguous -->
2. Surface it to the user with a dedicated `AskUserQuestion`:
   - `question`: state the structural concern + the architectural shift it implies (one sentence each).
   - Options:
     - **Revise scope and re-enter Phase 3** — multi-role review with the new architectural direction; spec is rewritten substantially.
     - **Defer** — log in the Review Log with rationale; ship the current architecture and revisit in a follow-up.
     - **Accept trade-off** — keep the current architecture; document the rejected alternative in the Decision Log with the trade-off explicit.
     - **Modify** — user proposes a different resolution path next turn.
3. After the user picks, resume the loop: either back to Phase 3 (option 1), to applying remaining findings (options 2/3), or to a free-form discussion (option 4).

A structural finding is one where the proposed fix would invalidate three or more existing spec sections. If you can fix it with a localized edit to one or two sections, it's not structural — handle it through the standard flow.

### Universal Exit Checklist

All items below must be `pass` or `N/A` (with a stated reason for N/A). Loop until satisfied.

| # | Criterion | When N/A |
|---|-----------|----------|
| 1 | Every requirement from the requirements doc is covered by a numbered FR/NFR | Never N/A — if there is no requirements doc, this skill should not have started |
| 2 | Decision Log has entries with Options Considered + Rationale for every non-trivial choice | Tier 1 with a single obvious fix and no alternatives |
| 3 | API contracts complete with request + response + error shapes | No API surface introduced or changed |
| 4 | DB schema is actual SQL with migration notes | No DB changes |
| 5 | Sequence diagrams present (one per flow, error paths included) | Fewer than 3 components interact in any flow |
| 6 | Edge cases have specific Conditions + Expected Behaviors | Never N/A — Tier 1 still requires this |
| 7 | Verification Plan Sketch (from Phase 4) is reflected in §14 with exact commands | Never N/A |
| 8 | Frontend design specifies hierarchy + state + interactions | No frontend changes |
| 9 | Rollout strategy documented (flags, migration order, rollback) | Tier 1-2 with no deploy-time risk |
| 10 | **Open Questions section is empty (no unresolved items)** | Never N/A — see below |
| 10b | Frontmatter contract complete: tier, type, feature, date, status, requirements all present and non-empty | Never N/A |
| 10c | §Modules and §Architectural Assertions present and non-empty (T3 mandatory; T2 only on auto-upgrade) | Tier 1 always; Tier 2 unless /spec Phase 6.6 auto-upgrade fired |
| 11 | Last loop produced only `[Nit]` findings or none | Never N/A |
| 12 | User has explicitly confirmed no further concerns | Never N/A — do not self-declare exit |

**Open Questions are forbidden at exit.** The spec is the contract; if a decision is not made, the spec is not done. Resolve every open question before promoting status — either decide and log to the Decision Log, or split the unresolved scope into a follow-up spec and remove it from this one. The Review Log may carry deferred items DURING work, but the published spec must have none.

---

## Phase 6.5: Folded simulate-spec (Tier 3 default-on; Tier 1/2 optional)

**Skip if `--skip-folded-sim-spec` was passed** (D15 escape). Skip if `{tier}` is 1 unless user opted in. Tier-3: default-on per D2.

This phase delegates to `_shared/sim-spec-heuristics.md` (created in T5; canonical scenario-trace + apply-loop substrate) to pressure-test `02_spec.md` against adversarial scenarios and apply auto-fix patches. Findings ≥ confidence threshold (default 80) auto-apply as inline edits to `02_spec.md` with per-finding git commits; sub-threshold findings surface via `AskUserQuestion` with `Recommended=Defer to OQ` (D14). Replaces the obsolete `/feature-sdlc` Phase 6 gate (W3).

### Pre-apply guard (FR-66)

Before opening the apply-loop:

```bash
git status --porcelain 02_spec.md
```

If non-empty: emit `WARNING: 02_spec.md has uncommitted edits — folded simulate-spec apply-loop will skip auto-apply (per FR-66) to avoid clobbering. Run /spec --skip-folded-sim-spec OR commit your edits first.` Skip auto-apply (fall through to manual disposition); continue with critique + gap-register emission for advisory value.

### Per-finding commits (D16)

Each auto-applied patch is its own git commit:

```
spec: auto-apply simulate-spec patch P<N>
```

Commit body includes `Depends-on: P<M>` when patch P<N> has a Phase-3 trace dependency on P<M>. /complete-dev release-notes recipe (FR-68) consumes this. Commits-as-state is the resume cursor (FR-57).

### Failure capture (FR-50, M1, D35)

On apply failure, capture `{folded_skill: simulate-spec, error_excerpt: <first-200-chars>, ts: <ISO-8601>}` and append to `state.yaml.phases.spec.folded_phase_failures[]` per the dedup rule in `feature-sdlc/reference/state-schema.md`. Emit chat line at moment-of-append:

```
WARNING: simulate-spec crashed (advisory continue per D11): <error_excerpt>
```

Continue per D11 advisory — folded-phase failures do NOT halt /spec. /feature-sdlc Phase 11 surfaces the failures (T12b).

### Substrate delegation

The 4-pass scenario enumeration (Spec extraction → variant generation → adversarial checklist → model-driven), scenario trace + Gap Register, 4-bucket artifact-fitness critique, and apply-loop logic are all canonical in `_shared/sim-spec-heuristics.md`. This folded phase invokes the substrate's sections 1-5 against `02_spec.md`; spec critique findings populate the Gap Register; auto-apply patches edit `02_spec.md` in-place per the per-finding-commit cadence above.

### Flag handling (Phase 0 parser additions)

`--skip-folded-sim-spec` (boolean) — short-circuits this phase entirely.
`--msf-auto-apply-threshold N` (int, default 80) — overrides the apply threshold (shared with folded MSF paths).

---

## Phase 6.6: Folded /architecture --from-spec (T3 default-on; T2 conditional; T1 skip)

**Skip if `--skip-folded-arch` was passed** (FR-20 escape). This phase delegates to the `/architecture` skill's `--from-spec` mode (shipped in Waves 1-3 of the architecture-in-feature-sdlc feature) to evaluate `02_spec.html`'s §Architectural Assertions against the codebase via an LLM judge. Findings emit as a §13-conforming triplet (`<feature_folder>/architecture/02_spec.{json,html,md}`) cross-linked from /spec's output. Replaces the prior standalone `/architecture` orchestrator phase per D5 (fold-into-spec-and-verify).

### Tier gate (FR-17, FR-18)

| Tier | Recommended | Rule |
|------|-------------|------|
| 1    | n/a — skipped | Emit log line `arch sub-step: tier 1, skipping` and proceed to Phase 7. No gate prompt. |
| 2    | Determined by auto-upgrade detector | Run `bash plugins/pmos-toolkit/skills/architecture/scripts/auto-upgrade-detector.sh <spec-path>`; if `upgrade=true` and `new_modules` non-empty, set `Recommended=Run` and log `arch sub-step: T2→T3 auto-upgrade (new module: <name>)`. Else `Recommended=Skip` and log `arch sub-step: tier 2, no new modules, skipping`. |
| 3    | Run        | Default-on per D2; user can still pick Skip explicitly. |

### Pre-flight short-circuit (FR-20)

If the argument string carries `--skip-folded-arch`, emit `architecture: --skip-folded-arch flag; skipping` to stderr and proceed to Phase 7 without further work. No gate prompt, no state.yaml mutation.

### Gate prompt (FR-19)

<!-- defer-only: ambiguous -->
`AskUserQuestion`:
```
question: "Run folded /architecture --from-spec to lint §Architectural Assertions against the codebase?"
options:
  - Run /architecture --from-spec (Recommended)
    description: Dispatch the judge subagent (~30-90s) and cross-link findings into the spec.
  - Skip
    description: Defer architecture lint to /verify Phase 4.7 (--since mode against merge-base).
```

The `(Recommended)` marker is computed per the tier gate table above — T2-no-new-modules and T1 do not present this prompt at all (Skip is logged automatically).

### Dispatch (FR-21)

On Run: invoke `/architecture --from-spec {feature_folder}/02_spec.html` as a blocking Task subagent with 300s timeout. The child resolves its own modules + assertions from the spec, dispatches the judge, validates findings, and writes the triplet atomically. On success, parse the returned JSON output, capture the triplet path, and cross-link it from /spec's primary output as: `Architecture findings: <feature_folder>/architecture/02_spec.html`.

### Advisory failure (FR-22, D11)

On dispatch failure (subagent crash, timeout, schema-conformance hard-fail, judge API error), capture `{folded_skill: "architecture", error_excerpt: <first-200-chars>, ts: <ISO-8601>}` and append to `state.yaml.phases.spec.folded_phase_failures[]` per the dedup rule in `feature-sdlc/reference/state-schema.md`. Emit at moment-of-append:

```
WARNING: architecture crashed (advisory continue per D11): <error_excerpt>
```

Continue to Phase 7 — folded-phase failures do NOT halt /spec. /feature-sdlc Phase 9 surfaces them (T12b Resume Status + Phase 9 subsection).

### Re-run idempotency (FR-23)

Re-invoking /spec (e.g., after a Phase 6 revise loop) re-runs Phase 6.6 internally, overwriting the prior triplet at the same path. No new orchestrator phase ID is created — state.yaml mutation is confined to `phases.spec.folded_phase_failures[]` only. Operators expecting to see fresh findings after a spec revision get them automatically.

### Flag handling (Phase 0 parser additions)

`--skip-folded-arch` (boolean) — short-circuits this phase entirely (mirrors `--skip-folded-sim-spec` for Phase 6.5).

---

## Phase 7: Final Review — Conciseness, Readability, Coherence

Phase 6 already covered structural completeness and design soundness. Phase 7 is the **fresh-eyes prose pass** — what remains after the spec is structurally and architecturally sound:

1. **Conciseness** — Can sections be tightened without losing essence? Flag verbose passages.
2. **Engineer readability** — Read as a stranger to this feature. Can you build it from this doc alone? Where do you stumble?
3. **Cross-section coherence** — Do §6 (architecture), §9 (APIs), §10 (schema), and §11 (frontend) tell one consistent story? Flag any place where two sections imply different shapes.

(Requirements coverage and missing-section checks are owned by the Phase 6 universal exit checklist — do NOT re-run them here.)

<!-- defer-only: ambiguous -->
**Share findings via the same `AskUserQuestion` batching as Phase 6** — including the `[Blocker]/[Should-fix]/[Nit]` severity tags. Up to 4 per call. Apply dispositions inline.

**On user confirmation that the spec is complete:**

**Frontmatter validation gate** — before promoting status, re-read the spec frontmatter. Verify keys `tier`, `type`, `feature`, `date`, `requirements` are present and non-empty. If any required key is missing or empty, halt with a platform-aware error sourced via `_shared/platform-strings.md` (e.g., `[/spec] Cannot promote — frontmatter missing required key: <key>. Add the key and re-run the exit step.`). Do NOT promote.

1. Promote the status field in the spec doc using `Edit` with `old_string="status: Draft"` and `new_string="status: Ready for Plan"` (frontmatter contract per the Tier N Template — replaces the legacy prose `**Status:** Draft` line).

2. Commit:

```bash
git add {feature_folder}/02_spec.html {feature_folder}/02_spec.sections.json {feature_folder}/02_spec.md {feature_folder}/index.html {feature_folder}/assets
git commit -m "docs: spec ready for plan — <feature>"
```

3. Ask the user:

> "Spec is Ready for Plan. Next options:
> - `/pmos-toolkit:simulate-spec` — pressure-test the design against scenarios and adversarial failure modes (recommended for Tier 2-3)
> - `/pmos-toolkit:plan` — proceed directly to implementation planning"

The user's explicit confirmation is required before promoting status. Do not self-declare completion.

---

## Phase 8: Workstream Enrichment

**Skip if no workstream was loaded in Phase 0.** Otherwise, follow `_shared/pipeline-setup.md` Section C.

For this skill, evaluate whether anything from this session is worth writing back to the workstream. Signals to look for:
- Tech stack decisions → workstream `## Tech Stack`
- Architectural constraints → workstream `## Constraints & Scars`
- Key design decisions → workstream `## Key Decisions`

**The reflection is mandatory; writing entries is not.** If the spec produced no workstream-level signal (typical for small Tier 2 specs that operate within established constraints), explicitly state "No workstream-level signals from this session" and exit. Forced enrichment produces noise; zero entries is a valid outcome.

---

## Phase 9: Capture Learnings

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing — surprising behaviors, repeated corrections, non-obvious decisions. Proposing zero learnings is a valid outcome for a smooth session; the gate is that the reflection happens, not that an entry is written.

---

## Anti-Patterns (DO NOT)

- Do NOT skip the multi-role interview for Tier 2-3 — each role catches different gaps. Roles with no questions go in the silent-roles summary block, not omitted.
- Do NOT write API contracts without response shapes and error responses
- Do NOT write DB schemas as prose — show actual SQL
- Do NOT write "add tests" without specifying what to test and how
- Do NOT treat verification as an afterthought — Phase 4 emits a sketch in chat before the spec is written
- Do NOT create a new spec file in each review loop — update the original
- Do NOT promote status to "Ready for Plan" before user confirmation
- Do NOT ship a spec with non-empty Open Questions — resolve or split scope
- Do NOT self-declare loop completion — the user gates exit
- Do NOT write decision entries without "Options Considered" and "Rationale"
- Do NOT ask questions for the sake of asking — only ask what genuinely helps
- Do NOT skip sequence diagrams for multi-component interactions (Tier 3)
- Do NOT over-specify internal implementation details — prescribe the interface, leave the internals to engineering judgment
- Do NOT combine multiple scenarios into one sequence diagram — one diagram per flow
- Do NOT force-fit a structural finding into the inline-edit flow — use the Phase 6 escape hatch
- Do NOT batch findings without `[Blocker]/[Should-fix]/[Nit]` severity tags
- Do NOT run industry research at Tier 2 unless the design has a non-obvious architectural choice

---

## Apply comment-resolver edit (FR-22, FR-30, FR-60)

This phase is the `/spec` entrypoint that `/comments resolve` (T10) dispatches into when walking open threads in a spec artifact's `.comments.json` sidecar. The contract — input/output JSON shapes, closed `error_enum` set, idempotency rules, subagent invocation convention — lives in the shared contract doc and is the single source of truth:

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md` (T6).

Per [NFR-08](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#nfr-h), this phase MUST cite that file rather than restate the contract. Anything below is `/spec`-specific implementation guidance only.

### When invoked

The resolver dispatches a subagent with the §9.1 input JSON. The subagent's tools include this skill's Node shim:

- **Shim:** `plugins/pmos-toolkit/skills/spec/scripts/apply-edit-at-anchor.js` — exports `apply(input)`, returns one of the three output shapes (success / failure / clarification) per §9.1. Success responses include the optional `applied_artifact` field (full post-edit HTML); the shim's minimal edit inserts an HTML annotation comment immediately before the resolved anchor element — real prose rewriting is deferred to T12+.

### Resolution order

Per the contract:

1. **id-first.** If `anchor.id_anchor` is set, locate `id="<id>"` in the artifact HTML. Match → success path, `strategy: "id-first"`, `score: 1.0`.
2. **quote-fallback.** Otherwise (or on id miss), substring-contains match `anchor.quote_anchor.text` (≥40 chars) against the candidate's text content. First exact substring hit wins. The full alignment lands in `comments/scripts/anchor-resolver.js`.
3. **Neither hits** → emit `{ success: false, error_enum: "anchor_orphaned" }`; do NOT mutate the artifact.

### Closed error_enum

Authoritative list in [§9.2](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#api-error-enum) / the contract doc:

`anchor_orphaned`, `edit_conflicted`, `agent_judged_infeasible`, `agent_errored`.

The shim raises `anchor_orphaned`, `agent_judged_infeasible`, and `agent_errored`. `edit_conflicted` is the resolver's responsibility (wave-planner concern).

### Idempotency (§9.3) — local choice

The shim returns the **`diff_ref` substring** form for no-ops:

```json
{ "success": true, "diff_ref": "no-op: edit already applied", "system_reply": "Edit already present in artifact; marking resolved without changes." }
```

(Not a top-level `noop: true` key.) Per-process ledger keyed by `${artifact_path}:${thread_id}:sha1(body)` is sufficient for the §9.3 contract within one `/comments resolve` run; the persistent semantic-keyword (≥80% overlap) check belongs to the resolver.

### Tests

- Per-skill contract: `plugins/pmos-toolkit/skills/spec/tests/apply-edit-at-anchor.test.js` (5 cases: id-first happy, orphan, idempotent, infeasible, clarification).
- Wrapper: `tests/scripts/assert_apply_edit_at_anchor_spec.sh`.
