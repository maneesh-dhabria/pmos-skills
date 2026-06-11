# /people Lookup — Fuzzy Match + Handle Derivation

## Fuzzy-match algorithm (`/people find <text>`)

Used by `/mytasks` quick-capture and rich-capture, and by users directly via `/people find <text>`.

Match priority — return on first hit (stop at the first tier that produces matches; never collect from lower tiers); within-tier ties resolved by `updated:` desc, then alphabetically by handle:

1. **Exact handle** match (case-insensitive, against `handle:`).
2. **Exact alias** match (case-insensitive, against any entry in `aliases:`).
3. **Exact name** match (case-insensitive, against `name:`).
4. **Substring match** on handle / name / aliases (case-insensitive). Handles 80% of "I typed half the name" queries.
5. **Initials match** — input length ≤ 3, all chars are letters → match against initials of `name:` (e.g., `sc` → `Sarah Chen`, `jpd` → `Jane Polly Doe`).

### Returns

- **0 matches:** empty list.
- **1 match:** single result.
- **N matches:** ranked list (priority tier first, then `updated:` desc, then handle, within a tier).

### Caller behavior

The lookup is read-only. Callers decide what to do with multiple matches:

- **`/mytasks` quick-capture:** skips and flags as unresolved (never blocks).
- **`/mytasks` rich-capture (people prompt):** prompts the user to disambiguate via `_shared/interactive-prompts.md` multi-option flow.
- **`/people show <text>`:** if N matches, render the ranked list and ask the user to invoke `/people show <handle>` with the exact handle.
- **`/people set <text> ...` / `/people refine <text>`:** if N matches, refuse with the ranked list; the user must pick a handle. (Disambiguating writes is essential — otherwise edits go to the wrong record.)

## Handle derivation (used on every create)

Given a `name` (e.g., `Sarah Chen`):

1. Tokenize the name on whitespace; lowercase each token; drop tokens that are pure punctuation.
2. **Single-token name** (e.g., `Sarah`):
   - Try `sarah`.
   - On collision: `sarah-2`, `sarah-3`, … until free.
3. **Multi-token name** (e.g., `Sarah Chen`):
   - Try `firstname-lastinitial` (`sarah-c`).
   - On collision: try `firstname-lastname` (`sarah-chen`).
   - On further collision: try `firstname-lastname-N` numeric suffix.
4. Always lowercase ASCII; replace non-alphanumeric runs with `-`; trim leading/trailing `-`.

A "collision" means a file with that handle already exists at `~/.pmos/people/{handle}.md`.

The handle, once written, is immutable. Renaming a person updates `name:` only; `handle:` stays. To change a handle, the user creates a new record and migrates references manually (rare, deliberately unautomated).
