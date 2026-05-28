#!/usr/bin/env bash
# test-phase-6-6-gate.sh — T14 integration test for /spec Phase 6.6 tier gate.
#
# Phase 6.6's tier-gate is documented in /spec SKILL.md prose and driven at
# decision time by auto-upgrade-detector.sh (the only script-shaped piece of
# the gate). bash cannot drive AskUserQuestion, so this test verifies the
# contract via the two surfaces that ARE testable:
#
#   (A) /spec SKILL.md documents the tier-gate decision matrix
#       (T1 skip, T2 conditional+auto-upgrade, T3 default-on)
#   (B) auto-upgrade-detector.sh returns the correct upgrade decision for
#       each of the 4 tier fixtures (T1 / T2-no-new / T2-new / T3)
#
# Together (A)+(B) prove the Recommendation that Phase 6.6 surfaces to the
# operator: T1→skip, T2-no-new→Skip Recommended, T2-new→auto-upgrade→Run
# Recommended, T3→Run Recommended.

set -u
set -o pipefail

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"
cd "$REPO_ROOT"

SKILL_MD="plugins/pmos-toolkit/skills/spec/SKILL.md"
DETECTOR="plugins/pmos-toolkit/skills/architecture/scripts/auto-upgrade-detector.sh"
FIX_DIR="plugins/pmos-toolkit/skills/spec/tests/fixtures"

PASS=0
FAIL=0
assert() {
  local desc="$1"; local cond="$2"
  if eval "$cond"; then echo "  PASS: $desc"; PASS=$((PASS+1))
  else echo "  FAIL: $desc  (cond: $cond)"; FAIL=$((FAIL+1)); fi
}

echo "[A] /spec SKILL.md tier-gate documentation"
assert "Phase 6.6 heading present" \
  "grep -qE '^## Phase 6\.6: Folded /architecture --from-spec' '$SKILL_MD'"
assert "Phase 6.6 documents T1 skip" \
  "grep -qE 'T1.*skip|tier 1.*skip|T1 skip' '$SKILL_MD'"
assert "Phase 6.6 documents T2 conditional auto-upgrade" \
  "grep -qE 'auto-upgrade|T2.*conditional|conditional.*T2' '$SKILL_MD'"
assert "Phase 6.6 documents T3 default-on" \
  "grep -qE 'T3.*default-on|default-on.*T3|tier 3.*default-on' '$SKILL_MD'"
assert "Phase 6.6 cites auto-upgrade-detector" \
  "grep -qE 'auto-upgrade-detector' '$SKILL_MD'"

echo
echo "[B] auto-upgrade-detector against the 4 tier fixtures"
T1_OUT="$(bash "$DETECTOR" "$FIX_DIR/spec-t1.html")"
assert "T1 fixture → no modules declared (gate-Recommendation: skip)" \
  "echo '$T1_OUT' | grep -qE '\"reason\":\"no modules declared\"'"
assert "T1 fixture → upgrade=false" \
  "echo '$T1_OUT' | grep -qE '\"upgrade\":false'"

T2NN_OUT="$(bash "$DETECTOR" "$FIX_DIR/spec-t2-no-new.html")"
assert "T2-no-new → upgrade=false (gate-Recommendation: Skip)" \
  "echo '$T2NN_OUT' | grep -qE '\"upgrade\":false'"
assert "T2-no-new → reason 'no new modules'" \
  "echo '$T2NN_OUT' | grep -qE '\"reason\":\"no new modules\"'"

T2N_OUT="$(bash "$DETECTOR" "$FIX_DIR/spec-t2-new.html")"
assert "T2-new → upgrade=true (gate auto-upgrade T2→T3; Recommendation: Run)" \
  "echo '$T2N_OUT' | grep -qE '\"upgrade\":true'"
assert "T2-new → reports brandnewthing as the new module" \
  "echo '$T2N_OUT' | grep -qE 'brandnewthing'"

T3_OUT="$(bash "$DETECTOR" "$FIX_DIR/spec-t3.html")"
assert "T3 fixture parses cleanly (Recommendation: Run regardless of upgrade)" \
  "echo '$T3_OUT' | grep -qE '\"upgrade\":(true|false)'"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
