# Search

## When to use
- Free-text query against a corpus (docs, products, users, code)
- Users know roughly what they want but not its exact location

## When NOT to use
- Pick from a known small list → [select-dropdown.md](select-dropdown.md)
- Filter an already-visible list → use a filter pattern, not a search input
- Single-step lookup with structured input → form fields

## Anatomy
1. Search input with magnifier icon (left)
2. Placeholder hinting what's searchable
3. Clear button (right, when query has content)
4. Optional: scoped-search pill ("In: this project")
5. Optional: keyboard shortcut hint (`⌘K`)
6. Results panel below or popover
7. Optional: recent searches when input is focused but empty
8. Empty / loading / no-results states

## Required states
- default (empty)
- focused (with recent searches)
- typing (debounced)
- loading
- with-results
- no-results
- error

## Best practices
1. Magnifier icon on the left, clear (×) on the right when query non-empty (N4)
2. Placeholder describes what's searchable: "Search projects, docs, people" (N6)
3. Show recent searches when focused with empty query (N7)
4. Debounce queries to ~250 ms (perf) — don't fire on every keystroke
5. Show loading skeleton, never a blank panel (N1)
6. No-results: explain WHY and SUGGEST a fix ("No results for 'foo'. Try fewer words or check spelling.") (N9)
7. Highlight matched terms in results (N1)
8. Keyboard navigation: arrow keys through results, Enter to select, Esc to close
9. Show keyboard shortcut to open search (`⌘K` / `Ctrl K`) — convention in productivity tools (N7)
10. Mobile: search opens a full-screen view with cancel button — better than a tiny input (F1)

## Common mistakes
- No clear button → user has to manually delete the query
- Results appear in same panel even on partial query "a" → noisy. Wait for ≥ 2 chars.
- Empty results state is just "No results" → unhelpful (N9)
- Auto-submit on every keystroke without debounce → server hammered, UI flickers
- Results panel obscures the input on mobile → keyboard pushes it off screen
- Search inside dropdowns with 8 options → unnecessary; just show the list (N8)

## Device variants
- **mobile-web/native**: tap search opens full-screen; cancel button replaces nav
- **desktop**: inline input with popover results; `⌘K` global shortcut

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <g data-region="input" transform="translate(24,24)">
    <title>Search input</title>
    <desc>An inline search field: magnifier on the left, a keyboard-shortcut pill and clear affordance on the right.</desc>
    <rect x="0" y="0" width="480" height="40" fill="#fff" stroke="#000"/>
    <circle cx="20" cy="20" r="6" fill="none" stroke="#666"/>
    <line x1="24" y1="24" x2="32" y2="32" stroke="#666" stroke-width="1"/>
    <text x="40" y="24" font-size="14" fill="#666" stroke="none">Search projects, docs, people</text>
    <rect x="384" y="8" width="40" height="24" fill="#f4f4f4"/>
    <text x="392" y="24" font-size="12" fill="#666" stroke="none">Cmd K</text>
    <text x="456" y="24" font-size="14" fill="#000" stroke="none">x</text>
  </g>
  <g data-region="results" transform="translate(24,80)">
    <title>Results popover</title>
    <desc>Recent searches when focused, then results for the query with the hovered row shaded.</desc>
    <rect x="0" y="0" width="480" height="200" fill="#fff" stroke="#000"/>
    <text x="8" y="24" font-size="12" fill="#666" stroke="none">Recent</text>
    <text x="8" y="56" font-size="14" fill="#000" stroke="none">Q3 OKRs</text>
    <text x="8" y="88" font-size="14" fill="#000" stroke="none">Sarah Kim</text>
    <line x1="0" y1="104" x2="480" y2="104" stroke="#e6e6e6" stroke-width="1"/>
    <text x="8" y="128" font-size="12" fill="#666" stroke="none">Results for "ren"</text>
    <rect x="0" y="136" width="480" height="40" fill="#f4f4f4"/>
    <text x="8" y="160" font-size="14" fill="#000" stroke="none">Q3 Renewal Plan</text>
  </g>
</svg>
```
