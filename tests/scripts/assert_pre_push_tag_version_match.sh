#!/usr/bin/env bash
# Assert: pre-push rejects a `<plugin>/v<semver>` tag whose version does not
# match the four manifest version entries.
# FR-42; spec §14.1.
set -e
HOOK_REPO_PATH=${HOOK_REPO_PATH:-.githooks/pre-push}
FIX=${FIX:-tests/fixtures/multi-plugin/pre-push/tag-version}
ROOT=$(pwd)
TMP=$(mktemp -d); trap "rm -rf $TMP" EXIT
cp -R "$FIX"/. "$TMP"/
mkdir -p "$TMP/.githooks"
cp "$ROOT/$HOOK_REPO_PATH" "$TMP/.githooks/pre-push"
chmod +x "$TMP/.githooks/pre-push"
cd "$TMP"
git init -q
git config user.name t; git config user.email t@t
git add . && git commit -q -m init --no-verify
# Manifests all at 2.49.0; tag claims 2.50.0
git tag plugin-a/v2.50.0
out=$(echo "" | bash .githooks/pre-push 2>&1 || true)
echo "$out" | grep -q '2.50.0' || { echo "FAIL: expected tag version 2.50.0 in error"; echo "got: $out"; exit 1; }
echo "$out" | grep -q '2.49.0' || { echo "FAIL: expected manifest version 2.49.0 in error"; echo "got: $out"; exit 1; }
echo "PASS: assert_pre_push_tag_version_match.sh"
