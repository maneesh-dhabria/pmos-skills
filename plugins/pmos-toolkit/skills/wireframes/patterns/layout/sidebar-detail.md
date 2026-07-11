# Sidebar + Detail (List/Detail)

## When to use
- Inbox-style apps (mail, messages, tickets)
- File browsers
- Any flow where users repeatedly pick from a list and view detail without losing list context

## When NOT to use
- Lists with detail-rich items → list page → detail page (separate routes)
- Browsing by visual preview → [card-grid.md](../data-display/card-grid.md)
- Mobile primary surface → use list-then-detail navigation, not split view

## Anatomy
1. Left list pane (300–400 px)
2. Right detail pane (rest of width)
3. List item shows: leading avatar/icon, title, snippet, timestamp, unread indicator
4. Selected list item highlighted; detail pane shows full content
5. Required: empty detail pane when nothing selected ("Select an item")

## Required states
- nothing-selected (empty detail pane)
- with-selection (detail rendered)
- with-multi-select (checkbox column)
- list-loading
- detail-loading
- list-empty
- detail-empty (item deleted while viewing)

## Best practices
1. Selected list item: filled background + border accent (G2)
2. Detail pane fetches in-place; show skeleton during fetch (N1)
3. Keyboard: arrow keys navigate list, Enter opens detail — power-user expectation
4. Empty detail pane shows guidance: "Select a message to read" (N9)
5. Unread/read state visually distinct (weight + indicator dot) (G3)
6. Sticky list filter / search at the top of the list pane
7. On mobile: split view collapses; tapping list item opens a full-screen detail with a back button in the thumb's reach
8. Use ARIA `role="list"` for the list, `aria-selected` for the active item

## Common mistakes
- Selected state relies on a single subtle cue → hard to spot the active row; use a filled background plus weight
- Detail pane reloads page (full route change) on selection → loses list scroll position
- No keyboard navigation → power users frustrated
- Empty detail pane is just blank → looks broken (N9)
- Mobile retains side-by-side → cramped

## Device variants
- **desktop**: side-by-side
- **tablet landscape**: side-by-side
- **tablet portrait / mobile**: list view → tap → detail view (full screen with back)

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="1280" height="800" fill="#fff"/>

  <g data-region="app-bar" transform="translate(0,0)">
    <title>App bar</title>
    <desc>Product-level top bar above the split view.</desc>
    <rect x="0" y="0" width="1280" height="56" fill="#fff" stroke="#e6e6e6"/>
    <text x="24" y="32" font-size="20" fill="#000" stroke="none">Inbox</text>
    <rect x="1216" y="8" width="40" height="40" fill="#e6e6e6"/>
  </g>

  <g data-region="list-pane" transform="translate(24,88)">
    <title>List pane</title>
    <desc>Scrollable message list with search and a selected row.</desc>
    <rect x="0" y="0" width="336" height="640" fill="#fff" stroke="#e6e6e6"/>
    <rect x="8" y="8" width="320" height="40" fill="#fff" stroke="#000"/>
    <text x="16" y="32" font-size="14" fill="#666" stroke="none">Search...</text>
    <rect x="0" y="56" width="336" height="64" fill="#000"/>
    <circle cx="32" cy="88" r="16" fill="#e6e6e6"/>
    <text x="56" y="88" font-size="14" fill="#fff" stroke="none">Sarah Kim</text>
    <text x="56" y="104" font-size="12" fill="#fff" stroke="none">Re: Q3 renewal terms - 2h</text>
    <circle cx="32" cy="152" r="16" fill="#e6e6e6"/>
    <text x="56" y="152" font-size="14" fill="#000" stroke="none">Maneesh Dhabria</text>
    <text x="56" y="168" font-size="12" fill="#666" stroke="none">Pipeline review notes - 1d</text>
    <line x1="0" y1="184" x2="336" y2="184" stroke="#e6e6e6" stroke-width="1"/>
    <circle cx="32" cy="216" r="16" fill="#e6e6e6"/>
    <text x="56" y="216" font-size="14" fill="#000" stroke="none">Alex Rivera</text>
    <text x="56" y="232" font-size="12" fill="#666" stroke="none">Contract draft v2 - 2d</text>
    <line x1="0" y1="248" x2="336" y2="248" stroke="#e6e6e6" stroke-width="1"/>
  </g>

  <g data-region="detail-pane" transform="translate(376,88)">
    <title>Detail pane</title>
    <desc>Full content of the selected message.</desc>
    <text x="0" y="24" font-size="20" fill="#000" stroke="none">Re: Q3 renewal terms</text>
    <text x="0" y="48" font-size="12" fill="#666" stroke="none">From Sarah Kim - 2h ago</text>
    <line x1="0" y1="64" x2="880" y2="64" stroke="#e6e6e6" stroke-width="1"/>
    <text x="0" y="96" font-size="14" fill="#666" stroke="none">Hi team - confirming the updated commercial terms below.</text>
    <text x="0" y="128" font-size="14" fill="#666" stroke="none">Net-30, 12-month commit, and the revised discount schedule.</text>
  </g>

  <g data-region="annotations" transform="translate(376,320)">
    <title>Annotations</title>
    <desc>Design notes for the list/detail split view.</desc>
    <circle cx="16" cy="16" r="16" fill="#d33"/>
    <text x="16" y="24" font-size="14" fill="#fff" stroke="none" text-anchor="middle">1</text>
    <text x="40" y="24" font-size="12" fill="#d33" stroke="none">Selected row is filled, not colour-only; empty detail shows a "Select a message" prompt; on mobile the panes become list then full-screen detail.</text>
  </g>
</svg>
```
