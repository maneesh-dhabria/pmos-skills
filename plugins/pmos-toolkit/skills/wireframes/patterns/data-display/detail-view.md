# Detail View

## When to use
- Single entity's full data: a deal, a user, a document, a setting group
- Reached from a list, table, or card grid
- Read-heavy with optional edit affordances

## When NOT to use
- Comparing multiple entities → [table.md](table.md)
- Editing only → use a form pattern; detail view is read-first
- Trivial data (1–2 fields) → consider inline display

## Anatomy
1. [page-header.md](../layout/page-header.md): entity title, status, primary actions
2. Metadata strip: created/owner/status etc. (use [key-value-pair.md](key-value-pair.md))
3. Body sections (one per logical group): description, activity, related items
4. Side rail (optional, desktop): related actions, secondary metadata
5. Activity log / comments at the bottom
6. Optional: sticky save/edit bar when in edit mode

## Required states
- view (read-only)
- edit (mutable fields)
- with-pending-changes (unsaved)
- saving
- saved
- with-permission-denied (read-only because user lacks edit rights)
- entity-deleted / archived

## Best practices
1. Title is the entity name, large; status pill next to it (G3, N1)
2. Use sections with bold headings; each addresses one question ("Description", "Activity", "Members") (G3)
3. Edit mode: show what's editable with field affordances; "Save" / "Cancel" sticky at bottom or top (N3)
4. Show "last updated by X at Y" (N1) — accountability
5. Permissions: if user can't edit, hide edit affordances entirely; don't show disabled buttons everywhere (N8)
6. Activity log in reverse chronological (newest first) (N4)
7. Mobile: collapse side rail into accordions or tabs

## Common mistakes
- Edit form alongside read view → confusing; pick one mode at a time (N4)
- Same-style headings everywhere → no scan-able hierarchy (G3)
- Save button at the top only → user has to scroll back up after editing (N7, F1)
- No "last updated" indicator → users distrust freshness (N1)
- Sidebar of metadata on mobile → wastes 30% width; collapse it

## Device variants
- **desktop-web/-app**: two-column with side rail
- **mobile-web/native**: single column; collapse side rail content into accordions or a "Details" tab

## Skeleton

Composed on the **desktop 1280×800** canvas: a page-header band over a two-column body (main + side rail),
using the Heading-block (#12), List-row (#13), Card (#5) and Key-value-stat (#15) primitives.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="1280" height="800" fill="#fff"/>

  <g data-region="page-header">
    <title>Entity header</title>
    <desc>The entity title with a status pill and last-updated line; secondary Edit and primary Mark won actions sit at the right.</desc>
    <text x="24" y="56" font-size="28" fill="#000" stroke="none">Acme Pilot Q3 Renewal</text>
    <rect x="480" y="32" width="112" height="24" fill="#fff" stroke="#666"/>
    <text x="488" y="48" font-size="12" fill="#666" stroke="none">Negotiation</text>
    <text x="24" y="80" font-size="12" fill="#666" stroke="none">Owned by Sarah Kim · Updated 2h ago</text>
    <rect x="1016" y="32" width="96" height="40" fill="#fff" stroke="#000"/>
    <text x="1040" y="56" font-size="14" fill="#000" stroke="none">Edit</text>
    <rect x="1128" y="32" width="128" height="40" fill="#000"/>
    <text x="1152" y="56" font-size="14" fill="#fff" stroke="none">Mark won</text>
    <line x1="24" y1="104" x2="1256" y2="104" stroke="#e6e6e6" stroke-width="1"/>
  </g>

  <g data-region="body">
    <title>Description and activity</title>
    <desc>The read-first main column: a Description section and a reverse-chronological Activity log.</desc>
    <text x="24" y="144" font-size="12" fill="#666" stroke="none">DESCRIPTION</text>
    <text x="24" y="176" font-size="14" fill="#000" stroke="none">Renewal of existing 12-month pilot. Customer requested SSO and audit-log support.</text>
    <text x="24" y="240" font-size="12" fill="#666" stroke="none">ACTIVITY</text>
    <text x="24" y="288" font-size="14" fill="#000" stroke="none">Sarah Kim logged a call · 2h ago</text>
    <line x1="24" y1="304" x2="824" y2="304" stroke="#e6e6e6" stroke-width="1"/>
    <text x="24" y="336" font-size="14" fill="#000" stroke="none">Sarah Kim updated value to $48,000 · 1d ago</text>
    <line x1="24" y1="352" x2="824" y2="352" stroke="#e6e6e6" stroke-width="1"/>
  </g>

  <g data-region="side-rail">
    <title>Metadata rail</title>
    <desc>Secondary key-value metadata cards: deal value and close date. On mobile this rail collapses into accordions.</desc>
    <rect x="880" y="128" width="376" height="96" fill="#fff" stroke="#e6e6e6"/>
    <text x="896" y="160" font-size="12" fill="#666" stroke="none">VALUE</text>
    <text x="896" y="192" font-size="20" fill="#000" stroke="none">$48,000</text>
    <rect x="880" y="240" width="376" height="96" fill="#fff" stroke="#e6e6e6"/>
    <text x="896" y="272" font-size="12" fill="#666" stroke="none">CLOSE DATE</text>
    <text x="896" y="304" font-size="20" fill="#000" stroke="none">Jun 30, 2026</text>
  </g>

  <g data-region="annotations">
    <title>Design notes</title>
    <desc>Edit mode reveals field affordances and a sticky Save/Cancel bar; when the user lacks edit rights the Edit and Mark won actions are hidden entirely rather than shown disabled.</desc>
    <circle cx="1000" cy="48" r="8" fill="#d33"/>
    <text x="1000" y="56" font-size="10" fill="#fff" stroke="none" text-anchor="middle">1</text>
  </g>
</svg>
```
