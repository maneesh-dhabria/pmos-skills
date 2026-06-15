---
schema_version: 1
id: 260614-q3h
kind: epic
title: "/backlog web viewer — nomenclature & conceptual clarity"
type: enhancement
priority: should
status: released
route: skill
feature_folder: docs/pmos/features/2026-06-14_backlog-web-clarity/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-14_backlog-web-clarity/02_design.html
labels: [backlog, pmos-toolkit, design-crit, ux]
created: 2026-06-14
updated: 2026-06-15
released: 2.81.0
parent:
dependencies: []
---

## Context

Seeded by a `/design-crit` of the read-only `/backlog web` viewer (served by `serve-web.mjs`, rendered by `web/viewer.html`, derived by `scripts/serve-web-lib.mjs`). The user's report: *"the nomenclatures [are] confusing and [I'm] not sure what is really happening."*

Root cause (one finding, many symptoms): **the viewer is a direct visual dump of `serve-web-lib.mjs`'s derived model with the three-loop engine's internal vocabulary intact** — `Groom`, `the machine's pick`, `the shelf`, `route`, and a single `status` filter that conflates epic-states with story-states. Every label is correct *engineering* terminology that only reads if you already hold the three-loop model in your head. The data model is sound; only its presentation leaks. The fix is a thin **translation layer**, not a redesign.

All findings target a single skill — `/backlog` (its `web` verb, in pmos-toolkit) — so this is a singleton epic of one fused `route: skill` story. The edits span `web/viewer.html` (labels, legend, kind pills, status-group filter, tooltips, `@null` guard) and `scripts/serve-web-lib.mjs` (the `null`-literal coercion that is the true `@null` root cause, the Releases not-started exclusion, the grouped-status facet), plus `tests/serve-web.test.mjs`.

Findings (each verified against the viewer code this session):

1. **Queue column names are insider jargon.** `viewer.html:233/239/242` render `Groom — waiting on you` / `Next — the machine's pick` / `Releases — the shelf`. Metaphors with no translation.
2. **No mental-model key.** The header (`viewer.html:76–87`) carries title + tabs + filters only — nothing explains Epic⊃Story or Define→Build→Release, or Tree-vs-Queues.
3. **Epic vs Story is invisible.** Tree rows (`viewer.html:189–205`) never name the kind; it's implied only by an expander + progress bar. Singleton (auto-wrapped) epics look identical to multi-story epics.
4. **One `status` filter conflates two lifecycles.** `serve-web-lib.mjs:296` flattens `uniq(items.map(status))` — epic states (`defined`,`released`) jumbled with story states (`planned`,`ready`,`done`,`wontfix`), alphabetical, no grouping.
5. **`@null` leaks onto story rows.** True root cause: `parseScalar` (`serve-web-lib.mjs:32–39`) does not coerce the YAML `null`/`~` literal, so a `claimed_by: null` (or any null scalar) is read as the string `"null"`; the tree view (`viewer.html:200`) then renders the chip `@null`. Observed on `#260614-a3g`.
6. **"Releases → In-flight" is a dumping ground.** `serve-web-lib.mjs:285–291` puts every non-released, non-blocked epic that isn't all-done into `in_flight` — including freshly `defined` epics with 0 stories built (12 of them this session), burying the (empty) release-ready set.
7. **Unlabeled affordances.** Progress bar + `0/3` (`viewer.html:51–54,193`) and the `route` chip have no tooltip/gloss.

Design doc: `docs/pmos/features/2026-06-14_backlog-web-clarity/02_design.html`

## Acceptance Criteria

- [ ] Queue columns read as plain labels with a "what to do" subtitle: **Needs you** / **Ready to build** / **Releases** (no `machine`/`shelf`/`groom` metaphor in the headers).
- [ ] A one-line legend under the title states Epic⊃Story, Define→Build→Release, and Tree-vs-Queues.
- [ ] Tree rows label the kind explicitly (`EPIC` / `story` pill); singleton epics are distinguishable.
- [ ] The status filter is split into lifecycle-ordered **Epic status** and **Story status** groups (only states present in the data shown).
- [ ] The `@null` chip never renders: `parseScalar` coerces the YAML `null`/`~` literal (and empty) to empty for every field; the viewer claim guard also treats `"null"`/`"undefined"` as empty (belt-and-suspenders).
- [ ] The Releases column excludes not-started epics (0 stories done) and shows a done/total progress badge on the rest; the sub-header reads **In progress** (not "In-flight").
- [ ] The progress bar and `route` chip carry explanatory tooltips.
- [ ] `tests/serve-web.test.mjs` covers the `null`-literal coercion, the grouped-status facet, and the Releases not-started exclusion; existing tests stay green.
- [ ] All changes pass `skill-eval` and keep the skill's existing selftests/tests green.

## Notes

Singleton epic (one in-scope skill / release unit: `/backlog` in pmos-toolkit). One fused `route: skill` story — the seven findings are coherent edits to `viewer.html` + `serve-web-lib.mjs` + `tests/serve-web.test.mjs`, independently shippable as one pmos-toolkit release. Deferred (cosmetic, authored into item data not the viewer): the plugin-name-in-title prefix duplication (`pmos-gamekit — /flappy-bird` + plugin badge) and mixed legacy/year-prefixed id formats.
