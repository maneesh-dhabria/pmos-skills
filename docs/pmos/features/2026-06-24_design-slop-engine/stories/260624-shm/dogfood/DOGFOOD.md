# 260624-shm dogfood — /design-crit deterministic slop pre-pass

Date: 2026-06-25 · Loop 2 build · holder `build:6681ff46-e6d7-4cb7-854d-4ca3ea2b44ff`

Load-bearing dogfood of the new **engine lane** (`assets/slop-prepass.mjs`, invoked by Phase 3.5
`{#slop-prepass}`) against a realistic landing-page artifact, plus the Inv-5 graceful-degradation path.
The LLM critique lane (Phases 4–5) is unchanged and stays distinct (D-STACK); this dogfood exercises the
machine lane that runs *before* it.

## Artifact

`sample-landing.html` — a realistic hero + feature-card page carrying **genuine** generated-design tells:
a gradient-text hero (`-webkit-background-clip:text` over a purple→violet `linear-gradient`) and a
side-tab feature card (`border-left:4px` on a `border-radius:12px` card).

## Engine lane (machine-flagged) — `slop-findings.json`

```
[slop-prepass] 5 deterministic finding(s), 5 overlay node(s)
 • gradient-text   — "background-clip: text + gradient"   [Color & Contrast]
 • ai-color-palette— "Purple/violet gradient background"  [Color & Contrast]
 • side-tab        — "border-left: 4px + border-radius: 12px" [Visual Details]
 • ai-color-palette— "Purple/violet accent colors detected"  [Color & Contrast]
 • gradient-text   — "background-clip: text + gradient"   [Color & Contrast]
```

- Findings are read **programmatically from the live DOM** (`window.pmosDesignScan()` return +
  `.pmos-slop-*` overlay count = 5), not from a screenshot.
- **Regression guard:** the *genuine* gradient-text in the page IS flagged — proving the phantom-fix
  (see Build notes) excludes only the engine's *own injected chrome*, never real page tells.

## Graceful degradation (Inv-5) — `_skip/slop-findings.json`

Pointing `--engine` at a non-existent bundle:

```
[slop-prepass] slop-engine unavailable — skipping deterministic pre-pass: engine bundle unreadable at …/NO-SUCH-ENGINE.js
EXIT=0
skipped: true | findings: [] | reason: engine bundle unreadable at …
```

Exit 0, a single stderr skip note, an empty skip-marked findings file — `/design-crit` proceeds exactly
as today through Phase 4 onward. No regression to the capture → LLM critique flow.

## Distinct lanes (D-STACK)

The engine output above is rendered in Phase 6 under **`## Deterministic slop findings (machine-flagged)`**
*first*, ahead of the LLM `## TL;DR` / `## Recommendations …` sections, which remain byte-unchanged. Engine
tells are never merged into the LLM recommendations — machine lane stays machine-only, judgement lane stays
judgement-only.

## Gates (all green)

- helper tests 2/2 · engine tests 6/6 (unregressed by the engine fixes) · `node --check` both files OK
- skill-eval `[D]` EXIT 0 (all checks pass, incl. `j-phase-refs-resolve` for Phase 3.5)
- blind judge: **SHIP** (5/5/4/4/5) — both should-fixes applied (Inv-5 dependency-error ordering; Phase 3.5
  schema-doc + per-target-loop wording)
- lint-non-interactive-inline / lint-flags-vs-hints / lint-phase-refs / audit-recommended / comments-coverage: PASS
- Inv-3 grep (SKILL.md + assets): zero `impeccable` strings
