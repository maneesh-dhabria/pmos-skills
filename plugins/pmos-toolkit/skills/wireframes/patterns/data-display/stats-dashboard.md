# Stats Dashboard

## When to use
- Top-line metrics for at-a-glance scanning
- Home / overview pages
- Reporting summaries

## When NOT to use
- Single metric → just inline display
- Detailed analytics with drill-down → use a charts/analytics pattern (out of scope; show as `<div class="placeholder">Chart: …</div>`)
- Editable settings → key-value or settings-page

## Anatomy
1. Stat cards arranged in a grid (3–6 cards typical)
2. Per card: label, large value, optional trend (▲/▼ + delta), optional sparkline
3. Optional: time-range filter ("Last 7 days") above
4. Optional: "View report" link per card

## Required states
- default (with values)
- loading (skeleton numbers)
- empty / not-yet-tracked
- error
- with-trend-up / -down / -flat
- with-time-range-changed

## Best practices
1. Big number is the primary visual (G3) — that's why users came
2. Label small and muted ABOVE the number — Refactoring UI rule (G3)
3. Trend uses both color (green/red) AND arrow icon (▲/▼)
4. 3–6 cards max; more dilutes attention (F2)
5. Equal-width cards in a row (G2)
6. Loading: skeleton in the SAME shape as the loaded number (N1, N4)
7. Empty value: "—" or "Not enough data yet", never `0` if 0 is real but ambiguous (N1)
8. Tap/click for drill-down where it makes sense (N7)
9. Time-range filter at the top affects all cards consistently (N4)

## Common mistakes
- Tiny numbers, big labels → backwards (G3)
- Trend shown in color only → fails colorblind
- 10+ stat cards → user has no idea what to look at (F2)
- Different card sizes / heights in one row → ragged (G2)
- Showing "0" without context when the metric is just new → looks like a problem (N1)
- Loading shows generic spinner instead of skeleton numbers → layout shift on load

## Device variants
- **desktop-web/-app**: 3–4 cards per row
- **mobile-web**: 1–2 cards per row, cards stack
- **native**: same as mobile-web

## Skeleton

Composed on the **desktop 1280×800** canvas from the Card (#5) and Key-value-stat (#15) primitives —
a time-range toolbar over four equal-width stat cards, the last one a loading skeleton.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="1280" height="800" fill="#fff"/>

  <g data-region="toolbar">
    <title>Range toolbar</title>
    <desc>Dashboard title on the left; a time-range selector on the right that governs every card at once.</desc>
    <text x="24" y="48" font-size="20" fill="#000" stroke="none">Pipeline overview</text>
    <rect x="1096" y="24" width="160" height="40" fill="#fff" stroke="#000"/>
    <text x="1112" y="48" font-size="14" fill="#000" stroke="none">Last 7 days ▾</text>
  </g>

  <g data-region="stat-cards">
    <title>Stat cards</title>
    <desc>Three top-line metrics — each a muted label over a large ink number over a trend line — plus a loading skeleton card in the same shape.</desc>

    <rect x="24" y="88" width="296" height="160" fill="#fff" stroke="#e6e6e6"/>
    <text x="40" y="128" font-size="12" fill="#666" stroke="none">OPEN DEALS</text>
    <text x="40" y="176" font-size="28" fill="#000" stroke="none">47</text>
    <text x="40" y="208" font-size="12" fill="#000" stroke="none">▲ 12% vs last week</text>

    <rect x="336" y="88" width="296" height="160" fill="#fff" stroke="#e6e6e6"/>
    <text x="352" y="128" font-size="12" fill="#666" stroke="none">PIPELINE VALUE</text>
    <text x="352" y="176" font-size="28" fill="#000" stroke="none">$1.2M</text>
    <text x="352" y="208" font-size="12" fill="#000" stroke="none">▼ 4% vs last week</text>

    <rect x="648" y="88" width="296" height="160" fill="#fff" stroke="#e6e6e6"/>
    <text x="664" y="128" font-size="12" fill="#666" stroke="none">WIN RATE</text>
    <text x="664" y="176" font-size="28" fill="#000" stroke="none">28%</text>
    <text x="664" y="208" font-size="12" fill="#666" stroke="none">— No change</text>

    <rect x="960" y="88" width="296" height="160" fill="#fff" stroke="#e6e6e6"/>
    <text x="976" y="128" font-size="12" fill="#666" stroke="none">AVG DEAL SIZE</text>
    <rect x="976" y="152" width="112" height="24" fill="#e6e6e6"/>
    <rect x="976" y="192" width="184" height="16" fill="#e6e6e6"/>
  </g>

  <g data-region="annotations">
    <title>Design notes</title>
    <desc>1 — trend is carried by an arrow and delta, not colour alone, so it survives the monochrome wireframe and a colourblind reader. The fourth card is the loading skeleton in the same shape as a loaded card; a not-yet-tracked metric reads "—", never a bare 0.</desc>
    <circle cx="40" cy="200" r="8" fill="#d33"/>
    <text x="40" y="208" font-size="10" fill="#fff" stroke="none" text-anchor="middle">1</text>
  </g>
</svg>
```
