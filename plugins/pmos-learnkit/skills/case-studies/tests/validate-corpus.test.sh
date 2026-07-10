#!/usr/bin/env bash
# validate-corpus.test.sh — exercises validate-corpus.mjs over a green fixture (expect exit 0)
# and three deliberately-broken fixtures (expect non-zero): a dangling topic, a duplicate id,
# and a bad pillar. bash-3.2-safe; no external deps beyond node.
set -u

# Resolve this script's dir robustly (BASH_SOURCE may be unpopulated when sourced oddly).
SRC="${BASH_SOURCE[0]:-$0}"
DIR="$(cd "$(dirname "$SRC")" 2>/dev/null && pwd)"
if [ -z "$DIR" ] || [ ! -f "$DIR/validate-corpus.test.sh" ]; then
  # fall back: walk up from PWD looking for the sentinel
  d="$PWD"
  while [ "$d" != "/" ]; do
    if [ -f "$d/tests/validate-corpus.test.sh" ]; then DIR="$d/tests"; break; fi
    d="$(dirname "$d")"
  done
fi
if [ -z "${DIR:-}" ] || [ ! -f "$DIR/validate-corpus.test.sh" ]; then
  echo "FAIL: cannot locate test directory" >&2; exit 2
fi

VALIDATOR="$DIR/../scripts/validate-corpus.mjs"
FIX="$DIR/fixtures"
fails=0

run() { # <label> <expect: pass|fail> <fixture>
  label="$1"; expect="$2"; fixture="$3"
  node "$VALIDATOR" --corpus "$FIX/$fixture" >/dev/null 2>&1
  rc=$?
  if [ "$expect" = "pass" ]; then
    if [ "$rc" -eq 0 ]; then echo "ok   $label (exit 0)"; else echo "FAIL $label: expected exit 0, got $rc" >&2; fails=$((fails+1)); fi
  else
    if [ "$rc" -ne 0 ]; then echo "ok   $label (non-zero exit $rc)"; else echo "FAIL $label: expected non-zero, got 0" >&2; fails=$((fails+1)); fi
  fi
}

# The validator's own in-file fixtures.
node "$VALIDATOR" --selftest >/dev/null 2>&1 \
  && echo "ok   validate-corpus --selftest" \
  || { echo "FAIL validate-corpus --selftest" >&2; fails=$((fails+1)); }

run "green fixture"        pass "green.json"
run "dangling topic"       fail "broken-dangling-topic.json"
run "duplicate id"         fail "broken-dup-id.json"
run "bad pillar"           fail "broken-bad-pillar.json"

if [ "$fails" -eq 0 ]; then
  echo "validate-corpus.test.sh: ALL PASS"
  exit 0
fi
echo "validate-corpus.test.sh: $fails FAILURE(S)" >&2
exit 1
