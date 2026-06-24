# Plan — Story 260624-shm · /design-crit deterministic slop pre-pass

**Epic** `260624-3jp` (design-slop engine) · **route:** skill · **plugin:** pmos-toolkit · **dep:** `260624-cg6` (engine, story A)
**Design contract:** `../../02_design.html` — anchors `#c-design-crit`, `#d-stack`, `#non-duplication`, `#engine-internals`, `#invariants` (Inv-1/3/4/5), `#naming`.
**Skill dir:** `plugins/pmos-toolkit/skills/design-crit`

## Overview

`/design-crit` already launches a Playwright browser in **Phase 3** (`{#capture-screenshots}`, via
`assets/capture.mjs`) and then runs its **LLM** Nielsen/WCAG/Gestalt/journey rubric in **Phase 4**
(`{#heuristic-eval}`) + PSYCH in **Phase 5**. This story bolts a **deterministic slop pre-pass** onto that
flow: inject the epic's vendored engine bundle (`_shared/slop-engine/browser.js`) into the **already-open
Playwright page**, call `window.pmosDesignScan()`, and read the `.pmos-slop-*` findings **from the DOM
programmatically** (never via screenshot, per `#engine-internals`). Those machine findings are surfaced as a
**distinct lane, reported FIRST**; the existing LLM critique is layered **after** (`#d-stack`). The change is
**purely additive** — the engine **complements**, never **replaces**, the LLM critique (`#non-duplication`,
AC4) — and **gracefully degrades** (`Inv-5`): if the engine can't load, `/design-crit` behaves exactly as
today with a logged note.

The engine itself is authored by **story A** (`260624-cg6`); the claim-time **transitive merge** (epic
Inv-1 / D9) brings `_shared/slop-engine/` into this worktree before `skill-eval` runs. This story writes
**no engine code** — it only wires the existing browser bundle into the open page.

## Ordering & dependency graph

| Task | What | Deps |
|---|---|---|
| **T1** | `assets/slop-prepass.mjs` — inject `browser.js` into the open Playwright page, call `window.pmosDesignScan()`, read `.pmos-slop-*` from the DOM → `slop-findings.json` | — |
| **T2** | Graceful-degradation + crash-safety guard in the helper (Inv-5) | T1 |
| **T3** | New `## Phase 3.5: Deterministic slop pre-pass {#slop-prepass}` in SKILL.md (after capture, before LLM eval); §A–§L conformant | T1, T2 |
| **T4** | Engine lane FIRST in the report (Phase 6); LLM critique sections unchanged (D-STACK + non-duplication) | T3 |
| **T5** | `skill-eval` [D] + judge; 4 lints + audit + comments-coverage; non-interactive block byte-identical; Inv-3 grep clean | T3, T4 |
| **T6** | Live dogfood vs a known side-tab tell; Inv-5 fallback proven; evidence saved | T4, T5 |

Linear spine (T1 → T2 → T3 → T4 → T5 → T6). The script (T1/T2) lands and is unit-tested before the SKILL.md
prose references it — §H discipline (deterministic work is a script; the model only narrates the lanes).

## Integration point in design-crit's flow

```
Phase 3  Capture flow screenshots      {#capture-screenshots}   ← Playwright opens here (assets/capture.mjs)
Phase 3.5 Deterministic slop pre-pass  {#slop-prepass}   ★ NEW — reuses the open page; engine lane
Phase 4  Heuristic evaluation (LLM)    {#heuristic-eval}        ← LLM lane, UNCHANGED
Phase 5  PSYCH pass                    {#psych-pass}
Phase 6  Synthesise report             {#synthesise-report}     ← slop lane rendered FIRST, then LLM lanes
```

- **Phase 3.5** runs `slop-prepass.mjs` against the captured source on the **same browser context** Phase 3
  already used (reuse `capture.mjs`'s launch helper — no new browser dependency). `page.addScriptTag({ path:
  '<skill-relative>/../_shared/slop-engine/browser.js' })` → `page.evaluate(() => window.pmosDesignScan())`
  → `page.$$eval('.pmos-slop-*', …)` reads `{ id, snippet, category, section }` per finding. Output:
  `{out_dir}/slop-findings.json`.
- **Phase 6** gains a top section **"Deterministic slop findings (machine-flagged)"** rendered **before** the
  existing LLM `## Recommendations by journey / component / Cross-cutting` sections — the two lanes stay
  visibly distinct (`#d-stack`). Engine findings do **not** enter the Phase 4 disposition loop and do **not**
  replace any LLM section (`#non-duplication`).
- **Stable anchors (§J):** keep every existing `{#kebab-slug}`; the new phase uses `{#slop-prepass}`. Bare
  prose "Phase 4..8" number citations get hand-renumbered only where a number is actually cited; every
  cross-ref must still resolve (`lint-phase-refs.sh`).

## Invariants this story holds

- **Inv-3 — zero `impeccable` strings.** The engine is referenced only by its pmos-native path +
  `window.pmosDesignScan()` + `.pmos-slop-*` globals (`#naming` / D-NAMING). `grep -i impeccable` over
  SKILL.md + `assets/` returns **zero** hits (T5).
- **Inv-4 — deterministic + offline.** `slop-prepass.mjs` makes no LLM/network call; the LLM lives only in
  the existing Phase 4 critique layered after.
- **Inv-5 — graceful degradation.** Engine-absent / unreadable → logged stderr note, empty/absent findings,
  exit 0, prior behaviour intact (T2 + T4 fallback section).
- **Inv-1 — one engine.** No forked rules; the helper reads the single claim-time-merged
  `_shared/slop-engine/browser.js`.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| **Regressing the existing LLM critique** (D-STACK requires *complement*, not *replace*) | T4 keeps the LLM `## Recommendations …` sections structurally byte-equivalent to today; engine findings live in their own top section only. T6 dogfood confirms both lanes fire and are distinct. Existing design-crit behaviour on a no-tell artifact is unchanged. |
| **Engine-load failure path** (bundle missing because story A not yet merged in a stray worktree; bundle unreadable; `pmosDesignScan` undefined) | T2 guard: any failure → single stderr skip note + empty/omitted findings + exit 0; the capture→LLM flow proceeds exactly as today (Inv-5). Failing-first test points the helper at a non-existent engine path and asserts exit 0 + skip note + no propagated exception. |
| **Screenshot-vs-DOM drift** | Per `#engine-internals`, findings are read from `.pmos-slop-*` in the DOM **programmatically** (`page.$$eval`), never by reading a screenshot. Snippet text is extracted via the engine's quoting convention `/"([^"]+)"/`. |
| **Browser-bundle size (~217 KB)** injected into the page | Injected into `/design-crit`'s own Playwright page only, never shipped to users; not subject to the comments bundle-size lint. Noted in the design `#risks`. |
| **Anchor / phase-ref drift from inserting Phase 3.5** | T3 keeps all existing slugs stable, hand-renumbers only cited numbers; `lint-phase-refs.sh` (T5) is the backstop. |
| **Non-interactive contract drift** | No new prompt is added (no picker needed); the inline non-interactive block stays byte-identical; `lint-non-interactive-inline.sh` + `audit-recommended.sh` confirm (T5). |

## Final verification checklist

- [ ] `assets/slop-prepass.mjs` unit test green: injects `browser.js`, runs `window.pmosDesignScan()`, reads
      a known side-tab finding (id + quoted snippet) from `.pmos-slop-*` in the DOM (T1).
- [ ] Graceful-degradation test green: non-existent engine path → exit 0, stderr skip note, no propagated
      exception, no bogus findings file (T2, Inv-5).
- [ ] SKILL.md has `## Phase 3.5: Deterministic slop pre-pass {#slop-prepass}` between capture (Phase 3) and
      LLM eval (Phase 4); states DOM-read-not-screenshot, engine-first-then-LLM distinct lanes (D-STACK),
      complement-not-replace (non-duplication), Inv-5 fallback (T3).
- [ ] Report (Phase 6) renders the machine-flagged slop lane FIRST; existing LLM sections unchanged in
      structure (T4).
- [ ] `feature-sdlc/tools/skill-eval-check.sh` on design-crit → **EXIT 0** ([D] half) + judge pass (T5).
- [ ] 4 repo lints clean — `lint-non-interactive-inline.sh`, `lint-flags-vs-hints.sh`, `lint-phase-refs.sh`
      (new `{#slop-prepass}` anchor + renumbered refs resolve) — plus `audit-recommended.sh` +
      comments-coverage (T5).
- [ ] Non-interactive inline block byte-identical vs `skills/_shared/non-interactive.md`; no new prompt (T5).
- [ ] Inv-3: `grep -i impeccable` over SKILL.md + `assets/` → **zero hits** (T5).
- [ ] **Live dogfood** (T6): real `/design-crit` (Skill tool) run against a side-tab artifact — engine lane
      flags the side-tab, LLM lane adds judgement, lanes are distinct; engine-unreadable variant degrades to
      today's behaviour with a logged skip. Dogfood artifact + `slop-findings.json` + report + evidence note
      saved under this story's dir.

**Release prerequisites are NOT in this plan** — version bump, changelog, README row, `plugin.json`
manifest version-sync, and tagging are owned by `/complete-dev --epic 260624-3jp` (the whole epic rides one
pmos-toolkit release; D17 single-plugin validation).
