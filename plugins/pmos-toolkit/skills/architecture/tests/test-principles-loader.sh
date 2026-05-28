#!/usr/bin/env bash
# test-principles-loader.sh — T5 / FR-04, FR-13, FR-14, E4, E15.
#
# Asserts load-principles.sh:
#   (a) absent L3 dir → merged set = plugin yaml rule count (queried at runtime,
#       NOT hardcoded — yaml is source of truth); stderr contains
#       "no L3 overrides found; using plugin defaults".
#   (b) L3 yaml-only override of U001 → merged U001 carries L3 disposition;
#       stderr contains "L3 override applied: U001".
#   (c) L3 yaml+md aligned override → merged set count unchanged; L3 prose used
#       (override prose sentinel appears in merged U001.summary/why).
#   (d) L3 md with duplicate `## U999` headers in one file → loader exits 1
#       (E15 hard-error).

set -euo pipefail

# ── Bash portability: BASH_SOURCE[0] may be empty under odd source modes.
SOURCE="${BASH_SOURCE[0]:-$0}"
if [ -n "$SOURCE" ] && [ -f "$SOURCE" ]; then
  SCRIPT_DIR="$(cd "$(dirname "$SOURCE")" && pwd)"
else
  # Walk up from $PWD until we find the architecture skill sentinel.
  _walk="$PWD"
  while [ "$_walk" != "/" ] && [ ! -d "$_walk/plugins/pmos-toolkit/skills/architecture" ]; do
    _walk="$(dirname "$_walk")"
  done
  if [ "$_walk" = "/" ]; then
    echo "FATAL: cannot resolve script dir — BASH_SOURCE empty and no sentinel ancestor of \$PWD ($PWD) contains plugins/pmos-toolkit/skills/architecture/" >&2
    exit 2
  fi
  SCRIPT_DIR="$_walk/plugins/pmos-toolkit/skills/architecture/tests"
fi

SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOADER="$SKILL_DIR/scripts/load-principles.sh"
FIXTURES="$SKILL_DIR/tests/fixtures"

if [ ! -x "$LOADER" ] && [ ! -f "$LOADER" ]; then
  echo "FAIL: load-principles.sh not found at $LOADER" >&2
  exit 1
fi

# Real rule count from plugin yaml — query at runtime per task body.
EXPECTED_N=$(grep -cE '^[[:space:]]*-[[:space:]]*id:[[:space:]]*[A-Z]+[0-9]+' "$SKILL_DIR/principles.yaml")
if [ "$EXPECTED_N" -lt 1 ]; then
  echo "FAIL: cannot count rules in $SKILL_DIR/principles.yaml" >&2
  exit 1
fi
echo "info: plugin yaml carries $EXPECTED_N rules"

PASS=0
FAIL=0
PASSED_CASES=()
FAILED_CASES=()
TMP=$(mktemp -d -t principles-loader-test.XXXXXX)
trap 'rm -rf "$TMP"' EXIT

_assert() {
  local label="$1" cond_rc="$2"
  if [ "$cond_rc" = "0" ]; then
    echo "  PASS: $label"
    PASS=$((PASS + 1))
    PASSED_CASES+=("$label")
  else
    echo "  FAIL: $label" >&2
    FAIL=$((FAIL + 1))
    FAILED_CASES+=("$label")
  fi
}

# ── case (a): no L3 dir ─────────────────────────────────────────────────────
echo "── case (a): no L3 dir ──"
EMPTY_L3="$TMP/no-l3"  # intentionally does not exist
set +e
A_STDOUT="$TMP/a.out"; A_STDERR="$TMP/a.err"
bash "$LOADER" --l3-root "$EMPTY_L3" >"$A_STDOUT" 2>"$A_STDERR"
A_RC=$?
set -e

if [ "$A_RC" -ne 0 ]; then
  echo "FAIL: case (a) exit $A_RC; stderr:" >&2; cat "$A_STDERR" >&2; exit 1
fi
A_COUNT=$(node -e 'const a=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(a.length))' "$A_STDOUT")
[ "$A_COUNT" = "$EXPECTED_N" ]; _assert "(a) merged length = $EXPECTED_N (got $A_COUNT)" $?
grep -q "no L3 overrides found; using plugin defaults" "$A_STDERR"; _assert "(a) stderr contains 'no L3 overrides found; using plugin defaults'" $?

# ── case (b): L3 yaml-only override of U001 ─────────────────────────────────
echo "── case (b): L3 yaml-only override of U001 ──"
set +e
B_STDOUT="$TMP/b.out"; B_STDERR="$TMP/b.err"
bash "$LOADER" --l3-root "$FIXTURES/l3-override-yaml-only" >"$B_STDOUT" 2>"$B_STDERR"
B_RC=$?
set -e
if [ "$B_RC" -ne 0 ]; then
  echo "FAIL: case (b) exit $B_RC; stderr:" >&2; cat "$B_STDERR" >&2; exit 1
fi
B_U001_DISP=$(node -e '
  const a=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
  const r=a.find(x=>x.id==="U001");
  process.stdout.write(r?String(r.disposition):"MISSING");
' "$B_STDOUT")
[ "$B_U001_DISP" = "must_fix" ]; _assert "(b) U001.disposition merged to L3 value 'must_fix' (got '$B_U001_DISP')" $?
grep -q "L3 override applied: U001" "$B_STDERR"; _assert "(b) stderr contains 'L3 override applied: U001'" $?

# ── case (c): L3 yaml+md aligned override ───────────────────────────────────
echo "── case (c): L3 yaml+md aligned override ──"
set +e
C_STDOUT="$TMP/c.out"; C_STDERR="$TMP/c.err"
bash "$LOADER" --l3-root "$FIXTURES/l3-override-with-md" >"$C_STDOUT" 2>"$C_STDERR"
C_RC=$?
set -e
if [ "$C_RC" -ne 0 ]; then
  echo "FAIL: case (c) exit $C_RC; stderr:" >&2; cat "$C_STDERR" >&2; exit 1
fi
C_COUNT=$(node -e 'const a=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(a.length))' "$C_STDOUT")
[ "$C_COUNT" = "$EXPECTED_N" ]; _assert "(c) merged length still = $EXPECTED_N (got $C_COUNT)" $?
# Prose sentinel: L3 md replaces plugin md prose for U001 — sentinel string must
# appear somewhere on the merged U001 entry (summary/why/prose field).
C_HAS_SENTINEL=$(node -e '
  const a=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
  const r=a.find(x=>x.id==="U001");
  if(!r){process.stdout.write("0");process.exit(0);}
  const blob=JSON.stringify(r);
  process.stdout.write(blob.indexOf("PROJECT_L3_PROSE_OVERRIDE_U001")>=0?"1":"0");
' "$C_STDOUT")
[ "$C_HAS_SENTINEL" = "1" ]; _assert "(c) L3 prose sentinel found in merged U001 entry" $?

# ── case (d): L3 md with duplicate H2 → hard error ──────────────────────────
echo "── case (d): L3 md duplicate H2 → exit 1 (E15) ──"
set +e
D_STDOUT="$TMP/d.out"; D_STDERR="$TMP/d.err"
bash "$LOADER" --l3-root "$FIXTURES/l3-duplicate-rule-md" >"$D_STDOUT" 2>"$D_STDERR"
D_RC=$?
set -e
[ "$D_RC" -eq 1 ]; _assert "(d) duplicate H2 → exit 1 (got $D_RC)" $?

echo
echo "── summary: $PASS passed, $FAIL failed ──"
if [ "$FAIL" -gt 0 ]; then
  echo "failed cases:" >&2
  for c in "${FAILED_CASES[@]}"; do echo "  - $c" >&2; done
  exit 1
fi
exit 0
