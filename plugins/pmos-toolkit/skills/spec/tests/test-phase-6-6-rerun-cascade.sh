#!/usr/bin/env bash
# test-phase-6-6-rerun-cascade.sh — T14 integration test for the re-run
# idempotency of /spec's folded-architecture phase (slug: #folded-arch).
#
# Asserts:
#   1. /spec SKILL.md documents the re-run idempotency clause
#   2. The clause specifies the triplet is overwritten at the same path
#   3. The clause specifies NO new orchestrator phase ID is created
#      (state.yaml mutation confined to phases.spec.folded_phase_failures[])
#   4. /feature-sdlc state-schema.md does NOT contain orchestrator-level
#      arch phase IDs (state invariance — same grep as T15's invariance test,
#      kept here as a paired guard so a regression that adds 'arch-spec' as
#      a phase id breaks the cascade test too)

set -u
set -o pipefail

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"
cd "$REPO_ROOT"

SKILL_MD="plugins/pmos-toolkit/skills/spec/SKILL.md"
STATE_SCHEMA="plugins/pmos-toolkit/skills/feature-sdlc/reference/state-schema.md"

PASS=0
FAIL=0
assert() {
  local desc="$1"; local cond="$2"
  if eval "$cond"; then echo "  PASS: $desc"; PASS=$((PASS+1))
  else echo "  FAIL: $desc  (cond: $cond)"; FAIL=$((FAIL+1)); fi
}

echo "[folded-arch] re-run idempotency clause"
assert "folded-arch phase carries 'Re-run idempotency' clause" \
  "grep -qE 'Re-run idempotency' '$SKILL_MD'"
assert "clause specifies re-runs internally on /spec re-invocation" \
  "grep -qE 'Re-invoking /spec.*re-runs this phase internally' '$SKILL_MD'"
assert "clause specifies overwrite at same path" \
  "grep -qE 'overwriting the prior triplet at the same path' '$SKILL_MD'"
assert "clause specifies no new orchestrator phase ID created" \
  "grep -qE 'No new orchestrator phase ID is created|no new orchestrator phase ID' '$SKILL_MD'"
assert "clause confines state.yaml mutation to folded_phase_failures[]" \
  "grep -qE 'phases\.spec\.folded_phase_failures' '$SKILL_MD'"

echo
echo "[invariance] /feature-sdlc state-schema unchanged at orchestrator level"
[ -f "$STATE_SCHEMA" ]
SCHEMA_PRESENT=$?
if [ "$SCHEMA_PRESENT" -ne 0 ]; then
  echo "  SKIP: state-schema.md not found at $STATE_SCHEMA (T15 invariance test will catch this)"
else
  COUNT="$(grep -Ec '^(arch-spec|arch-verify|architecture)' "$STATE_SCHEMA" || true)"
  assert "no top-level arch phase ids in state-schema.md" \
    "[ '$COUNT' = '0' ]"
fi

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
