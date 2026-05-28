#!/usr/bin/env bash
# test-auto-upgrade-detector.sh — T10 unit tests for scripts/auto-upgrade-detector.sh
#
# Cases:
#   (a) spec with 1 new module → upgrade=true, new_modules includes "brandnewthing"
#   (b) spec with all existing modules → upgrade=false, reason="no new modules"
#   (c) spec with empty §Modules table → upgrade=false, reason="no modules declared"
#   (d) tempdir without .git → upgrade=false, reason="git ls-tree failed", exit 0

set -u
set -o pipefail

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DETECTOR="$SKILL_DIR/scripts/auto-upgrade-detector.sh"
FIX_NEW="$SCRIPT_DIR/fixtures/spec-t2-new-module.html"
FIX_ALL="$SCRIPT_DIR/fixtures/spec-t2-all-existing.html"
FIX_EMPTY="$SCRIPT_DIR/fixtures/spec-empty-modules-table.html"

# Detector resolves module_roots relative to PWD — run cases a/b/c from repo root
# so plugins/*/skills/ glob expands. Case d intentionally cd's to a tempdir.
REPO_ROOT="$(cd "$SKILL_DIR/../../../.." && pwd)"
cd "$REPO_ROOT"

PASS=0
FAIL=0

assert() {
  local desc="$1"; local cond="$2"
  if eval "$cond"; then
    echo "  PASS: $desc"
    PASS=$((PASS+1))
  else
    echo "  FAIL: $desc  (cond: $cond)"
    FAIL=$((FAIL+1))
  fi
}

# ── Case (a): 1 new module ─────────────────────────────────────────────────────
echo "[case a] spec with brandnewthing absent from repo"
set +e
OUT_A="$(bash "$DETECTOR" "$FIX_NEW" 2>/dev/null)"
RC_A=$?
set -e
assert "case a: detector exits 0"             "[ '$RC_A' -eq 0 ]"
assert "case a: upgrade is true"              "echo '$OUT_A' | node -e 'process.exit(JSON.parse(require(\"fs\").readFileSync(0,\"utf8\")).upgrade===true?0:1)'"
assert "case a: new_modules contains brandnewthing" \
  "echo '$OUT_A' | node -e 'const d=JSON.parse(require(\"fs\").readFileSync(0,\"utf8\"));process.exit(Array.isArray(d.new_modules)&&d.new_modules.includes(\"brandnewthing\")?0:1)'"

# ── Case (b): all existing modules ─────────────────────────────────────────────
echo "[case b] spec with all-existing modules"
set +e
OUT_B="$(bash "$DETECTOR" "$FIX_ALL" 2>/dev/null)"
RC_B=$?
set -e
assert "case b: detector exits 0"             "[ '$RC_B' -eq 0 ]"
assert "case b: upgrade is false"             "echo '$OUT_B' | node -e 'process.exit(JSON.parse(require(\"fs\").readFileSync(0,\"utf8\")).upgrade===false?0:1)'"
assert "case b: reason is 'no new modules'"   "echo '$OUT_B' | node -e 'process.exit(JSON.parse(require(\"fs\").readFileSync(0,\"utf8\")).reason===\"no new modules\"?0:1)'"

# ── Case (c): empty modules table ──────────────────────────────────────────────
echo "[case c] spec with empty §Modules table"
set +e
OUT_C="$(bash "$DETECTOR" "$FIX_EMPTY" 2>/dev/null)"
RC_C=$?
set -e
assert "case c: detector exits 0"             "[ '$RC_C' -eq 0 ]"
assert "case c: upgrade is false"             "echo '$OUT_C' | node -e 'process.exit(JSON.parse(require(\"fs\").readFileSync(0,\"utf8\")).upgrade===false?0:1)'"
assert "case c: reason is 'no modules declared'" \
  "echo '$OUT_C' | node -e 'process.exit(JSON.parse(require(\"fs\").readFileSync(0,\"utf8\")).reason===\"no modules declared\"?0:1)'"

# ── Case (d): tempdir without .git ─────────────────────────────────────────────
echo "[case d] tempdir without .git (E13)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
set +e
OUT_D="$(cd "$TMP" && bash "$DETECTOR" "$FIX_ALL" 2>/dev/null)"
RC_D=$?
set -e
assert "case d: detector exits 0"             "[ '$RC_D' -eq 0 ]"
assert "case d: upgrade is false"             "echo '$OUT_D' | node -e 'process.exit(JSON.parse(require(\"fs\").readFileSync(0,\"utf8\")).upgrade===false?0:1)'"
assert "case d: reason is 'git ls-tree failed'" \
  "echo '$OUT_D' | node -e 'process.exit(JSON.parse(require(\"fs\").readFileSync(0,\"utf8\")).reason===\"git ls-tree failed\"?0:1)'"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
