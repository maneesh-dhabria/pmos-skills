# List

## When to use
- Sequential items with **1–3 attributes** each
- Linear scanning expected (not comparison across columns)
- Mobile-first surfaces (lists translate well to cards)

## When NOT to use
- ≥ 4 attributes per item or comparison needed → [table.md](table.md)
- Visual browsing dominant → [card-grid.md](card-grid.md)
- Single item → [detail-view.md](detail-view.md)

## Anatomy
1. List container
2. List items, separated by dividers or spacing
3. Per item: leading icon/avatar (optional), primary label, secondary metadata, trailing affordance (chevron, action button)
4. Optional: section headers grouping items
5. Required: empty state

## Required states
- default
- empty
- loading (skeleton items)
- with-selected-item (in a list+detail layout)
- item-hovered / pressed
- swipe-actions revealed (mobile)

## Best practices
1. Consistent leading element across items (avatar OR icon, not mixed) (G2)
2. Two-line item: primary label bold, secondary metadata muted (G3)
3. Trailing chevron `›` indicates row is tappable into detail (N1)
4. Section headers for grouping; keep groups < 7 items each ideally (G1, F2)
5. Touch target ≥ 44×56 on mobile (whole row tappable, not just text) (F1)
6. Empty state offers a CTA (N9)
7. Use `<ul>` / `<li>` semantically
8. Action buttons inline with the row text are easy to mis-tap on mobile — prefer swipe or overflow menu (F1)

## Common mistakes
- Mixed leading elements (some rows with avatar, some with icon, some with nothing) → looks broken (G2)
- Centered text → unscannable; lists scan left-edge (G3)
- Tiny tap targets on mobile → frustrating (F1)
- No empty state → blank list looks like a bug (N1, N9)
- Action buttons inline with text → mis-taps (F1)

## Device variants
- **mobile-web/native**: full-row tap target, swipe-to-reveal actions, pull-to-refresh
- **desktop**: hover reveals row actions on right; click row for detail

## Skeleton

Composed on the **desktop 1280×800** canvas from the List-row primitive (#13) — avatar, two-line label,
trailing chevron, divider.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="1280" height="800" fill="#fff"/>

  <g data-region="section-header">
    <title>Section header</title>
    <desc>A group label above the list rows.</desc>
    <text x="24" y="56" font-size="12" fill="#666" stroke="none">TEAM</text>
  </g>

  <g data-region="list">
    <title>Member list</title>
    <desc>Sequential rows, each with a leading avatar, a primary name, muted secondary metadata, and a trailing chevron marking the row as tappable into a detail view.</desc>

    <circle cx="56" cy="124" r="24" fill="#e6e6e6"/>
    <text x="104" y="120" font-size="14" fill="#000" stroke="none">Sarah Kim</text>
    <text x="104" y="144" font-size="12" fill="#666" stroke="none">Engineering · Last active 2h ago</text>
    <text x="632" y="128" font-size="14" fill="#666" stroke="none">›</text>
    <line x1="24" y1="160" x2="640" y2="160" stroke="#e6e6e6" stroke-width="1"/>

    <circle cx="56" cy="196" r="24" fill="#e6e6e6"/>
    <text x="104" y="192" font-size="14" fill="#000" stroke="none">Maneesh Dhabria</text>
    <text x="104" y="216" font-size="12" fill="#666" stroke="none">Product · Last active 1d ago</text>
    <text x="632" y="200" font-size="14" fill="#666" stroke="none">›</text>
    <line x1="24" y1="232" x2="640" y2="232" stroke="#e6e6e6" stroke-width="1"/>

    <circle cx="56" cy="268" r="24" fill="#e6e6e6"/>
    <text x="104" y="264" font-size="14" fill="#000" stroke="none">Amir Shah</text>
    <text x="104" y="288" font-size="12" fill="#666" stroke="none">Design · Last active 3d ago</text>
    <text x="632" y="272" font-size="14" fill="#666" stroke="none">›</text>
    <line x1="24" y1="304" x2="640" y2="304" stroke="#e6e6e6" stroke-width="1"/>
  </g>

  <g data-region="annotations">
    <title>Design notes</title>
    <desc>1 — the whole row is the tap target, not just the name. Loading swaps skeleton rows; the empty state offers a CTA instead of a blank list.</desc>
    <circle cx="360" cy="120" r="8" fill="#d33"/>
    <text x="360" y="128" font-size="10" fill="#fff" stroke="none" text-anchor="middle">1</text>
  </g>
</svg>
```
