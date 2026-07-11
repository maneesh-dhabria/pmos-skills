# Tabs

## When to use
- Switching between **peer views of the SAME entity** (e.g., a user profile's Overview / Activity / Settings)
- 2–6 sections that don't need simultaneous visibility
- Each tab's content is roughly equal in importance

## When NOT to use
- Different destinations → use [top-nav.md](top-nav.md) or [side-nav.md](side-nav.md)
- More than 6 sections → use a side nav or accordion
- Sections that need to be compared side-by-side → split panes
- Sequential steps → use [multi-step-form.md](../forms/multi-step-form.md)

## Anatomy
1. Tab list (horizontal, 2–6 buttons)
2. Active tab indicator (underline, pill, or filled background)
3. Tab panel (the content area below)
4. Optional: count or status badge on each tab

## Required states
- default (first tab active)
- with-different-active-tab
- with-disabled-tab (rare; use sparingly)
- with-badge (count on a tab)
- mobile-scrollable (tabs overflow horizontally)

## Best practices
1. Active tab uses fill or underline (NOT just color)
2. Tab labels are nouns ("Activity") not verbs ("View activity") — they describe content (N2)
3. Use `role="tablist"`, `role="tab"`, `role="tabpanel"` and arrow-key navigation
4. Switching tabs should be instant or near-instant (< 100 ms) — if data fetch is needed, show skeleton (N1)
5. Don't use tabs for fundamentally different actions ("Edit" / "Delete") — those are buttons
6. First tab is the default landing — make it the most useful view (N7)
7. Persist active tab in URL (`?tab=activity`) for bookmarking and back-button (N3)

## Common mistakes
- Tabs with completely unrelated content → user expects peer views, not different pages (N4)
- 8+ tabs → exceeds Hick's Law (F2). Convert to side nav.
- Tabs and breadcrumbs both → redundant chrome (N8)
- Active tab indicated only by color → fails colorblind users
- Tab content reloads from scratch on every click → kills perceived performance

## Device variants
- **desktop-web/-app**: horizontal tabs, full visible
- **mobile-web**: horizontal scrollable tabs OR convert to a select dropdown if 4+
- **native**: iOS uses segmented control for ≤ 4; Android uses Material tabs

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <g data-region="tab-list">
    <title>Tab list</title>
    <desc>Peer views of the same entity; the active tab carries an underline, the others are muted.</desc>
    <line x1="24" y1="120" x2="1256" y2="120" stroke="#e6e6e6" stroke-width="1"/>
    <text x="24" y="112" font-size="14" fill="#000" stroke="none">Overview</text>
    <rect x="24" y="120" width="80" height="8" fill="#000"/>
    <text x="120" y="112" font-size="14" fill="#666" stroke="none">Activity</text>
    <rect x="184" y="96" width="32" height="24" fill="#000"/>
    <text x="192" y="112" font-size="12" fill="#fff" stroke="none">12</text>
    <text x="240" y="112" font-size="14" fill="#666" stroke="none">Settings</text>
  </g>
  <g data-region="tab-panel">
    <title>Tab panel</title>
    <desc>Content area for the active tab.</desc>
    <rect x="24" y="136" width="1232" height="400" fill="#fff" stroke="#e6e6e6"/>
    <text x="40" y="176" font-size="14" fill="#666" stroke="none">Overview content for the selected entity.</text>
  </g>
  <g data-region="annotations" transform="translate(24,40)">
    <title>Annotations</title>
    <desc>Design notes for the tabs.</desc>
    <circle cx="16" cy="16" r="16" fill="#d33"/>
    <text x="16" y="24" font-size="14" fill="#fff" stroke="none" text-anchor="middle">1</text>
    <text x="48" y="24" font-size="12" fill="#d33" stroke="none">Active tab marked by an underline, not colour alone.</text>
  </g>
</svg>
```
