# Key-Value Pair

## When to use
- Displaying entity attributes / metadata: created date, owner, status, etc.
- Settings readouts (read-only display of configured values)
- Receipt / summary blocks

## When NOT to use
- Editable fields → use form patterns
- Comparable rows of multiple entities → [table.md](table.md)
- Single piece of prominent info → use a stat card

## Anatomy
1. Key (label, muted, smaller)
2. Value (primary, larger)
3. Optional: inline action ("Copy", "Edit")
4. Layout: stacked (label above) OR inline (label left, value right)

## Required states
- default
- with-empty-value ("—" or "Not set")
- with-action-on-hover (Copy/Edit)
- pending-update (after inline edit)

## Best practices
1. Label is muted color, smaller (G3)
2. Value is primary color, normal/large (G3)
3. Empty values show "—" or "Not set", never blank (N1)
4. Group related pairs; separate groups with dividers or section headings (G1)
5. Inline layout for short values; stacked for long (G4)
6. "Copy" buttons on technical values (IDs, tokens, emails) (N7)
7. Use `<dl>` / `<dt>` / `<dd>` semantics
8. Truncate long values with ellipsis + tooltip showing full value

## Common mistakes
- Same visual weight for label and value → user can't scan (G3)
- Blank for empty values → user can't tell if it's loading or empty (N1)
- Long values that wrap awkwardly → set max-width and truncate
- 20+ pairs in a flat list → group them (G1, F2)

## Device variants
- **desktop**: inline layout (label left, value right)
- **mobile**: stacked layout (label above value) — saves horizontal space

## Skeleton

Composed on the **desktop 1280×800** canvas: a stacked variant (label above value) on the left and an
inline variant (label left, value right) on the right — muted label over ink value throughout.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="1280" height="800" fill="#fff"/>

  <g data-region="stacked-pairs">
    <title>Stacked key-value pairs</title>
    <desc>Each pair puts a muted label above its ink value; empty values read "— Not set" rather than blank, and technical values carry a Copy control.</desc>
    <text x="24" y="40" font-size="12" fill="#666" stroke="none">PLAN</text>
    <text x="24" y="64" font-size="14" fill="#000" stroke="none">Business · Annual</text>

    <text x="24" y="112" font-size="12" fill="#666" stroke="none">RENEWAL DATE</text>
    <text x="24" y="136" font-size="14" fill="#000" stroke="none">Jun 30, 2026</text>

    <text x="24" y="184" font-size="12" fill="#666" stroke="none">WORKSPACE ID</text>
    <text x="24" y="208" font-size="14" fill="#000" stroke="none">ws_8H3kZ29p</text>
    <rect x="240" y="192" width="40" height="24" fill="#fff" stroke="#000"/>
    <text x="248" y="208" font-size="12" fill="#666" stroke="none">Copy</text>

    <text x="24" y="256" font-size="12" fill="#666" stroke="none">CUSTOM DOMAIN</text>
    <text x="24" y="280" font-size="14" fill="#666" stroke="none">— Not set</text>
  </g>

  <g data-region="inline-pairs">
    <title>Inline key-value pairs</title>
    <desc>The desktop-friendly variant: label on the left, value aligned to a second column on the right.</desc>
    <text x="640" y="40" font-size="12" fill="#666" stroke="none">Plan</text>
    <text x="840" y="40" font-size="14" fill="#000" stroke="none">Business · Annual</text>
    <text x="640" y="72" font-size="12" fill="#666" stroke="none">Renewal</text>
    <text x="840" y="72" font-size="14" fill="#000" stroke="none">Jun 30, 2026</text>
  </g>

  <g data-region="annotations">
    <title>Design notes</title>
    <desc>Stacked layout suits long values and mobile; inline suits short values on desktop. Group related pairs and separate groups with a divider or heading; never leave an empty value blank.</desc>
    <circle cx="304" cy="200" r="8" fill="#d33"/>
    <text x="304" y="208" font-size="10" fill="#fff" stroke="none" text-anchor="middle">1</text>
  </g>
</svg>
```
