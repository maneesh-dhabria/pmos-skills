# Text Input

## When to use
- Single-line free-text entry: name, email, search query, URL, short codes

## When NOT to use
- ≥ 2 lines expected → [textarea.md](textarea.md)
- Choosing from known options → [select-dropdown.md](select-dropdown.md)
- Dates → [date-picker.md](date-picker.md)
- Search with results → [search.md](search.md)

## Anatomy
1. Visible label above the input
2. Input field
3. Optional: helper text below the input
4. Optional: prefix/suffix icon (e.g., `$` for currency, magnifier for search)
5. Optional: character counter for length-limited fields
6. Error message slot (replaces helper text on error)

## Required states
- default (empty)
- focused
- filled (with content)
- disabled
- read-only
- error (with message)
- success (rare; only when explicit confirmation matters)

## Best practices
1. **Always use a visible label above the field** (N6) — placeholder-as-label fails screen readers and disappears on input
2. Use `type="email"`, `type="tel"`, `type="url"` — triggers correct mobile keyboard (N7)
3. Use `autocomplete` attributes (`name`, `email`, `tel`) — saves user effort (N7)
4. Field width should hint at expected length: zip = narrow, email = wide (N2)
5. Error messages: specific + actionable ("Email must include @" not "Invalid input") (N9)
6. Required fields marked with `*` AND `aria-required="true"` — never rely on color alone
7. Don't disable Submit until valid; let user submit and show errors → faster correction loop
8. Touch targets ≥ 44 px tall on mobile (F1)
9. Error state shown with icon + color + text, not color alone (N9)

## Common mistakes
- Placeholder used as the only label → no visible label, recall over recognition (N6)
- Generic error "Invalid input" → user has no idea what to fix (N9)
- Centered placeholder text → makes empty fields look filled
- Required marked only by color → colorblind users miss it
- All caps labels → harder to read, not impressive (G3)
- Inputs that auto-format aggressively (e.g., trimming hyphens user typed) without showing what happened → confusing

## Device variants
- **mobile-web/native**: ≥ 44 px height, large tap area; correct keyboard via type/inputmode
- **desktop**: 36–40 px height typical
- **ios-app**: native input picks up system styling; respect Dynamic Type
- **android-app**: Material outlined or filled style

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <g data-region="default" transform="translate(24,24)">
    <title>Default text input</title>
    <desc>A labelled single-line email field with helper text below.</desc>
    <text x="0" y="16" font-size="12" fill="#666" stroke="none">Email *</text>
    <rect x="0" y="24" width="240" height="40" fill="#fff" stroke="#000"/>
    <text x="8" y="48" font-size="14" fill="#666" stroke="none">you@company.com</text>
    <text x="0" y="88" font-size="12" fill="#666" stroke="none">We'll send confirmation here.</text>
  </g>
  <g data-region="error" transform="translate(24,160)">
    <title>Error state</title>
    <desc>The same field with an invalid value; the error message replaces the helper text.</desc>
    <text x="0" y="16" font-size="12" fill="#666" stroke="none">Email *</text>
    <rect x="0" y="24" width="240" height="40" fill="#fff" stroke="#000"/>
    <text x="8" y="48" font-size="14" fill="#000" stroke="none">maneesh@</text>
    <text x="0" y="88" font-size="12" fill="#000" stroke="none">! Email must include a domain (e.g. acme.com)</text>
  </g>
  <g data-region="annotations" transform="translate(320,160)">
    <title>Redline callout</title>
    <desc>Error is shown with icon + text, never colour alone.</desc>
    <rect x="0" y="24" width="240" height="40" fill="none" stroke="#d33" stroke-dasharray="4 4"/>
    <text x="0" y="88" font-size="12" fill="#d33" stroke="none">Icon + text, not colour alone.</text>
  </g>
</svg>
```
