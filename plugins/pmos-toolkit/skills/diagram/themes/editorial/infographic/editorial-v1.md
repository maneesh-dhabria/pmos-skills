# Editorial-v1 Infographic Layout

This file defines the layout zones, caption auto-fit grid, and slim wrapper rubric used by `/diagram --theme editorial --mode infographic`. The wrapper composition implementation lives in `wrapper/compose.py`; this doc is the spec.

> **When this layout runs:** after Phase 6 produces a clean diagram, when `theme.infographic.supported: true` AND `theme.infographic.layout == "editorial-v1"`. Both conditions hold for the editorial theme.

---

## 1. Canvas

- **Width:** 1280 (matches every diagram canvas — height is computed to fit content).
- **Height:** sum of zone heights (typically 1600–2000).
- **Margins:** 64 left / 64 right / 56 top / 48 bottom.
- **Surface:** cream (`#F4EFE6` per `theme.surface.background`).
- **Outer chrome:** none additional — the diagram interior already supplies the dashed-container chrome inside `zone-diagram`. The wrapper does NOT redraw it.

## 2. Zones (top → bottom)

| Zone ID | Height | Content | Typography |
|---|---|---|---|
| `zone-eyebrow`   | 24px | Mono uppercase eyebrow (e.g. `HARNESS ENGINEERING · SYSTEMS VIEW`) | mono 12, ink-muted, letter-spacing 0.08em |
| `zone-headline`  | auto (max 2 lines) | The H1 — the "what is this about" line | display 36–44, weight 700, ink |
| `zone-lede`      | auto (max 5 lines) | The setup paragraph; permits inline `**bold**` runs | body 16, weight 400, ink |
| `zone-fig-label` | 16px | `FIG. 1 — <CAPTION>` | mono 12, ink-muted, uppercase |
| `zone-diagram`   | auto (preserves source aspect, scales to fit width with 16px container inset) | The Phase 6 diagram embedded as `<g>` at native coords with a translate+scale | inherits diagram styles |
| `zone-legend`    | 32px | Horizontal swatch row drawn from theme palette + actual colors used | swatch 16×16 + label body 12 |
| `zone-captions`  | auto (cols × row-height) | 3–5 caption columns; see grid below | title body 14/600, body 13/400 |
| `zone-footer`    | 16px | Mono uppercase footer kicker | mono 12, ink-muted, uppercase |

Zones are laid out vertically. Each zone is a `<g id="zone-X" transform="translate(0, Y_OFFSET)">`. Zone Y_OFFSETs are computed in order; the wrapper reserves the actual measured / heuristic height of `zone-headline` and `zone-lede` (they are the only auto-sized zones besides the diagram).

Vertical rhythm uses an 8-px sub-grid (every Y_OFFSET is a multiple of 8). Horizontal uses the 12-column grid below for captions only.

## 3. Caption auto-fit grid

The model picks caption count based on actual semantic clusters in the diagram (no filler captions). The 12-column grid maps caption count to columns:

| Caption count | Cols per caption | Inter-caption gutter |
|---|---|---|
| 3 | 4 | 24px |
| 4 | 3 | 24px |
| 5 | 2 (with one spanning 4) | 16px |

**Clamp policy** (per spec D8):
- Model returns < 3 captions: re-prompt once asking for 3+. If still < 3: drop the caption block entirely. Sidecar logs `captionCountClamp.to: 0`.
- Model returns > 5 captions: drop weakest by body-length until 5 remain. Sidecar logs `captionCountClamp.from / .to`.

## 4. Caption anchor mode

Each caption visually pairs to a part of the diagram via its **anchor**:

- **Color mode** (default when the diagram uses ≥ 3 distinct token accent colors, excluding ink-muted and surface tokens): each caption has an `anchorColor` (theme token name or hex). The wrapper draws the caption's left rule in that color. The caption-to-diagram color rule (spec §7) requires every `anchorColor` to actually appear inside the diagram — `caption-color-not-in-diagram` enforces this.
- **Ordinal mode** (fallback when fewer than 3 distinct accents): each caption gets a geometric marker (`●`, `▲`, `■`, `◆`, `★` for 1–5) prefixed at display weight, ink, 12px. The same marker is drawn next to the corresponding element inside the diagram (small, ink, 12px). The 2px ink-muted left rule remains for visual consistency.

Decision is mechanical: count distinct accent hex values (from theme palette `accents[].hex` and `categoryChips[].hex`) actually rendered in the diagram, after removing `ink-muted` and surface tokens. ≥ 3 → color, else ordinal.

## 5. Lede inline-bold phrases

The model returns markdown-bold (`**…**`) inline. The renderer parses runs into `(text, bold)` pairs and emits bold-weight `<tspan>`s within the lede `<text>` element. **No other markdown features are supported in v1** — no italic, no links, no code spans.

## 6. Text wrapping

Goal: every line of headline / lede / caption-body fits within its zone width without overflow.

The wrapper has three wrap modes, picked at runtime by renderer + capability:

| Renderer | Font metrics available | Mode | Behavior |
|---|---|---|---|
| Playwright MCP | yes | `metrics` | Use a per-char width table (e.g. precomputed Inter metrics) for accurate wrap |
| Playwright MCP | no  | `foreignobject` | Wrap inside a `<foreignObject>` HTML `<p>` — Playwright renders this faithfully |
| `rsvg-convert` or `cairosvg` | (n/a) | `heuristic` | Greedy fill with `font_size_px × 0.55` per character + ~5% slack |

**Renderer policy** (D10): if the wrapper would use `foreignObject` AND the active renderer is rsvg/cairosvg, the wrapper **skips foreignObject and falls back to the heuristic**, emitting a console warning. Output ships either way. The wrapper rubric's `wrapper-text-fit` is the second line of defense.

**`<foreignObject>` is permitted only inside Phase 8 wrapper text zones, never in the diagram interior.**

## 7. Slim wrapper rubric (single pass, no refinement loop)

After composition, the wrapper renders the composite to PNG and runs a **4-item rubric** inline (no subagent dispatch, regardless of `--rigor` tier):

| Stable ID | Item |
|---|---|
| `wrapper-typography-hierarchy` | Eyebrow / H1 / lede / captions read in clear visual hierarchy |
| `wrapper-text-fit` | No lede or caption overflow; line breaks fall on word boundaries |
| `wrapper-figure-proportion` | Diagram fills its zone without dominating or feeling lost |
| `wrapper-edge-padding` | No element kisses the canvas edge or a zone boundary |

**Pass condition:** all 4 items pass.

**Failure handling:** ship-with-warning. Prepend an XML comment to the SVG immediately after `<?xml`:
```xml
<!-- WRAPPER QUALITY WARNING: <comma-separated failing item ids> -->
```
**No second draw, no re-prompt.** The Phase 4 code metrics and Phase 5 vision gate have already gated the diagram; the wrapper rubric is supplementary insurance, not a second hard gate.

## 8. Sidecar additions for infographic mode

```json
{
  "mode": "infographic",
  "wrapperLayout": "editorial-v1",
  "wrappedText": {
    "eyebrow": "HARNESS ENGINEERING · SYSTEMS VIEW",
    "headline": "...",
    "lede": "...",
    "figLabel": "FIG. 1 — ...",
    "captions": [{"title": "...", "body": "...", "anchorColor": "...", "anchorElementId": "..."}],
    "footer": "..."
  },
  "captionAnchorMode": "color",
  "captionAnchorRemaps": [{"from": "#FF00FF", "to": "ink", "reason": "color absent from diagram"}],
  "captionCountClamp": {"from": 7, "to": 5, "reason": "drop-weakest"},
  "wrapperRubricResults": {
    "wrapper-typography-hierarchy": "pass",
    "wrapper-text-fit": "pass",
    "wrapper-figure-proportion": "pass",
    "wrapper-edge-padding": "pass"
  }
}
```

## 9. Extend-flow

When the user picks **Extend** in Phase 1 against an existing infographic, the wrapper treats `wrappedText` as **fixed** (alongside `positions` and `colorAssignments`). Phase 8 step 1 (copy generation) and step 2 (user-review checkpoint) are skipped; composition + rubric run normally on the patched diagram. A future `--regenerate-copy` flag will let users opt back into copy refresh on Extend.
