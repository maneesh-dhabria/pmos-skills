#!/usr/bin/env bash
# Assert: pre-push per-ref loop skips refs/tags/* (FR-43 — pre-existing tags
# are not retroactively validated against the current manifest state).
# Surfaced by T10's `git push origin --tags` to the new pmos-skills mirror:
# 30+ legacy tags (v2.16.3..v2.49.0) all carry old plugin.json versions; the
# per-ref loop was reading marketplace.json from the WORKING TREE and erroring
# on every drift. Top-of-file points-at-HEAD loop still handles new tags.
set -e
HOOK_REPO_PATH=${HOOK_REPO_PATH:-.githooks/pre-push}
FIX=${FIX:-tests/fixtures/multi-plugin/pre-push/3-way}
ROOT=$(pwd)
TMP=$(mktemp -d); trap "rm -rf $TMP" EXIT
cp -R "$FIX"/. "$TMP"/
mkdir -p "$TMP/.githooks"
cp "$ROOT/$HOOK_REPO_PATH" "$TMP/.githooks/pre-push"
chmod +x "$TMP/.githooks/pre-push"
cd "$TMP"
git init -q
git config user.name t; git config user.email t@t
# Legacy tag commit: plugin.json AND marketplace.json both at 2.40.0 — internally
# consistent at the time of the tag.
for f in .claude-plugin/marketplace.json .codex-plugin/marketplace.json; do
  sed 's/"version": "2.49.0"/"version": "2.40.0"/' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done
printf '%s\n' '{"name": "plugin-a", "version": "2.40.0"}' > plugins/plugin-a/.claude-plugin/plugin.json
printf '%s\n' '{"name": "plugin-a", "version": "2.40.0"}' > plugins/plugin-a/.codex-plugin/plugin.json
mkdir -p plugins/plugin-a/skills
echo "# legacy skill content" > plugins/plugin-a/skills/foo.md
git add . && git commit -q -m "legacy v2.40.0" --no-verify
git tag v2.40.0
legacy_sha=$(git rev-parse HEAD)
# Then: marketplace + plugin.json all bump to 2.50.0 in a later commit.
for f in .claude-plugin/marketplace.json .codex-plugin/marketplace.json; do
  sed 's/"version": "2.40.0"/"version": "2.50.0"/' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done
printf '%s\n' '{"name": "plugin-a", "version": "2.50.0"}' > plugins/plugin-a/.claude-plugin/plugin.json
printf '%s\n' '{"name": "plugin-a", "version": "2.50.0"}' > plugins/plugin-a/.codex-plugin/plugin.json
echo "# new content" >> plugins/plugin-a/skills/foo.md
git add . && git commit -q -m "bump 2.50.0" --no-verify
ZERO=0000000000000000000000000000000000000000
# Simulate pushing the legacy tag to an empty remote (FR-43 case).
out=$(echo "refs/tags/v2.40.0 $legacy_sha refs/tags/v2.40.0 $ZERO" | bash .githooks/pre-push origin git@example.com:nope.git 2>&1)
ec=$?
[ $ec -eq 0 ] || { echo "FAIL: hook exited $ec on legacy-tag push (expected 0)"; echo "got: $out"; exit 1; }
echo "$out" | grep -qi 'drift' && { echo "FAIL: hook still reports drift for refs/tags/* (should skip)"; echo "got: $out"; exit 1; }
echo "PASS: assert_pre_push_skips_legacy_tag_refs.sh"
