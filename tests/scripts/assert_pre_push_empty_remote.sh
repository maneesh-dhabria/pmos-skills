#!/usr/bin/env bash
# Assert: pre-push hook handles the empty-remote case (initial push to a brand-new
# remote where the base is the empty-tree SHA). Surfaced by the multi-plugin
# marketplace cutover (T10, 2026-05-23): `set -euo pipefail` + `git show
# <empty-tree>:<missing-path>` returned 128 inside get_version, crashing the hook.
# Regression test for the `|| true` patch in .githooks/pre-push :: get_version().
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
# Bring marketplace.json into sync with plugin.json so the 3-way invariant holds.
# The 3-way fixture ships with marketplace at 2.49.0 by design (for the drift test);
# this regression test only needs synced versions plus plugin content.
for f in .claude-plugin/marketplace.json .codex-plugin/marketplace.json; do
  sed 's/"version": "2.49.0"/"version": "2.50.0"/' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done
printf '%s\n' '{"name": "plugin-a", "version": "2.50.0"}' > plugins/plugin-a/.claude-plugin/plugin.json
printf '%s\n' '{"name": "plugin-a", "version": "2.50.0"}' > plugins/plugin-a/.codex-plugin/plugin.json
mkdir -p plugins/plugin-a/skills
echo "# new skill" > plugins/plugin-a/skills/foo.md
git add . && git commit -q -m init --no-verify
local_sha=$(git rev-parse HEAD)
ZERO=0000000000000000000000000000000000000000
# Push to empty remote: remote_oid is ZERO; hook resolves base = empty-tree SHA.
out=$(echo "refs/heads/main $local_sha refs/heads/main $ZERO" | bash .githooks/pre-push origin git@example.com:nope.git 2>&1)
ec=$?
[ $ec -eq 0 ] || { echo "FAIL: hook exited $ec on empty-remote push (expected 0)"; echo "got: $out"; exit 1; }
echo "PASS: assert_pre_push_empty_remote.sh"
