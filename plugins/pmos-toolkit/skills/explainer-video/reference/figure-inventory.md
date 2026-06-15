# Figure inventory — extraction + filter

Consumed by `SKILL.md` Phase 2 (`{#ingest}`) and implemented by `scripts/ingest.mjs`. Defines the figure inventory shape and the size/role filter that drops non-content images. Cites the design `02_design.html` figure-reuse decision + the 2026-06-13 grill resolution (include web scraping).

**Contents:** [Inventory shape](#inventory-shape) · [Sources](#sources) · [Size/role filter](#size-role-filter) · [Reuse rule](#reuse-rule)

## Inventory shape

`ingest.mjs` emits `figures.json` — an array of:

```json
{ "id": "fig_1", "source_ref": "<path | url | anchor>", "kind": "svg | img",
  "alt": "alt or caption text", "width": 1200, "height": 740 }
```

`id` is a stable `fig_<N>` assigned in document order. `source_ref` is what Phase 4 loads to place the original asset: a local path, a resolved absolute URL, or — for an inline pmos `<svg>` — a relative path to the **extracted SVG file** (`figures/<id>.svg`, written beside `figures.json`). `width`/`height` are intrinsic pixels when known (0 if unknowable, e.g. an SVG without a viewBox).

## Sources

- **pmos artifacts** — owned inline `<svg>` elements and `<figure>`s carrying `data-anchor`. When `--figures-out` is given, each inline `<svg>` block is **written to `figures/<id>.svg`** (a dir beside `figures.json`) and `source_ref` points at that file (`figures/<id>.svg`), so Phase 4 embeds the original asset from disk — no hand-rolled extraction. (Without `--figures-out`, stdout-only runs fall back to the `data-anchor`/`id` anchor as `source_ref`.)
- **Local HTML/MD** — `<img src>` / `<figure>` in HTML; `![alt](path)` in markdown. Relative `src` resolved against the file's directory.
- **Fetched web pages** — `<img>` / `<figure>` / `<picture>` in the fetched DOM. **Relative URLs resolved against the page base** (`<base href>` or the document URL).

## Size/role filter

Drop an image when ANY of these mark it as chrome/tracking/decoration rather than content (grill-resolved thresholds — keep conservative; a missed real figure is worse than an extra one, so only drop on clear signals):

- **Size:** intrinsic `width < 200` OR `height < 100` (px) when dimensions are known — spacers, icons, tracking pixels (1×1).
- **Role/path:** `src`/`class`/`id`/`alt` matches `nav|logo|icon|sprite|avatar|tracking|pixel|spacer|beacon|ad[-_]|banner` (case-insensitive), or `role="presentation"`, or empty `alt` combined with a sub-threshold size.
- **Data URIs** under 2 KB (inline spacers).

An image with no known size is **kept** (unknown ≠ decorative) unless its path/role matches the drop list.

## Reuse rule

Place the **original asset** when it illustrates a slide's idea (design figure-reuse), rather than paraphrasing it in prose. The distiller (Phase 3) references a figure by `id`; Phase 4 loads `source_ref` and embeds the original asset into the slide `<section>` — for an inline `<svg>` it inlines the contents of the extracted `figures/<id>.svg`; for an `<img>` it uses the resolved path/URL. One figure per slide max; text-only when no inventory figure fits.
