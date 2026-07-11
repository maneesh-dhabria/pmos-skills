# Badge

## When to use
- Status indicator (Open / Closed / Negotiation)
- Count indicator (notifications, unread)
- Category tag (Bug, Feature, Docs)

## When NOT to use
- Primary action → use a button
- Long descriptive text → use a normal text element
- Color-only categorization without text → fails accessibility

## Anatomy
1. Pill or rounded-rectangle container
2. Color-coded by semantic (success / warning / error / neutral)
3. Concise label OR number
4. Optional: icon (sparingly)

## Required states
- neutral
- success / positive
- warning
- error / critical
- info
- with-icon
- count (just number, e.g., "3")
- count-overflow ("99+")

## Best practices
1. Color + text label — never color alone for meaning
2. Concise: ≤ 2 words for status; just a number for counts (G3, N8)
3. Consistent color mapping across the app (N4) — green for success, red for error, etc.
4. Use neutral pill for category/tag — don't over-color (G2, N8)
5. Counts: cap at "99+" — never show "1,247" in a small pill (G3)
6. Don't put badges inside badges
7. Status badges next to entity title; counts next to nav items
8. Border + light fill for accessibility in dark mode

## Common mistakes
- Color-only with no text → fails colorblind
- Every tag in saturated color → loses signal; reserve color for important states (N8)
- Inconsistent color meaning → "Red" means error here, "warning" elsewhere (N4)
- Tiny font (< 11 px) for accessibility

## Device variants
- **all devices**: same pattern

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="32" viewBox="0 0 80 32" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <g data-region="badge" transform="translate(0,0)">
    <title>Badge</title>
    <desc>Compact status label: a filled pill containing a concise text label.</desc>
    <rect x="0" y="0" width="80" height="32" fill="#000"/>
    <text x="40" y="24" font-size="12" fill="#fff" stroke="none" text-anchor="middle">Active</text>
  </g>
</svg>
```
