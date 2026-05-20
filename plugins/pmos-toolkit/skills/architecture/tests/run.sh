#!/usr/bin/env bash
# tests/run.sh — fixture runner (T20).
# For every fixture dir under tests/fixtures/ (and one level deeper for
# adr-reconcile sub-fixtures), if it carries a `.assert` script, run it and
# tally pass/fail. Exits 0 if every fixture's .assert exits 0; exits 1 otherwise.
# Each .assert runs with cwd = the fixture dir and the env vars:
#   SKILL_DIR   absolute path to the architecture skill root
#   AUDIT       command to invoke run-audit.sh on the fixture (already wired)
#   FIXTURE     basename of the fixture
set -uo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0
FAILED_NAMES=()
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

run_one() {
  local fixture="$1" name="$2"
  local assert="$fixture/.assert"
  [ -f "$assert" ] || return 2  # no .assert → skip

  # T1 — v2 production stdout is empty (FR-66). The wrapper runs run-audit.sh
  # and cats the resulting JSON sidecar to stdout so existing .assert scripts
  # that pipe `$AUDIT | jq` keep working. Fixtures that explicitly test the
  # empty-stdout production contract invoke run-audit.sh directly instead.
  local audit_cmd="bash $SKILL_DIR/tests/audit-wrapper.sh ."
  if (
    cd "$fixture" &&
    export SKILL_DIR FIXTURE="$name" AUDIT="$audit_cmd" &&
    bash .assert
  ) >"$TMP" 2>&1; then
    echo "ok  $name"
    PASS=$((PASS + 1))
  else
    echo "FAIL $name"
    sed 's/^/    /' "$TMP"
    FAIL=$((FAIL + 1))
    FAILED_NAMES+=("$name")
  fi
}

for fixture in "$SKILL_DIR"/tests/fixtures/*/; do
  name=$(basename "$fixture")
  if [ "$name" = "adr-reconcile" ]; then
    for sub in "$fixture"*/; do
      run_one "$sub" "adr-reconcile/$(basename "$sub")"
    done
  else
    run_one "$fixture" "$name"
  fi
done

echo "---"
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
