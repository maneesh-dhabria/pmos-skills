#!/usr/bin/env bash
# Assert: sync-shared.sh idempotent — second run mutates nothing.
# FR-20, FR-22, NFR-05; spec §14.1.
set -e
SCRIPT=${SCRIPT:-scripts/sync-shared.sh}
FIX=${FIX:-tests/fixtures/multi-plugin/sync-shared/idempotent}
ROOT=$(pwd)
TMP=$(mktemp -d)
trap "rm -rf $TMP" EXIT
cp -R "$FIX"/. "$TMP"/
cd "$TMP"
bash "$ROOT/$SCRIPT" --from=plugin-a > /dev/null
first_hash=$(find plugins -type f -exec shasum -a 256 {} \; | sort | shasum -a 256)
bash "$ROOT/$SCRIPT" --from=plugin-a > /dev/null
second_hash=$(find plugins -type f -exec shasum -a 256 {} \; | sort | shasum -a 256)
if [ "$first_hash" != "$second_hash" ]; then
  echo "FAIL: second run mutated state"; exit 1
fi
echo "PASS: assert_sync_shared_idempotent.sh"
