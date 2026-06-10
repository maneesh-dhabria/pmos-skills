# Folded-Phase Checks — /verify side

Loaded only when verifying a feature folder produced by /feature-sdlc (a worktree
`state.yaml` exists). Shared folding mechanics — escape flags, tier gating,
failure capture, output slugs — live in `_shared/folded-phase.md`; this file
carries /verify's two roles: the *awareness* pass over other skills' folded-phase
artifacts (§A) and /verify's own dispatch-only folding of `/architecture --since`
(§B). Everything in this file is advisory — none of it blocks /verify PASS.

## §A — Folded-phase awareness (Phase 4a)

### Slug-distinct artifact preference

For MSF artifacts, prefer the slug-distinct paths (the `<folded-skill>-findings`
convention from `_shared/folded-phase.md` § "Output slug"):

- `<feature_folder>/msf-req-findings.md` — written by /requirements' folded MSF-req.
- `<feature_folder>/wireframes/msf-wf-findings/<wireframe-id>.md` — written by
  /wireframes' folded MSF-wf (per-wireframe directory variant).

**Legacy fallback:** if `msf-req-findings.md` is absent but `msf-findings.md`
exists, /verify still passes the artifact check but emits a soft warning:

```
legacy slug detected at <path>; new writes use msf-req-findings.md (D3 / pipeline-consolidation v2.34.0). No action required for this run.
```

### Affirmative folded-phase-completion signal

When BOTH conditions hold for a Tier-3 feature:

1. All folded phases were Skipped (`state.yaml.phases.<x>.notes` records
   `--skip-folded-{msf,msf-wf,sim-spec}` flags)
2. `state.yaml.phases.<x>.folded_phase_failures[]` is empty for all phases

…emit an affirmative line in the compliance summary:

```
✓ folded phases skipped per documented flags
```

### Advisory warning — Tier-3 feature with no folded artifacts and no documented skip

When a Tier-3 feature has:

- NO `msf-req-findings.md`, NO per-wireframe MSF-wf findings, NO simulate-spec
  patches in `02_spec.md` git history
- NO `--skip-folded-*` flags documented in `state.yaml.phases.<x>.notes`
- NO entries in `folded_phase_failures[]`

…emit ADVISORY (not blocking):

```
WARNING: Tier-3 feature has no folded MSF artifacts and no documented skips; folded phases may have been bypassed silently. Verify intentional.
```

### Per-failure advisory emit

For every entry in any phase's `folded_phase_failures[]`, emit:

```
WARNING: <folded-skill> crashed in <phase> (advisory per D11): <error_excerpt>
```

(The `per D11` token is part of the emitted log-line contract — keep it verbatim,
per `_shared/folded-phase.md` § "Failure capture".) These are advisory; /verify
still PASSes if everything else is green. They surface so the user sees
folded-phase health at every /verify run.

## §B — Folded /architecture --since (Phase 4b)

Delegates to the `/architecture` skill's `--since` mode to lint code changed on
this branch against the architectural assertions baked into `02_spec.html`.
Findings aggregate into /verify's report alongside lint, tests, and code-review
output.

### Pre-flight short-circuit

If the argument string carries `--skip-folded-arch` (the folding's escape flag —
machine-coupled, never renamed, per `_shared/folded-phase.md`; `/spec` uses the
same flag name for its own folded `/architecture --from-spec` phase), emit
`architecture: --skip-folded-arch flag; skipping` to stderr and proceed to
Phase 5 without further work. No dispatch, no state.yaml mutation.

### Tier gate

| Tier | Behavior |
|------|----------|
| 1    | Emit `arch sub-step: tier 1, skipping` to chat. No dispatch. Proceed to Phase 5. |
| 2    | Scoped run — dispatch with `--since` against the changed file set only. /architecture's pre-flight already short-circuits on empty diff. |
| 3    | Full run — dispatch with `--since` against `git merge-base HEAD main`. Larger scope but same skill invocation. |

### Dispatch

Compute the since-base:

```bash
SINCE=$(git merge-base HEAD main)
```

If the resolution fails (no `main` branch, detached HEAD, etc.), log the git error
and proceed to Phase 5 — folded-phase failures are advisory; we do not block
/verify on a baseline-resolution miss.

Invoke `/architecture --since $SINCE` as a blocking Task subagent with **600s
timeout** (longer than the 300s `/spec` allows its folded
`/architecture --from-spec` dispatch — branch-wide scans are heavier than
single-spec evaluations). The child resolves changed files, runs the judge,
validates findings (file_path schema variant), and writes its triplet atomically.
On the empty-diff path, /architecture emits the canonical
`architecture: no changes since $SINCE; skipping` log line and exits 0 with no
triplet — this is the expected success path on doc-only branches.

### Aggregation

On success with findings: read the triplet's `<triplet>.json` and emit a new
section in /verify's primary output report:

```
### Architecture findings

Source: <triplet-path>.html
<N> findings (M must-fix, K should-fix).

| # | rule_id | severity | file_path | finding |
|---|---------|----------|-----------|---------|
| 1 | <rule>  | <sev>    | <path>    | <one-line restatement> |
```

Each row is one finding from the triplet's JSON, sorted by severity (`must_fix` →
`should_fix` → `consider`). The aggregated table sits alongside the existing
lint / tests / code-review aggregators (no schema conflict — these are siblings,
not merges).

On success with no findings: emit `Architecture findings: 0` as a one-line
aggregator entry — keeps the section's presence visible so absence of findings is
distinguishable from absence of the phase.

### Advisory failure

On dispatch failure (subagent crash, timeout, schema-conformance hard-fail, judge
API error), capture `{folded_skill: "architecture", error_excerpt:
<first-200-chars>, ts: <ISO-8601>}` and append to
`state.yaml.phases.verify.folded_phase_failures[]` per the dedup rule in
`feature-sdlc/reference/state-schema.md`. Emit at moment-of-append:

```
WARNING: architecture crashed in verify (advisory per D11): <error_excerpt>
```

Continue to Phase 5 — folded-phase failures do NOT block /verify PASS. The §A
awareness pass will re-surface these on the next /verify run.

---

*Spec lineage: `2026-05-10_pipeline-consolidation` (folded-phase awareness, slug
preference, affirmative/advisory signals), `2026-05-28_architecture-in-feature-sdlc`
(folded `/architecture --since`: tier gate, dispatch, aggregation, advisory
failure — FR-25..FR-30).*
