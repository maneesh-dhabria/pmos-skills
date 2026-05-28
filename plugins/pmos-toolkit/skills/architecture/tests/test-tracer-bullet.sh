#!/usr/bin/env bash
# test-tracer-bullet.sh — T1 acceptance test for /architecture --from-spec tracer.
# Asserts the tracer script (a) exits 0, (b) writes /tmp/architecture-tracer-findings.json,
# (c) the file is a JSON array whose every element has rule_id ∈ {U001,U002} and a
# verbatim ≥40-char quote.
set -euo pipefail

THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SKILL_DIR="$(cd "$THIS_DIR/.." && pwd)"
FIXTURE_SPEC="$SKILL_DIR/tests/fixtures/spec-canonical.html"
SCRIPT="$SKILL_DIR/scripts/from-spec-tracer.sh"
OUT="/tmp/architecture-tracer-findings.json"

fail() { echo "FAIL: $*" >&2; exit 1; }

# Clean prior artifact.
rm -f "$OUT"

[ -f "$SCRIPT" ]       || fail "tracer script missing: $SCRIPT"
[ -f "$FIXTURE_SPEC" ] || fail "fixture spec missing: $FIXTURE_SPEC"

# (a) exit 0
bash "$SCRIPT" "$FIXTURE_SPEC" || fail "tracer script exited non-zero"

# (b) findings file exists
[ -f "$OUT" ] || fail "findings file not written: $OUT"

# (c) JSON shape
node -e "
const f = require('$OUT');
if (!Array.isArray(f)) process.exit(1);
if (f.length === 0) process.exit(4);
const allowed = new Set(['U001','U002']);
for (const x of f) {
  if (!allowed.has(x.rule_id)) process.exit(2);
  if (!x.quote || x.quote.length < 40) process.exit(3);
}
" || fail "findings JSON shape invalid (node exit \$?)"

echo "PASS: tracer-bullet"
