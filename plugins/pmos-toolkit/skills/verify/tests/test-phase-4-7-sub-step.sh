#!/usr/bin/env bash
# test-phase-4-7-sub-step.sh — T14 integration test for /verify Phase 4.7.
#
# Phase 4.7's tier-gate is documented in /verify SKILL.md prose; the underlying
# dispatch is a Task subagent (not script-shaped). bash cannot drive Task
# dispatch, so this test verifies the contract is documented for each of the
# three tiers (T1 skip; T2 scoped --since; T3 full --since) and that the
# --skip-folded-arch escape and advisory-failure pattern are in place.
#
# Three cases per plan §T14 step 3:
#   (T1) skip-log emitted, no /architecture invocation
#   (T2) scoped dispatch with --since
#   (T3) full dispatch with merge-base --since baseline

set -u
set -o pipefail

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"
cd "$REPO_ROOT"

SKILL_MD="plugins/pmos-toolkit/skills/verify/SKILL.md"

PASS=0
FAIL=0
assert() {
  local desc="$1"; local cond="$2"
  if eval "$cond"; then echo "  PASS: $desc"; PASS=$((PASS+1))
  else echo "  FAIL: $desc  (cond: $cond)"; FAIL=$((FAIL+1)); fi
}

echo "[T1] tier-1 skip path"
assert "Phase 4.7 documents T1 skip behaviour" \
  "grep -qE 'tier 1.*skip|T1.*skip' '$SKILL_MD'"
assert "Phase 4.7 emits 'arch sub-step: tier 1, skipping' log" \
  "grep -qE 'arch sub-step: tier 1, skipping' '$SKILL_MD'"

echo
echo "[T2] tier-2 scoped --since dispatch"
assert "Phase 4.7 documents T2 scoped dispatch" \
  "grep -qE 'Scoped run.*--since|T2.*Scoped' '$SKILL_MD'"
assert "Phase 4.7 wires --since flag" \
  "grep -qE -- '--since' '$SKILL_MD'"

echo
echo "[T3] tier-3 full --since dispatch"
assert "Phase 4.7 documents T3 full dispatch" \
  "grep -qE 'Full run.*--since|T3.*Full|tier 3.*full' '$SKILL_MD'"
assert "Phase 4.7 wires git merge-base HEAD main baseline" \
  "grep -qE 'git merge-base HEAD main' '$SKILL_MD'"

echo
echo "[esc] --skip-folded-arch escape + advisory failure"
assert "--skip-folded-arch flag documented" \
  "grep -qE -- '--skip-folded-arch' '$SKILL_MD'"
assert "advisory failure appends to phases.verify.folded_phase_failures" \
  "grep -qE 'phases\.verify\.folded_phase_failures' '$SKILL_MD'"
assert "Architecture findings aggregator section named" \
  "grep -qE 'Architecture findings' '$SKILL_MD'"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
