---
name: simulate-spec
description: Pressure-test a spec against realistic and adversarial scenarios before implementation — scenario trace, artifact fitness critique, interface cross-reference, targeted pseudocode. Optional validator between /spec and /plan in the requirements -> spec -> plan pipeline. Use when the user says "simulate the design", "validate this spec", "will this design actually work", "check for gaps in the design", or has a spec ready for end-to-end scrutiny before implementation.
user-invocable: true
argument-hint: "<path-to-spec-doc> [--feature <slug>] [--force] [--format <html|md|both>] [--non-interactive | --interactive]"
---

# Spec Simulation Generator

Pressure-test a technical spec by walking realistic and adversarial scenarios through it, critiquing each artifact for fitness, cross-referencing interface and core, and producing a standalone simulation doc whose Gap Register drives coordinated spec patches. The output is both a quality gate and a durable "why we believe this design works" artifact.

This is an OPTIONAL VALIDATOR in the pipeline — runs between `/spec` and `/plan`:

```
/requirements  →  [/msf-req, /creativity]  →  /spec  →  [/simulate-spec]  →  /plan  →  /execute  →  /verify
                   optional enhancers                  (this skill)
                                                      optional validator
```

**Announce at start:** "Using the simulate-spec skill to pressure-test the design."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** State your assumption, document it in the output, and proceed. The user reviews after completion.
- **No subagents:** Perform research and analysis sequentially as a single agent.
- **No Playwright MCP:** Note browser-based verification as a manual step for the user.

## Track Progress

This skill has multiple phases. Create one task per phase using your agent's task-tracking tool (e.g., `TodoWrite` in Claude Code, equivalent in other agents). Mark each task in-progress when you start it and completed as soon as it finishes — do not batch completions.

## Load Learnings

Read `~/.pmos/learnings.md` if it exists. Note any entries under `## /simulate-spec` and factor them into your approach for this session.

---

## Phase 0: Load Workstream Context

Before any other work, follow `_shared/pipeline-setup.md` Section 0 (canonical inline block) to read `.pmos/settings.yaml`, resolve `{docs_path}`, load workstream context, and resolve `{feature_folder}` (with `skill_name=simulate-spec`, `feature_arg=<--feature value or empty>`, `feature_hint=<spec slug or topic>`). Use workstream context to inform critique — product constraints and tech-stack decisions shape what counts as a gap. Also note any entries under `## /simulate-spec` in `~/.pmos/learnings.md` and factor them into your approach for this session. This skill consumes `02_spec.{html,md}` (via resolve-input.md) and writes traces under `{feature_folder}/simulate-spec/`.

### Phase 0 addendum: output_format resolution (FR-12)

After the pipeline-setup block above, additionally:

- **Resolve `output_format`.** Read `output_format` from `.pmos/settings.yaml` (default: `html`; valid values: `html`, `md`, `both`). A `--format <html|md|both>` argument-string flag overrides settings (last flag wins on conflict, per FR-12). Print to stderr exactly: `output_format: <value> (source: <cli|settings|default>)` once at Phase 0 entry. NOTE: this controls the format of the **trace artifact** only — spec patches applied via the `Edit` tool in Phase 7 are unchanged (the spec is already in its primary format by the time this skill runs; per runbook edge case F3).

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

## Phase 1: Intake, Tier Detection & Scope Declaration

### 1.1 Locate the spec
Follow `_shared/resolve-input.md` with `phase=spec`, `label="spec"`. Echo the resolved path before proceeding.

### 1.2 Read the spec end-to-end
<!-- defer-only: ambiguous -->
Read the full file. Summarize back to the user in 3-5 bullets covering: problem, primary goals, tier, decisions already made. Confirm understanding via AskUserQuestion (or state assumption per Platform Adaptation if AskUserQuestion is unavailable).

### 1.3 Check for existing simulation
Look in `{feature_folder}/simulate-spec/` for an existing trace file covering this feature.
- **If found:** ask "Is this an update to the existing simulation, or a fresh start?" Update mode re-traces only against changed spec sections; fresh start re-runs all phases.
- **If not found:** proceed.

### 1.4 Detect tier from spec header

| Tier | Behavior |
|------|----------|
| **Tier 1** (bug fix) | Skill refuses to run by default. Announce: "This is a Tier 1 spec — simulation is overkill. Skipping. Re-invoke with `--force` to run anyway." Then exit. **If `--force` was passed in invocation arguments, proceed using Tier 2 behavior.** |
| **Tier 2** (enhancement) | All phases run. Inline gap resolution (one gap at a time in Phase 7). 1 review loop. |
| **Tier 3** (feature / new system) | All phases run. Batched gap resolution (by category in Phase 7). 1 review loop. Deeper adversarial coverage in Phase 2. |

The tier is declared in the spec header (e.g., `**Tier:** 2`). If absent, infer from scope (single bug → Tier 1; behavior enhancement → Tier 2; new capability or major redesign → Tier 3) and announce the inferred tier for confirmation.

**Argument parsing:** The skill accepts a positional spec path and an optional `--force` flag. Example invocations:
- `/pmos-toolkit:simulate-spec docs/specs/2026-04-18-foo-spec.md` — auto-detect tier; refuse if Tier 1
- `/pmos-toolkit:simulate-spec docs/specs/2026-04-18-foo-spec.md --force` — proceed regardless of tier (Tier 1 specs run with Tier 2 behavior)

### 1.5 Scope Declaration

**First, propose** by auto-detecting layers from the spec's section headers (DB Schema, API Contracts, Frontend Design, CLI, Events, Infrastructure, etc.) and combining with the Non-Goals section. State your proposal in writing.

<!-- defer-only: ambiguous -->
**Then confirm** by asking the user via AskUserQuestion to validate or expand:

> "Scope check:
> - **In this spec:** [auto-detected layers]
> - **Out of scope** (deferred to separate spec or later phase)?
> - **Companion specs** (e.g., backend-spec.md and frontend-spec.md)? Paths if any.
> - **Downstream consumers we should anticipate** (e.g., 'web UI in Phase 2')?"

Record the answers. The scope drives everything downstream:
- **Out-of-scope layers** → their critique buckets in Phase 4 are SKIPPED, not flagged as gaps
- **Companion specs** → cross-referenced during Phase 5 wire-up (read the companion, do the cross-reference table against it)
- **Anticipated consumers** → produce **forward-compat notes** rather than gaps — soft flags like "API response lacks `discount_breakdown` — fine today but likely needed when the visual UI lands"

### 1.6 Record scope

Hold scope state in memory; it gets written into Phase 8's simulation doc Section 1 (Scope).

**Gate:** Do not proceed to Phase 2 until tier is confirmed and scope is declared.

### Input Contract (when invoked as reviewer subagent)

When a parent orchestrator (currently `/feature-sdlc`) invokes this skill as a reviewer subagent, the parent has chrome-stripped the spec artifact via `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/chrome-strip.js` (FR-50, T12) and passes the stripped slice (`<h1>` + `<main>`) inline as the prompt body. In that mode, this skill skips its own resolver (`_shared/resolve-input.md`) and operates directly on the stripped HTML.

**Output shape (FR-51 canonical):** the skill MUST first enumerate every `<section>` id and every `<h2>`/`<h3>` id it can locate in the stripped slice, returning them as `sections_found: [...]`. It then evaluates against its own rubric and emits findings as `{section_id, severity, message, quote: "<≥40-char verbatim from source>"}`.

**Parent-side validation (FR-52, the skill MUST NOT self-validate):** the parent will (a) set-equality-check `sections_found` against `<artifact>.sections.json`, (b) substring-grep every `quote` against the original (un-stripped) source HTML, (c) hard-fail on any miss. This skill does not duplicate that validation; the contract lives in the parent.

## Phase 2: Scenario Enumeration

> **Shared substrate:** the canonical 4-pass enumeration + scenario trace + artifact-fitness critique + apply-loop logic lives at `_shared/sim-spec-heuristics.md` (factored 2026-05-10 so the same logic can be reused by `/spec`'s folded sim-spec phase). The body below is the standalone-skill phrasing; both paths converge on the same heuristics. When in doubt, the substrate doc is canonical.

Generate the full scenario list in four passes, then confirm with the user before tracing. The point of simulation is to find gaps the spec MISSED — trusting only the spec's stated scenarios defeats the purpose.

### 2a. Extract from spec
Each User Journey and each Edge Case in the spec becomes a numbered scenario (S1, S2, ...). Keep the spec's wording where possible.

### 2b. Generate missing happy-path variants
Look for variants the spec didn't enumerate:
- Different personas (first-time user, power user, admin, support agent)
- Different entry points (deep link, mobile, API direct, CLI)
- Different starting states (empty data, near-quota, post-error recovery)

Add each as a new numbered scenario.

### 2c. Adversarial checklist
For each of these 10 categories, name 1-3 concrete scenarios where applicable to this spec. SKIP categories that don't apply — but state which you skipped and why.

1. **Service/dependency down** — what if a downstream service is unreachable mid-flow?
2. **Concurrent writes** — same resource by same user; same resource by two users; rapid retries
3. **Partial failures** — step N of M fails; some side effects committed, others not
4. **Retries & idempotency** — retry fires after the original eventually succeeded; double-submit
5. **Stale data / cache invalidation** — user sees old data; cache TTL boundary; stale read after write
6. **Permission/auth edge cases** — token expires mid-flow; role downgraded mid-flow; cross-tenant access attempt
7. **Data size / pagination limits** — empty result; result at boundary (page size − 1, page size, page size + 1); 10x expected size
8. **Network partition / timeout** — request sent but response lost; long-running operation timeout
9. **Ordering** — out-of-order event delivery; late-arriving data; clock skew between services
10. **Empty / null / malformed inputs** — required field missing; whitespace-only; UTF-8 edge characters; max-length boundary

### 2d. Model-driven pass
Read the spec critically — what could break that's specific to THIS design and not captured above? Name 3-5 design-specific failure modes. Examples of the shape of question to ask:
- "What if the deduplication window is shorter than the retry window?"
- "What if the spec's batch-size assumption breaks at scale?"
- "What if two flows that share a state column get into a race?"

### Consolidated scenario list

Present the full list as a table:

| # | Scenario | Source | Category |
|---|----------|--------|----------|
| S1 | Customer places order with valid promo | Spec §5.2 | happy |
| S14 | Two customers apply last-remaining promo simultaneously | Adversarial | concurrency |
| S22 | Webhook retry fires after the original succeeded | Adversarial | retry |
| S27 | Promo expires while order is still in cart (5+ min) | Model-driven | timing |

**Source values:** `Spec §X.Y`, `Variant`, `Adversarial`, `Model-driven`.
**Category values:** `happy`, `edge`, `concurrency`, `failure`, `retry`, `timing`, `auth`, `boundary`, `ordering`, `input` (or other category names that fit).

**Gate:** Present consolidated scenario list. Ask "Here are N scenarios. Any missing? Any to remove?" Wait for user confirmation (or stated assumption per Platform Adaptation) before Phase 3.

## Phase 3: Scenario Trace

For each confirmed scenario, decompose into the steps the design must perform end-to-end. For each step, cite the concrete spec artifact that implements it (FR-ID, API endpoint, DB column, sequence diagram, state transition, sequence step). If no artifact exists for a step, flag as **GAP** and append to the Gap Register.

**Coverage matrix format:**

| Scenario | Step | Spec Artifact | Status |
|----------|------|---------------|--------|
| S14: Concurrent promo apply | 1. Customer A sends POST /orders/{id}/promo | API §9.3 | ✓ |
| | 2. Check promo availability | No `promo_usage` table with unique constraint | **GAP** |
| | 3. Decrement promo counter | Not specified | **GAP** |
| | 4. Return success | API §9.3 response | ✓ |

**Gap Register:** A running list of all findings from Phases 3-6. Each entry: `{# | Gap | Exposed By | Severity | Disposition}`. Severity is one of:
- **blocker** — design will not work without this
- **significant** — design works but produces wrong outcomes in the named scenario
- **minor** — quality-of-life issue, not blocking
- **forward-compat** — fine today; needed for declared future consumers

Disposition is filled in Phase 7. The Gap Register persists across Phases 3-6 — every phase appends to it.

**Tip:** When a step has multiple plausible artifacts, cite all of them. Ambiguity itself is a finding worth logging as "minor — multiple valid interpretations."

---

## Phase 4: Artifact Fitness Critique

Walk each spec artifact bucket and ask not "is this present?" but "is this RIGHT for the scenarios?" Findings get appended to the Gap Register with severity labels.

Run the buckets that apply based on the Scope Declaration from Phase 1. Skip buckets explicitly out of scope.

### Bucket 1: Data & Storage

For each table / collection / persistent store in the spec:
- **Schema shape** — does it have the columns the scenarios need? Right cardinality (single vs. list)?
- **Relationships** — foreign keys present? Cardinality correct (1:1 vs. 1:N vs. N:N)?
- **Constraints** — UNIQUE on what should be unique? NOT NULL on what shouldn't be null? CHECK constraints for state machines?
- **Indexes** — do the actual query patterns from the scenarios have supporting indexes? Composite index column order match query predicates?
- **Lifecycle columns** — `created_at`, `updated_at`, soft-delete (`deleted_at`), version (`version` for optimistic locking)?
- **Temporal / audit needs** — do scenarios require historical state? Audit log table?
- **Idempotency** — `idempotency_key` column on tables that receive retried writes?
- **Optimistic locking / versioning** — concurrency-sensitive tables have a version column?
- **Config & feature flags** — runtime configurable values captured? Default values documented?

### Bucket 2: Service Interfaces

For each API endpoint, message, event, webhook, or integration contract:
- **Request payload completeness** — every field the handler needs is in the request?
- **Response payload usefulness** — consumer needs (not just "return the entity")? Will consumers need a follow-up call to get related data?
- **Error responses** — enumerated with shape (not just status codes)? Each plausible failure has a defined error shape?
- **Pagination, filtering, sorting** — present where collection size warrants?
- **Idempotency keys** — required on mutating endpoints that are retry-prone?
- **Versioning strategy** — clear path for backward-compatible evolution?
- **Events / messages / webhooks** — payload shape stable? Replay-safe? Ordering guarantees stated?

### Bucket 3: Behavior (State / Workflows)

For each state machine, workflow, or multi-step process:
- **All states present** — including failed, cancelled, terminal/archived? Partial-success states?
- **Every transition defined** — including reverse transitions (rollback, cancel) and self-loops (retry)?
- **Dead states** — flagged any state with no way out?
- **Side effects per transition** — named explicitly (event emitted, notification sent, downstream call triggered)?

### Bucket 4: Interface (adaptive — only one variant runs based on Scope Declaration)

**If UI is in scope:**
- Component hierarchy — right boundaries, right ownership of state?
- State placement — URL / store / server / component — sensible?
- All UI states covered — loading, empty, error, partial-load, stale, auth-expired-mid-flow?
- First-time vs. returning user, form validation, navigation, deep-linking, back-button behavior?
- Optimistic updates + rollback behavior on API failure?
- Accessibility (keyboard nav, screen reader, ARIA), responsive breakpoints?

**If CLI is in scope:**
- Arguments, flags, output format, exit codes?
- `--help` complete and accurate?
- Piping/composability — output usable as input to next command?
- Idempotency, `--dry-run`, logging verbosity flags?
- Error messages actionable (tell user what to do)?

**If Library only:**
- Public API ergonomics — naming, return shapes, error types?
- Pagination patterns (iterators vs. cursors vs. callback)?
- Sync vs. async clearly delineated?

**If no interface declared:** skip Bucket 4.

### Bucket 5: Wire-up

Handled in Phase 5 (Interface ↔ Core Cross-Reference). No critique here — the cross-reference table IS the critique.

### Bucket 6: Operational

- **NFR specificity** — performance targets numeric and measurable? Accessibility requirements concrete (WCAG level)? Security posture (authn, authz, data classification, encryption at rest/transit)?
- **Observability** — logs (what events, what fields), metrics (what counters/histograms, what dimensions), traces (what spans, what attributes)?
- **Rollout** — feature flags for risky paths? Migration order documented? Rollback plan concrete? Graceful degradation when downstream is unavailable?
- **Architecture diagram** — external dependencies named with their versions/SLAs? Data flow directions clear? Ownership boundaries match team boundaries?

### Extensibility clause

Scan the spec for any artifact types not covered above (CLI definitions, cron schedules, IaC resources, ML training loops, message broker topics, etc.). For each, apply the same "is this right, or just present?" critique using the patterns from the buckets above as a starting point.

---

## Phase 5: Interface ↔ Core Cross-Reference

Required when the spec has an interface in scope. Skip if Scope Declaration set "no interface" (pure service / library-only).

**Interface-type → table format:**

| Interface in scope | Cross-reference table |
|--------------------|----------------------|
| Frontend (UI) | UI interaction ↔ API endpoint |
| CLI | CLI command ↔ API/function |
| External service / webhook | Caller ↔ endpoint |
| Library-only | Public function ↔ internal logic |
| None declared | Skip Phase 5 |

**Standard column set:**

| # | Interaction | Trigger | Endpoint/Function | Req Shape Match | Res Has What Consumer Needs | Error Mapping Defined | Notes |
|---|-------------|---------|-------------------|-----------------|----------------------------|----------------------|-------|
| W1 | Click "Apply promo" | `<PromoInput>` component | POST /orders/{id}/promo | ✓ | ✗ missing `discount_breakdown` | partial — no "expired" UI msg | Wire-up gap W1 (significant) |
| W2 | Submit checkout | `<CheckoutForm>` | POST /orders | ✓ | ✓ | ✓ | clean |

**Reverse scan** (do this AFTER the forward table):
- Every endpoint defined in the spec's API section → does it have a consumer in the interface (or is it explicitly flagged as internal/admin/cron-only)?
- Every mutating action in the interface → does it map to a defined endpoint?

**Orphans become gaps:**
- Endpoint with no consumer → either gap (forgotten consumer) or doc gap (missing "internal" tag)
- Interface action with no endpoint → blocker gap

Append all wire-up findings to the Gap Register with `W` prefix (W1, W2, ...) to distinguish from scenario gaps (S-prefix) and fitness gaps (B-prefix for bucket).

If a companion spec was provided in Scope Declaration (Phase 1), read it now and complete the cross-reference against it (e.g., backend-spec defines POST /orders; frontend-spec calls it from `<CheckoutForm>` — verify the contract holds across the seam).

## Phase 6: Targeted Pseudocode

Write pseudocode for 2-3 flows that are algorithmically complex enough to warrant the depth. **Do NOT pseudocode every flow** — that's an anti-pattern; it duplicates `/plan` and locks in implementation choices prematurely.

### Selection criteria

A flow gets pseudocode if ANY of these triggers apply:
1. **Non-trivial state machine** — 3+ states with branching transitions
2. **Algorithmic complexity** — sorting, matching, scoring, pricing, scheduling
3. **Multi-step write with rollback needs** — distributed transaction, saga, compensating actions
4. **Reconciliation / retry / idempotency logic** — periodic sync, redelivery handling
5. **Concurrency-sensitive** — locks, optimistic versioning, CAS operations, leader election

**Hard cap: Max 2-3 flows.** If more than 3 qualify, pick the 3 with the highest combination of complexity and blast radius.

### Format per flow

```
Flow: <name>
Entry: <trigger — API endpoint, scheduled job, event subscription>

FUNCTION <name>(<params>):
  # English description of step
  <variable> = <db call or logic>
  IF <condition>:
    <branch>
  ELSE:
    <branch>
  RETURN <shape>
```

Each pseudocode block is followed by FOUR required sections:

- **DB calls:** every query and mutation this flow performs (with table and predicate)
- **State transitions:** every state change named (FROM → TO with the trigger)
- **Error branches:** every point this can fail and what happens (rollback, retry, alert, propagate)
- **Concurrency notes:** what's protected by what (advisory lock, transaction isolation level, unique constraint, CAS column)

If a section doesn't apply to this flow (e.g., file-IO-only flows have no DB calls; stateless transforms have no state transitions), declare it as `**<Section>:** N/A — <one-line reason>` and move on. Do not pad with empty bullets.

### Why these four sections

The pseudocode itself catches algorithmic bugs. The four follow-up sections catch the bugs pseudocode misses — concurrency races, missing rollback paths, untracked state changes, missing DB queries the flow assumes exist. Writing them is part of the discipline; skipping them defeats the point.

---

## Phase 7: Gap Resolution

For every gap in the Gap Register (from Phases 3-6), the agent generates a context-and-patch proposal, then the user picks a disposition.

### Per-gap workflow

For each gap:
1. **Context:** restate the gap in one sentence, name which scenario or artifact exposed it, severity (blocker / significant / minor / forward-compat).
2. **Proposed patch:** specific spec change with EXACT section reference and the EXACT new content. For DB schema gaps, write the SQL. For API gaps, write the request/response field. For sequence diagram gaps, write the new arrow. For wire-up gaps, name the missing endpoint or UI consumer.
3. **User picks disposition:**
   - **Apply patch** — agent uses the `Edit` tool on the spec file to apply the change. Logs the change in simulation doc §10 (Spec Patches Applied).
   - **Modify patch** — user refines the proposal; agent applies the modified version.
   - **Accept as risk** — gap stays unaddressed; logged in simulation doc §8 (Accepted Risks) with the user's stated rationale.
   - **Defer as open question** — gap stays unaddressed but flagged as needing external input; logged in simulation doc §9 (Open Questions) with owner and needed-by date if known.

### Tier-based interaction

<!-- defer-only: ambiguous -->
**Always present gaps via `AskUserQuestion`, never as a prose dump.** One question per gap, options = the four dispositions above (Apply patch / Modify patch / Accept as risk / Defer as open question). The `question` field should restate the gap + the proposed patch in one sentence so the user can decide without scrolling back.

<!-- defer-only: ambiguous -->
- **Tier 2:** issue one `AskUserQuestion` call per gap (or small batches of ≤4 related gaps). Each gap is small enough that inline review fits the rhythm.
<!-- defer-only: ambiguous -->
- **Tier 3:** batch gaps by category (Data, Interfaces, Behavior, Wire-up, Operational). Present up to 4 gaps per `AskUserQuestion` call, issue multiple calls sequentially within a category, get dispositions, then move to the next category. Avoids exhausting the user with one-by-one across potentially dozens of findings. **Category coherence over batch fullness:** if leftover findings don't share a category, issue them as separate 1-2 question calls rather than padding a final batch to 4 with unrelated items. See `../_shared/structured-ask-edge-cases.md` §3.

**Platform fallback (no interactive prompt tool):** present a numbered gap table with a disposition column; ask the user to reply with the selections. Do NOT silently apply patches.

**Edge cases of structured asks:** when a user reply slips outside the offered options (free-form text, a non-recommended pick that may break an invariant, or leftover findings that don't share a category), follow `../_shared/structured-ask-edge-cases.md`.

### Spec edits

ALWAYS use the `Edit` tool on the spec file. Never use `Write` to rewrite the whole spec. Each edit is one surgical change, logged.

### Disposition rationale

Every "Accept as risk" or "Defer as open question" MUST capture rationale. "I don't want to fix this right now" is not rationale — what's the business or technical reason? The simulation doc's value for future readers depends on traceable decisions.

**Exit gate:** Every gap in the Gap Register must have a disposition before Phase 8 writes the simulation doc. If any remain undecided, return to the user.

## Phase 8: Write Simulation Doc

Save trace files to `{feature_folder}/simulate-spec/{YYYY-MM-DD}-trace.html` per the substrate at `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/`. Create the `simulate-spec/` directory if it doesn't exist. If a file with the same date already exists, append `-2`, `-3`, etc. for subsequent runs the same day.

**Atomic write (FR-10.2):** write `<date>-trace.html` and the companion `<date>-trace.sections.json` via temp-then-rename — never serve a half-written file.

**Asset substrate (FR-10):** copy `assets/*` from `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/` to `{feature_folder}/assets/` if not already present. The substrate currently includes `style.css`, `viewer.js`, `serve.js`, `build_sections_json.js`, `comments.js`, `comments.css`, and the launcher trio (`comments-open.command`, `comments-open.sh`, `comments-open.bat`); new substrate files added in future releases ride along automatically. Idempotent — `cp -n` skips identical files.

**Asset prefix (FR-10.1):** `simulate-spec/` is one level below the feature folder, so the per-folder relative asset prefix is `../assets/`.

**Cache-bust (FR-10.3):** append `?v=<plugin-version>` to all asset URL references emitted into the HTML.

**Heading IDs (FR-03.1, enforced by `/verify`):** every `<h2>` and `<h3>` carries a stable kebab-case `id` per `_shared/html-authoring/conventions.md` §3. `assert_heading_ids.sh` (T22) blocks any artifact missing an id.

**Index regeneration (FR-22, §9.1):** after the trace write completes, regenerate `{feature_folder}/index.html` via `_shared/html-authoring/index-generator.md` (manifest inlined as `<script type="application/json" id="pmos-index">`, no on-disk `_index.json`, FR-41). The trace lands under the `simulate-spec/` phase rank.

**Mixed-format sidecar (FR-12.1):** retired — `output_format=both` is treated as `html` until a future feature re-introduces MD export.

Populate the doc from accumulated state:
- §1 (Scope) ← from Phase 1
- §2 (Scenario Inventory) ← from Phase 2
- §3 (Coverage Matrix) ← from Phase 3
- §4 (Fitness Findings) ← from Phase 4 (per-bucket)
- §5 (Cross-Reference) ← from Phase 5
- §6 (Pseudocode) ← from Phase 6
- §7 (Gap Register) ← accumulated across Phases 3-6, with dispositions filled in Phase 7
- §8 (Accepted Risks) ← from Phase 7 dispositions
- §9 (Open Questions) ← from Phase 7 dispositions
- §10 (Spec Patches Applied) ← from Phase 7 Edit calls
- §11 (Review Log) ← filled in Phase 9

### Simulation doc template

Read the full template at `reference/simulation-doc-template.md` (relative to this skill directory). It defines all 11 sections: Scope, Scenario Inventory, Coverage Matrix, Artifact Fitness Findings (6 sub-sections), Cross-Reference, Pseudocode, Gap Register, Accepted Risks, Open Questions, Spec Patches Applied, Review Log.

After writing, commit:
```
git add {feature_folder}/simulate-spec/<file>.html {feature_folder}/simulate-spec/<file>.sections.json {feature_folder}/simulate-spec/<file>.md {feature_folder}/index.html {feature_folder}/assets
git commit -m "docs: simulation for <feature>"
```
(Sidecar paths are no-ops when absent; legacy MD-only folders still snapshot cleanly.)

---

## Phase 9: Review Loop (single pass)

Run a SINGLE review pass over the simulation doc. The skill is already adversarial by design — a second pass is "critique the critique" and adds little. Gap Resolution (Phase 7) was already a collaborative review.

### Review checks

1. **Scenario completeness** — re-read the spec; did Phase 2 miss any user journey, edge case, or failure mode that should have been enumerated?
2. **Bucket completeness** — did Phase 4 cover every artifact bucket that's in scope? Any artifact type from the spec that didn't get critiqued?
3. **Cross-reference completeness** — did Phase 5 do BOTH the forward table AND the reverse scan? Any orphan endpoints or orphan interface actions missed?
4. **Gap Register integrity** — does every gap have a disposition? Does every "Apply patch" disposition appear in §10 (Spec Patches Applied)? Does every "Accept as risk" have rationale in §8?
5. **High-severity gap coverage** — every blocker gap has either an applied patch or an explicit accepted-risk decision? (No blockers should be deferred without strong reason.)

### If issues found

<!-- defer-only: ambiguous -->
Append findings to the Gap Register. Return to Phase 7 for resolution — which means presenting each new gap via `AskUserQuestion` with the four dispositions (Apply patch / Modify / Accept as risk / Defer), batched up to 4 per call by category. Do NOT narrate the findings as prose and wait for a free-form reply. Then re-write the simulation doc (or Edit it surgically). Log the loop in §11 (Review Log).

### Exit criteria

- All 5 review checks pass
- Last loop found only cosmetic issues (or no issues)
- **User has confirmed they have no further concerns** — do not self-declare exit

If user requests another loop, run it. The single-loop default is the floor, not the ceiling.

## Phase 10: Workstream Enrichment

**Skip if no workstream was loaded in Phase 0.** Otherwise, follow `_shared/pipeline-setup.md` Section C. For this skill, the signals to look for are:

- Recurring gap categories across simulations → workstream `## Constraints & Scars`
- Tech-stack-specific failure modes encountered → workstream `## Tech Stack`
- Architectural patterns that resist gaps well → workstream `## Key Decisions`

This phase is mandatory whenever Phase 0 loaded a workstream — do not skip it just because the core deliverable is complete.

---

## Phase 11: Capture Learnings

**This skill is not complete until the learnings-capture process has run.** Read and follow `learnings/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing — surprising behaviors, repeated corrections, non-obvious decisions. Proposing zero learnings is a valid outcome for a smooth session; the gate is that the reflection happens, not that an entry is written.

After learnings capture, offer the next pipeline step:

> "Simulation complete. Run `/pmos-toolkit:plan` to generate the implementation plan, or review the simulation first?"

---

## Anti-Patterns (DO NOT)

- Do NOT run on Tier 1 bug-fix specs — overkill for isolated fixes; skill should refuse and exit
- Do NOT trace scenarios before the user confirms the scenario list — tracing the wrong list wastes work
- Do NOT write pseudocode for every flow — max 2-3, only when the 5 algorithmic-complexity triggers apply
- Do NOT flag out-of-scope layers as gaps — respect the Scope Declaration from Phase 1
- Do NOT silently update the spec — every patch requires user approval (Apply / Modify / Accept / Defer)
- Do NOT conflate "not specified" with "wrong" — Scenario Trace finds coverage gaps; Artifact Fitness finds quality gaps; keep them separate in the Gap Register with different prefixes (S / B / W)
- Do NOT run simulation without reading the spec end-to-end first
- Do NOT skip Scope Declaration — assuming "full stack" causes false-positive gaps in backend-only or CLI-first specs
- Do NOT rubber-stamp gaps as "accepted risk" without recording rationale — the simulation doc's value depends on traceable decisions
- Do NOT batch gap resolution until after Phase 8 — gaps get resolved in Phase 7, before the doc is written
- Do NOT produce the simulation doc before all gaps have a disposition
