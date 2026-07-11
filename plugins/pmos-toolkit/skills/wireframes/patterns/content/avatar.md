# Avatar

## When to use
- Identifying a user, organization, or entity
- Comments, list rows, mentions, attribution

## When NOT to use
- Decoration with no identity attached (use generic icon)
- Where identity matters but visual recognition doesn't (use just the name)

## Anatomy
1. Image (preferred), OR initials fallback, OR placeholder icon
2. Optional: status indicator dot (online/away/offline)
3. Optional: badge (admin, verified)

## Required states
- with-image (loaded)
- with-image-loading
- with-initials-fallback (no image)
- with-anonymous-fallback (no name either)
- with-status-online / -away / -offline
- multi-avatar-stack (overlapping for groups)

## Best practices
1. Always provide an `alt` text or `aria-label` — at minimum the user's name
2. Initials fallback: 1 letter for single names, 2 for first+last (G3)
3. Use deterministic background color from name hash (looks like design intent, not random) (G2)
4. Round or rounded-square — pick one and stick with it across the app (G2, N4)
5. Don't use real photos in low-/mid-fi wireframes — initials are clearer (N8)
6. Standard sizes: 24, 32, 40, 48, 64 px (G2)
7. Stacked avatars (group): overlap by ~30%, max ~4 visible + "+N more" (F2)
8. Status dot: 30% size of avatar, positioned bottom-right with white border (G2)

## Common mistakes
- Mixed shapes (round + square) on the same page → broken consistency (G2)
- No alt text → screen readers say nothing meaningful
- Random colors per render → flickers across reloads
- 6+ avatars in a stack → noise; cap at 4 + count (F2)
- Real photo placeholder in wireframes → conveys "design done" prematurely (N8)

## Device variants
- **all devices**: same pattern; sizes scale appropriately

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <g data-region="avatar" transform="translate(0,0)">
    <title>Avatar</title>
    <desc>Circular identity mark with an initials fallback and a bottom-right online status dot.</desc>
    <circle cx="24" cy="24" r="24" fill="#e6e6e6"/>
    <text x="24" y="32" font-size="20" fill="#666" stroke="none" text-anchor="middle">SK</text>
    <circle cx="40" cy="40" r="8" fill="#fff"/>
    <circle cx="40" cy="40" r="4" fill="#000"/>
  </g>
</svg>
```
