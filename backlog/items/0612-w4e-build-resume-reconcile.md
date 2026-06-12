---
schema_version: 1
id: 0612-w4e
kind: epic
title: Build-loop resume-first reconcile-in-flight — self-heal stories that crash mid-build under /loop
type: feature
priority: should
status: released
released: pmos-toolkit/v2.69.0
route: skill
plugin: pmos-toolkit
feature_folder: docs/pmos/features/2026-06-12_build-resume-reconcile/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-12_build-resume-reconcile/02_design.html
labels: [backlog, three-loop, build-loop, resume, resilience]
created: 2026-06-12
updated: 2026-06-12
---

## Context

An unattended `/loop "/feature-sdlc build --next --non-interactive"` silently abandons any story
that crashes mid-`/execute` (e.g. on an API error). The crash leaves the story at `status:
in-progress` with a held claim and no write-back; `/backlog next` filters to `planned` + unclaimed,
so the picker skips it forever and the loop marches on to new work. It surfaces in `/backlog groom`
as a stale claim only after the 4h TTL, and never auto-recovers.

Fix: a resume-first `reconcile-in-flight` step 0 at the top of `#build-mode` that resumes a
resumable in-progress story before picking new work. Resumability is claim-guarded (resume iff the
claim is absent / stale / held by my own stable per-loop driver id; skip a fresh foreign-held claim
— a concurrent manual `build --story`). A forward-progress-reset poison guard (`resume_attempts`
cap 2, reset on new commits) sends a genuinely-stuck story to `blocked` so the loop is never
head-of-line-blocked. Resume re-enters via the Phase 0b cursor (a post-verify-PASS crash finalizes
without re-running `/verify`).

Single-driver model only; heartbeat / multi-driver concurrency is out of scope (deferred).

Design doc: `docs/pmos/features/2026-06-12_build-resume-reconcile/02_design.html`

## Acceptance Criteria

- [ ] `build --next` gains a `reconcile-in-flight` step 0; clean backlog picks exactly as today (D1)
- [ ] Resumability claim-guarded: resume iff absent/stale/own-holder; skip fresh foreign claim (D2)
- [ ] Stable per-loop holder id; claim-lock.js reclaims own-holder lock without TTL wait (D3)
- [ ] `resume_attempts` + last-progress marker; reset on forward progress; cap 2 on unproductive (D4)
- [ ] Cap → blocked + unclaim + diagnosable note (attempts, last task/sha, phase, timestamps) (D5)
- [ ] Resume re-enters via Phase 0b cursor; post-verify-PASS crash finalizes, no /verify re-run (D6)
- [ ] `resume_attempts` + marker skill-managed; reconcile touches only in-progress stories (D7)
- [ ] skill-eval green; backlog + claim-lock tests cover holder-ownership + reconcile selection (D8)

## Notes

Stories: 0612-2w7 (the whole fix — single route:skill story; tightly coupled across feature-sdlc +
backlog + claim-lock + state-schema, shippable only as a unit per the define-route-skill fusion
rule). Single plugin: pmos-toolkit. Grilled standard-depth 2026-06-12 — 5 decisions resolved
(serialization guard, holder identity, cap reset, error capture, re-entry point).
