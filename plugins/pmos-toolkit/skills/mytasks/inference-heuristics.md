# /mytasks Inference Heuristics

Used by quick-capture (`/mytasks <bare text>`). Each rule is applied in order against the user's input. The whole input becomes the `title:` after parsed tokens are stripped.

## Type inference (case-insensitive, first match wins)

| Pattern | Resolves to |
|---|---|
| `\bcall\b`, `\bring\b` | `call` |
| `\bread\b`, `review article`, `review post`, `review doc` | `read` |
| `\bremind\b`, `\bremember\b` | `reminder` |
| `\bfollow up\b`, `\bfollowup\b`, `\bcheck in with\b`, `\bping\b` | `follow-up` |
| `\bidea\b`, `\bbrainstorm\b` | `idea` |
| (no match) | `execution` (fallback) |

Rules use word-boundary matches (`\b`) to avoid false positives on substrings (e.g., "recall" should NOT match `call`).

## Date inference (case-insensitive)

Applied to the input. First match wins. The matched substring is stripped from the title.

| Pattern | Resolves to |
|---|---|
| `\btoday\b`, `\bEOD\b` | today (ISO date) |
| `\btomorrow\b` | today + 1 day |
| `\bMonday\b` … `\bSunday\b` | next occurrence of that day, EXCLUSIVE of today (so `Friday` on a Friday = next Friday, not today) |
| `\bnext (Monday\|...\|Sunday)\b` | same as bare day name |
| `\bin (\d+) days?\b` | today + N days |
| `\bby (\d{4}-\d{2}-\d{2})\b` | the ISO date as-is |
| `\bby (\d{1,2})/(\d{1,2})\b` | MM/DD in current year; if resulting date is before today, roll to next year |
| `\bby (\d{1,2})/(\d{1,2})/(\d{4})\b` | MM/DD/YYYY |
| (no match) | empty (`due:` absent) |

The resolved date appears in the capture report so the user sees what was inferred.

## People inference (`@handle` tokens only)

Only `@`-prefixed tokens trigger person resolution. Bare names (e.g., `Sarah` without `@`) stay in the title unchanged.

For each `@handle` token:
1. Strip the leading `@`.
2. Call `/people find <handle>`.
3. **Single match** → use the resolved handle silently. The `@handle` token is stripped from the title.
4. **Multiple matches** → skip (token stays in title); flag as unresolved in capture report.
5. **No match** → skip (token stays in title); flag as unresolved in capture report.

The original `@handle` text remains in the title for unresolved cases — preserves user intent for later cleanup.

## What is NEVER inferred

- `project` — **fully manual** (design D3). It is never auto-set from repo context — the old "infer `workstream` from the current repo's `.pmos/settings.yaml`" behavior was **removed** when `workstream` became `project`. The user assigns a project explicitly; a task with no `project` lands in Inbox. (The `#project` quick-add token that lets the user set it inline is a later story's addition — do not parse `#` tokens here yet.)
- `parent`, `order`, `recur` — never inferred at capture. A subtask, a manual order, or a recurrence rule is always set explicitly, never guessed from the text.
- `importance` — too subjective. Always defaults to `neutral`.
- `status` — always `pending` on capture.
- `checkin`, `next_checkin`, `start`, `links`, `labels` — never inferred. Always absent on quick-capture.
