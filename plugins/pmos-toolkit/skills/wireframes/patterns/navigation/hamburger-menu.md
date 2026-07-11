# Hamburger Menu

## When to use
- Mobile primary nav when there's no room for a bottom-tab-bar AND destinations are infrequent
- Desktop **secondary/overflow** menu only
- Sites where nav is rarely the user's reason for being there (content sites, marketing)

## When NOT to use
- Mobile primary nav for an app users use daily → [bottom-tab-bar.md](bottom-tab-bar.md) is better (visible > hidden)
- Desktop primary nav with screen real estate → [top-nav.md](top-nav.md) or [side-nav.md](side-nav.md). Hamburger on desktop hides nav unnecessarily.

## Anatomy
1. Trigger button (the three-line icon, labeled "Menu" for accessibility)
2. Drawer / overlay panel that slides in
3. Destination list inside the drawer
4. Close affordance (X button + tap-outside + Esc key)
5. Scrim/overlay behind drawer

## Required states
- default (closed)
- open (drawer visible)
- with-active-item
- nested-section-expanded (if hierarchical)

## Best practices
1. Always pair the icon with the word "Menu" or `aria-label="Menu"` (N6)
2. Drawer slides from the same side every time (N4) — left for LTR languages
3. Tap-outside, Esc, AND visible X button all close it (N3)
4. Trap focus inside the drawer when open
5. Animate in 200–300 ms — instant feels jarring, longer feels sluggish
6. Width: ~80% of viewport on mobile, 280–320 px on desktop overflow
7. Background scrim at ~50% opacity dark — dims context without losing it (G4)

## Common mistakes
- Three-line icon with no label → many users (especially older / less digital-native) don't recognize it (N6)
- No way to close except tap-outside → keyboard users locked out
- Hides destinations users need on every visit → recognition over recall fails (N6). Use bottom-tab-bar instead.
- Drawer covers entire screen → users lose orientation. Leave a 10–20% peek of the underlying content.
- Animation > 400 ms → feels slow

## Device variants
- **mobile-web**: full-height left drawer, ~80% width
- **desktop-web/-app**: only as overflow ("more options"), never as primary nav
- **native**: prefer system drawer patterns (Material navigation drawer, iOS sheet)

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <g data-region="app-bar">
    <title>App bar</title>
    <desc>Top bar with the hamburger trigger (expanded) and the brand wordmark.</desc>
    <rect x="0" y="0" width="1280" height="56" fill="#fff" stroke="#e6e6e6"/>
    <rect x="24" y="8" width="40" height="40" fill="#e6e6e6"/>
    <line x1="32" y1="24" x2="56" y2="24" stroke="#000" stroke-width="2"/>
    <line x1="32" y1="32" x2="56" y2="32" stroke="#000" stroke-width="2"/>
    <line x1="32" y1="40" x2="56" y2="40" stroke="#000" stroke-width="2"/>
    <text x="80" y="32" font-size="20" fill="#000" stroke="none">Acme</text>
  </g>
  <g data-region="drawer">
    <title>Navigation drawer</title>
    <desc>Slide-in panel listing the primary destinations, with a close control in its header.</desc>
    <rect x="0" y="56" width="320" height="744" fill="#fff" stroke="#e6e6e6"/>
    <text x="24" y="96" font-size="20" fill="#000" stroke="none">Menu</text>
    <line x1="264" y1="80" x2="288" y2="104" stroke="#000" stroke-width="2"/>
    <line x1="288" y1="80" x2="264" y2="104" stroke="#000" stroke-width="2"/>
    <line x1="0" y1="120" x2="320" y2="120" stroke="#e6e6e6" stroke-width="1"/>
    <text x="24" y="168" font-size="14" fill="#000" stroke="none">Dashboard</text>
    <text x="24" y="216" font-size="14" fill="#000" stroke="none">Pipelines</text>
    <text x="24" y="264" font-size="14" fill="#000" stroke="none">Reports</text>
  </g>
  <g data-region="scrim">
    <title>Scrim</title>
    <desc>Dimmed backdrop over the page behind the open drawer; tapping it closes the drawer.</desc>
    <rect x="320" y="56" width="960" height="744" fill="#f4f4f4"/>
  </g>
  <g data-region="annotations" transform="translate(352,120)">
    <title>Annotations</title>
    <desc>Design notes for the hamburger menu.</desc>
    <circle cx="16" cy="16" r="16" fill="#d33"/>
    <text x="16" y="24" font-size="14" fill="#fff" stroke="none" text-anchor="middle">1</text>
    <text x="48" y="24" font-size="12" fill="#d33" stroke="none">Scrim dims the page; tap it, press Esc, or use the ✕ to close the drawer.</text>
  </g>
</svg>
```
