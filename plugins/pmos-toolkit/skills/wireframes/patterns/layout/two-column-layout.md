# Two-Column Layout

## When to use
- Persistent navigation/filter pane + main content area
- Settings (categories on left, settings on right)
- Apps with side-nav as primary navigation

## When NOT to use
- Marketing pages → centered layout
- Mobile (no horizontal room) → stack vertically or use a drawer
- Equal-importance content blocks → grid layout

## Anatomy
1. Left column: persistent rail (nav, filters, categories)
2. Right column: main content (much wider, ~65–80% of width)
3. Optional: top header spanning both columns
4. Optional: collapse toggle for the left rail

## Required states
- default (both columns visible)
- with-collapsed-rail (icons only)
- mobile-stacked (rail hidden behind drawer or moved to top)
- with-rail-overflow-scroll (long category list)

## Best practices
1. Left column 200–280 px (G4) — enough for labels, not too much chrome
2. Main column gets the rest of the width (G4)
3. Persistent active state in the rail showing current section (N1)
4. Allow rail collapse for power users (N7)
5. Sticky rail on scroll so user doesn't lose orientation when scrolling main content (N6)
6. Mobile: rail becomes a drawer or reorders above content, keeping the primary content in the thumb's reach
7. Use `<aside>` for the rail and `<main>` for content
8. Maintain at least 24 px gutter between columns (G4)

## Common mistakes
- 50/50 split → main content cramped (G4)
- Rail wider than content on small viewports → bad density (G4)
- No active-state in rail → user disoriented (N1)
- Both columns scroll independently with no clear relationship → confusing (N6)
- Rail scrolls but main content also scrolls a different amount → vertigo

## Device variants
- **desktop-web/-app**: persistent two-column
- **mobile-web**: rail as drawer; or stack rail content above
- **native**: rail typically hidden behind drawer or moved to bottom-tab-bar

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="1280" height="800" fill="#fff"/>

  <g data-region="app-bar" transform="translate(0,0)">
    <title>App bar</title>
    <desc>Product-level top bar spanning both columns.</desc>
    <rect x="0" y="0" width="1280" height="56" fill="#fff" stroke="#e6e6e6"/>
    <text x="24" y="32" font-size="20" fill="#000" stroke="none">Product</text>
    <rect x="1216" y="8" width="40" height="40" fill="#e6e6e6"/>
  </g>

  <g data-region="rail" transform="translate(24,88)">
    <title>Left rail</title>
    <desc>Persistent 240px navigation rail with an active row.</desc>
    <rect x="0" y="0" width="240" height="640" fill="#f4f4f4"/>
    <text x="16" y="32" font-size="12" fill="#666" stroke="none">SETTINGS</text>
    <rect x="8" y="48" width="224" height="40" fill="#000"/>
    <text x="24" y="72" font-size="14" fill="#fff" stroke="none">General</text>
    <text x="24" y="120" font-size="14" fill="#000" stroke="none">Billing</text>
    <text x="24" y="168" font-size="14" fill="#000" stroke="none">Members</text>
    <text x="24" y="216" font-size="14" fill="#000" stroke="none">Integrations</text>
    <text x="24" y="264" font-size="14" fill="#000" stroke="none">Audit log</text>
  </g>

  <g data-region="main" transform="translate(280,88)">
    <title>Main content</title>
    <desc>Wide content column for the selected section.</desc>
    <text x="0" y="24" font-size="28" fill="#000" stroke="none">General</text>
    <text x="0" y="64" font-size="14" fill="#666" stroke="none">Workspace name, default timezone, and locale.</text>
    <rect x="0" y="96" width="976" height="240" fill="#fff" stroke="#e6e6e6"/>
    <text x="16" y="136" font-size="20" fill="#000" stroke="none">Workspace name</text>
    <text x="16" y="168" font-size="14" fill="#666" stroke="none">Shown on invoices and the workspace switcher.</text>
    <rect x="16" y="192" width="240" height="40" fill="#fff" stroke="#000"/>
    <text x="24" y="216" font-size="14" fill="#666" stroke="none">Acme Inc.</text>
  </g>

  <g data-region="annotations" transform="translate(24,456)">
    <title>Annotations</title>
    <desc>Design notes for the two-column layout.</desc>
    <circle cx="16" cy="16" r="16" fill="#d33"/>
    <text x="16" y="24" font-size="14" fill="#fff" stroke="none" text-anchor="middle">1</text>
    <text x="40" y="24" font-size="12" fill="#d33" stroke="none">Rail 200-280px with a persistent active state; keep a wide gutter to the main column; rail sticks on scroll.</text>
  </g>
</svg>
```
