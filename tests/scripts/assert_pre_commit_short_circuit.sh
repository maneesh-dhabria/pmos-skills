#!/usr/bin/env bash
# Assert: pre-commit hook exits 0 without scanning when staged diff has no _shared/ paths.
# FR-33; spec §14.1.
set -e
HOOK_REPO_PATH=${HOOK_REPO_PATH:-.githooks/pre-commit}
FIX=${FIX:-tests/fixtures/multi-plugin/pre-commit/short-circuit}
ROOT=$(pwd)
TMP=$(mktemp -d); trap "rm -rf $TMP" EXIT
cp -R "$FIX"/. "$TMP"/
mkdir -p "$TMP/.githooks"
cp "$ROOT/$HOOK_REPO_PATH" "$TMP/.githooks/pre-commit"
chmod +x "$TMP/.githooks/pre-commit"
cd "$TMP"
git init -q
git config user.name t; git config user.email t@t
git add . && git commit -q -m init --no-verify
# Stage a non-_shared/ change
echo "# more" >> plugins/plugin-a/skills/other/x.md
git add plugins/plugin-a/skills/other/x.md
if ! bash .githooks/pre-commit; then
  echo "FAIL: hook should exit 0 on non-_shared/ diff"
  exit 1
fi
echo "PASS: assert_pre_commit_short_circuit.sh"
