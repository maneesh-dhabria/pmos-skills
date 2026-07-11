# Bottom Tab Bar

## When to use
- Mobile/native primary navigation, **3–5 destinations**
- Destinations are peer-level (none is parent of another)
- Users switch between them frequently

## When NOT to use
- Desktop → use [top-nav.md](top-nav.md) or [side-nav.md](side-nav.md)
- 6+ destinations → use side drawer or grouped nav
- Hierarchical IA → bottom bar implies peers

## Anatomy
1. 3–5 tab buttons, equal width
2. Each tab: icon + label (label is mandatory)
3. Active-tab indicator (color + weight, plus filled icon variant)
4. Optional: badge on tabs with unread/pending state

## Required states
- default
- with-active-tab (one selected)
- with-badge (notification count on a tab)
- pressed (touch feedback)

## Best practices
1. Always show labels — icon-only fails recognition for non-experts (N6, N2)
2. Active tab: filled icon + accent color + weight (G2)
3. Primary actions are large and easy to hit; keep destinations comfortably tappable (F1)
4. Bottom nav sits at the base of the screen with 3–5 equal-width destinations (F2) — more than five crowds the labels
5. Never put the FAB IN the tab bar — overlap with [fab.md](fab.md), don't merge
6. Tab order matches information importance, not alphabetical (N4)
7. Tapping the active tab scrolls to top of that section (N7) — established convention

## Common mistakes
- Only 2 tabs → use [tabs.md](tabs.md) inside a screen instead
- 6+ tabs → forces tiny targets and crowds labels (F1, F2). Group into a "More" tab or switch to drawer.
- Icon-only → fails recognition (N6)
- Hides on scroll → users lose orientation; only acceptable in immersive views like maps/video
- Used on desktop → wastes vertical space and feels like a mobile port

## Device variants
- **ios-app**: SF Symbols, label below icon, blur background
- **android-app**: Material icons, label below icon, elevated surface
- **mobile-web**: similar to android, slightly looser proportions

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="375" height="812" viewBox="0 0 375 812" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <g data-region="tab-bar">
    <title>Bottom tab bar</title>
    <desc>Fixed bottom navigation bar with four equal-width destinations at the base of the screen.</desc>
    <rect x="0" y="744" width="368" height="64" fill="#fff" stroke="#e6e6e6"/>
  </g>
  <g data-region="tabs">
    <title>Tab destinations</title>
    <desc>Home (active), Search, Inbox with an unread badge, and Profile — each an icon above a text label.</desc>
    <rect data-interactive="true" x="8" y="744" width="88" height="64" fill="none"/>
    <rect x="8" y="744" width="88" height="8" fill="#000"/>
    <rect x="40" y="760" width="24" height="24" fill="#000"/>
    <text x="24" y="800" font-size="12" fill="#000" stroke="none">Home</text>
    <rect data-interactive="true" x="96" y="744" width="88" height="64" fill="none"/>
    <rect x="128" y="760" width="24" height="24" fill="#666"/>
    <text x="112" y="800" font-size="12" fill="#666" stroke="none">Search</text>
    <rect data-interactive="true" x="184" y="744" width="88" height="64" fill="none"/>
    <rect x="216" y="760" width="24" height="24" fill="#666"/>
    <circle cx="248" cy="760" r="8" fill="#000"/>
    <text x="248" y="768" font-size="12" fill="#fff" stroke="none" text-anchor="middle">3</text>
    <text x="200" y="800" font-size="12" fill="#666" stroke="none">Inbox</text>
    <rect data-interactive="true" x="272" y="744" width="88" height="64" fill="none"/>
    <rect x="304" y="760" width="24" height="24" fill="#666"/>
    <text x="288" y="800" font-size="12" fill="#666" stroke="none">Profile</text>
  </g>
  <g data-region="annotations" transform="translate(16,656)">
    <title>Annotations</title>
    <desc>Design notes for the bottom tab bar.</desc>
    <circle cx="16" cy="16" r="16" fill="#d33"/>
    <text x="16" y="24" font-size="14" fill="#fff" stroke="none" text-anchor="middle">1</text>
    <text x="48" y="24" font-size="12" fill="#d33" stroke="none">Every tab shows a text label; the active tab adds a top bar and a filled icon.</text>
  </g>
</svg>
```
