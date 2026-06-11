#!/usr/bin/env bash
# Assert: sync-shared.sh --dry-run reports would-sync/skipped and does not
# mutate disk.
# FR-21, FR-23; spec §14.1. Updated 2026-06-11 (design-review P1/P2 Wave 3):
# the script is now intersection-only (no rsync, never creates/deletes) and
# resolves the repo root from its own location — so the test copies the
# script INTO the fixture so root resolution lands on the fixture tree.
set -e
SCRIPT=${SCRIPT:-scripts/sync-shared.sh}
FIX=${FIX:-tests/fixtures/multi-plugin/sync-shared/dry-run}
ROOT=$(pwd)
TMP=$(mktemp -d)
trap "rm -rf $TMP" EXIT
cp -R "$FIX"/. "$TMP"/
mkdir -p "$TMP/scripts"
cp "$ROOT/$SCRIPT" "$TMP/scripts/sync-shared.sh"
cd "$TMP"
# Make one intersection file differ so --dry-run has something to report.
echo "# b-stale" > plugins/plugin-b/skills/_shared/b.md
out=$(bash "$TMP/scripts/sync-shared.sh" --from=plugin-a --dry-run)
if [ -e plugins/plugin-b/skills/_shared/extra.md ]; then
  echo "FAIL: --dry-run mutated disk (extra.md appeared in plugin-b)"; exit 1
fi
if [ "$(cat plugins/plugin-b/skills/_shared/b.md)" != "# b-stale" ]; then
  echo "FAIL: --dry-run mutated disk (b.md was overwritten)"; exit 1
fi
if ! echo "$out" | grep -q 'would sync: b.md'; then
  echo "FAIL: --dry-run did not report 'would sync: b.md'. Got:"; echo "$out"; exit 1
fi
if ! echo "$out" | grep -q 'skipped (source-only, not in plugin-b): extra.md'; then
  echo "FAIL: --dry-run did not report extra.md as source-only skipped. Got:"; echo "$out"; exit 1
fi
if ! echo "$out" | grep -q 'summary:'; then
  echo "FAIL: --dry-run did not print a summary line. Got:"; echo "$out"; exit 1
fi
echo "PASS: assert_sync_shared_dry_run.sh"
