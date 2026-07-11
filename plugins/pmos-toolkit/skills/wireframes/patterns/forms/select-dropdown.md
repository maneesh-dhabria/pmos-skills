# Select Dropdown

## When to use
- Pick **one** from **4–15** known, finite options
- Options too long to show as radio buttons (≥ 6) but bounded enough to enumerate

## When NOT to use
- 2–3 options → use radio buttons (always-visible, faster) or a segmented control
- 15+ options → use a [search.md](search.md) with autocomplete or a combobox
- Multi-select needed → multi-select dropdown or checkbox list (different pattern)
- Options not knowable in advance → autocomplete

## Anatomy
1. Visible label above
2. Trigger (the closed select)
3. Dropdown list (the opened panel)
4. Selected-value display in trigger
5. Chevron icon (visual cue it's a dropdown)
6. Optional: option groups with headers, search filter for 10+ options

## Required states
- default (no selection)
- with-selection
- focused / open
- disabled
- error
- with-search (10+ options)
- option-hovered

## Best practices
1. Always have a default option — either a real default or a placeholder ("Select a country") (N7)
2. Sort options meaningfully: alphabetical for known names, frequency for repeated picks, chronological for dates (N4)
3. Group related options with `<optgroup>` headers (G1)
4. For 10+ options, add type-to-search inside the dropdown (N7, F2)
5. Trigger shows the selected value, not the field name (N6)
6. Native `<select>` on mobile — better UX than custom
7. Custom selects: `role="combobox"`, full keyboard support (Enter/Space to open, arrow-key navigation, Esc to close)
8. Show only ~7 options visible at once; scroll the rest (F2, G4)

## Common mistakes
- 30+ options unsorted → users can't find their answer (F2, N4)
- Custom-styled select that breaks mobile native picker → worse UX everywhere
- Dropdown opens upward when there's room below → unexpected (N4)
- No visual cue that it's a dropdown (no chevron) → looks like a static label
- Fails keyboard navigation → unusable for power users and screen-reader users

## Device variants
- **mobile-web**: native `<select>` opens system picker (best UX)
- **native**: iOS wheel picker, Android Material menu
- **desktop**: custom or native; custom allows search/grouping

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <g data-region="trigger" transform="translate(24,24)">
    <title>Closed select trigger</title>
    <desc>The labelled trigger showing the placeholder value and a chevron cue.</desc>
    <text x="0" y="16" font-size="12" fill="#666" stroke="none">Country</text>
    <rect x="0" y="24" width="320" height="40" fill="#fff" stroke="#000"/>
    <text x="8" y="48" font-size="14" fill="#666" stroke="none">Select a country</text>
    <text x="296" y="48" font-size="14" fill="#000" stroke="none">v</text>
  </g>
  <g data-region="menu" transform="translate(24,96)">
    <title>Open dropdown panel</title>
    <desc>The opened list with grouped options; the hovered row is shaded.</desc>
    <rect x="0" y="0" width="320" height="240" fill="#fff" stroke="#000"/>
    <text x="8" y="24" font-size="12" fill="#666" stroke="none">Frequent</text>
    <rect x="0" y="32" width="320" height="40" fill="#f4f4f4"/>
    <text x="8" y="56" font-size="14" fill="#000" stroke="none">United States</text>
    <text x="8" y="96" font-size="14" fill="#000" stroke="none">India</text>
    <text x="8" y="136" font-size="14" fill="#000" stroke="none">United Kingdom</text>
    <text x="8" y="168" font-size="12" fill="#666" stroke="none">All countries</text>
    <text x="8" y="200" font-size="14" fill="#000" stroke="none">Argentina</text>
    <text x="8" y="232" font-size="14" fill="#000" stroke="none">Australia</text>
  </g>
</svg>
```
