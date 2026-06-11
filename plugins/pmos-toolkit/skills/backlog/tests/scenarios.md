# Scenario Fixtures

Each section below describes an expected agent behavior given the matching fixture under `tests/fixtures/`.

## Fixture: with-items

The `with-items` fixture contains canonical item files demonstrating every frontmatter field. After reading `schema.md`, the agent should be able to:
- Identify all enum values for `type`, `status`, `priority`.
- Reproduce the body section structure (## Context, ## Acceptance Criteria, ## Notes).
- Recognize that empty optional fields (`spec_doc:`, `plan_doc:`, `pr:`) are written as bare keys with no value, not omitted.

## Fixture: empty-repo

A repo with no `backlog/` directory yet.

### Scenario: `/backlog add ssl renewal cron is flaky`

Expected agent behavior (single round-trip, no clarifying questions):
1. Create `backlog/`, `backlog/items/`.
2. Allocate id `0001`.
3. Infer `type: bug` (keyword "flaky").
4. Write `backlog/items/0001-ssl-renewal-cron-flaky.md` with frontmatter only (no body), `status: inbox`, `priority: should`, `created`/`updated` = today.
5. Generate `backlog/INDEX.md`.
6. Output: `Captured #0001 (bug, should): "ssl renewal cron is flaky"`.
7. Do NOT ask any clarifying questions. Do NOT load workstream context. Do NOT mention pipeline integration.

### Scenario: `/backlog "we should add OAuth"`

(No verb prefix, not query-shaped; falls through the `SKILL.md#routing` table as add.)

Expected:
- id `0002`, `type: feature` (keyword "we should"), `status: inbox`, `priority: should`.
- Output: `Captured #0002 (feature, should): "we should add OAuth"`.

### Scenario: `/backlog add something completely vague`

Expected:
- id `0003`, `type: idea` (no keyword match → fallback), `status: inbox`.
- Output includes the inference fallback notice: `Captured #0003 (idea, should): "something completely vague" — type inferred as 'idea' (no strong signal); use /backlog set 0003 type=... to correct.`

### Scenario: `/backlog what's in my backlog for auth?` (with-items fixture)

Expected (query-shaped intent guard in `SKILL.md#routing`):
- NO item is created — a question about the backlog never routes to capture.
- Routes to the list handler with "auth" interpreted as a filter (title/label match).
- `items/` is unchanged afterward.

### Scenario: `/backlog` (no args, with-items fixture)

Expected: render `INDEX.md` content (or regenerate then render). Output groups items by priority bucket, must-first.

### Scenario: `/backlog list --status inbox`

Expected: list only items with `status: inbox`. With the `with-items` fixture, only `#0003` matches.

### Scenario: `/backlog list --type feature`

Expected: only `#0002`.

### Scenario: `/backlog show 2`

Expected: render the full content of `backlog/items/0002-add-rate-limit-to-api.md` verbatim.

### Scenario: `/backlog show 999`

Expected: error `No item with id 0999. Closest matches by prefix: (none). Run /backlog list to see all items.`

### Scenario: `/backlog rebuild-index` after a manual edit

Expected: read all files in `items/`, regenerate `INDEX.md`, report `Regenerated INDEX.md: 3 items.`

### Scenario: `/backlog refine 3` (with-items fixture)

Expected: interactive flow (uses AskUserQuestion if available):
1. Show current title and ask if anything needs editing.
2. Ask for `## Context` content (multi-line; "skip" allowed).
3. Ask for acceptance criteria as a list (one per line; "done" to finish).
4. Confirm `priority` (default the current value).
5. Optionally collect `score` (skippable).
6. Optionally collect `labels` (comma-separated, skippable).
7. Write the body sections to the item file. Update `status: ready` if currently `inbox`. Update `updated:` to today.
8. Regenerate INDEX.md.
9. Confirm in one line including the id and the status transition (e.g., `Refined #0003. Status: inbox -> ready.`).

### Scenario: `/backlog set 3 priority=must`

Expected: validate `must` against the priority enum (per `schema.md`), edit only that field, update `updated:` to today, regenerate INDEX.md, confirm in one line including id, field, and new value (e.g., `Updated #0003: priority = must.`).

### Scenario: `/backlog set 3 status=invalid-status`

Expected: error `Unknown status 'invalid-status'. Allowed: inbox, ready, spec'd, planned, in-progress, done, wontfix.` No file write.

### Scenario: `/backlog set 3 score=820`

Expected: write `score: 820` (creating the field if absent). Validate 1 <= score <= 1000.

### Scenario: `/backlog link 2 docs/.pmos/2026-04-22-rate-limit-spec.md`

Expected: infer field from filename pattern: `*-spec.md` -> `spec_doc`, `*-plan.md` -> `plan_doc`, anything matching `https://github.com/*/pull/*` -> `pr`. For this case, set `spec_doc:` to the path. Confirm in one line including id, field, and value (e.g., `Linked #0002: spec_doc = docs/.pmos/2026-04-22-rate-limit-spec.md.`).

### Scenario: `/backlog link 2 https://github.com/foo/bar/pull/99`

Expected: set `pr:` to the URL. Confirm in one line (e.g., `Linked #0002: pr = https://github.com/foo/bar/pull/99.`).

### Scenario: `/backlog promote 3` (status=inbox, with-items fixture)

Expected:
1. Item #0003 has `status: inbox` and minimal body.
2. Skill picks `/requirements` as the target — routing is by status only (`inbox` -> `/requirements`; `ready` -> `/spec`), regardless of type.
3. Invokes `/requirements --backlog 0003` with the item's title + body as the seed.
4. The pipeline-bridge in `/requirements` recognizes `--backlog 0003` and, on doc-write, sets `source:` on item #0003.
5. After `/requirements` returns, confirm in one line including id, target, and seeded path (e.g., `Promoted #0003 -> /requirements. (source linked)`).

### Scenario: `/backlog promote 2` (status=spec'd)

Expected: error `#0002 is already at status 'spec'd'. To replan, use /plan --backlog 0002 directly.`

## Fixture: with-archive

### Scenario: `/backlog archive` (today = 2026-04-25)

Expected:
1. Item #0001 (`status: done`, `updated: 2026-01-15`, age > 30d) -> moved to `backlog/archive/2026-Q1/0001-old-done-thing.md`.
2. Item #0002 (`status: done`, `updated: 2026-04-20`, age 5d) -> stays.
3. Item #0003 (`status: ready`) -> stays.
4. INDEX.md regenerated.
5. Report one line with count and per-item destination (e.g., `Archived 1 item: #0001 -> 2026-Q1.`).

### Scenario: `/backlog archive --quarter 2026-Q1`

Expected: archive ALL eligible items into `2026-Q1` regardless of `updated:` quarter. Same rules otherwise (only `done`/`wontfix` and >30 days).

## Fixture: multi-repo-workstream

### Scenario: `/backlog list --workstream` (run from repo-a, workstream=test-workstream)

Expected:
- Aggregator reads workstream.md, finds linked_repos=[repo-a, repo-b].
- Reads items from each.
- Both items have id `0001` -> shown as `repo-a#0001` and `repo-b#0001`.
- Sorted: `repo-b#0001` (priority must) first, then `repo-a#0001` (priority should).
- Columns include a `repo` column.

### Scenario: `/backlog show repo-b#0001`

Expected: render `tests/fixtures/multi-repo-workstream/repo-b/backlog/items/0001-thing-in-b.md`.
