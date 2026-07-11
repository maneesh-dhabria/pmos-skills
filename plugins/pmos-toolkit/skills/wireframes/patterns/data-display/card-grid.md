# Card Grid

## When to use
- Visual browsing of peer items (products, projects, templates, articles)
- Visual content matters (thumbnail, image, preview)
- 2-D scanning expected (rows AND columns)

## When NOT to use
- Pure text data → [table.md](table.md) or [list.md](list.md)
- Sequential content → list
- Sparse content (< 6 items) → list or sentences

## Anatomy
1. Grid container (responsive columns)
2. Cards: thumbnail/preview + title + 1–2 metadata lines + optional action
3. Optional: filter/sort bar above
4. Optional: pagination or "Load more" below
5. Required: empty state

## Required states
- default
- with-filter-applied
- empty
- loading (skeleton cards)
- error
- card-hovered (lift + shadow)
- card-selected (in a picker context)

## Best practices
1. Equal-height cards within a row (G2) — uneven heights look broken
2. Image/thumbnail at the top, fixed aspect ratio (G2)
3. 3–4 columns desktop, 2 mobile, 1 narrow mobile (G4)
4. Hover state: shadow lift + cursor change → signals interactive (N1)
5. Whole card is the tap target, not just the title (F1)
6. Title truncates with ellipsis at 2 lines max (G3)
7. Loading: skeleton cards in the same shape as real ones (N1)
8. Empty state offers a CTA to add the first item (N9)
9. Cards have visible boundary OR clear spacing — never both heavy borders AND shadows (N8)

## Common mistakes
- Variable card heights → ragged grid looks broken (G2)
- Image-less cards in a card grid → use a list instead (G2)
- Tiny click targets (just the title) → fails Fitts (F1)
- 6+ columns desktop → cards too small, content cramped (G4)
- Skeleton state in a totally different shape than real cards → jarring transition (N4)

## Device variants
- **desktop-web/-app**: 3–4 columns
- **mobile-web**: 2 columns; 1 column for content-heavy cards
- **native**: similar to mobile-web; respect safe-area insets

## Skeleton

Composed on the **desktop 1280×800** canvas from the Card (#5) and Image-placeholder (#16) primitives —
equal-height cards, four across, with one skeleton card for the loading state.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="1280" height="800" fill="#fff"/>

  <g data-region="toolbar">
    <title>Filter toolbar</title>
    <desc>Section title on the left; a filter input on the right.</desc>
    <text x="24" y="48" font-size="20" fill="#000" stroke="none">Templates</text>
    <rect x="1016" y="24" width="240" height="40" fill="#fff" stroke="#000"/>
    <text x="1032" y="48" font-size="14" fill="#666" stroke="none">Filter templates…</text>
  </g>

  <g data-region="card-grid">
    <title>Template card grid</title>
    <desc>Peer items for visual browsing: each card is a thumbnail over a title and one metadata line; the whole card is the tap target.</desc>

    <rect x="24" y="88" width="296" height="240" fill="#fff" stroke="#e6e6e6"/>
    <rect x="40" y="104" width="264" height="128" fill="#e6e6e6"/>
    <line x1="40" y1="104" x2="304" y2="232" stroke="#666" stroke-width="1"/>
    <line x1="304" y1="104" x2="40" y2="232" stroke="#666" stroke-width="1"/>
    <text x="40" y="264" font-size="14" fill="#000" stroke="none">Sales pipeline</text>
    <text x="40" y="296" font-size="12" fill="#666" stroke="none">5 stages · 12 fields</text>

    <rect x="336" y="88" width="296" height="240" fill="#fff" stroke="#e6e6e6"/>
    <rect x="352" y="104" width="264" height="128" fill="#e6e6e6"/>
    <line x1="352" y1="104" x2="616" y2="232" stroke="#666" stroke-width="1"/>
    <line x1="616" y1="104" x2="352" y2="232" stroke="#666" stroke-width="1"/>
    <text x="352" y="264" font-size="14" fill="#000" stroke="none">Customer onboarding</text>
    <text x="352" y="296" font-size="12" fill="#666" stroke="none">4 stages · 8 fields</text>

    <rect x="648" y="88" width="296" height="240" fill="#fff" stroke="#e6e6e6"/>
    <rect x="664" y="104" width="264" height="128" fill="#e6e6e6"/>
    <line x1="664" y1="104" x2="928" y2="232" stroke="#666" stroke-width="1"/>
    <line x1="928" y1="104" x2="664" y2="232" stroke="#666" stroke-width="1"/>
    <text x="664" y="264" font-size="14" fill="#000" stroke="none">Support triage</text>
    <text x="664" y="296" font-size="12" fill="#666" stroke="none">3 stages · 6 fields</text>

    <rect x="960" y="88" width="296" height="240" fill="#fff" stroke="#e6e6e6"/>
    <rect x="976" y="104" width="264" height="128" fill="#e6e6e6"/>
    <rect x="976" y="256" width="184" height="16" fill="#e6e6e6"/>
    <rect x="976" y="288" width="128" height="16" fill="#e6e6e6"/>
  </g>

  <g data-region="annotations">
    <title>Design notes</title>
    <desc>1 — the fourth card is the loading skeleton: same shape as a real card, grey bars for title and metadata. Cards keep equal height; the empty state offers a CTA to add the first item.</desc>
    <circle cx="1112" cy="120" r="8" fill="#d33"/>
    <text x="1112" y="128" font-size="10" fill="#fff" stroke="none" text-anchor="middle">1</text>
  </g>
</svg>
```
