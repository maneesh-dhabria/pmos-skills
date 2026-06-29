---
schema_version: 1
id: 260629-pd2
title: "/mytasks web UX fixes — invisible-feedback toasts, people picker, friendly dates, default-view signal, empty states, chips, contrast pass (13 design-crit findings + 5 contrast failures)"
type: enhancement
kind: epic
status: defined
route: skill
priority: should
labels: [pmos-toolkit, mytasks, web, ux, skill, from-feedback]
created: 2026-06-29
updated: 2026-06-29
released:
source: "from-feedback (/design-crit of the live /mytasks web SPA, 2026-06-29: …/personal/docs/docs/2026-06-29_mytasks-web/design-crit/design-crit.html). 4 journeys, 7 screens; 13 LLM findings F-01..F-13 (all 12 surfaced dispositioned 'Fix as proposed') + 5 deterministic WCAG-AA contrast failures. Three cross-cutting themes: invisible feedback, representation drift across surfaces, contrast/colour-semantics. Maintainer decisions (define run): D1 @ opens a filtered people picker with an explicit +Add (no silent person creation); D2 friendly dates — relative near, absolute beyond; D3 count badges + overdue-on-Today; D4 full scope incl. low F-13; D5 toast-window undo only. Grill refined D1 (silent auto-create -> explicit picker) and D2 (added relative-near band)."
design_doc: docs/pmos/features/2026-06-29_mytasks-web-ux-fixes/02_design.html
parent:
dependencies: []
---

## Context

`/mytasks` (pmos-toolkit) got an inline-everything web SPA in epic 260626-a8a (story tf4). A `/design-crit` of
the running app surfaced a coherent set of UX gaps across four journeys (first-glance triage, quick-capture,
edit & complete, organize via sidebar). They are **not** independent bugs — three cross-cutting themes drive
nearly all of them:

1. **Invisible feedback (dominant theme).** Quick-add parse (F-03), completion (F-11), and assignment (F-05) all
   succeed but show the user nothing. One "optimistic-action + toast/undo" convention fixes the first two; the
   third gets explicit feedback through a people picker.
2. **Representation drift.** Dates (ISO vs DD/MM, F-04), labels (chip vs comma text, F-10), and metadata (chips
   in sidebar but absent on rows, F-07) render differently in different places. One representation per data type.
3. **Contrast & colour-semantics.** 5 machine-flagged WCAG-AA contrast misses + red-for-all-dates (F-08) →
   one colour-token pass (accessible gray; red reserved for overdue/destructive).

The full finding→FR map, the seven maintainer decisions (D1–D7, two grill-refined), the 14 FRs, and the five
invariants are in the `design_doc:` (`02_design.html`). This is a revision of the existing skill — web-UI-only;
the CLI flow and on-disk schema are unchanged.

## Surfaces

All under `plugins/pmos-toolkit/skills/mytasks/scripts/`:
`webapp/app.js` (client SPA), `webapp/app.css` (tokens/contrast/layout), `webapp/index.html` (shell/toast host),
and `serve.js`/`people.js` **only** for the FR-2 client→`POST /api/people` wiring (the endpoint already exists
from story 71x — no new server capability, no schema change).

## Stories

One story — singleton skill epic (same shape as 260629-bm9). All 14 FRs revise the same 3–4 files; the shared
toast helper, colour tokens, and chip renderer are dependencies of multiple findings, so the D24 litmus fails
any multi-story split (it would force cross-story coupling on the same lines).

- **260629-28w** (route: skill, planned) — all 13 findings + 5 contrast fixes in one `/execute` run.

## Decisions (maintainer-approved, this define run)

- **D1** — `@` opens a live-filtered people dropdown with an explicit **+ Add "&lt;handle&gt;"** button; a person
  is minted only on a deliberate click (no silent creation from a typo'd handle). The picker doubles as the @
  autocomplete. *(grill-refined from "silent auto-create".)*
- **D2** — one friendly date format everywhere: relative for near (Today/Tomorrow/Yesterday/weekday), absolute
  beyond (`Fri Jul 3`; year only off-current-year). *(grill added the relative-near band.)*
- **D3** — count badges on all smart views + overdue surfaced on Today; Today stays the landing view.
- **D4** — full scope: 12 surfaced findings + low-severity F-13 (hit areas) + 5 contrast failures.
- **D5** — one optimistic-action + toast + undo convention; **toast-window undo only** (no persistent stack).
- **D6** — one colour-token pass: accessible gray ≥4.5:1; red reserved for overdue/destructive; upcoming
  neutral/amber + icon.
- **D7** — one representation per data type (dates, label chips, metadata chips).

## Next

`/skill-sdlc build --story 260629-28w` (or `build --next`).
