# Top Navigation

## When to use
- Primary nav for desktop-web or desktop-app with **5–7 destinations**
- IA is flat or shallow (1–2 levels deep)
- Brand visibility matters (logo on the left)

## When NOT to use
- 8+ destinations → use [side-nav.md](side-nav.md)
- Mobile/native primary nav → use [bottom-tab-bar.md](bottom-tab-bar.md)
- Single-screen tool with no navigation → omit entirely

## Anatomy
1. Logo / wordmark (left, links to home)
2. Primary destinations (center or left-aligned)
3. Utility actions: search, notifications, account menu (right)
4. Active-state indicator on the current destination

## Required states
- default
- with-active-item (one destination highlighted)
- mobile-collapsed (links hidden behind hamburger; see [hamburger-menu.md](hamburger-menu.md))
- with-notification-badge

## Best practices
1. Use real labels, not icons alone (N2, N6) — icons require recall, not recognition
2. Mark the active destination with both color AND a non-color cue like a bottom border
3. Account menu collapses to a single avatar/button (F2) — never expose 5 utility links
4. Keep total height ≤ 64px desktop, 56px mobile (G4) — nav is chrome, not content
5. Logo is always a link to `/` (N4) — universal convention
6. Sticky on scroll only if the nav contains frequently-needed actions; otherwise let it scroll away (N8)
7. Tab order goes logo → destinations → utilities

## Common mistakes
- 10+ destinations crammed in → exceeds Hick's Law (F2). Group into a side nav or mega-menu.
- Icon-only destinations on desktop → fails recognition (N6). Add text labels.
- Active state shown only via color → fails colorblind users. Add weight + underline.
- Hamburger on desktop with plenty of space → hides primary nav unnecessarily (N6).
- Logo not clickable → violates universal convention (N4).

## Device variants
- **mobile-web**: collapse destinations behind hamburger; keep logo + 1 utility (search or account) visible
- **desktop-web/-app**: full destinations visible
- **android-app/ios-app**: prefer [bottom-tab-bar.md](bottom-tab-bar.md) instead; top nav reserved for screen titles

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <g data-region="primary-nav">
    <title>Primary navigation</title>
    <desc>Top app bar: logo on the left, destination links with the active item underlined.</desc>
    <rect x="0" y="0" width="1280" height="56" fill="#fff" stroke="#e6e6e6"/>
    <text x="24" y="32" font-size="20" fill="#000" stroke="none">Acme</text>
    <text x="160" y="32" font-size="14" fill="#000" stroke="none">Dashboard</text>
    <text x="288" y="32" font-size="14" fill="#666" stroke="none">Pipelines</text>
    <text x="408" y="32" font-size="14" fill="#666" stroke="none">Reports</text>
    <text x="512" y="32" font-size="14" fill="#666" stroke="none">Team</text>
    <rect x="160" y="48" width="80" height="8" fill="#000"/>
  </g>
  <g data-region="utilities">
    <title>Utility actions</title>
    <desc>Search field, notification button with unread badge, and account menu on the right.</desc>
    <rect x="848" y="8" width="240" height="40" fill="#fff" stroke="#000"/>
    <text x="856" y="32" font-size="14" fill="#666" stroke="none">Search…</text>
    <rect x="1104" y="8" width="40" height="40" fill="#e6e6e6"/>
    <circle cx="1144" cy="8" r="8" fill="#000"/>
    <text x="1144" y="16" font-size="12" fill="#fff" stroke="none" text-anchor="middle">3</text>
    <rect x="1152" y="8" width="40" height="40" fill="#e6e6e6"/>
    <text x="1160" y="32" font-size="14" fill="#000" stroke="none">MD</text>
  </g>
  <g data-region="annotations" transform="translate(24,80)">
    <title>Annotations</title>
    <desc>Design notes for the top navigation.</desc>
    <circle cx="16" cy="16" r="16" fill="#d33"/>
    <text x="16" y="24" font-size="14" fill="#fff" stroke="none" text-anchor="middle">1</text>
    <text x="48" y="24" font-size="12" fill="#d33" stroke="none">Active destination marked with an underline, not colour alone.</text>
  </g>
</svg>
```
