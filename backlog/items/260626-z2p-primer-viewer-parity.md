---
schema_version: 1
id: 260626-z2p
title: "/primer library-viewer full parity with /frameworks (shared library-viewer interface)"
type: enhancement
kind: epic
status: released
route: skill
priority: should
labels: [primer, frameworks, learn-list, library-viewer, pmos-learnkit, skill]
created: 2026-06-26
updated: 2026-06-27
released: pmos-learnkit/v0.32.0
source: "user-driven (2026-06-26): fix /primer library-viewer to match /frameworks under the standard library-viewer interface; code audit confirmed primer is a thin substrate consumer with 1 real bug + feature gaps. User decisions: full feature parity; iframe in-page reader"
design_doc: docs/pmos/features/2026-06-26_primer-viewer-parity/02_design.html
parent:
dependencies: []
---

## Context

`/primer browse` and `/frameworks browse` both build a self-contained, offline, faceted library page
via a `scripts/build-library.mjs` consuming the shared zero-dep engine
`plugins/pmos-learnkit/skills/_shared/library-viewer/lib.mjs` (frozen public surface in
`library-viewer/guidelines.md`).

A code audit (2026-06-26) found `/primer` is already a faithful **thin** consumer of the substrate —
not forked — but vs `/frameworks` (the reference consumer) it is feature-poor and carries one genuine
contract violation:

1. **Real bug** — the subtitle count is hard-coded (`subtitleTemplate` has no `{count}` token), so the
   substrate never emits `#subtitleCount` and the dynamic-count runtime never fires. Violates the
   `guidelines.md` "count is dynamic, never hard-coded" hard constraint that frameworks/learn-list honour.
   Primer's selftest *cements* the bug (`/· 1 of yours/`).
2. **Feature gaps** — link-out only (no in-page reader), one view (`detailed`) with a
   `.viewswitch{display:none}` CSS hack, all-single-select facets, no `valueLabels` rename seam, a dead
   `summaryField:'summary'` config, and no single named `toCard` adapter / `ALLOWED` whitelist.

**Decided scope (user, 2026-06-26):** *full feature parity* with `/frameworks` — in-page reader, multi-select
facets, three views, `valueLabels`, plus the bug fix and adapter tidy-ups. Primers are standalone HTML docs
(not corpus markdown), so the in-page reader is a **lazy sandboxed iframe** of the primer's own HTML (user's
explicit choice over a lighter metadata+excerpt reader).

The single coherence rule: the iframe reader is added to the **substrate** (`lib.mjs`) as an additive,
default-off `reader.mode:'iframe'` seam — never primer-bespoke — so `/frameworks` and `/learn-list` stay
byte-inert and can adopt it later. See the design_doc for the substrate↔consumer boundary, INV-1..INV-6, and
D1..D9.

## Acceptance Criteria

- [ ] `/primer browse` library reaches feature parity with `/frameworks`: in-page reader, three views (list/cards/detailed, list default), multi-select dropdown facets, `valueLabels` rename seam
- [ ] In-page reader is a lazy-loaded **sandboxed iframe** of the selected primer's standalone HTML, with an "Open in new tab" affordance and an empty-state; works offline from `file://`
- [ ] The iframe reader ships as an **additive, default-off substrate seam** in `_shared/library-viewer/lib.mjs` (`reader.mode:'iframe'` + `iframeField`), NOT primer-local code; absent/`'columns'` ⇒ current markdown reader byte-identical
- [ ] Real bug fixed: dynamic `{count}` subtitle emits `#subtitleCount` and updates from `DATA.length`; the selftest asserting the static `· 1 of yours` form is corrected
- [ ] Dead `summaryField:'summary'` removed; single named `toCard` + `ALLOWED` whitelist replace the inline dual-loader card construction; `.viewswitch{display:none}` CSS hack removed
- [ ] **Zero regression** for `/frameworks` and `/learn-list`: no edits to their `build-library.mjs` or corpora; their shipped selftests + `*.test.sh` pass un-edited (INV-1/INV-2)
- [ ] Primer offline/self-contained posture preserved (no external `<link>/<script src>/<img>`; iframe sandboxed, sibling on-disk primers only)
- [ ] Conforms to `skill-patterns.md §A–§L`; passes `skill-eval.md`

## Stories

- `260626-0g6` — /primer library-viewer full parity with /frameworks (route: skill, no deps)

## Notes

Singleton epic: one in-scope skill (`/primer`) and one cohesive change set spanning the substrate seam,
the primer consumer, tests, and `#browse` prose — all same-file/sequential. The substrate seam is fused into
the one story because it is small, only meaningful with the consumer that exercises it, and cannot be
independently `skill-eval`'d/shipped.

Single plugin (pmos-learnkit) — substrate is learnkit-only, no cross-plugin `sync-shared`. Rides one
pmos-learnkit release.

Next: `/skill-sdlc build --next` (picks `260626-0g6`), or `/skill-sdlc build --story 260626-0g6`.
