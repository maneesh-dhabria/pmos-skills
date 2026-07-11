# Multi-Step Form (Wizard)

## When to use
- 4+ logical groups OR 8+ fields
- Sequential dependencies (step 2 depends on step 1's input)
- Onboarding, checkout, complex setup

## When NOT to use
- ≤ 6 fields with no dependencies → single-page form
- Steps that are peer-level not sequential → [tabs.md](../navigation/tabs.md)
- Quick edits to existing data → inline editing or modal

## Anatomy
1. Progress indicator (steps 1 of N, with labels)
2. Current step's fields
3. Step title and description
4. Navigation: Back, Next/Submit, optional "Save & exit"
5. Review/summary step before final submit (Tier 2+)

## Required states
- step-1 (no Back button)
- middle-step (Back + Next)
- last-step (Back + Submit)
- review-step (read-only summary, Edit links per section)
- in-progress save / draft saved
- submission-loading
- submission-error
- submission-success

## Best practices
1. Show progress: "Step 2 of 4: Account details" (N1) — users orient
2. Steps must be labeled by content, not just numbered (N2) — "Account / Plan / Payment / Review"
3. Allow Back without losing input (N3) — users iterate
4. Validate per step before advancing (N5) — surface errors close to source
5. Final Review step shows ALL collected data with Edit links per section (N3, N6) — last chance to fix
6. Save draft automatically on step transitions (N3) for long forms
7. Don't restart on validation error — preserve all entered data (N3)
8. Submit button only on the LAST step; Next on all others (N4)
9. Mobile: stack progress indicator vertically or use compact "2/4" pill

## Common mistakes
- No progress indicator → user doesn't know how long this takes (N1)
- Back button loses entered data → users abandon (N3)
- Validation only at the end → user has to scroll back through 4 steps to find the problem (N9)
- Submit button on every step → confusing (N4)
- No review step on long forms → users submit with errors they can't see (N5)
- Using a wizard for 4 fields → unnecessary friction (N8)

## Device variants
- **mobile-web/native**: full-screen per step, tall stepper at top
- **desktop**: side stepper or top progress bar

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <g data-region="progress" transform="translate(24,24)">
    <title>Step progress indicator</title>
    <desc>Four content-labelled steps: one complete, the current one filled, two pending.</desc>
    <circle cx="16" cy="16" r="16" fill="#000"/>
    <text x="16" y="24" font-size="12" fill="#fff" stroke="none" text-anchor="middle">v</text>
    <text x="40" y="24" font-size="14" fill="#000" stroke="none">Account</text>
    <circle cx="176" cy="16" r="16" fill="#000"/>
    <text x="176" y="24" font-size="12" fill="#fff" stroke="none" text-anchor="middle">2</text>
    <text x="200" y="24" font-size="14" fill="#000" stroke="none">Plan</text>
    <circle cx="336" cy="16" r="16" fill="#fff" stroke="#666"/>
    <text x="336" y="24" font-size="12" fill="#666" stroke="none" text-anchor="middle">3</text>
    <text x="360" y="24" font-size="14" fill="#666" stroke="none">Payment</text>
    <circle cx="520" cy="16" r="16" fill="#fff" stroke="#666"/>
    <text x="520" y="24" font-size="12" fill="#666" stroke="none" text-anchor="middle">4</text>
    <text x="544" y="24" font-size="14" fill="#666" stroke="none">Review</text>
  </g>
  <g data-region="step" transform="translate(24,96)">
    <title>Current step body</title>
    <desc>The active step's title and description; its fields render below.</desc>
    <line x1="0" y1="0" x2="640" y2="0" stroke="#e6e6e6" stroke-width="1"/>
    <text x="0" y="48" font-size="28" fill="#000" stroke="none">Choose your plan</text>
    <text x="0" y="80" font-size="14" fill="#666" stroke="none">You can change this later from billing settings.</text>
  </g>
  <g data-region="nav" transform="translate(24,224)">
    <title>Step navigation</title>
    <desc>Back on the left, primary Continue on the right; Submit appears only on the last step.</desc>
    <rect x="0" y="0" width="120" height="40" fill="#fff" stroke="#000"/>
    <text x="24" y="24" font-size="14" fill="#000" stroke="none">&lt; Back</text>
    <rect x="520" y="0" width="120" height="40" fill="#000"/>
    <text x="544" y="24" font-size="14" fill="#fff" stroke="none">Continue &gt;</text>
  </g>
</svg>
```
