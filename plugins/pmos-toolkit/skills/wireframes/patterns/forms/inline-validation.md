# Inline Validation

## When to use
- Field-level feedback DURING form entry (not only on submit)
- Fields with strict format requirements (email, password, username availability)
- Forms where errors are common and correctable

## When NOT to use
- Trivial fields ("First name") → submit-time validation is fine
- Single-input forms → submit-time is enough
- Real-time validation that fires on every keystroke for fields without strict format → noisy

## Anatomy
1. Field with input
2. Validation trigger: typically on blur, sometimes on input for special cases (password strength)
3. Error message below the field
4. Error icon inline with the field
5. Optional: success indicator for validated fields (✓)
6. Optional: live requirements list (password strength)

## Required states
- pristine (untouched, no validation yet)
- focused (typing, no errors shown yet)
- valid (passed validation; success affordance)
- invalid (failed validation; error shown)
- pending (async check in flight, e.g., username availability)

## Best practices
1. Validate on blur, not on every keystroke (N1) — keystroke validation is noisy and premature
2. EXCEPT password strength meters and async checks (username availability) — those benefit from live feedback (N1)
3. Clear errors as soon as input becomes valid (N1) — don't make user click out and back
4. Error messages: specific + actionable ("Must be at least 8 characters" not "Invalid") (N9)
5. Use icon + color + text for error — color alone fails colorblind users
6. Mark invalid fields with `aria-invalid="true"` and link error via `aria-describedby`
7. Success indicators (✓) should be optional and subtle — not on every field (N8)
8. On submit, focus the FIRST invalid field and announce errors (N9)

## Common mistakes
- Validating on every keystroke from the first character → "Invalid email" while user types "m" (N1)
- Generic error messages → user can't fix the problem (N9)
- Errors disappear only on submit, not on correction → user can't tell they fixed it (N1)
- Color-only error indication → fails colorblind / low-vision
- Submit button disabled with no explanation → user can't proceed and doesn't know why (N9)
- Errors appear far from the field → user has to hunt for the cause (N9)

## Device variants
- **mobile-web/native**: errors below field; ensure error doesn't push Submit off screen
- **desktop**: errors below or to the right; keep within viewport

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <g data-region="pristine" transform="translate(24,24)">
    <title>Pristine field</title>
    <desc>An untouched password field with the live requirements list not yet satisfied.</desc>
    <text x="0" y="16" font-size="12" fill="#666" stroke="none">Password</text>
    <rect x="0" y="24" width="240" height="40" fill="#fff" stroke="#000"/>
    <text x="0" y="88" font-size="12" fill="#666" stroke="none">o At least 8 characters</text>
    <text x="0" y="112" font-size="12" fill="#666" stroke="none">o One number</text>
    <text x="0" y="136" font-size="12" fill="#666" stroke="none">o One symbol</text>
  </g>
  <g data-region="valid" transform="translate(320,24)">
    <title>Valid field (live feedback)</title>
    <desc>The same field filled; each requirement flips to satisfied as the user types.</desc>
    <text x="0" y="16" font-size="12" fill="#666" stroke="none">Password</text>
    <rect x="0" y="24" width="240" height="40" fill="#fff" stroke="#000"/>
    <text x="8" y="48" font-size="14" fill="#000" stroke="none">hunter2!</text>
    <text x="0" y="88" font-size="12" fill="#000" stroke="none">v At least 8 characters</text>
    <text x="0" y="112" font-size="12" fill="#000" stroke="none">v One number</text>
    <text x="0" y="136" font-size="12" fill="#000" stroke="none">v One symbol</text>
  </g>
  <g data-region="error" transform="translate(640,24)">
    <title>Invalid field</title>
    <desc>A blurred email that failed validation; the error message sits directly below the field.</desc>
    <text x="0" y="16" font-size="12" fill="#666" stroke="none">Email</text>
    <rect x="0" y="24" width="240" height="40" fill="#fff" stroke="#000"/>
    <text x="8" y="48" font-size="14" fill="#000" stroke="none">maneesh@</text>
    <text x="0" y="88" font-size="12" fill="#000" stroke="none">! Email needs a domain (e.g. acme.com)</text>
  </g>
  <g data-region="annotations" transform="translate(640,152)">
    <title>Redline callout</title>
    <desc>The error is conveyed with an icon and text, not colour alone.</desc>
    <text x="0" y="16" font-size="12" fill="#d33" stroke="none">Icon + text, not colour alone.</text>
  </g>
</svg>
```
