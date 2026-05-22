#!/usr/bin/env bash
# Assert: pre-push rejects a tag at HEAD without the `<plugin>/v<semver>` shape.
# FR-41; spec §14.1.
set -e
HOOK_REPO_PATH=${HOOK_REPO_PATH:-.githooks/pre-push}
FIX=${FIX:-tests/fixtures/multi-plugin/pre-push/tag-format}
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
git tag v2.49.0
out=$(echo "" | bash .githooks/pre-push 2>&1 || true)
echo "$out" | grep -qE 'tag.*(format|shape|invalid|v2\.49\.0)' || { echo "FAIL: missing tag format error"; echo "got: $out"; exit 1; }
echo "PASS: assert_pre_push_tag_format.sh"
