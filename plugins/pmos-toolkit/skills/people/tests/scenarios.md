# Scenario Fixtures

Each section below describes an expected agent behavior given the matching fixture under `tests/fixtures/`. To verify, the implementer reads the relevant SKILL.md phases and walks through each scenario manually.

## Fixture: empty-people

A directory with no records (or a missing `~/.pmos/people/` directory).

### Scenario: `/people` (no args, empty fixture)

Expected:
- Output: `No people yet. Add a person with /people add <name>.`
- No files created.

### Scenario: `/people rebuild-index` (empty fixture)

Expected:
- Glob returns 0 files.
- Write `~/.pmos/people/INDEX.md` with header and empty table (column row only, no data rows).
- Output: `Regenerated INDEX.md: 0 people.`

## Fixture: with-people

Three records: `sarah-chen`, `mark-davis`, `sarah-patel`.

### Scenario: `/people` (no args, with-people fixture)

Expected:
- Read INDEX.md (skip regeneration since INDEX is fresh — `Last regenerated: 2026-04-22` matches the most recent record `updated:`).
- Render the INDEX.md table verbatim.

### Scenario: `/people` (no args, with-people fixture, after manual edit to sarah-chen.md without INDEX update)

Expected:
- Detect freshness drift (sarah-chen.md mtime newer than INDEX.md `Last regenerated:`).
- Regenerate INDEX.md (apply Phase 8).
- Render the regenerated INDEX.md.

### Scenario: `/people rebuild-index` (with-people fixture)

Expected:
- Read all 3 records.
- Sort by name ascending: Mark Davis, Sarah Chen, Sarah Patel.
- Write INDEX.md.
- Output: `Regenerated INDEX.md: 3 people.`

### Scenario: `/people find sarah-chen` (with-people fixture)

Expected (exact handle match, priority 1):
- Return single result: `sarah-chen`.
- Render: `1 match: sarah-chen (Sarah Chen)`.

### Scenario: `/people find sc` (with-people fixture)

Expected (alias match for sarah-chen, priority 2):
- Single result: `sarah-chen`.
- Render: `1 match: sarah-chen (Sarah Chen)` — the count + `{handle} ({name})` shape is the caller contract; an advisory match note (e.g., `— matched alias 'sc'`) may follow.

### Scenario: `/people find Sarah Chen` (with-people fixture)

Expected (exact name match, priority 3):
- Single result: `sarah-chen`.

### Scenario: `/people find sarah` (with-people fixture)

Expected (alias match for sarah-chen, priority 2 — beats substring tier):
- Single result: `sarah-chen` (alias `sarah` matches before substring tier fires).
- Render: `1 match: sarah-chen (Sarah Chen)` plus optional advisory match note.

### Scenario: `/people find sara` (with-people fixture)

Expected (substring match — `sara` is not an exact alias, so tier 4 fires):
- Two results, both Sarah-named records:
  - sarah-chen (updated 2026-04-22)
  - sarah-patel (updated 2026-04-22)
- Tie on date; alphabetical by handle (per `lookup.md`).
- Render (count first, then `{handle} ({name})` one per line — the caller contract; match notes advisory):
  ```
  2 matches:
    sarah-chen (Sarah Chen)
    sarah-patel (Sarah Patel)
  ```

### Scenario: `/people find SP` (with-people fixture)

Expected (initials match for Sarah Patel, priority 5; input length 2, all letters):
- Single result: `sarah-patel`.
- Render: `1 match: sarah-patel (Sarah Patel)` plus optional advisory match note.

### Scenario: `/people find xyz` (with-people fixture)

Expected (no match):
- Render: `No matches for 'xyz'.`

### Scenario: `/people who is sarah` (query-shaped free text — intent routing)

Expected (Phase 0 routes free text to `find`, never to a write):
- `who` is not a recognized verb; strip the query scaffolding ("who is") → `find sarah`.
- Alias match → `1 match: sarah-chen (Sarah Chen)`.
- NO record is created or modified.

## Fixture: empty-people (continued)

### Scenario: `/people add Sarah Chen` (empty fixture, no collisions)

Expected interactive flow (uses AskUserQuestion if available, else fallback per `_shared/interactive-prompts.md`):
1. Derive handle: `sarah-c` (single-token last name initial; no collision because empty fixture).
2. Prompt for `designation` (free string, skippable). User responds: `VP Engineering`.
3. Prompt for `role` (free string, skippable). User: `Eng Manager`.
4. Prompt for `working_relationship` (enum choice). User picks: `peer`.
5. Prompt for `team` (free string, skippable). User: `platform`.
6. Prompt for `email` (free string, skippable). User: `sarah@acme.com`.
7. Prompt for `workstreams` (comma-separated list, skippable). User: `platform-q3`.
8. Prompt for `aliases` (comma-separated list, skippable). User: `sarah, schen, sc`.
9. Write `~/.pmos/people/sarah-c.md` with all collected fields, `created`/`updated` = today.
10. Apply Phase 8 (regenerate INDEX.md).
11. Output: `Added sarah-c (Sarah Chen).`

### Scenario: `/people add Sarah Chen` (with-people fixture, sarah-c.md does NOT exist; sarah-chen.md DOES exist)

Expected:
- Derive handle: try `sarah-c` — not taken, use it. Write `~/.pmos/people/sarah-c.md`.
- All other steps as above.
- Output: `Added sarah-c (Sarah Chen).`

(This is a deliberate test of derivation collision handling: even though "sarah-chen" already exists as a different person's handle, the new "Sarah Chen" gets `sarah-c` because that's the first-tier derivation. The lookup algorithm distinguishes them by exact handle / aliases.)

### Scenario: `/people add Sarah` (with-people fixture, single-token name)

Expected:
- Derive handle: try `sarah` — not taken (no fixture record uses bare `sarah`), use it.
- Output: `Added sarah (Sarah).`

## Fixture: with-people (continued)

### Scenario: `/people show sarah-chen`

Expected:
- Locate `~/.pmos/people/sarah-chen.md`.
- Render the file content verbatim, fenced as markdown.

### Scenario: `/people show Sarah Chen`

Expected:
- Apply Phase 2 fuzzy match → tier 3 exact name match → 1 result `sarah-chen`.
- Render that record verbatim.

### Scenario: `/people show sarah` (ambiguous)

Expected:
- Apply Phase 2 → tier 2 alias match → 1 result `sarah-chen`.
- Render that record verbatim.

### Scenario: `/people show sara` (ambiguous, substring tier)

Expected:
- Apply Phase 2 → tier 4 → 2 results.
- Output: `Multiple matches: sarah-chen, sarah-patel. Run /people show <handle> with the exact handle.`

### Scenario: `/people show xyz`

Expected:
- Apply Phase 2 → 0 matches.
- Output: `No matches for 'xyz'. Run /people for the full list.`

### Scenario: `/people show 999nonexistent`

Expected: same as `xyz` — `No matches for '999nonexistent'.`

### Scenario: `/people list --workstream platform-q3`

Expected:
- Read all records.
- Filter to records whose `workstreams:` contains `platform-q3`.
- With-people fixture: sarah-chen and mark-davis match.
- Render flat sorted (by name) table with INDEX.md columns.

### Scenario: `/people list --relationship peer`

Expected:
- Filter to `working_relationship: peer`.
- With-people fixture: sarah-chen, mark-davis match (sarah-patel is `team-member`).
- Render flat sorted table.

### Scenario: `/people list --workstream platform-q3 --relationship peer` (combined)

Expected: AND semantics. Same two records (both filters pass for sarah-chen and mark-davis).

### Scenario: `/people set sarah-chen team=infra`

Expected:
- Validate `team` is an allowed editable field. (`team` is free-string, no enum check.)
- Load sarah-chen.md, update `team: infra`, set `updated:` to today.
- Apply Phase 8 (regenerate INDEX).
- Output: `Updated sarah-chen: team = infra.`

### Scenario: `/people set sarah-chen working_relationship=invalid_value`

Expected:
- Validate against enum. `invalid_value` not in allowed list.
- Output: `Unknown working_relationship 'invalid_value'. Allowed: boss, direct-report, peer, team-member, stakeholder, external, other.`
- No write.

### Scenario: `/people set sarah-chen handle=new-handle`

Expected:
- `handle` is skill-managed; not editable directly.
- Output: `Field 'handle' cannot be set directly. The skill manages it.`
- No write.

### Scenario: `/people set sarah team=infra` (fuzzy input, unique match)

Expected (Phase 6 Step 1 resolves like `show`, per `lookup.md` "Caller behavior"):
- `sarah` is not an existing handle file → apply find → tier 2 alias match → unique → `sarah-chen`.
- Proceed: update `team: infra` on sarah-chen, set `updated:`, regenerate INDEX.
- Output: `Updated sarah-chen: team = infra.`

### Scenario: `/people set sara team=infra` (fuzzy input, multi-match)

Expected (disambiguate-before-write — refuse on multi-match):
- Find → tier 4 substring → 2 matches (sarah-chen, sarah-patel).
- Refuse with the ranked list: `Multiple matches: sarah-chen, sarah-patel. Run /people set <handle> ... with the exact handle.`
- No write.

### Scenario: `/people refine sara` (fuzzy input, multi-match)

Expected: same refusal as `set` — ranked list, no prompts, no write.

### Scenario: `/people refine sarah-chen`

Expected interactive flow per `_shared/interactive-prompts.md` — same field order as Phase 3, but pre-filled with current values:
1. Prompt designation (current: `VP Engineering`). User: `<enter>` to keep.
2. Prompt role (current: `Eng Manager`). User: types `Director of Engineering`.
3. Prompt working_relationship (current: `peer`). User: `<enter>`.
4. Prompt team (current: `platform`). User: `<enter>`.
5. Prompt email (current: `sarah@acme.com`). User: `<enter>`.
6. Prompt workstreams (current: `platform-q3`). User: `<enter>`.
7. Prompt aliases (current: `sarah, schen, sc`). User: appends, types `sarah, schen, sc, schen2`.
8. Write back, set `updated:` to today.
9. Apply Phase 8.
10. Output: `Refined sarah-chen.`
