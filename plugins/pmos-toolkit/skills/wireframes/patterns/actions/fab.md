# FAB (Floating Action Button)

## When to use
- Mobile/native primary creation action ("New post", "+ Compose")
- Single dominant action that should be reachable from anywhere on the screen

## When NOT to use
- Desktop primary action → use a [primary-cta.md](primary-cta.md) in the page header
- Multiple peer actions → use a header action group, not multiple FABs
- iOS apps where FAB isn't the convention — prefer top-right "+" in nav bar

## Anatomy
1. Circular (or pill) button floating above content
2. Icon (action verb) — "+" most common
3. Optional: extended FAB with label ("+ New deal")
4. Anchored to screen corner (typically bottom-right above the tab bar)

## Required states
- default
- pressed (ripple)
- with-extended-label
- with-mini-fab (smaller variant)
- scrolled-state (some products hide on scroll-down, show on scroll-up)

## Best practices
1. ONE FAB per screen (G3)
2. Position above the bottom-tab-bar with margin so it doesn't collide (F1)
3. ≥ 56×56 px (F1)
4. Material convention: 16 px from screen edges; iOS doesn't use FAB conventionally
5. Extended FAB (with label) for first-run / unfamiliar contexts; collapses to icon-only when user scrolls (N6, N7)
6. `aria-label` describing the action
7. Consider scroll-to-bottom collision: hide or shrink on scroll
8. Don't use a FAB AND a header CTA for the same action — pick one

## Common mistakes
- Multiple FABs → none feels primary (G3)
- FAB on iOS where users expect "+" in nav bar
- FAB collides with bottom tab bar → inaccessible (F1)
- Tiny FAB (< 48 px) → fails touch (F1)
- FAB on desktop → wastes screen real estate; use header CTA instead

## Device variants
- **android-app**: standard pattern; bottom-right, above tab bar
- **ios-app**: not a native pattern; prefer top-right "+" in nav bar
- **mobile-web**: FAB-style works; ensure it doesn't cover content

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="375" height="812" viewBox="0 0 375 812">
  <g data-region="app-bar" transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <title>Top app bar</title>
    <desc>Screen title bar; the FAB and content sit below it.</desc>
    <rect x="0" y="0" width="368" height="56" fill="#fff" stroke="#e6e6e6"/>
    <text x="16" y="32" font-size="20" fill="#000" stroke="none">Deals</text>
  </g>
  <g data-region="content" transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <title>Scrollable content</title>
    <desc>List rows the floating action button hovers above.</desc>
    <rect x="16" y="88" width="344" height="48" fill="#fff"/>
    <circle cx="40" cy="112" r="16" fill="#e6e6e6"/>
    <text x="72" y="120" font-size="14" fill="#000" stroke="none">Acme Corp</text>
    <line x1="16" y1="136" x2="360" y2="136" stroke="#e6e6e6" stroke-width="1"/>
    <rect x="16" y="152" width="344" height="48" fill="#fff"/>
    <circle cx="40" cy="176" r="16" fill="#e6e6e6"/>
    <text x="72" y="184" font-size="14" fill="#000" stroke="none">Globex</text>
    <line x1="16" y1="200" x2="360" y2="200" stroke="#e6e6e6" stroke-width="1"/>
    <rect x="16" y="216" width="344" height="48" fill="#fff"/>
    <circle cx="40" cy="240" r="16" fill="#e6e6e6"/>
    <text x="72" y="248" font-size="14" fill="#000" stroke="none">Initech</text>
    <line x1="16" y1="264" x2="360" y2="264" stroke="#e6e6e6" stroke-width="1"/>
  </g>
  <g data-region="fab" transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <title>Floating action button</title>
    <desc>One circular primary-create action, bottom-right, 16px above the tab bar.</desc>
    <rect x="304" y="680" width="56" height="56" rx="28" fill="#000" data-interactive="true"/>
    <text x="336" y="720" font-size="24" fill="#fff" stroke="none" text-anchor="middle">+</text>
  </g>
  <g data-region="fab-extended" transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <title>Extended FAB variant</title>
    <desc>The labelled variant for first-run or unfamiliar contexts; collapses to icon-only on scroll.</desc>
    <rect x="16" y="680" width="168" height="56" rx="28" fill="#000" data-interactive="true"/>
    <text x="48" y="712" font-size="14" fill="#fff" stroke="none">+ New deal</text>
  </g>
  <g data-region="tab-bar" transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <title>Bottom tab bar</title>
    <desc>Three destinations; the FAB is offset so it never collides with the bar.</desc>
    <rect x="0" y="752" width="368" height="56" fill="#fff" stroke="#e6e6e6"/>
    <text x="24" y="784" font-size="12" fill="#666" stroke="none">Home</text>
    <text x="160" y="784" font-size="12" fill="#000" stroke="none">Deals</text>
    <text x="288" y="784" font-size="12" fill="#666" stroke="none">You</text>
  </g>
  <g data-region="annotations" transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <title>FAB placement redline</title>
    <desc>The FAB anchors bottom-right, 16px inset, clearing the tab bar; iOS prefers a nav-bar plus instead.</desc>
    <rect x="296" y="672" width="72" height="72" fill="none" stroke="#d33" stroke-dasharray="4 4"/>
    <text x="16" y="664" font-size="12" fill="#d33" stroke="none">FAB: bottom-right, 16px above the tab bar.</text>
  </g>
</svg>
```
