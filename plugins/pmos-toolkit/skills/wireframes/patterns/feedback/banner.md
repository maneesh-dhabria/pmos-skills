# Banner (Inline Alert)

## When to use
- Persistent, page-level information user should see while working
- System status: maintenance windows, plan limits, billing issues
- Account-level warnings: trial expiring, feature deprecation

## When NOT to use
- Transient confirmation → [toast.md](toast.md)
- Field-level error → [inline-error.md](inline-error.md)
- Blocking action confirmation → [confirmation-dialog.md](confirmation-dialog.md)
- Marketing announcements → users learn to ignore "promotional" banners

## Anatomy
1. Container with semantic color (info / warning / error / success)
2. Icon
3. Message text (concise but complete)
4. Optional: primary action button
5. Optional: dismiss (×) for dismissible banners
6. Position: top of page (most prominent) or section-scoped

## Required states
- info
- warning
- error
- success
- with-action
- dismissible vs persistent

## Best practices
1. Page-top banner for account-level info; section-scoped for content-specific (N4)
2. Color coding + icon + text — never color alone
3. Concise but complete — explain WHAT and what to DO (N9)
4. Dismiss only if reappearing on next page-load makes sense; persist critical issues (N5)
5. Primary action inline ("Renew now", "Update card") (F1)
6. ARIA `role="status"` for info/success, `role="alert"` for warning/error
7. Keep ≤ 2 lines in normal viewport (G4)
8. Don't stack multiple banners — pick the most important (F2)

## Common mistakes
- Stacking 3 banners → user blindness (F2)
- Critical billing banner that's dismissible and gone forever → user misses it (N5)
- Color-only severity → fails colorblind
- Banner buried in a sidebar → low visibility (N1)
- Banner that looks too much like an ad → ignored

## Device variants
- **desktop-web/-app**: full-width across content area
- **mobile-web/native**: full-width edge-to-edge; respect safe-area

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="1280" height="800" fill="#fff"/>
  <g data-region="app-bar">
    <title>App bar</title><desc>Page chrome above the banner region.</desc>
    <rect x="0" y="0" width="1280" height="56" fill="#fff" stroke="#e6e6e6"/>
    <text x="24" y="32" font-size="20" fill="#000" stroke="none">Account</text>
  </g>
  <g data-region="banner-warning">
    <title>Warning banner (with action)</title><desc>Full-width page-top banner: trial expiry with an inline "Add card" action and a dismiss control.</desc>
    <rect x="0" y="56" width="1280" height="64" fill="#f4f4f4" stroke="#e6e6e6"/>
    <text x="24" y="96" font-size="14" fill="#000" stroke="none">⚠  Trial ends in 3 days. Add a payment method to keep access to all features.</text>
    <rect x="1104" y="72" width="120" height="40" fill="#000"/>
    <text x="1128" y="96" font-size="14" fill="#fff" stroke="none">Add card</text>
    <text x="1240" y="96" font-size="20" fill="#666" stroke="none">×</text>
  </g>
  <g data-region="banner-info">
    <title>Info banner</title><desc>Full-width informational banner: scheduled maintenance notice, no action.</desc>
    <rect x="0" y="120" width="1280" height="56" fill="#e6e6e6"/>
    <text x="24" y="152" font-size="14" fill="#000" stroke="none">ℹ  Scheduled maintenance: Saturday April 25, 02:00–04:00 UTC.</text>
  </g>
  <g data-region="banner-error">
    <title>Error banner (with action)</title><desc>Full-width error banner: payment failure with an "Update card" action.</desc>
    <rect x="0" y="176" width="1280" height="64" fill="#f4f4f4" stroke="#e6e6e6"/>
    <text x="24" y="216" font-size="14" fill="#000" stroke="none">⚠  Payment failed. Update your card to avoid service interruption.</text>
    <rect x="1088" y="192" width="136" height="40" fill="#000"/>
    <text x="1104" y="216" font-size="14" fill="#fff" stroke="none">Update card</text>
  </g>
  <g data-region="content">
    <title>Page content</title><desc>The working surface below the banner stack.</desc>
    <rect x="24" y="264" width="1232" height="456" fill="#f4f4f4"/>
  </g>
  <g data-region="annotations">
    <title>Annotations</title><desc>Design notes on banner stacking and severity encoding.</desc>
    <text x="24" y="760" font-size="12" fill="#d33" stroke="none">Ship only the single most important banner; three are shown here to catalogue severities. Severity is carried by icon + label, never colour alone.</text>
  </g>
</svg>
```
