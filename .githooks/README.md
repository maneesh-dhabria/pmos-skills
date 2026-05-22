# Git Hooks

Repo-local git hooks. Opt in once per clone:

```bash
git config core.hooksPath .githooks
```

`jq` is required for the pre-push hook (marketplace.json + namespaced tag
checks — FR-45). Install with `brew install jq` / `apt install jq` /
`dnf install jq`.

## pre-commit (drift)

Detects drift between per-plugin copies of `_shared/` substrate (FR-30..FR-34).

**What it does.** When staged files include anything under
`plugins/*/skills/_shared/`, the hook walks every `plugins/*/skills/_shared/`
directory in the repo, takes the first one as baseline, and `diff -rq`'s every
peer against it. Any mismatch fails the commit with a per-file diff summary.

**Short-circuit.** If the repo currently has fewer than two `_shared/`
directories under `plugins/`, the hook exits 0 (FR-31 — single-plugin repos
have nothing to drift against). It also exits 0 if no staged path matches
`plugins/*/skills/_shared/` (FR-33).

**Fix.** Pick the plugin whose `_shared/` is the intended source of truth and
run:

```bash
scripts/sync-shared.sh --from=<plugin>
```

That copies `plugins/<plugin>/skills/_shared/` over every peer. Stage the
resulting changes and commit again.

**Bypass.** `git commit --no-verify` — only for hook-maintenance commits.

## pre-push (4-manifest version + tag)

Blocks pushes that modify plugin content without a coherent 4-manifest version
bump, and blocks tags whose version disagrees with the manifests
(FR-30, FR-40..FR-46a).

**Why it exists.** Claude Code and Codex load installed plugins from a
version-keyed cache (`~/.claude-personal/plugins/cache/<plugin>/<plugin>/<version>/`).
When a plugin's `version` stays the same, the cache is not refreshed — edits
to skill files silently do nothing on any machine that already has the old
version cached. `/reload-plugins` and new sessions do not invalidate the cache.

**What it enforces.** For each plugin whose `skills/` or `agents/` changed in
the range being pushed, all four of the following must match each other AND
must differ from the remote tip's `plugins/<name>/.claude-plugin/plugin.json`
version:

1. `plugins/<name>/.claude-plugin/plugin.json` — `version`
2. `plugins/<name>/.codex-plugin/plugin.json` — `version`
3. `.claude-plugin/marketplace.json` — `.plugins[name=<name>].version`
4. `.codex-plugin/marketplace.json` — `.plugins[name=<name>].version`

**Tag rules (FR-46/FR-46a).** Tags pointing at `HEAD` that don't already exist
on `origin` must match `^<plugin>/v<semver>$` (e.g. `pmos-toolkit/v2.42.0`).
The `<semver>` part must equal all four manifest versions above for the named
plugin. The legacy unscoped `v<semver>` form is rejected.

**Semver guidance** (enforced by discipline, not by the hook):

- **Patch** (`1.0.0 → 1.0.1`) — typo fixes, reworded instructions, clarifications.
- **Minor** (`1.0.1 → 1.1.0`) — new phases, new skill files, backward-compatible additions.
- **Major** (`1.x → 2.0`) — breaking changes to skill behavior or required inputs.

**Prereq.** `jq` must be on `PATH` — the hook exits 1 immediately if it's
missing (FR-45).

**If the hook fires.** Bump all four manifests (`plugin.json` × 2 +
`marketplace.json` × 2) to the same new version in a single commit, then
push again. `/complete-dev` automates this; see
`plugins/pmos-toolkit/skills/complete-dev/SKILL.md`.

**Bypass.** `git push --no-verify` — only for hook-maintenance commits
(e.g., editing the hook itself). Anything else defeats the purpose.
