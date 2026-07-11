# Textarea

## When to use
- Multi-line free text: comments, descriptions, messages, bios
- Expected input ≥ 2 lines

## When NOT to use
- Single line → [text-input.md](text-input.md)
- Rich-text editing (formatting, links, images) → use a rich-text editor pattern (out of scope for wireframes; show as `<div class="placeholder">Rich-text editor</div>`)
- Code → use a code-editor pattern with monospace font

## Anatomy
1. Visible label above
2. Textarea field, rows attribute set to expected size (3–5 typical)
3. Optional: character counter (esp. for tweets, SMS, bios)
4. Optional: resize handle (browser default)
5. Helper text or error message slot

## Required states
- default (empty)
- focused
- filled
- disabled
- error (with message)
- near-limit (counter approaching max)
- over-limit (counter past max, error styling)

## Best practices
1. Set `rows` to a sensible default (3–5) (N7) — don't force users to resize before typing
2. Allow vertical resize, lock horizontal (browser default; preserve it)
3. Character counter: visible from the start if there's a limit; turns warning color at 90% (N1)
4. Don't enforce max-length silently — show counter so user can see they're being cut off (N9)
5. Show errors below the field, not as tooltips
6. Use `aria-describedby` to link counter and error to the field
7. For long-form content, save drafts on blur (N3)

## Common mistakes
- Single-row textarea (looks like a text input) → users confused about expected length (N2)
- No counter on length-limited input → user hits limit mid-sentence with no warning (N1)
- Disable Submit when over limit without telling user → user hunts for the cause (N9)
- Auto-grow that pushes UI down causing layout shift → jarring (N4)
- No way to expand → limits long content unnecessarily

## Device variants
- **mobile-web/native**: increase rows to 4–5; resize handle disabled (use auto-grow instead)
- **desktop**: 3–4 rows default with manual resize allowed

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <g data-region="textarea" transform="translate(24,24)">
    <title>Multi-line textarea</title>
    <desc>A labelled textarea sized for several rows, with a helper note and character counter beneath.</desc>
    <text x="0" y="16" font-size="12" fill="#666" stroke="none">Message</text>
    <rect x="0" y="24" width="600" height="120" fill="#fff" stroke="#000"/>
    <text x="8" y="48" font-size="14" fill="#666" stroke="none">What changed in this release?</text>
    <text x="0" y="168" font-size="12" fill="#666" stroke="none">Markdown supported</text>
    <text x="520" y="168" font-size="12" fill="#666" stroke="none">0 / 500</text>
  </g>
  <g data-region="annotations" transform="translate(640,24)">
    <title>Counter callout</title>
    <desc>The counter is visible from the start and turns to a warning near the limit.</desc>
    <text x="0" y="168" font-size="12" fill="#d33" stroke="none">Counter warns at 90% of the limit.</text>
  </g>
</svg>
```
