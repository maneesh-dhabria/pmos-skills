# 03 · Plan — Story C · /verify frontend slop gate (260624-y9m)

**Epic** 260624-3jp · **route** skill · **plugin** pmos-toolkit · **Tier 3**
**Design contract** [`../../02_design.html`](../../02_design.html) — cite `#c-verify`, `#d-tier`, `#invariants`.
**Depends on** 260624-cg6 (engine-vendor story A). The `_shared/slop-engine/` substrate
(`registry.mjs` · `checks.mjs` · `detect.mjs` Node adapter + ported fixtures) is present in this
worktree at claim time via the D9 claim-time transitive merge (epic **Inv-1: one engine** — this
story is a *consumer*; it never forks or re-authors the rules).

Release prerequisites (version bump, changelog, README row, `plugin.json` version-sync) are **not**
tasks here — `/complete-dev` owns them.

## Overview

Thread the vendored deterministic design-slop detector into `/verify` as a **frontend gate that
runs via the cheap Node path** (`detect.mjs`, no Playwright). It is a *consumer* edit — the only
real changes are to `plugins/pmos-toolkit/skills/verify/SKILL.md`, a sibling test file, and dogfood
evidence. No engine code is authored here. The gate is deterministic, offline, and zero-LLM
(**Inv-4**); it carries **zero `impeccable` strings** (**Inv-3**).

The defining tension, grill-confirmed 2026-06-24 (`#d-tier`): **quality faults block, slop is
advisory.** Contrast/a11y arithmetic faults (`category: 'quality'`) can be `[Blocker]` and gate the
release; taste/AI-tell findings (`category: 'slop'`) are `[Should-fix]/[Nit]`, surfaced loudly but
**never hard-block** — taste must not stop a ship.

## Where it slots in /verify

The slop gate is **not a new phase**. It folds into the existing structure (§J — cite slugs, no new
integer phase):

- **Phase 4 · `#deploy-verification`, sub-step 4d (Frontend Verification)** — the gate runs here as
  the Node-path pre-check (`detect.mjs` on the generated HTML), *before/alongside* the Playwright
  walk. It is explicitly **distinct** from 4d's screenshot evidence so the two are never conflated.
- **Tiering reuses the existing frontend-detection** — `/verify` already has a deterministic
  **browser-mandatory trigger** (the Phase 4 entry gate: changed files matching `*.html`/`*.tsx`/…
  or any `.html` artifact emit). We do **not** re-invent detection: trigger positive ⇒ slop gate
  **mandatory**; trigger negative (non-UI) ⇒ **skipped-with-log** (one-sentence skip note in the
  Phase 8 report, same discipline as 4f's "skip only if zero UI surface").
- **Phase 5 · `#spec-compliance` (5d/5e)** — findings surface as a distinct slop-findings sub-table
  beside UX Polish (5d) / Gap Report (5e).
- **Phase 8 · `#commit-report` (verdict rule)** — a `[Blocker]` quality fault drives the verdict
  below bare `PASS` exactly like any unfixed critical 5e gap; slop findings never move the verdict.

## Quality-blocks / slop-advisory routing

Findings route through `_shared/findings-dispositions.md` (Fix / Modify / Skip / Defer; severity
`[Blocker]/[Should-fix]/[Nit]`) — cited by path, with only the per-skill delta stated at the call
site. The delta is **category drives severity and gating**:

| Engine category | Severity | Effect on verdict |
|---|---|---|
| `quality` (contrast/a11y arithmetic) | `[Blocker]` / `[Should-fix]` | **Can gate** — `[Blocker]` drops verdict below bare PASS (Phase 8 rule) |
| `slop` (taste / AI-tell) | `[Should-fix]` / `[Nit]` | **Advisory only** — surfaced loudly, never hard-blocks |

Non-interactive classification per `findings-dispositions.md` "Non-interactive behavior": mechanical
fixes get `(Recommended)` (AUTO-PICK under `--non-interactive`); judgment calls get an adjacent
`<!-- defer-only: … -->` tag (DEFER). `audit-recommended.sh` must stay clean.

## Tiering + degradation

- **Tiering** — reuse the existing browser-mandatory trigger (don't reinvent). Positive ⇒ mandatory;
  negative ⇒ skipped-with-log.
- **Graceful degradation (Inv-5)** — engine absent / `detect.mjs` throws / parser can't process the
  HTML ⇒ log a **non-fatal** note and continue with prior behaviour. The gate **never flips a
  correct PASS to FAIL on tooling absence** (mirrors the `#hard-gates` comments-coverage
  existence-guard and the 4d browser-tool-ladder logged-skip). Per-check browser-only fallback
  (D-DEPS): a check the Node parser can't reproduce is skipped on the Node path with a logged note
  (runs via `/design-crit`, story B) — never silently dropped.

## Task graph

```
T1 (failing tests: node-path invocation + category→severity map + Inv-4 neg-control)
 └─ T2 (wire gate into Phase 4d, tiering via existing detection)
     ├─ T3 (route findings → dispositions; quality gates / slop advisory)
     │    └─ T5 (distinct slop-findings section in report → /complete-dev summary)
     └─ T4 (graceful degradation Inv-5; engine-absent test)
              T6 (live dogfood: both branches)  ← T3,T4,T5
              T7 (skill-patterns §A–§L + skill-eval [D] + 4 lints + audit)  ← T2,T3,T4,T5
```

## Final verification checklist

- [ ] **AC1** — slop gate runs `_shared/slop-engine/detect.mjs` on the generated HTML via the
  **Node path**; tests assert no `browser_*` call (no Playwright).
- [ ] **AC2** — findings route through `findings-dispositions.md`; `quality` → `[Blocker]`/`[Should-fix]`
  (can gate); `slop` → `[Should-fix]`/`[Nit]` (advisory, never hard-blocks). Tested.
- [ ] **AC3** — tiered: mandatory when the existing browser-mandatory trigger is positive;
  skipped-with-log for non-UI (detection reused, not re-invented).
- [ ] **AC4 / Inv-5** — engine/parser absent → non-fatal log, `/verify` continues; correct PASS never
  flipped to FAIL. Engine-absent test green.
- [ ] **AC5** — distinct slop-findings section in the `/verify` report (5d/5e + Phase 8 verdict block);
  inherited by `/complete-dev`'s summary.
- [ ] **AC6** — SKILL.md conforms to skill-patterns §A–§L; `skill-eval-check.sh <skill_dir>` EXIT 0
  (residuals reconciled, not weakened); 4 repo lints + `audit-recommended.sh` + comments-coverage
  clean; non-interactive inline block byte-identical.
- [ ] **AC7 / Inv-4** — gate calls no LLM and no network (deterministic, offline) — neg-control test.
- [ ] **Inv-3** — `grep -i impeccable` over the SKILL.md diff returns zero hits.
- [ ] **AC8 — dogfood branch 1 (blocks):** `/verify` on a UI artifact with a planted **WCAG contrast
  fail** → quality `[Blocker]` → verdict drops below bare PASS. Evidence captured.
- [ ] **AC8 — dogfood branch 2 (passes w/ advisory):** SAME artifact with only a **`gradient-text`
  slop tell** (contrast fixed) → slop finding surfaced as advisory; verdict clean PASS. Evidence
  captured; `**Verdict:** satisfied` line written per `_shared/dogfooding.md#anatomy`.
