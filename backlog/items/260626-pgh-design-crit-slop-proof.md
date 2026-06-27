---
schema_version: 1
id: 260626-pgh
kind: story
title: "/design-crit — Phase 3.5 slop pre-pass proof-of-execution hard gate (blocker) + stateful/SPA capture + --report-only + md fallback"
type: enhancement
priority: should
status: released
route: skill
parent: 260626-804
dependencies: []
worktree:
plan_doc: docs/pmos/features/2026-06-26_slop-engine-proof-of-execution/stories/260626-pgh/03_plan.html
tasks_file: docs/pmos/features/2026-06-26_slop-engine-proof-of-execution/stories/260626-pgh/tasks.yaml
claimed_by:
driver_holder:
pr:
labels: [pmos-toolkit, design-crit, slop-engine, quality-gate]
created: 2026-06-26
updated: 2026-06-27
---

## Context

Harden `plugins/pmos-toolkit/skills/design-crit/SKILL.md` so the deterministic slop pre-pass cannot be
skipped by assertion, plus three frictions from the same retro. The engine (`_shared/slop-engine/`) and the
helper (`assets/slop-prepass.mjs`) are **unchanged** — they already print enough to gate on (design §5). Only
the consuming SKILL.md instructions (Phases 3 / 3.5 / 4 / 6 + argument-hint) change.

Epic design: `docs/pmos/features/2026-06-26_slop-engine-proof-of-execution/02_design.html` (§6 Story A).
Cross-skill invariants: I1, I2, I3, I5 (see design §4).

## Acceptance Criteria

- [ ] **A1 (blocker):** Phase 3.5 (`#slop-prepass`) is a HARD GATE — the model MUST run
  `node {skill_dir}/assets/slop-prepass.mjs --source <target> --out {out_dir}` once per captured target and
  surface the helper's literal evidence line VERBATIM in chat (the `[slop-prepass] N deterministic
  finding(s) … → <file>` success line, or the `[slop-prepass] slop-engine unavailable — skipping … : <reason>`
  stderr skip-note) before Phase 4 proceeds.
- [ ] **A1:** Inv-5 rewritten — graceful degradation is claimable ONLY when the helper emitted its skip-note
  (`slop-findings.json :: skipped == true`) or exited non-zero; an anti-pattern explicitly forbids asserting
  the engine is absent/not-wired-in without running the helper (which records the resolved engine path in
  `slop-findings.json :: engine`).
- [ ] **A1:** Phase 4 requires a `slop-findings.json` produced THIS run; the Phase 6 report's slop section is
  populated FROM that JSON (engine path + `findings.length`, or `skipped`+`reason`) — never from narrative.
- [ ] **A2:** Phase 3 gains a sanctioned "stateful app / SPA / game" capture path (interactive driver — MCP or
  click-stepped Playwright — for in-canvas interaction journeys) plus a storage-reset step
  (`indexedDB.deleteDatabase` / `localStorage.clear`) for cold-open capture; a composition note states the A1
  pre-pass still runs against the live URL in this mode.
- [ ] **A3:** `--report-only` mode (NL: "just give me the crit") skips the per-finding disposition loop but
  STILL runs the slop pre-pass, writes the report, and emits the mandated "`<N> surfaced, <M> unsurfaced`"
  line; the flag is in `argument-hint` (§I contract flag) with an NL form honored.
- [ ] **A4:** Phase 6 sanctions a markdown fallback keyed STRICTLY off html-authoring-substrate
  unreachability (loud stderr note naming the unresolved path), explicitly distinguished from the retired
  md/both output preference, with a follow-up comment pointing at making the substrate reliably resolvable.
- [ ] Engine + `assets/slop-prepass.mjs` unchanged; `slop-prepass.test.mjs` stays green.
- [ ] Conforms to `skill-patterns.md §A–§L` (§H hard gate · §I `--report-only` hinted + NL · §J `{#slop-prepass}`
  anchor + cross-refs resolve · §K helper-output cited from design §5, not restated); non-interactive block
  stays inline byte-identical (I5); skill-eval `[D]`+`[J]` pass; 4 lints + audit green.
- [ ] Load-bearing dogfood: show BOTH the run-evidence line (+ `slop-findings.json` engine path + count) AND a
  forced engine-missing skip-note (`skipped:true`) — proving "skipped" is no longer assertable.
