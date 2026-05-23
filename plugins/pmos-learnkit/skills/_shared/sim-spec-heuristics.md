# sim-spec heuristics — shared substrate

Canonical scenario-trace + artifact-fitness-critique + apply-loop logic, factored out of `/simulate-spec/SKILL.md` so it can be invoked from both:

- `/simulate-spec` (standalone) — full skill body around this substrate
- `/spec` folded sim-spec phase (Tier-3 default-on; Tier-1 optional) — calls into this substrate after the spec's review loops

Mirrors the `_shared/msf-heuristics.md` pattern. **This file is NOT a SKILL.md** — it has no canonical non-interactive block, no learnings capture, no pipeline setup. Callers handle those at their own boundary; this substrate is a pure-logic library.

---

## 1. Scenario enumeration (4-pass)

Generate the candidate scenario list in four passes, then have the caller confirm with the user before tracing.

### 1a. Extract from spec
Each User Journey + each Edge Case in the spec becomes a numbered scenario (S1, S2, ...). Keep the spec's wording.

### 1b. Generate missing happy-path variants
Variants the spec didn't enumerate:
- Different personas (first-time / power / admin / support)
- Different entry points (deep link / mobile / API direct / CLI)
- Different starting states (empty data / near-quota / post-error recovery)

### 1c. Adversarial checklist (10 categories)
Service/dependency down · concurrent writes · partial failures · retries & idempotency · stale data / cache invalidation · permission/auth edges · data size / pagination limits · network partition / timeout · ordering · empty/null/malformed inputs.

For each category that applies, name 1-3 concrete scenarios. Skip categories that don't apply but state which you skipped and why.

### 1d. Model-driven pass
What could break that's specific to THIS design and not captured above? Name 3-5 design-specific failure modes.

### Consolidated table
Present `| # | Scenario | Source | Category |` to the user. Source ∈ `Spec §X.Y / Variant / Adversarial / Model-driven`. Category ∈ `happy / edge / concurrency / failure / retry / timing / auth / boundary / ordering / input`.

**Caller gate:** confirm the list with the user before continuing to scenario trace.

---

## 2. Scenario trace (per scenario)

For each confirmed scenario, decompose into the steps the design must perform end-to-end. For each step, cite the concrete spec artifact (FR-ID, API endpoint, DB column, sequence diagram step). If no artifact exists, flag as **GAP** and append to the Gap Register.

Coverage matrix format:

```markdown
| Scenario | Step | Spec Artifact | Status |
|----------|------|---------------|--------|
| S14: Concurrent promo apply | 1. POST /orders/{id}/promo | API §9.3 | ✓ |
| | 2. Check availability | No `promo_usage` table with unique constraint | **GAP** |
```

### Gap Register
Running list of findings from sections 2-5. Each entry: `{# | Gap | Exposed By | Severity | Disposition}`.

Severity:
- **blocker** — design will not work without this
- **significant** — design works but produces wrong outcomes in the named scenario
- **minor** — quality-of-life; not blocking
- **forward-compat** — fine today; needed for declared future consumers

Disposition is filled in section 5 (gap resolution).

---

## 3. Artifact fitness critique (4 buckets)

Walk each spec artifact bucket and ask "is this RIGHT for the scenarios?" — not "is this present?" Append findings to the Gap Register.

### Bucket 1: Data & Storage
Schema shape · relationships · constraints (UNIQUE/NOT NULL/CHECK) · indexes (match query predicates) · lifecycle columns (created_at/updated_at/deleted_at/version) · audit needs · idempotency keys · optimistic locking · config/feature flags.

### Bucket 2: Service Interfaces
Request payload completeness · response payload usefulness · error responses (enumerated shapes) · pagination/filtering/sorting · idempotency keys on mutating endpoints · versioning strategy · events/messages/webhooks (replay-safe, ordering).

### Bucket 3: Behavior (state/workflows)
All states present (failed/cancelled/terminal/partial-success) · every transition defined (incl. reverse + self-loops) · dead states flagged · side effects per transition named.

### Bucket 4: Interface (adaptive — only one variant runs based on caller's scope declaration)
- **UI in scope:** component hierarchy · state placement · all UI states (loading/empty/error/partial-load/stale/auth-expired) · first-time vs returning · validation · navigation/deep-linking/back-button · optimistic updates + rollback · accessibility · responsive breakpoints.
- **CLI in scope:** args/flags/output/exit codes · `--help` complete · piping/composability · idempotency/`--dry-run`/verbosity flags · actionable error messages.
- **Library only:** public API ergonomics · naming · return shapes · documentation completeness.

---

## 4. Cross-reference (interface ↔ core)

Walk the interface (API/UI/CLI/lib) layer and verify every observable behavior maps to ≥1 core mechanism (DB column / handler / state machine). Flag mappings that are interface-only (no implementation) or core-only (orphaned).

When companion specs exist (e.g., backend-spec + frontend-spec), do the cross-reference table against the companion. Forward-compat findings (anticipated downstream consumers) are tagged **forward-compat**, not blockers.

---

## 5. Gap resolution + apply-loop

### 5.1 Severity-keyed disposition
For each Gap-Register entry, propose ONE of:
- **Apply patch** (auto-apply when severity ≥ caller's threshold; default tier-keyed: T3=80, T2=60, T1=skipped)
- **Defer to spec author** (sub-threshold; emit as Open Question)
- **Reject as out of scope**
- **Forward-compat note** (emit as advisory, not patch)

### 5.2 Per-finding commit cadence (D16)
When the apply-loop is invoked from a parent skill (folded path), each auto-applied patch is its OWN git commit:

```
<parent-skill>: auto-apply <substrate-skill> patch P<N>
```

Where `<parent-skill>` ∈ {requirements, wireframes, spec} and `<substrate-skill>` is `simulate-spec`. Per-finding commits are the resume cursor (commits-as-state); the apply-loop on resume detects `--since=<phase.started_at>` from `git log` to skip already-applied patches.

### 5.3 Depends-on body annotation
When patch P<N> has a Phase-3 trace dependency on patch P<M> (M < N), the commit body includes:

```
Depends-on: P<M>
```

So `git log --grep="Depends-on:"` surfaces the dependency graph. /complete-dev release-notes recipe (FR-68) consumes this.

### 5.4 Sub-threshold inline disposition (D14)
When auto-apply is rejected because confidence < threshold, surface the finding via `AskUserQuestion` with options `Apply now / Defer to OQ (Recommended in NI mode) / Reject`. NI mode auto-picks Defer per FR-61.

### 5.5 Uncommitted-edits guard (FR-66)
Before opening the apply-loop on an artifact (e.g., `02_spec.md`), check `git status --porcelain <artifact>`. If non-empty, emit:

```
WARNING: <artifact> has uncommitted edits — folded sim-spec apply-loop will skip auto-apply (per FR-66) to avoid clobbering. Run /spec --skip-folded-sim-spec OR commit your edits first.
```

Skip the auto-apply step (fall through to manual disposition). Continue with critique + gap-register emission for advisory value.

### 5.6 Failure capture (FR-50, M1)
On apply failure (any reason — file write error, regex mismatch, dependency unsatisfied), capture `{folded_skill: simulate-spec, error_excerpt: <first-200-chars>, ts: <ISO-8601>}` and append to the parent's `state.yaml.phases.<parent>.folded_phase_failures[]` per the dedup rule in `feature-sdlc/reference/state-schema.md`. Emit chat line at moment-of-append:

```
WARNING: simulate-spec crashed (advisory continue per D11): <error_excerpt>
```

Continue per D11 advisory — folded-phase failures do NOT halt the parent skill. Only hard-phase failures halt the orchestrator.

---

## 6. Pseudocode emission

For each gap classed as **blocker** or **significant**, optionally emit a 5-15 line pseudocode sketch of the proposed fix. Pseudocode is illustrative, not prescriptive — /plan owns the actual implementation shape.

---

## 7. Tier-keyed thresholds + escape flags

| Tier | Default-on | Default threshold | Escape flag |
|------|------------|-------------------|-------------|
| 1 | no | n/a (folded path skipped) | n/a |
| 2 | optional | 60 | `--skip-folded-sim-spec` (parent skill flag) |
| 3 | yes (default-on) | 80 | `--skip-folded-sim-spec` (parent skill flag) |

Threshold is overridable via `--msf-auto-apply-threshold N` on the parent skill. Confidence < threshold falls through to D14 inline disposition.

---

## 8. Output artifacts

When the substrate is invoked from /simulate-spec (standalone), the output is `<feature_folder>/simulate-spec/<YYYY-MM-DD>-trace.md`.

When the substrate is invoked from /spec folded path, the output is patches applied directly to `02_spec.md` plus per-finding commits. No separate trace doc.

---

## Anti-patterns (DO NOT)

- Do NOT bypass the uncommitted-edits guard. The 4-line warning is mandatory before the apply-loop opens.
- Do NOT batch multiple findings into one commit. Per-finding commits are the resume contract.
- Do NOT halt the parent skill on substrate failure. Append to `folded_phase_failures[]` and continue per D11 advisory.
- Do NOT inline rationale for sub-threshold deferral inside the spec body. Defer goes to OQ artifact, not spec.
- Do NOT use this substrate when caller is `/spec` and `--skip-folded-sim-spec` was passed. The flag short-circuits at /spec body, BEFORE reaching this substrate.
