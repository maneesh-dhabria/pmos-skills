# Skeleton-migration runbook — story 260710-8z9

**One procedure, applied to all 41 pattern files.** Per the repo's standing "apply-the-same-procedure-to-N-files"
learning, this file is the single canonical home for the migration steps. Every batch task in `tasks.yaml` cites it
by path and states only its per-batch delta (which files, which retired ids appear). Do **not** restate these steps
41 times.

Sources of truth this runbook depends on (both land before this story, per the dependency graph):
- `reference/primitives.md` (story 260710-p5x) — the ~24 named monochrome SVG primitives + the grid/palette home
  (`reference/grid-system.md`). Every skeleton composes **only** from these; no ad-hoc geometry.
- `reference/eval-rubric.md` (story 260710-dsc) — the survivor id set `N1`–`N10`, `F1`–`F2`, `G1`–`G4`, `S1`–`S4`,
  `C1`–`C3`. The retired set `A1 A2 A3 A4 A5 D1 D2 D3 D4` no longer exists in that rubric.

## Per-file procedure

For each `patterns/<category>/<file>.md`:

1. **Preserve the judgment layer verbatim.** Do **not** touch `## When to use`, `## When NOT to use`, `## Anatomy`,
   `## Required states`, `## Device variants`, and the *prose* of `## Best practices` / `## Common mistakes`. This
   story rewrites **skeletons and cites**, never thins guidance (AC6). Only the parenthetical id tokens inside those
   two lists change, per step 4.
2. **Rewrite the `## Skeleton` block.** Replace the `mock-*`-class HTML with an inline `<svg>` composed of named
   primitives from `reference/primitives.md`, at the pattern's natural device canvas token from
   `reference/grid-system.md`. Every `x`/`y`/`width`/`height` is a multiple of 8. Only the 6 palette tokens.
   `#d33` appears **only** inside a `<g data-region="annotations">` subtree. Every `<text>` carries `stroke="none"`.
   `viewBox` present and matching `width`/`height`. Each `data-region` group carries `<title>` + `<desc>`.
   **No `mock-*` class name may survive** (AC1).
3. **Compose, do not invent.** If a skeleton needs geometry no primitive provides, STOP — do not one-off it here.
   Escalate to the primitive-gap note at the foot of this runbook; the primitive is added in `primitives.md` (its
   count-claim updated) before the batch proceeds. A skeleton is a *composition*, never new geometry.
4. **Re-point every heuristic cite** in `## Best practices` / `## Common mistakes` onto the survivor set, using the
   disposition table below. No cite may point at a retired id after this file is done.
5. **Lint the file's skeleton.** Run `node scripts/lint-wireframe-svg.mjs <the skeleton, extracted or as a fixture>`;
   it must exit 0 (AC2). A red skeleton does not ship — a bad exemplar poisons `#generate` everywhere (§7 risk 5).

## Retired-id → disposition table (the load-bearing decision — step 4)

Never leave a cite pointing at a dead id. Each retired id is either **dropped** (guidance now enforced elsewhere or
out of scope) or **restated** (as prose without an id, or re-pointed to a survivor that genuinely covers it). This
table is normative so the executor makes no per-file judgment call.

| Retired id | Was | Disposition |
|---|---|---|
| `A1` | Semantic HTML (headings/landmarks/`<button>`) | **Drop** — SVG has no semantics; accessibility is `/prototype`'s job (design D3). Where a cite was really about *visual* hierarchy (e.g. "heading scale"), re-point → `G3`. |
| `A2` | Colour contrast | **Drop** — trivially satisfied by the closed monochrome palette and enforced by the lint's allowlist (A1/D3). Not a reviewer heuristic anymore. |
| `A3` | Focus visibility / tab order | **Drop** — no `:focus-visible` in SVG; `/prototype` owns it. |
| `A4` | Labels (visible label, aria) | **Restate as prose** — "show a visible label, not placeholder-as-label" is a composition rule; keep the sentence, drop the `(A4)` token. Where the point is *recall*, re-point → `N6`. |
| `A5` | Touch targets ≥44px | **Drop** — now enforced by the lint's 44px tap-target geometry check (A2, §H). The prose note may stay as plain guidance without the id. |
| `D1` | mobile thumb-zone + ≥44px | The 44px half is **dropped** (→ lint). The thumb-zone/no-hover-only half is **restated as prose** without an id (composition judgment, no survivor covers it). |
| `D2` / `D3` | Material / HIG native chrome | **Restate** the structural bits as prose (e.g. "bottom nav, 3–5 destinations"; "FAB for primary create"); **drop** the native-chrome-specific bits (system bars, safe-area). Re-point count/choice guidance → `F2` where it fits. |
| `D4` | Desktop keyboard/hover/right-click | **Re-point → `C2`** (annotations layer) where the point is "document hover/right-click in annotations"; else drop. |

Sanity anchors from the live tree (measured at plan time — the batches must reduce these to zero):
`A2`×34, `A1`×25, `A3`×24, `D1`×20, `A4`×20, `A5`×8, `D3`×4, `D2`×3, `D4`×0. Total retired-id matches across the 41
files + `README.md` = **138**, in **38** of the 41 files (3 files carry no retired id).

## The dangling-cite gate (whole-inventory, run in T9 after every batch)

```
grep -rEo '\b(A1|A2|A3|A4|A5|D1|D2|D3|D4)\b' patterns/*/*.md patterns/README.md | wc -l
```

Must print **`0`** — assert the **match count is zero explicitly**, not merely a zero exit code. The seed's BRE
`grep 'A1|A3|…'` matched the literal pipe string and returned 0 hits on every file (proven at plan time: 0 files),
so it could never fail — the count assertion is what makes the gate real (amendment A1).

## Primitive-gap note (append here during execution)

If step 3 finds a missing primitive, record it here and add it to `reference/primitives.md` (updating that file's
stated count-claim, per story p5x's AC) before continuing the batch. Route the gap into the library — never one-off.

- _(none recorded yet — executor appends)_
