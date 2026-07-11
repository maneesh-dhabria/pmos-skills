# Toast (Snackbar)

## When to use
- Transient confirmation of an action: "Saved", "Copied", "Sent"
- Non-blocking feedback that doesn't require user response
- Brief notifications that auto-dismiss

## When NOT to use
- Errors that block progress → [inline-error.md](inline-error.md) or [modal.md](modal.md)
- Critical info user MUST see → [banner.md](banner.md)
- Confirming destructive actions BEFORE they happen → [confirmation-dialog.md](confirmation-dialog.md)

## Anatomy
1. Container (corner of viewport, typically bottom-right or top)
2. Icon (success / info / warning / error)
3. Message (concise, past-tense for confirmations)
4. Optional: action button ("Undo", "View")
5. Auto-dismiss timer (3–5 seconds typical)
6. Close affordance for screen reader / keyboard users

## Required states
- success
- info
- warning
- error
- with-action ("Undo")
- stacked (multiple toasts)
- pinned (action present, doesn't auto-dismiss)

## Best practices
1. Position consistently — pick top OR bottom and stick (N4)
2. Auto-dismiss in 4–6 seconds; pause on hover/focus (N1)
3. If toast has an action ("Undo"), DON'T auto-dismiss until user dismisses or acts (N3)
4. Stack vertically with newest at edge (top of stack on bottom-positioned, etc.) (N4)
5. Keep message ≤ 1 line (≤ 60 chars) (G4)
6. Use `role="status"` for non-urgent and `role="alert"` for errors
7. Icon + color + text — never color alone
8. Close button for keyboard / screen-reader users
9. Don't use for important info — toasts disappear (N1, N9)

## Common mistakes
- Toasts for critical errors → user might miss them (N9)
- Auto-dismiss too fast (< 3s) → user can't read (N1)
- Auto-dismiss while pointing at "Undo" button → action lost (N3)
- 5+ toasts stacked → overload (F2)
- No close button → fails keyboard users
- Toasts that block content → defeats their purpose (N3)

## Device variants
- **desktop-web/-app**: bottom-right corner; offset from viewport edge
- **mobile-web**: bottom of viewport, full-width; respect safe-area
- **ios-app**: top, banner-style
- **android-app**: bottom snackbar (Material spec)

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="1280" height="800" fill="#fff"/>
  <g data-region="app-bar">
    <title>App bar</title><desc>Top navigation of the deals screen the toast overlays.</desc>
    <rect x="0" y="0" width="1280" height="56" fill="#fff" stroke="#e6e6e6"/>
    <text x="24" y="32" font-size="20" fill="#000" stroke="none">Deals</text>
  </g>
  <g data-region="content">
    <title>Page content</title><desc>The underlying working surface; the toast is non-blocking and does not cover it.</desc>
    <rect x="24" y="80" width="1232" height="640" fill="#f4f4f4"/>
  </g>
  <g data-region="toast-stack">
    <title>Toast stack</title><desc>Transient confirmations stacked bottom-right, newest on top.</desc>
    <rect x="936" y="680" width="320" height="48" fill="#000"/>
    <text x="952" y="712" font-size="14" fill="#fff" stroke="none">Deal saved</text>
    <text x="1200" y="712" font-size="14" fill="#fff" stroke="none">Undo</text>
    <rect x="936" y="736" width="320" height="48" fill="#000"/>
    <text x="952" y="768" font-size="14" fill="#fff" stroke="none">Couldn't connect to server</text>
    <text x="1200" y="768" font-size="14" fill="#fff" stroke="none">Retry</text>
  </g>
  <g data-region="annotations">
    <title>Annotations</title><desc>Design notes on toast dismissal behaviour.</desc>
    <rect x="904" y="672" width="360" height="120" fill="none" stroke="#d33" stroke-dasharray="4 4"/>
    <text x="904" y="656" font-size="12" fill="#d33" stroke="none">Success toast auto-dismisses in 4–6s; a toast with "Undo" stays until acted on.</text>
  </g>
</svg>
```
