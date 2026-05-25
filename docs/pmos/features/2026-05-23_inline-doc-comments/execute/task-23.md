---
task_number: 23
task_name: "SVG data-anchor retrofit — /diagram + /wireframes emit data-anchor (FR-50, FR-51, S15)"
task_goal_hash: t23-svg-data-anchor-retrofit-diagram-wireframes
plan_path: docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html
branch: feat/inline-doc-comments
worktree_path: /Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-doc-comments
status: done
started_at: 2026-05-25T04:30:00Z
completed_at: 2026-05-25T05:00:00Z
files_touched:
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/svg-anchor.js
  - plugins/pmos-toolkit/skills/diagram/tests/svg-data-anchor.test.js
  - plugins/pmos-toolkit/skills/diagram/SKILL.md
  - plugins/pmos-toolkit/skills/wireframes/SKILL.md
  - tests/scripts/assert_svg_data_anchor.sh
  - docs/pmos/features/2026-05-23_inline-doc-comments/execute/task-23.md
---

## What was implemented

### svg-anchor.js helper (275 LOC)

Created `plugins/pmos-toolkit/skills/_shared/html-authoring/assets/svg-anchor.js`.

**Export shape:**
```js
module.exports = {
  retrofitSvg,           // (svgString, opts?) -> svgString — main entrypoint
  _internal: {
    derivSlug,           // (attrs, body, ordinalCounter) -> string
    kebab,               // (s) -> string
    extractLabel,        // (attrs, body) -> string|null
    dedupe,              // (seenSlugs, slug) -> string
  },
};
```

**Algorithm:**
- `retrofitSvg`: finds all `<svg>…</svg>` blocks via regex, calls `_retrofitOneSvg` on each, splices results back with correct offset tracking.
- `_retrofitOneSvg`: stateful tag scanner tracking `gDepth`. Retrofits every `<g>` (any nesting level), and every `<rect>`/`<path>` at `gDepth === 0` (not nested inside a `<g>`). Preserves existing `data-anchor` (idempotent).
- `derivSlug`: reads `id` attr → `aria-label` attr → first `<text>` child text → `shape-N` ordinal.
- `kebab`: lowercase, replace non-alphanumeric runs with `-`, trim, collapse `--+`.
- `dedupe`: `slug` → `slug-2` → `slug-3` etc. via a per-SVG `Set`.
- Pure: no `fs`, no `git`, no `process`. Deterministic + idempotent.

### Tests (9 sub-cases PASS)

Created `plugins/pmos-toolkit/skills/diagram/tests/svg-data-anchor.test.js`:
- (a) `id`-based slugs on 3 `<g>` groups → `header`, `body`, `footer`
- (b) `aria-label` kebab fallback → `step-1`, `step-2`
- (c) ordinal fallback (no id, no label, no text) → `shape-1`, `shape-2`, `shape-3`
- (d) Inline SVG in HTML wireframe fixture → `nav-bar`, `content-area`
- (e) Idempotency: `retrofitSvg(retrofitSvg(svg)) === retrofitSvg(svg)` byte-exact
- (f) Top-level `<rect>`/`<path>` get anchors; nested ones inside `<g>` do NOT (count=3)
- (g) Collision dedupe: two `<g id="foo">` → `foo`, `foo-2`, `foo-3`
- Plus: `kebab()` unit + `dedupe()` unit sub-cases

### Assert script

Created `tests/scripts/assert_svg_data_anchor.sh` — BASH_SOURCE-fallback + walk-up boilerplate per the repo invariant.

### /diagram SKILL.md wiring (Phase 7, step 1)

Inserted a "SVG data-anchor retrofit (FR-50, FR-51, S15)" block in Phase 7 step 1 of `/diagram`'s SKILL.md, documenting the `retrofitSvg()` call contract before the final SVG write. Notes the slug derivation order and that the anchors are consumed by the svg-data-anchor resolver strategy from T12/T23.

### /wireframes SKILL.md wiring

Inserted a "SVG data-anchor retrofit (FR-51, S15)" block in the "Apply comment-resolver edit" section's "Comments instrumentation" subsection. Documents the `retrofitSvg()` call on per-screen HTML before writing; notes the safe no-op behavior when no inline SVG is present.

### Snapshot fixture audit

Audited all SVG-bearing fixture files:
```
grep -rln "<svg" plugins/pmos-toolkit/skills/{diagram,wireframes}/tests/fixtures/ tests/fixtures/
```
Result: exactly one file — `plugins/pmos-toolkit/skills/diagram/tests/fixtures/apply-edit-at-anchor/diagram_mini.html`.

This fixture was hand-authored for T19 with `data-anchor` already on its `<rect>` elements. No regeneration needed — the fixture is idempotent under `retrofitSvg()` (verified programmatically: 6 pre-existing attrs + 1 new top-level legend `<rect>` = 7 total; both `retrofitSvg(once)` and `retrofitSvg(twice)` are byte-equal). The T19 apply-edit-at-anchor test passes without any fixture changes.

## Test results

All verification suites green:
- `assert_svg_data_anchor.sh` — PASS: 9 sub-cases
- `assert_apply_edit_at_anchor_diagram.sh` — PASS: 5 cases (T19 regression: green)
- `assert_apply_edit_at_anchor_wireframes.sh` — PASS: 5 cases
- `assert_anchor_resolver.sh` — PASS: 7/7 cases (svg-data strategy confirmed)
- `assert_comments_js_unit.sh` — 20 passed, 0 failed (T22 regression: green)
- All 14 `assert_apply_edit_at_anchor_*.sh` — ALL PASS

## Reviewer findings

**Combined spec + code-quality review (round 1):** **Spec ✅ + Quality Approved.**

- Spec: every requested item verified — shared helper present + pure, /diagram + /wireframes wiring at the cited SKILL.md locations (FR-50/FR-51/S15 citations), slug derivation correct (`derivSlug` at `svg-anchor.js:66-84`), dedupe `-2`/`-3` at `:90-100`, top-level rect/path gate via `gDepth === 0` at `:209-211`, idempotency at `:221-227` confirmed byte-exact by sub-case (e), bash boilerplate per CLAUDE.md.

- Quality: 0 Critical, 0 Important, 4 Minor (all non-blocking):
  1. Dead constant `TAG_RE` at module scope (`svg-anchor.js:117-118`); the live regex is the function-scope `tagRe` at `:178`. Harmless.
  2. `derivSlug` doesn't document that `ordinalCounter` increments only on the ordinal branch; one-line comment would prevent future "why does shape-1 follow foo?" confusion.
  3. Pathological-SVG limitations (CDATA, XML comments with `<g>`-like strings, attribute values with `>`) not documented in helper header. Spec accepts for machine-emitted SVG; 2-line "Limitations" block would close the doc gap.
  4. Idempotency-vs-collision edge: pre-existing `data-anchor="foo"` on an authored SVG is NOT added to `seenSlugs` before the walker proceeds; a later `<g id="foo">` would derive `foo` then dedupe to `foo-2`, leaving two elements both with `data-anchor="foo"` possible. Low real-world risk (machine-emitted SVG doesn't pre-anchor); one-line fix (`seenSlugs.add(existingAnchor)` before `continue`) would close it.

All 4 Minors flagged for follow-up — none blocks T23.

## Self-review findings

**Correctness:** The `gDepth` tracker correctly scopes `<rect>`/`<path>` nesting. Verified by sub-case (f) which checks the count is exactly 3 (not 5).

**Idempotency:** Verified both via unit test (e) and manual run on `diagram_mini.html`. The `_readAttr(attrsRaw, "data-anchor")` guard ensures already-anchored elements are skipped.

**BASH_SOURCE boilerplate:** `assert_svg_data_anchor.sh` follows the exact pattern from `assert_resolver_confirm_each.sh` (walk-up sentinel: `CLAUDE.md + plugins/pmos-toolkit`).

**Minor deferred:** `svg-anchor.js` uses a regex SVG walker (not a full XML parser) per the task spec ("DON'T pull in a heavy XML parser"). This handles well-formed SVG but not pathological cases (deeply nested entities, CDATA sections with `>` chars). Adequate for the pmos-toolkit SVG emit context where all SVG is machine-generated from `compose.py`.

**No fixture regeneration needed:** The single SVG-bearing apply-edit-at-anchor fixture was hand-authored and already carried `data-anchor`. The golden `.svg` files in `diagram/tests/golden/` are not HTML fixtures and do not need `data-anchor` — they are pure SVG inputs to Python rubric tests, not HTML emit artifacts.
