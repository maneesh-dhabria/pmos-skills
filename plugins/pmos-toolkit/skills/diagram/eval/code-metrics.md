# Code Metrics — Deterministic SVG Eval

This file specifies the deterministic eval that `/diagram` runs in Phase 4. All metrics are implemented in **`tests/run.py`** (function `evaluate(svg_path, theme=..., sidecar_path=...) -> dict`); reuse that function rather than re-implementing inline.

For ad-hoc invocation from SKILL.md, call:

```bash
python3 -c "import sys; sys.path.insert(0, '${CLAUDE_PLUGIN_ROOT}/skills/diagram/tests'); import run; import json; print(json.dumps(run.evaluate('PATH/TO/file.svg', theme='technical', sidecar_path='PATH/TO/file.diagram.json.tmp'), indent=2))"
```

Pass `sidecar_path` explicitly when evaluating a draft (`<out>.svg.tmp`) — the default suffix-derived sidecar path only resolves for finalized SVGs, and `role-style-consistency` silently passes when no sidecar is found.

The function returns:

```json
{
  "code_score": 0.92,
  "hard_fails": ["palette: #FF00AA not in token set"],
  "soft_metrics": {
    "edge_crossings": 1.0,
    "node_count": 1.0,
    "angular_resolution": 0.81
  },
  "diagnostics": {
    "edge_crossings_count": 0,
    "node_count": 8,
    "min_font_size": 12,
    "grid_snap": 0.97,
    "off_grid_coords": ["text@(411,200)"],
    ...
  }
}
```

`code_score` is the mean of `soft_metrics.values()`. **Pass = `code_score >= 0.8` AND `hard_fails == []`**.

---

## Parser foundation

All metrics start from a parsed SVG with **resolved absolute coordinates** (transforms composed) and **resolved CSS class lookups** (font-size / fill / stroke).

Use Python's `xml.etree.ElementTree` plus a small CSS-class resolver. The SVG namespace is `http://www.w3.org/2000/svg`. Strip it on parse:

```python
import xml.etree.ElementTree as ET
ns = {"svg": "http://www.w3.org/2000/svg"}
tree = ET.parse(svg_path)
root = tree.getroot()
```

### Transform composition

For each element, compose transforms from the root down. Supported:
- `translate(tx, ty)` or `translate(tx ty)` — most common.
- `scale(s)` or `scale(sx, sy)`.
- `rotate(deg)` or `rotate(deg cx cy)`.

Implement as 3×3 affine matrices. For an element nested under multiple `<g transform="...">`, multiply matrices in document order; apply the result to its own coordinates.

If an unsupported transform is encountered (e.g. `matrix(...)`), record a hard-fail `"transform: unsupported matrix() on element <id>"` rather than silently mis-evaluating.

### CSS class resolution

`<style>` blocks of the form `.cls { font-size: 14px; fill: #475569; }` are scanned; classes referenced via `class="cls"` look up their attributes. Inline attributes override class attributes. Support only the three properties we eval against: `font-size`, `fill`, `stroke`.

---

## Node detection

A "node" is any of:
- `<rect>` with both `width` and `height`
- `<circle>` with `r`
- `<ellipse>` with `rx` and `ry`

Excluded from node detection:
- Rects with `class="legend"` or inside `<g class="legend">` (legend block, not content)
- Rects with `class="edge-label"` or inside `<g class="edge-label">` (label pills)
- Rects/circles inside `<defs>` (markers, patterns)

Each node's bbox is its post-transform `(x, y, w, h)`. For circles: `(cx-r, cy-r, 2r, 2r)`.

## Connector detection

A "connector" is any of:
- `<line>` with `marker-end` or `marker-start`
- `<path>` with `marker-end` or `marker-start`
- `<polyline>` with `marker-end` or `marker-start`

For metric purposes a connector is reduced to a list of `(x,y)` waypoints:
- `<line>` → 2 waypoints (start, end).
- `<polyline points="...">` → split on whitespace/comma.
- `<path d="...">` → support only `M`, `L`, `H`, `V`, and `Z` (matches our orthogonal/curve rules; if `C`/`Q` cubic-Bezier needed, sample at 0.0/0.5/1.0). If unsupported command encountered, record diagnostic but don't hard-fail.

---

## Metrics

### 1. Edge crossings (soft)

For each pair of connectors, for each pair of segments (one from each), compute segment-segment intersection (excluding shared endpoints). Sum total crossings.

`max_possible = max(1, len(connectors) * (len(connectors) - 1) / 2)`
`score = max(0, 1 - crossings / max_possible)`

Threshold: ≥ 0.95.

### 2. Node-node occlusion (HARD-FAIL)

For each pair of node bboxes, test rectangle-rectangle overlap (with 0px tolerance — even 1px overlap is a fail).

If any pair overlaps → hard-fail `"node-occlusion: <id1> overlaps <id2>"`.

### 3. Edge-node occlusion / "tunnels" (HARD-FAIL)

For each connector, for each waypoint pair, test segment-rectangle intersection against every node bbox EXCEPT:
- The node containing the connector's start endpoint.
- The node containing the connector's end endpoint.

A node "contains" an endpoint if the endpoint is within `8px` of the node's bbox edge (snapping tolerance for connector-to-node attachment).

If any connector tunnels through a non-endpoint node → hard-fail `"edge-tunnel: connector ... passes through node ..."`.

### 4. Min font size (HARD-FAIL)

Resolve `font-size` for every `<text>` element (inline attr → class → inherited from `<g>` → default 16px). If any < 12 → hard-fail.

### 5. Palette adherence (HARD-FAIL)

Resolve `fill` and `stroke` for every visual element. Allowed values:
- `none`, `transparent`, `context-stroke`, `context-fill`, `currentColor`.
- Hex values declared in the **active theme's `palette` block** (loaded from `themes/<theme>/theme.yaml` and validated against `themes/_schema.json`). The set is the union of `ink`, `inkMuted`, `warn`, `surface`, `surfaceMuted`, every `accents[].hex`, and every `categoryChips[].hex` (case-insensitive comparison).

For the default `technical` theme this resolves to `#FFFFFF`, `#F6F5F3`, `#1C1917`, `#57534E`, `#C2410C`, `#B91C1C` (the W11 shared palette — see `themes/_shared-palette.yaml`). Other themes (e.g. `editorial`) bring their own token set; the contrast metric below uses the same theme-derived set as ground truth.

Any other color → hard-fail `"palette: <color> not in token set on <element>"`.

### 6. Contrast (HARD-FAIL)

For each `<text>` element, find the enclosing fill (the smallest containing `<rect>` whose `fill` is a token, OR the canvas background which defaults to `surface` `#FFFFFF`).

Compute WCAG relative luminance for both colors and the contrast ratio:

```
L = 0.2126*R + 0.7152*G + 0.0722*B
where each channel c is: c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)^2.4
ratio = (L_lighter + 0.05) / (L_darker + 0.05)
```

Threshold:
- Body (font-size 12 or 14): ratio ≥ 4.5:1.
- Large (font-size ≥ 16): ratio ≥ 3:1.

If any pairing falls below → hard-fail.

### 7. Grid snap (diagnostic only — not in `code_score`)

For every position-bearing attribute (`x`, `y`, `cx`, `cy`, `x1`, `y1`, `x2`, `y2`, polyline waypoints, `transform translate`, path `M/L/H/V` operands) on nodes, connectors, and `<text>` elements: post-transform coordinate must be an integer multiple of 4.

`diagnostics.grid_snap = (snapped / total)`, with offenders in `diagnostics.off_grid_coords`. Reported for the drafting agent's benefit, but excluded from the `code_score` mean (2026-06-10): a 2px offset is invisible taste and must not trigger refinement loops.

### 8. Node count (soft + HARD-FAIL at >30)

```
n = number of detected nodes (excluding legend, edge-label pills, defs)
if n <= 12: score = 1.0
elif n <= 20: score = 0.7   # diagnostic: "consider splitting"
elif n <= 30: score = 0.4   # diagnostic: "MUST propose split"
else: hard-fail "node-count: 31 nodes exceeds maximum 30"
```

### 9. Angular resolution (soft, conditional)

Compute only when at least one node has connector-degree ≥ 3.

For each such node, find the angles of all incident connectors (use the first segment direction from the endpoint). Compute pairwise angular gaps; take the minimum. Ideal = `360° / degree`.

`per_node_score = min_gap / ideal`
`score = mean(per_node_score)` across qualifying nodes.

If no node has degree ≥ 3, this metric is omitted from the soft-metric mean.

Threshold: ≥ 0.5.

### 10. Arrowhead mix (HARD-FAIL)

Moved from the vision rubric (2026-06-10) — deterministic from SVG source. Classify every non-`defs` `<line>`/`<path>`/`<polyline>` outside legend/chrome/rule classes (`legend`, `edge-label`, `bg`, `container`, `caption-rule`, `divider`, …) that has a stroke and no fill as connector-shaped. If some connector-shaped elements carry `marker-start`/`marker-end` and others don't → hard-fail `"arrowhead-mix: N stroked connector(s) lack arrowheads while M have them"`. A diagram with *no* markered connectors at all (undirected) does not trip this.

### 11. Legend presence (HARD-FAIL)

Legend *presence* moved from the vision rubric (2026-06-10); legend *meaning* remains the advisory `legend-coverage` vision item. Count distinct **categorical** colors — the active theme's `accents[].hex` ∪ `categoryChips[].hex`, minus any hex coinciding with a base token (ink/inkMuted/warn/surface/surfaceMuted) — used as fill or stroke on detected nodes. If ≥ 2 and no element carries a `legend` class or a `legend`-containing id → hard-fail `"legend-missing: …"`. Tuned to under-report: base-token category styling (e.g. inkMuted-vs-accent strokes) does not trigger it.

---

## Side-effect — node-count split prompt

When `13 ≤ n ≤ 20`: emit a diagnostic "advisory split" but do not change flow.

When `21 ≤ n ≤ 30`: SKILL.md MUST issue an `AskUserQuestion` proposing a split into two diagrams before proceeding to refinement loops. User can override with "proceed". The skill records the choice in the sidecar `evalSummary.userOverrides`.

When `n > 30`: hard-fail terminates this draft; refinement must reduce node count.

---

## Output schema (returned by `evaluate()`)

```python
{
    "code_score": float,            # mean of soft_metrics, in [0,1]
    "hard_fails": list[str],        # human-readable failure messages
    "soft_metrics": {
        "edge_crossings": float,
        "node_count": float,
        "angular_resolution": float | None,  # None if no degree>=3 nodes
    },
    "diagnostics": {
        "edge_crossings_count": int,
        "node_count": int,
        "grid_snap": float,            # diagnostic only — not in code_score
        "off_grid_coords": list[str],
        "min_font_size": int,
        "title": str | None,
        ...
    },
}
```

`hard_fails` is the source of truth for refinement targets. SKILL.md serializes this list into the Phase 6 findings flow (`_shared/findings-dispositions.md`).
