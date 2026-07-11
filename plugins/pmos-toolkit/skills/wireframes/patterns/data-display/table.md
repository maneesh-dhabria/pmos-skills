# Table

## When to use
- Comparable rows with multiple attributes (≥ 3 columns)
- Sorting, filtering, scanning across rows
- Tabular data: spreadsheets, transactions, lists of records with metadata

## When NOT to use
- 1–2 attributes per row → [list.md](list.md)
- Visual browsing → [card-grid.md](card-grid.md)
- Single-record details → [detail-view.md](detail-view.md)
- Mobile-only feature with > 3 columns → tables don't fit; convert to cards

## Anatomy
1. Table header row (column titles, sortable indicators)
2. Body rows
3. Optional: row selection checkbox column
4. Optional: row actions column (right-aligned, three-dot menu)
5. Optional: filter / search bar above
6. Optional: bulk-action bar appears when rows selected
7. Optional: footer with [pagination.md](../navigation/pagination.md) or totals
8. Required: empty state, loading state

## Required states
- default (with rows)
- empty (no data)
- loading
- error
- with-rows-selected (bulk-action bar visible)
- with-sorted-column (sort indicator on a column)
- with-filtered-data (filter applied)
- row-hovered

## Best practices
1. Right-align numeric columns; left-align text (G3, N4) — easier to scan
2. Sortable columns indicate with arrow icons (N1) — non-sortable have no icon
3. Sticky header on scroll for tables > 1 viewport (N6)
4. Zebra striping or 1px row dividers — pick one, never both (G2, N8)
5. Row actions in a `⋯` menu, not 5 inline buttons (F2, N8)
6. Selection: checkbox column on left; a visible "Select all" control in the header (not an unlabelled box)
7. Bulk-action bar appears at top and shows count: "3 rows selected" + actions (N1)
8. Empty state explains and offers an action (N9)
9. Mobile: convert each row to a card stacking attributes — never horizontal scroll for primary tables
10. Use `<table>` semantically; never `<div>`s pretending to be a table

## Common mistakes
- 12 columns crammed → unscannable. Cut to essentials, hide extras behind row click (F2)
- All columns same width → scannability suffers (G3)
- No sort indicators on sortable columns → users don't know they can sort
- Inline buttons per row eat horizontal space → use overflow menu (N8)
- "No data" empty state with no CTA (N9, see [empty-state.md](../feedback/empty-state.md))
- Horizontal scroll on mobile → users miss content beyond fold

## Device variants
- **desktop-web/-app**: full table
- **mobile-web**: convert rows to stacked cards; show 2–3 most important attributes
- **native**: list-view with disclosure indicator → tap to detail

## Skeleton

Composed on the **desktop 1280×800** canvas from the Table-header-row (#14) and List-row (#13)
primitives — never bespoke geometry.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="1280" height="800" fill="#fff"/>

  <g data-region="toolbar">
    <title>Filter toolbar</title>
    <desc>Search-to-filter input on the left; the primary New deal action on the right.</desc>
    <rect x="24" y="24" width="240" height="40" fill="#fff" stroke="#000"/>
    <text x="40" y="48" font-size="14" fill="#666" stroke="none">Filter rows…</text>
    <rect x="1136" y="24" width="120" height="40" fill="#000"/>
    <text x="1160" y="48" font-size="14" fill="#fff" stroke="none">+ New deal</text>
  </g>

  <g data-region="table">
    <title>Deals table</title>
    <desc>A column-header row over comparable data rows: select, deal name, stage, value, owner, row actions.</desc>
    <rect x="24" y="88" width="1232" height="40" fill="#f4f4f4"/>
    <text x="88" y="112" font-size="12" fill="#666" stroke="none">DEAL ▲</text>
    <text x="480" y="112" font-size="12" fill="#666" stroke="none">STAGE</text>
    <text x="760" y="112" font-size="12" fill="#666" stroke="none">VALUE</text>
    <text x="960" y="112" font-size="12" fill="#666" stroke="none">OWNER</text>

    <rect x="24" y="128" width="1232" height="48" fill="#fff"/>
    <rect x="40" y="144" width="24" height="24" fill="#fff" stroke="#000"/>
    <text x="88" y="160" font-size="14" fill="#000" stroke="none">Acme Pilot Q3</text>
    <rect x="480" y="136" width="112" height="24" fill="#fff" stroke="#666"/>
    <text x="488" y="152" font-size="12" fill="#666" stroke="none">Negotiation</text>
    <text x="760" y="160" font-size="14" fill="#000" stroke="none">$48,000</text>
    <text x="960" y="160" font-size="14" fill="#000" stroke="none">Sarah Kim</text>
    <text x="1216" y="160" font-size="14" fill="#666" stroke="none">⋯</text>
    <line x1="24" y1="176" x2="1256" y2="176" stroke="#e6e6e6" stroke-width="1"/>

    <rect x="24" y="176" width="1232" height="48" fill="#fff"/>
    <rect x="40" y="192" width="24" height="24" fill="#fff" stroke="#000"/>
    <text x="88" y="208" font-size="14" fill="#000" stroke="none">Globex Expansion</text>
    <rect x="480" y="184" width="112" height="24" fill="#fff" stroke="#666"/>
    <text x="488" y="200" font-size="12" fill="#666" stroke="none">Proposal</text>
    <text x="760" y="208" font-size="14" fill="#000" stroke="none">$120,000</text>
    <text x="960" y="208" font-size="14" fill="#000" stroke="none">Amir Shah</text>
    <text x="1216" y="208" font-size="14" fill="#666" stroke="none">⋯</text>
    <line x1="24" y1="224" x2="1256" y2="224" stroke="#e6e6e6" stroke-width="1"/>

    <rect x="24" y="224" width="1232" height="48" fill="#fff"/>
    <rect x="40" y="240" width="24" height="24" fill="#fff" stroke="#000"/>
    <text x="88" y="256" font-size="14" fill="#000" stroke="none">Initech Renewal</text>
    <rect x="480" y="232" width="112" height="24" fill="#fff" stroke="#666"/>
    <text x="488" y="248" font-size="12" fill="#666" stroke="none">Closed won</text>
    <text x="760" y="256" font-size="14" fill="#000" stroke="none">$32,000</text>
    <text x="960" y="256" font-size="14" fill="#000" stroke="none">Sarah Kim</text>
    <text x="1216" y="256" font-size="14" fill="#666" stroke="none">⋯</text>
    <line x1="24" y1="272" x2="1256" y2="272" stroke="#e6e6e6" stroke-width="1"/>
  </g>

  <g data-region="annotations">
    <title>Design notes</title>
    <desc>1 — the ▲ marks the active sorted column. 2 — a bulk-action bar showing the selected count replaces the header row when rows are checked. Empty, loading and error states swap the table body.</desc>
    <circle cx="152" cy="112" r="8" fill="#d33"/>
    <text x="152" y="120" font-size="10" fill="#fff" stroke="none" text-anchor="middle">1</text>
    <circle cx="48" cy="112" r="8" fill="#d33"/>
    <text x="48" y="120" font-size="10" fill="#fff" stroke="none" text-anchor="middle">2</text>
  </g>
</svg>
```
