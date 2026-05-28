#!/usr/bin/env bash
# test-advisory-failure-pattern.sh — T14 integration test for FR-22 + FR-29
# (advisory failure pattern, D11).
#
# Both /spec Phase 6.6 and /verify Phase 4.7 invoke /architecture as a Task
# subagent. On dispatch failure (subagent crash, timeout, schema-conformance
# hard-fail, judge API error), the failure is:
#
#   (a) NOT blocking — host phase continues to PASS
#   (b) appended to state.yaml.phases.<host>.folded_phase_failures[] as
#       {folded_skill: "architecture", error_excerpt: <first-200-chars>,
#        ts: <ISO-8601>}
#   (c) surfaced as a chat WARNING at moment-of-append
#
# bash cannot drive Task dispatch failures, so this test verifies the
# contract is documented identically in BOTH host SKILL.md files.

set -u
set -o pipefail

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"
cd "$REPO_ROOT"

SPEC_MD="plugins/pmos-toolkit/skills/spec/SKILL.md"
VERIFY_MD="plugins/pmos-toolkit/skills/verify/SKILL.md"

PASS=0
FAIL=0
assert() {
  local desc="$1"; local cond="$2"
  if eval "$cond"; then echo "  PASS: $desc"; PASS=$((PASS+1))
  else echo "  FAIL: $desc  (cond: $cond)"; FAIL=$((FAIL+1)); fi
}

echo "[spec/Phase 6.6] advisory failure contract"
assert "advisory failure section labelled with FR-22 + D11" \
  "grep -qE 'Advisory failure.*FR-22|FR-22.*D11|D11' '$SPEC_MD'"
assert "captures folded_skill: architecture" \
  "grep -qE 'folded_skill.*architecture' '$SPEC_MD'"
assert "captures error_excerpt (first-200-chars)" \
  "grep -qE 'error_excerpt.*first-200-chars' '$SPEC_MD'"
assert "appends to phases.spec.folded_phase_failures" \
  "grep -qE 'phases\.spec\.folded_phase_failures' '$SPEC_MD'"
assert "emits chat WARNING at moment-of-append" \
  "grep -qE 'WARNING: architecture crashed' '$SPEC_MD'"
assert "documents continue (not blocking) per D11" \
  "grep -qE 'Continue to Phase 7|do NOT block|continues to PASS|continue to' '$SPEC_MD'"

echo
echo "[verify/Phase 4.7] advisory failure contract"
assert "advisory failure section labelled with FR-29 + D11" \
  "grep -qE 'Advisory failure.*FR-29|FR-29.*D11' '$VERIFY_MD'"
assert "captures folded_skill: architecture" \
  "grep -qE 'folded_skill.*architecture' '$VERIFY_MD'"
assert "captures error_excerpt (first-200-chars)" \
  "grep -qE 'error_excerpt.*first-200-chars' '$VERIFY_MD'"
assert "appends to phases.verify.folded_phase_failures" \
  "grep -qE 'phases\.verify\.folded_phase_failures' '$VERIFY_MD'"
assert "emits chat WARNING at moment-of-append" \
  "grep -qE 'WARNING: architecture crashed in verify' '$VERIFY_MD'"
assert "documents continue (does NOT block /verify PASS)" \
  "grep -qE 'do NOT block /verify|do not block|continues to PASS|continue to' '$VERIFY_MD'"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
