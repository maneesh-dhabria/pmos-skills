#!/usr/bin/env bash
# Assert: diff_router.sh emits 'Substrate-only change detected' when the diff
# touches only _shared/ paths across multiple plugins.
# FR-53; spec §14.1.
set -e
ROUTER=${ROUTER:-plugins/pmos-toolkit/skills/complete-dev/scripts/diff_router.sh}
FIX=${FIX:-tests/fixtures/multi-plugin/complete-dev/substrate-smart-detect}
ROOT=$(pwd)
TMP=$(mktemp -d); trap "rm -rf $TMP" EXIT
cp -R "$FIX"/. "$TMP"/
cd "$TMP"
git init -q
git config user.name t; git config user.email t@t
git add . && git commit -q -m init --no-verify
echo "change" >> plugins/pmos-toolkit/skills/_shared/baz.md
echo "change" >> plugins/pmos-learnkit/skills/_shared/baz.md
out=$(bash "$ROOT/$ROUTER" 2>&1 || true)
echo "$out" | grep -q 'Substrate-only change detected' || {
  echo "FAIL: expected 'Substrate-only change detected' in stdout"
  echo "got: $out"; exit 1; }
echo "PASS: assert_complete_dev_substrate_smart_detect.sh"
