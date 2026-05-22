#!/usr/bin/env bash
# Assert: sync-shared.sh with no --from exits 64 with stderr mentioning --from.
# FR-25; spec §14.1.
set -e
SCRIPT=${SCRIPT:-scripts/sync-shared.sh}
FIX=${FIX:-tests/fixtures/multi-plugin/sync-shared/bad-usage}
ROOT=$(pwd)
TMP=$(mktemp -d)
trap "rm -rf $TMP" EXIT
cp -R "$FIX"/. "$TMP"/
cd "$TMP"
set +e
err=$(bash "$ROOT/$SCRIPT" 2>&1 >/dev/null)
status=$?
set -e
if [ "$status" -ne 64 ]; then
  echo "FAIL: expected exit 64, got $status"; exit 1
fi
if ! echo "$err" | grep -q -- '--from'; then
  echo "FAIL: stderr did not mention '--from'. Got: $err"; exit 1
fi
echo "PASS: assert_sync_shared_bad_usage.sh"
