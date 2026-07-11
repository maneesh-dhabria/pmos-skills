# Date Picker

## When to use
- Picking a calendar date or date range
- Date matters (booking, scheduling, filtering by time period)

## When NOT to use
- Approximate / partial dates ("around 2019") → text input
- Birthdate where calendar nav is tedious → consider three selects (year/month/day) for far-past dates
- Time-only → use a time picker

## Anatomy
1. Visible label
2. Input field showing selected date (typed format hint, e.g., "MM/DD/YYYY")
3. Calendar icon trigger
4. Calendar popover: month nav, day grid, today indicator
5. For ranges: start-date + end-date fields, dual calendar
6. Optional: presets ("Today", "This week", "Last 30 days")
7. Optional: time picker (combined date+time)

## Required states
- default (empty)
- focused (input only)
- with-selected-date
- calendar-open
- with-range-selected
- with-disabled-dates (e.g., past dates blocked)
- error (invalid format / out of range)

## Best practices
1. Allow typing AND calendar selection (N7) — power users type, casual users click
2. Format hint inline with the input ("MM / DD / YYYY") (N6)
3. Today is visually highlighted in the grid (N1)
4. Disable invalid dates (past, future, blackout) — don't just error after click (N5)
5. For ranges: highlight the selected range visually as user picks the second date (N1)
6. Provide common presets above the calendar (N7) — "Last 7 days" saves clicks
7. Locale-aware: respect user's date format (en-US: MM/DD/YYYY, en-GB: DD/MM/YYYY) (N2)
8. Keyboard nav inside calendar: arrow keys move days, Enter selects, Esc closes
9. Mobile: use native `<input type="date">` for single dates

## Common mistakes
- Three separate selects for year/month/day on every date → tedious (N7). Reserve for far-past birthdates.
- No format hint → user types "5/3/24" expecting MM/DD or DD/MM (N9)
- Calendar opens behind other UI → z-index issue, frustrating
- Past dates clickable then erroring → should be disabled (N5)
- Range picker requires two separate clicks far apart → make end-date click adjacent to start

## Device variants
- **mobile-web**: native `<input type="date">` triggers system picker
- **native**: iOS wheel picker, Android Material date picker
- **desktop**: custom calendar popover with type-to-input fallback

## Skeleton

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <g data-region="input" transform="translate(24,24)">
    <title>Date input</title>
    <desc>A labelled date field with a format hint and a calendar-icon trigger.</desc>
    <text x="0" y="16" font-size="12" fill="#666" stroke="none">Due date</text>
    <rect x="0" y="24" width="240" height="40" fill="#fff" stroke="#000"/>
    <text x="8" y="48" font-size="14" fill="#666" stroke="none">MM / DD / YYYY</text>
    <rect x="248" y="24" width="40" height="40" fill="#e6e6e6"/>
  </g>
  <g data-region="calendar" transform="translate(24,96)">
    <title>Calendar popover (open)</title>
    <desc>Month navigation, weekday headers, and a day grid with today shaded.</desc>
    <rect x="0" y="0" width="320" height="320" fill="#fff" stroke="#000"/>
    <text x="16" y="32" font-size="14" fill="#000" stroke="none">&lt;</text>
    <text x="120" y="32" font-size="14" fill="#000" stroke="none">April 2026</text>
    <text x="296" y="32" font-size="14" fill="#000" stroke="none">&gt;</text>
    <line x1="0" y1="48" x2="320" y2="48" stroke="#e6e6e6" stroke-width="1"/>
    <text x="8" y="80" font-size="12" fill="#666" stroke="none">Su</text>
    <text x="56" y="80" font-size="12" fill="#666" stroke="none">Mo</text>
    <text x="104" y="80" font-size="12" fill="#666" stroke="none">Tu</text>
    <text x="152" y="80" font-size="12" fill="#666" stroke="none">We</text>
    <text x="200" y="80" font-size="12" fill="#666" stroke="none">Th</text>
    <text x="248" y="80" font-size="12" fill="#666" stroke="none">Fr</text>
    <text x="296" y="80" font-size="12" fill="#666" stroke="none">Sa</text>
    <text x="8" y="120" font-size="14" fill="#000" stroke="none">1</text>
    <text x="56" y="120" font-size="14" fill="#000" stroke="none">2</text>
    <text x="104" y="120" font-size="14" fill="#000" stroke="none">3</text>
    <text x="152" y="120" font-size="14" fill="#000" stroke="none">4</text>
    <text x="200" y="120" font-size="14" fill="#000" stroke="none">5</text>
    <text x="248" y="120" font-size="14" fill="#000" stroke="none">6</text>
    <text x="296" y="120" font-size="14" fill="#000" stroke="none">7</text>
    <rect x="144" y="136" width="40" height="40" fill="#f4f4f4"/>
    <text x="8" y="160" font-size="14" fill="#000" stroke="none">8</text>
    <text x="56" y="160" font-size="14" fill="#000" stroke="none">9</text>
    <text x="104" y="160" font-size="14" fill="#000" stroke="none">10</text>
    <text x="152" y="160" font-size="14" fill="#000" stroke="none">11</text>
    <text x="200" y="160" font-size="14" fill="#000" stroke="none">12</text>
    <text x="248" y="160" font-size="14" fill="#000" stroke="none">13</text>
    <text x="296" y="160" font-size="14" fill="#000" stroke="none">14</text>
  </g>
</svg>
```
