# Settings Page

## When to use
- Grouped configurable preferences (account, workspace, notifications)
- Long, infrequently-edited configuration

## When NOT to use
- 1–2 settings → put inline where the feature is used
- Frequently changed values → don't bury in settings; expose in main UI
- Onboarding-style forms → use [multi-step-form.md](../forms/multi-step-form.md)

## Anatomy
1. [page-header.md](page-header.md): "Settings" title, optional save state
2. [two-column-layout.md](two-column-layout.md): categories rail on left
3. Right pane: section groups
4. Each setting row: label + description + control (input/toggle/select)
5. Save model: per-row inline save OR bottom-sticky "Save changes" bar

## Required states
- view (read-only display)
- with-pending-changes (save bar visible)
- saving
- saved
- with-permission-denied (show why user can't edit)
- with-validation-error

## Best practices
1. Group settings by intent: Profile, Notifications, Security, Billing (G1)
2. Each setting: bold label, muted description below, control on the right (G3)
3. Save model:
   - Toggles save instantly (N1)
   - Forms with multiple fields use a sticky bottom save bar (N3)
   - Mixing the two on one page is OK as long as toggles are clearly auto-saved
4. Show "Saved" toast / inline indicator after instant saves (N1)
5. Destructive settings (delete account, leave workspace) at the bottom, in a separate "Danger zone" group, styled distinctly (N5, G1)
6. Categories rail uses [two-column-layout.md](two-column-layout.md) with sticky positioning
7. Mobile: rail becomes a single back-link or top accordion, keeping category controls in the thumb's reach
8. Search settings (`⌘K`) for products with > 30 settings (N7, F2)

## Common mistakes
- Mixing instant-save and form-save without indication → user can't tell what's persisted (N1)
- Destructive actions mixed with normal settings → accidental clicks (N5, G1)
- Long flat list with no grouping → unscannable (G1, F2)
- No confirmation on destructive (delete account) → catastrophic mistakes (N5)
- Settings hidden 3 levels deep → users can't find them (F2, N6)

## Device variants
- **desktop-web/-app**: two-column with rail
- **mobile**: single column; rail becomes top accordion or category list page

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="1280" height="800" fill="#fff"/>

  <g data-region="page-header" transform="translate(24,32)">
    <title>Page header</title>
    <desc>Settings title above the two-column body.</desc>
    <text x="0" y="24" font-size="28" fill="#000" stroke="none">Settings</text>
  </g>

  <g data-region="rail" transform="translate(24,96)">
    <title>Category rail</title>
    <desc>Settings categories with an active row; danger zone last.</desc>
    <rect x="0" y="0" width="224" height="560" fill="#f4f4f4"/>
    <rect x="8" y="8" width="208" height="40" fill="#000"/>
    <text x="24" y="32" font-size="14" fill="#fff" stroke="none">Profile</text>
    <text x="24" y="88" font-size="14" fill="#000" stroke="none">Notifications</text>
    <text x="24" y="136" font-size="14" fill="#000" stroke="none">Security</text>
    <text x="24" y="184" font-size="14" fill="#000" stroke="none">Billing</text>
    <text x="24" y="232" font-size="14" fill="#666" stroke="none">Danger zone</text>
  </g>

  <g data-region="settings-groups" transform="translate(264,96)">
    <title>Settings groups</title>
    <desc>Grouped setting rows: bold label, muted description, control on the right.</desc>
    <rect x="0" y="0" width="992" height="216" fill="#fff" stroke="#e6e6e6"/>
    <text x="16" y="32" font-size="20" fill="#000" stroke="none">Profile</text>
    <text x="16" y="80" font-size="14" fill="#000" stroke="none">Display name</text>
    <text x="16" y="96" font-size="12" fill="#666" stroke="none">Shown across the workspace.</text>
    <rect x="752" y="64" width="240" height="40" fill="#fff" stroke="#000"/>
    <text x="760" y="88" font-size="14" fill="#666" stroke="none">Maneesh Dhabria</text>
    <line x1="16" y1="128" x2="976" y2="128" stroke="#e6e6e6" stroke-width="1"/>
    <text x="16" y="160" font-size="14" fill="#000" stroke="none">Marketing emails</text>
    <text x="16" y="176" font-size="12" fill="#666" stroke="none">Product updates and tips.</text>
    <rect x="888" y="144" width="104" height="40" fill="#000"/>
    <text x="912" y="168" font-size="14" fill="#fff" stroke="none">On</text>
  </g>

  <g data-region="save-bar" transform="translate(264,336)">
    <title>Save bar</title>
    <desc>Sticky pending-changes bar for multi-field forms.</desc>
    <rect x="0" y="0" width="992" height="56" fill="#fff" stroke="#e6e6e6"/>
    <rect x="768" y="8" width="104" height="40" fill="#fff" stroke="#000"/>
    <text x="784" y="32" font-size="14" fill="#000" stroke="none">Discard</text>
    <rect x="880" y="8" width="112" height="40" fill="#000"/>
    <text x="896" y="32" font-size="14" fill="#fff" stroke="none">Save changes</text>
  </g>

  <g data-region="annotations" transform="translate(24,680)">
    <title>Annotations</title>
    <desc>Design notes for the settings page.</desc>
    <circle cx="16" cy="16" r="16" fill="#d33"/>
    <text x="16" y="24" font-size="14" fill="#fff" stroke="none" text-anchor="middle">1</text>
    <text x="40" y="24" font-size="12" fill="#d33" stroke="none">Toggles auto-save; multi-field forms use the sticky save bar. Danger zone is separated and styled distinctly at the end.</text>
  </g>
</svg>
```
