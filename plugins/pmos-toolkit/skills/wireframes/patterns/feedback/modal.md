# Modal (Dialog)

## When to use
- Focused subtask requiring user attention
- Quick form entry that doesn't justify a full page
- Confirming destructive actions → [confirmation-dialog.md](confirmation-dialog.md) (specialized variant)
- Showing supplementary detail without losing context

## When NOT to use
- Long workflows → use a full page or [multi-step-form.md](../forms/multi-step-form.md)
- Information user needs alongside underlying content → side rail or popover
- Trivial info → [tooltip.md](../content/tooltip.md) or [toast.md](toast.md)
- Stacking multiple modals → redesign the flow

## Anatomy
1. Scrim/overlay behind modal (dims background)
2. Modal container (centered, max-width)
3. Header: title, optional close button (×)
4. Body: content/form
5. Footer: action buttons (Cancel left or right depending on convention, primary action)

## Required states
- default (open)
- with-form-content
- form-with-pending-changes
- submitting
- submission-error
- mobile-fullscreen (sheet variant)

## Best practices
1. Trap focus inside modal when open
2. First focusable element receives focus on open; restore focus on close
3. Close on: Esc key, click outside (scrim), explicit X button — provide all three (N3)
4. EXCEPT confirmation dialogs for destructive actions: don't close on outside click (N5)
5. Title clearly states what the modal is for (N2) — verb noun: "Add team member"
6. Primary action right-aligned in footer (N4) — Cancel left of primary
7. Max width ~480 px for short content, ~640 px for forms; never full-viewport on desktop (G4)
8. Mobile: use full-screen sheet, not centered modal
9. ARIA: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to title
10. Don't open modals from modals — redesign

## Common mistakes
- No focus trap → keyboard users tab into background
- Modal opens with no clear close affordance (no X, can't click outside) → user stuck (N3)
- Closes on outside click during destructive confirmation → accidental dismissal (N5)
- Modal too large → no longer focused, just a popup window (G4)
- Stacked modals → users lose context (N6)
- Long forms in modals → bad UX; use a full page (G4)

## Device variants
- **desktop-web/-app**: centered modal with scrim
- **mobile-web/native**: full-screen sheet; respects safe-area
- **ios-app**: sheet (slides from bottom); large title; system close button
- **android-app**: dialog (Material) or full-screen sheet

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <g data-region="scrim">
    <title>Scrim</title><desc>The dimmed backdrop; the underlying page is inert while the modal is open.</desc>
    <rect x="0" y="0" width="1280" height="800" fill="#e6e6e6"/>
  </g>
  <g data-region="modal">
    <title>Modal dialog</title><desc>Centred "Add team member" form modal with header, body fields, and footer actions.</desc>
    <rect x="400" y="240" width="480" height="320" fill="#fff" stroke="#000"/>
    <text x="424" y="296" font-size="20" fill="#000" stroke="none">Add team member</text>
    <text x="840" y="296" font-size="20" fill="#666" stroke="none">×</text>
    <text x="424" y="344" font-size="12" fill="#666" stroke="none">Email</text>
    <rect x="424" y="352" width="432" height="40" fill="#fff" stroke="#000"/>
    <text x="432" y="376" font-size="14" fill="#666" stroke="none">teammate@acme.com</text>
    <text x="424" y="424" font-size="12" fill="#666" stroke="none">Role</text>
    <rect x="424" y="432" width="432" height="40" fill="#fff" stroke="#000"/>
    <text x="432" y="456" font-size="14" fill="#666" stroke="none">Member</text>
    <rect x="608" y="496" width="120" height="40" fill="#fff" stroke="#000"/>
    <text x="632" y="520" font-size="14" fill="#000" stroke="none">Cancel</text>
    <rect x="736" y="496" width="120" height="40" fill="#000"/>
    <text x="752" y="520" font-size="14" fill="#fff" stroke="none">Send invite</text>
  </g>
  <g data-region="annotations">
    <title>Annotations</title><desc>Design notes on modal dismissal and focus.</desc>
    <text x="400" y="600" font-size="12" fill="#d33" stroke="none">Esc, a scrim click, and the × all close this modal; focus is trapped inside while open.</text>
  </g>
</svg>
```
