#!/usr/bin/env bash
# Assert: pre-push fails when plugin.json versions match but marketplace.json
# entries are out of sync (3-way version drift).
# FR-44, FR-46; spec §14.1.
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
# Initial commit: plugin.json at 2.49.0 matching marketplace.json
printf '%s\n' '{"name": "plugin-a", "version": "2.49.0"}' > plugins/plugin-a/.claude-plugin/plugin.json
printf '%s\n' '{"name": "plugin-a", "version": "2.49.0"}' > plugins/plugin-a/.codex-plugin/plugin.json
git add . && git commit -q -m init --no-verify
remote_sha=$(git rev-parse HEAD)
# Second commit: bump plugin.json to 2.50.0 in both but leave marketplace.json at 2.49.0
printf '%s\n' '{"name": "plugin-a", "version": "2.50.0"}' > plugins/plugin-a/.claude-plugin/plugin.json
printf '%s\n' '{"name": "plugin-a", "version": "2.50.0"}' > plugins/plugin-a/.codex-plugin/plugin.json
echo "# content change" >> plugins/plugin-a/skills/foo.md
git add . && git commit -q -m bump --no-verify
local_sha=$(git rev-parse HEAD)
out=$(echo "refs/heads/main $local_sha refs/heads/main $remote_sha" | bash .githooks/pre-push 2>&1 || true)
echo "$out" | grep -qi 'marketplace' || { echo "FAIL: missing marketplace 3-way mismatch in stderr"; echo "got: $out"; exit 1; }
echo "$out" | grep -q '2.49.0' || { echo "FAIL: expected marketplace version 2.49.0 in error"; echo "got: $out"; exit 1; }
echo "$out" | grep -q '2.50.0' || { echo "FAIL: expected plugin.json version 2.50.0 in error"; echo "got: $out"; exit 1; }
echo "PASS: assert_pre_push_3_way_version_match.sh"
