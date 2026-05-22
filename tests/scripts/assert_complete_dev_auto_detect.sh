#!/usr/bin/env bash
# Assert: diff_router.sh emits 'Auto-detected --plugin <name> from diff' when
# the diff touches exactly one non-_shared plugin directory.
# FR-51; spec §14.1.
set -e
ROUTER=${ROUTER:-plugins/pmos-toolkit/skills/complete-dev/scripts/diff_router.sh}
FIX=${FIX:-tests/fixtures/multi-plugin/complete-dev/auto-detect}
ROOT=$(pwd)
TMP=$(mktemp -d); trap "rm -rf $TMP" EXIT
cp -R "$FIX"/. "$TMP"/
cd "$TMP"
git init -q
git config user.name t; git config user.email t@t
git add . && git commit -q -m init --no-verify
echo "change" >> plugins/pmos-toolkit/skills/foo.md
out=$(bash "$ROOT/$ROUTER" 2>&1 || true)
echo "$out" | grep -q 'Auto-detected --plugin pmos-toolkit from diff' || {
  echo "FAIL: expected 'Auto-detected --plugin pmos-toolkit from diff' in stdout"
  echo "got: $out"; exit 1; }
echo "PASS: assert_complete_dev_auto_detect.sh"
