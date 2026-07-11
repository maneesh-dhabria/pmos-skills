# Pagination

## When to use
- Bounded result sets (you know the total count)
- Users may want to jump to specific pages
- Tables, search results, archives

## When NOT to use
- Continuous feeds (social, news) → infinite scroll or "Load more" button
- Sets ≤ 20 items → show all, no pagination needed
- Real-time data that changes between page loads

## Anatomy
1. Previous / Next buttons
2. Page numbers (with current highlighted)
3. First / Last shortcuts (for sets > 10 pages)
4. Total count or page-X-of-Y indicator
5. Optional: page-size selector ("Rows per page: 25")

## Required states
- default (mid-set)
- first-page (Prev disabled)
- last-page (Next disabled)
- single-page (controls hidden or disabled)
- with-jump (input field for go-to-page on huge sets)

## Best practices
1. Always show "X of Y" or total count (N1) — users orient by knowing the size
2. Disabled buttons stay visible but with reduced emphasis — don't hide
3. Show 5–7 page-number buttons + ellipsis: `1 … 4 5 [6] 7 8 … 42` (F2)
4. Make Prev/Next labels explicit ("Previous", "Next") not just arrows (N6)
5. Page-size selector defaults to 25 or 50 — most users never change it (N7)
6. Persist page-size choice across sessions (N7)
7. Use real `<a>` with URL params, not just JS — supports bookmarking and back button (N3)
8. Touch targets stay large and easy to hit on mobile (F1)

## Common mistakes
- Only Prev/Next with no page count → users can't gauge progress through results (N1)
- "Load more" button on a paginated set → mixes patterns; pick one
- Hidden disabled state (button vanishes) → layout shifts, confusing (N4)
- Page numbers that don't update the URL → no bookmarking, broken back button
- Tiny arrow targets on mobile → fails Fitts (F1)

## Device variants
- **desktop-web/-app**: full numbered pagination
- **mobile-web**: simplified to Prev / Page X of Y / Next
- **native**: prefer pull-to-refresh + infinite scroll for feeds; pagination unusual

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <g data-region="pagination">
    <title>Pagination</title>
    <desc>Result-count label, previous/next controls, numbered pages with the current page filled, and a rows-per-page selector.</desc>
    <text x="24" y="400" font-size="14" fill="#666" stroke="none">Showing 51–75 of 247</text>
    <rect x="24" y="432" width="120" height="40" fill="#fff" stroke="#e6e6e6"/>
    <text x="40" y="456" font-size="14" fill="#000" stroke="none">‹ Previous</text>
    <rect x="160" y="432" width="40" height="40" fill="#fff" stroke="#e6e6e6"/>
    <text x="176" y="456" font-size="14" fill="#000" stroke="none">1</text>
    <text x="216" y="456" font-size="14" fill="#666" stroke="none">…</text>
    <rect x="240" y="432" width="40" height="40" fill="#fff" stroke="#e6e6e6"/>
    <text x="256" y="456" font-size="14" fill="#000" stroke="none">2</text>
    <rect x="288" y="432" width="40" height="40" fill="#000"/>
    <text x="304" y="456" font-size="14" fill="#fff" stroke="none">3</text>
    <rect x="336" y="432" width="40" height="40" fill="#fff" stroke="#e6e6e6"/>
    <text x="352" y="456" font-size="14" fill="#000" stroke="none">4</text>
    <text x="384" y="456" font-size="14" fill="#666" stroke="none">…</text>
    <rect x="408" y="432" width="40" height="40" fill="#fff" stroke="#e6e6e6"/>
    <text x="416" y="456" font-size="14" fill="#000" stroke="none">10</text>
    <rect x="480" y="432" width="120" height="40" fill="#fff" stroke="#e6e6e6"/>
    <text x="496" y="456" font-size="14" fill="#000" stroke="none">Next ›</text>
  </g>
  <g data-region="page-size">
    <title>Rows per page</title>
    <desc>Selector controlling how many rows appear per page.</desc>
    <text x="640" y="456" font-size="14" fill="#666" stroke="none">Rows per page</text>
    <rect x="776" y="432" width="80" height="40" fill="#fff" stroke="#000"/>
    <text x="792" y="456" font-size="14" fill="#000" stroke="none">25 ▾</text>
  </g>
  <g data-region="annotations" transform="translate(24,320)">
    <title>Annotations</title>
    <desc>Design notes for pagination.</desc>
    <circle cx="16" cy="16" r="16" fill="#d33"/>
    <text x="16" y="24" font-size="14" fill="#fff" stroke="none" text-anchor="middle">1</text>
    <text x="48" y="24" font-size="12" fill="#d33" stroke="none">Current page is filled, not colour-only; the total count orients the user.</text>
  </g>
</svg>
```
