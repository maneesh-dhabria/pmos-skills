#!/usr/bin/env bash
# lint-slop-rules.test.sh — TDD for tools/lint-slop-rules.sh (story 260624-aqb).
#
# Proves the drift-lint actually fails on drift (not a no-op):
#   1. in-sync registry↔floor pair      → exit 0
#   2. drifted pair (a guideline missing) → exit 1, names the offending rule
#   3. the REAL engine registry↔floor pair → exit 0 (ships in sync)
#   4. missing floor                      → exit 2 (invocation error)
#
# Bash-3.2-safe. Run: bash tools/tests/lint-slop-rules.test.sh
set -euo pipefail
export LC_ALL=C

HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]:-$0}")" && pwd)"
REPO_ROOT="$(cd -- "$HERE/../.." && pwd)"
LINT="$REPO_ROOT/tools/lint-slop-rules.sh"
FIX="$HERE/fixtures/slop-rules"

PASS=0
FAIL=0
check() { # check <name> <expected-exit> <actual-exit>
    if [[ "$2" == "$3" ]]; then echo "ok   - $1 (exit $3)"; PASS=$((PASS + 1));
    else echo "FAIL - $1 (expected exit $2, got $3)"; FAIL=$((FAIL + 1)); fi
}

# 1 — in-sync pair → exit 0
set +e; bash "$LINT" "$FIX/registry.mjs" "$FIX/floor-in-sync.md" >/dev/null 2>&1; rc=$?; set -e
check "in-sync pair passes" 0 "$rc"

# 2 — drifted pair → exit 1, and the report names the dropped rule
set +e; out="$(bash "$LINT" "$FIX/registry.mjs" "$FIX/floor-drifted.md" 2>&1)"; rc=$?; set -e
check "drifted pair fails" 1 "$rc"
if printf '%s' "$out" | grep -q 'fixture-beta'; then echo "ok   - drift report names fixture-beta"; PASS=$((PASS + 1));
else echo "FAIL - drift report did not name fixture-beta"; echo "$out"; FAIL=$((FAIL + 1)); fi

# 3 — the real shipped pair is in sync → exit 0
set +e; bash "$LINT" >/dev/null 2>&1; rc=$?; set -e
check "real registry/floor in sync" 0 "$rc"

# 4 — missing floor → invocation error, exit 2
set +e; bash "$LINT" "$FIX/registry.mjs" "$FIX/no-such-floor.md" >/dev/null 2>&1; rc=$?; set -e
check "missing floor → exit 2" 2 "$rc"

echo
echo "lint-slop-rules.test.sh: ${PASS} passed, ${FAIL} failed"
[[ $FAIL -eq 0 ]]
