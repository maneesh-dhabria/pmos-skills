# Plan — Story A · slop-engine vendor (260624-cg6)

Epic `260624-3jp` · route: skill · pmos-toolkit · **foundational substrate, no deps**.
Design contract: [`02_design.html`](../../02_design.html) — anchors `#engine-internals`, `#naming`,
`#d-deps`, `#decisions`, `#invariants`, `#risks`. Implementation standard:
`feature-sdlc/reference/skill-patterns.md §A–§L` (this is §H substrate — a deterministic script the
model never re-derives; §K registry is the single rule home that B/C/D cite, never fork).

## Overview

Vendor impeccable's deterministic design-slop detector (Apache-2.0) into
`plugins/pmos-toolkit/skills/_shared/slop-engine/` as pmos-native, **npm-free, offline** shared
substrate — the single source of truth the three consumer stories (B `/design-crit`, C `/verify`,
D prevention+drift-lint) read. This story ships: `registry.mjs` (~44 rules, `SLOP_RULES`),
`checks.mjs` (verbatim pure CSS/contrast math), `detect.mjs` (Node adapter over a **vendored MIT
parser stack**, public `detectHtml()` API), `browser.js` (`window.pmosDesignScan()` +
`.pmos-slop-*` overlays), `gen-rules-doc.mjs` (prevention-reference generator), `NOTICE`, and
ported two-column fixtures + Node tests with **pmos-artifact pass-cases**. No SKILL.md — substrate,
not a command (D-NOCMD). Nothing impeccable-branded survives except `NOTICE` (D-NAMING / Inv-3).

This story **resolves D-DEPS** (the one open mechanical decision) before B/C/D can build.

## Wave / ordering

- **Wave 0 — scaffold:** T1 (dir skeleton under the canonical `_shared/` path + Apache-2.0 NOTICE).
- **Wave 1 — verbatim ports (parallel):** T2 registry, T3 pure checks. Independent files, both
  off T1. T6 generator and T5 browser adapter can also start once T2 lands (T6 needs `SLOP_RULES`;
  T5 needs checks too, so it trails T3).
- **Wave 1b — fail-first harness:** T7 fixtures + Node tests authored against the empty engine
  (TDD — must fail before the adapter exists), off T1.
- **Wave 2 — Node adapter (the gate):** T4 vendors htmlparser2 + css-select + css-tree, builds
  `detect.mjs`, and makes T7 green. Depends on T2 + T3 + T7 (fixtures define "done").
- **Wave 3 — closing gate:** T8 Inv-3 grep across `slop-engine/**` — hits only in `NOTICE`.

Critical path: **T1 → T2/T3 → T4 → T8**. T5, T6 ride alongside and feed B/D respectively.

## Key risks

1. **D-DEPS feasibility (#d-deps, #risks) — the load-bearing risk.** The Node static path must parse
   HTML + computed CSS *without a browser*. Impeccable's own static path uses jsdom; we are choosing
   option (a) — vendor MIT parsers instead — to honor the repo's no-npm posture. The real exposure:
   a vendored parser stack has **no layout engine**, so any check needing `getBoundingClientRect()`
   geometry (vertical position, e.g. "icon above heading") cannot run on the Node path. **Mitigation
   (Inv-5):** read explicit pixel dims via `parseFloat(style.width)` for size checks (works without
   layout, same trick impeccable uses under jsdom); any genuinely layout-dependent check **degrades
   to browser-only** (runs via `/design-crit`'s `browser.js`) and is **skipped on the Node path with
   a logged note — never silently dropped**. T4 produces a per-check Node-vs-browser coverage map
   recorded here. If (a) proves wholly infeasible for the size checks too, fall back to jsdom as a
   test-only dep is unacceptable for runtime — escalate (option (c) shim is explicitly rejected
   unless (a) fails).

2. **False positives on pmos's own artifacts (#risks).** The engine must flag nothing in what pmos
   itself emits. T7 adds explicit pass-cases for the **comment-overlay chrome** (inline
   `pmos-comments` block + overlay CSS/JS) and the **editorial html-authoring template** — both must
   return zero findings. A false positive here would have `/verify` (story C) flagging pmos's own
   output, so this is a correctness gate, not a nicety.

3. **Snippet/extraction coupling.** The fixture tests extract identifying text via `/"([^"]+)"/`;
   ported checks must keep the straight-double-quote snippet convention or tests silently under-match.
   Verified in T3 (convention preserved) + T7 (tests assert it).

4. **jsdom layout absence gotchas (anti-patterns.md).** `background:` shorthand isn't decomposed;
   computed colors aren't normalized off-browser. Port the `resolveBackground` /
   `resolveGradientStops` / `parseGradientColors` helpers verbatim (T3) — they already handle both.

## Final verification checklist

- [ ] `ls plugins/pmos-toolkit/skills/_shared/slop-engine/` shows registry/checks/detect/browser/
      gen-rules-doc + vendor/ + tests/ + NOTICE under the canonical path.
- [ ] `SLOP_RULES` has all ~44 rules; every `skillSection` ∈ the 8 allowed; categories are
      `slop`/`quality` only (AC1).
- [ ] `node --test` over `slop-engine/tests/` is green — flag column flagged, pass column clean,
      **pmos comment-chrome + editorial template pass-cases zero findings** (AC8).
- [ ] **Inv-3 clean:** `grep -ri impeccable plugins/pmos-toolkit/skills/_shared/slop-engine/` →
      hits only in `NOTICE` (T8 / AC5).
- [ ] `gen-rules-doc.mjs` is **idempotent** — re-run on unchanged registry → byte-identical output
      (AC7).
- [ ] **`detect.mjs` public API usable by consumers:** `detectHtml(pathOrString)` returns a stable
      findings array, no `npm install`, no jsdom at runtime; per-check Node-vs-browser coverage map
      recorded; degraded checks log a skip note (AC3, AC9, Inv-4, Inv-5).
- [ ] `browser.js` exposes `window.pmosDesignScan()` rendering `.pmos-slop-overlay` /
      `.pmos-slop-label`, injectable + DOM-readable (AC4, AC9).
- [ ] `NOTICE` reproduces the Apache-2.0 attribution to `pbakaus/impeccable` (AC6).
- [ ] Conforms to `skill-patterns.md §A–§L` as substrate; **no** version/changelog/README/manifest
      tasks (release prereqs are /complete-dev's) (AC10).
