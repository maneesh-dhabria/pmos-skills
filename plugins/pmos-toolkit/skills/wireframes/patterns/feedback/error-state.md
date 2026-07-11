# Error State

## When to use
- Component or screen-level failure (load failed, save failed, network error)
- 404 / 403 / 500 error pages
- Background sync failures

## When NOT to use
- Field-level errors → [inline-error.md](inline-error.md)
- Page-level warnings → [banner.md](banner.md)
- Transient action failures → [toast.md](toast.md) with retry

## Anatomy
1. Icon (error-themed, ⚠ or specific to context)
2. Title: what failed
3. Helper text: why (in plain language) + what to do
4. Primary recovery action: Retry, Reload, Go back
5. Optional: error code / technical details (collapsed)
6. Optional: "Contact support" link with pre-filled context

## Required states
- network-error (offline / unreachable)
- server-error (5xx)
- not-found (404)
- forbidden (403)
- generic-failure
- with-retry-in-progress

## Best practices
1. Title in plain language — "Couldn't load deals" not "Error 503" (N9, N2)
2. Helper text explains and offers a path forward (N9)
3. Primary action is Retry (or Reload, Go home) (N3)
4. Error code shown for support but de-emphasized (N9) — collapse it under "Show details"
5. Don't blame the user for system errors (N9)
6. `role="alert"` for the container
7. Color + icon + text
8. For network errors, suggest checking connection (N9)
9. Auto-retry transparent failures with exponential backoff; show error only after several attempts

## Common mistakes
- "Error: 500" with no context → user can't act (N9)
- "Something went wrong" with no recovery → dead end (N3, N9)
- Stack trace shown to end user → confusing, looks broken (N9)
- Same error state for network vs server vs not-found → wrong recovery action suggested (N4)
- No retry → user has to refresh whole page

## Device variants
- **desktop / mobile**: centered in container; respect safe-area on native
- **native**: use platform-specific empty/error illustrations and CTAs

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="1280" height="800" fill="#fff"/>
  <g data-region="app-bar">
    <title>App bar</title><desc>Page chrome above the error container.</desc>
    <rect x="0" y="0" width="1280" height="56" fill="#fff" stroke="#e6e6e6"/>
    <text x="24" y="32" font-size="20" fill="#000" stroke="none">Deals</text>
  </g>
  <g data-region="error-state">
    <title>Error state (component)</title><desc>Centred component-level failure: plain-language title, cause-and-recovery helper, Retry/Reload actions, and a collapsed technical detail line.</desc>
    <text x="640" y="304" font-size="28" fill="#000" stroke="none" text-anchor="middle">⚠</text>
    <text x="640" y="360" font-size="28" fill="#000" stroke="none" text-anchor="middle">Couldn't load deals</text>
    <text x="640" y="400" font-size="14" fill="#666" stroke="none" text-anchor="middle">Check your internet connection and try again.</text>
    <rect x="536" y="440" width="120" height="40" fill="#000"/>
    <text x="560" y="464" font-size="14" fill="#fff" stroke="none">Retry</text>
    <rect x="664" y="440" width="136" height="40" fill="#fff" stroke="#000"/>
    <text x="680" y="464" font-size="14" fill="#000" stroke="none">Reload page</text>
    <text x="640" y="520" font-size="12" fill="#666" stroke="none" text-anchor="middle">Show details</text>
    <text x="640" y="544" font-size="12" fill="#666" stroke="none" text-anchor="middle">503 Service Unavailable · req-id 8H3kZ29p</text>
  </g>
  <g data-region="annotations">
    <title>Annotations</title><desc>Design notes on the error state's recovery path.</desc>
    <rect x="488" y="280" width="304" height="288" fill="none" stroke="#d33" stroke-dasharray="4 4"/>
    <text x="488" y="600" font-size="12" fill="#d33" stroke="none">Error names what failed in plain language and offers Retry/Reload; the technical code is collapsed under "Show details" (S3).</text>
  </g>
</svg>
```
