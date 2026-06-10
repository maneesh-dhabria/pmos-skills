# agent-skills — repo invariants

Project-level rules that aren't obvious from the directory structure. Skills and tools loaded from this repo trust these invariants; violating them produces silent failures (skills don't load, releases get stuck).

## Plugin charters

Each plugin answers one question. A new skill belongs to the plugin whose charter it serves — if it fits none, it probably needs a new plugin (see "## New-plugin scaffolding"), not a forced fit.

| Plugin | Charter — "help me…" | Holds |
|---|---|---|
| **pmos-toolkit** | …**ship a feature** | the delivery pipeline (requirements → spec → plan → execute → verify → complete-dev) and its supporting authoring/release skills (artifact, diagram, wireframes, prototype, grill, polish, backlog, mytasks, people, changelog, session-log, feature-sdlc, …). |
| **pmos-learnkit** | …**learn a topic** | verified-source, audience-shaped teachable artifacts (primer, learn-list, magazine) and the shared topic-research substrate. |
| **pmos-utilities** | …**maintain my environment** | standalone diagnostics, cleanup, and meta-tooling that aren't part of a feature pipeline or a learning artifact (mac-health, reflect — a cross-plugin session retrospective). |

The charters are the membership test, not just a description. `mac-health` lives in `pmos-utilities` (not `pmos-toolkit`) because diagnosing a hot Mac maintains your environment — it neither ships a feature nor teaches a topic.

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
- **Non-interactive contract (W14 posture)** — every user-invocable pmos-toolkit skill that issues prompts inlines the canonical ~27-line block between `<!-- non-interactive-block:start -->` / `:end`, **byte-identical** to `skills/_shared/non-interactive.md`, enforced by `tools/lint-non-interactive-inline.sh`. The block is **hand-maintained, not auto-propagated** — it is small, sentinel-guarded, and changes rarely, so the lint *detects* drift and fixes are manual (no `sync-inline-blocks.sh`; a body-rewriter would risk more than the re-paste tax saves). Exemptions are **self-documenting markers in the skill file**, never a hidden allowlist: `<!-- non-interactive: refused … -->` (skill errors under `--non-interactive`) or `<!-- non-interactive: delegated … -->` (thin alias that forwards to the skill owning the contract, e.g. `/skill-sdlc`, `/prototype-sdlc`). Separately, mark every `AskUserQuestion` call with a `(Recommended)` option **or** an adjacent `<!-- defer-only: destructive|free-form|ambiguous -->` tag; audited by `tools/audit-recommended.sh`. (The audit extractor skips two provably-never-a-prompt line shapes — the canonical platform-adaptation "No `AskUserQuestion` tool" degradation bullet and negative prose like "Do NOT block on `AskUserQuestion`" — so a green run means every real prompt is classified; there is no accepted-failure baseline.)
- **See also** — "## Plugin manifest version sync", "## Release entry point", and "## Release policy" below for the per-plugin release rules a skill change must satisfy.

## Plugin manifest version sync

Every release bumps **2 files per plugin**, both carrying the same version:

```
plugins/<plugin>/.claude-plugin/plugin.json   → .version
plugins/<plugin>/.codex-plugin/plugin.json    → .version
```

**Do NOT add a `version` field to entries in `.claude-plugin/marketplace.json` or `.codex-plugin/marketplace.json`.** Per Anthropic's official guidance ([docs](https://code.claude.com/docs/en/plugin-marketplaces)):

> "Avoid setting `version` in both `plugin.json` and the marketplace entry. The `plugin.json` value always wins silently, so a stale manifest version can mask a version you set in `marketplace.json`."

The `marketplace.json` files are catalogs — they list each plugin's `name`, `description`, `source`, `category`, and `homepage`, but `version` is resolved from each plugin's `plugin.json` at install time. Keeping marketplace entries version-free eliminates an entire class of silent-drift bug.

When bumping versions for a release, edit only the two `plugin.json` files in the same commit. Each plugin versions independently (e.g., `pmos-toolkit` at 2.52.0 and `pmos-learnkit` at 0.1.0 coexist — they're separate semver tracks).

## New-plugin scaffolding

When introducing a new plugin to this repo, the minimum scaffold is:

- `plugins/<plugin>/.claude-plugin/plugin.json` — `version: 0.1.0` (or higher), `name`, `description`, `skills: "./skills/"`.
- `plugins/<plugin>/.codex-plugin/plugin.json` — same `name` + `version`; mirrors the Claude manifest with the `interface` block for Codex.
- `.claude-plugin/marketplace.json` — add an entry under `plugins[]` with `name`, `description`, `source: "./plugins/<plugin>"`, `category`, `homepage`. **Do not include a `version` field** — see `## Plugin manifest version sync` above.
- `.codex-plugin/marketplace.json` — matching entry (also no `version` field).
- `## Release policy → Plugins list` (below) — add the plugin name.

An unregistered plugin directory under `plugins/` is silently invisible to the marketplace — skills inside it won't load. New plugins must complete this scaffold before `/complete-dev` can release them.

## Release entry point

`/complete-dev` is the canonical release skill. It supersedes the legacy `/push`. Skills, docs, and references in this repo should point at `/complete-dev`, not `/push`.

- `/complete-dev` requires `--plugin <name>` (auto-detected from diff when unambiguous; refuses ambiguous multi-plugin diffs; substrate-only smart-detect prompt for cross-plugin `_shared/` changes).

## Release policy

### Plugins list
- pmos-toolkit
- pmos-learnkit
- pmos-utilities

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
For a `pmos-toolkit/v2.50.0` release, both of these MUST carry version `2.50.0`:
- `plugins/pmos-toolkit/.claude-plugin/plugin.json`
- `plugins/pmos-toolkit/.codex-plugin/plugin.json`

The `marketplace.json` files do NOT carry per-plugin `version` fields — see `## Plugin manifest version sync` above.
<!-- /allow-hardcoded -->

## Bash portability

Repo-wide invariants for any shell script in this repo (most live under `plugins/<plugin>/skills/*/scripts/` and `tests/integration/`):

- **`BASH_SOURCE[0]` is not always populated.** When a script is sourced from a non-canonical path (e.g., via a symlink or under `bash -c "source …"`), `BASH_SOURCE[0]` can be empty or a relative segment that fails `cd "$(dirname …)"`. Always implement a fallback: prefer `${BASH_SOURCE[0]:-$0}`, then fall back to walking up from `$PWD` until a sentinel file is found, then exit with a clear error if neither resolves. Pattern in `plugins/<plugin>/skills/readme/scripts/_reviewer_validate.sh` (2026-05-15).

## Inline doc comments

Stakeholders annotate any pmos-emitted HTML artifact in their browser. The comment threads persist as an **inline JSON block inside the HTML itself** — `<script id="pmos-comments" type="application/json">` between `<!-- pmos-comments:start -->` / `<!-- pmos-comments:end -->` sentinels. No sidecar files; the artifact is the single source of truth. (Pre-v2.58.0 artifacts used a separate `<artifact>.comments.json` sidecar; that contract was retired in 2026-05-28 on `feat/inline-html-artifacts` — see "Migration" below.)

The flow:

1. **Author** an HTML artifact via any pmos skill (e.g., `/spec`, `/requirements`, `/plan`). All 14 surfaces (13 originating skills + `/feature-sdlc` orchestrator) bake the inline `<style>`, the inline `pmos-comments` block, the comments overlay JS, and `<meta name="pmos:skill" content="<slug>">` into the emit per FR-01/FR-04/FR-21. Static-assertion test: `plugins/pmos-toolkit/skills/_shared/html-authoring/tests/fanout.test.sh`.
2. **Read** the artifact from anywhere — `file://` from disk, `http://` from any server, any browser, any protocol. The overlay reads the inline JSON and renders threads as soon as the page loads. Read mode is universal.
3. **Write** requires `http://localhost` via the launcher trio (`comments-open.command` / `.sh` / `.bat` for macOS/Linux/Windows), which spawns `serve.js` and points the default browser at it. The HEAD `/save` probe (FR-14) decides read-only vs. read-write on mount. Atomicity: `serve.js` writes via temp-then-rename(2); on crash the original artifact is intact and an orphan `.tmp` is logged to stderr at startup. Optimistic concurrency: requests carry `expected_version`; a stale write returns 409 + reload banner (FR-17).
4. **Resolve** comments via `/comments resolve <artifact>` (4 modes: `--confirm-each` default, `--batch`, `--auto`, `--non-interactive`). Routes per-thread to the originating skill's `apply-edit-at-anchor` shim. The shim's anchor resolver is id-first + substring-contains (≥40 chars).
5. **`file://` is read-only by design.** Opening an artifact from disk shows a blocking modal pointing at the launcher; no thread capture surfaces are available. This avoids the "comment vanished" failure mode users hit when there's no server to receive the write.

**Migration (run once on any fork at v2.58.0):** `bash scripts/migrate-sidecars-to-inline.sh [--dry-run] [docs/pmos]` walks `*.comments.json` files, injects each into the sibling artifact's inline block, deletes the sidecar. Idempotent; safe to re-run. Operator step + `.git/hooks/pre-commit` uninstall instructions in `docs/pmos/features/2026-05-28_inline-html-artifacts/execute/T10_migration_runbook.md`. The pre-commit installer that guarded the html/sidecar pairing was also deleted in the same release.

**Retired in v2.58.0:** see `docs/pmos/features/2026-05-28_inline-html-artifacts/02_spec.html#fr-deletions` for the complete inventory of removed code paths. Review-mode is now an in-memory flag (D14): Ctrl/Cmd+Alt+R toggles for the session only.

**Coverage gate:** `bash scripts/check-comments-coverage.sh` is wired into `/verify` Phase 7 Hard Gates; refuses completion if any of the 14 contract tests, 15 emit references, 1 resolver integration, or 2 anchor calibration tests are missing. Also emits a non-fatal stderr `WARN:` line per artifact whose inline block exceeds the 200 KiB NFR-03 ceiling.

**Bundle size policy (NFR-02):** authoring assets (`comments.js + comments.css`) ≤20KB soft / ≤40KB hard. Enforced by `.github/workflows/comments-bundle-size.yml`.

**SVG anchoring:** /diagram + /wireframes emit `data-anchor="<slug>"` on every `<g>` + top-level `<rect>`/`<path>`. Foreign embedded SVGs use bbox-based anchors (FR-52).

**Manual smoke matrix:** `plugins/pmos-toolkit/skills/comments/tests/MANUAL-cross-context.md` tracks per-platform / per-browser / per-open-context rows (macOS/Linux/Windows × Chrome/Safari/Firefox × file:// vs. http://localhost). Maintainer attestation per row.

**Diff suppression:** `.gitattributes` marks `docs/pmos/**/*.html` as `linguist-generated=true -diff`. The inline pmos-comments JSON mutates on every comment write and the inline `<style>` + scripts are bulk; suppressing the default diff keeps PR reviews readable. Use `git diff --text` to opt back in.

Original inline-comments spec lives at `docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html`; the persistence-model rewrite at `docs/pmos/features/2026-05-28_inline-html-artifacts/02_spec.html`; per-task logs under `execute/`.
