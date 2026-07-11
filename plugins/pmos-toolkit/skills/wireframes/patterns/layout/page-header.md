# Page Header

## When to use
- Top of every content page
- Provides title, context, and page-level actions

## When NOT to use
- Inside modals → modal has its own header
- Auth screens (login, signup) — typically have a centered focal layout, no traditional header
- Embedded views (iframes, widgets)

## Anatomy
1. Optional: [breadcrumbs.md](../navigation/breadcrumbs.md) above title
2. Title (H1)
3. Optional: description / subtitle
4. Optional: status / metadata strip
5. Page-level actions on the right ([primary-cta.md](../actions/primary-cta.md) + secondary)
6. Optional: tabs below the header ([tabs.md](../navigation/tabs.md))

## Required states
- default
- with-breadcrumbs
- with-tabs-below
- with-loading-title (during fetch)
- with-status-pill
- mobile-collapsed (actions in overflow menu)

## Best practices
1. Title is the most prominent text on the page (G3) — big, bold
2. Page-level actions right-aligned (N4)
3. ≤ 1 primary + ≤ 2 secondary actions visible; rest in overflow (F2)
4. Status pill next to title for stateful entities (N1)
5. Breadcrumbs above title for hierarchical IA (N6)
6. Sticky on scroll only for long pages where actions need to be reachable (N7)
7. Mobile: collapse actions into overflow `⋯`; primary becomes a sticky bottom button in reach of the thumb if critical (F1)
8. Title is the H1 — the single dominant element in the header, above section headings (G3)

## Common mistakes
- Multiple competing titles of equal weight → confuses the scan hierarchy (G3)
- 5+ buttons in the header → overflow noise (F2)
- Title same size as section headings → no scan hierarchy (G3)
- Breadcrumbs that duplicate the title (last crumb = page title is fine; whole header redundant isn't) (N8)
- Mobile keeps all desktop actions inline → overflow / wrap

## Device variants
- **desktop**: full layout with all actions visible
- **mobile**: actions in overflow; primary may stick to bottom

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="1280" height="800" fill="#fff"/>

  <g data-region="app-bar" transform="translate(0,0)">
    <title>App bar</title>
    <desc>Product-level top bar above the page header.</desc>
    <rect x="0" y="0" width="1280" height="56" fill="#fff" stroke="#e6e6e6"/>
    <text x="24" y="32" font-size="20" fill="#000" stroke="none">Product</text>
    <rect x="1216" y="8" width="40" height="40" fill="#e6e6e6"/>
  </g>

  <g data-region="breadcrumb" transform="translate(24,88)">
    <title>Breadcrumb</title>
    <desc>Hierarchical trail above the page title.</desc>
    <text x="0" y="16" font-size="12" fill="#666" stroke="none">Workspaces / Acme / Deals</text>
  </g>

  <g data-region="page-header" transform="translate(24,128)">
    <title>Page header</title>
    <desc>Title, status pill, description, and right-aligned page actions.</desc>
    <text x="0" y="24" font-size="28" fill="#000" stroke="none">Deals</text>
    <rect x="104" y="8" width="88" height="24" fill="#f4f4f4" stroke="#e6e6e6"/>
    <text x="112" y="24" font-size="12" fill="#666" stroke="none">47 open</text>
    <text x="0" y="64" font-size="14" fill="#666" stroke="none">Track and update opportunities across the pipeline.</text>
    <rect x="920" y="0" width="96" height="40" fill="#fff" stroke="#000"/>
    <text x="936" y="24" font-size="14" fill="#000" stroke="none">Import</text>
    <rect x="1024" y="0" width="96" height="40" fill="#fff" stroke="#000"/>
    <text x="1040" y="24" font-size="14" fill="#000" stroke="none">Export</text>
    <rect x="1128" y="0" width="104" height="40" fill="#000"/>
    <text x="1144" y="24" font-size="14" fill="#fff" stroke="none">+ New deal</text>
  </g>

  <g data-region="tabs" transform="translate(24,248)">
    <title>Tabs</title>
    <desc>Section tabs below the header with an active underline.</desc>
    <text x="0" y="16" font-size="14" fill="#000" stroke="none">Overview</text>
    <text x="96" y="16" font-size="14" fill="#666" stroke="none">Activity</text>
    <text x="192" y="16" font-size="14" fill="#666" stroke="none">Settings</text>
    <rect x="0" y="24" width="64" height="8" fill="#000"/>
    <line x1="0" y1="40" x2="1232" y2="40" stroke="#e6e6e6" stroke-width="1"/>
  </g>

  <g data-region="annotations" transform="translate(24,336)">
    <title>Annotations</title>
    <desc>Design notes for the page-header pattern.</desc>
    <circle cx="16" cy="16" r="16" fill="#d33"/>
    <text x="16" y="24" font-size="14" fill="#fff" stroke="none" text-anchor="middle">1</text>
    <text x="40" y="24" font-size="12" fill="#d33" stroke="none">Title is the most prominent text; actions right-aligned, one primary plus overflow.</text>
  </g>
</svg>
```
