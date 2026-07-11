# Side Navigation

## When to use
- Apps with **8+ destinations** or hierarchical IA (sections containing pages)
- Productivity / admin tools where users spend long sessions
- Desktop-first products

## When NOT to use
- Marketing/content sites → use [top-nav.md](top-nav.md)
- Mobile primary → use [bottom-tab-bar.md](bottom-tab-bar.md) or hamburger drawer
- < 5 destinations → top-nav is lighter

## Anatomy
1. Brand / workspace selector (top)
2. Primary destination groups with section headers
3. Active-item highlight (full-width pill or left border)
4. Collapse/expand toggle (optional, persists per user)
5. Footer: account, help, settings (bottom)

## Required states
- default expanded
- collapsed (icons only)
- with-active-item
- with-nested-group (expanded section)
- with-nested-group (collapsed section)

## Best practices
1. Group related destinations with bold section headers (G3) — flat lists of 12+ are unscannable
2. Active item uses fill + weight, not just color
3. Icons + labels by default; collapsed state shows icons with tooltips (N6, N10)
4. Nested groups: max 1 level deep (F2) — deeper trees lose users
5. Keep width 240–280 px expanded, 64 px collapsed (G4)
6. Workspace switcher pinned at top, account at bottom — universal in productivity tools (N4)
7. Persist collapse state across sessions (N7)

## Common mistakes
- 3+ levels of nested groups → users lose track of where they are. Promote frequent destinations to top level.
- Icons without tooltips when collapsed → fails recognition (N6)
- Active state only changes text color → hard to distinguish at a glance
- No section headers in a 15-item list → cognitive overload (F2)
- Side nav on mobile → wastes 30% of viewport. Convert to drawer.

## Device variants
- **desktop-web/-app**: persistent, collapsible
- **mobile-web**: convert to slide-in drawer triggered by hamburger
- **native**: prefer bottom-tab-bar; side-nav only as drawer

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <g data-region="primary-nav">
    <title>Primary navigation</title>
    <desc>Persistent left side navigation with a workspace selector, grouped destinations, and one active item.</desc>
    <rect x="0" y="0" width="256" height="800" fill="#fff" stroke="#e6e6e6"/>
    <rect x="16" y="16" width="224" height="40" fill="#f4f4f4" stroke="#e6e6e6"/>
    <text x="24" y="40" font-size="14" fill="#000" stroke="none">Acme Workspace ▾</text>
    <line x1="0" y1="72" x2="256" y2="72" stroke="#e6e6e6" stroke-width="1"/>
    <text x="16" y="104" font-size="12" fill="#666" stroke="none">WORKSPACE</text>
    <rect x="8" y="112" width="240" height="48" fill="#000"/>
    <text x="24" y="144" font-size="14" fill="#fff" stroke="none">Dashboard</text>
    <text x="24" y="192" font-size="14" fill="#000" stroke="none">Pipelines</text>
    <text x="24" y="240" font-size="14" fill="#000" stroke="none">Deployments</text>
    <text x="16" y="288" font-size="12" fill="#666" stroke="none">TEAM</text>
    <text x="24" y="328" font-size="14" fill="#000" stroke="none">Members</text>
    <text x="24" y="376" font-size="14" fill="#000" stroke="none">Roles</text>
  </g>
  <g data-region="account-footer">
    <title>Account footer</title>
    <desc>Account avatar and name pinned to the bottom of the side navigation.</desc>
    <line x1="0" y1="728" x2="256" y2="728" stroke="#e6e6e6" stroke-width="1"/>
    <rect x="8" y="744" width="40" height="40" fill="#e6e6e6"/>
    <text x="56" y="768" font-size="14" fill="#666" stroke="none">Maneesh</text>
  </g>
  <g data-region="annotations" transform="translate(280,112)">
    <title>Annotations</title>
    <desc>Design notes for the side navigation.</desc>
    <circle cx="16" cy="16" r="16" fill="#d33"/>
    <text x="16" y="24" font-size="14" fill="#fff" stroke="none" text-anchor="middle">1</text>
    <text x="48" y="24" font-size="12" fill="#d33" stroke="none">Active item uses a filled pill, not colour alone.</text>
  </g>
</svg>
```
