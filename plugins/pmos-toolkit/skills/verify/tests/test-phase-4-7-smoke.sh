#!/usr/bin/env bash
# test-phase-4-7-smoke.sh — T13 unit smoke for /verify Phase 4.7 (folded /architecture --since).
#
# Five grep assertions per plan §T13 step 2:
#   (1) SKILL.md has the literal Phase 4.7 heading
#   (2) SKILL.md mentions --skip-folded-arch
#   (3) Phase 4.7 body references folded_phase_failures
#   (4) Phase 4.7 body wires git merge-base HEAD main as the --since base
#   (5) SKILL.md adds an "Architecture findings" aggregator section name

set -u
set -o pipefail

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SKILL_MD="$SKILL_DIR/SKILL.md"

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

echo "[skill.md] Phase 4.7 structural checks"
assert "SKILL.md has '## Phase 4.7: Folded /architecture --since' heading" \
  "grep -qE '^## Phase 4\.7: Folded /architecture --since' '$SKILL_MD'"
assert "SKILL.md documents --skip-folded-arch flag" \
  "grep -qE -- '--skip-folded-arch' '$SKILL_MD'"
assert "SKILL.md mentions folded_phase_failures in the Phase 4.7 body" \
  "grep -qE 'folded_phase_failures' '$SKILL_MD'"
assert "SKILL.md wires git merge-base HEAD main as the --since base" \
  "grep -qE 'git merge-base HEAD main' '$SKILL_MD'"
assert "SKILL.md names an Architecture findings aggregator section" \
  "grep -qE 'Architecture findings' '$SKILL_MD'"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
