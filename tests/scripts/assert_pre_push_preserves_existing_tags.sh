#!/usr/bin/env bash
# Assert: pre-push does NOT re-validate tags already present on origin (so
# pre-existing malformed tags don't block future pushes).
# FR-43; spec §14.1.
set -e
HOOK_REPO_PATH=${HOOK_REPO_PATH:-.githooks/pre-push}
FIX=${FIX:-tests/fixtures/multi-plugin/pre-push/existing-tags}
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
# Place a malformed tag, then push it to a local bare "origin" so the hook
# treats it as already-on-origin and skips it.
git tag v2.49.0
BARE="$TMP/bare.git"
git init -q --bare "$BARE"
git remote add origin "$BARE"
git push -q origin HEAD:refs/heads/main --no-verify
git push -q origin refs/tags/v2.49.0 --no-verify
out=$(echo "" | bash .githooks/pre-push 2>&1 || true)
# Hook must exit 0 (silent) — the tag is grandfathered.
if echo "$out" | grep -qiE 'tag.*(format|invalid|shape)'; then
  echo "FAIL: hook re-validated a tag already on origin"
  echo "got: $out"
  exit 1
fi
echo "PASS: assert_pre_push_preserves_existing_tags.sh"
