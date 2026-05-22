#!/usr/bin/env bash
# Assert: sync-shared.sh --dry-run prints rsync command and does not mutate disk.
# FR-21, FR-23; spec §14.1.
set -e
SCRIPT=${SCRIPT:-scripts/sync-shared.sh}
FIX=${FIX:-tests/fixtures/multi-plugin/sync-shared/dry-run}
ROOT=$(pwd)
TMP=$(mktemp -d)
trap "rm -rf $TMP" EXIT
cp -R "$FIX"/. "$TMP"/
cd "$TMP"
out=$(bash "$ROOT/$SCRIPT" --from=plugin-a --dry-run)
if [ -e plugins/plugin-b/skills/_shared/extra.md ]; then
  echo "FAIL: --dry-run mutated disk (extra.md appeared in plugin-b)"; exit 1
fi
if ! echo "$out" | grep -q '^rsync'; then
  echo "FAIL: --dry-run did not print rsync command. Got:"; echo "$out"; exit 1
fi
echo "PASS: assert_sync_shared_dry_run.sh"
