# Primary CTA

## When to use
- The single most important action on a screen
- "Save", "Submit", "Buy now", "Send", "Continue"

## When NOT to use
- Equal-weight peer actions → [button-group.md](button-group.md)
- Many secondary actions → [dropdown-menu.md](dropdown-menu.md)
- Floating creation action on mobile → [fab.md](fab.md)

## Anatomy
1. Single visually dominant button
2. Action verb as label
3. Optional: leading icon
4. Optional: shortcut hint (`⌘ + Enter`)

## Required states
- default
- hover
- focus (keyboard)
- pressed
- loading (spinner inside button, label changes to "Saving…")
- disabled (with reason if not obvious)
- success (brief; reverts after a moment)

## Best practices
1. ONE primary per logical section (G3) — multiple primaries dilute meaning
2. Label is a verb-noun: "Save changes", "Send invite" (N2) — not "OK"
3. Position: footer-right in dialogs, top-right or bottom-right in pages (N4) — depends on platform convention
4. Accent color fill, white text (G3)
5. Disabled state explains why ("Required fields missing") via tooltip or helper text (N9)
6. Loading: change label to gerund ("Saving…") and show spinner; don't disable text completely (N1)
7. Touch target ≥ 44 px tall on mobile (F1)
8. Keyboard activation via Enter/Space; don't use only mouse handlers

## Common mistakes
- 3 "primary" buttons on one screen → none feels primary (G3)
- "OK" / "Submit" → vague (N2)
- Disabled with no explanation → user confused (N9)
- Loading state vanishes the label → user can't tell what's happening (N1)
- Tiny CTA on a marketing page → conversion killer (F1)

## Device variants
- **desktop**: typical 36–40 px height
- **mobile/native**: ≥ 44 px height; consider full-width sticky CTA at bottom for primary actions
- **ios-app**: rounded rect, system tint
- **android-app**: Material elevated or filled button

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <g data-region="default-cta" transform="translate(48,48)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <title>Default primary CTA</title>
    <desc>The single dominant action — a filled ink button carrying a verb-noun label.</desc>
    <rect x="0" y="0" width="160" height="48" fill="#000" data-interactive="true"/>
    <text x="24" y="32" font-size="14" fill="#fff" stroke="none">Save changes</text>
  </g>
  <g data-region="loading-cta" transform="translate(48,144)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <title>Loading state</title>
    <desc>The label becomes a gerund and a spinner sits inside; the button never empties its label.</desc>
    <rect x="0" y="0" width="160" height="48" fill="#000" data-interactive="true"/>
    <circle cx="24" cy="24" r="8" fill="#fff"/>
    <text x="48" y="32" font-size="14" fill="#fff" stroke="none">Saving…</text>
  </g>
  <g data-region="shortcut-hint" transform="translate(48,240)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <title>Shortcut hint</title>
    <desc>An optional keyboard-shortcut pill follows the label inside the button.</desc>
    <rect x="0" y="0" width="160" height="48" fill="#000" data-interactive="true"/>
    <text x="24" y="32" font-size="14" fill="#fff" stroke="none">Send</text>
    <rect x="96" y="8" width="56" height="32" fill="#666"/>
    <text x="104" y="32" font-size="12" fill="#fff" stroke="none">⌘↵</text>
  </g>
  <g data-region="disabled-cta" transform="translate(48,336)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <title>Disabled state with reason</title>
    <desc>A muted, non-actionable button paired with helper text explaining why it is disabled.</desc>
    <rect x="0" y="0" width="160" height="48" fill="#e6e6e6"/>
    <text x="24" y="32" font-size="14" fill="#666" stroke="none">Save changes</text>
    <text x="0" y="80" font-size="12" fill="#666" stroke="none">Add a project name to enable saving.</text>
  </g>
</svg>
```
