# Empty State

## When to use
- Container with no items YET (first-run, fresh account, just-cleared filter)
- Search returning zero results
- A list/table/grid in its empty form

## When NOT to use
- Loading (use skeleton, not empty)
- Error (use error-state)
- Transient zero-state user will refill via Undo → consider a softer "Nothing here" without CTA

## Anatomy
1. Centered illustration or icon (kept minimal in low-/mid-fi wireframes)
2. Title: states what's missing OR celebrates fresh start
3. Helper text: 1–2 sentences explaining why and what to do
4. Primary CTA to add the first item or change the filter
5. Optional: secondary link (docs, video tour)

## Required states
- first-run (never had content) — onboarding tone
- post-clear (had content, now zero) — neutral tone
- no-results (search/filter applied) — suggest changing filter
- permission-empty (user lacks access) — explain why

## Best practices
1. Title is specific to context: "No deals yet" not "Empty" (N2, N9)
2. Helper text explains WHY and what to do next (N9)
3. Primary CTA in the empty state matches the surface's primary creation action (N4)
4. First-run empty states can be aspirational ("Start tracking your deals to see your pipeline grow")
5. No-results empty state suggests fixes ("Try fewer keywords, or clear your filter") (N9)
6. Don't show empty state during initial load — show skeleton instead (N4)
7. Illustrations: kept geometric/abstract for wireframes — don't draft real art (G4, N8)
8. ARIA: announce empty via `aria-live="polite"` if dynamically appearing after a filter

## Common mistakes
- "No data" with nothing else → user can't tell if it's broken or expected (N9)
- Empty state on initial load (before fetch completes) → looks broken; use skeleton (N4)
- Generic empty illustration unrelated to the surface → noise (N8)
- No CTA → user knows there's nothing but doesn't know how to fix it
- Same empty state for "first-run" and "filtered to zero" → mixes contexts

## Device variants
- **desktop / mobile**: centered in container; mobile gets smaller illustration
- **native**: respect safe-area; use platform iconography

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="1280" height="800" fill="#fff"/>
  <g data-region="app-bar">
    <title>App bar</title><desc>Page chrome above the empty container.</desc>
    <rect x="0" y="0" width="1280" height="56" fill="#fff" stroke="#e6e6e6"/>
    <text x="24" y="32" font-size="20" fill="#000" stroke="none">Deals</text>
  </g>
  <g data-region="empty-state">
    <title>Empty state (first-run)</title><desc>Centred first-run empty state: geometric icon, title, aspirational helper text, and a primary create CTA plus an import option.</desc>
    <rect x="592" y="240" width="96" height="96" fill="#e6e6e6"/>
    <line x1="592" y1="240" x2="688" y2="336" stroke="#666" stroke-width="1"/>
    <line x1="688" y1="240" x2="592" y2="336" stroke="#666" stroke-width="1"/>
    <text x="640" y="392" font-size="28" fill="#000" stroke="none" text-anchor="middle">No deals yet</text>
    <text x="640" y="432" font-size="14" fill="#666" stroke="none" text-anchor="middle">Track your sales pipeline by adding your first deal. You can import from CSV too.</text>
    <rect x="520" y="464" width="136" height="40" fill="#000"/>
    <text x="536" y="488" font-size="14" fill="#fff" stroke="none">+ Add deal</text>
    <rect x="664" y="464" width="120" height="40" fill="#fff" stroke="#000"/>
    <text x="680" y="488" font-size="14" fill="#000" stroke="none">Import CSV</text>
  </g>
  <g data-region="annotations">
    <title>Annotations</title><desc>Design notes on empty-state variants.</desc>
    <rect x="496" y="216" width="288" height="304" fill="none" stroke="#d33" stroke-dasharray="4 4"/>
    <text x="496" y="560" font-size="12" fill="#d33" stroke="none">Empty state has a helpful CTA and explanation, not a bare "No data" (S2). The no-results variant instead suggests clearing the filter.</text>
  </g>
</svg>
```
