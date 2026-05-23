# Interactive Prompts — Shared Protocol

Single source of truth for the interactive prompting protocol used by `pmos-toolkit` skills. Skills that collect multi-field input from the user (rich-capture, refine, multi-option choices) MUST follow this protocol.

## Two-path protocol

### Primary: `AskUserQuestion` (Claude Code)

When `AskUserQuestion` is available, use it for **one structured prompt per field**. Each prompt is a single tool call.

- **Enum fields:** render as multi-choice with the enum values as options. The current value (when refining) is the default option.
- **Free-string fields:** render as a text input. If a current value exists (refine flow), show it as the default; pressing accept keeps it.
- **Date fields:** text input with format hint `YYYY-MM-DD or "Friday", "tomorrow", "in 3 days"`. Parse the response using the same natural-language rules as quick-capture (see consumer skill's `inference-heuristics.md`).
- **List fields (e.g., `labels`, `aliases`):** text input with format hint `comma-separated`. Parse on `,`, trim whitespace, drop empties.
- **Multi-option choices** (e.g., the unknown-person three-option flow): single multi-choice prompt with the labeled options.

Best UX, single tool-call per field, lowest user friction.

### Fallback: numbered-response, one question at a time

When `AskUserQuestion` is unavailable (Copilot CLI, Codex, Gemini CLI, plain CLI), ask **one question per turn** as plain text with numbered choices for enum fields. Wait for the user to reply before asking the next question.

Example:
```
Importance? (current: neutral)
  1) leverage
  2) neutral  [default]
  3) overhead
Reply with a number, or press <enter> to keep the default.
```

- **Enum fields:** numbered list with `[default]` annotation on the current value. Accept either the number or the literal value.
- **Free-string fields:** plain text prompt with `(current: <value>)` annotation. `<enter>` keeps the current value.
- **Date fields:** plain text prompt with format hint `(YYYY-MM-DD or "Friday", "tomorrow", "in 3 days")`. Same natural-language parsing rules apply.
- **List fields:** plain text prompt with format hint `(comma-separated)`. `<enter>` keeps current; `clear` empties the list.
- **Skip:** the literal `skip` (or option `0` if shown) leaves the field at its current value (refine) or empty (add).

Same field order, same defaults, same validation as the primary path.

## Why per-field, not bulk-numbered-list

A single bulk numbered list (asked all at once) has known problems:
- Later answers can depend on earlier ones (e.g., `checkin` cadence is moot if no `due` date is set — the skill can skip it).
- Long forms produce parsing errors when one field is malformed.
- The user can't see the result of an answer before the next question.
- `<enter>` skip semantics don't translate cleanly to a single bulk response.

Per-field, one-at-a-time fixes all of these at the cost of more conversational turns. For interactive flows (rich-capture, refine), turn count is acceptable; the user is already in interactive mode.

## Validation

Skills MUST validate enum responses against their declared enum values BEFORE writing. On invalid input:
- Primary path: `AskUserQuestion` enforces choice; no validation needed at the consumer layer.
- Fallback path: re-ask the same question with the message `Unknown value '{value}'. Allowed: {comma-separated list}.`

Free-string fields are not validated (any non-empty string is accepted; empty string clears the field on refine, leaves blank on add).

## Defaults and skip semantics

- **Add flows** (no current value): each prompt may have a documented default (e.g., `importance` defaults to `neutral`). `<enter>` accepts the default; `skip` leaves the field absent from frontmatter.
- **Refine flows** (existing values): each prompt shows the current value as the default. `<enter>` keeps it; explicit new value replaces it; `clear` (for list fields) empties it.

Optional fields that are skipped MUST be written as bare keys with no value (e.g., `due:` not `due: null`) so the file shape is consistent.

## Consumers

This reference is the canonical source for:
- `/mytasks add` (rich capture)
- `/mytasks refine <id>`
- `/mytasks` unknown-person three-option prompt (during rich capture)
- `/people add` (proactive create)
- `/people refine <handle>`
- `/backlog refine <id>` (after Task 13 refactor)

Future skills with interactive flows SHOULD reference this doc rather than re-specifying the protocol.
