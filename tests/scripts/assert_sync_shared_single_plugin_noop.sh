#!/usr/bin/env bash
# Assert: sync-shared.sh with only one plugin exits 0 and mentions no peers.
# FR-24; spec §14.1. Updated 2026-06-11 (design-review P1/P2 Wave 3): the
# script resolves the repo root from its own location, so the test copies it
# INTO the fixture tree.
set -e
SCRIPT=${SCRIPT:-scripts/sync-shared.sh}
FIX=${FIX:-tests/fixtures/multi-plugin/sync-shared/single-plugin}
ROOT=$(pwd)
TMP=$(mktemp -d)
trap "rm -rf $TMP" EXIT
cp -R "$FIX"/. "$TMP"/
mkdir -p "$TMP/scripts"
cp "$ROOT/$SCRIPT" "$TMP/scripts/sync-shared.sh"
cd "$TMP"
set +e
err=$(bash "$TMP/scripts/sync-shared.sh" --from=plugin-a 2>&1 >/dev/null)
status=$?
set -e
if [ "$status" -ne 0 ]; then
  echo "FAIL: expected exit 0, got $status"; exit 1
fi
if ! echo "$err" | grep -qi 'only one plugin'; then
  echo "FAIL: stderr did not mention 'only one plugin'. Got: $err"; exit 1
fi
echo "PASS: assert_sync_shared_single_plugin_noop.sh"
