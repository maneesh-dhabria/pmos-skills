#!/usr/bin/env bash
# Assert: pre-commit drift hook fires when peer _shared/ trees differ.
# FR-30, FR-31, FR-32; spec §14.1.
set -e
HOOK_REPO_PATH=${HOOK_REPO_PATH:-.githooks/pre-commit}
FIX=${FIX:-tests/fixtures/multi-plugin/pre-commit/drift}
ROOT=$(pwd)
TMP=$(mktemp -d); trap "rm -rf $TMP" EXIT
cp -R "$FIX"/. "$TMP"/
# Also copy the hook so its relative-to-repo invocation works inside the tempdir
mkdir -p "$TMP/.githooks"
cp "$ROOT/$HOOK_REPO_PATH" "$TMP/.githooks/pre-commit"
chmod +x "$TMP/.githooks/pre-commit"
cd "$TMP"
git init -q
git config user.name t; git config user.email t@t
git add . && git commit -q -m init --no-verify
# Now introduce drift and stage the drifting file
echo "# extra-content-only-in-a" >> plugins/plugin-a/skills/_shared/a.md
git add plugins/plugin-a/skills/_shared/a.md
out=$(bash .githooks/pre-commit 2>&1 || true)
echo "$out" | grep -q 'drift detected' || { echo "FAIL: missing 'drift detected' in stderr"; echo "got: $out"; exit 1; }
echo "$out" | grep -q 'sync-shared.sh' || { echo "FAIL: missing sync-shared.sh hint"; echo "got: $out"; exit 1; }
echo "PASS: assert_pre_commit_drift_detected.sh"
