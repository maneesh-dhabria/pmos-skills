# agent-skills — repo invariants

Project-level rules that aren't obvious from the directory structure. Skills and tools loaded from this repo trust these invariants; violating them produces silent failures (skills don't load, releases get stuck).

## Canonical skill path

Each plugin manifest loads skills from exactly one directory:

```
plugins/<plugin>/skills/<skill-name>/SKILL.md
```

Anywhere else (root `skills/`, a feature folder, `docs/`, a sibling plugin's directory) is invisible to that plugin's loader. A skill saved at the wrong path will not register and will not error — it just silently doesn't exist as a slash command.

When creating, moving, copying, or renaming a skill:
- Target path must be `plugins/<plugin>/skills/<skill-name>/SKILL.md`.
- `<skill-name>` is lowercase-hyphenated (e.g., `create-skill`, `verify`, not `CreateSkill`).
- After any move, run `ls plugins/<plugin>/skills/` to confirm the new directory is present and named correctly.

`/feature-sdlc skill` enforces this — its skill-eval rubric's `a-name-matches-dir` check fails when the frontmatter `name` doesn't match the directory. Manual edits do not get that check — this rule is the backstop.

## Skill-authoring conventions

How to author or revise a skill in any plugin in this repo:

- **Canonical path** — new skills go at `plugins/<plugin>/skills/<skill-name>/SKILL.md` and nowhere else (see "## Canonical skill path" above — each plugin's loader reads only its own directory; a skill anywhere else silently doesn't register). `<skill-name>` is lowercase-hyphenated.
- **After any move / copy / rename** of a skill, run `ls plugins/<plugin>/skills/` to confirm the directory is present and correctly named.
- **The SDLC for skills** — author a new skill, or apply feedback to existing skill(s), via `/feature-sdlc skill <description>` / `/feature-sdlc skill --from-feedback <…>` (or the `/skill-sdlc` alias). That pipeline runs requirements → spec → plan → execute → skill-eval → verify and scores the result against a binary rubric before merge. (`/create-skill` and `/update-skills` were retired in 2.38.0 — see `archive/skills/README.md`.)
- **The authoring guide** — for the generic SKILLS-standard guidance (frontmatter; description & triggering; structure & progressive disclosure; body & content; scripts & tooling), see `plugins/<plugin>/skills/feature-sdlc/reference/skill-patterns.md` (currently lives in `pmos-toolkit`; same path shape applies to any plugin that ships its own copy). That is the single source of truth — used by `/feature-sdlc skill`'s requirements / spec / execute / verify stages and mirrored 1:1 by `plugins/<plugin>/skills/feature-sdlc/reference/skill-eval.md` (the binary eval rubric).
- **See also** — "## Plugin manifest version sync", "## Release entry point", and "## Release policy" below for the per-plugin release rules a skill change must satisfy.

## Plugin manifest version sync

Every release bumps **4 files per plugin**, all carrying the same version:

```
plugins/<plugin>/.claude-plugin/plugin.json
plugins/<plugin>/.codex-plugin/plugin.json
.claude-plugin/marketplace.json   → plugins[<plugin>].version
.codex-plugin/marketplace.json    → plugins[<plugin>].version
```

The per-plugin `plugin.json` pair carries the plugin's own version. The two top-level `marketplace.json` files each list every plugin with its current version — both must mirror each other and must mirror the per-plugin `plugin.json`s. The pre-commit drift hook enforces sync across all four. When bumping versions for a release, edit all four files in the same commit.

## Release entry point

`/complete-dev` is the canonical release skill. It supersedes the legacy `/push`. Skills, docs, and references in this repo should point at `/complete-dev`, not `/push`.

- `/complete-dev` requires `--plugin <name>` (auto-detected from diff when unambiguous; refuses ambiguous multi-plugin diffs; substrate-only smart-detect prompt for cross-plugin `_shared/` changes).

## Release policy

### Plugins list
- pmos-toolkit
- pmos-learnkit

### Tag convention
- Format: `<plugin>/v<semver>` (e.g. `pmos-toolkit/v2.50.0`).
- Pre-cutover tags (`v2.x`, `pmos-toolkit-2.x`, `pmos-toolkit-v2.x`) are preserved as-is; new tags MUST follow the namespaced format.

### /complete-dev invocation
- Pass `--plugin <name>` explicitly, OR rely on auto-detect from `git diff` (single-plugin only; ambiguous diffs are refused).
- Substrate-only changes (under any `plugins/*/skills/_shared/`) trigger the "ride which plugin's next release?" prompt.

### Drift hook contract
- Pre-commit only (FR-30); bypassable via `git commit --no-verify` (accepted risk per D16).
- `scripts/sync-shared.sh --from=<plugin>` is the only sanctioned mutation path for cross-plugin `_shared/` sync.

### Remote topology
- `origin` = GitHub `maneesh-dhabria/pmos-skills` (canonical).
- `gitlab-mirror` = GitLab `pmos1/pmos-skills` (backup).
- `/complete-dev` Phase 15 pushes branch + tag to every configured remote (per FR-59) — currently 2 remotes.
- **Deferred (post-cutover TODO):** `work-mirror` = GitHub work-account fork of `pmos-skills` will be added once the work account is set up. Until then, only origin + gitlab-mirror exist.

### Old repo posture
- `maneesh-dhabria/pmos-toolkit` is `archived=true, private=true` post-cutover.
- Cached `v2.49.0` installs continue read-only. New installs flow through `maneesh-dhabria/pmos-skills`.

### Example bump targets (per-plugin)
<!-- allow-hardcoded: example block intentionally cites the literal pmos-toolkit paths; tests filter this range out. -->
For a `pmos-toolkit/v2.50.0` release, all four of these MUST carry version `2.50.0`:
- `plugins/pmos-toolkit/.claude-plugin/plugin.json`
- `plugins/pmos-toolkit/.codex-plugin/plugin.json`
- `.claude-plugin/marketplace.json` → `plugins[pmos-toolkit].version`
- `.codex-plugin/marketplace.json` → `plugins[pmos-toolkit].version`
<!-- /allow-hardcoded -->

## Bash portability

Repo-wide invariants for any shell script in this repo (most live under `plugins/<plugin>/skills/*/scripts/` and `tests/integration/`):

- **`BASH_SOURCE[0]` is not always populated.** When a script is sourced from a non-canonical path (e.g., via a symlink or under `bash -c "source …"`), `BASH_SOURCE[0]` can be empty or a relative segment that fails `cd "$(dirname …)"`. Always implement a fallback: prefer `${BASH_SOURCE[0]:-$0}`, then fall back to walking up from `$PWD` until a sentinel file is found, then exit with a clear error if neither resolves. Pattern in `plugins/<plugin>/skills/readme/scripts/_reviewer_validate.sh` (2026-05-15).
