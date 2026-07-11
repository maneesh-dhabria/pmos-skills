# Tooltip

## When to use
- Brief supplementary info on hover or focus (≤ 1 sentence)
- Explaining icon-only buttons
- Showing full text of truncated content
- Keyboard shortcut hints

## When NOT to use
- Critical info user MUST see → use [banner.md](../feedback/banner.md) or visible helper text
- Form-field help → use inline helper text below the field
- Long explanations → use a popover or "Learn more" link
- On touch-only surfaces (no hover) → tooltips don't trigger; use a `?` button + popover instead

## Anatomy
1. Small floating panel near the trigger
2. Short text (≤ 80 chars / one sentence)
3. Pointer/arrow indicating the trigger
4. Trigger: an element with `aria-describedby` or a `?` icon

## Required states
- closed
- open (hover / focus)
- pressed (touch — usually doesn't show; consider popover instead)

## Best practices
1. Show on hover AND on keyboard focus
2. Delay opening by ~300–500 ms — prevents tooltip storm on fast mouse movement (N8)
3. Hide on Esc, on blur, on mouseout (N3)
4. Position adaptively — flip if no room (N4)
5. ARIA: tooltip content has `role="tooltip"`, trigger uses `aria-describedby` pointing to it
6. Don't put interactive elements in tooltips — they disappear on hover-out (N3)
7. Touch fallback: tooltip turns into a popover on tap, with explicit close — tooltips have no hover trigger on touch surfaces
8. Never use tooltip for the ONLY explanation of an icon-only button — also use a visible label or screen-reader text

## Common mistakes
- Tooltip is the only explanation of an icon → fails touch users and screen readers
- Long paragraphs in tooltip → use a popover (N8)
- Interactive content (buttons, links) inside → unreachable (N3)
- Tooltip covers the trigger → user can't see what they're hovering
- Instant open with no delay → flickers as user crosses hover targets

## Device variants
- **desktop**: hover/focus tooltips
- **mobile/native**: tooltips don't work (no hover); use "?" icon → popover or [banner.md](../feedback/banner.md)

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="40" viewBox="0 0 160 40" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <g data-region="tooltip" transform="translate(0,0)">
    <title>Tooltip</title>
    <desc>A small floating panel with a short text hint and a downward caret pointing at its trigger.</desc>
    <rect x="0" y="0" width="160" height="32" fill="#000"/>
    <text x="8" y="24" font-size="12" fill="#fff" stroke="none">Copy to clipboard</text>
    <path d="M16 32 L24 40 L32 32 Z" fill="#000"/>
  </g>
</svg>
```
