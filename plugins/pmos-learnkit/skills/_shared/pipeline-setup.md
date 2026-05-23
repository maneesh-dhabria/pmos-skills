# Pipeline Setup — Shared Contract

> **Authoritative source for pipeline skill setup.** Replaces the previous `product-context/context-loading.md` and `_shared/feature-folder.md` files. Pipeline skills inline **Section 0** verbatim into their own SKILL.md (Phase 0). They must `Read` this file when an edge case named in Section 0 fires.

This file has five sections:

- **Section 0** — Canonical inline Phase 0 block (copy-pasted into each pipeline SKILL.md)
- **Section A** — First-run setup (consolidated 3-question prompt, slug derivation)
- **Section B** — Feature-folder rules (slug spec, date prefix, collision handling)
- **Section C** — Workstream enrichment (end-of-session)
- **Section D** — Migration recipe (legacy layouts, pointer file)

---

## Section 0 — Canonical inline Phase 0 block

Pipeline skills paste the block between the markers below into their own Phase 0, **verbatim**. The lint script (`tools/lint-pipeline-setup-inline.sh`) diffs each skill's marked region against this canonical version and fails on drift. Do not edit the marked region in any SKILL.md without updating this section first.

<!-- pipeline-setup-block:start -->
1. **Read `.pmos/settings.yaml`.**
   - If missing → you MUST invoke the `Read` tool on `_shared/pipeline-setup.md` Section A and run first-run setup before proceeding. (Skipping this Read is the most common cause of folder-naming defects.)
2. Set `{docs_path}` from `settings.docs_path`.
3. If `settings.workstream` is non-null → load `~/.pmos/workstreams/{workstream}.md` as context preamble; if frontmatter `type` is `charter` or `feature` and a `product` field exists, also load `~/.pmos/workstreams/{product}.md` read-only.
4. Resolve `{feature_folder}`:
   - If `--feature <slug>` was passed → glob `{docs_path}/features/*_<slug>/`. **Exactly 1 match required**; on 0 or 2+ → you MUST `Read` `_shared/pipeline-setup.md` Section B before acting.
   - Else if `settings.current_feature` is set AND `{docs_path}/features/{current_feature}/` exists → use it.
   - Else → ask user (offer: create new with derived slug, pick existing from folder list, or specify via Other...).
5. **Edge cases — you MUST `Read` `_shared/pipeline-setup.md` Section B before acting:** slug collision, slug validation failure, legacy date-less folder encountered, ambiguous `--feature` lookup, any folder creation.
6. Read `~/.pmos/learnings.md` if present; note entries under `## /<this-skill-name>` and factor them into approach (skill body wins on conflict; surface conflicts to user before applying).
<!-- pipeline-setup-block:end -->

---

## Section A — First-run setup

Triggered by Section 0 step 1 when `.pmos/settings.yaml` is missing.

### A.1 Detect legacy state

Before prompting the user, check whether the repo is on a legacy layout (so the prompt can pre-fill sensible defaults):

- **Pointer file exists** at `.pmos/current-feature` → repo previously used the deprecated pointer convention. Capture the pointer value for absorption into `settings.current_feature` during Section D migration.
- **Legacy `docs/` layout** — ANY of `docs/requirements/`, `docs/specs/`, `docs/plans/`, `docs/features/` exists → set the prompt default for `docs_path` to `docs/` (instead of the new default `docs/pmos/`).
- **Neither** → fresh repo; default `docs_path` to `docs/pmos/`.

If legacy state was detected, run **Section D migration** as part of first-run (after the user confirms settings). The migration constructs `settings.yaml` from existing state and removes the pointer file via `git rm`.

### A.2 Consolidated first-run prompt

Issue **one** `AskUserQuestion` call with three questions batched. (Platforms without `AskUserQuestion`: emit the three as a single numbered list and accept defaults if the user replies "ok" or similar.)

**Q1 — Where should pipeline artifacts live?**
- Recommended (legacy detected): `docs/` (preserves your existing layout)
- Recommended (fresh repo): `docs/pmos/` (namespaced under docs/, default for new repos)
- Other... (free-form path)

**Q2 — Workstream context?**
- List up to 5 most-recently-modified entries from `~/.pmos/workstreams/*.md`, labeled by frontmatter `name` + `type`
- "Create a new workstream" → invokes `/product-context init` after settings write
- "None" → proceed without workstream context

**Q3 — Feature name for this work?**
- Recommended: `<derived-slug>` (per A.3 below)
- Other... (user types a slug; validated against Section B Slug Rules)

### A.3 Slug derivation rule

Derive `<derived-slug>` from the user's argument as follows:

1. Identify the most concrete feature noun phrase in the argument (e.g., "fix the broken search dropdown" → "broken search dropdown" → "search dropdown" after stripping verbs/adjectives).
2. Apply Section B Slug Rules (lowercase, kebab-case, ≤40 chars, etc.).
3. **MVP-shaped fallback** — if the argument is broad/MVP-shaped with no concrete feature noun (e.g., "build the MVP", "I want to start the product", "let's brainstorm what we're building"), suggest `mvp-v1`. The `-v1` suffix leaves room for `mvp-v2` etc. as the work iterates.
4. **Empty argument fallback** — if the argument has no extractable noun and isn't MVP-shaped, suggest `feature-v1` and require user override.
5. Always present the suggested slug with edit-to-override; never silently default.

*Cited by /plan v2 FR-63 — slug derivation is centralized here; pipeline skills MUST NOT re-implement.*

### A.4 Write settings.yaml

After all three answers collected:

```yaml
version: 1
docs_path: <answer-q1>
workstream: <answer-q2-slug-or-null>
current_feature: <YYYY-MM-DD>_<answer-q3-slug>
```

Then create `{docs_path}/features/{YYYY-MM-DD}_<slug>/` per Section B Step 4.

If legacy state was detected in A.1, run Section D migration **before** writing settings.yaml — migration constructs the settings.yaml itself.

### A.5 Tell the user

Echo a one-line summary:

```
Pipeline setup complete: docs_path=<path>, workstream=<slug-or-none>, feature=<folder>
```

---

## Section B — Feature-folder rules

Triggered by Section 0 step 5 (any folder creation, slug collision, legacy date-less folder).

### B.1 Folder format

```
{docs_path}/features/{YYYY-MM-DD}_{slug}/
```

The date prefix is **mandatory**. Folders without it break feature lookup (`*_{slug}/` glob), sort order, and pipeline-tooling assumptions.

- `{YYYY-MM-DD}` is the folder *creation* date — read from environment (`date +%Y-%m-%d`), never hardcode or guess.
- Separator between date and slug is `_` (underscore). Never `-` (would conflict with the date's own hyphens).
- Example (default layout): `docs/pmos/features/2026-05-08_search-dropdown/`
- Example (legacy layout): `docs/features/2026-05-08_search-dropdown/`

### B.2 Slug rules

- Lowercase only.
- Kebab-case: alphanumeric (`a-z`, `0-9`) and hyphens. **No** underscores, spaces, slashes, or other punctuation.
- Maximum 40 characters.
- No leading or trailing hyphens.
- No double hyphens (collapse runs of non-alphanumerics to a single hyphen).

**Auto-derivation algorithm** (for slugs derived from a hint):

1. Lowercase the hint.
2. Replace any run of non-alphanumeric characters with a single hyphen.
3. Strip leading/trailing hyphens.
4. Truncate at 40 characters; if truncation lands mid-word, prefer truncating at the previous hyphen if that keeps the slug ≥20 chars.

### B.3 `--feature` lookup

Used when the calling skill received `--feature <slug>` (Section 0 step 4):

- Glob `{docs_path}/features/*_{feature_arg}/`.
- **Exactly 1 match** → use it. Update `settings.current_feature` to the folder name. Echo `Using feature folder: <path>`.
- **0 matches** → error. Echo `No feature folder matching '{feature_arg}'. Available: <list of slugs>`. Stop. Do **not** auto-create — explicit `--feature` is a precise lookup.
- **2+ matches** → error. Echo `Multiple feature folders match '{feature_arg}': <list>`. Stop.

### B.4 Folder creation

When the calling skill needs to create a new feature folder:

*Cited by /plan v2 FR-65 — folder picker offers (recently-modified | best slug-match | create-new | Other) per spec §8.5.*

1. Show the derived (or typed) slug. Prompt: `Slug: <slug> [Enter to accept, edit to override]`. Accept the user's edited value if any.
2. Validate against B.2 Slug Rules. On failure, show the violated rule and re-prompt.
3. **Collision check** — glob `{docs_path}/features/*_{slug}/` (any date). If a match exists, abort the create and prompt:
   - `Use existing <folder-name>` → switch to that folder; update `settings.current_feature`.
   - `Pick a different slug` → re-prompt at step 1.
4. Create directory `{docs_path}/features/{today}_{slug}/` where `{today}` is from `date +%Y-%m-%d`.
5. Update `settings.current_feature` to `{today}_{slug}`.
6. Echo: `Created feature folder: <path>`.

### B.5 Legacy date-less folders

If a folder matching the requested slug exists at `{docs_path}/features/{slug}/` (no date prefix), **do not silently rename**. Surface to user:

> Found a date-less folder at `{path}` from an older toolkit version. Use it as-is, rename to `{today}_{slug}/`, or create a fresh dated folder?

Wait for explicit choice. If user picks rename:
```bash
git mv {docs_path}/features/{slug} {docs_path}/features/$(date +%Y-%m-%d)_{slug}
```
Then update any in-folder references and `settings.current_feature`.

### B.6 Anti-patterns (DO NOT)

- DO NOT create `{docs_path}/{slug}/` without the `{YYYY-MM-DD}_` prefix.
- DO NOT guess today's date. Read from the environment.
- DO NOT use a separator other than underscore between date and slug.
- DO NOT create a feature folder before Section 0 step 1 has run (`{docs_path}` is undefined until then).
- DO NOT auto-migrate existing date-less folders (see B.5 — surface to user).
- DO NOT reuse a date prefix when collision detected — re-prompt for slug per B.4 step 3.

---

## Section C — Workstream enrichment

Run AFTER the calling skill's main work is complete, before the final commit. **Skip if** Section 0 step 3 did not load a workstream (workstream is null in settings).

### C.1 Compare artifact against workstream

Re-read the current workstream file. Compare the artifact produced this session against workstream sections. Look for signals that map to empty or thin workstream sections:

| Skill | Signals to capture |
|-------|-------------------|
| `/requirements` | User segments, problem statements, metrics, value prop |
| `/spec` | Tech stack decisions, architectural constraints, key decisions |
| `/plan` | Technical dependencies, infrastructure details |
| `/execute` | Key implementation decisions |
| `/session-log` | Decisions with reasoning, gotchas |

### C.2 Propose additions as a diff

If new signals found, draft concrete additions:

```
Based on this session, I'd update your workstream context:

  ## User Segments
  + Small business owners (1-50 employees) managing      ← new
    invoices manually                                     ← new

  ## Key Metrics
  + Target: 40% reduction in manual invoice processing    ← new

Apply these updates? (y/n)
```

### C.3 Apply or skip

- **If approved** → apply edits to `~/.pmos/workstreams/{workstream}.md`; bump `updated` timestamp in frontmatter.
- **If declined** → move on; nothing changes.

### C.4 Rules

- Only propose additions for sections that are empty or clearly missing the new information.
- Never replace existing content — append or expand.
- Show exact text that would be added, not a summary.
- Keep proposals concise — 1–5 additions per session, not a full rewrite.

---

## Section D — Migration recipe

Triggered by Section A.1 when legacy state is detected. Runs **silently** (no user confirmation needed), but **logs every step** before doing it. Aborts on any non-`git mv`-able conflict — never destructive.

### D.1 Detect

- **Pointer file** — `.pmos/current-feature` exists. Read its single-line value as `<pointer-value>`.
- **Legacy `docs/` layout** — ANY of `docs/requirements/`, `docs/specs/`, `docs/plans/`, `docs/features/` exists at repo root.
- **Date-less feature folders** — `{docs_path}/features/<slug>/` (no date prefix) for any slug.

### D.2 Plan moves (dry-run)

Build the move plan **before** executing:

```
Pipeline migration plan (silent auto-migrate):

  Detected:
    - .pmos/current-feature (value: 2026-04-30_search-bug)
    - docs/specs/, docs/plans/ (legacy layout)
    - docs/features/face-tagging/ (date-less)

  Will:
    - Write .pmos/settings.yaml with docs_path=docs/, workstream=null, current_feature=2026-04-30_search-bug
    - git rm .pmos/current-feature
    - Surface date-less folder docs/features/face-tagging/ to user (per Section B.5; do not auto-rename)
```

### D.3 Execute

In order:

1. **Construct `settings.yaml`** from detected state:
   - `version: 1`
   - `docs_path:` — `docs/` if legacy `docs/{requirements,specs,plans,features}/` detected; else `docs/pmos/`.
   - `workstream:` — null (will be set on next `/product-context init` if user runs it).
   - `current_feature:` — `<pointer-value>` if pointer file existed and folder still resolves; else null.

2. **Write the file** atomically (write to `.pmos/settings.yaml.tmp`, then rename to `.pmos/settings.yaml`).

3. **Remove pointer file** if it existed:
   ```bash
   git rm .pmos/current-feature
   ```
   (Use `git rm` not `rm` — preserves history; reversible via revert.)

4. **Date-less folders** — for each detected, do NOT auto-migrate. Surface per Section B.5 on next user-driven folder operation. Migration finishes successfully even if date-less folders remain.

### D.4 Log to user

After execution, echo a single-block summary:

```
Migrated repo to .pmos/settings.yaml:
  - docs_path: docs/
  - current_feature: 2026-04-30_search-bug (from deprecated .pmos/current-feature pointer)
  - Pointer file removed (git rm; revert to restore).
  - 1 date-less folder still requires manual decision (will prompt on next use).

Reference: _shared/pipeline-setup.md Section D.
```

### D.5 Abort conditions

If any of the following — **abort migration**, leave repo unchanged, surface error:

- Cannot resolve pointer-value to an existing folder (and value isn't empty).
- `.pmos/settings.yaml` already exists (would clobber — should never happen on first-run, but guard).
- Working tree is dirty in a way that would conflict with `git rm` (e.g., uncommitted local change to `.pmos/current-feature`).

Abort message format:

```
Pipeline migration aborted: <specific reason>.
Repo state unchanged. Resolve the issue and re-invoke the skill.
```

### D.6 Manual recipe (fallback for when auto-migration aborts)

For users who need to migrate by hand:

```bash
# 1. Construct settings.yaml manually
mkdir -p .pmos
cat > .pmos/settings.yaml <<EOF
version: 1
docs_path: docs/
workstream: null
current_feature: 2026-04-30_search-bug
EOF

# 2. Remove pointer
git rm .pmos/current-feature

# 3. (Optional) move docs/ → docs/pmos/ if you want the new namespaced layout
mkdir -p docs/pmos
git mv docs/requirements docs/specs docs/plans docs/features docs/pmos/ 2>/dev/null
# Update settings.yaml docs_path to docs/pmos after this move.
```

Skills MUST NOT do the optional layout move (step 3) automatically — it's a user-driven cleanup.
