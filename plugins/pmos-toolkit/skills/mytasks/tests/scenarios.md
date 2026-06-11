# Scenario Fixtures

Each section describes an expected agent behavior given the matching fixture under `tests/fixtures/`. To verify, the implementer reads the relevant SKILL.md phases and walks through each scenario manually.

## Fixture: empty-tasks

A directory with no items (or missing `~/.pmos/tasks/`).

### Scenario: `/mytasks` (no args, empty fixture)

Expected:
- Output: `No tasks yet. Capture one with /mytasks <text> or /mytasks add <text>.`
- No files created.

### Scenario: `/mytasks rebuild-index` (empty fixture)

Expected:
- Glob returns 0 item files.
- Write `~/.pmos/tasks/INDEX.md` with header + 3 empty buckets (each bucket has its `## {name}` header + column row, no data rows).
- Output: `Regenerated INDEX.md: 0 active items (0 completed/dropped excluded).`

## Fixture: with-tasks

Four items: 0001 (leverage, in-progress, due 2026-05-12), 0002 (neutral, call, pending, due 2026-05-01, next_checkin 2026-05-08), 0003 (overhead, waiting), 0004 (neutral, read, pending).

### Scenario: `/mytasks` (no args, with-tasks fixture)

Expected:
- Read INDEX.md (skip regen since INDEX is fresh).
- Render verbatim.
- Output groups: `## leverage` with 0001, `## neutral` with 0002 and 0004 (sorted by due asc; 0002 first because it has a due date), `## overhead` with 0003.

### Scenario: `/mytasks rebuild-index` (with-tasks fixture)

Expected:
- Read all 4 items.
- Group by importance: leverage (0001), neutral (0002, 0004), overhead (0003).
- Within neutral: sort by due asc, no-due last → 0002 (due 2026-05-01), then 0004 (no due).
- Write INDEX.md with the expected shape.
- Output: `Regenerated INDEX.md: 4 active items (0 completed/dropped excluded).`

## Fixture: empty-tasks (continued — quick capture)

### Scenario: `/mytasks Call sarah about Q3 OKRs by Friday` (today is 2026-04-25, a Saturday)

Expected single tool-call sequence (no blocking, no questions):
1. Parse: `Call` → type `call`. `by Friday` → due `2026-05-01` (next Friday after Sat 2026-04-25).
2. Strip `by Friday` from the title; `Call` stays in title (it's the type signal but also natural language).
3. The remaining title: `Call sarah about Q3 OKRs`.
4. Allocate id `0001`.
5. Workstream: if invoked outside a `.pmos/settings.yaml` repo, leave absent.
6. People: `sarah` is bare (no `@`), stays in title. Empty `people:`.
7. Slug: `call-sarah-about-q3-okrs`.
8. Write `~/.pmos/tasks/items/0001-call-sarah-about-q3-okrs.md` with frontmatter only (no body).
9. Frontmatter: `id: 0001`, `title: Call sarah about Q3 OKRs`, `type: call`, `importance: neutral`, `status: pending`, `due: 2026-05-01`, `created`/`updated` = today, all other optional fields as bare keys.
10. Apply Phase 12 (rebuild INDEX).
11. Output: `Captured #0001 (call, neutral): "Call sarah about Q3 OKRs" — due 2026-05-01.`

### Scenario: `/mytasks Sync with @sarah on roadmap` (with-people fixture sibling exists; sarah → sarah-chen via alias)

Expected:
1. Parse: no type keyword, default `execution`. No date. `@sarah` → `/people find sarah` → tier 2 alias match → `sarah-chen`.
2. Strip `@sarah` from title (resolved). Remaining: `Sync with on roadmap`. (Acceptable — preserve user's words; do NOT prettify mid-sentence.)
3. Allocate id `0002`.
4. Slug: `sync-with-on-roadmap`.
5. Write item file with `people: [sarah-chen]`, all other fields as default.
6. Output: `Captured #0002 (execution, neutral): "Sync with on roadmap" — people: sarah-chen.`

### Scenario: `/mytasks Sync with @unknown_person on roadmap`

Expected:
1. `@unknown_person` → `/people find unknown_person` → 0 matches.
2. Token NOT stripped from title (preserves user intent).
3. `people: []` (empty list).
4. Output includes unresolved warning:
   ```
   Captured #0003 (execution, neutral): "Sync with @unknown_person on roadmap"
     ⚠ unresolved: @unknown_person — run /people add unknown_person, then /mytasks set 0003 people=<handle>
   ```

### Scenario: `/mytasks Sync with @sara on roadmap` (with-people fixture; ambiguous — substring match returns sarah-chen and sarah-patel)

Expected:
1. `@sara` → `/people find sara` → tier 4 substring match → 2 results.
2. Multi-match: skip (do not pick), token stays in title.
3. `people: []`.
4. Output:
   ```
   Captured #0004 (execution, neutral): "Sync with @sara on roadmap"
     ⚠ unresolved: @sara — multiple matches (sarah-chen, sarah-patel); run /mytasks set 0004 people=<handle>
   ```

### Scenario: `/mytasks Read OKR doc tomorrow`

Expected:
1. `Read` → type `read`. `tomorrow` → due = today + 1.
2. Strip `tomorrow`. Title: `Read OKR doc`.
3. Output: `Captured #0005 (read, neutral): "Read OKR doc" — due {today+1}.`

### Scenario: `/mytasks Buy birthday gift` (no inferable type, no date)

Expected:
1. No type keyword → default `execution`. No date.
2. Title: `Buy birthday gift`.
3. Output: `Captured #0006 (execution, neutral): "Buy birthday gift".` (No due, no people, no workstream — minimal report.)

### Scenario: `/mytasks what's due this week` (query-shaped free text — intent routing)

Expected (Phase 0 "route by intent" principle):
1. The text reads as a view request, not a thing-to-do → route to the `week` named view (`list --due this-week`).
2. NO task is created; no item file is written.
3. Output: the filtered table (or `No items match.`).

### Scenario: `/mytasks what's on my plate` (query-shaped free text)

Expected:
1. Reads as a view request → route to the default daily view (Phase 1).
2. NO task is created.

### Scenario: `/mytasks add Prep board deck` (empty fixture)

Expected interactive flow per `_shared/interactive-prompts.md`:
1. Allocate id `0001`.
2. Prompt `importance` (enum): `leverage`, `neutral` (default), `overhead`. User picks: `leverage`.
3. Prompt `type` (enum): `execution` (default — no keyword inferred from "Prep board deck"), `follow-up`, `reminder`, `idea`, `read`, `call`. User: `<enter>` (keeps execution).
4. Prompt `workstream` (free string, default = inferred from `.pmos/settings.yaml` if present, else empty). User: `board-q2`.
5. Prompt `due` (date input). User: `Friday`. Skill parses → next Friday's ISO date.
6. Prompt `people` (comma-separated, skippable). User: `Mark, Lisa`.
7. For each name token, call `/people find`:
   - `Mark` → tier 2 alias match if `mark` is in mark-davis's aliases; assume yes → resolves silently.
   - `Lisa` → 0 matches → triggers unknown-person three-option prompt.
8. **Unknown-person prompt** (multi-option per `_shared/interactive-prompts.md`):
   ```
   No match for 'Lisa' — what would you like to do?
     (a) create new person 'Lisa'
     (b) pick existing: (none with similar name)
     (c) skip — leave 'Lisa' unresolved
   ```
   User picks `(a)`. Invoke `/people` reactive create with name `Lisa` → returns handle `lisa`. Append `lisa` to the task's `people:` list.
9. Prompt `checkin` (enum): `daily`, `weekly`, `biweekly`, `monthly`, `none` (default). User picks `weekly`. Skill auto-sets `next_checkin: today + 7 days`.
10. Build slug from title: `prep-board-deck`.
11. Write `~/.pmos/tasks/items/0001-prep-board-deck.md` with collected fields.
12. Apply Phase 12 (rebuild INDEX).
13. Output: `Added #0001 (execution, leverage): "Prep board deck" — due {Friday-date}, workstream board-q2, people: mark-davis, lisa, checkin weekly (next 2026-05-02).`

### Scenario: `/mytasks add Quick standalone task` (skip everything optional)

Expected:
1. Allocate id.
2. Prompt importance. User: `<enter>` (neutral default).
3. Prompt type. User: `<enter>` (execution default).
4. Prompt workstream. User: `skip` or `<enter>` (empty).
5. Prompt due. User: `skip`.
6. Prompt people. User: `skip`.
7. Prompt checkin. User: `<enter>` (none default).
8. Write item with frontmatter only, no body, all optional fields empty.
9. Output: `Added #{id} (execution, neutral): "Quick standalone task".` (No clauses since nothing optional was set.)

## Fixture: with-tasks (continued — list & named views)

### Scenario: `/mytasks list` (no flags)

Expected:
- Read INDEX.md.
- Render flat sorted list (importance leverage > neutral > overhead → due asc → updated desc).
- Output table columns: id, type, status, due, next_checkin, title, workstream.
- Order: 0001, 0002, 0004, 0003.

### Scenario: `/mytasks list --status pending`

Expected:
- Filter to `status: pending`. From with-tasks: 0002, 0004 (0001 is in-progress, 0003 is waiting).
- Source: INDEX.md (status is an INDEX column).
- Render flat sorted: 0002 first (has due), 0004 second.

### Scenario: `/mytasks list --workstream platform-q3 --importance leverage`

Expected:
- AND filter: workstream platform-q3 AND importance leverage.
- Match: 0001 only.
- Source: INDEX.md (both filters map to INDEX columns; importance is the bucket).
- Output: single-row table.

### Scenario: `/mytasks list --label reading` (label not in INDEX)

Expected:
- Filter requires reading item files (labels not in INDEX).
- Read all items, filter to those whose `labels:` contains `reading`. Match: 0004.
- Output: single row.

### Scenario: `/mytasks list --person sarah-chen` (people not in INDEX)

Expected:
- Filter requires reading item files (people not in INDEX).
- Read all items, filter to those whose `people:` contains `sarah-chen`. Match: 0001, 0002.
- Output: two-row table, sorted by importance bucket (0001 leverage first, then 0002 neutral).

### Scenario: `/mytasks today` (assume today = 2026-05-01)

Expected:
- Equivalent to `/mytasks list --due today`.
- INDEX.md filter: `due: 2026-05-01`. Match: 0002.
- Output: single row.

### Scenario: `/mytasks week` (assume today = 2026-04-25)

Expected:
- Equivalent to `/mytasks list --due this-week`.
- "this-week" window: today through today + 7 days, i.e., 2026-04-25 to 2026-05-02.
- INDEX.md filter: `due` in window. Match: 0002 (due 2026-05-01).
- Output: single row.

### Scenario: `/mytasks overdue` (assume today = 2026-06-01)

Expected:
- Equivalent to `/mytasks list --due overdue`.
- Filter: `due < today` AND `status` NOT in (completed, dropped). All due dates are before 2026-06-01: 0001 (2026-05-12), 0002 (2026-05-01). 0003, 0004 have no due — excluded.
- Output: 2 rows.

### Scenario: `/mytasks waiting`

Expected:
- Equivalent to `/mytasks list --status waiting`.
- Match: 0003.
- Output: single row.

### Scenario: `/mytasks checkins` (today = 2026-05-08)

Expected:
- Equivalent to `/mytasks list --checkin-due`.
- Filter: `next_checkin <= today`. Match: 0002 (next_checkin 2026-05-08).
- Output: single row.

### Scenario: `/mytasks for sarah-chen`

Expected:
- Equivalent to `/mytasks list --person sarah-chen`.
- Reads item files. Match: 0001, 0002.

### Scenario: `/mytasks in platform-q3`

Expected:
- Equivalent to `/mytasks list --workstream platform-q3`.
- INDEX.md filter. Match: 0001, 0002.

### Scenario: `/mytasks list --status open` (invalid enum value)

Expected:
- Validate against status enum. `open` is not in the list.
- Output: `Unknown status 'open'. Allowed: pending, in-progress, waiting, completed, dropped.`
- No render.

### Scenario: `/mytasks show 1` (with-tasks fixture)

Expected:
- Normalize id `1` → `0001`.
- Locate `~/.pmos/tasks/items/0001-*.md`.
- Render the file content verbatim, fenced as markdown.

### Scenario: `/mytasks show 999` (with-tasks fixture)

Expected:
- Search items/, search archive/. Not found.
- Find existing items whose id starts with the same digit prefix (`9` → none in fixture).
- Output: `No item with id 0999. Closest matches by prefix: (none). Run /mytasks list to see all items.`

### Scenario: `/mytasks set 2 importance=leverage` (with-tasks fixture)

Expected:
- Validate `leverage` against importance enum. Pass.
- Load 0002 file, update `importance: leverage`, set `updated:` to today, write back.
- Apply Phase 12.
- Output: `Updated #0002: importance = leverage.`

### Scenario: `/mytasks set 2 status=invalid_status`

Expected:
- Validate against status enum. Fail.
- Output: `Unknown status 'invalid_status'. Allowed: pending, in-progress, waiting, completed, dropped.`
- No write.

### Scenario: `/mytasks set 2 id=99`

Expected:
- `id` is skill-managed.
- Output: `Field 'id' cannot be set directly. The skill manages it.`
- No write.

### Scenario: `/mytasks set 2 title="Call sarah on Q3 roadmap"`

Expected:
- Edit `title:`.
- ALSO rename file: `0002-call-sarah-on-roadmap.md` → `0002-call-sarah-on-q3-roadmap.md` (preserve id prefix; recompute slug from new title).
- Set `updated:` to today.
- Apply Phase 12.
- Output: `Updated #0002: title = Call sarah on Q3 roadmap. Renamed to 0002-call-sarah-on-q3-roadmap.md.`

### Scenario: `/mytasks refine 1` (with-tasks fixture)

Expected interactive flow per `_shared/interactive-prompts.md`, same field order as Phase 3 plus a leading title prompt, pre-filled:
1. Prompt title (current: `Draft Q3 OKRs for Platform team`). User: `<enter>`.
2. Prompt importance (current: `leverage`). User: `<enter>`.
3. Prompt type (current: `execution`). User: `<enter>`.
4. Prompt workstream (current: `platform-q3`). User: `<enter>`.
5. Prompt due (current: `2026-05-12`). User: `2026-05-15`. Skill parses date.
6. Prompt people (current: `sarah-chen`). User: `sarah-chen, mark-davis`. Skill resolves both via /people find.
7. Prompt checkin (current: empty/none). User: `weekly`. Skill auto-sets `next_checkin: today + 7 days`.
8. Write back, set `updated:` to today.
9. Apply Phase 12.
10. Output: `Refined #0001.`

### Scenario: `/mytasks done 1 wrapped this up` (with-checkins fixture, today = 2026-04-25)

Expected:
- Locate 0001.
- Set `status: completed`, `completed: 2026-04-25`, `updated: 2026-04-25`.
- Append note to `## Notes` (creating section if absent): `- 2026-04-25: wrapped this up`.
- Apply Phase 12 (item leaves INDEX since completed).
- Output: `Completed #0001: "Weekly 1on1 prep".`

### Scenario: `/mytasks done 1` (no note)

Expected: same as above but no note appended.

### Scenario: `/mytasks drop 2 vendor never responded` (with-checkins fixture, today = 2026-04-25)

Expected:
- Locate 0002.
- Set `status: dropped`, `completed: 2026-04-25`, `updated: 2026-04-25`.
- Append to `## Notes`: `- 2026-04-25: dropped — vendor never responded`.
- Apply Phase 12.
- Output: `Dropped #0002: "SSL cert renewal blocked on vendor".`

## Fixture: with-checkins (continued — checkin mechanics)

### Scenario: `/mytasks checkin 1 quick sync, all green` (today = 2026-04-25)

Expected:
- Locate 0001 (status: in-progress, checkin: weekly, next_checkin: 2026-04-25).
- Append to `## Check-ins`: `- 2026-04-25: quick sync, all green`. (Section already exists.)
- Advance `next_checkin: 2026-05-02` (today + 7 days).
- Status was `in-progress`, NOT `waiting` → no transition prompt.
- Set `updated: 2026-04-25`.
- Apply Phase 12.
- Output: `Checked in on #0001. Next checkin: 2026-05-02.`

### Scenario: `/mytasks checkin 2 still no response from vendor` (today = 2026-04-25, status: waiting)

Expected:
- Locate 0002.
- Append to `## Check-ins`: `- 2026-04-25: still no response from vendor`. (Section absent → create.)
- Advance `next_checkin: 2026-05-02`.
- Status was `waiting` → prompt: `Move to in-progress? [Y/n]`. User says `Y`.
- Set `status: in-progress`, `updated: 2026-04-25`.
- Apply Phase 12.
- Output: `Checked in on #0002. Status: waiting → in-progress. Next checkin: 2026-05-02.`

### Scenario: `/mytasks checkin 1` (no note, weekly cadence)

Expected:
- Append `- 2026-04-25:` (no note text after the colon).
- Advance next_checkin.
- Output as above.

### Scenario: cadence math edge cases

For `monthly` cadence: today = 2026-01-31. Advance to 2026-02-28 (clamp to last day of February since Feb 31 doesn't exist).
For `monthly` cadence: today = 2026-02-15. Advance to 2026-03-15.
For `daily`: today = 2026-04-25 → next 2026-04-26.
For `biweekly`: today = 2026-04-25 → next 2026-05-09.
For `none`: leave next_checkin blank.

## Fixture: with-archive

Four items: 0010 (recent done, 5 days), 0011 (old done, 69 days, Q1), 0012 (old dropped, 64 days, Q1), 0013 (active).

### Scenario: `/mytasks archive` (today = 2026-04-25, no --quarter flag)

Expected:
- Eligible: status in (completed, dropped) AND today - updated > 30 days.
- 0010: completed, 5 days → NOT eligible.
- 0011: completed, 69 days → eligible. Target = year-of-updated 2026, quarter-of-updated Q1 → `2026-Q1`.
- 0012: dropped, 64 days → eligible. Target = `2026-Q1`.
- 0013: in-progress → NOT eligible.
- Move 0011 to `~/.pmos/tasks/archive/2026-Q1/0011-old-done-task.md`.
- Move 0012 to `~/.pmos/tasks/archive/2026-Q1/0012-old-dropped-task.md`.
- Apply Phase 12 (INDEX unchanged since archived items were already excluded).
- Output: `Archived 2 items: #0011 → 2026-Q1, #0012 → 2026-Q1.`

### Scenario: `/mytasks archive --quarter 2026-Q2` (today = 2026-04-25)

Expected:
- Same eligibility check.
- BUT target overridden to `2026-Q2` for both eligible items (--quarter override).
- Move 0011 and 0012 to `~/.pmos/tasks/archive/2026-Q2/`.
- Output: `Archived 2 items: #0011 → 2026-Q2, #0012 → 2026-Q2.`

### Scenario: `/mytasks archive` (today = 2026-04-25, with-tasks fixture which has zero eligible items)

Expected:
- 0001 (in-progress), 0002 (pending), 0003 (waiting), 0004 (pending) — all active, none eligible.
- No moves.
- Output: `Archived 0 items: nothing eligible.`
