# Dropdown Menu

## When to use
- 3+ secondary actions on an entity (table row, card)
- Overflow when too many actions to fit inline
- Account / profile menus

## When NOT to use
- Single primary action → just a button
- Choosing one of N options to commit (form value) → [select-dropdown.md](../forms/select-dropdown.md)
- Toggling a binary state → switch / checkbox

## Anatomy
1. Trigger button (often a `⋯` icon, sometimes labeled "Actions ▾")
2. Menu panel (popover)
3. Menu items: icon (optional) + label + shortcut hint (optional)
4. Optional: separators between groups
5. Optional: destructive item separated and styled with red

## Required states
- closed
- open
- with-disabled-item
- with-destructive-item-styled
- item-hovered
- item-focused (keyboard)

## Best practices
1. Trigger is `⋯` (three dots) for "more actions" or "Action ▾" for explicit menus (N2, N4)
2. Open on click, NOT hover (hover menus are flaky on touch + accidental opens)
3. Keyboard support: Enter/Space opens; arrow keys move; Esc closes; Tab moves focus out
4. ARIA: `role="menu"`, items `role="menuitem"`, trigger has `aria-haspopup="menu"` and `aria-expanded`
5. Destructive actions at the bottom, separated, styled red (G1, N5)
6. Show keyboard shortcuts inline if applicable (N7)
7. Close on selection unless menu is intentionally multi-step
8. Position menu so it stays in viewport (flip up if no room below)
9. Touch target ≥ 44 px tall (F1)

## Common mistakes
- Hover-only triggers → broken on touch
- No keyboard navigation → fails accessibility
- Destructive in the middle of the list → easy mis-click (N5, G1)
- Too many items (10+) → use a search-enabled menu or rethink IA (F2)
- Menu opens off-screen with no flip → users can't see items
- `⋯` with no `aria-label` → screen readers say "more horizontal" or nothing

## Device variants
- **desktop**: popover anchored to trigger
- **mobile-web**: bottom sheet replaces popover (more thumb-reachable, F1)
- **ios-app**: Action Sheet or context menu
- **android-app**: Material menu or bottom sheet

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <g data-region="trigger" transform="translate(48,48)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <title>Overflow trigger</title>
    <desc>A three-dot icon button that opens the menu on click.</desc>
    <rect x="0" y="0" width="40" height="40" fill="#fff" stroke="#000" data-interactive="true"/>
    <text x="8" y="24" font-size="20" fill="#000" stroke="none">⋯</text>
  </g>
  <g data-region="menu" transform="translate(48,104)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <title>Menu panel</title>
    <desc>A popover of menu items; the destructive item is separated at the bottom.</desc>
    <rect x="0" y="0" width="360" height="192" fill="#fff" stroke="#000"/>
    <text x="16" y="32" font-size="14" fill="#000" stroke="none">Edit</text>
    <text x="312" y="32" font-size="12" fill="#666" stroke="none">⌘E</text>
    <line x1="0" y1="48" x2="360" y2="48" stroke="#e6e6e6" stroke-width="1"/>
    <text x="16" y="80" font-size="14" fill="#000" stroke="none">Duplicate</text>
    <line x1="0" y1="96" x2="360" y2="96" stroke="#e6e6e6" stroke-width="1"/>
    <text x="16" y="128" font-size="14" fill="#000" stroke="none">Share…</text>
    <line x1="0" y1="144" x2="360" y2="144" stroke="#666" stroke-width="1"/>
    <text x="16" y="176" font-size="14" fill="#000" stroke="none">Delete</text>
  </g>
  <g data-region="annotations" transform="translate(432,104)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <title>Destructive-item redline</title>
    <desc>In high fidelity the Delete item is separated and coloured with the destructive red; kept monochrome here.</desc>
    <rect x="0" y="144" width="240" height="48" fill="none" stroke="#d33" stroke-dasharray="4 4"/>
    <text x="0" y="216" font-size="12" fill="#d33" stroke="none">Destructive item — separated and red in hi-fi.</text>
  </g>
</svg>
```
