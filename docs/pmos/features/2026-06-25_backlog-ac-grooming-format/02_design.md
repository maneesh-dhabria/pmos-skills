# /backlog grooming false-positive — AC detection requires checkbox markers

**Epic:** 260625-sm0 · **Route:** skill · **Plugin:** pmos-toolkit · **Skill:** `/backlog`
**Status:** defining → defined (Loop 1) · **Authored:** 2026-06-25

> **output_format deviation:** settings request `html`; this define authors the design + plan
> as markdown (md). Rationale: a trivial single-function viewer fix; the build loop consumes md
> design/plan fine; sibling `route: skill` stories (cg6/shm/aqb/y9m) already ship `.md` plans.
> Logged per the html-authoring fallback learning.

## Problem

Running `/backlog` (bare dashboard) and `/backlog groom` lists eight fully-defined, `planned`,
build-ready stories under **"needs grooming"** even though each has a detailed `## Acceptance criteria`
section and a `plan_doc`. The maintainer expected them to be groomed (they are), so the groom queue is
misleading — it points a human at work that is already done.

Observed: stories `260624-{9fw,aa8,aqb,f62,fbd,vry,xck,y9m}` all appeared in `groom.needs_grooming`
despite real ACs.

## Root cause

The viewer derivation `scripts/serve-web-lib.mjs` decides grooming with:

```js
function hasAcceptanceCriteria(body) {
  const ac = sectionBody(body, 'Acceptance Criteria');   // case-insensitive (im flag) — OK
  return !!ac && /-\s*\[[ xX]\]/.test(ac);                // requires a markdown CHECKBOX
}
```

and `buildModel()` flags a story as needing grooming when:

```js
s.status === 'draft' || ((s.status === 'ready' || s.status === 'planned') && !s.has_ac)
```

So a story counts as "having ACs" **only when its AC section contains a `- [ ]` / `- [x]` checkbox**.
The eight stories were authored by `/feature-sdlc define`'s story-split, which writes ACs as **numbered
lists** (`1.`, `2.`) or **bold-dash bullets** (`- **AC1 …**`) — never checkboxes. Their AC sections are
substantively complete but fail the checkbox-only regex, so `has_ac=false` and they false-flag.

This is a **viewer-only false positive**: `next` / `releases` and the build picker do **not** gate on
`has_ac` (`260624-aqb` is the live `next` pick), so nothing downstream was blocked — only the human-facing
groom view was wrong.

`schema.md:133` documents `- [ ]` as the canonical AC form, and 80/132 items use it — so the check matches
the *documented* form, but equating "has ACs" with "has checkbox-formatted ACs" is too brittle: a story
with real, enumerated ACs in any list style is groomed in substance.

## Decision log

- **D1 — fix the detector, make it format-robust (not the authors).** `hasAcceptanceCriteria` should
  return true when the AC section contains **≥1 enumerated criterion in any form** — checkbox (`- [ ]` /
  `- [x]`), plain bullet (`-` / `*`), or numbered (`1.`). It returns false only for an absent or
  content-empty section (heading with no list items). This makes "groomed" robust to authoring style and
  fixes the symptom universally, regardless of which skill wrote the ACs.
- **D2 — single-skill, one-story epic, scoped to `/backlog`.** The fix lives entirely in `/backlog`'s
  derivation lib + its test. Making `/feature-sdlc define` emit canonical `- [ ]` ACs is a **separate
  concern in a different skill** and is **out of scope** — the viewer fix resolves the false-positive on
  its own; normalizing authoring is a nice-to-have follow-up (candidate future backlog item), not required.
- **D3 — keep checkbox the recommended canonical form; reconcile the doc.** `schema.md` keeps `- [ ]` as
  the recommended AC example, with a one-line note that **grooming detection** accepts checkbox, dash, or
  numbered criteria — so doc and code agree and no future author is surprised.
- **D4 — regression test the format matrix.** Extend `tests/serve-web.test.mjs` (failing-first) with a
  numbered-AC story and a dash-bullet-AC story (both `has_ac=true`, both excluded from
  `needs_grooming`), and a heading-only AC section (`has_ac=false`, still groomed-pending). Existing cases
  stay green.
- **D5 — derivation is the single home (no viewer/server change).** Per the existing D5 (`serve-web-lib.mjs`
  is the one home for read-side rules; `viewer.html` only renders), the change is confined to the lib +
  test. No `viewer.html` / `serve-web.mjs` edit.

## Out of scope

- Re-formatting already-authored stories (done manually this session, 2026-06-25).
- Changing `/feature-sdlc define`'s story-split AC output format (different skill).
- Any change to `next` / `releases` / build readiness (they don't gate on `has_ac`).

## Eval / test plan

- **Deterministic:** `node --test tests/serve-web.test.mjs` (or the package's test runner) green,
  including the new format-matrix cases.
- **Live dogfood:** rebuild the model from the real `backlog/items/` and assert `needs_grooming` excludes
  the numbered/dash-AC stories while still flagging a genuinely AC-less `draft`.
- **skill-eval `[D]`** for `/backlog` SKILL.md stays green (SKILL.md surface is unchanged unless a doc line
  references AC format); 4 hygiene lints + audit-recommended clean.

## Story split

| Story | Title | Route | Deps |
|---|---|---|---|
| 260625-751 | `/backlog` grooming AC detection — accept checkbox/dash/numbered criteria; reconcile schema.md; regression-test the format matrix | skill | — |

One story: the fix is a single cohesive change to the derivation lib, its test, and the schema note —
one `/execute` run, one PR.
