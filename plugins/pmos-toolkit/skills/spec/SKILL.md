---
name: spec
description: Create a detailed technical specification from a requirements document — architecture, API contracts, DB schema, frontend design, testing strategy, verification plan. Second stage in the requirements -> spec -> plan pipeline. Auto-tiers by scope. Use when the user says "write the technical design", "design the system", "create the spec", "how should this work technically", or has a requirements doc ready for detailed design.
user-invocable: true
argument-hint: "<path-to-requirements-doc or requirements text> [--feature <slug>] [--backlog <id>] [--tier <N>] [--format <html|md>] [--skip-folded-sim-spec] [--skip-folded-arch] [--msf-auto-apply-threshold N] [--non-interactive | --interactive]"
---

# Technical Specification Generator

Create a comprehensive technical specification from a requirements document. The spec defines HOW we're building it — architecture, API contracts, database design, frontend components, and verification strategy. This is the SECOND stage in a 3-stage pipeline:

```
/requirements  →  [/msf-req, /creativity]  →  /spec  →  [/simulate-spec]  →  /plan  →  /execute  →  /verify
                   optional enhancers     (this skill)    optional validator
```

A spec is prescriptive about WHAT and WHY, but leaves room for engineering judgment on internal implementation details. It should be detailed enough that a competent engineer with subject expertise could implement it from the doc alone.

**Announce at start:** "Using the spec skill to create a detailed technical specification."

**Flags are NL-first.** Infer options from the request — "skip the simulation pass" ≡ `--skip-folded-sim-spec`, "skip the architecture lint" ≡ `--skip-folded-arch`, "markdown output" ≡ `--format md`; an explicit flag overrides the inferred intent.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** State your assumption, document it in the output, and proceed. The user reviews after completion.
- **No subagents:** Perform research and analysis sequentially as a single agent.
- **No Playwright MCP:** Note browser-based verification as a manual step for the user.

---

## Track Progress

This skill runs many phases (0–11). Create one task per phase using your agent's task-tracking tool (e.g., `TaskCreate` in Claude Code). Mark each task `in_progress` when you start it and `completed` when it finishes — never batch completions.

## Backlog Bridge

This skill optionally integrates with `/backlog`. See `plugins/pmos-toolkit/skills/backlog/pipeline-bridge.md`.

**At skill start:**
- If `--backlog <id>` was passed: load the item file as supplementary context.
- If no argument provided AND `<repo>/backlog/items/` has items with status=ready: run the auto-prompt flow.

**At skill end (after writing the spec doc):**
- If `<id>` was set, invoke `/backlog set {id} spec_doc={doc_path}`, then `/backlog set {id} status=spec'd` (only if current status is `inbox` or `ready`). On failure, warn and continue.

---

## Phase 0: Pipeline Setup (inline — do not skip) {#pipeline-setup}

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

7. **Resolve `output_format`.** Read `output_format` from `.pmos/settings.yaml` (default: `html`; valid values: `html`, `md` — legacy `both` is treated as `html` per `_shared/html-authoring/README.md`). A `--format <html|md>` flag overrides settings (last flag wins on conflict). Print to stderr exactly: `output_format: <value> (source: <cli|settings|default>)` once at Phase 0 entry.

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

## Phase 1: Intake & Tier Detection {#intake-tier}

1. **Locate the requirements.** Follow `_shared/resolve-input.md` with `phase=requirements`, `label="requirements doc"`.
2. **Read the requirements end-to-end.** Confirm understanding with the user — summarize the problem, goals, non-goals, and key decisions already made.
3. **Check for existing spec.** Use `_shared/resolve-input.md` with `phase=spec`, `label="prior spec"` to locate either `{feature_folder}/02_spec.html` (preferred) or `{feature_folder}/02_spec.md` (legacy fallback). If found: read it, ask the user if this is an update or fresh start.
<!-- defer-only: ambiguous -->
4. **Detect the tier.** Tier semantics, detection signals, and carry-forward rules are canonical in `_shared/tier-matrix.md`: a `Tier:` tag in the requirements doc is carried forward without asking (announce only); `--tier <N>` (the machine passthrough `/feature-sdlc` sends when its tier is already resolved) is honored the same way — use it without re-asking, announce "Tier N carried forward from the orchestrator", and if a strictly higher tier fires from the signal table, escalate and note the divergence in the spec frontmatter (the orchestrator logs `child_tier_divergence`, it does not override). An untagged, flagless, or mid-pipeline entry is assessed from the signal table and confirmed via `AskUserQuestion` (recommend the assessed tier). What the tier means *for this artifact*:

| Tier | Sections | Length |
|------|----------|--------|
| **1 — Bug Fix / Minor Enhancement** | Problem, Root Cause Analysis, Fix Approach, Decision Log (lightweight), Edge Cases, Testing Strategy | ~1-2 pages |
| **2 — Enhancement / UX Overhaul** | Problem, Goals, Decision Log, Relevant FR tables, API changes (if any), Frontend Design (if any), Edge Cases, Testing Strategy | ~3-6 pages |
| **3 — Feature / New System** | ALL sections mandatory including Architecture diagrams, Sequence diagrams, Full FR/NFR tables, API contracts, DB schema (SQL), Frontend design, Feature flags, Rollout strategy | ~6-15 pages |

5. **Detect the `type:`.** Set the spec's `type` frontmatter using this precedence:
   - **`--backlog <id>` was passed** → read the backlog item's `type:` field and map: `bug → bugfix`, `feature → feature`, `enhancement → enhancement`, `chore → enhancement`, `docs → enhancement`, `spike → feature`. Carry forward without asking.
   - **Requirements doc has a `type:` tag** in frontmatter → carry forward without asking.
   <!-- defer-only: ambiguous -->
   - **Otherwise** → confirm via `AskUserQuestion` with options `bugfix` / `enhancement` / `feature` (recommend the option implied by the tier: 1 → bugfix, 2 → enhancement, 3 → feature).

   Persist `type` into the spec frontmatter — `/plan` keys per-task TDD overrides off it and logs them as decisions.

**Gate:** Do not proceed until you have confirmed understanding of the requirements and (where required) the user has confirmed the tier and `type`.

---

## Phase 2: Research {#research}

**Tier 1:** Read the specific files/functions involved in the bug. No broader research needed.

**Tier 2-3: Dispatch up to 2 subagents in parallel**, each with an explicit return contract:

**Subagent A — Existing Implementation & Patterns** (always for Tier 2-3; `model: sonnet` — bounded codebase survey against the contract below; the writer re-reads the cited paths anyway). Returns: file paths + 1-line summaries of impacted code areas; current architecture patterns, data models, API conventions; test patterns from adjacent features (paths); reusable components/utilities already available.

**Subagent B — Industry Research & Alternatives** (Tier 3: always; Tier 2: only when the design has a non-obvious architectural choice — queue vs. webhook vs. polling, relational vs. document, sync vs. async, new infrastructure. Skip for routine UX overhauls and additive enhancements on an established stack — state in the spec why you skipped). Model: inherit — open-ended synthesis with a build-vs-adopt judgment call. Returns:
- **Comparables table:** 2–4 (T3) or 2 (T2) named examples — products, OSS projects, engineering blogs — with architecture used + documented trade-offs.
- **Alternatives table:** 3+ (T3) or 2 (T2) materially different design shapes with trade-offs (complexity, latency, cost, failure modes, operational burden).
- Established patterns/standards that apply, with a build-vs-adopt recommendation; known failure modes from comparable systems; for Tier 3, an explicit recommendation + rejected alternatives.

**Reconciliation:** after both return, reconcile conflicts (e.g., A says "we already have a queue", B recommends webhooks) explicitly in the Decision Log — do not silently pick one. Track all sources in the Research Sources table.

---

## Phase 3: Multi-Role Interview {#multi-role-interview}

<!-- defer-only: ambiguous -->
Act as each role IN SEQUENCE. For each role, identify gaps, risks, and missing details, and ask via `AskUserQuestion` — batch related questions from the same role (up to 4), never across roles. **Only ask what genuinely helps the spec** — state assumptions rather than asking obvious questions; zero questions for a role is fine, five is fine if all five matter.

**Tier 1:** skip this phase. **Tier 2:** 2-3 relevant roles, picked from the table in order. **Tier 3:** all applicable roles.

| Order | Role | Focus | Skip if... |
|-------|------|-------|------------|
| 1 | **Principal Architect** | System boundaries, service interactions, data flow, deployment model | No new services or data flows |
| 2 | **Database Administrator** | Schema design, migrations, indexes, query patterns, data integrity | No DB changes |
| 3 | **Principal Designer** | UI components, state management, design tokens, interactions, responsive behavior | No frontend changes |
| 4 | **Product Director** | User personas, user flows, edge cases, empty states, first-time experience | Already thorough in requirements |
| 5 | **DevOps Engineer** | Deployment, configuration, feature flags, monitoring, rollout strategy | Tier 1-2 |
| 6 | **Senior Analyst** | FR/NFR coverage, acceptance criteria, success metrics — final gap sweep | Tier 1 |

**Why this order:** each role's decisions constrain the next — architecture constrains schema, schema constrains APIs, APIs constrain frontend, user flows validate the full stack, deployment wraps everything, the analyst sweeps for coverage. If the project is primarily a frontend/UX change, move Designer to position 2 (the UX may drive what data is stored) and state the reordering rationale.

**Role protocol (Tier 2-3):** announce "Speaking as [Role]:", ask 1-2 specific questions (batched) OR state the assumption you're proceeding with as a Decision-Log entry. If the user picks a non-recommended option, ask before the next role whether the choice changes any existing invariant or contract — if yes, capture it as a Decision-Log entry with the trade-off explicit (see `../_shared/structured-ask-edge-cases.md` §2). At the end of the phase, list every role you did *not* interview with a one-line reason citing what makes its concerns moot (a requirements section or an earlier role's answer) — never skip a role silently; the "Skip if..." column is the only valid reason to omit one from both the interview and this list.

**Data Flow Trace (conditional).** Run whenever the feature has the property *"data persisted by one code path is consumed by a different code path"* — search/indexing, notifications, feeds, sync, export/import, queues, caches, aggregations, and the like. Skip for single-entity CRUD or pure UI changes; when in doubt, run it — it's cheap. The Architect role must then: (1) name the write entry point, (2) name the storage target, (3) name the read entry point, (4) **verify each link exists in the current codebase** with a grep or file read — not assumption, (5) flag any missing link as a gap to implement in the spec.

---

## Phase 4: Verification Plan Sketch {#verification-sketch}

Before writing the spec, sketch HOW each major requirement will be verified, and **emit the sketch in chat for the user to confirm or push back on**. This is a CORE part of the spec, not an afterthought — surfacing it as a chat artifact catches under-thought verification when it's still cheap to fix.

```markdown
**Verification plan sketch (Phase 4):**

| Requirement | Verification approach |
|-------------|----------------------|
| FR-01 | Unit test: assert X given Y; integration test: hit /endpoint and verify Z |
| FR-02 | Playwright flow: log in → navigate → assert visible element |
| NFR-01 (perf) | k6 script targeting /api/foo at 100 RPS; assert p95 < 200ms |
```

Draw from: automated unit + integration tests with specific assertions; CLI scripts to verify APIs before building frontend; Playwright MCP for end-to-end flows; linting/static analysis; synthetic edge-case data; before/after comparison reports.

**Gate:** Wait for user acknowledgment of the sketch before moving to Phase 5. If the user pushes back, revise inline; do not write the spec until the sketch is accepted.

---

## Phase 5: Write the Spec {#write-spec}

**Emit per the `_shared/html-authoring/README.md` checklist** (authoring conventions: `conventions.md`). Deltas: artifact = `{feature_folder}/02_spec.html` + companion `02_spec.sections.json` (atomic temp-then-rename), `{{pmos_skill}}` = `spec` — the emitted `<meta name="pmos:skill" content="spec">` routes `/comments` resolver dispatches, so it MUST be set. The idempotent asset copy includes the comments overlay (`comments.js`, `comments.css` via `cp -n`) and the launcher trio (`comments-open.command` + `comments-open.sh` via `install -m 0755`, `comments-open.bat` via `cp -n`); regenerate `{feature_folder}/index.html` per `index-generator.md`.

**Heading IDs.** Every `<h2>`/`<h3>` carries a stable kebab-case `id`, derived per `conventions.md` §3 — the canonical algorithm; do not re-derive it here. Stable ids are what let cross-doc anchors (`02_spec.html#fr-10`) resolve across regenerations: `assert_heading_ids.sh` blocks artifacts missing one in CI, and `/plan` hard-fails on broken `02_spec.html#anchor` refs, so heading renames must be deliberate. The `<h1>` is emitted by `template.html` and never appears inside `{{content}}`.

**Before overwriting an existing spec:** if `{feature_folder}/02_spec.html` (or legacy `02_spec.md`) exists AND has uncommitted changes (`git status --porcelain "{feature_folder}/02_spec.{html,md}"`), commit it first so git is the backup (no `.bak` files):

```bash
git add "{feature_folder}/02_spec.html" "{feature_folder}/02_spec.sections.json" "{feature_folder}/02_spec.md"
git commit -m "docs: snapshot prior spec before /spec rewrite"
```

(`git add` on a non-existent path is a no-op, so legacy MD-only folders still snapshot cleanly.)

**Status lifecycle:** all templates start at `status: Draft`; promoted to `Ready for Plan` only on user confirmation in Phase 9 (`#final-review`). Downstream skills (`/simulate-spec`, `/plan`) check this field and warn when invoked against a Draft.

### Tier templates {#tier-templates}

The three spec body templates live in [`reference/spec-templates.md`](reference/spec-templates.md) — read that file and emit the matching tier's skeleton; do not re-derive templates from memory. Their `## ` headings become `<h2 id="...">` per the heading-id rule above. Authoring guidance the templates assume:
- Number functional requirements as FR-XX — `/plan` references them.
- Non-goals distinguish scope exclusions from negated goals ("We won't support multi-region" is a non-goal; "the system should not crash" is NOT).
- Keep each section as concise as possible while remaining unambiguous — over-specification is an anti-pattern; prescribe interfaces, leave internals to engineering judgment.

### Diagrams {#diagrams}

Architecture and sequence diagrams are authored by dispatching `/pmos-toolkit:diagram` as a **blocking** Task subagent (model: inherit — diagram framing is judgment, and the child runs its own eval rubric), never inline as a first attempt — this isolates rendering failures (network timeouts, mermaid-cli crashes) from the spec writer, and blocking means the writer can't proceed past the architecture section with a missing diagram. Dispatch args: `--theme technical --rigor medium --out {docs_path}/diagrams/<slug>.svg --on-failure exit-nonzero`, 300s per call, up to 3 attempts per diagram (re-dispatch the same args; don't mutate the prompt). Read the resulting SVG file and **inline its contents inside `<figure>`** per `conventions.md` §4 — never reference it via `<img>`.

If a diagram still fails after 3 attempts — or diagram generation is dominating the session — author the SVG inline as a last resort and say so in the `<figcaption>`; provenance matters to reviewers: `Authored via /diagram subagent (attempt N).` vs. `Diagram authored inline (subagent failed after 3 attempts).`

---

## Phase 6: Review Loops {#review-loops}

**Loop count is emergent — no minimum or maximum.** Run review loops until the universal exit checklist (below) is satisfied: every applicable item `pass` and the user has confirmed no further concerns. One clean loop is a valid stop; a Tier 3 spec may need four. The exit criteria are the contract, not the loop count.

Each loop:

1. **Sweep the universal exit checklist** — it is the single structural rubric for this skill; there is no separate per-loop checklist.
2. **Design-level self-critique** (catches shallow thinking the checklist can't):
   - Read the doc as a critical reviewer, not the author — flag implicit decisions missing from the Decision Log, vague interface contracts, missing error paths, unjustified architectural assumptions.
   - Would a different engineer ask "but what about X?" — identify the Xs.
   - Where does the spec say WHAT but not HOW (or vice versa)? Prescriptive about interfaces, flexible about internals.
   - Which cross-cutting concerns (theming, error handling, loading states, auth) are mentioned once but affect many components?
3. Log findings in the Review Log table (`| Loop | Findings | Changes Made |`).
<!-- defer-only: ambiguous -->
4. **Present findings per `_shared/findings-dispositions.md`** — severity tags, ≤4 per batch, the four dispositions, structural-finding escape, platform fallback, all canonical there. `/spec` deltas: **Defer** targets the Review Log, and every deferral must be resolved (decided, or split into a follow-up spec) before exit — published specs forbid Open Questions; a **structural finding's** first option is "Revise scope and re-enter Phase 3 (`#multi-role-interview`) — multi-role review with the new architectural direction".
5. Apply dispositions in order, fix issues inline — do NOT create a new file — then commit: `git commit -m "docs: spec review loop N for <feature>"`.

### Universal Exit Checklist {#exit-checklist}

All items must be `pass` or `N/A` (with a stated reason). Loop until satisfied.

| # | Criterion | When N/A |
|---|-----------|----------|
| 1 | Every requirement from the requirements doc is covered by a numbered FR/NFR | Never N/A — if there is no requirements doc, this skill should not have started |
| 2 | Decision Log has Options Considered + Rationale for every non-trivial choice | Tier 1 with a single obvious fix |
| 3 | API contracts complete with request + response + error shapes | No API surface introduced or changed |
| 4 | DB schema is actual SQL with migration notes — never prose | No DB changes |
| 5 | Sequence diagrams present — one per flow, error paths included | Fewer than 3 components interact in any flow |
| 6 | Edge cases have specific Conditions + Expected Behaviors | Never N/A — Tier 1 still requires this |
| 7 | Verification Plan Sketch (Phase 4) is reflected in §14 with exact commands — never "add tests" without what and how | Never N/A |
| 8 | Frontend design specifies hierarchy + state + interactions | No frontend changes |
| 9 | Rollout strategy documented (flags, migration order, rollback) | Tier 1-2 with no deploy-time risk |
| 10 | **Open Questions section is empty (no unresolved items)** | Never N/A — see below |
| 11 | Frontmatter contract complete: tier, type, feature, date, status, requirements all present and non-empty | Never N/A |
| 12 | §Modules and §Architectural Assertions present and non-empty (T3 mandatory; T2 only on auto-upgrade) | Tier 1 always; Tier 2 unless Phase 8 (`#folded-arch`) auto-upgrade fired |
| 13 | Last loop produced only `[Nit]` findings or none, and the user has explicitly confirmed no further concerns | Never N/A — do not self-declare exit |

**Open Questions are forbidden at exit.** The spec is the contract; if a decision is not made, the spec is not done. Resolve every open question before promoting status — decide and log it, or split the unresolved scope into a follow-up spec. The Review Log may carry deferred items DURING work; the published spec must have none.

---

## Phase 7: Folded simulate-spec (Tier 3 default-on) {#folded-sim-spec}

An apply-loop folding per `_shared/folded-phase.md` (escape flag, tier gating, clobber guard, threshold, per-finding commits, failure capture — all canonical there). The scenario enumeration, trace + Gap Register, artifact-fitness critique, and apply-loop substance are canonical in `_shared/sim-spec-heuristics.md` §1–5; when a reviewer subagent evaluates the artifact, the dispatcher side of `_shared/reviewer-protocol.md` applies. Parameters for this folding:

- **Folded skill** /simulate-spec · **host artifact** `{feature_folder}/02_spec.html` · **escape flag** `--skip-folded-sim-spec` · **tier gate** 1 skip (unless user opts in), 2 opt-in, 3 default-on.
- **Threshold:** findings ≥ `--msf-auto-apply-threshold N` (default 80; the `msf` name is shared with /requirements and /wireframes — machine-coupled, never rename) auto-apply as inline edits with per-finding commits `spec: auto-apply simulate-spec patch P<N>` (body carries `Depends-on: P<M>` for trace dependencies — /complete-dev's release-notes recipe consumes these; commits-as-state is the resume cursor). Sub-threshold findings surface via `AskUserQuestion` with a `Defer to OQ (Recommended)` option.
- **Failure capture:** append `{folded_skill: simulate-spec, error_excerpt: <first-200-chars>, ts: <ISO-8601>}` to `state.yaml.phases.spec.folded_phase_failures[]` (dedup rule: `feature-sdlc/reference/state-schema.md`), emit `WARNING: simulate-spec crashed (advisory continue per D11): <error_excerpt>`, and continue — folded-phase failures never halt /spec.

---

## Phase 8: Folded /architecture --from-spec {#folded-arch}

A dispatch-only folding per `_shared/folded-phase.md` (escape flag, tier gating, failure capture; no host-artifact edits). Delegates to `/architecture --from-spec` to evaluate `02_spec.html`'s §Architectural Assertions against the codebase via an LLM judge; findings emit as a triplet at `<feature_folder>/architecture/02_spec.{json,html,md}` cross-linked from the spec.

**Escape:** if `--skip-folded-arch` is present, emit `architecture: --skip-folded-arch flag; skipping` to stderr and proceed to Phase 9 (`#final-review`) — no gate prompt, no state mutation.

**Tier gate:**

| Tier | Recommended | Rule |
|------|-------------|------|
| 1 | n/a — skipped | Log `arch sub-step: tier 1, skipping`; no gate prompt. |
| 2 | From detector | Run `bash plugins/pmos-toolkit/skills/architecture/scripts/auto-upgrade-detector.sh <spec-path>`; if `upgrade=true` and `new_modules` non-empty → `Recommended=Run`, log `arch sub-step: T2→T3 auto-upgrade (new module: <name>)`; else `Recommended=Skip`, log `arch sub-step: tier 2, no new modules, skipping`. |
| 3 | Run | Default-on; user can still pick Skip. |

**Gate prompt** (only when the tier-gate table reaches a prompt):

<!-- defer-only: ambiguous -->
`AskUserQuestion`:
```
question: "Run folded /architecture --from-spec to lint §Architectural Assertions against the codebase?"
options:
  - Run /architecture --from-spec (Recommended)
    description: Dispatch the judge subagent (~30-90s) and cross-link findings into the spec.
  - Skip
    description: Defer architecture lint to /verify's --since mode against the merge-base.
```

**Dispatch:** on Run, invoke `/architecture --from-spec {feature_folder}/02_spec.html` as a blocking Task subagent, 300s timeout, model inherited (architecture judging is genuine judgment per `skill-patterns.md` §L). On success, parse the returned JSON and cross-link from the spec: `Architecture findings: <feature_folder>/architecture/02_spec.html`.

**Advisory failure:** on dispatch failure (crash, timeout, schema hard-fail, judge API error), append `{folded_skill: "architecture", error_excerpt: <first-200-chars>, ts: <ISO-8601>}` to `state.yaml.phases.spec.folded_phase_failures[]`, emit `WARNING: architecture crashed (advisory continue per D11): <error_excerpt>`, and continue to Phase 9 — folded-phase failures never halt /spec.

**Re-run idempotency:** Re-invoking /spec (e.g., after a review-loop revision) re-runs this phase internally, overwriting the prior triplet at the same path. No new orchestrator phase ID is created — state.yaml mutation is confined to `phases.spec.folded_phase_failures[]`, so operators see fresh findings after a spec revision automatically.

---

## Phase 9: Final Review — Conciseness, Readability, Coherence {#final-review}

Phase 6 owned structural completeness and design soundness — do not re-run those checks. This is the fresh-eyes prose pass:

1. **Conciseness** — can sections tighten without losing essence? Flag verbose passages.
2. **Engineer readability** — read as a stranger: can you build it from this doc alone? Where do you stumble?
3. **Cross-section coherence** — do architecture, APIs, schema, and frontend tell one consistent story? Flag any two sections implying different shapes.

<!-- defer-only: ambiguous -->
Present findings per `_shared/findings-dispositions.md` (same deltas as Phase 6) and apply dispositions inline.

**On user confirmation that the spec is complete:**

1. **Frontmatter validation gate** — re-read the spec frontmatter; verify `tier`, `type`, `feature`, `date`, `requirements` are present and non-empty. If any is missing, halt with a platform-aware error sourced via `_shared/platform-strings.md` (e.g., `[/spec] Cannot promote — frontmatter missing required key: <key>.`). Do NOT promote.
2. Promote the status via `Edit`: `old_string="status: Draft"` → `new_string="status: Ready for Plan"`.
3. Commit:

```bash
git add {feature_folder}/02_spec.html {feature_folder}/02_spec.sections.json {feature_folder}/02_spec.md {feature_folder}/index.html {feature_folder}/assets
git commit -m "docs: spec ready for plan — <feature>"
```

4. Offer next steps: `/pmos-toolkit:simulate-spec` (standalone pressure-test, recommended for Tier 2-3) or `/pmos-toolkit:plan` (proceed to implementation planning).

The user's explicit confirmation is required before promoting status. Do not self-declare completion.

---

## Phase 10: Workstream Enrichment {#workstream-enrichment}

**Skip if no workstream was loaded in Phase 0.** Otherwise, follow `_shared/pipeline-setup.md` Section C. Signals worth writing back: tech-stack decisions → `## Tech Stack`; architectural constraints → `## Constraints & Scars`; key design decisions → `## Key Decisions`. **The reflection is mandatory; writing entries is not** — if the session produced no workstream-level signal, state "No workstream-level signals from this session" and exit. Zero entries is a valid outcome.

---

## Phase 11: Capture Learnings {#capture-learnings}

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` now. Proposing zero learnings is a valid outcome for a smooth session; the gate is that the reflection happens, not that an entry is written.

---

## Anti-Patterns (DO NOT)

The exit checklist is the rubric; these are the non-obvious failure modes beyond it:

- Do NOT run industry research at Tier 2 unless the design has a non-obvious architectural choice — and state in the spec why you skipped it.
- Do NOT over-specify internal implementation details — prescribe the interface, leave internals to engineering judgment. Over-specification reads as rigor but costs flexibility.
- Do NOT combine multiple scenarios into one sequence diagram — one diagram per flow.
- Do NOT create a new spec file in a review loop — update the original; git history is the revision trail.

---

## Apply comment-resolver edit {#apply-comment-resolver-edit}

The `/spec` entrypoint that `/comments resolve` dispatches into when walking open threads in a spec artifact's inline `pmos-comments` JSON block.

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md` — input/output JSON shapes, resolution order (id-first, then ≥40-char quote-substring fallback), the closed `error_enum`, idempotency rules, subagent invocation convention. Cite it; never restate it.
- **Shim:** `scripts/apply-edit-at-anchor.js` — exports `apply(input)`, returns the contract's success / failure / clarification shapes; success includes the optional `applied_artifact` field (full post-edit HTML). Local idempotency choice: no-ops return the `diff_ref` substring form (`"no-op: edit already applied"`), not a top-level `noop` key.
- **Tests:** `tests/apply-edit-at-anchor.test.js` (6 cases) + wrapper `tests/scripts/assert_apply_edit_at_anchor_spec.sh`.

---

*Spec lineage: `2026-05-08_spec-skill-grill-updates` (data-flow trace, verification sketch, review protocol), `2026-05-09_html-artifacts` (HTML emit, diagram dispatch), `2026-05-10_pipeline-consolidation` (folded simulate-spec), `2026-05-23_inline-doc-comments` + `2026-05-28_inline-html-artifacts` (comment resolver, inline persistence), `2026-05-28_architecture-in-feature-sdlc` (folded architecture), `2026-05-08_non-interactive-mode` (mode contract).*
