#!/usr/bin/env bash
# Assert: diff_router.sh refuses with exit 64 when the diff spans two
# different plugin directories with non-_shared changes.
# FR-52; spec §14.1.
set -e
ROUTER=${ROUTER:-plugins/pmos-toolkit/skills/complete-dev/scripts/diff_router.sh}
FIX=${FIX:-tests/fixtures/multi-plugin/complete-dev/refuse-ambiguous}
ROOT=$(pwd)
TMP=$(mktemp -d); trap "rm -rf $TMP" EXIT
cp -R "$FIX"/. "$TMP"/
cd "$TMP"
git init -q
git config user.name t; git config user.email t@t
git add . && git commit -q -m init --no-verify
echo "change" >> plugins/pmos-toolkit/skills/foo.md
echo "change" >> plugins/pmos-learnkit/skills/bar.md
set +e
out=$(bash "$ROOT/$ROUTER" 2>&1)
rc=$?
set -e
[ "$rc" -eq 64 ] || { echo "FAIL: expected exit 64, got $rc"; echo "got: $out"; exit 1; }
echo "$out" | grep -qE 'spans plugins/.* AND plugins/' || {
  echo "FAIL: expected 'spans plugins/.* AND plugins/' in stderr"
  echo "got: $out"; exit 1; }
echo "PASS: assert_complete_dev_refuse_ambiguous.sh"
