#!/usr/bin/env bash
# test-feature-sdlc-state-invariance.sh — T15 E2E invariance check.
#
# The architecture-in-feature-sdlc feature folds /architecture INTO /spec
# (Phase 6b) and /verify (Phase 4b) as sub-steps — it does NOT add an
# orchestrator-level architecture phase. /feature-sdlc's state schema must
# remain unchanged: no top-level `arch-spec`, `arch-verify`, or `architecture`
# phase ids.
#
# This test grep-asserts the invariance per plan §T15 step 3.

set -u
set -o pipefail

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"
cd "$REPO_ROOT"

SCHEMA="plugins/pmos-toolkit/skills/feature-sdlc/reference/state-schema.md"

PASS=0
FAIL=0
assert() {
  local desc="$1"; local cond="$2"
  if eval "$cond"; then echo "  PASS: $desc"; PASS=$((PASS+1))
  else echo "  FAIL: $desc  (cond: $cond)"; FAIL=$((FAIL+1)); fi
}

echo "[invariance] /feature-sdlc state-schema.md"
assert "state-schema.md exists" "[ -f '$SCHEMA' ]"

LINE_HITS="$(grep -Ec '^(arch-spec|arch-verify|architecture)' "$SCHEMA" || true)"
assert "no top-level orchestrator arch-spec/arch-verify/architecture lines (got $LINE_HITS)" \
  "[ '$LINE_HITS' = '0' ]"

SUBSTR_HITS="$(grep -c 'arch' "$SCHEMA" 2>/dev/null)" || SUBSTR_HITS=0
echo "  INFO: substring 'arch' occurrences in state-schema.md: $SUBSTR_HITS"
echo "    (any non-zero hits must be glossary-aside style only; 'arch-spec phase'"
echo "     or 'phase: architecture' style references would be a regression)"
# Soft guard: if substring hits > 0, list them so the operator can audit
if [ "$SUBSTR_HITS" != "0" ]; then
  echo "  audit excerpt:"
  grep -n 'arch' "$SCHEMA" | sed 's/^/    /'
fi
assert "substring 'arch' is 0 (clean invariance — no glossary asides needed yet)" \
  "[ '$SUBSTR_HITS' = '0' ]"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
