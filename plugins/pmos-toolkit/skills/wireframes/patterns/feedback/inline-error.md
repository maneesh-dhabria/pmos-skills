# Inline Error

## When to use
- Field-scoped error feedback (form validation)
- Errors localized to a specific element / control

## When NOT to use
- Page-level errors → [banner.md](banner.md)
- Whole-screen failures → [error-state.md](error-state.md)
- Transient action errors → [toast.md](toast.md)

## Anatomy
1. Field with error styling (red border)
2. Error icon
3. Error message DIRECTLY below the field
4. ARIA association via `aria-describedby` and `aria-invalid="true"`

## Required states
- field-with-single-error
- field-with-multiple-errors (rare; usually pick the most actionable one)
- error-cleared (success or back to default)

## Best practices
1. Place error directly below the field, not at the top of the form (N9) — connect cause to effect
2. Specific + actionable: "Email must include @" not "Invalid" (N9)
3. Don't repeat the field name — user already knows ("Email is required" → "Required")
4. Icon + color + text
5. `aria-invalid="true"` on field; `aria-describedby` linking to error message id
6. Clear the error as soon as input becomes valid (N1) — don't wait for blur
7. On submit failure, focus the FIRST invalid field and announce summary at top
8. Don't shake/animate aggressively — distracting (N8)

## Common mistakes
- "Invalid email" → user already knew; what's invalid? (N9)
- Errors only at top of page → user has to find which field (N9)
- Color-only indication → fails colorblind
- Error persists after correction → user thinks it's still broken (N1)
- Showing all 5 errors at once on a single field → overwhelming. Pick most actionable.

## Device variants
- **desktop / mobile**: error directly below field
- **mobile**: ensure error doesn't push the next field below the keyboard fold

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="1280" height="800" fill="#fff"/>
  <g data-region="app-bar">
    <title>App bar</title><desc>Page chrome above the form.</desc>
    <rect x="0" y="0" width="1280" height="56" fill="#fff" stroke="#e6e6e6"/>
    <text x="24" y="32" font-size="20" fill="#000" stroke="none">New deal</text>
  </g>
  <g data-region="field-with-error">
    <title>Email field (error)</title><desc>Text input in its error state with the specific, actionable message directly below it.</desc>
    <text x="440" y="280" font-size="12" fill="#666" stroke="none">Email</text>
    <rect x="440" y="288" width="400" height="40" fill="#fff" stroke="#000"/>
    <text x="448" y="312" font-size="14" fill="#000" stroke="none">maneesh@</text>
    <text x="440" y="352" font-size="12" fill="#666" stroke="none">⚠  Email needs a domain (e.g. acme.com)</text>
  </g>
  <g data-region="annotations">
    <title>Annotations</title><desc>Design notes on where and how the error is surfaced.</desc>
    <rect x="432" y="264" width="416" height="96" fill="none" stroke="#d33" stroke-dasharray="4 4"/>
    <text x="432" y="392" font-size="12" fill="#d33" stroke="none">Error sits directly below the field — specific and actionable, not "Invalid". In hi-fi the field border and message turn red.</text>
  </g>
</svg>
```
