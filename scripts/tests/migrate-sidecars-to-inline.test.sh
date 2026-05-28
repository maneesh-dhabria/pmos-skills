#!/usr/bin/env bash
# T10 — migrate-sidecars-to-inline.sh end-to-end test.
# Exercises the three fixture pairs in scripts/tests/fixtures/migration/.
# FR-19 (inject inline block from sidecar), FR-20 (idempotency),
# FR-21 (delete sidecar on success), E13 (missing-block injection).

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="$HERE/../migrate-sidecars-to-inline.sh"
FIXTURES="$HERE/fixtures/migration"
WORK="$(mktemp -d)"
trap "rm -rf $WORK" EXIT

cp -r "$FIXTURES"/* "$WORK/"

# ───────────────────────────── Dry-run ─────────────────────────────
DRY="$(bash "$SCRIPT" --dry-run "$WORK")"
[[ "$DRY" == *"would migrate: $WORK/b.html"* ]] || { echo "FAIL: dry-run b not announced"; echo "$DRY"; exit 1; }
[[ "$DRY" == *"would migrate: $WORK/c.html"* ]] || { echo "FAIL: dry-run c not announced"; echo "$DRY"; exit 1; }
[[ -f "$WORK/b.html.comments.json" ]] || { echo "FAIL: dry-run deleted sidecar"; exit 1; }
[[ -f "$WORK/c.html.comments.json" ]] || { echo "FAIL: dry-run deleted sidecar c"; exit 1; }
! grep -q "pmos-comments:start" "$WORK/b.html" || { echo "FAIL: dry-run mutated b.html"; exit 1; }
! grep -q "pmos-comments:start" "$WORK/c.html" || { echo "FAIL: dry-run mutated c.html"; exit 1; }
echo "OK: dry-run announces b + c, leaves files untouched"

# ───────────────────────────── Real run ─────────────────────────────
REAL="$(bash "$SCRIPT" "$WORK")"
[[ ! -f "$WORK/b.html.comments.json" ]] || { echo "FAIL: b sidecar not deleted"; exit 1; }
[[ ! -f "$WORK/c.html.comments.json" ]] || { echo "FAIL: c sidecar not deleted"; exit 1; }
grep -q "pmos-comments:start" "$WORK/b.html" || { echo "FAIL: b inline block missing"; exit 1; }
grep -q "pmos-comments:start" "$WORK/c.html" || { echo "FAIL: c inline block missing (E13)"; exit 1; }
# a.html had a block already and no sidecar → must be untouched (still one block, still no sidecar).
grep -c "pmos-comments:start" "$WORK/a.html" | grep -qx 1 || { echo "FAIL: a got a second block"; exit 1; }
[[ ! -f "$WORK/a.html.comments.json" ]] || { echo "FAIL: a sidecar should not exist"; exit 1; }
# Migration must preserve the thread payload from the sidecar in the injected block.
grep -q "fixb_t01" "$WORK/b.html" || { echo "FAIL: b inline block missing thread id"; exit 1; }
grep -q "fixc_t01" "$WORK/c.html" || { echo "FAIL: c inline block missing thread id"; exit 1; }
echo "OK: real run migrates b + c, preserves a, deletes sidecars, threads survive"

# ───────────────────────────── Idempotency ─────────────────────────────
OUT2="$(bash "$SCRIPT" "$WORK")"
[[ "$OUT2" == *"summary: 0 migrated"* ]] || { echo "FAIL: second run not idempotent — $OUT2"; exit 1; }
echo "OK: second run is a no-op"

echo "OK: migration test"
