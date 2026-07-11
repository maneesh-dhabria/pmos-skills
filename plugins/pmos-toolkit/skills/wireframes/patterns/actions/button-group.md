# Button Group

## When to use
- Related actions (Cancel + Save, Back + Next)
- Mutually exclusive choices (segmented control)
- 2–4 peer actions

## When NOT to use
- One dominant action → [primary-cta.md](primary-cta.md)
- 5+ actions → [dropdown-menu.md](dropdown-menu.md) or split into groups
- Toggle on/off → use a switch / toggle pattern

## Anatomy
1. Container (flex row, sometimes vertical)
2. 2–4 buttons, one styled as primary
3. Optional: separator/divider for segmented control variant

## Required states
- default
- with-one-loading (e.g., Save in progress)
- one-disabled
- segmented-with-selected
- mobile-stacked-vertical

## Best practices
1. ONE primary in a group; rest are secondary/tertiary (G3)
2. Order matters by platform:
   - Web/Material/Android: Cancel left, primary right (N4)
   - iOS: Cancel left, primary right OR primary in nav bar
3. Equal heights (G2)
4. Consistent spacing between buttons (G4)
5. On mobile narrow: stack vertically with primary on top OR bottom (test both)
6. Segmented control: equal-width children, current state visually filled (G2)
7. Don't mix button sizes within a group (G2)

## Common mistakes
- Two primaries → user can't tell which is the right answer (G3)
- Primary on left, Cancel on right (against convention) → users mis-click (N4)
- Different heights/sizes → looks broken (G2)
- 6 buttons in a row → overflow on narrow viewports (G4)
- Segmented control with 5+ segments → labels truncate (F2)

## Device variants
- **desktop**: horizontal row
- **mobile narrow**: stack vertically; primary on top (saves a thumb-stretch)
- **ios-app**: prefer segmented control for mutually exclusive
- **android-app**: Material chip group or button group

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <g data-region="cancel-save" transform="translate(48,48)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <title>Cancel plus primary</title>
    <desc>Two peer actions with one styled as the primary; the primary sits on the right per web convention.</desc>
    <rect x="0" y="0" width="120" height="48" fill="#fff" stroke="#000" data-interactive="true"/>
    <text x="24" y="32" font-size="14" fill="#000" stroke="none">Cancel</text>
    <rect x="136" y="0" width="160" height="48" fill="#000" data-interactive="true"/>
    <text x="160" y="32" font-size="14" fill="#fff" stroke="none">Save changes</text>
  </g>
  <g data-region="three-way" transform="translate(48,144)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <title>Three-way action row</title>
    <desc>A back affordance separated from a save-draft plus publish pair.</desc>
    <rect x="0" y="0" width="96" height="48" fill="#fff" stroke="#000" data-interactive="true"/>
    <text x="16" y="32" font-size="14" fill="#000" stroke="none">‹ Back</text>
    <rect x="440" y="0" width="136" height="48" fill="#fff" stroke="#000" data-interactive="true"/>
    <text x="456" y="32" font-size="14" fill="#000" stroke="none">Save draft</text>
    <rect x="592" y="0" width="136" height="48" fill="#000" data-interactive="true"/>
    <text x="608" y="32" font-size="14" fill="#fff" stroke="none">Publish ›</text>
  </g>
  <g data-region="segmented" transform="translate(48,240)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <title>Segmented control</title>
    <desc>Equal-width mutually-exclusive choices; the current segment reads as filled.</desc>
    <rect x="0" y="0" width="288" height="48" fill="#fff" stroke="#000"/>
    <rect x="0" y="0" width="96" height="48" fill="#000" data-interactive="true"/>
    <text x="24" y="32" font-size="14" fill="#fff" stroke="none">Day</text>
    <line x1="96" y1="0" x2="96" y2="48" stroke="#000" stroke-width="1"/>
    <text x="120" y="32" font-size="14" fill="#000" stroke="none">Week</text>
    <line x1="192" y1="0" x2="192" y2="48" stroke="#000" stroke-width="1"/>
    <text x="216" y="32" font-size="14" fill="#000" stroke="none">Month</text>
  </g>
</svg>
```
