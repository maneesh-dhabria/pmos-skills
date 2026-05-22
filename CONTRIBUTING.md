# Contributing

Multi-plugin marketplace for Claude Code and Codex. Install:

```
/plugin marketplace add maneesh-dhabria/pmos-toolkit
```

## One-time setup

After cloning your fork, enable the repo-local git hooks and install `jq`:

```bash
git config core.hooksPath .githooks

# macOS
brew install jq
# Debian / Ubuntu
sudo apt install jq
# Fedora / RHEL
sudo dnf install jq
```

`core.hooksPath` is per-clone — it is not inherited from upstream. Skipping it
means the pre-commit drift check and pre-push version-bump check will not run
locally, and your push will likely be rejected by the maintainer's checks.

`jq` is required by the pre-push hook for marketplace.json / tag-version
matching (FR-45).

## Hook contracts (brief)

See [`.githooks/README.md`](.githooks/README.md) for the full contract. Quick
summary:

- **pre-commit (drift)** — rejects commits where `plugins/*/skills/_shared/`
  copies have drifted between plugins. Fix with
  `scripts/sync-shared.sh --from=<plugin>`. Single-plugin repos short-circuit.
- **pre-push (4-manifest version + tag)** — for any plugin whose `skills/` or
  `agents/` changed, requires the version in `plugins/<name>/.claude-plugin/plugin.json`,
  `plugins/<name>/.codex-plugin/plugin.json`, and both `marketplace.json`
  entries to all match and to differ from the remote tip. Tags must be
  `<plugin>/v<semver>` (e.g. `pmos-toolkit/v2.42.0`) and the version in the
  tag must match the four manifests. `/complete-dev` automates the bump
  and tag for Claude Code users.

## Windows

Out of scope. Use WSL (NFR-04). The hooks and helper scripts assume a POSIX
shell, `diff -rq`, `find`, `jq`, and `git` on `PATH`.

## PR workflow

1. Fork the repo on GitHub.
2. Branch off `main` — `git checkout -b feat/<short-name>`.
3. Make your change. If you touch `plugins/<name>/skills/` or `agents/`, bump
   the version in all four manifests (see pre-push contract above).
4. If you touch `plugins/<name>/skills/_shared/`, run
   `scripts/sync-shared.sh --from=<name>` to propagate to peer plugins
   before committing.
5. Push to your fork and open a PR against `main`.
6. Solo-maintainer review — expect direct feedback; no CI bot.
