# Loading Skeleton

## When to use
- Content loading > 300 ms
- Page-level OR component-level loading
- Where layout is predictable enough to mirror in skeleton form

## When NOT to use
- Loads < 300 ms → no indicator needed (flash worsens UX)
- Indeterminate loads where layout is unknown → spinner with context
- Action-triggered loads (button click) → button-internal spinner

## Anatomy
1. Skeleton blocks matching the shape of the real content
2. Optional: shimmer/pulse animation
3. Same dimensions as loaded content (prevents layout shift)
4. ARIA: `aria-busy="true"` on the parent; `aria-live` for screen readers

## Required states
- loading (skeleton visible)
- loaded (skeleton replaced by real content)
- error (replaced by error state)
- initial-load vs reload

## Best practices
1. Match the SHAPE of the content (N4) — table rows in a table, cards in a grid, lines in a list
2. Same dimensions as loaded content prevents layout shift (N4) — biggest UX win
3. Subtle pulse animation, 1.4s ease-in-out — not jarring (N8)
4. Show within 100 ms of load start; hide as soon as content arrives (N1)
5. For < 300 ms loads, skip skeletons entirely (N1)
6. `aria-busy="true"` on container while loading; remove when loaded
7. Don't show full-page spinner over a half-loaded page — use skeletons in place (N1)
8. For very long loads (> 5s), supplement with a contextual message ("Crunching the numbers…") (N1)

## Common mistakes
- Generic spinner where skeleton would work better → no preview of layout (N1)
- Skeleton dimensions mismatch real content → layout shift on load (N4)
- Skeleton on every reload, even cached views → flicker (N1)
- Skeleton shapes that look like real content → users try to interact (N2)
- No accessibility — screen readers announce nothing

## Device variants
- **desktop / mobile**: same approach; ensure skeleton matches each viewport's actual layout

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="1280" height="800" fill="#fff"/>
  <g data-region="app-bar">
    <title>App bar (loading)</title><desc>Chrome bar with a placeholder block where the loaded title will appear.</desc>
    <rect x="0" y="0" width="1280" height="56" fill="#fff" stroke="#e6e6e6"/>
    <rect x="24" y="16" width="160" height="24" fill="#e6e6e6"/>
  </g>
  <g data-region="list-skeleton">
    <title>List skeleton</title><desc>Four placeholder list rows — avatar plus two text bars — mirroring the loaded list's shape and size.</desc>
    <circle cx="48" cy="120" r="16" fill="#e6e6e6"/>
    <rect x="88" y="104" width="240" height="16" fill="#e6e6e6"/>
    <rect x="88" y="128" width="400" height="16" fill="#f4f4f4"/>
    <line x1="24" y1="152" x2="632" y2="152" stroke="#e6e6e6" stroke-width="1"/>
    <circle cx="48" cy="184" r="16" fill="#e6e6e6"/>
    <rect x="88" y="168" width="240" height="16" fill="#e6e6e6"/>
    <rect x="88" y="192" width="400" height="16" fill="#f4f4f4"/>
    <line x1="24" y1="216" x2="632" y2="216" stroke="#e6e6e6" stroke-width="1"/>
    <circle cx="48" cy="248" r="16" fill="#e6e6e6"/>
    <rect x="88" y="232" width="240" height="16" fill="#e6e6e6"/>
    <rect x="88" y="256" width="400" height="16" fill="#f4f4f4"/>
    <line x1="24" y1="280" x2="632" y2="280" stroke="#e6e6e6" stroke-width="1"/>
    <circle cx="48" cy="312" r="16" fill="#e6e6e6"/>
    <rect x="88" y="296" width="240" height="16" fill="#e6e6e6"/>
    <rect x="88" y="320" width="400" height="16" fill="#f4f4f4"/>
  </g>
  <g data-region="card-skeleton">
    <title>Card skeleton</title><desc>Placeholder card — media block, title bar, and one body line — matching the loaded card footprint.</desc>
    <rect x="680" y="96" width="560" height="240" fill="#e6e6e6"/>
    <rect x="680" y="352" width="360" height="24" fill="#e6e6e6"/>
    <rect x="680" y="392" width="480" height="16" fill="#f4f4f4"/>
  </g>
  <g data-region="annotations">
    <title>Annotations</title><desc>Design notes on the loading affordance.</desc>
    <rect x="16" y="88" width="624" height="272" fill="none" stroke="#d33" stroke-dasharray="4 4"/>
    <text x="16" y="72" font-size="12" fill="#d33" stroke="none">Skeleton mirrors the loaded layout's shape and size — replaced in place, no bare spinner (S4).</text>
  </g>
</svg>
```
