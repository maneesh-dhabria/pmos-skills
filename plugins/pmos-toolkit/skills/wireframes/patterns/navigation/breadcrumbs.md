# Breadcrumbs

## When to use
- Hierarchical IA, **3+ levels deep**
- Users land on deep pages from search/links and need orientation
- Showing parent context aids the task

## When NOT to use
- Flat IA (1–2 levels) → no value, just clutter
- The page has its own clear "Back to X" affordance
- Single-step flows where there's nothing meaningful above

## Anatomy
1. Sequence of parent-page links from root → current
2. Separator between items (chevron `›` or `/`)
3. Current page as plain text (NOT a link to itself)
4. Optional: truncation for very deep paths (`Home › ... › Project › Settings`)

## Required states
- default
- truncated (long path with ellipsis)
- mobile-collapsed (only "‹ Parent" shown)

## Best practices
1. Render at the top of the content area, BELOW the primary nav (N4)
2. Current page is plain text, not a link (N3) — users shouldn't click their current location
3. Use real page titles, not section IDs (N2)
4. Separator `›` or `/`, never `>` (typography matters; G3)
5. Mark up with `<nav aria-label="Breadcrumb">` and `<ol>` for screen readers
6. Use `aria-current="page"` on the last item
7. On mobile, collapse to single back-link "‹ Parent" — full trail is unreadable (F1)

## Common mistakes
- Breadcrumbs on a flat 2-level site → adds chrome with no value (N8)
- Last item is a link to itself → confusing (N3)
- Showing only 2 levels when path is 5 deep → fails the orientation purpose
- Replaces back button → breadcrumbs are NOT history; they're location
- Truncates the current page name → users lose the "you are here" anchor

## Device variants
- **desktop-web/-app**: full path
- **mobile-web**: single back-link "‹ {Parent}"
- **native**: typically not used; native back gesture handles it

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <g data-region="breadcrumb">
    <title>Breadcrumb trail</title>
    <desc>Parent-page links from the root to the current page; the current page is plain text, not a link.</desc>
    <text x="24" y="40" font-size="12" fill="#666" stroke="none">Workspaces</text>
    <text x="144" y="40" font-size="12" fill="#666" stroke="none">›</text>
    <text x="168" y="40" font-size="12" fill="#666" stroke="none">Acme</text>
    <text x="232" y="40" font-size="12" fill="#666" stroke="none">›</text>
    <text x="256" y="40" font-size="12" fill="#666" stroke="none">Projects</text>
    <text x="360" y="40" font-size="12" fill="#666" stroke="none">›</text>
    <text x="384" y="40" font-size="12" fill="#000" stroke="none">Q3 Planning</text>
  </g>
  <g data-region="annotations" transform="translate(24,80)">
    <title>Annotations</title>
    <desc>Design notes for the breadcrumb.</desc>
    <circle cx="16" cy="16" r="16" fill="#d33"/>
    <text x="16" y="24" font-size="14" fill="#fff" stroke="none" text-anchor="middle">1</text>
    <text x="48" y="24" font-size="12" fill="#d33" stroke="none">Current page is plain ink text, never a link to itself.</text>
  </g>
</svg>
```
