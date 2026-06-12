# Vision Rubric — Renderer-Backed Binary Review

The judgment half of `/logos`' Phase 4 hybrid evaluator. A reviewer (subagent when available per §L, else inline) judges a **rasterized PNG** of each candidate and returns binary verdicts grounded in what the render actually shows. No scores, no shades — each item passes or fails on visible evidence.

This file documents the rubric SKILL.md Phase 4 step 2 applies. The deterministic hard gates that run first live in `eval/code-metrics.md`.

- [Returned JSON shape](#json-shape)
- [Gating rubric items](#gating-items)
- [Reviewer contract](#reviewer-contract)
- [Pass condition](#pass-condition)
- [Renderer is a Phase-0 hard gate](#renderer-gate)

---

## Returned JSON shape {#json-shape}

```json
{
  "items": {
    "favicon-legibility": {"verdict": "pass", "evidence": "..."},
    "monochrome-reads":   {"verdict": "fail", "evidence": "..."},
    "brief-fit":          {"verdict": "pass", "evidence": "..."}
  },
  "blocker_count": 1,
  "top_priorities": ["monochrome-reads"]
}
```

- `items` — keyed by the stable rubric ids below; each is `{verdict: "pass"|"fail", evidence: string}`.
- `blocker_count` — count of **gating** items that failed. All three items below gate, so this is simply the number of failed items.
- `top_priorities[]` — the stable ids of the most-important fixes, in order (up to 3), seeding the Phase 4 findings flow (`_shared/findings-dispositions.md`).

---

## Gating rubric items {#gating-items}

Exactly three items, all gating. Each judges the rendered raster (full-size and the 16px favicon render), not the SVG source.

### `favicon-legibility` — Does the mark read at 16px? (GATING)

> Rasterized at 16px (the favicon size), is the mark still recognizable — its silhouette and defining feature distinct, no detail collapsing into a smudge?

**Pass** if the shape holds and a viewer could tell what it is at favicon scale.
**Fail** if fine detail muds together, strokes disappear, or the mark becomes an indistinct blob. Cite the 16px render: which feature was lost.

### `monochrome-reads` — Does the flat mono fallback still read? (GATING, mandatory)

> With all color, gradient, and depth removed (the flat monochrome fallback render), does the mark still read as itself?

**Pass** if the silhouette and internal structure carry the identity with a single ink fill.
**Fail** if the mark depended on color or shading to be legible — shapes merge, negative space disappears, or it flattens into an unreadable mass. This check is **mandatory**: every candidate must survive monochrome, because real-world logos print and emboss in one color.

### `brief-fit` — Does it match the run's profile and the need? (GATING)

> Does the candidate match the run's extracted **style-profile** (palette, corner style, mood) AND fit the specific **need** it was generated for (a favicon, a nav glyph, a brand mark)?

**Pass** if the mark's vocabulary aligns with the profile and its form suits the need's usage context.
**Fail** if it drifts from the profile (wrong mood, off-palette feel, mismatched corner language) or is wrong for the need (an ornate emblem proposed as a 16px nav glyph). Cite the specific mismatch.

---

## Reviewer contract {#reviewer-contract}

- **No edits.** The reviewer judges only; it never modifies the SVG. Fixes flow through the Phase 4 refine loop after dispositions.
- **Temperature 0.** Deterministic judgment — same render, same verdicts.
- **Evidence-grounded.** Every `fail` cites at least one concrete observation visible in the rendered raster (a lost feature, a merged shape, a named mismatch). A `fail` with **no evidence is treated as `pass`** — unsupported negatives do not gate. "Looks off" is not evidence; "at 16px the inner cutout fills in solid" is.

---

## Pass condition {#pass-condition}

`blocker_count == 0` ⇒ the candidate **passes** the vision rubric and Phase 4 advances it.

`blocker_count > 0` ⇒ the candidate enters the **refine loop** (≤2 loops). The reviewer's `top_priorities[]` seeds the findings flow (`_shared/findings-dispositions.md`); after 2 loops any residual blocker is carried forward as a recorded warning on the candidate, never a silent retry.

---

## Renderer is a Phase-0 hard gate {#renderer-gate}

This entire rubric depends on a rasterizer — every item judges a PNG. The renderer is detected and gated in **Phase 0** (Playwright → `rsvg-convert` → `cairosvg`, first hit wins). With no rasterizer present, half the evaluator is missing: `favicon-legibility` and `monochrome-reads` cannot be checked at all. So `/logos` **refuses to run** when none is available (D2) rather than shipping candidates that passed only the deterministic gates. The vision rubric never runs in a degraded "code-metrics-only" mode.
