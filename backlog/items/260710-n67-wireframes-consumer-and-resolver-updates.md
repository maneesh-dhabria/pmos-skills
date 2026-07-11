---
schema_version: 1
id: 260710-n67
title: "/wireframes consumers — port /diagram's data-anchor branch into the apply-edit shim (the comment write-back path breaks without it), make /prototype read the screen manifest, resolve /design-crit's SVG blindness explicitly, reconcile build-canvas.js canvas tokens, and re-point /msf-wf's rubric cite"
type: feature
kind: story
status: done
route: skill
priority: should
labels: [pmos-toolkit, wireframes, prototype, design-crit, msf-wf, skill]
created: 2026-07-10
updated: 2026-07-11
parent: 260710-grd
feature_folder: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/
design_doc: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/02_design.html
plan_doc: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/stories/260710-n67/03_plan.html
tasks_file: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/stories/260710-n67/tasks.yaml
dependencies: [260710-rgb, 260710-dsc]
---

## Context

The blast-radius story. **It must not be deferred** — one of its items is a blocker that falsifies the design's own
justification for choosing inline SVG (amendment A6).

`scripts/apply-edit-at-anchor.js` was listed as "Untouched" in the design's §6. It is not. Its `_resolveAnchor`
(`wireframes/scripts/apply-edit-at-anchor.js:83–112`) resolves id-first by matching `id="<slug>"` **only**, then
falls back to a ≥40-character quote substring. After this epic a screen region is
`<g data-region="sidebar" data-anchor="sidebar">` with **no `id` attribute**, while `comments.js:445` stores
`shape_id` = the `data-anchor` value. The id path misses; SVG `<text>` nodes are far shorter than 40 characters so
the quote path misses; every SVG-region comment resolves to `anchor_orphaned`. `/diagram`'s shim already solved
this — it carries a `data-anchor` branch at `diagram/scripts/apply-edit-at-anchor.js:97–111`. The wireframes shim
lacks it. The 5 existing tests pass only because the fixture `wireframes_mini.html` is `<section id="…">` DOM and
never exercises SVG.

The other four items are the honest blast radius of the payload change: `/prototype`'s silent-empty entity model
(the highest-risk item in the design), `/design-crit`'s tell-detector seeing nothing inside an `<svg>`,
`build-canvas.js`'s hardcoded and now-wrong device size table, and `/msf-wf`'s cite of the rewritten rubric.

Coherence contract: `02_design.html` — §6, §7 risks 1–4; amendments A0, A6, A8.

## Change surface

- `plugins/pmos-toolkit/skills/wireframes/scripts/apply-edit-at-anchor.js`
- `plugins/pmos-toolkit/skills/wireframes/tests/fixtures/apply-edit-at-anchor/` (new inline-SVG fixture)
- `plugins/pmos-toolkit/skills/wireframes/assets/canvas/build-canvas.js`
- `plugins/pmos-toolkit/skills/prototype/SKILL.md` (lines 183, 219)
- `plugins/pmos-toolkit/skills/prototype/reference/mock-data-prompt.md` (lines 8–10)
- `plugins/pmos-toolkit/skills/design-crit/assets/slop-prepass.mjs` **or** `_shared/slop-engine/design-slop-rules.md`
- `plugins/pmos-toolkit/skills/msf-wf/SKILL.md` (line 186)
- `plugins/pmos-toolkit/README.md`

## Acceptance Criteria

- [x] **[Blocker] The apply-edit shim resolves `data-anchor`.** `_resolveAnchor` gains the `data-anchor="<id>"`
  branch ported from `diagram/scripts/apply-edit-at-anchor.js:98–110`, tried after `id="<id>"` and before the
  ≥40-char quote fallback, reporting `strategy: "id-first"`.
- [x] A **new fixture is an inline-`<svg>` screen** in the post-refactor emit format, and a test asserts a comment
  anchored to `<g data-region="…" data-anchor="…">` resolves rather than orphaning. The 5 existing
  `apply-edit-at-anchor` tests stay green; the assertion count **rises**.
- [x] **`/prototype` reads the manifest first.** `SKILL.md:183` and `:219`, and `reference/mock-data-prompt.md:8–10`,
  read `<script id="pmos-wireframe-meta">`'s `fields` array as the primary source; the `<th>`/`<label>`/`<dt>` /
  `data-field` tag-grep survives only as a **legacy fallback** for pre-refactor wireframes.
- [x] The entity model can no longer come back **silently empty**: when neither the manifest nor the legacy tags
  yield fields for a screen, `/prototype` reports it rather than proceeding with an empty model (design §7 risk 1 —
  the dangerous class is a grep that returns zero matches instead of erroring).
- [x] **`/design-crit`'s SVG blindness is resolved explicitly.** `window.pmosDesignScan()` — which lives at
  `assets/slop-prepass.mjs:90–97`, **not** `capture.mjs` as the seed claimed (amendment A0) — is either taught an
  SVG dialect or made to **exempt wireframe artifacts with a logged reason**. No silent cap: if wireframes are
  skipped, the run says so and says why.
- [x] **`build-canvas.js` canvas tokens reconciled** (amendment A8). `SCREEN_WIDTH`/`SCREEN_HEIGHT`
  (`build-canvas.js:23–24`) currently hardcode `desktop-web 1280×800, mobile-web 390×844, tablet-web 834×1112` and
  fall back to 1280×800 for unknown devices. They are reconciled with the four canvas tokens in `grid-system.md` —
  mobile is **375×812**, not 390×844 — with `tablet` 768×1024 and `wide` 1440×900 added. `canvas.html` renders each
  screen at its true aspect.
- [x] **`/msf-wf`'s rubric cite stays valid.** `msf-wf/SKILL.md:185` spot-checks edits against
  `../wireframes/reference/eval-rubric.md`. Plan-time recon confirmed it cites the file **by path and names no
  heuristic ids** — `grep -Eo '\b(A1|A2|A3|A4|A5|D1|D2|D3|D4)\b'` over that file returns **zero hits today**. So
  this is a **forward guard**, not a repair: the epic's dangling-cite grep is extended to cover `msf-wf/SKILL.md`
  so a future edit cannot reintroduce a retired id.
- [x] `/msf-wf --apply-edits` (the block at `msf-wf/SKILL.md:181–188`) still lands substring `Edit`s against the SVG
  payload; a fixture test covers a coordinate-adjacent edit (design §7 risk 3).
- [x] `plugins/pmos-toolkit/README.md:25` no longer describes the output as "Static mid-fi HTML wireframes".
- [x] `check-comments-coverage.sh` passes; its contract-test and emit-reference inventory is unchanged by this
  story (it keys on file/skill existence, not HTML body structure).
- [x] Conforms to `skill-patterns.md §A–§L` + repo `CLAUDE.md`; `skill-eval.md` and all four hygiene lints stay
  green across every touched skill; the frozen non-interactive block stays byte-identical.

### accepted_residuals

- **skill-eval `[D]` `d-progress-tracking` on `/msf-wf`** — the check reports `10 phases but no ## Track Progress
  instruction` (exit 1). This fails **identically on the base tree**: `## Track Progress` is absent from
  `msf-wf/SKILL.md` at both base main `f1eed6f9` and the dep-merge base `bf09d833` (grep count 0 in both). n67's
  only edit to that file is a single-line parenthetical on the `--apply-edits` step (adds no phase, no tracking
  section — see `git diff bf09d833..HEAD -- plugins/pmos-toolkit/skills/msf-wf/SKILL.md`). Adding a Track-Progress
  section to `/msf-wf` is outside this story's blast-radius scope (SVG-refactor consumer + resolver updates).
  Surfaced loudly, not blocking. The other three touched skills (wireframes, prototype, design-crit) are fully
  green on `[D]`; the `[J]` coherence pass is COHERENT with zero defects across all four.
