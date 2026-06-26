---
schema_version: 1
id: 260626-804
kind: epic
title: "slop-engine proof-of-execution — deterministic slop consumers (/design-crit, /verify) must prove the lane ran, never claim graceful degradation by assertion"
type: enhancement
status: defined
priority: should
labels: [pmos-toolkit, design-crit, verify, slop-engine, quality-gate, from-feedback]
route: skill
created: 2026-06-26
updated: 2026-06-26
defined: 2026-06-26
source: docs/pmos/features/2026-06-26_slop-engine-proof-of-execution/
feature_folder: docs/pmos/features/2026-06-26_slop-engine-proof-of-execution/
design_doc: docs/pmos/features/2026-06-26_slop-engine-proof-of-execution/02_design.html
parent:
dependencies: []
---

## Context

From a `/reflect` retro on `/design-crit` (v2.93.0). The skill's Phase 3.5 deterministic slop pre-pass
(`assets/slop-prepass.mjs` → `_shared/slop-engine/browser.js`) was **silently skipped** and the skip was
rationalized with an **unverified** claim ("the vendored engine bundle is not wired into this standalone
run"). The engine was present; run after the user challenged it, it produced 40 findings — including a tell
the LLM pass had missed. Root cause: Phase 3.5's graceful-degradation (Inv-5) text is permissive, so
"I skipped it" can masquerade as "it degraded gracefully."

The retro asked to verify the same can't happen in `/wireframes`, `/prototype`, `/execute` "where this engine
is being used." **Grounded verification:** those three only *cite* the static floor doc
`_shared/slop-engine/design-slop-rules.md` — they execute no helper, so there is nothing to skip-by-assertion
(verified clean, recorded as invariant I4). The one consumer the retro did *not* name — `/verify` — *does* run
the engine (`scripts/slop-gate.mjs` → `detect.mjs`); it is harder-gated (exit code drives the verdict) but
shares a **milder** variant of the same hole on its skip branch (Story B, maintainer-approved 2026-06-26).

The NI-block nit from the retro (factor the inlined non-interactive block into a shared include) is
**declined** — it conflicts with the codified `CLAUDE.md` invariant (block inlined byte-identical,
hand-maintained, lint-enforced; a body-rewriter was explicitly rejected). Recorded as invariant I5; no story.

## Cross-skill invariants (cited by the stories)

I1 one engine / two lanes (unchanged) · I2 proof-of-execution, not proof-of-findings (skip earnable only via
the helper's own skip-note / non-zero exit) · I3 graceful degradation preserved but earned · I4 the three
floor-citing skills stay out of scope (verified) · I5 NI-block nit declined. See `02_design.html` §4.

## Decisions (resolved during this define run)

- **Scope** → 2-story epic: harden `/design-crit` (blocker + 3 frictions) AND `/verify` (milder variant).
  `/wireframes` `/prototype` `/execute` verified clean, no story (maintainer, 2026-06-26).
- **NI-block nit** → skip, respecting the CLAUDE.md invariant (maintainer, 2026-06-26).
- **No engine changes** → both helpers already print enough to gate on (design §5); only the consuming
  SKILL.md instructions change.

## Stories

- `260626-pgh` — `/design-crit` hardening: Phase 3.5 proof-of-execution hard gate (blocker) + stateful/SPA
  capture path + `--report-only` mode + markdown fallback. (route: skill, no deps)
- `260626-4mc` — `/verify` slop-gate skip-branch proof: surface the runner line, tie ran-vs-skipped to the
  JSON report + exit code. (route: skill, no deps)

Both target `pmos-toolkit` → one release at Loop-3.
