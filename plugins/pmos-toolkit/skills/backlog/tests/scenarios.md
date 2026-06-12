# Scenario Fixtures

Each section below describes an expected agent behavior given the matching fixture under `tests/fixtures/`. Enum values, status machines, and the `tasks.yaml` shape are owned by `schema.md` — these scenarios illustrate behavior, not the contract.

## Fixture: with-items

The `with-items` fixture contains canonical item files demonstrating frontmatter fields. After reading `schema.md`, the agent should be able to:
- Identify the enum values for `type`, `priority`, and both `status` machines (epic vs story).
- Reproduce the body section structure (## Context, ## Acceptance Criteria, ## Notes).
- Recognize that empty optional fields (`spec_doc:`, `plan_doc:`, `pr:`) are written as bare keys with no value.
- Treat an item with no `kind:` field as `kind: story` (back-compat).

## Fixture: empty-repo

A repo with no `backlog/` directory yet.

### Scenario: `/backlog add ssl renewal cron is flaky`

Expected agent behavior (single round-trip, no clarifying questions):
1. Create `backlog/`, `backlog/items/`.
2. Allocate id `0001` for the story; infer `type: bug` (keyword "flaky"); `kind: story`, `status: draft`, `priority: should`.
3. **Auto-wrap (D18):** also create a same-titled singleton **epic** `0002` (`status: inbox`); set the story's `parent: 0002`.
4. Write both item files (frontmatter only, no body), `created`/`updated` = today.
5. Generate `backlog/INDEX.md`.
6. Output: `Captured #0001 (bug, story, should): "ssl renewal cron is flaky" in epic #0002`.
7. Do NOT ask any clarifying questions. Do NOT load workstream context.

### Scenario: `/backlog add --kind epic "Magazine interop"`

Expected: a single **epic** item (`kind: epic`, `status: inbox`), no auto-wrapped story, no `parent:`. Output: `Captured #0001 (feature, epic, should): "Magazine interop"`.

### Scenario: `/backlog add --epic 0002 "export as OPML"`

Expected: a story with `parent: 0002` attached to the existing epic (no new epic created). Validate epic `0002` exists; if missing, warn and fall through to auto-wrap.

### Scenario: `/backlog add something completely vague`

Expected: story + auto-wrapped epic; `type: idea` (no keyword match → fallback); output includes the inference fallback notice: `Captured #0001 (idea, story, should): "something completely vague" in epic #0002 — type inferred as 'idea' (no strong signal); use /backlog set 0001 type=... to correct.`

### Scenario: `/backlog what's in my backlog for auth?` (with-items fixture)

Expected (query-shaped intent guard in `SKILL.md#routing`):
- NO item is created — a question about the backlog never routes to capture.
- Routes to `#interpret` with "auth" interpreted as a filter (title/label match).
- `items/` is unchanged afterward.

### Scenario: `/backlog` (no args, with-items fixture)

Expected: the three-queue dashboard (`#dashboard`) — groom summary, next preview, releases shelf — followed by the `INDEX.md` content (regenerated if stale).

### Scenario: `/backlog list --status planned` (with-items fixture)

Expected: list only items with `status: planned` (per `#interpret`'s list path). Only `#0002` matches.

### Scenario: `/backlog show 2` (with-items fixture)

Expected: render the full content of `backlog/items/0002-add-rate-limit-to-api.md` verbatim, fenced.

### Scenario: `/backlog show 999`

Expected: error `No item with id 0999. Closest matches by prefix: (none). Run /backlog list to see all items.`

### Scenario: `/backlog set 1 status=open` (with-items fixture, #0001 is a story)

Expected: error keyed off the item's kind (story machine, from `schema.md`): `Unknown status 'open'. Allowed: draft, ready, planned, in-progress, done, released, blocked, wontfix.` No file write.

### Scenario: `/backlog set 1 score=820`

Expected: write `score: 820` (creating the field if absent). Validate 1 ≤ score ≤ 1000.

### Scenario: `/backlog set 1 status=done` rejected protection

Expected: `id`, `created`, `updated` reject with `Field '<field>' cannot be set directly. The skill manages it.` (status itself is settable.)

### Scenario: `/backlog link 2 docs/.pmos/2026-04-22-rate-limit-spec.md`

Expected (via `#interpret` link path): infer `*-spec.md` → `spec_doc`, set it, confirm one line: `Linked #0002: spec_doc = docs/.pmos/2026-04-22-rate-limit-spec.md.`

### Scenario: `/backlog link 2 https://github.com/foo/bar/pull/99`

Expected: infer `*/pull/N` → `pr`, set it. Confirm one line.

### Scenario: `/backlog promote 3` (with-items, #0003 status=inbox/draft)

Expected: route by status — `draft`/`inbox` → seed `/requirements --backlog 0003`; confirm one line on return. (Promote is the lightweight single-item path; the three-loop path is `/feature-sdlc define`.)

### Scenario: `/backlog promote 2` (status=planned)

Expected: refuse — `#0002 is at status 'planned'. Use /feature-sdlc build --story 0002.` No further action.

### Scenario: `/backlog rebuild-index` after a manual edit

Expected: read all files in `items/`, regenerate `INDEX.md` with the `## Epics` rollup + priority-grouped stories, report `Regenerated INDEX.md: 3 items.`

### Scenario: `/backlog refine 3` (with-items fixture)

Expected: interactive flow (one field at a time); write the body sections; for a story with ≥1 AC, transition `status: draft|inbox → ready`; update `updated:`. Confirm one line including the status transition.

## Fixture: with-epics-stories

Epic `#0010 magazine-interop` (`defined`) with stories `#0011 OPML import` (`done`, no deps) and `#0012 OPML export` (`planned`, `dependencies: [0011]`). `#0012` has a `tasks.yaml` under its story folder.

### Scenario: `/backlog next`

Expected (`#next`): `#0012` is the pick — its dep `#0011` is `done`, it is unclaimed, and it belongs to an in-flight epic. Output: `Next: #0012 [must] OPML export command (epic #0010). Claim with /backlog claim 0012 or /feature-sdlc build --next.` `--json` emits `{id, parent, title, route, plan_doc, tasks_file, worktree, dependencies}`.

### Scenario: `/backlog next` with `#0011` NOT done

Expected: with `#0011` at `planned`, `#0012`'s dep is unsatisfied → no candidate → `No ready story. Run /backlog groom to see what's waiting on you.`

### Scenario: `/backlog claim 0012`

Expected: `node scripts/claim-lock.js acquire <repo>/backlog/claims 0012 …` creates the lock (exit 0); stamp `claimed_by:` in the main checkout; auto-commit `chore(backlog): 0012 → claimed [claim]`. A second `claim 0012` while held → refuse with the holder. `/backlog unclaim 0012` releases the lock and clears `claimed_by:`.

### Scenario: `/backlog show 0012 --tasks`

Expected: render `#0012` verbatim, then render its `tasks.yaml` read-only with derived readiness — `T1` (pending, no deps) is "ready"; `T2`/`T3` (deps `[T1]`, T1 not done) are "blocked". Never writes the file.

### Scenario: `/backlog groom`

Expected (`#groom`): epic `#0010` is `defined` (not in needs-definition); no draft stories; no blocked stories; no stale claims → `Nothing waiting on you. Run /backlog next to see what the machine can pick up.` (If `#0012` were `blocked`, it would appear under "blocked" with its gap text.)

### Scenario: `/backlog releases`

Expected (`#releases`): epic `#0010` is **in-flight** (`1/2 done` — `#0011` done, `#0012` planned), not release-ready. Output shows the in-flight rollup. When `#0012` also reaches `done`, `#0010` becomes **release-ready** and shows both story summaries (the changelog preview) + the copy-ready `/complete-dev --epic 0010`.

### Scenario: wontfix-dep poison (D30)

Expected: if `#0011` were `wontfix`, the picker treats `#0012`'s dep on it as permanently unsatisfiable → `#0012` flips `blocked` with `blocked: depends on wontfix #0011` and surfaces in `groom`. Never silently skipped.

## Fixture: with-archive

### Scenario: `/backlog archive` (today = 2026-04-25)

Expected (via `#interpret` archive path): items with `status` in `done`/`released`/`wontfix` AND age > 30 days move to `backlog/archive/{quarter}/`; everything else stays. INDEX regenerated. Report count + per-item destination.

### Scenario: `/backlog archive --quarter 2026-Q1`

Expected: archive ALL eligible items into `2026-Q1` regardless of `updated:` quarter. Same eligibility rule otherwise.

## Fixture: multi-repo-workstream

### Scenario: `/backlog list --workstream` (run from repo-a, workstream=test-workstream)

Expected: the `#workstream-aggregator` reads `linked_repos`, reads items from each, renders ids as `{repo-basename}#{id}` with a `repo` column, sorted by priority then score then updated.

### Scenario: `/backlog show repo-b#0001`

Expected: render `tests/fixtures/multi-repo-workstream/repo-b/backlog/items/0001-thing-in-b.md`.
