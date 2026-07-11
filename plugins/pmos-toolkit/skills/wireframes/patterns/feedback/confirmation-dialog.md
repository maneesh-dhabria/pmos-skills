# Confirmation Dialog

## When to use
- Destructive actions: delete, remove, archive, cancel-subscription
- Irreversible actions: send, publish, charge
- Anything where Undo is impossible or expensive

## When NOT to use
- Reversible actions with Undo support → use [toast.md](toast.md) with Undo instead (better flow)
- Routine confirmations the user does 50× a day → fatigue makes confirmations ignored (N5)
- Non-destructive form submission → just submit; don't double-confirm

## Anatomy
1. Scrim
2. Dialog container (smaller than a typical modal)
3. Title clearly stating the action
4. Body explaining consequences ("This will delete 12 records and cannot be undone.")
5. For high-stakes: type-to-confirm input ("Type DELETE to confirm")
6. Footer: Cancel (default focus) + destructive primary button

## Required states
- default
- with-type-to-confirm-empty (primary disabled)
- with-type-to-confirm-typed (primary enabled)
- submitting
- submission-error

## Best practices
1. Title is the action: "Delete project?" (N2) — not "Are you sure?"
2. Body explains scope and irreversibility (N5, N9)
3. Cancel button gets default focus (N5) — protects against accidental Enter
4. Destructive button uses a danger color + clear label ("Delete") (N4)
5. NO close-on-outside-click for destructive (N5) — too easy to dismiss accidentally
6. For very high stakes: require typing the entity name to enable Delete (N5) — friction is the point
7. After action: toast confirmation with Undo if possible (N3)
8. Show what will be deleted (entity count, name) in body (N1)
9. ARIA `role="alertdialog"` for destructive vs `role="dialog"`

## Common mistakes
- "Are you sure?" → unhelpful (N9). Say what action and what consequence.
- Destructive button gets default focus → accidental Enter destroys data (N5)
- Same color for Cancel and Delete → user picks the wrong one (N4)
- Closes on outside click → too easy to dismiss without thinking (N5)
- Confirmation for trivial reversible action → fatigue
- No mention of what gets deleted → user can't tell scope

## Device variants
- **desktop**: centered, max-width ~420 px
- **mobile-web/native**: full-screen sheet OR Material/iOS native action sheet style

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <g data-region="scrim">
    <title>Scrim</title><desc>Dimmed backdrop; a destructive dialog does NOT close on a scrim click.</desc>
    <rect x="0" y="0" width="1280" height="800" fill="#e6e6e6"/>
  </g>
  <g data-region="dialog">
    <title>Confirmation dialog</title><desc>Destructive delete confirmation with a type-to-confirm gate and Cancel/Delete footer.</desc>
    <rect x="424" y="240" width="432" height="320" fill="#fff" stroke="#000"/>
    <text x="448" y="296" font-size="20" fill="#000" stroke="none">Delete "Acme Pilot Q3"?</text>
    <text x="448" y="336" font-size="14" fill="#666" stroke="none">This will permanently delete the deal and all 14</text>
    <text x="448" y="360" font-size="14" fill="#666" stroke="none">associated activities. This cannot be undone.</text>
    <text x="448" y="408" font-size="12" fill="#666" stroke="none">Type Acme Pilot Q3 to confirm</text>
    <rect x="448" y="416" width="384" height="40" fill="#fff" stroke="#000"/>
    <text x="456" y="440" font-size="14" fill="#666" stroke="none">Acme Pilot Q3</text>
    <rect x="584" y="496" width="120" height="40" fill="#000"/>
    <text x="608" y="520" font-size="14" fill="#fff" stroke="none">Cancel</text>
    <rect x="712" y="496" width="120" height="40" fill="#fff" stroke="#000"/>
    <text x="736" y="520" font-size="14" fill="#666" stroke="none">Delete</text>
  </g>
  <g data-region="annotations">
    <title>Annotations</title><desc>Design notes on the destructive-confirmation guardrails.</desc>
    <text x="424" y="600" font-size="12" fill="#d33" stroke="none">Cancel holds default focus; Delete stays disabled (muted) until the exact name is typed.</text>
  </g>
</svg>
```
