#!/usr/bin/env bash
# test-from-spec-parser.sh — T6 unit tests for scripts/parse-spec.js
#
# 5 cases per plan T6:
#   (a) canonical → exit 0; stdout JSON has modules + assertions arrays
#   (b) missing modules → exit 65; stderr JSON spec-contract-violation, missing=["modules"]
#   (c) empty modules tbody → exit 65; missing=["modules-table-empty"]
#   (d) malformed row → exit 0 (tolerant); stderr warning emitted
#   (e) empty assertions → exit 65; missing=["architectural-assertions"]

set -u
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PARSER="$SKILL_DIR/scripts/parse-spec.js"
FIX="$SCRIPT_DIR/fixtures"

FAIL=0
PASS=0

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

run_case() {
  local fixture="$1"
  local out_file; out_file="$(mktemp)"
  local err_file; err_file="$(mktemp)"
  set +e
  node "$PARSER" "$FIX/$fixture" >"$out_file" 2>"$err_file"
  local rc=$?
  set -e
  echo "$rc|$out_file|$err_file"
}

# ── (a) canonical ───────────────────────────────────────────────────────────
echo "[a] canonical →"
IFS='|' read -r rc out err < <(run_case "spec-canonical.html")
assert "exit 0" "[ '$rc' -eq 0 ]"
assert "stdout has modules array" "node -e 'const j=JSON.parse(require(\"fs\").readFileSync(\"'$out'\",\"utf8\"));process.exit(Array.isArray(j.modules)&&j.modules.length>=1?0:1)'"
assert "stdout has assertions array" "node -e 'const j=JSON.parse(require(\"fs\").readFileSync(\"'$out'\",\"utf8\"));process.exit(Array.isArray(j.assertions)&&j.assertions.length>=1?0:1)'"

# ── (b) missing modules ─────────────────────────────────────────────────────
echo "[b] missing modules →"
IFS='|' read -r rc out err < <(run_case "spec-missing-modules.html")
assert "exit 65" "[ '$rc' -eq 65 ]"
assert "stderr error=spec-contract-violation" "node -e 'const j=JSON.parse(require(\"fs\").readFileSync(\"'$err'\",\"utf8\"));process.exit(j.error===\"spec-contract-violation\"?0:1)'"
assert "stderr missing_sections includes modules" "node -e 'const j=JSON.parse(require(\"fs\").readFileSync(\"'$err'\",\"utf8\"));process.exit(j.missing_sections&&j.missing_sections.indexOf(\"modules\")>=0?0:1)'"
assert "stderr remedy non-empty" "node -e 'const j=JSON.parse(require(\"fs\").readFileSync(\"'$err'\",\"utf8\"));process.exit(typeof j.remedy===\"string\"&&j.remedy.length>0?0:1)'"

# ── (c) empty modules tbody ─────────────────────────────────────────────────
echo "[c] empty modules tbody →"
IFS='|' read -r rc out err < <(run_case "spec-empty-modules-table.html")
assert "exit 65" "[ '$rc' -eq 65 ]"
assert "stderr missing_sections=[modules-table-empty]" "node -e 'const j=JSON.parse(require(\"fs\").readFileSync(\"'$err'\",\"utf8\"));process.exit(j.missing_sections&&j.missing_sections.indexOf(\"modules-table-empty\")>=0?0:1)'"

# ── (d) malformed row (tolerant) ────────────────────────────────────────────
echo "[d] malformed row →"
IFS='|' read -r rc out err < <(run_case "spec-malformed-row.html")
assert "exit 0 (tolerant)" "[ '$rc' -eq 0 ]"
assert "stderr emits warning" "grep -qi 'warn\\|malform\\|skip' '$err'"
assert "stdout modules array has exactly 1 entry (malformed skipped)" "node -e 'const j=JSON.parse(require(\"fs\").readFileSync(\"'$out'\",\"utf8\"));process.exit(j.modules.length===1?0:1)'"

# ── (e) empty assertions ────────────────────────────────────────────────────
echo "[e] empty assertions →"
IFS='|' read -r rc out err < <(run_case "spec-empty-assertions.html")
assert "exit 65" "[ '$rc' -eq 65 ]"
assert "stderr missing_sections=[architectural-assertions]" "node -e 'const j=JSON.parse(require(\"fs\").readFileSync(\"'$err'\",\"utf8\"));process.exit(j.missing_sections&&j.missing_sections.indexOf(\"architectural-assertions\")>=0?0:1)'"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
