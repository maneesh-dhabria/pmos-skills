# sim-spec heuristics — shared substrate

Canonical scenario-enumeration, scenario-trace, artifact-fitness-critique, cross-reference, gap-resolution, and pseudocode logic for pressure-testing a spec. Two callers:

- **`/simulate-spec` (standalone)** — optional validator between `/spec` and `/plan`; wraps this substrate with intake / tier / scope phases and emits a durable trace artifact.
- **`/spec`'s folded sim-spec phase (`#folded-sim-spec`)** — Tier-3 default-on apply-loop folding; runs after the spec's review loops. Folding *mechanics* (escape flag, tier gating, clobber guard, auto-apply threshold, per-finding commits, failure capture) are canonical in `_shared/folded-phase.md`, not here.

This file is NOT a SKILL.md — it has no non-interactive block, no learnings capture, no pipeline setup; callers handle those at their own boundary. **This file is canonical for the heuristics** (sections 1–6). Where the two callers genuinely differ — who approves gaps, what gets written, how much pseudocode — the "Standalone vs. folded deltas" section at the end is the contract; neither caller restates the heuristics.

---

## 1. Scenario enumeration (4-pass)

Generate the candidate scenario list in four passes, then have the caller confirm with the user before tracing. The point of simulation is to find gaps the spec MISSED — trusting only the spec's stated scenarios defeats the purpose.

### 1a. Extract from spec
Each User Journey and each Edge Case in the spec becomes a numbered scenario (S1, S2, ...). Keep the spec's wording where possible.

### 1b. Generate missing happy-path variants
Look for variants the spec didn't enumerate:
- Different personas (first-time user, power user, admin, support agent)
- Different entry points (deep link, mobile, API direct, CLI)
- Different starting states (empty data, near-quota, post-error recovery)

Add each as a new numbered scenario.

### 1c. Adversarial checklist (10 categories)
For each category, name 1-3 concrete scenarios where applicable to this spec. SKIP categories that don't apply — but state which you skipped and why.

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

### 1d. Model-driven pass
Read the spec critically — what could break that's specific to THIS design and not captured above? Name 3-5 design-specific failure modes. The shape of question to ask:
- "What if the deduplication window is shorter than the retry window?"
- "What if the spec's batch-size assumption breaks at scale?"
- "What if two flows that share a state column get into a race?"

### Consolidated table
Present the full list to the user:

| # | Scenario | Source | Category |
|---|----------|--------|----------|
| S1 | Customer places order with valid promo | Spec §5.2 | happy |
| S14 | Two customers apply last-remaining promo simultaneously | Adversarial | concurrency |
| S27 | Promo expires while order is still in cart (5+ min) | Model-driven | timing |

**Source values:** `Spec §X.Y`, `Variant`, `Adversarial`, `Model-driven`. **Category values:** `happy`, `edge`, `concurrency`, `failure`, `retry`, `timing`, `auth`, `boundary`, `ordering`, `input` (or other names that fit).

**Caller gate:** confirm the list with the user before continuing to scenario trace — tracing the wrong list wastes work.

---

## 2. Scenario trace + Gap Register

For each confirmed scenario, decompose into the steps the design must perform end-to-end. For each step, cite the concrete spec artifact that implements it (FR id, API endpoint, DB column, sequence-diagram step, state transition). If no artifact exists for a step, flag as **GAP** and append to the Gap Register.

**Coverage matrix format:**

| Scenario | Step | Spec Artifact | Status |
|----------|------|---------------|--------|
| S14: Concurrent promo apply | 1. Customer A sends POST /orders/{id}/promo | API §9.3 | ✓ |
| | 2. Check promo availability | No `promo_usage` table with unique constraint | **GAP** |
| | 3. Decrement promo counter | Not specified | **GAP** |

**Tip:** when a step has multiple plausible artifacts, cite all of them — ambiguity itself is a finding worth logging as "minor — multiple valid interpretations."

### Gap Register

A running list of all findings from sections 2–4; every section appends to it. Each entry: `{# | Gap | Exposed By | Severity | Disposition}`. Prefixes distinguish provenance: `S` (scenario-trace), `B` (fitness bucket), `W` (wire-up). Severity:

- **blocker** — design will not work without this
- **significant** — design works but produces wrong outcomes in the named scenario
- **minor** — quality-of-life issue, not blocking
- **forward-compat** — fine today; needed for declared future consumers

Disposition is filled during gap resolution (§5). Do NOT conflate "not specified" with "wrong" — scenario trace finds *coverage* gaps; fitness critique (§3) finds *quality* gaps; the prefixes keep them separate.

---

## 3. Artifact fitness critique (6 buckets)

Walk each spec artifact bucket and ask not "is this present?" but "is this RIGHT for the scenarios?" Findings get appended to the Gap Register with severity labels. Run only the buckets the caller's scope declaration puts in scope — skipped out-of-scope buckets are not gaps.

### Bucket 1: Data & Storage
For each table / collection / persistent store:
- **Schema shape** — does it have the columns the scenarios need? Right cardinality (single vs. list)?
- **Relationships** — foreign keys present? Cardinality correct (1:1 vs. 1:N vs. N:N)?
- **Constraints** — UNIQUE on what should be unique? NOT NULL on what shouldn't be null? CHECK constraints for state machines?
- **Indexes** — do the actual query patterns from the scenarios have supporting indexes? Composite index column order match query predicates?
- **Lifecycle columns** — `created_at`, `updated_at`, soft-delete (`deleted_at`), version (optimistic locking)?
- **Temporal / audit needs** — do scenarios require historical state? Audit log table?
- **Idempotency** — `idempotency_key` column on tables that receive retried writes?
- **Config & feature flags** — runtime-configurable values captured? Default values documented?

### Bucket 2: Service Interfaces
For each API endpoint, message, event, webhook, or integration contract:
- **Request payload completeness** — every field the handler needs is in the request?
- **Response payload usefulness** — consumer needs (not just "return the entity")? Will consumers need a follow-up call for related data?
- **Error responses** — enumerated with shape (not just status codes)? Each plausible failure has a defined error shape?
- **Pagination, filtering, sorting** — present where collection size warrants?
- **Idempotency keys** — required on mutating endpoints that are retry-prone?
- **Versioning strategy** — clear path for backward-compatible evolution?
- **Events / messages / webhooks** — payload shape stable? Replay-safe? Ordering guarantees stated?

### Bucket 3: Behavior (state / workflows)
For each state machine, workflow, or multi-step process:
- **All states present** — including failed, cancelled, terminal/archived, partial-success?
- **Every transition defined** — including reverse transitions (rollback, cancel) and self-loops (retry)?
- **Dead states** — flagged any state with no way out?
- **Side effects per transition** — named explicitly (event emitted, notification sent, downstream call triggered)?

### Bucket 4: Interface (adaptive — only one variant runs, per the caller's scope declaration)
- **UI in scope:** component hierarchy (right boundaries, right state ownership) · state placement (URL / store / server / component) · all UI states (loading, empty, error, partial-load, stale, auth-expired-mid-flow) · first-time vs. returning user · form validation · navigation / deep-linking / back-button · optimistic updates + rollback on API failure · accessibility (keyboard nav, screen reader, ARIA) · responsive breakpoints.
- **CLI in scope:** arguments / flags / output format / exit codes · `--help` complete and accurate · piping/composability (output usable as next command's input) · idempotency, `--dry-run`, verbosity flags · error messages actionable.
- **Library only:** public API ergonomics (naming, return shapes, error types) · pagination patterns (iterators vs. cursors vs. callbacks) · sync vs. async clearly delineated.
- **No interface declared:** skip this bucket.

### Bucket 5: Wire-up
Handled by the cross-reference scan (§4). No separate critique — the cross-reference table IS the critique.

### Bucket 6: Operational
- **NFR specificity** — performance targets numeric and measurable? Accessibility requirements concrete (WCAG level)? Security posture (authn, authz, data classification, encryption at rest/transit)?
- **Observability** — logs (what events, what fields), metrics (what counters/histograms, what dimensions), traces (what spans, what attributes)?
- **Rollout** — feature flags for risky paths? Migration order documented? Rollback plan concrete? Graceful degradation when downstream is unavailable?
- **Architecture diagram** — external dependencies named with versions/SLAs? Data-flow directions clear? Ownership boundaries match team boundaries?

### Extensibility clause
Scan the spec for any artifact types not covered above (cron schedules, IaC resources, ML training loops, message-broker topics, etc.). For each, apply the same "is this right, or just present?" critique using the buckets above as the starting pattern.

---

## 4. Cross-reference (interface ↔ core)

Required when the spec has an interface in scope; skip when the scope declaration says "no interface" (pure service / library-only).

**Interface-type → table format:** Frontend (UI) → UI interaction ↔ API endpoint · CLI → command ↔ API/function · External service/webhook → caller ↔ endpoint · Library-only → public function ↔ internal logic.

**Standard column set:**

| # | Interaction | Trigger | Endpoint/Function | Req Shape Match | Res Has What Consumer Needs | Error Mapping Defined | Notes |
|---|-------------|---------|-------------------|-----------------|----------------------------|----------------------|-------|
| W1 | Click "Apply promo" | `<PromoInput>` component | POST /orders/{id}/promo | ✓ | ✗ missing `discount_breakdown` | partial — no "expired" UI msg | Wire-up gap W1 (significant) |

**Reverse scan** (AFTER the forward table): every endpoint defined in the spec → does it have a consumer in the interface (or an explicit internal/admin/cron-only tag)? Every mutating action in the interface → does it map to a defined endpoint?

**Orphans become gaps:** endpoint with no consumer → gap (forgotten consumer) or doc gap (missing "internal" tag); interface action with no endpoint → blocker gap. Append all wire-up findings to the Gap Register with the `W` prefix.

**Companion specs:** when the caller's scope declaration names companion specs (e.g., backend-spec + frontend-spec), read them and complete the cross-reference across the seam. Findings about *anticipated* downstream consumers are tagged **forward-compat**, not blockers.

---

## 5. Gap resolution + apply-loop

For every Gap-Register entry, generate a context-and-patch proposal:

1. **Context:** restate the gap in one sentence; name the scenario or artifact that exposed it; severity.
2. **Proposed patch:** a specific spec change with the EXACT section reference and the EXACT new content — SQL for DB schema gaps, the request/response field for API gaps, the new arrow for sequence-diagram gaps, the missing endpoint or UI consumer for wire-up gaps.

How the proposal is *disposed* depends on the caller — this is the largest standalone/folded difference (see "Standalone vs. folded deltas"):

- **Standalone (`/simulate-spec` Phase 7):** every patch requires user approval via the four dispositions (Apply patch / Modify patch / Accept as risk / Defer as open question). No auto-apply, ever. Accepted/deferred gaps MUST carry rationale. Spec edits are surgical `Edit` calls, never whole-file rewrites.
- **Folded (`/spec` `#folded-sim-spec`):** findings at or above the confidence threshold auto-apply as inline edits to the host artifact with per-finding commits; sub-threshold findings surface via the structured ask with `Defer to OQ (Recommended)`. Threshold, commit cadence and message shape (incl. `Depends-on:` trailers), the pre-apply clobber guard, and failure capture are all canonical in `_shared/folded-phase.md`; `/spec`'s parameter block states its call-site naming (`patch P<N>`).

Sub-threshold deferral rationale goes to the Open Questions artifact, never inlined into the spec body.

---

## 6. Targeted pseudocode

Write pseudocode for flows that are algorithmically complex enough to warrant the depth. **Do NOT pseudocode every flow** — that duplicates `/plan` and locks in implementation choices prematurely.

### Selection criteria
A flow gets pseudocode if ANY of these triggers apply:
1. **Non-trivial state machine** — 3+ states with branching transitions
2. **Algorithmic complexity** — sorting, matching, scoring, pricing, scheduling
3. **Multi-step write with rollback needs** — distributed transaction, saga, compensating actions
4. **Reconciliation / retry / idempotency logic** — periodic sync, redelivery handling
5. **Concurrency-sensitive** — locks, optimistic versioning, CAS operations, leader election

**Hard cap (standalone): max 2-3 flows.** If more qualify, pick the 3 with the highest combination of complexity and blast radius. **Folded delta:** the folded path instead emits an optional 5-15 line sketch per **blocker**/**significant** gap, illustrative not prescriptive — `/plan` owns the implementation shape.

### Format per flow

```
Flow: <name>
Entry: <trigger — API endpoint, scheduled job, event subscription>

FUNCTION <name>(<params>):
  # English description of step
  <variable> = <db call or logic>
  IF <condition>: <branch>
  ELSE: <branch>
  RETURN <shape>
```

Each pseudocode block is followed by FOUR required sections:

- **DB calls:** every query and mutation this flow performs (with table and predicate)
- **State transitions:** every state change named (FROM → TO with the trigger)
- **Error branches:** every point this can fail and what happens (rollback, retry, alert, propagate)
- **Concurrency notes:** what's protected by what (advisory lock, transaction isolation level, unique constraint, CAS column)

If a section doesn't apply, declare `**<Section>:** N/A — <one-line reason>`; do not pad with empty bullets.

**Why these four sections:** the pseudocode itself catches algorithmic bugs; the four follow-up sections catch the bugs pseudocode misses — concurrency races, missing rollback paths, untracked state changes, missing DB queries the flow assumes exist. Writing them is part of the discipline; skipping them defeats the point.

---

## Standalone vs. folded deltas

The one table reconciling how the two callers consume sections 1–6:

| Dimension | `/simulate-spec` (standalone) | `/spec` `#folded-sim-spec` (folded) |
|---|---|---|
| Scope source | Phase 1 scope declaration (user-confirmed) | The spec's own sections + Non-Goals |
| Gap resolution (§5) | Interactive four-disposition `AskUserQuestion`; user approval mandatory for every patch | Threshold-keyed auto-apply + sub-threshold ask, per `_shared/folded-phase.md` |
| Output artifact | `{feature_folder}/simulate-spec/<YYYY-MM-DD>-trace.html` (+ `.sections.json`), emitted per `_shared/html-authoring/README.md` | Patches applied directly to `{feature_folder}/02_spec.html` with per-finding commits; no separate trace doc |
| Pseudocode (§6) | 2-3 highest-complexity flows, four follow-up sections mandatory | Optional 5-15-line sketch per blocker/significant gap |
| Commits | One `docs:` commit for the trace doc (caller's Phase 8) | Per-finding commits (resume cursor) per `_shared/folded-phase.md` |
| Escape | Tier-1 refusal with `--force` override | `--skip-folded-sim-spec` (short-circuits at `/spec`, BEFORE reaching this substrate) |

---

## Anti-patterns (DO NOT)

- Do NOT trust only the spec's stated scenarios — passes 1b–1d exist because the spec's blind spots are the target.
- Do NOT conflate "present" with "right" — §3's framing question is the critique.
- Do NOT skip the reverse scan in §4 — orphan endpoints hide there.
- Do NOT inline rationale for sub-threshold deferral inside the spec body. Defer goes to the OQ artifact, not the spec.
- Do NOT invoke this substrate from `/spec` when `--skip-folded-sim-spec` was passed — the flag short-circuits in `/spec`'s body before reaching here.
- Folded-path mechanics anti-patterns (clobber-guard bypass, batched commits, halting the parent on substrate failure) are owned by `_shared/folded-phase.md` — follow them there.

---

*Spec lineage: factored from `/simulate-spec` in `2026-05-10_pipeline-consolidation` (T5; folding decisions D11/D14/D16, FR-50/FR-66 — mechanics since consolidated into `_shared/folded-phase.md`); full checklists/adversarial categories/pseudocode discipline moved here from the standalone SKILL.md per the 2026-06-10 skill-design review, which also documented and reconciled the four SKILL.md↔substrate divergences (gap-resolution model, output format, pseudocode shape, bucket count) in the deltas table above.*
