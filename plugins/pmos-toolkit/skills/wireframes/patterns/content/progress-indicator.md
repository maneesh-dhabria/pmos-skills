# Progress Indicator

## When to use
- Showing progress through a known-length task (file upload, multi-step form, onboarding)
- Long operations with measurable progress

## When NOT to use
- Indeterminate operations → use a spinner with context
- Very fast operations < 300 ms → no indicator
- Loading content → [loading-skeleton.md](../feedback/loading-skeleton.md)

## Anatomy
1. Linear bar OR circular ring
2. Filled portion representing percent complete
3. Optional: percent label
4. Optional: step labels for stepwise progress
5. ARIA: `role="progressbar"` with `aria-valuenow` / `aria-valuemin` / `aria-valuemax`

## Required states
- 0% (just started)
- in-progress (partial fill)
- nearly-complete
- complete (100%)
- error / paused
- indeterminate (use spinner instead, or animated stripes if linear)

## Best practices
1. Use linear bar for tasks; circular for compact spaces (G3)
2. Show percent or step label so users have a number anchor (N1)
3. For multi-step flows, prefer step indicators ("Step 2 of 4") over pure percent — more meaningful (N1)
4. Don't shrink progress when more work is discovered — feels broken; recompute upfront if possible (N1)
5. Accessibility: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`
6. Color the fill with accent; background with neutral (G2)
7. For indeterminate, use animated stripes / shimmer rather than fake progress (N1)
8. Show ETA only if confident — bad ETAs erode trust

## Common mistakes
- Progress that goes backward → user thinks it's broken (N1)
- Indeterminate progress that looks determinate → false impression (N1)
- No percent or label → vague feedback (N1)
- Tiny bar < 4 px tall → hard to perceive
- Color-only state (success/error) without text → fails colorblind

## Device variants
- **all devices**: same pattern; bars stretch to container width

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="360" height="24" viewBox="0 0 360 24">
  <g data-region="progress" transform="translate(0,0)">
    <title>Progress indicator</title>
    <desc>Linear determinate progress bar: a neutral track with a filled portion showing 62% complete.</desc>
    <rect x="0" y="8" width="360" height="8" fill="#e6e6e6"/>
    <rect x="0" y="8" width="224" height="8" fill="#000"/>
  </g>
</svg>
```
